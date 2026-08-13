function deleteFlashcardDeck(historyId, sourceFingerprint = "") {
  const store = getFlashcardStore();
  delete store[`history:${historyId}`];
  if (sourceFingerprint) delete store[`fingerprint:${sourceFingerprint}`];
  setFlashcardStore(store);
}

let flashcardBuilderOpen = false;
let flashcardSettingsDraft = null;

function resetFlashcardState() {
  currentFlashcards = [];
  activeFlashcardIndex = 0;
  flashcardSide = "front";
  flashcardError = "";
  isFlashcardGenerating = false;
  flashcardActivityMode = "cards";
  flashcardMatchingState = null;
  flashcardBuilderOpen = false;
  renderFlashcardPanel();
}

function flashcardCountValue(settings = flashcardSettings) {
  if (settings.countMode === "30") return 30;
  if (settings.countMode === "60") return 60;
  if (settings.countMode === "custom") return Math.max(1, Math.min(Number.parseInt(settings.customCount, 10) || 20, 80));
  return null;
}

function renderFlashcardPanel() {
  const panel = document.getElementById("flashcardPanelContent");
  if (!panel) return;

  if (isFlashcardGenerating) {
    panel.innerHTML = `
      <div class="flashcard-builder-card">
        <div class="d-flex align-items-start gap-3">
          <span class="spinner-border spinner-border-sm mt-1" aria-hidden="true"></span>
          <div>
            <div class="fw-bold">Building flashcard deck...</div>
            <p class="text-secondary mb-0 mt-1">Synapse is turning the current notes into concise recall prompts.</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (flashcardError) {
    panel.innerHTML = `
      <div class="alert alert-danger">
        <strong>Flashcard generation failed.</strong><br>${escapeHTML(flashcardError)}
      </div>
      ${renderFlashcardBuilder()}
    `;
    return;
  }

  panel.innerHTML = currentFlashcards.length
    ? renderFlashcardStudyView()
    : (flashcardBuilderOpen ? renderFlashcardBuilder() : renderFlashcardLaunch());
  renderMath();
  if (flashcardActivityMode === "matching") {
    requestAnimationFrame(renderFlashcardMatchLines);
  }
}

function renderFlashcardLaunch() {
  const hasNotes = Boolean(fullSummary && fullSummary.trim());
  return renderStudyToolLaunch({
    tool: "flashcards",
    iconClass: "bi-card-text",
    title: "Build a flashcard deck",
    description: hasNotes
      ? "Turn definitions, contrasts, processes, examples, and evidence into a focused active-recall deck."
      : "Generate notes first, then build a flashcard deck from the material.",
    action: "generateFlashcards()",
    actionLabel: "Generate flashcards",
    hasNotes,
    kicker: "Active recall deck",
    estimate: "~30–90 sec",
    secondaryHint: "After each reveal, rate Again / Hard / Good / Easy — same idea as Anki and Quizlet Learn."
  });
}

function renderFlashcardBuilder() {
  const hasNotes = Boolean(fullSummary && fullSummary.trim());
  const countModes = [
    { value: "auto", label: "Auto", helper: "Synapse chooses the useful amount." },
    { value: "30", label: "30", helper: "A full short-review set." },
    { value: "60", label: "60", helper: "A broad exam-prep deck." },
    { value: "custom", label: "Custom", helper: "Pick your own count." }
  ];
  const currentMode = normalizeFlashcardSettings(flashcardSettings).countMode;
  const activeMode = countModes.find(mode => mode.value === currentMode) || countModes[0];
  return `
    <div class="flashcard-builder-wrap">
      <div class="flashcard-builder-card">
        <div class="flashcard-builder-kicker"><i class="bi bi-lightning-charge"></i> Active recall deck</div>
        <h4>Generate flashcards from these notes</h4>
        <p>Cards will focus on definitions, contrasts, processes, examples, data, and source figures that are useful to remember.</p>

        <label class="flashcard-field-label" for="flashcardLanguage">Card language</label>
        <select id="flashcardLanguage" class="form-select flashcard-language-select" onchange="updateFlashcardLanguage(this.value)">
          ${QUIZ_LANGUAGE_OPTIONS.map(option => `
            <option value="${option.value}" ${flashcardSettings.preferredLanguage === option.value ? "selected" : ""}>${escapeHTML(option.label)}</option>
          `).join("")}
        </select>

        <div class="flashcard-field-label mt-4">Card count</div>
        <div class="flashcard-count-row" role="group" aria-label="Flashcard count">
          ${countModes.map(mode => `
            <button class="flashcard-count-btn ${currentMode === mode.value ? "active" : ""}" type="button" onclick="setFlashcardCountMode('${mode.value}')">
              ${escapeHTML(mode.label)}
            </button>
          `).join("")}
        </div>
        <div class="flashcard-count-help">${escapeHTML(activeMode.helper)}</div>
        ${currentMode === "custom" ? `
          <input class="form-control flashcard-custom-count" type="number" min="1" max="80"
            value="${flashcardSettings.customCount}" oninput="updateFlashcardCustomCount(this.value)" onchange="updateFlashcardCustomCount(this.value)">
        ` : ""}

        <button class="btn btn-primary flashcard-generate-btn" type="button" onclick="generateFlashcards()" ${hasNotes ? "" : "disabled"}>
          <i class="bi bi-stars me-2"></i>Generate flashcards
        </button>
      </div>
    </div>
  `;
}

function renderFlashcardStudyView() {
  const total = currentFlashcards.length;
  activeFlashcardIndex = Math.max(0, Math.min(activeFlashcardIndex, total - 1));
  const card = currentFlashcards[activeFlashcardIndex];
  const sideText = flashcardSide === "front" ? card.front : card.back;
  const isMatchingMode = flashcardActivityMode === "matching";
  return `
    <div class="flashcard-study-wrap">
      <div class="flashcard-study-shell ${isMatchingMode ? "matching" : ""}">
        <div class="flashcard-study-top">
          <span>${isMatchingMode ? `${Math.min(total, flashcardMatchingLimit())} matching pairs` : `Card ${activeFlashcardIndex + 1} of ${total}`}</span>
          <div class="flashcard-study-top-actions">
            <div class="flashcard-mode-switch" role="group" aria-label="Flashcard activity mode">
              <button class="${!isMatchingMode ? "active" : ""}" type="button" onclick="setFlashcardActivityMode('cards')">
                <i class="bi bi-card-text me-1"></i>Cards
              </button>
              <button class="${isMatchingMode ? "active" : ""}" type="button" onclick="setFlashcardActivityMode('matching')">
                <i class="bi bi-bezier2 me-1"></i>Match
              </button>
            </div>
            ${isMatchingMode ? "" : `
              <button class="flashcard-reveal-btn" type="button" onclick="flipFlashcard()">
                <i class="bi bi-arrow-repeat me-1"></i>${flashcardSide === "front" ? "Reveal" : "Show front"}
              </button>
            `}
          </div>
        </div>
        ${isMatchingMode ? renderFlashcardMatchingActivity() : `
          <button class="flashcard-stage ${flashcardSide === "back" ? "back" : ""}" type="button" onclick="flipFlashcard()">
            <span class="flashcard-side-label">${flashcardSide === "front" ? "Prompt" : "Answer"}</span>
            <div class="flashcard-main-text">${markdownToHTML(sideText)}</div>
            ${flashcardSide === "front" && card.hint ? `<div class="flashcard-hint"><strong>Hint:</strong> ${markdownToHTML(card.hint)}</div>` : ""}
            ${flashcardSide === "back" && card.sourceReference ? `<div class="flashcard-source"><strong>Source basis:</strong> ${inlineMarkdownHTML(card.sourceReference)}</div>` : ""}
          </button>
          ${flashcardSide === "back" ? `
            <div class="flashcard-grade-row" role="group" aria-label="How well did you recall this card?">
              <span class="flashcard-grade-label">Rate your recall</span>
              <div class="flashcard-grade-actions">
                <button class="flashcard-grade-btn flashcard-grade-again" type="button" onclick="gradeFlashcard('again')">Again</button>
                <button class="flashcard-grade-btn flashcard-grade-hard" type="button" onclick="gradeFlashcard('hard')">Hard</button>
                <button class="flashcard-grade-btn flashcard-grade-good" type="button" onclick="gradeFlashcard('good')">Good</button>
                <button class="flashcard-grade-btn flashcard-grade-easy" type="button" onclick="gradeFlashcard('easy')">Easy</button>
              </div>
            </div>
          ` : `
            <p class="flashcard-study-hint">Try to answer mentally, then reveal — like Quizlet/Anki active recall.</p>
          `}
          <div class="flashcard-nav-row">
            <button class="btn btn-outline-primary" type="button" onclick="setActiveFlashcard(${activeFlashcardIndex - 1})" ${activeFlashcardIndex <= 0 ? "disabled" : ""}>
              <i class="bi bi-chevron-left me-1"></i>Previous
            </button>
            <button class="btn btn-outline-primary" type="button" onclick="setActiveFlashcard(${activeFlashcardIndex + 1})" ${activeFlashcardIndex >= total - 1 ? "disabled" : ""}>
              Next<i class="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        `}
      </div>
      <div class="flashcard-footer-actions">
        <button type="button" onclick="openFlashcardListModal()">All flashcards</button>
        ${isMatchingMode ? `<button type="button" onclick="resetFlashcardMatching()"><i class="bi bi-eraser me-1"></i>Reset match</button>` : ""}
        <button type="button" onclick="regenerateFlashcards()"><i class="bi bi-arrow-clockwise me-1"></i>Regenerate</button>
      </div>
    </div>
  `;
}

function flashcardMatchingLimit() {
  return Math.max(3, Math.min(8, Number(window.SYNAPSE_FLASHCARD_MATCH_LIMIT || 8)));
}

const FLASHCARD_MATCH_LINE_COLORS = [
  "#6d5dfc",
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#22c55e",
  "#f97316"
];

function normaliseFlashcardMatchText(value, limit = 110, wordLimit = 18, fallback = "Open the notes for this answer.") {
  const cleaned = cleanMindText(value || "")
    .replace(/[`*_>#-]+/g, " ")
    .replace(/\s*(?:\.{3}|…)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return fallback;

  const sentenceMatch = cleaned.match(/^[^.!?。！？]+[.!?。！？]?/);
  const sentence = (sentenceMatch?.[0] || cleaned).trim();
  const words = sentence.split(/\s+/).filter(Boolean);
  let compact = words.length > wordLimit ? words.slice(0, wordLimit).join(" ") : sentence;
  if (compact.length > limit) {
    const sliced = compact.slice(0, limit).trim();
    const cut = Math.max(
      sliced.lastIndexOf(" "),
      sliced.lastIndexOf(","),
      sliced.lastIndexOf(";"),
      sliced.lastIndexOf("，"),
      sliced.lastIndexOf("；")
    );
    compact = sliced.slice(0, cut >= Math.floor(limit * 0.45) ? cut : limit).trim();
  }
  compact = compact
    .replace(/\s+(?:and|or|but|because|with|for|to|of|the|a|an)$/i, "")
    .replace(/[,:;，；-]+$/g, "")
    .trim();
  return compact || fallback;
}

function deckSignatureForMatching(cards = currentFlashcards) {
  return (cards || [])
    .map(card => `${card.id || ""}:${normaliseFlashcardMatchText(card.front, 82, 12, "Prompt")}=>${normaliseFlashcardMatchText(card.back, 110, 18, "Answer")}`)
    .join("|");
}

function stableFlashcardShuffle(items, seed = "") {
  return [...items]
    .map((item, index) => {
      let hash = 2166136261;
      const source = `${seed}:${item.id}:${index}`;
      for (let i = 0; i < source.length; i += 1) {
        hash ^= source.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
      }
      return { item, rank: hash };
    })
    .sort((a, b) => a.rank - b.rank)
    .map(entry => entry.item);
}

function buildFlashcardMatchingPairs(cards = currentFlashcards, limit = flashcardMatchingLimit()) {
  const seen = new Set();
  return (cards || [])
    .map((card, index) => {
      const front = normaliseFlashcardMatchText(card.front, 82, 12, "Recall prompt");
      const back = normaliseFlashcardMatchText(card.back, 110, 18, "Source answer");
      const key = `${front.toLowerCase()}=>${back.toLowerCase()}`;
      if (!front || !back || seen.has(key)) return null;
      seen.add(key);
      const id = String(card.id || `fc${index + 1}`).replace(/[^A-Za-z0-9_-]/g, "_");
      return {
        id,
        termId: `term-${id}`,
        branchId: `branch-${id}`,
        term: front,
        branch: back,
        termFull: cleanMindText(card.front || front),
        branchFull: cleanMindText(card.back || back),
        sourceReference: card.sourceReference || "",
        difficulty: card.difficulty || "medium"
      };
    })
    .filter(Boolean)
    .slice(0, limit);
}

function createFlashcardMatchingState(cards = currentFlashcards) {
  return {
    deckSignature: deckSignatureForMatching(cards),
    matches: {},
    selectedTermId: "",
    draggingTermId: "",
    validated: false,
    lastScore: null
  };
}

function ensureFlashcardMatchingState() {
  const signature = deckSignatureForMatching();
  if (!flashcardMatchingState || flashcardMatchingState.deckSignature !== signature) {
    flashcardMatchingState = createFlashcardMatchingState();
  }
  return flashcardMatchingState;
}

function findFlashcardMatchPairByTerm(termId, pairs = buildFlashcardMatchingPairs()) {
  return pairs.find(pair => pair.termId === termId) || null;
}

function findFlashcardMatchPairByBranch(branchId, pairs = buildFlashcardMatchingPairs()) {
  return pairs.find(pair => pair.branchId === branchId) || null;
}

function connectFlashcardMatchPair(termId, branchId, state = ensureFlashcardMatchingState()) {
  if (!termId || !branchId) return state;
  Object.entries(state.matches || {}).forEach(([existingTermId, existingBranchId]) => {
    if (existingBranchId === branchId && existingTermId !== termId) {
      delete state.matches[existingTermId];
    }
  });
  state.matches = { ...(state.matches || {}), [termId]: branchId };
  state.selectedTermId = "";
  state.validated = false;
  state.lastScore = null;
  return state;
}

function flashcardMatchValidationSummary(pairs = buildFlashcardMatchingPairs(), state = ensureFlashcardMatchingState()) {
  const total = pairs.length;
  const matched = pairs.filter(pair => state.matches?.[pair.termId]).length;
  const correct = pairs.filter(pair => state.matches?.[pair.termId] === pair.branchId).length;
  const wrong = Math.max(0, matched - correct);
  return { total, matched, correct, wrong, complete: total > 0 && correct === total };
}

function flashcardMatchStatusForPair(pair, state = ensureFlashcardMatchingState()) {
  if (!state.validated) return "";
  const branchId = state.matches?.[pair.termId] || "";
  if (!branchId) return "missing";
  return branchId === pair.branchId ? "correct" : "incorrect";
}

function setFlashcardActivityMode(mode) {
  flashcardActivityMode = mode === "matching" ? "matching" : "cards";
  if (flashcardActivityMode === "matching") ensureFlashcardMatchingState();
  if (typeof recordStudyActivity === "function") recordStudyActivity("flashcard_activity_started", {
    tool: "flashcards",
    label: `Started ${flashcardActivityMode === "matching" ? "matching" : "flashcard review"} activity`
  });
  renderFlashcardPanel();
}

function selectFlashcardMatchTerm(termId) {
  const state = ensureFlashcardMatchingState();
  state.selectedTermId = state.selectedTermId === termId ? "" : termId;
  state.validated = false;
  state.lastScore = null;
  renderFlashcardPanel();
}

function selectFlashcardMatchBranch(branchId) {
  const state = ensureFlashcardMatchingState();
  if (state.selectedTermId) {
    connectFlashcardMatchPair(state.selectedTermId, branchId, state);
    renderFlashcardPanel();
    return;
  }
  const usedTermId = Object.keys(state.matches || {}).find(termId => state.matches[termId] === branchId);
  if (usedTermId) {
    state.selectedTermId = usedTermId;
    state.validated = false;
    state.lastScore = null;
    renderFlashcardPanel();
  }
}

function handleFlashcardMatchDragStart(event, termId) {
  const state = ensureFlashcardMatchingState();
  state.draggingTermId = termId;
  state.selectedTermId = termId;
  state.validated = false;
  state.lastScore = null;
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = "link";
    event.dataTransfer.setData("text/plain", termId);
  }
}

function handleFlashcardMatchDrop(event, branchId) {
  if (event) event.preventDefault();
  const state = ensureFlashcardMatchingState();
  const termId = event?.dataTransfer?.getData("text/plain") || state.draggingTermId || state.selectedTermId;
  state.draggingTermId = "";
  if (termId) {
    connectFlashcardMatchPair(termId, branchId, state);
    renderFlashcardPanel();
  }
}

function validateFlashcardMatches() {
  const state = ensureFlashcardMatchingState();
  const pairs = buildFlashcardMatchingPairs();
  state.validated = true;
  state.lastScore = flashcardMatchValidationSummary(pairs, state);
  if (typeof recordStudyActivity === "function") recordStudyActivity("flashcard_match_completed", {
    tool: "flashcards",
    label: `Checked flashcard matching: ${state.lastScore.correct}/${state.lastScore.total} correct`,
    metadata: { correct: state.lastScore.correct, total: state.lastScore.total }
  });
  renderFlashcardPanel();
}

function resetFlashcardMatching() {
  flashcardMatchingState = createFlashcardMatchingState();
  renderFlashcardPanel();
}

function retryFlashcardMatching() {
  const state = ensureFlashcardMatchingState();
  const pairs = buildFlashcardMatchingPairs();
  const kept = {};
  pairs.forEach(pair => {
    if (state.matches?.[pair.termId] === pair.branchId) {
      kept[pair.termId] = pair.branchId;
    }
  });
  flashcardMatchingState = {
    ...createFlashcardMatchingState(),
    matches: kept
  };
  renderFlashcardPanel();
}

