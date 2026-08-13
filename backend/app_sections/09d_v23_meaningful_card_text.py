

@app.post("/translate-notes")
async def translate_notes(payload: Dict):
    """Translate an already generated notes page without losing source markers.

    The frontend renders [[VISUAL:n]] markers as in-text source cards, so this
    endpoint treats those markers as protected tokens and returns sections for
    navigation after translation.
    """
    try:
        require_text_ai()
        if not isinstance(payload, dict):
            return {"error": "Invalid translation request."}

        summary = str(payload.get("summary") or "").strip()
        if not summary:
            return {"error": "No notes were provided for translation."}

        target_language = payload.get("target_language") or "english"
        language_key = normalise_language_key(target_language)
        if language_key == "auto":
            language_key = resolve_generation_language_key("auto", summary)
        language_rule = language_instruction_for(language_key)
        title = normalise_space(str(payload.get("title") or "Study Notes"))
        original_markers = re.findall(r"\[\[VISUAL:\d+\]\]", summary)

        prompt = f"""
You are translating a Synapse study-note page for a student.

Language requirement: {language_rule}
Never translate the product name Synapse.

Critical preservation rules:
- Preserve the markdown structure: headings, bullets, numbered lists, tables, bold text, formulas, and paragraph order.
- Preserve every in-text source marker exactly, for example [[VISUAL:0]]. Do not translate, delete, renumber, or move these markers away from the nearby concept.
- Do not summarise or shorten the notes. Translate the existing detail faithfully.
- Keep source names, researcher names, article titles, file names, formulas, data values, and academic terms accurate. If a key term is better left in English, keep it and explain around it in the target language.
- Do not add new factual claims.

Return strict JSON:
{{
  "title": "translated title",
  "summary": "translated markdown notes"
}}

Title:
{title}

Notes:
{summary}
"""
        raw = generate_chat(
            [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
            model=model_for_depth("detailed"),
            temperature=0,
            max_tokens=CONTROLLED_OUTPUT_TOKENS,
        ).strip()
        parsed = extract_json_object(raw)
        translated = str(parsed.get("summary") or raw or "").strip()
        translated_title = normalise_space(str(parsed.get("title") or title))

        if translated.startswith("```"):
            translated = re.sub(r"^```(?:json|markdown)?\s*|\s*```$", "", translated, flags=re.I | re.S).strip()
        if is_refusal_or_useless_response(translated):
            return {"error": "Translation response was not usable."}

        missing_markers = [marker for marker in original_markers if marker not in translated]
        if missing_markers:
            translated = f"{translated.rstrip()}\n\n" + "\n\n".join(missing_markers)

        translated = protect_synapse_brand_and_first_heading(translated, language_key)
        translated = polish_note_readability_markdown(translated, language_key)
        translated = ensure_markdown_note_headings(translated, language_key)
        translated = normalise_plain_sqrt_text(translated)
        sections = parse_sections(translated)
        translated_title = localise_title_if_needed(translated_title, language_key)

        return {
            "title": translated_title,
            "summary": translated,
            "sections": sections,
            "output_language": language_key,
        }
    except Exception as error:
        return {"error": str(error)}


# -----------------------------------------------------------------------------
# Quiz generation
# -----------------------------------------------------------------------------

QUIZ_TYPE_LABELS = {
    "single_choice": "Single choice",
    "multiple_choice": "Multiple choice",
    "true_false": "True / False",
    "worked_problem": "Worked problem",
    "error_diagnosis": "Error diagnosis",
    "short_answer": "Short answer",
    "case_analysis": "Case analysis",
    "essay": "Essay",
}

DEFAULT_QUIZ_TYPE_PLAN = [
    {"type": "worked_problem", "count": 2},
    {"type": "error_diagnosis", "count": 1},
    {"type": "case_analysis", "count": 1},
    {"type": "short_answer", "count": 1},
    {"type": "single_choice", "count": 1},
]

QUIZ_TYPE_ALIASES = {
    "single": "single_choice",
    "single_choice": "single_choice",
    "choice": "single_choice",
    "mcq": "single_choice",
    "单选题": "single_choice",
    "单选": "single_choice",
    "multiple": "multiple_choice",
    "multiple_choice": "multiple_choice",
    "多选题": "multiple_choice",
    "多选": "multiple_choice",
    "true_false": "true_false",
    "truefalse": "true_false",
    "tf": "true_false",
    "判断题": "true_false",
    "判断": "true_false",
    "worked": "worked_problem",
    "worked_problem": "worked_problem",
    "calculation": "worked_problem",
    "problem": "worked_problem",
    "proof": "worked_problem",
    "计算题": "worked_problem",
    "解答题": "worked_problem",
    "证明题": "worked_problem",
    "error": "error_diagnosis",
    "error_diagnosis": "error_diagnosis",
    "mistake": "error_diagnosis",
    "diagnosis": "error_diagnosis",
    "错题诊断": "error_diagnosis",
    "纠错题": "error_diagnosis",
    "short": "short_answer",
    "short_answer": "short_answer",
    "简答题": "short_answer",
    "简答": "short_answer",
    "case": "case_analysis",
    "case_analysis": "case_analysis",
    "案例分析题": "case_analysis",
    "案例分析": "case_analysis",
    "essay": "essay",
    "论述题": "essay",
    "论述": "essay",
}

QUIZ_LANGUAGE_ALIASES = {
    "multi": "multi_language",
    "multilingual": "multi_language",
    "multi_language": "multi_language",
    "multi-language": "multi_language",
    "multiple_languages": "multi_language",
    "多语言": "multi_language",
    "多語言": "multi_language",
}


def normalise_quiz_language(value: str) -> str:
    raw = str(value or "english").strip()
    key = raw.lower().replace("-", "_").replace(" ", "_")
    if key in QUIZ_LANGUAGE_ALIASES:
        return QUIZ_LANGUAGE_ALIASES[key]
    language_key = normalise_language_key(key)
    return language_key if language_key != "auto" else "english"


def quiz_language_instruction(preferred_language: str) -> str:
    key = normalise_quiz_language(preferred_language)
    if key == "multi_language":
        return (
            "Use the same dominant language as the generated notes. If the notes mix languages, "
            "write clear bilingual-friendly quiz content and preserve important source academic terms "
            "in their original language when useful."
        )
    return language_instruction_for(key)


def normalise_quiz_type(value: str) -> str:
    key = normalise_space(str(value or "")).lower().replace("-", "_").replace(" ", "_")
    return QUIZ_TYPE_ALIASES.get(key) or QUIZ_TYPE_ALIASES.get(str(value or "").strip()) or "single_choice"


def clamp_quiz_count(value, default: int = 1) -> int:
    try:
        number = int(value)
    except Exception:
        number = default
    return max(1, min(number, env_int("QUIZ_MAX_QUESTIONS", 30)))
