import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");

const mind = read("frontend/src/legacy/controller_sections/06_deleteflashcarddeck.js");
const backend = read("backend/app_sections/03_download_youtube_media.py");
const index = read("frontend/index.html");

assert.ok(mind.includes('dataset.mindmapEngine = "theta-v1"'), "keep the previous mind map engine/UI");
assert.ok(!mind.includes("mindMapElbowPath"), "do not keep the connector polish rewrite");
assert.ok(mind.includes("return `${clipped || sliced}…`") || mind.includes("…`"), "display soft-trim must end on a word with ellipsis");
assert.ok(mind.includes("Keep ellipsis markers from the generator"), "fullMindText must preserve completeness markers");
assert.ok(mind.includes("Prefer the original paragraph so detail cards stay complete"), "detail cards should keep full paragraphs");
assert.ok(backend.includes("never mid-word"), "backend short_mindmap_text must avoid mid-word cuts");
assert.ok(backend.includes("short_mindmap_text(detail_text, 1200)"), "AI mind map details should keep fuller paragraphs");
assert.ok(index.includes("mindmap-text-v1"), "cache-bust after paragraph completeness fix");

console.log("mindmap-complete-text-regression: passed");
