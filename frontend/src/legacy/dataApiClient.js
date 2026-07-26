import { SynapseApiClient } from "./apiClient.js";
import { DATA_API_BASE } from "./dataApiConfig.js?v=ai-broadcast-v15";

const dataApiClient = new SynapseApiClient(DATA_API_BASE);
const configuredTimeoutMs = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6000);
const DATA_API_TIMEOUT_MS = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
  ? configuredTimeoutMs
  : 6000;

function warnDataApiSkip(message, error) {
  if (typeof window === "undefined") return;
  console.warn(message, error);
}

async function parseJsonResponse(response) {
  const contentType = response.headers?.get?.("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : {};
  if (!response.ok || payload?.ok === false) {
    const error = new Error(payload?.error || `Synapse data API returned HTTP ${response.status}`);
    error.status = Number(payload?.status === "degraded" ? 503 : (response.status || 0)) || response.status;
    error.code = payload?.code || (payload?.status === "degraded" ? "DATABASE_UNAVAILABLE" : "");
    error.degraded = payload?.status === "degraded" || Number(response.status) === 503;
    throw error;
  }
  return payload;
}

async function dataApiFetch(path, options = {}) {
  const response = await dataApiClient.fetch(path, {
    timeoutMs: DATA_API_TIMEOUT_MS,
    ...options
  });
  return parseJsonResponse(response);
}

async function persistGeneratedContentToDataApi(result) {
  try {
    const payload = await dataApiFetch("/api/generated-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result || {})
    });
    return payload.database_record || payload.item?.database_record || null;
  } catch (error) {
    warnDataApiSkip("Synapse data API generated-content save skipped:", error);
    return null;
  }
}

async function fetchGeneratedContentFromDataApi(limit = 50) {
  const payload = await dataApiFetch(`/api/generated-content?limit=${encodeURIComponent(limit)}&include=metadata`);
  return Array.isArray(payload.items) ? payload.items : [];
}

async function fetchGeneratedContentSectionsFromDataApi(contentId, page = 1, pageSize = 3) {
  const payload = await dataApiFetch(
    `/api/generated-content/${encodeURIComponent(contentId)}/sections?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`
  );
  return payload?.ok ? payload : null;
}

async function createBroadcastJobInDataApi(job) {
  try {
    const payload = await dataApiFetch("/api/broadcast-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job || {})
    });
    return payload.item || null;
  } catch (error) {
    warnDataApiSkip("Synapse data API broadcast-job create skipped:", error);
    return null;
  }
}

async function patchBroadcastJobInDataApi(jobId, patch) {
  try {
    const payload = await dataApiFetch(`/api/broadcast-jobs/${encodeURIComponent(jobId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch || {})
    });
    return payload.item || null;
  } catch (error) {
    warnDataApiSkip("Synapse data API broadcast-job update skipped:", error);
    return null;
  }
}

async function fetchBroadcastJobsFromDataApi(limit = 50) {
  const payload = await dataApiFetch(`/api/broadcast-jobs?limit=${encodeURIComponent(limit)}`);
  return Array.isArray(payload.items) ? payload.items : [];
}

async function fetchBroadcastJobFromDataApi(jobId) {
  const payload = await dataApiFetch(`/api/broadcast-jobs/${encodeURIComponent(jobId)}`);
  return payload.item || null;
}

async function cancelBroadcastJobInDataApi(jobId) {
  const payload = await dataApiFetch(`/api/broadcast-jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST"
  });
  return payload.item || null;
}

async function retryBroadcastJobInDataApi(jobId) {
  const payload = await dataApiFetch(`/api/broadcast-jobs/${encodeURIComponent(jobId)}/retry`, {
    method: "POST"
  });
  return payload.item || null;
}

async function deleteBroadcastJobFromDataApi(jobId) {
  const payload = await dataApiFetch(`/api/broadcast-jobs/${encodeURIComponent(jobId)}`, {
    method: "DELETE"
  });
  return Boolean(payload.deleted);
}

async function deleteGeneratedContentFromDataApi(contentId) {
  const payload = await dataApiFetch(`/api/generated-content/${encodeURIComponent(contentId)}`, {
    method: "DELETE"
  });
  return Boolean(payload.deleted);
}

async function saveFocusSessionToDataApi(session) {
  try {
    const payload = await dataApiFetch("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session || {})
    });
    return payload.item || null;
  } catch (error) {
    warnDataApiSkip("Synapse data API focus-session save skipped:", error);
    return null;
  }
}

async function fetchFocusSessionsFromDataApi(limit = 40) {
  const payload = await dataApiFetch(`/api/focus-sessions?limit=${encodeURIComponent(limit)}`);
  return Array.isArray(payload.items) ? payload.items : [];
}

export {
  DATA_API_BASE,
  cancelBroadcastJobInDataApi,
  createBroadcastJobInDataApi,
  dataApiClient,
  dataApiFetch,
  deleteGeneratedContentFromDataApi,
  deleteBroadcastJobFromDataApi,
  fetchBroadcastJobFromDataApi,
  fetchBroadcastJobsFromDataApi,
  fetchFocusSessionsFromDataApi,
  fetchGeneratedContentFromDataApi,
  fetchGeneratedContentSectionsFromDataApi,
  persistGeneratedContentToDataApi,
  patchBroadcastJobInDataApi,
  retryBroadcastJobInDataApi,
  saveFocusSessionToDataApi
};
