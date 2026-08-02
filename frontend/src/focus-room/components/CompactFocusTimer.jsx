import { useCallback, useEffect, useRef, useState } from "react";
import { Minimize2, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import {
  COMPACT_TIMER_REVEAL_MS,
  compactTimerPrimaryAction,
  shouldHideCompactTimerControls
} from "../compactTimerInteraction.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { formatDuration } from "../timerInput.js";
import { formatTimerClock } from "../utils.js";
import { GlassButton } from "./GlassButton.jsx";

function blockProgress(elapsedSeconds, totalSeconds) {
  if (!totalSeconds) return 0;
  return Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));
}

export function CompactFocusTimer({ onExit }) {
  const elapsedSeconds = useFocusRoomStore(state => state.elapsedSeconds);
  const pomodoroDuration = useFocusRoomStore(state => state.pomodoroDuration);
  const pomodoroDurationSeconds = useFocusRoomStore(state => state.pomodoroDurationSeconds);
  const timerMode = useFocusRoomStore(state => state.timerMode);
  const timerStatus = useFocusRoomStore(state => state.timerStatus);
  const currentSession = useFocusRoomStore(state => state.currentSession);
  const startTimer = useFocusRoomStore(state => state.startTimer);
  const pauseTimer = useFocusRoomStore(state => state.pauseTimer);
  const resetTimer = useFocusRoomStore(state => state.resetTimer);
  const skipTimer = useFocusRoomStore(state => state.skipTimer);
  const [controlsVisible, setControlsVisible] = useState(false);
  const revealTimerRef = useRef(null);
  const pointerWithinRef = useRef(false);
  const focusWithinRef = useRef(false);
  const inputModalityRef = useRef("pointer");
  const totalSeconds = Number(pomodoroDurationSeconds) || (Number(pomodoroDuration) || 0) * 60;
  const remaining = timerMode === "countup" ? elapsedSeconds : Math.max(0, totalSeconds - elapsedSeconds);
  const primaryAction = compactTimerPrimaryAction(timerStatus);
  const statusLabel = timerStatus === "paused"
    ? "Paused"
    : timerStatus === "completed"
      ? "Complete"
      : timerStatus === "studying"
        ? "In focus"
        : "Ready";

  const clearRevealTimer = useCallback(() => {
    if (!revealTimerRef.current) return;
    globalThis.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
  }, []);

  const scheduleHide = useCallback(() => {
    clearRevealTimer();
    revealTimerRef.current = globalThis.setTimeout(() => {
      if (shouldHideCompactTimerControls({
        pointerWithin: pointerWithinRef.current,
        focusWithin: focusWithinRef.current
      })) {
        setControlsVisible(false);
      }
    }, COMPACT_TIMER_REVEAL_MS);
  }, [clearRevealTimer]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    const revealOnPointer = () => {
      inputModalityRef.current = "pointer";
      focusWithinRef.current = false;
      revealControls();
    };
    const revealOnKey = () => {
      inputModalityRef.current = "keyboard";
      revealControls();
    };
    globalThis.addEventListener?.("pointermove", revealOnPointer, { passive: true });
    globalThis.addEventListener?.("pointerdown", revealOnPointer, { passive: true });
    globalThis.addEventListener?.("keydown", revealOnKey);
    return () => {
      clearRevealTimer();
      globalThis.removeEventListener?.("pointermove", revealOnPointer);
      globalThis.removeEventListener?.("pointerdown", revealOnPointer);
      globalThis.removeEventListener?.("keydown", revealOnKey);
    };
  }, [clearRevealTimer, revealControls]);

  const runPrimaryAction = () => {
    if (primaryAction.action === "pause") pauseTimer();
    else startTimer();
  };

  return (
    <div
      className={`compact-focus-mode-card ${controlsVisible ? "has-timer-controls" : ""}`.trim()}
      aria-label="Distraction-free focus timer"
      data-timer-controls-visible={controlsVisible ? "true" : "false"}
      onPointerEnter={() => {
        pointerWithinRef.current = true;
        revealControls();
      }}
      onPointerLeave={() => {
        pointerWithinRef.current = false;
        scheduleHide();
      }}
      onFocusCapture={() => {
        focusWithinRef.current = inputModalityRef.current === "keyboard";
        revealControls();
      }}
      onBlurCapture={event => {
        focusWithinRef.current = Boolean(event.currentTarget.contains(event.relatedTarget));
        scheduleHide();
      }}
    >
      <div className="compact-focus-card-top"><span>POMODORO #{currentSession?.pomodoroNumber || 1}</span><GlassButton className="compact-exit-button" onClick={onExit} aria-label="Exit Focus Mode"><Minimize2 size={14} aria-hidden="true" /></GlassButton></div>
      <span className="compact-focus-status"><i />{statusLabel}</span>
      <strong aria-live="off">{formatTimerClock(remaining)}</strong>
      <div className="compact-focus-progress" aria-hidden="true"><span style={{ width: `${blockProgress(elapsedSeconds, totalSeconds)}%` }} /></div>
      <small>{formatDuration(totalSeconds)} session</small>
      <div className="compact-timer-controls" aria-hidden={!controlsVisible} inert={controlsVisible ? undefined : ""}>
        <GlassButton className="compact-timer-control compact-timer-control-primary" variant="primary" onClick={runPrimaryAction} aria-label={primaryAction.label} title={primaryAction.label}>
          {primaryAction.action === "pause" ? <Pause size={15} aria-hidden="true" /> : <Play size={15} fill="currentColor" aria-hidden="true" />}
        </GlassButton>
        <GlassButton className="compact-timer-control" onClick={resetTimer} aria-label="Reset timer" title="Reset timer"><RotateCcw size={15} aria-hidden="true" /></GlassButton>
        <GlassButton className="compact-timer-control" onClick={skipTimer} aria-label="Skip timer" title="Skip timer"><SkipForward size={15} aria-hidden="true" /></GlassButton>
      </div>
      <span className="sr-only">Move the pointer, tap, or use the keyboard to reveal timer controls. Press Escape to exit Focus Mode.</span>
    </div>
  );
}
