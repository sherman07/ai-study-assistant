import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AnimatePresence, motion } from "motion/react";
import { clearFocusRoomActiveSession, saveFocusRoomActiveSession } from "../data.js";
import { FocusBackground } from "./FocusBackground.jsx";
import { FocusRoomLanding } from "./FocusRoomLanding.jsx";
import { FocusRoomSetup } from "./FocusRoomSetup.jsx";
import { PomodoroTimer } from "./PomodoroTimer.jsx";
import { TopFocusNav } from "./TopFocusNav.jsx";
import { BottomControlDock } from "./BottomControlDock.jsx";
import { SessionSummaryModal } from "./SessionSummaryModal.jsx";
import { FocusRoomDrawers } from "./FocusRoomDrawers.jsx";
import { FocusModeHUD } from "./FocusModeHUD.jsx";
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
  const openSetup = useFocusRoomStore(state => state.openSetup);
  const showStudyHistory = useFocusRoomStore(state => state.showStudyHistory);

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
      if (focusMode) return;
      if (utilityPanel) {
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
      className={`focus-room-surface react-focus-room ${isIdle ? "is-idle" : ""} ${view === "setup" ? "is-innook-setup" : ""}`.trim()}
      aria-live="polite"
    >
      <FocusBackground scene={scene} />
      <AnimatePresence mode="wait">
        {view === "landing" ? (
          <motion.div
            key="landing"
            className="focus-room-view focus-landing-view"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
          >
            <FocusRoomLanding onStart={openSetup} onWorkspace={showWorkspace} onHistory={showStudyHistory} />
          </motion.div>
        ) : view === "setup" ? (
          <motion.div
            key="setup"
            className="focus-room-view focus-setup-view"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
          >
            <FocusRoomSetup />
          </motion.div>
        ) : (
          <motion.div
            key="session"
            className="focus-room-view focus-session-view"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
          >
            {!focusMode ? <TopFocusNav onWorkspace={showWorkspace} onOpenTrail={() => setUtilityPanel("trail")} onOpenCompanion={() => setUtilityPanel("companion")} onOpenSettings={() => setUtilityPanel("settings")} onExit={() => setExitDialog(true)} /> : null}
            <section className={`focus-session-stage ${focusMode ? "is-focus-mode" : ""}`.trim()}>
              <div className="focus-session-grid">
                <PomodoroTimer />
              </div>
            </section>
            {!focusMode ? <BottomControlDock audioState={audioState} onFocusMode={() => setFocusMode(true)} /> : <FocusModeHUD audioState={audioState} onExit={() => setFocusMode(false)} />}
            {!focusMode ? <FocusRoomDrawers audioState={audioState} utilityPanel={utilityPanel} onClose={() => setUtilityPanel("")} onWorkspace={showWorkspace} /> : null}
            <SessionSummaryModal />
            <FocusRoomExitDialog open={exitDialog} onClose={() => setExitDialog(false)} onConfirm={finishSession} />
          </motion.div>
        )}
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
