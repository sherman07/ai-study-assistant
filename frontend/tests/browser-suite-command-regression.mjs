/**
 * Regression guard for the browser-test command. Browser probes import a shared
 * guard, so selecting them by a direct puppeteer-core import silently excludes
 * most probes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const browserSuite = packageJson.scripts["test:frontend:chrome"] || "";
const portableSuite = packageJson.scripts["test:frontend"] || "";

assert.match(
  browserSuite,
  /node scripts\/run-browser-probes\.mjs/,
  "the browser suite must use the dedicated browser-probe runner",
);
assert.doesNotMatch(
  browserSuite,
  /grep -q ['\"]puppeteer-core['\"]/,
  "the browser suite must not infer probes from a transitive implementation import",
);
assert.match(
  portableSuite,
  /grep -q ['\"]prepareChromeProbe['\"]/,
  "the portable suite must explicitly exclude browser probes rather than relying on a dependency import",
);
assert.doesNotMatch(
  portableSuite,
  /grep -q ['\"]puppeteer-core['\"]/,
  "the portable suite must not infer browser probes from a transitive implementation import",
);

console.log("browser suite command regression passed");
