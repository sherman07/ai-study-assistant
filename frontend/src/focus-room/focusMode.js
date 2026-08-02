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
