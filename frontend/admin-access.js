(function () {
  "use strict";

  let plansById = {
    free: { id: "free", label: "Free", credits: 500 },
    pro_monthly: { id: "pro_monthly", label: "Pro Monthly", credits: 4000 },
    pro_yearly: { id: "pro_yearly", label: "Pro Yearly", credits: 4000 }
  };
  let usersCache = [];
  let selectedUserId = "";

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

  function planLabel(plan) {
    return plansById[plan]?.label || plan || "Free";
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "—";
    return date.toLocaleString();
  }

  function toLocalInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

  function renderUsers(users) {
    const body = document.getElementById("usersTableBody");
    const hint = document.getElementById("usersCountHint");
    if (!body) return;
    if (hint) {
      hint.textContent = users.length
        ? `${users.length} user${users.length === 1 ? "" : "s"} loaded from Supabase.`
        : "No users found yet. People appear here after they sign up.";
    }
    if (!users.length) {
      body.innerHTML = `<tr><td colspan="7">No users match this search.</td></tr>`;
      return;
    }
    body.innerHTML = users.map((user) => `
      <tr class="${user.id === selectedUserId ? "is-selected" : ""}" data-user-row="${escapeHtml(user.id)}">
        <td>
          ${escapeHtml(user.email || "—")}
          ${user.bootstrap ? ' <span class="admin-badge">primary</span>' : ""}
          ${user.platformRole === "controller" && !user.bootstrap ? ' <span class="admin-badge">controller</span>' : ""}
        </td>
        <td>${escapeHtml(user.displayName || "—")}</td>
        <td>${escapeHtml(planLabel(user.plan))}</td>
        <td>${escapeHtml(String(user.credits ?? 0))}</td>
        <td>${escapeHtml(user.subscriptionStatus || "inactive")}</td>
        <td>${escapeHtml(user.platformRole || "user")}</td>
        <td>
          <button type="button" class="admin-edit-btn" data-edit-user="${escapeHtml(user.id)}">Edit</button>
        </td>
      </tr>
    `).join("");
  }

  function fillPlanSelect(plans) {
    const select = document.getElementById("editPlan");
    if (!select || !plans?.length) return;
    select.innerHTML = plans.map((plan) => (
      `<option value="${escapeHtml(plan.id)}">${escapeHtml(plan.label || plan.id)}</option>`
    )).join("");
  }

  function openEditor(user) {
    selectedUserId = user.id;
    const editor = document.getElementById("userEditor");
    if (editor) editor.hidden = false;
    document.getElementById("editUserId").value = user.id || "";
    document.getElementById("editEmail").value = user.email || "";
    document.getElementById("editDisplayName").value = user.displayName || "";
    document.getElementById("editPlan").value = user.plan || "free";
    document.getElementById("editCredits").value = String(user.credits ?? plansById[user.plan]?.credits ?? 500);
    document.getElementById("editSubscriptionStatus").value = user.subscriptionStatus || "inactive";
    document.getElementById("editPeriodEnd").value = toLocalInputValue(user.currentPeriodEnd);
    document.getElementById("editRole").value = user.role || "student";
    document.getElementById("editPlatformRole").value = user.platformRole || "user";
    document.getElementById("editPlatformRole").disabled = Boolean(user.bootstrap);
    document.getElementById("editResetCredits").checked = false;
    document.getElementById("editorSubtitle").textContent = user.email
      ? `Editing ${user.email}`
      : "Update billing, credits, and rights for the selected account.";
    document.getElementById("editorMeta").innerHTML = `
      <div><span>User id</span><strong>${escapeHtml(user.id || "—")}</strong></div>
      <div><span>Auth provider</span><strong>${escapeHtml(user.authProvider || "—")}</strong></div>
      <div><span>Stripe customer</span><strong>${escapeHtml(user.stripeCustomerId || "—")}</strong></div>
      <div><span>Created</span><strong>${escapeHtml(formatDate(user.createdAt))}</strong></div>
      <div><span>Updated</span><strong>${escapeHtml(formatDate(user.updatedAt))}</strong></div>
    `;
    setStatus("editorStatus", "");
    renderUsers(usersCache);
    editor?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeEditor() {
    selectedUserId = "";
    const editor = document.getElementById("userEditor");
    if (editor) editor.hidden = true;
    setStatus("editorStatus", "");
    renderUsers(usersCache);
  }

  async function refreshUsers(query = "") {
    setStatus("usersStatus", "Loading users…", "info");
    const data = await adminFetch(`/api/admin/users?limit=200&q=${encodeURIComponent(query)}`);
    if (Array.isArray(data.plans)) {
      plansById = Object.fromEntries(data.plans.map((plan) => [plan.id, plan]));
      fillPlanSelect(data.plans);
    }
    usersCache = data.users || [];
    renderUsers(usersCache);
    if (selectedUserId) {
      const selected = usersCache.find((user) => user.id === selectedUserId);
      if (selected) openEditor(selected);
      else closeEditor();
    }
    setStatus("usersStatus", usersCache.length ? "" : "No users found.", usersCache.length ? "" : "info");
  }

  async function saveUser(event) {
    event.preventDefault();
    const userId = document.getElementById("editUserId")?.value || "";
    if (!userId) return;
    const plan = document.getElementById("editPlan")?.value || "free";
    const resetCredits = Boolean(document.getElementById("editResetCredits")?.checked);
    const body = {
      displayName: document.getElementById("editDisplayName")?.value || "",
      plan,
      credits: Number(document.getElementById("editCredits")?.value || 0),
      subscriptionStatus: document.getElementById("editSubscriptionStatus")?.value || "inactive",
      currentPeriodEnd: document.getElementById("editPeriodEnd")?.value
        ? new Date(document.getElementById("editPeriodEnd").value).toISOString()
        : null,
      role: document.getElementById("editRole")?.value || "student",
      platformRole: document.getElementById("editPlatformRole")?.value || "user",
      resetCredits
    };
    if (resetCredits) {
      body.credits = plansById[plan]?.credits ?? body.credits;
    }
    setStatus("editorStatus", "Saving to Supabase…", "info");
    try {
      const data = await adminFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      setStatus("editorStatus", "User updated.", "success");
      const query = document.getElementById("usersSearch")?.value || "";
      await refreshUsers(query);
      if (data.user) openEditor(data.user);
    } catch (error) {
      setStatus("editorStatus", error.message || "Could not save user.", "error");
    }
  }

  document.addEventListener("click", (event) => {
    const editId = event.target?.getAttribute?.("data-edit-user");
    if (editId) {
      const user = usersCache.find((entry) => entry.id === editId);
      if (user) openEditor(user);
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const ok = await ensureController();
    if (!ok) return;
    try {
      await refreshUsers();
    } catch (error) {
      setGate(error.message || "Could not load users from Supabase.", "error");
      return;
    }

    document.getElementById("usersSearchForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await refreshUsers(document.getElementById("usersSearch")?.value || "");
      } catch (error) {
        setStatus("usersStatus", error.message || "Search failed.", "error");
      }
    });

    document.getElementById("usersRefresh")?.addEventListener("click", async () => {
      try {
        await refreshUsers(document.getElementById("usersSearch")?.value || "");
      } catch (error) {
        setStatus("usersStatus", error.message || "Refresh failed.", "error");
      }
    });

    document.getElementById("userEditForm")?.addEventListener("submit", saveUser);
    document.getElementById("editorClose")?.addEventListener("click", closeEditor);
    document.getElementById("editApplyPlanCredits")?.addEventListener("click", () => {
      const plan = document.getElementById("editPlan")?.value || "free";
      document.getElementById("editCredits").value = String(plansById[plan]?.credits ?? 500);
    });
    document.getElementById("editPlan")?.addEventListener("change", () => {
      if (document.getElementById("editResetCredits")?.checked) {
        const plan = document.getElementById("editPlan")?.value || "free";
        document.getElementById("editCredits").value = String(plansById[plan]?.credits ?? 500);
      }
    });
  });
})();
