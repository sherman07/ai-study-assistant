import { Fragment, h, icon, legacyAction } from "../runtime.js";
import { accountInitials, useAccountSession } from "../accountSession.js?v=auth-session-fix-v2";

export function MobileNavigation() {
  const session = useAccountSession();
  const signedIn = Boolean(session?.email || session?.accountId);
  const displayName = signedIn ? (session.displayName || session.email) : "Guest Student";
  const email = signedIn ? session.email : "Not signed in";
  const initials = accountInitials(signedIn ? session : null);

  const brand = h(
    "div",
    { className: "mobile-brand" },
    h(
      "span",
      { className: "brand-dot" },
      h("img", { className: "brand-logo-img", src: "/logos/synapse.png", alt: "Synapse logo" })
    ),
    h("strong", null, "Synapse")
  );

  return h(
    Fragment,
    null,
    h(
      "nav",
      { className: "mobile-topbar", "aria-label": "Mobile navigation" },
      h(
        "button",
        {
          className: "mobile-menu-btn",
          type: "button",
          "data-bs-toggle": "offcanvas",
          "data-bs-target": "#mobileNav",
          "aria-controls": "mobileNav",
          "aria-label": "Open menu",
        },
        icon("bi-list")
      ),
      brand,
      h("div", { className: "mobile-topbar-spacer" })
    ),
    h(
      "div",
      {
        className: "offcanvas offcanvas-top mobile-offcanvas",
        tabIndex: -1,
        id: "mobileNav",
        "aria-labelledby": "mobileNavLabel",
      },
      h(
        "div",
        { className: "offcanvas-header" },
        h(
          "div",
          { className: "mobile-brand", id: "mobileNavLabel" },
          h(
            "span",
            { className: "brand-dot" },
            h("img", { className: "brand-logo-img", src: "/logos/synapse.png", alt: "Synapse logo" })
          ),
          h("strong", null, "Synapse")
        ),
        h("button", {
          type: "button",
          className: "btn-close",
          "data-bs-dismiss": "offcanvas",
          "aria-label": "Close",
        })
      ),
      h(
        "div",
        { className: "offcanvas-body" },
        h(
          "div",
          { className: "mobile-nav-actions" },
          h(
            "button",
            {
              className: "mobile-account-summary",
              type: "button",
              onClick: legacyAction("openAccountPanel", "profile"),
              "data-bs-dismiss": "offcanvas",
            },
            h("span", { className: "account-avatar account-menu-avatar" }, initials),
            h(
              "div",
              null,
              h("strong", { className: "account-menu-name" }, displayName),
              h("p", { className: "account-menu-email" }, email)
            )
          ),
          h(
            "button",
            {
              className: "history-new-btn mobile-new-btn",
              type: "button",
              onClick: legacyAction("resetWorkspace"),
              "data-bs-dismiss": "offcanvas",
            },
            icon("bi-plus-lg"),
            " New workspace"
          )
        ),
        h(
          "div",
          { className: "history-search-wrap mobile-history-search-wrap" },
          icon("bi-search"),
          h("input", {
            id: "mobileHistorySearch",
            type: "search",
            placeholder: "Search notes and companion chats...",
            "aria-label": "Search recent learning history",
          })
        ),
        h("div", { className: "history-section-title mobile-history-title" }, "Recent learning"),
        h(
          "div",
          { id: "mobileHistoryList", className: "history-list mobile-history-list" },
          h("p", { className: "history-empty" }, "No notes or companion chats yet.")
        ),
        h("div", { className: "mobile-nav-divider" }),
        h("p", { className: "mobile-nav-caption" }, "Current note sections"),
        h("div", { id: "mobileSections", className: "section-list" })
      )
    )
  );
}
