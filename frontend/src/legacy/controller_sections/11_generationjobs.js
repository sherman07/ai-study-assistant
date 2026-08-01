const GENERATION_JOBS_STORAGE_KEY = "synapse.generation.jobs.v1";
const GENERATION_JOB_STATUSES = new Set(["queued", "analysing", "generating", "completed", "failed", "cancelled"]);
const ACTIVE_GENERATION_STATUSES = new Set(["queued", "analysing", "generating"]);
const COMPLETED_GENERATION_REVEAL_DELAY_MS = 2200;
const COMPLETED_GENERATION_REVEAL_REDUCED_MOTION_MS = 400;
const runtimeGenerationJobContexts = new Map();
const runtimeGenerationJobControllers = new Map();
const runtimeGenerationJobRetryPayloads = new Map();
let activeGenerationJobId = "";
let runningGenerationJobId = "";
let pendingCompletedGenerationReveal = null;

function generationJobId() {
  if (globalThis.crypto?.randomUUID) return `gen_${globalThis.crypto.randomUUID()}`;
  return `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normaliseGenerationJob(job = {}) {
  const now = new Date().toISOString();
  const status = GENERATION_JOB_STATUSES.has(job.status) ? job.status : "queued";
  return {
    jobId: String(job.jobId || job.id || generationJobId()),
    noteId: String(job.noteId || job.classId || job.sourceFingerprint || ""),
    classId: String(job.classId || job.noteId || job.sourceFingerprint || ""),
    sourceTitle: String(job.sourceTitle || job.title || "Untitled source").slice(0, 180),
    status,
    progress: Number.isFinite(Number(job.progress)) ? Math.max(0, Math.min(100, Number(job.progress))) : 0,
    message: String(job.message || statusLabelForGenerationJob(status)).slice(0, 280),
    resultId: String(job.resultId || ""),
    error: String(job.error || "").slice(0, 500),
    request: job.request && typeof job.request === "object" ? job.request : {},
    createdAt: job.createdAt || now,
    updatedAt: job.updatedAt || now,
    completedAt: job.completedAt || "",
  };
}

function statusLabelForGenerationJob(status) {
  if (status === "queued") return "Queued";
  if (status === "analysing") return "Analysing source material";
  if (status === "generating") return "Generating study notes";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  return "Preparing";
}

function getGenerationJobs() {
  const parsed = safeReadJSONStorage(GENERATION_JOBS_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed.map(normaliseGenerationJob) : [];
}

function setGenerationJobs(jobs) {
  const nextJobs = (Array.isArray(jobs) ? jobs : [])
    .map(normaliseGenerationJob)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
    .slice(0, 30);
  safeWriteJSONStorage(GENERATION_JOBS_STORAGE_KEY, nextJobs);
  return nextJobs;
}

function getGenerationJob(jobId) {
  const id = String(jobId || "");
  return getGenerationJobs().find(job => job.jobId === id) || null;
}

function recoverGenerationJobsOnBoot() {
  const jobs = getGenerationJobs();
  let changed = false;
  const nextJobs = jobs.map(job => {
    if (!ACTIVE_GENERATION_STATUSES.has(job.status)) return job;
    changed = true;
    return normaliseGenerationJob({
      ...job,
      status: "failed",
      progress: Math.max(job.progress || 0, 100),
      message: "Generation was interrupted",
      error: job.request?.hasFiles
        ? "Generation was interrupted. Use Retry to continue with the sources already attached to this job."
        : "The page refreshed before this job finished. Use Retry to start it again.",
      updatedAt: new Date().toISOString()
    });
  });
  if (changed) setGenerationJobs(nextJobs);
  return getGenerationJobs();
}

function upsertGenerationJob(patch = {}) {
  const nextPatch = { ...patch, updatedAt: new Date().toISOString() };
  const jobs = getGenerationJobs();
  const index = jobs.findIndex(job => job.jobId === nextPatch.jobId);
  const nextJob = normaliseGenerationJob(index >= 0 ? { ...jobs[index], ...nextPatch } : nextPatch);
  if (index >= 0) jobs[index] = nextJob;
  else jobs.unshift(nextJob);
  setGenerationJobs(jobs);
  refreshGenerationJobViews(nextJob.jobId);
  return nextJob;
}

function createGenerationJob(payload = {}) {
  const now = new Date().toISOString();
  return upsertGenerationJob({
    jobId: generationJobId(),
    status: "queued",
    progress: 4,
    message: "Queued for background generation",
    createdAt: now,
    updatedAt: now,
    ...payload
  });
}

function findActiveGenerationJobByNoteId(noteId) {
  const id = String(noteId || "");
  if (!id) return null;
  return getGenerationJobs().find(job => job.noteId === id && ACTIVE_GENERATION_STATUSES.has(job.status)) || null;
}

function getVisibleGenerationJobs(filter = "", completedHistoryIds = []) {
  const query = String(filter || "").toLowerCase().trim();
  const hiddenResultIds = new Set((completedHistoryIds || []).map(id => String(id || "")).filter(Boolean));
  return getGenerationJobs().filter(job => {
    if (job.status === "completed" && job.resultId && hiddenResultIds.has(job.resultId)) return false;
    if (job.status === "completed" && job.resultId) return false;
    if (job.status === "cancelled") return activeGenerationJobId === job.jobId;
    const haystack = `${job.sourceTitle || ""} ${job.status || ""} ${job.message || ""} ${job.error || ""}`.toLowerCase();
    return !query || haystack.includes(query);
  });
}

function generationJobStatusBadge(job) {
  if (job.status === "failed") return "Failed";
  if (job.status === "cancelled") return "Cancelled";
  if (job.status === "completed") return "Completed";
  if (job.status === "queued") return "Queued";
  return "Generating...";
}

function renderGenerationJobHistoryItemHTML(job) {
  const safeJob = normaliseGenerationJob(job);
  const isFailed = safeJob.status === "failed";
  const isActive = ACTIVE_GENERATION_STATUSES.has(safeJob.status);
  const statusClass = isFailed ? "failed" : isActive ? "active" : safeJob.status;
  return `
    <div class="history-item-wrap history-job-wrap" data-generation-job-id="${escapeAttr(safeJob.jobId)}">
      <button class="history-item history-job-item" type="button" onclick="openGenerationJob('${escapeAttr(safeJob.jobId)}')">
        <div class="history-item-title">${escapeHTML(safeJob.sourceTitle || "Generating study notes")}</div>
        <div class="history-job-status ${escapeAttr(statusClass)}">
          ${isActive ? `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>` : ""}
          <span>${escapeHTML(generationJobStatusBadge(safeJob))}</span>
        </div>
        <div class="history-item-meta">${escapeHTML(safeJob.message || statusLabelForGenerationJob(safeJob.status))}</div>
      </button>
      ${isFailed ? `
        <button class="history-job-retry" type="button"
                title="Retry generation"
                aria-label="Retry ${escapeAttr(safeJob.sourceTitle || "generation")}"
                onclick="event.preventDefault(); event.stopPropagation(); retryGenerationJob('${escapeAttr(safeJob.jobId)}')">
          Retry
        </button>
      ` : ""}
      <button class="history-delete-btn" type="button"
              title="Remove this generation"
              aria-label="Remove ${escapeAttr(safeJob.sourceTitle || "generation")}"
              onclick="event.preventDefault(); event.stopPropagation(); deleteGenerationJob('${escapeAttr(safeJob.jobId)}')">
        <i class="bi bi-trash3"></i>
      </button>
    </div>
  `;
}

function isGenerationJobSelected(jobId) {
  return activeGenerationJobId === String(jobId || "");
}

function prefersReducedMotion() {
  try {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch (_error) {
    return false;
  }
}

function cancelPendingCompletedGenerationReveal(jobId = "") {
  if (!pendingCompletedGenerationReveal) return;
  if (jobId && pendingCompletedGenerationReveal.jobId !== String(jobId)) return;
  clearTimeout(pendingCompletedGenerationReveal.timerId);
  pendingCompletedGenerationReveal = null;
}

async function openCompletedGenerationResult(jobId, { immediate = false } = {}) {
  const id = String(jobId || "");
  const job = getGenerationJob(id);
  cancelPendingCompletedGenerationReveal(id);
  if (!job || job.status !== "completed" || !job.resultId) return;
  if (!immediate && !isGenerationJobSelected(id)) return;

  clearActiveGenerationJob();
  closeMobileNavIfOpen();

  if (typeof currentHistoryId !== "undefined" && currentHistoryId === job.resultId && typeof showAnalysisView === "function") {
    showAnalysisView({ scrollToTop: true });
    if (typeof renderSections === "function") renderSections();
    if (typeof renderConnections === "function") renderConnections();
    if (typeof renderFullNotes === "function") renderFullNotes();
    if (typeof renderMindMap === "function" && typeof currentMindMap !== "undefined") {
      requestAnimationFrame(() => renderMindMap(currentMindMap));
    }
    if (typeof renderHistory === "function") {
      renderHistory(historySearch ? historySearch.value : "");
    }
    return;
  }

  if (typeof loadHistoryEntry === "function") {
    await loadHistoryEntry(job.resultId, { preserveScroll: false });
  }
}

function openCompletedGenerationResultNow(jobId) {
  return openCompletedGenerationResult(jobId, { immediate: true });
}

function scheduleCompletedGenerationReveal(jobId) {
  const id = String(jobId || "");
  const job = getGenerationJob(id);
  if (!job || job.status !== "completed" || !job.resultId) return;
  if (!isGenerationJobSelected(id)) return;

  cancelPendingCompletedGenerationReveal();
  const delay = prefersReducedMotion()
    ? COMPLETED_GENERATION_REVEAL_REDUCED_MOTION_MS
    : COMPLETED_GENERATION_REVEAL_DELAY_MS;
  pendingCompletedGenerationReveal = {
    jobId: id,
    timerId: setTimeout(() => {
      pendingCompletedGenerationReveal = null;
      Promise.resolve(openCompletedGenerationResult(id)).catch(error => {
        console.warn("Could not open completed generation result:", error);
      });
    }, delay)
  };
}

function refreshGenerationJobViews(jobId = "") {
  if (typeof renderHistory === "function") {
    renderHistory(historySearch ? historySearch.value : "");
  }
  if (jobId && isGenerationJobSelected(jobId)) {
    renderGenerationJobProgress(jobId);
    const selectedJob = getGenerationJob(jobId);
    if (selectedJob?.status === "completed" && selectedJob.resultId) {
      scheduleCompletedGenerationReveal(jobId);
    }
  }
  if (typeof updateGenerateButtonForCurrentJob === "function") {
    updateGenerateButtonForCurrentJob();
  }
}

function openGenerationJob(jobId) {
  const job = getGenerationJob(jobId);
  if (!job) return;
  cancelPendingCompletedGenerationReveal();
  activeGenerationJobId = job.jobId;
  safeSetLocalStorage(ACTIVE_HISTORY_KEY, "");
  closeMobileNavIfOpen();
  renderGenerationJobProgress(job.jobId);
  if (job.status === "completed" && job.resultId) {
    scheduleCompletedGenerationReveal(job.jobId);
  }
}

function clearActiveGenerationJob() {
  cancelPendingCompletedGenerationReveal(activeGenerationJobId);
  activeGenerationJobId = "";
}
function deleteGenerationJob(jobId) {
  const id = String(jobId || "");
  if (!id) return;
  const controller = runtimeGenerationJobControllers.get(id);
  if (controller) controller.abort();
  runtimeGenerationJobControllers.delete(id);
  runtimeGenerationJobContexts.delete(id);
  runtimeGenerationJobControllers.delete(id);
  runtimeGenerationJobRetryPayloads.delete(id);
  if (typeof clearUploadRetryPayload === "function") {
    Promise.resolve(clearUploadRetryPayload(id)).catch(() => {});
  }
  setGenerationJobs(getGenerationJobs().filter(job => job.jobId !== id));
  if (activeGenerationJobId === id) {
    clearActiveGenerationJob();
    if (typeof resetWorkspace === "function") resetWorkspace();
  }
  refreshGenerationJobViews();
}

function generationJobProgressPercent(job) {
  if (job.status === "completed") return 100;
  if (job.status === "failed" || job.status === "cancelled") return Math.max(0, Math.min(100, job.progress || 0));
  return Math.max(8, Math.min(94, job.progress || 12));
}

function renderGenerationJobProgress(jobId) {
  const job = getGenerationJob(jobId);
  if (!job || !analysisStage || !loadingBox || !resultGrid || !uploadStage) return;
  const progress = generationJobProgressPercent(job);
  const isActive = ACTIVE_GENERATION_STATUSES.has(job.status);
  const isFailed = job.status === "failed";
  const isCancelled = job.status === "cancelled";

  uploadStage.classList.add("d-none");
  analysisStage.classList.remove("d-none");
  loadingBox.classList.remove("d-none");
  resultGrid.classList.add("d-none");
  appLayout.classList.remove("loading-state", "analysis-ready", "generated-notes-state");
  appLayout.classList.add("initial-state", "generation-job-state", "assistant-closed");
  if (assistant) assistant.classList.add("hidden");
  if (openAssistantBtn) openAssistantBtn.style.display = "none";

  const activeLoaderMarkup = isActive ? `
    <section class="generation-job-panel is-active" aria-live="polite">
      <div class="generation-job-active-loader" aria-hidden="true">
        <div class="synapse-ai-loader refined-loader">
          <div class="loader-orbit loader-orbit-one"></div>
          <div class="loader-orbit loader-orbit-two"></div>
          <div class="vector-logo-loader">
            <img class="rotating-vector-logo" src="/logos/synapse_no_spark.png" alt="">
            <div class="loading-star">
              <svg viewBox="0 0 24 24" class="synapse-spark"><path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"></path></svg>
            </div>
          </div>
        </div>
      </div>
      <p class="generation-job-kicker">${escapeHTML(generationJobStatusBadge(job))}</p>
      <h3>Synapse is analysing your material...</h3>
      <p>${escapeHTML(job.message || "Reading sources, explaining ideas, and preparing your tutor-style notes.")}</p>
      ${job.sourceTitle ? `<p class="generation-job-source">${escapeHTML(job.sourceTitle)}</p>` : ""}
      <div class="generation-progress-track" aria-label="Generation progress">
        <div style="width:${progress}%"></div>
      </div>
      <p class="generation-job-note">You can continue browsing other notes while this generates.</p>
      <div class="generation-job-actions">
        <button class="btn btn-outline-primary" type="button" onclick="cancelGenerationJob('${escapeAttr(job.jobId)}')"><i class="bi bi-x-lg me-1"></i>Cancel</button>
        <button class="btn btn-outline-secondary" type="button" onclick="resetWorkspace()"><i class="bi bi-plus-lg me-1"></i>New upload</button>
      </div>
    </section>
  ` : `
    <section class="generation-job-panel ${job.status === "completed" ? "is-completed" : ""}" aria-live="polite">
      <div class="generation-job-icon ${escapeAttr(job.status)}">
        <i class="bi ${isFailed ? "bi-exclamation-triangle" : isCancelled ? "bi-x-circle" : "bi-check2"}"></i>
      </div>
      <p class="generation-job-kicker">${escapeHTML(generationJobStatusBadge(job))}</p>
      <h3>${escapeHTML(job.sourceTitle || "Generating study notes")}</h3>
      <p>${escapeHTML(job.message || statusLabelForGenerationJob(job.status))}</p>
      <div class="generation-progress-track" aria-label="Generation progress">
        <div style="width:${progress}%"></div>
      </div>
      ${job.error ? `<div class="generation-job-error">${escapeHTML(job.error)}</div>` : ""}
      <p class="generation-job-note">${
        job.status === "completed" && job.resultId
          ? "Opening your study notes…"
          : "You can continue browsing other notes while this generates."
      }</p>
      <div class="generation-job-actions">
        ${job.status === "completed" && job.resultId
          ? `<button class="btn btn-primary" type="button" onclick="openCompletedGenerationResultNow('${escapeAttr(job.jobId)}')"><i class="bi bi-journal-text me-1"></i>Open notes</button>`
          : ""}
        ${isFailed || isCancelled ? `<button class="btn btn-primary" type="button" onclick="retryGenerationJob('${escapeAttr(job.jobId)}')"><i class="bi bi-arrow-clockwise me-1"></i>Retry</button>` : ""}
        <button class="btn btn-outline-secondary" type="button" onclick="resetWorkspace()"><i class="bi bi-plus-lg me-1"></i>New upload</button>
      </div>
    </section>
  `;
  loadingBox.innerHTML = activeLoaderMarkup;
}

function cancelGenerationJob(jobId) {
  const id = String(jobId || "");
  const controller = runtimeGenerationJobControllers.get(id);
  if (controller) controller.abort();
  runtimeGenerationJobContexts.delete(id);
  runtimeGenerationJobControllers.delete(id);
  runtimeGenerationJobRetryPayloads.delete(id);
  if (typeof clearUploadRetryPayload === "function") {
    Promise.resolve(clearUploadRetryPayload(id)).catch(() => {});
  }
  if (typeof refundGenerationJobCredits === "function") {
    Promise.resolve(refundGenerationJobCredits(id, "cancelled")).catch(() => {});
  }
  upsertGenerationJob({
    jobId: id,
    status: "cancelled",
    progress: 0,
    message: "Generation cancelled",
    error: ""
  });
  processGenerationJobQueue();
}

async function retryGenerationJob(jobId) {
  const job = getGenerationJob(jobId);
  if (!job) return;
  if (typeof retryGenerationJobFromUpload === "function") {
    try {
      const retried = await retryGenerationJobFromUpload(job);
      if (retried) return;
    } catch (error) {
      upsertGenerationJob({
        jobId: job.jobId,
        status: "failed",
        message: "Retry could not restart this job",
        error: error?.message || "Synapse could not retry this generation."
      });
      openGenerationJob(job.jobId);
      return;
    }
  }
  upsertGenerationJob({
    jobId: job.jobId,
    status: "failed",
    message: "Retry needs the original uploaded files in this browser.",
    error: "The original files are no longer available in this browser. Add the same files again, then click Generate AI."
  });
  openGenerationJob(job.jobId);
}

function enqueueGenerationJobRun(jobId, context) {
  if (!jobId || !context) return;
  runtimeGenerationJobContexts.set(jobId, context);
  if (Array.isArray(context.files) && context.files.length) {
    runtimeGenerationJobRetryPayloads.set(jobId, {
      ...context,
      files: [...context.files]
    });
    if (typeof saveUploadRetryPayload === "function") {
      Promise.resolve(saveUploadRetryPayload(jobId, {
        ...context,
        files: [...context.files]
      })).catch(error => console.warn("Could not persist upload retry payload:", error));
    }
  }
  processGenerationJobQueue();
}

function processGenerationJobQueue() {
  if (runningGenerationJobId) return;
  const nextJob = getGenerationJobs().find(job =>
    job.status === "queued" && runtimeGenerationJobContexts.has(job.jobId)
  );
  if (!nextJob || typeof runGenerationJobAnalysis !== "function") return;
  runningGenerationJobId = nextJob.jobId;
  Promise.resolve(runGenerationJobAnalysis(nextJob.jobId, runtimeGenerationJobContexts.get(nextJob.jobId)))
    .catch(error => {
      upsertGenerationJob({
        jobId: nextJob.jobId,
        status: "failed",
        progress: 100,
        message: "Generation failed",
        error: error?.message || "Synapse could not generate this note."
      });
    })
    .finally(() => {
      const finished = getGenerationJob(nextJob.jobId);
      const context = runtimeGenerationJobContexts.get(nextJob.jobId);
      if (finished?.status === "failed" && context) {
        runtimeGenerationJobRetryPayloads.set(nextJob.jobId, {
          ...context,
          files: Array.isArray(context.files) ? [...context.files] : []
        });
      } else if (finished?.status === "completed" || finished?.status === "cancelled") {
        runtimeGenerationJobRetryPayloads.delete(nextJob.jobId);
        if (typeof clearUploadRetryPayload === "function") {
          Promise.resolve(clearUploadRetryPayload(nextJob.jobId)).catch(() => {});
        }
      }
      runtimeGenerationJobContexts.delete(nextJob.jobId);
      runtimeGenerationJobControllers.delete(nextJob.jobId);
      if (runningGenerationJobId === nextJob.jobId) runningGenerationJobId = "";
      processGenerationJobQueue();
    });
}
