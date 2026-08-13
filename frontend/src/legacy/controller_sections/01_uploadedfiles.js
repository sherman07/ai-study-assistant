let uploadedFiles = [];
let uploadedLinks = [];
let sections = {};
let fullSummary = "";
let selectedSection = "";
let chatHistory = [];
let assistantExpanded = false;
let connectionsData = [];

const appLayout = document.getElementById("appLayout");
const assetUpload = document.getElementById("assetUpload");
const dropZone = document.getElementById("dropZone");
const filePreview = document.getElementById("filePreview");
const uploadStatus = document.getElementById("uploadStatus");
const linkInput = document.getElementById("linkInput");
const linkPreview = document.getElementById("linkPreview");
const sourceInput = document.getElementById("sourceInput");
const uploadStage = document.getElementById("uploadStage");
const analysisStage = document.getElementById("analysisStage");
const resultGrid = document.getElementById("resultGrid");
const mainNotes = document.getElementById("mainNotes");
const loadingBox = document.getElementById("loadingBox");
const summaryNav = document.getElementById("summaryNav");
const summaryNavToggle = document.getElementById("summaryNavToggle");
const sectionsContainer = document.getElementById("sections");
const summaryContent = document.getElementById("summaryContent");
const visualGallery = document.getElementById("visualGallery");
const sectionTitle = document.getElementById("sectionTitle");
const fullNotesBtn = document.getElementById("fullNotesBtn");
const sourceViewerBtn = document.getElementById("sourceViewerBtn");
const downloadNotesBtn = document.getElementById("downloadNotesBtn");
const notesTranslateLanguage = document.getElementById("notesTranslateLanguage");
const sourceViewerPanel = document.getElementById("sourceViewerPanel");
const sourceViewerTabs = document.getElementById("sourceViewerTabs");
const sourceViewerTitle = document.getElementById("sourceViewerTitle");
const sourceViewerMeta = document.getElementById("sourceViewerMeta");
const sourceViewerBody = document.getElementById("sourceViewerBody");
const sourceZoomLabel = document.getElementById("sourceZoomLabel");
const assistant = document.getElementById("assistant");
const openAssistantBtn = document.getElementById("openAssistantFab");
const chatMessages = document.getElementById("chatMessages");
const questionInput = document.getElementById("questionInput");
const voiceMessages = document.getElementById("voiceMessages");
const voiceTutorState = document.getElementById("voiceTutorState");
const voiceTutorDiagnosis = document.getElementById("voiceTutorDiagnosis");
const voiceTutorMastery = document.getElementById("voiceTutorMastery");
const voiceTutorMasteryFill = document.getElementById("voiceTutorMasteryFill");
const voiceTutorProgressLabel = document.getElementById("voiceTutorProgressLabel");
const voiceRecordBtn = document.getElementById("voiceRecordBtn");
const voiceMuteBtn = document.getElementById("voiceMuteBtn");
const voiceTextInput = document.getElementById("voiceTextInput");
const contextLabel = document.getElementById("contextLabel");
const mindMapCanvas = document.getElementById("mindMapCanvas");
const generateBtn = document.getElementById("generateBtn");
const preferredLanguage = document.getElementById("preferredLanguage");
const detailLevel = document.getElementById("detailLevel");
const promptMode = document.getElementById("promptMode");
const aiProvider = document.getElementById("aiProvider");
const historyNav = document.getElementById("historyNav");
const historyList = document.getElementById("historyList");
const historySearch = document.getElementById("historySearch");
const mobileHistoryList = document.getElementById("mobileHistoryList");
const mobileHistorySearch = document.getElementById("mobileHistorySearch");

const HISTORY_STORAGE_KEY = "synapse.generated.history.v6";
const ACTIVE_HISTORY_KEY = "synapse.active.generated.v6";
const TUTOR_CHAT_STORAGE_KEY = "synapse.tutor.chat.history.v1";
const TUTOR_CHAT_HISTORY_LIMIT = 80;
const VOICE_TUTOR_STORAGE_KEY = "synapse.voice.tutor.history.v1";
const VOICE_TUTOR_HISTORY_LIMIT = 80;
const VISUAL_DB_NAME = "synapse.visual.assets.v1";
const VISUAL_DB_STORE = "visualGalleries";
const VISUAL_DB_VERSION = 1;
const VISUAL_HISTORY_LIMIT = 20;
const SOURCE_DB_NAME = "synapse.source.assets.v1";
const SOURCE_DB_STORE = "sourceAssets";
const SOURCE_DB_VERSION = 1;
const SOURCE_HISTORY_LIMIT = 20;
const MAX_SOURCE_PREVIEW_BYTES = 80 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = Number(window.SYNAPSE_ANALYSIS_TIMEOUT_MS || 8 * 60 * 1000);
const SUMMARY_NAV_COLLAPSED_KEY = "synapse.summary.nav.collapsed.v1";
const HISTORY_NAV_COLLAPSED_KEY = "synapse.history.nav.collapsed.v1";
const WORKSPACE_NAV_TAB_KEY = "synapse.workspace.nav.tab.v1";
const AI_PROVIDER_STORAGE_KEY = "synapse.ai.provider.v1";
const VISUAL_STORE_CONFIG = {
  dbName: VISUAL_DB_NAME,
  version: VISUAL_DB_VERSION,
  storeName: VISUAL_DB_STORE,
  errorLabel: "visual cache"
};
const SOURCE_STORE_CONFIG = {
  dbName: SOURCE_DB_NAME,
  version: SOURCE_DB_VERSION,
  storeName: SOURCE_DB_STORE,
  errorLabel: "source cache"
};
const UPLOAD_RETRY_STORE_CONFIG = {
  dbName: "synapse.upload.retry.v1",
  version: 1,
  storeName: "uploadRetry",
  errorLabel: "upload retry cache"
};
const NOTE_LENGTH_DESCRIPTIONS = {
  quick_review: "Low content depth: core answer, key source anchors, and fastest revision value.",
  standard_notes: "Balanced content depth: source concepts, reasoning, examples, and revision use.",
  deep_study: "High content depth: deeper reasoning, concept links, source examples, applications, limits, and mistakes."
};
const PROMPT_MODE_DESCRIPTIONS = {
  quick_answer: "Creates a concise answer focused on the fastest useful study points.",
  detailed_explanation: "Teaches the material in a fuller step-by-step explanation.",
  professor_mode: "Goes beyond the source to explain deeper meaning, useful background knowledge, concept connections, application, mistakes, and high-quality student thinking.",
  tutor_mode: "Explains the source simply with guided learning support.",
  source_strict_research_mode: "Uses only the uploaded source with clear evidence discipline.",
  assignment_apa_mode: "Shapes source material into assignment-aware structure and APA-ready guidance."
};
const AI_PROVIDER_DESCRIPTIONS = {
  "": "Backend default uses the provider selected in backend environment settings.",
  openai: "GPT uses the OpenAI/GPT backend configuration.",
  gemini: "Gemini uses the Gemini backend configuration with the same Synapse prompts.",
  deepseek: "DeepSeek uses the DeepSeek backend configuration with the same Synapse prompts."
};

let backendAiStatus = {
  loaded: false,
  textProvider: "openai",
  geminiConfigured: false,
  geminiApiKeyLoaded: false,
  geminiAuthMode: "",
  deepseekConfigured: false,
  deepseekApiKeyLoaded: false,
  openaiApiKeyLoaded: false,
  tutorWebResearchEnabled: false,
  activeChatModel: ""
};

function geminiProviderUnavailableMessage() {
  return "Gemini is not configured on the live backend yet. Add GEMINI_API_KEY on Render (GEMINI_AUTH_MODE=api_key), then retry. Synapse will not substitute GPT.";
}

function deepseekProviderUnavailableMessage() {
  return "DeepSeek is not configured on the live backend yet. Add DEEPSEEK_API_KEY on Render, then retry. Synapse will not substitute GPT or Gemini.";
}

function refreshAiProviderDescription() {
  const description = document.getElementById("aiProviderDescription");
  if (!description) return;
  const provider = normaliseAiProvider(document.getElementById("aiProvider")?.value || "");
  let text = AI_PROVIDER_DESCRIPTIONS[provider] || AI_PROVIDER_DESCRIPTIONS.openai;
  if (provider === "gemini" && backendAiStatus.loaded && !backendAiStatus.geminiConfigured) {
    text = geminiProviderUnavailableMessage();
  } else if (provider === "deepseek" && backendAiStatus.loaded && !backendAiStatus.deepseekConfigured) {
    text = deepseekProviderUnavailableMessage();
  } else if (!provider && backendAiStatus.loaded && backendAiStatus.textProvider === "openai" && !backendAiStatus.geminiConfigured) {
    text = `${AI_PROVIDER_DESCRIPTIONS[""]} Gemini is currently unavailable on this deployment.`;
  }
  description.textContent = text;
  document.querySelectorAll('[data-ai-provider="gemini"]').forEach(button => {
    const unavailable = backendAiStatus.loaded && !backendAiStatus.geminiConfigured;
    button.title = unavailable ? geminiProviderUnavailableMessage() : (AI_PROVIDER_DESCRIPTIONS.gemini || "");
    button.setAttribute("data-gemini-available", unavailable ? "false" : "true");
  });
  document.querySelectorAll('[data-ai-provider="deepseek"]').forEach(button => {
    const unavailable = backendAiStatus.loaded && !backendAiStatus.deepseekConfigured;
    button.title = unavailable ? deepseekProviderUnavailableMessage() : (AI_PROVIDER_DESCRIPTIONS.deepseek || "");
    button.setAttribute("data-deepseek-available", unavailable ? "false" : "true");
  });
}

async function refreshBackendAiStatus() {
  try {
    const client = (typeof apiClient !== "undefined" && apiClient)
      || globalThis.apiClient
      || null;
    if (!client || typeof client.fetch !== "function") return backendAiStatus;
    const response = await client.fetch("/health", { method: "GET", timeoutMs: 12000 });
    if (!response?.ok) return backendAiStatus;
    const data = await response.json();
    backendAiStatus = {
      loaded: true,
      textProvider: String(data.text_provider || "openai"),
      geminiConfigured: Boolean(data.gemini_configured),
      geminiApiKeyLoaded: Boolean(data.gemini_api_key_loaded),
      geminiAuthMode: String(data.gemini_auth_mode || ""),
      deepseekConfigured: Boolean(data.deepseek_configured),
      deepseekApiKeyLoaded: Boolean(data.deepseek_api_key_loaded),
      openaiApiKeyLoaded: Boolean(data.openai_api_key_loaded),
      tutorWebResearchEnabled: Boolean(data.tutor_web_research_enabled),
      activeChatModel: String(data.active_chat_model || data.chat_model || "")
    };
    refreshAiProviderDescription();
  } catch {
    // Keep the last known status. A selected provider is never replaced client-side.
  }
  return backendAiStatus;
}

function normaliseAiGenerationDiagnostics(value) {
  if (!value || typeof value !== "object") return null;
  return {
    source: String(value.source || ""),
    provider: String(value.provider || ""),
    modelCallCount: Number(value.model_call_count || value.modelCallCount || 0),
    successfulModelCalls: Number(value.successful_model_calls || value.successfulModelCalls || 0),
    failedModelCalls: Number(value.failed_model_calls || value.failedModelCalls || 0),
    models: Array.isArray(value.models) ? value.models.map(item => String(item || "")).filter(Boolean).slice(0, 4) : [],
    fallbackUsed: Boolean(value.fallback_used || value.fallbackUsed),
    fallbackStages: Array.isArray(value.fallback_stages || value.fallbackStages)
      ? (value.fallback_stages || value.fallbackStages).map(item => String(item || "")).filter(Boolean).slice(0, 6)
      : [],
    lastError: String(value.last_error || value.lastError || "").slice(0, 280)
  };
}

function renderAiGenerationNotice() {
  const diagnostics = currentAiGeneration;
  if (!diagnostics || !diagnostics.fallbackUsed) return "";
  const provider = diagnostics.provider ? diagnostics.provider.toUpperCase() : "AI";
  const model = diagnostics.models.length ? ` Model: ${diagnostics.models.join(", ")}.` : "";
  const reason = diagnostics.lastError ? ` Reason: ${diagnostics.lastError}` : "";
  return `
    <div class="alert alert-warning ai-generation-notice" role="status">
      <strong>${escapeHTML(provider)} historical generation did not complete.</strong>
      These notes were created by an older local fallback and should be regenerated before use.${escapeHTML(model + reason)}
    </div>
  `;
}

let currentSourceFingerprint = "";
let currentHistoryId = "";
let currentPrimarySourceIdentity = "";
let currentPromptMode = "professor_mode";
let currentPromptModeLabel = "Professional Mode";
let currentAiGeneration = null;
let currentMindMap = null;
let storedTitle = "Study Notes";
let activeTool = "mindmap";
let activeMindBranchIndex = 0;
let activeMindPointIndex = 0;
let activeMindChildIndex = -1;
let mindDetailPopupOpen = false;
let mindDetailPopupLeft = 24;
let mindDetailPopupTop = 72;
let mindDetailPopupPlacement = "right";
let collapsedMindBranches = new Set();
let visualGalleryData = [];
let sourceViewerItems = [];
let sourceViewerOpen = false;
let activeSourceItemId = "";
let sourceViewerZoom = 100;
let summaryNavCollapsed = false;
let historyNavCollapsed = false;
let workspaceNavTab = "library";
let voiceTutorHistory = [];
let voiceTutorLastState = null;
let voiceTutorBusy = false;
let voiceRealtimePeer = null;
let voiceRealtimeChannel = null;
let voiceRealtimeStream = null;
let voiceRealtimeAudio = null;
let voiceRealtimeConnected = false;
let voiceRealtimeConnecting = false;
let voiceRealtimeMuted = false;
let voiceRealtimeAssistantDraft = "";
let voiceRealtimeStreamingAssistantItem = null;
let voiceRealtimeStreamingAssistantElement = null;
let voiceRealtimeResponseActive = false;
let voiceRealtimeTranscriptCommitted = false;
let voiceRealtimeLastTranscriptText = "";
let voiceRealtimeLastTranscriptAt = 0;
let voiceRealtimeLastSpeechAt = 0;
let voiceRealtimeNoTranscriptTimer = null;

function readSummaryNavPreference() {
  return safeGetLocalStorage(SUMMARY_NAV_COLLAPSED_KEY, "") === "true";
}

function readHistoryNavPreference() {
  return safeGetLocalStorage(HISTORY_NAV_COLLAPSED_KEY, "") === "true";
}

function readWorkspaceNavTabPreference() {
  const stored = String(safeGetLocalStorage(WORKSPACE_NAV_TAB_KEY, "") || "").toLowerCase();
  return stored === "outline" ? "outline" : "library";
}

function syncWorkspaceNavTabUi(tab = workspaceNavTab) {
  const layout = document.getElementById("appLayout") || appLayout;
  const rail = document.getElementById("historyNav") || historyNav;
  const libraryPanel = document.getElementById("workspaceNavLibrary");
  const outlinePanel = document.getElementById("summaryNav") || summaryNav;
  const libraryTab = document.getElementById("workspaceNavTabLibrary");
  const outlineTab = document.getElementById("workspaceNavTabOutline");
  const tablist = document.querySelector(".workspace-nav-tabs");
  const notesReady = Boolean(layout?.classList.contains("generated-notes-state"));
  // Outline exists only for generated notes; otherwise stay on Library.
  const desired = notesReady && tab === "outline" ? "outline" : "library";
  workspaceNavTab = desired;

  if (layout) layout.setAttribute("data-workspace-nav-tab", desired);
  if (rail) {
    rail.setAttribute("data-workspace-nav-tab", desired);
    rail.classList.toggle("has-outline-nav", notesReady);
  }

  if (tablist) {
    tablist.hidden = !notesReady;
    tablist.setAttribute("aria-hidden", String(!notesReady));
  }

  if (libraryPanel) libraryPanel.hidden = desired !== "library";
  if (outlinePanel) {
    outlinePanel.hidden = !(notesReady && desired === "outline");
    outlinePanel.classList.toggle("hidden-before-analysis", !notesReady);
  }

  if (libraryTab) {
    const active = desired === "library";
    libraryTab.classList.toggle("is-active", active);
    libraryTab.setAttribute("aria-selected", String(active));
    libraryTab.hidden = !notesReady;
  }
  if (outlineTab) {
    const active = desired === "outline";
    outlineTab.classList.toggle("is-active", active);
    outlineTab.setAttribute("aria-selected", String(active));
    outlineTab.hidden = !notesReady;
    outlineTab.disabled = !notesReady;
    outlineTab.title = notesReady
      ? "Show this note's outline"
      : "Outline appears after you open generated notes";
  }
}

function setWorkspaceNavTab(tab = "library", { persist = true, expandRail = true } = {}) {
  const layout = document.getElementById("appLayout") || appLayout;
  const notesReady = Boolean(layout?.classList.contains("generated-notes-state"));
  const desired = notesReady && tab === "outline" ? "outline" : "library";
  workspaceNavTab = desired;
  if (persist) safeSetLocalStorage(WORKSPACE_NAV_TAB_KEY, desired);
  if (expandRail && historyNavCollapsed) {
    historyNavCollapsed = false;
    safeSetLocalStorage(HISTORY_NAV_COLLAPSED_KEY, "false");
    applyHistoryNavCollapsed();
  }
  // Keep legacy summary-collapsed in sync: outline visible == not collapsed.
  summaryNavCollapsed = desired !== "outline";
  if (persist) safeSetLocalStorage(SUMMARY_NAV_COLLAPSED_KEY, String(summaryNavCollapsed));
  syncWorkspaceNavTabUi(desired);
  applySummaryNavCollapsed();
}

function applySummaryNavCollapsed() {
  const layout = document.getElementById("appLayout") || appLayout;
  const outlinePanel = document.getElementById("summaryNav") || summaryNav;
  if (!layout) return;
  // Unified rail: summary-collapsed no longer shrinks a second grid column.
  layout.classList.remove("summary-collapsed");
  if (outlinePanel) outlinePanel.classList.toggle("collapsed", summaryNavCollapsed);
  const toggle = document.getElementById("summaryNavToggle") || summaryNavToggle;
  if (!toggle) return;
  const expanded = !summaryNavCollapsed;
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.setAttribute("aria-label", expanded ? "Collapse sections" : "Expand sections");
  toggle.title = expanded ? "Collapse sections" : "Expand sections";
  const icon = toggle.querySelector("i");
  if (icon) {
    icon.className = expanded ? "bi bi-chevron-double-left" : "bi bi-chevron-double-right";
  }
}

function applyHistoryNavCollapsed() {
  if (!appLayout) return;
  appLayout.classList.toggle("history-collapsed", historyNavCollapsed);
  const nav = document.getElementById("historyNav") || historyNav;
  if (nav) nav.classList.toggle("collapsed", historyNavCollapsed);

  const historyNavToggle = document.getElementById("historyNavToggle");
  const historyNavExpand = document.getElementById("historyNavExpand");
  const expanded = !historyNavCollapsed;
  if (historyNavToggle) {
    historyNavToggle.setAttribute("aria-expanded", String(expanded));
    historyNavToggle.setAttribute("aria-label", expanded ? "Hide workspace navigation" : "Show workspace navigation");
    historyNavToggle.title = expanded ? "Hide workspace navigation" : "Show workspace navigation";
    const icon = historyNavToggle.querySelector("i");
    if (icon) {
      icon.className = expanded ? "bi bi-chevron-double-left" : "bi bi-chevron-double-right";
    }
  }
  if (historyNavExpand) {
    historyNavExpand.hidden = expanded;
    historyNavExpand.setAttribute("aria-expanded", String(expanded));
  }
}

function toggleSummaryNav(force = null) {
  // Legacy API: treat "expanded summary" as Outline tab, collapsed as Library.
  const wantOutline = typeof force === "boolean" ? !force : workspaceNavTab !== "outline";
  setWorkspaceNavTab(wantOutline ? "outline" : "library");
}

function toggleHistoryNav(force = null) {
  historyNavCollapsed = typeof force === "boolean" ? force : !historyNavCollapsed;
  safeSetLocalStorage(HISTORY_NAV_COLLAPSED_KEY, String(historyNavCollapsed));
  applyHistoryNavCollapsed();
}

summaryNavCollapsed = readSummaryNavPreference();
historyNavCollapsed = readHistoryNavPreference();
workspaceNavTab = readWorkspaceNavTabPreference();
if (summaryNavCollapsed && workspaceNavTab === "outline") workspaceNavTab = "library";
applySummaryNavCollapsed();
applyHistoryNavCollapsed();
syncWorkspaceNavTabUi(workspaceNavTab);
requestAnimationFrame(() => {
  applyHistoryNavCollapsed();
  syncWorkspaceNavTabUi(workspaceNavTab);
});

function updateNoteLengthDescription() {
  const noteLengthSelect = document.getElementById("noteLength");
  const noteLengthDescription = document.getElementById("noteLengthDescription");
  if (noteLengthDescription && noteLengthSelect) {
    noteLengthDescription.textContent = NOTE_LENGTH_DESCRIPTIONS[noteLengthSelect.value] || NOTE_LENGTH_DESCRIPTIONS.standard_notes;
  }
}

function updatePromptModeDescription() {
  const promptModeSelect = document.getElementById("promptMode");
  const promptModeDescription = document.getElementById("promptModeDescription");
  if (promptModeDescription && promptModeSelect) {
    promptModeDescription.textContent = PROMPT_MODE_DESCRIPTIONS[promptModeSelect.value] || PROMPT_MODE_DESCRIPTIONS.professor_mode;
  }
}

function normaliseAiProvider(value) {
  const provider = String(value || "").toLowerCase();
  if (provider === "gemini") return "gemini";
  if (provider === "deepseek" || provider === "deepsea") return "deepseek";
  if (provider === "openai" || provider === "gpt") return "openai";
  return "";
}

