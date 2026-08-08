import { focusAssistantReply } from "../utils.js";

function fallbackAnswer(question, material, studyGoal) {
  return focusAssistantReply(question, material, studyGoal);
}

/**
 * Adapter for the Focus Room tutor endpoint. The Zustand store owns chat state;
 * this module owns request construction, response parsing, and offline fallback.
 */
export async function requestFocusAssistantAnswer({
  question,
  chatHistory = [],
  material = null,
  assistantContext = {},
  studyGoal = "",
  apiClient = globalThis.apiClient,
  preferredLanguage = globalThis.preferredLanguage?.value || "auto"
} = {}) {
  if (!apiClient || typeof apiClient.fetch !== "function") {
    return {
      answer: fallbackAnswer(question, material, studyGoal),
      offline: true
    };
  }

  const response = await apiClient.fetch("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      selected_section: assistantContext.sectionTitle || material?.studyHeadings?.[0] || "",
      selected_excerpt: assistantContext.excerpt || "",
      source_strict: Boolean(material?.isSourceRestricted),
      preferred_language: preferredLanguage,
      title: material?.materialTitle || "Study material",
      summary: material?.aiSummary || material?.summaryText || "",
      sections: material?.sections || {},
      source_identity: material?.materialId || "",
      source_fingerprint: material?.sourceFingerprint || "",
      chat_history: chatHistory
    })
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new Error("Backend returned non-JSON response.");
  }

  if (!response.ok || data?.error) {
    throw new Error(data?.error || "AI request failed.");
  }

  return {
    answer: data?.answer || "No answer returned.",
    usedExternalResearch: Boolean(data?.used_external_research),
    researchSources: Array.isArray(data?.research_sources) ? data.research_sources : []
  };
}
