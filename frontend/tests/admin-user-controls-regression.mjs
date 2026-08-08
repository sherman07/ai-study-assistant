import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const html = read("frontend/admin-access.html");
const js = read("frontend/admin-access.js");
const adminRoute = read("server/src/routes/admin.js");
const usersRepo = read("server/src/repositories/usersRepository.js");

assert.ok(html.includes("editDailyCredits"), "admin UI should expose daily credits");
assert.ok(html.includes("editBoostCredits"), "admin UI should expose boost credits");
assert.ok(html.includes("editModelAccessFields"), "admin UI should expose model access controls");
assert.ok(html.includes("editFeatureGateFields"), "admin UI should expose feature gates");
assert.ok(html.includes("editAccountStatus"), "admin UI should expose account status");

assert.ok(js.includes("dailyCredits"), "admin JS should save dailyCredits");
assert.ok(js.includes("boostCredits"), "admin JS should save boostCredits");
assert.ok(js.includes("adminControls"), "admin JS should save adminControls");
assert.ok(js.includes("Force allow"), "admin JS should render tri-state feature overrides");

assert.ok(adminRoute.includes("boostCredits"), "admin PATCH should accept boostCredits");
assert.ok(adminRoute.includes("adminControls"), "admin PATCH should accept adminControls");
assert.ok(adminRoute.includes("featureCatalog"), "admin users list should return feature catalog");

assert.ok(usersRepo.includes("adminSplitCreditsState"), "users repository should split daily/boost independently");
assert.ok(usersRepo.includes("admin_controls"), "users repository should persist admin_controls metadata");

console.log("admin user controls regression passed");
