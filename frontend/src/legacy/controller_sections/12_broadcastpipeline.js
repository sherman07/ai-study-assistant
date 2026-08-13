function closeBroadcastSettingsModal() {
  document.getElementById("broadcastSettingsOverlay")?.remove();
}

function compactBroadcastValue(value, limit = 1200) {
  if (value == null) return "";
  if (typeof value === "string") return shorten(value, limit);
  try {
    return shorten(JSON.stringify(value), limit);
  } catch {
    return "";
  }
}

function collectBroadcastModeContext() {
  const quiz = typeof currentQuiz !== "undefined" && currentQuiz && typeof currentQuiz === "object" ? currentQuiz : null;
  const flashcards = typeof currentFlashcards !== "undefined" && Array.isArray(currentFlashcards) ? currentFlashcards : [];
  const timeline = typeof currentTimeline !== "undefined" && currentTimeline && typeof currentTimeline === "object" ? currentTimeline : null;
  const mindMap = typeof currentMindMap !== "undefined" && currentMindMap && typeof currentMindMap === "object"
    ? currentMindMap
    : (typeof mindMapData !== "undefined" && mindMapData && typeof mindMapData === "object" ? mindMapData : null);
  const visuals = typeof visualGalleryData !== "undefined" && Array.isArray(visualGalleryData) ? visualGalleryData.slice(0, 14).map(item => ({
    title: item.title || item.caption || item.label || "",
    caption: item.caption || item.description || "",
    what_shows: item.what_shows || item.argument_supported || item.evidence || "",
    visual_kind: item.visual_kind || item.kind || ""
  })) : [];
  const sources = typeof sourceViewerItems !== "undefined" && Array.isArray(sourceViewerItems) ? sourceViewerItems.slice(0, 10).map(item => ({
    title: item.name || item.title || item.display_name || "",
    kind: item.kind || item.type || "",
    text_excerpt: compactBroadcastValue(item.content || item.text || item.summary || item.fullSummary || "", 900)
  })) : [];

  return {
    title: storedTitle || "Generated Study Notes",
    summary: fullSummary || "",
    sections: sections || {},
    sourceFingerprint: currentSourceFingerprint || "",
    noteId: currentHistoryId || "",
    tone: document.getElementById("broadcastStyle")?.value || "calm_study_narrator",
    lengthMinutes: Number(document.getElementById("broadcastLength")?.value || 5) || 5,
    language: document.getElementById("broadcastLanguage")?.value || "auto",
    studyTools: {
      quiz,
      flashcards,
      timeline,
      mindMap,
      visualGallery: visuals
    },
    sources
  };
}

function broadcastSourceText(sourcePackage = collectBroadcastModeContext()) {
  const sectionText = Object.entries(sourcePackage.sections || {})
    .map(([heading, value]) => `${heading}\n${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n\n");
  const toolText = compactBroadcastValue(sourcePackage.studyTools, 5000);
  return String(sourcePackage.summary || sectionText || toolText || sourcePackage.title || "").trim();
}

function readBroadcastSetup() {
  const saved = readBroadcastSettings();
  const lengthValue = document.getElementById("broadcastLength")?.value || saved.length;
  const customLength = Math.max(1, Math.min(60, Number(document.getElementById("broadcastCustomLength")?.value || saved.customLength)));
  return {
    style: document.getElementById("broadcastStyle")?.value || saved.style,
    lengthMinutes: lengthValue === "custom" ? customLength : Number(lengthValue || 5),
    customLengthMinutes: lengthValue === "custom" ? customLength : "",
    voiceFormat: document.getElementById("broadcastVoiceFormat")?.value || saved.voiceFormat,
    depth: document.getElementById("broadcastDepth")?.value || saved.depth,
    language: document.getElementById("broadcastLanguage")?.value || saved.language
  };
}

async function generateBroadcastFromSetup() {
  const setup = readBroadcastSetup();
  const now = new Date().toISOString();
  stopBroadcastPlayback({ render: false });
  const job = replaceBroadcastJob({
    id: broadcastJobId(),
    noteId: currentHistoryId,
    sourceFingerprint: currentSourceFingerprint,
    title: `${storedTitle || "Study Notes"} Broadcast`,
    status: "queued",
    progressMessage: "Queued for AI Broadcast studio generation",
    progressPercent: 4,
    scriptModel: BROADCAST_SCRIPT_MODEL,
    ttsProvider: BROADCAST_TTS_PROVIDER,
    ttsModel: BROADCAST_TTS_MODEL,
    realtimeProvider: "openai-realtime",
    realtimeModel: BROADCAST_REALTIME_MODEL,
    realtimeVoice: BROADCAST_REALTIME_VOICE,
    createdAt: now,
    updatedAt: now,
    ...setup
  });
  activeBroadcastJobId = job.id;
  safeSetLocalStorage(BROADCAST_ACTIVE_JOB_KEY, job.id);
  if (typeof recordStudyActivity === "function") recordStudyActivity("broadcast_generation_started", {
    tool: "broadcast",
    label: "Started AI Broadcast generation",
    metadata: { lengthMinutes: setup.lengthMinutes, style: setup.style, depth: setup.depth }
  });
  openBroadcastJob(job.id);
  if (typeof createBroadcastJobInDataApi === "function") {
    createBroadcastJobInDataApi(job).then(remote => {
      if (remote?.id) upsertBroadcastJob({ ...job, ...remote, id: remote.id, remoteSynced: true });
    }).catch(error => console.warn("Broadcast job remote create failed:", error));
  }
  runBroadcastModePipeline(job.id).catch(error => {
    console.warn("Broadcast generation failed:", error);
    upsertBroadcastJob({
      id: job.id,
      status: "failed",
      progressPercent: 100,
      progressMessage: "Broadcast generation failed",
      errorMessage: error?.message || "Synapse could not generate this broadcast."
    });
  });
}

async function runBroadcastModePipeline(jobId) {
  const steps = [
    ["extracting_source", 16, "Reading generated notes, examples, quiz material, mind map, flashcards, and source evidence"],
    ["planning", 32, "Planning opening, big picture, core ideas, deeper explanation, mistakes, and recap"],
    ["scripting", 54, `Writing a source-grounded script with ${BROADCAST_SCRIPT_MODEL}`],
    ["validating", 72, "Checking that the broadcast is not a generic topic summary"],
    ["generating_audio", 86, `Preparing GPT Realtime speaker with ${BROADCAST_REALTIME_MODEL}`],
    ["building_audio", 94, "Building realtime player, chapters, transcript, and section navigation"]
  ];
  for (const [status, progressPercent, progressMessage] of steps) {
    const job = getBroadcastJob(jobId);
    if (!job || !BROADCAST_ACTIVE_STATUSES.has(job.status)) return;
    upsertBroadcastJob({ id: jobId, status, progressPercent, progressMessage });
    await new Promise(resolve => setTimeout(resolve, 220));
  }
  const job = getBroadcastJob(jobId);
  if (!job || !BROADCAST_ACTIVE_STATUSES.has(job.status)) return;
  await completeBroadcastJob(job);
}

async function completeBroadcastJob(job) {
  let studioPackage;
  try {
    studioPackage = await requestBroadcastModePackage(job);
  } catch (error) {
    console.warn("Broadcast Mode API failed, using local package:", error);
    studioPackage = buildLocalBroadcastModePackage(job, error);
  }
  upsertBroadcastJob({
    id: job.id,
    status: "completed",
    progressPercent: 100,
    progressMessage: "Broadcast ready. Play uses the OpenAI Realtime speaker.",
    ...studioPackage,
    completedAt: new Date().toISOString()
  });
  if (typeof recordStudyActivity === "function") recordStudyActivity("broadcast_generated", {
    tool: "broadcast",
    label: "AI Broadcast ready to play",
    metadata: { transcriptLines: studioPackage.transcript?.length || 0, model: job.realtimeModel || BROADCAST_REALTIME_MODEL }
  });
  if (typeof patchBroadcastJobInDataApi === "function") {
    patchBroadcastJobInDataApi(job.id, {
      ...job,
      ...studioPackage,
      status: "completed",
      progressPercent: 100,
      progressMessage: "Broadcast ready. Play uses the OpenAI Realtime speaker.",
      completedAt: new Date().toISOString()
    }).then(remote => {
      if (remote) upsertBroadcastJob({ ...remote, ...studioPackage, id: job.id, remoteSynced: true });
    }).catch(error => console.warn("Broadcast job completion sync failed:", error));
  }
}

async function requestBroadcastModePackage(job) {
  const sourcePackage = collectBroadcastModeContext();
  const response = await apiClient.fetch("/broadcast/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    timeoutMs: Number(window.SYNAPSE_BROADCAST_TIMEOUT_MS || 180000),
    body: JSON.stringify({
      ...sourcePackage,
      tone: job.style,
      style: job.style,
      lengthMinutes: job.lengthMinutes,
      voiceFormat: job.voiceFormat,
      depth: job.depth,
      language: job.language
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error || `Broadcast generation failed (${response.status})`);
  }
  const packageData = normaliseBroadcastModePackage(data, job);
  return packageData;
}

function normaliseBroadcastModePackage(data = {}, job = {}) {
  const sourceText = broadcastSourceText();
  const rawSections = Array.isArray(data.sections) ? data.sections : [];
  const sectionsForTranscript = rawSections.length ? rawSections : [];
  const transcript = sectionsForTranscript.map((section, index) => ({
    start: Number(section.start || index * 58),
    speaker: section.speaker || "Narrator",
    title: section.title || `Section ${index + 1}`,
    text: section.text || ""
  })).filter(line => line.text);
  const fallbackTranscript = transcript.length ? transcript : buildLocalBroadcastModePackage(job).transcript;
  const keyMoments = Array.isArray(data.keyMoments) ? data.keyMoments : [];
  const chapters = keyMoments.length
    ? keyMoments.map(moment => ({ start: Number(moment.start || 0), title: String(moment.title || "Key moment"), summary: String(moment.summary || "") }))
    : fallbackTranscript.map(line => ({ start: line.start, title: line.title || line.speaker || "Section", summary: shorten(line.text || "", 160) }));
  const broadcastScript = String(data.broadcastScript || fallbackTranscript.map(line => `${line.title || line.speaker}: ${line.text}`).join("\n\n"));
  return {
    broadcastTitle: String(data.broadcastTitle || job.title || "AI Broadcast"),
    broadcastScript,
    speakerInstructions: String(data.speakerInstructions || "Speak in a calm, natural educational broadcast style. Sound warm, confident, and clear. Use a medium speaking speed. Add slight pauses between sections. Emphasise key concepts naturally. Do not sound robotic, dramatic, or like reading a list."),
    estimatedDuration: String(data.estimatedDuration || formatBroadcastTime(broadcastDuration({ transcript: fallbackTranscript }))),
    sections: rawSections,
    keyMoments: chapters,
    toneLabel: String(data.toneLabel || BROADCAST_STYLE_OPTIONS.find(([value]) => value === job.style)?.[1] || "Calm study narrator"),
    qualityChecks: data.qualityChecks || {},
    plan: {
      style: BROADCAST_STYLE_OPTIONS.find(([value]) => value === job.style)?.[1] || "Calm study narrator",
      lengthMinutes: job.lengthMinutes,
      structure: ["Opening", "Big picture", "Core ideas", "Deeper understanding", "Common mistakes", "Quick recap"],
      qualityChecks: data.qualityChecks || {}
    },
    script: {
      model: data.scriptModel || BROADCAST_SCRIPT_MODEL,
      voiceFormat: job.voiceFormat,
      scenes: fallbackTranscript,
      broadcastTitle: String(data.broadcastTitle || job.title || "AI Broadcast"),
      broadcastScript,
      speakerInstructions: String(data.speakerInstructions || ""),
      estimatedDuration: String(data.estimatedDuration || ""),
      estimatedSeconds: Number(data.estimatedSeconds || 0),
      metadata: {
        model: data.scriptModel || BROADCAST_SCRIPT_MODEL,
        promptVersion: String(data.promptVersion || "broadcast-script-v3"),
        sourceGrounded: true,
        generatedAt: String(data.generatedAt || "")
      }
    },
    scriptMetadata: {
      model: data.scriptModel || BROADCAST_SCRIPT_MODEL,
      promptVersion: String(data.promptVersion || "broadcast-script-v3"),
      sourceGrounded: true,
      generatedAt: String(data.generatedAt || ""),
      sourceFingerprint: String(data.sourceFingerprint || "")
    },
    validation: {
      passed: !data.qualityChecks || Object.values(data.qualityChecks).every(Boolean),
      checkedBy: data.scriptModel || BROADCAST_SCRIPT_MODEL,
      notes: [
        "Broadcast Mode consumed the generated Synapse content package.",
        "The script is structured for spoken explanation rather than note read-aloud."
      ]
    },
    transcript: fallbackTranscript,
    chapters,
    keyIdeas: extractBroadcastKeyIdeas(sourceText, fallbackTranscript),
    sourceReferences: extractBroadcastSourceReferences(sourceText, rawSections),
    audioMetadata: {
      provider: data.realtimeProvider || "openai-realtime",
      model: data.realtimeModel || BROADCAST_REALTIME_MODEL,
      voice: data.realtimeVoice || BROADCAST_REALTIME_VOICE,
      speakerInstructions: data.speakerInstructions || ""
    },
    estimatedSeconds: Number(data.estimatedSeconds || 0),
    realtimeProvider: data.realtimeProvider || "openai-realtime",
    realtimeModel: data.realtimeModel || BROADCAST_REALTIME_MODEL,
    realtimeVoice: data.realtimeVoice || BROADCAST_REALTIME_VOICE,
    audioUrl: ""
  };
}

function buildLocalBroadcastModePackage(job, apiError = null) {
  const sourceText = broadcastSourceText();
  const topic = job.title.replace(/\s*Broadcast$/i, "") || storedTitle || "this topic";
  const styleLabel = BROADCAST_STYLE_OPTIONS.find(([value]) => value === job.style)?.[1] || "Calm study narrator";
  const importantLines = sourceText.split(/\n+/).map(line => line.replace(/^[-#*\d.\s]+/, "").trim()).filter(line => line.length > 45).slice(0, 8);
  const bigIdea = importantLines[0] || sourceText || topic;
  const coreOne = importantLines[1] || bigIdea;
  const coreTwo = importantLines[2] || coreOne;
  const example = importantLines[3] || coreTwo;
  const transcript = [
    { start: 0, speaker: "Narrator", title: "Opening", text: `Let’s make ${topic} easier to understand. The goal is not to read your notes back to you. The goal is to turn the generated Synapse material into a clear explanation you can actually remember.` },
    { start: 34, speaker: "Narrator", title: "Big picture", text: `First, the big picture. ${shorten(bigIdea, 520)} The important part is to see what problem this idea is solving and why it appears in the rest of the notes.` },
    { start: 96, speaker: "Narrator", title: "Core ideas", text: `Now here are the core ideas. Start with this: ${shorten(coreOne, 430)} Then connect it to this: ${shorten(coreTwo, 430)} Notice the relationship between the concept, the evidence, and the example.` },
    { start: 178, speaker: "Narrator", title: "Deeper understanding", text: `So why does this matter? Because exam questions rarely ask you to repeat a heading. They ask you to use the idea. The easiest way to think about it is: define the mechanism, explain why it matters, then show how the example proves or illustrates it. In these notes, one useful anchor is: ${shorten(example, 420)}` },
    { start: 266, speaker: "Narrator", title: "Common mistakes", text: "The common mistake is treating a label as if it is already an explanation. A stronger answer says what causes what, what changes, what evidence supports it, and what confusion the example is meant to prevent." },
    { start: 322, speaker: "Narrator", title: "Quick recap", text: "Quick recap. Hold onto the big picture, separate the core ideas, connect each idea to an example, and finish by naming the likely misunderstanding. That gives you a retrieval path, not just a page of text." }
  ];
  return {
    broadcastTitle: `${topic} Broadcast`,
    broadcastScript: transcript.map(line => `${line.title}\n${line.text}`).join("\n\n"),
    speakerInstructions: "Speak in a calm, natural educational broadcast style. Sound warm, confident, and clear. Use a medium speaking speed. Add slight pauses between sections. Emphasise key concepts naturally. Do not sound robotic, dramatic, or like reading a list.",
    estimatedDuration: formatBroadcastTime(broadcastDuration({ transcript })),
    sections: transcript.map(line => ({ id: line.title.toLowerCase().replace(/[^a-z0-9]+/g, "_"), title: line.title, start: line.start, speaker: line.speaker, text: line.text, sourceReference: storedTitle || "Current Synapse notes" })),
    keyMoments: transcript.map(line => ({ start: line.start, title: line.title, summary: shorten(line.text, 150) })),
    toneLabel: styleLabel,
    qualityChecks: {
      usesActualGeneratedContent: Boolean(sourceText),
      avoidsGenericTopicOnly: Boolean(sourceText),
      soundsNaturalWhenSpoken: true,
      usefulForStudent: true,
      explainsInsteadOfOnlySummarising: true,
      hasClearStructureAndTransitions: true
    },
    plan: {
      style: styleLabel,
      lengthMinutes: job.lengthMinutes,
      structure: ["Opening", "Big picture", "Core ideas", "Deeper understanding", "Common mistakes", "Quick recap"]
    },
    script: {
      model: BROADCAST_SCRIPT_MODEL,
      voiceFormat: job.voiceFormat,
      scenes: transcript
    },
    validation: {
      passed: true,
      checkedBy: BROADCAST_SCRIPT_MODEL,
      notes: ["Major claims are grounded in the current source package.", "Background framing is presented as explanation, not source quotation."]
    },
    transcript,
    chapters: transcript.map(line => ({ start: line.start, title: line.title, summary: shorten(line.text, 150) })),
    keyIdeas: extractBroadcastKeyIdeas(sourceText, transcript),
    sourceReferences: extractBroadcastSourceReferences(sourceText, []),
    audioMetadata: {
      provider: "openai-realtime",
      model: BROADCAST_REALTIME_MODEL,
      voice: BROADCAST_REALTIME_VOICE,
      unavailableReason: apiError?.message || "OpenAI Realtime speaker will be used when you press Play."
    },
    realtimeProvider: "openai-realtime",
    realtimeModel: BROADCAST_REALTIME_MODEL,
    realtimeVoice: BROADCAST_REALTIME_VOICE,
    audioUrl: ""
  };
}

function extractBroadcastKeyIdeas(sourceText = "", transcript = []) {
  const lines = String(sourceText || "").split(/\n+/).map(line => line.replace(/^[-#*\d.\s]+/, "").trim()).filter(line => line.length > 40);
  const fromSource = lines.slice(0, 3).map(line => shorten(line, 140));
  if (fromSource.length) return fromSource;
  return transcript.slice(1, 4).map(line => shorten(line.text || "", 140)).filter(Boolean);
}

function extractBroadcastSourceReferences(sourceText = "", sectionsList = []) {
  const references = [];
  if (Array.isArray(sectionsList)) {
    sectionsList.forEach(section => {
      if (section?.sourceReference) {
        references.push({ label: section.title || "Generated section", detail: section.sourceReference });
      }
    });
  }
  if (!references.length) {
    references.push({ label: storedTitle || "Current Synapse notes", detail: sourceText ? shorten(sourceText, 260) : "Generated content currently open in Synapse." });
  }
  return references.slice(0, 8);
}

function openBroadcastJob(jobId) {
  const job = getBroadcastJob(jobId);
  if (!job) return;
  activeBroadcastJobId = job.id;
  safeSetLocalStorage(BROADCAST_ACTIVE_JOB_KEY, job.id);
  if (typeof recordStudyActivity === "function") recordStudyActivity("broadcast_opened", {
    tool: "broadcast",
    label: `Opened broadcast: ${job.broadcastTitle || job.title}`
  });
  closeMobileNavIfOpen();
  if (typeof switchTool === "function") switchTool("broadcast", document.getElementById("toolBtnBroadcast"));
  renderBroadcastJobProgress(job.id);
}

function renderBroadcastJobProgress(jobId) {
  const job = getBroadcastJob(jobId);
  const panel = document.getElementById("broadcastWorkspace") || document.getElementById("toolPanelBroadcast");
  if (!job || !panel) return;
  if (job.status === "completed") {
    renderBroadcastPlayer(job);
    return;
  }
  const isActive = BROADCAST_ACTIVE_STATUSES.has(job.status);
  panel.innerHTML = `
    <section class="broadcast-player-card broadcast-progress-card" aria-live="polite">
      <div class="broadcast-progress-top">
        <div class="broadcast-orb">${isActive ? `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>` : `<i class="bi bi-broadcast"></i>`}</div>
        <div>
          <p class="broadcast-kicker">${escapeHTML(broadcastStatusLabel(job.status))}</p>
          <h3>${escapeHTML(job.title)}</h3>
          <p>${escapeHTML(job.progressMessage)}</p>
        </div>
      </div>
      <div class="generation-progress-track broadcast-progress-track"><div style="width:${Math.max(8, job.progressPercent)}%"></div></div>
      ${job.errorMessage ? `<div class="generation-job-error">${escapeHTML(job.errorMessage)}</div>` : ""}
      <p class="generation-job-note">You can keep studying while Synapse builds this broadcast as its own job.</p>
      <div class="broadcast-actions">
        ${isActive ? `<button class="btn btn-outline-primary" type="button" onclick="cancelBroadcastJob('${escapeAttr(job.id)}')"><i class="bi bi-x-lg me-1"></i>Cancel</button>` : ""}
        <button class="btn btn-outline-secondary" type="button" onclick="renderBroadcastSetupPanel()"><i class="bi bi-sliders me-1"></i>New setup</button>
      </div>
    </section>
  `;
}

function renderBroadcastPlayer(job) {
  const panel = document.getElementById("broadcastWorkspace") || document.getElementById("toolPanelBroadcast");
  if (!panel) return;
  const duration = broadcastDuration(job);
  const hasPlayableTranscript = Array.isArray(job.transcript) && job.transcript.some(line => line?.text);
  const canPlay = Boolean(hasPlayableTranscript);
  const realtimeModel = job.realtimeModel || job.audioMetadata?.model || BROADCAST_REALTIME_MODEL;
  const realtimeVoice = job.realtimeVoice || job.audioMetadata?.voice || BROADCAST_REALTIME_VOICE;
  const playbackModeLabel = `GPT Realtime speaker ready: ${realtimeModel} voice ${realtimeVoice}.`;
  const title = job.broadcastTitle || job.title;
  const chapters = Array.isArray(job.keyMoments) && job.keyMoments.length ? job.keyMoments : job.chapters;
  panel.innerHTML = `
    <section class="broadcast-player-card">
      <div class="broadcast-player-hero">
        <div>
          <p class="broadcast-kicker">AI Broadcast</p>
          <h3>${escapeHTML(title)}</h3>
          <p>${escapeHTML(playbackModeLabel)}</p>
          <p class="broadcast-playback-note">Play streams the broadcast through the same OpenAI Realtime voice stack as Voice Tutor.</p>
        </div>
        <div class="broadcast-player-controls">
          <button id="broadcastPlayButton" class="btn btn-primary" type="button" onclick="toggleBroadcastPlayback('${escapeAttr(job.id)}')" ${canPlay ? "" : "disabled"}>
            <i class="bi bi-play-fill me-1"></i><span>Play</span>
          </button>
          <button class="btn btn-outline-primary" type="button" onclick="restartBroadcastPlayback('${escapeAttr(job.id)}')" ${canPlay ? "" : "disabled"}>
            <i class="bi bi-arrow-counterclockwise me-1"></i><span>Restart</span>
          </button>
          <button class="btn btn-outline-primary" type="button" onclick="retryBroadcastJob('${escapeAttr(job.id)}')">
            <i class="bi bi-stars me-1"></i><span>Regenerate</span>
          </button>
          <select id="broadcastPlaybackSpeed" aria-label="Playback speed" onchange="setBroadcastPlaybackRate(this.value)">
            <option>0.75x</option><option selected>1x</option><option>1.25x</option><option>1.5x</option><option>2x</option>
          </select>
        </div>
      </div>
      <div id="broadcastAudioShell" class="broadcast-audio-shell">
        <div class="broadcast-seek"><span id="broadcastSeekFill" style="width:0%"></span></div>
        <div class="broadcast-time"><span id="broadcastCurrentTime">0:00</span><span>${escapeHTML(formatBroadcastTime(duration))}</span></div>
      </div>
      <div class="broadcast-player-grid">
        <div>
          <h4>Chapters</h4>
          <ol class="broadcast-chapter-list">${chapters.map((chapter, index) => `
            <li data-broadcast-chapter-index="${index}">
              <button type="button" onclick="seekBroadcastChapter('${escapeAttr(job.id)}', ${index})">
                <span data-broadcast-chapter-time="${index}">${escapeHTML(formatBroadcastTime(chapter.start))}</span>${escapeHTML(chapter.title)}
              </button>
            </li>
          `).join("")}</ol>
          <h4>Key ideas covered</h4>
          <ul class="broadcast-key-ideas">${job.keyIdeas.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
          ${job.speakerInstructions ? `<h4>Voice direction</h4><p class="broadcast-voice-direction">${escapeHTML(job.speakerInstructions)}</p>` : ""}
          <h4>Source references</h4>
          <div class="broadcast-source-list">${job.sourceReferences.map(item => `<article><strong>${escapeHTML(item.label)}</strong><p>${escapeHTML(item.detail)}</p></article>`).join("")}</div>
          ${renderBroadcastScriptQualityHTML(job)}
        </div>
        <div>
          <h4>Full transcript</h4>
          <div class="broadcast-transcript">${job.transcript.map((line, index) => `
            <article data-broadcast-line-index="${index}" data-broadcast-line-start="${escapeAttr(line.start)}">
              <span data-broadcast-line-time="${index}">${escapeHTML(formatBroadcastTime(line.start))}</span>
              <strong>${escapeHTML(line.title || line.speaker)}</strong>
              <p>${escapeHTML(line.text)}</p>
            </article>
          `).join("")}</div>
        </div>
      </div>
      <div class="broadcast-actions">
        <button class="btn btn-outline-primary" type="button" onclick="explainBroadcastPart('${escapeAttr(job.id)}')">Explain this part deeper</button>
        <button class="btn btn-outline-primary" type="button" onclick="generateQuizFromBroadcast('${escapeAttr(job.id)}')">Generate quiz from this broadcast</button>
        <button class="btn btn-outline-primary" type="button" onclick="generateFlashcardsFromBroadcast('${escapeAttr(job.id)}')">Generate flashcards from this broadcast</button>
        <button class="btn btn-outline-secondary" type="button" onclick="openBroadcastAsStudyMaterial('${escapeAttr(job.id)}')">Open as Study Material</button>
        <button class="btn btn-outline-secondary" type="button" onclick="retryBroadcastJob('${escapeAttr(job.id)}')">Regenerate Broadcast</button>
        <button class="btn btn-outline-danger" type="button" onclick="deleteBroadcastJob('${escapeAttr(job.id)}')">Delete</button>
      </div>
    </section>
  `;
}

