function buildMemoryCards() {
  return Object.entries(sections || {})
    .filter(([title, text]) => title && String(text || "").trim())
    .slice(0, 16)
    .map(([title, text]) => {
      const branch = getMemoryBranch(title);
      const points = Array.isArray(branch?.points) ? branch.points : [];
      const timeline = getTimelineMemoryProgress(title);
      const card = getMemoryCardRecord(title);
      const quiz = getQuizMemoryProgress();
      const tutor = getVoiceTutorMemoryProgress();
      const keywords = extractMemoryKeywords(title, text);
      const dueAt = new Date(card.dueAt);
      const isDue = !card.dueAt || Number.isNaN(dueAt.getTime()) || dueAt <= addDays(new Date(), 0.99);
      const actionScore = Math.min(44,
        card.opened * 3
        + card.reviewed * 9
        + card.practice * 7
        + card.path * 7
        + card.quiz * 7
        + card.tutor * 4
      );
      const evidenceScore = Math.min(20, 8 + points.length * 3 + Math.round(String(text).split(/\s+/).length / 90));
      const scheduleScore = Math.min(22, card.streak * 8 + Math.min(10, card.intervalDays * 1.5));
      const timelineScore = timeline.total ? Math.round(timeline.percent * 0.14) : 0;
      const quizScore = quiz.total ? Math.round(quiz.percent * 0.1) : 0;
      const tutorScore = Math.round(tutor * 0.06);
      const score = clampMemoryPercent(Math.max(card.lastScore, evidenceScore + actionScore + scheduleScore + timelineScore + quizScore + tutorScore));
      const missed = card.status === "missed" || card.lapses > 0 || (card.attempts > 0 && card.lastScore < 65);
      const difficulty = missed
        ? "repair"
        : score >= 85
          ? "harder"
          : score >= 65
            ? "standard"
            : "learning";
      return {
        title,
        text,
        card,
        score,
        keywords,
        points,
        timeline,
        isDue,
        missed,
        dueLabel: formatDueDate(card.dueAt),
        difficulty,
        prompt: `Explain ${title} from memory. Include the cause, evidence, example, and one likely mistake.`
      };
    })
    .sort((a, b) => {
      if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
      if (a.missed !== b.missed) return a.missed ? -1 : 1;
      return a.score - b.score;
    });
}

function getVisibleMemoryCards(cards) {
  if (activeMemoryFilter === "missed") return cards.filter(card => card.missed);
  if (activeMemoryFilter === "all") return cards;
  return cards.filter(card => card.isDue || card.missed);
}

function gradeMemoryAnswer(card, answer) {
  const normalized = normalizeMemoryText(answer);
  const words = normalized ? normalized.split(/\s+/).filter(Boolean) : [];
  const matched = card.keywords.filter(keyword => normalized.includes(normalizeMemoryText(keyword)));
  const missing = card.keywords.filter(keyword => !matched.includes(keyword)).slice(0, 5);
  let score = 0;
  score += Math.min(35, words.length * 1.5);
  score += card.keywords.length ? Math.round((matched.length / card.keywords.length) * 45) : 20;
  if (/\bbecause\b|\btherefore\b|\bso\b|\bmeans\b|\bshows\b|\bevidence\b|\bexample\b/i.test(answer)) score += 12;
  if (words.length >= 45) score += 8;
  score = clampMemoryPercent(score);
  const whyWrong = [];
  if (words.length < 28) whyWrong.push("Answer is too short for durable recall.");
  if (missing.length) whyWrong.push(`Missing key ideas: ${missing.join(", ")}.`);
  if (!/\bbecause\b|\btherefore\b|\bevidence\b|\bexample\b|\bshows\b/i.test(answer)) {
    whyWrong.push("Add a because/example/evidence sentence, not just a definition.");
  }
  if (!whyWrong.length) whyWrong.push("Strong recall. Increase difficulty next time.");
  return {
    score,
    matched,
    missing,
    whyWrong,
    grade: score >= 85 ? "easy" : score >= 70 ? "good" : score >= 50 ? "hard" : "again"
  };
}

function scheduleMemoryReview(title, grade, score = null) {
  const card = getMemoryCardRecord(title);
  const normalizedGrade = ["again", "hard", "good", "easy"].includes(grade) ? grade : "hard";
  const next = {
    attempts: card.attempts + 1,
    lastScore: score === null ? card.lastScore : clampMemoryPercent(score),
    status: normalizedGrade === "again" ? "missed" : "reviewed",
    difficulty: normalizedGrade === "easy" ? "harder" : normalizedGrade === "again" ? "repair" : "standard"
  };
  if (normalizedGrade === "again") {
    next.intervalDays = 0;
    next.ease = Math.max(1.3, card.ease - 0.22);
    next.lapses = card.lapses + 1;
    next.streak = 0;
    next.dueAt = addDays(new Date(), 0).toISOString();
  } else if (normalizedGrade === "hard") {
    next.intervalDays = Math.max(1, Math.round(Math.max(1, card.intervalDays) * 1.2));
    next.ease = Math.max(1.5, card.ease - 0.08);
    next.streak = card.streak + 1;
    next.dueAt = addDays(new Date(), next.intervalDays).toISOString();
  } else if (normalizedGrade === "good") {
    next.intervalDays = card.reps ? Math.max(2, Math.round(Math.max(1, card.intervalDays) * card.ease)) : 2;
    next.ease = Math.min(2.8, card.ease + 0.04);
    next.streak = card.streak + 1;
    next.dueAt = addDays(new Date(), next.intervalDays).toISOString();
  } else {
    next.intervalDays = card.reps ? Math.max(4, Math.round(Math.max(2, card.intervalDays) * (card.ease + 0.45))) : 4;
    next.ease = Math.min(3.1, card.ease + 0.12);
    next.streak = card.streak + 1;
    next.dueAt = addDays(new Date(), next.intervalDays).toISOString();
  }
  next.reps = card.reps + 1;
  setMemoryCardRecord(title, next);
  recordStudyActivity("review_scheduled", {
    tool: "masterygraph",
    sectionTitle: title,
    label: `${normalizedGrade === "again" ? "Repair" : "Scheduled"} review for ${title}`,
    metadata: { grade: normalizedGrade, score: next.lastScore, intervalDays: next.intervalDays }
  });
  renderMasteryGraphPanel();
}

function checkMemoryRecallAnswer(sectionTitle) {
  const card = buildMemoryCards().find(item => item.title === sectionTitle);
  const input = Array.from(document.querySelectorAll("[data-memory-answer]"))
    .find(element => element.getAttribute("data-memory-answer") === sectionTitle);
  if (!card || !input) return;
  const answer = input.value || "";
  const feedback = gradeMemoryAnswer(card, answer);
  setMemoryCardRecord(sectionTitle, {
    lastAnswer: answer,
    lastFeedback: feedback,
    lastScore: feedback.score,
    status: feedback.score >= 70 ? "checked" : "missed",
    attempts: getMemoryCardRecord(sectionTitle).attempts + 1
  });
  recordStudyActivity("recall_checked", {
    tool: "masterygraph",
    sectionTitle,
    label: `Checked recall for ${sectionTitle}`,
    metadata: { score: feedback.score, grade: feedback.grade, answerLength: answer.trim().length }
  });
  renderMasteryGraphPanel();
}

function recordMasterySectionOpen(sectionTitle) {
  if (!sectionTitle || !sections[sectionTitle]) return;
  incrementMemoryCard(sectionTitle, "opened", 1, 6);
  if (activeTool === "masterygraph") renderMasteryGraphPanel();
}

function markMasteryGraphSectionReviewed(sectionTitle) {
  if (!sectionTitle || !sections[sectionTitle]) return;
  incrementMemoryCard(sectionTitle, "reviewed", 1, 5);
  recordStudyActivity("memory_reviewed", { tool: "masterygraph", sectionTitle });
  scheduleMemoryReview(sectionTitle, "good", Math.max(70, getMemoryCardRecord(sectionTitle).lastScore || 70));
}

function practiceMasteryGraphSection(sectionTitle) {
  if (!sectionTitle || !sections[sectionTitle]) return;
  incrementMemoryCard(sectionTitle, "practice", 1, 8);
  activeMemoryFilter = "due";
  renderMasteryGraphPanel();
  const target = Array.from(document.querySelectorAll("[data-memory-card]"))
    .find(element => element.getAttribute("data-memory-card") === sectionTitle);
  target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
}

function recordMasteryGraphPathProgress(sectionTitle) {
  const resolved = sections[sectionTitle] ? sectionTitle : findMemorySectionTitle(sectionTitle);
  if (!resolved) return;
  incrementMemoryCard(resolved, "path", 1, 6);
  if (activeTool === "masterygraph") renderMasteryGraphPanel();
}

function recordMasteryGraphQuizProgress() {
  const questions = Array.isArray(currentQuiz?.questions) ? currentQuiz.questions : [];
  if (!questions.length) return;
  const reportRows = Array.isArray(quizReport?.rows) ? quizReport.rows : [];
  const candidates = reportRows.length
    ? reportRows.map(row => ({ question: row.question, grade: row.grade }))
    : questions.filter(question => isQuizAnswered(question)).map(question => ({ question, grade: { correct: true } }));
  candidates.forEach(({ question, grade }) => {
    const title = findMemorySectionTitle([
      question.sourceReference,
      question.question,
      question.explanation,
      question.answer
    ].join(" "));
    if (!title) return;
    if (grade?.correct === false) {
      incrementMemoryCard(title, "practice", 1, 8);
      setMemoryCardRecord(title, { status: "missed", lapses: getMemoryCardRecord(title).lapses + 1, dueAt: new Date().toISOString() });
    } else if (grade?.answered !== false) {
      incrementMemoryCard(title, "quiz", 1, 6);
    }
  });
  if (activeTool === "masterygraph") renderMasteryGraphPanel();
}

function setMemoryFilter(filter) {
  activeMemoryFilter = ["due", "missed", "all"].includes(filter) ? filter : "due";
  renderMasteryGraphPanel();
}

function openMasteryGraphSection(title, options = {}) {
  const resolvedTitle = String(title || "");
  if (!resolvedTitle || !sections[resolvedTitle]) return;
  renderSectionNotes(resolvedTitle, { countMasteryOpen: options.countOpen !== false });
  document.querySelectorAll(".section-btn").forEach(button => {
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent.trim();
    button.classList.toggle("active", label === resolvedTitle);
  });
  const target = summaryContent?.closest(".brainstorm-card") || summaryContent;
  if (options.scroll !== false) target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

function renderMemoryStat(label, value, icon) {
  return `
    <div class="memory-stat">
      <i class="bi ${escapeAttr(icon)}"></i>
      <div>
        <strong>${escapeHTML(value)}</strong>
        <span>${escapeHTML(label)}</span>
      </div>
    </div>
  `;
}

function renderMemoryFeedback(card) {
  const feedback = card.card.lastFeedback;
  if (!feedback) return "";
  const actions = [
    ["again", "Again"],
    ["hard", "Hard"],
    ["good", "Good"],
    ["easy", "Easy"]
  ].map(([grade, label]) => `
    <button type="button" onclick="scheduleMemoryReview('${escapeAttr(card.title)}', '${grade}', ${clampMemoryPercent(feedback.score)})">
      ${label}
    </button>
  `).join("");
  return `
    <div class="memory-feedback ${feedback.score >= 70 ? "good" : "missed"}">
      <div class="memory-feedback-top">
        <strong>${feedback.score}% recall</strong>
        <span>${feedback.score >= 70 ? "Keep spacing it." : "Repair this memory before moving on."}</span>
      </div>
      <ul>
        ${feedback.whyWrong.map(item => `<li>${escapeHTML(item)}</li>`).join("")}
      </ul>
      <div class="memory-grade-actions">${actions}</div>
    </div>
  `;
}

function renderMemoryCard(card) {
  const statusClass = card.missed ? "missed" : card.isDue ? "due" : "scheduled";
  return `
    <article class="memory-review-card ${statusClass}" data-memory-card="${escapeAttr(card.title)}">
      <div class="memory-card-head">
        <div>
          <span class="memory-chip">${escapeHTML(card.dueLabel)}</span>
          <span class="memory-chip soft">${escapeHTML(card.difficulty)}</span>
        </div>
        <strong>${card.score}%</strong>
      </div>
      <h5>${escapeHTML(card.title)}</h5>
      <p>${escapeHTML(card.prompt)}</p>
      <div class="memory-keywords">
        ${card.keywords.slice(0, 6).map(keyword => `<span>${escapeHTML(keyword)}</span>`).join("")}
      </div>
      <textarea data-memory-answer="${escapeAttr(card.title)}" placeholder="Type your recall answer before checking...">${escapeHTML(card.card.lastAnswer || "")}</textarea>
      ${renderMemoryFeedback(card)}
      <div class="memory-card-actions">
        <button type="button" onclick="checkMemoryRecallAnswer('${escapeAttr(card.title)}')">
          <i class="bi bi-check2-circle me-1"></i>Check answer
        </button>
        <button type="button" onclick="openMasteryGraphSection('${escapeAttr(card.title)}')">Open notes</button>
        <button type="button" onclick="scheduleMemoryReview('${escapeAttr(card.title)}', 'again')">Missed only</button>
      </div>
    </article>
  `;
}

function renderMemoryTopicRow(card) {
  return `
    <button class="memory-topic-row" type="button" onclick="practiceMasteryGraphSection('${escapeAttr(card.title)}')">
      <span>
        <strong>${escapeHTML(card.title)}</strong>
        <small>${card.card.reps} reviews · ${card.card.lapses} misses · ${escapeHTML(card.dueLabel)}</small>
      </span>
      <b>${card.score}%</b>
    </button>
  `;
}

function getExamReadinessState(cards = buildMemoryCards()) {
  const dueCards = cards.filter(card => card.isDue || card.missed);
  const missedCards = cards.filter(card => card.missed);
  const weakCards = cards.slice().sort((a, b) => a.score - b.score).slice(0, 3);
  const average = cards.length ? clampMemoryPercent(cards.reduce((sum, card) => sum + card.score, 0) / cards.length) : 0;
  const quiz = getQuizMemoryProgress();
  const timeline = getTimelineMemoryProgress();
  const activity = getStudyActivitySummary();
  let nextAction = "Generate notes, then Synapse will diagnose your exam readiness.";
  if (missedCards.length) {
    nextAction = `Repair "${missedCards[0].title}" first. It is your highest-friction missed concept.`;
  } else if (dueCards.length) {
    nextAction = `Review "${dueCards[0].title}" now, then check it with one recall answer.`;
  } else if (!timeline.total) {
    nextAction = "Generate a Study Path to turn these notes into exam-focused tasks.";
  } else if (!quiz.total) {
    nextAction = "Generate a Quiz to expose weak spots and update this readiness score.";
  } else if (average < 75) {
    nextAction = `Start with "${weakCards[0]?.title || "your weakest topic"}" and answer from memory before rereading.`;
  } else {
    nextAction = "Keep spacing reviews and use harder quiz questions to test exam readiness.";
  }
  return {
    average,
    dueCount: dueCards.length,
    missedCount: missedCards.length,
    weakCards,
    nextAction,
    quiz,
    timeline,
    activity
  };
}

function renderStudyActivityLedger(activity = getStudyActivitySummary()) {
  const recent = activity.recent.length
    ? activity.recent.map(item => `
      <li class="study-activity-item">
        <span class="study-activity-icon" aria-hidden="true"><i class="bi ${escapeAttr(item.kind.includes("quiz") ? "bi-patch-question" : item.kind.includes("broadcast") ? "bi-broadcast" : item.kind.includes("flashcard") ? "bi-card-text" : item.kind.includes("path") ? "bi-signpost-split" : item.kind.includes("tutor") ? "bi-mic" : "bi-check2-circle")}"></i></span>
        <span class="study-activity-copy">
          <strong>${escapeHTML(item.label || getStudyActivityLabel(item.kind))}</strong>
          <small>${escapeHTML(item.sectionTitle || item.tool || "Study workspace")} · ${escapeHTML(formatStudyActivityTime(item.at))}</small>
        </span>
        <span class="study-activity-status ${item.status === "error" ? "is-error" : ""}">${escapeHTML(item.status || "done")}</span>
      </li>
    `).join("")
    : `<li class="study-activity-empty"><i class="bi bi-activity"></i><span>Your study actions will appear here as you work through this material.</span></li>`;
  return `
    <section class="study-activity-panel" aria-labelledby="studyActivityHeading">
      <div class="study-activity-head">
        <div>
          <h5 id="studyActivityHeading">Study activity</h5>
          <p>Detailed progress for this note, saved on this device.</p>
        </div>
        <div class="study-activity-summary" aria-label="Study activity totals">
          <strong>${activity.total}</strong><span>actions tracked</span>
        </div>
      </div>
      <div class="study-activity-metrics">
        <span><strong>${activity.completedTasks}</strong> completed tasks</span>
        <span><strong>${activity.toolsUsed}</strong> tools used</span>
        <span>Last active <strong>${escapeHTML(formatStudyActivityTime(activity.lastAt))}</strong></span>
      </div>
      <ol class="study-activity-list">${recent}</ol>
    </section>
  `;
}

function renderExamReadinessSummary(cards = buildMemoryCards()) {
  const state = getExamReadinessState(cards);
  const weakTopics = state.weakCards.length
    ? state.weakCards.map(card => `<span>${escapeHTML(card.title)} · ${card.score}%</span>`).join("")
    : "<span>No weak topics yet</span>";
  return `
    <section class="exam-readiness-summary-card">
      <div class="readiness-score" style="--memory-score:${state.average}%">
        <strong>${state.average}%</strong>
        <span>ready</span>
      </div>
      <div class="readiness-body">
        <div class="timeline-kicker">Exam Readiness</div>
        <h3>${escapeHTML(storedTitle || "Current study material")}</h3>
        <p class="readiness-next-action"><strong>recommended next action:</strong> ${escapeHTML(state.nextAction)}</p>
        <div class="readiness-metrics" aria-label="Exam readiness signals">
          <span>${state.dueCount} due review${state.dueCount === 1 ? "" : "s"}</span>
          <span>${state.missedCount} missed concept${state.missedCount === 1 ? "" : "s"}</span>
          <span>${state.quiz.label}</span>
          <span>${state.timeline.done}/${state.timeline.total || 0} path tasks</span>
          <span>${state.activity.completedTasks} completed task${state.activity.completedTasks === 1 ? "" : "s"}</span>
        </div>
        <div class="readiness-weak-topics">
          <strong>Weak topics</strong>
          <div>${weakTopics}</div>
        </div>
      </div>
    </section>
  `;
}

function updateExamReadinessSummary(cards = buildMemoryCards()) {
  const target = document.getElementById("examReadinessSummary");
  if (!target) return;
  const hasNotes = Boolean(fullSummary && fullSummary.trim() && cards.length);
  target.classList.toggle("d-none", !hasNotes);
  target.innerHTML = hasNotes ? renderExamReadinessSummary(cards) : "";
}

