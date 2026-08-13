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
    } else if (data.used_external_research && data.research_provider) {
      const researchLabel = data.research_provider === "wikipedia"
        ? "Wikipedia"
        : data.research_provider.includes("duckduckgo")
          ? "web search"
          : data.research_provider;
      answer = `${answer}\n\n<small>External research: ${researchLabel}</small>`;
    }
    if (data.ai_provider) {
      const label = data.ai_provider === "gemini" ? "Gemini" : (data.ai_provider === "deepseek" ? "DeepSeek" : "GPT");
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

