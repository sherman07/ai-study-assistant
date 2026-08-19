function persistCurrentQuizToHistory(options = {}) {
  const key = getQuizNoteKey();
  if (!key || !currentQuiz || !Array.isArray(currentQuiz.questions) || !currentQuiz.questions.length) return;
  const now = new Date().toISOString();
  const store = getQuizHistoryStore();
  const existing = Array.isArray(store[key]) ? store[key] : [];
  const recordId = options.isNew || !activeQuizHistoryId ? makeQuizHistoryId() : activeQuizHistoryId;
  activeQuizHistoryId = recordId;
  const record = {
    id: recordId,
    title: currentQuiz.title || `${storedTitle || "Study"} Quiz`,
    noteTitle: storedTitle || "Study Notes",
    createdAt: options.isNew ? now : (existing.find(item => item?.id === recordId)?.createdAt || now),
    updatedAt: now,
    settings: quizSettings,
    quiz: currentQuiz,
    answers: quizAnswers,
    revealedIds: Array.from(quizRevealedAnswers),
    report: quizReport
  };
  const nextRecords = [
    record,
    ...existing.filter(item => item && item.id !== recordId)
  ].slice(0, QUIZ_HISTORY_LIMIT);
  store[key] = nextRecords;
  setQuizHistoryStore(store);
  quizHistory = getQuizHistoryRecordsForCurrentNote();
}

function deleteQuizHistory(historyId, sourceFingerprint = "") {
  const store = getQuizHistoryStore();
  delete store[`history:${historyId}`];
  if (sourceFingerprint) delete store[`fingerprint:${sourceFingerprint}`];
  setQuizHistoryStore(store);
}

function deleteQuizHistoryRecord(event, recordId) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const key = getQuizNoteKey();
  if (!key) return;
  const store = getQuizHistoryStore();
  const keys = [
    currentHistoryId ? `history:${currentHistoryId}` : "",
    currentSourceFingerprint ? `fingerprint:${currentSourceFingerprint}` : "",
    key
  ].filter(Boolean);
  keys.forEach(itemKey => {
    const records = Array.isArray(store[itemKey]) ? store[itemKey] : [];
    store[itemKey] = records.filter(record => record && record.id !== recordId);
  });
  setQuizHistoryStore(store);
  loadQuizHistoryForCurrentNote();
  renderQuizPanel();
  openQuizHistoryModal();
}

function loadQuizHistoryRecord(recordId) {
  const record = quizHistory.find(item => item.id === recordId);
  if (!record) return;
  closeQuizHistoryModal();
  applyQuizHistoryRecord(record);
}

function buildQuizAvoidancePayload() {
  const seen = new Set();
  return quizHistory
    .flatMap(record => (record.quiz?.questions || []).map(question => ({
      type: question.type,
      question: question.question,
      source_reference: question.sourceReference || "",
      options: Array.isArray(question.options) ? question.options.slice(0, 5) : []
    })))
    .filter(item => {
      const signature = String(item.question || "").trim().toLowerCase();
      if (!signature || seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .slice(0, 80);
}

function formatQuizHistoryDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "Saved quiz";
  }
}

function renderQuizHistoryPreview(limit = 3) {
  if (!quizHistory.length) return "";
  const rows = quizHistory.slice(0, limit).map(record => {
    const types = (record.settings?.questionTypes || [])
      .map(row => `${getQuizTypeLabel(row.type)} × ${clampQuizNumber(row.count, 1)}`)
      .join(" · ");
    return `
      <button class="quiz-history-mini-card ${record.id === activeQuizHistoryId ? "active" : ""}" type="button"
        onclick="loadQuizHistoryRecord('${escapeAttr(record.id)}')">
        <span class="quiz-history-mini-title">${escapeHTML(record.title)}</span>
        <span class="quiz-history-mini-meta">${formatQuizHistoryDate(record.createdAt)} · ${record.quiz.questions.length} questions</span>
        <span class="quiz-history-mini-types">${escapeHTML(types || getQuizLanguageLabel(record.settings?.preferredLanguage))}</span>
      </button>
    `;
  }).join("");
  return `
    <div class="quiz-history-preview">
      <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap mb-3">
        <div>
          <div class="quiz-history-kicker">Saved quiz history</div>
          <div class="text-secondary small">Each note keeps its own generated quizzes and answer progress.</div>
        </div>
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="openQuizHistoryModal()">
          <i class="bi bi-clock-history me-1"></i>View all
        </button>
      </div>
      <div class="quiz-history-mini-grid">${rows}</div>
    </div>
  `;
}

function openQuizHistoryModal() {
  document.getElementById("quizHistoryOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "quizHistoryOverlay";
  overlay.className = "visual-modal synapse-themed-modal";
  const rows = quizHistory.length
    ? quizHistory.map(record => `
      <div class="quiz-history-row ${record.id === activeQuizHistoryId ? "active" : ""}">
        <button class="quiz-history-row-main" type="button" onclick="loadQuizHistoryRecord('${escapeAttr(record.id)}')">
          <span class="quiz-history-row-title">${escapeHTML(record.title)}</span>
          <span class="quiz-history-row-meta">${formatQuizHistoryDate(record.createdAt)} · ${record.quiz.questions.length} questions · ${escapeHTML(getQuizLanguageLabel(record.settings?.preferredLanguage))}</span>
          <span class="quiz-history-row-question">${escapeHTML(cleanMindText(record.quiz.questions[0]?.question || "Open this quiz"))}</span>
        </button>
        <button class="btn btn-outline-secondary quiz-history-delete" type="button" title="Delete quiz"
          onclick="deleteQuizHistoryRecord(event, '${escapeAttr(record.id)}')">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    `).join("")
    : `<div class="text-secondary">No saved quizzes for this note yet.</div>`;
  overlay.innerHTML = `
    <div class="visual-modal-content quiz-history-modal">
      <button class="visual-modal-close" type="button" aria-label="Close quiz history" onclick="closeQuizHistoryModal()">
        <i class="bi bi-x-lg"></i>
      </button>
      <div class="visual-modal-caption">
        <h3>Quiz history</h3>
        <p class="text-secondary mb-4">Saved only for the current notes. Pick any previous quiz to continue or review.</p>
        <div class="quiz-history-list">${rows}</div>
      </div>
    </div>
  `;
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeQuizHistoryModal();
  });
  document.body.appendChild(overlay);
}

function closeQuizHistoryModal() {
  document.getElementById("quizHistoryOverlay")?.remove();
}

function renderQuizPanel() {
  const panel = document.getElementById("quizPanelContent");
  if (!panel) return;

  if (isQuizGenerating) {
    panel.innerHTML = `
      <div class="border rounded-4 p-4 bg-light shadow-sm">
        <div class="d-flex align-items-start gap-3">
          <span class="spinner-border spinner-border-sm mt-1" aria-hidden="true"></span>
          <div>
            <div class="fw-bold">Generating quiz...</div>
            <p class="text-secondary mb-0 mt-1">Questions will follow your settings and cover key concepts, source evidence, examples, and common mistakes.</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (quizError) {
    panel.innerHTML = `
      <div class="alert alert-danger">
        <strong>Quiz generation failed.</strong><br>${escapeHTML(quizError)}
      </div>
      ${renderQuizEmptyActions()}
    `;
    return;
  }

  if (currentQuiz && Array.isArray(currentQuiz.questions) && currentQuiz.questions.length) {
    panel.innerHTML = renderQuiz();
    renderMath();
    return;
  }

  panel.innerHTML = renderQuizEmptyActions();
}

function renderQuizEmptyActions() {
  const hasNotes = Boolean(fullSummary && fullSummary.trim());
  return `
    <div class="d-grid gap-4">
      ${renderStudyToolLaunch({
        tool: "quiz",
        iconClass: "bi-patch-question",
        title: "Create a quiz from these notes",
        description: hasNotes
          ? "Practise understanding, application, and exam phrasing with source-grounded questions."
          : "Generate notes first, then create a quiz from the material.",
        action: "generateQuiz()",
        actionLabel: "Generate quiz",
        hasNotes,
        kicker: "Active recall practice",
        estimate: "~20–60 sec",
        secondaryHint: "Use Exam mode when you want scored feedback closer to a real paper."
      })}
      ${renderQuizHistoryPreview()}
    </div>
  `;
}

function openQuizSettingsModal() {
  quizSettingsDraft = cloneQuizSettings(quizSettings);
  document.getElementById("quizSettingsOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "quizSettingsOverlay";
  overlay.className = "visual-modal synapse-themed-modal";
  overlay.innerHTML = `
    <div class="visual-modal-content settings-pattern-modal quiz-settings-modal" role="dialog" aria-modal="true" aria-labelledby="quizSettingsTitle">
      <button class="visual-modal-close" type="button" aria-label="Close quiz settings" onclick="closeQuizSettingsModal()">
        <i class="bi bi-x-lg"></i>
      </button>
      <div class="settings-pattern-header">
        <span class="study-tool-settings-kicker">Study Tools</span>
        <h3 id="quizSettingsTitle">Quiz settings</h3>
        <p class="text-secondary">Choose the quiz format before you generate a new practice set.</p>
      </div>

      <div class="settings-pattern-body quiz-settings-body">

        <div class="settings-pattern-section">
          <div class="fw-semibold mb-3">Quiz mode</div>
          <div class="border rounded-4 p-3 bg-light shadow-sm">
            <div class="form-check form-switch d-flex align-items-center gap-3 m-0">
              <input id="quizExamMode" class="form-check-input flex-shrink-0" type="checkbox" role="switch"
                ${quizSettingsDraft.examMode ? "checked" : ""} onchange="updateQuizDraftExamMode(this.checked)">
              <label class="form-check-label" for="quizExamMode">
                <span class="d-block fw-bold">Enable exam mode</span>
                <span class="text-secondary">Submit all answers at the end and generate a full report</span>
              </label>
            </div>
          </div>
        </div>

        <div class="settings-pattern-section">
          <div class="d-flex justify-content-between align-items-center gap-3 mb-2">
            <label class="fw-semibold m-0" for="quizQuestionLanguage">Question language</label>
            <span class="small text-secondary">Default: English</span>
          </div>
          <select id="quizQuestionLanguage" class="form-select"
            onchange="updateQuizDraftLanguage(this.value)">
            ${QUIZ_LANGUAGE_OPTIONS.map(option => `
              <option value="${option.value}" ${quizSettingsDraft.preferredLanguage === option.value ? "selected" : ""}>
                ${escapeHTML(option.label)}
              </option>
            `).join("")}
          </select>
          <div id="quizLanguageHelp" class="small text-secondary mt-2">
            ${escapeHTML(QUIZ_LANGUAGE_OPTIONS.find(option => option.value === quizSettingsDraft.preferredLanguage)?.description || "")}
          </div>
        </div>

        <div class="settings-pattern-section">
          <div class="d-flex justify-content-between align-items-center gap-3 mb-2">
            <label class="fw-semibold m-0" for="quizTotalQuestions">Question count</label>
            <span class="small text-secondary">1-40 questions</span>
          </div>
          <input id="quizTotalQuestions" class="form-control" type="number" min="1" max="40"
            value="${quizSettingsDraft.totalQuestions}" onchange="updateQuizDraftTotal(this.value)" oninput="updateQuizDraftTotal(this.value)">
        </div>

        <div class="settings-pattern-section">
          <div class="fw-semibold mb-3">Question types</div>
          <div id="quizTypeRows"></div>
          <button class="btn btn-outline-primary mt-3" type="button" onclick="addQuizTypeRow()">
            <i class="bi bi-plus-lg me-1"></i>Add question type
          </button>
          <div id="quizSettingsWarning" class="text-danger small mt-3"></div>
        </div>

      </div>

      <div class="settings-pattern-footer d-flex justify-content-end gap-2">
          <button class="btn btn-outline-secondary" type="button" onclick="saveQuizSettingsFromModal(false)">Save</button>
          <button class="btn btn-primary" type="button" onclick="saveQuizSettingsFromModal(true)">Save & generate</button>
      </div>
    </div>
  `;
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeQuizSettingsModal();
  });
  document.body.appendChild(overlay);
  renderQuizTypeRows();
  validateQuizSettingsDraft(false);
}

function closeQuizSettingsModal() {
  document.getElementById("quizSettingsOverlay")?.remove();
  quizSettingsDraft = null;
}

function renderQuizTypeRows() {
  const container = document.getElementById("quizTypeRows");
  if (!container || !quizSettingsDraft) return;
  container.innerHTML = quizSettingsDraft.questionTypes.map((row, index) => `
    <div class="quiz-type-row">
      <label class="quiz-type-row-label">Question type ${index + 1}</label>
      <div class="quiz-type-control-row">
        <select class="form-select quiz-type-select" onchange="updateQuizDraftType(${index}, this.value)">
          ${QUIZ_TYPE_OPTIONS.map(option => `
            <option value="${option.value}" ${row.type === option.value ? "selected" : ""}>${escapeHTML(option.label)}</option>
          `).join("")}
        </select>
        <input class="form-control quiz-type-count" type="number" min="1" max="40" value="${clampQuizNumber(row.count, 1)}"
          onchange="updateQuizDraftCount(${index}, this.value)" oninput="updateQuizDraftCount(${index}, this.value)">
        ${quizSettingsDraft.questionTypes.length > 1 ? `
          <button class="btn btn-outline-secondary quiz-type-remove" type="button" title="Remove question type" onclick="removeQuizTypeRow(${index})">
            <i class="bi bi-trash3"></i>
          </button>
        ` : ""}
      </div>
    </div>
  `).join("");
}

function updateQuizDraftExamMode(checked) {
  if (!quizSettingsDraft) return;
  quizSettingsDraft.examMode = Boolean(checked);
}

function updateQuizDraftLanguage(value) {
  if (!quizSettingsDraft) return;
  quizSettingsDraft.preferredLanguage = normalizeQuizLanguage(value);
  const help = document.getElementById("quizLanguageHelp");
  if (help) {
    help.textContent = QUIZ_LANGUAGE_OPTIONS.find(option => option.value === quizSettingsDraft.preferredLanguage)?.description || "";
  }
}

function updateQuizDraftTotal(value) {
  if (!quizSettingsDraft) return;
  quizSettingsDraft.totalQuestions = clampQuizNumber(value, quizSettingsDraft.totalQuestions || 6);
  validateQuizSettingsDraft(false);
}

function updateQuizDraftType(index, value) {
  if (!quizSettingsDraft || !quizSettingsDraft.questionTypes[index]) return;
  quizSettingsDraft.questionTypes[index].type = normalizeQuizType(value);
  renderQuizTypeRows();
  validateQuizSettingsDraft(false);
}

function updateQuizDraftCount(index, value) {
  if (!quizSettingsDraft || !quizSettingsDraft.questionTypes[index]) return;
  quizSettingsDraft.questionTypes[index].count = clampQuizNumber(value, 1);
  validateQuizSettingsDraft(false);
}

function addQuizTypeRow() {
  if (!quizSettingsDraft) return;
  const used = quizTypePlanTotal(quizSettingsDraft);
  const remaining = Math.max(1, quizSettingsDraft.totalQuestions - used);
  quizSettingsDraft.questionTypes.push({ type: "short_answer", count: remaining });
  renderQuizTypeRows();
  validateQuizSettingsDraft(false);
}

function removeQuizTypeRow(index) {
  if (!quizSettingsDraft || quizSettingsDraft.questionTypes.length <= 1) return;
  quizSettingsDraft.questionTypes.splice(index, 1);
  renderQuizTypeRows();
  validateQuizSettingsDraft(false);
}

function validateQuizSettingsDraft(showWarning = true) {
  const warning = document.getElementById("quizSettingsWarning");
  if (!quizSettingsDraft) return false;
  quizSettingsDraft = normalizeQuizSettings(quizSettingsDraft);
  const sum = quizTypePlanTotal(quizSettingsDraft);
  const valid = sum === quizSettingsDraft.totalQuestions;
  if (warning) {
    warning.textContent = valid
      ? ""
      : `Question type counts add up to ${sum}; this must equal the total question count ${quizSettingsDraft.totalQuestions}.`;
  }
  return valid || !showWarning;
}

function saveQuizSettingsFromModal(shouldGenerate) {
  if (!quizSettingsDraft) return;
  if (!validateQuizSettingsDraft(true)) return;
  quizSettings = normalizeQuizSettings(quizSettingsDraft);
  safeWriteJSONStorage(QUIZ_STORAGE_KEY, quizSettings);
  closeQuizSettingsModal();
  renderQuizPanel();
  if (shouldGenerate) generateQuiz();
}

async function generateQuiz() {
  if (isQuizGenerating) return;
  if (!fullSummary || !fullSummary.trim()) {
    alert("Generate visual notes first, then create a quiz.");
    return;
  }

  quizSettings = normalizeQuizSettings(quizSettings);
  const total = quizTypePlanTotal(quizSettings);
  if (total !== quizSettings.totalQuestions) {
    openQuizSettingsModal();
    return;
  }

  const runQuizGeneration = async () => {
    isQuizGenerating = true;
    quizError = "";
    const avoidQuestions = buildQuizAvoidancePayload();
    currentQuiz = null;
    quizAnswers = {};
    quizRevealedAnswers = new Set();
    quizReport = null;
    activeQuizHistoryId = "";
    switchTool("quiz");
    renderQuizPanel();

    try {
      const response = await apiClient.fetch("/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: storedTitle,
          summary: fullSummary,
          sections,
          source_fingerprint: currentSourceFingerprint,
          preferred_language: quizSettings.preferredLanguage,
          exam_mode: quizSettings.examMode,
          total_questions: quizSettings.totalQuestions,
          question_types: quizSettings.questionTypes,
          avoid_questions: avoidQuestions,
          previous_quiz_count: quizHistory.length,
          variant_seed: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `Quiz generation failed with status ${response.status}.`);
      }
      currentQuiz = normalizeClientQuiz(data);
      activeQuizQuestionIndex = 0;
      persistCurrentQuizToHistory({ isNew: true });
      if (typeof recordStudyActivity === "function") recordStudyActivity("quiz_generated", {
        tool: "quiz",
        label: `Generated quiz with ${currentQuiz.questions.length} questions`,
        metadata: { questionCount: currentQuiz.questions.length, examMode: currentQuiz.examMode }
      });
    } catch (error) {
      console.error(error);
      quizError = error.message || "Quiz generation failed.";
      throw error;
    } finally {
      isQuizGenerating = false;
      renderQuizPanel();
    }
  };

  try {
    if (window.SynapseCredits?.withCreditReservation) {
      await window.SynapseCredits.withCreditReservation("practice_generation", runQuizGeneration, {
        confirmLabel: "Generate quiz"
      });
    } else {
      await runQuizGeneration();
    }
  } catch (error) {
    if (!String(error?.message || "").toLowerCase().includes("cancelled")) {
      quizError = error?.message || quizError || "Quiz generation failed.";
      renderQuizPanel();
    }
  }
}

function setActiveQuizQuestion(index) {
  if (!currentQuiz || !Array.isArray(currentQuiz.questions) || !currentQuiz.questions.length) return;
  activeQuizQuestionIndex = Math.max(0, Math.min(index, currentQuiz.questions.length - 1));
  renderQuizPanel();
}

function normalizeClientQuiz(data) {
  const questions = Array.isArray(data.questions) ? data.questions : [];
  return {
    title: data.title || `${storedTitle || "Study"} Quiz`,
    examMode: Boolean(data.exam_mode ?? data.examMode),
    totalQuestions: questions.length,
    questions: questions.map((question, index) => ({
      id: question.id || `q${index + 1}`,
      type: normalizeQuizType(question.type),
      label: question.label || getQuizTypeLabel(normalizeQuizType(question.type)),
      question: question.question || question.prompt || `Question ${index + 1}`,
      options: Array.isArray(question.options) ? question.options : [],
      correctOptionIndexes: Array.isArray(question.correct_option_indexes)
        ? question.correct_option_indexes
        : (Array.isArray(question.correctOptionIndexes) ? question.correctOptionIndexes : []),
      correctBoolean: typeof question.correct_boolean === "boolean"
        ? question.correct_boolean
        : (typeof question.correctBoolean === "boolean" ? question.correctBoolean : null),
      expectedAnswer: question.expected_answer || question.expectedAnswer || "",
      explanation: question.explanation || "",
      sourceReference: question.source_reference || question.sourceReference || "",
      difficulty: question.difficulty || "medium",
      points: clampQuizNumber(question.points, 1),
      rubric: Array.isArray(question.rubric) ? question.rubric : []
    }))
  };
}

function renderQuiz() {
  const quiz = currentQuiz;
  const answeredCount = quiz.questions.filter(question => isQuizAnswered(question)).length;
  const reportHTML = quizReport ? renderQuizReport(quizReport) : "";
  const progressPercent = quiz.questions.length ? Math.round((answeredCount / quiz.questions.length) * 100) : 0;
  activeQuizQuestionIndex = Math.max(0, Math.min(activeQuizQuestionIndex, quiz.questions.length - 1));
  const currentQuestion = quiz.questions[activeQuizQuestionIndex];
  return `
    <div>
      <div class="d-flex align-items-center gap-3 flex-wrap mb-4">
        <button class="btn btn-primary" type="button" onclick="openQuizSettingsModal()">
          <i class="bi bi-plus-lg me-1"></i>Generate new quiz
        </button>
        <button class="btn btn-outline-secondary" type="button" title="Quiz settings" onclick="openQuizSettingsModal()">
          <i class="bi bi-sliders"></i>
        </button>
        <button class="btn btn-outline-primary" type="button" onclick="openQuizHistoryModal()" ${quizHistory.length ? "" : "disabled"}>
          <i class="bi bi-clock-history me-1"></i>History
        </button>
      </div>

      <div class="mx-auto" style="max-width: 760px;">
        <div class="quiz-question-card border rounded-4 p-4 p-lg-5 bg-white shadow-sm">
          <div class="d-flex align-items-center justify-content-between gap-3 mb-4">
            <button class="btn btn-outline-secondary" type="button" aria-label="Previous question"
              onclick="setActiveQuizQuestion(${activeQuizQuestionIndex - 1})" ${activeQuizQuestionIndex <= 0 ? "disabled" : ""}>
              <i class="bi bi-chevron-left"></i>
            </button>
            <div class="text-center">
              <h3 class="mb-1">Question ${activeQuizQuestionIndex + 1} of ${quiz.questions.length}</h3>
              <div class="small text-secondary">${answeredCount}/${quiz.questions.length} answered · ${quiz.examMode ? "Exam mode" : "Practice mode"}</div>
            </div>
            <button class="btn btn-outline-secondary" type="button" aria-label="Next question"
              onclick="setActiveQuizQuestion(${activeQuizQuestionIndex + 1})" ${activeQuizQuestionIndex >= quiz.questions.length - 1 ? "disabled" : ""}>
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>

          <div class="progress mb-4" role="progressbar" aria-label="Quiz progress" aria-valuenow="${progressPercent}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar" style="width: ${progressPercent}%"></div>
          </div>

          ${renderQuizQuestion(currentQuestion, activeQuizQuestionIndex)}

          <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mt-4">
            <button class="btn btn-outline-primary" type="button" onclick="revealQuizAnswer('${escapeAttr(currentQuestion.id)}')" ${quiz.examMode ? "disabled" : ""}>
              View answer
            </button>
            <button class="btn btn-primary" type="button" onclick="submitQuiz()">
              <i class="bi bi-check2-circle me-1"></i>${quiz.examMode ? "Submit & generate report" : "Generate report"}
            </button>
          </div>
        </div>
      </div>
      ${reportHTML}
      ${renderQuizHistoryPreview()}
    </div>
  `;
}

function renderQuizQuestion(question, index) {
  const answer = quizAnswers[question.id];
  const feedback = quizRevealedAnswers.has(question.id) && !currentQuiz.examMode
    ? renderQuestionFeedback(question, answer)
    : "";
  return `
    <article>
      <div class="d-flex justify-content-between gap-2 flex-wrap mb-3">
        <span class="badge rounded-pill text-bg-primary">${escapeHTML(question.label || getQuizTypeLabel(question.type))}</span>
        <span class="small text-secondary">${escapeHTML(getQuizDifficultyLabel(question.difficulty))} · ${question.points} ${question.points === 1 ? "point" : "points"}</span>
      </div>
      <div class="quiz-question-text fw-semibold mb-4 fs-5">${markdownToHTML(question.question)}</div>
      ${question.sourceReference ? `<div class="quiz-source-reference small text-secondary mb-3"><i class="bi bi-link-45deg me-1"></i>Source basis: ${inlineMarkdownHTML(question.sourceReference)}</div>` : ""}
      ${renderQuizAnswerInput(question)}
      ${feedback}
    </article>
  `;
}

function renderQuizAnswerInput(question) {
  if (question.type === "single_choice") {
    return renderChoiceOptions(question, "radio");
  }
  if (question.type === "multiple_choice") {
    return renderChoiceOptions(question, "checkbox");
  }
  if (question.type === "true_false") {
    const labels = Array.isArray(question.options) && question.options.length >= 2
      ? question.options
      : ["True", "False"];
    return `
      <div class="d-grid gap-2">
        ${[true, false].map((value, index) => {
          const selected = quizAnswers[question.id] === value;
          const state = quizChoiceVisualState(question, index, selected);
          return `
          <label class="quiz-option-label ${selected ? "selected" : ""} is-${state} border rounded-3 p-3 bg-white" data-state="${state}">
            <input class="form-check-input me-2" type="radio" name="quiz-${escapeAttr(question.id)}" value="${value}"
              ${selected ? "checked" : ""}
              ${quizRevealedAnswers.has(question.id) ? `aria-describedby="quiz-feedback-${escapeAttr(question.id)}"` : ""}
              onchange="updateQuizAnswer('${escapeAttr(question.id)}', ${value}, true)">
            <div class="quiz-option-text">${inlineMarkdownHTML(labels[index])}</div>
          </label>
        `;
        }).join("")}
      </div>
    `;
  }
  return `
    <textarea class="form-control" rows="${question.type === "essay" ? 6 : 4}"
      placeholder="Type your answer here..."
      oninput="updateQuizAnswer('${escapeAttr(question.id)}', this.value)"
      onblur="recordQuizAnswerActivity('${escapeAttr(question.id)}')">${escapeHTML(quizAnswers[question.id] || "")}</textarea>
  `;
}

function quizChoiceVisualState(question, optionIndex, selected) {
  const revealed = quizRevealedAnswers.has(question.id) && !currentQuiz?.examMode;
  const correct = question.type === "true_false"
    ? optionIndex === (question.correctBoolean ? 0 : 1)
    : (Array.isArray(question.correctOptionIndexes) && question.correctOptionIndexes.includes(optionIndex));
  return legacyQuizOptionState({ selected, correct, revealed });
}

function renderChoiceOptions(question, inputType) {
  const selected = quizAnswers[question.id];
  return `
    <div class="d-grid gap-2">
      ${(question.options || []).map((option, optionIndex) => {
        const checked = inputType === "checkbox"
          ? Array.isArray(selected) && selected.includes(optionIndex)
          : selected === optionIndex;
        const state = quizChoiceVisualState(question, optionIndex, checked);
        return `
          <label class="quiz-option-label ${checked ? "selected" : ""} is-${state} border rounded-3 p-3 bg-white" data-state="${state}">
            <input class="form-check-input me-2" type="${inputType}" name="quiz-${escapeAttr(question.id)}" value="${optionIndex}"
              ${checked ? "checked" : ""}
              ${quizRevealedAnswers.has(question.id) ? `aria-describedby="quiz-feedback-${escapeAttr(question.id)}"` : ""}
              onchange="updateQuizChoiceAnswer('${escapeAttr(question.id)}', ${optionIndex}, '${inputType}', this.checked)">
            <span class="fw-semibold quiz-option-letter">${String.fromCharCode(65 + optionIndex)}.</span><div class="quiz-option-text">${inlineMarkdownHTML(option)}</div>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function updateQuizAnswer(questionId, value, shouldRender = false) {
  quizAnswers[questionId] = value;
  persistCurrentQuizToHistory();
  if (shouldRender) renderQuizPanel();
}

function recordQuizAnswerActivity(questionId) {
  const question = currentQuiz?.questions?.find(item => String(item.id) === String(questionId));
  const answer = quizAnswers[questionId];
  if (!question || !isQuizAnswered(question) || typeof recordStudyActivity !== "function") return;
  recordStudyActivity("quiz_answered", {
    tool: "quiz",
    sectionTitle: question.sourceReference || question.question,
    label: `Answered quiz question ${currentQuiz.questions.indexOf(question) + 1}`,
    metadata: { answerLength: typeof answer === "string" ? answer.trim().length : 1 }
  });
}

function updateQuizChoiceAnswer(questionId, optionIndex, inputType, checked) {
  if (inputType === "checkbox") {
    const current = Array.isArray(quizAnswers[questionId]) ? [...quizAnswers[questionId]] : [];
    if (checked && !current.includes(optionIndex)) current.push(optionIndex);
    if (!checked) {
      const idx = current.indexOf(optionIndex);
      if (idx >= 0) current.splice(idx, 1);
    }
    quizAnswers[questionId] = current.sort((a, b) => a - b);
  } else {
    quizAnswers[questionId] = optionIndex;
  }
  persistCurrentQuizToHistory();
  if (typeof recordStudyActivity === "function") recordStudyActivity("quiz_answered", {
    tool: "quiz",
    sectionTitle: currentQuiz?.questions?.find(question => question.id === questionId)?.sourceReference || "",
    label: `Answered quiz question ${currentQuiz?.questions?.findIndex(question => question.id === questionId) + 1}`
  });
  recordMasteryGraphQuizProgress();
  renderQuizPanel();
  renderMasteryGraphPanel();
}

function isQuizAnswered(question) {
  const value = quizAnswers[question.id];
  if (question.type === "multiple_choice") return Array.isArray(value) && value.length > 0;
  if (question.type === "single_choice") return Number.isInteger(value);
  if (question.type === "true_false") return typeof value === "boolean";
  return typeof value === "string" && value.trim().length > 0;
}

function revealQuizAnswer(questionId) {
  quizRevealedAnswers.add(questionId);
  persistCurrentQuizToHistory();
  if (typeof recordStudyActivity === "function") recordStudyActivity("quiz_answer_revealed", {
    tool: "quiz",
    sectionTitle: currentQuiz?.questions?.find(question => question.id === questionId)?.sourceReference || "",
    label: `Revealed answer for quiz question ${(currentQuiz?.questions?.findIndex(question => question.id === questionId) ?? -1) + 1}`
  });
  renderQuizPanel();
}

function arraysEqualNumbers(a, b) {
  const left = Array.isArray(a) ? [...a].sort((x, y) => x - y) : [];
  const right = Array.isArray(b) ? [...b].sort((x, y) => x - y) : [];
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function gradeQuestion(question) {
  const answer = quizAnswers[question.id];
  if (question.type === "single_choice") {
    const correct = question.correctOptionIndexes[0];
    return { objective: true, correct: answer === correct, earned: answer === correct ? question.points : 0, possible: question.points };
  }
  if (question.type === "multiple_choice") {
    const correct = arraysEqualNumbers(answer, question.correctOptionIndexes);
    return { objective: true, correct, earned: correct ? question.points : 0, possible: question.points };
  }
  if (question.type === "true_false") {
    const correct = answer === question.correctBoolean;
    return { objective: true, correct, earned: correct ? question.points : 0, possible: question.points };
  }
  return { objective: false, correct: null, earned: null, possible: question.points, answered: isQuizAnswered(question) };
}

function submitQuiz() {
  if (!currentQuiz) return;
  quizReport = gradeCurrentQuiz();
  if (!currentQuiz.examMode) {
    currentQuiz.questions.forEach(question => quizRevealedAnswers.add(question.id));
  }
  persistCurrentQuizToHistory();
  if (typeof recordStudyActivity === "function") recordStudyActivity("quiz_submitted", {
    tool: "quiz",
    label: "Submitted quiz and generated report",
    metadata: { objectivePercent: quizReport.objectivePercent, unanswered: quizReport.unanswered.length }
  });
  renderQuizPanel();
}

function gradeCurrentQuiz() {
  const rows = currentQuiz.questions.map(question => ({ question, grade: gradeQuestion(question) }));
  const objectiveRows = rows.filter(row => row.grade.objective);
  const subjectiveRows = rows.filter(row => !row.grade.objective);
  const objectiveEarned = objectiveRows.reduce((sum, row) => sum + row.grade.earned, 0);
  const objectivePossible = objectiveRows.reduce((sum, row) => sum + row.grade.possible, 0);
  const missed = objectiveRows.filter(row => !row.grade.correct);
  const unanswered = rows.filter(row => !isQuizAnswered(row.question));
  return {
    rows,
    objectiveEarned,
    objectivePossible,
    objectivePercent: objectivePossible ? Math.round((objectiveEarned / objectivePossible) * 100) : null,
    subjectiveCount: subjectiveRows.length,
    subjectiveAnswered: subjectiveRows.filter(row => row.grade.answered).length,
    missed,
    unanswered
  };
}

function renderQuizReport(report) {
  const score = report.objectivePercent === null
    ? "mostly written questions"
    : `${report.objectiveEarned}/${report.objectivePossible} (${report.objectivePercent}%)`;
  const weakItems = report.missed.slice(0, 3).map(row => escapeHTML(cleanMindText(row.question.sourceReference || row.question.question))).join("</li><li>");
  return `
    <div class="alert alert-primary quiz-report-motion" role="status" aria-live="polite">
      <div class="fw-bold mb-1">Quiz report</div>
      <div>Objective score: ${score}</div>
      ${report.subjectiveCount ? `<div>Written questions: ${report.subjectiveAnswered}/${report.subjectiveCount} answered. Self-check with the model answer and rubric.</div>` : ""}
      ${report.unanswered.length ? `<div class="mt-2">Unanswered questions: ${report.unanswered.length}.</div>` : ""}
      ${weakItems ? `<div class="mt-2">Review next:</div><ul class="mb-0"><li>${weakItems}</li></ul>` : `<div class="mt-2">Strong objective-question performance. Try a harder mix of question types next.</div>`}
    </div>
  `;
}

function renderQuestionFeedback(question, answer) {
  const grade = gradeQuestion(question);
  const tfLabels = Array.isArray(question.options) && question.options.length >= 2 ? question.options : ["True", "False"];
  const correctLabel = question.type === "true_false"
    ? (question.correctBoolean ? tfLabels[0] : tfLabels[1])
    : question.correctOptionIndexes.map(index => `${String.fromCharCode(65 + index)}. ${question.options[index] || ""}`).join("；");
  const status = grade.objective
    ? (grade.correct ? `<span class="badge text-bg-success">Correct</span>` : `<span class="badge text-bg-danger">Review needed</span>`)
    : `<span class="badge text-bg-info">Model answer</span>`;
  return `
    <div id="quiz-feedback-${escapeAttr(question.id)}" class="quiz-feedback quiz-feedback-motion ${grade.objective ? (grade.correct ? "is-correct" : "is-incorrect") : "is-review"} mt-3 border-top pt-3" role="status" aria-live="polite">
      <div class="mb-2">${status}</div>
      ${grade.objective ? `
        <div class="quiz-feedback-block">
          <div class="quiz-feedback-label">Correct answer:</div>
          <div class="quiz-answer-content">${markdownToHTML(correctLabel)}</div>
        </div>
      ` : ""}
      ${question.expectedAnswer ? `
        <div class="quiz-feedback-block">
          <div class="quiz-feedback-label">Model answer:</div>
          <div class="quiz-answer-content">${markdownToHTML(question.expectedAnswer)}</div>
        </div>
      ` : ""}
      ${question.explanation ? `
        <div class="quiz-feedback-block">
          <div class="quiz-feedback-label">Explanation:</div>
          <div class="quiz-explanation-content">${markdownToHTML(question.explanation)}</div>
        </div>
      ` : ""}
      ${question.rubric && question.rubric.length ? `
        <div class="small text-secondary">Rubric:</div>
        <ul class="quiz-rubric-list mb-0">${question.rubric.map(item => `<li>${inlineMarkdownHTML(item)}</li>`).join("")}</ul>
      ` : ""}
    </div>
  `;
}

function getFlashcardNoteKey() {
  if (currentHistoryId) return `history:${currentHistoryId}`;
  if (currentSourceFingerprint) return `fingerprint:${currentSourceFingerprint}`;
  return "";
}

function getFlashcardStore() {
  const parsed = safeReadJSONStorage(FLASHCARD_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function setFlashcardStore(store) {
  return safeWriteJSONStorage(FLASHCARD_STORAGE_KEY, store || {});
}

function normalizeClientFlashcard(card, index) {
  const front = String(card?.front || card?.term || card?.question || `Card ${index + 1}`).trim();
  const back = String(card?.back || card?.definition || card?.answer || "").trim();
  return {
    id: card?.id || `fc${index + 1}`,
    front,
    back: back || "Open the notes for the supporting explanation.",
    hint: String(card?.hint || "").trim(),
    sourceReference: String(card?.source_reference || card?.sourceReference || "").trim(),
    difficulty: String(card?.difficulty || "medium").trim().toLowerCase(),
    tags: Array.isArray(card?.tags) ? card.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 4) : []
  };
}

function normalizeClientFlashcardDeck(data) {
  const cards = Array.isArray(data?.cards) ? data.cards : [];
  return cards.map(normalizeClientFlashcard).filter(card => card.front && card.back);
}

function persistFlashcardsForCurrentNote() {
  const key = getFlashcardNoteKey();
  if (!key) return;
  const store = getFlashcardStore();
  store[key] = {
    title: storedTitle,
    updatedAt: new Date().toISOString(),
    settings: flashcardSettings,
    cards: currentFlashcards
  };
  setFlashcardStore(store);
}

function loadFlashcardsForCurrentNote() {
  const store = getFlashcardStore();
  const keys = [
    currentHistoryId ? `history:${currentHistoryId}` : "",
    currentSourceFingerprint ? `fingerprint:${currentSourceFingerprint}` : ""
  ].filter(Boolean);
  const record = keys.map(key => store[key]).find(item => item && Array.isArray(item.cards));
  currentFlashcards = record ? normalizeClientFlashcardDeck(record) : [];
  if (record?.settings) {
    flashcardSettings = normalizeFlashcardSettings(record.settings);
  }
  activeFlashcardIndex = 0;
  flashcardSide = "front";
  flashcardError = "";
  flashcardActivityMode = "cards";
  flashcardMatchingState = null;
  flashcardBuilderOpen = false;
}
