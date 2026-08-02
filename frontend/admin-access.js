(function () {
  "use strict";

  const admin = window.SynapseAdmin;
  let plansById = {
    free: { id: "free", label: "Free", credits: 550 },
    pro_monthly: { id: "pro_monthly", label: "Pro Monthly", credits: 1000 },
    pro_yearly: { id: "pro_yearly", label: "Pro Annual", credits: 1000 }
  };
  let usersCache = [];
  let selectedUserId = "";

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
      <tr class="${user.id === selectedUserId ? "is-selected" : ""}" data-user-row="${admin.escapeHtml(user.id)}">
        <td>
          ${admin.escapeHtml(user.email || "—")}
          ${user.bootstrap ? ' <span class="admin-badge">primary</span>' : ""}
          ${user.platformRole === "controller" && !user.bootstrap ? ' <span class="admin-badge">controller</span>' : ""}
        </td>
        <td>${admin.escapeHtml(user.displayName || "—")}</td>
        <td>${admin.escapeHtml(planLabel(user.plan))}</td>
        <td title="Total = daily + boost">${admin.escapeHtml(String(user.credits ?? 0))}${
          Number.isFinite(Number(user.dailyCredits)) || Number.isFinite(Number(user.boostCredits))
            ? ` <small>(${admin.escapeHtml(String(user.dailyCredits ?? "—"))}d / ${admin.escapeHtml(String(user.boostCredits ?? "—"))}b)</small>`
            : ""
        }</td>
        <td>${admin.escapeHtml(
          user.plan === "free" && (user.subscriptionStatus || "inactive") === "inactive"
            ? "—"
            : (user.subscriptionStatus || "inactive")
        )}</td>
        <td>${admin.escapeHtml(user.platformRole || "user")}</td>
        <td>
          <button type="button" class="admin-edit-btn" data-edit-user="${admin.escapeHtml(user.id)}">Edit</button>
        </td>
      </tr>
    `).join("");
  }

  function fillPlanSelect(plans) {
    const select = document.getElementById("editPlan");
    if (!select || !plans?.length) return;
    select.innerHTML = plans.map((plan) => (
      `<option value="${admin.escapeHtml(plan.id)}">${admin.escapeHtml(plan.label || plan.id)}</option>`
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
      <div><span>User id</span><strong>${admin.escapeHtml(user.id || "—")}</strong></div>
      <div><span>Auth provider</span><strong>${admin.escapeHtml(user.authProvider || "—")}</strong></div>
      <div><span>Stripe customer</span><strong>${admin.escapeHtml(user.stripeCustomerId || "—")}</strong></div>
      <div><span>Created</span><strong>${admin.escapeHtml(formatDate(user.createdAt))}</strong></div>
      <div><span>Updated</span><strong>${admin.escapeHtml(formatDate(user.updatedAt))}</strong></div>
    `;
    admin.setStatus("editorStatus", "");
    renderUsers(usersCache);
    editor?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeEditor() {
    selectedUserId = "";
    const editor = document.getElementById("userEditor");
    if (editor) editor.hidden = true;
    admin.setStatus("editorStatus", "");
    renderUsers(usersCache);
  }

  async function refreshUsers(query = "") {
    admin.setStatus("usersStatus", "Loading users from Supabase Auth + public.users…", "info");
    const data = await admin.adminFetch(`/api/admin/users?limit=200&q=${encodeURIComponent(query)}`);
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
    const syncNote = data.sync && !data.sync.skipped && Number(data.sync.authTotal || 0) > 0
      ? ` Synced ${data.sync.authTotal} auth account${data.sync.authTotal === 1 ? "" : "s"}.`
      : "";
    if (usersCache.length) {
      admin.setStatus("usersStatus", syncNote.trim(), syncNote ? "success" : "");
    } else {
      admin.setStatus(
        "usersStatus",
        `No users found yet.${syncNote || " People appear here after they sign up in Supabase Auth."}`,
        "info"
      );
    }
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
    admin.setStatus("editorStatus", "Saving to Supabase…", "info");
    try {
      const data = await admin.adminFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      admin.setStatus("editorStatus", "User updated.", "success");
      const query = document.getElementById("usersSearch")?.value || "";
      await refreshUsers(query);
      if (data.user) openEditor(data.user);
    } catch (error) {
      admin.setStatus("editorStatus", error.message || "Could not save user.", "error");
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
    if (!admin?.ensureController) {
      document.getElementById("adminGate").textContent = "Admin gate failed to load. Hard-refresh and try again.";
      return;
    }
    const me = await admin.ensureController();
    if (!me) return;
    try {
      await refreshUsers();
    } catch (error) {
      admin.setGate(error.message || "Could not load users from Supabase.", "error");
      return;
    }

    document.getElementById("usersSearchForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await refreshUsers(document.getElementById("usersSearch")?.value || "");
      } catch (error) {
        admin.setStatus("usersStatus", error.message || "Search failed.", "error");
      }
    });

    document.getElementById("usersRefresh")?.addEventListener("click", async () => {
      try {
        await refreshUsers(document.getElementById("usersSearch")?.value || "");
      } catch (error) {
        admin.setStatus("usersStatus", error.message || "Refresh failed.", "error");
      }
    });

    document.getElementById("userEditForm")?.addEventListener("submit", saveUser);
    document.getElementById("editorClose")?.addEventListener("click", closeEditor);
    document.getElementById("editApplyPlanCredits")?.addEventListener("click", () => {
      const plan = document.getElementById("editPlan")?.value || "free";
      document.getElementById("editCredits").value = String(plansById[plan]?.credits ?? 500);
    });
    document.getElementById("editPlan")?.addEventListener("change", () => {
      const plan = document.getElementById("editPlan")?.value || "free";
      const statusEl = document.getElementById("editSubscriptionStatus");
      const periodEl = document.getElementById("editPeriodEnd");
      if (plan.startsWith("pro_")) {
        if (statusEl) statusEl.value = "active";
        if (periodEl && !periodEl.value) {
          const end = new Date();
          if (plan === "pro_yearly") end.setFullYear(end.getFullYear() + 1);
          else end.setMonth(end.getMonth() + 1);
          periodEl.value = toLocalInputValue(end.toISOString());
        }
      } else if (statusEl) {
        statusEl.value = "inactive";
      }
      if (document.getElementById("editResetCredits")?.checked) {
        document.getElementById("editCredits").value = String(plansById[plan]?.credits ?? 500);
      }
    });
  });
})();
