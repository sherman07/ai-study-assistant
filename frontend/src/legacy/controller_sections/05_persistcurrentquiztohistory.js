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

