import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const companion = readLegacyControllerSections("14_learningcompanion.js");
const boot = readLegacyControllerSections("99_boot.js");
const summaryNav = read("frontend/src/react/components/SummaryNavigation.js");
const layoutCss = read("frontend/styles/01-section.css");

assert.match(companion, /function openWorkspaceHome/, "rail jumps need openWorkspaceHome");
assert.match(companion, /function isGeneratedWorkspaceView/, "generated-view detection should exist");
assert.match(
  companion,
  /if \(isGeneratedWorkspaceView\(\)\) \{\s*openWorkspaceHome\(mode\);/,
  "Materials/Companion clicks must leave generated notes instead of only flipping mode"
);
assert.match(companion, /generated-notes-state/, "home jump should clear generated-notes-state");
assert.match(boot, /openWorkspaceHome/, "boot should expose openWorkspaceHome");

assert.match(
  summaryNav,
  /workspace-nav-panel workspace-outline-panel/,
  "outline panel must participate in the rail flex scroll chain"
);
assert.match(
  layoutCss,
  /\.app-layout\.generated-notes-state #summaryNav:not\(\.collapsed\):not\(\[hidden\]\)\s*\{[\s\S]*?flex: 1 1 auto;[\s\S]*?min-height: 0;/,
  "outline panel should flex-fill the rail so its list can scroll"
);
assert.match(
  layoutCss,
  /\.app-layout\.generated-notes-state #summaryNav \.section-list\s*\{[\s\S]*?overflow-y: auto;/,
  "outline section list must scroll vertically"
);
assert.match(
  layoutCss,
  /#summaryNav \.section-list[\s\S]*?padding-bottom: 88px;/,
  "outline scroll area should clear the pinned account footer"
);

console.log("workspace-nav-jump-scroll-regression: passed");
