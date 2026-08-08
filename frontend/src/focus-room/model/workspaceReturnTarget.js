/**
 * Pure model for Focus Room → workspace return handoff.
 * Storage key and shape must stay stable for the legacy bridge.
 */

export const FOCUS_ROOM_RETURN_TARGET_KEY = "synapse.focusRoom.return-target.v1";

const TOOL_ACTIONS = new Set(["flashcards", "quiz", "mindmap", "timeline"]);
const VIEW_ACTIONS = new Set(["source", "notes", "assistant"]);

export function normalizeFocusRoomWorkspaceTarget(target = {}) {
  const objectTarget = target && typeof target === "object" && !Array.isArray(target) ? target : {};
  return {
    materialId: String(objectTarget.materialId || "").trim(),
    action: String(objectTarget.action || "").trim().toLowerCase(),
    sourceId: String(objectTarget.sourceId || objectTarget.source_id || "").trim(),
    sourceIndex: Number(objectTarget.sourceIndex || objectTarget.source_index || 0) || 0,
    sourceLabel: String(objectTarget.sourceLabel || objectTarget.source_label || "").trim(),
    sectionTitle: String(objectTarget.sectionTitle || objectTarget.section_title || "").trim(),
    highlightId: String(objectTarget.highlightId || objectTarget.highlight_id || "").trim(),
    excerpt: String(objectTarget.excerpt || "").trim()
  };
}

export function isKnownWorkspaceReturnAction(action = "") {
  const value = String(action || "").trim().toLowerCase();
  return TOOL_ACTIONS.has(value) || VIEW_ACTIONS.has(value);
}

export function describeWorkspaceReturnTarget(rawTarget = {}) {
  const target = normalizeFocusRoomWorkspaceTarget(rawTarget);
  if (!target.action) {
    return { target, kind: "none", summary: "Return to workspace without a tool deep-link." };
  }
  if (TOOL_ACTIONS.has(target.action)) {
    return { target, kind: "tool", summary: `Open study tool: ${target.action}.` };
  }
  if (target.action === "source") {
    return { target, kind: "source", summary: "Open source viewer for the linked material." };
  }
  if (target.action === "notes") {
    return { target, kind: "notes", summary: "Show generated notes." };
  }
  if (target.action === "assistant") {
    return { target, kind: "assistant", summary: "Open the assistant panel." };
  }
  return { target, kind: "unknown", summary: `Unknown return action: ${target.action}` };
}

export function parseFocusRoomReturnTargetRaw(raw) {
  if (!raw) return null;
  let target = null;
  try {
    target = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  if (!target || typeof target !== "object") return null;
  return normalizeFocusRoomWorkspaceTarget(target);
}
