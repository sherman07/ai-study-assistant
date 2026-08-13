/** Supabase client bootstrap and auth flows. */
import {
  SESSION_KEY,
  LAST_EMAIL_KEY,
  REMEMBER_ME_KEY,
  SUPABASE_CDN,
  LOCAL_INDEXED_DB_NAMES,
  authState
} from "./state.js";

export function attach(api) {
function loadSupabaseScript() {
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);
  if (authState.supabaseScriptPromise) return authState.supabaseScriptPromise;
  authState.supabaseScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SUPABASE_CDN}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.supabase), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SUPABASE_CDN;
    script.async = true;
    script.onload = () => resolve(window.supabase);
    script.onerror = () => reject(new Error("Could not load Supabase Auth."));
    document.head.appendChild(script);
  });
  return authState.supabaseScriptPromise;
}

async function getSupabaseClient() {
  if (!api.isConfigured()) return null;
  if (authState.supabaseClient) return authState.supabaseClient;
  if (authState.supabaseClientPromise) return authState.supabaseClientPromise;

  authState.supabaseClientPromise = (async () => {
    const loaded = await loadSupabaseScript();
    if (!loaded?.createClient) throw new Error("Supabase Auth library is unavailable.");
    const config = api.readConfig();
    const client = loaded.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: api.createSupabaseStorageAdapter()
      }
    });
    client.auth.onAuthStateChange((event, sessionPayload) => {
      if (sessionPayload?.user) {
        const previous = api.getStoredSession();
        // Preserve server billing across token refresh; never trust Auth metadata for plan/credits.
        const next = api.saveSession(api.publicSessionFromSupabase(sessionPayload, previous));
        if (event !== "SIGNED_OUT" && event !== "USER_DELETED") {
          api.queueBillingSync(next);
        }
      } else if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        api.saveSession(null);
      }
    });
    authState.supabaseClient = client;
    return client;
  })().catch(error => {
    authState.supabaseClientPromise = null;
    throw error;
  });

  return authState.supabaseClientPromise;
}

async function syncSessionFromProvider() {
  let session = api.getStoredSession();
  if (!api.isConfigured()) return api.syncBillingSessionFromServer(session);
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (data?.session?.user) {
    // Keep prior billing while we fetch authoritative /api/users/me — one server merge save.
    session = api.publicSessionFromSupabase(data.session, session);
    // Persist token immediately so dataApiFetch can authorize, without wiping Pro → Free.
    api.saveSession(session);
    return api.syncBillingSessionFromServer(session);
  }

  const recovered = recoverSupabaseSessionFromStorage();
  if (recovered?.user && recovered?.access_token) {
    session = api.publicSessionFromSupabase(recovered, session);
    api.saveSession(session);
    return api.syncBillingSessionFromServer(session);
  }

  // Do not wipe a just-established Synapse session when getSession() is briefly
  // empty (storage race after redirect). Only clear on explicit sign-out.
  if (session?.authMode === "supabase" && (session.email || session.accountId)) {
    try {
      const { data: userData } = await client.auth.getUser();
      if (userData?.user) {
        session = api.publicSessionFromSupabase({
          user: userData.user,
          access_token: session.accessToken || "",
          expires_at: session.expiresAt || null
        }, session);
        api.saveSession(session);
        return api.syncBillingSessionFromServer(session);
      }
    } catch {}
    // Without a recoverable JWT, treat as signed-out for API/admin gates.
    if (!(await api.accessToken())) return null;
    return api.syncBillingSessionFromServer(session);
  }

  return api.syncBillingSessionFromServer(session);
}

async function readAuthApiResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "";
    const error = new Error(data.message || data.error || detail || fallbackMessage);
    error.state = data.state || "api_error";
    error.errors = data.errors || {};
    error.response = data;
    throw error;
  }
  return data;
}

async function signUpEmail({ firstName, lastName, email, password, confirmPassword, role, termsAccepted }) {
  if (!api.isConfigured()) throw new Error("Production auth is not configured.");
  const normalizedEmail = api.normalizeEmail(email);
  const response = await api.publicApiFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      firstName: String(firstName || "").trim(),
      lastName: String(lastName || "").trim(),
      email: normalizedEmail,
      role: role || "student",
      password,
      confirmPassword,
      termsAccepted: Boolean(termsAccepted),
      redirectTo: api.absoluteVerificationUrl()
    })
  });
  return readAuthApiResponse(response, "Sign up failed.");
}

async function resendSignupConfirmation(email) {
  if (!api.isConfigured()) throw new Error("Production auth is not configured.");
  const normalizedEmail = api.normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Enter the email address you used to sign up.");
  const response = await api.publicApiFetch("/api/auth/resend-confirmation", {
    method: "POST",
    body: JSON.stringify({
      email: normalizedEmail,
      redirectTo: api.absoluteVerificationUrl()
    })
  });
  return readAuthApiResponse(response, "Could not resend the confirmation email.");
}

async function completeAuthRedirect() {
  const params = api.urlAuthParams();
  const redirectError = params.get("error_description") || params.get("error");
  if (redirectError) {
    return {
      ok: false,
      status: "error",
      error: redirectError.replace(/\+/g, " ")
    };
  }

  const tokenHash = params.get("token_hash");
  const otpType = String(params.get("type") || "").trim().toLowerCase();
  if (tokenHash && otpType) {
    const client = await getSupabaseClient();
    if (!client) throw new Error("Production auth is not configured.");
    const verifyType = ["signup", "invite", "magiclink", "email", "recovery", "email_change"].includes(otpType)
      ? otpType
      : "signup";
    const { data, error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: verifyType
    });
    if (error) {
      return {
        ok: false,
        status: "invalid_token",
        error: error.message || "This confirmation link is invalid or expired."
      };
    }
    if (data?.session?.user) {
      const session = api.saveSession(api.publicSessionFromSupabase(data.session));
      window.history?.replaceState?.({}, document.title, window.location.pathname);
      return { ok: true, status: "signed_in", session };
    }
  }

  const session = await syncSessionFromProvider();
  if (session?.accountId || session?.email) {
    return { ok: true, status: "signed_in", session };
  }

  return {
    ok: false,
    status: "pending",
    message: "Open your confirmation link from the same browser, or log in after verification."
  };
}

async function signInEmail({ email, password, rememberMe = false }) {
  api.setRememberMePreference(rememberMe);
  api.setLastEmail(email);
  const client = await getSupabaseClient();
  if (!client) throw new Error("Production auth is not configured.");
  const { data, error } = await client.auth.signInWithPassword({
    email: api.normalizeEmail(email),
    password
  });
  if (error) throw error;
  const session = api.saveSession(api.publicSessionFromSupabase(data.session, api.getStoredSession()));
  await api.syncBillingSessionFromServer(session);
  return { session: api.getStoredSession() || session };
}

async function signInWithGoogle({ redirectTo = api.absoluteAppUrl(), rememberMe = false } = {}) {
  api.setRememberMePreference(rememberMe);
  const client = await getSupabaseClient();
  if (!client) throw new Error("Production auth is not configured.");
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo }
  });
  if (error) throw error;
  return { redirected: true };
}

async function resetPassword(email) {
  if (!api.isConfigured()) throw new Error("Production auth is not configured.");
  const response = await api.publicApiFetch("/api/auth/request-password-reset", {
    method: "POST",
    body: JSON.stringify({
      email: api.normalizeEmail(email),
      redirectTo: api.absolutePasswordResetUrl()
    })
  });
  return readAuthApiResponse(response, "Password reset failed.");
}

async function readCurrentSupabaseSession() {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Production auth is not configured.");
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (data?.session?.user) {
    return api.saveSession(api.publicSessionFromSupabase(data.session, api.getStoredSession()));
  }
  return null;
}

async function waitForRecoverySession(timeoutMs = 10000) {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Production auth is not configured.");

  const existing = await readCurrentSupabaseSession();
  if (existing?.accountId || existing?.email) return existing;
  if (!api.hasAuthCallbackParams()) return null;

  return new Promise(resolve => {
    let settled = false;
    let subscription = null;
    const finish = session => {
      if (settled) return;
      settled = true;
      if (subscription?.unsubscribe) subscription.unsubscribe();
      else if (subscription?.subscription?.unsubscribe) subscription.subscription.unsubscribe();
      resolve(session);
    };

    const timer = window.setTimeout(async () => {
      try {
        finish(await readCurrentSupabaseSession());
      } catch {
        finish(null);
      }
    }, timeoutMs);

    const authChange = client.auth.onAuthStateChange((event, sessionPayload) => {
      if (sessionPayload?.user && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        window.clearTimeout(timer);
        finish(api.saveSession(api.publicSessionFromSupabase(sessionPayload, api.getStoredSession())));
      }
    });
    subscription = authChange?.data?.subscription || authChange?.subscription || null;
  });
}

async function preparePasswordRecovery() {
  const params = api.urlAuthParams();
  const redirectError = params.get("error_description") || params.get("error");
  if (redirectError) {
    return {
      ok: false,
      status: "error",
      error: redirectError.replace(/\+/g, " ")
    };
  }

  const tokenHash = params.get("token_hash");
  if (tokenHash) {
    if (params.get("type") !== "recovery") {
      return {
        ok: false,
        status: "invalid_type",
        message: "This password reset link is invalid. Request a new Synapse reset email."
      };
    }

    const client = await getSupabaseClient();
    if (!client) throw new Error("Production auth is not configured.");
    const { data, error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery"
    });
    if (error) {
      return {
        ok: false,
        status: "invalid_token",
        message: error.message || "This password reset link is invalid or expired."
      };
    }
    if (data?.session?.user) {
      const session = api.saveSession(api.publicSessionFromSupabase(data.session, api.getStoredSession()));
      await api.syncBillingSessionFromServer(session);
      window.history?.replaceState?.({}, document.title, window.location.pathname);
      return { ok: true, status: "ready", session: api.getStoredSession() || session };
    }
  }

  const session = await waitForRecoverySession();
  if (session?.accountId || session?.email) {
    return { ok: true, status: "ready", session };
  }

  return {
    ok: false,
    status: "missing_session",
    message: "This reset link is invalid or expired. Request a new Synapse password reset email."
  };
}

async function updatePassword(password) {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Production auth is not configured.");
  const { data, error } = await client.auth.updateUser({ password });
  if (error) throw error;
  await readCurrentSupabaseSession().catch(() => null);
  return { ok: true, user: data?.user || null, session: api.getStoredSession() };
}

async function signOut() {
  if (api.isConfigured()) {
    const client = await getSupabaseClient();
    await client?.auth?.signOut?.();
  }
  api.saveSession(null);
}

function parseStoredSupabaseSession(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed?.access_token && parsed?.user) return parsed;
    // supabase-js sometimes nests currentSession
    if (parsed?.currentSession?.access_token && parsed?.currentSession?.user) {
      return parsed.currentSession;
    }
  } catch {}
  return null;
}

function recoverSupabaseSessionFromStorage() {
  for (const storage of api.listSessionStorages()) {
    if (!storage) continue;
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!/^sb-.+-auth-token$/i.test(String(key || ""))) continue;
        const session = parseStoredSupabaseSession(storage.getItem(key));
        if (session?.access_token) return session;
      }
    } catch {}
  }
  return null;
}

function safeReturnPath(candidate, fallback = "") {
  const value = String(candidate || "").trim();
  if (!value) return fallback;
  try {
    if (value.startsWith("/") && !value.startsWith("//")) {
      return value;
    }
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

  Object.assign(api, {
    loadSupabaseScript,
    getSupabaseClient,
    syncSessionFromProvider,
    readAuthApiResponse,
    signUpEmail,
    resendSignupConfirmation,
    completeAuthRedirect,
    signInEmail,
    signInWithGoogle,
    resetPassword,
    readCurrentSupabaseSession,
    waitForRecoverySession,
    preparePasswordRecovery,
    updatePassword,
    signOut,
    parseStoredSupabaseSession,
    recoverSupabaseSessionFromStorage,
    safeReturnPath
  });
}
