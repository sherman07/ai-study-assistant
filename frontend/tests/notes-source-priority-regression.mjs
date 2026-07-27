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
  layoutCss,
  /\.source-open \.notes-card\s*\{[\s\S]*?padding: 14px 22px 22px/,
  "notes card top padding should align with source tabs"
);
assert.match(
  layoutCss,
  /\.source-open \.notes-card\s*\{[\s\S]*?height: calc\(100dvh - 118px\)/,
  "notes pane should use the same height chrome as the source pane"
);
assert.match(
  sectionCss,
  /\.source-viewer-panel\s*\{[\s\S]*?top: 12px[\s\S]*?height: calc\(100dvh - 118px\)/,
  "source pane should stick on the same level as notes"
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
  index.includes("style.css?v=notes-source-split-v1"),
  "workspace styles should cache-bust after the notes/source priority pass"
);
assert.ok(
  index.includes("synapse-legacy-controller-combined.js?v=notes-source-split-v1"),
  "legacy controller should cache-bust after background preview preload"
);

console.log("notes-source-priority-regression: passed");
