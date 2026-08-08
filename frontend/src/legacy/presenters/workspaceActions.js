/**
 * Named workspace presenters over the legacy global action bus.
 * React views should prefer these over stringly `legacyAction("…")` calls
 * so the boundary stays explicit while controller sections still own IO.
 */
import { legacyAction, legacyTargetAction } from "../../react/runtime.js";

function requireActionName(name) {
  const action = String(name || "").trim();
  if (!action) throw new Error("Workspace presenter requires an action name.");
  return action;
}

export const workspacePresenters = Object.freeze({
  switchTool(toolName) {
    return legacyAction("switchTool", toolName);
  },
  openAssistant() {
    return legacyAction("openAssistant");
  },
  openAccountPanel(tab) {
    return legacyAction("openAccountPanel", tab);
  },
  toggleSourceViewer(forceOpen) {
    return forceOpen === undefined
      ? legacyAction("toggleSourceViewer")
      : legacyAction("toggleSourceViewer", forceOpen);
  },
  showFullSummary() {
    return legacyAction("showFullSummary");
  },
  openSynapseFocusRoom(materialId) {
    return legacyAction("openSynapseFocusRoom", materialId);
  },
  setLearningExperienceMode(mode) {
    return legacyAction("setLearningExperienceMode", mode);
  },
  invoke(name, ...args) {
    return legacyAction(requireActionName(name), ...args);
  },
  invokeWithTarget(name, ...args) {
    return legacyTargetAction(requireActionName(name), ...args);
  }
});

export function workspacePresenterNames() {
  return Object.keys(workspacePresenters).filter(key => key !== "invoke" && key !== "invokeWithTarget");
}
