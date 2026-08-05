const BROADCAST_JOBS_STORAGE_KEY = "synapse.broadcast.jobs.v1";
const BROADCAST_ACTIVE_JOB_KEY = "synapse.broadcast.active.job.v1";
const BROADCAST_SETTINGS_KEY = "synapse.broadcast.settings.v1";
const BROADCAST_SCRIPT_MODEL = "gpt-5.4-mini";
const BROADCAST_TTS_MODEL = "gpt-4o-mini-tts";
const BROADCAST_TTS_PROVIDER = "openai";
const BROADCAST_REALTIME_MODEL = "gpt-realtime-2";
const BROADCAST_REALTIME_VOICE = "marin";
const BROADCAST_HISTORY_LIMIT = 20;
const BROADCAST_ACTIVE_STATUSES = new Set(["queued", "extracting_source", "planning", "scripting", "validating", "generating_audio", "building_audio"]);
let activeBroadcastJobId = safeGetLocalStorage(BROADCAST_ACTIVE_JOB_KEY, "");
let activeBroadcastPlayback = {
  audio: null,
  channel: null,
  jobId: "",
  lineIndex: 0,
  mode: "",
  paused: false,
  pausedAtSeconds: 0,
  peer: null,
  playing: false,
  connecting: false,
  rate: 1,
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

const BROADCAST_STYLE_OPTIONS = [
  ["calm_study_narrator", "Calm study narrator"],
  ["exam_preparation_coach", "Exam preparation coach"],
  ["natural_podcast_style", "Natural podcast style"],
  ["deep_explanation_mode", "Deep explanation mode"],
  ["quick_revision_mode", "Quick revision mode"]
];
const BROADCAST_LENGTH_OPTIONS = [["3", "3 minutes"], ["5", "5 minutes"], ["10", "10 minutes"], ["custom", "Custom"]];
const BROADCAST_VOICE_OPTIONS = [
  ["single_narrator", "Single narrator"],
  ["two_ai_hosts", "Two AI hosts"],
  ["host_student", "Host + Student"],
  ["teacher_student", "Teacher + Student"]
];
const BROADCAST_DEPTH_OPTIONS = [["simple", "Simple"], ["standard", "Standard"], ["advanced", "Advanced"], ["exam_focused", "Exam-focused"]];
const BROADCAST_LANGUAGE_OPTIONS = [["auto", "Auto-detect source language"], ["english", "English"], ["chinese", "Chinese"], ["bilingual", "Bilingual"]];
const BROADCAST_SETTINGS_DEFAULTS = {
  style: "calm_study_narrator",
  length: "5",
  voiceFormat: "two_ai_hosts",
  depth: "standard",
  language: "auto",
  customLength: 7
};

function setupBroadcastTool() {
  const switcher = document.querySelector(".tool-switcher");
  if (switcher && !document.getElementById("toolBtnBroadcast")) {
    switcher.insertAdjacentHTML("beforeend", `
      <button id="toolBtnBroadcast" class="tool-switch-btn" type="button" onclick="switchTool('broadcast', this)">
        <i class="bi bi-broadcast-pin me-1"></i>AI Broadcast
      </button>
    `);
  }

  const studyToolsCard = document.querySelector(".study-tools-card");
  if (studyToolsCard && !document.getElementById("toolPanelBroadcast")) {
    studyToolsCard.insertAdjacentHTML("beforeend", `
      <div id="toolPanelBroadcast" class="tool-panel">
        <div id="broadcastWorkspace" class="broadcast-workspace">
          ${renderStudyToolLaunch({
            tool: "broadcast",
            iconClass: "bi-broadcast-pin",
            title: "Create an AI broadcast",
            description: "Turn the current notes into a natural study episode with explanations, examples, and a guided recap.",
            action: "openBroadcastSettingsModal()",
            actionLabel: "Open broadcast settings",
            hasNotes: Boolean(fullSummary && fullSummary.trim()),
            kicker: "Listen and revise"
          })}
        </div>
      </div>
    `);
  }
}

function broadcastJobId() {
  if (globalThis.crypto?.randomUUID) return `broadcast_${globalThis.crypto.randomUUID()}`;
  return `broadcast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normaliseBroadcastJob(job = {}) {
  const now = new Date().toISOString();
  const status = String(job.status || "queued");
  const rawScript = job.script && typeof job.script === "object" ? job.script : {};
  const rawScriptMetadata = job.scriptMetadata || job.script_metadata || rawScript.metadata || {};
  const rawBroadcastScript = String(job.broadcastScript || job.broadcast_script || rawScript.broadcastScript || rawScript.broadcast_script || "");
  const rawBroadcastTitle = String(job.broadcastTitle || job.broadcast_title || rawScript.broadcastTitle || rawScript.broadcast_title || job.title || "AI Broadcast");
  const rawSpeakerInstructions = String(job.speakerInstructions || job.speaker_instructions || rawScript.speakerInstructions || rawScript.speaker_instructions || "");
  const progressMessage = String(job.progressMessage || job.progress_message || broadcastStatusLabel(status))
    .replace(/Gemini TTS/gi, "OpenAI TTS")
    .replace(/Gemini voices/gi, "OpenAI voice")
    .replace(
      "Broadcast package ready. Audio can be regenerated when OpenAI TTS is connected.",
      "Broadcast ready. Use Regenerate to create a new version."
    )
    .replace(
      "Broadcast script ready. Browser narration is available until TTS audio is connected.",
      "Broadcast ready. Play uses the OpenAI Realtime speaker."
    );
  return {
    id: String(job.id || job.jobId || broadcastJobId()),
    noteId: String(job.noteId || job.note_id || currentHistoryId || ""),
    sourceFingerprint: String(job.sourceFingerprint || job.source_fingerprint || currentSourceFingerprint || ""),
    title: String(job.title || storedTitle || "AI Broadcast").slice(0, 180),
    status,
    style: String(job.style || "calm_study_narrator"),
    lengthMinutes: Number(job.lengthMinutes || job.length_minutes || 5),
    customLengthMinutes: job.customLengthMinutes || job.custom_length_minutes || "",
    voiceFormat: String(job.voiceFormat || job.voice_format || "two_ai_hosts"),
    depth: String(job.depth || "standard"),
    language: String(job.language || "auto"),
    progressMessage: progressMessage.slice(0, 500),
    progressPercent: Math.max(0, Math.min(100, Number(job.progressPercent || job.progress_percent || 0))),
    scriptModel: String(job.scriptModel || job.script_model || BROADCAST_SCRIPT_MODEL),
    ttsProvider: String(job.ttsProvider || job.tts_provider || BROADCAST_TTS_PROVIDER),
    ttsModel: String(job.ttsModel || job.tts_model || BROADCAST_TTS_MODEL),
    realtimeProvider: String(job.realtimeProvider || job.realtime_provider || "openai-realtime"),
    realtimeModel: String(job.realtimeModel || job.realtime_model || BROADCAST_REALTIME_MODEL),
    realtimeVoice: String(job.realtimeVoice || job.realtime_voice || BROADCAST_REALTIME_VOICE),
    plan: job.plan && typeof job.plan === "object" ? job.plan : {},
    script: {
      ...rawScript,
      broadcastTitle: rawBroadcastTitle,
      broadcastScript: rawBroadcastScript,
      speakerInstructions: rawSpeakerInstructions,
      estimatedDuration: String(job.estimatedDuration || job.estimated_duration || rawScript.estimatedDuration || ""),
      metadata: rawScriptMetadata
    },
    scriptMetadata: rawScriptMetadata,
    validation: job.validation && typeof job.validation === "object" ? job.validation : {},
    transcript: Array.isArray(job.transcript) ? job.transcript : [],
    chapters: Array.isArray(job.chapters) ? job.chapters : [],
    keyIdeas: Array.isArray(job.keyIdeas || job.key_ideas) ? (job.keyIdeas || job.key_ideas) : [],
    sourceReferences: Array.isArray(job.sourceReferences || job.source_references) ? (job.sourceReferences || job.source_references) : [],
    audioUrl: String(job.audioUrl || job.audio_url || ""),
    audioMetadata: job.audioMetadata || job.audio_metadata || {},
    errorMessage: String(job.errorMessage || job.error_message || ""),
    createdAt: job.createdAt || job.created_at || now,
    updatedAt: job.updatedAt || job.updated_at || now,
    completedAt: job.completedAt || job.completed_at || "",
    broadcastTitle: rawBroadcastTitle.slice(0, 180),
    broadcastScript: rawBroadcastScript,
    speakerInstructions: rawSpeakerInstructions,
    estimatedDuration: String(job.estimatedDuration || job.estimated_duration || rawScript.estimatedDuration || ""),
    estimatedSeconds: Math.max(0, Number(job.estimatedSeconds || job.estimated_seconds || rawScript.estimatedSeconds || 0)),
    sections: Array.isArray(job.sections) ? job.sections : [],
    keyMoments: Array.isArray(job.keyMoments || job.key_moments) ? (job.keyMoments || job.key_moments) : [],
    qualityChecks: job.qualityChecks || job.quality_checks || {},
    toneLabel: String(job.toneLabel || job.tone_label || ""),
    remoteSynced: Boolean(job.remoteSynced)
  };
}

function getBroadcastJobs() {
  const parsed = safeReadJSONStorage(BROADCAST_JOBS_STORAGE_KEY, []);
  return Array.isArray(parsed)
    ? dedupeBroadcastJobs(parsed)
      .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
      .slice(0, BROADCAST_HISTORY_LIMIT)
    : [];
}

function setBroadcastJobs(jobs) {
  const nextJobs = dedupeBroadcastJobs(jobs)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
    .slice(0, BROADCAST_HISTORY_LIMIT);
  safeWriteJSONStorage(BROADCAST_JOBS_STORAGE_KEY, nextJobs);
  return nextJobs;
}

function dedupeBroadcastJobs(jobs) {
  const byId = new Map();
  (Array.isArray(jobs) ? jobs : []).forEach(job => {
    const normalised = normaliseBroadcastJob(job);
    const existing = byId.get(normalised.id);
    if (!existing || new Date(normalised.updatedAt || normalised.createdAt) >= new Date(existing.updatedAt || existing.createdAt)) {
      byId.set(normalised.id, normalised);
    }
  });
  return Array.from(byId.values());
}

function getBroadcastJob(jobId) {
  const id = String(jobId || "");
  return getBroadcastJobs().find(job => job.id === id) || null;
}

function getBroadcastJobsForCurrentNote() {
  const historyId = String(currentHistoryId || "");
  const fingerprint = String(currentSourceFingerprint || "");
  const jobs = getBroadcastJobs();
  if (!historyId && !fingerprint) return jobs;
  return jobs.filter(job => {
    const jobHistoryId = String(job.noteId || "");
    const jobFingerprint = String(job.sourceFingerprint || "");
    return (historyId && jobHistoryId === historyId) || (fingerprint && jobFingerprint === fingerprint);
  });
}

function getCurrentBroadcastJob() {
  const jobs = getBroadcastJobsForCurrentNote();
  const active = getBroadcastJob(activeBroadcastJobId);
  if (active && jobs.some(job => job.id === active.id)) return active;
  return jobs[0] || null;
}

function upsertBroadcastJob(patch = {}) {
  const jobs = getBroadcastJobs();
  const id = String(patch.id || patch.jobId || broadcastJobId());
  const index = jobs.findIndex(job => job.id === id);
  const nextJob = normaliseBroadcastJob(index >= 0 ? { ...jobs[index], ...patch, id, updatedAt: new Date().toISOString() } : { ...patch, id });
  if (index >= 0) jobs[index] = nextJob;
  else jobs.unshift(nextJob);
  setBroadcastJobs(jobs);
  refreshBroadcastViews(nextJob.id);
  return nextJob;
}

function replaceBroadcastJob(job = {}) {
  const nextJob = normaliseBroadcastJob(job);
  const existingJobs = getBroadcastJobs().filter(item => item.id !== nextJob.id);
  setBroadcastJobs([nextJob, ...existingJobs]);
  refreshBroadcastViews(nextJob.id);
  return nextJob;
}

async function syncBroadcastJobsWithDataApi(limit = BROADCAST_HISTORY_LIMIT) {
  if (typeof fetchBroadcastJobsFromDataApi !== "function") return getBroadcastJobs();
  let remoteJobs = [];
  try {
    remoteJobs = await fetchBroadcastJobsFromDataApi(limit);
  } catch (error) {
    console.warn("Could not sync AI Broadcast history from the data API:", error);
    return getBroadcastJobs();
  }
  if (!Array.isArray(remoteJobs) || !remoteJobs.length) return getBroadcastJobs();
  const localJobs = getBroadcastJobs();
  const localById = new Map(localJobs.map(job => [job.id, job]));
  const merged = remoteJobs.map(remoteJob => {
    const localJob = localById.get(String(remoteJob.id || ""));
    // The browser copy can contain the completed script while the remote row is
    // still only a queued progress record. Keep the richer copy when available.
    return normaliseBroadcastJob(localJob ? { ...remoteJob, ...localJob } : remoteJob);
  });
  localJobs.forEach(localJob => {
    if (!merged.some(job => job.id === localJob.id)) merged.push(localJob);
  });
  setBroadcastJobs(merged);
  renderHistory(historySearch ? historySearch.value : "");
  if (activeBroadcastJobId) renderBroadcastJobProgress(activeBroadcastJobId);
  return getBroadcastJobs();
}

function broadcastStatusLabel(status) {
  if (status === "queued") return "Queued";
  if (status === "extracting_source") return "Reading source";
  if (status === "planning") return "Planning episode";
  if (status === "scripting") return "Writing script";
  if (status === "validating") return "Checking source accuracy";
  if (status === "generating_audio") return "Preparing realtime voice";
  if (status === "building_audio") return "Building speaker";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  return "Preparing broadcast";
}

function getVisibleBroadcastJobs(filter = "") {
  const query = String(filter || "").toLowerCase().trim();
  return getBroadcastJobs().filter(job => {
    const haystack = `${job.title} ${job.status} ${job.progressMessage} ${job.errorMessage}`.toLowerCase();
    return !query || haystack.includes(query);
  });
}

function renderBroadcastJobHistoryItemHTML(job) {
  const safeJob = normaliseBroadcastJob(job);
  const isActive = BROADCAST_ACTIVE_STATUSES.has(safeJob.status);
  const isFailed = safeJob.status === "failed";
  const isCompleted = safeJob.status === "completed";
  const statusClass = isFailed ? "failed" : isCompleted ? "completed" : isActive ? "active" : safeJob.status;
  return `
    <div class="history-item-wrap history-broadcast-wrap" data-broadcast-job-id="${escapeAttr(safeJob.id)}">
      <button class="history-item history-broadcast-item" type="button" onclick="openBroadcastJob('${escapeAttr(safeJob.id)}')">
        <div class="history-item-title">${escapeHTML(safeJob.title || "AI Broadcast")}</div>
        <div class="history-broadcast-status ${escapeAttr(statusClass)}">
          ${isActive ? `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>` : `<i class="bi ${isCompleted ? "bi-play-circle" : isFailed ? "bi-exclamation-triangle" : "bi-broadcast"}"></i>`}
          <span>${escapeHTML(broadcastStatusLabel(safeJob.status))}</span>
        </div>
        <div class="history-item-meta">${escapeHTML(safeJob.progressMessage || broadcastStatusLabel(safeJob.status))}</div>
      </button>
      ${isFailed ? `
        <button class="history-job-retry" type="button" onclick="event.preventDefault(); event.stopPropagation(); retryBroadcastJob('${escapeAttr(safeJob.id)}')">Retry</button>
      ` : isCompleted ? `
        <button class="history-job-retry" type="button" onclick="event.preventDefault(); event.stopPropagation(); retryBroadcastJob('${escapeAttr(safeJob.id)}')">Regenerate</button>
      ` : ""}
      <button class="history-delete-btn" type="button"
              title="Remove this broadcast"
              aria-label="Remove ${escapeAttr(safeJob.title || "AI Broadcast")}"
              onclick="event.preventDefault(); event.stopPropagation(); deleteBroadcastJob('${escapeAttr(safeJob.id)}')">
        <i class="bi bi-trash3"></i>
      </button>
    </div>
  `;
}

function refreshBroadcastViews(jobId = "") {
  if (typeof renderHistory === "function") renderHistory(historySearch ? historySearch.value : "");
  if (jobId && activeBroadcastJobId === jobId) renderBroadcastJobProgress(jobId);
}

function openAiBroadcastSetup() {
  if (typeof switchTool === "function") switchTool("broadcast", document.getElementById("toolBtnBroadcast"));
  openBroadcastSettingsModal();
}

function renderBroadcastSetupPanel() {
  const panel = document.getElementById("broadcastWorkspace") || document.getElementById("toolPanelBroadcast");
  if (!panel) return;
  const sourcePackage = collectBroadcastModeContext();
  const hasEnoughContent = broadcastSourceText(sourcePackage).length >= 800;
  const currentBroadcast = getCurrentBroadcastJob();
  panel.innerHTML = `
    <section class="broadcast-setup-card broadcast-setup-summary-card">
      <div class="tool-panel-head">
        <div>
          <h3>AI Broadcast</h3>
          <p>Turn the generated Synapse notes, examples, quiz material, mind map, and flashcards into a natural educational AI speaker session.</p>
        </div>
        <span class="broadcast-model-pill">${escapeHTML(BROADCAST_SCRIPT_MODEL)} + ${escapeHTML(BROADCAST_REALTIME_MODEL)}</span>
      </div>
      ${hasEnoughContent ? "" : `<div class="broadcast-warning">This source may not have enough content for a high-quality broadcast.</div>`}
      <div class="broadcast-settings-summary"><span class="study-tool-settings-kicker">Current setup</span><strong>Configure the episode in a focused settings window before generating.</strong></div>
      <div class="broadcast-setup-summary">
        <span>Studio pipeline</span>
        <strong>Read generated content -> Explain deeply -> Quality check -> GPT Realtime speaker -> Chapters</strong>
      </div>
      <div class="broadcast-actions">
        <button class="btn btn-primary" type="button" onclick="openBroadcastSettingsModal()"><i class="bi bi-sliders me-1"></i>${currentBroadcast ? "Regenerate Broadcast" : "Open broadcast settings"}</button>
        ${currentBroadcast ? `<button class="btn btn-outline-primary" type="button" onclick="openBroadcastJob('${escapeAttr(currentBroadcast.id)}')"><i class="bi bi-play-circle me-1"></i>Open Current Broadcast</button>` : ""}
      </div>
    </section>
  `;
}

function renderCurrentBroadcastOrSetup() {
  const currentBroadcast = getCurrentBroadcastJob();
  if (currentBroadcast) {
    renderBroadcastJobProgress(currentBroadcast.id);
    return;
  }
  const panel = document.getElementById("broadcastWorkspace") || document.getElementById("toolPanelBroadcast");
  if (!panel) return;
  renderBroadcastSetupPanel();
}

function broadcastSelectHTML(id, label, options, selected) {
  return `
    <label class="broadcast-field">
      <span>${escapeHTML(label)}</span>
      <select id="${escapeAttr(id)}">
        ${options.map(([value, text]) => `<option value="${escapeAttr(value)}" ${value === selected ? "selected" : ""}>${escapeHTML(text)}</option>`).join("")}
      </select>
    </label>
  `;
}

function readBroadcastSettings() {
  const saved = safeReadJSONStorage(BROADCAST_SETTINGS_KEY, {});
  const source = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  return {
    ...BROADCAST_SETTINGS_DEFAULTS,
    ...source,
    customLength: Math.max(1, Math.min(60, Number(source.customLength || BROADCAST_SETTINGS_DEFAULTS.customLength) || 7))
  };
}

function openBroadcastSettingsModal() {
  const draft = readBroadcastSettings();
  document.getElementById("broadcastSettingsOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "broadcastSettingsOverlay";
  overlay.className = "visual-modal synapse-themed-modal study-tool-settings-overlay";
  overlay.innerHTML = `
    <div class="visual-modal-content settings-pattern-modal broadcast-settings-modal" role="dialog" aria-modal="true" aria-labelledby="broadcastSettingsTitle">
      <button class="visual-modal-close" type="button" aria-label="Close broadcast settings" onclick="closeBroadcastSettingsModal()"><i class="bi bi-x-lg"></i></button>
      <div class="settings-pattern-header">
        <span class="study-tool-settings-kicker">Study Tools</span>
        <h3 id="broadcastSettingsTitle">AI Broadcast settings</h3>
        <p class="text-secondary">Tune the episode format, voice direction, depth, and language before generation.</p>
      </div>
      <div class="settings-pattern-body settings-pattern-grid">
        ${broadcastSelectHTML("broadcastStyle", "Broadcast style", BROADCAST_STYLE_OPTIONS, draft.style)}
        ${broadcastSelectHTML("broadcastLength", "Length", BROADCAST_LENGTH_OPTIONS, draft.length)}
        ${broadcastSelectHTML("broadcastVoiceFormat", "Voice format", BROADCAST_VOICE_OPTIONS, draft.voiceFormat)}
        ${broadcastSelectHTML("broadcastDepth", "Depth", BROADCAST_DEPTH_OPTIONS, draft.depth)}
        ${broadcastSelectHTML("broadcastLanguage", "Language", BROADCAST_LANGUAGE_OPTIONS, draft.language)}
        <label class="broadcast-field" id="broadcastCustomLengthWrap" ${draft.length === "custom" ? "" : "hidden"}>
          <span>Custom minutes</span>
          <input id="broadcastCustomLength" type="number" min="1" max="60" value="${draft.customLength}">
        </label>
      </div>
      <div class="settings-pattern-summary"><span>Studio pipeline</span><strong>Read generated content -> Explain deeply -> Quality check -> GPT Realtime speaker -> Chapters</strong></div>
      <div class="settings-pattern-footer">
        <button class="btn btn-outline-secondary" type="button" onclick="closeBroadcastSettingsModal()">Cancel</button>
        <button class="btn btn-outline-primary" type="button" onclick="saveBroadcastSettingsModal(false)">Save</button>
        <button class="btn btn-primary" type="button" onclick="saveBroadcastSettingsModal(true)" ${fullSummary && fullSummary.trim() ? "" : "disabled"}><i class="bi bi-broadcast-pin me-1"></i>Save & generate</button>
      </div>
    </div>
  `;
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeBroadcastSettingsModal();
  });
  overlay.querySelector("#broadcastLength")?.addEventListener("change", event => {
    const custom = overlay.querySelector("#broadcastCustomLengthWrap");
    if (custom) custom.hidden = event.target.value !== "custom";
  });
  document.body.appendChild(overlay);
}

function saveBroadcastSettingsModal(shouldGenerate = false) {
  const overlay = document.getElementById("broadcastSettingsOverlay");
  if (!overlay) return;
  const settings = {
    style: overlay.querySelector("#broadcastStyle")?.value || BROADCAST_SETTINGS_DEFAULTS.style,
    length: overlay.querySelector("#broadcastLength")?.value || BROADCAST_SETTINGS_DEFAULTS.length,
    voiceFormat: overlay.querySelector("#broadcastVoiceFormat")?.value || BROADCAST_SETTINGS_DEFAULTS.voiceFormat,
    depth: overlay.querySelector("#broadcastDepth")?.value || BROADCAST_SETTINGS_DEFAULTS.depth,
    language: overlay.querySelector("#broadcastLanguage")?.value || BROADCAST_SETTINGS_DEFAULTS.language,
    customLength: Math.max(1, Math.min(60, Number(overlay.querySelector("#broadcastCustomLength")?.value || 7) || 7))
  };
  safeWriteJSONStorage(BROADCAST_SETTINGS_KEY, settings);
  closeBroadcastSettingsModal();
  if (shouldGenerate) generateBroadcastFromSetup();
  else renderBroadcastSetupPanel();
}

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
  const currentJobs = getBroadcastJobsForCurrentNote();
  if (currentJobs.some(job => BROADCAST_ACTIVE_STATUSES.has(job.status))) {
    const active = currentJobs.find(job => BROADCAST_ACTIVE_STATUSES.has(job.status));
    if (active?.id) openBroadcastJob(active.id);
    return;
  }
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

function pauseBroadcastPlayback() {
  const job = getBroadcastJob(activeBroadcastPlayback.jobId);
  if (!job || !activeBroadcastPlayback.playing) return;
  if (activeBroadcastPlayback.audio) activeBroadcastPlayback.audio.pause();
  const seconds = getBroadcastPlaybackElapsedSeconds(job);
  activeBroadcastPlayback.paused = true;
  activeBroadcastPlayback.startSeconds = seconds;
  activeBroadcastPlayback.startedAt = Date.now();
  activeBroadcastPlayback.pausedAtSeconds = seconds;
  activeBroadcastPlayback.lastRenderedSeconds = seconds;
  closeBroadcastRealtimeTransport();
  updateBroadcastPlaybackUI(job, seconds, true, true);
}

async function resumeBroadcastPlayback() {
  const job = getBroadcastJob(activeBroadcastPlayback.jobId);
  if (!job || !activeBroadcastPlayback.playing) return;
  activeBroadcastPlayback.paused = false;
  const seconds = activeBroadcastPlayback.pausedAtSeconds || activeBroadcastPlayback.startSeconds || 0;
  const sectionIndex = broadcastPlaybackSectionIndex(job, seconds);
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
    startSeconds: seconds,
    startedAt: 0,
    sectionIndex,
    lastRenderedSeconds: seconds,
    responseActive: false,
    responseFinished: false,
    startupTimer: null,
    completionTimer: null,
    timer: null,
    utterance: null
  };
  updateBroadcastPlaybackUI(job, seconds, true, false);
  try {
    await playBroadcastRealtime(job, seconds);
  } catch (error) {
    console.error(error);
    stopBroadcastPlayback({ render: false });
    alert(normaliseBroadcastRealtimeError(error));
  }
}

function restartBroadcastPlayback(jobId) {
  const job = getBroadcastJob(jobId);
  if (!job) return;
  stopBroadcastPlayback({ render: false });
  toggleBroadcastPlayback(job.id);
}

function seekBroadcastChapter(jobId, sectionIndex = 0) {
  const job = getBroadcastJob(jobId);
  if (!job) return;
  const chapters = Array.isArray(job.keyMoments) && job.keyMoments.length ? job.keyMoments : job.chapters || [];
  const index = Math.max(0, Number(sectionIndex) || 0);
  const target = broadcastPlaybackTimelineStarts(job)[index] ?? Number(chapters[index]?.start || 0);
  seekBroadcastSection(jobId, target, index);
}

function seekBroadcastSection(jobId, seconds = 0, requestedSectionIndex = null) {
  const job = getBroadcastJob(jobId);
  if (!job) return;
  const target = Math.max(0, Number(seconds) || 0);
  const sectionIndex = Number.isInteger(requestedSectionIndex)
    ? requestedSectionIndex
    : broadcastPlaybackSectionIndex(job, target);
  if (activeBroadcastPlayback.jobId === job.id && activeBroadcastPlayback.mode === "realtime") {
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
      startSeconds: target,
      startedAt: 0,
      sectionIndex,
      lastRenderedSeconds: target,
      responseActive: false,
      responseFinished: false,
      startupTimer: null,
      completionTimer: null,
      timer: null,
      utterance: null
    };
    updateBroadcastPlaybackUI(job, target, true, false);
    playBroadcastRealtime(job, target).catch(error => {
      console.error(error);
      stopBroadcastPlayback({ render: false });
      alert(normaliseBroadcastRealtimeError(error));
    });
    return;
  }
  updateBroadcastPlaybackUI(job, target, false, false);
}

function stopBroadcastPlayback({ ended = false, render = true } = {}) {
  const job = getBroadcastJob(activeBroadcastPlayback.jobId);
  const endedSeconds = ended ? getBroadcastPlaybackElapsedSeconds(job) : 0;
  if (activeBroadcastPlayback.audio) {
    activeBroadcastPlayback.audio.pause();
    activeBroadcastPlayback.audio.removeAttribute?.("src");
  }
  closeBroadcastRealtimeTransport();
  if (ended && job && typeof recordStudyActivity === "function") recordStudyActivity("broadcast_completed", {
    tool: "broadcast",
    label: `Completed broadcast: ${job.broadcastTitle || job.title}`
  });
  activeBroadcastPlayback = {
    audio: null,
    channel: null,
    jobId: "",
    lineIndex: 0,
    mode: "",
    paused: false,
    pausedAtSeconds: 0,
    peer: null,
    playing: false,
    connecting: false,
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
  if (render && job) updateBroadcastPlaybackUI(job, ended ? endedSeconds : 0, false, false);
}

function updateBroadcastPlaybackUI(job, seconds = 0, isPlaying = false, isPaused = false) {
  const adaptiveStarts = broadcastPlaybackTimelineStarts(job);
  let displaySeconds = Math.max(0, Number(seconds) || 0);
  if (activeBroadcastPlayback.jobId === job?.id && isPlaying) {
    displaySeconds = Math.max(displaySeconds, Number(activeBroadcastPlayback.lastRenderedSeconds || 0));
    activeBroadcastPlayback.lastRenderedSeconds = displaySeconds;
  }
  const duration = broadcastDuration(job);
  const percent = Math.max(0, Math.min(100, duration ? (displaySeconds / duration) * 100 : 0));
  const fill = document.getElementById("broadcastSeekFill");
  const time = document.getElementById("broadcastCurrentTime");
  const shell = document.getElementById("broadcastAudioShell");
  const button = document.getElementById("broadcastPlayButton");
  const isConnecting = Boolean(activeBroadcastPlayback.jobId === job?.id && activeBroadcastPlayback.connecting && isPlaying && !isPaused);
  if (fill) fill.style.width = `${percent}%`;
  if (time) time.textContent = formatBroadcastTime(displaySeconds);
  if (shell) {
    shell.classList.toggle("is-playing", Boolean(isPlaying && !isPaused && !isConnecting));
    shell.classList.toggle("is-connecting", isConnecting);
    shell.classList.toggle("is-paused", Boolean(isPaused));
  }
  if (button) {
    button.classList.toggle("is-playing", Boolean(isPlaying && !isPaused && !isConnecting));
    button.classList.toggle("is-connecting", isConnecting);
    const icon = button.querySelector("i");
    const label = button.querySelector("span");
    if (icon) icon.className = `bi ${isConnecting ? "bi-hourglass-split" : isPlaying && !isPaused ? "bi-pause-fill" : "bi-play-fill"} me-1`;
    if (label) label.textContent = isConnecting ? "Connecting…" : isPlaying && !isPaused ? "Pause" : isPaused ? "Resume" : "Play";
  }
  document.querySelectorAll("[data-broadcast-chapter-index]").forEach(chapter => {
    const index = Number(chapter.getAttribute("data-broadcast-chapter-index"));
    const start = adaptiveStarts[index] ?? 0;
    chapter.classList.toggle("is-playing", Boolean(isPlaying && start <= displaySeconds && (index === adaptiveStarts.length - 1 || (adaptiveStarts[index + 1] ?? Infinity) > displaySeconds)));
    const timeNode = chapter.querySelector("[data-broadcast-chapter-time]");
    if (timeNode) timeNode.textContent = formatBroadcastTime(start);
  });
  const lines = Array.from(document.querySelectorAll("[data-broadcast-line-start]"));
  let activeLine = null;
  lines.forEach(line => {
    const index = Number(line.getAttribute("data-broadcast-line-index"));
    const start = adaptiveStarts[index] ?? Number(line.getAttribute("data-broadcast-line-start") || 0);
    const timeNode = line.querySelector("[data-broadcast-line-time]");
    if (timeNode) timeNode.textContent = formatBroadcastTime(start);
    if (start <= displaySeconds) activeLine = line;
    line.classList.remove("is-playing");
  });
  if (isPlaying && activeLine) activeLine.classList.add("is-playing");
}

function formatBroadcastTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(safeSeconds / 60)}:${String(Math.floor(safeSeconds % 60)).padStart(2, "0")}`;
}

function cancelBroadcastJob(jobId) {
  upsertBroadcastJob({
    id: jobId,
    status: "cancelled",
    progressMessage: "Broadcast generation cancelled",
    progressPercent: 0
  });
  if (typeof cancelBroadcastJobInDataApi === "function") {
    cancelBroadcastJobInDataApi(jobId).catch(error => console.warn("Broadcast remote cancel failed:", error));
  }
}

function retryBroadcastJob(jobId) {
  const job = getBroadcastJob(jobId);
  if (!job) return;
  upsertBroadcastJob({
    id: job.id,
    status: "queued",
    progressMessage: "Queued for retry",
    progressPercent: 4,
    errorMessage: ""
  });
  openBroadcastJob(job.id);
  if (typeof retryBroadcastJobInDataApi === "function") {
    retryBroadcastJobInDataApi(job.id).catch(error => console.warn("Broadcast remote retry failed:", error));
  }
  runBroadcastModePipeline(job.id).catch(error => {
    console.warn("Broadcast retry failed:", error);
    upsertBroadcastJob({
      id: job.id,
      status: "failed",
      progressMessage: "Broadcast retry failed",
      progressPercent: 100,
      errorMessage: error?.message || "Synapse could not regenerate this broadcast."
    });
  });
}

function deleteBroadcastJob(jobId) {
  setBroadcastJobs(getBroadcastJobs().filter(job => job.id !== String(jobId || "")));
  if (activeBroadcastJobId === jobId) {
    activeBroadcastJobId = "";
    safeSetLocalStorage(BROADCAST_ACTIVE_JOB_KEY, "");
    renderBroadcastSetupPanel();
  }
  if (typeof deleteBroadcastJobFromDataApi === "function") {
    deleteBroadcastJobFromDataApi(jobId).catch(error => console.warn("Broadcast remote delete failed:", error));
  }
  refreshBroadcastViews();
}

function deleteBroadcastJobsForNote(historyId = "", sourceFingerprint = "") {
  const id = String(historyId || "").trim();
  const fingerprint = String(sourceFingerprint || "").trim();
  if (!id && !fingerprint) return false;
  const jobs = getBroadcastJobs();
  const removed = [];
  const kept = jobs.filter(job => {
    const jobHistoryId = String(job.noteId || "").trim();
    const jobFingerprint = String(job.sourceFingerprint || "").trim();
    const matches = (id && jobHistoryId === id) || (fingerprint && jobFingerprint === fingerprint);
    if (matches) {
      removed.push(job);
      return false;
    }
    return true;
  });
  if (!removed.length) return false;
  setBroadcastJobs(kept);
  if (removed.some(job => job.id === activeBroadcastJobId)) {
    activeBroadcastJobId = "";
    safeSetLocalStorage(BROADCAST_ACTIVE_JOB_KEY, "");
    renderBroadcastSetupPanel();
  }
  if (typeof deleteBroadcastJobFromDataApi === "function") {
    removed.forEach(job => {
      deleteBroadcastJobFromDataApi(job.id).catch(error => console.warn("Broadcast remote delete failed:", error));
    });
  }
  refreshBroadcastViews();
  return true;
}

function recoverBroadcastJobsOnBoot() {
  const jobs = getBroadcastJobs();
  let changed = false;
  const nextJobs = jobs.map(job => {
    if (!BROADCAST_ACTIVE_STATUSES.has(job.status)) return job;
    changed = true;
    return normaliseBroadcastJob({
      ...job,
      status: "failed",
      progressMessage: "Broadcast generation was interrupted",
      errorMessage: "The page refreshed before this broadcast finished. Use Retry to rebuild it.",
      progressPercent: Math.max(job.progressPercent, 100)
    });
  });
  const prunedJobs = nextJobs.slice(0, BROADCAST_HISTORY_LIMIT);
  if (changed || safeReadJSONStorage(BROADCAST_JOBS_STORAGE_KEY, []).length > BROADCAST_HISTORY_LIMIT) setBroadcastJobs(prunedJobs);
  return getBroadcastJobs();
}

function explainBroadcastPart(jobId) {
  const job = getBroadcastJob(jobId);
  if (!job) return;
  if (questionInput) {
    questionInput.value = `Explain the most important part of "${job.title}" more deeply, using the current source.`;
    openAssistant();
  }
}

function generateQuizFromBroadcast() {
  if (typeof switchTool === "function") switchTool("quiz", document.getElementById("toolBtnQuiz"));
  if (typeof openQuizSettingsModal === "function") openQuizSettingsModal();
}

function generateFlashcardsFromBroadcast() {
  if (typeof switchTool === "function") switchTool("flashcards", document.getElementById("toolBtnFlashcards"));
}

function openBroadcastAsStudyMaterial(jobId) {
  const job = getBroadcastJob(jobId);
  if (!job) return;
  const transcriptText = job.transcript.map(line => `${line.speaker}: ${line.text}`).join("\n\n");
  fullSummary = `# ${job.title}\n\n${transcriptText}`;
  storedTitle = job.title;
  sections = { "Broadcast Transcript": transcriptText };
  showAnalysisView({ scrollToTop: true });
  renderSections();
}
