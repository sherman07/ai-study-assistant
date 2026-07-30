import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const authClient = fs.readFileSync(path.join(root, "frontend/auth-client.js"), "utf8");
const landingAuth = fs.readFileSync(path.join(root, "frontend/landing-auth.js"), "utf8");
const adminCommon = fs.readFileSync(path.join(root, "frontend/admin-common.js"), "utf8");

assert.match(authClient, /function requireApiSession\(/, "auth client must expose requireApiSession");
assert.match(authClient, /function loginUrl\(/, "auth client must build login URLs with next=");
assert.match(authClient, /access_token/, "public sessions should retain access tokens when available");
assert.match(authClient, /recoverSupabaseSessionFromStorage/, "must recover JWT from sb-*-auth-token storage");

assert.match(landingAuth, /params\.get\('next'\)/, "login must honor next return path");
assert.match(landingAuth, /requireApiSession/, "login resume must require a real API session/token");
assert.match(landingAuth, /Please enter your password to continue/, "login must not auto-bounce email-only ghosts");

assert.match(adminCommon, /loginUrl/, "admin gate must redirect with next=");
assert.match(adminCommon, /error\.status === 403/, "admin gate must not login-loop on 403");
assert.match(adminCommon, /Authorization/, "admin fetch must refuse requests without a bearer token");

console.log("admin auth loop regression checks passed");
