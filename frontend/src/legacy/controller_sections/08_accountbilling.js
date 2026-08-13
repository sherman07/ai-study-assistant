function authPageUrl(page = "login") {
  const file = page === "signup" ? "signup.html" : "login.html";
  return /\/frontend(?:\/|$)/i.test(window.location.pathname || "") ? file : `frontend/${file}`;
}

function goToAuthPage(page = "login") {
  window.location.href = authPageUrl(page);
}

function signOutAccount() {
  const clearLocalAuthSession = () => {
    try { window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY); } catch {}
    try { window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY); } catch {}
  };
  if (window.SynapseAuth?.signOut) {
    window.SynapseAuth.signOut()
      .catch(error => console.warn("Synapse sign out failed:", error))
      .finally(() => {
        clearLocalAuthSession();
        renderAccountMenu();
        goToAuthPage("login");
      });
    return;
  }
  clearLocalAuthSession();
  renderAccountMenu();
  goToAuthPage("login");
}

function closeAccountPanel() {
  document.querySelector(".account-panel-overlay")?.remove();
}

function closeSynapseConfirmation() {
  document.querySelector(".synapse-confirmation-overlay")?.remove();
}

function openSynapseConfirmation({ eyebrow = "Confirm action", title, description, confirmationText = "", confirmLabel = "Confirm", onConfirm }) {
  closeSynapseConfirmation();
  const overlay = document.createElement("div");
  overlay.className = "synapse-confirmation-overlay";
  const requiresTypedConfirmation = Boolean(confirmationText);
  overlay.innerHTML = `
    <section class="synapse-confirmation-card" role="dialog" aria-modal="true" aria-labelledby="synapseConfirmationTitle">
      <div class="synapse-confirmation-icon"><i class="bi bi-exclamation-triangle"></i></div>
      <p class="account-settings-kicker">${escapeHTML(eyebrow)}</p>
      <h3 id="synapseConfirmationTitle">${escapeHTML(title)}</h3>
      <p>${escapeHTML(description)}</p>
      ${requiresTypedConfirmation ? `<label class="synapse-confirmation-input">Type <strong>${escapeHTML(confirmationText)}</strong> to continue<input type="text" autocomplete="off" data-confirmation-input aria-label="Type ${escapeAttr(confirmationText)} to confirm"></label>` : ""}
      <div class="synapse-confirmation-actions"><button type="button" class="account-secondary-action" data-confirmation-cancel>Cancel</button><button type="button" class="account-danger-action" data-confirmation-submit ${requiresTypedConfirmation ? "disabled" : ""}>${escapeHTML(confirmLabel)}</button></div>
    </section>
  `;
  overlay.addEventListener("click", event => { if (event.target === overlay) closeSynapseConfirmation(); });
  overlay.querySelector("[data-confirmation-cancel]")?.addEventListener("click", closeSynapseConfirmation);
  const input = overlay.querySelector("[data-confirmation-input]");
  const submit = overlay.querySelector("[data-confirmation-submit]");
  input?.addEventListener("input", () => { submit.disabled = input.value.trim() !== confirmationText; });
  submit?.addEventListener("click", async () => {
    submit.disabled = true;
    submit.textContent = "Working…";
    try {
      await onConfirm?.();
      closeSynapseConfirmation();
    } catch (error) {
      submit.disabled = false;
      submit.textContent = confirmLabel;
      const message = error?.message || "That action could not be completed.";
      overlay.querySelector(".synapse-confirmation-card")?.insertAdjacentHTML("beforeend", `<p class="synapse-confirmation-error" role="alert">${escapeHTML(message)}</p>`);
    }
  });
  document.body.appendChild(overlay);
  window.setTimeout(() => (input || overlay.querySelector("[data-confirmation-cancel]"))?.focus(), 0);
}

function openHistoryDeletionDialog(id) {
  const target = getHistory().find(item => item.id === id);
  const title = target ? makeHistoryTitle(target) : "this saved item";
  const companion = target?.kind === "companion"
    || Boolean(target?.companionThreadId)
    || String(target?.id || "").startsWith("companion:");
  openSynapseConfirmation({
    eyebrow: "Remove from recent learning",
    title: companion ? "Remove this companion chat?" : "Remove this study note?",
    description: companion
      ? `“${title}” will be removed from Recent learning and deleted from this browser. This cannot be undone.`
      : `“${title}” and its saved study tools will be removed from this workspace. This cannot be undone.`,
    confirmLabel: companion ? "Remove chat" : "Remove note",
    onConfirm: () => destroyHistoryEntry(id)
  });
}

function openAccountDeletionDialog() {
  const session = getCurrentAccountSession();
  openSynapseConfirmation({
    eyebrow: "Danger zone",
    title: "Delete your Synapse account?",
    description: `This removes the account for ${session?.email || "this user"}, clears this browser's Synapse data, and requests deletion of supported server data. Export your data first if you need a copy.`,
    confirmationText: "DELETE",
    confirmLabel: "Delete account",
    onConfirm: () => confirmAccountDeletion()
  });
}

function accountSettingsNavigation(activeSection) {
  const items = [
    ["general", "General", "bi-sliders"],
    ["study", "Study defaults", "bi-book"],
    ["privacy", "Data & privacy", "bi-shield-check"],
    ["profile", "Account", "bi-person-circle"],
    ["billing", "Billing & credits", "bi-credit-card"]
  ];
  return `<nav class="account-settings-nav" aria-label="Settings sections">${items.map(([id, label, iconName]) => `
    <button class="account-settings-nav-item ${activeSection === id ? "active" : ""}" type="button" onclick="openAccountPanel('settings', '${id}')">
      <i class="bi ${iconName}"></i><span>${label}</span>
    </button>
  `).join("")}</nav>`;
}

function accountPreferenceOptions(controlId, fallback) {
  const control = document.getElementById(controlId);
  if (!control || !control.options) return fallback;
  return Array.from(control.options).map(option => [option.value, option.textContent.trim()]);
}

function accountPreferenceSelect(key, label, description, options, value) {
  return `
    <label class="account-setting-field">
      <span><strong>${escapeHTML(label)}</strong><small>${escapeHTML(description)}</small></span>
      <select onchange="setAccountPreference('${escapeAttr(key)}', this.value)">
        ${options.map(([optionValue, optionLabel]) => `<option value="${escapeAttr(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHTML(optionLabel)}</option>`).join("")}
      </select>
    </label>
  `;
}

function accountSettingsContent(section, session) {
  const preferences = readAccountPreferences();
  if (section === "study") {
    const languageOptions = accountPreferenceOptions("preferredLanguage", [["auto", "Auto-detect source language"], ["english", "English"]]);
    const promptOptions = accountPreferenceOptions("promptMode", [["professor_mode", "Professional Mode"]]);
    const depthOptions = accountPreferenceOptions("noteLength", [["standard_notes", "Standard Notes"]]);
    let savedProvider = preferences.provider;
    if (savedProvider === undefined) {
      try { savedProvider = window.localStorage.getItem("synapse.ai.provider.v1") || ""; } catch { savedProvider = ""; }
    }
    if (savedProvider === undefined || savedProvider === null) {
      savedProvider = document.getElementById("aiProvider")?.value || "";
    }
    return `
      <section class="account-settings-section" aria-labelledby="settings-study-title">
        <p class="account-settings-kicker">Study defaults</p>
        <h4 id="settings-study-title">Start each workspace with your preferred setup</h4>
        <p class="account-section-copy">These defaults apply to new analyses. Prompt mode and study depth still appear on the upload screen; Generate AI is only changed here.</p>
        <div class="account-settings-fields">
          ${accountPreferenceSelect("language", "Output language", "Notes, explanations, quizzes, and flashcards.", languageOptions, preferences.language || document.getElementById("preferredLanguage")?.value || "auto")}
          ${accountPreferenceSelect("provider", "Generate AI", "Choose Backend default, GPT, Gemini, or DeepSeek for note generation.", [["", "Backend default"], ["openai", "GPT"], ["gemini", "Gemini"], ["deepseek", "DeepSeek"]], savedProvider)}
          ${accountPreferenceSelect("promptMode", "Response style", "How Synapse explains your material.", promptOptions, preferences.promptMode || document.getElementById("promptMode")?.value || "professor_mode")}
          ${accountPreferenceSelect("studyDepth", "Study depth", "The default level of detail for new notes.", depthOptions, preferences.studyDepth || document.getElementById("noteLength")?.value || "standard_notes")}
        </div>
      </section>
    `;
  }
  if (section === "privacy") {
    return `
      <section class="account-settings-section" aria-labelledby="settings-privacy-title">
        <p class="account-settings-kicker">Data & privacy</p>
        <h4 id="settings-privacy-title">Keep control of your learning data</h4>
        <p class="account-section-copy">Synapse can export the data held in this browser and request server-side data when your signed-in account supports it.</p>
        ${dataActionsHTML()}
      </section>
    `;
  }
  if (section === "profile") {
    return `
      <section class="account-settings-section" aria-labelledby="settings-account-title">
        <p class="account-settings-kicker">Account</p>
        <h4 id="settings-account-title">Your Synapse account</h4>
        <div class="account-panel-list">
          <div class="account-panel-row"><span>Name</span><strong>${escapeHTML(session?.displayName || "Student")}</strong></div>
          <div class="account-panel-row"><span>Email</span><strong>${escapeHTML(session?.email || "Not signed in")}</strong></div>
          <div class="account-panel-row"><span>Sign-in</span><strong>${escapeHTML(accountAuthModeLabel(session))}</strong></div>
          <div class="account-panel-row"><span>Workspace history</span><strong>${getHistory().length} saved note${getHistory().length === 1 ? "" : "s"}</strong></div>
        </div>
        <p class="account-section-copy">Password, multi-factor authentication, and device management appear here when the connected authentication provider supports them.</p>
      </section>
    `;
  }
  if (section === "billing") return `<section class="account-settings-section" aria-labelledby="settings-billing-title"><p class="account-settings-kicker">Billing & credits</p><h4 id="settings-billing-title">Plan, credits, and invoices</h4>${billingActionsHTML()}</section>`;
  const appearance = preferences.appearance || "system";
  return `
    <section class="account-settings-section" aria-labelledby="settings-general-title">
      <p class="account-settings-kicker">General</p>
      <h4 id="settings-general-title">Make Synapse comfortable to use</h4>
      <p class="account-section-copy">Appearance applies immediately and is remembered on this device. System follows your device preference.</p>
      <div class="account-theme-choice" role="group" aria-label="Appearance">
        ${[["system", "System", "bi-display"], ["light", "Light", "bi-sun"], ["dark", "Dark", "bi-moon-stars"]].map(([value, label, iconName]) => `<button type="button" data-account-theme="${value}" class="${appearance === value ? "is-selected" : ""}" aria-pressed="${appearance === value}" onclick="setAccountPreference('appearance', '${value}')"><i class="bi ${iconName}"></i>${label}</button>`).join("")}
      </div>
      <div class="account-preference-note"><i class="bi bi-check2-circle"></i><span>Saved preferences are private to this browser until account-wide sync is available.</span></div>
    </section>
  `;
}

function openAccountPanel(section = "profile", settingsSection = "general") {
  const session = getCurrentAccountSession();
  if (!session?.email && section !== "help") {
    goToAuthPage("login");
    return;
  }
  closeAccountPanel();
  const activeSettingsSection = section === "settings" ? settingsSection : section;
  const titleMap = {
    profile: "Profile",
    billing: "Billing & credits",
    settings: "Settings",
    help: "Help"
  };
  const helpHTML = `<div class="account-panel-list"><div class="account-panel-row"><span>Support</span><strong>Use Help Center from the account menu</strong></div><div class="account-panel-row"><span>Workspace</span><strong>${currentSourceFingerprint ? "Generated notes active" : "Ready for upload"}</strong></div><div class="account-panel-row"><span>Tutor</span><strong>${voiceTutorHistory.length ? "History available" : "No active chat"}</strong></div></div>`;
  const usesSettingsLayout = section !== "help";
  const content = section === "help" ? helpHTML : accountSettingsContent(activeSettingsSection, session);
  const overlay = document.createElement("div");
  overlay.className = "account-panel-overlay";
  overlay.innerHTML = `
    <section class="account-panel-card ${usesSettingsLayout ? "account-settings-card" : ""}" role="dialog" aria-modal="true" aria-label="${escapeAttr(titleMap[section] || "Account")}">
      <div class="account-panel-head">
        <div><p class="account-panel-eyebrow">Synapse account</p><h3>${escapeHTML(section === "settings" ? "Settings" : (titleMap[section] || "Account"))}</h3></div>
        <button class="account-panel-close" type="button" onclick="closeAccountPanel()" aria-label="Close account panel">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      ${usesSettingsLayout ? `<div class="account-settings-layout">${accountSettingsNavigation(activeSettingsSection)}<div class="account-settings-content" data-account-settings-content>${content}</div></div>` : content}
      ${accountPanelStatusHTML()}
    </section>
  `;
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeAccountPanel();
  });
  document.body.appendChild(overlay);

  // Refresh authoritative daily/boost credits + entitlements when opening billing.
  if (section === "billing" || activeSettingsSection === "billing") {
    refreshAccountBillingPanel().catch(() => {});
  }
}

async function refreshAccountBillingPanel() {
  try {
    if (window.SynapseAuth?.fetchCreditBalance) {
      await window.SynapseAuth.fetchCreditBalance();
    } else if (window.SynapseAuth?.fetchBillingEntitlements) {
      await window.SynapseAuth.fetchBillingEntitlements();
    } else if (window.SynapseAuth?.syncBillingSessionFromServer) {
      await window.SynapseAuth.syncBillingSessionFromServer(window.SynapseAuth.getStoredSession?.());
    }
  } catch (error) {
    console.warn("Could not refresh billing balances:", error);
  }
  renderAccountMenu();
  const contentHost = document.querySelector("[data-account-settings-content]");
  if (!contentHost) return;
  const nextSession = getCurrentAccountSession();
  contentHost.innerHTML = accountSettingsContent("billing", nextSession);
}

async function startBillingCheckout(planId, checkoutMode) {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  if (!window.SynapseAuth?.createCheckoutSession) {
    setAccountPanelStatus("error", "Billing requires production auth configuration.");
    return;
  }
  const plan = billingPlansForAccount().find(item => normaliseBillingPlanId(item.id) === normaliseBillingPlanId(planId));
  if (!plan || normaliseBillingPlanId(plan.id) === "free") {
    setAccountPanelStatus("error", "Choose Pro Monthly or Pro Annual to open Checkout.");
    return;
  }
  setAccountPanelStatus("info", "Opening secure Stripe Checkout...");
  try {
    const checkout = await window.SynapseAuth.createCheckoutSession({
      planId: normaliseBillingPlanId(plan.id),
      checkoutMode: checkoutMode || plan.mode || (normaliseBillingPlanId(plan.id) === "pro_yearly" ? "payment" : "subscription")
    });
    if (!checkout?.url) throw new Error("Stripe did not return a checkout URL.");
    window.location.href = checkout.url;
  } catch (error) {
    setAccountPanelStatus("error", error.message || "Could not start checkout.");
  }
}

async function startBoostCheckout(packId) {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  if (!window.SynapseAuth?.createBoostCheckoutSession) {
    setAccountPanelStatus("error", "Boost checkout requires production auth configuration.");
    return;
  }
  const pack = boostPacksForAccount().find(item => String(item.id) === String(packId));
  if (!pack) {
    setAccountPanelStatus("error", "Choose a valid Boost Credit pack.");
    return;
  }
  setAccountPanelStatus("info", "Opening secure Stripe Checkout for Boost Credits...");
  try {
    const checkout = await window.SynapseAuth.createBoostCheckoutSession({ packId: pack.id });
    if (!checkout?.url) throw new Error("Stripe did not return a checkout URL.");
    window.location.href = checkout.url;
  } catch (error) {
    setAccountPanelStatus("error", error.message || "Could not start Boost checkout.");
  }
}

async function openBillingPortal() {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  if (!window.SynapseAuth?.createPortalSession) {
    setAccountPanelStatus("error", "Billing portal requires production auth configuration.");
    return;
  }
  setAccountPanelStatus("info", "Opening Stripe billing portal...");
  try {
    const portal = await window.SynapseAuth.createPortalSession();
    if (!portal?.url) throw new Error("Stripe did not return a billing portal URL.");
    window.location.href = portal.url;
  } catch (error) {
    setAccountPanelStatus("error", error.message || "Could not open billing portal.");
  }
}

function fallbackLocalAccountData() {
  const localStorageData = {};
  try {
    Object.keys(window.localStorage || {})
      .filter(key => key.startsWith("synapse."))
      .forEach(key => {
        const raw = window.localStorage.getItem(key);
        if (key === AUTH_SESSION_STORAGE_KEY) {
          try {
            const parsed = JSON.parse(raw);
            delete parsed.accessToken;
            localStorageData[key] = JSON.stringify(parsed);
            return;
          } catch {}
        }
        localStorageData[key] = raw;
      });
  } catch {}
  return {
    exportedAt: new Date().toISOString(),
    origin: window.location.origin,
    session: getCurrentAccountSession(),
    localStorage: localStorageData,
    history: getHistory()
  };
}

async function exportAccountData() {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  setAccountPanelStatus("info", "Preparing your data export...");
  const payload = {
    exportedAt: new Date().toISOString(),
    browser: window.SynapseAuth?.collectLocalData ? window.SynapseAuth.collectLocalData() : fallbackLocalAccountData(),
    server: null,
    serverExportError: ""
  };
  if (window.SynapseAuth?.requestServerExport && session.authMode === "supabase") {
    try {
      payload.server = await window.SynapseAuth.requestServerExport();
    } catch (error) {
      payload.serverExportError = error.message || "Server export was unavailable.";
    }
  }
  const filenameEmail = String(session.email || "synapse-account").replace(/[^a-z0-9._-]+/gi, "_");
  const filename = `synapse-data-export-${filenameEmail}-${new Date().toISOString().slice(0, 10)}.json`;
  if (window.SynapseAuth?.downloadJSON) {
    window.SynapseAuth.downloadJSON(filename, payload);
  } else {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  setAccountPanelStatus(payload.serverExportError ? "error" : "success", payload.serverExportError || "Data export downloaded.");
}

function deleteAccountAndLocalData() {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  openAccountDeletionDialog();
}

async function confirmAccountDeletion() {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  setAccountPanelStatus("info", "Deleting account and clearing local Synapse data...");
  let serverError = "";
  if (window.SynapseAuth?.requestAccountDeletion && session.authMode === "supabase") {
    try {
      await window.SynapseAuth.requestAccountDeletion();
    } catch (error) {
      serverError = error.message || "Server account deletion failed.";
    }
  }
  if (window.SynapseAuth?.clearLocalSynapseData) {
    await window.SynapseAuth.clearLocalSynapseData();
  } else {
    safeRemoveLocalStorage(AUTH_SESSION_STORAGE_KEY);
    safeRemoveLocalStorage(ACTIVE_HISTORY_KEY);
  }
  setAccountPanelStatus(serverError ? "error" : "success", serverError || "Account deleted. Redirecting to login...");
  window.setTimeout(() => {
    goToAuthPage("login");
  }, serverError ? 1800 : 900);
  if (serverError) throw new Error(serverError);
}

async function buildClientFingerprint(rawSource, sourceLinks = []) {
  const language = preferredLanguage ? preferredLanguage.value : "auto";
  const hashParts = [`language:${language}`, `source:${String(rawSource || "").trim()}`];
  uniqueSourceLinks(sourceLinks).forEach(link => {
    hashParts.push(`link:${link}`);
  });

  for (const file of uploadedFiles) {
    const buffer = await file.arrayBuffer();
    const fileHash = await sha256Hex(buffer);
    hashParts.push(`file:${file.name}:${file.size}:${file.type}:${fileHash}`);
  }

  return sha256Hex(hashParts.join("||"));
}

