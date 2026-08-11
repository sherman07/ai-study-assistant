import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { AnimatePresence, motion } from "motion/react";
import { History, X } from "lucide-react";
import { useSessionHistory } from "../hooks/useSessionHistory.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import {
  PANEL_TAB_LIST,
  focusFlashcards,
  focusQuizQuestions,
  panelTabLabel,
  spring
} from "../utils.js";
import { AIStudyChat } from "./AIStudyChat.jsx";
import { FlashcardStudyMode } from "./FlashcardStudyMode.jsx";
import { FocusMaterialContent } from "./FocusMaterialContent.jsx";
import { FocusWorkspaceNotes } from "./FocusWorkspaceNotes.jsx";
import { GlassButton } from "./GlassButton.jsx";
import { MindMapViewer } from "./MindMapViewer.jsx";
import { QuizStudyMode } from "./QuizStudyMode.jsx";
import { StudyToastViewport } from "./StudyFeedback.jsx";

function HistoryTabContent({ onWorkspace }) {
  const { data: sessions = [] } = useSessionHistory();

  return (
    <section className="study-tool-stack">
      <article className="study-card liquid-glass-lite">
        <div className="study-tool-head">
          <div>
            <span className="focus-kicker">Study History</span>
            <h3>Recent focus sessions</h3>
          </div>
          <span className="focus-pill"><History size={14} aria-hidden="true" /> {sessions.length} saved</span>
        </div>
        <div className="history-list">
          {sessions.length ? sessions.map(session => {
            const when = session.sessionDate || session.endedAt || session.startedAt || "";
            return (
              <article className="history-row liquid-glass-lite" key={session.sessionId}>
                <strong>{session.materialTitle || "Study material"}</strong>
                <span>{when ? new Date(when).toLocaleString() : "Saved session"}</span>
                {session.studyGoal ? <p>{session.studyGoal}</p> : null}
                <p>
                  Focused {Math.round((Number(session.totalFocusTime) || 0) / 60)}m
                  {session.quizScore === null || session.quizScore === undefined ? "" : ` · Quiz ${session.quizScore}%`}
                  {session.flashcardsCompleted ? ` · ${session.flashcardsCompleted} cards` : ""}
                </p>
              </article>
            );
          }) : <p className="focus-panel-empty">No Focus Room sessions saved yet.</p>}
        </div>
        <div className="focus-button-row">
          <GlassButton variant="primary" onClick={() => onWorkspace?.()}>Open Workspace</GlassButton>
        </div>
      </article>
    </section>
  );
}

function WorkspaceReturn({ label, action, materialId, onWorkspace }) {
  return (
    <div className="focus-button-row">
      <GlassButton variant="primary" onClick={() => onWorkspace?.(materialId || "", action)}>
        {label}
      </GlassButton>
    </div>
  );
}

function StudyPlanContent({ onWorkspace }) {
  const studyPlan = useFocusRoomStore(state => state.studyPlan);
  const completedTasks = useFocusRoomStore(state => state.completedTasks);
  const updatePlanTask = useFocusRoomStore(state => state.updatePlanTask);
  const toggleTask = useFocusRoomStore(state => state.toggleTask);
  const material = useFocusRoomStore(state => state.selectedMaterial);

  return (
    <section className="study-tool-stack">
      <article className="study-card liquid-glass-lite">
        <div className="study-tool-head">
          <div>
            <span className="focus-kicker">Study Plan</span>
            <h3>Guide the current block</h3>
          </div>
          <span className="focus-pill">{completedTasks.length}/{studyPlan.length} complete</span>
        </div>
        <div className="plan-editor">
          {studyPlan.map((item, index) => (
            <article className="plan-edit-item liquid-glass-lite" key={`${item.task}-${index}`}>
              <label className="focus-field">
                Minutes
                <input value={item.minutes} type="number" min="1" max="180" onChange={event => updatePlanTask(index, event.target.value, null)} />
              </label>
              <label className="focus-field">
                Task
                <textarea value={item.task} onChange={event => updatePlanTask(index, null, event.target.value)} />
              </label>
              <GlassButton
                variant={completedTasks.includes(item.task) ? "primary" : "ghost"}
                onClick={() => toggleTask(index)}
              >
                {completedTasks.includes(item.task) ? "Completed" : "Mark complete"}
              </GlassButton>
            </article>
          ))}
        </div>
        <div className="focus-button-row">
          <GlassButton onClick={() => onWorkspace?.(material?.materialId || "", "timeline")}>Open Timeline Workspace</GlassButton>
        </div>
      </article>
    </section>
  );
}

function ToolContent({ tab, materials, materialsStatus, materialsError, onWorkspace }) {
  const material = useFocusRoomStore(state => state.selectedMaterial);

  if (tab === "materials") {
    return (
        <FocusMaterialContent
          mode="materials"
          materials={materials}
          status={materialsStatus}
          error={materialsError}
          onWorkspace={onWorkspace}
        />
    );
  }

  if (tab === "history") {
    return <HistoryTabContent onWorkspace={onWorkspace} />;
  }

  if (!material) {
    return <p className="focus-panel-empty">No generated materials yet</p>;
  }

  if (tab === "notes") {
    return (
      <FocusMaterialContent
        mode="notes"
        materials={materials}
        status={materialsStatus}
        error={materialsError}
        onWorkspace={onWorkspace}
      />
    );
  }

  if (tab === "sources") {
    return (
      <FocusMaterialContent
        mode="sources"
        materials={materials}
        status={materialsStatus}
        error={materialsError}
        onWorkspace={onWorkspace}
      />
    );
  }

  if (tab === "flashcards") {
    const cards = focusFlashcards(material);
    if (!cards.length) {
      return (
        <article className="study-card liquid-glass-lite">
          <h3>Flashcards</h3>
          <p>No flashcards are attached to this material yet.</p>
          <WorkspaceReturn label="Open Flashcard Workspace" action="flashcards" materialId={material.materialId} onWorkspace={onWorkspace} />
        </article>
      );
    }
    return (
      <>
        <FlashcardStudyMode cards={cards} />
        <WorkspaceReturn label="Open Flashcard Workspace" action="flashcards" materialId={material.materialId} onWorkspace={onWorkspace} />
      </>
    );
  }

  if (tab === "quiz") {
    const questions = focusQuizQuestions(material);
    if (!questions.length) {
      return (
        <article className="study-card liquid-glass-lite">
          <h3>Quiz</h3>
          <p>No saved quiz is attached to this material yet.</p>
          <WorkspaceReturn label="Open Quiz Workspace" action="quiz" materialId={material.materialId} onWorkspace={onWorkspace} />
        </article>
      );
    }
    return (
      <>
        <QuizStudyMode questions={questions} />
        <WorkspaceReturn label="Open Quiz Workspace" action="quiz" materialId={material.materialId} onWorkspace={onWorkspace} />
      </>
    );
  }

  if (tab === "mindmap") {
    return (
      <article className="study-card liquid-glass-lite">
        <h3>Mind Map</h3>
        <MindMapViewer mindMap={material.mindMap} />
        <WorkspaceReturn label="Open Mind Map Workspace" action="mindmap" materialId={material.materialId} onWorkspace={onWorkspace} />
      </article>
    );
  }

  if (tab === "chat") {
    return (
      <>
        <AIStudyChat />
        <WorkspaceReturn label="Open Workspace Assistant" action="assistant" materialId={material.materialId} onWorkspace={onWorkspace} />
      </>
    );
  }

  if (tab === "plan") {
    return <StudyPlanContent onWorkspace={onWorkspace} />;
  }

  if (tab === "workspace") {
    return <FocusWorkspaceNotes onWorkspace={onWorkspace} />;
  }

  return null;
}

export function FocusRoomToolPanel({ onWorkspace }) {
  const open = useFocusRoomStore(state => state.aiPanelOpen);
  const panelTab = useFocusRoomStore(state => state.panelTab);
  const toggleAIPanel = useFocusRoomStore(state => state.toggleAIPanel);
  const setPanelTab = useFocusRoomStore(state => state.setPanelTab);
  const materials = useFocusRoomStore(state => state.materials);
  const materialsStatus = useFocusRoomStore(state => state.materialsStatus);
  const materialsError = useFocusRoomStore(state => state.materialsError);

  return (
    <>
    <Dialog.Root modal={false} open={open} onOpenChange={toggleAIPanel}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="ai-panel-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.aside
                className="ai-learning-panel liquid-glass extra-panel focus-tool-panel"
                initial={{ opacity: 0, x: 42 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 42 }}
                transition={spring}
              >
                <div className="drawer-head">
                  <div>
                    <span className="focus-kicker">Synapse Study Suite</span>
                    <Dialog.Title>{panelTab === "materials" ? "Materials Workspace" : panelTabLabel(panelTab)}</Dialog.Title>
                    <Dialog.Description className="sr-only">
                      Focus Room study suite with materials, AI chat, quiz, flashcards, mind map, notes, study plan, and history.
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <GlassButton aria-label="Close study suite"><X size={16} aria-hidden="true" /></GlassButton>
                  </Dialog.Close>
                </div>
                <Tabs.Root className="ai-tabs" value={panelTab} onValueChange={setPanelTab}>
                  <Tabs.List className="ai-tab-row" aria-label="Focus Room study tools">
                    {PANEL_TAB_LIST.map(tab => (
                      <Tabs.Trigger className="ai-tab-trigger" key={tab} value={tab}>
                        {panelTabLabel(tab)}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>
                  {PANEL_TAB_LIST.map(tab => (
                    <Tabs.Content className="ai-tab-content" key={tab} value={tab}>
                      <ToolContent
                        tab={tab}
                        materials={materials}
                        materialsStatus={materialsStatus}
                        materialsError={materialsError}
                        onWorkspace={onWorkspace}
                      />
                    </Tabs.Content>
                  ))}
                </Tabs.Root>
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
    <StudyToastViewport />
    </>
  );
}
