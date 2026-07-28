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
  kicker = "Ready when you are"
} = {}) {
  const disabled = hasNotes ? "" : "disabled";
  const helper = hasNotes
    ? "No tokens used for this first generation"
    : "Generate your study notes first to unlock this tool";
  return `
    <div class="study-tool-launch" data-study-tool-launch="${escapeAttr(tool)}" data-generation-cost="0">
      <div class="study-tool-launch-icon" aria-hidden="true"><i class="bi ${escapeAttr(iconClass)}"></i></div>
      <div class="study-tool-launch-copy">
        <span class="study-tool-launch-kicker">${escapeHTML(kicker)}</span>
        <h4>${escapeHTML(title)}</h4>
        <p>${escapeHTML(description)}</p>
      </div>
      <div class="study-tool-launch-meta"><i class="bi bi-lightning-charge-fill" aria-hidden="true"></i>${escapeHTML(helper)}</div>
      <button class="btn btn-primary study-tool-generate-btn" type="button" data-study-tool-generate="${escapeAttr(tool)}" data-token-cost="0" onclick="${escapeAttr(action)}" ${disabled}>
        <i class="bi bi-stars me-2" aria-hidden="true"></i>${escapeHTML(actionLabel)}
      </button>
    </div>
  `;
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
    removeAutoBilingualHeadings,
    removeDetectedUrlsClient,
    renderStudyToolLaunch,
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
