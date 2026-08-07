import { Fragment, h, icon, legacyAction } from "../runtime.js";
import { MobileNavigation } from "./MobileNavigation.js?v=a11y-skip-v1";
import { HistoryNavigation } from "./HistoryNavigation.js?v=a11y-skip-v1";
import { UploadStage } from "./UploadStage.js?v=a11y-skip-v1";
import { CompanionWorkspace } from "./CompanionWorkspace.js?v=a11y-skip-v1";
import { AnalysisStage } from "./AnalysisStage.js?v=a11y-skip-v1";
import { AssistantPanel, OpenAssistantButton } from "./AssistantPanel.js?v=a11y-skip-v1";

export function AppShell() {
  return h(
    Fragment,
    null,
    h(
      "a",
      { className: "skip-link", href: "#mainNotes" },
      "Skip to study content"
    ),
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
          { id: "mainNotes", className: "notes-area", tabIndex: -1 },
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
