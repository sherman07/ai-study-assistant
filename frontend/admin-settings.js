(function () {
  "use strict";

  const admin = window.SynapseAdmin;

  async function loadSettings(me) {
    const data = await admin.adminFetch("/api/admin/settings");
    const settings = data.settings || {};
    const mode = document.getElementById("siteAccessMode");
    const signup = document.getElementById("signupOpen");
    if (mode) mode.value = settings.site_access_mode === "allowlist" ? "allowlist" : "open";
    if (signup) signup.checked = settings.signup_open !== false;
    const meta = document.getElementById("controllerMeta");
    if (meta && me?.user) {
      meta.innerHTML = `
        <div><span>Email</span><strong>${admin.escapeHtml(me.user.email || "")}</strong></div>
        <div><span>Platform role</span><strong>controller</strong></div>
        <div><span>Plan</span><strong>${admin.escapeHtml(me.user.plan || "free")}</strong></div>
        <div><span>Credits</span><strong>${admin.escapeHtml(String(me.user.credits ?? "—"))}</strong></div>
      `;
    }
  }

  async function saveSettings() {
    admin.setStatus("settingsStatus", "Saving to Supabase…", "info");
    try {
      await admin.adminFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          site_access_mode: document.getElementById("siteAccessMode")?.value || "open",
          signup_open: Boolean(document.getElementById("signupOpen")?.checked)
        })
      });
      admin.setStatus("settingsStatus", "Settings saved.", "success");
    } catch (error) {
      admin.setStatus("settingsStatus", error.message || "Could not save settings.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!admin?.ensureController) {
      document.getElementById("adminGate").textContent = "Admin gate failed to load. Hard-refresh and try again.";
      return;
    }
    const me = await admin.ensureController();
    if (!me) return;
    try {
      await loadSettings(me);
    } catch (error) {
      admin.setGate(error.message || "Could not load settings from Supabase.", "error");
      return;
    }
    document.getElementById("saveSettingsBtn")?.addEventListener("click", saveSettings);
  });
})();
