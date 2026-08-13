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
