import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Coffee,
  History,
  Music2,
  Piano,
  Radio,
  Target,
  Waves
} from "lucide-react";
import { FOCUS_ROOM_DURATIONS } from "../data.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { SceneSelector } from "./SceneSelector.jsx";

const MUSIC_MOODS = [
  { label: "Lo-fi Chill", icon: Music2, musicType: "Lo-fi", ambientSound: "Cafe Rain" },
  { label: "Ambient Piano", icon: Piano, musicType: "Piano", ambientSound: "Nature" },
  { label: "Nature Ambient", icon: Waves, musicType: "Deep Focus", ambientSound: "Nature" },
  { label: "Acoustic Warm", icon: Coffee, musicType: "Minimal", ambientSound: "White Noise" },
  { label: "Deep Focus", icon: Radio, musicType: "Deep Focus", ambientSound: "White Noise" }
];

export function FocusRoomSetup({ onWorkspace }) {
  const selectedScene = useFocusRoomStore(state => state.selectedScene);
  const pomodoroDuration = useFocusRoomStore(state => state.pomodoroDuration);
  const timerMode = useFocusRoomStore(state => state.timerMode);
  const musicType = useFocusRoomStore(state => state.musicType);
  const studyGoal = useFocusRoomStore(state => state.studyGoal);
  const setPomodoroDuration = useFocusRoomStore(state => state.setPomodoroDuration);
  const setTimerMode = useFocusRoomStore(state => state.setTimerMode);
  const setStudyGoal = useFocusRoomStore(state => state.setStudyGoal);
  const setSound = useFocusRoomStore(state => state.setSound);
  const startSession = useFocusRoomStore(state => state.startSession);
  const [goalEditorOpen, setGoalEditorOpen] = useState(false);

  const activeMood = useMemo(
    () => MUSIC_MOODS.find(mood => mood.musicType === musicType)?.label || "",
    [musicType]
  );

  const selectMood = mood => {
    setSound("musicType", mood.musicType);
    setSound("ambientSound", mood.ambientSound);
  };

  const selectDuration = minutes => {
    setTimerMode("countdown");
    setPomodoroDuration(minutes);
  };

  const enterRoom = () => {
    if (!selectedScene) return;
    startSession();
  };

  const openHistory = () => {
    onWorkspace?.("", "history");
  };

  return (
    <section className="focus-setup-stage innook-scene-setup" aria-label="Focus Room setup" data-focus-setup="true">
      <header className="innook-setup-header">
        <button type="button" className="innook-setup-brand" onClick={onWorkspace} aria-label="Return to Synapse workspace">
          <span className="innook-brand-mark">S</span>
          <span>
            <strong>synapse</strong>
            <small>Focus Room</small>
          </span>
        </button>
        <div className="innook-setup-header-actions">
          <button
            type="button"
            className="innook-header-action"
            onClick={openHistory}
            aria-label="Open Focus Trail"
            title="Open Focus Trail"
          >
            <History size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="innook-header-action"
            onClick={onWorkspace}
            aria-label="Return to Synapse workspace"
            title="Return to workspace"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="innook-setup-layout">
        <section className="innook-scene-panel" aria-labelledby="innook-scene-title">
          <div className="innook-panel-heading">
            <span>STEP 01</span>
            <h1 id="innook-scene-title">选择学习场景</h1>
          </div>
          <SceneSelector variant="gallery" />
        </section>

        <aside className="innook-control-rail" aria-label="Study settings">
          <div className="innook-rail-group" aria-label="Music atmosphere">
            {MUSIC_MOODS.map(mood => {
              const Icon = mood.icon;
              const isActive = activeMood === mood.label;
              return (
                <button
                  key={mood.label}
                  type="button"
                  className={`innook-rail-icon ${isActive ? "is-active" : ""}`.trim()}
                  onClick={() => selectMood(mood)}
                  aria-label={`Music style: ${mood.label}`}
                  aria-pressed={isActive}
                  title={mood.label}
                >
                  <Icon size={16} aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <div className="innook-rail-divider" />

          <div className="innook-duration-list" aria-label="Focus duration">
            {FOCUS_ROOM_DURATIONS.map(minutes => {
              const isActive = timerMode !== "countup" && minutes === pomodoroDuration;
              return (
                <button
                  key={minutes}
                  type="button"
                  className={`innook-duration ${isActive ? "is-active" : ""}`.trim()}
                  onClick={() => selectDuration(minutes)}
                  aria-pressed={isActive}
                >
                  {minutes}
                </button>
              );
            })}
            <button
              type="button"
              className={`innook-duration innook-duration-infinity ${timerMode === "countup" ? "is-active" : ""}`.trim()}
              onClick={() => setTimerMode("countup")}
              aria-label="Count-up timer"
              aria-pressed={timerMode === "countup"}
              title="Count-up"
            >
              ∞
            </button>
          </div>

          <div className="innook-rail-divider" />

          <button
            type="button"
            className={`innook-rail-icon ${goalEditorOpen ? "is-active" : ""}`.trim()}
            onClick={() => setGoalEditorOpen(open => !open)}
            aria-label="Edit focus intention"
            title="Edit focus intention"
          >
            <Target size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="innook-enter-button"
            onClick={enterRoom}
            disabled={!selectedScene}
            data-focus-enter="true"
            aria-label="Enter Focus Room"
            title="Enter Focus Room"
          >
            <ArrowRight size={22} aria-hidden="true" />
          </button>

          {goalEditorOpen ? (
            <label className="innook-goal-popover">
              今日目标
              <textarea
                value={studyGoal}
                onChange={event => setStudyGoal(event.target.value)}
                placeholder="What will you protect this block for?"
                rows={3}
                autoFocus
              />
            </label>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
