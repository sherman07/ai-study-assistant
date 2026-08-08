import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  allowedProvidersForPlan,
  resolveProviderForPlan
} from "../src/billing/providerAccess.js";
import { assertAiProviderAllowed, userEntitlements } from "../src/billing/plans.js";

const free = resolveProviderForPlan("openai", { isPro: false });
assert.equal(free.provider, "deepseek");
assert.equal(free.clamped, true);

const freeDeepseek = resolveProviderForPlan("deepseek", { isPro: false });
assert.equal(freeDeepseek.provider, "deepseek");
assert.equal(freeDeepseek.clamped, false);

const pro = resolveProviderForPlan("gemini", { isPro: true });
assert.equal(pro.provider, "gemini");
assert.deepEqual(allowedProvidersForPlan({ isPro: true }), ["openai", "gemini", "deepseek"]);

const freeEntitlements = userEntitlements({ plan: "free", subscriptionStatus: "inactive" });
assert.equal(freeEntitlements.isPro, false);
assert.deepEqual(freeEntitlements.features.allowedAiProviders, ["deepseek"]);
assert.equal(freeEntitlements.features.multiAiProviders, false);

const proEntitlements = userEntitlements({
  plan: "pro_monthly",
  subscriptionStatus: "active",
  currentPeriodEnd: new Date(Date.now() + 86400000).toISOString()
});
assert.equal(proEntitlements.isPro, true);
assert.equal(proEntitlements.features.gptProvider, true);
assert.equal(proEntitlements.features.geminiProvider, true);

const denied = assertAiProviderAllowed({ plan: "free", subscriptionStatus: "inactive" }, "openai");
assert.equal(denied.ok, false);
assert.match(denied.error, /DeepSeek/i);

const deniedGemini = assertAiProviderAllowed({ plan: "free", subscriptionStatus: "inactive" }, "gemini");
assert.equal(deniedGemini.ok, false);

const freeEmpty = assertAiProviderAllowed({ plan: "free", subscriptionStatus: "inactive" }, "");
assert.equal(freeEmpty.ok, true);
assert.equal(freeEmpty.resolution.provider, "deepseek");

const freeDeepseekSpend = assertAiProviderAllowed({ plan: "free", subscriptionStatus: "inactive" }, "deepseek");
assert.equal(freeDeepseekSpend.ok, true);

const allowed = assertAiProviderAllowed({
  plan: "pro_monthly",
  subscriptionStatus: "active",
  currentPeriodEnd: new Date(Date.now() + 86400000).toISOString()
}, "openai");
assert.equal(allowed.ok, true);

const routeSource = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/routes/billing.js"), "utf8");
assert.ok(routeSource.includes("assertAiProviderAllowed"), "billing routes should gate AI providers");

console.log("provider-plan-access: passed");
