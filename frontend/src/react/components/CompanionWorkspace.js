import { React, h, icon } from "../runtime.js";
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
  COMPANION_TOOL_CATALOG,
  buildCompanionConversationContext,
  companionPractice,
  normalizeCompanionSuggestedTools,
  readLatestMaterialsContext,
} from "../../legacy/companionPracticeClient.js?v=companion-practice-v1";

const MAX_CONTEXT_MESSAGES = 24;

const WELCOME_MESSAGE = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "I’m Synapse — your study companion. Tell me what you’re stuck on, what you’re revising for, or paste a tricky paragraph. I’ll guide you step by step, then suggest practice tools only when they’ll help.",
};

const CONVERSATION_STARTERS = [
  {
    id: "stuck",
    icon: "bi-emoji-dizzy",
    label: "I’m stuck on a concept",
    prompt: "I’m stuck on a concept and need a clear explanation with a simple example. Ask me what topic I’m working on, then teach it step by step without dumping the full answer at once.",
  },
  {
    id: "quiz",
    icon: "bi-ui-checks-grid",
    label: "Quiz me",
    prompt: "Quiz me. Ask what topic or exam I’m preparing for, then suggest a quiz when you have enough context to generate useful questions.",
  },
  {
    id: "exam",
    icon: "bi-calendar2-check",
    label: "Exam tonight",
    prompt: "I have an exam coming up soon. Help me build a focused revision plan: ask what subject and how much time I have, then give a prioritized study sequence with active-recall checkpoints.",
  },
  {
    id: "teachback",
    icon: "bi-chat-square-quote",
    label: "Check my understanding",
    prompt: "I want a teach-back check. Ask me to explain a topic in my own words, then point out gaps and ask follow-up questions until my explanation is solid.",
  },
  {
    id: "flashcards",
    icon: "bi-layers",
    label: "Make flashcards",
    prompt: "Help me turn this topic into high-quality flashcards. Ask what I need to memorize, then suggest generating flashcards in this chat when you have enough material.",
  },
  {
    id: "paste",
    icon: "bi-clipboard-check",
    label: "Explain this passage",
    prompt: "I’m going to paste a confusing passage from my notes. After I paste it, explain it in plain language, highlight the exam-critical ideas, and ask one check question.",
  },
];

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

function toolsFromDecision(decision) {
  return normalizeCompanionSuggestedTools(decision?.suggested_tools);
}

function latestSuggestedTools(messages = []) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "assistant") continue;
    const tools = toolsFromDecision(message.decision);
    if (tools.length) return tools;
  }
  return [];
}

function messageFollowUps(message) {
  if (message.role !== "assistant" || message.id === WELCOME_MESSAGE.id) return [];
  const tools = toolsFromDecision(message.decision);
  if (tools.length) {
    return tools.map(tool => ({
      id: `${tool.id}-${message.id}`,
      toolId: tool.id,
      label: tool.label,
    }));
  }
  const actions = Array.isArray(message.decision?.suggested_actions)
    ? message.decision.suggested_actions.filter(Boolean).slice(0, 3)
    : [];
  return actions.map((label, index) => ({
    id: `action-${message.id}-${index}`,
    prompt: String(label),
    label: String(label),
  }));
}

function CompanionFlashcardDeck({ message }) {
  const cards = Array.isArray(message.cards) ? message.cards : [];
  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  if (!cards.length) return null;
  const card = cards[Math.max(0, Math.min(index, cards.length - 1))];
  return h(
    "div",
    { className: "companion-artifact companion-flashcard-deck", "data-companion-artifact": "flashcards" },
    h(
      "div",
      { className: "companion-artifact-head" },
      h("strong", null, message.artifactTitle || "Flashcards"),
      h("span", null, `${index + 1} / ${cards.length}`),
    ),
    h(
      "button",
      {
        type: "button",
        className: `companion-flashcard${flipped ? " is-flipped" : ""}`,
        onClick: () => setFlipped(value => !value),
        "data-companion-flashcard-flip": "true",
      },
      h("span", { className: "companion-flashcard-face companion-flashcard-front" }, card.front),
      h("span", { className: "companion-flashcard-face companion-flashcard-back" }, card.back),
    ),
    card.hint && !flipped
      ? h("p", { className: "companion-artifact-hint" }, `Hint: ${card.hint}`)
      : null,
    h(
      "div",
      { className: "companion-artifact-controls" },
      h(
        "button",
        {
          type: "button",
          className: "companion-chip companion-chip--quiet",
          disabled: index <= 0,
          onClick: () => { setIndex(value => Math.max(0, value - 1)); setFlipped(false); },
        },
        "Previous",
      ),
      h(
        "button",
        {
          type: "button",
          className: "companion-chip companion-chip--quiet",
          onClick: () => setFlipped(value => !value),
        },
        flipped ? "Show prompt" : "Reveal answer",
      ),
      h(
        "button",
        {
          type: "button",
          className: "companion-chip companion-chip--quiet",
          disabled: index >= cards.length - 1,
          onClick: () => { setIndex(value => Math.min(cards.length - 1, value + 1)); setFlipped(false); },
        },
        "Next",
      ),
    ),
  );
}

function CompanionQuizPanel({ message }) {
  const quiz = message.quiz || { questions: [] };
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [revealed, setRevealed] = React.useState({});
  if (!questions.length) return null;
  const question = questions[Math.max(0, Math.min(index, questions.length - 1))];
  const answer = answers[question.id];
  const isRevealed = Boolean(revealed[question.id]);

  const grade = () => {
    if (question.type === "true_false") {
      return answer === String(Boolean(question.correctBoolean));
    }
    if (Array.isArray(question.correctOptionIndexes) && question.correctOptionIndexes.length) {
      return question.correctOptionIndexes.includes(Number(answer));
    }
    if (question.expectedAnswer && typeof answer === "string") {
      return answer.trim().toLowerCase() === question.expectedAnswer.trim().toLowerCase();
    }
    return null;
  };

  const result = isRevealed ? grade() : null;

  return h(
    "div",
    { className: "companion-artifact companion-quiz-panel", "data-companion-artifact": "quiz" },
    h(
      "div",
      { className: "companion-artifact-head" },
      h("strong", null, quiz.title || message.artifactTitle || "Quiz"),
      h("span", null, `${index + 1} / ${questions.length}`),
    ),
    h("p", { className: "companion-quiz-question" }, question.question),
    question.options?.length
      ? h(
        "div",
        { className: "companion-quiz-options", role: "group" },
        question.options.map((option, optionIndex) =>
          h(
            "button",
            {
              key: `${question.id}-${optionIndex}`,
              type: "button",
              className: `companion-quiz-option${Number(answer) === optionIndex ? " is-selected" : ""}`,
              disabled: isRevealed,
              onClick: () => setAnswers(current => ({ ...current, [question.id]: optionIndex })),
              "data-companion-quiz-option": String(optionIndex),
            },
            option,
          ),
        ),
      )
      : question.type === "true_false"
        ? h(
          "div",
          { className: "companion-quiz-options", role: "group" },
          ["true", "false"].map(value =>
            h(
              "button",
              {
                key: value,
                type: "button",
                className: `companion-quiz-option${answer === value ? " is-selected" : ""}`,
                disabled: isRevealed,
                onClick: () => setAnswers(current => ({ ...current, [question.id]: value })),
              },
              value === "true" ? "True" : "False",
            ),
          ),
        )
        : h("textarea", {
          className: "companion-quiz-input",
          rows: 3,
          value: typeof answer === "string" ? answer : "",
          disabled: isRevealed,
          placeholder: "Type your answer…",
          onChange: event => setAnswers(current => ({ ...current, [question.id]: event.target.value })),
          "data-companion-quiz-input": "true",
        }),
    isRevealed
      ? h(
        "div",
        { className: `companion-quiz-feedback${result === false ? " is-wrong" : result ? " is-right" : ""}` },
        result === true ? "Nice — that matches the expected answer." : null,
        result === false ? "Not quite. Review the explanation and try the next angle." : null,
        result == null ? "Compare your answer with the guide below." : null,
        question.expectedAnswer ? h("p", null, `Guide: ${question.expectedAnswer}`) : null,
        question.explanation ? h("p", null, question.explanation) : null,
      )
      : null,
    h(
      "div",
      { className: "companion-artifact-controls" },
      h(
        "button",
        {
          type: "button",
          className: "companion-chip companion-chip--quiet",
          disabled: index <= 0,
          onClick: () => setIndex(value => Math.max(0, value - 1)),
        },
        "Previous",
      ),
      h(
        "button",
        {
          type: "button",
          className: "companion-chip",
          disabled: isRevealed || answer == null || answer === "",
          onClick: () => setRevealed(current => ({ ...current, [question.id]: true })),
          "data-companion-quiz-check": "true",
        },
        "Check",
      ),
      h(
        "button",
        {
          type: "button",
          className: "companion-chip companion-chip--quiet",
          disabled: index >= questions.length - 1,
          onClick: () => setIndex(value => Math.min(questions.length - 1, value + 1)),
        },
        "Next",
      ),
    ),
  );
}

function CompanionBroadcastPanel({ message }) {
  const broadcast = message.broadcast || {};
  const sections = Array.isArray(broadcast.sections) ? broadcast.sections : [];
  const transcript = Array.isArray(broadcast.transcript) ? broadcast.transcript : [];
  return h(
    "div",
    { className: "companion-artifact companion-broadcast-panel", "data-companion-artifact": "broadcast" },
    h(
      "div",
      { className: "companion-artifact-head" },
      h("strong", null, broadcast.title || message.artifactTitle || "AI Broadcast"),
      h("span", null, "Companion study audio outline"),
    ),
    broadcast.summary ? h("p", { className: "companion-broadcast-summary" }, broadcast.summary) : null,
    sections.length
      ? h(
        "ol",
        { className: "companion-broadcast-sections" },
        sections.slice(0, 8).map(section =>
          h(
            "li",
            { key: section.id },
            h("strong", null, section.title),
            section.script ? h("p", null, section.script) : null,
          ),
        ),
      )
      : null,
    !sections.length && transcript.length
      ? h(
        "div",
        { className: "companion-broadcast-transcript" },
        transcript.slice(0, 12).map(line =>
          h("p", { key: line.id }, h("strong", null, `${line.speaker}: `), line.text),
        ),
      )
      : null,
  );
}

function messageBubble(message, { onFollowUp, onTool, showActions }) {
  const isLearner = message.role === "user";
  const followUps = showActions ? messageFollowUps(message) : [];
  return h(
    "article",
    {
      key: message.id || `${message.role}-${message.content}`,
      className: `companion-message ${isLearner ? "companion-message-user" : "companion-message-assistant"}`,
      "data-companion-message-kind": message.kind || "text",
    },
    h(
      "div",
      { className: "companion-message-header" },
      !isLearner
        ? h("span", { className: "companion-message-avatar", "aria-hidden": "true" }, icon("bi-stars"))
        : null,
      h("p", { className: "companion-message-role" }, isLearner ? "You" : "Synapse"),
    ),
    message.content
      ? h("p", { className: "companion-message-body" }, message.content)
      : null,
    message.kind === "flashcards" ? h(CompanionFlashcardDeck, { message }) : null,
    message.kind === "quiz" ? h(CompanionQuizPanel, { message }) : null,
    message.kind === "broadcast" ? h(CompanionBroadcastPanel, { message }) : null,
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
              onClick: () => {
                if (action.toolId) onTool(action.toolId);
                else onFollowUp(action.prompt);
              },
              "data-learning-companion-followup": action.toolId || "prompt",
            },
            action.label,
          ),
        ),
      )
      : null,
  );
}

export function CompanionWorkspace() {
  const composerRef = React.useRef(null);
  const threadRef = React.useRef(null);
  const [thread, setThread] = React.useState(() => loadLearningCompanionThread(getLocalStorage()));
  const [draft, setDraft] = React.useState("");
  const [pendingMessage, setPendingMessage] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [toolBusy, setToolBusy] = React.useState("");
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
  }, [thread.messages.length, busy, toolBusy, failure]);

  const hasConversation = companionThreadHasUserContent(thread);
  const visibleMessages = thread.messages.length ? thread.messages : [WELCOME_MESSAGE];
  const sessionTitle = hasConversation ? titleFromCompanionThread(thread) : "What should we work on?";
  const suggestedTools = latestSuggestedTools(thread.messages);
  const dockBusy = busy || Boolean(toolBusy);

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
      decision: {
        ...decision,
        suggested_tools: normalizeCompanionSuggestedTools(decision?.suggested_tools),
      },
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
    if (!trimmed || busy || toolBusy) return;

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
  }, [busy, handleTutorReply, persistThread, toolBusy]);

  const appendArtifactMessage = React.useCallback((artifactMessage) => {
    const active = loadLearningCompanionThread(getLocalStorage());
    const nextThread = appendLearningCompanionMessage(active, artifactMessage);
    if (!persistThread(nextThread)) {
      throw new Error("Synapse could not save this practice artifact locally. Please retry.");
    }
  }, [persistThread]);

  const resolvePracticeContext = React.useCallback((toolId) => {
    const active = loadLearningCompanionThread(getLocalStorage());
    const topic = active.learningContext?.topic || titleFromCompanionThread(active);
    if (toolId === "quiz_from_notes" || toolId === "cards_from_notes") {
      const materials = readLatestMaterialsContext(getLocalStorage());
      if (materials?.summary) return { context: materials, source: "notes" };
      return {
        context: buildCompanionConversationContext(active.messages, { topic, title: topic }),
        source: "conversation-fallback",
      };
    }
    return {
      context: buildCompanionConversationContext(active.messages, { topic, title: topic }),
      source: "conversation",
    };
  }, []);

  const runSuggestedTool = React.useCallback(async (toolId) => {
    const catalog = COMPANION_TOOL_CATALOG[toolId];
    if (!catalog || busy || toolBusy) return;

    if (catalog.mode === "prompt") {
      await sendContent(catalog.prompt);
      return;
    }

    setToolBusy(toolId);
    setFailure("");
    try {
      const { context, source } = resolvePracticeContext(toolId);
      if ((toolId === "quiz_from_notes" || toolId === "cards_from_notes") && source === "conversation-fallback") {
        setHasMaterials(Boolean(latestMaterialsHistoryItem()));
      }

      if (toolId === "quiz" || toolId === "quiz_from_notes") {
        const quiz = await companionPractice.generateQuiz(context, { totalQuestions: 5 });
        appendArtifactMessage({
          id: createMessageId("assistant-quiz"),
          role: "assistant",
          kind: "quiz",
          content: source === "notes"
            ? `I generated a quiz from your latest materials (“${context.title}”). Answer in this chat — this stays separate from Materials class quizzes.`
            : `I generated a quiz from what we’re studying right now. Answer in this chat — this uses the shared quiz engine, but stays in the companion conversation.`,
          artifactTitle: quiz.title,
          quiz,
          decision: { suggested_tools: [] },
        });
        return;
      }

      if (toolId === "flashcards" || toolId === "cards_from_notes") {
        const deck = await companionPractice.generateFlashcards(context, { cardCount: 6 });
        appendArtifactMessage({
          id: createMessageId("assistant-flash"),
          role: "assistant",
          kind: "flashcards",
          content: source === "notes"
            ? `Here are flashcards from your latest materials (“${context.title}”). Flip through them in this chat.`
            : "Here are flashcards based on our conversation. Flip each card in this chat — they are delivered here, not in the Materials flashcard panel.",
          artifactTitle: deck.title,
          cards: deck.cards,
          decision: { suggested_tools: [] },
        });
        return;
      }

      if (toolId === "broadcast") {
        const broadcast = await companionPractice.generateBroadcast(context, { lengthMinutes: 8 });
        appendArtifactMessage({
          id: createMessageId("assistant-broadcast"),
          role: "assistant",
          kind: "broadcast",
          content: "I drafted an AI Broadcast outline from what we’re studying. Review the sections here — companion broadcasts reuse the shared broadcast generator, but stay in this conversation.",
          artifactTitle: broadcast.title,
          broadcast,
          decision: { suggested_tools: [] },
        });
      }
    } catch (error) {
      setFailure(error?.message || "Synapse could not generate that practice tool right now.");
      focusComposer(composerRef);
    } finally {
      setToolBusy("");
    }
  }, [appendArtifactMessage, busy, resolvePracticeContext, sendContent, toolBusy]);

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
    if (!pendingMessage || busy || toolBusy) return;
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
    if (busy || toolBusy) return;
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
              ? "Guide → check → practice. Practice tools appear only when Synapse thinks they’ll help."
              : "Not another answer dump — a coach that helps you understand, then unlocks practice when you’re ready.",
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
              disabled: dockBusy,
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
                  disabled: dockBusy,
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
            showActions: hasConversation && !dockBusy,
            onFollowUp: prompt => void sendContent(prompt),
            onTool: toolId => void runSuggestedTool(toolId),
          }),
        ),
        busy || toolBusy
          ? h(
            "div",
            { className: "companion-typing", "aria-live": "polite" },
            h("span", { className: "companion-typing-dot" }),
            h("span", { className: "companion-typing-dot" }),
            h("span", { className: "companion-typing-dot" }),
            h(
              "span",
              null,
              toolBusy === "flashcards" || toolBusy === "cards_from_notes"
                ? "Synapse is building flashcards…"
                : toolBusy === "quiz" || toolBusy === "quiz_from_notes"
                  ? "Synapse is building a quiz…"
                  : toolBusy === "broadcast"
                    ? "Synapse is drafting an AI Broadcast…"
                    : "Synapse is thinking…",
            ),
          )
          : null,
        failure
          ? h(
            "div",
            { className: "companion-status companion-status-error companion-turn-failure", role: "alert" },
            h("p", null, failure),
            pendingMessage
              ? h(
                "button",
                {
                  type: "button",
                  className: "btn btn-outline-primary",
                  onClick: handleRetry,
                  disabled: dockBusy || !pendingMessage,
                  "data-learning-companion-retry": "true",
                },
                busy ? "Retrying…" : "Retry",
              )
              : null,
          )
          : null,
      ),

      h(
        "div",
        { className: "companion-compose-shell" },
        suggestedTools.length
          ? h(
            "div",
            {
              className: "companion-study-dock",
              role: "toolbar",
              "aria-label": "AI-suggested study actions",
              "data-learning-companion-dock-state": "suggested",
            },
            suggestedTools.map(action =>
              h(
                "button",
                {
                  key: action.id,
                  type: "button",
                  className: `companion-chip${action.mode === "notes" ? " companion-chip--accent" : ""}`,
                  disabled: dockBusy,
                  onClick: () => void runSuggestedTool(action.id),
                  title: action.reason || action.description,
                  "data-learning-companion-dock": action.id,
                },
                icon(action.icon),
                h("span", null, toolBusy === action.id ? "Working…" : action.label),
              ),
            ),
          )
          : h(
            "div",
            {
              className: "companion-study-dock companion-study-dock--empty",
              "data-learning-companion-dock-state": "hidden",
              "aria-hidden": "true",
            },
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
            disabled: dockBusy,
            rows: 3,
          }),
          h(
            "button",
            {
              type: "submit",
              className: "btn btn-primary",
              disabled: dockBusy || !draft.trim(),
              "data-learning-companion-send": "true",
            },
            busy ? "Thinking…" : h(React.Fragment, null, icon("bi-send", "me-2"), "Send"),
          ),
        ),
        h(
          "p",
          { className: "companion-compose-hint" },
          suggestedTools.length
            ? "Enter to send · Shift+Enter for a new line · Suggested practice tools appear only when Synapse recommends them"
            : "Enter to send · Shift+Enter for a new line · Practice tools appear above when Synapse recommends them",
        ),
      ),
    ),
  );
}
