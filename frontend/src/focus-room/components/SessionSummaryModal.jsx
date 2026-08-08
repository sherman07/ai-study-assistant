import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { formatFocusRoomDuration } from "../data.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { getScenePresentation } from "../presenters/scenePresenter.js";
import { GlassButton } from "./GlassButton.jsx";

export function SessionSummaryModal() {
  const record = useFocusRoomStore(state => state.summaryRecord);
  const closeSummary = useFocusRoomStore(state => state.closeSummary);
  const startTimer = useFocusRoomStore(state => state.startTimer);
  const scene = getScenePresentation(record?.selectedScene);

  return (
    <Dialog.Root open={Boolean(record)} onOpenChange={open => !open && closeSummary()}>
      <AnimatePresence>
        {record ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="summary-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.article
                className="summary-card liquid-glass"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
              >
                <span className="focus-kicker">Session complete</span>
                <Dialog.Title>Focus block complete</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Summary of the completed focus block.
                </Dialog.Description>
                <p>You protected a focused block in your quiet study room.</p>
                <div className="summary-grid">
                  <div className="summary-stat liquid-glass-lite">
                    <span>Focus time</span>
                    <strong>{formatFocusRoomDuration(record.totalFocusTime)}</strong>
                  </div>
                  <div className="summary-stat liquid-glass-lite">
                    <span>Planned block</span>
                    <strong>{record.pomodoroDuration}m</strong>
                  </div>
                  <div className="summary-stat liquid-glass-lite">
                    <span>Scene</span>
                    <strong>{scene.title}</strong>
                  </div>
                  <div className="summary-stat liquid-glass-lite">
                    <span>Room state</span>
                    <strong>Saved</strong>
                  </div>
                </div>
                {record.persisted === false ? <p>This session is visible for now, but could not be saved to this device history.</p> : null}
                <div className="focus-button-row">
                  <GlassButton variant="primary" onClick={() => { closeSummary(); startTimer(); }}>Continue studying</GlassButton>
                  <GlassButton onClick={closeSummary}>Done</GlassButton>
                </div>
              </motion.article>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
