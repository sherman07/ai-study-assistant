import { API_BASE } from "./apiConfig.js?v=companion-practice-v1";
import { SynapseApiClient } from "./apiClient.js?v=companion-practice-v1";

const practiceApiClient = new SynapseApiClient(API_BASE);

export const COMPANION_TOOL_CATALOG = {
  quiz: {
    id: "quiz",
    icon: "bi-ui-checks-grid",
    label: "Quiz me",
    mode: "chat",
    description: "Generate a quiz from this companion conversation",
  },
  flashcards: {
    id: "flashcards",
    icon: "bi-layers",
    label: "Flashcards",
    mode: "chat",
    description: "Generate flashcards Synapse will send in this chat",
  },
  teachback: {
    id: "teachback",
    icon: "bi-chat-square-quote",
    label: "Teach-back",
    mode: "prompt",
    prompt: "Run a teach-back: ask me to explain the key idea in my own words, then probe weak spots with follow-up questions.",
  },
  keypoints: {
    id: "keypoints",
    icon: "bi-journal-text",
    label: "Key points",
    mode: "prompt",
    prompt: "Summarize the most important points from our chat as a short revision sheet I can skim before an exam.",
  },
  broadcast: {
    id: "broadcast",
    icon: "bi-broadcast",
    label: "AI Broadcast",
    mode: "chat",
    description: "Create an AI study broadcast from what we are studying",
  },
  quiz_from_notes: {
    id: "quiz_from_notes",
    icon: "bi-collection",
    label: "Quiz from notes",
    mode: "notes",
    description: "Generate a quiz from your latest materials and deliver it in chat",
  },
  cards_from_notes: {
    id: "cards_from_notes",
    icon: "bi-collection-play",
    label: "Cards from notes",
    mode: "notes",
    description: "Generate flashcards from your latest materials and deliver them in chat",
  },
};

const ALLOWED_TOOL_IDS = new Set(Object.keys(COMPANION_TOOL_CATALOG));

export function normalizeCompanionSuggestedTools(rawTools = []) {
  const seen = new Set();
  const tools = [];
  for (const item of Array.isArray(rawTools) ? rawTools : []) {
    const id = String(item?.id || item?.tool || item || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (!ALLOWED_TOOL_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    const catalog = COMPANION_TOOL_CATALOG[id];
    tools.push({
      ...catalog,
      label: String(item?.label || catalog.label).trim() || catalog.label,
      reason: String(item?.reason || "").trim().slice(0, 160),
    });
    if (tools.length >= 4) break;
  }
  return tools;
}

export function buildCompanionConversationContext(messages = [], { topic = "", title = "" } = {}) {
  const turns = (Array.isArray(messages) ? messages : [])
    .filter(message => message && (message.role === "user" || message.role === "assistant"))
    .map(message => ({
      role: message.role,
      content: String(message.content || "").replace(/\s+/g, " ").trim(),
    }))
    .filter(message => message.content)
    .slice(-18);

  const transcript = turns
    .map(turn => `${turn.role === "user" ? "Learner" : "Tutor"}: ${turn.content}`)
    .join("\n");

  const resolvedTitle = String(title || topic || "Companion study session").trim().slice(0, 100) || "Companion study session";
  const summary = [
    `Companion conversation focused on: ${resolvedTitle}.`,
    "Use the conversation below as the study material for active recall practice.",
    transcript || "No prior conversation turns were available.",
  ].join("\n\n");

  return {
    title: resolvedTitle,
    summary,
    sections: {
      "Companion conversation": transcript || "No prior conversation turns were available.",
    },
    source_fingerprint: `companion:${resolvedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`,
  };
}

export function readLatestMaterialsContext(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem("synapse.generated.history.v6");
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return null;
    const item = items.find(entry =>
      entry
      && entry.kind !== "companion"
      && !entry.companionThreadId
      && !String(entry.id || "").startsWith("companion:")
      && String(entry.summary || "").trim()
    );
    if (!item) return null;
    return {
      title: String(item.title || "Study notes").trim() || "Study notes",
      summary: String(item.summary || "").trim(),
      sections: item.sections && typeof item.sections === "object" ? item.sections : {},
      source_fingerprint: String(item.sourceFingerprint || item.source_fingerprint || item.id || "").trim(),
      historyId: item.id,
    };
  } catch {
    return null;
  }
}

function normalizeFlashcards(data = {}) {
  const cards = Array.isArray(data.cards) ? data.cards : [];
  return cards
    .map((card, index) => ({
      id: card.id || `card-${index + 1}`,
      front: String(card.front || card.question || "").trim(),
      back: String(card.back || card.answer || "").trim(),
      hint: String(card.hint || "").trim(),
      sourceReference: String(card.source_reference || card.sourceReference || "").trim(),
      difficulty: String(card.difficulty || "medium").trim(),
    }))
    .filter(card => card.front && card.back);
}

function normalizeQuiz(data = {}, fallbackTitle = "Companion Quiz") {
  const questions = Array.isArray(data.questions) ? data.questions : [];
  return {
    title: String(data.title || fallbackTitle).trim() || fallbackTitle,
    examMode: Boolean(data.exam_mode ?? data.examMode),
    questions: questions.map((question, index) => ({
      id: question.id || `q${index + 1}`,
      type: String(question.type || "short_answer").trim(),
      label: String(question.label || question.type || `Question ${index + 1}`).trim(),
      question: String(question.question || question.prompt || `Question ${index + 1}`).trim(),
      options: Array.isArray(question.options) ? question.options.map(option => String(option || "").trim()).filter(Boolean) : [],
      correctOptionIndexes: Array.isArray(question.correct_option_indexes)
        ? question.correct_option_indexes
        : (Array.isArray(question.correctOptionIndexes) ? question.correctOptionIndexes : []),
      correctBoolean: typeof question.correct_boolean === "boolean"
        ? question.correct_boolean
        : (typeof question.correctBoolean === "boolean" ? question.correctBoolean : null),
      expectedAnswer: String(question.expected_answer || question.expectedAnswer || "").trim(),
      explanation: String(question.explanation || "").trim(),
      sourceReference: String(question.source_reference || question.sourceReference || "").trim(),
      difficulty: String(question.difficulty || "medium").trim(),
    })).filter(question => question.question),
  };
}

function normalizeBroadcast(data = {}, fallbackTitle = "Companion Broadcast") {
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const transcript = Array.isArray(data.transcript) ? data.transcript : [];
  return {
    title: String(data.title || fallbackTitle).trim() || fallbackTitle,
    summary: String(data.summary || data.overview || "").trim(),
    sections: sections.map((section, index) => ({
      id: section.id || `section-${index + 1}`,
      title: String(section.title || `Section ${index + 1}`).trim(),
      script: String(section.script || section.narration || section.summary || "").trim(),
    })).filter(section => section.title || section.script),
    transcript: transcript.map((line, index) => ({
      id: line.id || `line-${index + 1}`,
      speaker: String(line.speaker || "Synapse").trim(),
      text: String(line.text || line.content || "").trim(),
    })).filter(line => line.text),
  };
}

export function createCompanionPracticeRequester(apiClient = practiceApiClient) {
  async function postJson(path, body, timeoutMs = 90000) {
    const response = await apiClient.fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      throw new Error(data?.error || `Synapse could not complete ${path}.`);
    }
    return data;
  }

  return {
    async generateQuiz(context, { totalQuestions = 5 } = {}) {
      const data = await postJson("/quiz/generate", {
        title: context.title,
        summary: context.summary,
        sections: context.sections,
        source_fingerprint: context.source_fingerprint,
        preferred_language: "english",
        exam_mode: false,
        total_questions: totalQuestions,
        previous_quiz_count: 0,
        variant_seed: `companion-${Date.now()}`,
      });
      const quiz = normalizeQuiz(data, `${context.title} Quiz`);
      if (!quiz.questions.length) throw new Error("Synapse returned an empty quiz.");
      return quiz;
    },

    async generateFlashcards(context, { cardCount = 6 } = {}) {
      const data = await postJson("/flashcards/generate", {
        title: context.title,
        summary: context.summary,
        sections: context.sections,
        source_fingerprint: context.source_fingerprint,
        preferred_language: "english",
        count_mode: "fixed",
        card_count: cardCount,
      });
      const cards = normalizeFlashcards(data);
      if (!cards.length) throw new Error("Synapse returned no usable flashcards.");
      return {
        title: String(data.title || `${context.title} Flashcards`).trim(),
        cards,
      };
    },

    async generateBroadcast(context, { lengthMinutes = 8 } = {}) {
      const data = await postJson("/broadcast/generate", {
        title: context.title,
        summary: context.summary,
        sections: context.sections,
        source_fingerprint: context.source_fingerprint,
        preferred_language: "english",
        language: "english",
        tone: "clear",
        style: "clear",
        depth: "focused",
        lengthMinutes,
        voiceFormat: "single",
      }, Number(globalThis.window?.SYNAPSE_BROADCAST_TIMEOUT_MS || 180000));
      const broadcast = normalizeBroadcast(data, `${context.title} Broadcast`);
      if (!broadcast.sections.length && !broadcast.transcript.length && !broadcast.summary) {
        throw new Error("Synapse returned an empty broadcast.");
      }
      return broadcast;
    },
  };
}

export const companionPractice = createCompanionPracticeRequester();
