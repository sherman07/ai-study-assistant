function extractRealtimeResponseTranscript(response) {
  const fragments = [];
  const outputItems = Array.isArray(response?.output) ? response.output : [];
  outputItems.forEach(item => {
    const contentItems = Array.isArray(item?.content) ? item.content : [];
    contentItems.forEach(part => {
      if (typeof part?.transcript === "string") fragments.push(part.transcript);
      else if (typeof part?.text === "string") fragments.push(part.text);
    });
  });
  if (!fragments.length && typeof response?.output_text === "string") {
    fragments.push(response.output_text);
  }
  return fragments.join(" ").replace(/\s+/g, " ").trim();
}

function normaliseVoiceTutorErrorMessage(value, fallback = "Realtime voice session failed.") {
  if (value == null || value === "") return fallback;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[object Object]") return fallback;
    if (/^[{[]/.test(trimmed)) {
      try {
        return normaliseVoiceTutorErrorMessage(JSON.parse(trimmed), fallback);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (typeof value !== "object") {
    return String(value || "").trim() || fallback;
  }

  const nested = [
    value.error?.message,
    value.status_details?.error?.message,
    value.response?.status_details?.error?.message,
    value.detail?.message,
    value.message,
    value.error,
    value.detail,
    value.cause,
  ];
  for (const candidate of nested) {
    const message = normaliseVoiceTutorErrorMessage(candidate, "");
    if (message) {
      const code = value.error?.code || value.code || value.status_details?.error?.code || "";
      const type = value.error?.type || value.type || value.status_details?.error?.type || "";
      const suffix = [code, type].filter(Boolean).join(" / ");
      return suffix && !message.includes(suffix) ? `${message} (${suffix})` : message;
    }
  }

  return fallback;
}

function voiceTutorRealtimeResponseErrorMessage(body, response) {
  const base = normaliseVoiceTutorErrorMessage(body, "Realtime voice session failed.");
  const status = Number(response?.status || 0);
  const statusText = String(response?.statusText || "").trim();
  const statusLabel = status ? `HTTP ${status}${statusText ? ` ${statusText}` : ""}` : "";
  return statusLabel && !base.includes(statusLabel) ? `${base} (${statusLabel})` : base;
}

function sendRealtimeTextMessage(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (voiceRealtimeResponseActive) {
    addVoiceTutorMessage("assistant", "One moment. I am finishing the current explanation, then you can send your next answer.", {
      state: "live",
      mastery: voiceTutorLastState?.mastery || 0
    });
    return false;
  }
  const sent = sendRealtimeEvent({
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: value }]
    }
  });
  if (sent) {
    addVoiceTutorMessage("user", value);
    if (typeof recordStudyActivity === "function") recordStudyActivity("tutor_message", {
      tool: "tutor",
      label: "Asked Voice Tutor",
      metadata: { messageLength: value.length }
    });
    requestRealtimeTutorResponse(
      `The learner just said: "${value}". Respond as the live tutor for the locked current topic. If this means they do not know the answer, begin teaching the locked topic directly instead of asking what subject they are studying. Keep it conversational and ask one next question.`
    );
  }
  return sent;
}

function handleRealtimeTutorEvent(rawEvent) {
  let event;
  try {
    event = JSON.parse(rawEvent.data);
  } catch {
    return;
  }
  if (event.type === "error") {
    const message = normaliseVoiceTutorErrorMessage(event.error, "Realtime voice session error.");
    console.error(event);
    voiceRealtimeResponseActive = false;
    setVoiceTutorBusy(false);
    addVoiceTutorMessage("assistant", `Error: ${message}`, { state: "error", mastery: voiceTutorLastState?.mastery || 0 });
    return;
  }
  if (event.type === "response.created") {
    voiceRealtimeResponseActive = true;
    voiceRealtimeAssistantDraft = "";
    voiceRealtimeTranscriptCommitted = false;
    resetVoiceTutorStreamingAssistantMessage();
    clearVoiceNoTranscriptTimer();
    return;
  }
  if (event.type === "input_audio_buffer.speech_started") {
    voiceRealtimeLastSpeechAt = Date.now();
    clearVoiceNoTranscriptTimer();
    if (voiceTutorDiagnosis) voiceTutorDiagnosis.textContent = "Listening to your answer...";
    return;
  }
  if (event.type === "input_audio_buffer.speech_stopped" || event.type === "input_audio_buffer.committed") {
    if (voiceTutorDiagnosis) voiceTutorDiagnosis.textContent = "Processing what you said...";
    scheduleVoiceNoTranscriptNotice();
    return;
  }
  if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
    const transcript = String(event.transcript || "").trim();
    clearVoiceNoTranscriptTimer();
    if (isLikelyWrongLanguageVoiceTranscript(transcript)) {
      rejectWrongLanguageVoiceTranscript(transcript);
      return;
    }
    voiceRealtimeLastTranscriptText = transcript;
    voiceRealtimeLastTranscriptAt = Date.now();
    if (isLikelyVoiceAssistantEcho(transcript)) {
      if (voiceTutorDiagnosis) {
        voiceTutorDiagnosis.textContent = "Ignored echo from the tutor audio. Speak again when you are ready, or type below.";
      }
      return;
    }
    if (!isDuplicateVoiceUserTranscript(transcript)) {
      addVoiceTutorMessage("user", transcript);
    }
    window.setTimeout(() => {
      if (!voiceRealtimeConnected || voiceRealtimeResponseActive) return;
      requestRealtimeTutorResponse(
        `The learner just said aloud: "${transcript}". Respond as the live tutor for the locked current topic. Diagnose their answer, then ask one focused follow-up. If they are stuck, teach the basics of this exact topic instead of asking what subject they are studying.`
      );
    }, 350);
    return;
  }
  if (event.type === "conversation.item.input_audio_transcription.failed") {
    const message = normaliseVoiceTutorErrorMessage(event.error, "I could not transcribe that clearly. Please try again or type the answer below.");
    addVoiceTutorMessage("assistant", message, {
      state: "listening",
      mastery: voiceTutorLastState?.mastery || 0
    });
    return;
  }
  if ((event.type === "response.audio_transcript.delta" || event.type === "response.output_audio_transcript.delta" || event.type === "response.text.delta") && event.delta) {
    voiceRealtimeAssistantDraft += event.delta;
    updateVoiceTutorStreamingAssistantMessage(voiceRealtimeAssistantDraft, {
      state: "live",
      mastery: voiceTutorLastState?.mastery || 0,
      diagnosis: "Realtime tutor is speaking now."
    });
    return;
  }
  if (event.type === "response.audio_transcript.done" || event.type === "response.output_audio_transcript.done") {
    const transcript = event.transcript || voiceRealtimeAssistantDraft;
    voiceRealtimeAssistantDraft = "";
    if (transcript && transcript.trim()) {
      voiceRealtimeTranscriptCommitted = true;
      commitVoiceTutorStreamingAssistantMessage(transcript.trim(), {
        state: "live",
        mastery: voiceTutorLastState?.mastery || 0,
        diagnosis: "Realtime tutor responded from the current note context."
      });
    }
    return;
  }
  if (event.type === "response.done") {
    const failedMessage = event.response?.status === "failed"
      ? normaliseVoiceTutorErrorMessage(event.response?.status_details?.error || event.response, "Realtime voice response failed.")
      : "";
    const transcript = voiceRealtimeTranscriptCommitted
      ? ""
      : (voiceRealtimeAssistantDraft.trim() || extractRealtimeResponseTranscript(event.response));
    voiceRealtimeAssistantDraft = "";
    voiceRealtimeResponseActive = false;
    if (failedMessage) {
      addVoiceTutorMessage("assistant", `Error: ${failedMessage}`, {
        state: "error",
        mastery: voiceTutorLastState?.mastery || 0
      });
      setVoiceTutorBusy(false);
      return;
    }
    if (transcript) {
      voiceRealtimeTranscriptCommitted = true;
      commitVoiceTutorStreamingAssistantMessage(transcript, {
        state: "live",
        mastery: voiceTutorLastState?.mastery || 0,
        diagnosis: "Realtime tutor responded from the current note context."
      });
    }
    setVoiceTutorBusy(false);
    return;
  }
  if (event.type === "response.cancelled" || event.type === "response.failed") {
    voiceRealtimeResponseActive = false;
    setVoiceTutorBusy(false);
    if (event.type === "response.failed") {
      addVoiceTutorMessage("assistant", `Error: ${normaliseVoiceTutorErrorMessage(event.error, "Realtime voice response failed.")}`, {
        state: "error",
        mastery: voiceTutorLastState?.mastery || 0,
        diagnosis: "The live tutor response failed before it could finish."
      });
    }
    return;
  }
  if (event.type === "response.output_text.delta" && event.delta) {
    voiceRealtimeAssistantDraft += event.delta;
    updateVoiceTutorStreamingAssistantMessage(voiceRealtimeAssistantDraft, {
      state: "live",
      mastery: voiceTutorLastState?.mastery || 0,
      diagnosis: "Realtime tutor is speaking now."
    });
  }
}

function createRealtimeAudioElement() {
  if (voiceRealtimeAudio) return voiceRealtimeAudio;
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.playsInline = true;
  audio.style.display = "none";
  document.body.appendChild(audio);
  voiceRealtimeAudio = audio;
  return audio;
}

async function waitForIceGathering(peer) {
  if (peer.iceGatheringState === "complete") return;
  await new Promise(resolve => {
    const timeout = setTimeout(resolve, 1200);
    peer.addEventListener("icegatheringstatechange", () => {
      if (peer.iceGatheringState === "complete") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}

function getVoiceTutorConnectionErrorMessage(error) {
  const name = error?.name || "";
  const message = normaliseVoiceTutorErrorMessage(error, "Realtime voice session failed.");
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone permission is off. Please allow microphone access in Chrome/system settings, then start the live tutor again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone was found. Connect or enable a microphone, then start the live tutor again.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The microphone is being used by another app or cannot start. Close other mic apps, then try again.";
  }
  return message;
}

async function startRealtimeVoiceTutor() {
  if (!fullSummary || !fullSummary.trim()) {
    alert("Generate notes first, then start Voice Tutor.");
    return;
  }
  if (voiceRealtimeConnected || voiceRealtimeConnecting || voiceTutorBusy) return;
  if (!navigator.mediaDevices || !window.RTCPeerConnection) {
    alert("Realtime voice needs microphone and WebRTC support. Try a modern Chrome browser.");
    return;
  }

  setVoiceTutorBusy(true);
  voiceRealtimeConnecting = true;
  if (typeof recordStudyActivity === "function") recordStudyActivity("tutor_started", {
    tool: "tutor",
    label: "Started Voice Tutor"
  });
  updateVoiceTutorStatus(voiceTutorLastState);
  try {
    voiceRealtimePeer = new RTCPeerConnection();
    voiceRealtimeAudio = createRealtimeAudioElement();
    voiceRealtimePeer.ontrack = event => {
      const [stream] = event.streams;
      if (stream) voiceRealtimeAudio.srcObject = stream;
    };
    voiceRealtimePeer.onconnectionstatechange = () => {
      const state = voiceRealtimePeer?.connectionState || "";
      if (["failed", "disconnected", "closed"].includes(state)) {
        voiceRealtimeResponseActive = false;
        setVoiceTutorBusy(false);
        updateVoiceTutorStatus(voiceTutorLastState);
        updateVoiceTutorControls();
      }
    };
    voiceRealtimeStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    const micTracks = voiceRealtimeStream.getAudioTracks();
    if (!micTracks.length) {
      throw new Error("No microphone audio track was available. Check browser microphone permission.");
    }
    micTracks.forEach(track => {
      track.enabled = true;
      track.onended = () => {
        voiceRealtimeMuted = true;
        updateVoiceTutorControls();
        if (voiceTutorDiagnosis) voiceTutorDiagnosis.textContent = "Microphone stopped. Restart the live tutor to continue speaking.";
      };
      voiceRealtimePeer.addTrack(track, voiceRealtimeStream);
    });

    voiceRealtimeChannel = voiceRealtimePeer.createDataChannel("oai-events");
    voiceRealtimeChannel.onmessage = handleRealtimeTutorEvent;
    voiceRealtimeChannel.onopen = () => {
      voiceRealtimeConnecting = false;
      voiceRealtimeConnected = true;
      voiceRealtimeMuted = false;
      setVoiceTutorBusy(false);
      updateVoiceTutorStatus({ state: "live", mastery: voiceTutorLastState?.mastery || 0 });
      updateVoiceTutorControls();
      sendRealtimeEvent({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: buildRealtimeTutorTopicInstruction(
            "Begin the live tutoring session now. Start with the common first spoken sentence exactly once, then ask what the learner already understands about that exact topic. Never ask what subject they are working on."
          )
        }
      });
      requestRealtimeTutorResponse(
        "Begin now. Start with the common first spoken sentence exactly once, then ask what the learner already understands about this topic. Do not ask what subject they are working on."
      );
    };
    voiceRealtimeChannel.onclose = () => {
      voiceRealtimeConnected = false;
      voiceRealtimeConnecting = false;
      updateVoiceTutorStatus(voiceTutorLastState);
      updateVoiceTutorControls();
    };

    const offer = await voiceRealtimePeer.createOffer();
    await voiceRealtimePeer.setLocalDescription(offer);
    await waitForIceGathering(voiceRealtimePeer);
    const response = await apiClient.fetch("/voice-tutor/realtime-call", {
      method: "POST",
      body: buildVoiceTutorSessionFormData(voiceRealtimePeer.localDescription.sdp)
    });
    const answerSdp = await response.text();
    const answerContentType = response.headers?.get?.("content-type") || "";
    if (!response.ok) {
      throw new Error(voiceTutorRealtimeResponseErrorMessage(answerSdp, response));
    }
    if (/application\/json/i.test(answerContentType) || /^[{[]/.test(answerSdp.trim())) {
      throw new Error(voiceTutorRealtimeResponseErrorMessage(answerSdp, response));
    }
    if (!/^v=0/m.test(answerSdp.trim())) {
      throw new Error("Realtime voice service returned an invalid SDP answer. Check the OpenAI Realtime model and API key, then restart the backend.");
    }
    await voiceRealtimePeer.setRemoteDescription({
      type: "answer",
      sdp: answerSdp
    });
  } catch (error) {
    console.error(error);
    addVoiceTutorMessage("assistant", `Error: ${getVoiceTutorConnectionErrorMessage(error)}`, { state: "error", mastery: voiceTutorLastState?.mastery || 0 });
    stopRealtimeVoiceTutor({ silent: true });
    setVoiceTutorBusy(false);
    voiceRealtimeConnecting = false;
    updateVoiceTutorStatus(voiceTutorLastState);
    updateVoiceTutorControls();
  }
}

function startVoiceTutorSession() {
  if (!fullSummary || !fullSummary.trim()) {
    alert("Generate notes first, then start Voice Tutor.");
    return;
  }
  if (voiceRealtimeConnected || voiceRealtimeConnecting) {
    stopRealtimeVoiceTutor();
    return;
  }
  startRealtimeVoiceTutor();
}

function sendVoiceTutorText(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (!voiceRealtimeConnected) {
    alert("Start the live tutor first, then type or speak your answer.");
    return false;
  }
  return sendRealtimeTextMessage(value);
}

function sendVoiceTutorTypedAnswer() {
  const value = voiceTextInput ? voiceTextInput.value.trim() : "";
  if (!value) return;
  if (sendVoiceTutorText(value) && voiceTextInput) {
    voiceTextInput.value = "";
  }
}

function toggleVoiceTutorMute() {
  if (!voiceRealtimeStream) return;
  voiceRealtimeMuted = !voiceRealtimeMuted;
  voiceRealtimeStream.getAudioTracks().forEach(track => {
    track.enabled = !voiceRealtimeMuted;
  });
  if (voiceRealtimeMuted) {
    if (voiceTutorDiagnosis) voiceTutorDiagnosis.textContent = "Microphone muted. Unmute when you want to answer aloud.";
  } else {
    if (voiceTutorDiagnosis) voiceTutorDiagnosis.textContent = "Microphone unmuted. Speak naturally, or type a fallback message below.";
  }
  updateVoiceTutorControls();
}

function stopRealtimeVoiceTutor({ silent = false } = {}) {
  clearVoiceNoTranscriptTimer();
  if (voiceRealtimeChannel) {
    try { voiceRealtimeChannel.close(); } catch {}
  }
  if (voiceRealtimePeer) {
    try { voiceRealtimePeer.close(); } catch {}
  }
  if (voiceRealtimeStream) {
    voiceRealtimeStream.getTracks().forEach(track => track.stop());
  }
  if (voiceRealtimeAudio) {
    voiceRealtimeAudio.pause();
    voiceRealtimeAudio.srcObject = null;
    voiceRealtimeAudio.remove();
  }
  voiceRealtimePeer = null;
  voiceRealtimeChannel = null;
  voiceRealtimeStream = null;
  voiceRealtimeAudio = null;
  voiceRealtimeConnected = false;
  voiceRealtimeConnecting = false;
  voiceRealtimeMuted = false;
  voiceRealtimeAssistantDraft = "";
  resetVoiceTutorStreamingAssistantMessage();
  voiceRealtimeResponseActive = false;
  voiceRealtimeTranscriptCommitted = false;
  voiceRealtimeLastTranscriptText = "";
  voiceRealtimeLastTranscriptAt = 0;
  voiceRealtimeLastSpeechAt = 0;
  if (!silent && voiceTutorLastState?.state !== "error") {
    updateVoiceTutorStatus(voiceTutorLastState);
  }
  updateVoiceTutorControls();
}

function switchTab(tabName, clickedBtn) {
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
  document.querySelectorAll(".asst-tab").forEach(button => button.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.add("active");
  clickedBtn?.classList.add("active");
  if (tabName === "voice") updateVoiceTutorControls();
}

function closeAssistant() {
  document.body.classList.remove("mobile-assistant-open");
  assistant.classList.add("hidden");
  appLayout.classList.add("assistant-closed");
  if (openAssistantBtn) openAssistantBtn.style.display = "block";
}

function isMobileTutorViewport() {
  return window.matchMedia("(max-width: 850px)").matches;
}

function syncAssistantMobileState() {
  if (!assistant || !appLayout) return;
  const isOpen = !assistant.classList.contains("hidden") && appLayout.classList.contains("analysis-ready");
  const shouldUseBottomSheet = isOpen && isMobileTutorViewport();
  document.body.classList.toggle("mobile-assistant-open", shouldUseBottomSheet);
}

function openAssistant() {
  assistant.classList.remove("hidden");
  appLayout.classList.remove("assistant-closed");
  if (isMobileTutorViewport()) {
    assistant.classList.remove("expanded");
    assistantExpanded = false;
  }
  if (openAssistantBtn) openAssistantBtn.style.display = "none";
  syncAssistantMobileState();
}

function expandAssistant() {
  if (isMobileTutorViewport()) {
    assistant.classList.toggle("expanded");
    assistantExpanded = assistant.classList.contains("expanded");
    syncAssistantMobileState();
    return;
  }
  assistantExpanded = !assistantExpanded;
  assistant.classList.toggle("expanded", assistantExpanded);
}

window.addEventListener("resize", syncAssistantMobileState);

function resetWorkspace() {
  safeRemoveLocalStorage(ACTIVE_HISTORY_KEY);
  if (typeof clearActiveGenerationJob === "function") clearActiveGenerationJob();
  stopRealtimeVoiceTutor({ silent: true });
  revokeSourceObjectURLs();

  uploadedFiles = [];
  uploadedLinks = [];
  sections = {};
  fullSummary = "";
  selectedSection = "";
  chatHistory = [];
  connectionsData = [];
  currentSourceFingerprint = "";
  currentHistoryId = "";
  currentPrimarySourceIdentity = "";
  currentMindMap = null;
  storedTitle = "Study Notes";
  activeTool = "mindmap";
  visualGalleryData = [];
  sourceViewerItems = [];
  sourceViewerOpen = false;
  activeSourceItemId = "";
  sourceViewerZoom = 100;
  assistantExpanded = false;

  if (assetUpload) assetUpload.value = "";
  if (linkInput) linkInput.value = "";
  if (sourceInput) sourceInput.value = "";
  if (summaryContent) summaryContent.innerHTML = "";
  if (sectionsContainer) sectionsContainer.innerHTML = "";
  if (visualGallery) {
    visualGallery.innerHTML = "";
    visualGallery.classList.add("d-none");
  }
  if (sourceViewerPanel) sourceViewerPanel.classList.add("d-none");
  if (loadingBox) loadingBox.classList.add("d-none");
  if (resultGrid) resultGrid.classList.add("d-none");
  if (analysisStage) analysisStage.classList.add("d-none");
  if (uploadStage) uploadStage.classList.remove("d-none");
  if (assistant) assistant.classList.add("hidden");
  if (openAssistantBtn) openAssistantBtn.style.display = "none";

  resetTimelineState();
  resetVisualGuideState();
  resetQuizState();
  resetFlashcardState();
  resetVoiceTutorState();
  renderFilePreview();
  renderLinkPreview();
  renderSourceViewer();
  setupVisualGuideTool();
  setupTimelineTool();
  setupMasteryGraphTool();
  setupQuizTool();
  setupFlashcardTool();
  setupBroadcastTool();
  if (typeof renderFocusRoomWorkspaceActions === "function") renderFocusRoomWorkspaceActions();
  if (typeof notifyFocusRoomMaterialsChanged === "function") notifyFocusRoomMaterialsChanged();

  appLayout.classList.remove("analysis-ready", "loading-state", "generation-job-state", "source-viewer-open", "generated-notes-state");
  appLayout.classList.add("initial-state", "assistant-closed");
  if (typeof setWorkspaceNavTab === "function") {
    setWorkspaceNavTab("library", { persist: true, expandRail: false });
  }
  requestAnimationFrame(() => {
    const target = uploadStage || document.body;
    target.scrollIntoView?.({ behavior: "smooth", block: "start" });
  });
}

const AUTH_SESSION_STORAGE_KEY = "synapse.auth.session.v1";

function readAuthSessionFromBrowserStorage() {
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      const raw = storage?.getItem?.(AUTH_SESSION_STORAGE_KEY);
      const session = raw ? JSON.parse(raw) : null;
      if (session && typeof session === "object" && (session.email || session.accountId)) {
        return session;
      }
    } catch {}
  }
  return null;
}

function getCurrentAccountSession() {
  // SynapseAuth may keep the session in sessionStorage when Remember me is off.
  // Prefer the auth client (checks both storages), then fall back to a direct dual read.
  const fromAuth = window.SynapseAuth?.getStoredSession?.();
  if (fromAuth && typeof fromAuth === "object" && (fromAuth.email || fromAuth.accountId)) {
    return fromAuth;
  }
  return readAuthSessionFromBrowserStorage();
}

function accountInitials(session) {
  const name = String(session?.displayName || session?.email || "Synapse Student").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name.slice(0, 2) || "S").toUpperCase();
}

function accountAuthModeLabel(session) {
  if (session?.authMode === "supabase") return "Supabase Auth";
  if (session?.authMode === "local_demo") return "Local demo auth";
  return session?.authProvider ? `${session.authProvider} auth` : "Not signed in";
}

const ACCOUNT_PREFERENCES_STORAGE_KEY = "synapse.account.preferences.v1";
const ACCOUNT_THEME_VALUES = new Set(["system", "light", "dark"]);

function readAccountPreferences() {
  if (window.SynapseTheme?.readPreferences) return window.SynapseTheme.readPreferences();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACCOUNT_PREFERENCES_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAccountPreferences(next) {
  if (window.SynapseTheme?.STORAGE_KEY) {
    try { window.localStorage.setItem(window.SynapseTheme.STORAGE_KEY, JSON.stringify(next)); } catch {}
    return;
  }
  try {
    window.localStorage.setItem(ACCOUNT_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function resolveAccountTheme(preference = "system") {
  if (window.SynapseTheme?.resolve) return window.SynapseTheme.resolve(preference);
  if (preference === "dark" || preference === "light") return preference;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function applyAccountTheme(preference = readAccountPreferences().appearance || "system") {
  if (window.SynapseTheme?.apply) return window.SynapseTheme.apply(preference);
  const selected = ACCOUNT_THEME_VALUES.has(preference) ? preference : "system";
  const resolved = resolveAccountTheme(selected);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = selected;
  document.documentElement.style.colorScheme = resolved;
  document.body?.classList.toggle("synapse-theme-dark", resolved === "dark");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", resolved === "dark" ? "#171717" : "#4a7cff");
  return resolved;
}

function applyAccountStudyPreference(key, value) {
  const controlId = { language: "preferredLanguage", promptMode: "promptMode", studyDepth: "noteLength", provider: "aiProvider" }[key];
  const control = controlId ? document.getElementById(controlId) : null;
  if (control) {
    control.value = value;
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (key === "provider") {
    if (typeof setAiProvider === "function") setAiProvider(value);
    else {
      try { window.localStorage.setItem("synapse.ai.provider.v1", value); } catch {}
    }
  }
}

function setAccountPreference(key, value) {
  const preferences = readAccountPreferences();
  const nextValue = key === "appearance" && !ACCOUNT_THEME_VALUES.has(value) ? "system" : String(value || "");
  writeAccountPreferences({ ...preferences, [key]: nextValue });
  if (key === "appearance") {
    if (window.SynapseTheme?.setPreference) window.SynapseTheme.setPreference(nextValue);
    else applyAccountTheme(nextValue);
    document.querySelectorAll("[data-account-theme]").forEach(button => {
      const active = button.dataset.accountTheme === nextValue;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  } else {
    applyAccountStudyPreference(key, nextValue);
  }
  setAccountPanelStatus("success", "Settings saved on this device.");
}

function initialiseAccountPreferences() {
  applyAccountTheme();
  if (window.SynapseTheme?.subscribe) {
    if (!window.__synapseThemePreferenceSubscription) {
      window.__synapseThemePreferenceSubscription = window.SynapseTheme.subscribe(({ preference }) => {
        document.querySelectorAll("[data-account-theme]").forEach(button => {
          const active = button.dataset.accountTheme === preference;
          button.classList.toggle("is-selected", active);
          button.setAttribute("aria-pressed", String(active));
        });
      });
    }
    return;
  }
  if (!window.__synapseThemeListenerInstalled && window.matchMedia) {
    window.__synapseThemeListenerInstalled = true;
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if ((readAccountPreferences().appearance || "system") === "system") applyAccountTheme("system");
    });
  }
}

function accountPanelStatusHTML() {
  return `<div id="accountPanelStatus" class="account-panel-status" role="status" aria-live="polite"></div>`;
}

function setAccountPanelStatus(type, message) {
  const status = document.getElementById("accountPanelStatus");
  if (!status) {
    if (message) alert(message);
    return;
  }
  status.textContent = message || "";
  status.className = message ? `account-panel-status show ${type}` : "account-panel-status";
}

function billingPlansForAccount() {
  if (window.SynapseAuth?.getBillingPlans) {
    return window.SynapseAuth.getBillingPlans();
  }
  return [
    { id: "free", label: "Free", price: "$0", cadence: "forever", description: "500 welcome credits, then 50 fresh AI credits every day" },
    { id: "pro_monthly", label: "Pro Monthly", price: "$9.99", cadence: "per month", description: "1,000 fresh AI credits every day" },
    { id: "pro_yearly", label: "Pro Annual", price: "$99.99", cadence: "per year", description: "1,000 fresh AI credits every day with annual savings" }
  ];
}

function boostPacksForAccount() {
  if (window.SynapseAuth?.getBoostPacks) {
    return window.SynapseAuth.getBoostPacks();
  }
  return Array.isArray(window.SYNAPSE_BOOST_PACKS) ? window.SYNAPSE_BOOST_PACKS : [];
}

function normaliseBillingPlanId(value) {
  const text = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (text === "starter") return "free";
  if (text === "pro") return "pro_monthly";
  if (text === "pro_month") return "pro_monthly";
  if (text === "pro_year" || text === "pro_annual") return "pro_yearly";
  return text || "free";
}

function formatBillingDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not set";
  return date.toLocaleDateString();
}

function formatCreditCount(value) {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  return amount.toLocaleString();
}

function billingActionsHTML() {
  const session = getCurrentAccountSession();
  const signedIn = Boolean(session?.email);
  const currentPlanId = normaliseBillingPlanId(session?.billingPlan || session?.plan || "free");
  const plans = billingPlansForAccount();
  const boostPacks = boostPacksForAccount();
  const dailyCredits = signedIn ? Number(session.dailyCredits ?? 0) : 0;
  const boostCredits = signedIn ? Number(session.boostCredits ?? 0) : 0;
  const totalCredits = signedIn ? Number(session.credits || (dailyCredits + boostCredits) || 0) : 0;
  const dailyAllowance = signedIn ? Number(session.dailyAllowance || 0) : 0;
  const planCards = plans.map(plan => {
    const planId = normaliseBillingPlanId(plan.id);
    const isFree = planId === "free";
    const isCurrent = currentPlanId === planId;
    const disabled = !signedIn || isFree || isCurrent;
    const description = isFree
      ? "Included with every account"
      : (plan.description || "Secure Stripe Checkout");
    const checkoutMode = plan.mode || (planId === "pro_yearly" ? "payment" : "subscription");
    const actionLabel = isCurrent ? "Current plan" : (isFree ? "Included" : "Upgrade to Pro");
    return `
      <button class="account-plan-action ${isCurrent ? "current" : ""}" type="button" ${disabled ? "disabled" : ""}
              onclick="startBillingCheckout('${escapeAttr(planId)}', '${escapeAttr(checkoutMode)}')">
        <span>
          <strong>${escapeHTML(plan.label || planId)}</strong>
          <small>${escapeHTML([plan.price, plan.cadence].filter(Boolean).join(" / ") || description)}</small>
          <em>${escapeHTML(description)}</em>
        </span>
        <b>${escapeHTML(actionLabel)}</b>
      </button>
    `;
  }).join("");
  const boostCards = boostPacks.map(pack => {
    const packId = escapeAttr(pack.id || "");
    return `
      <button class="account-plan-action" type="button" ${signedIn ? "" : "disabled"}
              onclick="startBoostCheckout('${packId}')">
        <span>
          <strong>${escapeHTML(pack.label || pack.id || "Boost")}</strong>
          <small>${escapeHTML(pack.price || "")} · ${escapeHTML(formatCreditCount(pack.credits))} credits</small>
          <em>Boost Credits stay until you use them. Daily credits are used first.</em>
        </span>
        <b>Add Boost</b>
      </button>
    `;
  }).join("");
  return `
    <div class="account-panel-actions">
      <div class="account-credit-summary" aria-label="Credit balances">
        <p><strong>${escapeHTML(formatCreditCount(totalCredits))}</strong> total credits</p>
        <p>Daily: ${escapeHTML(formatCreditCount(dailyCredits))}${dailyAllowance ? ` / ${escapeHTML(formatCreditCount(dailyAllowance))}` : ""} · Boost: ${escapeHTML(formatCreditCount(boostCredits))}</p>
      </div>
      <div class="account-plan-grid">${planCards || `<p class="account-panel-help">Set window.SYNAPSE_BILLING_PLANS to enable checkout buttons.</p>`}</div>
      <p class="account-section-copy">Need more credits today?</p>
      <div class="account-plan-grid">${boostCards || `<p class="account-panel-help">Boost packs will appear here once configured.</p>`}</div>
      <button class="account-secondary-action" type="button" ${signedIn ? "" : "disabled"}
              onclick="openBillingPortal()">
        <i class="bi bi-credit-card"></i>
        Manage billing portal
      </button>
      <p class="account-panel-help">Fresh daily credits reset each day and are spent first. Boost Credits persist until used. Estimates appear before AI generation. Stripe env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_YEARLY, and STRIPE_PRICE_BOOST_*.</p>
    </div>
  `;
}

function dataActionsHTML() {
  return `
    <div class="account-panel-actions">
      <p class="account-section-copy">Your notes stay available in Recent learning until you remove an individual item. Export creates a portable copy of your account data.</p>
      <button class="account-secondary-action" type="button" onclick="exportAccountData()">
        <i class="bi bi-download"></i>
        Export my data
      </button>
      <button class="account-danger-action" type="button" onclick="openAccountDeletionDialog()">
        <i class="bi bi-trash3"></i>
        Delete account
      </button>
    </div>
  `;
}

function renderAccountMenu() {
  const session = getCurrentAccountSession();
  const signedIn = Boolean(session?.email);
  const displayName = signedIn ? (session.displayName || session.email) : "Guest Student";
  const email = signedIn ? session.email : "Not signed in";
  const plan = signedIn ? (session.plan || "Free") : "Free";
  const credits = signedIn ? Number(session.credits || 0) : 0;
  const dailyCredits = signedIn && Number.isFinite(Number(session.dailyCredits))
    ? Number(session.dailyCredits)
    : null;
  const boostCredits = signedIn && Number.isFinite(Number(session.boostCredits))
    ? Number(session.boostCredits)
    : null;
  document.querySelectorAll(".account-menu-avatar").forEach(node => {
    node.textContent = accountInitials(session);
  });
  document.querySelectorAll(".account-menu-name").forEach(node => {
    node.textContent = displayName;
  });
  document.querySelectorAll(".account-menu-email").forEach(node => {
    node.textContent = email;
  });
  document.querySelectorAll(".account-menu-plan").forEach(node => {
    node.textContent = plan;
  });
  document.querySelectorAll(".account-menu-credits").forEach(node => {
    node.textContent = String(credits);
    if (dailyCredits != null || boostCredits != null) {
      node.title = `Daily ${dailyCredits ?? 0} · Boost ${boostCredits ?? 0}`;
    }
  });
  document.querySelectorAll(".account-signed-in-only").forEach(node => {
    node.style.display = signedIn ? "" : "none";
  });
  document.querySelectorAll(".account-signed-out-only").forEach(node => {
    node.style.display = signedIn ? "none" : "";
  });
  const normalizedEmail = String(session?.email || "").trim().toLowerCase();
  const isController = Boolean(
    session?.isController
    || session?.platformRole === "controller"
    || normalizedEmail === "shermanzheng8@gmail.com"
  );
  document.querySelectorAll(".account-controller-only").forEach(node => {
    node.style.display = signedIn && isController ? "" : "none";
  });
}

async function refreshAccountSessionFromProvider() {
  renderAccountMenu();
  if (!window.SynapseAuth?.syncSessionFromProvider) return getCurrentAccountSession();
  try {
    await window.SynapseAuth.syncSessionFromProvider();
    await window.SynapseAuth.syncBillingSessionFromServer?.(window.SynapseAuth.getStoredSession?.());
  } catch (error) {
    console.warn("Could not refresh Synapse auth session:", error);
  }
  renderAccountMenu();
  return getCurrentAccountSession();
}

function authPageUrl(page = "login") {
  const file = page === "signup" ? "signup.html" : "login.html";
  return /\/frontend(?:\/|$)/i.test(window.location.pathname || "") ? file : `frontend/${file}`;
}

function goToAuthPage(page = "login") {
  window.location.href = authPageUrl(page);
}

function signOutAccount() {
  const clearLocalAuthSession = () => {
    try { window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY); } catch {}
    try { window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY); } catch {}
  };
  if (window.SynapseAuth?.signOut) {
    window.SynapseAuth.signOut()
      .catch(error => console.warn("Synapse sign out failed:", error))
      .finally(() => {
        clearLocalAuthSession();
        renderAccountMenu();
        goToAuthPage("login");
      });
    return;
  }
  clearLocalAuthSession();
  renderAccountMenu();
  goToAuthPage("login");
}

function closeAccountPanel() {
  document.querySelector(".account-panel-overlay")?.remove();
}

function closeSynapseConfirmation() {
  document.querySelector(".synapse-confirmation-overlay")?.remove();
}

function openSynapseConfirmation({ eyebrow = "Confirm action", title, description, confirmationText = "", confirmLabel = "Confirm", onConfirm }) {
  closeSynapseConfirmation();
  const overlay = document.createElement("div");
  overlay.className = "synapse-confirmation-overlay";
  const requiresTypedConfirmation = Boolean(confirmationText);
  overlay.innerHTML = `
    <section class="synapse-confirmation-card" role="dialog" aria-modal="true" aria-labelledby="synapseConfirmationTitle">
      <div class="synapse-confirmation-icon"><i class="bi bi-exclamation-triangle"></i></div>
      <p class="account-settings-kicker">${escapeHTML(eyebrow)}</p>
      <h3 id="synapseConfirmationTitle">${escapeHTML(title)}</h3>
      <p>${escapeHTML(description)}</p>
      ${requiresTypedConfirmation ? `<label class="synapse-confirmation-input">Type <strong>${escapeHTML(confirmationText)}</strong> to continue<input type="text" autocomplete="off" data-confirmation-input aria-label="Type ${escapeAttr(confirmationText)} to confirm"></label>` : ""}
      <div class="synapse-confirmation-actions"><button type="button" class="account-secondary-action" data-confirmation-cancel>Cancel</button><button type="button" class="account-danger-action" data-confirmation-submit ${requiresTypedConfirmation ? "disabled" : ""}>${escapeHTML(confirmLabel)}</button></div>
    </section>
  `;
  overlay.addEventListener("click", event => { if (event.target === overlay) closeSynapseConfirmation(); });
  overlay.querySelector("[data-confirmation-cancel]")?.addEventListener("click", closeSynapseConfirmation);
  const input = overlay.querySelector("[data-confirmation-input]");
  const submit = overlay.querySelector("[data-confirmation-submit]");
  input?.addEventListener("input", () => { submit.disabled = input.value.trim() !== confirmationText; });
  submit?.addEventListener("click", async () => {
    submit.disabled = true;
    submit.textContent = "Working…";
    try {
      await onConfirm?.();
      closeSynapseConfirmation();
    } catch (error) {
      submit.disabled = false;
      submit.textContent = confirmLabel;
      const message = error?.message || "That action could not be completed.";
      overlay.querySelector(".synapse-confirmation-card")?.insertAdjacentHTML("beforeend", `<p class="synapse-confirmation-error" role="alert">${escapeHTML(message)}</p>`);
    }
  });
  document.body.appendChild(overlay);
  window.setTimeout(() => (input || overlay.querySelector("[data-confirmation-cancel]"))?.focus(), 0);
}

function openHistoryDeletionDialog(id) {
  const target = getHistory().find(item => item.id === id);
  const title = target ? makeHistoryTitle(target) : "this saved item";
  const companion = target?.kind === "companion"
    || Boolean(target?.companionThreadId)
    || String(target?.id || "").startsWith("companion:");
  openSynapseConfirmation({
    eyebrow: "Remove from recent learning",
    title: companion ? "Remove this companion chat?" : "Remove this study note?",
    description: companion
      ? `“${title}” will be removed from Recent learning and deleted from this browser. This cannot be undone.`
      : `“${title}” and its saved study tools will be removed from this workspace. This cannot be undone.`,
    confirmLabel: companion ? "Remove chat" : "Remove note",
    onConfirm: () => destroyHistoryEntry(id)
  });
}

function openAccountDeletionDialog() {
  const session = getCurrentAccountSession();
  openSynapseConfirmation({
    eyebrow: "Danger zone",
    title: "Delete your Synapse account?",
    description: `This removes the account for ${session?.email || "this user"}, clears this browser's Synapse data, and requests deletion of supported server data. Export your data first if you need a copy.`,
    confirmationText: "DELETE",
    confirmLabel: "Delete account",
    onConfirm: () => confirmAccountDeletion()
  });
}

function accountSettingsNavigation(activeSection) {
  const items = [
    ["general", "General", "bi-sliders"],
    ["study", "Study defaults", "bi-book"],
    ["privacy", "Data & privacy", "bi-shield-check"],
    ["profile", "Account", "bi-person-circle"],
    ["billing", "Billing & credits", "bi-credit-card"]
  ];
  return `<nav class="account-settings-nav" aria-label="Settings sections">${items.map(([id, label, iconName]) => `
    <button class="account-settings-nav-item ${activeSection === id ? "active" : ""}" type="button" onclick="openAccountPanel('settings', '${id}')">
      <i class="bi ${iconName}"></i><span>${label}</span>
    </button>
  `).join("")}</nav>`;
}

function accountPreferenceOptions(controlId, fallback) {
  const control = document.getElementById(controlId);
  if (!control || !control.options) return fallback;
  return Array.from(control.options).map(option => [option.value, option.textContent.trim()]);
}

function accountPreferenceSelect(key, label, description, options, value) {
  return `
    <label class="account-setting-field">
      <span><strong>${escapeHTML(label)}</strong><small>${escapeHTML(description)}</small></span>
      <select onchange="setAccountPreference('${escapeAttr(key)}', this.value)">
        ${options.map(([optionValue, optionLabel]) => `<option value="${escapeAttr(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHTML(optionLabel)}</option>`).join("")}
      </select>
    </label>
  `;
}

function accountSettingsContent(section, session) {
  const preferences = readAccountPreferences();
  if (section === "study") {
    const languageOptions = accountPreferenceOptions("preferredLanguage", [["auto", "Auto-detect source language"], ["english", "English"]]);
    const promptOptions = accountPreferenceOptions("promptMode", [["professor_mode", "Professional Mode"]]);
    const depthOptions = accountPreferenceOptions("noteLength", [["standard_notes", "Standard Notes"]]);
    let savedProvider = preferences.provider;
    if (savedProvider === undefined) {
      try { savedProvider = window.localStorage.getItem("synapse.ai.provider.v1") || ""; } catch { savedProvider = ""; }
    }
    if (savedProvider === undefined || savedProvider === null) {
      savedProvider = document.getElementById("aiProvider")?.value || "";
    }
    return `
      <section class="account-settings-section" aria-labelledby="settings-study-title">
        <p class="account-settings-kicker">Study defaults</p>
        <h4 id="settings-study-title">Start each workspace with your preferred setup</h4>
        <p class="account-section-copy">These defaults apply to new analyses. Prompt mode and study depth still appear on the upload screen; Generate AI is only changed here.</p>
        <div class="account-settings-fields">
          ${accountPreferenceSelect("language", "Output language", "Notes, explanations, quizzes, and flashcards.", languageOptions, preferences.language || document.getElementById("preferredLanguage")?.value || "auto")}
          ${accountPreferenceSelect("provider", "Generate AI", "Choose Backend default, GPT, Gemini, or DeepSeek for note generation.", [["", "Backend default"], ["openai", "GPT"], ["gemini", "Gemini"], ["deepseek", "DeepSeek"]], savedProvider)}
          ${accountPreferenceSelect("promptMode", "Response style", "How Synapse explains your material.", promptOptions, preferences.promptMode || document.getElementById("promptMode")?.value || "professor_mode")}
          ${accountPreferenceSelect("studyDepth", "Study depth", "The default level of detail for new notes.", depthOptions, preferences.studyDepth || document.getElementById("noteLength")?.value || "standard_notes")}
        </div>
      </section>
    `;
  }
  if (section === "privacy") {
    return `
      <section class="account-settings-section" aria-labelledby="settings-privacy-title">
        <p class="account-settings-kicker">Data & privacy</p>
        <h4 id="settings-privacy-title">Keep control of your learning data</h4>
        <p class="account-section-copy">Synapse can export the data held in this browser and request server-side data when your signed-in account supports it.</p>
        ${dataActionsHTML()}
      </section>
    `;
  }
  if (section === "profile") {
    return `
      <section class="account-settings-section" aria-labelledby="settings-account-title">
        <p class="account-settings-kicker">Account</p>
        <h4 id="settings-account-title">Your Synapse account</h4>
        <div class="account-panel-list">
          <div class="account-panel-row"><span>Name</span><strong>${escapeHTML(session?.displayName || "Student")}</strong></div>
          <div class="account-panel-row"><span>Email</span><strong>${escapeHTML(session?.email || "Not signed in")}</strong></div>
          <div class="account-panel-row"><span>Sign-in</span><strong>${escapeHTML(accountAuthModeLabel(session))}</strong></div>
          <div class="account-panel-row"><span>Workspace history</span><strong>${getHistory().length} saved note${getHistory().length === 1 ? "" : "s"}</strong></div>
        </div>
        <p class="account-section-copy">Password, multi-factor authentication, and device management appear here when the connected authentication provider supports them.</p>
      </section>
    `;
  }
  if (section === "billing") return `<section class="account-settings-section" aria-labelledby="settings-billing-title"><p class="account-settings-kicker">Billing & credits</p><h4 id="settings-billing-title">Plan, credits, and invoices</h4>${billingActionsHTML()}</section>`;
  const appearance = preferences.appearance || "system";
  return `
    <section class="account-settings-section" aria-labelledby="settings-general-title">
      <p class="account-settings-kicker">General</p>
      <h4 id="settings-general-title">Make Synapse comfortable to use</h4>
      <p class="account-section-copy">Appearance applies immediately and is remembered on this device. System follows your device preference.</p>
      <div class="account-theme-choice" role="group" aria-label="Appearance">
        ${[["system", "System", "bi-display"], ["light", "Light", "bi-sun"], ["dark", "Dark", "bi-moon-stars"]].map(([value, label, iconName]) => `<button type="button" data-account-theme="${value}" class="${appearance === value ? "is-selected" : ""}" aria-pressed="${appearance === value}" onclick="setAccountPreference('appearance', '${value}')"><i class="bi ${iconName}"></i>${label}</button>`).join("")}
      </div>
      <div class="account-preference-note"><i class="bi bi-check2-circle"></i><span>Saved preferences are private to this browser until account-wide sync is available.</span></div>
    </section>
  `;
}

function openAccountPanel(section = "profile", settingsSection = "general") {
  const session = getCurrentAccountSession();
  if (!session?.email && section !== "help") {
    goToAuthPage("login");
    return;
  }
  closeAccountPanel();
  const activeSettingsSection = section === "settings" ? settingsSection : section;
  const titleMap = {
    profile: "Profile",
    billing: "Billing & credits",
    settings: "Settings",
    help: "Help"
  };
  const helpHTML = `<div class="account-panel-list"><div class="account-panel-row"><span>Support</span><strong>Use Help Center from the account menu</strong></div><div class="account-panel-row"><span>Workspace</span><strong>${currentSourceFingerprint ? "Generated notes active" : "Ready for upload"}</strong></div><div class="account-panel-row"><span>Tutor</span><strong>${voiceTutorHistory.length ? "History available" : "No active chat"}</strong></div></div>`;
  const usesSettingsLayout = section !== "help";
  const content = section === "help" ? helpHTML : accountSettingsContent(activeSettingsSection, session);
  const overlay = document.createElement("div");
  overlay.className = "account-panel-overlay";
  overlay.innerHTML = `
    <section class="account-panel-card ${usesSettingsLayout ? "account-settings-card" : ""}" role="dialog" aria-modal="true" aria-label="${escapeAttr(titleMap[section] || "Account")}">
      <div class="account-panel-head">
        <div><p class="account-panel-eyebrow">Synapse account</p><h3>${escapeHTML(section === "settings" ? "Settings" : (titleMap[section] || "Account"))}</h3></div>
        <button class="account-panel-close" type="button" onclick="closeAccountPanel()" aria-label="Close account panel">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      ${usesSettingsLayout ? `<div class="account-settings-layout">${accountSettingsNavigation(activeSettingsSection)}<div class="account-settings-content" data-account-settings-content>${content}</div></div>` : content}
      ${accountPanelStatusHTML()}
    </section>
  `;
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeAccountPanel();
  });
  document.body.appendChild(overlay);

  // Refresh authoritative daily/boost credits + entitlements when opening billing.
  if (section === "billing" || activeSettingsSection === "billing") {
    refreshAccountBillingPanel().catch(() => {});
  }
}

async function refreshAccountBillingPanel() {
  try {
    if (window.SynapseAuth?.fetchCreditBalance) {
      await window.SynapseAuth.fetchCreditBalance();
    } else if (window.SynapseAuth?.fetchBillingEntitlements) {
      await window.SynapseAuth.fetchBillingEntitlements();
    } else if (window.SynapseAuth?.syncBillingSessionFromServer) {
      await window.SynapseAuth.syncBillingSessionFromServer(window.SynapseAuth.getStoredSession?.());
    }
  } catch (error) {
    console.warn("Could not refresh billing balances:", error);
  }
  renderAccountMenu();
  const contentHost = document.querySelector("[data-account-settings-content]");
  if (!contentHost) return;
  const nextSession = getCurrentAccountSession();
  contentHost.innerHTML = accountSettingsContent("billing", nextSession);
}

async function startBillingCheckout(planId, checkoutMode) {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  if (!window.SynapseAuth?.createCheckoutSession) {
    setAccountPanelStatus("error", "Billing requires production auth configuration.");
    return;
  }
  const plan = billingPlansForAccount().find(item => normaliseBillingPlanId(item.id) === normaliseBillingPlanId(planId));
  if (!plan || normaliseBillingPlanId(plan.id) === "free") {
    setAccountPanelStatus("error", "Choose Pro Monthly or Pro Annual to open Checkout.");
    return;
  }
  setAccountPanelStatus("info", "Opening secure Stripe Checkout...");
  try {
    const checkout = await window.SynapseAuth.createCheckoutSession({
      planId: normaliseBillingPlanId(plan.id),
      checkoutMode: checkoutMode || plan.mode || (normaliseBillingPlanId(plan.id) === "pro_yearly" ? "payment" : "subscription")
    });
    if (!checkout?.url) throw new Error("Stripe did not return a checkout URL.");
    window.location.href = checkout.url;
  } catch (error) {
    setAccountPanelStatus("error", error.message || "Could not start checkout.");
  }
}

async function startBoostCheckout(packId) {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  if (!window.SynapseAuth?.createBoostCheckoutSession) {
    setAccountPanelStatus("error", "Boost checkout requires production auth configuration.");
    return;
  }
  const pack = boostPacksForAccount().find(item => String(item.id) === String(packId));
  if (!pack) {
    setAccountPanelStatus("error", "Choose a valid Boost Credit pack.");
    return;
  }
  setAccountPanelStatus("info", "Opening secure Stripe Checkout for Boost Credits...");
  try {
    const checkout = await window.SynapseAuth.createBoostCheckoutSession({ packId: pack.id });
    if (!checkout?.url) throw new Error("Stripe did not return a checkout URL.");
    window.location.href = checkout.url;
  } catch (error) {
    setAccountPanelStatus("error", error.message || "Could not start Boost checkout.");
  }
}

async function openBillingPortal() {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  if (!window.SynapseAuth?.createPortalSession) {
    setAccountPanelStatus("error", "Billing portal requires production auth configuration.");
    return;
  }
  setAccountPanelStatus("info", "Opening Stripe billing portal...");
  try {
    const portal = await window.SynapseAuth.createPortalSession();
    if (!portal?.url) throw new Error("Stripe did not return a billing portal URL.");
    window.location.href = portal.url;
  } catch (error) {
    setAccountPanelStatus("error", error.message || "Could not open billing portal.");
  }
}

function fallbackLocalAccountData() {
  const localStorageData = {};
  try {
    Object.keys(window.localStorage || {})
      .filter(key => key.startsWith("synapse."))
      .forEach(key => {
        const raw = window.localStorage.getItem(key);
        if (key === AUTH_SESSION_STORAGE_KEY) {
          try {
            const parsed = JSON.parse(raw);
            delete parsed.accessToken;
            localStorageData[key] = JSON.stringify(parsed);
            return;
          } catch {}
        }
        localStorageData[key] = raw;
      });
  } catch {}
  return {
    exportedAt: new Date().toISOString(),
    origin: window.location.origin,
    session: getCurrentAccountSession(),
    localStorage: localStorageData,
    history: getHistory()
  };
}

async function exportAccountData() {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  setAccountPanelStatus("info", "Preparing your data export...");
  const payload = {
    exportedAt: new Date().toISOString(),
    browser: window.SynapseAuth?.collectLocalData ? window.SynapseAuth.collectLocalData() : fallbackLocalAccountData(),
    server: null,
    serverExportError: ""
  };
  if (window.SynapseAuth?.requestServerExport && session.authMode === "supabase") {
    try {
      payload.server = await window.SynapseAuth.requestServerExport();
    } catch (error) {
      payload.serverExportError = error.message || "Server export was unavailable.";
    }
  }
  const filenameEmail = String(session.email || "synapse-account").replace(/[^a-z0-9._-]+/gi, "_");
  const filename = `synapse-data-export-${filenameEmail}-${new Date().toISOString().slice(0, 10)}.json`;
  if (window.SynapseAuth?.downloadJSON) {
    window.SynapseAuth.downloadJSON(filename, payload);
  } else {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  setAccountPanelStatus(payload.serverExportError ? "error" : "success", payload.serverExportError || "Data export downloaded.");
}

function deleteAccountAndLocalData() {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  openAccountDeletionDialog();
}

async function confirmAccountDeletion() {
  const session = getCurrentAccountSession();
  if (!session?.email) {
    goToAuthPage("login");
    return;
  }
  setAccountPanelStatus("info", "Deleting account and clearing local Synapse data...");
  let serverError = "";
  if (window.SynapseAuth?.requestAccountDeletion && session.authMode === "supabase") {
    try {
      await window.SynapseAuth.requestAccountDeletion();
    } catch (error) {
      serverError = error.message || "Server account deletion failed.";
    }
  }
  if (window.SynapseAuth?.clearLocalSynapseData) {
    await window.SynapseAuth.clearLocalSynapseData();
  } else {
    safeRemoveLocalStorage(AUTH_SESSION_STORAGE_KEY);
    safeRemoveLocalStorage(ACTIVE_HISTORY_KEY);
  }
  setAccountPanelStatus(serverError ? "error" : "success", serverError || "Account deleted. Redirecting to login...");
  window.setTimeout(() => {
    goToAuthPage("login");
  }, serverError ? 1800 : 900);
  if (serverError) throw new Error(serverError);
}

async function buildClientFingerprint(rawSource, sourceLinks = []) {
  const language = preferredLanguage ? preferredLanguage.value : "auto";
  const hashParts = [`language:${language}`, `source:${String(rawSource || "").trim()}`];
  uniqueSourceLinks(sourceLinks).forEach(link => {
    hashParts.push(`link:${link}`);
  });

  for (const file of uploadedFiles) {
    const buffer = await file.arrayBuffer();
    const fileHash = await sha256Hex(buffer);
    hashParts.push(`file:${file.name}:${file.size}:${file.type}:${fileHash}`);
  }

  return sha256Hex(hashParts.join("||"));
}

async function sha256Hex(input) {
  const data = input instanceof ArrayBuffer
    ? input
    : new TextEncoder().encode(String(input));
  const subtle = globalThis.crypto?.subtle;
  if (subtle && typeof subtle.digest === "function") {
    const digest = await subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)]
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return fallbackFingerprintHex(new Uint8Array(data));
}

function fallbackFingerprintHex(bytes) {
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (const byte of bytes) {
    h1 ^= byte;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (byte + 0x9e3779b9) & 0xff;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

function getHistory() {
  const parsed = safeReadJSONStorage(HISTORY_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function setHistory(items) {
  return safeWriteJSONStorage(HISTORY_STORAGE_KEY, items.slice(0, 30));
}

function visualRecordKeys(historyId, sourceFingerprint) {
  return cacheRecordKeys(historyId, sourceFingerprint);
}

function transactVisualStore(mode, callback) {
  return transactCacheStore(VISUAL_STORE_CONFIG, mode, callback);
}

function compactVisualGalleryForStorage(items) {
  return normalizeLearningFigures(items)
    // Never keep a marker-only record. It would restore as a broken inline figure.
    .filter(item => item && isCompactVisualUrl(item.url))
    .map(item => ({
      index: item.index,
      source_index: item.source_index,
      source_title: item.source_title || "",
      location: item.location || "",
      visual_kind: item.visual_kind || "",
      caption: item.caption || "",
      url: String(item.url || "").trim(),
      title: item.title || "",
      what_shows: item.what_shows || "",
      why_relevant: item.why_relevant || "",
      argument_supported: item.argument_supported || "",
      cross_source_connection: item.cross_source_connection || "",
      how_to_read: item.how_to_read || "",
      exam_use: item.exam_use || ""
    }));
}

function isCompactVisualUrl(value) {
  const url = String(value || "").trim();
  return Boolean(url && !url.toLowerCase().startsWith("data:image/"));
}

function pruneUnavailableVisualMarkers(summary, items) {
  const availableIndexes = new Set(
    normalizeLearningFigures(items)
      .filter(item => isCompactVisualUrl(item?.url))
      .map(item => Number(item.index))
      .filter(Number.isFinite)
  );
  const text = String(summary || "");
  if (!text) return text;
  return text
    .replace(/\[\[VISUAL:(\d+)\]\]/g, (marker, rawIndex) => (
      availableIndexes.has(Number(rawIndex)) ? marker : ""
    ))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pruneVisualGalleryAssets(limit = VISUAL_HISTORY_LIMIT) {
  return pruneCacheRecords(VISUAL_STORE_CONFIG, limit, "Visual cache");
}

async function saveVisualGalleryAssets(historyId, sourceFingerprint, items) {
  const visualItems = compactVisualGalleryForStorage(items);
  if (!visualItems.length) return;

  const updatedAt = Date.now();
  const records = visualRecordKeys(historyId, sourceFingerprint).map(id => ({
    id,
    historyId,
    sourceFingerprint,
    updatedAt,
    items: visualItems
  }));

  try {
    await transactVisualStore("readwrite", store => {
      records.forEach(record => store.put(record));
    });
    pruneVisualGalleryAssets();
  } catch (error) {
    console.warn("Could not persist source visuals:", error);
  }
}

async function loadVisualGalleryAssets(historyId, sourceFingerprint) {
  const keys = visualRecordKeys(historyId, sourceFingerprint);
  return loadFirstCacheItems(VISUAL_STORE_CONFIG, keys);
}

async function deleteVisualGalleryAssets(historyId, sourceFingerprint) {
  try {
    const keys = visualRecordKeys(historyId, sourceFingerprint);
    if (!keys.length) return;
    await transactVisualStore("readwrite", store => {
      keys.forEach(key => store.delete(key));
    });
  } catch (error) {
    console.warn("Could not delete cached source visuals:", error);
  }
}

function sourceRecordKeys(historyId, sourceFingerprint) {
  return cacheRecordKeys(historyId, sourceFingerprint);
}

function transactSourceStore(mode, callback) {
  return transactCacheStore(SOURCE_STORE_CONFIG, mode, callback);
}

function makeSourceObjectUrl(item) {
  if (!item || item.url || !item.blob) return item?.url || "";
  try {
    item.url = URL.createObjectURL(item.blob);
  } catch (error) {
    console.warn("Could not create source preview URL:", error);
  }
  return item.url || "";
}

function revokeSourceObjectURLs(items = sourceViewerItems) {
  (items || []).forEach(item => {
    if (item?.url && String(item.url).startsWith("blob:")) {
      try {
        URL.revokeObjectURL(item.url);
      } catch {
        // Browser may already have released it.
      }
    }
  });
}

function safeSourceItemId(value, index = 0) {
  const raw = String(value || `source:${index + 1}`);
  return raw
    .replace(/[^A-Za-z0-9:_%-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 180) || `source:${index + 1}`;
}

function normaliseSourceViewerItem(item, index = 0) {
  if (!item || typeof item !== "object") return null;
  const name = item.name || item.displayName || item.display_name || item.title || item.title_candidate || `Source ${index + 1}`;
  const derivedKind = sourceKindFromFile(item.blob || item.file || { name, type: item.type || item.contentType || item.content_type || "" });
  const sourceIdentity = item.sourceIdentity || item.source_identity || "";
  let kind = (!item.kind || item.kind === "file") && derivedKind !== "file" ? derivedKind : (item.kind || derivedKind);
  if (sourceItemLooksLikeYouTube({ ...item, sourceIdentity, name })) {
    kind = "youtube";
  }
  const rawOriginalUrl = item.originalUrl || item.original_url || item.url || item.embedded_url || "";
  const canonicalYoutubeUrl = kind === "youtube" ? youtubeWatchUrlFromItem({ ...item, originalUrl: rawOriginalUrl, sourceIdentity }) : "";
  const originalUrl = kind === "youtube" ? canonicalYoutubeUrl : rawOriginalUrl;
  const rawId = item.id || `${kind}:${sourceIdentity || name}:${index}`;
  return {
    id: safeSourceItemId(rawId, index),
    index: Number(item.index || item.backendIndex || index + 1),
    name,
    title: item.title || item.title_candidate || name,
    displayName: item.displayName || item.display_name || name,
    type: item.type || item.contentType || item.content_type || "",
    size: Number(item.size || item.bytes || 0),
    kind,
    sourceIdentity,
    url: kind === "youtube" ? canonicalYoutubeUrl : (item.url || originalUrl || ""),
    originalUrl,
    content: item.content || item.text || "",
    blob: item.blob || item.file || null,
    preview: item.preview || null,
    previewError: item.previewError || "",
    backendIndex: item.backendIndex || item.index || index + 1
  };
}

function restoreSourceViewerItems(items) {
  revokeSourceObjectURLs();
  sourceViewerItems = (items || [])
    .map((item, index) => normaliseSourceViewerItem(item, index))
    .filter(Boolean)
    .filter(item => typeof isPrimarySourceReviewItem !== "function" || isPrimarySourceReviewItem(item));
  activeSourceItemId = sourceViewerItems[0]?.id || "";
  renderSourceViewer();
  if (typeof scheduleSourcePreviewPrefetch === "function") {
    scheduleSourcePreviewPrefetch(sourceViewerItems);
  }
  if (typeof ensureSourcePreviewWarmup === "function") {
    Promise.resolve(ensureSourcePreviewWarmup()).catch(() => {});
  }
}

async function buildCurrentSourceItems(rawSource, backendSources = []) {
  revokeSourceObjectURLs();
  const parsed = parseMixedSources(rawSource);
  // Source review is for primary study inputs only: uploads, pasted text, and YouTube.
  // Do not promote generic websites discovered inside notes into the review tabs.
  const sourceLinks = typeof youtubeSourceLinks === "function"
    ? youtubeSourceLinks([...(uploadedLinks || []), ...(parsed.links || [])])
    : uniqueSourceLinks([...(uploadedLinks || []), ...(parsed.links || [])]).filter(url => /(?:youtube\.com|youtu\.be)/i.test(url));
  const backendByName = new Map();
  (backendSources || []).forEach(source => {
    const name = String(source.display_name || source.title_candidate || "").toLowerCase();
    if (name) backendByName.set(name, source);
  });
  const backendByUrl = new Map();
  const sourceUrlKey = (value) => {
    const raw = String(value || "").trim();
    const videoId = getYouTubeVideoIdClient(raw);
    if (videoId) return `youtube:${videoId}`;
    try {
      const parsedUrl = new URL(raw);
      return `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}`.toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  };
  (backendSources || []).forEach(source => {
    const key = sourceUrlKey(source.embedded_url || source.url || source.source_identity || "");
    if (key) backendByUrl.set(key, source);
  });

  const items = uploadedFiles.map((file, index) => {
    const backend = backendByName.get(String(file.name || "").toLowerCase()) || backendSources[index] || {};
    const kind = sourceKindFromFile(file);
    return normaliseSourceViewerItem({
      id: `upload:${currentSourceFingerprint || Date.now()}:${index}`,
      index: index + 1,
      name: file.name || `Uploaded source ${index + 1}`,
      title: backend.title_candidate || file.name || `Uploaded source ${index + 1}`,
      displayName: backend.display_name || file.name || `Uploaded source ${index + 1}`,
      type: file.type || "",
      size: file.size || 0,
      kind,
      sourceIdentity: backend.source_identity || "",
      content: backend.text_excerpt || "",
      blob: file
    }, index);
  });

  sourceLinks.forEach((url, index) => {
    const backend = backendByUrl.get(sourceUrlKey(url)) || {};
    const sourceTitle = backend.title_candidate || backend.display_name || `YouTube source ${index + 1}`;
    items.push(normaliseSourceViewerItem({
      id: `link:${encodeURIComponent(url).slice(0, 140)}`,
      index: items.length + 1,
      name: sourceTitle,
      title: sourceTitle,
      displayName: backend.display_name || sourceTitle,
      kind: "youtube",
      sourceIdentity: backend.source_identity || "",
      originalUrl: url,
      url,
      content: backend.text_excerpt || ""
    }, items.length));
  });

  const freeText = removeDetectedUrlsClient(parsed.freeText);
  if (freeText) {
    items.push(normaliseSourceViewerItem({
      id: `text:${await sha256Hex(freeText)}`,
      index: items.length + 1,
      name: "Pasted text",
      title: "Pasted text",
      displayName: "Pasted text",
      kind: "note",
      content: freeText
    }, items.length));
  }

  (backendSources || []).forEach((source, index) => {
    const identity = source.source_identity || "";
    const displayName = source.display_name || source.title_candidate || "";
    const isYoutube = sourceItemLooksLikeYouTube(source);
    const isText = String(identity).startsWith("text:") || /pasted text/i.test(displayName);
    if (!isYoutube && !isText) return;
    const sourceUrl = source.embedded_url || source.url || (isYoutube ? youtubeWatchUrlFromItem({ sourceIdentity: identity }) : "");
    const alreadyIncluded = items.some(item =>
      (identity && item.sourceIdentity === identity) ||
      (displayName && item.displayName === displayName) ||
      (sourceUrl && sourceUrlKey(item.originalUrl || item.url) === sourceUrlKey(sourceUrl))
    );
    if (!alreadyIncluded) {
      items.push(normaliseSourceViewerItem({
        id: `meta:${identity || displayName || index}`,
        index: items.length + 1,
        name: displayName || `Source ${index + 1}`,
        title: source.title_candidate || displayName || `Source ${index + 1}`,
        displayName,
        kind: isYoutube ? "youtube" : "note",
        sourceIdentity: identity,
        originalUrl: sourceUrl,
        url: sourceUrl,
        content: source.text_excerpt || ""
      }, items.length));
    }
  });

  sourceViewerItems = items
    .filter(Boolean)
    .filter(item => typeof isPrimarySourceReviewItem !== "function" || isPrimarySourceReviewItem(item));
  activeSourceItemId = sourceViewerItems[0]?.id || "";
  renderSourceViewer();
  if (typeof scheduleSourcePreviewPrefetch === "function") {
    scheduleSourcePreviewPrefetch(sourceViewerItems);
  }
  if (typeof ensureSourcePreviewWarmup === "function") {
    Promise.resolve(ensureSourcePreviewWarmup()).catch(() => {});
  }
  return sourceViewerItems;
}

function compactSourceItemsForHistory(items) {
  const truncateSourceText = (value, limit) => {
    const text = String(value || "");
    return text.length > limit ? `${text.slice(0, limit)}\n\n[Source preview truncated for browser storage.]` : text;
  };
  return (items || []).map((item, index) => ({
    id: item.id,
    index: item.index || index + 1,
    name: item.name || item.displayName || `Source ${index + 1}`,
    title: item.title || item.name || `Source ${index + 1}`,
    displayName: item.displayName || item.name || `Source ${index + 1}`,
    type: item.type || "",
    size: item.size || 0,
    kind: item.kind || "file",
    sourceIdentity: item.sourceIdentity || "",
    originalUrl: item.originalUrl || (/^https?:\/\//i.test(item.url || "") ? item.url : ""),
    url: /^https?:\/\//i.test(item.url || "") ? item.url : "",
    content: item.content ? truncateSourceText(item.content, 50000) : ""
  }));
}

function compactSourceItemsForStorage(items) {
  return (items || []).map((item, index) => {
    const compact = compactSourceItemsForHistory([item])[0] || {};
    if (item.blob && Number(item.size || item.blob.size || 0) <= MAX_SOURCE_PREVIEW_BYTES) {
      compact.blob = item.blob;
    }
    compact.index = item.index || index + 1;
    compact.updatedAt = Date.now();
    return compact;
  });
}

async function pruneSourceAssets(limit = SOURCE_HISTORY_LIMIT) {
  return pruneCacheRecords(SOURCE_STORE_CONFIG, limit, "Source cache");
}

async function saveSourceAssets(historyId, sourceFingerprint, items) {
  const sourceItems = compactSourceItemsForStorage(items);
  if (!sourceItems.length) return;

  const updatedAt = Date.now();
  const records = sourceRecordKeys(historyId, sourceFingerprint).map(id => ({
    id,
    historyId,
    sourceFingerprint,
    updatedAt,
    items: sourceItems
  }));

  try {
    await transactSourceStore("readwrite", store => {
      records.forEach(record => store.put(record));
    });
    pruneSourceAssets();
  } catch (error) {
    console.warn("Could not persist uploaded sources:", error);
  }
}

async function loadSourceAssets(historyId, sourceFingerprint) {
  const keys = sourceRecordKeys(historyId, sourceFingerprint);
  return loadFirstCacheItems(SOURCE_STORE_CONFIG, keys);
}

async function deleteSourceAssets(historyId, sourceFingerprint) {
  try {
    const keys = sourceRecordKeys(historyId, sourceFingerprint);
    if (!keys.length) return;
    await transactSourceStore("readwrite", store => {
      keys.forEach(key => store.delete(key));
    });
  } catch (error) {
    console.warn("Could not delete cached source files:", error);
  }
}

function renderSourceViewer() {
  if (!sourceViewerPanel || !sourceViewerTabs || !sourceViewerBody) return;
  if (sourceViewerBtn) {
    sourceViewerBtn.disabled = !sourceViewerItems.length;
    sourceViewerBtn.classList.toggle("active", sourceViewerOpen);
  }
  if (appLayout) {
    appLayout.classList.toggle("source-viewer-open", Boolean(sourceViewerOpen && sourceViewerItems.length));
  }
  if (!sourceViewerOpen) {
    sourceViewerPanel.classList.add("d-none");
    sourceViewerPanel.classList.remove("is-native-pdf");
    if (resultGrid) {
      resultGrid.classList.remove("source-open", "is-resizing");
    }
    if (typeof endNotesSourceSplitDrag === "function") endNotesSourceSplitDrag();
    if (typeof syncNotesSourceSplitter === "function") syncNotesSourceSplitter();
    return;
  }

  sourceViewerPanel.classList.remove("d-none");
  if (resultGrid) resultGrid.classList.add("source-open");
  if (typeof bindNotesSourceSplitter === "function") {
    bindNotesSourceSplitter();
  } else if (typeof syncNotesSourceSplitter === "function") {
    syncNotesSourceSplitter();
  }
  if (typeof scheduleSourcePreviewPrefetch === "function") {
    scheduleSourcePreviewPrefetch(sourceViewerItems);
  }
  if (!sourceViewerItems.length) {
    sourceViewerTabs.innerHTML = "";
    sourceViewerBody.innerHTML = `
      <div class="source-viewer-empty">
        <i class="bi bi-folder2-open"></i>
        <h3>No source file preview is available</h3>
        <p>Regenerate from uploaded files to restore source previews, or use in-text source images already embedded in the notes.</p>
      </div>
    `;
    return;
  }

  if (!activeSourceItemId || !sourceViewerItems.some(item => item.id === activeSourceItemId)) {
    activeSourceItemId = sourceViewerItems[0].id;
  }

  sourceViewerTabs.innerHTML = sourceViewerItems.map(item => `
    <button type="button"
            class="source-tab ${item.id === activeSourceItemId ? "active" : ""}"
            title="${escapeAttr(item.title || item.name)}"
            onclick="selectSourceItem('${escapeAttr(item.id)}')">
      <i class="bi ${sourceIcon(item.kind)}"></i>
      <span>${escapeHTML(shorten(item.name || item.title, 18))}</span>
    </button>
  `).join("");

  const active = sourceViewerItems.find(item => item.id === activeSourceItemId) || sourceViewerItems[0];
  renderSourceViewerBody(active);
}
