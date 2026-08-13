/** Learning Companion workspace React surface. */
import { React, h, icon } from "../../react/runtime.js";
import {
  appendLearningCompanionMessage,
  companionThreadHasUserContent,
  loadLearningCompanionThread,
  saveLearningCompanionThread,
  startNewLearningCompanionThread,
  updateLearningCompanionThreadContext,
  titleFromCompanionThread,
} from "../../legacy/learningCompanionChatStore.js?v=ai-learning-companion-v2";
import { requestLearningCompanionDecision } from "../../legacy/learningCompanionClient.js?v=ai-learning-companion-v1";
import {
  MAX_CONTEXT_MESSAGES,
  WELCOME_MESSAGE,
  CONVERSATION_STARTERS,
  STUDY_DOCK_ACTIONS
} from "./constants.js";
import {
  createMessageId,
  getLocalStorage,
  focusComposer,
  toConversation,
  sourceCountText,
  syncThreadToHistory,
  callLegacy,
  latestMaterialsHistoryItem,
  messageBubble
} from "./messageHelpers.js";

export function CompanionWorkspace() {
  const composerRef = React.useRef(null);
  const threadRef = React.useRef(null);
  const [thread, setThread] = React.useState(() => loadLearningCompanionThread(getLocalStorage()));
  const [draft, setDraft] = React.useState("");
  const [pendingMessage, setPendingMessage] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState("");
  const [hasMaterials, setHasMaterials] = React.useState(() => Boolean(latestMaterialsHistoryItem()));

  React.useEffect(() => {
    setThread(loadLearningCompanionThread(getLocalStorage()));
    setHasMaterials(Boolean(latestMaterialsHistoryItem()));
    focusComposer(composerRef);

    const onActivate = event => {
      const threadId = String(event?.detail?.threadId || "").trim();
      if (!threadId) return;
      const next = globalThis.__synapseCompanionChat?.activate?.(threadId)
        || loadLearningCompanionThread(getLocalStorage());
      setThread(next);
      setDraft("");
      setPendingMessage(null);
      setFailure("");
      setHasMaterials(Boolean(latestMaterialsHistoryItem()));
      focusComposer(composerRef);
    };

    globalThis.window?.addEventListener?.("synapse-companion-thread-activate", onActivate);
    return () => globalThis.window?.removeEventListener?.("synapse-companion-thread-activate", onActivate);
  }, []);

  React.useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [thread.messages.length, busy, failure]);

  const hasConversation = companionThreadHasUserContent(thread);
  const visibleMessages = thread.messages.length ? thread.messages : [WELCOME_MESSAGE];
  const sessionTitle = hasConversation ? titleFromCompanionThread(thread) : "What should we work on?";

  const persistThread = React.useCallback(nextThread => {
    const saved = saveLearningCompanionThread(nextThread, getLocalStorage());
    if (saved) {
      setThread(nextThread);
      syncThreadToHistory(nextThread);
    }
    return saved;
  }, []);

  const handleTutorReply = React.useCallback(async learnerMessage => {
    const activeThread = loadLearningCompanionThread(getLocalStorage());
    const history = toConversation(activeThread.messages);
    const decision = await requestLearningCompanionDecision({
      message: learnerMessage.content,
      messages: history,
    });
    const assistantMessage = {
      id: createMessageId("assistant"),
      role: "assistant",
      content: decision?.reply || "Synapse could not reply right now.",
      decision,
    };
    const nextThread = appendLearningCompanionMessage(activeThread, assistantMessage);
    if (!persistThread(nextThread)) {
      throw new Error("Synapse could not save this reply locally. Please retry.");
    }
    setPendingMessage(null);
    setFailure("");
    focusComposer(composerRef);
  }, [persistThread]);

  const sendContent = React.useCallback(async (content, { topic } = {}) => {
    const trimmed = String(content || "").trim();
    if (!trimmed || busy) return;

    const learnerMessage = {
      id: createMessageId("user"),
      role: "user",
      content: trimmed,
    };

    setBusy(true);
    setFailure("");
    setPendingMessage(null);

    try {
      let active = loadLearningCompanionThread(getLocalStorage());
      if (topic) {
        active = updateLearningCompanionThreadContext(active, {
          ...(active.learningContext || {}),
          topic: String(topic).slice(0, 58),
        });
      }
      const nextThread = appendLearningCompanionMessage(active, learnerMessage);
      if (!persistThread(nextThread)) {
        throw new Error("Synapse could not save your message locally. Please retry.");
      }
      setDraft("");
      setPendingMessage(learnerMessage);
      await handleTutorReply(learnerMessage);
    } catch (error) {
      setPendingMessage(learnerMessage);
      setFailure(error?.message || "Synapse could not reply right now.");
      focusComposer(composerRef);
    } finally {
      setBusy(false);
    }
  }, [busy, handleTutorReply, persistThread]);

  const sendDraft = React.useCallback(async () => {
    await sendContent(draft);
  }, [draft, sendContent]);

  const handleSend = async event => {
    event.preventDefault();
    await sendDraft();
  };

  const handleComposerKeyDown = event => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void sendDraft();
  };

  const handleRetry = async () => {
    if (!pendingMessage || busy) return;
    setBusy(true);
    setFailure("");
    try {
      const storedThread = loadLearningCompanionThread(getLocalStorage());
      const alreadyStored = storedThread.messages.some(message => message.id === pendingMessage.id);
      if (!alreadyStored) {
        const nextThread = appendLearningCompanionMessage(storedThread, pendingMessage);
        if (!persistThread(nextThread)) {
          throw new Error("Synapse could not save your message locally. Please retry.");
        }
      }
      await handleTutorReply(pendingMessage);
    } catch (error) {
      setFailure(error?.message || "Synapse could not reply right now.");
      focusComposer(composerRef);
    } finally {
      setBusy(false);
    }
  };

  const handleNewChat = () => {
    if (busy) return;
    if (companionThreadHasUserContent(thread)) {
      syncThreadToHistory(thread);
      const confirmReset = typeof globalThis.window?.confirm === "function"
        ? globalThis.window.confirm("Start a new chat? Your current conversation will stay in Recent learning.")
        : true;
      if (!confirmReset) return;
    }
    const nextThread = startNewLearningCompanionThread(getLocalStorage());
    setThread(nextThread);
    setDraft("");
    setPendingMessage(null);
    setFailure("");
    focusComposer(composerRef);
  };

  const openMaterialsHome = () => {
    callLegacy("setLearningExperienceMode", "materials");
  };

  const openLatestNotes = async () => {
    const latest = latestMaterialsHistoryItem();
    if (!latest?.id) {
      openMaterialsHome();
      return;
    }
    await callLegacy("loadHistoryEntry", latest.id);
  };

  const openPracticeFromNotes = async tool => {
    const latest = latestMaterialsHistoryItem();
    if (!latest?.id) {
      setDraft(tool === "flashcards"
        ? "I don’t have uploaded notes open yet. Help me build flashcards from a topic I’ll describe."
        : "I don’t have uploaded notes open yet. Help me start a quiz on a topic I’ll describe.");
      focusComposer(composerRef);
      return;
    }
    await callLegacy("loadHistoryEntry", latest.id);
    callLegacy("switchTool", tool);
    if (tool === "quiz") callLegacy("openQuizSettingsModal");
    if (tool === "flashcards") callLegacy("openFlashcardSettingsModal");
  };

  const openFocusRoom = () => {
    callLegacy("openSynapseFocusRoom");
  };

  return h(
    "section",
    { id: "companionWorkspace", className: "companion-workspace", "aria-labelledby": "companionWorkspaceTitle" },
    h(
      "div",
      { className: "companion-workspace-card companion-chat companion-chat--rich" },
      h(
        "div",
        { className: "companion-session-meta" },
        h(
          "div",
          { className: "companion-session-copy" },
          h(
            "div",
            { className: "workspace-surface-badge workspace-surface-badge--companion", "data-workspace-kind": "companion" },
            icon("bi-chat-dots"),
            h("span", null, "Learning companion"),
          ),
          h("h1", { id: "companionWorkspaceTitle" }, sessionTitle),
          h(
            "p",
            { className: "companion-workspace-intro" },
            hasConversation
              ? "Guide → check → practice. Reopen anytime from Recent learning."
              : "Not another answer dump — a coach that helps you understand, then practice.",
          ),
        ),
        h(
          "div",
          { className: "companion-session-actions" },
          h(
            "button",
            {
              type: "button",
              className: "btn btn-outline-primary companion-new-chat-btn",
              onClick: handleNewChat,
              disabled: busy,
              "data-learning-companion-new-chat": "true",
            },
            icon("bi-pencil-square", "me-1"),
            "New chat",
          ),
        ),
      ),

      !hasConversation
        ? h(
          "div",
          { className: "companion-empty-stage" },
          h(
            "div",
            { className: "companion-empty-copy" },
            h("h2", null, "Start with your real goal"),
            h("p", null, "Students use Synapse when reading isn’t enough — to get unstuck, rehearse for exams, and turn notes into active recall."),
          ),
          h(
            "div",
            { className: "companion-starter-grid", role: "group", "aria-label": "Conversation starters" },
            CONVERSATION_STARTERS.map(starter =>
              h(
                "button",
                {
                  key: starter.id,
                  type: "button",
                  className: "companion-starter-card",
                  disabled: busy,
                  onClick: () => void sendContent(starter.prompt, { topic: starter.label }),
                  "data-learning-companion-starter": starter.id,
                },
                h("span", { className: "companion-starter-icon", "aria-hidden": "true" }, icon(starter.icon)),
                h("span", { className: "companion-starter-label" }, starter.label),
              ),
            ),
          ),
          h(
            "div",
            { className: "companion-bridge-row", role: "group", "aria-label": "Connect to your materials" },
            h(
              "button",
              {
                type: "button",
                className: "companion-bridge-btn",
                onClick: openMaterialsHome,
              },
              icon("bi-cloud-arrow-up"),
              h("span", null, "Upload materials"),
            ),
            h(
              "button",
              {
                type: "button",
                className: "companion-bridge-btn",
                onClick: () => void openLatestNotes(),
                disabled: !hasMaterials,
                title: hasMaterials ? "Open your latest generated notes" : "Upload materials first",
              },
              icon("bi-journal-richtext"),
              h("span", null, hasMaterials ? "Open latest notes" : "No notes yet"),
            ),
            h(
              "button",
              {
                type: "button",
                className: "companion-bridge-btn",
                onClick: openFocusRoom,
              },
              icon("bi-bullseye"),
              h("span", null, "Focus Room"),
            ),
          ),
        )
        : null,

      h(
        "div",
        {
          className: `companion-messages companion-chat-thread${hasConversation ? "" : " companion-chat-thread--welcome"}`,
          "aria-live": "polite",
          ref: threadRef,
        },
        visibleMessages.map(message =>
          messageBubble(message, {
            showActions: hasConversation && !busy,
            onFollowUp: prompt => void sendContent(prompt),
          }),
        ),
        busy
          ? h(
            "div",
            { className: "companion-typing", "aria-live": "polite" },
            h("span", { className: "companion-typing-dot" }),
            h("span", { className: "companion-typing-dot" }),
            h("span", { className: "companion-typing-dot" }),
            h("span", null, "Synapse is thinking…"),
          )
          : null,
        failure
          ? h(
            "div",
            { className: "companion-status companion-status-error companion-turn-failure", role: "alert" },
            h("p", null, failure),
            h(
              "button",
              {
                type: "button",
                className: "btn btn-outline-primary",
                onClick: handleRetry,
                disabled: busy || !pendingMessage,
                "data-learning-companion-retry": "true",
              },
              busy ? "Retrying…" : "Retry",
            ),
          )
          : null,
      ),

      h(
        "div",
        { className: "companion-compose-shell" },
        h(
          "div",
          { className: "companion-study-dock", role: "toolbar", "aria-label": "Study actions" },
          STUDY_DOCK_ACTIONS.map(action =>
            h(
              "button",
              {
                key: action.id,
                type: "button",
                className: "companion-chip",
                disabled: busy,
                onClick: () => void sendContent(action.prompt),
                "data-learning-companion-dock": action.id,
              },
              icon(action.icon),
              h("span", null, action.label),
            ),
          ),
          h(
            "button",
            {
              type: "button",
              className: "companion-chip companion-chip--accent",
              disabled: busy,
              onClick: () => void openPracticeFromNotes("quiz"),
              "data-learning-companion-dock": "notes-quiz",
              title: hasMaterials ? "Generate a quiz from your latest notes" : "Needs uploaded materials",
            },
            icon("bi-collection"),
            h("span", null, "Quiz from notes"),
          ),
          h(
            "button",
            {
              type: "button",
              className: "companion-chip companion-chip--accent",
              disabled: busy,
              onClick: () => void openPracticeFromNotes("flashcards"),
              "data-learning-companion-dock": "notes-flash",
              title: hasMaterials ? "Open flashcards from your latest notes" : "Needs uploaded materials",
            },
            icon("bi-collection-play"),
            h("span", null, "Cards from notes"),
          ),
        ),
        h(
          "form",
          { className: "companion-compose companion-composer", onSubmit: handleSend },
          h("label", { className: "visually-hidden", htmlFor: "companionMessage" }, "Message Synapse"),
          h("textarea", {
            id: "companionMessage",
            ref: composerRef,
            value: draft,
            onChange: event => setDraft(event.target.value),
            onKeyDown: handleComposerKeyDown,
            placeholder: hasConversation
              ? "Ask a follow-up, paste a confusing paragraph, or request a quiz…"
              : "Describe your goal, paste confusing notes, or pick a starter above…",
            disabled: busy,
            rows: 3,
          }),
          h(
            "button",
            {
              type: "submit",
              className: "btn btn-primary",
              disabled: busy || !draft.trim(),
              "data-learning-companion-send": "true",
            },
            busy ? "Thinking…" : h(React.Fragment, null, icon("bi-send", "me-2"), "Send"),
          ),
        ),
        h(
          "p",
          { className: "companion-compose-hint" },
          "Enter to send · Shift+Enter for a new line · Practice tools stay one tap away",
        ),
      ),
    ),
  );
}
