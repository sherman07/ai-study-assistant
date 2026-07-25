import assert from "node:assert/strict";

function makeLocalStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

globalThis.localStorage = makeLocalStorage();
const { normalizeFocusTopics, promoteNextFocusTopic } = await import(`../src/focus-room/focusTopics.js?t=${Date.now()}`);
const { useFocusRoomStore } = await import(`../src/focus-room/hooks/useFocusRoomStore.js?topics=${Date.now()}`);
const store = useFocusRoomStore;

const seeded = normalizeFocusTopics([], "Deep work block");
assert.equal(seeded.focusTopics.length, 1);
assert.equal(seeded.focusTopics[0].status, "active");
assert.equal(seeded.studyGoal, "Deep work block");

store.getState().initializeFocusRoom();
assert.ok(Array.isArray(store.getState().focusTopics));
assert.ok(store.getState().activeTopicId);

store.getState().updateFocusTopic(store.getState().activeTopicId, {
  title: "Read chapter 3",
  description: "Annotate key proofs"
});
assert.equal(store.getState().studyGoal, "Read chapter 3");

store.getState().addFocusTopic({ title: "Write summary", description: "One page synthesis" });
assert.equal(store.getState().focusTopics.length, 2);
assert.equal(store.getState().focusTopics[1].status, "pending");
assert.equal(store.getState().studyGoal, "Read chapter 3");

const firstId = store.getState().activeTopicId;
store.getState().finishFocusTopic(firstId);
assert.equal(store.getState().focusTopics.find(topic => topic.id === firstId)?.status, "done");
assert.equal(store.getState().studyGoal, "Write summary");
assert.equal(store.getState().focusTopics.find(topic => topic.status === "active")?.title, "Write summary");

store.getState().addFocusTopic({ title: "Flashcards", description: "20 cards" });
const activeId = store.getState().activeTopicId;
store.getState().removeFocusTopic(activeId);
assert.equal(store.getState().studyGoal, "Flashcards");
assert.ok(store.getState().focusTopics.every(topic => topic.id !== activeId));

const promoted = promoteNextFocusTopic([
  { id: "a", title: "A", description: "", status: "done" },
  { id: "b", title: "B", description: "", status: "pending" }
]);
assert.equal(promoted.activeTopicId, "b");
assert.equal(promoted.studyGoal, "B");

console.log("focus-room-topics-regression: passed");
