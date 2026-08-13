import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authClientSource, landingAuthSource, focusRoomStoreSource, focusRoomDataSource, companionWorkspaceSource } from "./_sourceTrees.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");

const companion = companionWorkspaceSource();
const styles = read("frontend/styles/01-section.css");

assert.match(companion, /CONVERSATION_STARTERS/, "empty state needs goal-oriented starters");
assert.match(companion, /STUDY_DOCK_ACTIONS/, "composer dock needs study actions");
assert.match(companion, /Quiz from notes/, "companion must bridge into notes-based quizzes");
assert.match(companion, /Cards from notes/, "companion must bridge into notes-based flashcards");
assert.match(companion, /openQuizSettingsModal/, "quiz bridge should open quiz settings");
assert.match(companion, /openFlashcardSettingsModal/, "flashcard bridge should open flashcard settings");
assert.match(companion, /openSynapseFocusRoom/, "companion should link Focus Room");
assert.match(companion, /messageFollowUps/, "assistant replies need practice follow-ups");
assert.match(companion, /data-learning-companion-starter/, "starters must be tagged for tests/automation");
assert.match(companion, /data-learning-companion-dock/, "dock actions must be tagged");
assert.match(styles, /\.companion-starter-grid/, "starter grid styling required");
assert.match(styles, /\.companion-study-dock/, "study dock styling required");
assert.match(styles, /\.companion-message-actions/, "message action chips styling required");
assert.match(styles, /companion-fade-up/, "companion needs purposeful motion");

console.log("companion chat UX regression passed");
