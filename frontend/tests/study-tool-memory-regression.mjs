import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const controller = read("frontend/src/legacy/controller.js");
const switchTool = read("frontend/src/legacy/controller_sections/02_openvisualmodal.js");
const history = read("frontend/src/legacy/controller_sections/09_togglesourceviewer.js");
const broadcast = read("frontend/src/legacy/controller_sections/12_broadcastjobs.js");
const boot = read("frontend/src/legacy/controller_sections/99_boot.js");
const memory = read("frontend/src/legacy/controller_sections/13_studytoolmemory.js");

assert.ok(controller.includes('"13_studytoolmemory.js"'), "controller should load the shared study-tool memory section");
assert.ok(switchTool.includes("persistStudyToolMemory"), "tool switching should save the current generated state");
assert.ok(switchTool.includes("rememberActiveStudyTool"), "tool switching should remember the active tool");
assert.ok(switchTool.includes("renderCurrentBroadcastOrSetup"), "broadcast should resume instead of always opening setup");
assert.ok(history.includes("restoreStudyToolMemory"), "history loading should restore generated tool state");
assert.match(
  history,
  /persistStudyToolMemory[\s\S]{0,260}currentHistoryId !== item\.id/,
  "history loading should persist tool memory before switching notes"
);
assert.ok(history.includes("getRememberedStudyTool"), "history loading should restore the last active tool");
assert.ok(history.includes("deleteStudyToolMemory"), "deleting a note should delete its tool memory");

for (const token of [
  "STUDY_TOOL_MEMORY_STORAGE_KEY",
  "mindmap",
  "visualguide",
  "timeline",
  "quiz",
  "flashcards",
  "persistStudyToolMemory",
  "restoreStudyToolMemory",
  "pagehide",
  "visibilitychange"
]) {
  assert.ok(memory.includes(token), `shared study-tool memory should include ${token}`);
}

assert.ok(broadcast.includes("getBroadcastJobsForCurrentNote"), "broadcast history should be scoped to the current note");
assert.ok(broadcast.includes("getCurrentBroadcastJob"), "broadcast should select the current note's latest job");
assert.ok(broadcast.includes("renderCurrentBroadcastOrSetup"), "broadcast should expose resume-or-setup behavior");
assert.ok(boot.includes("getRememberedStudyTool"), "boot should expose the remembered tool selector");

console.log("study tool memory regression passed");
