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

assert.ok(mind.includes('dataset.mindmapEngine = "theta-v1"'), "mind map should mark theta engine");
assert.ok(mind.includes("function drawMindMapLinks"), "SVG curved links required");
assert.ok(mind.includes("function adjustMindMapZoom"), "zoom controls required");
assert.ok(mind.includes("function fitMindMapView"), "fit-to-view required");
assert.ok(mind.includes("function bindMindMapViewportInteractions"), "pan/drag interactions required");
assert.ok(mind.includes("mm-shell--theta"), "theta shell class required");
assert.ok(mind.includes("mindMapCurvePath"), "cubic curve helper required");
assert.ok(mind.includes("openActiveMindMapSection"), "go to notes action must remain");
assert.ok(mind.includes("askSelectedMindPoint"), "ask tutor action must remain");
assert.ok(boot.includes("adjustMindMapZoom"), "zoom helpers must be window-exported");
assert.ok(boot.includes("fitMindMapView"), "fit helper must be window-exported");
assert.ok(css.includes(".mm-viewport"), "viewport styles required");
assert.ok(css.includes(".mm-links"), "SVG link layer styles required");
assert.ok(css.includes("@keyframes mmNodeIn"), "node entrance animation required");
assert.ok(studyTools.includes("zoom and pan"), "Mind Map copy should mention zoom/pan");
assert.ok(index.includes("mindmap-text-v1"), "cache-bust after mind map upgrade");

console.log("mindmap-theta-quality-regression: passed");
