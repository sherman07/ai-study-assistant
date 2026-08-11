import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { GlassButton } from "./GlassButton.jsx";

const EXAMPLE_PROMPTS = [
  "Explain this topic more simply.",
  "Test me on this section.",
  "What should I study next?"
];

export function AIStudyChatView({
  assistantContext,
  chatMessages,
  chatPending,
  chatError,
  draft,
  onDraftChange,
  onAsk
}) {
  const reducedMotion = useReducedMotion();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest"
    });
  }, [chatMessages.length, chatPending, reducedMotion]);

  const submit = () => {
    const question = String(draft || "").trim();
    if (!question || chatPending) return;
    onAsk(question);
  };

  return (
    <article className="chat-panel">
      {assistantContext.sectionTitle || assistantContext.excerpt ? (
        <div className="chat-context-card liquid-glass-lite">
          <span className="focus-kicker">Current focus</span>
          <strong>{assistantContext.sectionTitle || "Selected excerpt"}</strong>
          {assistantContext.excerpt ? <p>{assistantContext.excerpt.slice(0, 240)}</p> : null}
        </div>
      ) : null}

      <div
        className="chat-list"
        role="log"
        tabIndex={0}
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={chatPending}
      >
        {chatMessages.length ? chatMessages.map((message, index) => (
          <motion.div
            className={`chat-message ${message.role}`}
            key={`${message.createdAt}-${index}`}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: reducedMotion ? 0.1 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="focus-kicker">{message.role === "user" ? "You" : "Synapse"}</span>
            <p>{message.text}</p>
          </motion.div>
        )) : <motion.p className="chat-empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Try: Explain this topic more simply.</motion.p>}
        {chatPending ? (
          <motion.div
            className="chat-message assistant is-pending"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0.1 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="focus-kicker">Synapse</span>
            <p className="chat-thinking" role="status">
              Synapse is thinking
              <span className="study-pending-dots" aria-hidden="true"><i /><i /><i /></span>
            </p>
          </motion.div>
        ) : null}
        <span ref={endRef} aria-hidden="true" />
      </div>

      {chatError ? <p className="audio-error chat-error" role="alert">{chatError}</p> : null}

      <textarea
        className="answer-input"
        aria-label="Ask Synapse about this material"
        placeholder="Ask about this material..."
        value={draft}
        onChange={event => onDraftChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        }}
      />

      <div className="focus-button-row">
        <GlassButton variant="primary" disabled={chatPending || !String(draft || "").trim()} onClick={submit}>Ask</GlassButton>
        {EXAMPLE_PROMPTS.map(prompt => (
          <GlassButton key={prompt} disabled={chatPending} onClick={() => onAsk(prompt)}>{prompt}</GlassButton>
        ))}
      </div>
    </article>
  );
}

export function AIStudyChat() {
  const [draft, setDraft] = useState("");
  const assistantContext = useFocusRoomStore(state => state.assistantContext);
  const chatMessages = useFocusRoomStore(state => state.chatMessages);
  const chatPending = useFocusRoomStore(state => state.chatPending);
  const chatError = useFocusRoomStore(state => state.chatError);
  const askAssistant = useFocusRoomStore(state => state.askAssistant);

  const ask = question => {
    askAssistant(question);
    setDraft("");
  };

  return (
    <AIStudyChatView
      assistantContext={assistantContext}
      chatError={chatError}
      chatMessages={chatMessages}
      chatPending={chatPending}
      draft={draft}
      onAsk={ask}
      onDraftChange={setDraft}
    />
  );
}
