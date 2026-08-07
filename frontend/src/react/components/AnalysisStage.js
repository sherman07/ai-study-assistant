import { h, icon, legacyAction } from "../runtime.js";
import { NotesToolbar } from "./NotesToolbar.js?v=a11y-skip-v1";
import { SourceViewerPanel } from "./SourceViewerPanel.js?v=a11y-skip-v1";
import { StudyTools } from "./StudyTools.js?v=a11y-skip-v1";

export function AnalysisStage() {
  return h(
    "section",
    { id: "analysisStage", className: "analysis-stage d-none" },
    h(
      "section",
      { className: "notes-header compact-header" },
      h(
        "div",
        null,
        h(
          "div",
          { className: "workspace-surface-badge workspace-surface-badge--materials", "data-workspace-kind": "materials" },
          icon("bi-collection"),
          h("span", null, "Materials")
        ),
        h("h1", null, "Generated Study Notes"),
        h("p", null, "Synapse analysed your materials and built a guided study overview.")
      ),
      h(
        "div",
        { className: "analysis-header-actions" },
        h(
          "button",
          {
            className: "btn btn-outline-primary new-upload-btn",
            type: "button",
            onClick: legacyAction("resetWorkspace"),
          },
          icon("bi-plus-lg", "me-1"),
          "New upload"
        )
      )
    ),
    h("div", { id: "examReadinessSummary", className: "exam-readiness-summary d-none", "aria-live": "polite" }),
    h(
      "div",
      { id: "loadingBox", className: "loading-box d-none" },
      h(
        "div",
        { className: "synapse-ai-loader refined-loader", "aria-hidden": "true" },
        h("div", { className: "loader-orbit loader-orbit-one" }),
        h("div", { className: "loader-orbit loader-orbit-two" }),
        h(
          "div",
          { className: "vector-logo-loader" },
          h("img", {
            className: "rotating-vector-logo",
            src: "/logos/synapse_no_spark.png",
            alt: "Synapse loading logo",
          }),
          h(
            "div",
            { className: "loading-star" },
            h(
              "svg",
              { viewBox: "0 0 24 24", className: "synapse-spark" },
              h("path", { d: "M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" })
            )
          )
        )
      ),
      h("h3", null, "Synapse is analysing your material..."),
      h("p", null, "Reading sources, explaining ideas, and preparing your tutor-style notes.")
    ),
    h(
      "div",
      { id: "resultGrid", className: "result-grid d-none" },
      h(
        "section",
        { className: "notes-card", "aria-label": "Study notes" },
        h(NotesToolbar),
        h(
          "div",
          { className: "notes-scroll", id: "notesScroll" },
          h("div", { id: "summaryContent", className: "summary-content" }),
          h("div", { id: "visualGallery", className: "visual-gallery d-none" })
        )
      ),
      h(
        "div",
        {
          id: "notesSourceSplitter",
          className: "notes-source-splitter",
          role: "separator",
          "aria-orientation": "vertical",
          "aria-label": "Resize notes and source preview",
          tabIndex: 0,
          title: "Drag to resize. Double-click to reset.",
        },
        h("span", { className: "notes-source-splitter-handle", "aria-hidden": "true" })
      ),
      h(SourceViewerPanel),
      h(StudyTools)
    )
  );
}
