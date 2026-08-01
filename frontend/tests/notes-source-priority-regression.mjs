import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const layoutCss = read("frontend/styles/01-section.css");
const sectionCss = read("frontend/styles/02-section.css");
const toolsCss = read("frontend/styles/04-section.css");
const themeCss = read("frontend/styles/00-theme.css");
const sourceViewer = read("frontend/src/legacy/controller_sections/09_togglesourceviewer.js");
const transcript = read("frontend/src/legacy/controller_sections/08_extractrealtimeresponsetranscript.js");
const analysis = read("frontend/src/react/components/AnalysisStage.js");
const index = read("frontend/index.html");

assert.match(
  layoutCss,
  /\.result-grid\.source-open\s*\{[\s\S]*?var\(--notes-split-notes\)[\s\S]*?var\(--notes-split-source\)/,
  "generated notes should own the majority of the split width via resizable tracks"
);
assert.match(
  layoutCss,
  /\.notes-source-splitter/,
  "notes and source preview should share a draggable divider"
);
assert.match(
  analysis,
  /notes-scroll/,
  "AnalysisStage should wrap note body content in a dedicated scroll region"
);
assert.match(
  layoutCss,
  /\.source-open \.notes-card\s*\{[\s\S]*?overflow:\s*hidden/,
  "notes card should contain an internal scrollport instead of scrolling the whole pane"
);
assert.match(
  layoutCss,
  /\.source-open \.notes-card \.notes-toolbar\s*\{[\s\S]*?(?:position:\s*sticky|position:\s*relative)/,
  "notes toolbar should stay fixed while notes content scrolls"
);
assert.match(
  layoutCss,
  /\.source-open \.notes-card \.notes-scroll\s*\{[\s\S]*?overflow:\s*auto/,
  "notes body should be the only scrolling region inside the card"
);
assert.match(
  layoutCss,
  /\.app-layout\.generated-notes-state\.analysis-ready:not\(\.source-viewer-open\) \.notes-area\s*\{[\s\S]*?overflow:\s*hidden/,
  "generated notes page should lock outer notes-area scroll so the toolbar cannot drift"
);
assert.match(
  layoutCss,
  /\.app-layout\.generated-notes-state:not\(\.source-viewer-open\) \.notes-card\s*\{[\s\S]*?overflow:\s*hidden/,
  "generated notes card should own a definite internal scrollport"
);
assert.match(
  layoutCss,
  /\.app-layout\.generated-notes-state:not\(\.source-viewer-open\) \.notes-scroll\s*\{[\s\S]*?overflow:\s*auto/,
  "generated notes body should scroll independently of the toolbar"
);
assert.match(
  sectionCss,
  /\.notes-summary-card\s*\{[\s\S]*?max-width:\s*100%/,
  "note summary cards should use the full reading width instead of a narrow column"
);
assert.match(
  sectionCss,
  /\.source-viewer-panel\s*\{[\s\S]*?top: 12px[\s\S]*?height: min\(78dvh/,
  "source pane should use a contained sticky height aligned with notes"
);
assert.match(
  toolsCss,
  /\.tool-switch-btn\.active\s*\{[\s\S]*?var\(--button-gradient\)/,
  "Mind Map / study tool active tab should use the site button gradient"
);
assert.match(
  themeCss,
  /html\[data-theme\] \.tool-switch-btn\.active\s*\{[\s\S]*?var\(--button-gradient\)/,
  "themed active study tool tabs should match the site button gradient"
);
assert.doesNotMatch(
  toolsCss,
  /\.tool-switch-btn\.active\s*\{[\s\S]*?#8f63ff/,
  "active Mind Map tab should not use the off-palette purple gradient"
);
assert.ok(
  sourceViewer.includes("scheduleSourcePreviewPrefetch"),
  "source previews should preload in the background"
);
assert.ok(
  sourceViewer.includes("if (item.preview)"),
  "cached previews should render immediately without a loading flash"
);
assert.ok(
  transcript.includes("scheduleSourcePreviewPrefetch(sourceViewerItems)"),
  "source item build/restore should start background conversion"
);
assert.ok(
  transcript.includes('classList.toggle("source-viewer-open"'),
  "layout should know when the source viewer is open"
);
assert.ok(
  index.includes("style.css?v="),
  "workspace styles should cache-bust after the notes/source priority pass"
);
assert.ok(
  index.includes("synapse-legacy-controller-combined.js?v="),
  "legacy controller should cache-bust after background preview preload"
);

console.log("notes-source-priority-regression: passed");
