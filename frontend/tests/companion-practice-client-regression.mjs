import assert from "node:assert/strict";

globalThis.window = {
  location: {
    protocol: "http:",
    hostname: "localhost",
    port: "8001",
    host: "localhost:8001",
  },
  SYNAPSE_BROADCAST_TIMEOUT_MS: 1000,
};
globalThis.document = { body: { dataset: {} } };

const {
  buildCompanionConversationContext,
  createCompanionPracticeRequester,
  normalizeCompanionSuggestedTools,
  readLatestMaterialsContext,
} = await import("../src/legacy/companionPracticeClient.js");

assert.deepEqual(
  normalizeCompanionSuggestedTools([
    { id: "quiz", label: "Quiz me", reason: "Ready to practice" },
    { id: "flashcards" },
    { id: "unknown" },
    "broadcast",
    "quiz",
  ]).map(tool => tool.id),
  ["quiz", "flashcards", "broadcast"],
);

const context = buildCompanionConversationContext([
  { role: "user", content: "Explain photosynthesis" },
  { role: "assistant", content: "Plants convert light into chemical energy." },
], { topic: "Photosynthesis" });

assert.match(context.summary, /Photosynthesis/);
assert.match(context.sections["Companion conversation"], /Learner: Explain photosynthesis/);

const storage = {
  getItem(key) {
    assert.equal(key, "synapse.generated.history.v6");
    return JSON.stringify([
      { id: "companion:1", kind: "companion", summary: "skip" },
      { id: "notes-1", title: "Cell Biology", summary: "Mitochondria make ATP.", sections: { A: "ATP" } },
    ]);
  },
};

const materials = readLatestMaterialsContext(storage);
assert.equal(materials.title, "Cell Biology");
assert.match(materials.summary, /Mitochondria/);

const calls = [];
const fakeClient = {
  async fetch(path, options = {}) {
    calls.push({ path, body: JSON.parse(options.body) });
    if (path === "/quiz/generate") {
      return {
        ok: true,
        async json() {
          return {
            title: "Cell Quiz",
            questions: [{ type: "short_answer", question: "What makes ATP?", expected_answer: "Mitochondria" }],
          };
        },
      };
    }
    if (path === "/flashcards/generate") {
      return {
        ok: true,
        async json() {
          return { title: "Cell Cards", cards: [{ front: "ATP?", back: "Energy currency" }] };
        },
      };
    }
    if (path === "/broadcast/generate") {
      return {
        ok: true,
        async json() {
          return { title: "Cell Broadcast", summary: "Overview", sections: [{ title: "Intro", script: "Welcome" }] };
        },
      };
    }
    throw new Error(`Unexpected path ${path}`);
  },
};

const practice = createCompanionPracticeRequester(fakeClient);
const quiz = await practice.generateQuiz(context);
const deck = await practice.generateFlashcards(context);
const broadcast = await practice.generateBroadcast(context);

assert.equal(quiz.questions.length, 1);
assert.equal(deck.cards[0].front, "ATP?");
assert.equal(broadcast.sections[0].title, "Intro");
assert.equal(calls[0].path, "/quiz/generate");
assert.equal(calls[1].path, "/flashcards/generate");
assert.equal(calls[2].path, "/broadcast/generate");

console.log("companion practice client regression passed");
