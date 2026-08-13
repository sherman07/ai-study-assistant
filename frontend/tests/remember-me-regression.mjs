import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  authClientSource,
  read,
  repoRoot
} from "./_sourceTrees.mjs";

const loginPage = read("frontend/login.html");
const authClient = authClientSource();

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key(index) { return Array.from(values.keys())[index] || null; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); }
  };
}

const durable = makeStorage();
const temporary = makeStorage();
const documentStub = {
  readyState: "loading",
  body: { dataset: {} },
  head: { appendChild() {} },
  documentElement: { dataset: {} },
  addEventListener() {},
  querySelector() { return null; },
  createElement() { return { addEventListener() {}, set src(_) {}, async: false }; }
};
const windowStub = {
  localStorage: durable,
  sessionStorage: temporary,
  location: { protocol: "https:", hostname: "example.com", host: "example.com", pathname: "/frontend/login.html", search: "", hash: "", href: "https://example.com/frontend/login.html" },
  addEventListener() {},
  dispatchEvent() {},
  setTimeout,
  clearTimeout
};
windowStub.window = windowStub;
windowStub.document = documentStub;
globalThis.window = windowStub;
globalThis.document = documentStub;

const installUrl = pathToFileURL(
  path.join(repoRoot, "frontend/src/features/auth/client/install.js")
).href + `?remember-me=${Date.now()}`;
const { installAuthClient } = await import(installUrl);
const auth = installAuthClient(windowStub);

const appSession = JSON.stringify({ accountId: "student-1", email: "student@example.com" });
const providerSession = JSON.stringify({ access_token: "temporary-token", refresh_token: "temporary-refresh" });

assert.equal(auth.getRememberMePreference(), false, "new login pages should default to unchecked remember-me");
auth.setRememberMePreference(true);
assert.equal(auth.getRememberMePreference(), true);
auth.saveSession(JSON.parse(appSession));
durable.setItem("sb-example-auth-token", providerSession);
assert.equal(durable.getItem("synapse.auth.session.v1"), appSession);
assert.equal(temporary.getItem("synapse.auth.session.v1"), null);

auth.setRememberMePreference(false);
assert.equal(auth.getRememberMePreference(), false);
assert.equal(durable.getItem("synapse.auth.session.v1"), null, "unchecking should remove the durable app session");
assert.equal(temporary.getItem("synapse.auth.session.v1"), appSession, "unchecking should move the app session to the current tab");
assert.equal(durable.getItem("sb-example-auth-token"), null, "unchecking should remove the durable Supabase token");
assert.equal(temporary.getItem("sb-example-auth-token"), providerSession, "unchecking should move the Supabase token to the current tab");
assert.deepEqual(auth.getStoredSession(), JSON.parse(appSession));

auth.setRememberMePreference(true);
assert.equal(temporary.getItem("synapse.auth.session.v1"), null, "checking should remove the temporary app session");
assert.equal(durable.getItem("synapse.auth.session.v1"), appSession, "checking should restore durable app persistence");
assert.equal(temporary.getItem("sb-example-auth-token"), null, "checking should remove the temporary Supabase token");
assert.equal(durable.getItem("sb-example-auth-token"), providerSession, "checking should restore durable Supabase persistence");

auth.saveSession(null);
assert.equal(durable.getItem("synapse.auth.session.v1"), null);
assert.equal(temporary.getItem("synapse.auth.session.v1"), null);

assert.match(loginPage, /data-testid="remember-me-checkbox"/);
assert.match(authClient, /storage: api\.createSupabaseStorageAdapter\(\)|storage: createSupabaseStorageAdapter\(\)/);
assert.match(authClient, /signInEmail\(\{ email, password, rememberMe = false \}\)/);
console.log("remember-me regression passed");
