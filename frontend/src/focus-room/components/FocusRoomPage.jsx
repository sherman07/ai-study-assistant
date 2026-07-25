import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AnimatePresence, motion } from "motion/react";
import { clearFocusRoomActiveSession, saveFocusRoomActiveSession } from "../data.js";
import { FocusBackground } from "./FocusBackground.jsx";
import { FocusRoomSetup } from "./FocusRoomSetup.jsx";
import { TopFocusNav } from "./TopFocusNav.jsx";
import { BottomControlDock } from "./BottomControlDock.jsx";
import { SessionSummaryModal } from "./SessionSummaryModal.jsx";
import { FocusRoomDrawers } from "./FocusRoomDrawers.jsx";
import { CompactFocusTimer } from "./CompactFocusTimer.jsx";
import { GlassButton } from "./GlassButton.jsx";
import { useAudioSettings } from "../hooks/useAudioSettings.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { useFocusSession } from "../hooks/useFocusSession.js";
import { useIdleMode } from "../hooks/useIdleMode.js";
import { usePomodoroTimer } from "../hooks/usePomodoroTimer.js";
import { useSceneBackground } from "../hooks/useSceneBackground.js";
import { spring } from "../utils.js";

function activeSessionSnapshot(state) {
  if (state.view !== "session" || state.summaryRecord) return null;
  return {
    materialId: "focus-room",
    view: state.view,
    panelTab: state.panelTab,
    selectedScene: state.selectedScene,
    musicType: state.musicType,
    ambientSound: state.ambientSound,
    musicVolume: state.musicVolume,
    ambientVolume: state.ambientVolume,
    audioChannels: state.audioChannels,
    pomodoroDuration: state.pomodoroDuration,
    timerState: state.timerState,
    timerMode: state.timerMode,
    timerAnchorAtMs: state.timerAnchorAtMs,
    timerDurationSeconds: state.timerDurationSeconds,
    timerStatus: state.timerStatus,
    studyGoal: state.studyGoal,
    focusTopics: state.focusTopics,
    activeTopicId: state.activeTopicId,
    studyPlan: state.studyPlan,
    currentSession: state.currentSession,
    elapsedSeconds: state.elapsedSeconds,
    startedAt: state.startedAt,
  };
}

export function FocusRoomPage() {
  const [utilityPanel, setUtilityPanel] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [exitDialog, setExitDialog] = useState(false);
  const view = useFocusRoomStore(state => state.view);
  const isIdle = useIdleMode(3000);
  const scene = useSceneBackground();
  const audioState = useAudioSettings();
  const session = useFocusSession();
  usePomodoroTimer();
  const persistenceSnapshot = useFocusRoomStore(useShallow(activeSessionSnapshot));
  const summaryRecord = useFocusRoomStore(state => state.summaryRecord);
  const endSession = useFocusRoomStore(state => state.endSession);
  const initializeFocusRoom = useFocusRoomStore(state => state.initializeFocusRoom);

  useEffect(() => {
    initializeFocusRoom();
  }, [initializeFocusRoom]);

  useEffect(() => {
    if (!persistenceSnapshot?.materialId) return;
    saveFocusRoomActiveSession(persistenceSnapshot.materialId, persistenceSnapshot);
  }, [persistenceSnapshot]);

  useEffect(() => {
    if (view === "session" || !summaryRecord) return;
    clearFocusRoomActiveSession("focus-room");
  }, [summaryRecord, view]);

  useEffect(() => {
    if (view !== "session") {
      setFocusMode(false);
      setUtilityPanel("");
      setExitDialog(false);
    }
  }, [view]);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key !== "Escape") return;
      if (focusMode) {
        event.preventDefault();
        setFocusMode(false);
      } else if (utilityPanel) {
        setUtilityPanel("");
      } else if (exitDialog) {
        setExitDialog(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitDialog, focusMode, utilityPanel]);

  const showWorkspace = (...args) => {
    session.returnToWorkspace(...args);
  };

  const finishSession = async () => {
    setExitDialog(false);
    setFocusMode(false);
    setUtilityPanel("");
    endSession();
    await showWorkspace();
  };

  return (
    <main
      id="focusRoomSurface"
      className={`focus-room-surface react-focus-room ${isIdle ? "is-idle" : ""} ${view === "setup" ? "is-setup is-innook-setup" : "is-session"}`.trim()}
      aria-live="polite"
      data-focus-room-view={view}
    >
      <FocusBackground scene={scene} />
      <AnimatePresence mode="wait">
        {view === "setup" ? (
          <motion.div
            key="setup"
            className="focus-room-view focus-setup-view"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
          >
            <FocusRoomSetup audioState={audioState} onWorkspace={showWorkspace} />
          </motion.div>
        ) : null}
        {view === "session" ? (
          <motion.div
            key="session"
            className="focus-room-view focus-session-view"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
          >
            {!focusMode ? <TopFocusNav onWorkspace={showWorkspace} onOpenTrail={() => setUtilityPanel("trail")} onOpenCompanion={() => setUtilityPanel("companion")} onOpenSettings={() => setUtilityPanel("settings")} onExit={() => setExitDialog(true)} /> : <button type="button" className="focus-mode-exit-hit-area" onClick={() => setFocusMode(false)}>Exit Focus Mode</button>}
            <section className={`focus-session-stage ${focusMode ? "is-focus-mode" : ""}`.trim()} aria-hidden="true" />
            {!focusMode ? <BottomControlDock audioState={audioState} onFocusMode={() => setFocusMode(true)} /> : <CompactFocusTimer onExit={() => setFocusMode(false)} />}
            {!focusMode ? <FocusRoomDrawers audioState={audioState} utilityPanel={utilityPanel} onClose={() => setUtilityPanel("")} onWorkspace={showWorkspace} /> : null}
            <SessionSummaryModal />
            <FocusRoomExitDialog open={exitDialog} onClose={() => setExitDialog(false)} onConfirm={finishSession} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function FocusRoomExitDialog({ open, onClose, onConfirm }) {
  return open ? (
    <div className="focus-exit-overlay" role="presentation">
      <div className="focus-exit-dialog liquid-glass" role="dialog" aria-modal="true" aria-labelledby="focus-exit-title">
        <span className="focus-kicker">Leave this room?</span>
        <h2 id="focus-exit-title">End focus session</h2>
        <p>Your focused time will be saved to your Focus Trail.</p>
        <div className="focus-button-row"><GlassButton onClick={onClose}>Continue focusing</GlassButton><GlassButton variant="primary" onClick={onConfirm}>End and exit</GlassButton></div>
      </div>
    </div>
  ) : null;
}
