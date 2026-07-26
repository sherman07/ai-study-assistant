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
  gemini: "Gemini uses the Gemini backend configuration with the same Synapse prompts."
};

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
      <strong>${escapeHTML(provider)} main generation did not complete.</strong>
      Synapse showed local fallback notes instead of verified AI-generated notes.${escapeHTML(model + reason)}
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
  if (provider === "openai" || provider === "gpt") return "openai";
  return "";
}

function setAiProvider(value) {
  const provider = normaliseAiProvider(value);
  const providerInput = document.getElementById("aiProvider");
  if (providerInput) providerInput.value = provider;
  safeSetLocalStorage(AI_PROVIDER_STORAGE_KEY, provider);

  document.querySelectorAll("[data-ai-provider]").forEach(button => {
    const active = button.getAttribute("data-ai-provider") === provider;
    button.classList.toggle("active", active);
    button.classList.toggle("btn-primary", active);
    button.classList.toggle("btn-outline-primary", !active);
    button.setAttribute("aria-pressed", String(active));
  });

  const description = document.getElementById("aiProviderDescription");
  if (description) {
    description.textContent = AI_PROVIDER_DESCRIPTIONS[provider] || AI_PROVIDER_DESCRIPTIONS.openai;
  }
}

document.addEventListener("change", event => {
  if (event?.target?.id === "noteLength") {
    updateNoteLengthDescription();
  }
  if (event?.target?.id === "promptMode") {
    updatePromptModeDescription();
  }
});
updateNoteLengthDescription();
updatePromptModeDescription();
const initialAiProvider = normaliseAiProvider(safeGetLocalStorage(AI_PROVIDER_STORAGE_KEY, aiProvider ? aiProvider.value : ""));
setAiProvider(initialAiProvider);
requestAnimationFrame(updateNoteLengthDescription);
requestAnimationFrame(updatePromptModeDescription);
requestAnimationFrame(() => setAiProvider(normaliseAiProvider(safeGetLocalStorage(AI_PROVIDER_STORAGE_KEY, initialAiProvider))));

const TIMELINE_STORAGE_KEY = "synapse.timeline.path.v1";
const TIMELINE_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "warm_up", label: "Warm up" },
  { value: "learn", label: "Learn" },
  { value: "apply", label: "Apply" },
  { value: "check", label: "Check" },
  { value: "revise", label: "Revise" }
];
const STUDY_PATH_QUESTION_TYPE_OPTIONS = [
  { value: "short_answer", label: "Short answer", hint: "Answer in 2-3 sentences." },
  { value: "single_choice", label: "Single choice", hint: "Choose the best answer." },
  { value: "multiple_choice", label: "Multiple choice", hint: "Select every correct answer." },
  { value: "true_false", label: "True / False", hint: "Judge the statement and explain why." },
  { value: "case_analysis", label: "Case analysis", hint: "Apply the concept to a concrete case." },
  { value: "compare", label: "Compare", hint: "Explain similarities and differences." },
  { value: "essay_outline", label: "Essay outline", hint: "Plan a short answer structure." },
  { value: "diagram_prompt", label: "Diagram prompt", hint: "Read or sketch the visual logic." }
];
let currentTimeline = null;
let activeTimelineIndex = 0;
let activeTimelineFilter = "all";
let timelineError = "";
let isTimelineGenerating = false;
let timelineCompletedIds = new Set();
let timelinePracticeAnswers = {};
let timelineCompletionCelebrated = false;

const VISUAL_IMAGE_GUIDE_STYLE_VERSION = "grid-infographic-v13";
const VISUAL_GUIDE_STORAGE_KEY = "synapse.visual.image.guide.v13";
let currentVisualGuide = null;
let visualGuideError = "";
let isVisualGuideGenerating = false;

const QUIZ_STORAGE_KEY = "synapse.quiz.settings.v3";
const QUIZ_HISTORY_STORAGE_KEY = "synapse.quiz.history.v1";
const QUIZ_HISTORY_LIMIT = 16;
const QUIZ_TYPE_OPTIONS = [
  { value: "single_choice", label: "Single choice", description: "4 options, only 1 correct answer" },
  { value: "multiple_choice", label: "Multiple choice", description: "Multiple correct answers for careful distinction" },
  { value: "true_false", label: "True / False", description: "Quickly test concept boundaries" },
  { value: "worked_problem", label: "Worked problem", description: "Exam-style calculation or proof with marks" },
  { value: "error_diagnosis", label: "Error diagnosis", description: "Find and fix a realistic wrong step" },
  { value: "short_answer", label: "Short answer", description: "Explain the key idea in your own words" },
  { value: "case_analysis", label: "Case analysis", description: "Apply the concept to a concrete scenario" },
  { value: "essay", label: "Essay", description: "Organise evidence into a complete response" }
];
const QUIZ_LANGUAGE_OPTIONS = [
  { value: "multi_language", label: "Multi-language", description: "Match the current notes and keep useful source terms." },
  { value: "english", label: "English", description: "Write all quiz content in English." },
  { value: "simplified_chinese", label: "简体中文", description: "使用简体中文生成题目。" },
  { value: "traditional_chinese", label: "繁體中文", description: "使用繁體中文生成題目。" },
  { value: "mixed_chinese_english", label: "中文 + English keywords", description: "中文解释，保留关键英文术语。" },
  { value: "japanese", label: "日本語", description: "日本語で出題します。" },
  { value: "korean", label: "한국어", description: "한국어로 문제를 생성합니다." },
  { value: "french", label: "Français", description: "Rédiger le quiz en français." },
  { value: "spanish", label: "Español", description: "Redactar el quiz en español." },
  { value: "german", label: "Deutsch", description: "Das Quiz auf Deutsch schreiben." },
  { value: "italian", label: "Italiano", description: "Scrivere il quiz in italiano." },
  { value: "portuguese", label: "Português", description: "Escrever o quiz em português." },
  { value: "arabic", label: "العربية", description: "إنشاء الاختبار باللغة العربية." },
  { value: "hindi", label: "हिन्दी", description: "हिन्दी में प्रश्न बनाएं." },
  { value: "vietnamese", label: "Tiếng Việt", description: "Tạo câu hỏi bằng tiếng Việt." },
  { value: "thai", label: "ไทย", description: "สร้างแบบทดสอบเป็นภาษาไทย." },
  { value: "indonesian", label: "Bahasa Indonesia", description: "Buat kuis dalam Bahasa Indonesia." },
  { value: "malay", label: "Bahasa Melayu", description: "Bina kuiz dalam Bahasa Melayu." },
  { value: "russian", label: "Русский", description: "Создать тест на русском языке." }
];
const QUIZ_DEFAULT_SETTINGS = {
  examMode: false,
  preferredLanguage: "english",
  totalQuestions: 6,
  questionTypes: [
    { type: "worked_problem", count: 2 },
    { type: "error_diagnosis", count: 1 },
    { type: "case_analysis", count: 1 },
    { type: "short_answer", count: 1 },
    { type: "single_choice", count: 1 }
  ]
};
let quizSettings = loadQuizSettings();
let quizSettingsDraft = null;
let currentQuiz = null;
let quizHistory = [];
let quizAnswers = {};
let quizRevealedAnswers = new Set();
let quizReport = null;
let quizError = "";
let isQuizGenerating = false;
let activeQuizQuestionIndex = 0;
let activeQuizHistoryId = "";

const FLASHCARD_STORAGE_KEY = "synapse.flashcards.deck.v1";
const FLASHCARD_SETTINGS_KEY = "synapse.flashcards.settings.v1";
const FLASHCARD_DEFAULT_SETTINGS = {
  preferredLanguage: "english",
  countMode: "auto",
  customCount: 20
};
let flashcardSettings = loadFlashcardSettings();
let currentFlashcards = [];
let activeFlashcardIndex = 0;
let flashcardSide = "front";
let flashcardError = "";
let isFlashcardGenerating = false;
let flashcardActivityMode = "cards";
let flashcardMatchingState = null;

function sourceFigureText(item) {
  if (!item || typeof item !== "object") return "";
  return [
    item.title,
    item.caption,
    item.what_shows,
    item.argument_supported,
    item.cross_source_connection,
    item.how_to_read,
    item.exam_use,
    item.location,
    item.source_title,
    item.visual_kind
  ].filter(Boolean).join(" ").toLowerCase();
}

function countSourceFigureSignals(text, patterns) {
  return patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);
}

function isRelevantLearningFigure(item) {
  if (!item || !item.url) return false;
  const text = sourceFigureText(item);
  if (!text) return false;

  if (/unavailable in this cached view|regenerate from the source files/i.test(text)) return false;
  if (/\b(stock|dreamstime|getty|unsplash|product photo|phone photo|generic photo|decorative photo)\b/i.test(text)) {
    return false;
  }

  const trustedKinds = new Set([
    "data/table",
    "graph/chart",
    "diagram/model",
    "experiment/event",
    "formula/calculation",
    "method/result figure"
  ]);
  if (trustedKinds.has(String(item.visual_kind || "").toLowerCase())) return true;

  const teachingSignals = countSourceFigureSignals(text, [
    /\b(table|figure|fig\.|graph|chart|plot|scatter|correlation|axis|axes|curve|diagram|schema|schematic|model|flow|process|timeline)\b/i,
    /\b(data|results?|statistics?|mean|median|weighted|arithmetic|percentage|rate|sample|condition|control|comparison|versus|vs)\b/i,
    /\b(experiment|method|procedure|trial|task|stimulus|response|event|habituation|possible|impossible|observed|violation|looking time)\b/i,
    /\b(genotype|phenotype|heritability|chromosome|maoa|allele|gene|environment|iq|biomarker)\b/i,
    /\b(mri|fmri|eeg|bold|activation|neuroimaging|brain scan|action potential|resting potential|synapse)\b/i,
    /(图表|统计|数据|结果|实验|流程|机制|模型|公式|对比|比较|相关|相关性|基因|遗传|染色体|表型|脑成像|神经影像|激活|坐标|曲线)/
  ]);

  const decorativeSignals = countSourceFigureSignals(text, [
    /\b(title slide|cover|agenda|outline|contents|today|welcome|overview|learning objectives?)\b/i,
    /\b(lecturer|professor|dr\.|email|contact|office|university|department|course code|canvas)\b/i,
    /\b(photo|photograph|portrait|headshot|people|person|children|child|boy|girl|landscape|stock|getty|dreamstime|unsplash|logo|decorative|background|product photo|phone photo)\b/i,
    /(封面|目录|大纲|学习目标|照片|头像|人物照|风景|装饰|背景|作者|讲师|联系方式|邮箱|学校|标志)/
  ]);

  if (teachingSignals <= 0) return false;
  if (decorativeSignals > 0 && teachingSignals < 3) return false;
  if (decorativeSignals > teachingSignals) return false;
  return true;
}

function sanitizeLearningFigures(items) {
  return normalizeLearningFigures(items)
    .filter(isRelevantLearningFigure);
}

function activeSynapseApiBase() {
  try {
    const configured = typeof API_BASE !== "undefined" ? API_BASE : window.API_BASE;
    return String(configured || "").replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function isLoopbackVisualHost(hostname) {
  const value = String(hostname || "").toLowerCase();
  return value === "127.0.0.1" || value === "localhost" || value === "::1" || value === "[::1]";
}

function normalizeVisualAssetUrl(url) {
  const value = String(url || "").trim();
  if (!value || value.startsWith("data:")) return value;

  const apiBase = activeSynapseApiBase();
  if (!apiBase) return value;

  try {
    const apiUrl = new URL(apiBase);
    if (value.startsWith("/assets/visuals/")) {
      return `${apiUrl.origin}${value}`;
    }

    const parsed = new URL(value);
    if (!parsed.pathname.startsWith("/assets/visuals/")) return value;
    if (!isLoopbackVisualHost(parsed.hostname)) return value;
    if (parsed.origin === apiUrl.origin) return value;
    return `${apiUrl.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return value;
  }
}

function normalizeLearningFigures(items) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      if (!item || typeof item !== "object") return item;
      const explicitIndex = Number(item.index);
      const explicitId = Number(item.id);
      return {
        ...item,
        index: Number.isFinite(explicitIndex)
          ? explicitIndex
          : (Number.isFinite(explicitId) ? explicitId : index),
        url: normalizeVisualAssetUrl(item.url)
      };
    })
    .filter(item => item && typeof item === "object");
}

function getLearningFigureByMarker(index) {
  const markerIndex = Number(index);
  if (!Number.isFinite(markerIndex)) return null;
  const figures = normalizeLearningFigures(visualGalleryData);
  const byStoredIndex = figures.find(item => Number(item?.index) === markerIndex);
  if (!byStoredIndex) return null;
  // Backend visual cards are selected to match generated [[VISUAL:n]] markers.
  // Marker lookup also keeps older saved notes renderable.
  return byStoredIndex;
}

function cleanSourceFigureDisplayText(value) {
  return String(value || "")
    .replace(/\b(?:IN-TEXT SOURCE FIGURE|VISUAL EVIDENCE)\s+FROM\s+.+?\s+—\s+/gi, "")
    .replace(/\b(?:embedded image on\s+)?(?:PPT slide|PDF page|slide|page)\s+\d+\s*\.?\s*/gi, "")
    .replace(/\b(?:Current slide text preview|Nearby slide context|Page text preview|Slide text preview)\s*:\s*/gi, "")
    .replace(/\bTeaching-signal-count=\d+;\s*decorative-signal-count=\d+(?:;\s*visual-score=-?\d+)?\.?/gi, "")
    .replace(/\bImage-count=\d+;\s*drawing-count=\d+;\s*visual-score=-?\d+\.?/gi, "")
    .replace(/\bUse only if the actual image is\b.*$/gi, "")
    .replace(/\bThis is an image extracted from the slide, not the full slide screenshot\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulVisualDetailText(value) {
  const text = cleanSourceFigureDisplayText(value);
  if (!text || text.length < 14) return false;
  if (/^(image|picture|visual|source figure|figure)$/i.test(text)) return false;
  if (/\b(direct support|nearby concept|uploaded material|source figure|visual evidence|connect this source figure|main concept|other uploaded materials|refer to this source figure|read alongside)\b/i.test(text)) {
    return false;
  }
  return true;
}

function getVisualDetailText(item, keys) {
  for (const key of keys) {
    const value = cleanSourceFigureDisplayText(item?.[key] || "");
    if (isUsefulVisualDetailText(value)) return value;
  }
  return "";
}

function visualDetailLanguageIsChinese(item) {
  return /[\u4e00-\u9fff]/.test(sourceFigureText(item));
}

function getDefaultVisualDetail(item, role) {
  const kind = String(item?.visual_kind || "").toLowerCase();
  const title = cleanSourceFigureDisplayText(item?.title || "this source figure");
  const isChinese = visualDetailLanguageIsChinese(item);
  const defaults = isChinese ? {
    what: "这个来源图表把正文里的概念变成可观察的证据：先看标题和图中元素，再判断它在比较什么、检验什么或展示什么关系。",
    why: `它的作用不是装饰，而是帮助学生把“${title}”和来源中的具体证据连接起来。`,
    how: kind.includes("graph") || kind.includes("chart")
      ? "先读标题和坐标轴，再看趋势、组间差异和异常点；最后用一句话说明这个模式支持或限制了哪个论点。"
      : kind.includes("table")
        ? "先看行列分别代表什么，再找关键数值、最大/最小值和组间差异；不要只复制数字，要解释数字的意义。"
        : kind.includes("experiment") || kind.includes("event")
          ? "先分清参与者、条件、步骤和结果，再说明这个设计如何检验一个理论解释。"
          : "先识别图中的标签、箭头、步骤或空间关系，再把它们连回正文中的机制或概念。",
    exam: "答题时先描述图中可见证据，再解释它说明了什么、不能说明什么，并把它连接到核心概念。"
  } : {
    what: "This source figure turns the nearby concept into visible evidence: read the title and visible elements first, then identify what is being compared, tested, sequenced, or measured.",
    why: `It is included because it helps the student connect ${title} to concrete source evidence rather than memorising the idea as an abstract label.`,
    how: kind.includes("graph") || kind.includes("chart")
      ? "Read the title and axes first, then describe the trend, group difference, or outlier before interpreting what the pattern supports or limits."
      : kind.includes("table")
        ? "Read the rows and columns first, then identify the key values and contrasts; explain what the numbers mean rather than copying them."
        : kind.includes("experiment") || kind.includes("event")
          ? "Identify the participant, conditions, sequence, and result, then explain how the design tests the theory."
          : "Identify the labels, arrows, steps, or spatial relationships, then connect them back to the mechanism or concept in the notes.",
    exam: "In an answer, describe what is visible, interpret the source evidence, state the limit or implication, and connect it back to the concept."
  };
  return defaults[role] || "";
}

function getVisualExplanationSections(item, options = {}) {
  const includeFallbacks = options.includeFallbacks !== false;
  const isChinese = visualDetailLanguageIsChinese(item);
  const sections = [
    {
      key: "what",
      label: isChinese ? "What to notice / 图中重点" : "What to notice",
      value: getVisualDetailText(item, ["what_shows", "caption"]) || (includeFallbacks ? getDefaultVisualDetail(item, "what") : "")
    },
    {
      key: "why",
      label: isChinese ? "Why it matters / 为什么重要" : "Why it matters",
      value: getVisualDetailText(item, ["why_relevant", "argument_supported", "cross_source_connection"]) || (includeFallbacks ? getDefaultVisualDetail(item, "why") : "")
    },
    {
      key: "how",
      label: isChinese ? "How to read it / 怎么读" : "How to read it",
      value: getVisualDetailText(item, ["how_to_read"]) || (includeFallbacks ? getDefaultVisualDetail(item, "how") : "")
    },
    {
      key: "exam",
      label: isChinese ? "Study use / 复习用法" : "Study use",
      value: getVisualDetailText(item, ["exam_use"]) || (includeFallbacks ? getDefaultVisualDetail(item, "exam") : "")
    },
    {
      key: "connection",
      label: isChinese ? "Connection / 知识连接" : "Connection",
      value: getVisualDetailText(item, ["cross_source_connection"])
    }
  ];
  const seen = new Set();
  return sections.filter(section => {
    const value = cleanSourceFigureDisplayText(section.value);
    if (!value) return false;
    const dedupeKey = value.toLowerCase();
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    section.value = value;
    return true;
  });
}

function renderVisualExplanationSections(item, options = {}) {
  const compact = Boolean(options.compact);
  const compactKeys = new Set(["what", "why", "exam"]);
  const limit = compact ? 3 : 5;
  const sections = getVisualExplanationSections(item)
    .filter(section => !compact || compactKeys.has(section.key))
    .slice(0, limit);
  if (!sections.length) return "";
  return `
    <div class="${compact ? "inline-visual-details" : "visual-detail-grid"}">
      ${sections.map(section => `
        <section class="visual-detail-item">
          <strong>${escapeHTML(section.label)}</strong>
          <p>${escapeHTML(compact ? shorten(section.value, 190) : section.value)}</p>
        </section>
      `).join("")}
    </div>
  `;
}

function openFilePicker() {
  assetUpload.click();
}

assetUpload.addEventListener("change", (event) => {
  addFiles([...event.target.files]);
  assetUpload.value = "";
});

["dragenter", "dragover"].forEach(type => {
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
    setUploadStatus("neutral", "Release to add your study material.");
  });
});

["dragleave", "drop"].forEach(type => {
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
    if (type === "dragleave" && uploadedFiles.length === 0) {
      setUploadStatus("neutral", "Choose a file to begin. Your files stay visible here until you analyze them.");
    }
  });
});

dropZone.addEventListener("drop", (event) => {
  addFiles([...event.dataTransfer.files]);
});

dropZone.addEventListener("click", (event) => {
  if (!event.target.closest("button")) openFilePicker();
});

if (linkInput) {
  linkInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addLinksFromInput();
    }
  });
}

function addFiles(files) {
  const nextFiles = Array.isArray(files) ? files.filter(file => file && file.name) : [];
  if (!nextFiles.length) {
    setUploadStatus("error", "We could not read that upload. Choose a file and try again.");
    flashUploadState("error");
    return;
  }
  uploadedFiles.push(...nextFiles);
  renderFilePreview();
  setUploadStatus("success", `${nextFiles.length} file${nextFiles.length === 1 ? "" : "s"} ready. Review the list below, then click Analyze materials.`);
  flashUploadState("success");
}

function renderFilePreview() {
  if (uploadedFiles.length === 0) {
    filePreview.classList.add("d-none");
    filePreview.innerHTML = "";
    setUploadStatus("neutral", "Choose a file to begin. Your files stay visible here until you analyze them.");
    return;
  }

  filePreview.classList.remove("d-none");
  filePreview.innerHTML = uploadedFiles.map((file, index) => `
    <div class="file-chip file-chip-added">
      <i class="bi ${fileIcon(file)}"></i>
      <span title="${escapeAttr(file.name)}">${escapeHTML(shorten(file.name, 42))}</span>
      <button type="button" onclick="removeFile(${index})" aria-label="Remove file">
        <i class="bi bi-x"></i>
      </button>
    </div>
  `).join("");
}

function setUploadStatus(type, message) {
  if (!uploadStatus) return;
  const icons = { success: "bi-check-circle", error: "bi-exclamation-triangle", neutral: "bi-info-circle" };
  uploadStatus.className = `upload-status upload-status-${type}`;
  uploadStatus.innerHTML = `<i class="bi ${icons[type] || icons.neutral}"></i><span>${escapeHTML(message)}</span>`;
}

function flashUploadState(type) {
  if (!dropZone) return;
  dropZone.classList.remove("upload-state-success", "upload-state-error");
  dropZone.offsetWidth;
  dropZone.classList.add(type === "success" ? "upload-state-success" : "upload-state-error");
  window.setTimeout(() => dropZone.classList.remove("upload-state-success", "upload-state-error"), 900);
}

function removeFile(index) {
  uploadedFiles.splice(index, 1);
  renderFilePreview();
}

function fileIcon(file) {
  const name = (file.name || "").toLowerCase();
  if (file.type && file.type.includes("image")) return "bi-image";
  if ((file.type && file.type.includes("pdf")) || name.endsWith(".pdf")) return "bi-file-earmark-pdf";
  if (name.endsWith(".docx")) return "bi-file-earmark-word";
  return "bi-file-earmark-text";
}

const SOURCE_LINK_CANDIDATE_PATTERN = /(?:https?:\/\/|www\.|youtube(?:-nocookie)?\.com\/|youtu\.be\/|[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s<>()]*)?)[^\s<>()]*/gi;
function cleanSourceLinkCandidate(value) {
  return String(value || "")
    .trim()
    .replace(/^[<("'“”‘’]+/g, "")
    .replace(/[>),.;!?'"\u201c\u201d\u2018\u2019]+$/g, "")
    .trim();
}

function normalizeSourceLink(value) {
  const cleaned = cleanSourceLinkCandidate(value);
  if (!cleaned) return "";
  const youtubeId = getYouTubeVideoIdClient(cleaned);
  if (youtubeId) return `https://www.youtube.com/watch?v=${youtubeId}`;
  const withProtocol = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : (/^(?:www\.|[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i.test(cleaned) ? `https://${cleaned}` : cleaned);
  try {
    const url = new URL(withProtocol);
    if (!/^https?:$/i.test(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function uniqueSourceLinks(links) {
  const seenLinks = new Set();
  const seenYoutubeIds = new Set();
  const unique = [];
  (links || []).forEach(link => {
    const normalized = normalizeSourceLink(link);
    if (!normalized) return;
    const youtubeId = getYouTubeVideoIdClient(normalized);
    if (youtubeId) {
      if (seenYoutubeIds.has(youtubeId)) return;
      seenYoutubeIds.add(youtubeId);
      unique.push(`https://www.youtube.com/watch?v=${youtubeId}`);
      return;
    }
    if (seenLinks.has(normalized)) return;
    seenLinks.add(normalized);
    unique.push(normalized);
  });
  return unique;
}

function extractSourceLinksClient(value) {
  const matches = String(value || "").match(SOURCE_LINK_CANDIDATE_PATTERN) || [];
  return uniqueSourceLinks(matches);
}

function renderLinkPreview() {
  if (!linkPreview) return;
  if (!uploadedLinks.length) {
    linkPreview.classList.add("d-none");
    linkPreview.innerHTML = "";
    return;
  }
  linkPreview.classList.remove("d-none");
  linkPreview.innerHTML = uploadedLinks.map((url, index) => {
    const isYoutube = Boolean(getYouTubeVideoIdClient(url));
    return `
      <div class="link-chip">
        <i class="bi ${isYoutube ? "bi-youtube" : "bi-link-45deg"}"></i>
        <span title="${escapeAttr(url)}">${escapeHTML(shorten(url, 68))}</span>
        <button type="button" onclick="removeLink(${index})" aria-label="Remove link">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;
  }).join("");
}

function addLinksFromInput(value = null) {
  const source = value === null ? (linkInput?.value || "") : value;
  const links = extractSourceLinksClient(source);
  if (!links.length) {
    if (linkInput && String(source || "").trim()) {
      const wrap = linkInput.closest(".multi-link-input-wrap");
      wrap?.classList.add("invalid");
      window.setTimeout(() => wrap?.classList.remove("invalid"), 1200);
    }
    return;
  }
  uploadedLinks = uniqueSourceLinks([...uploadedLinks, ...links]);
  if (linkInput && value === null) linkInput.value = "";
  renderLinkPreview();
}

function removeLink(index) {
  uploadedLinks.splice(index, 1);
  renderLinkPreview();
}

function parseMixedSources(rawSource) {
  const text = String(rawSource || "").trim();
  const links = extractSourceLinksClient(text);

  return {
    links,
    freeText: removeDetectedUrlsClient(text)
  };
}

async function analyzeMaterials() {
  return startGenerationJobFromCurrentUpload();
}

function generationSourceTitle(files = [], rawSource = "", sourceLinks = []) {
  const firstFile = files[0]?.name || "";
  if (firstFile && files.length > 1) return `${firstFile} + ${files.length - 1} more`;
  if (firstFile) return firstFile;
  if (sourceLinks.length) return shorten(sourceLinks[0], 68);
  const text = String(rawSource || "").trim().replace(/\s+/g, " ");
  return text ? shorten(text, 68) : "Study material";
}

async function startGenerationJobFromCurrentUpload() {
  const rawSource = sourceInput ? sourceInput.value.trim() : "";
  const parsedSources = parseMixedSources(rawSource);
  const sourceLinks = uniqueSourceLinks([...uploadedLinks, ...parsedSources.links]);
  const noteLengthSelect = document.getElementById("noteLength");

  if (uploadedFiles.length === 0 && !rawSource && !sourceLinks.length) {
    alert("Upload at least one file, link, video link, or text first.");
    return;
  }

  currentSourceFingerprint = await buildClientFingerprint(rawSource, sourceLinks);
  const existingJob = typeof findActiveGenerationJobByNoteId === "function"
    ? findActiveGenerationJobByNoteId(currentSourceFingerprint)
    : null;
  if (existingJob) {
    openGenerationJob(existingJob.jobId);
    updateGenerateButtonForCurrentJob();
    return existingJob;
  }

  const request = {
    rawSource,
    freeText: parsedSources.freeText,
    sourceLinks,
    uploadedLinks: [...uploadedLinks],
    fileNames: uploadedFiles.map(file => file.name || "Uploaded source"),
    hasFiles: uploadedFiles.length > 0,
    preferredLanguage: preferredLanguage ? preferredLanguage.value : "auto",
    detailLevel: detailLevel ? detailLevel.value : "auto",
    promptMode: promptMode ? promptMode.value : "professor_mode",
    noteLength: noteLengthSelect ? noteLengthSelect.value : "standard_notes",
    aiProvider: aiProvider ? normaliseAiProvider(aiProvider.value) : "",
    clientFingerprint: currentSourceFingerprint
  };
  const job = createGenerationJob({
    noteId: currentSourceFingerprint,
    classId: currentSourceFingerprint,
    sourceTitle: generationSourceTitle(uploadedFiles, rawSource, sourceLinks),
    request
  });
  openGenerationJob(job.jobId);
  setGenerateButtonForJob(job);
  enqueueGenerationJobRun(job.jobId, {
    ...request,
    parsedSources,
    files: [...uploadedFiles]
  });
  return job;
}

async function runGenerationJobAnalysis(jobId, context = {}) {
  const job = getGenerationJob(jobId);
  if (!job) return;
  const request = job.request || {};
  const rawSource = context.rawSource ?? request.rawSource ?? "";
  const parsedSources = context.parsedSources || {
    links: Array.isArray(request.sourceLinks) ? request.sourceLinks : [],
    freeText: request.freeText || ""
  };
  const sourceLinks = uniqueSourceLinks(context.sourceLinks || request.sourceLinks || []);
  const files = Array.isArray(context.files) ? context.files : [];
  const outputLanguageSetting = context.preferredLanguage || request.preferredLanguage || "auto";
  const detailLevelValue = context.detailLevel || request.detailLevel || "auto";
  const promptModeValue = context.promptMode || request.promptMode || "professor_mode";
  const noteLengthValue = context.noteLength || request.noteLength || "standard_notes";
  const aiProviderValue = normaliseAiProvider(context.aiProvider || request.aiProvider || "");
  const previousUploadedFiles = uploadedFiles;
  const previousUploadedLinks = uploadedLinks;
  const previousHistoryId = currentHistoryId;
  uploadedFiles = files;
  uploadedLinks = Array.isArray(context.uploadedLinks) ? context.uploadedLinks : (request.uploadedLinks || []);
  currentSourceFingerprint = job.noteId || request.clientFingerprint || currentSourceFingerprint;
  upsertGenerationJob({
    jobId,
    status: "analysing",
    progress: 18,
    message: "Reading sources and preparing context"
  });
  const buildAnalyzeFormData = () => {
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    formData.append("links", JSON.stringify(sourceLinks));
    formData.append("free_text", parsedSources.freeText);
    formData.append("preferred_language", outputLanguageSetting);
    formData.append("detail_level", detailLevelValue);
    formData.append("prompt_mode", promptModeValue);
    formData.append("note_length", noteLengthValue);
    formData.append("ai_provider", aiProviderValue);
    formData.append("client_fingerprint", currentSourceFingerprint);
    return formData;
  };

  try {
    const abortController = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (abortController) runtimeGenerationJobControllers.set(jobId, abortController);
    upsertGenerationJob({
      jobId,
      status: "analysing",
      progress: 26,
      message: "Connecting to Synapse and preparing your workspace"
    });
    await apiClient.warmup({
      signal: abortController?.signal,
      attempts: 16,
      retryDelayMs: 5000,
      timeoutMs: 75000,
      maxWaitMs: 90000
    });
    upsertGenerationJob({
      jobId,
      status: "generating",
      progress: 34,
      message: "Generating tutor-style study notes"
    });
    let keepAliveId = null;
    if (typeof window !== "undefined" && window.setInterval) {
      keepAliveId = window.setInterval(() => {
        apiClient.fetch("/healthz", { method: "GET", timeoutMs: 12000 }).catch(() => {});
      }, 25000);
    }
    let response;
    try {
      response = await apiClient.fetchWithRetry("/analyze", () => ({
        method: "POST",
        body: buildAnalyzeFormData(),
        timeoutMs: ANALYSIS_TIMEOUT_MS,
        signal: abortController?.signal
      }), {
        attempts: 4,
        retryDelayMs: 4000,
        retryOnConnectionError: true,
        onRetry: ({ attempt, totalAttempts, reason }) => {
          upsertGenerationJob({
            jobId,
            status: "generating",
            progress: Math.min(48, 34 + attempt * 3),
            message: `Hosted service interrupted (${reason}). Retrying analysis ${attempt + 1}/${totalAttempts}…`
          });
        }
      });
    } catch (error) {
      if (error?.name === "ApiConnectionError" && error.code !== "cancelled" && error.code !== "timeout") {
        throw new Error(
          typeof apiClient.analysisInterruptedMessage === "function"
            ? apiClient.analysisInterruptedMessage()
            : error.message
        );
      }
      throw error;
    } finally {
      if (keepAliveId) window.clearInterval(keepAliveId);
    }

    let data = null;
    try {
      const contentType = response.headers?.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        const body = await response.text().catch(() => "");
        const preview = body ? ` Response preview: ${shorten(body.replace(/\s+/g, " "), 180)}` : "";
        throw new Error(
          `Backend returned ${contentType || "non-JSON"} from ${response.url || apiClient.endpoint("/analyze")} (HTTP ${response.status}). Make sure the Python backend is running at ${apiClient.baseUrl}.${preview}`
        );
      }
      data = await response.json();
    } catch (error) {
      throw new Error(error?.message || "Backend returned non-JSON response. Check the Python terminal.");
    }

    if (!response.ok || data.error) {
      throw new Error(data.error || `Analysis failed with status ${response.status}.`);
    }

    const outputLanguage = outputLanguageSetting;
    fullSummary = removeAutoBilingualHeadings(data.summary || "", outputLanguage);
    storedTitle = data.title || makeHistoryTitle(fullSummary) || "Study Notes";
    sections = cleanAutoLanguageSectionTitles(hydrateSectionsFromSummary(data.sections || {}, fullSummary), fullSummary, outputLanguage);
    fullSummary = ensureRenderableSummary(fullSummary, sections);
    connectionsData = data.connections || [];
    currentMindMap = data.mind_map || data.mindMap || data.brainstorm || null;
    visualGalleryData = normalizeLearningFigures(data.visual_gallery || data.source_evidence_cards || data.figure_cards || data.visuals || []);
    fullSummary = pruneUnavailableVisualMarkers(fullSummary, visualGalleryData);
    sections = Object.fromEntries(Object.entries(sections).map(([title, markdown]) => [
      title,
      pruneUnavailableVisualMarkers(markdown, visualGalleryData)
    ]));
    currentPrimarySourceIdentity = data.primary_source_identity || data.source_identity || "";
    currentPromptMode = data.prompt_mode || promptModeValue;
    currentPromptModeLabel = data.prompt_mode_label || "";
    currentAiGeneration = normaliseAiGenerationDiagnostics(data.ai_generation || null);
    currentHistoryId = "";
    resetTimelineState();
    resetVisualGuideState();
    resetQuizState();
    resetFlashcardState();
    resetVoiceTutorState();
    activeMindBranchIndex = 0;
    activeMindPointIndex = 0;
    activeMindChildIndex = -1;
    mindDetailPopupOpen = false;
    collapsedMindBranches = new Set();
    currentSourceFingerprint = data.source_fingerprint || currentSourceFingerprint;
    await buildCurrentSourceItems(rawSource, data.sources || []);
    console.info("Synapse adaptive depth", {
      depth: data.generation_depth || data.detail_level,
      label: data.depth_label,
      reason: data.depth_reason,
      promptMode: data.prompt_mode || promptModeValue,
      noteLength: data.note_length || noteLengthValue,
      aiProvider: data.ai_provider || aiProviderValue,
      aiGeneration: currentAiGeneration,
      cached: Boolean(data.cached)
    });

    const shouldPresentJobResult = isGenerationJobSelected(jobId);
    if (shouldPresentJobResult) {
      showAnalysisView({ scrollToTop: true });
      renderSections();
      renderConnections();
      switchTool("mindmap");
      renderMindMap(currentMindMap);
      renderVisualGallery();
    }
    let dataApiRecord = null;
    if (typeof persistGeneratedContentToDataApi === "function") {
      try {
        dataApiRecord = await persistGeneratedContentToDataApi({
          ...data,
          title: data.title || storedTitle,
          summary: fullSummary,
          sections,
          connections: connectionsData,
          mind_map: currentMindMap,
          visual_gallery: compactVisualGalleryForStorage(visualGalleryData),
          visuals: compactVisualGalleryForStorage(visualGalleryData),
          sources: data.sources || [],
          source_fingerprint: data.source_fingerprint || currentSourceFingerprint,
          client_fingerprint: currentSourceFingerprint,
          output_language: data.output_language || outputLanguage
        });
      } catch (error) {
        console.warn("Synapse data API save failed after analysis:", {
          error,
          title: storedTitle,
          sourceFingerprint: currentSourceFingerprint
        });
        dataApiRecord = null;
      }
    }
    const savedEntry = saveHistoryEntry({
      title: data.title || null,
      summary: fullSummary,
      sections,
      connections: connectionsData,
      mindMap: currentMindMap,
      // Store only compact browser-safe visual metadata. Large base64 images are
      // filtered out by compactVisualGalleryForStorage before localStorage write.
      visualGallery: compactVisualGalleryForStorage(visualGalleryData),
      language: data.output_language || outputLanguage,
      detailLevel: data.detail_level || data.generation_depth || "auto",
      depthLabel: data.depth_label || data.generation_depth || data.detail_level || "Auto",
      depthReason: data.depth_reason || "",
      promptMode: data.prompt_mode || promptModeValue,
      promptModeLabel: data.prompt_mode_label || "",
      noteLength: data.note_length || noteLengthValue,
      noteLengthLabel: data.note_length_label || "",
      aiProvider: data.ai_provider || aiProviderValue,
      aiGeneration: currentAiGeneration,
      sourceFingerprint: data.source_fingerprint || currentSourceFingerprint,
      clientFingerprint: currentSourceFingerprint,
      primarySourceIdentity: data.primary_source_identity || data.source_identity || "",
      sources: data.sources || [],
      sourceItems: compactSourceItemsForHistory(sourceViewerItems),
      visualGalleryCount: visualGalleryData.length,
      databaseRecord: dataApiRecord || data.database_record || null,
      cached: Boolean(data.cached)
    });
    if (savedEntry && savedEntry.id) {
      currentHistoryId = savedEntry.id;
      safeSetLocalStorage(ACTIVE_HISTORY_KEY, savedEntry.id);
      if (typeof recordStudyActivity === "function") recordStudyActivity("notes_ready", {
        tool: "notes",
        label: `Generated notes with ${Object.keys(sections || {}).length} sections`,
        metadata: { sectionCount: Object.keys(sections || {}).length, cached: Boolean(data.cached) }
      });
      upsertGenerationJob({
        jobId,
        status: "completed",
        progress: 100,
        message: "Study notes are ready",
        resultId: savedEntry.id,
        completedAt: new Date().toISOString(),
        error: ""
      });
      await saveVisualGalleryAssets(savedEntry.id, savedEntry.sourceFingerprint || currentSourceFingerprint, visualGalleryData);
      await saveSourceAssets(savedEntry.id, savedEntry.sourceFingerprint || currentSourceFingerprint, sourceViewerItems);
      if (!visualGalleryData.length) {
        const restoredVisuals = await loadVisualGalleryAssets(savedEntry.id, savedEntry.sourceFingerprint || currentSourceFingerprint);
        if (restoredVisuals.length) {
          visualGalleryData = normalizeLearningFigures(restoredVisuals);
          renderVisualGallery();
        }
      }
    }
    if (shouldPresentJobResult) {
      loadTimelineForCurrentNote();
      loadVisualGuideForCurrentNote();
      loadQuizHistoryForCurrentNote();
      loadFlashcardsForCurrentNote();
      loadTutorChatHistoryForCurrentNote();
      loadVoiceTutorHistoryForCurrentNote();
      renderMasteryGraphPanel();
      renderFullNotes();
      requestAnimationFrame(() => renderMindMap(currentMindMap));
    } else if (previousHistoryId && getHistory().some(item => item.id === previousHistoryId)) {
      await loadHistoryEntry(previousHistoryId, { preserveScroll: true });
    }
  } catch (error) {
    console.error(error);
    const wasCancelled = getGenerationJob(jobId)?.status === "cancelled";
    if (!wasCancelled) {
      upsertGenerationJob({
        jobId,
        status: "failed",
        progress: 100,
        message: "Generation failed",
        error: error.message || "Synapse could not generate this note."
      });
      if (isGenerationJobSelected(jobId)) {
        renderGenerationJobProgress(jobId);
      }
    }
  } finally {
    uploadedFiles = previousUploadedFiles;
    uploadedLinks = previousUploadedLinks;
    updateGenerateButtonForCurrentJob();
  }
}

function resetGenerateButton() {
  if (!generateBtn) return;
  generateBtn.disabled = false;
  generateBtn.innerHTML = `<i class="bi bi-stars me-2"></i>Analyze with Synapse`;
}

function setGenerateButtonForJob(job = {}) {
  if (!generateBtn) return;
  const status = job.status || "generating";
  const isActive = ["queued", "analysing", "generating"].includes(status);
  generateBtn.disabled = isActive;
  generateBtn.innerHTML = isActive
    ? `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Generating...`
    : `<i class="bi bi-stars me-2"></i>Analyze with Synapse`;
}

function updateGenerateButtonForCurrentJob() {
  if (!generateBtn) return;
  const activeJob = typeof findActiveGenerationJobByNoteId === "function"
    ? findActiveGenerationJobByNoteId(currentSourceFingerprint)
    : null;
  if (activeJob) setGenerateButtonForJob(activeJob);
  else resetGenerateButton();
}

function setGeneratingState(isGenerating) {
  if (isGenerating) setGenerateButtonForJob({ status: "generating" });
  else resetGenerateButton();
}

function resolveUploadedFilesForRetry(fileNames = []) {
  const names = (Array.isArray(fileNames) ? fileNames : []).map(name => String(name || "Uploaded source"));
  if (!names.length || !Array.isArray(uploadedFiles) || !uploadedFiles.length) return [];
  const used = new Set();
  const matched = [];
  for (const name of names) {
    const index = uploadedFiles.findIndex((file, fileIndex) => {
      if (used.has(fileIndex)) return false;
      return String(file?.name || "Uploaded source") === name;
    });
    if (index < 0) return [];
    used.add(index);
    matched.push(uploadedFiles[index]);
  }
  return matched;
}

async function saveUploadRetryPayload(jobId, context = {}) {
  const id = String(jobId || "");
  if (!id || typeof indexedDB === "undefined") return;
  const files = Array.isArray(context.files) ? context.files : [];
  const serializedFiles = [];
  for (const file of files) {
    if (!file) continue;
    serializedFiles.push({
      name: String(file.name || "Uploaded source"),
      type: String(file.type || "application/octet-stream"),
      lastModified: Number(file.lastModified || Date.now()),
      buffer: await file.arrayBuffer()
    });
  }
  const db = await openUploadRetryDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(UPLOAD_RETRY_STORE_CONFIG.storeName, "readwrite");
      tx.objectStore(UPLOAD_RETRY_STORE_CONFIG.storeName).put({
        id: `job:${id}`,
        updatedAt: Date.now(),
        sourceLinks: Array.isArray(context.sourceLinks) ? context.sourceLinks : [],
        uploadedLinks: Array.isArray(context.uploadedLinks) ? context.uploadedLinks : [],
        freeText: String(context.freeText || ""),
        rawSource: String(context.rawSource || ""),
        files: serializedFiles
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to save upload retry payload."));
    });
  } finally {
    db.close();
  }
}

function openUploadRetryDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(UPLOAD_RETRY_STORE_CONFIG.dbName, UPLOAD_RETRY_STORE_CONFIG.version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(UPLOAD_RETRY_STORE_CONFIG.storeName)) {
        const store = db.createObjectStore(UPLOAD_RETRY_STORE_CONFIG.storeName, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open upload retry cache."));
  });
}

async function loadUploadRetryPayload(jobId) {
  const id = String(jobId || "");
  if (!id || typeof indexedDB === "undefined") return null;
  const db = await openUploadRetryDb();
  try {
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(UPLOAD_RETRY_STORE_CONFIG.storeName, "readonly");
      const request = tx.objectStore(UPLOAD_RETRY_STORE_CONFIG.storeName).get(`job:${id}`);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Failed to load upload retry payload."));
    });
    if (!record) return null;
    const files = (Array.isArray(record.files) ? record.files : []).map(entry => new File(
      [entry.buffer],
      String(entry.name || "Uploaded source"),
      {
        type: String(entry.type || "application/octet-stream"),
        lastModified: Number(entry.lastModified || Date.now())
      }
    ));
    return {
      sourceLinks: Array.isArray(record.sourceLinks) ? record.sourceLinks : [],
      uploadedLinks: Array.isArray(record.uploadedLinks) ? record.uploadedLinks : [],
      freeText: String(record.freeText || ""),
      rawSource: String(record.rawSource || ""),
      files
    };
  } finally {
    db.close();
  }
}

async function clearUploadRetryPayload(jobId) {
  const id = String(jobId || "");
  if (!id || typeof indexedDB === "undefined") return;
  const db = await openUploadRetryDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(UPLOAD_RETRY_STORE_CONFIG.storeName, "readwrite");
      tx.objectStore(UPLOAD_RETRY_STORE_CONFIG.storeName).delete(`job:${id}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to clear upload retry payload."));
    });
  } finally {
    db.close();
  }
}

async function retryGenerationJobFromUpload(job = {}) {
  const request = job.request || {};
  const retained = typeof runtimeGenerationJobRetryPayloads !== "undefined"
    ? runtimeGenerationJobRetryPayloads.get(job.jobId)
    : null;
  let files = Array.isArray(retained?.files) ? [...retained.files] : [];
  let sourceLinks = uniqueSourceLinks(
    retained?.sourceLinks || request.sourceLinks || []
  );
  let uploadedLinks = Array.isArray(retained?.uploadedLinks)
    ? [...retained.uploadedLinks]
    : (Array.isArray(request.uploadedLinks) ? [...request.uploadedLinks] : []);
  let freeText = retained?.freeText ?? request.freeText ?? "";
  let rawSource = retained?.rawSource ?? request.rawSource ?? "";

  if (request.hasFiles && !files.length) {
    files = resolveUploadedFilesForRetry(request.fileNames);
  }
  if (request.hasFiles && !files.length) {
    const restored = await loadUploadRetryPayload(job.jobId);
    if (restored?.files?.length) {
      files = restored.files;
      if (!sourceLinks.length) sourceLinks = uniqueSourceLinks(restored.sourceLinks || []);
      if (!uploadedLinks.length) uploadedLinks = Array.isArray(restored.uploadedLinks) ? restored.uploadedLinks : [];
      if (!freeText) freeText = restored.freeText || "";
      if (!rawSource) rawSource = restored.rawSource || "";
    }
  }
  if (request.hasFiles && !files.length) return false;

  if (files.length) uploadedFiles = [...files];
  uploadedLinks = [...uploadedLinks];
  if (sourceInput && rawSource) sourceInput.value = rawSource;

  upsertGenerationJob({
    jobId: job.jobId,
    status: "queued",
    progress: 4,
    message: "Queued for retry",
    error: ""
  });
  openGenerationJob(job.jobId);
  enqueueGenerationJobRun(job.jobId, {
    ...request,
    rawSource,
    freeText,
    sourceLinks,
    uploadedLinks,
    parsedSources: {
      links: sourceLinks,
      freeText
    },
    files: [...files]
  });
  return true;
}



function showAnalysisView({ scrollToTop = false } = {}) {
  if (typeof setLearningExperienceMode === "function") {
    setLearningExperienceMode("materials");
  }
  if (uploadStage) uploadStage.classList.add("d-none");
  if (analysisStage) analysisStage.classList.remove("d-none");
  if (loadingBox) loadingBox.classList.add("d-none");
  if (resultGrid) resultGrid.classList.remove("d-none");

  appLayout.classList.remove("initial-state", "loading-state", "generation-job-state");
  appLayout.classList.add("analysis-ready", "assistant-closed", "generated-notes-state");
  if (assistant) assistant.classList.add("hidden");
  if (openAssistantBtn) openAssistantBtn.style.display = "block";
  if (typeof setWorkspaceNavTab === "function") {
    setWorkspaceNavTab("outline", { persist: true, expandRail: true });
  } else {
    syncWorkspaceNavTabUi("outline");
  }
  renderSourceViewer();
  if (typeof renderFocusRoomWorkspaceActions === "function") {
    renderFocusRoomWorkspaceActions();
  }
  if (typeof notifyFocusRoomMaterialsChanged === "function") {
    notifyFocusRoomMaterialsChanged();
  }

  if (scrollToTop) {
    requestAnimationFrame(() => {
      const header = document.querySelector(".notes-header") || analysisStage || mainNotes;
      if (header && typeof header.scrollIntoView === "function") {
        header.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (mainNotes) mainNotes.scrollTop = 0;
    });
  }
}


function renderVisualGallery() {
  if (!visualGallery) return;
  const figures = sanitizeLearningFigures(visualGalleryData).slice(0, 8);
  if (!figures.length) {
    visualGallery.classList.add("d-none");
    visualGallery.innerHTML = "";
    return;
  }

  visualGallery.classList.remove("d-none");
  visualGallery.innerHTML = `
    <div class="visual-gallery-head">
      <div>
        <h3>Source Evidence</h3>
        <p>Figures, tables, and diagrams from the uploaded material.</p>
      </div>
      <span>${figures.length} item${figures.length === 1 ? "" : "s"}</span>
    </div>
    <div class="visual-gallery-grid">
      ${figures.map((item, fallbackIndex) => {
        const index = Number.isFinite(Number(item.index)) ? Number(item.index) : fallbackIndex;
        const title = cleanSourceFigureDisplayText(item.title) || `Source figure ${index + 1}`;
        const caption = (
          getVisualDetailText(item, ["what_shows", "caption"]) ||
          getVisualDetailText(item, ["why_relevant", "argument_supported", "cross_source_connection"]) ||
          cleanSourceFigureDisplayText(sourceFigureText(item))
        );
        return `
          <figure class="visual-card" onclick="openVisualModal(${index})" role="button" tabindex="0" aria-label="Open ${escapeAttr(title)}">
            <img src="${escapeAttr(item.url)}" alt="${escapeAttr(title)}" loading="lazy">
            <figcaption>
              <strong>Source figure ${index + 1}</strong>
              <span>${escapeHTML(title)}</span>
              ${caption ? `<small>${escapeHTML(shorten(caption, 150))}</small>` : ""}
            </figcaption>
          </figure>
        `;
      }).join("")}
    </div>
  `;
}
