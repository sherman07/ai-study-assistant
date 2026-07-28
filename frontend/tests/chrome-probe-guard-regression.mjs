/**
 * Source-structure guard: Chrome probes soft-skip when dist/Chrome are missing
 * so Layer A remains runnable on clean checkouts.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareChromeProbe } from "./chrome-probe-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const guardSource = fs.readFileSync(path.join(root, "frontend/tests/chrome-probe-guard.mjs"), "utf8");

assert.match(guardSource, /prepareChromeProbe/);
assert.match(guardSource, /dist\/ missing/);
assert.match(guardSource, /puppeteer-core not installed/);

const chromeProbes = [
  "focus-room-setup-first-chrome.mjs",
  "workspace-layout-chrome-combos.mjs",
  "workspace-nav-jump-scroll-chrome.mjs",
  "workspace-outline-accordion-chrome.mjs",
  "notes-source-split-chrome.mjs",
  "source-preview-instant-chrome.mjs",
  "generated-class-functionality-regression.mjs",
  "workspace-ux-deep-audit.mjs",
];

for (const name of chromeProbes) {
  const source = fs.readFileSync(path.join(root, "frontend/tests", name), "utf8");
  assert.match(source, /prepareChromeProbe/, `${name} should use chrome probe guard`);
  assert.doesNotMatch(
    source,
    /executablePath:\s*"\/usr\/bin\/google-chrome-stable"/,
    `${name} should resolve Chrome via the shared guard`,
  );
}

const result = prepareChromeProbe("chrome-probe-guard-regression");
assert.equal(typeof result.ok, "boolean");
if (!result.ok) {
  assert.match(result.reason, /skipped/i);
}

console.log("chrome-probe-guard-regression: passed");
