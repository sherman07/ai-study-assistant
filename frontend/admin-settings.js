(function () {
  "use strict";

  function setGate(message, type = "info") {
    const gate = document.getElementById("adminGate");
    if (!gate) return;
    gate.hidden = false;
    gate.className = `admin-card admin-status ${type} show`;
    gate.textContent = message;
  }

  function showContent() {
    const gate = document.getElementById("adminGate");
    const content = document.getElementById("adminContent");
    if (gate) gate.hidden = true;
    if (content) content.hidden = false;
  }

  function setStatus(id, message, type = "") {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = message || "";
    node.className = message ? `billing-status show ${type}` : "billing-status";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function adminFetch(path, options = {}) {
    const auth = window.SynapseAuth;
    if (!auth?.dataApiBase || !auth?.authHeaders) {
      throw new Error("Auth client is not loaded.");
    }
    const headers = await auth.authHeaders({
      "Content-Type": "application/json",
      ...(options.headers || {})
    });
    const response = await fetch(`${auth.dataApiBase()}/${String(path || "").replace(/^\/+/, "")}`, {
      ...options,
      headers
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      const error = new Error(data.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function ensureController() {
    const auth = window.SynapseAuth;
    if (!auth) {
      setGate("Auth client failed to load.", "error");
      return null;
    }
    let session = auth.getStoredSession?.() || null;
    try {
      session = (await auth.syncSessionFromProvider?.()) || session;
    } catch {}
    if (!session?.email) {
      setGate("Sign in as a controller to open this page.", "error");
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
      return null;
    }
    try {
      const me = await adminFetch("/api/admin/me");
      showContent();
      return me;
    } catch (error) {
      if (error.status === 403) {
        setGate("This page is only available to Synapse controllers.", "error");
      } else if (error.status === 401) {
        setGate("Sign in as a controller to open this page.", "error");
        window.setTimeout(() => {
          window.location.href = "login.html";
        }, 900);
      } else {
        setGate(
          error.message || "Could not verify controller access. Apply the Supabase migration, then retry.",
          "error"
        );
      }
      return null;
    }
  }

  async function loadSettings(me) {
    const data = await adminFetch("/api/admin/settings");
    const settings = data.settings || {};
    const mode = document.getElementById("siteAccessMode");
    const signup = document.getElementById("signupOpen");
    if (mode) mode.value = settings.site_access_mode === "allowlist" ? "allowlist" : "open";
    if (signup) signup.checked = settings.signup_open !== false;
    const meta = document.getElementById("controllerMeta");
    if (meta && me?.user) {
      meta.innerHTML = `
        <div><span>Email</span><strong>${escapeHtml(me.user.email || "")}</strong></div>
        <div><span>Platform role</span><strong>controller</strong></div>
        <div><span>Plan</span><strong>${escapeHtml(me.user.plan || "free")}</strong></div>
      `;
    }
  }

  async function saveSettings() {
    setStatus("settingsStatus", "Saving to Supabase…", "info");
    try {
      await adminFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          site_access_mode: document.getElementById("siteAccessMode")?.value || "open",
          signup_open: Boolean(document.getElementById("signupOpen")?.checked)
        })
      });
      setStatus("settingsStatus", "Settings saved.", "success");
    } catch (error) {
      setStatus("settingsStatus", error.message || "Could not save settings.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const me = await ensureController();
    if (!me) return;
    try {
      await loadSettings(me);
    } catch (error) {
      setGate(error.message || "Could not load settings from Supabase.", "error");
      return;
    }
    document.getElementById("saveSettingsBtn")?.addEventListener("click", saveSettings);
  });
})();
