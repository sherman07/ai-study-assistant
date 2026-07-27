import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

const pricingHtml = read("frontend/pricing.html");
const pricingJs = read("frontend/pricing.js");
const resultJs = read("frontend/billing-result.js");
const authClient = read("frontend/auth-client.js");
const accountController = read("frontend/src/legacy/controller_sections/08_extractrealtimeresponsetranscript.js");
const billingCss = read("frontend/billing-pages.css");
const configJs = read("frontend/config.js");
const viteConfig = read("vite.config.js");

for (const file of [
  "frontend/pricing.html",
  "frontend/billing-success.html",
  "frontend/billing-cancel.html",
  "frontend/billing-pages.css",
  "frontend/pricing.js",
  "frontend/billing-result.js",
  "pricing.html",
  "billing-success.html",
  "billing-cancel.html"
]) {
  assert.ok(exists(file), `${file} should exist`);
}

for (const requiredPlan of ["Free", "Pro Monthly", "Pro Yearly"]) {
  assert.ok(pricingHtml.includes(requiredPlan), `pricing page should show ${requiredPlan}`);
}

assert.match(pricingHtml, /data-checkout-plan="free"/, "pricing page should include the Free plan");
assert.match(pricingHtml, /data-checkout-plan="pro_monthly" data-checkout-mode="subscription"/, "monthly Pro should use subscription Checkout");
assert.match(pricingHtml, /data-checkout-plan="pro_yearly" data-checkout-mode="payment"/, "yearly Pro should use one-time Checkout");
assert.ok(authClient.includes("billing-success.html"), "checkout client should define a success page");
assert.ok(authClient.includes("billing-cancel.html"), "checkout client should define a cancel page");

for (const endpoint of [
  "/api/billing/create-checkout-session",
  "/api/billing/create-portal-session",
  "/api/billing/entitlements"
]) {
  assert.ok(authClient.includes(endpoint), `auth client should call ${endpoint}`);
}

assert.ok(authClient.includes("SYNAPSE_DATA_API_BASE"), "billing should call the Express data API, not the static frontend host");
assert.ok(authClient.includes("plan_id: planId"), "checkout requests should send public plan IDs");
assert.ok(authClient.includes("checkout_mode: checkoutMode"), "checkout requests should include the requested Checkout mode");
assert.ok(pricingJs.includes("createCheckoutSession({ planId, checkoutMode })"), "pricing buttons should request Checkout through auth-client");
assert.ok(resultJs.includes("fetchBillingEntitlements"), "success and cancel pages should refresh server-side billing state");

for (const secretToken of [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_PRO_MONTHLY",
  "STRIPE_PRICE_PRO_YEARLY",
  "sk_"
]) {
  assert.ok(!authClient.includes(secretToken), `frontend auth client must not contain ${secretToken}`);
  assert.ok(!pricingHtml.includes(secretToken), `pricing page must not contain ${secretToken}`);
  assert.ok(!configJs.includes(secretToken), `public config must not contain ${secretToken}`);
}

assert.ok(configJs.includes('mode: "subscription"'), "public plan metadata should mark monthly as subscription");
assert.ok(configJs.includes('mode: "payment"'), "public plan metadata should mark yearly as one-time payment");
assert.ok(accountController.includes("startBillingCheckout(planId, checkoutMode)"), "workspace billing modal should pass Checkout mode");
assert.ok(accountController.includes("openBillingPortal"), "workspace billing modal should expose Stripe Customer Portal");
assert.ok(accountController.includes("Payment status is updated only from verified Stripe webhooks"), "workspace should explain webhook source of truth");

for (const viteInput of ["pricing", "billingSuccess", "billingCancel"]) {
  assert.ok(viteConfig.includes(`${viteInput}: resolve`), `Vite build should include ${viteInput}`);
}

assert.ok(billingCss.includes("--primary: #4a7cff"), "billing pages should preserve the Synapse primary theme color");
assert.ok(
  billingCss.includes("--primary-strong: #3566f5") || billingCss.includes("--accent: #5b8cff"),
  "billing pages should keep the Synapse blue accent family"
);
for (const forbiddenToken of ["#06b6d4", "#10b981", "--cyan", "--mint", "--sky", "#764ba2"]) {
  assert.ok(!billingCss.includes(forbiddenToken), `billing CSS should not introduce ${forbiddenToken}`);
}

console.log("billing frontend regression passed");
