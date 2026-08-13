import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { authClientSource as authClientTree, landingAuthSource as landingAuthTree } from "./_sourceTrees.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const apiConfigPath = path.join(repoRoot, "frontend/src/legacy/apiConfig.js");
const dataApiConfigPath = path.join(repoRoot, "frontend/src/legacy/dataApiConfig.js");

async function loadApiBase({ protocol = "http:", hostname = "127.0.0.1", port = "5175", configured = "", backendPort = "" }) {
  const host = hostname.startsWith("[") ? `${hostname}:${port}` : `${hostname}:${port}`;
  globalThis.window = {
    SYNAPSE_API_BASE: configured,
    SYNAPSE_BACKEND_PORT: backendPort,
    location: { protocol, hostname, port, host }
  };
  globalThis.document = { body: { dataset: {} } };
  const url = `${pathToFileURL(apiConfigPath).href}?case=${encodeURIComponent(`${protocol}:${hostname}:${port}:${configured}:${backendPort}:${Date.now()}`)}`;
  return (await import(url)).API_BASE;
}

async function loadDataApiBase({ protocol = "http:", hostname = "127.0.0.1", port = "5175", configured = "", dataApiPort = "" }) {
  const host = hostname.startsWith("[") ? `${hostname}:${port}` : `${hostname}:${port}`;
  globalThis.window = {
    SYNAPSE_DATA_API_BASE: configured,
    SYNAPSE_DATA_API_PORT: dataApiPort,
    location: { protocol, hostname, port, host }
  };
  globalThis.document = { body: { dataset: {} } };
  const url = `${pathToFileURL(dataApiConfigPath).href}?case=${encodeURIComponent(`data:${protocol}:${hostname}:${port}:${configured}:${dataApiPort}:${Date.now()}`)}`;
  return (await import(url)).DATA_API_BASE;
}

async function loadDataApiBaseWithoutBrowserGlobals() {
  delete globalThis.window;
  delete globalThis.document;
  const url = `${pathToFileURL(dataApiConfigPath).href}?case=node-safe-${Date.now()}`;
  return (await import(url)).DATA_API_BASE;
}

assert.equal(
  await loadDataApiBaseWithoutBrowserGlobals(),
  "http://127.0.0.1:3001",
  "data API config should be safe to import from Node regression tests"
);

assert.equal(
  await loadApiBase({ hostname: "[::1]", port: "5175" }),
  "http://127.0.0.1:8001",
  "bracketed IPv6 localhost should use the backend port"
);

assert.equal(
  await loadApiBase({ hostname: "::1", port: "5175" }),
  "http://127.0.0.1:8001",
  "plain IPv6 localhost should use the backend port"
);

assert.equal(
  await loadApiBase({ hostname: "127.0.0.1", port: "5175", backendPort: "9000" }),
  "http://127.0.0.1:9000",
  "custom backend ports should still be respected"
);

assert.equal(
  await loadApiBase({ hostname: "192.168.1.141", port: "5175" }),
  "http://192.168.1.141:8001",
  "private LAN frontend URLs should call the same server's FastAPI backend, not the Vite server"
);

assert.equal(
  await loadApiBase({
    hostname: "192.168.1.141",
    port: "5175",
    configured: "http://192.168.1.141:5175"
  }),
  "http://192.168.1.141:8001",
  "same-origin Vite API overrides on private LAN dev URLs should be redirected to the backend port"
);

assert.equal(
  await loadDataApiBase({ hostname: "192.168.1.141", port: "5175" }),
  "http://192.168.1.141:3001",
  "private LAN frontend URLs should call the same server's data API, not the Vite server"
);

assert.equal(
  await loadDataApiBase({
    hostname: "192.168.1.141",
    port: "5175",
    configured: "http://192.168.1.141:5175"
  }),
  "http://192.168.1.141:3001",
  "same-origin Vite data API overrides on private LAN dev URLs should be redirected to the data API port"
);

assert.equal(
  await loadApiBase({ hostname: "study.example.com", port: "", configured: "https://api.example.com/" }),
  "https://api.example.com",
  "explicit API base should win"
);

const authClientSource = authClientTree();
assert.ok(authClientSource.includes("function isLocalDevHost"));
assert.ok(authClientSource.includes("\"[::1]\""));
assert.ok(authClientSource.includes("isLocalDevHost(hostname) && port !== backendPort"));

const landingAuthSource = landingAuthTree();
assert.ok(landingAuthSource.includes("function isLocalDevHost"));
assert.ok(landingAuthSource.includes("\"[::1]\""));
assert.ok(landingAuthSource.includes("isLocalDevHost(hostname)"));

console.log("api base localhost regression passed");
