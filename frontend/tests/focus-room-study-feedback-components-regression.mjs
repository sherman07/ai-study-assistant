import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

globalThis.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {}
};

const server = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  plugins: [react()],
  server: { middlewareMode: true },
  ssr: {
    external: ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom/server", "motion", "motion/react", "lucide-react", "zustand"]
  }
});
const focusStyle = await readFile(new URL("../styles/09-focus-room.css", import.meta.url), "utf8");
const toolPanelSource = await readFile(new URL("../src/focus-room/components/FocusRoomToolPanel.jsx", import.meta.url), "utf8");

try {
  const { FlashcardStudyMode } = await server.ssrLoadModule("/frontend/src/focus-room/components/FlashcardStudyMode.jsx");
  const { QuizQuestionCard } = await server.ssrLoadModule("/frontend/src/focus-room/components/QuizStudyMode.jsx");
  const { AIStudyChatView } = await server.ssrLoadModule("/frontend/src/focus-room/components/AIStudyChat.jsx");
  const { FocusMaterialContent } = await server.ssrLoadModule("/frontend/src/focus-room/components/FocusMaterialContent.jsx");
  const { StudyHistoryPanel } = await server.ssrLoadModule("/frontend/src/focus-room/components/StudyHistoryPanel.jsx");
  const { useFocusRoomStore } = await server.ssrLoadModule("/frontend/src/focus-room/hooks/useFocusRoomStore.js");

  const cards = [{ id: "card-1", front: "What is active recall?", back: "Retrieving an answer from memory." }];
  useFocusRoomStore.setState({
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    selectedMaterial: { materialId: "material-1", flashcards: cards }
  });
  const flashcardFront = renderToStaticMarkup(React.createElement(FlashcardStudyMode, { cards }));
  assert.match(flashcardFront, /focus-kicker">Card 1 of 1<\/span>/);
  assert.match(flashcardFront, /flashcard-turn-title[^>]*>Prompt<\/h3>/);
  assert.match(flashcardFront, /flashcard-turn-copy[^>]*>What is active recall\?<\/p>/);
  assert.match(flashcardFront, />Reveal Answer<\/button>/);
  assert.match(flashcardFront, />Mark easy<\/button>/);
  assert.match(flashcardFront, />Mark medium<\/button>/);
  assert.match(flashcardFront, />Mark hard<\/button>/);
  assert.match(flashcardFront, /0 completed in this material\./);
  assert.equal((flashcardFront.match(/focus-button-row/g) || []).length, 2, "Flashcard controls should remain in their original two rows");
  assert.match(flashcardFront, /aria-live="polite"/);
  assert.doesNotMatch(flashcardFront, /flashcard-deck-frame|flashcard-face|flashcard-rating-panel|role="progressbar"/);

  const quizCard = renderToStaticMarkup(React.createElement(QuizQuestionCard, {
    question: {
      type: "single_choice",
      question: "Which option is supported?",
      choices: ["First", "Second", "Third"],
      correctOptionIndexes: [1],
      quizTitle: "Evidence quiz"
    },
    index: 0,
    answer: 0,
    checked: {
      answer: 0,
      correct: false,
      hasKnownAnswer: true,
      explanation: "The source supports the second option."
    },
    onAnswer() {},
    onCheck() {}
  }));
  assert.match(quizCard, /quiz-choice is-incorrect/);
  assert.match(quizCard, /quiz-choice is-correct/);
  assert.match(quizCard, /Evidence quiz \/ Question 1/);
  assert.match(quizCard, /focus-button-row quiz-choice-list/);
  assert.doesNotMatch(quizCard, /quiz-card-head|quiz-choice-marker|quiz-check-row/);
  assert.match(quizCard, /role="status"/);
  assert.match(quizCard, /aria-live="polite"/);
  assert.match(quizCard, /Review this one/);
  assert.match(quizCard, /The source supports the second option\./);

  const pendingChat = renderToStaticMarkup(React.createElement(AIStudyChatView, {
    assistantContext: { sectionTitle: "Cell division", excerpt: "Mitosis creates two daughter cells." },
    chatMessages: [{ role: "user", text: "Explain mitosis", createdAt: "2026-08-10T00:00:00.000Z" }],
    chatPending: true,
    chatError: "",
    draft: "",
    onDraftChange() {},
    onAsk() {}
  }));
  assert.match(pendingChat, /role="log"/);
  assert.match(pendingChat, /tabindex="0"/);
  assert.match(pendingChat, /aria-busy="true"/);
  assert.match(pendingChat, /Synapse is thinking/);
  assert.doesNotMatch(pendingChat, /Thinking\.\.\./);
  assert.match(pendingChat, /aria-label="Ask Synapse about this material"/);
  assert.doesNotMatch(pendingChat, /chat-composer|chat-composer-hint/);

  const loadingMaterial = renderToStaticMarkup(React.createElement(FocusMaterialContent, {
    mode: "materials",
    materials: [],
    status: "loading",
    error: "",
    onWorkspace() {}
  }));
  assert.match(loadingMaterial, /focus-panel-empty is-loading/);
  assert.match(loadingMaterial, /Generating study materials\.\.\./);

  const emptyHistory = renderToStaticMarkup(React.createElement(StudyHistoryPanel, { onWorkspace() {} }));
  assert.match(emptyHistory, /No Focus Room sessions saved yet\./);
  assert.match(emptyHistory, /Open Workspace/);

  useFocusRoomStore.setState({
    selectedMaterial: {
      materialId: "quiz-material",
      quizzes: [{
        title: "Evidence quiz",
        questions: [{
          type: "single_choice",
          question: "Choose the supported answer",
          choices: ["First", "Second"],
          correctOptionIndexes: [1]
        }]
      }]
    },
    quizAnswers: { 0: 0 },
    quizChecked: { 0: { answer: 0, correct: false, hasKnownAnswer: true } }
  });
  useFocusRoomStore.getState().answerQuizQuestion(0, 1);
  assert.equal(useFocusRoomStore.getState().quizAnswers[0], 1);
  assert.equal(
    Object.prototype.hasOwnProperty.call(useFocusRoomStore.getState().quizChecked, 0),
    false,
    "Changing an answer should invalidate its previous result and score"
  );

  for (const selector of [
    ".study-toast-viewport",
    ".study-toast",
    ".flashcard-turn-copy",
    ".flashcard-grade-button",
    ".quiz-choice",
    ".quiz-result",
    ".chat-empty-state",
    ".chat-thinking",
    ".focus-panel-empty.is-loading"
  ]) {
    assert.ok(
      new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}(?![-_a-zA-Z0-9])`).test(focusStyle),
      `Focus Room feedback styles should include ${selector}`
    );
  }
  assert.ok(
    /prefers-reduced-motion[\s\S]*?\.flashcard-turn-copy/.test(focusStyle),
    "Study feedback animation should provide a reduced-motion alternative"
  );
  assert.ok(toolPanelSource.includes("<StudyToastViewport"), "The study suite should mount one shared toast viewport");
  assert.ok(!toolPanelSource.includes("<StudyEmptyState"), "Existing empty-state structure should remain unchanged");
} finally {
  await server.close();
}

console.log("focus room study feedback component regression passed");
