export const LANGUAGE_OPTIONS = [
  ["english", "English"],
  ["simplified_chinese", "简体中文"],
  ["traditional_chinese", "繁體中文"],
  ["mixed_chinese_english", "中文 + English keywords"],
  ["japanese", "日本語"],
  ["korean", "한국어"],
  ["french", "Français"],
  ["spanish", "Español"],
  ["german", "Deutsch"],
  ["italian", "Italiano"],
  ["portuguese", "Português"],
  ["arabic", "العربية"],
  ["hindi", "हिन्दी"],
  ["vietnamese", "Tiếng Việt"],
  ["thai", "ไทย"],
  ["indonesian", "Bahasa Indonesia"],
  ["malay", "Bahasa Melayu"],
  ["russian", "Русский"],
];

export const PROMPT_MODE_OPTIONS = [
  ["quick_answer", "Quick Answer", "Creates a concise answer focused on the fastest useful study points."],
  ["detailed_explanation", "Detailed Explanation", "Teaches the material in a fuller step-by-step explanation."],
  ["professor_mode", "Professional Mode", "Goes beyond the source to explain deeper meaning, useful background knowledge, concept connections, application, mistakes, and high-quality student thinking."],
  ["tutor_mode", "Tutor Mode", "Explains the source simply with guided learning support."],
  ["source_strict_research_mode", "Source-Strict Research Mode", "Uses only the uploaded source with clear evidence discipline."],
  ["assignment_apa_mode", "Assignment / APA Mode", "Shapes source material into assignment-aware structure and APA-ready guidance."],
];

export const NOTE_LENGTH_OPTIONS = [
  ["quick_review", "Quick Review", "Low content depth: core answer, key source anchors, and fastest revision value."],
  ["standard_notes", "Standard Notes", "Balanced content depth: source concepts, reasoning, examples, and revision use."],
  ["deep_study", "Deep Study", "High content depth: deeper reasoning, concept links, source examples, applications, limits, and mistakes."],
];

export const AI_PROVIDER_OPTIONS = [
  ["", "Backend default", "Use the text AI provider selected by the backend environment."],
  ["openai", "GPT", "Use the OpenAI/GPT text model configured on the backend."],
  ["gemini", "Gemini", "Use the Gemini text model configured on the backend."],
  ["deepseek", "DeepSeek", "Use the DeepSeek text model configured on the backend."],
];
