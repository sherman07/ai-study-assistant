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

function buildMemoryCards() {
  return Object.entries(sections || {})
    .filter(([title, text]) => title && String(text || "").trim())
    .slice(0, 16)
    .map(([title, text]) => {
      const branch = getMemoryBranch(title);
      const points = Array.isArray(branch?.points) ? branch.points : [];
      const timeline = getTimelineMemoryProgress(title);
      const card = getMemoryCardRecord(title);
      const quiz = getQuizMemoryProgress();
      const tutor = getVoiceTutorMemoryProgress();
      const keywords = extractMemoryKeywords(title, text);
      const dueAt = new Date(card.dueAt);
      const isDue = !card.dueAt || Number.isNaN(dueAt.getTime()) || dueAt <= addDays(new Date(), 0.99);
      const actionScore = Math.min(44,
        card.opened * 3
        + card.reviewed * 9
        + card.practice * 7
        + card.path * 7
        + card.quiz * 7
        + card.tutor * 4
      );
      const evidenceScore = Math.min(20, 8 + points.length * 3 + Math.round(String(text).split(/\s+/).length / 90));
      const scheduleScore = Math.min(22, card.streak * 8 + Math.min(10, card.intervalDays * 1.5));
      const timelineScore = timeline.total ? Math.round(timeline.percent * 0.14) : 0;
      const quizScore = quiz.total ? Math.round(quiz.percent * 0.1) : 0;
      const tutorScore = Math.round(tutor * 0.06);
      const score = clampMemoryPercent(Math.max(card.lastScore, evidenceScore + actionScore + scheduleScore + timelineScore + quizScore + tutorScore));
      const missed = card.status === "missed" || card.lapses > 0 || (card.attempts > 0 && card.lastScore < 65);
      const difficulty = missed
        ? "repair"
        : score >= 85
          ? "harder"
          : score >= 65
            ? "standard"
            : "learning";
      return {
        title,
        text,
        card,
        score,
        keywords,
        points,
        timeline,
        isDue,
        missed,
        dueLabel: formatDueDate(card.dueAt),
        difficulty,
        prompt: `Explain ${title} from memory. Include the cause, evidence, example, and one likely mistake.`
      };
    })
    .sort((a, b) => {
      if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
      if (a.missed !== b.missed) return a.missed ? -1 : 1;
      return a.score - b.score;
    });
}

function getVisibleMemoryCards(cards) {
  if (activeMemoryFilter === "missed") return cards.filter(card => card.missed);
  if (activeMemoryFilter === "all") return cards;
  return cards.filter(card => card.isDue || card.missed);
}

function gradeMemoryAnswer(card, answer) {
  const normalized = normalizeMemoryText(answer);
  const words = normalized ? normalized.split(/\s+/).filter(Boolean) : [];
  const matched = card.keywords.filter(keyword => normalized.includes(normalizeMemoryText(keyword)));
  const missing = card.keywords.filter(keyword => !matched.includes(keyword)).slice(0, 5);
  let score = 0;
  score += Math.min(35, words.length * 1.5);
  score += card.keywords.length ? Math.round((matched.length / card.keywords.length) * 45) : 20;
  if (/\bbecause\b|\btherefore\b|\bso\b|\bmeans\b|\bshows\b|\bevidence\b|\bexample\b/i.test(answer)) score += 12;
  if (words.length >= 45) score += 8;
  score = clampMemoryPercent(score);
  const whyWrong = [];
  if (words.length < 28) whyWrong.push("Answer is too short for durable recall.");
  if (missing.length) whyWrong.push(`Missing key ideas: ${missing.join(", ")}.`);
  if (!/\bbecause\b|\btherefore\b|\bevidence\b|\bexample\b|\bshows\b/i.test(answer)) {
    whyWrong.push("Add a because/example/evidence sentence, not just a definition.");
  }
  if (!whyWrong.length) whyWrong.push("Strong recall. Increase difficulty next time.");
  return {
    score,
    matched,
    missing,
    whyWrong,
    grade: score >= 85 ? "easy" : score >= 70 ? "good" : score >= 50 ? "hard" : "again"
  };
}

function scheduleMemoryReview(title, grade, score = null) {
  const card = getMemoryCardRecord(title);
  const normalizedGrade = ["again", "hard", "good", "easy"].includes(grade) ? grade : "hard";
  const next = {
    attempts: card.attempts + 1,
    lastScore: score === null ? card.lastScore : clampMemoryPercent(score),
    status: normalizedGrade === "again" ? "missed" : "reviewed",
    difficulty: normalizedGrade === "easy" ? "harder" : normalizedGrade === "again" ? "repair" : "standard"
  };
  if (normalizedGrade === "again") {
    next.intervalDays = 0;
    next.ease = Math.max(1.3, card.ease - 0.22);
    next.lapses = card.lapses + 1;
    next.streak = 0;
    next.dueAt = addDays(new Date(), 0).toISOString();
  } else if (normalizedGrade === "hard") {
    next.intervalDays = Math.max(1, Math.round(Math.max(1, card.intervalDays) * 1.2));
    next.ease = Math.max(1.5, card.ease - 0.08);
    next.streak = card.streak + 1;
    next.dueAt = addDays(new Date(), next.intervalDays).toISOString();
  } else if (normalizedGrade === "good") {
    next.intervalDays = card.reps ? Math.max(2, Math.round(Math.max(1, card.intervalDays) * card.ease)) : 2;
    next.ease = Math.min(2.8, card.ease + 0.04);
    next.streak = card.streak + 1;
    next.dueAt = addDays(new Date(), next.intervalDays).toISOString();
  } else {
    next.intervalDays = card.reps ? Math.max(4, Math.round(Math.max(2, card.intervalDays) * (card.ease + 0.45))) : 4;
    next.ease = Math.min(3.1, card.ease + 0.12);
    next.streak = card.streak + 1;
    next.dueAt = addDays(new Date(), next.intervalDays).toISOString();
  }
  next.reps = card.reps + 1;
  setMemoryCardRecord(title, next);
  recordStudyActivity("review_scheduled", {
    tool: "masterygraph",
    sectionTitle: title,
    label: `${normalizedGrade === "again" ? "Repair" : "Scheduled"} review for ${title}`,
    metadata: { grade: normalizedGrade, score: next.lastScore, intervalDays: next.intervalDays }
  });
  renderMasteryGraphPanel();
}

function checkMemoryRecallAnswer(sectionTitle) {
  const card = buildMemoryCards().find(item => item.title === sectionTitle);
  const input = Array.from(document.querySelectorAll("[data-memory-answer]"))
    .find(element => element.getAttribute("data-memory-answer") === sectionTitle);
  if (!card || !input) return;
  const answer = input.value || "";
  const feedback = gradeMemoryAnswer(card, answer);
  setMemoryCardRecord(sectionTitle, {
    lastAnswer: answer,
    lastFeedback: feedback,
    lastScore: feedback.score,
    status: feedback.score >= 70 ? "checked" : "missed",
    attempts: getMemoryCardRecord(sectionTitle).attempts + 1
  });
  recordStudyActivity("recall_checked", {
    tool: "masterygraph",
    sectionTitle,
    label: `Checked recall for ${sectionTitle}`,
    metadata: { score: feedback.score, grade: feedback.grade, answerLength: answer.trim().length }
  });
  renderMasteryGraphPanel();
}

function recordMasterySectionOpen(sectionTitle) {
  if (!sectionTitle || !sections[sectionTitle]) return;
  incrementMemoryCard(sectionTitle, "opened", 1, 6);
  if (activeTool === "masterygraph") renderMasteryGraphPanel();
}

function markMasteryGraphSectionReviewed(sectionTitle) {
  if (!sectionTitle || !sections[sectionTitle]) return;
  incrementMemoryCard(sectionTitle, "reviewed", 1, 5);
  recordStudyActivity("memory_reviewed", { tool: "masterygraph", sectionTitle });
  scheduleMemoryReview(sectionTitle, "good", Math.max(70, getMemoryCardRecord(sectionTitle).lastScore || 70));
}

function practiceMasteryGraphSection(sectionTitle) {
  if (!sectionTitle || !sections[sectionTitle]) return;
  incrementMemoryCard(sectionTitle, "practice", 1, 8);
  activeMemoryFilter = "due";
  renderMasteryGraphPanel();
  const target = Array.from(document.querySelectorAll("[data-memory-card]"))
    .find(element => element.getAttribute("data-memory-card") === sectionTitle);
  target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
}

function recordMasteryGraphPathProgress(sectionTitle) {
  const resolved = sections[sectionTitle] ? sectionTitle : findMemorySectionTitle(sectionTitle);
  if (!resolved) return;
  incrementMemoryCard(resolved, "path", 1, 6);
  if (activeTool === "masterygraph") renderMasteryGraphPanel();
}

function recordMasteryGraphQuizProgress() {
  const questions = Array.isArray(currentQuiz?.questions) ? currentQuiz.questions : [];
  if (!questions.length) return;
  const reportRows = Array.isArray(quizReport?.rows) ? quizReport.rows : [];
  const candidates = reportRows.length
    ? reportRows.map(row => ({ question: row.question, grade: row.grade }))
    : questions.filter(question => isQuizAnswered(question)).map(question => ({ question, grade: { correct: true } }));
  candidates.forEach(({ question, grade }) => {
    const title = findMemorySectionTitle([
      question.sourceReference,
      question.question,
      question.explanation,
      question.answer
    ].join(" "));
    if (!title) return;
    if (grade?.correct === false) {
      incrementMemoryCard(title, "practice", 1, 8);
      setMemoryCardRecord(title, { status: "missed", lapses: getMemoryCardRecord(title).lapses + 1, dueAt: new Date().toISOString() });
    } else if (grade?.answered !== false) {
      incrementMemoryCard(title, "quiz", 1, 6);
    }
  });
  if (activeTool === "masterygraph") renderMasteryGraphPanel();
}

function setMemoryFilter(filter) {
  activeMemoryFilter = ["due", "missed", "all"].includes(filter) ? filter : "due";
  renderMasteryGraphPanel();
}

function openMasteryGraphSection(title, options = {}) {
  const resolvedTitle = String(title || "");
  if (!resolvedTitle || !sections[resolvedTitle]) return;
  renderSectionNotes(resolvedTitle, { countMasteryOpen: options.countOpen !== false });
  document.querySelectorAll(".section-btn").forEach(button => {
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent.trim();
    button.classList.toggle("active", label === resolvedTitle);
  });
  const target = summaryContent?.closest(".brainstorm-card") || summaryContent;
  if (options.scroll !== false) target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

function renderMemoryStat(label, value, icon) {
  return `
    <div class="memory-stat">
      <i class="bi ${escapeAttr(icon)}"></i>
      <div>
        <strong>${escapeHTML(value)}</strong>
        <span>${escapeHTML(label)}</span>
      </div>
    </div>
  `;
}

function renderMemoryFeedback(card) {
  const feedback = card.card.lastFeedback;
  if (!feedback) return "";
  const actions = [
    ["again", "Again"],
    ["hard", "Hard"],
    ["good", "Good"],
    ["easy", "Easy"]
  ].map(([grade, label]) => `
    <button type="button" onclick="scheduleMemoryReview('${escapeAttr(card.title)}', '${grade}', ${clampMemoryPercent(feedback.score)})">
      ${label}
    </button>
  `).join("");
  return `
    <div class="memory-feedback ${feedback.score >= 70 ? "good" : "missed"}">
      <div class="memory-feedback-top">
        <strong>${feedback.score}% recall</strong>
        <span>${feedback.score >= 70 ? "Keep spacing it." : "Repair this memory before moving on."}</span>
      </div>
      <ul>
        ${feedback.whyWrong.map(item => `<li>${escapeHTML(item)}</li>`).join("")}
      </ul>
      <div class="memory-grade-actions">${actions}</div>
    </div>
  `;
}

function renderMemoryCard(card) {
  const statusClass = card.missed ? "missed" : card.isDue ? "due" : "scheduled";
  return `
    <article class="memory-review-card ${statusClass}" data-memory-card="${escapeAttr(card.title)}">
      <div class="memory-card-head">
        <div>
          <span class="memory-chip">${escapeHTML(card.dueLabel)}</span>
          <span class="memory-chip soft">${escapeHTML(card.difficulty)}</span>
        </div>
        <strong>${card.score}%</strong>
      </div>
      <h5>${escapeHTML(card.title)}</h5>
      <p>${escapeHTML(card.prompt)}</p>
      <div class="memory-keywords">
        ${card.keywords.slice(0, 6).map(keyword => `<span>${escapeHTML(keyword)}</span>`).join("")}
      </div>
      <textarea data-memory-answer="${escapeAttr(card.title)}" placeholder="Type your recall answer before checking...">${escapeHTML(card.card.lastAnswer || "")}</textarea>
      ${renderMemoryFeedback(card)}
      <div class="memory-card-actions">
        <button type="button" onclick="checkMemoryRecallAnswer('${escapeAttr(card.title)}')">
          <i class="bi bi-check2-circle me-1"></i>Check answer
        </button>
        <button type="button" onclick="openMasteryGraphSection('${escapeAttr(card.title)}')">Open notes</button>
        <button type="button" onclick="scheduleMemoryReview('${escapeAttr(card.title)}', 'again')">Missed only</button>
      </div>
    </article>
  `;
}

function renderMemoryTopicRow(card) {
  return `
    <button class="memory-topic-row" type="button" onclick="practiceMasteryGraphSection('${escapeAttr(card.title)}')">
      <span>
        <strong>${escapeHTML(card.title)}</strong>
        <small>${card.card.reps} reviews · ${card.card.lapses} misses · ${escapeHTML(card.dueLabel)}</small>
      </span>
      <b>${card.score}%</b>
    </button>
  `;
}

function getExamReadinessState(cards = buildMemoryCards()) {
  const dueCards = cards.filter(card => card.isDue || card.missed);
  const missedCards = cards.filter(card => card.missed);
  const weakCards = cards.slice().sort((a, b) => a.score - b.score).slice(0, 3);
  const average = cards.length ? clampMemoryPercent(cards.reduce((sum, card) => sum + card.score, 0) / cards.length) : 0;
  const quiz = getQuizMemoryProgress();
  const timeline = getTimelineMemoryProgress();
  const activity = getStudyActivitySummary();
  let nextAction = "Generate notes, then Synapse will diagnose your exam readiness.";
  if (missedCards.length) {
    nextAction = `Repair "${missedCards[0].title}" first. It is your highest-friction missed concept.`;
  } else if (dueCards.length) {
    nextAction = `Review "${dueCards[0].title}" now, then check it with one recall answer.`;
  } else if (!timeline.total) {
    nextAction = "Generate a Study Path to turn these notes into exam-focused tasks.";
  } else if (!quiz.total) {
    nextAction = "Generate a Quiz to expose weak spots and update this readiness score.";
  } else if (average < 75) {
    nextAction = `Start with "${weakCards[0]?.title || "your weakest topic"}" and answer from memory before rereading.`;
  } else {
    nextAction = "Keep spacing reviews and use harder quiz questions to test exam readiness.";
  }
  return {
    average,
    dueCount: dueCards.length,
    missedCount: missedCards.length,
    weakCards,
    nextAction,
    quiz,
    timeline,
    activity
  };
}

function renderStudyActivityLedger(activity = getStudyActivitySummary()) {
  const recent = activity.recent.length
    ? activity.recent.map(item => `
      <li class="study-activity-item">
        <span class="study-activity-icon" aria-hidden="true"><i class="bi ${escapeAttr(item.kind.includes("quiz") ? "bi-patch-question" : item.kind.includes("broadcast") ? "bi-broadcast" : item.kind.includes("flashcard") ? "bi-card-text" : item.kind.includes("path") ? "bi-signpost-split" : item.kind.includes("tutor") ? "bi-mic" : "bi-check2-circle")}"></i></span>
        <span class="study-activity-copy">
          <strong>${escapeHTML(item.label || getStudyActivityLabel(item.kind))}</strong>
          <small>${escapeHTML(item.sectionTitle || item.tool || "Study workspace")} · ${escapeHTML(formatStudyActivityTime(item.at))}</small>
        </span>
        <span class="study-activity-status ${item.status === "error" ? "is-error" : ""}">${escapeHTML(item.status || "done")}</span>
      </li>
    `).join("")
    : `<li class="study-activity-empty"><i class="bi bi-activity"></i><span>Your study actions will appear here as you work through this material.</span></li>`;
  return `
    <section class="study-activity-panel" aria-labelledby="studyActivityHeading">
      <div class="study-activity-head">
        <div>
          <h5 id="studyActivityHeading">Study activity</h5>
          <p>Detailed progress for this note, saved on this device.</p>
        </div>
        <div class="study-activity-summary" aria-label="Study activity totals">
          <strong>${activity.total}</strong><span>actions tracked</span>
        </div>
      </div>
      <div class="study-activity-metrics">
        <span><strong>${activity.completedTasks}</strong> completed tasks</span>
        <span><strong>${activity.toolsUsed}</strong> tools used</span>
        <span>Last active <strong>${escapeHTML(formatStudyActivityTime(activity.lastAt))}</strong></span>
      </div>
      <ol class="study-activity-list">${recent}</ol>
    </section>
  `;
}

function renderExamReadinessSummary(cards = buildMemoryCards()) {
  const state = getExamReadinessState(cards);
  const weakTopics = state.weakCards.length
    ? state.weakCards.map(card => `<span>${escapeHTML(card.title)} · ${card.score}%</span>`).join("")
    : "<span>No weak topics yet</span>";
  return `
    <section class="exam-readiness-summary-card">
      <div class="readiness-score" style="--memory-score:${state.average}%">
        <strong>${state.average}%</strong>
        <span>ready</span>
      </div>
      <div class="readiness-body">
        <div class="timeline-kicker">Exam Readiness</div>
        <h3>${escapeHTML(storedTitle || "Current study material")}</h3>
        <p class="readiness-next-action"><strong>recommended next action:</strong> ${escapeHTML(state.nextAction)}</p>
        <div class="readiness-metrics" aria-label="Exam readiness signals">
          <span>${state.dueCount} due review${state.dueCount === 1 ? "" : "s"}</span>
          <span>${state.missedCount} missed concept${state.missedCount === 1 ? "" : "s"}</span>
          <span>${state.quiz.label}</span>
          <span>${state.timeline.done}/${state.timeline.total || 0} path tasks</span>
          <span>${state.activity.completedTasks} completed task${state.activity.completedTasks === 1 ? "" : "s"}</span>
        </div>
        <div class="readiness-weak-topics">
          <strong>Weak topics</strong>
          <div>${weakTopics}</div>
        </div>
      </div>
    </section>
  `;
}

function updateExamReadinessSummary(cards = buildMemoryCards()) {
  const target = document.getElementById("examReadinessSummary");
  if (!target) return;
  const hasNotes = Boolean(fullSummary && fullSummary.trim() && cards.length);
  target.classList.toggle("d-none", !hasNotes);
  target.innerHTML = hasNotes ? renderExamReadinessSummary(cards) : "";
}

function renderMasteryGraphPanel() {
  const panel = document.getElementById("masteryGraphPanelContent");
  if (!panel) return;
  const hasNotes = Boolean(fullSummary && fullSummary.trim());

  if (!hasNotes) {
    updateExamReadinessSummary([]);
    panel.innerHTML = renderStudyToolLaunch({
      tool: "masterygraph",
      iconClass: "bi-repeat",
      title: "Generate exam readiness",
      description: "Generate notes first, then diagnose weak topics and build a spaced-repetition review queue.",
      action: "generateExamReadiness()",
      actionLabel: "Generate exam readiness",
      hasNotes: false,
      kicker: "Personal readiness check"
    });
    return;
  }

  if (!examReadinessIsGenerated()) {
    updateExamReadinessSummary([]);
    panel.innerHTML = renderStudyToolLaunch({
      tool: "masterygraph",
      iconClass: "bi-repeat",
      title: "Generate exam readiness",
      description: "See what is due, repair missed topics, and get a focused next action from your current study history.",
      action: "generateExamReadiness()",
      actionLabel: "Generate exam readiness",
      hasNotes: true,
      kicker: "Personal readiness check"
    });
    return;
  }

  const cards = buildMemoryCards();
  updateExamReadinessSummary(cards);
  const visibleCards = getVisibleMemoryCards(cards);
  const dueCount = cards.filter(card => card.isDue || card.missed).length;
  const missedCount = cards.filter(card => card.missed).length;
  const average = cards.length ? clampMemoryPercent(cards.reduce((sum, card) => sum + card.score, 0) / cards.length) : 0;
  const quiz = getQuizMemoryProgress();
  const timeline = getTimelineMemoryProgress();
  const queue = visibleCards.length ? visibleCards.slice(0, 5).map(renderMemoryCard).join("") : `
    <div class="memory-empty">
      <strong>No cards in this queue.</strong>
      <span>Switch to All topics or come back when reviews are due.</span>
    </div>
  `;

  panel.innerHTML = `
    <div class="memory-engine-shell">
      ${renderExamReadinessSummary(cards)}
      <div class="memory-hero">
        <div>
          <div class="timeline-kicker">Exam Readiness</div>
          <h4>${escapeHTML(storedTitle || "Study Notes")}</h4>
          <p>Readiness score, weak-topic repair, only-missed review, smart self-grading, why-wrong feedback, and adaptive spacing from your generated notes.</p>
        </div>
        <div class="memory-score-ring" style="--memory-score:${average}%">
          <strong>${average}%</strong>
          <span>ready</span>
        </div>
      </div>

      <div class="memory-stats-grid">
        ${renderMemoryStat("Due today", dueCount, "bi-calendar-check")}
        ${renderMemoryStat("Only missed", missedCount, "bi-exclamation-diamond")}
        ${renderMemoryStat("Study Path", `${timeline.done}/${timeline.total || 0}`, "bi-signpost-split")}
        ${renderMemoryStat("Quiz", quiz.label, "bi-patch-question")}
      </div>

      ${renderStudyActivityLedger()}

      <div class="memory-filter-row" role="tablist" aria-label="Memory review filters">
        <button class="${activeMemoryFilter === "due" ? "active" : ""}" type="button" onclick="setMemoryFilter('due')">Today</button>
        <button class="${activeMemoryFilter === "missed" ? "active" : ""}" type="button" onclick="setMemoryFilter('missed')">Only missed</button>
        <button class="${activeMemoryFilter === "all" ? "active" : ""}" type="button" onclick="setMemoryFilter('all')">All topics</button>
      </div>

      <div class="memory-layout">
        <div class="memory-review-list">${queue}</div>
        <aside class="memory-topic-panel">
          <h5>Weakness map</h5>
          <p>Weak cards come back sooner. Strong cards get spaced out.</p>
          <div class="memory-topic-list">
            ${cards.slice().sort((a, b) => a.score - b.score).slice(0, 8).map(renderMemoryTopicRow).join("")}
          </div>
        </aside>
      </div>
    </div>
  `;
}

function setupMasteryGraphTool() {
  const switcher = document.querySelector(".tool-switcher");
  if (switcher && !document.getElementById("toolBtnMasteryGraph")) {
    const buttonHTML = `
      <button id="toolBtnMasteryGraph" class="tool-switch-btn" type="button" onclick="switchTool('masterygraph', this)">
        <i class="bi bi-repeat me-1"></i>Exam Readiness
      </button>
    `;
    const anchor = document.getElementById("toolBtnTimeline")
      || document.getElementById("toolBtnVisualGuide")
      || document.getElementById("toolBtnMindMap");
    if (anchor) {
      anchor.insertAdjacentHTML("afterend", buttonHTML);
    } else {
      switcher.insertAdjacentHTML("beforeend", buttonHTML);
    }
  }

  const studyToolsCard = document.querySelector(".study-tools-card");
  if (studyToolsCard && !document.getElementById("toolPanelMasteryGraph")) {
    const panelHTML = `
      <div id="toolPanelMasteryGraph" class="tool-panel">
        <div class="tool-panel-head d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h3>Exam Readiness</h3>
            <p>Review what is due, repair missed topics, and see exactly what to study next.</p>
          </div>
          <div class="tool-panel-actions">
            <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="generateExamReadiness()">
              <i class="bi bi-arrow-clockwise me-1"></i>Regenerate
            </button>
            <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="openStudyToolSettingsModal('masterygraph')">
              <i class="bi bi-sliders me-1"></i>Readiness settings
            </button>
          </div>
        </div>
        <div id="masteryGraphPanelContent"></div>
      </div>
    `;
    const timelinePanel = document.getElementById("toolPanelTimeline");
    const visualPanel = document.getElementById("toolPanelVisualGuide");
    const mindPanel = document.getElementById("toolPanelMindMap");
    const anchor = timelinePanel || visualPanel || mindPanel;
    if (anchor) {
      anchor.insertAdjacentHTML("afterend", panelHTML);
    } else {
      studyToolsCard.insertAdjacentHTML("beforeend", panelHTML);
    }
  }

  renderMasteryGraphPanel();
}
