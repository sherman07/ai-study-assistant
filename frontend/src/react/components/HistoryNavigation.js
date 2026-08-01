import { h, icon, legacyAction } from "../runtime.js";
import { SummaryNavigation } from "./SummaryNavigation.js?v=credits-notes-v1";
import {
  accountInitials,
  isControllerSession,
  useAccountSession
} from "../accountSession.js?v=auth-session-fix-v2";

export function HistoryNavigation() {
  const session = useAccountSession();
  const signedIn = Boolean(session?.email || session?.accountId);
  const displayName = signedIn ? (session.displayName || session.email) : "Guest Student";
  const email = signedIn ? session.email : "Not signed in";
  const plan = signedIn ? (session.plan || "Free") : "Free";
  const credits = signedIn ? Number(session.credits || 0) : 0;
  const dailyCredits = signedIn && Number.isFinite(Number(session.dailyCredits))
    ? Number(session.dailyCredits)
    : null;
  const boostCredits = signedIn && Number.isFinite(Number(session.boostCredits))
    ? Number(session.boostCredits)
    : null;
  const creditTitle = dailyCredits != null || boostCredits != null
    ? `Daily ${dailyCredits ?? 0} · Boost ${boostCredits ?? 0}`
    : undefined;
  const initials = accountInitials(signedIn ? session : null);
  const controller = signedIn && isControllerSession(session);
  const signedInStyle = signedIn ? undefined : { display: "none" };
  const signedOutStyle = signedIn ? { display: "none" } : undefined;
  const controllerStyle = controller ? undefined : { display: "none" };

  return h(
    "aside",
    {
      id: "historyNav",
      className: "history-nav dark-learning-rail workspace-nav",
      "aria-label": "Synapse workspace navigation",
      "data-workspace-nav-tab": "library",
    },
    h(
      "div",
      { className: "history-header" },
      h(
        "div",
        { className: "nav-logo" },
        h(
          "span",
          { className: "nav-logo-icon" },
          h("img", { className: "nav-logo-img", src: "/logos/synapse.png", alt: "Synapse logo" })
        ),
        h("span", { className: "nav-logo-text" }, "Synapse")
      ),
      h(
        "button",
        {
          id: "historyNavToggle",
          className: "history-nav-toggle",
          type: "button",
          onClick: legacyAction("toggleHistoryNav"),
          "aria-label": "Hide workspace navigation",
          "aria-expanded": "true",
          title: "Hide workspace navigation",
        },
        icon("bi-chevron-double-left")
      ),
      h(
        "div",
        {
          className: "account-menu history-account-rail",
          onMouseEnter: legacyAction("renderAccountMenu"),
          onFocus: legacyAction("renderAccountMenu"),
        },
        h(
          "button",
          {
            className: "history-account-btn",
            type: "button",
            onClick: legacyAction("renderAccountMenu"),
            "aria-haspopup": "menu",
            "aria-label": "Open account menu",
          },
          h("span", { className: "account-avatar account-menu-avatar" }, initials),
          h("span", { className: "history-account-plan account-menu-plan" }, plan)
        ),
        h(
          "div",
          { className: "account-popover", role: "menu", "aria-label": "Account menu" },
          h(
            "div",
            { className: "account-popover-profile" },
            h("span", { className: "account-avatar account-menu-avatar" }, initials),
            h(
              "div",
              null,
              h("strong", { className: "account-menu-name" }, displayName),
              h("p", { className: "account-menu-email" }, email)
            )
          ),
          h(
            "div",
            { className: "account-plan-row" },
            h("span", null, icon("bi-lightning-charge"), " ", h("span", { className: "account-menu-plan" }, plan)),
            h("strong", { title: creditTitle }, h("span", { className: "account-menu-credits" }, String(credits)), " credits")
          ),
          h(
            "button",
            { className: "account-menu-item", type: "button", onClick: legacyAction("resetWorkspace") },
            icon("bi-plus-lg"),
            h("span", null, "New workspace")
          ),
          h(
            "button",
            {
              className: "account-menu-item account-signed-in-only",
              type: "button",
              style: signedInStyle,
              onClick: legacyAction("openAccountPanel", "profile"),
            },
            icon("bi-person-circle"),
            h("span", null, "Profile")
          ),
          h(
            "button",
            {
              className: "account-menu-item account-signed-in-only",
              type: "button",
              style: signedInStyle,
              onClick: legacyAction("openAccountPanel", "billing"),
            },
            icon("bi-credit-card"),
            h("span", null, "Billing & credits")
          ),
          h(
            "button",
            {
              className: "account-menu-item account-signed-in-only",
              type: "button",
              style: signedInStyle,
              onClick: legacyAction("openAccountPanel", "settings"),
            },
            icon("bi-gear"),
            h("span", null, "Settings")
          ),
          h(
            "a",
            {
              className: "account-menu-item account-controller-only",
              href: "admin-settings.html",
              style: controllerStyle,
              role: "menuitem",
            },
            icon("bi-shield-lock"),
            h("span", null, "Controller settings")
          ),
          h(
            "a",
            {
              className: "account-menu-item account-controller-only",
              href: "admin-access.html",
              style: controllerStyle,
              role: "menuitem",
            },
            icon("bi-people"),
            h("span", null, "Users")
          ),
          h(
            "button",
            { className: "account-menu-item", type: "button", onClick: legacyAction("openAccountPanel", "help") },
            icon("bi-question-circle"),
            h("span", null, "Help")
          ),
          h("div", { className: "account-menu-divider" }),
          h(
            "button",
            {
              className: "account-menu-item account-signed-in-only",
              type: "button",
              style: signedInStyle,
              onClick: legacyAction("signOutAccount"),
            },
            icon("bi-box-arrow-right"),
            h("span", null, "Sign out")
          ),
          h(
            "button",
            {
              className: "account-menu-item account-signed-out-only",
              type: "button",
              style: signedOutStyle,
              onClick: legacyAction("goToAuthPage", "login"),
            },
            icon("bi-box-arrow-in-right"),
            h("span", null, "Login")
          )
        )
      )
    ),
    h(
      "nav",
      { className: "learning-rail-actions", "aria-label": "Learning workspace" },
      h(
        "button",
        {
          className: "learning-rail-action learning-rail-new-chat",
          type: "button",
          onClick: legacyAction("resetWorkspace"),
          "data-feature-flag": "new-chat",
          "data-feature-flag-label": "New chat",
          title: "Start a new chat",
        },
        icon("bi-pencil-square"),
        h("span", { className: "learning-rail-action-label" }, "New chat"),
        h("span", { className: "learning-rail-feature-tag", "aria-hidden": "true" }, "new chat")
      ),
      h(
        "button",
        {
          className: "learning-rail-action learning-rail-materials",
          type: "button",
          onClick: legacyAction("setLearningExperienceMode", "materials"),
          "data-learning-experience-target": "materials",
          "aria-pressed": "true",
        },
        icon("bi-collection"),
        h("span", null, "Materials")
      ),
      h(
        "button",
        {
          className: "learning-rail-action learning-rail-companion",
          type: "button",
          onClick: legacyAction("setLearningExperienceMode", "companion"),
          "data-learning-experience-target": "companion",
          "aria-pressed": "false",
        },
        icon("bi-chat-dots"),
        h("span", null, "Learning companion")
      ),
      h(
        "button",
        {
          className: "learning-rail-action learning-rail-focus-room",
          type: "button",
          onClick: legacyAction("openSynapseFocusRoom"),
          "aria-label": "Open Focus Room",
        },
        icon("bi-bullseye"),
        h("span", null, "Focus Room")
      )
    ),
    h(
      "div",
      { className: "workspace-nav-tabs", role: "tablist", "aria-label": "Workspace navigation", hidden: true },
      h(
        "button",
        {
          id: "workspaceNavTabLibrary",
          className: "workspace-nav-tab is-active",
          type: "button",
          role: "tab",
          "aria-selected": "true",
          "aria-controls": "workspaceNavLibrary",
          "data-workspace-nav-tab": "library",
          onClick: legacyAction("setWorkspaceNavTab", "library"),
        },
        icon("bi-journal-bookmark"),
        h("span", null, "Library")
      ),
      h(
        "button",
        {
          id: "workspaceNavTabOutline",
          className: "workspace-nav-tab",
          type: "button",
          role: "tab",
          "aria-selected": "false",
          "aria-controls": "summaryNav",
          "data-workspace-nav-tab": "outline",
          onClick: legacyAction("setWorkspaceNavTab", "outline"),
        },
        icon("bi-list-nested"),
        h("span", null, "Outline")
      )
    ),
    h(
      "div",
      {
        id: "workspaceNavLibrary",
        className: "workspace-nav-panel workspace-library-panel",
        role: "tabpanel",
        "aria-labelledby": "workspaceNavTabLibrary",
        "data-workspace-nav-panel": "library",
      },
      h(
        "div",
        { className: "history-search-wrap" },
        icon("bi-search"),
        h("input", {
          id: "historySearch",
          type: "search",
          placeholder: "Search notes and companion chats...",
          "aria-label": "Search recent learning history",
        })
      ),
      h("div", { className: "history-section-title" }, "Recent learning"),
      h(
        "div",
        { id: "historyList", className: "history-list" },
        h(
          "div",
          { className: "history-empty-state" },
          h("p", { className: "history-empty" }, "No notes or companion chats yet."),
          h(
            "button",
            {
              className: "history-empty-cta",
              type: "button",
              onClick: legacyAction("setLearningExperienceMode", "materials"),
            },
            "Upload material to start"
          )
        )
      )
    ),
    h(SummaryNavigation),
    h(
      "p",
      {
        id: "learningModeStatusText",
        className: "visually-hidden",
        "aria-live": "polite",
      },
      "Materials mode"
    )
  );
}
