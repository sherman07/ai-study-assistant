import assert from "node:assert/strict";

let assistantClient = null;
try {
  assistantClient = await import("../src/focus-room/services/focusAssistantClient.js");
} catch {
  // The initial TDD run proves the external AI boundary has not been extracted.
}

assert.ok(assistantClient, "Focus Room AI requests must live behind a testable client boundary");

const material = {
  materialId: "economics-101",
  materialTitle: "Economics 101",
  sections: { Demand: "Demand changes with price." },
  aiSummary: "Demand and supply basics."
};

const offline = await assistantClient.requestFocusAssistantAnswer({
  question: "What is demand?",
  material,
  studyGoal: "Understand demand",
  apiClient: null
});
assert.equal(offline.offline, true);
assert.match(offline.answer, /demand/i);

let request = null;
const online = await assistantClient.requestFocusAssistantAnswer({
  question: "Explain the curve",
  chatHistory: [{ role: "user", content: "Start simply" }],
  material,
  assistantContext: { sectionTitle: "Demand", excerpt: "A demand curve slopes down." },
  preferredLanguage: "en",
  apiClient: {
    async fetch(url, options) {
      request = { url, options };
      return {
        ok: true,
        async json() {
          return {
            answer: "It maps price to quantity demanded.",
            used_external_research: true,
            research_sources: [{ title: "Textbook" }]
          };
        }
      };
    }
  }
});

assert.equal(request.url, "/ask");
assert.equal(request.options.method, "POST");
assert.deepEqual(JSON.parse(request.options.body), {
  question: "Explain the curve",
  selected_section: "Demand",
  selected_excerpt: "A demand curve slopes down.",
  source_strict: false,
  preferred_language: "en",
  title: "Economics 101",
  summary: "Demand and supply basics.",
  sections: { Demand: "Demand changes with price." },
  source_identity: "economics-101",
  source_fingerprint: "",
  chat_history: [{ role: "user", content: "Start simply" }]
});
assert.equal(online.answer, "It maps price to quantity demanded.");
assert.equal(online.usedExternalResearch, true);
assert.deepEqual(online.researchSources, [{ title: "Textbook" }]);

await assert.rejects(
  () => assistantClient.requestFocusAssistantAnswer({
    question: "Will this fail?",
    material,
    apiClient: {
      async fetch() {
        return {
          ok: false,
          async json() {
            return { error: "Tutor unavailable" };
          }
        };
      }
    }
  }),
  /Tutor unavailable/
);

console.log("focus assistant client regression passed");
