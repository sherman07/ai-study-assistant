import { Fragment, h, icon, legacyAction } from "../runtime.js";
import { MobileNavigation } from "./MobileNavigation.js?v=ai-broadcast-v19";
import { HistoryNavigation } from "./HistoryNavigation.js?v=ai-broadcast-v19";
import { UploadStage } from "./UploadStage.js?v=ai-broadcast-v19";
import { CompanionWorkspace } from "./CompanionWorkspace.js?v=companion-practice-v1";
import { AnalysisStage } from "./AnalysisStage.js?v=ai-broadcast-v19";
import { AssistantPanel, OpenAssistantButton } from "./AssistantPanel.js?v=ai-broadcast-v19";

export function AppShell() {
  return h(
    Fragment,
    null,
    h(MobileNavigation),
    h(
      "div",
      { className: "workspace-shell", id: "workspaceShell" },
      /* One fixed workspace rail (Library | Outline). Notes + tutor stay in the grid. */
      h(HistoryNavigation),
      h(
        "div",
        {
          id: "appLayout",
          className: "app-layout initial-state has-learning-rail",
          "data-learning-experience-mode": "materials",
          "data-workspace-nav-tab": "library",
        },
        h(
          "main",
          { id: "mainNotes", className: "notes-area" },
          h(
            "div",
            { className: "learning-experience-shell" },
            h(UploadStage),
            h(CompanionWorkspace)
          ),
          h(AnalysisStage)
        ),
        h(AssistantPanel)
      )
    ),
    h(OpenAssistantButton),
    h(
      "button",
      {
        id: "historyNavExpand",
        className: "history-nav-expand",
        type: "button",
        hidden: true,
        onClick: legacyAction("toggleHistoryNav", false),
        "aria-label": "Show workspace navigation",
        "aria-expanded": "false",
        title: "Show workspace navigation",
      },
      icon("bi-chevron-double-right")
    )
  );
}
