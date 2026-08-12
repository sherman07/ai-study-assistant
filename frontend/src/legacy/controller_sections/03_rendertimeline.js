function renderTimeline() {
  const events = getTimelineEventsForFilter();
  if (activeTimelineIndex >= events.length) activeTimelineIndex = 0;
  const activeEvent = events[activeTimelineIndex] || events[0];
  const allEvents = currentTimeline.events || [];
  const completedCount = allEvents.filter(event => isTimelineEventCompleted(event.id)).length;
  const totalMinutes = allEvents.reduce((sum, event) => sum + (event.estimatedMinutes || 0), 0);
  const progressPercent = allEvents.length ? Math.round((completedCount / allEvents.length) * 100) : 0;
  const filterButtons = TIMELINE_TYPE_OPTIONS.map(option => {
    const count = option.value === "all"
      ? (currentTimeline.events || []).length
      : (currentTimeline.events || []).filter(event => event.type === option.value).length;
    return `
      <button class="timeline-filter-btn ${activeTimelineFilter === option.value ? "active" : ""}" type="button"
        onclick="setTimelineFilter('${escapeAttr(option.value)}')" ${count ? "" : "disabled"}>
        ${escapeHTML(option.label)} <span>${count}</span>
      </button>
    `;
  }).join("");

  const eventNodes = events.map((event, index) => {
    const completed = isTimelineEventCompleted(event.id);
    return `
      <button class="timeline-node ${index === activeTimelineIndex ? "active" : ""}" type="button"
        onclick="selectTimelineEvent(${index})">
        <span class="timeline-node-check ${completed ? "done" : ""}">${completed ? "✓" : index + 1}</span>
        <span class="timeline-node-marker">${escapeHTML(event.marker || `Task ${index + 1}`)} · ${event.estimatedMinutes || 8} min</span>
        <span class="timeline-node-title">${escapeHTML(event.title)}</span>
        <span class="timeline-node-type">${escapeHTML(getTimelineTypeLabel(event.type))}</span>
      </button>
    `;
  }).join("");

  return `
    <div class="timeline-shell">
      <div class="timeline-hero">
        <div>
          <div class="timeline-kicker">Guided study path</div>
          <h4>${escapeHTML(currentTimeline.title || "Study Path")}</h4>
          <p>${escapeHTML(currentTimeline.summary || "Move through concrete tasks that help you understand, practise, and check the notes.")}</p>
          <div class="timeline-progress-row">
            <span>${completedCount}/${allEvents.length} done</span>
            <span>${totalMinutes || "Auto"} min plan</span>
            <span>${progressPercent}% complete</span>
          </div>
          <div class="timeline-progress-track" aria-label="Study path progress">
            <div style="width:${progressPercent}%"></div>
          </div>
        </div>
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="generateTimeline(true)">
          <i class="bi bi-arrow-clockwise me-1"></i>Regenerate
        </button>
      </div>

      <div class="timeline-filters">${filterButtons}</div>

      <div class="timeline-layout">
        <div class="timeline-rail" aria-label="Timeline events">
          ${eventNodes || `<div class="timeline-empty-small">No items in this filter.</div>`}
        </div>
        <div class="timeline-detail">
          ${activeEvent ? renderTimelineDetail(activeEvent) : `<div class="timeline-empty-small">Choose another filter.</div>`}
        </div>
      </div>
    </div>
  `;
}

function isPossiblyIncompleteStudyPathText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return true;
  if (/\.{3}|…$/.test(text)) return true;
  const withoutClosingPunctuation = text.replace(/[.。!?！？]+$/g, "").trim();
  return /\b(and|or|but|because|with|about|of|for|to|from|between|into|by)$/i.test(withoutClosingPunctuation)
    || /[:;,，；：]$/.test(text);
}

function getStudyPathActionText(event) {
  const task = String(event?.task || "").trim();
  const title = String(event?.title || "this checkpoint").trim();
  const summary = String(event?.summary || "").trim();
  const detail = String(event?.detail || "").trim();
  if (!task) {
    return `Study "${title}", then write a clear two-sentence explanation in your own words. Use one source detail or example from the notes if the checkpoint includes evidence.`;
  }
  if (isPossiblyIncompleteStudyPathText(task)) {
    const support = summary || detail || title;
    return `${task.replace(/[\s:;,，；：.。…]+$/, "")}. Focus on this checkpoint: ${support}`;
  }
  return task;
}

function getStudyPathFinishedText(event) {
  const deliverable = String(event?.deliverable || "").trim();
  const masteryCheck = String(event?.masteryCheck || "").trim();
  if (deliverable && masteryCheck) return `${deliverable} Mastery check: ${masteryCheck}`;
  if (deliverable) return deliverable;
  if (masteryCheck) return masteryCheck;
  if (event?.activePrompt) return `You can answer the active recall prompt without looking and explain one source detail accurately.`;
  return `You can explain this checkpoint in your own words and answer the practice question correctly.`;
}

function renderTimelineInfoBlock(label, value, className = "") {
  if (!value) return "";
  return `
    <div class="timeline-block ${className}">
      <strong>${escapeHTML(label)}</strong>
      <div>${markdownToHTML(value)}</div>
    </div>
  `;
}

function renderTimelineDetail(event) {
  const done = timelineCompletedIds.has(event.id);
  const answerState = getTimelinePracticeState(event.id);
  const canMarkDone = done || answerState.status === "correct";
  const actionText = getStudyPathActionText(event);
  const finishedText = getStudyPathFinishedText(event);
  const supportingBlocks = [
    renderTimelineInfoBlock("Active recall prompt", event.activePrompt, "recall"),
    renderTimelineInfoBlock("Output", event.deliverable),
    renderTimelineInfoBlock("Mastery check", event.masteryCheck, "exam"),
    renderTimelineInfoBlock("Support", event.detail),
    renderTimelineInfoBlock("Source evidence", event.evidence, "evidence"),
    renderTimelineInfoBlock("Why it matters", event.whyItMatters),
    renderTimelineInfoBlock("Watch out", event.misconception, "warning"),
    renderTimelineInfoBlock("Exam use", event.examUse, "exam")
  ].filter(Boolean).join("");
  return `
    <article class="timeline-detail-card">
      <div class="timeline-detail-head">
        <span class="timeline-detail-badge">${escapeHTML(getTimelineTypeLabel(event.type))}</span>
        <span class="timeline-detail-marker">${escapeHTML(event.marker)} · ${event.estimatedMinutes || 8} min</span>
      </div>
      <h4>${escapeHTML(event.title)}</h4>
      ${event.summary ? `<div class="timeline-summary">${markdownToHTML(event.summary)}</div>` : ""}
      <div class="timeline-task-card">
        <div class="timeline-task-card-top">
          <span class="timeline-task-label">Do this now</span>
          <button class="timeline-complete-btn ${done ? "done" : ""}" type="button"
            onclick="toggleTimelineComplete('${escapeAttr(event.id)}')" ${canMarkDone ? "" : "disabled"}
            title="${canMarkDone ? "" : "Answer and check the practice question first."}">
            ${done ? "Done" : (canMarkDone ? "Mark done" : "Answer first")}
          </button>
        </div>
        <div class="timeline-task-body">${markdownToHTML(actionText)}</div>
        <div class="timeline-task-success">
          <strong>Finished when</strong>
          <div>${markdownToHTML(finishedText)}</div>
        </div>
        ${canMarkDone ? "" : `<div class="timeline-task-lock"><i class="bi bi-lock me-1"></i>Answer the practice question correctly before marking this task done.</div>`}
      </div>
      ${renderStudyPathPracticeQuestion(event, answerState)}
      ${supportingBlocks ? `<div class="timeline-block-grid">${supportingBlocks}</div>` : ""}
      ${event.relatedTerms.length ? `
        <div class="timeline-term-row">
          ${event.relatedTerms.map(term => `<span>${escapeHTML(term)}</span>`).join("")}
        </div>
      ` : ""}
      <div class="timeline-actions">
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="openTimelineEventNotes()">
          <i class="bi bi-journal-text me-1"></i>Open notes
        </button>
        <button class="btn btn-primary btn-sm" type="button" onclick="askTimelineEventTutor()">
          <i class="bi bi-chat-square-text me-1"></i>Ask tutor
        </button>
      </div>
    </article>
  `;
}

function renderStudyPathPracticeQuestion(event, answerState = {}) {
  const question = event?.practiceQuestion;
  if (!question || !question.prompt) return "";
  const meta = getStudyPathQuestionTypeMeta(question.type);
  const correctAnswer = getStudyPathCorrectAnswerText(question);
  const isCorrect = answerState.status === "correct";
  const answerGuide = [
    correctAnswer ? `<div><strong>Correct answer:</strong> ${inlineMarkdownHTML(correctAnswer)}</div>` : "",
    question.expectedAnswer ? `<div>${markdownToHTML(question.expectedAnswer)}</div>` : "",
    question.explanation ? `<div class="study-path-answer-explanation">${markdownToHTML(question.explanation)}</div>` : ""
  ].filter(Boolean).join("");
  return `
    <section class="study-path-question-card">
      <div class="study-path-question-head">
        <span><i class="bi bi-question-circle me-1"></i>Practice question</span>
        <span class="study-path-question-type">${escapeHTML(meta.label)}</span>
      </div>
      <div class="study-path-question-prompt">${markdownToHTML(question.prompt)}</div>
      ${question.sourceReference ? `<div class="study-path-question-source"><i class="bi bi-link-45deg me-1"></i>${escapeHTML(question.sourceReference)}</div>` : ""}
      ${renderStudyPathQuestionInput(event.id, question, meta, answerState)}
      <div class="study-path-question-actions">
        <button class="btn btn-primary btn-sm" type="button" onclick="checkStudyPathAnswer('${escapeAttr(event.id)}')"
          ${answerState.status !== "checking" && !isCorrect ? "" : "disabled"}>
          ${answerState.status === "checking" ? `<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Checking...` : "Check answer"}
        </button>
        <span>${isCorrect ? "Correct. You can mark this task done." : "Answer the question, then check it."}</span>
      </div>
      ${renderStudyPathQuestionFeedback(answerState)}
      ${isCorrect && answerGuide ? `
        <details class="study-path-answer-guide">
          <summary>Answer guide</summary>
          ${answerGuide}
        </details>
      ` : ""}
    </section>
  `;
}

function getStudyPathCorrectAnswerText(question) {
  if (!question || !Array.isArray(question.options) || !question.options.length) return "";
  if (question.type === "true_false" && typeof question.correctBoolean === "boolean") {
    const index = question.correctBoolean ? 0 : 1;
    return `${String.fromCharCode(65 + index)}. ${question.options[index] || ""}`;
  }
  const indexes = Array.isArray(question.correctOptionIndexes) ? question.correctOptionIndexes : [];
  return indexes
    .filter(index => Number.isInteger(index) && index >= 0 && index < question.options.length)
    .map(index => `${String.fromCharCode(65 + index)}. ${question.options[index] || ""}`)
    .join("; ");
}

function renderStudyPathQuestionInput(eventId, question, meta, answerState = {}) {
  if (question.type === "single_choice" || question.type === "multiple_choice") {
    return renderStudyPathChoiceOptions(eventId, question, question.type === "multiple_choice" ? "checkbox" : "radio", answerState);
  }
  if (question.type === "true_false") {
    return renderStudyPathChoiceOptions(eventId, {
      ...question,
      options: question.options?.length >= 2 ? question.options.slice(0, 2) : ["True", "False"]
    }, "radio", answerState);
  }
  return `
    <textarea class="study-path-answer-box" rows="${question.type === "essay_outline" ? 5 : 3}"
      placeholder="${escapeAttr(meta.hint || "Write a quick answer before opening the guide.")}"
      oninput="updateStudyPathTextAnswer('${escapeAttr(eventId)}', this.value)">${escapeHTML(answerState.answer || "")}</textarea>
  `;
}

function renderStudyPathChoiceOptions(eventId, question, inputType, answerState = {}) {
  const answer = answerState.answer;
  return `
    <div class="study-path-question-options">
      ${(question.options || []).map((option, index) => `
        <label class="study-path-option">
          <input class="form-check-input" type="${inputType}" name="study-path-${escapeAttr(eventId)}" value="${index}"
            ${isStudyPathChoiceSelected(answer, index, inputType) ? "checked" : ""}
            onchange="updateStudyPathChoiceAnswer('${escapeAttr(eventId)}', ${index}, '${inputType}', this.checked)">
          <span>${String.fromCharCode(65 + index)}</span>
          <div class="study-path-option-text">${inlineMarkdownHTML(option)}</div>
        </label>
      `).join("")}
    </div>
  `;
}

function renderStudyPathQuestionFeedback(answerState = {}) {
  if (!answerState.feedback || answerState.status === "checking") return "";
  const statusClass = answerState.status === "correct"
    ? "correct"
    : (answerState.status === "retry" ? "retry" : "incorrect");
  return `
    <div class="study-path-question-feedback ${statusClass}">
      ${markdownToHTML(answerState.feedback)}
    </div>
  `;
}

function getTimelinePracticeState(eventId) {
  const id = String(eventId || "");
  const current = timelinePracticeAnswers[id];
  return current && typeof current === "object"
    ? current
    : { answer: null, status: "idle", feedback: "" };
}

function setTimelinePracticeState(eventId, patch = {}, shouldRender = false) {
  const id = String(eventId || "");
  if (!id) return;
  const previous = getTimelinePracticeState(id);
  timelinePracticeAnswers[id] = {
    ...previous,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  persistTimelineForCurrentNote();
  if (shouldRender) renderTimelinePanel();
}

function updateStudyPathTextAnswer(eventId, value) {
  const previous = getTimelinePracticeState(eventId);
  const shouldReset = ["correct", "incorrect", "retry", "error"].includes(previous.status);
  setTimelinePracticeState(eventId, {
    answer: value,
    status: shouldReset ? "idle" : previous.status,
    feedback: shouldReset ? "" : previous.feedback
  });
}

function updateStudyPathChoiceAnswer(eventId, optionIndex, inputType, checked) {
  const previous = getTimelinePracticeState(eventId);
  let answer = inputType === "checkbox" && Array.isArray(previous.answer) ? [...previous.answer] : previous.answer;
  if (inputType === "checkbox") {
    if (!Array.isArray(answer)) answer = [];
    if (checked && !answer.includes(optionIndex)) answer.push(optionIndex);
    if (!checked) answer = answer.filter(index => index !== optionIndex);
    answer.sort((a, b) => a - b);
  } else {
    answer = optionIndex;
  }
  const shouldReset = ["correct", "incorrect", "retry", "error"].includes(previous.status);
  setTimelinePracticeState(eventId, {
    answer,
    status: shouldReset ? "idle" : previous.status,
    feedback: shouldReset ? "" : previous.feedback
  });
}

function isStudyPathChoiceSelected(answer, optionIndex, inputType) {
  if (inputType === "checkbox") return Array.isArray(answer) && answer.includes(optionIndex);
  return isStudyPathSingleChoiceValue(answer) && Number(answer) === optionIndex;
}

function isStudyPathAnswerPresent(question, answer) {
  if (!question) return false;
  if (question.type === "multiple_choice") return Array.isArray(answer) && answer.length > 0;
  if (question.type === "single_choice" || question.type === "true_false") return isStudyPathSingleChoiceValue(answer);
  return String(answer || "").trim().length > 0;
}

function isStudyPathSingleChoiceValue(answer) {
  return answer !== null && answer !== undefined && answer !== "" && Number.isInteger(Number(answer));
}

function getTimelineEventIndexById(eventId) {
  return (currentTimeline?.events || []).findIndex(event => String(event.id) === String(eventId));
}

function getTimelineEventById(eventId) {
  const index = getTimelineEventIndexById(eventId);
  return index >= 0 ? currentTimeline.events[index] : null;
}

function makeStudyPathAnswerPayload(question, answer) {
  if (question.type === "single_choice" || question.type === "true_false") {
    const index = Number(answer);
    return {
      selected_indexes: Number.isInteger(index) ? [index] : [],
      selected_options: Number.isInteger(index) ? [question.options?.[index] || ""] : [],
      text: Number.isInteger(index) ? question.options?.[index] || "" : ""
    };
  }
  if (question.type === "multiple_choice") {
    const indexes = Array.isArray(answer) ? answer.map(Number).filter(Number.isInteger) : [];
    return {
      selected_indexes: indexes,
      selected_options: indexes.map(index => question.options?.[index] || "").filter(Boolean),
      text: indexes.map(index => question.options?.[index] || "").filter(Boolean).join("; ")
    };
  }
  return { text: String(answer || "").trim() };
}

async function checkStudyPathAnswer(eventId) {
  const event = getTimelineEventById(eventId);
  if (!event || !event.practiceQuestion) return;
  const state = getTimelinePracticeState(eventId);
  if (!isStudyPathAnswerPresent(event.practiceQuestion, state.answer)) {
    setTimelinePracticeState(eventId, {
      status: "error",
      feedback: "Answer the practice question before checking it."
    }, true);
    return;
  }

  setTimelinePracticeState(eventId, {
    status: "checking",
    feedback: ""
  }, true);

  try {
    const response = await apiClient.fetch("/timeline/check-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: storedTitle,
        summary: fullSummary,
        sections,
        preferred_language: preferredLanguage ? preferredLanguage.value : "auto",
        event: {
          id: event.id,
          type: event.type,
          title: event.title,
          section: event.section,
          summary: event.summary,
          detail: event.detail,
          task: event.task,
          evidence: event.evidence,
          source_reference: event.sourceReference
        },
        question: event.practiceQuestion,
        answer: makeStudyPathAnswerPayload(event.practiceQuestion, state.answer)
      })
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `Answer check failed with status ${response.status}.`);
    }
    if (data.correct) {
      setTimelinePracticeState(eventId, {
        status: "correct",
        feedback: data.feedback || "Correct. You can mark this task done."
      }, true);
      if (typeof recordStudyActivity === "function") recordStudyActivity("study_path_answered", {
        tool: "timeline",
        sectionTitle: event.section || event.title,
        label: `Passed Study Path question: ${event.title}`,
        metadata: { status: "correct" }
      });
      recordMasteryGraphPathProgress(event.section || event.title || eventId);
      return;
    }

    const eventIndex = getTimelineEventIndexById(eventId);
    const targetEvent = eventIndex >= 0 ? currentTimeline.events[eventIndex] : event;
    const rawQuestion = data.new_question || data.practice_question || data.replacement_question;
    if (rawQuestion && targetEvent) {
      targetEvent.practiceQuestion = normalizeStudyPathPracticeQuestion(rawQuestion, targetEvent, eventIndex >= 0 ? eventIndex : 0);
    }
    timelineCompletedIds.delete(String(eventId));
    setTimelinePracticeState(eventId, {
      answer: null,
      status: "retry",
      feedback: data.feedback || "Not quite. A new question has been loaded for another try."
    }, true);
    if (typeof recordStudyActivity === "function") recordStudyActivity("study_path_answered", {
      tool: "timeline",
      sectionTitle: event.section || event.title,
      label: `Retried Study Path question: ${event.title}`,
      status: "retry",
      metadata: { status: "retry" }
    });
  } catch (error) {
    console.error(error);
    setTimelinePracticeState(eventId, {
      status: "error",
      feedback: error.message || "Could not check this answer."
    }, true);
  }
}

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
  if (isTimelineGenerating) return;
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

function getVisualGuideNoteKey() {
  if (currentHistoryId) return `history:${currentHistoryId}`;
  if (currentSourceFingerprint) return `fingerprint:${currentSourceFingerprint}`;
  return "";
}

function getVisualGuideStore() {
  const parsed = safeReadJSONStorage(VISUAL_GUIDE_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function setVisualGuideStore(store) {
  return safeWriteJSONStorage(VISUAL_GUIDE_STORAGE_KEY, store || {});
}

function resetVisualGuideState() {
  currentVisualGuide = null;
  visualGuideError = "";
  isVisualGuideGenerating = false;
  renderVisualGuidePanel();
}

function deleteVisualGuide(historyId, sourceFingerprint = "") {
  const store = getVisualGuideStore();
  delete store[`history:${historyId}`];
  if (sourceFingerprint) delete store[`fingerprint:${sourceFingerprint}`];
  setVisualGuideStore(store);
}

function normalizeVisualGuideList(value, limit = 6) {
  const items = Array.isArray(value)
    ? value
    : (typeof value === "string" ? value.split(/\n+|;\s*/) : []);
  return items.map(item => String(item || "").trim()).filter(Boolean).slice(0, limit);
}

function normalizeVisualGuideType(value) {
  const type = String(value || "concept").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return ["concept", "process", "comparison", "evidence", "formula", "timeline", "case", "source"].includes(type)
    ? type
    : "concept";
}

function normalizeVisualImageGuide(data) {
  const source = data && typeof data === "object" ? data : {};
  const imageDataUrl = String(source.image_data_url || source.imageDataUrl || source.data_url || "").trim();
  const imageProcessing = source.image_processing || source.imageProcessing || {};
  return {
    title: cleanVisualGuideGeneratedText(source.title || storedTitle || "Visual Image Guide"),
    imageDataUrl,
    model: cleanVisualGuideGeneratedText(source.model || "gpt-image-1.5"),
    requestedModel: cleanVisualGuideGeneratedText(source.requested_model || source.requestedModel || ""),
    size: cleanVisualGuideGeneratedText(source.size || ""),
    quality: cleanVisualGuideGeneratedText(source.quality || ""),
    styleVersion: cleanVisualGuideGeneratedText(source.style_version || source.styleVersion || ""),
    renderingNote: cleanVisualGuideGeneratedText(source.rendering_note || source.renderingNote || ""),
    blueprint: source.blueprint || null,
    imageProcessing: imageProcessing && typeof imageProcessing === "object" ? imageProcessing : {},
    created: source.created || new Date().toISOString(),
  };
}

const VISUAL_GUIDE_HEADING_ONLY_PATTERN = /^(?:#{1,4}\s*)?(?:Learning Question|Source and Argument Map|Core Notes|Key Terms(?: and Mechanisms)?|Concepts Explained(?: With Source Evidence)?|Reading the Source Evidence|Worked Examples(?: and Evidence)?|Source Evidence(?:\s*\/\s*Example Matrix)?|Evidence Matrix|Exam Strategy(?: and Common Mistakes)?|Revision Checklist)\s*$/i;

function cleanVisualGuideGeneratedText(value) {
  return String(value || "")
    .replace(/\btotaldeposits\b/gi, "total deposits")
    .replace(/\bpotential(\d+(?:\.\d+)?\s*[KMBT])\b/gi, "potential $$$1")
    .replace(/\b(\d+(?:\.\d+)?)\s*([KMBT])\b/g, "$1$2")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function isVisualGuideHeadingOnly(value) {
  return VISUAL_GUIDE_HEADING_ONLY_PATTERN.test(cleanVisualGuideGeneratedText(value));
}

function visualGuideWorkedExampleSeed() {
  const sectionEntries = Object.entries(sections || {});
  const workedEntry = sectionEntries.find(([title]) => /worked examples?|example matrix|source evidence/i.test(title));
  const sourceText = cleanVisualGuideGeneratedText(
    workedEntry?.[1]
    || sectionEntries.map(([title, content]) => `${title}\n${content}`).join("\n")
    || fullSummary
  );
  if (!sourceText || !/(worked example|examples? from source|source exercise|if\s+[A-Z]|D\s*=|V\s+fell|r\s*=|≈|%|→)/i.test(sourceText)) {
    return null;
  }
  const lines = sourceText
    .split(/\n+/)
    .map(line => cleanVisualGuideGeneratedText(line.replace(/^[-*]\s+/, "").replace(/^#{1,4}\s+/, "")))
    .filter(line => line && !isVisualGuideHeadingOnly(line) && line.length >= 18 && line.length <= 180);
  const exampleLines = lines.filter(line => /(example|exercise|if\s+[A-Z]|D\s*=|V\s+fell|r\s*=|≈|%|→|\d+\s*[+\-*/]\s*\d+)/i.test(line));
  const body = exampleLines[0] || lines[0] || "";
  if (!body) return null;
  return {
    id: "vg-panel-worked-example",
    kicker: "Worked example",
    title: "Worked Example",
    body: shorten(cleanVisualGuideGeneratedText(body), 220),
    keyPoints: (exampleLines.length ? exampleLines.slice(1, 3) : lines.slice(1, 3)).map(line => shorten(line, 110)),
    sourceEvidence: workedEntry ? "Worked/example section in generated notes" : "Generated notes examples",
    visualType: "case",
    visualPrompt: "Show a small worked calculation card with givens, operation arrow, and result.",
    formula: "",
    sourceRefs: workedEntry ? [cleanVisualGuideGeneratedText(workedEntry[0])] : [],
    sourceFigureIndexes: [],
    webImageIndexes: [],
    accent: ""
  };
}

function normalizeVisualGuide(data) {
  const source = data && typeof data === "object" ? data : {};
  const panels = Array.isArray(source.panels) ? source.panels : [];
  const rawSourceMap = Array.isArray(source.source_map)
    ? source.source_map
    : (Array.isArray(source.sourceMap) ? source.sourceMap : []);
  const normalizedPanels = panels.map((panel, index) => {
    const item = panel && typeof panel === "object" ? panel : {};
    const sourceEvidence = cleanVisualGuideGeneratedText(item.source_evidence || item.sourceEvidence || item.evidence || "");
    return {
      id: item.id || `vg-panel-${index + 1}`,
      kicker: cleanVisualGuideGeneratedText(item.kicker || item.label || `Part ${index + 1}`),
      title: cleanVisualGuideGeneratedText(item.title || `Key idea ${index + 1}`),
      body: cleanVisualGuideGeneratedText(item.body || item.explanation || ""),
      keyPoints: normalizeVisualGuideList(item.key_points || item.keyPoints || item.points, 5).map(cleanVisualGuideGeneratedText),
      sourceEvidence: isVisualGuideHeadingOnly(sourceEvidence) ? "" : sourceEvidence,
      visualType: normalizeVisualGuideType(item.visual_type || item.visualType || item.type),
      visualPrompt: cleanVisualGuideGeneratedText(item.visual_prompt || item.visualPrompt || item.visual || ""),
      formula: cleanVisualGuideGeneratedText(item.formula || ""),
      sourceRefs: normalizeVisualGuideList(item.source_refs || item.sourceRefs || item.source_references, 5).map(cleanVisualGuideGeneratedText),
      sourceFigureIndexes: normalizeVisualGuideList(item.source_figure_indexes || item.sourceFigureIndexes || item.figure_indexes, 4)
        .map(value => Number.parseInt(value, 10))
        .filter(value => Number.isInteger(value) && value >= 0),
      webImageIndexes: normalizeVisualGuideList(item.web_image_indexes || item.webImageIndexes || item.internet_image_indexes, 3)
        .map(value => Number.parseInt(value, 10))
        .filter(value => Number.isInteger(value) && value >= 0),
      accent: item.accent || ""
    };
  }).filter(panel => panel.title || panel.body || panel.keyPoints.length || panel.sourceEvidence);

  if (normalizedPanels.length && sanitizeLearningFigures(visualGalleryData).length) {
    const usedFigures = new Set(normalizedPanels.flatMap(panel => panel.sourceFigureIndexes || []));
    const fallbackFigures = sanitizeLearningFigures(visualGalleryData)
      .map(item => Number.parseInt(item.index, 10))
      .filter(index => Number.isInteger(index) && !usedFigures.has(index))
      .slice(0, 4);
    normalizedPanels.forEach(panel => {
      if (!fallbackFigures.length || (panel.sourceFigureIndexes || []).length) return;
      panel.sourceFigureIndexes = [fallbackFigures.shift()];
    });
  }

  const workedExamplePanel = visualGuideWorkedExampleSeed();
  const hasWorkedExamplePanel = normalizedPanels.some(panel => /worked examples?/i.test(panel.title || ""));
  if (workedExamplePanel && !hasWorkedExamplePanel) {
    normalizedPanels.push(workedExamplePanel);
  }

  return {
    title: source.title || `${storedTitle || "Study"} Visual Guide`,
    subtitle: source.subtitle || "",
    thesis: source.thesis || source.overview || "",
    coverageNote: source.coverage_note || source.coverageNote || "",
    flow: (Array.isArray(source.flow) ? source.flow : []).map((item, index) => ({
      label: item?.label || `Step ${index + 1}`,
      text: item?.text || item?.explanation || ""
    })).filter(item => item.label || item.text).slice(0, 8),
    panels: normalizedPanels,
    sourceMap: rawSourceMap.map((item, index) => ({
      source: item?.source || `Source ${index + 1}`,
      role: item?.role || "",
      evidence: item?.evidence || ""
    })).filter(item => item.source || item.role || item.evidence).slice(0, 16),
    reviewPrompts: normalizeVisualGuideList(source.review_prompts || source.reviewPrompts, 6),
    webImages: (Array.isArray(source.web_images) ? source.web_images : (Array.isArray(source.webImages) ? source.webImages : []))
      .map((item, index) => ({
        index: Number.isInteger(Number.parseInt(item?.index, 10)) ? Number.parseInt(item.index, 10) : index,
        title: item?.title || item?.query || "Reference image",
        url: item?.url || "",
        sourceUrl: item?.source_url || item?.sourceUrl || "",
        provider: item?.provider || "Web image",
        credit: item?.credit || "",
        license: item?.license || "",
        query: item?.query || ""
      }))
      .filter(item => item.url)
      .slice(0, 6),
    generatedAt: source.generatedAt || new Date().toISOString()
  };
}

function persistVisualGuideForCurrentNote() {
  const key = getVisualGuideNoteKey();
  if (!key || !currentVisualGuide) return;
  const store = getVisualGuideStore();
  store[key] = currentVisualGuide;
  setVisualGuideStore(store);
}

function loadVisualGuideForCurrentNote() {
  const store = getVisualGuideStore();
  const keys = [
    currentHistoryId ? `history:${currentHistoryId}` : "",
    currentSourceFingerprint ? `fingerprint:${currentSourceFingerprint}` : ""
  ].filter(Boolean);
  const saved = keys.map(key => store[key]).find(item => item && typeof item === "object");
  const normalized = saved ? normalizeVisualImageGuide(saved) : null;
  currentVisualGuide = normalized?.styleVersion === VISUAL_IMAGE_GUIDE_STYLE_VERSION ? normalized : null;
  visualGuideError = "";
  isVisualGuideGenerating = false;
  renderVisualGuidePanel();
}

function setupVisualGuideTool() {
  const switcher = document.querySelector(".tool-switcher");
  if (switcher && !document.getElementById("toolBtnVisualGuide")) {
    const mindButton = document.getElementById("toolBtnMindMap");
    const buttonHTML = `
      <button id="toolBtnVisualGuide" class="tool-switch-btn" type="button" onclick="switchTool('visualguide', this)">
        <i class="bi bi-image me-1"></i>Image Guide
      </button>
    `;
    if (mindButton) {
      mindButton.insertAdjacentHTML("afterend", buttonHTML);
    } else {
      switcher.insertAdjacentHTML("afterbegin", buttonHTML);
    }
  }

  const studyToolsCard = document.querySelector(".study-tools-card");
  if (studyToolsCard && !document.getElementById("toolPanelVisualGuide")) {
    const mindPanel = document.getElementById("toolPanelMindMap");
    const panelHTML = `
      <div id="toolPanelVisualGuide" class="tool-panel">
        <div class="tool-panel-head d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h3>Visual Image Guide</h3>
            <p>Generate one finished image poster from the current notes.</p>
          </div>
          <div class="tool-panel-actions">
            <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="generateVisualGuide(true)">
              <i class="bi bi-image me-1"></i>Generate image
            </button>
            <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="openStudyToolSettingsModal('visualguide')">
              <i class="bi bi-sliders me-1"></i>Image guide settings
            </button>
          </div>
        </div>
        <div id="visualGuidePanelContent"></div>
      </div>
    `;
    if (mindPanel) {
      mindPanel.insertAdjacentHTML("afterend", panelHTML);
    } else {
      studyToolsCard.insertAdjacentHTML("beforeend", panelHTML);
    }
  }

  loadVisualGuideForCurrentNote();
  renderVisualGuidePanel();
}

function visualGuideFigureRequestItems() {
  return sanitizeLearningFigures(visualGalleryData).map((item, index) => ({
    index,
    title: item.title || "",
    caption: item.caption || "",
    what_shows: item.what_shows || "",
    argument_supported: item.argument_supported || "",
    how_to_read: item.how_to_read || "",
    exam_use: item.exam_use || "",
    visual_kind: item.visual_kind || "",
    location: item.location || "",
    source_title: item.source_title || ""
  }));
}

function visualGuideSourceRequestItems() {
  return (sourceViewerItems || []).map((item, index) => ({
    index: index + 1,
    display_name: item.displayName || item.name || item.title || `Source ${index + 1}`,
    title_candidate: item.title || item.displayName || "",
    source_identity: item.sourceIdentity || "",
    url: item.originalUrl || item.url || "",
    text_excerpt: item.content ? String(item.content).slice(0, 5000) : ""
  })).slice(0, 16);
}

function renderVisualGuidePanel() {
  const panel = document.getElementById("visualGuidePanelContent");
  if (!panel) return;

  if (isVisualGuideGenerating) {
    panel.innerHTML = `
      <div class="visual-guide-loading">
        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <div>
          <strong>Building visual guide...</strong>
          <p>Synapse is building a compact blueprint, generating the image, then locally sharpening the final PNG.</p>
        </div>
      </div>
    `;
    return;
  }

  if (visualGuideError) {
    panel.innerHTML = `
      <div class="alert alert-danger">
        <strong>Visual image guide generation failed.</strong><br>${escapeHTML(visualGuideError)}
      </div>
      ${renderVisualGuideLaunch()}
    `;
    return;
  }

  panel.innerHTML = currentVisualGuide ? renderVisualImageGuide(currentVisualGuide) : renderVisualGuideLaunch();
  renderMath();
}
