import {
  CheckSquare2,
  CircleHelp,
  Image,
  Lock,
  LockOpen,
  Minimize2,
  Music2,
  NotebookPen,
  Pause,
  Play,
  SkipForward,
  Volume2,
  VolumeX
} from "lucide-react";

function FocusControl({ label, onClick, children, pressed, disabled = false, primary = false }) {
  return (
    <button
      type="button"
      className={`focus-mode-control ${primary ? "is-primary" : ""}`.trim()}
      aria-label={label}
      aria-pressed={typeof pressed === "boolean" ? pressed : undefined}
      data-tooltip={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function FocusModeControls({
  audioPlaying,
  isRunning,
  pinned,
  onExit,
  onOpen,
  onSkip,
  onToggleAudio,
  onTogglePinned,
  onToggleTimer
}) {
  return (
    <div className="focus-mode-controls" aria-label="Focus Mode controls">
      <FocusControl label={isRunning ? "Pause timer" : "Start timer"} onClick={onToggleTimer} primary>
        {isRunning ? <Pause size={17} aria-hidden="true" /> : <Play size={17} fill="currentColor" aria-hidden="true" />}
      </FocusControl>
      <FocusControl label="Skip to next phase" onClick={onSkip}><SkipForward size={17} aria-hidden="true" /></FocusControl>
      <FocusControl label={audioPlaying ? "Mute room audio" : "Resume room audio"} onClick={onToggleAudio} pressed={audioPlaying}>
        {audioPlaying ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
      </FocusControl>
      <FocusControl label="Quick Note" onClick={() => onOpen("note")}><NotebookPen size={17} aria-hidden="true" /></FocusControl>
      <FocusControl label="Session tasks" onClick={() => onOpen("tasks")}><CheckSquare2 size={17} aria-hidden="true" /></FocusControl>
      <FocusControl label="Change scene" onClick={() => onOpen("scene")}><Image size={17} aria-hidden="true" /></FocusControl>
      <FocusControl label="Sound settings" onClick={() => onOpen("audio")}><Music2 size={17} aria-hidden="true" /></FocusControl>
      <FocusControl label="Keyboard shortcuts" onClick={() => onOpen("shortcuts")}><CircleHelp size={17} aria-hidden="true" /></FocusControl>
      <FocusControl label={pinned ? "Unpin controls" : "Pin controls"} onClick={onTogglePinned} pressed={pinned}>
        {pinned ? <Lock size={17} aria-hidden="true" /> : <LockOpen size={17} aria-hidden="true" />}
      </FocusControl>
      <FocusControl label="Exit Focus Mode" onClick={onExit}><Minimize2 size={17} aria-hidden="true" /></FocusControl>
    </div>
  );
}
