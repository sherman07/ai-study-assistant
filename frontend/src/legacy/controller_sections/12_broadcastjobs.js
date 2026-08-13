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

