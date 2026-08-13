import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllerSource = readLegacyControllerSections("08_extractrealtimeresponsetranscript.js");
const start = controllerSource.indexOf("async function sha256Hex");
const end = controllerSource.indexOf("function getHistory");

assert.notEqual(start, -1, "sha256Hex should exist");
assert.notEqual(end, -1, "getHistory should follow fingerprint helpers");

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
