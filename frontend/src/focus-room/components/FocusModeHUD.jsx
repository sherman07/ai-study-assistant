import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FOCUS_MODE_REVEAL_MS,
  focusModeAddedDuration,
  focusModeTaskProgress,
  focusModeTopic,
  focusShortcutAction,
  shouldHideFocusControls
} from "../focusMode.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { formatTimerClock } from "../utils.js";
import { FocusModeControls } from "./FocusModeControls.jsx";
import { FocusModePopover } from "./FocusModePopover.jsx";
import { SceneSelector } from "./SceneSelector.jsx";
import { SoundControlPanel } from "./SoundControlPanel.jsx";

const SHORTCUTS = [
  ["Space", "Start or pause timer"],
  ["M", "Mute or resume audio"],
  ["N", "Quick Note"],
  ["T", "Session tasks"],
  ["S", "Change scene"],
  ["?", "Keyboard shortcuts"],
  ["Esc", "Close panel or exit Focus Mode"]
];

export function FocusModeHUD({ audioState, onExit }) {
  const selectedMaterial = useFocusRoomStore(state => state.selectedMaterial);
  const studyGoal = useFocusRoomStore(state => state.studyGoal);
  const studyPlan = useFocusRoomStore(state => state.studyPlan);
  const completedTasks = useFocusRoomStore(state => state.completedTasks);
  const workspaceNotes = useFocusRoomStore(state => state.workspaceNotes);
  const workspaceUpdatedAt = useFocusRoomStore(state => state.workspaceUpdatedAt);
  const elapsedSeconds = useFocusRoomStore(state => state.elapsedSeconds);
  const pomodoroDuration = useFocusRoomStore(state => state.pomodoroDuration);
  const timerDurationSeconds = useFocusRoomStore(state => state.timerDurationSeconds);
  const timerMode = useFocusRoomStore(state => state.timerMode);
  const timerState = useFocusRoomStore(state => state.timerState);
  const currentSession = useFocusRoomStore(state => state.currentSession);
  const audioPlaying = useFocusRoomStore(state => state.audioPlaying);
  const startTimer = useFocusRoomStore(state => state.startTimer);
  const pauseTimer = useFocusRoomStore(state => state.pauseTimer);
  const skipTimer = useFocusRoomStore(state => state.skipTimer);
  const setSessionDuration = useFocusRoomStore(state => state.setSessionDuration);
  const toggleAudio = useFocusRoomStore(state => state.toggleAudio);
  const setWorkspaceNotes = useFocusRoomStore(state => state.setWorkspaceNotes);
  const toggleTask = useFocusRoomStore(state => state.toggleTask);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [controlsPinned, setControlsPinned] = useState(false);
  const [activePopover, setActivePopover] = useState("");
  const hudRef = useRef(null);
  const revealTimerRef = useRef(null);

  const isRunning = timerState === "running";
  const totalDuration = timerMode === "countup"
    ? 0
    : Number(timerDurationSeconds) || (Number(pomodoroDuration) || 0) * 60;
  const remaining = timerMode === "countup" ? elapsedSeconds : Math.max(0, totalDuration - elapsedSeconds);
  const progress = totalDuration ? Math.min(100, Math.max(0, (elapsedSeconds / totalDuration) * 100)) : 0;
  const taskProgress = useMemo(
    () => focusModeTaskProgress(studyPlan, completedTasks),
    [completedTasks, studyPlan]
  );

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current) {
      globalThis.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearRevealTimer();
    revealTimerRef.current = globalThis.setTimeout(() => {
      const focusWithin = Boolean(hudRef.current?.contains(globalThis.document?.activeElement));
      if (shouldHideFocusControls({ pinned: controlsPinned, popoverOpen: Boolean(activePopover), focusWithin })) {
        setControlsVisible(false);
      }
    }, FOCUS_MODE_REVEAL_MS);
  }, [activePopover, clearRevealTimer, controlsPinned]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  const toggleTimer = useCallback(() => {
    if (isRunning) pauseTimer();
    else startTimer();
  }, [isRunning, pauseTimer, startTimer]);

  const addFiveMinutes = useCallback(() => {
    if (timerMode === "countup") return;
    const next = focusModeAddedDuration(totalDuration);
    setSessionDuration(next.minutes, next.seconds);
  }, [setSessionDuration, timerMode, totalDuration]);

  const openPopover = useCallback(id => {
    setActivePopover(id);
    setControlsVisible(true);
    clearRevealTimer();
  }, [clearRevealTimer]);

  const closePopover = useCallback(() => {
    setActivePopover("");
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    const onActivity = () => revealControls();
    globalThis.addEventListener?.("pointermove", onActivity, { passive: true });
    globalThis.addEventListener?.("pointerdown", onActivity, { passive: true });
    globalThis.addEventListener?.("focusin", onActivity);
    scheduleHide();
    return () => {
      clearRevealTimer();
      globalThis.removeEventListener?.("pointermove", onActivity);
      globalThis.removeEventListener?.("pointerdown", onActivity);
      globalThis.removeEventListener?.("focusin", onActivity);
    };
  }, [clearRevealTimer, revealControls, scheduleHide]);

  useEffect(() => {
    const onKeyDown = event => {
      const action = focusShortcutAction(event);
      if (!action) return;
      event.preventDefault();
      revealControls();
      if (action === "toggle-timer") toggleTimer();
      if (action === "toggle-audio") toggleAudio();
      if (["note", "tasks", "scene", "shortcuts"].includes(action)) openPopover(action);
      if (action === "escape") {
        if (activePopover) closePopover();
        else onExit?.();
      }
    };
    globalThis.addEventListener?.("keydown", onKeyDown);
    return () => globalThis.removeEventListener?.("keydown", onKeyDown);
  }, [activePopover, closePopover, onExit, openPopover, revealControls, toggleAudio, toggleTimer]);

  useEffect(() => {
    if (controlsPinned || activePopover) {
      clearRevealTimer();
      setControlsVisible(true);
    } else {
      scheduleHide();
    }
  }, [activePopover, clearRevealTimer, controlsPinned, scheduleHide]);

  const popover = (() => {
    if (activePopover === "note") {
      return (
        <FocusModePopover id="note" title="Quick Note" onClose={closePopover}>
          <textarea
            className="focus-mode-note"
            value={workspaceNotes}
            onChange={event => setWorkspaceNotes(event.target.value)}
            placeholder="Capture a question, connection, or next step…"
            autoFocus
          />
          <small>{workspaceUpdatedAt ? "Autosaved just now" : "Autosave on"}</small>
        </FocusModePopover>
      );
    }
    if (activePopover === "tasks") {
      return (
        <FocusModePopover id="tasks" title="Session tasks" onClose={closePopover}>
          {studyPlan.length ? (
            <div className="focus-mode-task-list">
              {studyPlan.map((item, index) => {
                const checked = completedTasks.includes(item.task);
                return (
                  <label key={`${item.task}-${index}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleTask(index)} />
                    <span><strong>{item.task}</strong><small>{item.minutes} min</small></span>
                  </label>
                );
              })}
            </div>
          ) : <p className="focus-mode-empty">Add a study topic from the workspace to receive a session task plan.</p>}
        </FocusModePopover>
      );
    }
    if (activePopover === "scene") {
      return <FocusModePopover id="scene" title="Change scene" onClose={closePopover}><SceneSelector /></FocusModePopover>;
    }
    if (activePopover === "audio") {
      return <FocusModePopover id="audio" title="Sound settings" onClose={closePopover}><SoundControlPanel audioState={audioState} /></FocusModePopover>;
    }
    if (activePopover === "shortcuts") {
      return (
        <FocusModePopover id="shortcuts" title="Keyboard shortcuts" onClose={closePopover}>
          <dl className="focus-mode-shortcuts">
            {SHORTCUTS.map(([key, label]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{label}</dd></div>)}
          </dl>
        </FocusModePopover>
      );
    }
    return null;
  })();

  return (
    <aside
      ref={hudRef}
      className={`focus-mode-hud liquid-glass ${controlsVisible ? "has-controls" : "is-quiet"} ${controlsPinned ? "is-pinned" : ""}`.trim()}
      aria-label="Enhanced Focus Mode"
      onPointerEnter={revealControls}
      onFocusCapture={revealControls}
    >
      <div className="focus-mode-primary">
        <div className="focus-mode-session-line">
          <span>POMODORO #{currentSession?.pomodoroNumber || 1}</span>
          <span className={`focus-mode-state ${isRunning ? "is-running" : ""}`}><i />{isRunning ? "In focus" : timerState === "paused" ? "Paused" : "Ready"}</span>
        </div>
        <p className="focus-mode-topic">{focusModeTopic(selectedMaterial)}</p>
        <strong className="focus-mode-clock">{formatTimerClock(remaining)}</strong>
        <div className="focus-mode-progress" aria-label={`${Math.round(progress)}% complete`}><span style={{ width: `${progress}%` }} /></div>
        <p className="focus-mode-goal">{studyGoal || "A quiet block for meaningful progress"}</p>
        <small>{taskProgress.total ? `${taskProgress.completed}/${taskProgress.total} tasks` : timerMode === "countup" ? "Count-up session" : `${pomodoroDuration} min session`}</small>
      </div>
      <div className="focus-mode-reveal" aria-hidden={!controlsVisible}>
        <FocusModeControls
          audioPlaying={audioPlaying}
          canAddTime={timerMode !== "countup"}
          isRunning={isRunning}
          pinned={controlsPinned}
          onAddFiveMinutes={addFiveMinutes}
          onExit={onExit}
          onOpen={openPopover}
          onSkip={skipTimer}
          onToggleAudio={toggleAudio}
          onTogglePinned={() => setControlsPinned(value => !value)}
          onToggleTimer={toggleTimer}
        />
      </div>
      {popover}
      <span className="sr-only">Move the pointer, tap, or press a shortcut to reveal controls.</span>
    </aside>
  );
}
