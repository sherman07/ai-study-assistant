const TURN_EASING = "cubic-bezier(.22, 1, .36, 1)";

export function prefersReducedStudyMotion(matchMediaRef = globalThis.matchMedia) {
  if (typeof matchMediaRef !== "function") return false;
  try {
    return Boolean(matchMediaRef("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

export function legacyQuizOptionState({ selected = false, correct = false, revealed = false } = {}) {
  if (!revealed) return selected ? "selected" : "idle";
  if (correct) return "correct";
  if (selected) return "incorrect";
  return "muted";
}

async function waitForAnimation(animation) {
  try {
    await animation?.finished;
  } catch {
    // A rerender can cancel WAAPI animations. The state swap still needs to complete.
  }
}

export async function animateLegacyFlashcardTurn({
  stage,
  swap,
  replacement,
  reducedMotion = prefersReducedStudyMotion()
} = {}) {
  if (typeof swap !== "function") return;

  const canAnimate = !reducedMotion && typeof stage?.animate === "function";
  if (canAnimate) {
    await waitForAnimation(stage.animate([
      { opacity: 1, transform: "rotateY(0deg) scale(1)" },
      { opacity: 0.72, transform: "rotateY(88deg) scale(0.985)" }
    ], {
      duration: 150,
      easing: TURN_EASING,
      fill: "forwards"
    }));
  }

  swap();
  const nextStage = typeof replacement === "function" ? replacement() : null;
  if (nextStage?.dataset) nextStage.dataset.studyTurning = "true";

  if (canAnimate && typeof nextStage?.animate === "function") {
    await waitForAnimation(nextStage.animate([
      { opacity: 0.72, transform: "rotateY(-88deg) scale(0.985)" },
      { opacity: 1, transform: "rotateY(0deg) scale(1)" }
    ], {
      duration: 190,
      easing: TURN_EASING,
      fill: "both"
    }));
  }

  if (nextStage?.dataset) delete nextStage.dataset.studyTurning;
  nextStage?.focus?.({ preventScroll: true });
}
