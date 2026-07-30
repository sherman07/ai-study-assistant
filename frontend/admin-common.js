(function (global) {
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
    const auth = global.SynapseAuth;
    if (!auth?.dataApiBase || !auth?.authHeaders) {
      throw new Error("Auth client is not loaded.");
    }
    const headers = await auth.authHeaders({
      "Content-Type": "application/json",
      ...(options.headers || {})
    });
    if (!headers.Authorization) {
      const error = new Error("Your sign-in session expired. Please log in again.");
      error.status = 401;
      throw error;
    }
    const controller = new AbortController();
    const timeoutMs = Number(options.timeoutMs || 75000);
    const timer = global.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${auth.dataApiBase()}/${String(path || "").replace(/^\/+/, "")}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        const error = new Error(data.error || `Request failed (${response.status})`);
        error.status = response.status;
        error.payload = data;
        throw error;
      }
      return data;
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error("Timed out reaching the Synapse data API. Try again in a moment.");
        timeoutError.status = 408;
        throw timeoutError;
      }
      throw error;
    } finally {
      global.clearTimeout(timer);
    }
  }

  function redirectToLogin(message) {
    setGate(message || "Sign in as a controller to open this page.", "error");
    const target = global.SynapseAuth?.loginUrl?.()
      || `login.html?next=${encodeURIComponent(`${global.location.pathname}${global.location.search}`)}`;
    global.setTimeout(() => {
      global.location.href = target;
    }, 700);
  }

  async function ensureController() {
    const auth = global.SynapseAuth;
    if (!auth) {
      setGate("Auth client failed to load. Hard-refresh and try again.", "error");
      return null;
    }

    setGate("Checking controller access…", "info");

    let session = null;
    try {
      session = await auth.requireApiSession?.()
        || (await auth.syncSessionFromProvider?.())
        || auth.getStoredSession?.()
        || null;
    } catch (error) {
      setGate(error.message || "Could not restore your sign-in session.", "error");
      return null;
    }

    const token = await auth.accessToken?.().catch(() => "");
    if (!session?.email || !token) {
      redirectToLogin("Sign in as a controller to open this page.");
      return null;
    }

    try {
      const me = await adminFetch("/api/admin/me");
      showContent();
      return me;
    } catch (error) {
      if (error.status === 403) {
        setGate(
          `Signed in as ${session.email}, but this account is not a controller. Ask the primary controller to grant access.`,
          "error"
        );
        return null;
      }
      if (error.status === 401) {
        redirectToLogin("Your session could not be verified. Please log in again.");
        return null;
      }
      setGate(error.message || "Could not verify controller access.", "error");
      return null;
    }
  }

  global.SynapseAdmin = {
    adminFetch,
    ensureController,
    escapeHtml,
    redirectToLogin,
    setGate,
    setStatus,
    showContent
  };
})(window);
