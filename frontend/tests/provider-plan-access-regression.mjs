import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const {
  providerSelectOptions,
  resolveProviderForSession,
  sessionIsPro
} = await import("../src/legacy/model/providerAccess.js");

assert.equal(sessionIsPro({ billingPlan: "free" }), false);
assert.equal(sessionIsPro({ billingPlan: "pro_monthly", subscriptionStatus: "active" }), true);

const free = resolveProviderForSession("openai", { billingPlan: "free" });
assert.equal(free.provider, "deepseek");
assert.equal(free.clamped, true);

const pro = resolveProviderForSession("gemini", { billingPlan: "pro_yearly", subscriptionStatus: "active" });
assert.equal(pro.provider, "gemini");
assert.equal(pro.clamped, false);

const freeOptions = providerSelectOptions({ billingPlan: "free" });
assert.ok(freeOptions.some(option => option.value === "openai" && option.disabled));
assert.ok(freeOptions.some(option => option.value === "deepseek" && !option.disabled));

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const main = fs.readFileSync(path.join(repoRoot, "frontend/src/main.js"), "utf8");
const settings = fs.readFileSync(path.join(repoRoot, "frontend/src/legacy/controller_sections/08_extractrealtimeresponsetranscript.js"), "utf8");
const upload = fs.readFileSync(path.join(repoRoot, "frontend/src/legacy/controller_sections/01_uploadedfiles.js"), "utf8");
assert.ok(main.includes("__synapseProviderAccess"));
assert.ok(main.includes("synapse-auth-changed"));
assert.ok(settings.includes("providerSettingsOptions"));
assert.ok(upload.includes("enforceProviderPreference"));

console.log("provider-plan-access-frontend-regression: passed");
