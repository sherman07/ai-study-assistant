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

