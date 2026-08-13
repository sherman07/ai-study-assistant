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
