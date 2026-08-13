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

