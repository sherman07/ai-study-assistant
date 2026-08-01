/*
  Public runtime config for Synapse.
  Replace these values during deployment. Do not put secret keys in this file.
*/
function synapseIsPrivateIpv4Host(hostname) {
  const value = String(hostname || "").toLowerCase();
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part))) return false;
  const nums = parts.map(Number);
  if (nums.some(num => num < 0 || num > 255)) return false;
  return nums[0] === 10
    || (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31)
    || (nums[0] === 192 && nums[1] === 168);
}

function synapseIsLoopbackHost(hostname) {
  return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(String(hostname || "").toLowerCase());
}

const SYNAPSE_IS_LOOPBACK_HOST = synapseIsLoopbackHost(window.location.hostname);
const SYNAPSE_IS_LOCAL_HOST = SYNAPSE_IS_LOOPBACK_HOST || synapseIsPrivateIpv4Host(window.location.hostname);
const SYNAPSE_LOCAL_SERVICE_HOST = SYNAPSE_IS_LOOPBACK_HOST ? "127.0.0.1" : window.location.hostname;
const SYNAPSE_LOCAL_API_BASE = `http://${SYNAPSE_LOCAL_SERVICE_HOST}:8001`;
const SYNAPSE_LOCAL_DATA_API_BASE = `http://${SYNAPSE_LOCAL_SERVICE_HOST}:3001`;
const SYNAPSE_PRODUCTION_API_BASE = "https://synapse-ai-backend-idnc.onrender.com";
const SYNAPSE_PRODUCTION_DATA_API_BASE = "https://synapse-data-api.onrender.com";
const SYNAPSE_CANONICAL_PUBLIC_ORIGIN = "https://synapse-ai-study-assistant-tutor.vercel.app";
const SYNAPSE_CURRENT_ORIGIN = `${window.location.protocol}//${window.location.host}`.replace(/\/+$/, "");
const SYNAPSE_IS_VERCEL_DEPLOYMENT = String(window.location.hostname || "").toLowerCase().endsWith(".vercel.app");
const SYNAPSE_CANONICAL_PUBLIC_HOST = new URL(SYNAPSE_CANONICAL_PUBLIC_ORIGIN).hostname;

// Vercel deployment URLs are immutable and therefore have a separate browser session.
// Always move public visitors to the stable alias before Supabase loads its session.
window.SYNAPSE_PUBLIC_APP_ORIGIN = window.SYNAPSE_PUBLIC_APP_ORIGIN
  || (SYNAPSE_IS_LOCAL_HOST
    ? SYNAPSE_CURRENT_ORIGIN
    : (SYNAPSE_IS_VERCEL_DEPLOYMENT ? SYNAPSE_CANONICAL_PUBLIC_ORIGIN : SYNAPSE_CURRENT_ORIGIN));

if (
  !SYNAPSE_IS_LOCAL_HOST
  && SYNAPSE_IS_VERCEL_DEPLOYMENT
  && String(window.location.hostname || "").toLowerCase() !== SYNAPSE_CANONICAL_PUBLIC_HOST
) {
  const canonicalUrl = new URL(window.location.href);
  canonicalUrl.protocol = "https:";
  canonicalUrl.host = SYNAPSE_CANONICAL_PUBLIC_HOST;
  window.location.replace(canonicalUrl.toString());
}

window.SYNAPSE_API_BASE = window.SYNAPSE_API_BASE || (SYNAPSE_IS_LOCAL_HOST ? SYNAPSE_LOCAL_API_BASE : SYNAPSE_PRODUCTION_API_BASE);
window.SYNAPSE_DATA_API_BASE = window.SYNAPSE_DATA_API_BASE || (SYNAPSE_IS_LOCAL_HOST ? SYNAPSE_LOCAL_DATA_API_BASE : SYNAPSE_PRODUCTION_DATA_API_BASE);
window.SYNAPSE_CONTACT_ENDPOINT = window.SYNAPSE_CONTACT_ENDPOINT || `${window.SYNAPSE_API_BASE}/contact`;
// Focus Room is part of the primary study workflow. Deployments can still
// disable it explicitly before this config runs with false or "false".
window.SYNAPSE_FOCUS_ROOM_ENABLED = window.SYNAPSE_FOCUS_ROOM_ENABLED !== false
  && window.SYNAPSE_FOCUS_ROOM_ENABLED !== "false";

window.SYNAPSE_SUPABASE_URL = window.SYNAPSE_SUPABASE_URL || "https://yoopvoutgfhnldhmqmip.supabase.co";
window.SYNAPSE_SUPABASE_ANON_KEY = window.SYNAPSE_SUPABASE_ANON_KEY || "sb_publishable_WhUSmLHyEZ7E_-R9_sjbPA_5KVgHzXF";

window.SYNAPSE_BILLING_PLANS = window.SYNAPSE_BILLING_PLANS || [
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
];

window.SYNAPSE_BOOST_PACKS = window.SYNAPSE_BOOST_PACKS || [
  { id: "boost_small", label: "Small Boost", credits: 10000, price: "$4.99" },
  { id: "boost_standard", label: "Standard Boost", credits: 25000, price: "$9.99" },
  { id: "boost_plus", label: "Plus Boost", credits: 70000, price: "$24.99" },
  { id: "boost_max", label: "Max Boost", credits: 150000, price: "$49.99" }
];
