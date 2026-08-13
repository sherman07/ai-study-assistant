/** Authenticated fetch, billing, credits, and account data helpers. */
import {
  SESSION_KEY,
  LAST_EMAIL_KEY,
  REMEMBER_ME_KEY,
  SUPABASE_CDN,
  LOCAL_INDEXED_DB_NAMES,
  authState
} from "./state.js";

export function attach(api) {
function loginUrl({ next } = {}) {
  const target = new URL("login.html", window.location.href);
  const returnPath = api.safeReturnPath(
    next,
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  );
  if (returnPath && !/\/login\.html(?:$|\?)/i.test(returnPath)) {
    target.searchParams.set("next", returnPath);
  }
  return target.toString();
}

async function accessToken() {
  if (api.isConfigured()) {
    try {
      const client = await api.getSupabaseClient();
      const { data } = await client.auth.getSession();
      if (data?.session?.access_token) {
        api.saveSession(api.publicSessionFromSupabase(data.session, api.getStoredSession()));
        return data.session.access_token;
      }
    } catch {}

    const recovered = api.recoverSupabaseSessionFromStorage();
    if (recovered?.access_token) {
      api.saveSession(api.publicSessionFromSupabase(recovered, api.getStoredSession()));
      return recovered.access_token;
    }
  }
  return String(api.getStoredSession()?.accessToken || "").trim();
}

async function requireApiSession() {
  const token = await accessToken();
  if (!token) {
    const stale = api.getStoredSession();
    if (stale?.email || stale?.accountId) {
      // Drop email-only ghosts that cannot call authenticated APIs.
      // Keep last-email prefills for the login form.
      try {
        api.browserStorage("localStorage")?.removeItem(SESSION_KEY);
        api.browserStorage("sessionStorage")?.removeItem(SESSION_KEY);
        api.dispatchAuthChange(null);
      } catch {}
    }
    return null;
  }
  let session = api.getStoredSession();
  if (!session?.email && !session?.accountId) {
    session = await api.syncSessionFromProvider();
  }
  if (!session?.email && !session?.accountId) return null;
  return { ...session, accessToken: token };
}

async function authHeaders(extra = {}) {
  const token = await accessToken();
  const session = api.getStoredSession();
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
    return await window.fetch(`${api.apiBase()}/${String(path || "").replace(/^\/+/, "")}`, {
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
  return baseFetch(api.apiBase(), path, options);
}

async function dataApiFetch(path, options = {}) {
  return baseFetch(api.dataApiBase(), path, options);
}

async function syncBillingSessionFromServer(session = api.getStoredSession()) {
  if (!session) return null;
  try {
    const response = await dataApiFetch("/api/users/me", { method: "GET" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error || !data.user) return session;
    let next = api.saveSession(api.mergeServerUserIntoSession(session, data.user, data.entitlements || data.user.entitlements));
    // Prefer authoritative entitlements + credit split when available.
    try {
      const entitlementsResponse = await dataApiFetch("/api/billing/entitlements", { method: "GET" });
      const entitlementsData = await entitlementsResponse.json().catch(() => ({}));
      if (entitlementsResponse.ok && !entitlementsData.error) {
        const creditUser = {
          ...(entitlementsData.user || data.user),
          credits: entitlementsData.credits?.totalCredits ?? entitlementsData.user?.credits ?? data.user.credits,
          dailyCredits: entitlementsData.credits?.dailyCredits ?? entitlementsData.user?.dailyCredits ?? data.user.dailyCredits,
          boostCredits: entitlementsData.credits?.boostCredits ?? entitlementsData.user?.boostCredits ?? data.user.boostCredits,
          dailyAllowance: entitlementsData.credits?.dailyAllowance ?? entitlementsData.user?.dailyAllowance ?? data.user.dailyAllowance,
          entitlements: entitlementsData.entitlements,
          adminControls: entitlementsData.entitlements?.adminControls || data.user.adminControls
        };
        next = api.saveSession(api.mergeServerUserIntoSession(next, creditUser, entitlementsData.entitlements));
      }
    } catch {
      // /me already merged; entitlements are best-effort.
    }
    return next;
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
  const session = api.getStoredSession();
  if (session) {
    const creditUser = {
      ...(data.user || {}),
      credits: data.credits?.totalCredits ?? data.user?.credits,
      dailyCredits: data.credits?.dailyCredits ?? data.user?.dailyCredits,
      boostCredits: data.credits?.boostCredits ?? data.user?.boostCredits,
      dailyAllowance: data.credits?.dailyAllowance ?? data.user?.dailyAllowance,
      entitlements: data.entitlements,
      adminControls: data.entitlements?.adminControls || data.user?.adminControls
    };
    api.saveSession(api.mergeServerUserIntoSession(session, creditUser, data.entitlements));
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

async function createBoostCheckoutSession({ packId, successUrl, cancelUrl }) {
  const response = await dataApiFetch("/api/billing/create-boost-checkout-session", {
    method: "POST",
    body: JSON.stringify({
      pack_id: packId,
      success_url: successUrl || new URL("billing-success.html?session_id={CHECKOUT_SESSION_ID}&boost=1", window.location.href).toString(),
      cancel_url: cancelUrl || new URL("pricing.html#boost", window.location.href).toString()
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || "Could not start Boost checkout.");
  return data;
}

async function fetchCreditBalance() {
  const response = await dataApiFetch("/api/billing/credits", { method: "GET" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || "Could not load credit balance.");
  if (data.user || data.credits) {
    const session = api.getStoredSession();
    if (session) {
      const creditUser = {
        ...(data.user || {}),
        credits: data.credits?.totalCredits ?? data.user?.credits,
        dailyCredits: data.credits?.dailyCredits ?? data.user?.dailyCredits,
        boostCredits: data.credits?.boostCredits ?? data.user?.boostCredits,
        dailyAllowance: data.credits?.dailyAllowance ?? data.user?.dailyAllowance
      };
      api.saveSession(api.mergeServerUserIntoSession(session, creditUser));
    }
  }
  return data;
}

async function estimateCredits(actionId) {
  const response = await dataApiFetch("/api/billing/credits/estimate", {
    method: "POST",
    body: JSON.stringify({ action_id: actionId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || "Could not estimate credits.");
  return data;
}

async function spendCredits({ actionId, amount } = {}) {
  const response = await dataApiFetch("/api/billing/credits/spend", {
    method: "POST",
    body: JSON.stringify({
      action_id: actionId,
      amount
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const error = new Error(data.error || "Could not spend credits.");
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  if (data.user) {
    const session = api.getStoredSession();
    if (session) api.saveSession(api.mergeServerUserIntoSession(session, data.user));
  } else if (data.credits) {
    const session = api.getStoredSession();
    if (session) {
      api.saveSession({
        ...session,
        credits: data.credits.totalCredits,
        dailyCredits: data.credits.dailyCredits,
        boostCredits: data.credits.boostCredits,
        dailyAllowance: data.credits.dailyAllowance,
        billingSyncedAt: new Date().toISOString()
      });
    }
  }
  return data;
}

async function refundCredits({ dailyUsed = 0, boostUsed = 0, amount = 0 } = {}) {
  const response = await dataApiFetch("/api/billing/credits/refund", {
    method: "POST",
    body: JSON.stringify({
      daily_used: dailyUsed,
      boost_used: boostUsed,
      amount
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || "Could not refund credits.");
  if (data.user) {
    const session = api.getStoredSession();
    if (session) api.saveSession(api.mergeServerUserIntoSession(session, data.user));
  }
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
    session: api.getStoredSession(),
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
  api.dispatchAuthChange(null);
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

  Object.assign(api, {
    loginUrl,
    accessToken,
    requireApiSession,
    authHeaders,
    cleanHeaderValue,
    randomClientId,
    getSynapseClientId,
    baseFetch,
    publicApiFetch,
    apiFetch,
    dataApiFetch,
    syncBillingSessionFromServer,
    fetchBillingPlans,
    fetchBillingEntitlements,
    createCheckoutSession,
    createBoostCheckoutSession,
    fetchCreditBalance,
    estimateCredits,
    spendCredits,
    refundCredits,
    createPortalSession,
    requestServerExport,
    requestAccountDeletion,
    deleteLocalDatabases,
    collectLocalData,
    clearLocalSynapseData,
    downloadJSON
  });
}
