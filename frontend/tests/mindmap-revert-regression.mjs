import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");

const mind = readLegacyControllerSections("06_deleteflashcarddeck.js");
const boot = readLegacyControllerSections("99_boot.js");
const css = read("frontend/styles/07-section.css");
const backend = read("backend/app_sections/03_download_youtube_media.py");
const index = read("frontend/index.html");

assert.ok(mind.includes("mm-map-scroll"), "original scrollable mind map required");
assert.ok(!mind.includes("drawMindMapLinks"), "theta SVG link functions must be removed");
assert.ok(!mind.includes("adjustMindMapZoom"), "theta zoom functions must be removed");
assert.ok(!mind.includes("mm-shell--theta"), "theta shell must be removed");
assert.ok(!boot.includes("drawMindMapLinks"), "boot must not export theta link helpers");
assert.ok(!css.includes(".mm-links"), "theta SVG link CSS must be removed");
assert.ok(css.includes(".mm-tree-list::before"), "original CSS connectors required");
assert.ok(!backend.includes("never mid-word"), "custom paragraph rewrite must be removed");
assert.ok(backend.includes("value[: limit - 1]"), "original short_mindmap_text required");
assert.ok(/mindmap-revert-v1|notes-taller-v2|notes-responsive-v2|credits-live-v2/.test(index), "cache-bust after full mind map revert");

console.log("mindmap-revert-regression: passed");
