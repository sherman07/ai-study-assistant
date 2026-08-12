const STUDY_TOOL_MEMORY_STORAGE_KEY = "synapse.study.tool.memory.v1";
const STUDY_TOOL_MEMORY_LIMIT = 20;
const STUDY_TOOL_MEMORY_KEYS = new Set(["mindmap", "visualguide", "timeline", "quiz", "flashcards", "broadcast"]);

function studyToolMemoryIdentity(historyId = currentHistoryId, sourceFingerprint = currentSourceFingerprint) {
  const id = String(historyId || "").trim();
  const fingerprint = String(sourceFingerprint || "").trim();
  if (id) return `history:${id}`;
  if (fingerprint) return `fingerprint:${fingerprint}`;
  return "";
}

function getStudyToolMemoryStore() {
  const value = safeReadJSONStorage(STUDY_TOOL_MEMORY_STORAGE_KEY, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cloneStudyToolValue(value, fallback = null) {
  if (value == null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function snapshotStudyToolState() {
  const tools = {};
  if (typeof currentMindMap !== "undefined" && currentMindMap) {
    tools.mindmap = { result: cloneStudyToolValue(currentMindMap) };
  }
  if (typeof currentVisualGuide !== "undefined" && currentVisualGuide) {
    tools.visualguide = { result: cloneStudyToolValue(currentVisualGuide) };
  }
  if (typeof currentTimeline !== "undefined" && currentTimeline?.events?.length) {
    tools.timeline = {
      result: cloneStudyToolValue(currentTimeline),
      completedIds: Array.from(typeof timelineCompletedIds !== "undefined" ? timelineCompletedIds : []),
      practiceAnswers: cloneStudyToolValue(typeof timelinePracticeAnswers !== "undefined" ? timelinePracticeAnswers : {}, {}),
      activeIndex: Number(typeof activeTimelineIndex !== "undefined" ? activeTimelineIndex : 0),
      filter: String(typeof activeTimelineFilter !== "undefined" ? activeTimelineFilter : "all")
    };
  }
  if (typeof currentQuiz !== "undefined" && currentQuiz?.questions?.length) {
    tools.quiz = {
      result: cloneStudyToolValue(currentQuiz),
      answers: cloneStudyToolValue(typeof quizAnswers !== "undefined" ? quizAnswers : {}, {}),
      revealedIds: Array.from(typeof quizRevealedAnswers !== "undefined" ? quizRevealedAnswers : []),
      report: cloneStudyToolValue(typeof quizReport !== "undefined" ? quizReport : null),
      activeIndex: Number(typeof activeQuizQuestionIndex !== "undefined" ? activeQuizQuestionIndex : 0)
    };
  }
  if (typeof currentFlashcards !== "undefined" && Array.isArray(currentFlashcards) && currentFlashcards.length) {
    tools.flashcards = {
      result: cloneStudyToolValue(currentFlashcards, []),
      activeIndex: Number(typeof activeFlashcardIndex !== "undefined" ? activeFlashcardIndex : 0),
      side: String(typeof flashcardSide !== "undefined" ? flashcardSide : "front")
    };
  }
  return tools;
}

function persistStudyToolMemory() {
  const key = studyToolMemoryIdentity();
  if (!key) return false;
  const store = getStudyToolMemoryStore();
  const existing = store[key] && typeof store[key] === "object" ? store[key] : {};
  const nextTools = { ...(existing.tools || {}), ...snapshotStudyToolState() };
  const entry = {
    historyId: String(currentHistoryId || ""),
    sourceFingerprint: String(currentSourceFingerprint || ""),
    activeTool: STUDY_TOOL_MEMORY_KEYS.has(activeTool) ? activeTool : (existing.activeTool || "mindmap"),
    updatedAt: new Date().toISOString(),
    tools: nextTools
  };
  const nextStore = { ...store, [key]: entry };
  const entries = Object.entries(nextStore)
    .sort(([, left], [, right]) => Date.parse(right?.updatedAt || 0) - Date.parse(left?.updatedAt || 0))
    .slice(0, STUDY_TOOL_MEMORY_LIMIT);
  return safeWriteJSONStorage(STUDY_TOOL_MEMORY_STORAGE_KEY, Object.fromEntries(entries));
}

function rememberActiveStudyTool(toolName = activeTool) {
  const key = studyToolMemoryIdentity();
  if (!key || !STUDY_TOOL_MEMORY_KEYS.has(toolName)) return false;
  const store = getStudyToolMemoryStore();
  const existing = store[key] && typeof store[key] === "object" ? store[key] : {};
  store[key] = {
    ...existing,
    historyId: String(currentHistoryId || ""),
    sourceFingerprint: String(currentSourceFingerprint || ""),
    activeTool: toolName,
    updatedAt: new Date().toISOString()
  };
  return safeWriteJSONStorage(STUDY_TOOL_MEMORY_STORAGE_KEY, store);
}

function restoreStudyToolMemory() {
  const key = studyToolMemoryIdentity();
  if (!key) return null;
  const memory = getStudyToolMemoryStore()[key];
  if (!memory || typeof memory !== "object") return null;
  const tools = memory.tools && typeof memory.tools === "object" ? memory.tools : {};
  const mindmap = tools.mindmap?.result;
  const visualguide = tools.visualguide?.result;
  const timeline = tools.timeline;
  const quiz = tools.quiz;
  const flashcards = tools.flashcards;
  if (mindmap) currentMindMap = cloneStudyToolValue(mindmap);
  if (visualguide) currentVisualGuide = cloneStudyToolValue(visualguide);
  if (timeline?.result) {
    currentTimeline = cloneStudyToolValue(timeline.result);
    timelineCompletedIds = new Set(Array.isArray(timeline.completedIds) ? timeline.completedIds : []);
    timelinePracticeAnswers = cloneStudyToolValue(timeline.practiceAnswers, {});
    activeTimelineIndex = Number.isFinite(Number(timeline.activeIndex)) ? Number(timeline.activeIndex) : 0;
    activeTimelineFilter = String(timeline.filter || "all");
  }
  if (quiz?.result) {
    currentQuiz = cloneStudyToolValue(quiz.result);
    quizAnswers = cloneStudyToolValue(quiz.answers, {});
    quizRevealedAnswers = new Set(Array.isArray(quiz.revealedIds) ? quiz.revealedIds : []);
    quizReport = cloneStudyToolValue(quiz.report);
    activeQuizQuestionIndex = Number.isFinite(Number(quiz.activeIndex)) ? Number(quiz.activeIndex) : 0;
  }
  if (Array.isArray(flashcards?.result) && flashcards.result.length) {
    currentFlashcards = cloneStudyToolValue(flashcards.result, []);
    activeFlashcardIndex = Number.isFinite(Number(flashcards.activeIndex)) ? Number(flashcards.activeIndex) : 0;
    flashcardSide = flashcards.side === "back" ? "back" : "front";
  }
  return memory;
}

function getRememberedStudyTool() {
  const key = studyToolMemoryIdentity();
  const memory = key ? getStudyToolMemoryStore()[key] : null;
  return STUDY_TOOL_MEMORY_KEYS.has(memory?.activeTool) ? memory.activeTool : "mindmap";
}

function deleteStudyToolMemory(historyId = "", sourceFingerprint = "") {
  const store = getStudyToolMemoryStore();
  // Delete both identity forms so fingerprint-only leftovers cannot resurrect
  // quiz/timeline/flashcard UI after a note with a history id is removed.
  const keys = new Set();
  const id = String(historyId || "").trim();
  const fingerprint = String(sourceFingerprint || "").trim();
  if (id) keys.add(`history:${id}`);
  if (fingerprint) keys.add(`fingerprint:${fingerprint}`);
  const combined = studyToolMemoryIdentity(historyId, sourceFingerprint);
  if (combined) keys.add(combined);
  keys.forEach(key => delete store[key]);
  return safeWriteJSONStorage(STUDY_TOOL_MEMORY_STORAGE_KEY, store);
}

window.addEventListener("pagehide", () => persistStudyToolMemory());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persistStudyToolMemory();
});
