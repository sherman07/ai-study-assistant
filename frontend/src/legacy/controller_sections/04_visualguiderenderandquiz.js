function renderVisualGuideFigureCards(indexes = [], { compact = false, limit = 3 } = {}) {
  const figures = visualGuideSourceFigureItems(indexes, limit);
  if (!figures.length) return "";
  return `
    <div class="visual-guide-figure-grid ${compact ? "compact" : ""}">
      ${figures.map(({ index, item }) => {
        const label = `Source figure ${index + 1}`;
        const title = cleanSourceFigureDisplayText(item.title || item.caption || label) || label;
        const detail = getVisualDetailText(item, ["what_shows", "argument_supported", "how_to_read", "caption"]);
        const meta = cleanSourceFigureDisplayText(item.location || item.source_title || "");
        return `
          <button class="visual-guide-figure-card" type="button" onclick="openVisualModal(${index})" aria-label="Open ${escapeAttr(label)}">
            <img src="${escapeAttr(item.url)}" alt="${escapeAttr(title)}" loading="lazy" decoding="async">
            <span>${escapeHTML(label)}</span>
            <strong>${escapeHTML(title)}</strong>
            ${detail && !compact ? `<small>${escapeHTML(detail)}</small>` : ""}
            ${meta && compact ? `<small>${escapeHTML(meta)}</small>` : ""}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderVisualGuideWebImageCards(indexes = [], { compact = false, limit = 3 } = {}) {
  const figures = visualGuideWebImageItems(indexes, limit);
  if (!figures.length) return "";
  return `
    <div class="visual-guide-figure-grid ${compact ? "compact" : ""}">
      ${figures.map(({ index, item }) => {
        const label = item.provider || "Reference image";
        const title = cleanSourceFigureDisplayText(item.title || item.query || label) || label;
        const meta = [item.license, item.credit].filter(Boolean).join(" · ");
        return `
          <button class="visual-guide-figure-card web-image" type="button" onclick="openVisualGuideWebImage(${index})" aria-label="Open ${escapeAttr(label)}">
            <img src="${escapeAttr(item.url)}" alt="${escapeAttr(title)}" loading="lazy" decoding="async">
            <span>${escapeHTML(label)}</span>
            <strong>${escapeHTML(title)}</strong>
            ${meta ? `<small>${escapeHTML(meta)}</small>` : ""}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderVisualGuidePanelImages(panel, { compact = true, limit = 2 } = {}) {
  const sourceImages = renderVisualGuideFigureCards(panel.sourceFigureIndexes, { compact, limit });
  const webImages = renderVisualGuideWebImageCards(panel.webImageIndexes, { compact, limit });
  return [sourceImages, webImages].filter(Boolean).join("");
}

function renderVisualGuideHeroFigures(guide) {
  const panelsAlreadyUseFigures = (guide?.panels || []).some(panel => (panel.sourceFigureIndexes || []).length);
  if (panelsAlreadyUseFigures) return "";
  const indexes = visualGuideUniqueFigureIndexes(guide, 3);
  if (!indexes.length) return "";
  return `
    <div class="visual-guide-hero-gallery" aria-label="Key source figures">
      ${renderVisualGuideFigureCards(indexes, { compact: true, limit: 3 })}
    </div>
  `;
}

function renderVisualGuideMiniVisual(panel, index) {
  const type = String(panel.visualType || "concept").toLowerCase();
  if (type === "formula" && panel.formula) {
    return `<div class="visual-guide-formula">${markdownToHTML(panel.formula)}</div>`;
  }
  const nodes = (panel.keyPoints.length ? panel.keyPoints : [panel.visualPrompt || panel.title, panel.sourceEvidence])
    .filter(Boolean)
    .slice(0, 3);
  return `
    <div class="visual-guide-mini-visual ${escapeAttr(type)}">
      <i class="bi ${visualGuideIcon(type)}"></i>
      <div class="visual-guide-mini-lines">
        ${nodes.map((node, nodeIndex) => `
          <span style="--node:${nodeIndex + 1}"></span>
        `).join("")}
      </div>
      <b>${String(index + 1).padStart(2, "0")}</b>
    </div>
  `;
}

function renderVisualGuidePanelMedia(panel, index) {
  const sourceFigures = renderVisualGuidePanelImages(panel, { compact: true, limit: 2 });
  const drawnVisual = renderVisualGuideMiniVisual(panel, index);
  if (!sourceFigures) return drawnVisual;
  return `
    <div class="visual-guide-panel-media">
      ${sourceFigures}
    </div>
  `;
}

function renderVisualGuideFigureLinks(indexes = []) {
  const unique = [...new Set((indexes || []).filter(index => Number.isInteger(index) && getLearningFigureByMarker(index)))];
  if (!unique.length) return "";
  return `
    <div class="visual-guide-figures">
      ${unique.map(index => `
        <button type="button" onclick="openVisualModal(${index})">
          <i class="bi bi-image"></i> Source figure ${index + 1}
        </button>
      `).join("")}
    </div>
  `;
}

function renderVisualGuide(guide) {
  const panels = (guide.panels || []).slice(0, 8);
  const flow = guide.flow || [];
  const sourceMap = guide.sourceMap || [];
  const reviewPrompts = guide.reviewPrompts || [];
  return `
    <div class="visual-guide-shell">
      <div class="visual-guide-toolbar">
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="generateVisualGuide(true)">
          <i class="bi bi-arrow-clockwise me-1"></i>Regenerate
        </button>
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="exportVisualGuidePNG()" data-visual-guide-export="png">
          <i class="bi bi-filetype-png me-1"></i>PNG
        </button>
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="exportVisualGuidePDF()" data-visual-guide-export="pdf">
          <i class="bi bi-filetype-pdf me-1"></i>PDF
        </button>
      </div>
      <article class="visual-guide-poster">
        <header class="visual-guide-hero">
          <div>
            <span class="visual-guide-kicker">Source-wide visual guide</span>
            <h3>${escapeHTML(guide.title || `${storedTitle} Visual Guide`)}</h3>
            ${guide.subtitle ? `<p>${markdownToHTML(guide.subtitle)}</p>` : ""}
          </div>
          <div class="visual-guide-hero-side">
            <div class="visual-guide-hero-mark">
              <i class="bi bi-layout-text-window-reverse"></i>
              <span>${panels.length || 0} panels</span>
            </div>
            ${renderVisualGuideHeroFigures(guide)}
          </div>
        </header>

        ${guide.thesis || guide.coverageNote ? `
          <section class="visual-guide-thesis">
            ${guide.thesis ? `<div><strong>Core idea</strong>${markdownToHTML(guide.thesis)}</div>` : ""}
            ${guide.coverageNote ? `<div><strong>Coverage</strong>${markdownToHTML(guide.coverageNote)}</div>` : ""}
          </section>
        ` : ""}

        ${flow.length ? `
          <section class="visual-guide-flow" aria-label="Guide flow">
            ${flow.map((item, index) => `
              <div>
                <span>${index + 1}</span>
                <strong>${escapeHTML(item.label)}</strong>
                ${item.text ? `<p>${escapeHTML(item.text)}</p>` : ""}
              </div>
            `).join("")}
          </section>
        ` : ""}

        <section class="visual-guide-panel-grid">
          ${panels.map((panel, index) => `
            <article class="visual-guide-panel visual-guide-panel-${escapeAttr(panel.visualType)}">
              <div class="visual-guide-panel-top">
                <span>${escapeHTML(panel.kicker)}</span>
                <i class="bi ${visualGuideIcon(panel.visualType)}"></i>
              </div>
              ${renderVisualGuidePanelMedia(panel, index)}
              <h4>${escapeHTML(panel.title)}</h4>
              ${panel.body ? `<div class="visual-guide-panel-body">${markdownToHTML(panel.body)}</div>` : ""}
              ${panel.keyPoints.length ? `
                <ul class="visual-guide-points">
                  ${panel.keyPoints.map(point => `<li>${markdownToHTML(point)}</li>`).join("")}
                </ul>
              ` : ""}
              ${panel.sourceEvidence ? `
                <div class="visual-guide-evidence">
                  <span>Source evidence</span>
                  ${markdownToHTML(panel.sourceEvidence)}
                </div>
              ` : ""}
              ${panel.sourceRefs.length ? `
                <div class="visual-guide-ref-row">
                  ${panel.sourceRefs.map(ref => `<span>${escapeHTML(ref)}</span>`).join("")}
                </div>
              ` : ""}
              ${(panel.sourceFigureIndexes || []).length ? "" : renderVisualGuideFigureLinks(panel.sourceFigureIndexes)}
            </article>
          `).join("")}
        </section>

        <footer class="visual-guide-footer">
          ${sourceMap.length ? `<span>${escapeHTML(sourceMap.length)} source${sourceMap.length === 1 ? "" : "s"} covered</span>` : ""}
          ${reviewPrompts.slice(0, 2).map(prompt => `<span>${markdownToHTML(prompt)}</span>`).join("")}
        </footer>
      </article>
    </div>
  `;
}

function renderVisualImageGuide(guide) {
  const imageUrl = guide?.imageDataUrl || "";
  if (!imageUrl) return renderVisualGuideLaunch();
  const meta = [
    guide.imageProcessing?.layout,
    guide.requestedModel ? `requested ${guide.requestedModel}` : guide.model,
    guide.size,
    guide.styleVersion
  ].map(item => cleanVisualGuideGeneratedText(item)).filter(Boolean).join(" • ");
  const renderingNote = cleanVisualGuideGeneratedText(guide.renderingNote || "");
  return `
    <div class="visual-image-guide-shell">
      <div class="visual-guide-toolbar">
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="generateVisualGuide(true)">
          <i class="bi bi-arrow-clockwise me-1"></i>Regenerate image
        </button>
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="downloadVisualImageGuidePNG()">
          <i class="bi bi-download me-1"></i>PNG
        </button>
      </div>
      <figure class="visual-image-guide-card">
        <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(guide.title || "Visual image guide")}" loading="lazy" decoding="async">
        <figcaption>
          <strong>${escapeHTML(guide.title || "Visual Image Guide")}</strong>
          ${meta ? `<span>${escapeHTML(meta)}</span>` : ""}
          ${renderingNote ? `<span>${escapeHTML(renderingNote)}</span>` : ""}
        </figcaption>
      </figure>
    </div>
  `;
}

function setupFlashcardTool() {
  const switcher = document.querySelector(".tool-switcher");
  if (switcher && !document.getElementById("toolBtnFlashcards")) {
    switcher.insertAdjacentHTML("beforeend", `
      <button id="toolBtnFlashcards" class="tool-switch-btn" type="button" onclick="switchTool('flashcards', this)">
        <i class="bi bi-card-text me-1"></i>Flashcards
      </button>
    `);
  }

  const studyToolsCard = document.querySelector(".study-tools-card");
  if (studyToolsCard && !document.getElementById("toolPanelFlashcards")) {
    studyToolsCard.insertAdjacentHTML("beforeend", `
      <div id="toolPanelFlashcards" class="tool-panel">
        <div class="tool-panel-head d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h3>Flashcards</h3>
            <p>Build a source-grounded concept deck for fast active recall.</p>
          </div>
          <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="clearFlashcardsAndShowBuilder()">
            <i class="bi bi-sliders me-1"></i>Flashcard settings
          </button>
        </div>
        <div id="flashcardPanelContent"></div>
      </div>
    `);
  }

  loadFlashcardsForCurrentNote();
  renderFlashcardPanel();
}

function setupQuizTool() {
  const switcher = document.querySelector(".tool-switcher");
  const quizButton = switcher
    ? Array.from(switcher.querySelectorAll(".tool-switch-btn")).find(button =>
      button.id === "toolBtnQuiz" || button.querySelector(".bi-patch-question") || button.textContent.trim().toLowerCase().includes("quiz")
    )
    : null;

  if (quizButton) {
    quizButton.id = "toolBtnQuiz";
    quizButton.disabled = false;
    quizButton.classList.remove("disabled");
    quizButton.setAttribute("aria-disabled", "false");
    quizButton.innerHTML = `<i class="bi bi-patch-question me-1"></i>Quiz`;
    quizButton.onclick = () => switchTool("quiz", quizButton);
  }

  const studyToolsCard = document.querySelector(".study-tools-card");
  if (studyToolsCard && !document.getElementById("toolPanelQuiz")) {
    studyToolsCard.insertAdjacentHTML("beforeend", `
      <div id="toolPanelQuiz" class="tool-panel">
        <div class="tool-panel-head d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h3>Quiz</h3>
            <p>Generate source-grounded questions from the current notes to practise understanding, application, and exam phrasing.</p>
          </div>
          <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="openQuizSettingsModal()">
            <i class="bi bi-sliders me-1"></i>Quiz settings
          </button>
        </div>
        <div id="quizPanelContent"></div>
      </div>
    `);
  }

  renderQuizPanel();
}

function getQuizTypeLabel(type) {
  return QUIZ_TYPE_OPTIONS.find(option => option.value === type)?.label || type;
}

function getQuizDifficultyLabel(value) {
  const labels = {
    easy: "Basic",
    medium: "Medium",
    hard: "Challenge"
  };
  return labels[String(value || "").toLowerCase()] || "Medium";
}

function quizTypePlanTotal(settings = quizSettings) {
  return (settings.questionTypes || []).reduce((sum, row) => sum + clampQuizNumber(row.count, 1), 0);
}

function quizSettingsSummaryHTML(settings = quizSettings) {
  const rows = (settings.questionTypes || []).map(row =>
    `<span class="quiz-summary-pill">${escapeHTML(getQuizTypeLabel(row.type))} × ${clampQuizNumber(row.count, 1)}</span>`
  ).join("");
  return `
    <div class="quiz-summary-pills" aria-label="Quiz settings summary">
      <span class="quiz-summary-pill quiz-summary-pill-primary">${settings.examMode ? "Exam mode" : "Practice mode"}</span>
      <span class="quiz-summary-pill">${escapeHTML(getQuizLanguageLabel(settings.preferredLanguage))}</span>
      <span class="quiz-summary-pill">${settings.totalQuestions} questions</span>
      ${rows}
    </div>
  `;
}

function getQuizNoteKey() {
  if (currentHistoryId) return `history:${currentHistoryId}`;
  if (currentSourceFingerprint) return `fingerprint:${currentSourceFingerprint}`;
  return "";
}

function getQuizHistoryStore() {
  const parsed = safeReadJSONStorage(QUIZ_HISTORY_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function setQuizHistoryStore(store) {
  return safeWriteJSONStorage(QUIZ_HISTORY_STORAGE_KEY, store || {});
}

function makeQuizHistoryId() {
  return `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeStoredQuizRecord(record) {
  if (!record || typeof record !== "object") return null;
  const quiz = normalizeClientQuiz(record.quiz || record);
  if (!quiz.questions.length) return null;
  const answers = record.answers && typeof record.answers === "object" && !Array.isArray(record.answers)
    ? record.answers
    : {};
  const revealedIds = Array.isArray(record.revealedIds)
    ? record.revealedIds.map(id => String(id)).filter(Boolean)
    : [];
  return {
    id: record.id || makeQuizHistoryId(),
    title: record.title || quiz.title || `${storedTitle || "Study"} Quiz`,
    createdAt: record.createdAt || record.created_at || new Date().toISOString(),
    updatedAt: record.updatedAt || record.updated_at || record.createdAt || new Date().toISOString(),
    noteTitle: record.noteTitle || storedTitle || "Study Notes",
    settings: normalizeQuizSettings(record.settings || quizSettings),
    quiz,
    answers,
    revealedIds,
    report: record.report || null
  };
}

function getQuizHistoryRecordsForCurrentNote() {
  const store = getQuizHistoryStore();
  const keys = [
    currentHistoryId ? `history:${currentHistoryId}` : "",
    currentSourceFingerprint ? `fingerprint:${currentSourceFingerprint}` : ""
  ].filter(Boolean);
  const rawRecords = keys.flatMap(key => Array.isArray(store[key]) ? store[key] : []);
  const seen = new Set();
  return rawRecords
    .map(normalizeStoredQuizRecord)
    .filter(Boolean)
    .filter(record => {
      if (seen.has(record.id)) return false;
      seen.add(record.id);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, QUIZ_HISTORY_LIMIT);
}

function applyQuizHistoryRecord(record, options = {}) {
  const normalized = normalizeStoredQuizRecord(record);
  if (!normalized) return;
  currentQuiz = normalized.quiz;
  quizAnswers = { ...normalized.answers };
  quizRevealedAnswers = new Set(normalized.revealedIds || []);
  quizReport = normalized.report || null;
  activeQuizQuestionIndex = 0;
  activeQuizHistoryId = normalized.id;
  if (options.render !== false) {
    switchTool("quiz");
    renderQuizPanel();
  }
}

function loadQuizHistoryForCurrentNote() {
  quizHistory = getQuizHistoryRecordsForCurrentNote();
  if (quizHistory.length) {
    applyQuizHistoryRecord(quizHistory[0], { render: false });
  } else {
    currentQuiz = null;
    quizAnswers = {};
    quizRevealedAnswers = new Set();
    quizReport = null;
    activeQuizQuestionIndex = 0;
    activeQuizHistoryId = "";
  }
}
