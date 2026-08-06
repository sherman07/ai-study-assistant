import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const authClient = fs.readFileSync(path.join(repoRoot, "frontend/auth-client.js"), "utf8");

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
    hash: ""
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

vm.runInNewContext(authClient, vm.createContext({
  AbortController,
  CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
  Date,
  JSON,
  URL,
  URLSearchParams,
  clearTimeout,
  console: { warn() {}, log() {} },
  document: documentStub,
  setTimeout,
  window: windowStub
}));

const auth = windowStub.SynapseAuth;
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
