/**
 * Source-structure guard: study-tool generate actions must refuse duplicate
 * in-flight requests so double-clicks cannot spawn overlapping jobs.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const quiz = read("frontend/src/legacy/controller_sections/05_persistcurrentquiztohistory.js");
const flashcards = read("frontend/src/legacy/controller_sections/06_deleteflashcarddeck.js");
const timeline = read("frontend/src/legacy/controller_sections/03_rendertimeline.js");
const visualGuide = read("frontend/src/legacy/controller_sections/04_rendervisualguidelaunch.js");
const broadcast = read("frontend/src/legacy/controller_sections/12_broadcastjobs.js");
const companion = read("frontend/src/react/components/CompanionWorkspace.js");

assert.match(quiz, /async function generateQuiz\(\) \{\s*if \(isQuizGenerating\) return;/s);
assert.match(flashcards, /async function generateFlashcards\(\) \{\s*if \(isFlashcardGenerating\) return;/s);
assert.match(timeline, /async function generateTimeline\(force = false\) \{\s*if \(isTimelineGenerating\) return;/s);
assert.match(visualGuide, /async function generateVisualGuide\(force = false\) \{\s*if \(isVisualGuideGenerating\) return;/s);
assert.match(
  broadcast,
  /async function generateBroadcastFromSetup\(\) \{\s*const currentJobs = getBroadcastJobsForCurrentNote\(\);\s*if \(currentJobs\.some\(job => BROADCAST_ACTIVE_STATUSES\.has\(job\.status\)\)\)/s,
);
assert.match(
  companion,
  /requestLearningCompanionDecision\(\{\s*message: learnerMessage\.content,\s*messages: history,\s*learningContext: activeThread\.learningContext \|\| \{\},/s,
);

console.log("study-tools-generation-guard-regression: passed");
