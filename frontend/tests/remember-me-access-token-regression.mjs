import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { repoRoot } from "./_sourceTrees.mjs";

function makeStorage() {
  const values = new Map();
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
const windowStub = {
  localStorage: durable,
  sessionStorage: temporary,
  location: {
    protocol: "https:",
    hostname: "example.com",
    host: "example.com",
    pathname: "/frontend/login.html",
    search: "",
    hash: "",
    href: "https://example.com/frontend/login.html"
  },
  addEventListener() {},
  dispatchEvent() {},
  setTimeout,
  clearTimeout
};
const documentStub = {
  readyState: "loading",
  body: { dataset: {} },
  head: { appendChild() {} },
  documentElement: { dataset: {} },
  addEventListener() {},
  querySelector() { return null; },
  createElement() { return { addEventListener() {}, set src(_) {}, async: false }; }
};
windowStub.window = windowStub;
windowStub.document = documentStub;
globalThis.window = windowStub;
globalThis.document = documentStub;

const installUrl = pathToFileURL(
  path.join(repoRoot, "frontend/src/features/auth/client/install.js")
).href + `?remember-token=${Date.now()}`;
const { installAuthClient } = await import(installUrl);
const auth = installAuthClient(windowStub);

auth.setRememberMePreference(false);
auth.saveSession({
  accountId: "student-1",
  email: "student@example.com",
  accessToken: "bearer-token-that-must-not-persist-durably"
});

const durableSession = JSON.parse(durable.getItem("synapse.auth.session.v1"));
const temporarySession = JSON.parse(temporary.getItem("synapse.auth.session.v1"));
assert.equal(durableSession.accountId, "student-1");
assert.equal(durableSession.accessToken, undefined, "unchecked remember-me must not persist bearer tokens in localStorage");
assert.equal(temporarySession.accessToken, "bearer-token-that-must-not-persist-durably");

console.log("remember-me access token regression passed");
