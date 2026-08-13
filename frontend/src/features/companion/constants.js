/** Companion empty-state starters and study-dock actions. */
const MAX_CONTEXT_MESSAGES = 24;

const WELCOME_MESSAGE = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "I’m Synapse — your study companion. Tell me what you’re stuck on, what you’re revising for, or paste a tricky paragraph. I’ll guide you step by step, then help you turn understanding into practice.",
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
    prompt: "Quiz me. Ask one question at a time, wait for my answer, then give brief feedback and the next question. Start by asking what topic or exam I’m preparing for.",
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
    prompt: "Help me turn this topic into high-quality flashcards. Ask what I need to memorize, then draft Q/A cards that test understanding, not just definitions.",
  },
  {
    id: "paste",
    icon: "bi-clipboard-check",
    label: "Explain this passage",
    prompt: "I’m going to paste a confusing passage from my notes. After I paste it, explain it in plain language, highlight the exam-critical ideas, and ask one check question.",
  },
];

const STUDY_DOCK_ACTIONS = [
  {
    id: "dock-quiz",
    icon: "bi-ui-checks-grid",
    label: "Quiz me",
    prompt: "Quiz me on what we’ve been discussing. One question at a time, wait for my answer, then give concise feedback.",
  },
  {
    id: "dock-flash",
    icon: "bi-layers",
    label: "Flashcards",
    prompt: "Create 6 flashcards from our conversation so far. Format each as Q: … / A: … and keep answers short enough to recall aloud.",
  },
  {
    id: "dock-teach",
    icon: "bi-chat-square-quote",
    label: "Teach-back",
    prompt: "Run a teach-back: ask me to explain the key idea in my own words, then probe weak spots with follow-up questions.",
  },
  {
    id: "dock-summarize",
    icon: "bi-journal-text",
    label: "Key points",
    prompt: "Summarize the most important points from our chat as a short revision sheet I can skim before an exam.",
  },
];

export {
  MAX_CONTEXT_MESSAGES,
  WELCOME_MESSAGE,
  CONVERSATION_STARTERS,
  STUDY_DOCK_ACTIONS
};
