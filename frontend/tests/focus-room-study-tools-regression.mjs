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
const { useFocusRoomStore } = await import(`../src/focus-room/hooks/useFocusRoomStore.js?setup-first=${Date.now()}`);
const store = useFocusRoomStore;

store.getState().initializeFocusRoom();
assert.equal(store.getState().view, "setup", "Focus Room should open on setup first");
assert.equal(store.getState().selectedMaterial, null);
assert.equal(store.getState().selectedMaterialId, "focus-room");
assert.equal(store.getState().currentSession, null);
assert.deepEqual(store.getState().studyPlan, []);

// Stale idle session snapshots must not skip setup on re-entry.
store.getState().setStudyGoal("Read and write without interruptions");
store.getState().startSession();
assert.equal(store.getState().view, "session");
globalThis.localStorage.setItem(
  "synapse.focusRoom.active-session.v1",
  JSON.stringify({
    "focus-room": {
      materialId: "focus-room",
      view: "session",
      selectedScene: store.getState().selectedScene,
      studyGoal: "Read and write without interruptions",
      timerState: "idle",
      timerStatus: "idle",
      currentSession: store.getState().currentSession,
      elapsedSeconds: 0,
      startedAt: null,
    }
  })
);
store.getState().initializeFocusRoom();
assert.equal(store.getState().view, "setup", "Idle leftover sessions must reopen on setup");
assert.equal(store.getState().currentSession, null);

store.getState().setStudyGoal("Read and write without interruptions");
store.getState().selectScene(store.getState().selectedScene);
store.getState().startSession();
assert.equal(store.getState().view, "session", "Enter Focus Room should open the immersive session");
assert.ok(store.getState().currentSession);

store.getState().startTimer();
assert.equal(store.getState().timerStatus, "studying");
assert.equal(store.getState().audioPlaying, true);

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

store.getState().returnToSetup();
assert.equal(store.getState().view, "setup", "Users can return to setup to change scene and settings");
assert.equal(store.getState().currentSession, null);

store.getState().setTimerMode("countup");
store.getState().startSession();
assert.equal(store.getState().view, "session");
assert.equal(store.getState().timerMode, "countup", "∞ duration should enter the session in count-up mode");
assert.equal(store.getState().timerDurationSeconds, 0);
store.getState().returnToSetup();

console.log("focus room pure session regression passed");
