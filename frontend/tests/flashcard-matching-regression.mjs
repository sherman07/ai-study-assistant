import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = readLegacyControllerSections("06_deleteflashcarddeck.js");
const styles = fs.readFileSync(path.resolve(__dirname, "../styles/07-section.css"), "utf8");

const makeHelpers = new Function(
  "window",
  "cleanMindText",
  "shorten",
  `
  ${source}
  return {
    buildFlashcardMatchingPairs,
    connectFlashcardMatchPair,
    createFlashcardMatchingState,
    flashcardMatchValidationSummary,
    normaliseFlashcardMatchText,
    stableFlashcardShuffle
  };
  `
);

const cleanMindText = value => String(value || "").replace(/\s+/g, " ").trim();
const shorten = (value, limit = 140) => {
  const text = String(value || "");
  return text.length > limit ? text.slice(0, limit - 1).trim() + "…" : text;
};

const {
  buildFlashcardMatchingPairs,
  connectFlashcardMatchPair,
  createFlashcardMatchingState,
  flashcardMatchValidationSummary,
  normaliseFlashcardMatchText,
  stableFlashcardShuffle
} = makeHelpers({ SYNAPSE_FLASHCARD_MATCH_LIMIT: 4 }, cleanMindText, shorten);

const cards = [
  { id: "concept 1", front: "Working memory", back: "Temporarily holds and manipulates information." },
  { id: "concept 2", front: "Encoding", back: "Turns information into a form that can be stored." },
  { id: "concept 3", front: "Retrieval", back: "Brings stored information back into active use." },
  { id: "duplicate", front: "Retrieval", back: "Brings stored information back into active use." }
];

const pairs = buildFlashcardMatchingPairs(cards, 4);
assert.equal(pairs.length, 3);
assert.equal(pairs[0].termId, "term-concept_1");
assert.equal(pairs[0].branchId, "branch-concept_1");

const shuffledA = stableFlashcardShuffle(pairs.map(pair => ({ id: pair.branchId })), "same-seed");
const shuffledB = stableFlashcardShuffle(pairs.map(pair => ({ id: pair.branchId })), "same-seed");
assert.deepEqual(shuffledA, shuffledB);

const state = createFlashcardMatchingState(cards);
connectFlashcardMatchPair(pairs[0].termId, pairs[1].branchId, state);
connectFlashcardMatchPair(pairs[1].termId, pairs[1].branchId, state);
assert.equal(state.matches[pairs[0].termId], undefined);
assert.equal(state.matches[pairs[1].termId], pairs[1].branchId);

connectFlashcardMatchPair(pairs[0].termId, pairs[0].branchId, state);
connectFlashcardMatchPair(pairs[2].termId, pairs[2].branchId, state);
const summary = flashcardMatchValidationSummary(pairs, state);
assert.deepEqual(summary, { total: 3, matched: 3, correct: 3, wrong: 0, complete: true });

const compact = normaliseFlashcardMatchText(
  "This answer is intentionally verbose because it contains too many words for a matching branch and should be compacted before display.",
  82,
  12
);
assert.ok(compact.split(/\s+/).length <= 12);
assert.ok(!/[.…]$/.test(compact), "matching text should not look half-generated");

assert.ok(source.includes("flashcard-match-row"));
assert.ok(source.includes('flashcard-study-shell ${isMatchingMode ? "matching" : ""}'));
assert.ok(styles.includes(".flashcard-match-row"));
assert.ok(styles.includes(".flashcard-study-shell.matching"));
assert.ok(styles.includes("width: min(1180px, 100%)"));
assert.ok(styles.includes("grid-template-columns: minmax(0, 1fr) 56px minmax(0, 1fr)"));
assert.ok(source.includes("FLASHCARD_MATCH_LINE_COLORS"));
assert.ok(source.includes("--match-line-color"));
assert.ok(styles.includes("stroke: var(--match-line-color, #7c8cff)"));
assert.ok(styles.includes("stroke-width: 5"));

console.log("flashcard matching regression passed");
