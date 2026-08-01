import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const historyNav = read("frontend/src/react/components/HistoryNavigation.js");
const summaryNav = read("frontend/src/react/components/SummaryNavigation.js");
const appShell = read("frontend/src/react/components/AppShell.js");
const uploaded = read("frontend/src/legacy/controller_sections/01_uploadedfiles.js");
const boot = read("frontend/src/legacy/controller_sections/99_boot.js");
const layoutCss = read("frontend/styles/01-section.css");
const sectionCss = read("frontend/styles/02-section.css");

assert.match(historyNav, /workspace-nav-tabs/, "unified rail should expose Library/Outline tabs");
assert.match(historyNav, /setWorkspaceNavTab/, "tab clicks should call setWorkspaceNavTab");
assert.match(historyNav, /SummaryNavigation/, "outline panel should live inside the learning rail");
assert.match(historyNav, /historyNavToggle/, "unified rail should keep a single hide control");
assert.match(summaryNav, /workspace-outline-panel/, "outline should render as an in-rail panel");
assert.doesNotMatch(summaryNav, /nav-logo-text/, "outline should not duplicate Synapse branding");
assert.doesNotMatch(appShell, /h\(SummaryNavigation\)/, "summary must not be a separate grid column in AppShell");

assert.match(uploaded, /function setWorkspaceNavTab/, "setWorkspaceNavTab should exist");
assert.match(uploaded, /WORKSPACE_NAV_TAB_KEY/, "workspace tab preference should persist");
assert.match(uploaded, /setWorkspaceNavTab\("outline"/, "opening notes should switch to Outline");
assert.match(uploaded, /notesReady && tab === "outline"/, "Outline should require generated-notes-state");
assert.match(boot, /setWorkspaceNavTab/, "boot should expose setWorkspaceNavTab");

assert.match(
  layoutCss,
  /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(280px, clamp\(300px, 22vw, 380px\)\)/,
  "desktop grid should only include notes + tutor after unifying the left rail"
);
assert.match(
  layoutCss,
  /\.app-layout\.has-learning-rail:not\(\.history-collapsed\)\s*\{[\s\S]*?padding-left: 280px;/,
  "open learning rail should reserve horizontal space instead of overlaying content"
);
assert.match(
  layoutCss,
  /\.workspace-nav-tabs/,
  "unified rail tab strip styles should exist"
);
assert.match(
  layoutCss,
  /\.result-grid\.source-open\s*\{[\s\S]*?var\(--notes-split-notes\)[\s\S]*?var\(--notes-split-divider\)[\s\S]*?var\(--notes-split-source\)/,
  "sources split should prioritize generated notes with a resizable divider track"
);
assert.match(
  layoutCss,
  /\.notes-source-splitter/,
  "notes/source split should expose a draggable divider"
);
assert.match(
  layoutCss,
  /\.app-layout\.source-viewer-open \.notes-header\.compact-header/,
  "open sources should compact the materials header so both panes sit on one level"
);
assert.match(
  layoutCss,
  /\.app-layout:not\(\.assistant-closed\) \.result-grid\.source-open\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/,
  "sources + tutor should stack on typical widths so notes are not crushed"
);
assert.match(
  sectionCss,
  /\.app-layout:not\(\.assistant-closed\) \.source-open \.source-viewer-panel/,
  "sources panel should reflow when the tutor is open"
);
assert.match(
  sectionCss,
  /\.source-viewer-panel\s*\{[\s\S]*?height: min\(78dvh/,
  "source pane height should use a contained sticky reading height"
);
assert.match(
  sectionCss,
  /\.result-grid\.source-open \.notes-source-splitter[\s\S]*?display: none/,
  "mobile widths should hide the horizontal resize divider"
);

console.log("workspace-nav-responsive-regression: passed");
