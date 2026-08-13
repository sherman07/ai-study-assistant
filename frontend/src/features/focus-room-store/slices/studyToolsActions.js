/** Notes, plan tasks, flashcards, quiz, and chat actions. */
import {
  saveFocusRoomActiveSession
} from "../../focus-room-data/index.js";
import {
  MAX_DURATION_MINUTES,
  PANEL_TABS,
  clampInteger,
  coerceQuizAnswer,
  correctAnswerText,
  flashcardKey,
  focusAssistantReply,
  focusFlashcards,
  focusQuizQuestions,
  isQuizAnswerCorrect,
  normalizeChatMessages,
  normalizeStudyPlanItems,
  questionText
} from "../../../focus-room/utils.js";
import { requestFocusAssistantAnswer } from "../../../focus-room/services/focusAssistantClient.js";
import {
  countFocusFlashcardsCompleted,
  focusQuizMistakesFromState,
  focusQuizScoreFromState,
  normalizeAssistantContext,
  persistDraftFromState
} from "../helpers/draftHelpers.js";
import {
  clockNowMs,
  persistTimerSnapshot,
  timerSnapshot
} from "../helpers/timerHelpers.js";
import { formatFocusRoomDuration } from "../../focus-room-data/index.js";

export function createStudyToolsActions(set, get) {
  return {
    setWorkspaceNotes(value) {
      set(state => {
        const next = {
          workspaceNotes: String(value ?? ""),
          workspaceUpdatedAt: new Date().toISOString()
        };
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    setAssistantContext(context = {}) {
      set({ assistantContext: normalizeAssistantContext(context) });
    },

    toggleTask(index) {
      set(state => {
        const planItem = state.studyPlan[Number(index)];
        if (!planItem) return {};
        const task = String(planItem.task || "");
        const completedTasks = state.completedTasks.includes(task)
          ? state.completedTasks.filter(item => item !== task)
          : [...state.completedTasks, task];
        persistDraftFromState({ ...state, completedTasks });
        return { completedTasks };
      });
    },

    updatePlanTask(index, minutes = null, task = null) {
      set(state => {
        const taskIndex = Number(index);
        const current = state.studyPlan[taskIndex];
        if (!current) return {};
        const previousTask = String(current.task || "");
        const nextTask = task === null || task === undefined ? previousTask : String(task || "").trim();
        const nextMinutes = minutes === null || minutes === undefined
          ? current.minutes
          : clampInteger(minutes, current.minutes, 1, MAX_DURATION_MINUTES);
        const studyPlan = state.studyPlan.map((item, itemIndex) => itemIndex === taskIndex
          ? { minutes: nextMinutes, task: nextTask || previousTask }
          : item);
        let completedTasks = state.completedTasks;
        if (previousTask && previousTask !== studyPlan[taskIndex].task && completedTasks.includes(previousTask)) {
          completedTasks = completedTasks
            .filter(item => item !== previousTask)
            .concat(studyPlan[taskIndex].task);
        }
        const next = { studyPlan, completedTasks };
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    setFlashcardIndex(index) {
      const cards = focusFlashcards(get().selectedMaterial);
      set({
        flashcardIndex: clampInteger(index, get().flashcardIndex, 0, Math.max(0, cards.length - 1)),
        flashcardSide: "front"
      });
    },

    flipFlashcard() {
      set(state => ({
        flashcardSide: state.flashcardSide === "back" ? "front" : "back"
      }));
    },

    rateFlashcard(difficulty) {
      const state = get();
      const cards = focusFlashcards(state.selectedMaterial);
      if (!cards.length) return;
      const index = clampInteger(state.flashcardIndex, 0, 0, cards.length - 1);
      const card = cards[index];
      const value = ["easy", "medium", "hard"].includes(String(difficulty)) ? String(difficulty) : "medium";
      set({
        flashcardProgress: {
          ...state.flashcardProgress,
          [flashcardKey(card, index)]: {
            difficulty: value,
            reviewedAt: new Date().toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: index < cards.length - 1 ? index + 1 : index
      });
    },

    answerQuizQuestion(index, value) {
      const questionIndex = Number(index);
      const question = focusQuizQuestions(get().selectedMaterial)[questionIndex];
      if (!question) return;
      const key = String(questionIndex);
      set(state => {
        const previousAnswer = state.quizAnswers[key];
        const nextAnswer = coerceQuizAnswer(question, value, previousAnswer);
        const answersMatch = Array.isArray(previousAnswer) && Array.isArray(nextAnswer)
          ? previousAnswer.length === nextAnswer.length && previousAnswer.every((item, itemIndex) => Object.is(item, nextAnswer[itemIndex]))
          : Object.is(previousAnswer, nextAnswer);
        if (answersMatch) return state;

        const quizChecked = { ...state.quizChecked };
        delete quizChecked[key];
        return {
          quizAnswers: {
            ...state.quizAnswers,
            [key]: nextAnswer
          },
          quizChecked
        };
      });
    },

    checkQuizQuestion(index) {
      const questions = focusQuizQuestions(get().selectedMaterial);
      const questionIndex = Number(index);
      const question = questions[questionIndex];
      if (!question) return;
      const key = String(questionIndex);
      const state = get();
      const answer = Object.prototype.hasOwnProperty.call(state.quizAnswers, key) ? state.quizAnswers[key] : "";
      const correct = isQuizAnswerCorrect(question, answer);
      const correctAnswer = correctAnswerText(question);
      set({
        quizChecked: {
          ...state.quizChecked,
          [key]: {
            answer,
            correct: correct === null ? false : correct,
            hasKnownAnswer: correct !== null,
            explanation: question.explanation || question.rationale || (correctAnswer ? `Correct answer: ${correctAnswer}` : ""),
            checkedAt: new Date().toISOString()
          }
        }
      });
    },

    async askAssistant(question) {
      const text = String(question || "").trim();
      if (!text) return;
      const state = get();
      const material = state.selectedMaterial;
      const priorChatHistory = normalizeChatMessages(state.chatMessages)
        .slice(-10)
        .map(message => ({
          role: message.role === "user" ? "user" : "assistant",
          content: message.text
        }));
      set({
        chatMessages: normalizeChatMessages([
          ...state.chatMessages,
          { role: "user", text, createdAt: new Date().toISOString() }
        ]),
        chatPending: true,
        chatError: ""
      });

      try {
        const result = await requestFocusAssistantAnswer({
          question: text,
          chatHistory: priorChatHistory,
          material,
          assistantContext: state.assistantContext,
          studyGoal: state.studyGoal
        });
        set(nextState => ({
          chatMessages: normalizeChatMessages([
            ...nextState.chatMessages,
            { role: "assistant", text: result.answer, createdAt: new Date().toISOString() }
          ]),
          chatError: result.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (error) {
        set(nextState => ({
          chatMessages: normalizeChatMessages([
            ...nextState.chatMessages,
            { role: "assistant", text: focusAssistantReply(text, material, get().studyGoal), createdAt: new Date().toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${error.message || "request failed"}`
        }));
      } finally {
        set({ chatPending: false });
      }
    },

    focusFlashcardsCompletedCount() {
      return countFocusFlashcardsCompleted(get());
    },

    focusQuizScore() {
      return focusQuizScoreFromState(get());
    },

    focusQuizMistakes() {
      return focusQuizMistakesFromState(get());
    },

    formatFocusedTime() {
      return formatFocusRoomDuration(get().elapsedSeconds);
    }
  };
}
