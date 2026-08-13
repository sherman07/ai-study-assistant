function cloneQuizSettings(settings) {
  return JSON.parse(JSON.stringify(settings || QUIZ_DEFAULT_SETTINGS));
}

function loadQuizSettings() {
  const saved = safeReadJSONStorage(QUIZ_STORAGE_KEY, null);
  return normalizeQuizSettings(saved || QUIZ_DEFAULT_SETTINGS);
}

function normalizeQuizType(type) {
  return QUIZ_TYPE_OPTIONS.some(option => option.value === type) ? type : "single_choice";
}

function normalizeQuizLanguage(language) {
  return QUIZ_LANGUAGE_OPTIONS.some(option => option.value === language) ? language : "multi_language";
}

function getQuizLanguageLabel(language) {
  return QUIZ_LANGUAGE_OPTIONS.find(option => option.value === normalizeQuizLanguage(language))?.label || "Multi-language";
}

function cloneFlashcardSettings(settings) {
  return JSON.parse(JSON.stringify(settings || FLASHCARD_DEFAULT_SETTINGS));
}

function normalizeFlashcardLanguage(language) {
  return QUIZ_LANGUAGE_OPTIONS.some(option => option.value === language) ? language : "english";
}

function normalizeFlashcardSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : FLASHCARD_DEFAULT_SETTINGS;
  const countMode = ["auto", "30", "60", "custom"].includes(String(source.countMode)) ? String(source.countMode) : "auto";
  return {
    preferredLanguage: normalizeFlashcardLanguage(source.preferredLanguage),
    countMode,
    customCount: Math.max(1, Math.min(Number.parseInt(source.customCount, 10) || 20, 80))
  };
}

function loadFlashcardSettings() {
  const saved = safeReadJSONStorage(FLASHCARD_SETTINGS_KEY, null);
  return normalizeFlashcardSettings(saved || FLASHCARD_DEFAULT_SETTINGS);
}

function clampQuizNumber(value, fallback = 1) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.min(number, 40));
}

function normalizeQuizSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : QUIZ_DEFAULT_SETTINGS;
  const rows = Array.isArray(source.questionTypes) && source.questionTypes.length
    ? source.questionTypes
    : QUIZ_DEFAULT_SETTINGS.questionTypes;
  const questionTypes = rows.map(row => ({
    type: normalizeQuizType(row.type),
    count: clampQuizNumber(row.count, 1)
  }));
  const totalQuestions = clampQuizNumber(source.totalQuestions || questionTypes.reduce((sum, row) => sum + row.count, 0), 6);
  return {
    examMode: Boolean(source.examMode),
    preferredLanguage: normalizeQuizLanguage(source.preferredLanguage),
    totalQuestions,
    questionTypes
  };
}

function resetQuizState() {
  currentQuiz = null;
  quizHistory = [];
  quizAnswers = {};
  quizRevealedAnswers = new Set();
  quizReport = null;
  quizError = "";
  isQuizGenerating = false;
  activeQuizQuestionIndex = 0;
  activeQuizHistoryId = "";
  renderQuizPanel();
}

function normalizeTimelineType(value) {
  const clean = String(value || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (TIMELINE_TYPE_OPTIONS.some(option => option.value === clean)) return clean;
  if (["lecture_flow", "flow", "overview", "sequence"].includes(clean)) return "warm_up";
  if (["concept", "definition", "method", "mechanism"].includes(clean)) return "learn";
  if (["evidence", "data", "study", "experiment", "figure", "example", "case", "application"].includes(clean)) return "apply";
  if (["exam", "assessment", "test"].includes(clean)) return "check";
  if (["revision", "review", "mistake", "common_mistake"].includes(clean)) return "revise";
  return "learn";
}

function getTimelineTypeLabel(value) {
  const type = normalizeTimelineType(value);
  return TIMELINE_TYPE_OPTIONS.find(option => option.value === type)?.label || "Concepts";
}

function normalizeStudyPathQuestionType(value) {
  const clean = String(value || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (STUDY_PATH_QUESTION_TYPE_OPTIONS.some(option => option.value === clean)) return clean;
  if (["mcq", "choice", "single", "single_choice_question"].includes(clean)) return "single_choice";
  if (["multi", "multiple", "multiple_choice_question"].includes(clean)) return "multiple_choice";
  if (["tf", "truefalse", "true_or_false", "true_false_question"].includes(clean)) return "true_false";
  if (["short", "short_response", "open_response", "open_ended"].includes(clean)) return "short_answer";
  if (["case", "application", "scenario"].includes(clean)) return "case_analysis";
  if (["essay", "outline", "exam_outline"].includes(clean)) return "essay_outline";
  if (["diagram", "figure", "visual", "graph", "chart"].includes(clean)) return "diagram_prompt";
  if (["contrast", "compare_contrast", "comparison"].includes(clean)) return "compare";
  return "short_answer";
}

function getStudyPathQuestionTypeMeta(value) {
  const type = normalizeStudyPathQuestionType(value);
  return STUDY_PATH_QUESTION_TYPE_OPTIONS.find(option => option.value === type) || STUDY_PATH_QUESTION_TYPE_OPTIONS[0];
}

function normalizeStudyPathQuestionOptions(value) {
  return Array.isArray(value)
    ? value.map(option => String(option || "").trim()).filter(Boolean).slice(0, 6)
    : [];
}

function normalizeStudyPathCorrectIndexes(value, options) {
  const rawValues = Array.isArray(value) ? value : (value == null ? [] : [value]);
  const indexes = [];
  rawValues.forEach(raw => {
    let index = null;
    if (Number.isInteger(raw)) {
      index = raw;
    } else {
      const text = String(raw || "").trim();
      if (/^\d+$/.test(text)) {
        index = Number.parseInt(text, 10);
      } else if (/^[A-F]$/i.test(text)) {
        index = text.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
      } else {
        index = options.findIndex(option => option.toLowerCase() === text.toLowerCase());
      }
    }
    if (Number.isInteger(index) && index >= 0 && index < options.length && !indexes.includes(index)) {
      indexes.push(index);
    }
  });
  return indexes;
}

function normalizeStudyPathBoolean(value) {
  if (typeof value === "boolean") return value;
  const text = String(value || "").trim().toLowerCase();
  if (["true", "yes", "correct", "right", "对", "正确", "是"].includes(text)) return true;
  if (["false", "no", "incorrect", "wrong", "错", "错误", "否"].includes(text)) return false;
  return null;
}

function normalizeStudyPathPracticeQuestion(raw, event, index) {
  const fallbackPrompt = String(
    event?.active_prompt || event?.activePrompt || event?.recall_prompt || event?.recallPrompt ||
    event?.task || event?.summary || `Answer one short question about checkpoint ${index + 1}.`
  ).trim();
  const source = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw
    : { prompt: typeof raw === "string" ? raw : fallbackPrompt };
  const type = normalizeStudyPathQuestionType(source.type || source.question_type || source.questionType || event?.question_type);
  let options = normalizeStudyPathQuestionOptions(source.options || source.choices);
  if (type === "true_false" && options.length < 2) options = ["True", "False"];
  const prompt = String(source.prompt || source.question || source.title || fallbackPrompt).trim();
  const correctOptionIndexes = normalizeStudyPathCorrectIndexes(
    source.correct_option_indexes ?? source.correctOptionIndexes ?? source.correct_indexes ?? source.answer_index ?? source.answer,
    options
  );
  const correctBoolean = normalizeStudyPathBoolean(source.correct_boolean ?? source.correctBoolean ?? source.answer);
  return {
    type,
    prompt,
    options,
    correctOptionIndexes,
    correctBoolean,
    expectedAnswer: String(source.expected_answer || source.expectedAnswer || source.answer_guide || source.answerGuide || "").trim(),
    explanation: String(source.explanation || source.rationale || "").trim(),
    sourceReference: String(source.source_reference || source.sourceReference || event?.source_reference || event?.sourceReference || "").trim()
  };
}

function getTimelineNoteKey() {
  if (currentHistoryId) return `history:${currentHistoryId}`;
  if (currentSourceFingerprint) return `fingerprint:${currentSourceFingerprint}`;
  return "";
}

function getTimelineStore() {
  const parsed = safeReadJSONStorage(TIMELINE_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function setTimelineStore(store) {
  return safeWriteJSONStorage(TIMELINE_STORAGE_KEY, store || {});
}

function normalizeTimelineEvent(event, index) {
  const title = String(event?.title || event?.label || `Checkpoint ${index + 1}`).trim();
  const estimatedMinutes = Math.max(3, Math.min(Number.parseInt(event?.estimated_minutes || event?.estimatedMinutes || event?.minutes, 10) || 8, 60));
  return {
    id: event?.id || `tl-${index + 1}`,
    order: Number.isFinite(Number(event?.order)) ? Number(event.order) : index + 1,
    marker: String(event?.marker || event?.time || event?.step || `Task ${index + 1}`).trim(),
    type: normalizeTimelineType(event?.type),
    title,
    section: String(event?.section || "").trim(),
    summary: String(event?.summary || event?.what_happens || "").trim(),
    detail: String(event?.detail || event?.explanation || event?.why || "").trim(),
    task: String(event?.task || event?.action || event?.study_task || event?.studyTask || "").trim(),
    activePrompt: String(event?.active_prompt || event?.activePrompt || event?.recall_prompt || event?.recallPrompt || "").trim(),
    practiceQuestion: normalizeStudyPathPracticeQuestion(event?.practice_question || event?.practiceQuestion || event?.question, event, index),
    deliverable: String(event?.deliverable || event?.output || "").trim(),
    masteryCheck: String(event?.mastery_check || event?.masteryCheck || event?.checkpoint || "").trim(),
    estimatedMinutes,
    priority: String(event?.priority || "medium").trim().toLowerCase(),
    evidence: String(event?.evidence || event?.source_evidence || "").trim(),
    whyItMatters: String(event?.why_it_matters || event?.whyItMatters || "").trim(),
    misconception: String(event?.misconception || event?.common_mistake || "").trim(),
    examUse: String(event?.exam_use || event?.examUse || "").trim(),
    sourceReference: String(event?.source_reference || event?.sourceReference || "").trim(),
    relatedTerms: Array.isArray(event?.related_terms || event?.relatedTerms)
      ? (event.related_terms || event.relatedTerms).map(term => String(term).trim()).filter(Boolean).slice(0, 6)
      : []
  };
}

function normalizeTimeline(data) {
  const events = Array.isArray(data?.events) ? data.events : [];
  const normalizedEvents = events
    .map(normalizeTimelineEvent)
    .filter(event => event.title && (event.summary || event.detail || event.evidence))
    .sort((a, b) => a.order - b.order)
    .slice(0, 18);
  return {
    title: String(data?.title || `${storedTitle || "Study"} Timeline`).trim(),
    summary: String(data?.summary || "").trim(),
    generatedAt: data?.generated_at || data?.generatedAt || new Date().toISOString(),
    events: normalizedEvents
  };
}

function persistTimelineForCurrentNote() {
  const key = getTimelineNoteKey();
  if (!key || !currentTimeline || !Array.isArray(currentTimeline.events) || !currentTimeline.events.length) return;
  const store = getTimelineStore();
  store[key] = {
    title: storedTitle,
    updatedAt: new Date().toISOString(),
    timeline: currentTimeline,
    completedIds: Array.from(timelineCompletedIds),
    practiceAnswers: timelinePracticeAnswers,
    completionCelebrated: timelineCompletionCelebrated
  };
  setTimelineStore(store);
}

function loadTimelineForCurrentNote() {
  const store = getTimelineStore();
  const keys = [
    currentHistoryId ? `history:${currentHistoryId}` : "",
    currentSourceFingerprint ? `fingerprint:${currentSourceFingerprint}` : ""
  ].filter(Boolean);
  const record = keys.map(key => store[key]).find(item => item && item.timeline);
  currentTimeline = record ? normalizeTimeline(record.timeline) : null;
  timelineCompletedIds = new Set(Array.isArray(record?.completedIds) ? record.completedIds.map(id => String(id)) : []);
  timelinePracticeAnswers = record?.practiceAnswers && typeof record.practiceAnswers === "object" && !Array.isArray(record.practiceAnswers)
    ? record.practiceAnswers
    : {};
  Object.values(timelinePracticeAnswers).forEach(state => {
    if (state && state.status === "checking") state.status = "idle";
  });
  timelineCompletionCelebrated = Boolean(record?.completionCelebrated);
  activeTimelineIndex = 0;
  activeTimelineFilter = "all";
  timelineError = "";
}

function deleteTimelinePath(historyId, sourceFingerprint = "") {
  const store = getTimelineStore();
  delete store[`history:${historyId}`];
  if (sourceFingerprint) delete store[`fingerprint:${sourceFingerprint}`];
  setTimelineStore(store);
}

function getTimelineEventsForFilter() {
  const events = currentTimeline?.events || [];
  if (activeTimelineFilter === "all") return events;
  return events.filter(event => event.type === activeTimelineFilter);
}

function renderTimelinePanel() {
  const panel = document.getElementById("timelinePanelContent");
  if (!panel) return;
  const hasNotes = Boolean(fullSummary && fullSummary.trim());

  if (isTimelineGenerating) {
    panel.innerHTML = `
      <div class="timeline-loading-card">
        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <div>
          <strong>Building study path...</strong>
          <p>Synapse is turning the notes into concrete learning tasks, short practice questions, and revision checkpoints.</p>
        </div>
      </div>
    `;
    return;
  }

  if (timelineError) {
    panel.innerHTML = `
      <div class="alert alert-danger">
        <strong>Study path generation failed.</strong><br>${escapeHTML(timelineError)}
      </div>
      ${renderTimelineLaunchCard(hasNotes)}
    `;
    return;
  }

  if (!currentTimeline || !Array.isArray(currentTimeline.events) || !currentTimeline.events.length) {
    panel.innerHTML = renderTimelineLaunchCard(hasNotes);
    return;
  }

  panel.innerHTML = renderTimeline();
  renderMath();
}

function renderTimelineLaunchCard(hasNotes) {
  return renderStudyToolLaunch({
    tool: "timeline",
    iconClass: "bi-signpost-split",
    title: "Create a study path",
    description: hasNotes
      ? "Turn the current notes into a guided sequence of learning tasks, short questions, and revision checks."
      : "Generate notes first, then build an interactive study path from them.",
    action: "generateTimeline(false)",
    actionLabel: "Generate study path",
    hasNotes,
    kicker: "Guided revision sequence"
  });
}

function getTimelineEventId(eventOrId) {
  if (eventOrId && typeof eventOrId === "object") return String(eventOrId.id || "");
  return String(eventOrId || "");
}

function isTimelineEventCompleted(eventOrId) {
  const id = getTimelineEventId(eventOrId);
  return Boolean(id && timelineCompletedIds.has(id));
}

function getTimelineCompletionStats() {
  const events = currentTimeline?.events || [];
  const total = events.length;
  const completed = events.filter(event => isTimelineEventCompleted(event.id)).length;
  return {
    total,
    completed,
    complete: total > 0 && completed >= total
  };
}

function maybeCelebrateTimelineCompletion() {
  const stats = getTimelineCompletionStats();
  if (!stats.complete || timelineCompletionCelebrated) return;
  timelineCompletionCelebrated = true;
  persistTimelineForCurrentNote();
  showStudyPathCelebration(stats.total);
}

function showStudyPathCelebration(totalTasks = 0) {
  const existing = document.querySelector(".study-path-celebration-overlay");
  if (existing) existing.remove();
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const colors = ["#5f7cff", "#8f63ff", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];
  const pieces = reducedMotion ? "" : Array.from({ length: 56 }, (_, i) => {
    const color = colors[i % colors.length];
    const left = (i * 23) % 100;
    const delay = (i % 14) * 0.07;
    const duration = 2.4 + (i % 7) * 0.16;
    const drift = ((i % 9) - 4) * 24;
    return `<span class="study-path-confetti-piece" style="--left:${left}%;--delay:${delay}s;--duration:${duration}s;--drift:${drift}px;--color:${color};"></span>`;
  }).join("");
  const overlay = document.createElement("div");
  overlay.className = "study-path-celebration-overlay";
  overlay.innerHTML = `
    ${pieces}
    <div class="study-path-celebration-card" role="status" aria-live="polite">
      <span class="study-path-celebration-kicker">Study path complete</span>
      <strong>Great work. All ${totalTasks || "the"} tasks are done.</strong>
      <p>You finished this guided pass. Try Quiz, Flashcards, or the tutor next for a tougher check.</p>
      <button type="button" onclick="closeStudyPathCelebration()">Continue</button>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
  window.setTimeout(() => closeStudyPathCelebration(), reducedMotion ? 3500 : 5200);
}

function closeStudyPathCelebration() {
  const overlay = document.querySelector(".study-path-celebration-overlay");
  if (!overlay) return;
  overlay.classList.remove("show");
  window.setTimeout(() => overlay.remove(), 220);
}
window.closeStudyPathCelebration = closeStudyPathCelebration;
