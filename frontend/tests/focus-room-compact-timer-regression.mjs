import assert from "node:assert/strict";

const {
  COMPACT_TIMER_REVEAL_MS,
  compactTimerPrimaryAction,
  shouldHideCompactTimerControls
} = await import("../src/focus-room/compactTimerInteraction.js");

assert.equal(COMPACT_TIMER_REVEAL_MS, 2800);

assert.deepEqual(compactTimerPrimaryAction("studying"), {
  action: "pause",
  label: "Pause timer"
});
assert.deepEqual(compactTimerPrimaryAction("paused"), {
  action: "start",
  label: "Resume timer"
});
assert.deepEqual(compactTimerPrimaryAction("idle"), {
  action: "start",
  label: "Start timer"
});
assert.deepEqual(compactTimerPrimaryAction("completed"), {
  action: "start",
  label: "Start timer"
});

assert.equal(shouldHideCompactTimerControls({ pointerWithin: false, focusWithin: false }), true);
assert.equal(shouldHideCompactTimerControls({ pointerWithin: true, focusWithin: false }), false);
assert.equal(shouldHideCompactTimerControls({ pointerWithin: false, focusWithin: true }), false);

console.log("focus room compact timer regression passed");
