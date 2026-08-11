import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { animateLegacyFlashcardTurn, legacyQuizOptionState, prefersReducedStudyMotion } from "../src/legacy/studyMotion.js";

assert.equal(prefersReducedStudyMotion(() => ({ matches: true })), true);
assert.equal(prefersReducedStudyMotion(() => ({ matches: false })), false);
assert.equal(prefersReducedStudyMotion(null), false);
assert.equal(legacyQuizOptionState({ selected: true, correct: false, revealed: false }), "selected");
assert.equal(legacyQuizOptionState({ selected: false, correct: true, revealed: false }), "idle");
assert.equal(legacyQuizOptionState({ selected: false, correct: true, revealed: true }), "correct");
assert.equal(legacyQuizOptionState({ selected: true, correct: false, revealed: true }), "incorrect");
assert.equal(legacyQuizOptionState({ selected: false, correct: false, revealed: true }), "muted");

const calls = [];
const firstStage = {
  animate(keyframes, options) {
    calls.push({ target: "first", keyframes, options });
    return { finished: Promise.resolve() };
  }
};
const replacementStage = {
  dataset: {},
  animate(keyframes, options) {
    calls.push({ target: "replacement", keyframes, options });
    return { finished: Promise.resolve() };
  },
  focus(options) {
    calls.push({ target: "focus", options });
  }
};
let swapped = false;

await animateLegacyFlashcardTurn({
  stage: firstStage,
  swap() { swapped = true; },
  replacement() { return replacementStage; },
  reducedMotion: false
});

assert.equal(swapped, true, "The content swap should occur between the two half-turns");
assert.deepEqual(calls.map(call => call.target), ["first", "replacement", "focus"]);
assert.equal(replacementStage.dataset.studyTurning, undefined, "The replacement card should unlock after its half-turn");
assert.deepEqual(calls[0].keyframes, [
  { opacity: 1, transform: "rotateY(0deg) scale(1)" },
  { opacity: 0.72, transform: "rotateY(88deg) scale(0.985)" }
]);
assert.equal(calls[0].options.duration, 150);
assert.equal(calls[1].options.duration, 190);
assert.deepEqual(calls[2].options, { preventScroll: true });

calls.length = 0;
swapped = false;
await animateLegacyFlashcardTurn({
  stage: firstStage,
  swap() { swapped = true; },
  replacement() { return replacementStage; },
  reducedMotion: true
});
assert.equal(swapped, true);
assert.deepEqual(calls.map(call => call.target), ["focus"], "Reduced motion should swap immediately without a turn animation");

const controller = await readFile(new URL("../src/legacy/controller.js", import.meta.url), "utf8");
const flashcards = await readFile(new URL("../src/legacy/controller_sections/06_deleteflashcarddeck.js", import.meta.url), "utf8");
const quiz = await readFile(new URL("../src/legacy/controller_sections/05_persistcurrentquiztohistory.js", import.meta.url), "utf8");
const flashcardStyle = await readFile(new URL("../styles/07-section.css", import.meta.url), "utf8");
const quizStyle = await readFile(new URL("../styles/06-section.css", import.meta.url), "utf8");
const feedbackStyle = await readFile(new URL("../styles/04-section.css", import.meta.url), "utf8");
assert.ok(controller.includes("animateLegacyFlashcardTurn"), "The controller should expose the tested motion helper to legacy sections");
assert.ok(flashcards.includes("await animateLegacyFlashcardTurn"), "The existing flashcard action should use the tested half-turn adapter");
assert.ok(flashcards.includes('document.querySelector(".flashcard-stage")'), "The adapter should preserve focus on the replacement flashcard button");
assert.ok(flashcardStyle.includes(".flashcard-stage[data-study-turning=\"true\"]"), "The turning card should opt into bounded rendering hints");
assert.ok(/prefers-reduced-motion[\s\S]*?flashcard-grade-row/.test(flashcardStyle), "Legacy flashcard feedback should stop moving under reduced motion");
assert.ok(controller.includes("legacyQuizOptionState"), "The controller should expose semantic quiz-state derivation to legacy sections");
assert.ok(quiz.includes("legacyQuizOptionState"), "Legacy quiz choices should use the tested semantic state model");
assert.ok(quiz.includes('role="status" aria-live="polite"'), "Revealed legacy quiz feedback should announce its final state once");
for (const selector of [".quiz-option-label.is-correct", ".quiz-option-label.is-incorrect", ".quiz-feedback-motion"]) {
  assert.ok(quizStyle.includes(selector), `Legacy quiz feedback styles should include ${selector}`);
}
assert.ok(/prefers-reduced-motion[\s\S]*?quiz-feedback-motion/.test(quizStyle), "Legacy quiz feedback motion should stop under reduced motion");
assert.ok(controller.includes("noticeSignature"), "Legacy notices should deduplicate repeated messages");
assert.ok(controller.includes("host.children.length >= 3"), "Legacy notices should cap the visible queue at three");
assert.ok(controller.includes("pauseStudyNoticeDismiss"), "Legacy notice timers should pause while the notice is hovered or focused");
assert.ok(controller.includes('role", tone === "error" ? "alert" : "status"'), "Legacy notices should expose semantic live feedback");
assert.ok(feedbackStyle.includes(".study-tool-notice.is-exiting"), "Legacy notices should have a bounded exit transition");
assert.ok(/prefers-reduced-motion[\s\S]*?study-tool-notice/.test(feedbackStyle), "Legacy notice motion should stop under reduced motion");

console.log("legacy study motion regression passed");
