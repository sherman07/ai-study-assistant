

def _mode_specific_fallback_notes(
    prompt_mode_key: str,
    source_units: List[dict],
    visual_cards: List[dict],
    generation_language: str,
) -> str:
    points = _fallback_learning_points(source_units, visual_cards)
    topic = _fallback_topic_title(source_units, points)
    terms = _fallback_terms(points)
    first = points[0] if points else {
        "title": topic,
        "core": "The material needs to be read for its main idea, examples, reasoning, and limits.",
        "application": "Identify the concept, explain it, then apply it carefully.",
        "trap": "Do not replace explanation with a list of labels.",
    }
    first_title = first.get("title")
    visual_examples = _fallback_visual_examples(visual_cards)
    guided_example = visual_examples or (
        f"Use {first_title} as the worked example: explain what it means, why it matters, and how it would change in a new case."
    )

    if prompt_mode_key == "quick_answer":
        return (
            f"# Quick Answer: {topic}\n\n"
            "## Direct Answer\n\n"
            f"Study **{terms}** as the main learning target. The immediate point is: {first.get('core')}\n\n"
            "## Why\n\n"
            f"{_fallback_key_concepts(points, limit=3)}\n\n"
            "## What To Do / Remember\n\n"
            f"- Remember the named concepts: {terms}.\n"
            f"- When a diagram or example appears, explain what it shows and what conclusion it supports.\n"
            f"- Avoid this mistake: {first.get('trap')}\n"
            + (f"\n{visual_examples}\n" if visual_examples else "")
        )

    if prompt_mode_key == "detailed_explanation":
        return (
            f"# Detailed Explanation: {topic}\n\n"
            "## Main Idea\n\n"
            f"The material is teaching **{terms}**. The goal is to understand the idea behind the examples, not to repeat the slide or image title.\n\n"
            "## Key Concepts\n\n"
            f"{_fallback_key_concepts(points)}\n\n"
            "## Step-by-Step Explanation\n\n"
            f"1. Start with the named concept: **{first.get('title')}**.\n"
            "2. Explain the mechanism or comparison behind it in plain language.\n"
            "3. Connect the example, diagram, formula, or case to that mechanism.\n"
            "4. State the limit: what the example can show and what it cannot prove.\n\n"
            "## Examples / Diagrams / Formulas\n\n"
            f"{visual_examples or 'Use each uploaded example as a concrete test of the concept: describe it, interpret it, then explain the limit.'}\n\n"
            "## Common Confusions\n\n"
            f"{_fallback_common_traps(points)}\n\n"
            "## Practice / Revision Checklist\n\n"
            f"- Can I explain {terms} without looking at the source wording?\n"
            "- Can I connect each diagram or example to a specific concept?\n"
            "- Can I apply the same idea to a new question and state the limit?\n"
        )

    if prompt_mode_key == "tutor_mode":
        return (
            f"# Tutor Notes: {topic}\n\n"
            "## Start From The Basic Idea\n\n"
            f"Think of the material as a lesson about **{terms}**. First, name the idea. Then ask what problem, comparison, or mechanism it helps explain.\n\n"
            "## Build The Concept Step By Step\n\n"
            f"1. **Name it:** {first_title}.\n"
            f"2. **Say it simply:** {first.get('core')}\n"
            "3. **Use the example:** point to the diagram, case, or phrase that makes the idea visible.\n"
            "4. **Check the limit:** decide what the example cannot prove by itself.\n\n"
            "## Where Students Usually Get Confused\n\n"
            f"{_fallback_common_traps(points)}\n\n"
            "## Worked Example / Guided Explanation\n\n"
            f"{guided_example}\n\n"
            "## Try This\n\n"
            f"- Explain **{first_title}** in two sentences.\n"
            "- Give one new example where the same logic might apply.\n"
            "- Say one thing the uploaded example does not prove.\n\n"
            "## Check Your Understanding\n\n"
            f"- What is the concept? {terms}\n"
            "- What is the mechanism or comparison?\n"
            "- What would be a common wrong answer?\n"
        )

    if prompt_mode_key == "assignment_apa_mode":
        return (
            f"# Assignment / APA Notes: {topic}\n\n"
            "## Working Thesis / Answer\n\n"
            f"A defensible answer should argue how **{terms}** explain the problem, while using the uploaded examples as evidence and keeping the limits clear.\n\n"
            "## APA-Style Outline\n\n"
            f"1. Introduce the problem and define {terms}.\n"
            "2. Explain the mechanism or theory.\n"
            "3. Use one uploaded example as evidence.\n"
            "4. Discuss a limitation or alternative interpretation.\n"
            "5. Conclude with the implication for the question.\n\n"
            "## Evidence Paragraphs\n\n"
            f"{_fallback_key_concepts(points)}\n\n"
            "## Application / Analysis\n\n"
            f"{first.get('application')}\n\n"
            "## Counterpoint or Limitation\n\n"
            f"{_fallback_common_traps(points)}\n\n"
            "## References From Uploaded Sources\n\n"
            "Use the uploaded file titles, slide/page labels, or source names available in the material. Do not invent bibliographic details.\n"
            + (f"\n{visual_examples}\n" if visual_examples else "")
        )

    if prompt_mode_key == "source_strict_research_mode":
        source_lines = "\n".join(
            f"- {point['label']}: {point['excerpt']}"
            for point in points
        ) or "- Not enough evidence from the uploaded source."
        return (
            f"# Source-Strict Research Notes: {topic}\n\n"
            "## Source Question\n\n"
            f"What does the uploaded material show about {terms}?\n\n"
            "## Direct Source Claims\n\n"
            f"{source_lines}\n\n"
            "## Source Evidence\n\n"
            f"{visual_examples or source_lines}\n\n"
            "## Inferences Allowed By The Source\n\n"
            "Only infer relationships that follow directly from the uploaded text, diagram, table, or case.\n\n"
            "## Gaps / Limits\n\n"
            "Not enough evidence from the uploaded source for claims beyond the extracted material.\n\n"
            "## Exam / Research Use\n\n"
            "Use these points as source-safe evidence. Do not add outside facts unless another mode is selected.\n\n"
            "## Compact Revision Summary\n\n"
            f"Revise {terms} with direct examples from the uploaded material.\n"
        )

    return (
        f"# Study Notes: {topic}\n\n"
        "## Main Idea\n\n"
        f"The material is mainly about {terms}.\n\n"
        "## Key Concepts\n\n"
        f"{_fallback_key_concepts(points)}\n"
    )


def generate_reference_style_multisource_notes(
    source_units: List[dict],
    preferred_language: str,
    depth_plan: dict,
    prompt_mode: str = DEFAULT_NOTE_PROMPT_MODE,
    note_length_mode: str = DEFAULT_NOTE_LENGTH_MODE,
    analysis_started_at: Optional[float] = None,
    skipped_optional_stages: Optional[List[str]] = None,
) -> str:
    """v23: controlled notes with relevant in-text diagrams/tables/charts only."""
    source_context = _v22_source_context(source_units)
    generation_language = resolve_generation_language_key(preferred_language, source_context)
    language_rule = language_instruction_for_generation(preferred_language, source_context)
    prompt_mode_key = normalise_note_prompt_mode(prompt_mode)
    note_length_key = normalise_note_length_mode(note_length_mode)
    is_source_strict = prompt_mode_key == "source_strict_research_mode"
    is_professional_mode = prompt_mode_key == "professor_mode"
    mode_uses_selected_length = is_source_strict or is_professional_mode
    recommended_structure = note_structure_for_language(generation_language, source_context, prompt_mode_key)
    prompt_mode_label = note_prompt_mode_label(prompt_mode_key)
    note_length_label = note_length_mode_label(note_length_key)
    note_length_min_words, note_length_max_words = note_length_mode_word_bounds(note_length_key)
    mode_min_units = (
        note_length_mode_unit_target(note_length_key, env_int("CONTROLLED_MIN_OUTPUT_UNITS", 980))
        if mode_uses_selected_length
        else note_prompt_mode_min_units(prompt_mode_key, env_int("CONTROLLED_MIN_OUTPUT_UNITS", 2600))
    )
    # Captions are strong textual evidence, but a YouTube-only source normally
    # has no extractable PDF/slide figures. The previous fixed 980-unit gate
    # rejected otherwise grounded video notes and replaced them with a generic
    # local scaffold. Keep a substantial standard for video lessons while
    # judging them on transcript evidence rather than nonexistent visuals.
    youtube_only_source = bool(source_units) and all(
        str(unit.get("source_identity") or "").startswith("youtube:")
        for unit in source_units
    )
    if youtube_only_source:
        mode_min_units = min(mode_min_units, env_int("YOUTUBE_MIN_OUTPUT_UNITS", 620))
    allow_note_expansion = note_prompt_mode_allows_expansion(prompt_mode_key) and (
        note_length_mode_allows_expansion(note_length_key) if mode_uses_selected_length else True
    )
    allow_visual_model, visual_model_timeout = visual_card_model_budget(
        analysis_started_at,
        skipped_optional_stages,
    )
    visual_cards = generate_visual_argument_cards(
        source_units,
        source_context,
        generation_language,
        allow_model=allow_visual_model,
        request_timeout=visual_model_timeout,
    )
    visual_cards = _v23_renderable_visual_cards(visual_cards, browser_urls=False, limit=CONTROLLED_MAX_VISUALS)
    visual_context = _v22_visual_context_for_prompt(visual_cards)
    source_list = "\n".join(
        f"Source {i}: {u.get('title_candidate') or u.get('display_name')}"
        for i, u in enumerate(source_units or [], start=1)
    )
    prompt = build_note_prompt({
        "prompt_mode": prompt_mode_key,
        "prompt_mode_label": prompt_mode_label,
        "language_rule": language_rule,
        "note_length_label": note_length_label,
        "note_length_min_words": note_length_min_words,
        "note_length_max_words": note_length_max_words,
        "source_list": source_list,
        "source_context": source_context,
        "visual_context": visual_context if visual_context else "No relevant source figures were selected. Do not invent visual-card content.",
        "recommended_structure": recommended_structure,
    })
    try:
        result = generate_chat(
            [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
            model=model_for_depth("detailed"),
            temperature=0,
            max_tokens=CONTROLLED_OUTPUT_TOKENS,
            request_timeout=analysis_model_call_timeout(
                analysis_started_at,
                reserve_seconds=env_int("POST_NOTES_STAGE_BUFFER_SECONDS", 15),
            ),
        ).strip()
        if not result or is_refusal_or_useless_response(result):
            raise RuntimeError("Relevant visual notes were too short or unusable.")
        if count_readable_units(result) < mode_min_units:
            raise RuntimeError("Relevant visual notes were too short or unusable.")
        source_has_table_or_data = bool(re.search(
            r"\b(table|figure|fig\.|graph|chart|plot|correlation|experiment|study|results?|data|mean|median|percentage|rate|comparison)\b|图|表|数据|实验|结果|对比",
            source_context,
            flags=re.I,
        ))
        table_count = markdown_table_count(result)
        quality_gaps = advanced_notes_quality_flags(result, source_context)
        required_table_count = 1 if is_source_strict else ADVANCED_NOTES_MIN_TABLES
        if is_source_strict and table_count >= required_table_count:
            quality_gaps = [gap for gap in quality_gaps if gap != "missing comparison/evidence tables"]
        should_expand = (
            os.getenv("ENABLE_CONDITIONAL_NOTE_EXPANSION", "true").lower() not in {"0", "false", "no"}
            and allow_note_expansion
            and (
                bool(quality_gaps)
                or (source_has_table_or_data and table_count < required_table_count)
            )
        )
        if should_expand and not analysis_stage_has_budget(
            analysis_started_at,
            env_int("NOTE_EXPANSION_STAGE_MIN_SECONDS", 90),
        ):
            record_skipped_analysis_stage(skipped_optional_stages, "note_expansion")
            should_expand = False
        if should_expand:
            result = expand_sparse_inline_summary(
                result,
                source_context,
                visual_context,
                generation_language,
                RICH_INLINE_MIN_OUTPUT_UNITS,
                force=bool(quality_gaps) or (source_has_table_or_data and table_count < required_table_count),
                quality_gaps=quality_gaps,
                prompt_mode=prompt_mode_key,
            )
    except Exception as error:
        if "_record_ai_call_event" in globals():
            _record_ai_call_event({
                "stage": "main_notes",
                "provider": active_text_provider() if "active_text_provider" in globals() else AI_TEXT_PROVIDER,
                "model": model_for_depth("detailed") if "model_for_depth" in globals() else CHAT_MODEL,
                "status": "error",
                "api_request_attempted": False,
                "error_type": type(error).__name__,
                "error": _sanitize_ai_error(error) if "_sanitize_ai_error" in globals() else str(error),
            })
        raise
    result = enforce_thetawave_inline_note_format(result, visual_cards, generation_language)
    result = remove_auto_bilingual_heading_leakage(result, preferred_language, source_context)
    result = polish_note_readability_markdown(result, generation_language)
    result = ensure_markdown_note_headings(result, generation_language)
    final_result = strip_visual_card_pollution(result)
    final_result = polish_note_readability_markdown(final_result, generation_language)
    return strip_visual_card_pollution(remove_standalone_visual_diagram_headings(final_result))


def append_source_references(summary: str, source_units: Optional[List[dict]]) -> str:
    """Make every generated note auditable without inventing citations."""
    text = (summary or "").strip()
    units = [unit for unit in (source_units or []) if isinstance(unit, dict)]
    if not text or not units or re.search(r"^##\s+(?:Sources used|Sources|References)\b", text, flags=re.I | re.M):
        return text

    references = []
    for index, unit in enumerate(units, start=1):
        title = normalise_space(unit.get("title_candidate") or unit.get("display_name") or f"Source {index}")
        identity = str(unit.get("source_identity") or "")
        url = str(unit.get("url") or unit.get("embedded_url") or "").strip()
        if identity.startswith("youtube:"):
            evidence = f"YouTube transcript analysed ({int(unit.get('transcript_characters') or 0):,} characters)"
        elif identity.startswith("text:"):
            evidence = "Pasted source text"
        else:
            evidence = "Uploaded or linked source"
        label = f"**Source {index}: {title}** — {evidence}"
        references.append(f"- {label}{f' ([Open source]({url}))' if url else ''}")
    return f"{text}\n\n## Sources used\n\n" + "\n".join(references)


def attach_visual_argument_section(summary: str, source_units: List[dict], preferred_language: str) -> str:
    """Prepare source-figure cards and keep their markers in the relevant note flow."""
    cards = rebuild_cached_visual_argument_cards(source_units, preferred_language)
    text = strip_visual_card_pollution(summary or "")
    return enforce_thetawave_inline_note_format(text, cards, preferred_language)


def finalize_generated_summary(
    summary: str,
    requested_language: str,
    generation_language: str,
    source_context: str = "",
    source_units: Optional[List[dict]] = None,
    attach_visuals: bool = True,
    protect_heading: bool = False,
    prompt_mode: str = DEFAULT_NOTE_PROMPT_MODE,
    note_length_mode: str = DEFAULT_NOTE_LENGTH_MODE,
) -> str:
    """Single post-processing path for notes returned from generation or cache."""
    text = summary or ""
    prompt_mode_key = normalise_note_prompt_mode(prompt_mode)
    text = strip_visual_card_pollution(text)
    text = remove_auto_bilingual_heading_leakage(text, requested_language, source_context)
    if protect_heading:
        text = protect_synapse_brand_and_first_heading(text, generation_language)
    text = normalise_plain_sqrt_text(text)
    text = polish_note_readability_markdown(text, generation_language)
    if attach_visuals and source_units is not None:
        text = attach_visual_argument_section(text, source_units, generation_language)
    text = dedupe_visual_markers(text)
    text = strip_visual_card_pollution(text)
    text = validate_note_output(prompt_mode_key, text, {
        "requested_language": requested_language,
        "generation_language": generation_language,
        "preferred_language": generation_language,
        "source_context": source_context,
        "source_units": source_units or [],
        "note_length_mode": note_length_mode,
    })
    text = append_source_references(text, source_units)
    text = dedupe_visual_markers(text)
    text = strip_visual_card_pollution(text)
    text = remove_auto_bilingual_heading_leakage(text, requested_language, source_context)
    text = polish_note_readability_markdown(text, generation_language)
    return strip_visual_card_pollution(text)


@app.get("/health/v23")
def health_v23():
    return {
        "status": "ok",
        "mode": "relevant_in_text_teaching_images",
        "html_css_changed": False,
        "relevant_visual_mode": RELEVANT_VISUAL_MODE,
        "candidate_pool_limit": RELEVANT_VISUAL_POOL_LIMIT,
        "pdf_visual_candidate_limit": PDF_VISUAL_CANDIDATE_LIMIT,
        "rich_inline_min_output_units": RICH_INLINE_MIN_OUTPUT_UNITS,
        "min_score": RELEVANT_VISUAL_MIN_SCORE,
        "max_in_text_visuals": CONTROLLED_MAX_VISUALS,
        "rejects_decorative_visuals": True,
        "prioritises": ["data tables", "charts/graphs", "diagrams", "experiment/event sequences", "formulas/process models"],
    }


def _v23_card_text(card: dict) -> str:
    return normalise_space(" ".join(
        str(card.get(key, ""))
        for key in (
            "title",
            "caption",
            "what_shows",
            "argument_supported",
            "cross_source_connection",
            "how_to_read",
            "exam_use",
            "location",
            "visual_kind",
        )
    ))


def _v23_card_is_teaching_figure(card: dict) -> bool:
    if not isinstance(card, dict) or not card.get("url"):
        return False
    if card.get("is_likely_decorative") or card.get("visual_kind") == "unknown":
        return False
    text = _v23_card_text(card)
    if re.search(r"\b(stock|dreamstime|getty|unsplash|product photo|phone photo|generic photo|decorative photo)\b", text, flags=re.I):
        return False
    kind = card.get("visual_kind")
    if kind in {"data/table", "graph/chart", "diagram/model", "experiment/event", "formula/calculation", "method/result figure"}:
        return True
    signals = _v23_signal_counts(text)
    return signals["teaching"] > 0 and signals["decorative"] <= signals["teaching"]


def _v23_selected_card_can_render(card: dict) -> bool:
    """Keep the browser gallery aligned with the already-inserted marker cards."""
    if not isinstance(card, dict) or not card.get("url"):
        return False
    text = _v23_card_text(card)
    if re.search(r"\b(stock|dreamstime|getty|unsplash|product photo|phone photo|generic photo|decorative photo)\b", text, flags=re.I):
        return False
    if _v23_card_is_teaching_figure(card):
        return True
    signals = _v23_signal_counts(text)
    if card.get("is_likely_decorative") and signals["decorative"] > signals["teaching"]:
        return False
    return signals["teaching"] > 0 and signals["decorative"] <= signals["teaching"] + 1


def _v23_renderable_visual_cards(cards: List[dict], browser_urls: bool = False, limit: Optional[int] = None) -> List[dict]:
    """Filter visual cards to browser-renderable items and compact marker indexes."""
    from core.visual_assets import visual_asset_url_for_browser

    max_items = None if limit is None else max(0, int(limit))
    cleaned: List[dict] = []
    for card in cards or []:
        if not _v23_selected_card_can_render(card):
            continue
        browser_url = visual_asset_url_for_browser(card.get("url", ""))
        if not browser_url:
            continue
        item = dict(card)
        item["index"] = len(cleaned)
        if browser_urls:
            item["url"] = browser_url
        cleaned.append(item)
        if max_items is not None and len(cleaned) >= max_items:
            break
    return cleaned


def build_visual_gallery(source_units: List[dict]) -> List[dict]:
    """v23 final override: return only in-text source figures, never a raw gallery."""
    cards: List[dict] = []
    for unit in source_units or []:
        cards.extend(unit.get("visual_argument_cards") or [])
    if not cards:
        cards = generate_visual_argument_cards(source_units, _v22_source_context(source_units), "auto")

    cleaned: List[dict] = []
    max_items = max(0, min(CONTROLLED_MAX_VISUALS, MULTISOURCE_VISUAL_GALLERY_LIMIT, MAX_MULTI_SOURCE_VISUAL_IMAGES))
    for marker_index, card in enumerate(_v23_renderable_visual_cards(cards, browser_urls=True, limit=max_items)):
        card_language = "simplified_chinese" if re.search(r"[\u4e00-\u9fff]", _v23_card_text(card)) else "english"
        item = _v23_enrich_visual_card_details(dict(card), source_figure_labels(card_language), card_language)
        item["index"] = marker_index
        item["title"] = normalise_space(item.get("title") or f"Source figure {marker_index + 1}")
        item["caption"] = clean_source_figure_caption(item.get("caption") or item.get("what_shows") or "")
        item["what_shows"] = clean_source_figure_caption(item.get("what_shows") or item.get("caption") or "")
        for detail_key in ("why_relevant", "argument_supported", "cross_source_connection", "how_to_read", "exam_use"):
            item[detail_key] = clean_source_figure_caption(item.get(detail_key) or "")
        cleaned.append(item)
        if len(cleaned) >= max_items:
            break
    return cleaned


def rebuild_cached_visual_argument_cards(source_units: List[dict], preferred_language: str) -> List[dict]:
    """Recreate browser-renderable source cards on cache hits without model calls."""
    cards: List[dict] = []
    for unit in source_units or []:
        cards.extend(unit.get("visual_argument_cards") or [])
    if cards:
        labels = source_figure_labels(preferred_language)
        return [
            _v23_enrich_visual_card_details(card, labels, preferred_language)
            for card in _v23_renderable_visual_cards(cards, browser_urls=False)
            if isinstance(card, dict)
        ]

    hard_limit = max(1, min(CONTROLLED_MAX_VISUALS, VISUAL_ARGUMENT_CARD_LIMIT, MAX_MULTI_SOURCE_VISUAL_IMAGES))
    candidate_pool = select_visual_candidates_for_argument(source_units, hard_limit)
    if not candidate_pool:
        return []

    labels = source_figure_labels(preferred_language)
    cards = _v23_fallback_visual_cards(candidate_pool, labels, preferred_language)
    if source_units:
        source_units[0]["visual_argument_cards"] = cards
    return cards
