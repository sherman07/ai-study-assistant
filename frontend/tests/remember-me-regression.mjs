import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const authClient = fs.readFileSync(path.join(repoRoot, "frontend/auth-client.js"), "utf8");
const loginPage = fs.readFileSync(path.join(repoRoot, "frontend/login.html"), "utf8");

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
  location: { protocol: "https:", hostname: "example.com", host: "example.com", pathname: "/frontend/login.html", search: "", hash: "" },
  addEventListener() {},
  dispatchEvent() {},
  setTimeout,
  clearTimeout
};
const context = vm.createContext({
  Date,
  JSON,
  URL,
  URLSearchParams,
  AbortController,
  CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
  window: windowStub,
  document: documentStub,
  console: { warn() {}, log() {} },
  setTimeout,
  clearTimeout
});

vm.runInContext(authClient, context);
const auth = windowStub.SynapseAuth;
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

auth.setRememberMePreference(false);
const tokenSession = {
  accountId: "student-2",
  email: "student2@example.com",
  accessToken: "must-not-persist-durably"
};
auth.saveSession(tokenSession);
assert.equal(
  durable.getItem("synapse.auth.session.v1"),
  null,
  "fresh login with remember-me off must not write the app session (including accessToken) to localStorage"
);
assert.equal(
  temporary.getItem("synapse.auth.session.v1"),
  JSON.stringify(tokenSession),
  "fresh login with remember-me off should keep the app session in sessionStorage only"
);

assert.match(loginPage, /data-testid="remember-me-checkbox"/);
assert.match(authClient, /storage: createSupabaseStorageAdapter\(\)/);
assert.match(authClient, /signInEmail\(\{ email, password, rememberMe = false \}\)/);
assert.match(
  authClient,
  /Remember-me controls where the app session \(including accessToken\) lives/,
  "saveSession must document that remember-me gates durable accessToken storage"
);
console.log("remember-me regression passed");
