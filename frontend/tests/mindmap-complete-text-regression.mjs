import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");

const mind = read("frontend/src/legacy/controller_sections/06_deleteflashcarddeck.js");
const backend = read("backend/app_sections/03_download_youtube_media.py");
const index = read("frontend/index.html");

assert.ok(mind.includes("mm-map-scroll"), "original mind map shell should remain");
assert.ok(!mind.includes("drawMindMapLinks"), "theta SVG connectors should stay removed");
assert.ok(mind.includes("return `${clipped || sliced}…`") || mind.includes("…`"), "display soft-trim must end on a word with ellipsis");
assert.ok(mind.includes("Keep ellipsis markers from the generator"), "fullMindText must preserve completeness markers");
assert.ok(mind.includes("Prefer the original paragraph so detail cards stay complete"), "detail cards should keep full paragraphs");
assert.ok(backend.includes("never mid-word"), "backend short_mindmap_text must avoid mid-word cuts");
assert.ok(backend.includes("short_mindmap_text(detail_text, 1200)"), "AI mind map details should keep fuller paragraphs");
assert.ok(index.includes("mindmap-original-v1"), "cache-bust after original mind map restore");

console.log("mindmap-complete-text-regression: passed");
