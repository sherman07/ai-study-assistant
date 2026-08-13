function setTimelineFilter(value) {
  activeTimelineFilter = TIMELINE_TYPE_OPTIONS.some(option => option.value === value) ? value : "all";
  activeTimelineIndex = 0;
  renderTimelinePanel();
}

function selectTimelineEvent(index) {
  const events = getTimelineEventsForFilter();
  activeTimelineIndex = Math.max(0, Math.min(index, events.length - 1));
  renderTimelinePanel();
}

function toggleTimelineComplete(eventId) {
  const id = String(eventId || "");
  if (!id) return;
  if (timelineCompletedIds.has(id)) {
    timelineCompletedIds.delete(id);
    if (typeof recordStudyActivity === "function") recordStudyActivity("study_path_task_reopened", {
      tool: "timeline",
      sectionTitle: getTimelineEventById(id)?.section || getTimelineEventById(id)?.title || id,
      label: `Reopened Study Path task: ${getTimelineEventById(id)?.title || id}`
    });
  } else {
    const answerState = getTimelinePracticeState(id);
    if (answerState.status !== "correct") {
      setTimelinePracticeState(id, {
        status: "error",
        feedback: "Check and pass the practice question before marking this task done."
      }, true);
      return;
    }
    timelineCompletedIds.add(id);
    const targetEvent = getTimelineEventById(id);
    if (typeof recordStudyActivity === "function") recordStudyActivity("study_path_task_completed", {
      tool: "timeline",
      sectionTitle: targetEvent?.section || targetEvent?.title || id,
      label: `Completed Study Path task: ${targetEvent?.title || id}`
    });
    recordMasteryGraphPathProgress(targetEvent?.section || targetEvent?.title || id);
  }
  persistTimelineForCurrentNote();
  renderTimelinePanel();
  renderMasteryGraphPanel();
}

async function generateTimeline(force = false) {
  if (!fullSummary || !fullSummary.trim()) {
    alert("Generate notes first, then create a study path.");
    return;
  }
  if (!force && currentTimeline?.events?.length) {
    switchTool("timeline");
    renderTimelinePanel();
    return;
  }

  isTimelineGenerating = true;
  timelineError = "";
  switchTool("timeline");
  renderTimelinePanel();

  try {
    const toolSettings = getStudyToolSettings("timeline");
    const response = await apiClient.fetch("/timeline/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: storedTitle,
        summary: fullSummary,
        sections,
        source_fingerprint: currentSourceFingerprint,
        preferred_language: toolSettings.language || (preferredLanguage ? preferredLanguage.value : "auto"),
        pace: toolSettings.pace || "balanced"
      })
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `Study path generation failed with status ${response.status}.`);
    }
    currentTimeline = normalizeTimeline(data);
    timelineCompletedIds = new Set();
    timelinePracticeAnswers = {};
    activeTimelineFilter = "all";
    activeTimelineIndex = 0;
    persistTimelineForCurrentNote();
    if (typeof recordStudyActivity === "function") recordStudyActivity("study_path_generated", {
      tool: "timeline",
      label: `Generated Study Path with ${currentTimeline.events.length} tasks`,
      metadata: { taskCount: currentTimeline.events.length }
    });
  } catch (error) {
    console.error(error);
    timelineError = error.message || "Study path generation failed.";
  } finally {
    isTimelineGenerating = false;
    renderTimelinePanel();
    renderMasteryGraphPanel();
  }
}

function getActiveTimelineEvent() {
  const events = getTimelineEventsForFilter();
  return events[activeTimelineIndex] || null;
}

function openTimelineEventNotes() {
  const event = getActiveTimelineEvent();
  if (!event) return;
  if (typeof recordStudyActivity === "function") recordStudyActivity("study_path_task_opened", {
    tool: "timeline",
    sectionTitle: event.section || event.title,
    label: `Opened Study Path task: ${event.title}`
  });
  activateSectionFromMap(event.section || event.title);
}

function askTimelineEventTutor() {
  const event = getActiveTimelineEvent();
  if (!event) return;
  if (typeof recordStudyActivity === "function") recordStudyActivity("tutor_message", {
    tool: "timeline",
    sectionTitle: event.section || event.title,
    label: `Asked Tutor about: ${event.title}`
  });
  const practicePrompt = event.practiceQuestion?.prompt
    ? `Help me answer this ${getStudyPathQuestionTypeMeta(event.practiceQuestion.type).label.toLowerCase()} study-path question from "${event.title}": ${event.practiceQuestion.prompt}`
    : "";
  const prompt = practicePrompt || `Help me complete this study task from "${event.title}": ${event.activePrompt || event.task || event.detail || event.summary || event.evidence}`;
  switchTab("chat", document.querySelector('.asst-tab[onclick*="chat"]'));
  openAssistant();
  if (questionInput) {
    questionInput.value = prompt;
    questionInput.focus();
  }
}

function resetTimelineState() {
  currentTimeline = null;
  activeTimelineIndex = 0;
  activeTimelineFilter = "all";
  timelineError = "";
  isTimelineGenerating = false;
  timelineCompletedIds = new Set();
  timelinePracticeAnswers = {};
  renderTimelinePanel();
}

function setupTimelineTool() {
  const switcher = document.querySelector(".tool-switcher");
  const timelineButton = switcher
    ? Array.from(switcher.querySelectorAll(".tool-switch-btn")).find(button =>
      button.id === "toolBtnTimeline"
      || button.querySelector(".bi-clock-history")
      || button.querySelector(".bi-signpost-split")
      || button.textContent.trim().toLowerCase().includes("timeline")
      || button.textContent.trim().toLowerCase().includes("study path")
    )
    : null;

  if (timelineButton) {
    timelineButton.id = "toolBtnTimeline";
    timelineButton.disabled = false;
    timelineButton.classList.remove("disabled");
    timelineButton.setAttribute("aria-disabled", "false");
    timelineButton.innerHTML = `<i class="bi bi-signpost-split me-1"></i>Study Path`;
    timelineButton.onclick = () => switchTool("timeline", timelineButton);
  }

  const studyToolsCard = document.querySelector(".study-tools-card");
  if (studyToolsCard && !document.getElementById("toolPanelTimeline")) {
    const mindPanel = document.getElementById("toolPanelMindMap");
    const timelinePanelHTML = `
      <div id="toolPanelTimeline" class="tool-panel">
        <div class="tool-panel-head d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h3>Study Path</h3>
            <p>Turn the notes into an actionable study sequence with tasks, short questions, and mastery checks.</p>
          </div>
          <div class="tool-panel-actions">
            <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="generateTimeline(true)">
              <i class="bi bi-arrow-clockwise me-1"></i>Regenerate
            </button>
            <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="openStudyToolSettingsModal('timeline')">
              <i class="bi bi-sliders me-1"></i>Study path settings
            </button>
          </div>
        </div>
        <div id="timelinePanelContent"></div>
      </div>
    `;
    if (mindPanel) {
      mindPanel.insertAdjacentHTML("afterend", timelinePanelHTML);
    } else {
      studyToolsCard.insertAdjacentHTML("beforeend", timelinePanelHTML);
    }
  }

  loadTimelineForCurrentNote();
  renderTimelinePanel();
}

