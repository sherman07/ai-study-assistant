import { ArrowLeft, ArrowRight, Coffee, History, Music2, Piano, Radio, Target, Waves } from "lucide-react";
import {
  FOCUS_ROOM_AUDIO_PRESETS,
  FOCUS_ROOM_DURATIONS,
  focusRoomAudioPresetForConfig
} from "../data.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { SceneSelector } from "./SceneSelector.jsx";
import { useState } from "react";

const PRESET_ICONS = {
  "soft-piano": Piano,
  "lofi-cafe": Music2,
  "nature-flow": Waves,
  "warm-ambience": Coffee,
  "deep-focus": Radio
};

export function FocusRoomSetup() {
  const pomodoroDuration = useFocusRoomStore(state => state.pomodoroDuration);
  const timerMode = useFocusRoomStore(state => state.timerMode);
  const studyGoal = useFocusRoomStore(state => state.studyGoal);
  const musicType = useFocusRoomStore(state => state.musicType);
  const ambientSound = useFocusRoomStore(state => state.ambientSound);
  const setPomodoroDuration = useFocusRoomStore(state => state.setPomodoroDuration);
  const setTimerMode = useFocusRoomStore(state => state.setTimerMode);
  const setStudyGoal = useFocusRoomStore(state => state.setStudyGoal);
  const applyAudioPreset = useFocusRoomStore(state => state.applyAudioPreset);
  const openLanding = useFocusRoomStore(state => state.openLanding);
  const startSession = useFocusRoomStore(state => state.startSession);
  const [goalEditorOpen, setGoalEditorOpen] = useState(false);
  const activePreset = focusRoomAudioPresetForConfig({ musicType, ambientSound });

  const selectPreset = preset => {
    applyAudioPreset(preset.id);
  };

  const selectDuration = minutes => {
    setTimerMode("countdown");
    setPomodoroDuration(minutes);
  };

  return (
    <section className="focus-setup-stage innook-scene-setup" aria-label="Focus Room setup">
      <header className="innook-setup-header">
        <div className="innook-setup-brand" aria-label="Synapse Focus Room"><span className="innook-brand-mark">S</span><span><strong>synapse</strong><small>Focus Room</small></span></div>
        <div className="innook-setup-header-actions">
          <button type="button" className="innook-header-action" aria-label="Focus Room history" title="Focus Room history"><History size={18} aria-hidden="true" /></button>
          <button type="button" className="innook-header-action" onClick={openLanding} aria-label="Back to Focus Room welcome" title="Back to Focus Room welcome"><ArrowLeft size={20} aria-hidden="true" /></button>
        </div>
      </header>

      <div className="innook-setup-layout">
        <section className="innook-scene-panel" aria-labelledby="innook-scene-title">
          <div className="innook-panel-heading">
            <span>Step 01</span>
            <h1 id="innook-scene-title">选择学习场景</h1>
          </div>
          <SceneSelector variant="gallery" />
        </section>

        <aside className="innook-control-rail" aria-label="Study settings">
          <div className="innook-rail-group" aria-label="Music atmosphere">
            {FOCUS_ROOM_AUDIO_PRESETS.map(preset => {
              const Icon = PRESET_ICONS[preset.id] || Radio;
              const active = activePreset?.id === preset.id;
              return <button key={preset.id} type="button" className={`innook-rail-icon innook-audio-preset ${active ? "is-active" : ""}`.trim()} onClick={() => selectPreset(preset)} aria-label={`Use ${preset.label}: ${preset.description}`} aria-pressed={active} title={`${preset.label} — ${preset.description}`}><Icon size={16} aria-hidden="true" /></button>;
            })}
            <span className="innook-audio-preset-status" aria-live="polite">{activePreset?.label || "Custom mix"}</span>
          </div>
          <div className="innook-rail-divider" />
          <div className="innook-duration-list" aria-label="Focus duration">
            {FOCUS_ROOM_DURATIONS.map(minutes => <button key={minutes} type="button" className={`innook-duration ${timerMode !== "countup" && minutes === pomodoroDuration ? "is-active" : ""}`.trim()} onClick={() => selectDuration(minutes)} aria-pressed={timerMode !== "countup" && minutes === pomodoroDuration}>{minutes}</button>)}
            <button type="button" className={`innook-duration innook-duration-infinity ${timerMode === "countup" ? "is-active" : ""}`.trim()} onClick={() => setTimerMode("countup")} aria-label="Count up timer" aria-pressed={timerMode === "countup"}>∞</button>
          </div>
          <div className="innook-rail-divider" />
          <button type="button" className={`innook-rail-icon ${goalEditorOpen ? "is-active" : ""}`.trim()} onClick={() => setGoalEditorOpen(open => !open)} aria-label="Edit focus intention" title="Edit focus intention"><Target size={16} aria-hidden="true" /></button>
          <button type="button" className="innook-enter-button" onClick={startSession} aria-label="Enter Focus Room" title="Enter Focus Room"><ArrowRight size={22} aria-hidden="true" /></button>
          {goalEditorOpen ? <label className="innook-goal-popover">今日目标<textarea value={studyGoal} onChange={event => setStudyGoal(event.target.value)} autoFocus /></label> : null}
        </aside>
      </div>
    </section>
  );
}
