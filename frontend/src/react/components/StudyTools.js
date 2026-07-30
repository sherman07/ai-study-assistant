import { h, icon, legacyAction, legacyTargetAction } from "../runtime.js";

const STUDY_TOOLS = [
  {
    id: "mindmap",
    buttonId: "toolBtnMindMap",
    panelId: "toolPanelMindMap",
    label: "Mind Map",
    icon: "bi-diagram-3",
    title: "Mind Map",
    description: "Explore curved branches, zoom and pan the map, then open any point for notes or tutor help.",
    settingsAction: ["openStudyToolSettingsModal", "mindmap"],
    settingsLabel: "Mind map settings",
    active: true,
  },
  {
    id: "flashcards",
    buttonId: "toolBtnFlashcards",
    panelId: "toolPanelFlashcards",
    label: "Flashcards",
    icon: "bi-card-text",
    title: "Flashcards",
    description: "Active recall with flip cards, confidence grading, and a matching mode.",
    settingsAction: ["clearFlashcardsAndShowBuilder"],
    settingsLabel: "Flashcard settings",
    contentId: "flashcardPanelContent",
  },
  {
    id: "quiz",
    buttonId: "toolBtnQuiz",
    panelId: "toolPanelQuiz",
    label: "Quiz",
    icon: "bi-patch-question",
    title: "Quiz",
    description: "Practise understanding, application, and exam-style phrasing from these notes.",
    settingsAction: ["openQuizSettingsModal"],
    settingsLabel: "Quiz settings",
    contentId: "quizPanelContent",
  },
  {
    id: "timeline",
    buttonId: "toolBtnTimeline",
    panelId: "toolPanelTimeline",
    label: "Study Path",
    icon: "bi-signpost-split",
    title: "Study Path",
    description: "Follow a guided sequence of warm-ups, learning tasks, and mastery checks.",
    settingsAction: ["openStudyToolSettingsModal", "timeline"],
    settingsLabel: "Study path settings",
    contentId: "timelinePanelContent",
  },
  {
    id: "masterygraph",
    buttonId: "toolBtnMasteryGraph",
    panelId: "toolPanelMasteryGraph",
    label: "Exam Readiness",
    icon: "bi-repeat",
    title: "Exam Readiness",
    description: "See what is due, what you missed, and which topics still need review.",
    settingsAction: ["openStudyToolSettingsModal", "masterygraph"],
    settingsLabel: "Readiness settings",
    contentId: "masteryGraphPanelContent",
  },
  {
    id: "visualguide",
    buttonId: "toolBtnVisualGuide",
    panelId: "toolPanelVisualGuide",
    label: "Image Guide",
    icon: "bi-image",
    title: "Image Guide",
    description: "Generate one revision poster that captures the core ideas visually.",
    settingsAction: ["openStudyToolSettingsModal", "visualguide"],
    settingsLabel: "Image guide settings",
    contentId: "visualGuidePanelContent",
    extraActions: [
      {
        action: ["generateVisualGuide", true],
        label: "Generate image",
        icon: "bi-image",
      },
    ],
  },
  {
    id: "broadcast",
    buttonId: "toolBtnBroadcast",
    panelId: "toolPanelBroadcast",
    label: "AI Broadcast",
    icon: "bi-broadcast-pin",
    title: "AI Broadcast",
    description: "Listen to a natural study episode with explanations, examples, and a recap.",
    settingsAction: ["openAiBroadcastSetup"],
    settingsLabel: "Broadcast settings",
    contentId: "broadcastWorkspace",
    broadcastLaunch: true,
  },
];

function toolButton(tool) {
  return h(
    "button",
    {
      id: tool.buttonId,
      className: `tool-switch-btn${tool.active ? " active" : ""}`,
      type: "button",
      role: "tab",
      "aria-selected": tool.active ? "true" : "false",
      "aria-controls": tool.panelId,
      "data-study-tool": tool.id,
      onClick: legacyTargetAction("switchTool", tool.id),
    },
    icon(tool.icon, "me-1"),
    h("span", { className: "tool-switch-btn-label" }, tool.label)
  );
}

function settingsButton(tool) {
  const [fn, ...args] = tool.settingsAction;
  return h(
    "button",
    {
      className: "btn btn-outline-primary btn-sm flex-shrink-0",
      type: "button",
      onClick: args.length ? legacyAction(fn, ...args) : legacyAction(fn),
    },
    icon("bi-sliders", "me-1"),
    tool.settingsLabel
  );
}

function toolPanel(tool) {
  const actions = [];
  if (Array.isArray(tool.extraActions)) {
    for (const extra of tool.extraActions) {
      const [fn, ...args] = extra.action;
      actions.push(
        h(
          "button",
          {
            className: "btn btn-outline-primary btn-sm flex-shrink-0",
            type: "button",
            onClick: args.length ? legacyAction(fn, ...args) : legacyAction(fn),
          },
          icon(extra.icon || "bi-stars", "me-1"),
          extra.label
        )
      );
    }
  }
  actions.push(settingsButton(tool));

  const body = tool.broadcastLaunch
    ? h(
        "div",
        { id: tool.contentId, className: "broadcast-workspace" },
        h(
          "div",
          { className: "study-tool-launch", "data-study-tool-launch": "broadcast", "data-generation-cost": "0" },
          h("div", { className: "study-tool-launch-icon", "aria-hidden": "true" }, icon("bi-broadcast-pin")),
          h(
            "div",
            { className: "study-tool-launch-copy" },
            h("span", { className: "study-tool-launch-kicker" }, "Listen and revise"),
            h("h4", null, "Create an AI broadcast"),
            h("p", null, "Turn the current notes into a natural study episode with explanations, examples, and a guided recap."),
            h(
              "ul",
              { className: "study-tool-launch-points" },
              h("li", null, "Choose episode style, length, and voice"),
              h("li", null, "Follow chapter markers while you listen"),
              h("li", null, "Jump into quiz or flashcards after the recap")
            )
          ),
          h(
            "div",
            { className: "study-tool-launch-meta" },
            icon("bi-lightning-charge-fill"),
            "No tokens used for this first generation · ~3–8 min listen"
          ),
          h(
            "button",
            {
              className: "btn btn-primary study-tool-generate-btn",
              type: "button",
              "data-study-tool-generate": "broadcast",
              "data-token-cost": "0",
              onClick: legacyAction("openBroadcastSettingsModal"),
            },
            icon("bi-stars", "me-2"),
            "Open broadcast settings"
          )
        )
      )
    : tool.contentId
      ? h("div", { id: tool.contentId })
      : tool.id === "mindmap"
        ? h("div", { id: "mindMapCanvas", className: "mindmap-canvas" })
        : null;

  return h(
    "div",
    {
      id: tool.panelId,
      className: `tool-panel${tool.active ? " active" : ""}`,
      role: "tabpanel",
      "aria-labelledby": tool.buttonId,
      "data-study-tool-panel": tool.id,
      ...(tool.active ? {} : { hidden: true }),
    },
    h(
      "div",
      { className: "tool-panel-head d-flex align-items-start justify-content-between gap-3 mb-3" },
      h(
        "div",
        null,
        h("h3", null, tool.title),
        h("p", null, tool.description)
      ),
      h("div", { className: "tool-panel-actions" }, ...actions)
    ),
    body
  );
}

export function StudyTools() {
  return h(
    "section",
    { className: "brainstorm-card study-tools-card", "data-study-tools-shell": "v2" },
    h(
      "div",
      { className: "study-tools-head" },
      h(
        "div",
        null,
        h("h2", null, "Study Tools"),
        h("p", null, "Practise with flashcards and quizzes, follow a study path, and check exam readiness from the same notes.")
      ),
      icon("bi-grid-1x2", "study-tools-icon")
    ),
    h(
      "div",
      {
        className: "tool-switcher",
        role: "tablist",
        "aria-label": "Study tools",
        "data-study-tool-switcher": "v2",
      },
      ...STUDY_TOOLS.map(toolButton)
    ),
    ...STUDY_TOOLS.map(toolPanel)
  );
}
