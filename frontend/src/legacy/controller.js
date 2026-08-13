import { API_BASE } from "./apiConfig.js?v=settings-modal-pattern-20260720-06";
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
} from "./dataApiClient.js?v=settings-modal-pattern-20260720-06";
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
} from "./markdownRenderer.js?v=settings-modal-pattern-20260720-06";
import { LegacyControllerLoader } from "./controllerLoader.js?v=settings-modal-pattern-20260720-06";
import { installSynapseCredits } from "../features/credits/install.js";
import { renderStudyToolLaunch } from "../features/study-tools/StudyToolLaunch.js";

const CONTROLLER_VERSION = "settings-modal-pattern-20260720-06";
const CONTROLLER_DEFINITION_FILES = [
  "01_uploadedfiles.js",
  "01_aiproviderandlearningfigures.js",
  "01_fileuploadandsources.js",
  "01_generationjobanalysis.js",
  "01_generationjobcontrols.js",
  "02_openvisualmodal.js",
  "02_studytoolsandsettings.js",
  "02_timelinestore.js",
  "03_rendertimeline.js",
  "03_timelineactions.js",
  "03_visualguidestore.js",
  "04_rendervisualguidelaunch.js",
  "04_visualguiderenderandquiz.js",
  "04_masterygraph.js",
  "04_memorycards.js",
  "04_masterygraphrender.js",
  "05_persistcurrentquiztohistory.js",
  "05_quizgenerationandrender.js",
  "05_flashcardstore.js",
  "06_deleteflashcarddeck.js",
  "06_flashcardstudy.js",
  "06_mindmapdata.js",
  "06_mindmaprender.js",
  "07_focusmindmappoint.js",
  "07_voicetutor.js",
  "08_extractrealtimeresponsetranscript.js",
  "08_workspaceandaccount.js",
  "08_accountbilling.js",
  "08_historyandsourceassets.js",
  "09_togglesourceviewer.js",
  "09_sourcepreview.js",
  "09_sourceviewerbody.js",
  "09_historysync.js",
  "09_historyload.js",
  "10_focusroombridge.js",
  "11_generationjobs.js",
  "12_broadcastjobs.js",
  "12_broadcastpipeline.js",
  "12_broadcastrealtime.js",
  "12_broadcastplayback.js",
  "13_studytoolmemory.js",
  "14_learningcompanion.js",
];
const CONTROLLER_BOOT_FILE = "99_boot.js";
const apiClient = new SynapseApiClient(API_BASE);

// Credits API must be on window before any controller section / loader work.
installSynapseCredits(window);

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
