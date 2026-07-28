function focusMindMapPoint(sectionName, pointText) {
  activateSectionFromMap(sectionName);
  if (questionInput) {
    questionInput.value = `Explain this point from "${sectionName}": ${pointText}`;
  }
}

window.selectMindBranch = selectMindBranch;
window.closeMindBranch = closeMindBranch;
window.openMindBranch = openMindBranch;
window.selectMindPoint = selectMindPoint;
window.selectMindChild = selectMindChild;
window.closeMindDetailPopup = closeMindDetailPopup;
window.openActiveMindMapSection = openActiveMindMapSection;
window.askSelectedMindPoint = askSelectedMindPoint;

function renderConnections() {
  const emptyEl = document.getElementById("connectionsEmpty");
  const listEl = document.getElementById("connectionsList");

  if (!connectionsData.length) {
    emptyEl.classList.remove("d-none");
    listEl.classList.add("d-none");
    return;
  }

  emptyEl.classList.add("d-none");
  listEl.classList.remove("d-none");
  listEl.innerHTML = connectionsData.map(conn => `
    <div class="connection-card" onclick="askConnection('${escapeAttr(conn.from)}','${escapeAttr(conn.to)}','${escapeAttr(conn.label)}')">
      <div class="connection-label">${escapeHTML(conn.label || "Connection")}</div>
      <div class="connection-desc">
        <strong>${escapeHTML(conn.from || "Idea")}</strong> →
        <strong>${escapeHTML(conn.to || "Idea")}</strong><br>
        ${escapeHTML(conn.description || "")}
      </div>
    </div>
  `).join("");
}

function askConnection(from, to, label) {
  switchTab("chat", document.querySelector('.asst-tab[onclick*="chat"]'));
  questionInput.value = `Explain the connection between "${from}" and "${to}" (${label}).`;
  askAI();
}

async function askAI() {
  const question = questionInput.value.trim();
  if (!question) return;

  const priorChatHistory = chatHistory.slice(-10);
  addMessage("user", question);
  questionInput.value = "";
  const typingId = addTypingIndicator();

  try {
    const response = await apiClient.fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        selected_section: selectedSection,
        preferred_language: preferredLanguage ? preferredLanguage.value : "auto",
        ai_provider: typeof normaliseAiProvider === "function"
          ? normaliseAiProvider(document.getElementById("aiProvider")?.value || safeGetLocalStorage?.(AI_PROVIDER_STORAGE_KEY, "") || "")
          : (document.getElementById("aiProvider")?.value || ""),
        title: storedTitle,
        summary: fullSummary,
        sections,
        source_identity: currentPrimarySourceIdentity,
        source_fingerprint: currentSourceFingerprint,
        chat_history: priorChatHistory.map(message => ({
          role: message.role,
          content: message.text
        }))
      })
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      throw new Error("Backend returned non-JSON response.");
    }

    removeTypingIndicator(typingId);

    if (!response.ok || data.error) {
      throw new Error(data.error || "AI request failed.");
    }

    let answer = data.answer || "No answer returned.";
    if (data.provider_warning) {
      answer = `${answer}\n\n_${data.provider_warning}_`;
    } else if (data.research_status === "unavailable") {
      answer = `${answer}\n\n_Live web research was unavailable for this turn, so Synapse answered from your uploaded notes._`;
    }
    if (data.ai_provider) {
      const label = data.ai_provider === "gemini" ? "Gemini" : "GPT";
      answer = `${answer}\n\n<small>Provider: ${label}${data.model ? ` · ${data.model}` : ""}</small>`;
    }
    addMessage("assistant", answer);
  } catch (error) {
    removeTypingIndicator(typingId);
    console.error(error);
    addMessage("assistant", `Error: ${error.message}`);
  }
}

function quickAsk(question) {
  questionInput.value = question;
  askAI();
}

function addMessage(role, text, options = {}) {
  const shouldPersist = options.persist !== false;
  const shouldAnimate = options.animate ?? role === "assistant";
  removeAssistantEmptyState();
  chatHistory.push({ role, text, createdAt: new Date().toISOString() });
  if (shouldPersist) persistTutorChatHistory();
  renderTutorChatMessage(role, text, { animate: shouldAnimate });
}

function renderTutorChatMessage(role, text, options = {}) {
  const div = document.createElement("div");
  div.className = `chat-message ${role}`;
  const bodyId = `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  div.innerHTML = `
    <strong>${role === "user" ? "You" : "Synapse"}</strong>
    <div id="${bodyId}"></div>`;

  chatMessages.appendChild(div);
  const body = document.getElementById(bodyId);

  let html = "";
  try {
    html = markdownToHTML(text);
  } catch (error) {
    console.error("Could not render tutor markdown:", error);
    html = `<pre class="notes-render-fallback">${escapeHTML(text)}</pre>`;
  }

  if (role === "assistant" && options.animate) {
    typeInto(body, html, () => {
      renderMath();
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 8);
  } else {
    body.innerHTML = html;
    renderMath();
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
  const id = "typing-" + Date.now();
  const div = document.createElement("div");
  div.id = id;
  div.className = "chat-message assistant";
  div.innerHTML = `<strong>Synapse</strong><div class="typing-dots"><span></span><span></span><span></span></div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  document.getElementById(id)?.remove();
}

function removeAssistantEmptyState() {
  chatMessages.querySelector(".assistant-empty")?.remove();
}

function clearChat() {
  chatHistory = [];
  persistTutorChatHistory();
  renderTutorChatHistory();
}

function getTutorChatKey() {
  if (currentHistoryId) return `history:${currentHistoryId}`;
  if (currentSourceFingerprint) return `fingerprint:${currentSourceFingerprint}`;
  return "";
}

function getTutorChatStore() {
  const parsed = safeReadJSONStorage(TUTOR_CHAT_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function setTutorChatStore(store) {
  return safeWriteJSONStorage(TUTOR_CHAT_STORAGE_KEY, store || {});
}

function normaliseTutorChatMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter(message => message && ["user", "assistant"].includes(message.role) && String(message.text || "").trim())
    .slice(-TUTOR_CHAT_HISTORY_LIMIT)
    .map(message => ({
      role: message.role,
      text: String(message.text || ""),
      createdAt: message.createdAt || new Date().toISOString()
    }));
}

function persistTutorChatHistory() {
  const key = getTutorChatKey();
  if (!key) return;
  const store = getTutorChatStore();
  store[key] = normaliseTutorChatMessages(chatHistory);
  setTutorChatStore(store);
}

function deleteTutorChatHistory(historyId, sourceFingerprint = "") {
  const store = getTutorChatStore();
  delete store[`history:${historyId}`];
  if (sourceFingerprint) delete store[`fingerprint:${sourceFingerprint}`];
  setTutorChatStore(store);
}

function loadTutorChatHistoryForCurrentNote() {
  const store = getTutorChatStore();
  const keys = [
    currentHistoryId ? `history:${currentHistoryId}` : "",
    currentSourceFingerprint ? `fingerprint:${currentSourceFingerprint}` : ""
  ].filter(Boolean);
  const saved = keys.map(key => store[key]).find(messages => Array.isArray(messages));
  chatHistory = normaliseTutorChatMessages(saved || []);
  renderTutorChatHistory();
}

function renderTutorChatHistory() {
  if (!chatMessages) return;
  chatMessages.innerHTML = "";
  if (!chatHistory.length) {
    chatMessages.innerHTML = `
      <div class="assistant-empty">
        <i class="bi bi-chat-dots"></i>
        <p>Ask questions about your generated notes.</p>
      </div>`;
    return;
  }
  chatHistory.forEach(message => renderTutorChatMessage(message.role, message.text, { animate: false }));
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getVoiceTutorKey() {
  if (currentHistoryId) return `history:${currentHistoryId}`;
  if (currentSourceFingerprint) return `fingerprint:${currentSourceFingerprint}`;
  return "";
}

function getVoiceTutorStore() {
  const parsed = safeReadJSONStorage(VOICE_TUTOR_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function setVoiceTutorStore(store) {
  return safeWriteJSONStorage(VOICE_TUTOR_STORAGE_KEY, store || {});
}

function normaliseVoiceTutorHistory(items) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item && ["user", "assistant"].includes(item.role) && String(item.text || "").trim())
    .slice(-VOICE_TUTOR_HISTORY_LIMIT)
    .map(item => ({
      role: item.role,
      text: String(item.text || ""),
      state: item.state || "",
      mastery: Number.isFinite(Number(item.mastery)) ? Number(item.mastery) : null,
      diagnosis: item.diagnosis || "",
      createdAt: item.createdAt || new Date().toISOString()
    }));
}

function persistVoiceTutorHistory() {
  const key = getVoiceTutorKey();
  if (!key) return;
  const store = getVoiceTutorStore();
  store[key] = normaliseVoiceTutorHistory(voiceTutorHistory);
  setVoiceTutorStore(store);
}

function deleteVoiceTutorHistory(historyId, sourceFingerprint = "") {
  const store = getVoiceTutorStore();
  delete store[`history:${historyId}`];
  if (sourceFingerprint) delete store[`fingerprint:${sourceFingerprint}`];
  setVoiceTutorStore(store);
}

function loadVoiceTutorHistoryForCurrentNote() {
  const store = getVoiceTutorStore();
  const keys = [
    currentHistoryId ? `history:${currentHistoryId}` : "",
    currentSourceFingerprint ? `fingerprint:${currentSourceFingerprint}` : ""
  ].filter(Boolean);
  const saved = keys.map(key => store[key]).find(items => Array.isArray(items));
  voiceTutorHistory = normaliseVoiceTutorHistory(saved || []);
  voiceTutorLastState = [...voiceTutorHistory].reverse().find(item => item.role === "assistant") || null;
  renderVoiceTutorHistory();
}

function resetVoiceTutorState() {
  stopRealtimeVoiceTutor({ silent: true });
  voiceTutorHistory = [];
  voiceTutorLastState = null;
  voiceTutorBusy = false;
  renderVoiceTutorHistory();
}

function resetVoiceTutorSession() {
  stopRealtimeVoiceTutor({ silent: true });
  voiceTutorHistory = [];
  voiceTutorLastState = null;
  persistVoiceTutorHistory();
  renderVoiceTutorHistory();
}

function renderVoiceTutorHistory() {
  if (!voiceMessages) return;
  voiceMessages.innerHTML = "";
  if (!voiceTutorHistory.length) {
    voiceMessages.innerHTML = `
      <div class="assistant-empty voice-empty">
        <i class="bi bi-mic"></i>
        <p>Start with what you already understand. Synapse will adapt the questions until you are ready.</p>
      </div>`;
  } else {
    voiceTutorHistory.forEach(item => renderVoiceTutorMessage(item.role, item.text, { persist: false, state: item.state, mastery: item.mastery }));
  }
  updateVoiceTutorStatus(voiceTutorLastState);
  updateVoiceTutorControls();
  voiceMessages.scrollTop = voiceMessages.scrollHeight;
}

function renderVoiceTutorMessage(role, text, options = {}) {
  if (!voiceMessages) return;
  voiceMessages.querySelector(".assistant-empty")?.remove();
  const div = document.createElement("div");
  div.className = `voice-message ${role}`;
  div.innerHTML = buildVoiceTutorMessageHTML(role, text, options);
  voiceMessages.appendChild(div);
  renderMath();
  voiceMessages.scrollTop = voiceMessages.scrollHeight;
  return div;
}

function buildVoiceTutorMessageHTML(role, text, options = {}) {
  const meta = role === "assistant" && options.state
    ? `<div class="voice-message-meta">${escapeHTML(formatVoiceProgressState(options.state))}</div>`
    : "";
  return `
    <strong>${role === "user" ? "You" : "Synapse Voice Tutor"}</strong>
    ${meta}
    <div class="voice-message-body">${markdownToHTML(text)}</div>`;
}

function updateRenderedVoiceTutorMessage(element, role, text, options = {}) {
  if (!element) return;
  element.innerHTML = buildVoiceTutorMessageHTML(role, text, options);
  renderMath();
  voiceMessages.scrollTop = voiceMessages.scrollHeight;
}

function normaliseStreamingVoiceTutorText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function resetVoiceTutorStreamingAssistantMessage() {
  voiceRealtimeStreamingAssistantItem = null;
  voiceRealtimeStreamingAssistantElement = null;
}

function updateVoiceTutorStreamingAssistantMessage(text, extras = {}) {
  const cleanText = normaliseStreamingVoiceTutorText(text);
  if (!cleanText) return false;
  const progress = estimateVoiceTutorProgress("assistant", cleanText);
  const providedMastery = Number(extras.mastery);
  const hasProvidedMastery = Number.isFinite(providedMastery) && (providedMastery > 0 || extras.state === "error" || extras.forceMastery);
  const item = voiceRealtimeStreamingAssistantItem || {
    role: "assistant",
    text: "",
    state: extras.state || "live",
    mastery: hasProvidedMastery ? providedMastery : (voiceTutorLastState?.mastery || progress.mastery || 0),
    diagnosis: extras.diagnosis || "Realtime tutor is speaking now.",
    createdAt: new Date().toISOString()
  };

  item.text = cleanText;
  item.state = extras.state || item.state || "live";
  item.mastery = hasProvidedMastery ? providedMastery : (item.mastery || voiceTutorLastState?.mastery || progress.mastery || 0);
  item.diagnosis = extras.diagnosis || item.diagnosis || progress.diagnosis || "";

  if (!voiceRealtimeStreamingAssistantItem) {
    voiceTutorHistory.push(item);
    voiceRealtimeStreamingAssistantItem = item;
    voiceRealtimeStreamingAssistantElement = renderVoiceTutorMessage("assistant", item.text, {
      state: item.state,
      mastery: item.mastery,
    });
  } else {
    updateRenderedVoiceTutorMessage(voiceRealtimeStreamingAssistantElement, "assistant", item.text, {
      state: item.state,
      mastery: item.mastery,
    });
  }

  voiceTutorLastState = item;
  updateVoiceTutorStatus(voiceTutorLastState);
  updateVoiceTutorControls();
  return true;
}

function commitVoiceTutorStreamingAssistantMessage(text, extras = {}) {
  if (!updateVoiceTutorStreamingAssistantMessage(text, extras)) return false;
  voiceTutorHistory = normaliseVoiceTutorHistory(voiceTutorHistory);
  persistVoiceTutorHistory();
  resetVoiceTutorStreamingAssistantMessage();
  return true;
}

function formatVoiceProgressState(state) {
  return String(state || "Tutor")
    .replace(/_/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function estimateVoiceTutorProgress(candidateRole = "", candidateText = "") {
  const candidate = candidateRole && String(candidateText || "").trim()
    ? [{ role: candidateRole, text: String(candidateText || ""), createdAt: new Date().toISOString() }]
    : [];
  const items = normaliseVoiceTutorHistory([...voiceTutorHistory, ...candidate]);
  const userTexts = items
    .filter(item => item.role === "user")
    .map(item => String(item.text || "").trim())
    .filter(Boolean);
  const assistantTexts = items
    .filter(item => item.role === "assistant" && item.state !== "error")
    .map(item => String(item.text || "").trim())
    .filter(Boolean);
  const stuckPattern = /\b(no idea|don't know|do not know|not sure|idk|lost|confused|答不上|不知道|不会|不懂|没懂|沒懂)\b/i;
  const substantiveAnswers = userTexts.filter(text => text.length >= 28 && !stuckPattern.test(text));
  const stuckCount = userTexts.filter(text => stuckPattern.test(text) || text.length < 10).length;
  const explanationSignals = userTexts.filter(text => /\b(because|therefore|for example|evidence|shows|means|however|compare|whereas|source|figure|experiment|method|原因|所以|例如|证据|圖|图|实验|方法)\b/i.test(text)).length;
  const answerWordTotal = userTexts.reduce((total, text) => total + (text.match(/\b[\w'-]+\b/g) || []).length, 0);

  let mastery = 0;
  if (assistantTexts.length) mastery += 8;
  mastery += Math.min(24, userTexts.length * 6);
  mastery += Math.min(34, substantiveAnswers.length * 11);
  mastery += Math.min(12, explanationSignals * 4);
  mastery += Math.min(10, Math.floor(answerWordTotal / 28) * 2);
  if (substantiveAnswers.length >= 1 && assistantTexts.length >= 2) mastery += 6;
  if (substantiveAnswers.length >= 3) mastery += 10;
  mastery -= Math.min(18, stuckCount * 6);

  const cap = userTexts.length === 0
    ? 12
    : substantiveAnswers.length === 0
      ? 30
      : substantiveAnswers.length < 2
        ? 55
        : substantiveAnswers.length < 4
          ? 78
          : 94;
  const previous = Number.isFinite(Number(voiceTutorLastState?.mastery)) ? Number(voiceTutorLastState.mastery) : 0;
  const rounded = Math.round(Math.max(previous, Math.max(0, Math.min(cap, mastery))));
  const state = rounded >= 85
    ? "review_ready"
    : rounded >= 65
      ? "applying"
      : rounded >= 35
        ? "learning"
        : userTexts.length
          ? "warming_up"
          : "live";
  const diagnosis = rounded >= 85
    ? "Strong progress. The tutor will keep checking application and source-evidence use before ending."
    : rounded >= 65
      ? "Good progress. Keep answering application questions to confirm transfer."
      : rounded >= 35
        ? "Progress is building. Keep explaining in your own words."
        : "Start by saying what you understand, even if it is partial.";
  return { mastery: rounded, state, diagnosis };
}

function getVoiceProgressStage(mastery, stateItem = null) {
  const state = String(stateItem?.state || "").toLowerCase();
  if (state === "error") return { label: "Needs attention", className: "error" };
  if (voiceRealtimeConnecting) return { label: "Connecting", className: "connecting" };
  if (!voiceTutorHistory.length && !voiceRealtimeConnected) return { label: "Ready to diagnose", className: "ready" };
  if (mastery >= 88 || state === "mastered") return { label: "Mastery check passed", className: "mastered" };
  if (mastery >= 75) return { label: "Review ready", className: "review" };
  if (mastery >= 55) return { label: "Applying ideas", className: "apply" };
  if (mastery >= 30) return { label: "Building understanding", className: "learn" };
  if (voiceRealtimeConnected) return { label: "Listening and diagnosing", className: "live" };
  return { label: "Warming up", className: "warm" };
}

function addVoiceTutorMessage(role, text, extras = {}) {
  const progress = estimateVoiceTutorProgress(role, text);
  const providedMastery = Number(extras.mastery);
  const hasProvidedMastery = Number.isFinite(providedMastery) && (providedMastery > 0 || extras.state === "error" || extras.forceMastery);
  const shouldUseEstimatedMastery = role === "assistant" && extras.state !== "error" && !hasProvidedMastery;
  const item = {
    role,
    text,
    state: extras.state || (role === "assistant" ? progress.state : ""),
    mastery: hasProvidedMastery
      ? providedMastery
      : shouldUseEstimatedMastery
        ? progress.mastery
        : null,
    diagnosis: extras.diagnosis || (role === "assistant" ? progress.diagnosis : ""),
    createdAt: new Date().toISOString()
  };
  voiceTutorHistory.push(item);
  voiceTutorHistory = normaliseVoiceTutorHistory(voiceTutorHistory);
  if (role === "assistant") voiceTutorLastState = item;
  persistVoiceTutorHistory();
  renderVoiceTutorMessage(role, text, { state: item.state, mastery: item.mastery });
  updateVoiceTutorStatus(voiceTutorLastState);
  updateVoiceTutorControls();
}

function updateVoiceTutorStatus(stateItem) {
  const mastery = Math.max(0, Math.min(100, Math.round(Number(stateItem?.mastery || 0))));
  const progressStage = getVoiceProgressStage(mastery, stateItem);
  const state = voiceRealtimeConnecting ? "connecting" : (voiceRealtimeConnected ? "live" : (stateItem?.state || (voiceTutorHistory.length ? "saved" : "ready")));
  if (voiceTutorState) voiceTutorState.textContent = formatVoiceProgressState(state);
  if (voiceTutorDiagnosis) {
    voiceTutorDiagnosis.textContent = voiceRealtimeConnected
      ? "Live GPT Realtime tutor is listening. Speak naturally, or type a fallback message below."
      : stateItem?.diagnosis || (
          voiceTutorHistory.length
            ? "Start a live tutor call to continue this note-specific voice session."
            : "Start a live diagnostic session for the current notes."
        );
  }
  if (voiceTutorMastery) voiceTutorMastery.textContent = `${mastery}%`;
  if (voiceTutorMasteryFill) voiceTutorMasteryFill.style.width = `${mastery}%`;
  if (voiceTutorProgressLabel) voiceTutorProgressLabel.textContent = progressStage.label;
  const masteryBox = document.querySelector(".voice-mastery");
  if (masteryBox) {
    masteryBox.dataset.stage = progressStage.className;
    masteryBox.style.setProperty("--voice-progress", `${mastery}%`);
  }
  if (activeTool === "masterygraph") {
    renderMasteryGraphPanel();
  }
}

function updateVoiceTutorControls() {
  const hasNotes = Boolean(fullSummary && fullSummary.trim());
  const requiresSession = document.querySelectorAll("[data-voice-requires-session]");
  requiresSession.forEach(button => {
    button.disabled = !voiceRealtimeConnected || voiceTutorBusy;
  });
  if (voiceRecordBtn) {
    voiceRecordBtn.disabled = !hasNotes || (voiceTutorBusy && !voiceRealtimeConnecting && !voiceRealtimeConnected);
    voiceRecordBtn.classList.toggle("recording", voiceRealtimeConnected || voiceRealtimeConnecting);
    voiceRecordBtn.innerHTML = voiceRealtimeConnecting
      ? `<i class="bi bi-hourglass-split me-1"></i>Connecting...`
      : voiceRealtimeConnected
        ? `<i class="bi bi-telephone-x-fill me-1"></i>End live tutor`
        : `<i class="bi bi-telephone-fill me-1"></i>Start live tutor`;
  }
  if (voiceMuteBtn) {
    voiceMuteBtn.disabled = !voiceRealtimeConnected || !voiceRealtimeStream;
    voiceMuteBtn.classList.toggle("recording", voiceRealtimeMuted);
    voiceMuteBtn.innerHTML = voiceRealtimeMuted
      ? `<i class="bi bi-mic-fill me-1"></i>Unmute mic`
      : `<i class="bi bi-mic-mute me-1"></i>Mute mic`;
  }
}

function setVoiceTutorBusy(isBusy) {
  voiceTutorBusy = Boolean(isBusy);
  updateVoiceTutorControls();
}

function trimVoiceTopicText(value, limit = 9000) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}
function getActiveMindMapVoiceContext() {
  if (activeTool !== "mindmap") return null;
  const data = getMindMapData(currentMindMap);
  const branch = data.branches[activeMindBranchIndex] || data.branches[0];
  if (!branch) return null;
  const point = branch.points[activeMindPointIndex] || null;
  const child = activeMindChildIndex >= 0 ? point?.children?.[activeMindChildIndex] : null;
  const sectionText = sections[branch.section] || sections[branch.label] || "";
  const title = child?.label
    ? `${branch.label}: ${point.label} / ${child.label}`
    : point?.label
    ? `${branch.label}: ${point.label}`
    : branch.label;
  const context = [
    `Mind map branch: ${branch.label}`,
    branch.summary ? `Branch summary: ${branch.summary}` : "",
    point ? `Selected point: ${point.label}\nPoint detail: ${point.detail}` : "",
    child ? `Selected subpoint: ${child.label}\nSubpoint detail: ${child.detail}` : "",
    sectionText ? `Related generated note section:\n${sectionText}` : ""
  ].filter(Boolean).join("\n\n");
  return {
    title,
    context: trimVoiceTopicText(context),
    scope: child ? "current mind map subpoint" : point ? "current mind map point" : "current mind map branch"
  };
}

function getCurrentVoiceTutorTopicContext() {
  if (selectedSection && sections[selectedSection]) {
    return {
      title: selectedSection,
      context: trimVoiceTopicText(sections[selectedSection]),
      scope: "selected generated note section"
    };
  }

  const visibleTitle = sectionTitle?.innerText?.trim() || "";
  if (visibleTitle && visibleTitle !== "Study Notes" && summaryContent?.textContent?.trim()) {
    return {
      title: visibleTitle,
      context: trimVoiceTopicText(summaryContent.textContent),
      scope: "currently visible generated topic"
    };
  }

  const preferredOverviewTitle = Object.keys(sections).find(title => /overview|learning question|core/i.test(title));
  const overviewContext = preferredOverviewTitle ? sections[preferredOverviewTitle] : "";
  if ((storedTitle && storedTitle !== "Study Notes") || overviewContext || fullSummary) {
    const resolvedNoteTitle = storedTitle && storedTitle !== "Study Notes"
      ? storedTitle
      : makeHistoryTitle(fullSummary || overviewContext || preferredOverviewTitle || "", preferredOverviewTitle || "Current generated topic");
    return {
      title: resolvedNoteTitle,
      context: trimVoiceTopicText(overviewContext || fullSummary, 6500),
      scope: overviewContext ? "current note overview" : "current generated notes"
    };
  }

  const mindMapContext = getActiveMindMapVoiceContext();
  if (mindMapContext?.context) return mindMapContext;

  return {
    title: storedTitle || "Current generated topic",
    context: trimVoiceTopicText(fullSummary, 6500),
    scope: "current generated notes"
  };
}

function getVoiceTutorStarterSentence(title) {
  const safeTitle = trimVoiceTopicText(title || storedTitle || "this topic", 120);
  return `Hi, I'm your Synapse tutor for ${safeTitle}. We'll build this step by step.`;
}

function buildRealtimeTutorTopicInstruction(extraInstruction = "") {
  const topic = getCurrentVoiceTutorTopicContext();
  const title = topic.title || storedTitle || "Current generated topic";
  const scope = topic.scope || "current generated topic";
  const context = trimVoiceTopicText(topic.context || fullSummary || "", 5200);
  const extra = String(extraInstruction || "").trim();
  const starter = getVoiceTutorStarterSentence(title);
  const voiceLanguageName = getVoiceTutorLanguageName();
  return [
    `CURRENT TOPIC LOCK: You are tutoring only this generated topic: "${title}".`,
    `Topic scope: ${scope}.`,
    `Expected spoken language: ${voiceLanguageName}. Stay in this language unless the learner clearly gives a full sentence in another language.`,
    "If a very short transcript appears in a different writing system, treat it as a speech-recognition mistake and ask the learner to repeat or type it.",
    context ? `Topic context:\n${context}` : "",
    `Common first spoken sentence: On the first assistant turn in this live session, start exactly with: "${starter}"`,
    "Do not ask what subject, course, material, or topic the learner is working on. You already know it from CURRENT TOPIC LOCK.",
    "If the learner says they have no idea, says they are lost, or gives a very short answer, immediately start from the basics of this exact topic with a 2-3 sentence explanation, then ask one simple check question.",
    "If the learner asks outside this topic, briefly redirect back to the current topic.",
    "Every assistant turn must end with exactly one clear next step: either a short question for the learner to answer, a prompt to continue explaining, or an invitation to try a mini-example. Never end a tutoring turn with only a statement.",
    extra
  ].filter(Boolean).join("\n\n");
}

function buildVoiceTutorSessionFormData(sdp) {
  const formData = new FormData();
  const topic = getCurrentVoiceTutorTopicContext();
  formData.append("sdp", sdp);
  formData.append("history", JSON.stringify(voiceTutorHistory.map(item => ({
    role: item.role,
    text: item.text,
    state: item.state,
    mastery: item.mastery
  }))));
  formData.append("title", storedTitle || "Current Notes");
  formData.append("summary", fullSummary || "");
  formData.append("sections", JSON.stringify(sections || {}));
  formData.append("selected_section", selectedSection || "");
  formData.append("topic_title", topic.title || storedTitle || "Current generated topic");
  formData.append("topic_context", topic.context || "");
  formData.append("topic_scope", topic.scope || "current generated topic");
  formData.append("preferred_language", preferredLanguage ? preferredLanguage.value : "auto");
  formData.append("voice_input_language", getVoiceInputLanguageCode());
  formData.append("source_identity", currentPrimarySourceIdentity || "");
  return formData;
}
function normaliseVoiceSpeechText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\s"'“”‘’`.,!?;:，。！？；：()[\]{}<>/\\|-]+/g, " ")
    .trim();
}

function countVoicePattern(text, regex) {
  return (String(text || "").match(regex) || []).length;
}

function normaliseVoiceLanguageKey(language) {
  const key = String(language || "auto").trim().toLowerCase().replace(/-/g, "_");
  const aliases = {
    en: "english",
    eng: "english",
    zh: "simplified_chinese",
    zh_cn: "simplified_chinese",
    zh_hans: "simplified_chinese",
    zh_tw: "traditional_chinese",
    zh_hant: "traditional_chinese",
    ja: "japanese",
    jp: "japanese",
    ko: "korean",
    kr: "korean",
    fr: "french",
    es: "spanish",
    de: "german",
    it: "italian",
    pt: "portuguese",
    ar: "arabic",
    hi: "hindi",
    vi: "vietnamese",
    th: "thai",
    id: "indonesian",
    ms: "malay",
    ru: "russian"
  };
  const normalised = aliases[key] || key;
  const supported = new Set([
    "auto",
    "english",
    "simplified_chinese",
    "traditional_chinese",
    "mixed_chinese_english",
    "japanese",
    "korean",
    "french",
    "spanish",
    "german",
    "italian",
    "portuguese",
    "arabic",
    "hindi",
    "vietnamese",
    "thai",
    "indonesian",
    "malay",
    "russian"
  ]);
  return supported.has(normalised) ? normalised : "auto";
}

function detectDominantVoiceLanguageKey(text) {
  const value = String(text || "");
  const chineseChars = countVoicePattern(value, /[\u4e00-\u9fff]/g);
  const japaneseChars = countVoicePattern(value, /[\u3040-\u30ff]/g);
  const koreanChars = countVoicePattern(value, /[\uac00-\ud7af]/g);
  const arabicChars = countVoicePattern(value, /[\u0600-\u06ff]/g);
  const latinWords = countVoicePattern(value, /\b[A-Za-z]{3,}\b/g);

  if (japaneseChars >= 20 && japaneseChars >= chineseChars * 0.4) return "japanese";
  if (koreanChars >= 20) return "korean";
  if (arabicChars >= 20) return "arabic";
  if (chineseChars >= 60 && chineseChars >= Math.max(25, latinWords * 0.25)) return "simplified_chinese";
  return "english";
}

function getVoiceExpectedLanguageKey() {
  const selected = normaliseVoiceLanguageKey(preferredLanguage ? preferredLanguage.value : "auto");
  if (selected !== "auto" && selected !== "mixed_chinese_english") return selected;
  if (selected === "mixed_chinese_english") return "mixed_chinese_english";
  const topic = getCurrentVoiceTutorTopicContext();
  const sourceText = [
    topic?.title || "",
    topic?.context || "",
    fullSummary || "",
    Object.entries(sections || {}).slice(0, 4).map(([title, content]) => `${title}\n${content}`).join("\n")
  ].join("\n").slice(0, 16000);
  return detectDominantVoiceLanguageKey(sourceText);
}

function getVoiceTutorLanguageName() {
  const names = {
    english: "English",
    simplified_chinese: "Simplified Chinese",
    traditional_chinese: "Traditional Chinese",
    mixed_chinese_english: "Chinese with useful English academic terms",
    japanese: "Japanese",
    korean: "Korean",
    french: "French",
    spanish: "Spanish",
    german: "German",
    italian: "Italian",
    portuguese: "Portuguese",
    arabic: "Arabic",
    hindi: "Hindi",
    vietnamese: "Vietnamese",
    thai: "Thai",
    indonesian: "Indonesian",
    malay: "Malay",
    russian: "Russian"
  };
  return names[getVoiceExpectedLanguageKey()] || "the current note language";
}

function getVoiceInputLanguageCode() {
  const codes = {
    english: "en",
    simplified_chinese: "zh",
    traditional_chinese: "zh",
    japanese: "ja",
    korean: "ko",
    french: "fr",
    spanish: "es",
    german: "de",
    italian: "it",
    portuguese: "pt",
    arabic: "ar",
    hindi: "hi",
    vietnamese: "vi",
    thai: "th",
    indonesian: "id",
    malay: "ms",
    russian: "ru"
  };
  return codes[getVoiceExpectedLanguageKey()] || "";
}

function isLikelyWrongLanguageVoiceTranscript(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  const expected = getVoiceExpectedLanguageKey();
  if (expected === "mixed_chinese_english") return false;
  const latinWords = countVoicePattern(value, /\b[A-Za-z]{2,}\b/g);
  const cjkChars = countVoicePattern(value, /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g);
  const arabicChars = countVoicePattern(value, /[\u0600-\u06ff]/g);
  const latinLetters = countVoicePattern(value, /[A-Za-z]/g);

  if (expected === "english") {
    return (cjkChars + arabicChars > 0) && latinWords === 0 && (value.length <= 28 || cjkChars + arabicChars >= 2);
  }
  if (["simplified_chinese", "traditional_chinese", "japanese", "korean", "arabic"].includes(expected)) {
    return latinLetters >= 3 && cjkChars + arabicChars === 0 && value.length <= 18;
  }
  return false;
}

function rejectWrongLanguageVoiceTranscript(transcript) {
  clearVoiceNoTranscriptTimer();
  voiceRealtimeLastTranscriptText = "";
  if (voiceTutorDiagnosis) {
    voiceTutorDiagnosis.textContent = `I may have misheard that as another language. Please repeat in ${getVoiceTutorLanguageName()} or type your answer below.`;
  }
  console.warn("Ignored likely wrong-language voice transcript:", transcript);
}

function getRecentVoiceMessage(role) {
  return [...voiceTutorHistory].reverse().find(item => item.role === role && String(item.text || "").trim()) || null;
}

function isDuplicateVoiceUserTranscript(text, windowMs = 8000) {
  const normalised = normaliseVoiceSpeechText(text);
  if (!normalised) return true;
  const lastUser = getRecentVoiceMessage("user");
  if (!lastUser) return false;
  const lastCreatedAt = Date.parse(lastUser.createdAt || "");
  const recentlyAdded = Number.isFinite(lastCreatedAt) ? Date.now() - lastCreatedAt < windowMs : true;
  return recentlyAdded && normaliseVoiceSpeechText(lastUser.text) === normalised;
}

function isLikelyVoiceAssistantEcho(text) {
  const normalised = normaliseVoiceSpeechText(text);
  if (!normalised || normalised.length < 8) return false;
  const lastAssistant = getRecentVoiceMessage("assistant");
  const assistantText = normaliseVoiceSpeechText(`${voiceRealtimeAssistantDraft || ""} ${lastAssistant?.text || ""}`);
  if (!assistantText) return false;
  return assistantText.includes(normalised) || (
    normalised.length > 30 && normalised.includes(assistantText.slice(0, Math.min(assistantText.length, 80)))
  );
}

function clearVoiceNoTranscriptTimer() {
  if (voiceRealtimeNoTranscriptTimer) {
    clearTimeout(voiceRealtimeNoTranscriptTimer);
    voiceRealtimeNoTranscriptTimer = null;
  }
}

function scheduleVoiceNoTranscriptNotice() {
  clearVoiceNoTranscriptTimer();
  voiceRealtimeNoTranscriptTimer = setTimeout(() => {
    if (!voiceRealtimeConnected) return;
    if (Date.now() - voiceRealtimeLastTranscriptAt < 4500) return;
    if (voiceTutorDiagnosis) {
      voiceTutorDiagnosis.textContent = "I heard audio activity but did not receive a transcript. Check the browser microphone permission, or type your answer below.";
    }
  }, 5200);
}

function sendRealtimeEvent(event) {
  if (!voiceRealtimeChannel || voiceRealtimeChannel.readyState !== "open") return false;
  try {
    voiceRealtimeChannel.send(JSON.stringify(event));
    return true;
  } catch (error) {
    console.error("Failed to send Realtime event", error);
    return false;
  }
}

function requestRealtimeTutorResponse(instructions = "") {
  if (voiceRealtimeResponseActive) return false;
  const response = {
    output_modalities: ["audio"]
  };
  response.instructions = buildRealtimeTutorTopicInstruction(instructions);
  const sent = sendRealtimeEvent({
    type: "response.create",
    response
  });
  if (sent) voiceRealtimeResponseActive = true;
  return sent;
}
