import assert from "node:assert/strict";
import {
  normalizeStudyToast,
  quizCheckedMatchesAnswer,
  quizFeedbackMotion,
  quizChoiceState,
  quizResultCopy,
  reduceStudyToasts
} from "../src/focus-room/studyFeedback.js";

assert.equal(quizCheckedMatchesAnswer({ answer: 1 }, 1), true);
assert.equal(quizCheckedMatchesAnswer({ answer: 0 }, 1), false);
assert.equal(quizCheckedMatchesAnswer({ answer: [0, 2] }, [0, 2]), true);
assert.equal(quizFeedbackMotion({ correct: false, hasKnownAnswer: false }), "review");
assert.equal(quizFeedbackMotion({ correct: false, hasKnownAnswer: true }), "error");
assert.equal(quizFeedbackMotion({ correct: true, hasKnownAnswer: true }), "success");

const singleChoiceQuestion = {
  type: "single_choice",
  choices: ["The distractor", "The supported answer", "Another distractor"],
  correctOptionIndexes: [1]
};

assert.equal(
  quizChoiceState(singleChoiceQuestion, 0, null, 0),
  "selected",
  "An unchecked selected answer should stay visibly selected"
);
assert.equal(
  quizChoiceState(singleChoiceQuestion, 0, null, 1),
  "idle",
  "Unchecked unselected answers should stay neutral"
);

const incorrectResult = {
  correct: false,
  hasKnownAnswer: true,
  explanation: "The evidence supports the second option."
};
assert.equal(
  quizChoiceState(singleChoiceQuestion, 0, incorrectResult, 0),
  "incorrect",
  "A selected wrong answer should be marked incorrect after checking"
);
assert.equal(
  quizChoiceState(singleChoiceQuestion, 0, incorrectResult, 1),
  "correct",
  "The known correct answer should be revealed after checking"
);
assert.equal(
  quizChoiceState(singleChoiceQuestion, 0, incorrectResult, 2),
  "muted",
  "Unselected distractors should recede after checking"
);

const reviewOnlyResult = {
  correct: false,
  hasKnownAnswer: false,
  explanation: "Compare your response with the source notes."
};
assert.equal(
  quizChoiceState(singleChoiceQuestion, 0, reviewOnlyResult, 0),
  "selected",
  "A review-only result should not falsely mark a choice incorrect"
);
assert.deepEqual(
  quizResultCopy({ correct: true, hasKnownAnswer: true, explanation: "Exactly right." }),
  { tone: "success", title: "Correct", detail: "Exactly right." }
);
assert.deepEqual(
  quizResultCopy(incorrectResult),
  { tone: "error", title: "Review this one", detail: "The evidence supports the second option." }
);
assert.deepEqual(
  quizResultCopy(reviewOnlyResult),
  { tone: "info", title: "Answer saved for review", detail: "Compare your response with the source notes." }
);
assert.equal(quizResultCopy(null), null);

assert.equal(normalizeStudyToast({}, 1000), null, "An empty notice should not enter the live region");
assert.deepEqual(
  normalizeStudyToast({ id: "saved", tone: "success", title: "Deck complete", message: "12 cards reviewed." }, 1000),
  { id: "saved", tone: "success", title: "Deck complete", message: "12 cards reviewed.", createdAt: 1000 }
);

let queue = [];
queue = reduceStudyToasts(queue, {
  type: "push",
  toast: { id: "one", tone: "info", title: "One", message: "First", createdAt: 1 }
});
queue = reduceStudyToasts(queue, {
  type: "push",
  toast: { id: "two", tone: "success", title: "Two", message: "Second", createdAt: 2 }
});
queue = reduceStudyToasts(queue, {
  type: "push",
  toast: { id: "three", tone: "error", title: "Three", message: "Third", createdAt: 3 }
});
queue = reduceStudyToasts(queue, {
  type: "push",
  toast: { id: "four", tone: "info", title: "Four", message: "Fourth", createdAt: 4 }
});
assert.deepEqual(queue.map(toast => toast.id), ["two", "three", "four"], "Only the three newest notices should remain");

queue = reduceStudyToasts(queue, {
  type: "push",
  toast: { id: "four-new", tone: "info", title: "Four", message: "Fourth", createdAt: 5 }
});
assert.deepEqual(queue.map(toast => toast.id), ["two", "three", "four-new"], "A duplicate notice should replace its earlier instance");

queue = reduceStudyToasts(queue, { type: "dismiss", id: "three" });
assert.deepEqual(queue.map(toast => toast.id), ["two", "four-new"], "Dismiss should remove only the requested notice");

console.log("focus room study feedback regression passed");
