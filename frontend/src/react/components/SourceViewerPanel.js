import { h, icon, legacyAction } from "../runtime.js";

export function SourceViewerPanel() {
  return h(
    "aside",
    {
      id: "sourceViewerPanel",
      className: "source-viewer-panel d-none",
      "aria-label": "Uploaded source viewer",
    },
    h(
      "div",
      { className: "source-viewer-chrome", role: "toolbar", "aria-label": "Source preview controls" },
      h("div", { className: "source-viewer-tabs", id: "sourceViewerTabs" }),
      h(
        "div",
        { className: "source-viewer-tools" },
        h("span", { id: "sourceViewerMeta", className: "source-viewer-meta-compact" }, "Source"),
        h(
          "button",
          {
            type: "button",
            className: "source-tool-btn",
            id: "sourceOpenExternalBtn",
            onClick: legacyAction("openActiveSourceExternally"),
            "aria-label": "Open source in a new tab (O)",
            title: "Open in new tab (O)",
          },
          icon("bi-box-arrow-up-right")
        ),
        h(
          "button",
          {
            type: "button",
            className: "source-tool-btn",
            onClick: legacyAction("changeSourceZoom", -10),
            "aria-label": "Zoom out (-)",
            title: "Zoom out (-)",
          },
          icon("bi-zoom-out")
        ),
        h("span", { id: "sourceZoomLabel", className: "source-zoom-label" }, "100%"),
        h(
          "button",
          {
            type: "button",
            className: "source-tool-btn",
            onClick: legacyAction("changeSourceZoom", 10),
            "aria-label": "Zoom in (+)",
            title: "Zoom in (+)",
          },
          icon("bi-zoom-in")
        ),
        h(
          "button",
          {
            type: "button",
            className: "source-tool-btn",
            id: "sourceFitWidthBtn",
            onClick: legacyAction("resetSourceZoom"),
            "aria-label": "Fit page width (F)",
            title: "Fit width (F)",
          },
          icon("bi-arrows-fullscreen")
        ),
        h(
          "button",
          {
            type: "button",
            className: "source-tool-btn",
            onClick: legacyAction("toggleSourceViewer", false),
            "aria-label": "Close sources (Esc)",
            title: "Close (Esc)",
          },
          icon("bi-x-lg")
        )
      )
    ),
    h("strong", { id: "sourceViewerTitle", className: "visually-hidden" }, "Uploaded sources"),
    h("div", { id: "sourceViewerBody", className: "source-viewer-body" }),
    h(
      "p",
      { className: "source-viewer-hotkeys visually-hidden", id: "sourceViewerHotkeysHint" },
      "Shortcuts: [ and ] switch sources, + and - zoom, F fits width, O opens the file, Esc closes."
    )
  );
}
