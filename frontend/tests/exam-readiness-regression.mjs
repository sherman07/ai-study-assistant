import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const studyTools = read("frontend/src/react/components/StudyTools.js");
const masteryGraph = read("frontend/src/legacy/controller_sections/04_masterygraph.js");
const timeline = read("frontend/src/legacy/controller_sections/03_rendertimeline.js");
const backendStudyPath = read("backend/app_sections/11_timeline_generate.py");
const styles = read("frontend/styles/07-section.css");
const styleRoot = read("frontend/style.css");

assert.ok(studyTools.includes("Exam Readiness"), "Study Tools should expose Exam Readiness as a first-class tool");
assert.ok(studyTools.includes('buttonId: "toolBtnTimeline"'), "Study Path button should be present in the React shell");
assert.ok(studyTools.includes('buttonId: "toolBtnQuiz"'), "Quiz button should be present in the React shell");
assert.ok(!studyTools.includes("tool-switch-btn disabled"), "Study Tools should not render disabled placeholder buttons");
assert.ok(studyTools.includes('legacyTargetAction("switchTool", tool.id)'), "Study Path/Quiz buttons should switch tools through the shared switchTool bridge");
assert.ok(studyTools.includes('id: "timeline"') && studyTools.includes('id: "quiz"'), "Study Path and Quiz remain declared study tools");

assert.ok(masteryGraph.includes("function renderExamReadinessSummary("), "Exam Readiness should render a compact readiness summary");
assert.ok(masteryGraph.includes("recommended next action"), "Exam Readiness should explain the next action");
assert.ok(masteryGraph.includes("Weak topics"), "Exam Readiness should show weak topics");
assert.ok(masteryGraph.includes("toolBtnMasteryGraph"), "Exam Readiness should still use the existing mastery graph hook");
assert.ok(masteryGraph.includes("Exam Readiness"), "Memory Engine should be reframed as Exam Readiness");

assert.ok(timeline.includes("const targetEvent = getTimelineEventById(id);"), "Timeline completion should resolve the completed event before recording progress");
assert.ok(timeline.includes("recordMasteryGraphPathProgress(targetEvent?.section || targetEvent?.title || id);"), "Timeline completion should feed the resolved event into readiness progress");

assert.ok(backendStudyPath.includes('"misconception": "specific misunderstanding or common mistake this task repairs"'), "Study path prompt should require misconception details");
assert.ok(backendStudyPath.includes('"exam_use": "how this task prepares the student for an exam question"'), "Study path prompt should require exam-use details");
assert.ok(backendStudyPath.includes('"source_reference": "section, source, slide, page, figure, or concept this task is grounded in"'), "Study path prompt should require source references");

assert.ok(styles.includes(".exam-readiness-summary"), "Exam Readiness summary styles should be available");
assert.ok(styleRoot.includes('@import url("./styles/07-section.css");'), "Root stylesheet should import Exam Readiness styles");
assert.ok(styles.includes(".readiness-next-action"), "Next-action styles should be available");

console.log("exam readiness regression passed");
