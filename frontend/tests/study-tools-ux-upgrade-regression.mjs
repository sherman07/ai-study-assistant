import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");

const studyTools = read("frontend/src/react/components/StudyTools.js");
const controller = read("frontend/src/legacy/controller.js");
const switchTool = read("frontend/src/legacy/controller_sections/02_openvisualmodal.js");
const flashcards = read("frontend/src/legacy/controller_sections/06_deleteflashcarddeck.js");
const boot = read("frontend/src/legacy/controller_sections/99_boot.js");
const css = read("frontend/styles/04-section.css");
const flashCss = read("frontend/styles/07-section.css");
const index = read("frontend/index.html");

for (const id of [
  "toolBtnMindMap",
  "toolBtnFlashcards",
  "toolBtnQuiz",
  "toolBtnTimeline",
  "toolBtnMasteryGraph",
  "toolBtnVisualGuide",
  "toolBtnBroadcast",
]) {
  assert.ok(studyTools.includes(id), `StudyTools React shell should declare ${id}`);
}

assert.ok(studyTools.includes('role: "tab"'), "study tool buttons need tab roles");
assert.ok(studyTools.includes('role: "tabpanel"'), "study tool panels need tabpanel roles");
assert.ok(studyTools.includes('data-study-tools-shell": "v2"') || studyTools.includes("data-study-tools-shell\": \"v2\""), "shell version marker required");

assert.ok(controller.includes("study-tool-launch-points"), "launch cards should list what the tool does");
assert.ok(controller.includes("function showStudyToolNotice"), "inline notices should replace raw alerts where possible");
assert.ok(controller.includes("function syncStudyToolTabState"), "tab state sync required for a11y");
assert.ok(switchTool.includes("syncStudyToolTabState"), "switchTool must sync tab aria state");
assert.ok(flashcards.includes("gradeFlashcard"), "flashcards need Anki/Quizlet-style confidence grading");
assert.ok(flashcards.includes("flashcard-grade-btn"), "grade buttons must render in study view");
assert.ok(boot.includes("gradeFlashcard"), "gradeFlashcard must be exported on window");
assert.ok(css.includes("study-tool-notice-host"), "toast host styles required");
assert.ok(css.includes("scroll-snap-type"), "mobile tool switcher should scroll cleanly");
assert.ok(flashCss.includes("flashcard-grade-row"), "flashcard grade styles required");
assert.ok(index.includes("mindmap-text-v1"), "workspace assets should cache-bust after study tools UX upgrade");

console.log("study-tools-ux-upgrade-regression: passed");
