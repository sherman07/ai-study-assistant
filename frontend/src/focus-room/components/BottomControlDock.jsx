import { Check, Pause, Play, RotateCcw, SkipForward, SlidersHorizontal, Volume2 } from "lucide-react";
import { activeFocusTopic } from "../focusTopics.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { formatDuration } from "../timerInput.js";
import { formatTimerClock } from "../utils.js";
import { EditableTimer } from "./EditableTimer.jsx";
import { GlassButton } from "./GlassButton.jsx";

function blockProgress(elapsedSeconds, totalSeconds) {
  if (!totalSeconds) return 0;
  return Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));
}

export function BottomControlDock({ onFocusMode, audioState }) {
  const timerStatus = useFocusRoomStore(state => state.timerStatus);
  const elapsedSeconds = useFocusRoomStore(state => state.elapsedSeconds);
  const pomodoroDuration = useFocusRoomStore(state => state.pomodoroDuration);
  const pomodoroDurationSeconds = useFocusRoomStore(state => state.pomodoroDurationSeconds);
  const timerMode = useFocusRoomStore(state => state.timerMode);
  const studyGoal = useFocusRoomStore(state => state.studyGoal);
  const focusTopics = useFocusRoomStore(state => state.focusTopics);
  const activeTopicId = useFocusRoomStore(state => state.activeTopicId);
  const currentSession = useFocusRoomStore(state => state.currentSession);
  const startTimer = useFocusRoomStore(state => state.startTimer);
  const pauseTimer = useFocusRoomStore(state => state.pauseTimer);
  const resetTimer = useFocusRoomStore(state => state.resetTimer);
  const skipTimer = useFocusRoomStore(state => state.skipTimer);
  const toggleAudio = useFocusRoomStore(state => state.toggleAudio);
  const audioPlaying = useFocusRoomStore(state => state.audioPlaying);
  const setPomodoroDurationSeconds = useFocusRoomStore(state => state.setPomodoroDurationSeconds);
  const finishFocusTopic = useFocusRoomStore(state => state.finishFocusTopic);
  const activeTopic = activeFocusTopic(focusTopics, activeTopicId);
  const totalSeconds = Number(pomodoroDurationSeconds) || (Number(pomodoroDuration) || 0) * 60;
  const remaining = timerMode === "countup" ? elapsedSeconds : Math.max(0, totalSeconds - elapsedSeconds);
  const isPaused = timerStatus === "paused";
  const isRunning = timerStatus === "studying";
  const isComplete = timerStatus === "completed";
  const canEditTime = timerStatus === "idle" && timerMode !== "countup";
  const timerLabel = isComplete && timerMode !== "countup" ? "00:00" : formatTimerClock(remaining);
  const statusLabel = isPaused ? "Paused" : isComplete ? "Complete" : isRunning ? "In focus" : "Ready";
  const timerActionLabel = isPaused ? "Resume timer" : isRunning ? "Pause timer" : "Start timer";
  const topicTitle = activeTopic?.title || studyGoal || "A quiet block for meaningful progress";
  const topicDescription = activeTopic?.description || "";
  const canFinishTopic = Boolean(activeTopic && activeTopic.status !== "done");

  function handleDockPointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    event.currentTarget.style.setProperty("--dock-light-x", `${x}%`);
    event.currentTarget.style.setProperty("--dock-light-y", `${y}%`);
    event.currentTarget.style.setProperty("--glass-x", `${x}%`);
    event.currentTarget.style.setProperty("--glass-y", `${y}%`);
  }

  function handleDockPointerLeave(event) {
    event.currentTarget.style.setProperty("--dock-light-x", "50%");
    event.currentTarget.style.setProperty("--dock-light-y", "0%");
    event.currentTarget.style.setProperty("--glass-x", "50%");
    event.currentTarget.style.setProperty("--glass-y", "0%");
  }

  return (
    <div
      className="focus-session-dock liquid-glass"
      aria-label="Focus session controls"
      onPointerMove={handleDockPointerMove}
      onPointerLeave={handleDockPointerLeave}
    >
      <div className="dock-timer-block">
        <div className="dock-eyebrow">POMODORO #{currentSession?.pomodoroNumber || 1}</div>
        <div className="dock-status"><span className={`dock-status-dot ${isPaused || !isRunning ? "is-paused" : ""}`} />{statusLabel}</div>
        {canEditTime ? (
          <EditableTimer
            className="dock-time-editor"
            valueSeconds={totalSeconds}
            onChange={setPomodoroDurationSeconds}
            size="dock"
            ariaLabel="Set focus block length"
          />
        ) : (
          <strong className="dock-time" aria-live="off">{timerLabel}</strong>
        )}
        <div className="dock-progress" aria-hidden="true"><span style={{ width: `${blockProgress(elapsedSeconds, totalSeconds)}%` }} /></div>
      </div>
      <div className="dock-goal-block" data-focus-active-topic="true">
        <span className="dock-eyebrow">ACTIVE TOPIC</span>
        <strong>{topicTitle}</strong>
        {topicDescription ? <span className="dock-goal-description">{topicDescription}</span> : null}
        <span className="dock-goal-meta">{timerMode === "countup" ? "Count-up" : `${formatDuration(totalSeconds)} block`} · {formatTimerClock(elapsedSeconds)} focused</span>
        {canFinishTopic ? (
          <button
            type="button"
            className="dock-topic-finish"
            onClick={() => finishFocusTopic(activeTopic.id)}
            data-focus-topic-finish-dock="true"
            aria-label="Mark active topic done and switch to the next"
          >
            <Check size={13} aria-hidden="true" />
            Done · next topic
          </button>
        ) : null}
      </div>
      <div className="dock-action-block">
        <GlassButton className="dock-action-button" onClick={toggleAudio} aria-label={audioPlaying ? "Pause room audio" : "Play room audio"}>{audioPlaying ? <Pause size={15} aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />}<span>{audioState?.playing ? "Pause audio" : "Audio"}</span></GlassButton>
        <GlassButton className="dock-action-button" onClick={() => isRunning ? pauseTimer() : startTimer()} variant="primary" aria-label={timerActionLabel}>{isRunning ? <Pause size={15} aria-hidden="true" /> : <Play size={15} fill="currentColor" aria-hidden="true" />}<span>{isPaused ? "Resume" : isRunning ? "Pause" : "Start"}</span></GlassButton>
        <GlassButton className="dock-action-button" onClick={skipTimer} aria-label="Skip timer"><SkipForward size={15} aria-hidden="true" /><span>Skip</span></GlassButton>
        <GlassButton className="dock-action-button" onClick={resetTimer} aria-label="Reset timer"><RotateCcw size={15} aria-hidden="true" /><span>Reset</span></GlassButton>
        <GlassButton className="dock-focus-mode" onClick={onFocusMode} aria-label="Enter distraction-free Focus Mode"><SlidersHorizontal size={15} aria-hidden="true" /><span>Focus Mode</span></GlassButton>
      </div>
    </div>
  );
}
