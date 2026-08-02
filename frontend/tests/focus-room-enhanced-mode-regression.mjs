import assert from "node:assert/strict";

let focusMode = null;
try {
  focusMode = await import("../src/focus-room/focusMode.js");
} catch {
  // The first TDD run proves the interaction contract is not implemented yet.
}

assert.ok(focusMode, "Focus Mode must expose a testable interaction contract");

const {
  FOCUS_MODE_REVEAL_MS,
  focusModeTaskProgress,
  focusModeTopic,
  focusShortcutAction,
  isEditableFocusTarget,
  shouldHideFocusControls
} = focusMode;

assert.equal(focusModeTopic({ materialTitle: "Vector Calculus" }), "Vector Calculus");
assert.equal(focusModeTopic({ materialTitle: "   " }), "Focus Room");
assert.equal(focusModeTopic(null), "Focus Room");

assert.equal(isEditableFocusTarget({ tagName: "TEXTAREA" }), true);
assert.equal(isEditableFocusTarget({ tagName: "INPUT" }), true);
assert.equal(isEditableFocusTarget({ tagName: "SELECT" }), true);
assert.equal(isEditableFocusTarget({ tagName: "DIV", isContentEditable: true }), true);
assert.equal(isEditableFocusTarget({ tagName: "BUTTON" }), false);

const body = { tagName: "BODY" };
assert.equal(focusShortcutAction({ key: " ", target: body }), "toggle-timer");
assert.equal(focusShortcutAction({ key: "m", target: body }), "toggle-audio");
assert.equal(focusShortcutAction({ key: "N", target: body }), "note");
assert.equal(focusShortcutAction({ key: "t", target: body }), "tasks");
assert.equal(focusShortcutAction({ key: "s", target: body }), "scene");
assert.equal(focusShortcutAction({ key: "?", target: body }), "shortcuts");
assert.equal(focusShortcutAction({ key: "Escape", target: body }), "escape");
assert.equal(focusShortcutAction({ key: "x", target: body }), "");
assert.equal(focusShortcutAction({ key: "n", target: { tagName: "TEXTAREA" } }), "");
assert.equal(FOCUS_MODE_REVEAL_MS, 2800);

assert.equal(shouldHideFocusControls({ pinned: false, popoverOpen: false, focusWithin: false }), true);
assert.equal(shouldHideFocusControls({ pinned: true, popoverOpen: false, focusWithin: false }), false);
assert.equal(shouldHideFocusControls({ pinned: false, popoverOpen: true, focusWithin: false }), false);
assert.equal(shouldHideFocusControls({ pinned: false, popoverOpen: false, focusWithin: true }), false);

assert.deepEqual(
  focusModeTaskProgress(
    [{ task: "Read notes" }, { task: "Practice examples" }, { task: "Review errors" }],
    ["Practice examples"]
  ),
  { completed: 1, total: 3 }
);
assert.deepEqual(focusModeTaskProgress([], []), { completed: 0, total: 0 });

let sceneMotion = null;
try {
  sceneMotion = await import("../src/focus-room/sceneMotion.js");
} catch {
  // The wallpaper integration test should fail until motion profiles exist.
}
assert.ok(sceneMotion, "Original Focus Room scenes must expose motion profiles");
const allowedLayerKinds = new Set(["camera", "light", "rain", "snow", "mist", "foliage", "water"]);
const expectedMotionIds = [
  "morning-window", "cabin-twilight", "last-light-lounge", "garden-cafe",
  "sunset-classroom", "tokyo-night", "snow-window-cabin", "bamboo-cabin"
];
assert.deepEqual(Object.keys(sceneMotion.SCENE_MOTION_PROFILES), expectedMotionIds);
for (const id of expectedMotionIds) {
  const profile = sceneMotion.sceneMotionProfile(id);
  assert.equal(profile.id, id);
  assert.ok(profile.layers.length >= 2);
  assert.ok(profile.layers.every(layer => allowedLayerKinds.has(layer.kind)));
  assert.ok(profile.layers.every(layer => layer.duration >= 12 && layer.intensity > 0 && layer.intensity <= 1 && layer.density > 0 && layer.density <= 1));
}
assert.equal(sceneMotion.sceneMotionProfile("missing").id, "morning-window");

console.log("focus room enhanced mode regression passed");
