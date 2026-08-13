/** Storage, remember-me, billing fields, and session persistence. */
import {
  SESSION_KEY,
  LAST_EMAIL_KEY,
  REMEMBER_ME_KEY,
  SUPABASE_CDN,
  LOCAL_INDEXED_DB_NAMES,
  authState
} from "./state.js";

export function attach(api) {
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
    return api.normalizeEmail(window.localStorage.getItem(LAST_EMAIL_KEY) || "");
  } catch {
    return "";
  }
}

function setLastEmail(email) {
  const normalized = api.normalizeEmail(email);
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

function normalizeBillingPlanId(plan) {
  const raw = String(plan || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!raw || raw === "starter") return "free";
  if (raw === "pro" || raw === "pro_month" || raw === "pro_monthly") return "pro_monthly";
  if (
    raw === "pro_year"
    || raw === "pro_yearly"
    || raw === "pro_annual"
    || raw === "pro_annually"
    || raw.includes("yearly")
    || raw.includes("annual")
  ) {
    return "pro_yearly";
  }
  if (raw.includes("monthly")) return "pro_monthly";
  if (raw === "free") return "free";
  return "free";
}

function displayPlan(plan) {
  const labels = {
    free: "Free",
    starter: "Free",
    pro_monthly: "Pro Monthly",
    pro_yearly: "Pro Annual"
  };
  return labels[normalizeBillingPlanId(plan)] || "Free";
}

function creditsForPlan(plan) {
  const key = normalizeBillingPlanId(plan);
  if (key === "pro_monthly" || key === "pro_yearly") return 1000;
  return 550;
}

function billingFieldsFromSession(session = null) {
  if (!session) {
    return {
      plan: "Free",
      billingPlan: "free",
      isPro: false,
      isSuspended: false,
      subscriptionStatus: "inactive",
      currentPeriodEnd: null,
      credits: null,
      dailyCredits: null,
      boostCredits: null,
      dailyAllowance: null,
      adminControls: null,
      entitlements: null,
      features: null,
      billingSyncedAt: null
    };
  }
  const planId = normalizeBillingPlanId(session.billingPlan || session.plan || "free");
  return {
    plan: displayPlan(planId),
    billingPlan: planId,
    isPro: Boolean(session.isPro),
    isSuspended: Boolean(session.isSuspended),
    subscriptionStatus: session.subscriptionStatus || "inactive",
    currentPeriodEnd: session.currentPeriodEnd || null,
    credits: Number.isFinite(Number(session.credits)) ? Math.max(0, Math.floor(Number(session.credits))) : null,
    dailyCredits: Number.isFinite(Number(session.dailyCredits))
      ? Math.max(0, Math.floor(Number(session.dailyCredits)))
      : null,
    boostCredits: Number.isFinite(Number(session.boostCredits))
      ? Math.max(0, Math.floor(Number(session.boostCredits)))
      : null,
    dailyAllowance: Number.isFinite(Number(session.dailyAllowance))
      ? Math.max(0, Math.floor(Number(session.dailyAllowance)))
      : null,
    adminControls: session.adminControls || null,
    entitlements: session.entitlements || null,
    features: session.features || session.entitlements?.features || null,
    billingSyncedAt: session.billingSyncedAt || null
  };
}

function mergeServerUserIntoSession(session, user = {}, entitlementsPayload = null) {
  if (!session) return session;
  // Server `public.users` is the only source of truth for plan and credits.
  // Never fall back to the display label in session.plan (e.g. "Pro Annual").
  const planId = normalizeBillingPlanId(
    user.plan
    || user.billingPlan
    || session.billingPlan
    || "free"
  );
  const platformRole = user.platformRole || user.platform_role || session.platformRole || "user";
  const isController = Boolean(user.isController) || platformRole === "controller";
  const entitlements = entitlementsPayload
    || user.entitlements
    || session.entitlements
    || null;
  const adminControls = user.adminControls
    || user.admin_controls
    || entitlements?.adminControls
    || session.adminControls
    || null;
  const totalCredits = Number.isFinite(Number(user.credits))
    ? Math.max(0, Math.floor(Number(user.credits)))
    : (Number.isFinite(Number(session.credits)) ? Math.max(0, Math.floor(Number(session.credits))) : creditsForPlan(planId));
  const isPro = typeof user.isPro === "boolean"
    ? user.isPro
    : (typeof entitlements?.isPro === "boolean"
      ? entitlements.isPro
      : (planId.startsWith("pro_") && ["active", "trialing"].includes(String(user.subscriptionStatus || session.subscriptionStatus || "inactive").toLowerCase())));
  const isSuspended = Boolean(
    user.isSuspended
    || entitlements?.isSuspended
    || adminControls?.accountStatus === "suspended"
  );
  return {
    ...session,
    accountId: user.id || session.accountId,
    email: user.email || session.email,
    displayName: user.displayName || session.displayName,
    role: user.role || session.role,
    platformRole: isController ? "controller" : "user",
    isController,
    plan: displayPlan(planId),
    billingPlan: planId,
    isPro,
    isSuspended,
    subscriptionStatus: user.subscriptionStatus || session.subscriptionStatus || "inactive",
    currentPeriodEnd: user.currentPeriodEnd || session.currentPeriodEnd || null,
    credits: totalCredits,
    dailyCredits: Number.isFinite(Number(user.dailyCredits))
      ? Math.max(0, Math.floor(Number(user.dailyCredits)))
      : (Number.isFinite(Number(session.dailyCredits)) ? Math.floor(Number(session.dailyCredits)) : null),
    boostCredits: Number.isFinite(Number(user.boostCredits))
      ? Math.max(0, Math.floor(Number(user.boostCredits)))
      : (Number.isFinite(Number(session.boostCredits)) ? Math.floor(Number(session.boostCredits)) : null),
    dailyAllowance: Number.isFinite(Number(user.dailyAllowance))
      ? Math.max(0, Math.floor(Number(user.dailyAllowance)))
      : (Number.isFinite(Number(session.dailyAllowance)) ? Math.floor(Number(session.dailyAllowance)) : null),
    adminControls: adminControls || session.adminControls || null,
    entitlements: entitlements || session.entitlements || null,
    features: entitlements?.features || session.features || null,
    billingSyncedAt: new Date().toISOString()
  };
}

function publicSessionFromSupabase(sessionPayload, previousSession = null) {
  const user = sessionPayload?.user || null;
  const metadata = user?.user_metadata || {};
  const email = api.normalizeEmail(user?.email || metadata.email || "");
  const firstName = String(metadata.first_name || metadata.firstName || "").trim();
  const lastName = String(metadata.last_name || metadata.lastName || "").trim();
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim()
    || String(metadata.full_name || metadata.name || "").trim()
    || email
    || "Synapse Student";
  const accessToken = String(
    sessionPayload?.access_token
    || sessionPayload?.accessToken
    || ""
  ).trim();
  // Auth metadata is NOT billing truth. Preserve prior server-synced billing
  // so token refresh cannot flash Free/500 over Pro.
  const billing = billingFieldsFromSession(previousSession || getStoredSession());
  return {
    accountId: user?.id || email,
    email,
    displayName,
    firstName,
    lastName,
    role: metadata.role || previousSession?.role || "student",
    ...billing,
    // Keep placeholder credits only when we have never synced from the server.
    credits: billing.credits == null ? 0 : billing.credits,
    authProvider: metadata.provider || user?.app_metadata?.provider || "supabase",
    authMode: "supabase",
    accessToken: accessToken || previousSession?.accessToken || undefined,
    createdAt: user?.created_at || previousSession?.createdAt || new Date().toISOString(),
    signedInAt: previousSession?.signedInAt || new Date().toISOString(),
    expiresAt: sessionPayload?.expires_at || sessionPayload?.expiresAt || previousSession?.expiresAt || null
  };
}

function queueBillingSync(session = getStoredSession()) {
  if (!session?.email && !session?.accountId) return Promise.resolve(session);
  if (authState.billingSyncTimer) window.clearTimeout(authState.billingSyncTimer);
  return new Promise((resolve) => {
    authState.billingSyncTimer = window.setTimeout(() => {
      const pending = authState.billingSyncInFlight || api.syncBillingSessionFromServer(getStoredSession() || session);
      authState.billingSyncInFlight = pending;
      pending
        .then((next) => resolve(next))
        .catch(() => resolve(getStoredSession() || session))
        .finally(() => {
          if (authState.billingSyncInFlight === pending) authState.billingSyncInFlight = null;
        });
    }, 120);
  });
}

function saveSession(session) {
  if (!session) {
    browserStorage("localStorage")?.removeItem(SESSION_KEY);
    browserStorage("sessionStorage")?.removeItem(SESSION_KEY);
    dispatchAuthChange(null);
    return null;
  }
  const preferred = preferredSessionStorage();
  const durable = browserStorage("localStorage");
  const temporary = browserStorage("sessionStorage");
  const payload = JSON.stringify(session);
  const durableSession = { ...session };
  if (!getRememberMePreference()) {
    delete durableSession.accessToken;
    delete durableSession.access_token;
    delete durableSession.refreshToken;
    delete durableSession.refresh_token;
  }
  const durablePayload = JSON.stringify(durableSession);
  try {
    // Always keep a durable copy for the workspace account menu. Remember-me
    // still controls where Supabase auth tokens live. When it is disabled,
    // the durable copy must not retain a bearer token.
    durable?.setItem(SESSION_KEY, durablePayload);
    if (preferred === temporary) temporary?.setItem(SESSION_KEY, payload);
    else temporary?.removeItem(SESSION_KEY);
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

  Object.assign(api, {
    readJSON,
    writeJSON,
    browserStorage,
    hasRememberMePreference,
    hasSupabaseStorageSession,
    getRememberMePreference,
    copyStorageKey,
    moveSupabaseStorage,
    setRememberMePreference,
    preferredSessionStorage,
    alternateSessionStorage,
    getLastEmail,
    setLastEmail,
    clearLastEmail,
    readSessionFromStorage,
    listSessionStorages,
    createSupabaseStorageAdapter,
    removeLocalStorage,
    dispatchAuthChange,
    normalizeBillingPlanId,
    displayPlan,
    creditsForPlan,
    billingFieldsFromSession,
    mergeServerUserIntoSession,
    publicSessionFromSupabase,
    queueBillingSync,
    saveSession,
    getStoredSession,
    hasRememberedSession
  });
}
