import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const controller = read("frontend/src/legacy/controller.js");
const studyTools = read("frontend/src/react/components/StudyTools.js");
const timeline = read("frontend/src/legacy/controller_sections/02_openvisualmodal.js");
const visualGuide = read("frontend/src/legacy/controller_sections/04_rendervisualguidelaunch.js");
const mastery = read("frontend/src/legacy/controller_sections/04_masterygraph.js");
const quiz = read("frontend/src/legacy/controller_sections/05_persistcurrentquiztohistory.js");
const flashcards = read("frontend/src/legacy/controller_sections/06_deleteflashcarddeck.js");
const broadcast = read("frontend/src/legacy/controller_sections/12_broadcastjobs.js");

assert.match(controller, /function renderStudyToolLaunch\(/, "Study Tools use one shared launch renderer");
assert.match(controller, /data-generation-cost=\"0\"/, "Launch cards declare a zero-token generation cost");
assert.match(controller, /No tokens used for this first generation/, "Launch cards communicate the free first generation");

for (const [tool, source] of [
  ["timeline", timeline],
  ["visualguide", visualGuide],
  ["masterygraph", mastery],
  ["quiz", quiz],
  ["flashcards", flashcards],
  ["broadcast", broadcast]
]) {
  assert.match(source, new RegExp(`tool: \"${tool}\"`), `${tool} uses the shared launch renderer`);
  assert.match(source, /actionLabel:/, `${tool} has an explicit generate action label`);
}

const mindMapTool = studyTools.match(/id:\s*"mindmap"[\s\S]*?id:\s*"flashcards"/)?.[0] || "";
assert.ok(mindMapTool, "Mind Map panel remains present in the StudyTools catalogue");
assert.doesNotMatch(mindMapTool, /data-study-tool-generate/, "Mind Map remains the only tool without a generate CTA");
assert.match(studyTools, /data-study-tool-generate.*broadcast/, "Broadcast initial state has a generate CTA");
assert.match(mastery, /function generateExamReadiness\(/, "Exam Readiness has an explicit generation action");

console.log("study-tools-launch-regression: passed");
