import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authClientSource, landingAuthSource, focusRoomStoreSource, focusRoomDataSource, companionWorkspaceSource } from "./_sourceTrees.mjs";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const appShell = read("frontend/src/react/components/AppShell.js");
const historyNavigation = read("frontend/src/react/components/HistoryNavigation.js");
const controller = read("frontend/src/legacy/controller.js");
const modeSection = readLegacyControllerSections("14_learningcompanion.js");
const companionWorkspace = companionWorkspaceSource();
const companionClient = read("frontend/src/legacy/learningCompanionClient.js");
const uploadStage = read("frontend/src/react/components/UploadStage.js");
const styles = read("frontend/styles/01-section.css");

assert.ok(!appShell.includes("LearningModeSwitcher"), "The duplicate top-right Materials / Companion switch is not rendered");
assert.ok(appShell.includes("CompanionWorkspace"));
assert.ok(historyNavigation.includes("dark-learning-rail"));
assert.ok(historyNavigation.includes("learning-rail-new-chat"));
assert.ok(historyNavigation.includes("learning-rail-materials"));
assert.ok(historyNavigation.includes("learning-rail-companion"));
assert.ok(historyNavigation.includes("history-account-rail"));
assert.ok(controller.includes('"14_learningcompanion.js"'));
assert.ok(modeSection.includes("const LEARNING_EXPERIENCE_STORAGE_KEY"));
assert.ok(modeSection.includes("function setLearningExperienceMode(mode)"));
assert.ok(modeSection.includes('mode !== "materials" && mode !== "companion"'));
assert.ok(
  modeSection.includes("layout.dataset.learningExperienceMode") ||
    modeSection.includes("appLayout.dataset.learningExperienceMode"),
  "learning mode should be stored on the app layout dataset"
);
assert.ok(modeSection.includes("openWorkspaceHome"), "rail jumps should leave generated notes via openWorkspaceHome");
assert.ok(styles.includes('[data-learning-experience-mode="companion"]'));
assert.ok(companionWorkspace.includes("data-learning-companion-send"));
assert.ok(companionWorkspace.includes("data-learning-companion-new-chat"));
assert.ok(companionWorkspace.includes("data-learning-companion-retry"));
assert.ok(companionWorkspace.includes("data-learning-companion-starter"));
assert.ok(companionWorkspace.includes("CONVERSATION_STARTERS"));
assert.ok(companionWorkspace.includes("loadLearningCompanionThread"));
assert.ok(companionWorkspace.includes("if (!persistThread(nextThread))"));
assert.ok(!companionWorkspace.includes("companion-start-form"));
assert.ok(!companionWorkspace.includes("data-learning-companion-create-subject"));
assert.ok(!companionClient.includes('"/api/learning/subjects"'));
assert.ok(companionClient.includes("body?.reply"));
assert.ok(companionClient.includes('"/learning-companion/respond"'));
assert.ok(styles.includes('[data-learning-experience-mode="companion"] .learning-experience-shell'));
assert.ok(
  styles.includes('app-layout[data-learning-experience-mode="companion"] .notes-area')
    || styles.includes('.app-layout[data-learning-experience-mode="companion"] .notes-area'),
  "companion mode should take over the notes pane"
);
assert.ok(styles.includes("border-radius: 0"), "fullscreen companion should drop the floating card radius");
assert.ok(styles.includes(".companion-chat-thread"));
assert.ok(styles.includes(".companion-composer"));
assert.ok(styles.includes(".companion-starter-grid"));
assert.ok(styles.includes(".companion-study-dock"));
assert.ok(styles.includes(".companion-turn-failure"));
assert.ok(!styles.includes(".companion-start-form"));
assert.ok(!uploadStage.includes("Start with AI tutor"), "upload should not duplicate the Companion navigation action");
assert.ok(!uploadStage.includes('legacyAction("setLearningExperienceMode", "companion")'));
assert.ok(!styles.includes(".companion-launch-btn"));
assert.ok(styles.includes(".dark-learning-rail"));
assert.ok(styles.includes(".learning-rail-actions"));
assert.ok(styles.includes("background: var(--color-sidebar-background);"), "The history rail consumes the global theme surface");
assert.ok(styles.includes("background: var(--color-page-background) !important;"), "The initial workspace follows the document theme");

console.log("ai learning companion shell regression passed");
