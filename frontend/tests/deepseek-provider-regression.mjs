import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const providerOptions = read("frontend/src/react/constants.js");
const uploadController = read("frontend/src/legacy/controller_sections/01_uploadedfiles.js");
const accountSettings = read("frontend/src/legacy/controller_sections/08_extractrealtimeresponsetranscript.js");

assert.match(providerOptions, /\["deepseek", "DeepSeek", "Use the DeepSeek text model configured on the backend\."\]/);
assert.match(uploadController, /provider === "deepseek"[\s\S]{0,80}return "deepseek"/);
assert.match(accountSettings, /\["deepseek", "DeepSeek"\]/);

console.log("deepseek provider regression passed");
