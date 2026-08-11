import assert from "node:assert/strict";

const { useStudyFeedbackStore } = await import(`../src/focus-room/hooks/useStudyFeedbackStore.js?test=${Date.now()}`);

useStudyFeedbackStore.setState({ toasts: [] });
useStudyFeedbackStore.getState().pushToast({
  id: "deck-complete",
  tone: "success",
  title: "Deck complete",
  message: "All cards reviewed."
});
assert.deepEqual(
  useStudyFeedbackStore.getState().toasts.map(toast => ({ id: toast.id, tone: toast.tone, title: toast.title, message: toast.message })),
  [{ id: "deck-complete", tone: "success", title: "Deck complete", message: "All cards reviewed." }],
  "Pushing a notice should make one normalized notice available to the viewport"
);

useStudyFeedbackStore.getState().pushToast({
  id: "deck-complete-again",
  tone: "success",
  title: "Deck complete",
  message: "All cards reviewed."
});
assert.equal(useStudyFeedbackStore.getState().toasts.length, 1, "Identical notices should be deduplicated");
assert.equal(useStudyFeedbackStore.getState().toasts[0].id, "deck-complete-again");

useStudyFeedbackStore.getState().dismissToast("deck-complete-again");
assert.deepEqual(useStudyFeedbackStore.getState().toasts, [], "Dismiss should remove the requested notice");

console.log("focus room study feedback store regression passed");
