import { API_BASE } from "./apiConfig.js?v=ai-learning-companion-v1";
import { SynapseApiClient } from "./apiClient.js?v=ai-learning-companion-v1";

const companionApiClient = new SynapseApiClient(API_BASE);

export function createLearningCompanionRequester(apiClient = companionApiClient) {
  return async function requestLearningCompanionDecision({ message, messages = [], learningContext = {}, sourceBundle = { fingerprint: "", sources: [] }, availableTimeMinutes = null, aiProvider = "" } = {}) {
    const response = await apiClient.fetch("/learning-companion/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        messages,
        availableTimeMinutes,
        learning_context: learningContext,
        source_bundle: sourceBundle,
        ai_provider: aiProvider || (typeof window !== "undefined" ? (window.localStorage?.getItem?.("synapse.ai.provider.v1") || "") : "")
      }),
      timeoutMs: 45000,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.error) throw new Error(body?.error || "Synapse could not reply right now.");
    if (typeof body?.reply !== "string" || !body.reply.trim()) throw new Error("Synapse returned an incomplete tutor reply. Please retry.");
    return body;
  };
}

export const requestLearningCompanionDecision = createLearningCompanionRequester();
