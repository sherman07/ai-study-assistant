/**
 * Legacy controller must recover when the prebuilt combined artifact is missing
 * (Vite/dev) by assembling controller_sections in the browser.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const loader = fs.readFileSync(
  path.join(root, "frontend/src/legacy/controllerLoader.js"),
  "utf8"
);
const indexHtml = fs.readFileSync(path.join(root, "frontend/index.html"), "utf8");
const copyScript = fs.readFileSync(
  path.join(root, "scripts/copy_frontend_runtime_assets.mjs"),
  "utf8"
);

assert.match(loader, /assembleAndRunCombinedController/, "loader must assemble sections when combined is missing");
assert.match(loader, /waitForCombinedController/, "loader must bound-wait for the combined ready event");
assert.match(
  loader,
  /expected JavaScript, received HTML/,
  "section fetch must reject Vite HTML fallbacks for missing assets"
);
assert.match(
  loader,
  /__synapseCombinedControllerReady = true/,
  "assembled controller must mark the same ready flag as the production artifact"
);
assert.match(
  indexHtml,
  /synapse-legacy-controller-combined\.js/,
  "workspace HTML still references the production combined controller artifact"
);
assert.match(
  copyScript,
  /writeLegacyControllerCombined/,
  "production copy step must still emit the combined controller artifact"
);
assert.ok(
  fs.existsSync(path.join(root, "scripts/ensure_legacy_controller_combined.mjs")),
  "local stack must be able to generate the combined controller for Vite"
);
assert.ok(
  fs.existsSync(path.join(root, "scripts/legacy_controller_combined.mjs")),
  "combined controller builder must be shared between build and local ensure"
);

console.log("legacy-controller-dev-fallback-regression: passed");
