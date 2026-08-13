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

  refreshAiProviderDescription();
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
requestAnimationFrame(() => {
  refreshBackendAiStatus().catch(() => {});
});

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

