

def requested_language_already_satisfied(summary: str, language_key: str) -> bool:
    """Avoid a second full rewrite when the primary generation already obeyed the selected language."""
    text = summary or ""
    if not text.strip():
        return True

    cjk = len(re.findall(r"[\u4e00-\u9fff]", text))
    japanese = len(re.findall(r"[\u3040-\u30ff]", text))
    korean = len(re.findall(r"[\uac00-\ud7af]", text))
    arabic = len(re.findall(r"[\u0600-\u06ff]", text))
    devanagari = len(re.findall(r"[\u0900-\u097f]", text))
    thai = len(re.findall(r"[\u0e00-\u0e7f]", text))
    cyrillic = len(re.findall(r"[\u0400-\u04ff]", text))
    latin_words = len(re.findall(r"\b[A-Za-z]{3,}\b", text))
    non_latin = cjk + japanese + korean + arabic + devanagari + thai + cyrillic

    if language_key == "english":
        return non_latin <= max(40, latin_words * 0.18)
    if language_key == "mixed_chinese_english":
        return contains_enough_chinese(text)
    if language_key in {"simplified_chinese", "traditional_chinese"}:
        if not contains_enough_chinese(text):
            return False
        simplified_only = "这习学义证据图复总览语体会与应关数实验证结对观问题说读写"
        traditional_only = "這習學義證據圖複總覽語體會與應關數實驗證結對觀問題說讀寫"
        simplified_hits = sum(text.count(char) for char in simplified_only)
        traditional_hits = sum(text.count(char) for char in traditional_only)
        if language_key == "simplified_chinese":
            return traditional_hits <= max(3, simplified_hits * 0.2)
        return traditional_hits >= max(2, simplified_hits * 0.5)

    script_counts = {
        "japanese": japanese,
        "korean": korean,
        "arabic": arabic,
        "hindi": devanagari,
        "thai": thai,
        "russian": cyrillic,
    }
    if language_key in script_counts:
        count = script_counts[language_key]
        return count >= 40 or count >= max(12, latin_words * 0.25)

    return False


def enforce_requested_language(summary: str, preferred_language: str, request_timeout: Optional[float] = None) -> str:
    """
    Universal language enforcement.
    If the user selects any specific output language, rewrite the whole notes into that language.
    This keeps Generated Content, headings, examples, common mistakes, and critical-thinking questions consistent.
    """
    key = normalise_language_key(preferred_language)
    if key == "auto" or not summary:
        return summary
    if requested_language_already_satisfied(summary, key):
        return summary

    language_name = target_language_name(key)
    language_rule = language_instruction_for(key)
    prompt = f"""
Rewrite the following study notes so they fully follow the selected output language.

Selected language: {language_name}
Language rule: {language_rule}

Strict requirements:
- Preserve the same study meaning and source facts.
- Preserve the same markdown structure using headings with # or ##.
- Translate/rewrite headings, explanations, examples, common mistakes, and critical-thinking questions into the selected language.
- Never translate the product name Synapse. If a heading says "Synapse Summary", rewrite it as the selected-language equivalent of "Overview" instead of translating Synapse.
- Do not add new facts.
- Do not remove important facts, examples, subsections, section numbers, legal duties, calculations, exceptions, or caveats.
- Keep the same level of detail as the original analysis; do not compress the notes during rewriting.
- Keep official names, formulas, code, and short technical terms unchanged only when translation would reduce accuracy.
- Keep mathematical notation readable: use √(x), (a)/(b), r'(t)=<1,2,6t>, and never raw escaped LaTeX like \\( ... \\).
- Output only the rewritten notes.

NOTES TO REWRITE:
{summary}
"""
    try:
        rewritten = generate_chat([
            {"role": "system", "content": "You are a precise multilingual academic editor. You rewrite study notes into the user's selected language while preserving structure, meaning, source faithfulness, and the exact brand name Synapse."},
            {"role": "user", "content": prompt},
        ], model=analysis_model_for_active_provider(), temperature=0, max_tokens=12000, request_timeout=request_timeout)
        return rewritten or summary
    except Exception:
        return summary


def localise_title_if_needed(title: str, preferred_language: str, request_timeout: Optional[float] = None) -> str:
    key = normalise_language_key(preferred_language)
    if key in {"auto", "english"} or not title:
        return title
    language_name = target_language_name(key)
    try:
        result = generate_chat([
            {"role": "system", "content": "Translate or localise a short study-note title. Return only the title, no punctuation around it."},
            {"role": "user", "content": f"Translate/localise this title into {language_name}. Keep official legal act names understandable and concise. Never translate the brand name Synapse. Title: {title}"},
        ], model=title_model_for_active_provider(), temperature=0, max_tokens=80, request_timeout=request_timeout)
        return normalise_space(result)[:90] or title
    except Exception:
        return title
