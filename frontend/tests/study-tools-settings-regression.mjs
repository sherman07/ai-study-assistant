import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const sources = {
  reactTools: read("frontend/src/react/components/StudyTools.js"),
  settings: readLegacyControllerSections("02_openvisualmodal.js"),
  timeline: readLegacyControllerSections("03_rendertimeline.js"),
  mastery: readLegacyControllerSections("04_masterygraph.js"),
  visualGuide: readLegacyControllerSections("04_rendervisualguidelaunch.js"),
  flashcards: readLegacyControllerSections("04_rendervisualguidelaunch.js"),
  flashcardState: readLegacyControllerSections("06_deleteflashcarddeck.js"),
  quiz: readLegacyControllerSections("05_persistcurrentquiztohistory.js"),
  broadcast: readLegacyControllerSections("12_broadcastjobs.js")
};

assert.match(sources.reactTools, /openStudyToolSettingsModal.*mindmap/s, "Mind Map exposes settings in the React panel header");
assert.match(sources.reactTools, /openAiBroadcastSetup/, "AI Broadcast exposes its existing setup as settings");
assert.match(sources.timeline, /openStudyToolSettingsModal\('timeline'\)/, "Study Path exposes settings");
assert.match(sources.timeline, /openStudyToolSettingsModal\('visualguide'\)/, "Image Guide exposes settings");
assert.match(sources.mastery, /openStudyToolSettingsModal\('masterygraph'\)/, "Exam Readiness exposes settings");
assert.match(sources.quiz, /openQuizSettingsModal\(\)/, "Quiz settings remain available");
assert.match(sources.flashcards, /Flashcard settings/, "Flashcards expose settings");
assert.match(sources.broadcast, /openAiBroadcastSetup/, "AI Broadcast setup remains available");

for (const tool of ["mindmap", "visualguide", "timeline", "masterygraph"]) {
  assert.match(sources.settings, new RegExp(`${tool}: \\{`), `${tool} has persisted settings defaults`);
}
assert.match(sources.settings, /studyToolSettingsOverlay/, "Shared settings modal is rendered");
assert.match(sources.settings, /settings-pattern-modal/, "Shared settings modal uses the compact settings pattern");
assert.match(sources.timeline, /pace: toolSettings\.pace/, "Study Path settings reach generation");
assert.match(sources.visualGuide, /visual_style: toolSettings\.style/, "Image Guide settings reach generation");
assert.match(sources.flashcardState, /FLASHCARD_SETTINGS_KEY/, "Flashcard settings remain persisted");
assert.match(sources.flashcardState, /openFlashcardSettingsModal/, "Flashcard settings open in a modal");
assert.match(sources.flashcardState, /saveFlashcardSettingsModal\(true\)/, "Flashcard modal can save and generate");
assert.match(sources.broadcast, /BROADCAST_SETTINGS_KEY/, "Broadcast settings remain persisted");
assert.match(sources.broadcast, /openBroadcastSettingsModal/, "Broadcast settings open in a modal");
assert.match(sources.broadcast, /saveBroadcastSettingsModal\(true\)/, "Broadcast modal can save and generate");
assert.match(sources.quiz, /settings-pattern-modal/, "Quiz settings use the shared compact modal pattern");

console.log("study-tools-settings-regression: passed");
