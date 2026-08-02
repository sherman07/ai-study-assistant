export const COMPACT_TIMER_REVEAL_MS = 2800;

export function compactTimerPrimaryAction(timerStatus = "idle") {
  if (timerStatus === "studying") {
    return { action: "pause", label: "Pause timer" };
  }
  if (timerStatus === "paused") {
    return { action: "start", label: "Resume timer" };
  }
  return { action: "start", label: "Start timer" };
}

export function shouldHideCompactTimerControls({ pointerWithin = false, focusWithin = false } = {}) {
  return !pointerWithin && !focusWithin;
}
