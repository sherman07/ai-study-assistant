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
const { useFocusRoomStore } = await import(`../src/focus-room/hooks/useFocusRoomStore.js?pure-room=${Date.now()}`);
const store = useFocusRoomStore;

store.getState().initializeFocusRoom();
assert.equal(store.getState().view, "landing");
assert.equal(store.getState().selectedMaterial, null);
assert.equal(store.getState().selectedMaterialId, "focus-room");
assert.deepEqual(store.getState().studyPlan, []);

store.getState().openSetup();
assert.equal(store.getState().view, "setup");
store.getState().startSession();
assert.equal(store.getState().view, "session");

store.getState().setStudyGoal("Read and write without interruptions");
store.getState().startTimer();
assert.equal(store.getState().timerStatus, "studying");
assert.equal(store.getState().audioPlaying, false, "Starting a timer must not unmute room music");

store.getState().pauseTimer();
assert.equal(store.getState().timerStatus, "paused");
store.getState().startTimer();
assert.equal(store.getState().timerStatus, "studying");

store.getState().resetTimer();
assert.equal(store.getState().timerStatus, "idle");
assert.equal(store.getState().elapsedSeconds, 0);

store.getState().skipTimer();
assert.equal(store.getState().timerStatus, "completed");
store.getState().endSession();
assert.equal(store.getState().summaryRecord.materialTitle, "Focus Room");
assert.equal(store.getState().summaryRecord.quizScore, null);
assert.deepEqual(store.getState().summaryRecord.completedTasks, []);

console.log("focus room pure session regression passed");
