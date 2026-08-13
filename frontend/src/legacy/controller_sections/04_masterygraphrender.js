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
