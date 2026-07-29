/* Synapse production auth, billing, and account-data helpers. */
(function() {
  "use strict";

  const SESSION_KEY = "synapse.auth.session.v1";
  const LAST_EMAIL_KEY = "synapse.auth.lastEmail.v1";
  const REMEMBER_ME_KEY = "synapse.auth.rememberMe.v1";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const LOCAL_INDEXED_DB_NAMES = [
    "synapse.visual.assets.v1",
    "synapse.source.assets.v1"
  ];

  let supabaseClient = null;
  let supabaseScriptPromise = null;

  function readConfig() {
    const body = document.body?.dataset || {};
    return {
      supabaseUrl: String(window.SYNAPSE_SUPABASE_URL || body.supabaseUrl || "").trim(),
      supabaseAnonKey: String(window.SYNAPSE_SUPABASE_ANON_KEY || body.supabaseAnonKey || "").trim(),
      apiBase: String(window.SYNAPSE_API_BASE || body.apiBase || "").replace(/\/+$/, ""),
      dataApiBase: String(window.SYNAPSE_DATA_API_BASE || body.dataApiBase || "").replace(/\/+$/, ""),
      billingPlans: Array.isArray(window.SYNAPSE_BILLING_PLANS) ? window.SYNAPSE_BILLING_PLANS : [
        {
          id: "free",
          label: "Free",
          mode: null,
          price: "$0",
          cadence: "forever",
          description: "Core study generation for getting started"
        },
        {
          id: "pro_monthly",
          label: "Pro Monthly",
          mode: "subscription",
          price: "$9",
          cadence: "per month",
          description: "Upgrade to Pro with monthly billing"
        },
        {
          id: "pro_yearly",
          label: "Pro Yearly",
          mode: "payment",
          price: "$90",
          cadence: "per year",
          description: "Upgrade to Pro with one-time annual access"
        }
      ]
    };
  }

  function isConfigured() {
    const config = readConfig();
    return Boolean(config.supabaseUrl && config.supabaseAnonKey);
  }

  function isPrivateIpv4Host(hostname) {
    const value = String(hostname || "").toLowerCase();
    const parts = value.split(".");
    if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part))) return false;
    const nums = parts.map(Number);
    if (nums.some(num => num < 0 || num > 255)) return false;
    return nums[0] === 10
      || (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31)
      || (nums[0] === 192 && nums[1] === 168);
  }

  function isLocalDevHost(hostname) {
    const value = String(hostname || "").toLowerCase();
    return value === "127.0.0.1" || value === "localhost" || value === "::1" || value === "[::1]" || isPrivateIpv4Host(value);
  }

  function apiBase() {
    const { protocol, hostname, port } = window.location;
    const backendPort = String(window.SYNAPSE_BACKEND_PORT || document.body?.dataset?.apiPort || "8001").trim();
    const configured = readConfig().apiBase;
    const currentOrigin = `${protocol}//${window.location.host}`.replace(/\/+$/, "");
    if (configured && !(isLocalDevHost(hostname) && port !== backendPort && configured === currentOrigin)) {
      return configured;
    }
    if (protocol === "file:") return `http://127.0.0.1:${backendPort || "8001"}`;
    if (isLocalDevHost(hostname) && port !== backendPort) {
      return `http://127.0.0.1:${backendPort || "8001"}`;
    }
    return `${protocol}//${window.location.host}`;
  }

  function dataApiBase() {
    const { protocol, hostname, port } = window.location;
    const dataPort = String(window.SYNAPSE_DATA_API_PORT || document.body?.dataset?.dataApiPort || "3001").trim();
    const configured = readConfig().dataApiBase;
    const currentOrigin = `${protocol}//${window.location.host}`.replace(/\/+$/, "");
    if (configured && !(isLocalDevHost(hostname) && port !== dataPort && configured === currentOrigin)) {
      return configured;
    }
    if (protocol === "file:") return `http://127.0.0.1:${dataPort || "3001"}`;
    if (isLocalDevHost(hostname) && port !== dataPort) {
      return `http://127.0.0.1:${dataPort || "3001"}`;
    }
    return `${protocol}//${window.location.host}`;
  }

  function isFrontendAppPath(pathname = window.location.pathname || "") {
    return /\/frontend(?:\/|$)/i.test(String(pathname || ""));
  }

  function appEntryUrl() {
    return isFrontendAppPath() ? "index.html" : "frontend/index.html";
  }

  function publicAppOrigin() {
    const configured = String(window.SYNAPSE_PUBLIC_APP_ORIGIN || "").trim().replace(/\/+$/, "");
    if (configured) return configured;
    return `${window.location.protocol}//${window.location.host}`.replace(/\/+$/, "");
  }

  function absolutePublicUrl(path) {
    return new URL(String(path || "").replace(/^\/+/, ""), `${publicAppOrigin()}/`).toString();
  }

  function absoluteAppUrl() {
    return absolutePublicUrl("frontend/index.html");
  }

  function verificationUrl() {
    return isFrontendAppPath() ? "verify.html" : "frontend/verify.html";
  }

  function absoluteVerificationUrl() {
    return absolutePublicUrl("frontend/verify.html");
  }

  function passwordResetUrl() {
    return isFrontendAppPath() ? "reset-password.html" : "frontend/reset-password.html";
  }

  function absolutePasswordResetUrl() {
    return absolutePublicUrl("frontend/reset-password.html");
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function urlAuthParams() {
    const params = new URLSearchParams(window.location.search || "");
    const hash = String(window.location.hash || "").replace(/^#/, "");
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      hashParams.forEach((value, key) => {
        if (!params.has(key)) params.set(key, value);
      });
    }
    return params;
  }

  function hasAuthCallbackParams() {
    const params = urlAuthParams();
    return Boolean(
      params.get("code")
      || params.get("access_token")
      || params.get("refresh_token")
      || params.get("token_hash")
      || params.get("type")
    );
  }

  function readJSON(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function browserStorage(name) {
    try {
      return window[name] || null;
    } catch {
      return null;
    }
  }

  function hasRememberMePreference() {
    try {
      return window.localStorage.getItem(REMEMBER_ME_KEY) !== null;
    } catch {
      return false;
    }
  }

  function hasSupabaseStorageSession(storage) {
    if (!storage) return false;
    try {
      return Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .some(key => /^sb-.+-auth-token$/.test(String(key || "")));
    } catch {
      return false;
    }
  }

  function getRememberMePreference() {
    try {
      const raw = window.localStorage.getItem(REMEMBER_ME_KEY);
      if (raw === "true") return true;
      if (raw === "false") return false;
    } catch {}

    // Keep sessions created by older Synapse builds working. New logins still
    // default to the unchecked checkbox unless the user explicitly opts in.
    try {
      return Boolean(window.localStorage.getItem(SESSION_KEY))
        || hasSupabaseStorageSession(browserStorage("localStorage"));
    } catch {
      return false;
    }
  }

  function copyStorageKey(from, to, key) {
    if (!from || !to) return;
    try {
      const value = from.getItem(key);
      if (value !== null) to.setItem(key, value);
      from.removeItem(key);
    } catch {}
  }

  function moveSupabaseStorage(rememberMe) {
    const durable = browserStorage("localStorage");
    const temporary = browserStorage("sessionStorage");
    if (!durable || !temporary) return;

    try {
      const source = rememberMe ? temporary : durable;
      const destination = rememberMe ? durable : temporary;
      Array.from({ length: source.length }, (_, index) => source.key(index))
        .filter(key => /^sb-.+-auth-token$/.test(String(key || "")))
        .forEach(key => copyStorageKey(source, destination, key));
    } catch {}
  }

  function setRememberMePreference(rememberMe) {
    const next = Boolean(rememberMe);
    try {
      window.localStorage.setItem(REMEMBER_ME_KEY, String(next));
    } catch {}

    const durable = browserStorage("localStorage");
    const temporary = browserStorage("sessionStorage");
    if (durable && temporary) {
      copyStorageKey(
        next ? temporary : durable,
        next ? durable : temporary,
        SESSION_KEY
      );
    }
    moveSupabaseStorage(next);
    return next;
  }

  function preferredSessionStorage() {
    return getRememberMePreference()
      ? browserStorage("localStorage")
      : browserStorage("sessionStorage");
  }

  function alternateSessionStorage() {
    return getRememberMePreference()
      ? browserStorage("sessionStorage")
      : browserStorage("localStorage");
  }

  function getLastEmail() {
    try {
      return normalizeEmail(window.localStorage.getItem(LAST_EMAIL_KEY) || "");
    } catch {
      return "";
    }
  }

  function setLastEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return "";
    try {
      window.localStorage.setItem(LAST_EMAIL_KEY, normalized);
    } catch {}
    return normalized;
  }

  function clearLastEmail() {
    removeLocalStorage(LAST_EMAIL_KEY);
  }

  function readSessionFromStorage(storage) {
    if (!storage) return null;
    try {
      const raw = storage.getItem(SESSION_KEY);
      const session = raw ? JSON.parse(raw) : null;
      return session && typeof session === "object" ? session : null;
    } catch {
      return null;
    }
  }

  function listSessionStorages() {
    const preferred = preferredSessionStorage();
    const alternate = alternateSessionStorage();
    const durable = browserStorage("localStorage");
    const temporary = browserStorage("sessionStorage");
    return [preferred, alternate, durable, temporary].filter(Boolean)
      .filter((storage, index, list) => list.indexOf(storage) === index);
  }

  function createSupabaseStorageAdapter() {
    return {
      getItem(key) {
        try {
          for (const storage of listSessionStorages()) {
            const value = storage.getItem(key);
            if (value !== null && value !== undefined) return value;
          }
          return null;
        } catch {
          return null;
        }
      },
      setItem(key, value) {
        try {
          preferredSessionStorage()?.setItem(key, value);
          alternateSessionStorage()?.removeItem(key);
        } catch {}
      },
      removeItem(key) {
        try {
          browserStorage("localStorage")?.removeItem(key);
          browserStorage("sessionStorage")?.removeItem(key);
        } catch {}
      }
    };
  }

  function removeLocalStorage(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }

  function dispatchAuthChange(session) {
    window.dispatchEvent(new CustomEvent("synapse-auth-changed", { detail: { session } }));
  }

  function displayPlan(plan) {
    const labels = {
      free: "Free",
      starter: "Free",
      pro_monthly: "Pro Monthly",
      pro_yearly: "Pro Yearly"
    };
    return labels[String(plan || "").toLowerCase()] || "Free";
  }

  function creditsForPlan(plan) {
    const key = String(plan || "").toLowerCase();
    if (key === "pro_monthly" || key === "pro_yearly") return 4000;
    return 500;
  }

  function mergeServerUserIntoSession(session, user = {}) {
    if (!session) return session;
    const plan = user.plan || session.plan || "free";
    const platformRole = user.platformRole || user.platform_role || session.platformRole || "user";
    const isController = Boolean(user.isController) || platformRole === "controller";
    return {
      ...session,
      accountId: user.id || session.accountId,
      email: user.email || session.email,
      displayName: user.displayName || session.displayName,
      role: user.role || session.role,
      platformRole: isController ? "controller" : "user",
      isController,
      plan: displayPlan(plan),
      billingPlan: plan,
      subscriptionStatus: user.subscriptionStatus || session.subscriptionStatus || "inactive",
      currentPeriodEnd: user.currentPeriodEnd || session.currentPeriodEnd || null,
      credits: creditsForPlan(plan)
    };
  }

  function publicSessionFromSupabase(sessionPayload) {
    const user = sessionPayload?.user || null;
    const metadata = user?.user_metadata || {};
    const email = normalizeEmail(user?.email || metadata.email || "");
    const firstName = String(metadata.first_name || metadata.firstName || "").trim();
    const lastName = String(metadata.last_name || metadata.lastName || "").trim();
    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim()
      || String(metadata.full_name || metadata.name || "").trim()
      || email
      || "Synapse Student";
    return {
      accountId: user?.id || email,
      email,
      displayName,
      firstName,
      lastName,
      role: metadata.role || "student",
      plan: displayPlan(metadata.plan || "free"),
      billingPlan: metadata.plan || "free",
      subscriptionStatus: metadata.subscription_status || metadata.subscriptionStatus || "inactive",
      currentPeriodEnd: metadata.current_period_end || metadata.currentPeriodEnd || null,
      credits: Number(metadata.credits || creditsForPlan(metadata.plan || "free")),
      authProvider: metadata.provider || user?.app_metadata?.provider || "supabase",
      authMode: "supabase",
      createdAt: user?.created_at || new Date().toISOString(),
      signedInAt: new Date().toISOString(),
      expiresAt: sessionPayload?.expires_at || null
    };
  }

  function saveSession(session) {
    if (!session) {
      browserStorage("localStorage")?.removeItem(SESSION_KEY);
      browserStorage("sessionStorage")?.removeItem(SESSION_KEY);
      dispatchAuthChange(null);
      return null;
    }
    const storage = preferredSessionStorage();
    const otherStorage = alternateSessionStorage();
    try {
      storage?.setItem(SESSION_KEY, JSON.stringify(session));
      otherStorage?.removeItem(SESSION_KEY);
    } catch {}
    if (session.email) setLastEmail(session.email);
    dispatchAuthChange(session);
    return session;
  }

  function getStoredSession() {
    for (const storage of listSessionStorages()) {
      const session = readSessionFromStorage(storage);
      if (session) return session;
    }
    return null;
  }

  function hasRememberedSession() {
    const session = getStoredSession();
    return Boolean(session?.accountId || session?.email);
  }

  function loadSupabaseScript() {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);
    if (supabaseScriptPromise) return supabaseScriptPromise;
    supabaseScriptPromise = new Promise((resolve, reject) => {
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
    return supabaseScriptPromise;
  }

  async function getSupabaseClient() {
    if (!isConfigured()) return null;
    if (supabaseClient) return supabaseClient;
    const loaded = await loadSupabaseScript();
    if (!loaded?.createClient) throw new Error("Supabase Auth library is unavailable.");
    const config = readConfig();
    supabaseClient = loaded.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: createSupabaseStorageAdapter()
      }
    });
    supabaseClient.auth.onAuthStateChange((event, sessionPayload) => {
      if (sessionPayload?.user) saveSession(publicSessionFromSupabase(sessionPayload));
      else if (event === "SIGNED_OUT" || event === "USER_DELETED") saveSession(null);
    });
    return supabaseClient;
  }

  async function syncSessionFromProvider() {
    let session = getStoredSession();
    if (!isConfigured()) return syncBillingSessionFromServer(session);
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data?.session?.user) session = saveSession(publicSessionFromSupabase(data.session));
    else if (session?.authMode === "supabase") session = saveSession(null);
    return syncBillingSessionFromServer(session);
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
    if (!isConfigured()) throw new Error("Production auth is not configured.");
    const normalizedEmail = normalizeEmail(email);
    const response = await publicApiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        firstName: String(firstName || "").trim(),
        lastName: String(lastName || "").trim(),
        email: normalizedEmail,
        role: role || "student",
        password,
        confirmPassword,
        termsAccepted: Boolean(termsAccepted),
        redirectTo: absoluteVerificationUrl()
      })
    });
    return readAuthApiResponse(response, "Sign up failed.");
  }

  async function resendSignupConfirmation(email) {
    if (!isConfigured()) throw new Error("Production auth is not configured.");
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) throw new Error("Enter the email address you used to sign up.");
    const response = await publicApiFetch("/api/auth/resend-confirmation", {
      method: "POST",
      body: JSON.stringify({
        email: normalizedEmail,
        redirectTo: absoluteVerificationUrl()
      })
    });
    return readAuthApiResponse(response, "Could not resend the confirmation email.");
  }

  async function completeAuthRedirect() {
    const params = urlAuthParams();
    const redirectError = params.get("error_description") || params.get("error");
    if (redirectError) {
      return {
        ok: false,
        status: "error",
        error: redirectError.replace(/\+/g, " ")
      };
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
    setRememberMePreference(rememberMe);
    setLastEmail(email);
    const client = await getSupabaseClient();
    if (!client) throw new Error("Production auth is not configured.");
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizeEmail(email),
      password
    });
    if (error) throw error;
    return { session: saveSession(publicSessionFromSupabase(data.session)) };
  }

  async function signInWithGoogle({ redirectTo = absoluteAppUrl(), rememberMe = false } = {}) {
    setRememberMePreference(rememberMe);
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
    if (!isConfigured()) throw new Error("Production auth is not configured.");
    const response = await publicApiFetch("/api/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify({
        email: normalizeEmail(email),
        redirectTo: absolutePasswordResetUrl()
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
      return saveSession(publicSessionFromSupabase(data.session));
    }
    return null;
  }

  async function waitForRecoverySession(timeoutMs = 10000) {
    const client = await getSupabaseClient();
    if (!client) throw new Error("Production auth is not configured.");

    const existing = await readCurrentSupabaseSession();
    if (existing?.accountId || existing?.email) return existing;
    if (!hasAuthCallbackParams()) return null;

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
          finish(saveSession(publicSessionFromSupabase(sessionPayload)));
        }
      });
      subscription = authChange?.data?.subscription || authChange?.subscription || null;
    });
  }

  async function preparePasswordRecovery() {
    const params = urlAuthParams();
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
        const session = saveSession(publicSessionFromSupabase(data.session));
        window.history?.replaceState?.({}, document.title, window.location.pathname);
        return { ok: true, status: "ready", session };
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
    return { ok: true, user: data?.user || null, session: getStoredSession() };
  }

  async function signOut() {
    if (isConfigured()) {
      const client = await getSupabaseClient();
      await client?.auth?.signOut?.();
    }
    saveSession(null);
  }

  async function accessToken() {
    if (isConfigured()) {
      const client = await getSupabaseClient();
      const { data } = await client.auth.getSession();
      if (data?.session?.access_token) {
        saveSession(publicSessionFromSupabase(data.session));
        return data.session.access_token;
      }
    }
    return getStoredSession()?.accessToken || "";
  }

  async function authHeaders(extra = {}) {
    const token = await accessToken();
    const session = getStoredSession();
    const headers = { ...extra };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (session && typeof session === "object") {
      if (session.accountId) headers["X-Synapse-User-Id"] = cleanHeaderValue(session.accountId, 160);
      if (session.email) headers["X-Synapse-User-Email"] = cleanHeaderValue(session.email, 220);
      if (session.displayName) headers["X-Synapse-User-Name"] = cleanHeaderValue(session.displayName, 180);
      if (session.authMode) headers["X-Synapse-Auth-Mode"] = cleanHeaderValue(session.authMode, 60);
      if (session.role) headers["X-Synapse-User-Role"] = cleanHeaderValue(session.role, 80);
    }
    headers["X-Synapse-Client-Id"] = cleanHeaderValue(getSynapseClientId(), 160);
    return headers;
  }

  function cleanHeaderValue(value, limit = 220) {
    return String(value || "")
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, limit);
  }

  function randomClientId() {
    const cryptoApi = window.crypto || globalThis.crypto;
    if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
    return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }

  function getSynapseClientId() {
    const key = "synapse.client.id.v1";
    try {
      const existing = window.localStorage.getItem(key);
      if (existing) return existing;
      const next = randomClientId();
      window.localStorage.setItem(key, next);
      return next;
    } catch {
      return randomClientId();
    }
  }

  async function baseFetch(base, path, options = {}) {
    const headers = await authHeaders({
      "Content-Type": "application/json",
      ...(options.headers || {})
    });
    return window.fetch(`${base}/${String(path || "").replace(/^\/+/, "")}`, {
      ...options,
      headers
    });
  }

  // Render's free tier can take roughly a minute to wake after inactivity.
  // Authentication actions must wait through that cold start rather than report a false failure.
  async function publicApiFetch(path, options = {}, timeoutMs = 75000) {
    const headers = {
      "Content-Type": "application/json",
      "X-Synapse-Client-Id": cleanHeaderValue(getSynapseClientId(), 160),
      ...(options.headers || {})
    };
    const controller = new AbortController();
    const callerSignal = options.signal;
    const abortFromCaller = () => controller.abort(callerSignal?.reason);
    if (callerSignal?.aborted) abortFromCaller();
    else callerSignal?.addEventListener?.("abort", abortFromCaller, { once: true });

    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await window.fetch(`${apiBase()}/${String(path || "").replace(/^\/+/, "")}`, {
        ...options,
        headers,
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Synapse could not reach the auth server in time. Check that the backend is running, then try again.");
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
      callerSignal?.removeEventListener?.("abort", abortFromCaller);
    }
  }

  async function apiFetch(path, options = {}) {
    return baseFetch(apiBase(), path, options);
  }

  async function dataApiFetch(path, options = {}) {
    return baseFetch(dataApiBase(), path, options);
  }

  async function syncBillingSessionFromServer(session = getStoredSession()) {
    if (!session) return null;
    try {
      const response = await dataApiFetch("/api/users/me", { method: "GET" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error || !data.user) return session;
      return saveSession(mergeServerUserIntoSession(session, data.user));
    } catch {
      return session;
    }
  }

  async function fetchBillingPlans() {
    const response = await dataApiFetch("/api/billing/plans", { method: "GET" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error || "Could not load billing plans.");
    return data;
  }

  async function fetchBillingEntitlements() {
    const response = await dataApiFetch("/api/billing/entitlements", { method: "GET" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error || "Could not load billing status.");
    if (data.user) {
      const session = getStoredSession();
      if (session) saveSession(mergeServerUserIntoSession(session, data.user));
    }
    return data;
  }

  async function createCheckoutSession({ planId, checkoutMode, successUrl, cancelUrl }) {
    const response = await dataApiFetch("/api/billing/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({
        plan_id: planId,
        checkout_mode: checkoutMode,
        success_url: successUrl || new URL("billing-success.html?session_id={CHECKOUT_SESSION_ID}", window.location.href).toString(),
        cancel_url: cancelUrl || new URL("billing-cancel.html", window.location.href).toString()
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error || "Could not start checkout.");
    return data;
  }

  async function createPortalSession({ returnUrl } = {}) {
    const response = await dataApiFetch("/api/billing/create-portal-session", {
      method: "POST",
      body: JSON.stringify({
        return_url: returnUrl || `${window.location.origin}${window.location.pathname}`
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error || "Could not open billing portal.");
    return data;
  }

  async function requestServerExport() {
    const response = await apiFetch("/account/export", { method: "GET" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error || "Could not export server account data.");
    return data;
  }

  async function requestAccountDeletion() {
    const response = await apiFetch("/account/delete", { method: "POST", body: JSON.stringify({ confirm: true }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error || "Could not delete account.");
    return data;
  }

  async function deleteLocalDatabases() {
    if (!window.indexedDB) return;
    await Promise.all(LOCAL_INDEXED_DB_NAMES.map(name => new Promise(resolve => {
      const request = window.indexedDB.deleteDatabase(name);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    })));
  }

  function collectLocalData() {
    const localStorageData = {};
    try {
      Object.keys(window.localStorage || {})
        .filter(key => key.startsWith("synapse."))
        .forEach(key => {
          const raw = window.localStorage.getItem(key);
          if (key === SESSION_KEY) {
            try {
              const parsed = JSON.parse(raw);
              delete parsed.accessToken;
              localStorageData[key] = JSON.stringify(parsed);
              return;
            } catch {}
          }
          localStorageData[key] = raw;
        });
    } catch {}
    return {
      exportedAt: new Date().toISOString(),
      origin: window.location.origin,
      session: getStoredSession(),
      localStorage: localStorageData,
      indexedDbNames: LOCAL_INDEXED_DB_NAMES
    };
  }

  async function clearLocalSynapseData() {
    try {
      Object.keys(window.localStorage || {})
        .filter(key => key.startsWith("synapse."))
        .forEach(key => window.localStorage.removeItem(key));
    } catch {}
    try {
      Object.keys(window.sessionStorage || {})
        .filter(key => key.startsWith("synapse."))
        .forEach(key => window.sessionStorage.removeItem(key));
    } catch {}
    await deleteLocalDatabases();
    dispatchAuthChange(null);
  }

  function downloadJSON(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.SynapseAuth = {
    absoluteAppUrl,
    apiBase,
    authHeaders,
    clearLastEmail,
    clearLocalSynapseData,
    collectLocalData,
    completeAuthRedirect,
    createCheckoutSession,
    createPortalSession,
    dataApiBase,
    downloadJSON,
    fetchBillingEntitlements,
    fetchBillingPlans,
    getBillingPlans: () => readConfig().billingPlans,
    getLastEmail,
    getRememberMePreference,
    getStoredSession,
    hasRememberedSession,
    isConfigured,
    preparePasswordRecovery,
    requestAccountDeletion,
    requestServerExport,
    resendSignupConfirmation,
    setLastEmail,
    setRememberMePreference,
    resetPassword,
    saveSession,
    signInEmail,
    signInWithGoogle,
    signOut,
    signUpEmail,
    syncBillingSessionFromServer,
    syncSessionFromProvider,
    updatePassword
  };
  document.documentElement.dataset.synapseAuthClient = "loaded";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      syncSessionFromProvider().catch(error => console.warn("Synapse auth sync failed:", error));
    }, { once: true });
  } else {
    syncSessionFromProvider().catch(error => console.warn("Synapse auth sync failed:", error));
  }
})();
