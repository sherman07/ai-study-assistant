import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");

const companion = read("frontend/src/react/components/CompanionWorkspace.js");
const practice = read("frontend/src/legacy/companionPracticeClient.js");
const styles = read("frontend/styles/01-section.css");
const backend = read("backend/app_sections/14_learning_companion.py");

assert.match(companion, /CONVERSATION_STARTERS/, "empty state needs goal-oriented starters");
assert.match(companion, /suggestedTools/, "composer dock must be AI-suggested, not permanent");
assert.match(companion, /data-learning-companion-dock-state/, "dock visibility state must be tagged");
assert.match(companion, /runSuggestedTool/, "companion must execute suggested practice tools");
assert.match(companion, /kind: "flashcards"/, "flashcards must be delivered in chat");
assert.match(companion, /kind: "quiz"/, "quizzes must be delivered in chat");
assert.match(companion, /kind: "broadcast"/, "AI Broadcast must be deliverable in companion chat");
assert.match(companion, /CompanionFlashcardDeck/, "in-chat flashcard widget required");
assert.match(companion, /CompanionQuizPanel/, "in-chat quiz widget required");
assert.match(companion, /companionPractice\.generateQuiz/, "quiz must use shared generation backend");
assert.match(companion, /companionPractice\.generateFlashcards/, "flashcards must use shared generation backend");
assert.match(companion, /openSynapseFocusRoom/, "companion should link Focus Room");
assert.match(companion, /data-learning-companion-starter/, "starters must be tagged for tests/automation");
assert.match(companion, /data-learning-companion-dock/, "dock actions must be tagged");
assert.doesNotMatch(companion, /STUDY_DOCK_ACTIONS/, "permanent study dock catalog must be removed");
assert.doesNotMatch(companion, /openQuizSettingsModal/, "companion quiz must stay in chat, not open materials settings");
assert.doesNotMatch(companion, /openFlashcardSettingsModal/, "companion flashcards must stay in chat, not open materials settings");

assert.match(practice, /\/quiz\/generate/, "practice client must call shared quiz endpoint");
assert.match(practice, /\/flashcards\/generate/, "practice client must call shared flashcards endpoint");
assert.match(practice, /\/broadcast\/generate/, "practice client must call shared broadcast endpoint");
assert.match(practice, /buildCompanionConversationContext/, "companion tools need conversation context adapter");
assert.match(practice, /readLatestMaterialsContext/, "notes-based tools need materials history context");

assert.match(styles, /\.companion-starter-grid/, "starter grid styling required");
assert.match(styles, /\.companion-study-dock/, "study dock styling required");
assert.match(styles, /\.companion-flashcard/, "in-chat flashcard styling required");
assert.match(styles, /\.companion-quiz-panel/, "in-chat quiz styling required");
assert.match(styles, /\.companion-message-actions/, "message action chips styling required");
assert.match(styles, /companion-fade-up/, "companion needs purposeful motion");

assert.match(backend, /suggested_tools/, "backend must return AI-gated tool suggestions");
assert.match(backend, /normalise_companion_suggested_tools/, "backend must normalize companion tools");
assert.match(backend, /flashcards/, "backend tool catalog must include flashcards");
assert.match(backend, /broadcast/, "backend tool catalog must include AI Broadcast");

console.log("companion chat UX regression passed");
