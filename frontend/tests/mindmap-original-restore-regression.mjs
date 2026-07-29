import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");

const mind = read("frontend/src/legacy/controller_sections/06_deleteflashcarddeck.js");
const boot = read("frontend/src/legacy/controller_sections/99_boot.js");
const css = read("frontend/styles/07-section.css");
const studyTools = read("frontend/src/react/components/StudyTools.js");
const index = read("frontend/index.html");
const backend = read("backend/app_sections/03_download_youtube_media.py");

assert.ok(mind.includes('class="mm-shell"'), "original mm-shell required");
assert.ok(mind.includes("mm-map-scroll"), "original scrollable map required");
assert.ok(!mind.includes("mm-shell--theta"), "theta shell must be removed");
assert.ok(!mind.includes("function drawMindMapLinks"), "SVG curved links must be removed");
assert.ok(!mind.includes("function adjustMindMapZoom"), "zoom/pan toolbar must be removed");
assert.ok(!boot.includes("drawMindMapLinks"), "boot must not export SVG link drawer");
assert.ok(!boot.includes("adjustMindMapZoom"), "boot must not export zoom helpers");
assert.ok(css.includes(".mm-map-scroll"), "original scroll container styles required");
assert.ok(css.includes(".mm-tree-list::before"), "original CSS trunk line required");
assert.ok(css.includes(".mm-tree-branch::before"), "original CSS branch connectors required");
assert.ok(!css.includes(".mm-viewport"), "theta viewport overlay must be removed");
assert.ok(!css.includes(".mm-links"), "SVG link layer styles must be removed");
assert.ok(studyTools.includes("Explore branches and jump straight into the related note section."), "Mind Map copy should match original");
assert.ok(mind.includes("Prefer the original paragraph so detail cards stay complete"), "keep complete paragraph detail cards");
assert.ok(backend.includes("never mid-word"), "keep backend paragraph completeness fix");
assert.ok(index.includes("mindmap-original-v1"), "cache-bust after restoring original mind map");

console.log("mindmap-original-restore-regression: passed");
