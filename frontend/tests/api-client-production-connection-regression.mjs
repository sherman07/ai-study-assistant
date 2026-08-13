import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

globalThis.window = {
  fetch: () => Promise.reject(new Error("not used")),
  setTimeout,
  clearTimeout
};

const { ApiConnectionError, SynapseApiClient } = await import("../src/legacy/apiClient.js");

const hostedClient = new SynapseApiClient("https://synapse-ai-backend.example.com", {
  fetchImpl: () => Promise.reject(new TypeError("network unavailable"))
});

await assert.rejects(
  () => hostedClient.fetch("/analyze"),
  error => (
    error instanceof ApiConnectionError
    && /hosted service/i.test(error.message)
    && !/start the local stack/i.test(error.message)
  )
);

let healthCalls = 0;
let warmupUrl = "";
const warmingClient = new SynapseApiClient("https://synapse-ai-backend.example.com", {
  fetchImpl: url => {
    warmupUrl = url;
    healthCalls += 1;
    return Promise.resolve({ ok: healthCalls > 1, status: healthCalls > 1 ? 200 : 503 });
  }
});

const healthResponse = await warmingClient.warmup({ attempts: 2, retryDelayMs: 0, timeoutMs: 0 });
assert.equal(healthResponse.ok, true);
assert.equal(healthCalls, 2, "hosted health warmup should retry before a real analysis request");
assert.match(warmupUrl, /\/healthz$/, "warmup must use the lightweight liveness endpoint");

const originalDateNow = Date.now;
let simulatedNow = 0;
let cappedWarmupCalls = 0;
const cappedWarmupClient = new SynapseApiClient("https://synapse-ai-backend.example.com", {
  fetchImpl: () => {
    cappedWarmupCalls += 1;
    simulatedNow = 90000;
    return Promise.resolve({ ok: false, status: 503 });
  }
});

try {
  Date.now = () => simulatedNow;
  await assert.rejects(
    () => cappedWarmupClient.warmup({ attempts: 16, retryDelayMs: 0, timeoutMs: 75000, maxWaitMs: 90000 }),
    ApiConnectionError
  );
  assert.equal(cappedWarmupCalls, 1, "a bounded warmup must stop when its total wait window expires");
} finally {
  Date.now = originalDateNow;
}

let analysisCalls = 0;
const renderWakeClient = new SynapseApiClient("https://synapse-ai-backend.example.com", {
  fetchImpl: () => {
    analysisCalls += 1;
    return Promise.resolve({
      ok: analysisCalls === 3,
      status: analysisCalls === 3 ? 200 : 503,
      headers: { get: () => "application/json" }
    });
  }
});

const analysisResponse = await renderWakeClient.fetchWithRetry(
  "/analyze",
  { method: "POST", body: "retryable test payload" },
  { attempts: 3, retryDelayMs: 0 }
);
assert.equal(analysisResponse.ok, true, "analysis should recover after Render wake-up 503 responses");
assert.equal(analysisCalls, 3, "analysis should retry transient Render wake-up responses");

let droppedCalls = 0;
const droppedClient = new SynapseApiClient("https://synapse-ai-backend.example.com", {
  fetchImpl: () => {
    droppedCalls += 1;
    if (droppedCalls < 3) return Promise.reject(new TypeError("network unavailable"));
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" }
    });
  }
});
const recovered = await droppedClient.fetchWithRetry(
  "/analyze",
  { method: "POST", body: "retry after drop" },
  { attempts: 4, retryDelayMs: 0, retryOnConnectionError: true }
);
assert.equal(recovered.ok, true, "analysis should retry when the hosted connection drops mid-request");
assert.equal(droppedCalls, 3, "connection drops should be retried before failing the job");
assert.match(
  droppedClient.analysisInterruptedMessage(),
  /lost the connection while analysing/i,
  "users should see an analysis-interruption message instead of a cold-start-only hint"
);

const uploadControllerSource = readLegacyControllerSections("01_uploadedfiles.js");
assert.match(
  uploadControllerSource,
  /await apiClient\.warmup\(\{[\s\S]*?attempts: 16,[\s\S]*?retryDelayMs: 5000,[\s\S]*?timeoutMs: 75000,[\s\S]*?maxWaitMs: 90000[\s\S]*?\}\);/,
  "a cold Render service needs a bounded full wake-up window before the upload is marked failed"
);
assert.match(
  uploadControllerSource,
  /fetchWithRetry\("\/analyze",\s*\(\)\s*=>/,
  "analyze retries must rebuild the multipart upload body on each attempt"
);
assert.match(
  uploadControllerSource,
  /analysisInterruptedMessage/,
  "failed mid-analysis connections should use the clearer interruption message"
);

console.log("api client production connection regression passed");
