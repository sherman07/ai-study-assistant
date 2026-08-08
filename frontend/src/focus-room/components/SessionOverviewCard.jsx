import { BookOpenText, Brain, FileText, History, Layers3, ListTodo, NotebookPen } from "lucide-react";
import { getScenePresentation } from "../presenters/scenePresenter.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { GlassButton } from "./GlassButton.jsx";

export function SessionOverviewCard() {
  const material = useFocusRoomStore(state => state.selectedMaterial);
  const selectedScene = useFocusRoomStore(state => state.selectedScene);
  const studyGoal = useFocusRoomStore(state => state.studyGoal);
  const studyPlan = useFocusRoomStore(state => state.studyPlan);
  const completedTasks = useFocusRoomStore(state => state.completedTasks);
  const workspaceNotes = useFocusRoomStore(state => state.workspaceNotes);
  const openStudyPanel = useFocusRoomStore(state => state.openStudyPanel);

  const scene = getScenePresentation(selectedScene);
  const nextTask = studyPlan.find(item => !completedTasks.includes(item.task))?.task || "Review and consolidate this block.";

  return (
    <aside className="session-overview liquid-glass">
      <div className="session-overview-head">
        <span className="focus-kicker">Current Session</span>
        <h2>{scene.title}</h2>
        <p>{material?.materialTitle || "Study material"}</p>
      </div>

      <div className="session-overview-copy">
        <div className="session-stat-row">
          <span className="focus-pill"><Layers3 size={14} aria-hidden="true" /> {material?.isSourceRestricted ? "Source-restricted" : "Adaptive notes"}</span>
          <span className="focus-pill"><BookOpenText size={14} aria-hidden="true" /> {Object.keys(material?.sections || {}).length || material?.studyHeadings?.length || 1} sections</span>
        </div>
        <div className="session-goal-block">
          <strong>Study goal</strong>
          <p>{studyGoal || `Study ${material?.materialTitle || "this material"}`}</p>
        </div>
        <div className="session-goal-block">
          <strong>Next task</strong>
          <p>{nextTask}</p>
        </div>
      </div>

      <div className="session-mini-grid">
        <button className="session-mini-card" type="button" onClick={() => openStudyPanel("materials")}>
          <FileText size={16} aria-hidden="true" />
          <span>Materials</span>
        </button>
        <button className="session-mini-card" type="button" onClick={() => openStudyPanel("chat")}>
          <Brain size={16} aria-hidden="true" />
          <span>AI tutor</span>
        </button>
        <button className="session-mini-card" type="button" onClick={() => openStudyPanel("plan")}>
          <ListTodo size={16} aria-hidden="true" />
          <span>{completedTasks.length}/{studyPlan.length || 0} tasks</span>
        </button>
        <button className="session-mini-card" type="button" onClick={() => openStudyPanel("workspace")}>
          <NotebookPen size={16} aria-hidden="true" />
          <span>{workspaceNotes.trim() ? "Notes saved" : "Notes ready"}</span>
        </button>
      </div>

      <div className="focus-button-row session-overview-actions">
        <GlassButton variant="primary" onClick={() => openStudyPanel("materials")}>Open materials</GlassButton>
        <GlassButton onClick={() => openStudyPanel("history")}><History size={16} aria-hidden="true" /> History</GlassButton>
      </div>
    </aside>
  );
}
