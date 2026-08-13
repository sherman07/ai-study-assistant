import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const controller = read("frontend/src/legacy/controller.js");
const launchRenderer = read("frontend/src/features/study-tools/StudyToolLaunch.js");
const timeline = readLegacyControllerSections("02_openvisualmodal.js");
const visualGuide = readLegacyControllerSections("04_rendervisualguidelaunch.js");
const mastery = readLegacyControllerSections("04_masterygraph.js");
const quiz = readLegacyControllerSections("05_persistcurrentquiztohistory.js");
const flashcards = readLegacyControllerSections("06_deleteflashcarddeck.js");
const broadcast = readLegacyControllerSections("12_broadcastjobs.js");

globalThis.React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { StudyTools } = await import(pathToFileURL(path.join(root, "frontend/src/react/components/StudyTools.js")));
const studyToolsHtml = renderToStaticMarkup(React.createElement(StudyTools));

assert.match(controller, /from \"\.\.\/features\/study-tools\/StudyToolLaunch\.js\"/, "Study Tools import the shared launch renderer feature");
assert.match(launchRenderer, /export function renderStudyToolLaunch\(/, "Study Tools use one shared launch renderer");
assert.match(launchRenderer, /data-generation-cost=\"0\"/, "Launch cards declare a zero-token generation cost");
assert.match(launchRenderer, /No tokens used for this first generation/, "Launch cards communicate the free first generation");

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

const mindMapBlock = studyToolsHtml.match(/id="toolPanelMindMap"[\s\S]*?id="toolPanelFlashcards"/)?.[0] || "";
assert.ok(mindMapBlock, "Mind Map panel remains present");
assert.doesNotMatch(mindMapBlock, /data-study-tool-generate/, "Mind Map remains the only tool without a generate CTA");
assert.match(studyToolsHtml, /data-study-tool-generate="broadcast"/, "Broadcast initial state has a generate CTA");
assert.match(mastery, /function generateExamReadiness\(/, "Exam Readiness has an explicit generation action");

console.log("study-tools-launch-regression: passed");
