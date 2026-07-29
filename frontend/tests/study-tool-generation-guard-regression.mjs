import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const timeline = read("frontend/src/legacy/controller_sections/03_rendertimeline.js");
const visualGuide = read("frontend/src/legacy/controller_sections/04_rendervisualguidelaunch.js");
const quiz = read("frontend/src/legacy/controller_sections/05_persistcurrentquiztohistory.js");
const flashcards = read("frontend/src/legacy/controller_sections/06_deleteflashcarddeck.js");
const broadcast = read("frontend/src/legacy/controller_sections/12_broadcastjobs.js");

function assertEarlyBusyGuard(source, fnName, busyFlag) {
  const start = source.indexOf(`async function ${fnName}`);
  assert.ok(start >= 0, `${fnName} should exist`);
  const end = source.indexOf("\nasync function ", start + 10);
  const body = source.slice(start, end > start ? end : start + 500);
  assert.match(body, new RegExp(`if \\(${busyFlag}\\) return;`), `${fnName} must refuse re-entry while ${busyFlag}`);
}

assertEarlyBusyGuard(timeline, "generateTimeline", "isTimelineGenerating");
assertEarlyBusyGuard(visualGuide, "generateVisualGuide", "isVisualGuideGenerating");
assertEarlyBusyGuard(quiz, "generateQuiz", "isQuizGenerating");
assertEarlyBusyGuard(flashcards, "generateFlashcards", "isFlashcardGenerating");

const broadcastStart = broadcast.indexOf("async function generateBroadcastFromSetup");
assert.ok(broadcastStart >= 0, "generateBroadcastFromSetup should exist");
const broadcastBody = broadcast.slice(broadcastStart, broadcastStart + 700);
assert.match(
  broadcastBody,
  /BROADCAST_ACTIVE_STATUSES\.has\(job\.status\)/,
  "broadcast generation must refuse when a job is already active for the note"
);

console.log("study-tool-generation-guard-regression: passed");
