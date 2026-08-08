import assert from "node:assert/strict";

// Minimal React runtime stub so runtime.js can load under Node.
globalThis.React = {
  createElement() {
    return null;
  },
  Fragment: Symbol("Fragment")
};

const { workspacePresenterNames, workspacePresenters } = await import("../src/legacy/presenters/workspaceActions.js");

const names = workspacePresenterNames();
assert.ok(names.includes("switchTool"));
assert.ok(names.includes("openAccountPanel"));
assert.ok(names.includes("setLearningExperienceMode"));
assert.ok(names.includes("openSynapseFocusRoom"));

const action = workspacePresenters.switchTool("quiz");
assert.equal(typeof action, "function");

let called = null;
globalThis.switchTool = (...args) => {
  called = args;
  return "ok";
};
assert.equal(action(), "ok");
assert.deepEqual(called, ["quiz"]);

console.log("workspace-presenter-regression: passed");
