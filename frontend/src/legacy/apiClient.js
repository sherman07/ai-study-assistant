class ApiConnectionError extends Error {
  constructor(message, { cause, code } = {}) {
    super(message);
    this.name = "ApiConnectionError";
    this.cause = cause;
    this.code = code || "connection_error";
  }
}

const SYNAPSE_CLIENT_ID_KEY = "synapse.client.id.v1";

function browserWindow() {
  return globalThis.window || globalThis;
}

function cleanHeaderValue(value, limit = 220) {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, limit);
}

function randomClientId() {
  const cryptoApi = globalThis.crypto || browserWindow().crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function getSynapseClientId() {
  const win = browserWindow();
  try {
    const existing = win.localStorage?.getItem(SYNAPSE_CLIENT_ID_KEY);
    if (existing) return existing;
    const next = randomClientId();
    win.localStorage?.setItem(SYNAPSE_CLIENT_ID_KEY, next);
    return next;
  } catch {
    return randomClientId();
  }
}

function headersToObject(headers = {}) {
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    const output = {};
    headers.forEach((value, key) => {
      output[key] = value;
    });
    return output;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...(headers || {}) };
}

class SynapseApiClient {
  constructor(baseUrl, { fetchImpl } = {}) {
    const win = browserWindow();
    this.baseUrl = String(baseUrl || "").replace(/\/+$/, "");
    this.fetchImpl = fetchImpl || win.fetch?.bind(win) || globalThis.fetch?.bind(globalThis);
  }

  endpoint(path) {
    const cleanPath = String(path || "").replace(/^\/+/, "");
    return `${this.baseUrl}/${cleanPath}`;
  }

  timeoutMessage(timeoutMs) {
    const seconds = Math.max(1, Math.round(Number(timeoutMs || 0) / 1000));
    return `Synapse backend did not respond within ${seconds} seconds. Try a smaller source set or increase window.SYNAPSE_ANALYSIS_TIMEOUT_MS.`;
  }

  isLocalBackend() {
    try {
      const hostname = new URL(this.baseUrl).hostname.toLowerCase();
      return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
    } catch {
      return true;
    }
  }

  connectionMessage() {
    if (this.isLocalBackend()) {
      return [
        `Cannot reach the Synapse backend at ${this.baseUrl}.`,
        "Start the local stack with `bash scripts/start_local_stack.sh`, or run `.venv/bin/python run_backend.py` manually, then try again."
      ].join(" ");
    }
    return [
      `Synapse could not reach its hosted service at ${this.baseUrl}.`,
      "The service may be waking up. Wait a moment and retry; if this keeps happening, contact Synapse support."
    ].join(" ");
  }

  analysisInterruptedMessage() {
    return [
      "Synapse lost the connection while analysing your materials.",
      "This is usually a temporary hosted-service interruption, not missing files.",
      "Click Retry — your uploaded files and links are kept in this browser when possible."
    ].join(" ");
  }

  async requestHeaders(headers = {}) {
    const win = browserWindow();
    const next = headersToObject(headers);
    next["X-Synapse-Client-Id"] = cleanHeaderValue(getSynapseClientId(), 160);

    const session = win.SynapseAuth?.getStoredSession?.();
    if (session && typeof session === "object") {
      if (session.accountId) next["X-Synapse-User-Id"] = cleanHeaderValue(session.accountId, 160);
      if (session.email) next["X-Synapse-User-Email"] = cleanHeaderValue(session.email, 220);
      if (session.displayName) next["X-Synapse-User-Name"] = cleanHeaderValue(session.displayName, 180);
      if (session.authMode) next["X-Synapse-Auth-Mode"] = cleanHeaderValue(session.authMode, 60);
      if (session.role) next["X-Synapse-User-Role"] = cleanHeaderValue(session.role, 80);
    }

    if (win.SynapseAuth?.authHeaders && !next.Authorization && !next.authorization) {
      try {
        const authHeaders = await win.SynapseAuth.authHeaders({});
        if (authHeaders?.Authorization) next.Authorization = authHeaders.Authorization;
        if (authHeaders?.authorization) next.authorization = authHeaders.authorization;
      } catch (error) {
        console.warn("Synapse auth headers were not attached:", error);
      }
    }

    return next;
  }

  async fetch(path, options = {}) {
    const url = this.endpoint(path);
    const { timeoutMs, ...fetchOptions } = options || {};
    fetchOptions.headers = await this.requestHeaders(fetchOptions.headers || {});
    const timeoutLimit = Number(timeoutMs || 0);
    let controller = null;
    let timeoutId = null;
    let abortFromCaller = null;
    const callerSignal = fetchOptions.signal;
    if (timeoutLimit > 0 && typeof AbortController !== "undefined") {
      controller = new AbortController();
      abortFromCaller = () => controller.abort();
      if (callerSignal) {
        if (callerSignal.aborted) {
          controller.abort();
        } else {
          callerSignal.addEventListener("abort", abortFromCaller, { once: true });
        }
      }
      timeoutId = browserWindow().setTimeout(() => controller.abort(), timeoutLimit);
      fetchOptions.signal = controller.signal;
    }
    try {
      return await this.fetchImpl(url, fetchOptions);
    } catch (error) {
      if (controller?.signal?.aborted && !callerSignal?.aborted) {
        throw new ApiConnectionError(this.timeoutMessage(timeoutLimit), {
          cause: error,
          code: "timeout"
        });
      }
      if (callerSignal?.aborted) {
        throw new ApiConnectionError("Analysis was cancelled.", {
          cause: error,
          code: "cancelled"
        });
      }
      throw new ApiConnectionError(this.connectionMessage(), {
        cause: error,
        code: "unreachable"
      });
    } finally {
      if (timeoutId) browserWindow().clearTimeout(timeoutId);
      if (callerSignal && abortFromCaller) {
        callerSignal.removeEventListener("abort", abortFromCaller);
      }
    }
  }

  async warmup({ attempts = 2, retryDelayMs = 1500, timeoutMs = 60000, maxWaitMs = 0, signal } = {}) {
    const totalAttempts = Math.max(1, Math.floor(Number(attempts) || 1));
    const totalWaitLimit = Math.max(0, Number(maxWaitMs) || 0);
    const startedAt = Date.now();
    let lastError = null;

    for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = totalWaitLimit > 0 ? totalWaitLimit - elapsedMs : 0;
      if (totalWaitLimit > 0 && remainingMs <= 0) break;
      try {
        const response = await this.fetch("/healthz", {
          method: "GET",
          signal,
          timeoutMs: totalWaitLimit > 0 ? Math.min(timeoutMs, remainingMs) : timeoutMs
        });
        if (response?.ok) return response;
        lastError = new ApiConnectionError(
          `Synapse hosted service returned ${response?.status || "an unexpected status"} while preparing your analysis.`,
          { code: "warmup_status" }
        );
      } catch (error) {
        lastError = error;
      }

      if (attempt < totalAttempts - 1 && retryDelayMs > 0) {
        const remainingAfterAttemptMs = totalWaitLimit > 0 ? totalWaitLimit - (Date.now() - startedAt) : retryDelayMs;
        if (totalWaitLimit > 0 && remainingAfterAttemptMs <= 0) break;
        await new Promise(resolve => browserWindow().setTimeout(resolve, Math.min(retryDelayMs, remainingAfterAttemptMs)));
      }
    }

    throw lastError || new ApiConnectionError(this.connectionMessage(), { code: "warmup_failed" });
  }

  isRetryableResponse(response) {
    return [502, 503, 504].includes(Number(response?.status));
  }

  isRetryableConnectionError(error) {
    if (!(error instanceof ApiConnectionError)) return false;
    if (error.code === "cancelled" || error.code === "timeout") return false;
    return true;
  }

  async fetchWithRetry(path, options = {}, {
    attempts = 3,
    retryDelayMs = 3000,
    retryOnConnectionError = true,
    onRetry
  } = {}) {
    const totalAttempts = Math.max(1, Math.floor(Number(attempts) || 1));
    let response = null;
    let lastError = null;

    for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
      try {
        // Rebuild FormData-friendly request each attempt when a factory is provided.
        const attemptOptions = typeof options === "function" ? options(attempt) : options;
        response = await this.fetch(path, attemptOptions);
        if (!this.isRetryableResponse(response) || attempt === totalAttempts - 1) return response;
        onRetry?.({
          attempt: attempt + 1,
          totalAttempts,
          reason: `HTTP ${response.status}`
        });
      } catch (error) {
        lastError = error;
        const canRetry = retryOnConnectionError
          && this.isRetryableConnectionError(error)
          && attempt < totalAttempts - 1;
        if (!canRetry) throw error;
        onRetry?.({
          attempt: attempt + 1,
          totalAttempts,
          reason: error?.code || "connection_error"
        });
      }

      if (retryDelayMs > 0) {
        await new Promise(resolve => browserWindow().setTimeout(resolve, retryDelayMs));
      }
    }

    if (lastError) throw lastError;
    return response;
  }
}

export { ApiConnectionError, SynapseApiClient };
