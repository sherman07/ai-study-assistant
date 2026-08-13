function renderFlashcardMatchingActivity() {
  const state = ensureFlashcardMatchingState();
  const pairs = buildFlashcardMatchingPairs();
  if (pairs.length < 2) {
    return `
      <div class="flashcard-match-empty">
        <i class="bi bi-bezier2"></i>
        <strong>Not enough pairs yet</strong>
        <p>Generate at least two flashcards to build a matching-line activity.</p>
      </div>
    `;
  }

  const branches = stableFlashcardShuffle(
    pairs.map(pair => ({
      id: pair.branchId,
      pairId: pair.id,
      text: pair.branch,
      branchFull: pair.branchFull,
      sourceReference: pair.sourceReference
    })),
    state.deckSignature
  );
  const score = state.lastScore || flashcardMatchValidationSummary(pairs, state);
  const statusText = state.validated
    ? (score.complete ? "All matches are correct." : `${score.correct}/${score.total} correct. Missed pairs are marked.`)
    : `${score.matched}/${score.total} connected.`;
  return `
    <div class="flashcard-match-module ${state.validated ? "validated" : ""}">
      <div class="flashcard-match-head">
        <div>
          <span class="flashcard-side-label">Matching lines</span>
          <h4>Connect each prompt to the correct branch</h4>
          <p>Each line links a recall prompt with its source-grounded answer.</p>
        </div>
        <div class="flashcard-match-score ${score.complete ? "complete" : ""}">
          <strong>${score.correct}/${score.total}</strong>
          <span>${escapeHTML(statusText)}</span>
        </div>
      </div>

      <div class="flashcard-match-board aligned" id="flashcardMatchBoard">
        <svg id="flashcardMatchLines" class="flashcard-match-lines" aria-hidden="true"></svg>
        <div class="flashcard-match-row flashcard-match-row-head">
          <div class="flashcard-match-column-title">Prompts</div>
          <div class="flashcard-match-rail-title" aria-hidden="true"></div>
          <div class="flashcard-match-column-title">Branches</div>
        </div>
        ${pairs.map((pair, index) => {
          const branch = branches[index];
          const connectedTermId = branch
            ? Object.keys(state.matches || {}).find(termId => state.matches[termId] === branch.id) || ""
            : "";
          const connectedPair = connectedTermId ? findFlashcardMatchPairByTerm(connectedTermId, pairs) : null;
          const branchStatus = state.validated && connectedPair
            ? (connectedPair.branchId === branch.id ? "correct" : "incorrect")
            : "";
          const matchedBranchId = state.matches?.[pair.termId] || "";
          const termStatus = flashcardMatchStatusForPair(pair, state);
          return `
            <div class="flashcard-match-row">
              <button class="flashcard-match-card match-term-card ${state.selectedTermId === pair.termId ? "selected" : ""} ${matchedBranchId ? "connected" : ""} ${termStatus}"
                type="button"
                draggable="true"
                data-term-id="${escapeAttr(pair.termId)}"
                data-branch-id="${escapeAttr(matchedBranchId)}"
                title="${escapeAttr(pair.termFull || pair.term)}"
                onclick="selectFlashcardMatchTerm('${escapeAttr(pair.termId)}')"
                ondragstart="handleFlashcardMatchDragStart(event, '${escapeAttr(pair.termId)}')">
                <span class="flashcard-match-index">${index + 1}</span>
                <span class="flashcard-match-text">${escapeHTML(pair.term)}</span>
              </button>
              <div class="flashcard-match-rail" aria-hidden="true"></div>
              <button class="flashcard-match-card match-branch-card ${connectedTermId ? "connected" : ""} ${branchStatus}"
                type="button"
                data-branch-id="${escapeAttr(branch.id)}"
                data-term-id="${escapeAttr(connectedTermId)}"
                title="${escapeAttr(branch.branchFull || branch.text)}"
                onclick="selectFlashcardMatchBranch('${escapeAttr(branch.id)}')"
                ondragover="event.preventDefault()"
                ondrop="handleFlashcardMatchDrop(event, '${escapeAttr(branch.id)}')">
                <span class="flashcard-match-index">${String.fromCharCode(65 + index)}</span>
                <span class="flashcard-match-text">${escapeHTML(branch.text)}</span>
              </button>
            </div>
          `;
        }).join("")}
      </div>

      <div class="flashcard-match-actions">
        <button class="btn btn-primary" type="button" onclick="validateFlashcardMatches()" ${score.matched < score.total ? "disabled" : ""}>
          <i class="bi bi-check2-circle me-1"></i>Check matches
        </button>
        <button class="btn btn-outline-primary" type="button" onclick="retryFlashcardMatching()" ${state.validated && score.wrong > 0 ? "" : "disabled"}>
          <i class="bi bi-arrow-counterclockwise me-1"></i>Retry missed
        </button>
        <button class="btn btn-outline-secondary" type="button" onclick="resetFlashcardMatching()">
          <i class="bi bi-eraser me-1"></i>Reset
        </button>
      </div>
    </div>
  `;
}

function renderFlashcardMatchLines() {
  const board = document.getElementById("flashcardMatchBoard");
  const svg = document.getElementById("flashcardMatchLines");
  if (!board || !svg || flashcardActivityMode !== "matching") return;
  const state = ensureFlashcardMatchingState();
  const boardRect = board.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${Math.max(1, boardRect.width)} ${Math.max(1, boardRect.height)}`);
  svg.setAttribute("width", boardRect.width);
  svg.setAttribute("height", boardRect.height);

  const lines = Object.entries(state.matches || []).map(([termId, branchId], index) => {
    const term = Array.from(board.querySelectorAll(".match-term-card")).find(element => element.dataset.termId === termId);
    const branch = Array.from(board.querySelectorAll(".match-branch-card")).find(element => element.dataset.branchId === branchId);
    if (!term || !branch) return "";
    const termRect = term.getBoundingClientRect();
    const branchRect = branch.getBoundingClientRect();
    const x1 = termRect.right - boardRect.left;
    const y1 = termRect.top - boardRect.top + termRect.height / 2;
    const x2 = branchRect.left - boardRect.left;
    const y2 = branchRect.top - boardRect.top + branchRect.height / 2;
    const curve = Math.max(36, Math.min(140, (x2 - x1) * 0.42));
    const pair = findFlashcardMatchPairByTerm(termId);
    const status = state.validated && pair ? (branchId === pair.branchId ? "correct" : "incorrect") : "";
    const color = FLASHCARD_MATCH_LINE_COLORS[index % FLASHCARD_MATCH_LINE_COLORS.length];
    return `<path class="${status}" style="--match-line-color: ${escapeAttr(color)}" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + curve).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - curve).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}" />`;
  }).join("");

  svg.innerHTML = lines;
}

function setFlashcardCountMode(mode) {
  flashcardSettings = normalizeFlashcardSettings({ ...flashcardSettings, countMode: mode });
  safeSetLocalStorage(FLASHCARD_SETTINGS_KEY, JSON.stringify(flashcardSettings));
  renderFlashcardPanel();
}

function updateFlashcardCustomCount(value) {
  flashcardSettings = normalizeFlashcardSettings({ ...flashcardSettings, customCount: value, countMode: "custom" });
  safeSetLocalStorage(FLASHCARD_SETTINGS_KEY, JSON.stringify(flashcardSettings));
}

function updateFlashcardLanguage(value) {
  flashcardSettings = normalizeFlashcardSettings({ ...flashcardSettings, preferredLanguage: value });
  safeSetLocalStorage(FLASHCARD_SETTINGS_KEY, JSON.stringify(flashcardSettings));
}

function clearFlashcardsAndShowBuilder() {
  openFlashcardSettingsModal();
}

function openFlashcardSettingsModal() {
  flashcardSettingsDraft = normalizeFlashcardSettings(flashcardSettings);
  document.getElementById("flashcardSettingsOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "flashcardSettingsOverlay";
  overlay.className = "visual-modal synapse-themed-modal study-tool-settings-overlay";
  const countModes = [
    ["auto", "Auto", "Synapse chooses the useful amount."],
    ["30", "30", "A full short-review set."],
    ["60", "60", "A broad exam-prep deck."],
    ["custom", "Custom", "Pick your own count."]
  ];
  overlay.innerHTML = `
    <div class="visual-modal-content settings-pattern-modal flashcard-settings-modal" role="dialog" aria-modal="true" aria-labelledby="flashcardSettingsTitle">
      <button class="visual-modal-close" type="button" aria-label="Close flashcard settings" onclick="closeFlashcardSettingsModal()"><i class="bi bi-x-lg"></i></button>
      <div class="settings-pattern-header">
        <span class="study-tool-settings-kicker">Study Tools</span>
        <h3 id="flashcardSettingsTitle">Flashcard settings</h3>
        <p class="text-secondary">Set the language and deck size before turning your notes into active recall cards.</p>
      </div>
      <div class="settings-pattern-body settings-pattern-fields">
        <label class="settings-pattern-field" for="flashcardSettingsLanguage">
          <span>Card language</span>
          <select id="flashcardSettingsLanguage" class="form-select" onchange="updateFlashcardSettingsDraft({ preferredLanguage: this.value })">
            ${QUIZ_LANGUAGE_OPTIONS.map(option => `<option value="${option.value}" ${flashcardSettingsDraft.preferredLanguage === option.value ? "selected" : ""}>${escapeHTML(option.label)}</option>`).join("")}
          </select>
          <small>Choose the language used for prompts, answers, and hints.</small>
        </label>
        <div class="settings-pattern-field">
          <span>Card count</span>
          <div class="settings-pattern-choice-grid" role="group" aria-label="Flashcard count">
            ${countModes.map(([value, label, helper]) => `<button class="settings-pattern-choice ${flashcardSettingsDraft.countMode === value ? "active" : ""}" type="button" data-flashcard-mode="${value}" aria-pressed="${flashcardSettingsDraft.countMode === value}" onclick="updateFlashcardSettingsDraft({ countMode: '${value}' })"><strong>${escapeHTML(label)}</strong><small>${escapeHTML(helper)}</small></button>`).join("")}
          </div>
          <input id="flashcardSettingsCustomCount" class="form-control settings-pattern-number" type="number" min="1" max="80" value="${flashcardSettingsDraft.customCount}" aria-label="Custom card count" ${flashcardSettingsDraft.countMode === "custom" ? "" : "hidden"} oninput="updateFlashcardSettingsDraft({ customCount: this.value, countMode: 'custom' })">
        </div>
      </div>
      <div class="settings-pattern-footer">
        <button class="btn btn-outline-secondary" type="button" onclick="closeFlashcardSettingsModal()">Cancel</button>
        <button class="btn btn-outline-primary" type="button" onclick="saveFlashcardSettingsModal(false)">Save</button>
        <button class="btn btn-primary" type="button" onclick="saveFlashcardSettingsModal(true)" ${fullSummary && fullSummary.trim() ? "" : "disabled"}><i class="bi bi-stars me-1"></i>Save & generate</button>
      </div>
    </div>
  `;
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeFlashcardSettingsModal();
  });
  document.body.appendChild(overlay);
}

function updateFlashcardSettingsDraft(values = {}) {
  if (!flashcardSettingsDraft) return;
  flashcardSettingsDraft = normalizeFlashcardSettings({ ...flashcardSettingsDraft, ...values });
  const overlay = document.getElementById("flashcardSettingsOverlay");
  if (!overlay) return;
  overlay.querySelectorAll("[data-flashcard-mode]").forEach(button => {
    const active = button.dataset.flashcardMode === flashcardSettingsDraft.countMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const customCount = overlay.querySelector("#flashcardSettingsCustomCount");
  if (customCount) {
    customCount.hidden = flashcardSettingsDraft.countMode !== "custom";
    customCount.value = String(flashcardSettingsDraft.customCount);
  }
}

function saveFlashcardSettingsModal(shouldGenerate = false) {
  if (!flashcardSettingsDraft) return;
  const overlay = document.getElementById("flashcardSettingsOverlay");
  const language = overlay?.querySelector("#flashcardSettingsLanguage")?.value || flashcardSettingsDraft.preferredLanguage;
  const customCount = overlay?.querySelector("#flashcardSettingsCustomCount")?.value || flashcardSettingsDraft.customCount;
  flashcardSettings = normalizeFlashcardSettings({ ...flashcardSettingsDraft, preferredLanguage: language, customCount });
  safeSetLocalStorage(FLASHCARD_SETTINGS_KEY, JSON.stringify(flashcardSettings));
  closeFlashcardSettingsModal();
  flashcardBuilderOpen = false;
  renderFlashcardPanel();
  if (shouldGenerate) generateFlashcards();
}

function closeFlashcardSettingsModal() {
  document.getElementById("flashcardSettingsOverlay")?.remove();
  flashcardSettingsDraft = null;
}

async function generateFlashcards() {
  if (!fullSummary || !fullSummary.trim()) {
    alert("Generate visual notes first, then create flashcards.");
    return;
  }

  flashcardSettings = normalizeFlashcardSettings(flashcardSettings);
  safeSetLocalStorage(FLASHCARD_SETTINGS_KEY, JSON.stringify(flashcardSettings));

  const runFlashcardGeneration = async () => {
    isFlashcardGenerating = true;
    flashcardError = "";
    currentFlashcards = [];
    activeFlashcardIndex = 0;
    flashcardSide = "front";
    flashcardMatchingState = null;
    flashcardBuilderOpen = false;
    switchTool("flashcards");
    renderFlashcardPanel();

    try {
      const response = await apiClient.fetch("/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: storedTitle,
          summary: fullSummary,
          sections,
          source_fingerprint: currentSourceFingerprint,
          preferred_language: flashcardSettings.preferredLanguage,
          count_mode: flashcardSettings.countMode,
          card_count: flashcardCountValue(flashcardSettings)
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `Flashcard generation failed with status ${response.status}.`);
      }
      currentFlashcards = normalizeClientFlashcardDeck(data);
      if (!currentFlashcards.length) throw new Error("No usable flashcards were returned.");
      persistFlashcardsForCurrentNote();
      if (typeof recordStudyActivity === "function") recordStudyActivity("flashcards_generated", {
        tool: "flashcards",
        label: `Generated ${currentFlashcards.length} flashcards`,
        metadata: { cardCount: currentFlashcards.length }
      });
    } catch (error) {
      console.error(error);
      flashcardError = error.message || "Flashcard generation failed.";
      throw error;
    } finally {
      isFlashcardGenerating = false;
      renderFlashcardPanel();
    }
  };

  try {
    if (window.SynapseCredits?.withCreditReservation) {
      await window.SynapseCredits.withCreditReservation("practice_generation", runFlashcardGeneration, {
        confirmLabel: "Generate flashcards"
      });
    } else {
      await runFlashcardGeneration();
    }
  } catch (error) {
    if (!String(error?.message || "").toLowerCase().includes("cancelled")) {
      flashcardError = error?.message || flashcardError || "Flashcard generation failed.";
      renderFlashcardPanel();
    }
  }
}

function regenerateFlashcards() {
  currentFlashcards = [];
  flashcardMatchingState = null;
  generateFlashcards();
}

async function flipFlashcard() {
  if (!currentFlashcards.length) return;
  const stage = document.querySelector(".flashcard-stage");
  if (stage?.dataset.studyTurning === "true") return;
  if (stage) stage.dataset.studyTurning = "true";
  await animateLegacyFlashcardTurn({
    stage,
    reducedMotion: prefersReducedStudyMotion(),
    swap() {
      flashcardSide = flashcardSide === "front" ? "back" : "front";
      if (typeof recordStudyActivity === "function") recordStudyActivity("flashcard_flipped", {
        tool: "flashcards",
        sectionTitle: currentFlashcards[activeFlashcardIndex]?.sourceReference || currentFlashcards[activeFlashcardIndex]?.front || "",
        label: `Flipped flashcard ${activeFlashcardIndex + 1}`
      });
      renderFlashcardPanel();
    },
    replacement() {
      return document.querySelector(".flashcard-stage");
    }
  });
}

function gradeFlashcard(rating) {
  if (!currentFlashcards.length) return;
  const normalised = String(rating || "").toLowerCase();
  if (!["again", "hard", "good", "easy"].includes(normalised)) return;
  const card = currentFlashcards[activeFlashcardIndex] || {};
  if (typeof recordStudyActivity === "function") {
    recordStudyActivity("flashcard_graded", {
      tool: "flashcards",
      sectionTitle: card.sourceReference || card.front || "",
      label: `Rated flashcard ${activeFlashcardIndex + 1} as ${normalised}`,
      metadata: { rating: normalised, cardIndex: activeFlashcardIndex + 1 }
    });
  }
  if (normalised === "again") {
    flashcardSide = "front";
    renderFlashcardPanel();
    if (typeof showStudyToolNotice === "function") showStudyToolNotice("Keep this one in the rotation — try it again soon.", "info");
    return;
  }
  if (activeFlashcardIndex >= currentFlashcards.length - 1) {
    flashcardSide = "front";
    renderFlashcardPanel();
    if (typeof showStudyToolNotice === "function") {
      showStudyToolNotice("Deck complete. Open Exam Readiness to see what still needs review.", "success");
    }
    return;
  }
  setActiveFlashcard(activeFlashcardIndex + 1);
}

function setActiveFlashcard(index) {
  if (!currentFlashcards.length) return;
  activeFlashcardIndex = Math.max(0, Math.min(index, currentFlashcards.length - 1));
  flashcardSide = "front";
  if (typeof recordStudyActivity === "function") recordStudyActivity("flashcard_opened", {
    tool: "flashcards",
    sectionTitle: currentFlashcards[activeFlashcardIndex]?.sourceReference || currentFlashcards[activeFlashcardIndex]?.front || "",
    label: `Opened flashcard ${activeFlashcardIndex + 1}`
  });
  renderFlashcardPanel();
}

function openFlashcardListModal() {
  if (!currentFlashcards.length) return;
  document.getElementById("flashcardListOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "flashcardListOverlay";
  overlay.className = "visual-modal flashcard-list-overlay";
  overlay.innerHTML = `
    <div class="flashcard-list-modal">
      <button class="visual-modal-close" type="button" aria-label="Close flashcards" onclick="closeFlashcardListModal()">
        <i class="bi bi-x-lg"></i>
      </button>
      <h3>All flashcards</h3>
      <div class="flashcard-list-table">
        ${currentFlashcards.map((card, index) => `
          <button class="flashcard-list-row" type="button" onclick="jumpToFlashcardFromList(${index})">
            <span class="flashcard-list-number">Card ${index + 1}</span>
            <span>
              <strong>Front</strong>
              ${escapeHTML(cleanMindText(card.front))}
            </span>
            <span>
              <strong>Back</strong>
              ${escapeHTML(cleanMindText(card.back))}
            </span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeFlashcardListModal();
  });
  document.body.appendChild(overlay);
}

function closeFlashcardListModal() {
  document.getElementById("flashcardListOverlay")?.remove();
}

function jumpToFlashcardFromList(index) {
  closeFlashcardListModal();
  setActiveFlashcard(index);
}



