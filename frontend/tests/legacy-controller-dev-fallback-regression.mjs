import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const loader = fs.readFileSync(
  path.join(repoRoot, "frontend/src/legacy/controllerLoader.js"),
  "utf8"
);
const workspace = fs.readFileSync(
  path.join(repoRoot, "frontend/index.html"),
  "utf8"
);

assert.doesNotMatch(
  workspace,
  /<script[^>]+synapse-legacy-controller-combined\.js/,
  "workspace HTML should not request a build-only generated controller directly"
);
assert.match(
  loader,
  /synapse-legacy-controller-combined\.js[\s\S]*fetch\(combinedUrl\)/,
  "controller loader should try the published combined runtime"
);
assert.match(
  loader,
  /contentType\.toLowerCase\(\)\.includes\("text\/html"\)/,
  "controller loader should reject an HTML SPA fallback as JavaScript"
);
assert.match(
  loader,
  /this\.definitionFiles\.map\(fileName => this\.fetchSection\(fileName\)\)/,
  "controller loader should fall back to source sections in development"
);
assert.match(
  loader,
  /this\.executeCombinedScript\(/,
  "controller loader should execute the resolved fallback source"
);

console.log("legacy controller dev fallback regression passed");
