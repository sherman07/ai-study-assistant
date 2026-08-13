const MEMORY_ENGINE_STORAGE_KEY = "synapse.memory.engine.v1";
const MEMORY_ENGINE_LEGACY_KEY = "synapse.mastery.graph.progress.v1";
const MEMORY_ACTIVITY_LIMIT = 300;
let activeMemoryFilter = "due";
let examReadinessGeneratedForNoteKey = "";

function generateExamReadiness() {
  if (!fullSummary || !fullSummary.trim()) {
    alert("Generate notes first, then diagnose exam readiness.");
    return;
  }
  examReadinessGeneratedForNoteKey = getMemoryEngineNoteKey();
  if (typeof recordStudyActivity === "function") recordStudyActivity("exam_readiness_generated", {
    tool: "masterygraph",
    label: "Generated Exam Readiness",
    metadata: { cost: 0, local: true }
  });
  switchTool("masterygraph");
  renderMasteryGraphPanel();
}

function examReadinessIsGenerated() {
  return examReadinessGeneratedForNoteKey === getMemoryEngineNoteKey();
}

function clampMemoryPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeMemoryText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_/|:;,.()[\]{}'"`~!?@#$%^&*+=<>-]+/g, " ")
    .trim();
}

function memoryTextMatchesSection(text, sectionTitle) {
  const haystack = normalizeMemoryText(text);
  const needle = normalizeMemoryText(sectionTitle);
  if (!haystack || !needle) return false;
  if (haystack.includes(needle) || needle.includes(haystack)) return true;
  const importantWords = needle.split(/\s+/).filter(word => word.length > 4).slice(0, 4);
  return importantWords.length >= 2 && importantWords.every(word => haystack.includes(word));
}

function getMemoryEngineNoteKey() {
  return currentHistoryId
    || currentSourceFingerprint
    || currentPrimarySourceIdentity
    || normalizeMemoryText(storedTitle || fullSummary).slice(0, 96)
    || "current-note";
}

function getMemoryEngineStore() {
  const parsed = safeReadJSONStorage(MEMORY_ENGINE_STORAGE_KEY, null);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  const legacy = safeReadJSONStorage(MEMORY_ENGINE_LEGACY_KEY, {});
  return legacy && typeof legacy === "object" && !Array.isArray(legacy) ? legacy : {};
}

function setMemoryEngineStore(store) {
  safeWriteJSONStorage(MEMORY_ENGINE_STORAGE_KEY, store || {});
}

function getMemoryEngineNoteRecord() {
  const store = getMemoryEngineStore();
  const noteKey = getMemoryEngineNoteKey();
  const record = store[noteKey];
  return record && typeof record === "object" && !Array.isArray(record)
    ? record
    : { cards: {}, sections: {} };
}

function setMemoryEngineNoteRecord(record) {
  const store = getMemoryEngineStore();
  const noteKey = getMemoryEngineNoteKey();
  store[noteKey] = {
    ...(record || {}),
    title: storedTitle || record?.title || "Study Notes",
    sourceFingerprint: currentSourceFingerprint || record?.sourceFingerprint || "",
    updatedAt: new Date().toISOString()
  };
  setMemoryEngineStore(store);
}

function deleteMemoryEngineNote(historyId = "", sourceFingerprint = "") {
  const store = getMemoryEngineStore();
  [historyId, sourceFingerprint].map(value => String(value || "").trim()).filter(Boolean).forEach(key => {
    delete store[key];
  });
  setMemoryEngineStore(store);
}

const STUDY_ACTIVITY_LABELS = {
  notes_opened: "Opened generated notes",
  tool_opened: "Opened study tool",
  section_opened: "Opened note section",
  notes_ready: "Generated notes ready",
  notes_translated: "Translated generated notes",
  notes_exported: "Exported generated notes",
  source_opened: "Opened source evidence",
  mindmap_point_opened: "Opened mind map detail",
  exam_readiness_generated: "Generated Exam Readiness",
  broadcast_generation_started: "Started AI Broadcast generation",
  study_path_generated: "Generated Study Path",
  study_path_task_opened: "Opened Study Path task",
  study_path_answered: "Answered Study Path question",
  study_path_task_completed: "Completed Study Path task",
  study_path_task_reopened: "Reopened Study Path task",
  quiz_generated: "Generated quiz",
  quiz_answered: "Answered quiz question",
  quiz_answer_revealed: "Revealed quiz answer",
  quiz_submitted: "Submitted quiz",
  flashcards_generated: "Generated flashcards",
  flashcard_opened: "Opened flashcard",
  flashcard_flipped: "Flipped flashcard",
  flashcard_graded: "Graded flashcard",
  flashcard_activity_started: "Started flashcard activity",
  flashcard_match_completed: "Completed flashcard match",
  visual_guide_generated: "Generated Image Guide",
  visual_guide_opened: "Opened Image Guide panel",
  broadcast_generated: "Generated AI Broadcast",
  broadcast_opened: "Opened AI Broadcast",
  broadcast_started: "Started AI Broadcast",
  broadcast_completed: "Completed AI Broadcast",
  tutor_started: "Started Voice Tutor",
  tutor_message: "Asked Voice Tutor",
  memory_reviewed: "Marked topic reviewed",
  recall_checked: "Checked recall answer",
  review_scheduled: "Scheduled spaced review"
};

function getStudyActivityLabel(kind, fallback = "Study action") {
  return STUDY_ACTIVITY_LABELS[kind] || fallback;
}

function cleanStudyActivityMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, 8).map(([key, item]) => {
    if (typeof item === "number" || typeof item === "boolean") return [key, item];
    return [key, String(item || "").slice(0, 180)];
  }));
}

function recordStudyActivity(kind, details = {}) {
  const cleanKind = String(kind || "").trim().slice(0, 80);
  const key = getMemoryEngineNoteKey();
  if (!cleanKind || !key) return null;
  const record = getMemoryEngineNoteRecord();
  const activities = Array.isArray(record.activities) ? record.activities : [];
  const now = new Date().toISOString();
  const sectionTitle = String(details.sectionTitle || details.section || "").trim().slice(0, 180);
  const tool = String(details.tool || activeTool || "workspace").trim().slice(0, 40);
  const last = activities[0];
  const lastTime = last?.at ? Date.parse(last.at) : 0;
  const nowTime = Date.parse(now);
  if (last && last.kind === cleanKind && last.sectionTitle === sectionTitle && nowTime - lastTime < 900) {
    return last;
  }
  const activity = {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: cleanKind,
    label: String(details.label || getStudyActivityLabel(cleanKind)).trim().slice(0, 180),
    tool,
    sectionTitle,
    status: String(details.status || "completed").trim().slice(0, 40),
    at: now,
    metadata: cleanStudyActivityMetadata(details.metadata)
  };
  record.activities = [activity, ...activities].slice(0, MEMORY_ACTIVITY_LIMIT);
  setMemoryEngineNoteRecord(record);
  return activity;
}

function getStudyActivityList(limit = MEMORY_ACTIVITY_LIMIT) {
  const record = getMemoryEngineNoteRecord();
  return (Array.isArray(record.activities) ? record.activities : [])
    .filter(item => item && typeof item === "object" && item.kind && item.at)
    .slice(0, Math.max(1, Number(limit) || MEMORY_ACTIVITY_LIMIT));
}

function formatStudyActivityTime(value) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return "recently";
  const delta = Math.max(0, Date.now() - time);
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h ago`;
  return new Date(time).toLocaleDateString([], { month: "short", day: "numeric" });
}

function getStudyActivitySummary() {
  const activities = getStudyActivityList();
  const byTool = activities.reduce((counts, activity) => {
    const tool = activity.tool || "workspace";
    counts[tool] = (counts[tool] || 0) + 1;
    return counts;
  }, {});
  const completedKinds = new Set([
    "study_path_task_completed",
    "quiz_submitted",
    "recall_checked",
    "flashcard_match_completed",
    "flashcard_graded",
    "broadcast_generated",
    "visual_guide_generated",
    "flashcards_generated",
    "quiz_generated",
    "study_path_generated"
  ]);
  return {
    total: activities.length,
    completedTasks: activities.filter(activity => completedKinds.has(activity.kind)).length,
    toolsUsed: Object.keys(byTool).length,
    byTool,
    lastAt: activities[0]?.at || "",
    recent: activities.slice(0, 8)
  };
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + Number(days || 0));
  return copy;
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function formatDueDate(value) {
  if (!value) return "due now";
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "due now";
  const today = startOfToday();
  const diff = Math.round((due.setHours(0, 0, 0, 0) - today.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "due today";
  if (diff === 1) return "due tomorrow";
  return `due in ${diff} days`;
}

function extractMemoryKeywords(title, text, limit = 7) {
  const stop = new Set([
    "about", "after", "again", "also", "because", "between", "could", "every", "first", "from", "have",
    "into", "more", "most", "note", "notes", "only", "other", "section", "source", "study", "that",
    "their", "there", "these", "this", "those", "through", "used", "using", "very", "what", "when",
    "where", "which", "while", "with", "would", "your"
  ]);
  const source = `${title} ${text}`.replace(/\b[A-Z]{2,}\b/g, match => match.toLowerCase());
  const words = source
    .toLowerCase()
    .match(/[a-z][a-z0-9-]{3,}/g) || [];
  const counts = new Map();
  words.forEach(word => {
    const clean = word.replace(/^-+|-+$/g, "");
    if (!clean || stop.has(clean) || /^\d+$/.test(clean)) return;
    counts.set(clean, (counts.get(clean) || 0) + 1);
  });
  const titleWords = normalizeMemoryText(title).split(/\s+/).filter(word => word.length > 3);
  titleWords.forEach(word => counts.set(word, (counts.get(word) || 0) + 4));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function getMemoryCardRecord(title) {
  const record = getMemoryEngineNoteRecord();
  const existing = record.cards?.[title] || record.sections?.[title] || {};
  const todayIso = startOfToday().toISOString();
  return {
    intervalDays: Number(existing.intervalDays || 0),
    ease: Number(existing.ease || 2.3),
    reps: Number(existing.reps || 0),
    lapses: Number(existing.lapses || 0),
    attempts: Number(existing.attempts || 0),
    streak: Number(existing.streak || 0),
    opened: Number(existing.opened || 0),
    reviewed: Number(existing.reviewed || 0),
    practice: Number(existing.practice || 0),
    path: Number(existing.path || 0),
    quiz: Number(existing.quiz || 0),
    tutor: Number(existing.tutor || 0),
    lastScore: Number(existing.lastScore || 0),
    lastAnswer: String(existing.lastAnswer || ""),
    lastFeedback: existing.lastFeedback || null,
    status: existing.status || "new",
    difficulty: existing.difficulty || "learning",
    dueAt: existing.dueAt || todayIso,
    updatedAt: existing.updatedAt || "",
    createdAt: existing.createdAt || todayIso
  };
}

function setMemoryCardRecord(title, patch = {}) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return;
  const record = getMemoryEngineNoteRecord();
  const existing = getMemoryCardRecord(cleanTitle);
  record.cards = {
    ...(record.cards || {}),
    [cleanTitle]: {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString()
    }
  };
  setMemoryEngineNoteRecord(record);
}

function incrementMemoryCard(title, field, amount = 1, max = 100) {
  const card = getMemoryCardRecord(title);
  const current = Number(card[field] || 0);
  setMemoryCardRecord(title, { [field]: Math.min(max, current + amount) });
}

function findMemorySectionTitle(value) {
  const text = String(value || "");
  return Object.keys(sections || {}).find(title => memoryTextMatchesSection(text, title)) || "";
}

function getTimelineMemoryProgress(sectionTitle = "") {
  const events = Array.isArray(currentTimeline?.events) ? currentTimeline.events : [];
  if (!events.length) return { done: 0, total: 0, percent: 0 };
  const matched = sectionTitle
    ? events.filter(event => memoryTextMatchesSection([
      event.title,
      event.section,
      event.summary,
      event.task,
      event.detail,
      event.evidence,
      event.masteryCheck
    ].join(" "), sectionTitle))
    : events;
  const scoped = matched.length ? matched : events;
  const done = scoped.filter(event => timelineCompletedIds.has(String(event.id))).length;
  return { done, total: scoped.length, percent: scoped.length ? Math.round((done / scoped.length) * 100) : 0 };
}

function getQuizMemoryProgress() {
  const questions = Array.isArray(currentQuiz?.questions) ? currentQuiz.questions : [];
  if (!questions.length) return { answered: 0, total: 0, percent: 0, label: "No quiz yet" };
  const answered = questions.filter(question => isQuizAnswered(question)).length;
  const objectivePercent = Number(quizReport?.objectivePercent);
  return {
    answered,
    total: questions.length,
    percent: Number.isFinite(objectivePercent) ? clampMemoryPercent(objectivePercent) : Math.round((answered / questions.length) * 70),
    label: Number.isFinite(objectivePercent) ? `${quizReport.objectivePercent}% graded` : `${answered}/${questions.length} answered`
  };
}

function getVoiceTutorMemoryProgress() {
  return clampMemoryPercent(Number(voiceTutorLastState?.mastery || 0));
}

function getMemoryBranch(title) {
  const data = getMindMapData(currentMindMap);
  return (data.branches || []).find(branch =>
    memoryTextMatchesSection(branch.section || "", title) || memoryTextMatchesSection(branch.label || "", title)
  ) || null;
}

