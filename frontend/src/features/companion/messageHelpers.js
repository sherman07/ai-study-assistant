/** Companion message helpers and bubble renderer. */
import { React, h, icon } from "../../react/runtime.js";

function createMessageId(prefix = "message") {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function getLocalStorage() {
  return globalThis.localStorage;
}

function focusComposer(ref) {
  const run = () => ref.current?.focus();
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(run);
    return;
  }
  globalThis.setTimeout?.(run, 0);
}

function toConversation(messages = []) {
  return messages.slice(-MAX_CONTEXT_MESSAGES).map(message => ({
    role: message.role,
    content: message.content,
  }));
}

function sourceCountText(decision) {
  const count = Array.isArray(decision?.research_sources) ? decision.research_sources.length : 0;
  return count
    ? `Used ${count} current source${count === 1 ? "" : "s"}.`
    : "This answer needed current sources, but none were available.";
}

function syncThreadToHistory(thread) {
  if (typeof globalThis.syncCompanionThreadToHistory === "function") {
    globalThis.syncCompanionThreadToHistory(thread);
  }
}

function callLegacy(name, ...args) {
  const action = globalThis[name];
  if (typeof action === "function") return action(...args);
  return undefined;
}

function latestMaterialsHistoryItem() {
  try {
    const raw = globalThis.localStorage?.getItem("synapse.generated.history.v6");
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return null;
    return items.find(item =>
      item
      && item.kind !== "companion"
      && !item.companionThreadId
      && !String(item.id || "").startsWith("companion:")
    ) || null;
  } catch {
    return null;
  }
}

function messageFollowUps(message) {
  if (message.role !== "assistant" || message.id === WELCOME_MESSAGE.id) return [];
  const snippet = String(message.content || "").replace(/\s+/g, " ").trim().slice(0, 160);
  return [
    {
      id: `quiz-${message.id}`,
      label: "Quiz me on this",
      prompt: `Quiz me on this explanation. Ask one question at a time and wait for my answer:\n\n${snippet}`,
    },
    {
      id: `flash-${message.id}`,
      label: "Make flashcards",
      prompt: `Turn the key ideas from this explanation into 5 flashcards (Q/A):\n\n${snippet}`,
    },
    {
      id: `deeper-${message.id}`,
      label: "Go deeper",
      prompt: "Go one level deeper on the hardest part of what you just explained, and end with a check question for me.",
    },
  ];
}

function messageBubble(message, { onFollowUp, showActions }) {
  const isLearner = message.role === "user";
  const followUps = showActions ? messageFollowUps(message) : [];
  return h(
    "article",
    {
      key: message.id || `${message.role}-${message.content}`,
      className: `companion-message ${isLearner ? "companion-message-user" : "companion-message-assistant"}`,
    },
    h(
      "div",
      { className: "companion-message-header" },
      !isLearner
        ? h("span", { className: "companion-message-avatar", "aria-hidden": "true" }, icon("bi-stars"))
        : null,
      h("p", { className: "companion-message-role" }, isLearner ? "You" : "Synapse"),
    ),
    h("p", { className: "companion-message-body" }, message.content),
    !isLearner && message.decision?.requires_research
      ? h("p", { className: "companion-message-research" }, sourceCountText(message.decision))
      : null,
    followUps.length
      ? h(
        "div",
        { className: "companion-message-actions", role: "group", "aria-label": "Practice from this reply" },
        followUps.map(action =>
          h(
            "button",
            {
              key: action.id,
              type: "button",
              className: "companion-chip companion-chip--quiet",
              onClick: () => onFollowUp(action.prompt),
            },
            action.label,
          ),
        ),
      )
      : null,
  );
}

export {
  createMessageId,
  getLocalStorage,
  focusComposer,
  toConversation,
  sourceCountText,
  syncThreadToHistory,
  callLegacy,
  latestMaterialsHistoryItem,
  messageFollowUps,
  messageBubble
};
