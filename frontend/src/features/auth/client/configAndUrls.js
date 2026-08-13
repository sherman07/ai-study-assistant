/** Config, host detection, and public URL helpers. */
import {
  SESSION_KEY,
  LAST_EMAIL_KEY,
  REMEMBER_ME_KEY,
  SUPABASE_CDN,
  LOCAL_INDEXED_DB_NAMES,
  authState
} from "./state.js";

export function attach(api) {
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
        dailyCredits: 50,
        welcomeCredits: 500,
        description: "500 welcome credits, then 50 fresh AI credits every day"
      },
      {
        id: "pro_monthly",
        label: "Pro Monthly",
        mode: "subscription",
        price: "$9.99",
        cadence: "per month",
        dailyCredits: 1000,
        welcomeCredits: 0,
        description: "1,000 fresh AI credits every day with the complete study experience"
      },
      {
        id: "pro_yearly",
        label: "Pro Annual",
        mode: "payment",
        price: "$99.99",
        cadence: "per year",
        dailyCredits: 1000,
        welcomeCredits: 0,
        description: "1,000 fresh AI credits every day with about 16.6% annual savings"
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

  Object.assign(api, {
    readConfig,
    isConfigured,
    isPrivateIpv4Host,
    isLocalDevHost,
    apiBase,
    dataApiBase,
    isFrontendAppPath,
    appEntryUrl,
    publicAppOrigin,
    absolutePublicUrl,
    absoluteAppUrl,
    verificationUrl,
    absoluteVerificationUrl,
    passwordResetUrl,
    absolutePasswordResetUrl,
    normalizeEmail,
    urlAuthParams,
    hasAuthCallbackParams
  });
}
