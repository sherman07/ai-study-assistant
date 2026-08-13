import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const analysis = read("frontend/src/react/components/AnalysisStage.js");
const sourceViewer = readLegacyControllerSections("09_togglesourceviewer.js");
const transcript = readLegacyControllerSections("08_extractrealtimeresponsetranscript.js");
const boot = readLegacyControllerSections("99_boot.js");
const layoutCss = read("frontend/styles/01-section.css");
const sectionCss = read("frontend/styles/02-section.css");
const index = read("frontend/index.html");
const controllerLoader = read("frontend/src/legacy/controllerLoader.js");

assert.match(analysis, /notesSourceSplitter/, "AnalysisStage should render the notes/source splitter");
assert.match(analysis, /notes-source-splitter-handle/, "splitter should include a visible handle");
assert.match(analysis, /"aria-orientation":\s*"vertical"/, "splitter should be exposed as a vertical separator");

for (const token of [
  "NOTES_SOURCE_SPLIT_STORAGE_KEY",
  "bindNotesSourceSplitter",
  "applyNotesSourceSplitRatio",
  "resetNotesSourceSplitRatio",
  "updateNotesSourceSplitFromClientX",
  "persistNotesSourceSplitRatio",
  "isNotesSourceSplitResizable",
  "setPointerCapture",
  "dblclick",
  "ArrowLeft"
]) {
  assert.ok(sourceViewer.includes(token), `resizable split should include ${token}`);
}

assert.ok(boot.includes("bindNotesSourceSplitter"), "boot should initialize the splitter");
assert.ok(boot.includes("applyNotesSourceSplitRatio"), "boot should expose split ratio helpers");
assert.ok(transcript.includes("bindNotesSourceSplitter"), "opening sources should sync the splitter");

assert.match(layoutCss, /cursor:\s*col-resize/, "divider should use the col-resize cursor");
assert.match(layoutCss, /\.result-grid\.source-open\.is-resizing/, "dragging should lock selection/pointer on panes");
assert.match(layoutCss, /body\.notes-source-split-resizing/, "document should suppress text selection while dragging");
assert.match(layoutCss, /iframe/, "iframe hit-testing should be disabled while dragging");
assert.match(
  sectionCss,
  /\.result-grid\.source-open \.notes-source-splitter[\s\S]*display:\s*none/,
  "mobile should disable the horizontal splitter"
);

assert.ok(index.includes("style.css?v="), "styles should cache-bust for the resizable split");
assert.ok(
  controllerLoader.includes('synapse-legacy-controller-combined.js') && controllerLoader.includes('?v=${this.version}'),
  "controller loader should cache-bust for the resizable split"
);

console.log("notes-source-resizable-split-regression: passed");
