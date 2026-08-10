import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllerPath = path.resolve(__dirname, "../src/legacy/controller_sections/08_extractrealtimeresponsetranscript.js");
const controllerSource = fs.readFileSync(controllerPath, "utf8");
const start = controllerSource.indexOf("async function sha256Hex");
const end = controllerSource.indexOf("function getHistory");

assert.notEqual(start, -1, "sha256Hex should exist");
assert.notEqual(end, -1, "getHistory should follow fingerprint helpers");

assert.ok(
  controllerSource.includes("`detail:${detail}`")
    && controllerSource.includes("`prompt:${mode}`")
    && controllerSource.includes("`noteLength:${noteLength}`")
    && controllerSource.includes("`provider:${provider}`"),
  "Client fingerprint must include detail, prompt mode, note length, and provider so job identity matches backend cache knobs"
);

const helperSource = controllerSource.slice(start, end);
const context = vm.createContext({
  console,
  TextEncoder,
  Uint8Array,
  Math,
  globalThis: {
    crypto: null
  }
});
vm.runInContext(`${helperSource}; globalThis.sha256Hex = sha256Hex;`, context);

const first = await context.globalThis.sha256Hex("same source");
const second = await context.globalThis.sha256Hex("same source");
const different = await context.globalThis.sha256Hex("different source");

assert.equal(first, second);
assert.match(first, /^[0-9a-f]{16}$/);
assert.notEqual(first, different);

console.log("client fingerprint regression passed");
