import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const authClientPages = [
  "billing-success",
  "focus-room",
  "billing-cancel",
  "admin-access",
  "admin-settings",
  "signup",
  "verify",
  "login",
  "index",
  "pricing",
  "reset-password",
  "forgot-password"
].map((name) => fs.readFileSync(path.join(repoRoot, `frontend/${name}.html`), "utf8"));

function makeStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return Array.from(values.keys())[index] || null; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

let clientCreations = 0;
const authApi = {
  onAuthStateChange() {
    return { data: { subscription: { unsubscribe() {} } } };
  },
  async signInWithOAuth() {
    return { error: null };
  }
};

const windowStub = {
  SYNAPSE_SUPABASE_URL: "https://example.supabase.co",
  SYNAPSE_SUPABASE_ANON_KEY: "public-anon-key",
  localStorage: makeStorage(),
  sessionStorage: makeStorage(),
  location: {
    origin: "https://example.com",
    protocol: "https:",
    hostname: "example.com",
    host: "example.com",
    pathname: "/frontend/index.html",
    search: "",
    hash: "",
    href: "https://example.com/frontend/index.html"
  },
  addEventListener() {},
  dispatchEvent() {},
  setTimeout,
  clearTimeout,
  supabase: {
    createClient() {
      clientCreations += 1;
      return { auth: authApi };
    }
  }
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
).href + `?singleton=${Date.now()}`;
const { installAuthClient } = await import(installUrl);
installAuthClient(windowStub);

await Promise.all(Array.from({ length: 6 }, () => windowStub.SynapseAuth.signInWithGoogle()));

assert.equal(
  clientCreations,
  1,
  "concurrent auth calls should share one Supabase client initialization"
);
for (const page of authClientPages) {
  assert.match(page, /auth-client\.js\?v=auth-singleton-v1/, "auth pages should cache-bust the singleton fix");
}

console.log("auth client singleton regression passed");
