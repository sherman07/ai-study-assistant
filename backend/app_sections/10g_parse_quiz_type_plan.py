

@app.post("/visual-guide/generate")
async def generate_visual_guide(data: dict):
    try:
        require_text_ai()
        data = data or {}
        title = clean_quiz_string(data.get("title"), stored_title or "Study Material")
        context = quiz_summary_context(data)
        source_context = visual_guide_source_context(data)
        figure_context = visual_guide_figure_context(data)
        if not context:
            return {"error": "No generated notes are available for visual guide generation yet."}
        requested_language = data.get("preferred_language", "auto")
        preferred_language = (
            resolve_generation_language_key("auto", context)
            if normalise_language_key(requested_language) == "auto"
            else normalise_quiz_language(requested_language)
        )

        language_rule = quiz_language_instruction(preferred_language)
        schema = """
Return JSON only with this exact shape. Keep keys in English; user-facing values must follow the language requirement:
{
  "title": "visual guide title",
  "subtitle": "one-line framing sentence",
  "thesis": "what this source is really teaching",
  "coverage_note": "how the guide covers the whole source",
  "flow": [{"label": "Step", "text": "short explanation"}],
  "panels": [
    {
      "kicker": "short label",
      "title": "panel title",
      "body": "main explanation",
      "key_points": ["point 1", "point 2"],
      "source_evidence": "specific source evidence, example, formula, table, figure, or claim",
      "visual_type": "concept | process | comparison | evidence | formula | timeline | case | source",
      "visual_prompt": "what the frontend should draw visually; include layout, icons, arrows, color zones, and image role",
      "formula": "optional MathJax formula",
      "source_refs": ["Source 1", "Source figure 2"],
      "source_figure_indexes": [0]
    }
  ],
  "source_map": [{"source": "Source name", "role": "what it contributes", "evidence": "specific evidence used"}],
  "review_prompts": ["what the student should be able to explain"],
  "image_queries": ["2-4 short web image search phrases for missing visuals"]
}
"""
        prompt = f"""
Create a high-quality visual study guide script from the user's generated notes and source evidence.

Language requirement: {language_rule}
Topic/title: {title}

Goal:
Make one simple, complete infographic poster, grounded in the user's source. It should be easy to understand at a glance, not a detailed notes page.

Coverage rules:
- Compress the source into the 4-6 ideas a student must remember first.
- If the source is large, group details under simple umbrella ideas instead of listing everything.
- Mention each source at least once in source_map when source metadata is available.
- Use source figures actively: when source figures are available, choose 2-4 distinct useful figures across the guide when possible.
- Use each selected source figure for a clear teaching purpose: "what to notice", "how it supports the point", or "how to read it".
- Do not repeat a source figure index in many panels unless it is the central image for the whole source.
- Do not invent content outside the source. Add only clarifying transitions.

Visual design script rules:
- Each panel must fit on an infographic card: title plus one short sentence, with at most two bullets.
- Keep source_evidence to one short concrete phrase.
- Do not put note section headings such as "Worked Examples and Evidence" or "Source evidence / example matrix" inside source_evidence; use the actual example, formula, data point, or claim instead.
- If the notes contain worked examples, calculations, or source exercises, include one panel titled "Worked Example".
- The visual_prompt should tell the frontend what to draw: source-image thumbnail, curve, arrows, comparison columns, evidence stack, process loop, formula tile, timeline, callout labels, or map.
- Prefer visual prompts that make the idea memorable: contrast left/right, cause-to-effect arrows, before/after, method-result-meaning, or formula-to-example.
- source_evidence must be concrete: a named concept, formula, example, visual/table/chart, study, quote idea, or source claim.
- image_queries should be short generic search phrases for educational/public-domain visuals if source figures are missing, e.g. "Piaget conservation task", "derivative tangent line graph", "EEG cap brain".
- For math, keep formulas MathJax-compatible. Put only formulas inside \\( ... \\) or \\[ ... \\), not normal prose.
- For academic/social science sources, include method-result-meaning or theory-evidence-limitation where relevant.
- For slides/PDFs, explain what the slide/source figure contributes, not just that an image exists.
- End with review prompts that help the student study from the visual.

{schema}

Generated notes context:
{context}

Source metadata/excerpts:
{source_context or "No separate source metadata was supplied."}

Available source figures:
{figure_context or "No source figures were supplied."}
"""
        raw = generate_chat(
            [
                {"role": "system", "content": "You generate structured infographic scripts as strict JSON. Never include markdown fences or prose outside JSON."},
                {"role": "user", "content": prompt},
            ],
            model=model_for_depth("detailed"),
            temperature=float(os.getenv("VISUAL_GUIDE_TEMPERATURE", "0.25")),
            max_tokens=env_int("VISUAL_GUIDE_TOKENS", 6500),
        )
        parsed = extract_json_object(raw)
        prelim_guide = normalise_visual_guide(
            parsed or {},
            title,
            context,
            data.get("sources") if isinstance(data.get("sources"), list) else [],
            data.get("visual_gallery") if isinstance(data.get("visual_gallery"), list) else [],
            [],
        )
        web_images = collect_visual_guide_web_images(
            title,
            parsed or {},
            prelim_guide.get("panels") or [],
            VISUAL_GUIDE_WEB_IMAGE_LIMIT,
        )
        guide = normalise_visual_guide(
            parsed or {},
            title,
            context,
            data.get("sources") if isinstance(data.get("sources"), list) else [],
            data.get("visual_gallery") if isinstance(data.get("visual_gallery"), list) else [],
            web_images,
        )
        return guide
    except Exception as error:
        return {"error": str(error)}


# -----------------------------------------------------------------------------
# Timeline generation
# -----------------------------------------------------------------------------

TIMELINE_TYPE_ALIASES = {
    "warm_up": "warm_up",
    "overview": "warm_up",
    "flow": "warm_up",
    "lecture": "warm_up",
    "lecture_flow": "warm_up",
    "sequence": "warm_up",
    "learn": "learn",
    "concept": "learn",
    "definition": "learn",
    "mechanism": "learn",
    "method": "learn",
    "apply": "apply",
    "evidence": "apply",
    "data": "apply",
    "figure": "apply",
    "experiment": "apply",
    "study": "apply",
    "example": "apply",
    "case": "apply",
    "application": "apply",
    "check": "check",
    "exam": "check",
    "assessment": "check",
    "test": "check",
    "revise": "revise",
    "revision": "revise",
    "review": "revise",
    "mistake": "revise",
}


def normalise_timeline_type(value: str) -> str:
    key = normalise_space(str(value or "")).lower().replace("-", "_").replace(" ", "_")
    return TIMELINE_TYPE_ALIASES.get(key, "learn")


STUDY_PATH_QUESTION_TYPE_ALIASES = {
    "short": "short_answer",
    "short_answer": "short_answer",
    "short_response": "short_answer",
    "open": "short_answer",
    "open_ended": "short_answer",
    "single": "single_choice",
    "choice": "single_choice",
    "mcq": "single_choice",
    "single_choice": "single_choice",
    "multiple": "multiple_choice",
    "multi": "multiple_choice",
    "multiple_choice": "multiple_choice",
    "true_false": "true_false",
    "truefalse": "true_false",
    "tf": "true_false",
    "true_or_false": "true_false",
    "case": "case_analysis",
    "case_analysis": "case_analysis",
    "scenario": "case_analysis",
    "application": "case_analysis",
    "compare": "compare",
    "comparison": "compare",
    "compare_contrast": "compare",
    "essay": "essay_outline",
    "outline": "essay_outline",
    "essay_outline": "essay_outline",
    "diagram": "diagram_prompt",
    "figure": "diagram_prompt",
    "visual": "diagram_prompt",
    "graph": "diagram_prompt",
    "chart": "diagram_prompt",
    "diagram_prompt": "diagram_prompt",
}


def normalise_study_path_question_type(value: str) -> str:
    key = normalise_space(str(value or "")).lower().replace("-", "_").replace(" ", "_")
    return STUDY_PATH_QUESTION_TYPE_ALIASES.get(key, "short_answer")


def fallback_study_path_question(event_type: str, title: str, summary: str, source_reference: str = "") -> dict:
    clean_title = clean_quiz_string(title, "this checkpoint")
    clean_summary = clean_quiz_string(summary, "the key idea in this checkpoint")
    if event_type == "apply":
        qtype = "case_analysis"
        prompt = f"How does this evidence or example support the concept: {clean_title}?"
    elif event_type == "check":
        qtype = "essay_outline"
        prompt = f"What would be the first three points in an exam answer about {clean_title}?"
    elif event_type == "revise":
        qtype = "true_false"
        prompt = f"True or false: {clean_summary[:150]}"
    elif event_type == "learn":
        qtype = "short_answer"
        prompt = f"What does {clean_title} mean, and why is it important here?"
    else:
        qtype = "short_answer"
        prompt = f"What is the main question or goal of {clean_title}?"
    return {
        "type": qtype,
        "prompt": truncate_text(prompt, 280),
        "options": ["True", "False"] if qtype == "true_false" else [],
        "correct_option_indexes": [],
        "correct_boolean": True if qtype == "true_false" else None,
        "expected_answer": truncate_text(clean_summary, 420),
        "explanation": "A strong answer should use the task focus and connect it back to the notes, source evidence, or example.",
        "source_reference": truncate_text(source_reference or clean_title, 180),
    }


def normalise_study_path_practice_question(raw, fallback_event: dict, title: str, index: int) -> dict:
    fallback = fallback_event.get("practice_question") or fallback_study_path_question(
        normalise_timeline_type(fallback_event.get("type")),
        title or fallback_event.get("title") or f"Checkpoint {index + 1}",
        fallback_event.get("summary") or fallback_event.get("detail") or "",
        fallback_event.get("source_reference") or fallback_event.get("section") or "",
    )
    if isinstance(raw, str):
        source = {"prompt": raw}
    elif isinstance(raw, dict):
        source = raw
    else:
        source = {}

    qtype = normalise_study_path_question_type(
        source.get("type") or source.get("question_type") or source.get("questionType") or fallback.get("type")
    )
    prompt = clean_quiz_string(
        source.get("prompt") or source.get("question") or source.get("title"),
        fallback.get("prompt", ""),
    )
    options = source.get("options") if isinstance(source.get("options"), list) else source.get("choices")
    options = [clean_quiz_string(option) for option in options if clean_quiz_string(option)] if isinstance(options, list) else list(fallback.get("options") or [])
    options = options[:6]
    if qtype == "true_false" and len(options) < 2:
        options = ["True", "False"]
    if qtype not in {"single_choice", "multiple_choice", "true_false"}:
        options = []

    correct_indexes = coerce_option_indexes(
        source.get("correct_option_indexes", source.get("correctOptionIndexes", source.get("correct_indexes", source.get("answer_index", source.get("answer"))))),
        options,
    )
    fallback_indexes = fallback.get("correct_option_indexes") if isinstance(fallback.get("correct_option_indexes"), list) else []
    if qtype in {"single_choice", "multiple_choice"} and not correct_indexes:
        correct_indexes = [idx for idx in fallback_indexes if isinstance(idx, int) and 0 <= idx < len(options)]
    if qtype == "single_choice":
        correct_indexes = correct_indexes[:1]
    elif qtype == "multiple_choice" and len(correct_indexes) < 2 and len(options) >= 2:
        correct_indexes = correct_indexes or [0, 1]
    elif qtype not in {"single_choice", "multiple_choice"}:
        correct_indexes = []

    correct_boolean = coerce_boolean(source.get("correct_boolean", source.get("correctBoolean", source.get("answer"))))
    if qtype == "true_false" and correct_boolean is None:
        correct_boolean = coerce_boolean(fallback.get("correct_boolean"))
    if qtype != "true_false":
        correct_boolean = None

    return {
        "type": qtype,
        "prompt": truncate_text(prompt, 360),
        "options": [truncate_text(option, 180) for option in options],
        "correct_option_indexes": correct_indexes,
        "correct_boolean": correct_boolean,
        "expected_answer": truncate_text(clean_quiz_string(
            source.get("expected_answer") or source.get("expectedAnswer") or source.get("answer_guide") or source.get("answerGuide"),
            fallback.get("expected_answer", ""),
        ), 650),
        "explanation": truncate_text(clean_quiz_string(source.get("explanation") or source.get("rationale"), fallback.get("explanation", "")), 520),
        "source_reference": truncate_text(clean_quiz_string(
            source.get("source_reference") or source.get("sourceReference") or source.get("source"),
            fallback.get("source_reference", ""),
        ), 220),
    }


def fallback_timeline_from_context(title: str, sections: Dict[str, str], context: str) -> dict:
    ordered_names = list(sections.keys())[:10] if isinstance(sections, dict) else []
    if not ordered_names:
        snippets = [
            normalise_space(line.lstrip("#-0123456789. "))
            for line in context.splitlines()
            if len(normalise_space(line.lstrip("#-0123456789. "))) > 30
        ][:8]
        ordered_names = [f"Checkpoint {index + 1}" for index, _ in enumerate(snippets)]
        section_lookup = dict(zip(ordered_names, snippets))
    else:
        section_lookup = sections

    events = []
    for index, name in enumerate(ordered_names[:12]):
        text = section_lookup.get(name, "") if isinstance(section_lookup, dict) else ""
        summary = first_good_sentence(text, 180) or normalise_space(str(text))[:180] or "Review this stage in the notes."
        event_type = "warm_up"
        lowered = f"{name} {summary}".lower()
        if re.search(r"\b(table|figure|data|result|evidence|study|experiment|graph|chart)\b", lowered):
            event_type = "apply"
        elif re.search(r"\b(example|case|application)\b", lowered):
            event_type = "apply"
        elif re.search(r"\b(exam|revision|mistake|critical)\b", lowered):
            event_type = "check"
        elif re.search(r"\b(definition|concept|idea|method|model)\b", lowered):
            event_type = "learn"
        practice_question = fallback_study_path_question(event_type, name, summary, name)
        events.append({
            "id": sha256_text(f"{name}-{index}")[:10],
            "order": index + 1,
            "marker": f"Task {index + 1}",
            "type": event_type,
            "title": short_mindmap_text(name, 72),
            "section": name,
            "summary": summary,
            "detail": summary,
            "task": f"Read the section \"{short_mindmap_text(name, 80)}\" and write a two-sentence explanation. First state the main idea; then connect it to one source detail, example, or limitation from the notes.",
            "active_prompt": f"Without looking, explain the key idea from {name}.",
            "practice_question": practice_question,
            "deliverable": "A short explanation in your own words.",
            "mastery_check": "You can explain the idea and connect it to one piece of source evidence.",
            "estimated_minutes": 8,
            "priority": "medium",
            "evidence": "",
            "why_it_matters": "This checkpoint helps organise the material into a learnable sequence.",
            "misconception": "",
            "exam_use": "Use it as a revision checkpoint before moving to the next concept.",
            "source_reference": name,
            "related_terms": [],
        })

    return {
        "title": clean_quiz_string(title, stored_title or "Study Path"),
        "summary": "A task-based study path that moves from orientation to practice and exam-ready revision.",
        "events": events,
    }


def normalise_timeline(raw: dict, fallback: dict) -> dict:
    if not isinstance(raw, dict):
        raw = {}
    raw_events = raw.get("events") if isinstance(raw.get("events"), list) else []
    fallback_events = fallback.get("events", []) or []
    events: List[dict] = []
    for index, event in enumerate(raw_events[: env_int("TIMELINE_MAX_EVENTS", 16)]):
        if not isinstance(event, dict):
            continue
        fallback_event = fallback_events[min(index, len(fallback_events) - 1)] if fallback_events else {}
        title = clean_quiz_string(event.get("title") or event.get("label"), fallback_event.get("title", f"Checkpoint {index + 1}"))
        summary = clean_quiz_string(event.get("summary") or event.get("what_happens"), fallback_event.get("summary", ""))
        detail = clean_quiz_string(event.get("detail") or event.get("explanation") or event.get("why"), fallback_event.get("detail", summary))
        evidence = clean_quiz_string(event.get("evidence") or event.get("source_evidence"), fallback_event.get("evidence", ""))
        try:
            estimated_minutes = int(event.get("estimated_minutes") or event.get("estimatedMinutes") or fallback_event.get("estimated_minutes") or 8)
        except Exception:
            estimated_minutes = 8
        estimated_minutes = max(3, min(estimated_minutes, 60))
        if not title or not (summary or detail or evidence):
            continue
        related_terms = event.get("related_terms") or event.get("relatedTerms") or []
        if not isinstance(related_terms, list):
            related_terms = []
        events.append({
            "id": clean_quiz_string(event.get("id"), sha256_text(f"{title}-{index}")[:10]),
            "order": index + 1,
            "marker": clean_quiz_string(event.get("marker") or event.get("time") or event.get("step"), f"Step {index + 1}"),
            "type": normalise_timeline_type(event.get("type") or fallback_event.get("type")),
            "title": truncate_text(title, 140),
            "section": clean_quiz_string(event.get("section"), fallback_event.get("section", "")),
            "summary": truncate_text(summary, 420),
            "detail": truncate_text(detail, 900),
            "task": truncate_text(clean_quiz_string(event.get("task") or event.get("action") or event.get("study_task"), fallback_event.get("task", detail or summary)), 650),
            "active_prompt": truncate_text(clean_quiz_string(event.get("active_prompt") or event.get("recall_prompt"), fallback_event.get("active_prompt", "")), 520),
            "practice_question": normalise_study_path_practice_question(
                event.get("practice_question") or event.get("practiceQuestion") or event.get("question"),
                fallback_event,
                title,
                index,
            ),
            "deliverable": truncate_text(clean_quiz_string(event.get("deliverable") or event.get("output"), fallback_event.get("deliverable", "")), 420),
            "mastery_check": truncate_text(clean_quiz_string(event.get("mastery_check") or event.get("checkpoint"), fallback_event.get("mastery_check", "")), 420),
            "estimated_minutes": estimated_minutes,
            "priority": clean_quiz_string(event.get("priority"), fallback_event.get("priority", "medium")).lower(),
            "evidence": truncate_text(evidence, 700),
            "why_it_matters": truncate_text(clean_quiz_string(event.get("why_it_matters") or event.get("whyItMatters"), fallback_event.get("why_it_matters", "")), 520),
            "misconception": truncate_text(clean_quiz_string(event.get("misconception") or event.get("common_mistake"), fallback_event.get("misconception", "")), 420),
            "exam_use": truncate_text(clean_quiz_string(event.get("exam_use") or event.get("examUse"), fallback_event.get("exam_use", "")), 420),
            "source_reference": truncate_text(clean_quiz_string(event.get("source_reference") or event.get("source"), fallback_event.get("source_reference", "")), 220),
            "related_terms": [truncate_text(clean_quiz_string(term), 48) for term in related_terms if clean_quiz_string(term)][:6],
        })

    if len(events) < 3:
        events = fallback_events[: env_int("TIMELINE_MAX_EVENTS", 16)]
    return {
        "title": clean_quiz_string(raw.get("title"), fallback.get("title", "Study Path")),
        "summary": truncate_text(clean_quiz_string(raw.get("summary"), fallback.get("summary", "")), 520),
        "events": events,
    }
