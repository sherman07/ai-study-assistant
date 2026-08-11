import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { useStudyFeedbackStore } from "../hooks/useStudyFeedbackStore.js";
import { flashcardAnswer, flashcardKey, flashcardPrompt } from "../utils.js";
import { GlassButton } from "./GlassButton.jsx";

export function FlashcardStudyMode({ cards }) {
  const flashcardIndex = useFocusRoomStore(state => state.flashcardIndex);
  const flashcardSide = useFocusRoomStore(state => state.flashcardSide);
  const flashcardProgress = useFocusRoomStore(state => state.flashcardProgress);
  const setFlashcardIndex = useFocusRoomStore(state => state.setFlashcardIndex);
  const flipFlashcard = useFocusRoomStore(state => state.flipFlashcard);
  const rateFlashcard = useFocusRoomStore(state => state.rateFlashcard);
  const pushToast = useStudyFeedbackStore(state => state.pushToast);
  const reducedMotion = useReducedMotion();
  const initialSideRef = useRef(flashcardSide);
  const [announcement, setAnnouncement] = useState("");
  const completed = useFocusRoomStore(state => Object.values(state.flashcardProgress || {})
    .filter(item => item && item.difficulty)
    .length);
  const total = cards.length;
  const index = Math.min(Math.max(flashcardIndex, 0), Math.max(0, total - 1));
  const card = cards[index] || {};
  const key = flashcardKey(card, index);
  const progress = flashcardProgress[key] || {};
  const side = flashcardSide === "back" ? "back" : "front";
  const contentMotion = reducedMotion
    ? { initial: { opacity: 0.72 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, rotateX: side === "back" ? -12 : 12, y: side === "back" ? 5 : -5, filter: "blur(4px)" },
        animate: { opacity: 1, rotateX: 0, y: 0, filter: "blur(0px)" }
      };

  useEffect(() => {
    if (initialSideRef.current === side) {
      initialSideRef.current = null;
      return;
    }
    setAnnouncement(side === "back" ? "Answer shown" : "Prompt shown");
  }, [side]);

  const rate = difficulty => {
    const completesDeck = !progress.difficulty && completed + 1 >= total;
    rateFlashcard(difficulty);
    if (completesDeck) {
      pushToast({
        tone: "success",
        title: "Deck complete",
        message: `${total} ${total === 1 ? "card" : "cards"} reviewed. Your recall ratings are saved for this session.`
      });
    }
  };

  return (
    <article className="study-card liquid-glass-lite flashcard-study-card">
      <span className="focus-kicker">Card {index + 1} of {total}</span>
      <motion.h3
        className="flashcard-turn-title"
        key={`title-${index}-${side}`}
        {...contentMotion}
        transition={{ duration: reducedMotion ? 0.08 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {side === "back" ? "Answer" : "Prompt"}
      </motion.h3>
      <motion.p
        className="flashcard-turn-copy"
        key={`copy-${index}-${side}`}
        {...contentMotion}
        transition={{ duration: reducedMotion ? 0.08 : 0.26, delay: reducedMotion ? 0 : 0.025, ease: [0.22, 1, 0.36, 1] }}
      >
        {side === "back" ? flashcardAnswer(card) : flashcardPrompt(card, index)}
      </motion.p>
      {progress.difficulty ? <span className="focus-pill">Marked {progress.difficulty}</span> : null}
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
      <div className="focus-button-row">
        <GlassButton disabled={index <= 0} onClick={() => setFlashcardIndex(index - 1)}>Previous</GlassButton>
        <GlassButton className="flashcard-primary-action" variant="primary" onClick={flipFlashcard}>
          {side === "back" ? "Show Prompt" : "Reveal Answer"}
        </GlassButton>
        <GlassButton disabled={index >= total - 1} onClick={() => setFlashcardIndex(index + 1)}>Next</GlassButton>
      </div>
      <div className="focus-button-row flashcard-grade-row" role="group" aria-label="Rate this flashcard">
        {["easy", "medium", "hard"].map(difficulty => (
          <GlassButton
            className={`flashcard-grade-button is-${difficulty}`}
            key={difficulty}
            variant={progress.difficulty === difficulty ? "primary" : "ghost"}
            onClick={() => rate(difficulty)}
          >
            Mark {difficulty}
          </GlassButton>
        ))}
      </div>
      <p className="flashcard-completion-copy">{completed} completed in this material.</p>
    </article>
  );
}
