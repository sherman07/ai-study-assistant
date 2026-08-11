import { correctOptionIndexes, quizAnswerMatchesChoice } from "./utils.js";

const TOAST_TONES = new Set(["info", "success", "error"]);

export function quizCheckedMatchesAnswer(checked, answer) {
  if (!checked || !Object.prototype.hasOwnProperty.call(checked, "answer")) return false;
  if (Array.isArray(checked.answer) || Array.isArray(answer)) {
    if (!Array.isArray(checked.answer) || !Array.isArray(answer) || checked.answer.length !== answer.length) {
      return false;
    }
    return checked.answer.every((value, index) => Object.is(value, answer[index]));
  }
  return Object.is(checked.answer, answer);
}

export function quizFeedbackMotion(checked) {
  if (!checked) return "idle";
  if (!checked.hasKnownAnswer) return "review";
  return checked.correct ? "success" : "error";
}

export function quizChoiceState(question, answer, checked, choiceIndex) {
  const selected = quizAnswerMatchesChoice(question, answer, choiceIndex);
  if (!checked || !checked.hasKnownAnswer) return selected ? "selected" : "idle";

  if (correctOptionIndexes(question).includes(Number(choiceIndex))) return "correct";
  if (selected) return "incorrect";
  return "muted";
}

export function quizResultCopy(checked) {
  if (!checked) return null;
  const detail = String(checked.explanation || "").trim();
  if (!checked.hasKnownAnswer) {
    return { tone: "info", title: "Answer saved for review", detail };
  }
  if (checked.correct) {
    return { tone: "success", title: "Correct", detail };
  }
  return { tone: "error", title: "Review this one", detail };
}

export function normalizeStudyToast(input, now = Date.now()) {
  const title = String(input?.title || "").trim();
  const message = String(input?.message || "").trim();
  if (!title && !message) return null;
  const createdAt = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const tone = TOAST_TONES.has(String(input?.tone)) ? String(input.tone) : "info";
  const id = String(input?.id || `study-toast-${createdAt}-${Math.random().toString(36).slice(2, 8)}`);
  return { id, tone, title: title || "Synapse", message, createdAt };
}

export function reduceStudyToasts(queue, action) {
  const current = Array.isArray(queue) ? queue : [];
  if (action?.type === "dismiss") {
    return current.filter(toast => toast.id !== action.id);
  }
  if (action?.type !== "push" || !action.toast) return current;

  const signature = toast => `${toast.tone}\n${toast.title}\n${toast.message}`;
  const nextSignature = signature(action.toast);
  return current
    .filter(toast => signature(toast) !== nextSignature)
    .concat(action.toast)
    .slice(-3);
}
