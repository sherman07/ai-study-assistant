function switchTab(tabName, clickedBtn) {
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
  document.querySelectorAll(".asst-tab").forEach(button => button.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.add("active");
  clickedBtn?.classList.add("active");
  if (tabName === "voice") updateVoiceTutorControls();
}

function closeAssistant() {
  document.body.classList.remove("mobile-assistant-open");
  assistant.classList.add("hidden");
  appLayout.classList.add("assistant-closed");
  if (openAssistantBtn) openAssistantBtn.style.display = "block";
}

function isMobileTutorViewport() {
  return window.matchMedia("(max-width: 850px)").matches;
}

function syncAssistantMobileState() {
  if (!assistant || !appLayout) return;
  const isOpen = !assistant.classList.contains("hidden") && appLayout.classList.contains("analysis-ready");
  const shouldUseBottomSheet = isOpen && isMobileTutorViewport();
  document.body.classList.toggle("mobile-assistant-open", shouldUseBottomSheet);
}

function openAssistant() {
  assistant.classList.remove("hidden");
  appLayout.classList.remove("assistant-closed");
  if (isMobileTutorViewport()) {
    assistant.classList.remove("expanded");
    assistantExpanded = false;
  }
  if (openAssistantBtn) openAssistantBtn.style.display = "none";
  syncAssistantMobileState();
}

function expandAssistant() {
  if (isMobileTutorViewport()) {
    assistant.classList.toggle("expanded");
    assistantExpanded = assistant.classList.contains("expanded");
    syncAssistantMobileState();
    return;
  }
  assistantExpanded = !assistantExpanded;
  assistant.classList.toggle("expanded", assistantExpanded);
}

window.addEventListener("resize", syncAssistantMobileState);

function resetWorkspace() {
  safeRemoveLocalStorage(ACTIVE_HISTORY_KEY);
  if (typeof clearActiveGenerationJob === "function") clearActiveGenerationJob();
  stopRealtimeVoiceTutor({ silent: true });
  revokeSourceObjectURLs();

  uploadedFiles = [];
  uploadedLinks = [];
  sections = {};
  fullSummary = "";
  selectedSection = "";
  chatHistory = [];
  connectionsData = [];
  currentSourceFingerprint = "";
  currentHistoryId = "";
  currentPrimarySourceIdentity = "";
  currentMindMap = null;
  storedTitle = "Study Notes";
  activeTool = "mindmap";
  visualGalleryData = [];
  sourceViewerItems = [];
  sourceViewerOpen = false;
  activeSourceItemId = "";
  sourceViewerZoom = 100;
  assistantExpanded = false;

  if (assetUpload) assetUpload.value = "";
  if (linkInput) linkInput.value = "";
  if (sourceInput) sourceInput.value = "";
  if (summaryContent) summaryContent.innerHTML = "";
  if (sectionsContainer) sectionsContainer.innerHTML = "";
  if (visualGallery) {
    visualGallery.innerHTML = "";
    visualGallery.classList.add("d-none");
  }
  if (sourceViewerPanel) sourceViewerPanel.classList.add("d-none");
  if (loadingBox) loadingBox.classList.add("d-none");
  if (resultGrid) resultGrid.classList.add("d-none");
  if (analysisStage) analysisStage.classList.add("d-none");
  if (uploadStage) uploadStage.classList.remove("d-none");
  if (assistant) assistant.classList.add("hidden");
  if (openAssistantBtn) openAssistantBtn.style.display = "none";

  resetTimelineState();
  resetVisualGuideState();
  resetQuizState();
  resetFlashcardState();
  resetVoiceTutorState();
  renderFilePreview();
  renderLinkPreview();
  renderSourceViewer();
  setupVisualGuideTool();
  setupTimelineTool();
  setupMasteryGraphTool();
  setupQuizTool();
  setupFlashcardTool();
  setupBroadcastTool();
  if (typeof renderFocusRoomWorkspaceActions === "function") renderFocusRoomWorkspaceActions();
  if (typeof notifyFocusRoomMaterialsChanged === "function") notifyFocusRoomMaterialsChanged();

  appLayout.classList.remove("analysis-ready", "loading-state", "generation-job-state", "source-viewer-open", "generated-notes-state");
  appLayout.classList.add("initial-state", "assistant-closed");
  if (typeof setWorkspaceNavTab === "function") {
    setWorkspaceNavTab("library", { persist: true, expandRail: false });
  }
  requestAnimationFrame(() => {
    const target = uploadStage || document.body;
    target.scrollIntoView?.({ behavior: "smooth", block: "start" });
  });
}

const AUTH_SESSION_STORAGE_KEY = "synapse.auth.session.v1";

function readAuthSessionFromBrowserStorage() {
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      const raw = storage?.getItem?.(AUTH_SESSION_STORAGE_KEY);
      const session = raw ? JSON.parse(raw) : null;
      if (session && typeof session === "object" && (session.email || session.accountId)) {
        return session;
      }
    } catch {}
  }
  return null;
}

function getCurrentAccountSession() {
  // SynapseAuth may keep the session in sessionStorage when Remember me is off.
  // Prefer the auth client (checks both storages), then fall back to a direct dual read.
  const fromAuth = window.SynapseAuth?.getStoredSession?.();
  if (fromAuth && typeof fromAuth === "object" && (fromAuth.email || fromAuth.accountId)) {
    return fromAuth;
  }
  return readAuthSessionFromBrowserStorage();
}

function accountInitials(session) {
  const name = String(session?.displayName || session?.email || "Synapse Student").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name.slice(0, 2) || "S").toUpperCase();
}

function accountAuthModeLabel(session) {
  if (session?.authMode === "supabase") return "Supabase Auth";
  if (session?.authMode === "local_demo") return "Local demo auth";
  return session?.authProvider ? `${session.authProvider} auth` : "Not signed in";
}

const ACCOUNT_PREFERENCES_STORAGE_KEY = "synapse.account.preferences.v1";
const ACCOUNT_THEME_VALUES = new Set(["system", "light", "dark"]);

function readAccountPreferences() {
  if (window.SynapseTheme?.readPreferences) return window.SynapseTheme.readPreferences();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACCOUNT_PREFERENCES_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAccountPreferences(next) {
  if (window.SynapseTheme?.STORAGE_KEY) {
    try { window.localStorage.setItem(window.SynapseTheme.STORAGE_KEY, JSON.stringify(next)); } catch {}
    return;
  }
  try {
    window.localStorage.setItem(ACCOUNT_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function resolveAccountTheme(preference = "system") {
  if (window.SynapseTheme?.resolve) return window.SynapseTheme.resolve(preference);
  if (preference === "dark" || preference === "light") return preference;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function applyAccountTheme(preference = readAccountPreferences().appearance || "system") {
  if (window.SynapseTheme?.apply) return window.SynapseTheme.apply(preference);
  const selected = ACCOUNT_THEME_VALUES.has(preference) ? preference : "system";
  const resolved = resolveAccountTheme(selected);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = selected;
  document.documentElement.style.colorScheme = resolved;
  document.body?.classList.toggle("synapse-theme-dark", resolved === "dark");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", resolved === "dark" ? "#171717" : "#4a7cff");
  return resolved;
}

function applyAccountStudyPreference(key, value) {
  const controlId = { language: "preferredLanguage", promptMode: "promptMode", studyDepth: "noteLength", provider: "aiProvider" }[key];
  const control = controlId ? document.getElementById(controlId) : null;
  if (control) {
    control.value = value;
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (key === "provider") {
    if (typeof setAiProvider === "function") setAiProvider(value);
    else {
      try { window.localStorage.setItem("synapse.ai.provider.v1", value); } catch {}
    }
  }
}

function setAccountPreference(key, value) {
  const preferences = readAccountPreferences();
  const nextValue = key === "appearance" && !ACCOUNT_THEME_VALUES.has(value) ? "system" : String(value || "");
  writeAccountPreferences({ ...preferences, [key]: nextValue });
  if (key === "appearance") {
    if (window.SynapseTheme?.setPreference) window.SynapseTheme.setPreference(nextValue);
    else applyAccountTheme(nextValue);
    document.querySelectorAll("[data-account-theme]").forEach(button => {
      const active = button.dataset.accountTheme === nextValue;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  } else {
    applyAccountStudyPreference(key, nextValue);
  }
  setAccountPanelStatus("success", "Settings saved on this device.");
}

function initialiseAccountPreferences() {
  applyAccountTheme();
  if (window.SynapseTheme?.subscribe) {
    if (!window.__synapseThemePreferenceSubscription) {
      window.__synapseThemePreferenceSubscription = window.SynapseTheme.subscribe(({ preference }) => {
        document.querySelectorAll("[data-account-theme]").forEach(button => {
          const active = button.dataset.accountTheme === preference;
          button.classList.toggle("is-selected", active);
          button.setAttribute("aria-pressed", String(active));
        });
      });
    }
    return;
  }
  if (!window.__synapseThemeListenerInstalled && window.matchMedia) {
    window.__synapseThemeListenerInstalled = true;
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if ((readAccountPreferences().appearance || "system") === "system") applyAccountTheme("system");
    });
  }
}

function accountPanelStatusHTML() {
  return `<div id="accountPanelStatus" class="account-panel-status" role="status" aria-live="polite"></div>`;
}

function setAccountPanelStatus(type, message) {
  const status = document.getElementById("accountPanelStatus");
  if (!status) {
    if (message) alert(message);
    return;
  }
  status.textContent = message || "";
  status.className = message ? `account-panel-status show ${type}` : "account-panel-status";
}

function billingPlansForAccount() {
  if (window.SynapseAuth?.getBillingPlans) {
    return window.SynapseAuth.getBillingPlans();
  }
  return [
    { id: "free", label: "Free", price: "$0", cadence: "forever", description: "500 welcome credits, then 50 fresh AI credits every day" },
    { id: "pro_monthly", label: "Pro Monthly", price: "$9.99", cadence: "per month", description: "1,000 fresh AI credits every day" },
    { id: "pro_yearly", label: "Pro Annual", price: "$99.99", cadence: "per year", description: "1,000 fresh AI credits every day with annual savings" }
  ];
}

function boostPacksForAccount() {
  if (window.SynapseAuth?.getBoostPacks) {
    return window.SynapseAuth.getBoostPacks();
  }
  return Array.isArray(window.SYNAPSE_BOOST_PACKS) ? window.SYNAPSE_BOOST_PACKS : [];
}

function normaliseBillingPlanId(value) {
  const text = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (text === "starter") return "free";
  if (text === "pro") return "pro_monthly";
  if (text === "pro_month") return "pro_monthly";
  if (text === "pro_year" || text === "pro_annual") return "pro_yearly";
  return text || "free";
}

function formatBillingDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not set";
  return date.toLocaleDateString();
}

function formatCreditCount(value) {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  return amount.toLocaleString();
}

function billingActionsHTML() {
  const session = getCurrentAccountSession();
  const signedIn = Boolean(session?.email);
  const currentPlanId = normaliseBillingPlanId(session?.billingPlan || session?.plan || "free");
  const plans = billingPlansForAccount();
  const boostPacks = boostPacksForAccount();
  const dailyCredits = signedIn ? Number(session.dailyCredits ?? 0) : 0;
  const boostCredits = signedIn ? Number(session.boostCredits ?? 0) : 0;
  const totalCredits = signedIn ? Number(session.credits || (dailyCredits + boostCredits) || 0) : 0;
  const dailyAllowance = signedIn ? Number(session.dailyAllowance || 0) : 0;
  const planCards = plans.map(plan => {
    const planId = normaliseBillingPlanId(plan.id);
    const isFree = planId === "free";
    const isCurrent = currentPlanId === planId;
    const disabled = !signedIn || isFree || isCurrent;
    const description = isFree
      ? "Included with every account"
      : (plan.description || "Secure Stripe Checkout");
    const checkoutMode = plan.mode || (planId === "pro_yearly" ? "payment" : "subscription");
    const actionLabel = isCurrent ? "Current plan" : (isFree ? "Included" : "Upgrade to Pro");
    return `
      <button class="account-plan-action ${isCurrent ? "current" : ""}" type="button" ${disabled ? "disabled" : ""}
              onclick="startBillingCheckout('${escapeAttr(planId)}', '${escapeAttr(checkoutMode)}')">
        <span>
          <strong>${escapeHTML(plan.label || planId)}</strong>
          <small>${escapeHTML([plan.price, plan.cadence].filter(Boolean).join(" / ") || description)}</small>
          <em>${escapeHTML(description)}</em>
        </span>
        <b>${escapeHTML(actionLabel)}</b>
      </button>
    `;
  }).join("");
  const boostCards = boostPacks.map(pack => {
    const packId = escapeAttr(pack.id || "");
    return `
      <button class="account-plan-action" type="button" ${signedIn ? "" : "disabled"}
              onclick="startBoostCheckout('${packId}')">
        <span>
          <strong>${escapeHTML(pack.label || pack.id || "Boost")}</strong>
          <small>${escapeHTML(pack.price || "")} · ${escapeHTML(formatCreditCount(pack.credits))} credits</small>
          <em>Boost Credits stay until you use them. Daily credits are used first.</em>
        </span>
        <b>Add Boost</b>
      </button>
    `;
  }).join("");
  return `
    <div class="account-panel-actions">
      <div class="account-credit-summary" aria-label="Credit balances">
        <p><strong>${escapeHTML(formatCreditCount(totalCredits))}</strong> total credits</p>
        <p>Daily: ${escapeHTML(formatCreditCount(dailyCredits))}${dailyAllowance ? ` / ${escapeHTML(formatCreditCount(dailyAllowance))}` : ""} · Boost: ${escapeHTML(formatCreditCount(boostCredits))}</p>
      </div>
      <div class="account-plan-grid">${planCards || `<p class="account-panel-help">Set window.SYNAPSE_BILLING_PLANS to enable checkout buttons.</p>`}</div>
      <p class="account-section-copy">Need more credits today?</p>
      <div class="account-plan-grid">${boostCards || `<p class="account-panel-help">Boost packs will appear here once configured.</p>`}</div>
      <button class="account-secondary-action" type="button" ${signedIn ? "" : "disabled"}
              onclick="openBillingPortal()">
        <i class="bi bi-credit-card"></i>
        Manage billing portal
      </button>
      <p class="account-panel-help">Fresh daily credits reset each day and are spent first. Boost Credits persist until used. Estimates appear before AI generation. Stripe env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_YEARLY, and STRIPE_PRICE_BOOST_*.</p>
    </div>
  `;
}

function dataActionsHTML() {
  return `
    <div class="account-panel-actions">
      <p class="account-section-copy">Your notes stay available in Recent learning until you remove an individual item. Export creates a portable copy of your account data.</p>
      <button class="account-secondary-action" type="button" onclick="exportAccountData()">
        <i class="bi bi-download"></i>
        Export my data
      </button>
      <button class="account-danger-action" type="button" onclick="openAccountDeletionDialog()">
        <i class="bi bi-trash3"></i>
        Delete account
      </button>
    </div>
  `;
}

function renderAccountMenu() {
  const session = getCurrentAccountSession();
  const signedIn = Boolean(session?.email);
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
  document.querySelectorAll(".account-menu-avatar").forEach(node => {
    node.textContent = accountInitials(session);
  });
  document.querySelectorAll(".account-menu-name").forEach(node => {
    node.textContent = displayName;
  });
  document.querySelectorAll(".account-menu-email").forEach(node => {
    node.textContent = email;
  });
  document.querySelectorAll(".account-menu-plan").forEach(node => {
    node.textContent = plan;
  });
  document.querySelectorAll(".account-menu-credits").forEach(node => {
    node.textContent = String(credits);
    if (dailyCredits != null || boostCredits != null) {
      node.title = `Daily ${dailyCredits ?? 0} · Boost ${boostCredits ?? 0}`;
    }
  });
  document.querySelectorAll(".account-signed-in-only").forEach(node => {
    node.style.display = signedIn ? "" : "none";
  });
  document.querySelectorAll(".account-signed-out-only").forEach(node => {
    node.style.display = signedIn ? "none" : "";
  });
  const normalizedEmail = String(session?.email || "").trim().toLowerCase();
  const isController = Boolean(
    session?.isController
    || session?.platformRole === "controller"
    || normalizedEmail === "shermanzheng8@gmail.com"
  );
  document.querySelectorAll(".account-controller-only").forEach(node => {
    node.style.display = signedIn && isController ? "" : "none";
  });
}

async function refreshAccountSessionFromProvider() {
  renderAccountMenu();
  if (!window.SynapseAuth?.syncSessionFromProvider) return getCurrentAccountSession();
  try {
    await window.SynapseAuth.syncSessionFromProvider();
    await window.SynapseAuth.syncBillingSessionFromServer?.(window.SynapseAuth.getStoredSession?.());
  } catch (error) {
    console.warn("Could not refresh Synapse auth session:", error);
  }
  renderAccountMenu();
  return getCurrentAccountSession();
}

