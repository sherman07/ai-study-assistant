function renderBroadcastScriptQualityHTML(job) {
  const script = String(job.broadcastScript || "").trim();
  const metadata = job.scriptMetadata && typeof job.scriptMetadata === "object" ? job.scriptMetadata : {};
  const checks = job.qualityChecks && typeof job.qualityChecks === "object" ? job.qualityChecks : {};
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  const wordCount = script ? script.split(/\s+/).filter(Boolean).length : 0;
  const generatedAt = metadata.generatedAt ? new Date(metadata.generatedAt).toLocaleString() : "This session";
  return `
    <details class="broadcast-script-quality" open>
      <summary><span>Script generation recipe</span><strong>${totalChecks ? `${passedChecks}/${totalChecks} quality checks passed` : "Source-grounded workflow"}</strong></summary>
      <p>Synapse used the generated notes and available study tools as evidence, then asked ${escapeHTML(metadata.model || job.scriptModel || BROADCAST_SCRIPT_MODEL)} to write a spoken teaching script. The realtime voice is instructed to read each generated chapter in order.</p>
      <div class="broadcast-quality-grid">
        <span><strong>Source grounding</strong>${metadata.sourceGrounded === false ? "Needs review" : "Generated content first"}</span>
        <span><strong>Prompt recipe</strong>${escapeHTML(metadata.promptVersion || "broadcast-script-v3")}</span>
        <span><strong>Script length</strong>${wordCount.toLocaleString()} words</span>
        <span><strong>Generated</strong>${escapeHTML(generatedAt)}</span>
      </div>
      <p class="broadcast-quality-note">The prompt explicitly requires: use the actual generated material, explain connections and common misunderstandings, avoid unsupported facts, and return chapters with source references.</p>
    </details>
  `;
}

function broadcastDuration(job) {
  const lines = Array.isArray(job?.transcript) ? job.transcript : [];
  const lastLine = lines.length ? lines[lines.length - 1] : null;
  const transcriptEstimate = Number(lastLine?.start || 0) + Math.max(20, Math.ceil(String(lastLine?.text || "").length / 12));
  return Math.max(30, Number(job?.estimatedSeconds || 0), transcriptEstimate);
}

function selectedBroadcastRate() {
  const value = document.getElementById("broadcastPlaybackSpeed")?.value || "1x";
  const rate = Number(String(value).replace("x", ""));
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
}

function setBroadcastPlaybackRate(value) {
  const rate = Number(String(value || "").replace("x", ""));
  const nextRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
  if (activeBroadcastPlayback.playing && !activeBroadcastPlayback.paused && activeBroadcastPlayback.jobId) {
    const job = getBroadcastJob(activeBroadcastPlayback.jobId);
    const seconds = getBroadcastPlaybackElapsedSeconds(job);
    activeBroadcastPlayback.startSeconds = seconds;
    activeBroadcastPlayback.startedAt = Date.now();
    activeBroadcastPlayback.lastRenderedSeconds = seconds;
  }
  activeBroadcastPlayback.rate = nextRate;
  if (activeBroadcastPlayback.audio) activeBroadcastPlayback.audio.playbackRate = activeBroadcastPlayback.rate;
}

async function toggleBroadcastPlayback(jobId) {
  const job = getBroadcastJob(jobId);
  if (!job) return;
  if (activeBroadcastPlayback.playing && activeBroadcastPlayback.jobId === job.id && !activeBroadcastPlayback.paused) {
    pauseBroadcastPlayback();
    return;
  }
  if (activeBroadcastPlayback.playing && activeBroadcastPlayback.jobId === job.id && activeBroadcastPlayback.paused) {
    await resumeBroadcastPlayback();
    return;
  }
  stopBroadcastPlayback({ render: false });
  activeBroadcastPlayback = {
    audio: null,
    channel: null,
    jobId: job.id,
    lineIndex: 0,
    mode: "realtime",
    paused: false,
    pausedAtSeconds: 0,
    peer: null,
    playing: true,
    connecting: true,
    rate: selectedBroadcastRate(),
    remoteAudio: null,
    startSeconds: 0,
    startedAt: 0,
    sectionIndex: 0,
    lastRenderedSeconds: 0,
    responseActive: false,
    responseFinished: false,
    startupTimer: null,
    completionTimer: null,
    timer: null,
    utterance: null
  };
  if (typeof recordStudyActivity === "function") recordStudyActivity("broadcast_started", {
    tool: "broadcast",
    label: `Started broadcast: ${job.broadcastTitle || job.title}`
  });
  updateBroadcastPlaybackUI(job, 0, true);
  try {
    await playBroadcastRealtime(job, 0);
  } catch (error) {
    console.error(error);
    stopBroadcastPlayback({ render: false });
    alert(normaliseBroadcastRealtimeError(error));
  }
}

function normaliseBroadcastRealtimeError(error) {
  const message = error?.message || String(error || "");
  if (/invalid sdp|realtime voice service returned/i.test(message)) {
    return "OpenAI Realtime returned an invalid audio session. Check OPENAI_REALTIME_MODEL and restart the backend.";
  }
  if (/401|api key|unauthorized/i.test(message)) {
    return "OpenAI Realtime rejected the request. Check OPENAI_API_KEY, then restart the backend.";
  }
  if (/model/i.test(message) && /not find|not found|404/i.test(message)) {
    return `OpenAI could not find ${BROADCAST_REALTIME_MODEL}. Check OPENAI_REALTIME_MODEL.`;
  }
  return message || "Synapse could not start the GPT Realtime Broadcast speaker.";
}

function broadcastRealtimeResponseErrorMessage(body, response) {
  try {
    const parsed = JSON.parse(String(body || ""));
    if (parsed?.error) return parsed.error;
    if (Array.isArray(parsed?.detail)) {
      return parsed.detail.map(item => item?.msg || item?.message || String(item || "")).filter(Boolean).join(". ");
    }
    if (parsed?.detail) return String(parsed.detail);
  } catch {}
  return `Realtime Broadcast failed (${response?.status || "network"}).`;
}

function createBroadcastRealtimeAudioElement() {
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.playsInline = true;
  audio.style.display = "none";
  document.body.appendChild(audio);
  return audio;
}

function closeBroadcastRealtimeTransport() {
  if (activeBroadcastPlayback.remoteAudio) {
    activeBroadcastPlayback.remoteAudio.pause();
    activeBroadcastPlayback.remoteAudio.srcObject = null;
    activeBroadcastPlayback.remoteAudio.remove();
    activeBroadcastPlayback.remoteAudio = null;
  }
  if (activeBroadcastPlayback.channel) {
    try { activeBroadcastPlayback.channel.close(); } catch {}
    activeBroadcastPlayback.channel = null;
  }
  if (activeBroadcastPlayback.peer) {
    try { activeBroadcastPlayback.peer.close(); } catch {}
    activeBroadcastPlayback.peer = null;
  }
  if (activeBroadcastPlayback.timer) {
    window.clearInterval(activeBroadcastPlayback.timer);
    activeBroadcastPlayback.timer = null;
  }
  if (activeBroadcastPlayback.startupTimer) {
    window.clearTimeout(activeBroadcastPlayback.startupTimer);
    activeBroadcastPlayback.startupTimer = null;
  }
  if (activeBroadcastPlayback.completionTimer) {
    window.clearTimeout(activeBroadcastPlayback.completionTimer);
    activeBroadcastPlayback.completionTimer = null;
  }
}

function buildBroadcastRealtimeFormData(job, sdp, startSeconds = 0) {
  const formData = new FormData();
  formData.append("sdp", sdp);
  formData.append("title", job.broadcastTitle || job.title || "Synapse Broadcast");
  formData.append("broadcast_script", job.broadcastScript || "");
  formData.append("speaker_instructions", job.speakerInstructions || "");
  formData.append("sections", JSON.stringify(Array.isArray(job.sections) && job.sections.length ? job.sections : job.transcript || []));
  // Form values are strings. Send whole seconds so the browser's fractional
  // elapsed clock cannot cause FastAPI request validation to return 422.
  formData.append("start_seconds", String(Math.round(Math.max(0, Number(startSeconds) || 0))));
  formData.append("rate", `${selectedBroadcastRate()}x`);
  return formData;
}

function broadcastPlaybackSections(job) {
  const source = Array.isArray(job?.sections) && job.sections.length ? job.sections : job?.transcript;
  return (Array.isArray(source) ? source : [])
    .map((section, index) => ({
      ...section,
      start: Math.max(0, Number(section?.start || 0)),
      title: String(section?.title || section?.speaker || `Section ${index + 1}`),
      text: String(section?.text || "").trim()
    }))
    .filter(section => section.text);
}

function broadcastPlaybackTimelineStarts(job) {
  return weightedBroadcastTimelineStarts(job);
}

function weightedBroadcastTimelineStarts(job) {
  const sections = broadcastPlaybackSections(job);
  if (!sections.length) return [];
  // response.done means generation has finished; it does not mean buffered
  // WebRTC audio has been heard. Do not let it rewrite chapter starts. Instead,
  // distribute the episode duration by the real generated chapter word counts.
  const weights = sections.map(section => Math.max(12, section.text.split(/\s+/).filter(Boolean).length));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || sections.length;
  const duration = Math.max(sections.length * 12, broadcastDuration(job));
  let consumedWeight = 0;
  const starts = weights.map(weight => {
    const start = Math.round((consumedWeight / totalWeight) * duration);
    consumedWeight += weight;
    return start;
  });
  return starts;
}

function getBroadcastPlaybackElapsedSeconds(job) {
  if (!job || activeBroadcastPlayback.jobId !== job.id) return 0;
  if (activeBroadcastPlayback.connecting || !activeBroadcastPlayback.startedAt) {
    return Math.max(0, Number(activeBroadcastPlayback.startSeconds || 0));
  }
  const elapsed = Number(activeBroadcastPlayback.startSeconds || 0) + (
    Math.max(0, Date.now() - Number(activeBroadcastPlayback.startedAt || Date.now())) / 1000
  ) * Number(activeBroadcastPlayback.rate || 1);
  return Math.max(Number(activeBroadcastPlayback.startSeconds || 0), elapsed);
}

function broadcastPlaybackSectionIndex(job, startSeconds = 0) {
  const target = Math.max(0, Number(startSeconds) || 0);
  const sections = broadcastPlaybackSections(job);
  const starts = broadcastPlaybackTimelineStarts(job);
  let index = 0;
  sections.forEach((section, candidateIndex) => {
    if ((starts[candidateIndex] ?? section.start) <= target) index = candidateIndex;
  });
  return Math.min(index, Math.max(0, sections.length - 1));
}

function buildBroadcastRealtimeStartInstruction(job, startSeconds = 0) {
  const target = Math.max(0, Number(startSeconds) || 0);
  const sections = broadcastPlaybackSections(job);
  const sectionIndex = broadcastPlaybackSectionIndex(job, target);
  const remainingSections = sections.slice(sectionIndex);
  if (!remainingSections.length) return buildBroadcastRealtimeSegmentInstruction(job, target, sectionIndex);
  const chapterScript = remainingSections.map((section, index) => (
    `Chapter ${sectionIndex + index + 1}: ${section.title}\n${section.text}`
  )).join("\n\n");
  return `Read the exact generated Synapse Broadcast chapters below from ${formatBroadcastTime(target)} to the end. Speak every sentence naturally and in order. Do not summarize, skip content, stop after an introduction, or ask the listener questions. Keep going through every chapter until the final recap is complete.\n\nBroadcast title: ${job.broadcastTitle || job.title || "AI Broadcast"}\n\n${chapterScript}`;
}

function buildBroadcastRealtimeSegmentInstruction(job, startSeconds = 0, sectionIndex = 0) {
  const sections = broadcastPlaybackSections(job);
  const safeIndex = Math.min(Math.max(0, Number(sectionIndex) || 0), Math.max(0, sections.length - 1));
  const section = sections[safeIndex];
  const target = Math.max(0, Number(startSeconds) || 0);
  const script = String(job?.broadcastScript || job?.script?.broadcastScript || "").trim();
  if (!section) {
    return `Read the exact generated Synapse Broadcast script below from ${formatBroadcastTime(target)} to the end. Do not summarize it or stop after an introduction.\n\n${script}`;
  }
  return `Read the exact generated Synapse Broadcast chapter below. This is chapter ${safeIndex + 1} of ${sections.length}, beginning at ${formatBroadcastTime(target)} on the adaptive playback timeline. Speak every sentence in this chapter naturally, without summarizing, skipping, or asking a question. When this chapter is fully spoken, stop so Synapse can send the next chapter.\n\nBroadcast title: ${job.broadcastTitle || job.title || "AI Broadcast"}\nChapter: ${section.title}\nGenerated script chapter:\n${section.text}`;
}

function sendBroadcastRealtimeEvent(event) {
  const channel = activeBroadcastPlayback.channel;
  if (!channel || channel.readyState !== "open") return false;
  channel.send(JSON.stringify(event));
  return true;
}

function requestBroadcastRealtimeSpeech(job, startSeconds = 0, requestedSectionIndex = null) {
  const sectionIndex = Number.isInteger(requestedSectionIndex)
    ? requestedSectionIndex
    : broadcastPlaybackSectionIndex(job, startSeconds);
  activeBroadcastPlayback.sectionIndex = sectionIndex;
  activeBroadcastPlayback.responseActive = true;
  sendBroadcastRealtimeEvent({
    type: "response.create",
    response: {
      output_modalities: ["audio"],
      // Send the remaining script in one response so buffered audio cannot be
      // cut off between per-section response completions.
      instructions: buildBroadcastRealtimeStartInstruction(job, startSeconds)
    }
  });
}

function handleBroadcastRealtimeEvent(messageEvent) {
  let event;
  try {
    event = JSON.parse(messageEvent.data);
  } catch {
    return;
  }
  const job = getBroadcastJob(activeBroadcastPlayback.jobId);
  if (!job) return;
  if (event.type === "error" || event.type === "response.failed") {
    console.warn("Broadcast realtime event error:", event);
    alert(normaliseBroadcastRealtimeError(event.error || event));
    stopBroadcastPlayback({ render: false });
    return;
  }
  if (event.type === "response.created") {
    activeBroadcastPlayback.responseActive = true;
    return;
  }
  if (event.type === "response.audio_transcript.delta" || event.type === "response.output_audio_transcript.delta" || event.type === "response.output_text.delta") {
    const elapsed = getBroadcastPlaybackElapsedSeconds(job);
    updateBroadcastPlaybackUI(job, elapsed, true, false);
    return;
  }
  // response.audio.done only closes the current audio item. The Realtime
  // response can still be completing, and the next generated chapter may
  // still need to be requested. Only response.done advances the episode.
  if (event.type === "response.audio.done" || event.type === "response.output_audio.done" || event.type === "response.audio_transcript.done" || event.type === "response.output_audio_transcript.done") {
    return;
  }
  if (event.type === "response.done") {
    activeBroadcastPlayback.responseActive = false;
    if (event.response?.status === "failed") {
      stopBroadcastPlayback({ render: false });
      return;
    }
    // This event signals that the model has generated the response. It can
    // arrive far ahead of the remote audio playback buffer, so closing the
    // peer here previously cut broadcasts off after a few seconds. Leave the
    // audio transport open until the planned narration has drained.
    activeBroadcastPlayback.responseFinished = true;
    const remainingSeconds = Math.max(1, broadcastDuration(job) - getBroadcastPlaybackElapsedSeconds(job));
    if (activeBroadcastPlayback.completionTimer) window.clearTimeout(activeBroadcastPlayback.completionTimer);
    activeBroadcastPlayback.completionTimer = window.setTimeout(() => {
      if (activeBroadcastPlayback.jobId === job.id && activeBroadcastPlayback.responseFinished) {
        stopBroadcastPlayback({ ended: true });
      }
    }, Math.ceil((remainingSeconds / Math.max(0.5, activeBroadcastPlayback.rate || 1)) * 1000) + 1500);
  }
}

async function playBroadcastRealtime(job, startSeconds = 0) {
  if (!window.RTCPeerConnection) {
    throw new Error("GPT Realtime Broadcast needs WebRTC support. Try a modern Chrome browser.");
  }
  if (!job.broadcastScript || !String(job.broadcastScript).trim()) {
    throw new Error("No broadcast script is ready yet. Regenerate the broadcast, then press Play.");
  }
  const peer = new RTCPeerConnection();
  const audio = createBroadcastRealtimeAudioElement();
  activeBroadcastPlayback.peer = peer;
  activeBroadcastPlayback.remoteAudio = audio;
  activeBroadcastPlayback.startSeconds = Math.max(0, Number(startSeconds) || 0);
  activeBroadcastPlayback.startedAt = 0;
  activeBroadcastPlayback.connecting = true;
  peer.addTransceiver("audio", { direction: "recvonly" });
  audio.addEventListener("playing", () => {
    if (activeBroadcastPlayback.jobId !== job.id || activeBroadcastPlayback.paused) return;
    if (activeBroadcastPlayback.connecting) {
      activeBroadcastPlayback.connecting = false;
      activeBroadcastPlayback.startedAt = Date.now();
      activeBroadcastPlayback.lastRenderedSeconds = activeBroadcastPlayback.startSeconds;
      if (activeBroadcastPlayback.startupTimer) {
        window.clearTimeout(activeBroadcastPlayback.startupTimer);
        activeBroadcastPlayback.startupTimer = null;
      }
      updateBroadcastPlaybackUI(job, activeBroadcastPlayback.startSeconds, true, false);
    }
  });
  peer.ontrack = event => {
    const [stream] = event.streams;
    if (stream) {
      audio.srcObject = stream;
      audio.play().catch(() => {});
      const track = stream.getAudioTracks?.()[0];
      if (track) {
        track.addEventListener("ended", () => {
          if (activeBroadcastPlayback.jobId === job.id && activeBroadcastPlayback.responseFinished) {
            stopBroadcastPlayback({ ended: true });
          }
        }, { once: true });
      }
    }
  };
  peer.onconnectionstatechange = () => {
    const state = peer.connectionState || "";
    if (state === "connected") {
      if (peer.__synapseDisconnectTimer) {
        window.clearTimeout(peer.__synapseDisconnectTimer);
        peer.__synapseDisconnectTimer = null;
      }
      return;
    }
    if (state === "disconnected") {
      // Chrome can briefly report a disconnected ICE state while the
      // Realtime response is completing. Do not turn that transient state
      // into the old five-second broadcast stop; only stop if it remains
      // disconnected after a recovery window.
      if (peer.__synapseDisconnectTimer) window.clearTimeout(peer.__synapseDisconnectTimer);
      peer.__synapseDisconnectTimer = window.setTimeout(() => {
        if (
          peer.connectionState === "disconnected" &&
          activeBroadcastPlayback.jobId === job.id &&
          !activeBroadcastPlayback.paused
        ) {
          stopBroadcastPlayback({ render: false });
        }
      }, 15000);
      return;
    }
    if (["failed", "closed"].includes(state) && activeBroadcastPlayback.jobId === job.id && !activeBroadcastPlayback.paused && !activeBroadcastPlayback.responseFinished) {
      stopBroadcastPlayback({ render: false });
    }
  };
  const channel = peer.createDataChannel("oai-events");
  activeBroadcastPlayback.channel = channel;
  channel.onmessage = handleBroadcastRealtimeEvent;
  channel.onopen = () => {
    requestBroadcastRealtimeSpeech(job, startSeconds);
  };
  channel.onclose = () => {
    if (activeBroadcastPlayback.jobId === job.id && !activeBroadcastPlayback.paused && !activeBroadcastPlayback.responseFinished) {
      activeBroadcastPlayback.playing = false;
    }
  };
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  if (typeof waitForIceGathering === "function") await waitForIceGathering(peer);
  const response = await apiClient.fetch("/broadcast/realtime-call", {
    method: "POST",
    body: buildBroadcastRealtimeFormData(job, peer.localDescription.sdp, startSeconds)
  });
  const answerSdp = await response.text();
  const answerContentType = response.headers?.get?.("content-type") || "";
  if (!response.ok) {
    throw new Error(broadcastRealtimeResponseErrorMessage(answerSdp, response));
  }
  if (/application\/json/i.test(answerContentType) || /^[{[]/.test(answerSdp.trim())) {
    throw new Error(broadcastRealtimeResponseErrorMessage(answerSdp, response));
  }
  if (!/^v=0/m.test(answerSdp.trim())) {
    throw new Error("Realtime voice service returned an invalid SDP answer. Check the OpenAI Realtime model and API key, then restart the backend.");
  }
  await peer.setRemoteDescription({ type: "answer", sdp: answerSdp });
  activeBroadcastPlayback.startupTimer = window.setTimeout(() => {
    if (activeBroadcastPlayback.jobId === job.id && activeBroadcastPlayback.connecting && !activeBroadcastPlayback.paused) {
      stopBroadcastPlayback({ render: false });
      alert("Realtime Broadcast connected but no audio started. Please try Play again.");
    }
  }, 25000);
  if (activeBroadcastPlayback.timer) window.clearInterval(activeBroadcastPlayback.timer);
  activeBroadcastPlayback.timer = window.setInterval(() => {
    if (!activeBroadcastPlayback.playing || activeBroadcastPlayback.paused || activeBroadcastPlayback.jobId !== job.id) return;
    const elapsed = getBroadcastPlaybackElapsedSeconds(job);
    updateBroadcastPlaybackUI(job, elapsed, true, false);
  }, 500);
}

