import { API_BASE } from "./apiConfig.js?v=history-hydrate-v1";
import { ApiConnectionError, SynapseApiClient } from "./apiClient.js";
import {
  DATA_API_BASE,
  cancelBroadcastJobInDataApi,
  createBroadcastJobInDataApi,
  dataApiClient,
  deleteGeneratedContentFromDataApi,
  deleteBroadcastJobFromDataApi,
  fetchBroadcastJobFromDataApi,
  fetchBroadcastJobsFromDataApi,
  fetchGeneratedContentFromDataApi,
  fetchGeneratedContentSectionsFromDataApi,
  patchBroadcastJobInDataApi,
  persistGeneratedContentToDataApi,
  retryBroadcastJobInDataApi
} from "./dataApiClient.js?v=history-hydrate-v1";
import {
  safeGetLocalStorage,
  safeReadJSONStorage,
  safeRemoveLocalStorage,
  safeSetLocalStorage,
  safeWriteJSONStorage
} from "./storage.js";
import {
  cleanAutoLanguageSectionTitles,
  hydrateSectionsFromSummary,
  removeAutoBilingualHeadings
} from "./sectionUtils.js";
import {
  formatBytes,
  getYouTubeVideoIdClient,
  getYoutubeTranscriptState,
  removeDetectedUrlsClient,
  sourceIcon,
  sourceItemLooksLikeYouTube,
  sourceKindFromFile,
  youtubeEmbedUrlFromItem,
  youtubeWatchUrlFromItem
} from "./sourceUtils.js";
import {
  cacheRecordKeys,
  loadFirstCacheItems,
  pruneCacheRecords,
  transactCacheStore
} from "./indexedDbStore.js";
import { ensureRenderableSummary } from "./notesContent.js";
import {
  renderStudyNotesSurface,
  shouldCollapseSecondarySections
} from "./notesSurface.js";
import { buildGeneratedNoteNavigation } from "./notesNavigation.js";
import { animateLegacyFlashcardTurn, legacyQuizOptionState, prefersReducedStudyMotion } from "./studyMotion.js";
import {
  cleanMindText,
  configureMarkdownRenderer,
  escapeAttr,
  escapeHTML,
  inlineMarkdownHTML,
  markdownToHTML,
  renderMath,
  shorten,
  typeInto
} from "./markdownRenderer.js?v=history-hydrate-v1";
import { LegacyControllerLoader } from "./controllerLoader.js?v=history-hydrate-v1";

const CONTROLLER_VERSION = "history-hydrate-v1";
const CONTROLLER_DEFINITION_FILES = [
  "01_uploadedfiles.js",
  "02_openvisualmodal.js",
  "03_rendertimeline.js",
  "04_rendervisualguidelaunch.js",
  "04_masterygraph.js",
  "05_persistcurrentquiztohistory.js",
  "06_deleteflashcarddeck.js",
  "07_focusmindmappoint.js",
  "08_extractrealtimeresponsetranscript.js",
  "09_togglesourceviewer.js",
  "10_focusroombridge.js",
  "11_generationjobs.js",
  "12_broadcastjobs.js",
  "13_studytoolmemory.js",
  "14_learningcompanion.js",
];
const CONTROLLER_BOOT_FILE = "99_boot.js";
const apiClient = new SynapseApiClient(API_BASE);

function renderStudyToolLaunch({
  tool,
  iconClass,
  title,
  description,
  action,
  actionLabel,
  hasNotes = true,
  kicker = "Ready when you are",
  points = [],
  estimate = "",
  secondaryHint = ""
} = {}) {
  const disabled = hasNotes ? "" : "disabled";
  const helper = hasNotes
    ? (estimate ? `No tokens used for this first generation · ${estimate}` : "No tokens used for this first generation")
    : "Generate your study notes first to unlock this tool";
  const defaultPoints = {
    flashcards: ["Atomic prompts from the current notes", "Reveal, then grade Again / Hard / Good / Easy", "Match mode for quick recognition drills"],
    quiz: ["Exam-style and practice question mixes", "Save history against this note", "Review explanations after each attempt"],
    timeline: ["Warm-up → learn → practise → check", "Mark tasks complete as you go", "Pace settings for quick or deep revision"],
    masterygraph: ["Due and missed review queues", "Weak-topic map from your activity", "Self-grade what still feels shaky"],
    visualguide: ["One finished revision poster", "Grounded in the current notes", "Export as PNG when ready"],
    broadcast: ["Natural spoken episode from these notes", "Chapter markers while you listen", "Jump into quiz or flashcards after"]
  };
  const bullets = (Array.isArray(points) && points.length ? points : defaultPoints[tool] || [])
    .slice(0, 4)
    .map(item => `<li>${escapeHTML(item)}</li>`)
    .join("");
  return `
    <div class="study-tool-launch study-tool-launch--v2" data-study-tool-launch="${escapeAttr(tool)}" data-generation-cost="0">
      <div class="study-tool-launch-icon" aria-hidden="true"><i class="bi ${escapeAttr(iconClass)}"></i></div>
      <div class="study-tool-launch-copy">
        <span class="study-tool-launch-kicker">${escapeHTML(kicker)}</span>
        <h4>${escapeHTML(title)}</h4>
        <p>${escapeHTML(description)}</p>
        ${bullets ? `<ul class="study-tool-launch-points">${bullets}</ul>` : ""}
        ${secondaryHint ? `<p class="study-tool-launch-hint">${escapeHTML(secondaryHint)}</p>` : ""}
      </div>
      <div class="study-tool-launch-meta"><i class="bi bi-lightning-charge-fill" aria-hidden="true"></i>${escapeHTML(helper)}</div>
      <button class="btn btn-primary study-tool-generate-btn" type="button" data-study-tool-generate="${escapeAttr(tool)}" data-token-cost="0" onclick="${escapeAttr(action)}" ${disabled}>
        <i class="bi bi-stars me-2" aria-hidden="true"></i>${escapeHTML(actionLabel)}
      </button>
    </div>
  `;
}

function showStudyToolNotice(message, tone = "info") {
  const text = String(message || "").trim();
  if (!text) return;
  const normalizedTone = tone === "error" ? "error" : tone === "success" ? "success" : "info";
  const noticeSignature = `${normalizedTone}\n${text}`;
  let host = document.getElementById("studyToolNoticeHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "studyToolNoticeHost";
    host.className = "study-tool-notice-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  const removeStudyNotice = item => {
    item?.cancelStudyNoticeDismiss?.();
    item?.remove();
  };
  removeStudyNotice(Array.from(host.children).find(item => item.dataset.noticeSignature === noticeSignature));
  while (host.children.length >= 3) removeStudyNotice(host.firstElementChild);
  const note = document.createElement("div");
  note.className = `study-tool-notice study-tool-notice--${normalizedTone}`;
  note.dataset.noticeSignature = noticeSignature;
  note.setAttribute("role", tone === "error" ? "alert" : "status");
  note.innerHTML = `<span>${typeof escapeHTML === "function" ? escapeHTML(text) : text}</span><button type="button" aria-label="Dismiss notification"><i class="bi bi-x-lg" aria-hidden="true"></i></button>`;
  let dismissTimer = null;
  let dismissStartedAt = 0;
  let dismissRemaining = normalizedTone === "error" ? 7000 : 4200;
  const dismiss = () => {
    if (!note.isConnected || note.classList.contains("is-exiting")) return;
    window.clearTimeout(dismissTimer);
    dismissTimer = null;
    note.classList.add("is-exiting");
    window.setTimeout(() => note.remove(), prefersReducedStudyMotion() ? 0 : 170);
  };
  const scheduleStudyNoticeDismiss = () => {
    if (!note.isConnected || note.classList.contains("is-exiting") || dismissTimer !== null) return;
    dismissStartedAt = Date.now();
    dismissTimer = window.setTimeout(dismiss, dismissRemaining);
  };
  const pauseStudyNoticeDismiss = () => {
    if (dismissTimer === null) return;
    dismissRemaining = Math.max(0, dismissRemaining - (Date.now() - dismissStartedAt));
    window.clearTimeout(dismissTimer);
    dismissTimer = null;
  };
  const resumeStudyNoticeDismiss = () => scheduleStudyNoticeDismiss();
  note.cancelStudyNoticeDismiss = pauseStudyNoticeDismiss;
  note.addEventListener("pointerenter", pauseStudyNoticeDismiss);
  note.addEventListener("pointerleave", resumeStudyNoticeDismiss);
  note.addEventListener("focusin", pauseStudyNoticeDismiss);
  note.addEventListener("focusout", event => {
    if (!note.contains(event.relatedTarget)) resumeStudyNoticeDismiss();
  });
  note.querySelector("button")?.addEventListener("click", dismiss);
  host.appendChild(note);
  scheduleStudyNoticeDismiss();
}

function syncStudyToolTabState(toolName) {
  document.querySelectorAll(".tool-switch-btn").forEach(button => {
    const isActive = button.classList.contains("active") && !button.disabled;
    button.setAttribute("aria-selected", String(isActive));
    button.setAttribute("role", button.getAttribute("role") || "tab");
    if (isActive) {
      try { button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); } catch {}
    }
  });
  document.querySelectorAll(".tool-panel").forEach(panel => {
    const isActive = panel.classList.contains("active");
    panel.setAttribute("role", panel.getAttribute("role") || "tabpanel");
    if (isActive) panel.removeAttribute("hidden");
    else panel.setAttribute("hidden", "true");
  });
  const activeBtn = document.querySelector(".tool-switch-btn.active");
  if (activeBtn && toolName) activeBtn.setAttribute("data-study-tool", toolName);
}

const controllerLoader = new LegacyControllerLoader({
  baseUrl: import.meta.url,
  bootFile: CONTROLLER_BOOT_FILE,
  configureMarkdownRenderer,
  definitionFiles: CONTROLLER_DEFINITION_FILES,
  globalScope: window,
  utilities: {
    API_BASE,
    DATA_API_BASE,
    ApiConnectionError,
    animateLegacyFlashcardTurn,
    apiClient,
    cacheRecordKeys,
    cancelBroadcastJobInDataApi,
    cleanAutoLanguageSectionTitles,
    cleanMindText,
    createBroadcastJobInDataApi,
    escapeAttr,
    escapeHTML,
    ensureRenderableSummary,
    formatBytes,
    getYouTubeVideoIdClient,
    getYoutubeTranscriptState,
    hydrateSectionsFromSummary,
    inlineMarkdownHTML,
    legacyQuizOptionState,
    buildGeneratedNoteNavigation,
    loadFirstCacheItems,
    markdownToHTML,
    pruneCacheRecords,
    dataApiClient,
    deleteBroadcastJobFromDataApi,
    deleteGeneratedContentFromDataApi,
    fetchBroadcastJobFromDataApi,
    fetchBroadcastJobsFromDataApi,
    fetchGeneratedContentFromDataApi,
    fetchGeneratedContentSectionsFromDataApi,
    patchBroadcastJobInDataApi,
    persistGeneratedContentToDataApi,
    prefersReducedStudyMotion,
    removeAutoBilingualHeadings,
    removeDetectedUrlsClient,
    renderStudyToolLaunch,
    showStudyToolNotice,
    syncStudyToolTabState,
    renderMath,
    renderStudyNotesSurface,
    retryBroadcastJobInDataApi,
    safeGetLocalStorage,
    safeReadJSONStorage,
    safeRemoveLocalStorage,
    safeSetLocalStorage,
    safeWriteJSONStorage,
    shorten,
    shouldCollapseSecondarySections,
    sourceIcon,
    sourceItemLooksLikeYouTube,
    sourceKindFromFile,
    transactCacheStore,
    typeInto,
    youtubeEmbedUrlFromItem,
    youtubeWatchUrlFromItem
  },
  version: CONTROLLER_VERSION
});

controllerLoader.load()
  .then(() => {
    window.dispatchEvent(new Event("synapse-runtime-ready"));
  })
  .catch(error => {
    const message = `Synapse controller failed to load: ${error?.message || String(error)}${error?.stack ? `\n${error.stack}` : ""}`;
    window.__synapseControllerError = message;
    console.error(message);
    window.dispatchEvent(new CustomEvent("synapse-runtime-failed", {
      detail: { message: "The Synapse workspace controller could not be initialized." }
    }));
  });
