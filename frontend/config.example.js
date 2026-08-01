/*
  Copy this file to config.js during deployment, fill in real values, and load it
  before auth-client.js in each public HTML entrypoint.
*/
window.SYNAPSE_API_BASE = "https://api.your-domain.com";
window.SYNAPSE_DATA_API_BASE = "https://data-api.your-domain.com";
window.SYNAPSE_CONTACT_ENDPOINT = "https://api.your-domain.com/contact";

window.SYNAPSE_SUPABASE_URL = "https://your-project.supabase.co";
window.SYNAPSE_SUPABASE_ANON_KEY = "your-public-anon-key";
// Enable Google in Supabase Auth and allow http://127.0.0.1:5175/frontend/index.html for local OAuth redirects.

// Stripe secret keys and price IDs live on the Express data API server only.
// The frontend sends only these public plan and boost pack IDs.
window.SYNAPSE_BILLING_PLANS = [
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

window.SYNAPSE_BOOST_PACKS = [
  { id: "boost_small", label: "Small Boost", credits: 10000, price: "$4.99" },
  { id: "boost_standard", label: "Standard Boost", credits: 25000, price: "$9.99" },
  { id: "boost_plus", label: "Plus Boost", credits: 70000, price: "$24.99" },
  { id: "boost_max", label: "Max Boost", credits: 150000, price: "$49.99" }
];
