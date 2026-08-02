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
  focusModeTopic,
  focusShortcutAction,
  isEditableFocusTarget
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

console.log("focus room enhanced mode regression passed");
