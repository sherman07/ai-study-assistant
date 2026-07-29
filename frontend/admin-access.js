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
      session = await auth.syncSessionFromProvider?.() || session;
    } catch {}
    if (!session?.email) {
      setGate("Sign in as a controller to open this page.", "error");
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
      return null;
    }
    try {
      await adminFetch("/api/admin/me");
      showContent();
      return true;
    } catch (error) {
      if (error.status === 403) {
        setGate("This page is only available to Synapse controllers.", "error");
      } else if (error.status === 401) {
        setGate("Sign in as a controller to open this page.", "error");
        window.setTimeout(() => {
          window.location.href = "login.html";
        }, 900);
      } else {
        setGate(error.message || "Could not verify controller access.", "error");
      }
      return null;
    }
  }

  function renderAccess(entries) {
    const body = document.getElementById("accessTableBody");
    if (!body) return;
    if (!entries.length) {
      body.innerHTML = `<tr><td colspan="4">No allowlist entries yet.</td></tr>`;
      return;
    }
    body.innerHTML = entries.map(entry => `
      <tr>
        <td>${escapeHtml(entry.email)}</td>
        <td>${escapeHtml(entry.note || "—")}</td>
        <td>${escapeHtml(entry.grantedByEmail || "—")}</td>
        <td>
          <button type="button" data-remove-access="${escapeHtml(entry.email)}">Remove</button>
        </td>
      </tr>
    `).join("");
  }

  function renderControllers(controllers) {
    const body = document.getElementById("controllerTableBody");
    if (!body) return;
    body.innerHTML = controllers.map(user => `
      <tr>
        <td>${escapeHtml(user.email)}${user.bootstrap ? ' <span class="admin-badge">primary</span>' : ""}</td>
        <td>${escapeHtml(user.displayName || "—")}</td>
        <td>controller</td>
        <td>
          ${user.bootstrap
            ? "—"
            : `<button type="button" data-remove-controller="${escapeHtml(user.email)}">Demote</button>`}
        </td>
      </tr>
    `).join("");
  }

  async function refreshLists() {
    const [access, controllers] = await Promise.all([
      adminFetch("/api/admin/access"),
      adminFetch("/api/admin/controllers")
    ]);
    const hint = document.getElementById("accessModeHint");
    if (hint) {
      hint.textContent = access.siteAccessMode === "allowlist"
        ? "Invite-only mode is on. Only listed emails and controllers can use Synapse."
        : "Access mode is currently open. The list below is ready for when you switch to invite-only in Controller settings.";
    }
    renderAccess(access.entries || []);
    renderControllers(controllers.controllers || []);
  }

  async function addAccess(event) {
    event.preventDefault();
    setStatus("accessStatus", "Saving to Supabase…", "info");
    try {
      await adminFetch("/api/admin/access", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("accessEmail")?.value || "",
          note: document.getElementById("accessNote")?.value || ""
        })
      });
      event.target.reset();
      setStatus("accessStatus", "Access granted.", "success");
      await refreshLists();
    } catch (error) {
      setStatus("accessStatus", error.message || "Could not add access.", "error");
    }
  }

  async function addController(event) {
    event.preventDefault();
    setStatus("controllerStatus", "Saving to Supabase…", "info");
    try {
      await adminFetch("/api/admin/controllers", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("controllerEmail")?.value || ""
        })
      });
      event.target.reset();
      setStatus("controllerStatus", "Controller assigned.", "success");
      await refreshLists();
    } catch (error) {
      setStatus("controllerStatus", error.message || "Could not assign controller.", "error");
    }
  }

  document.addEventListener("click", async (event) => {
    const accessEmail = event.target?.getAttribute?.("data-remove-access");
    const controllerEmail = event.target?.getAttribute?.("data-remove-controller");
    if (accessEmail) {
      setStatus("accessStatus", "Updating Supabase…", "info");
      try {
        await adminFetch(`/api/admin/access/${encodeURIComponent(accessEmail)}`, { method: "DELETE" });
        setStatus("accessStatus", "Access removed.", "success");
        await refreshLists();
      } catch (error) {
        setStatus("accessStatus", error.message || "Could not remove access.", "error");
      }
    }
    if (controllerEmail) {
      setStatus("controllerStatus", "Updating Supabase…", "info");
      try {
        await adminFetch(`/api/admin/controllers/${encodeURIComponent(controllerEmail)}`, { method: "DELETE" });
        setStatus("controllerStatus", "Controller demoted.", "success");
        await refreshLists();
      } catch (error) {
        setStatus("controllerStatus", error.message || "Could not demote controller.", "error");
      }
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const ok = await ensureController();
    if (!ok) return;
    try {
      await refreshLists();
    } catch (error) {
      setGate(error.message || "Could not load access data from Supabase.", "error");
      return;
    }
    document.getElementById("accessForm")?.addEventListener("submit", addAccess);
    document.getElementById("controllerForm")?.addEventListener("submit", addController);
  });
})();
