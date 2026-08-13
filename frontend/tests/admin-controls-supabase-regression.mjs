import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authClientSource, landingAuthSource } from "./_sourceTrees.mjs";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const usersRepo = read("server/src/repositories/usersRepository.js");
const usersRoute = read("server/src/routes/users.js");
const authClient = authClientSource();
const accountUi = readLegacyControllerSections("08_extractrealtimeresponsetranscript.js");
const migration = read("server/src/db/migrations/002_admin_user_controls_credits.sql");
const schema = read("server/src/db/supabase-schema.sql");

assert.ok(usersRepo.includes("mergeIdentityMetadata"), "upsert must merge identity metadata");
assert.ok(usersRepo.includes("PROTECTED_METADATA_KEYS"), "credit/admin keys must be protected");
assert.ok(usersRepo.includes("admin_daily_allowance"), "admin daily override must persist");
assert.ok(
  usersRepo.includes("never replace metadata_json wholesale")
    || usersRepo.includes("IMPORTANT: never replace metadata_json"),
  "upsert docs/guards must call out metadata wipe risk"
);

assert.ok(usersRoute.includes("entitlements"), "/api/users/me must return entitlements");
assert.ok(usersRoute.includes("adminControls"), "/api/users/me must return adminControls");
assert.ok(usersRoute.includes("boostCredits"), "/api/users/me credit payload must include boost");

assert.ok(authClient.includes("fetchBillingEntitlements"), "auth client must load entitlements");
assert.ok(authClient.includes("boostCredits"), "auth session must track boost credits");
assert.ok(authClient.includes("adminControls"), "auth session must track adminControls");
assert.ok(authClient.includes("/api/billing/entitlements"), "billing sync should hit entitlements");

assert.ok(accountUi.includes("refreshAccountBillingPanel"), "billing panel must refresh credits");
assert.ok(accountUi.includes("fetchCreditBalance"), "billing panel should fetch credit balance");

assert.ok(migration.includes("admin_controls"), "SQL migration must document admin_controls");
assert.ok(migration.includes("boost_credits"), "SQL migration must document boost_credits");
assert.ok(migration.includes("synapse_user_billing_overview"), "SQL migration should expose billing overview");
assert.ok(schema.includes("users_metadata_json_gin_idx"), "schema should index metadata_json");

console.log("admin controls supabase wiring regression passed");
