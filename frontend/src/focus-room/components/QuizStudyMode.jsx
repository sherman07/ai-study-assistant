import { motion, useReducedMotion } from "motion/react";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import {
  quizCheckedMatchesAnswer,
  quizChoiceState,
  quizFeedbackMotion,
  quizResultCopy
} from "../studyFeedback.js";
import {
  isFocusQuizAnswerPresent,
  questionChoices,
  questionText,
  quizAnswerMatchesChoice
} from "../utils.js";
import { GlassButton } from "./GlassButton.jsx";

export function QuizQuestionCard({ question, index, answer, checked, onAnswer, onCheck }) {
  const reducedMotion = useReducedMotion();
  const choices = questionChoices(question);
  const textAnswer = typeof answer === "string" ? answer : "";
  const hasAnswer = isFocusQuizAnswerPresent(question, answer);
  const activeChecked = quizCheckedMatchesAnswer(checked, answer) ? checked : null;
  const result = quizResultCopy(activeChecked);
  const resultId = `quiz-result-${index}`;
  const feedbackMotion = quizFeedbackMotion(activeChecked);
  const cardMotion = reducedMotion || feedbackMotion === "idle" || feedbackMotion === "review"
    ? { opacity: 1 }
    : feedbackMotion === "success"
      ? { scale: [1, 1.006, 1] }
      : { x: [0, -2, 2, -1, 0] };

  return (
    <motion.article
      className={`quiz-card liquid-glass-lite ${result ? `has-result is-${result.tone}` : ""}`.trim()}
      animate={cardMotion}
      transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="focus-kicker">{question.quizTitle || "Quiz"} / Question {index + 1}</span>
      <h3>{questionText(question, index)}</h3>
      {choices.length ? (
        <div className="focus-button-row quiz-choice-list" role="group" aria-label={`Answers for question ${index + 1}`}>
          {choices.map((choice, choiceIndex) => {
            const state = quizChoiceState(question, answer, activeChecked, choiceIndex);
            const selected = quizAnswerMatchesChoice(question, answer, choiceIndex);
            return (
              <GlassButton
                className={`quiz-choice is-${state}`}
                key={`${choice}-${choiceIndex}`}
                variant={selected ? "primary" : "ghost"}
                aria-pressed={selected}
                aria-describedby={activeChecked ? resultId : undefined}
                data-state={state}
                onClick={() => onAnswer(index, choiceIndex)}
              >
                {choice}
              </GlassButton>
            );
          })}
        </div>
      ) : (
        <textarea
          className="answer-input"
          value={textAnswer}
          aria-label={`Answer for question ${index + 1}`}
          aria-describedby={activeChecked ? resultId : undefined}
          onChange={event => onAnswer(index, event.target.value)}
        />
      )}
      <GlassButton variant="primary" disabled={!hasAnswer} onClick={() => onCheck(index)}>
        Check answer
      </GlassButton>
      {result ? (
        <motion.p
          className={`quiz-result is-${result.tone}`}
          id={resultId}
          role="status"
          aria-live="polite"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 5, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: reducedMotion ? 0.08 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {result.title}{result.detail ? ` - ${result.detail}` : ""}
        </motion.p>
      ) : null}
    </motion.article>
  );
}

export function QuizStudyMode({ questions }) {
  const reducedMotion = useReducedMotion();
  const quizAnswers = useFocusRoomStore(state => state.quizAnswers);
  const quizChecked = useFocusRoomStore(state => state.quizChecked);
  const answerQuizQuestion = useFocusRoomStore(state => state.answerQuizQuestion);
  const checkQuizQuestion = useFocusRoomStore(state => state.checkQuizQuestion);
  const score = useFocusRoomStore(state => {
    const checked = Object.entries(state.quizChecked || {})
      .map(([key, item]) => quizCheckedMatchesAnswer(item, state.quizAnswers?.[key]) ? item : null)
      .filter(item => item && item.hasKnownAnswer);
    if (!checked.length) return null;
    return Math.round((checked.filter(item => item.correct).length / checked.length) * 100);
  });

  return (
    <div className="quiz-stack">
      {score === null ? null : (
        <motion.span
          className="focus-pill quiz-score-pill"
          key={score}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0.72, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          Current score {score}%
        </motion.span>
      )}
      {questions.map((question, index) => (
        <QuizQuestionCard
          answer={quizAnswers[index]}
          checked={quizChecked[index] || null}
          index={index}
          key={`${questionText(question, index)}-${index}`}
          onAnswer={answerQuizQuestion}
          onCheck={checkQuizQuestion}
          question={question}
        />
      ))}
    </div>
  );
}
