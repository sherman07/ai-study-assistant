export const FOCUS_MODE_REVEAL_MS = 2800;

export function isEditableFocusTarget(target) {
  const tag = String(target?.tagName || "").toLowerCase();
  return Boolean(target?.isContentEditable || ["input", "textarea", "select"].includes(tag));
}

export function focusShortcutAction(event = {}) {
  if (isEditableFocusTarget(event.target)) return "";
  const key = String(event.key || "").toLowerCase();
  if (key === " " || key === "spacebar") return "toggle-timer";
  if (key === "m") return "toggle-audio";
  if (key === "n") return "note";
  if (key === "t") return "tasks";
  if (key === "s") return "scene";
  if (key === "?") return "shortcuts";
  if (key === "escape") return "escape";
  return "";
}

export function focusModeTopic(material) {
  return String(material?.materialTitle || "").trim() || "Focus Room";
}

export function focusModeAddedDuration(totalDurationSeconds, additionalSeconds = 300) {
  const current = Math.max(0, Math.floor(Number(totalDurationSeconds) || 0));
  const added = Math.max(0, Math.floor(Number(additionalSeconds) || 0));
  const nextTotal = current + added;
  return {
    minutes: Math.floor(nextTotal / 60),
    seconds: nextTotal % 60
  };
}

export function shouldHideFocusControls({ pinned = false, popoverOpen = false, focusWithin = false } = {}) {
  return !pinned && !popoverOpen && !focusWithin;
}

export function focusModeTaskProgress(studyPlan, completedTasks) {
  const plan = Array.isArray(studyPlan) ? studyPlan : [];
  const completed = new Set(Array.isArray(completedTasks) ? completedTasks : []);
  return {
    completed: plan.filter(item => completed.has(String(item?.task || ""))).length,
    total: plan.length
  };
}
