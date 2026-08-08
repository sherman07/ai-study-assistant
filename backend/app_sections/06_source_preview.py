@app.post("/source-preview")
async def source_preview(file: UploadFile = File(...)):
    """Return a browser-friendly preview for source formats Chrome cannot open."""
    try:
        name = file.filename or "uploaded source"
        content_type = file.content_type or mimetypes.guess_type(name)[0] or ""
        data = await read_upload_bytes(file, MAX_UPLOAD_BYTES, name)
        lower_name = name.lower()

        if lower_name.endswith(".pdf") or content_type == "application/pdf":
            return build_pdf_source_preview(data, name)
        if lower_name.endswith(".pptx") or content_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation":
            return build_pptx_source_preview(data, name)
        if lower_name.endswith(".docx") or content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return build_docx_source_preview(data, name)
        if content_type.startswith("text/") or lower_name.endswith((".txt", ".md", ".csv", ".tsv")):
            return {
                "kind": "text",
                "title": name,
                "text": truncate_text(extract_text_file(data), 160000),
            }
        return {
            "kind": "file",
            "title": name,
            "error": "This file type is not readable in the source viewer yet. PDFs, PPTX, DOCX, and text are converted to readable previews.",
        }
    except Exception as error:
        return analysis_error_response(str(error), analysis_exception_status(error))


@app.post("/ask")
async def ask_question(data: dict):
    provider_token = None
    requested_provider = ""
    try:
        requested_provider = str((data or {}).get("ai_provider") or "").strip()
        provider_token = set_request_text_provider(requested_provider)
        require_text_ai()
        selected_provider = active_text_provider()
        chat_model = chat_model_for_active_provider()
        question = data.get("question", "")
        selected_section = data.get("selected_section", "")
        selected_excerpt = str(data.get("selected_excerpt") or "").strip()
        source_strict = bool(data.get("source_strict"))
        chat_history = data.get("chat_history", [])
        preferred_language = data.get("preferred_language", "auto")
        request_sections = data.get("sections") if isinstance(data.get("sections"), dict) else {}
        context_sections = {
            str(key): str(value)
            for key, value in request_sections.items()
            if str(value).strip()
        }
        request_summary = str(data.get("summary") or "").strip()
        request_title = str(data.get("title") or "").strip()
        request_source_identity = str(data.get("source_identity") or "").strip()
        if not request_summary and not context_sections:
            return analysis_error_response(
                "No current note context was provided. Open or generate the note again before asking the tutor.",
                400,
            )

        context_summary = request_summary
        context_title = request_title or "Current Notes"
        context_source_identity = request_source_identity
        section_context = context_sections.get(selected_section, "")
        answer_language = detect_question_language(question, preferred_language)

        research_context = ""
        research_results = []
        research_status = "disabled" if source_strict else "unused"
        if not source_strict:
            research_context, research_results = gather_tutor_web_research(
                question=question,
                selected_section=selected_section,
                source_identity=context_source_identity,
                title=context_title,
            )
            research_status = "ok" if research_results else "unavailable"

        context = f"""
Current study context:
Title: {context_title}
Primary source identity: {context_source_identity}
Selected section: {selected_section if selected_section else 'Full document'}
Selected excerpt: {selected_excerpt[:2500] if selected_excerpt else 'No excerpt selected.'}
Section content: {section_context[:4500]}
Full summary: {context_summary[:11000]}

External research context, use only when the notes/source context do not contain enough information:
{research_context[:MAX_TUTOR_RESEARCH_CHARS] if research_context else ('External research disabled because this material is source-restricted.' if source_strict else 'No external research results were available from the live web search. Answer from the uploaded notes only and say clearly when the notes do not contain enough information.')}

Tutor rules:
- Answer in {answer_language}. If the user wrote in Chinese, answer in Chinese. If they wrote in English, answer in English. Match the user question language, not just the notes language.
- Stay consistent with the already generated notes when the notes provide enough evidence.
- Treat the selected excerpt as the highest-priority focus when it is present.
- {"Do not use any external research. Stay strictly inside the uploaded material and say clearly when the source does not contain enough information." if source_strict else "Do not claim that information is unavailable until you have checked both the note context and the external research context above."}
- {"If the source is missing a point, say that the uploaded material does not contain enough information and do not invent missing evidence." if source_strict else 'If the answer uses external research because the uploaded source does not contain the point, clearly say it is "external research" / "外部资料" and explain how it connects back to the study topic.'}
- Do not switch to a different source identity. If external research discusses a broader act/topic, connect it carefully to the current source identity.
- Be an advanced academic tutor: answer the question directly, then explain the idea, the evidence, the reasoning chain, and the likely misunderstanding.
- Use a compact markdown table when the user asks for a comparison, a list of studies/evidence, steps, or differences.
- For "explain" questions, use: short answer -> detailed explanation -> example/source evidence -> common mistake -> how to remember/use it.
- For "summarise" questions, prioritise the central argument and evidence over a list of headings.
- Never translate the brand name Synapse.
"""

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + ("\n\nTutor chat must answer in the language used by the user's latest question. Stay strictly inside the uploaded material for source-restricted requests." if source_strict else "\n\nTutor chat must answer in the language used by the user's latest question. Use external research context when the notes do not contain enough information.")},
            {"role": "user", "content": context},
            {"role": "assistant", "content": "I will answer as a source-faithful tutor." + (" I will stay inside the uploaded material." if source_strict else " I will use external research only when needed.")},
        ]

        for message in chat_history[-8:]:
            role = message.get("role", "user")
            if role not in {"user", "assistant", "system"}:
                role = "user"
            messages.append({"role": role, "content": message.get("content", "")})

        messages.append({"role": "user", "content": question})
        answer = generate_chat(messages, model=chat_model, temperature=0.2, max_tokens=3200)

        # Guard against the exact bad behavior shown in the screenshot: refusing because the notes alone are incomplete.
        if is_refusal_or_useless_response(answer) and research_context and not source_strict:
            repair_messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"""
The previous tutor answer was too short or refused to answer. Rewrite it properly.

Answer language: {answer_language}
User question: {question}
Current source title: {context_title}
Selected section: {selected_section}
Source notes excerpt: {section_context[:3000]}
External research context:
{research_context[:MAX_TUTOR_RESEARCH_CHARS]}

Requirements:
- Answer in {answer_language}.
- Use the external research context if the notes are missing the detail.
- Label external information clearly.
- Explain the point directly and helpfully.
- Do not say you cannot answer unless neither notes nor research contains relevant information.
"""},
            ]
            answer = generate_chat(repair_messages, model=chat_model, temperature=0.15, max_tokens=2400)

        requested_normalised = normalise_text_provider(requested_provider) if requested_provider else ""

        return {
            "answer": answer,
            "used_external_research": bool(research_context) and not source_strict,
            "research_status": research_status,
            "ai_provider": selected_provider,
            "ai_provider_requested": requested_normalised or selected_provider,
            "provider_warning": "",
            "model": chat_model,
            "research_sources": [
                {
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "provider": item.get("provider") or "",
                }
                for item in research_results[:MAX_TUTOR_SEARCH_RESULTS]
            ],
            "research_provider": next(
                (
                    str(item.get("provider") or "").strip()
                    for item in research_results
                    if str(item.get("provider") or "").strip()
                ),
                "",
            ),
        }
    except Exception as error:
        return analysis_error_response(str(error), analysis_exception_status(error))
    finally:
        if provider_token is not None:
            reset_request_text_provider(provider_token)


# -----------------------------------------------------------------------------
# v19 Multisource Visual Professor Engine overrides
# -----------------------------------------------------------------------------
# These definitions intentionally appear late in the module. Python resolves the
# global function names at request time, so these replace the earlier v18 helpers
# without requiring a full rewrite of the existing app. The goal is to turn the
# app from a summary generator into a source-grounded, visual, cross-source
# teaching engine.


def worldclass_language_labels(preferred_language: str) -> dict:
    key = normalise_language_key(preferred_language)
    if key in {"simplified_chinese", "mixed_chinese_english"}:
        return {
            "guide_title": "# 🧠 综合学习指南",
            "intro": "这份学习指南先逐项深入讲解每个 source，再明确整理 source 之间的 connection points、来源图表、差异争论和考试应用。",
            "source_heading": "## 1. 逐项资源精讲",
            "connection_heading": "## 2. 跨资源 Connection Points",
            "visual_heading": "",
            "synthesis_heading": "## 4. 教授式综合讲解",
            "visual_intro": "",
            "connection_intro": "下面不是告诉你“如何找共同点”，而是直接把这组资料之间真正的共同 ideas、互相补充关系、差异和证据整理出来。",
            "visual_card_title": "来源图表",
            "source_label": "来源",
            "what_shows": "图中/表中显示",
            "argument": "为什么放在这里",
            "connection": "连接到其他 source",
            "how_to_read": "阅读方法",
            "exam_use": "考试/复习用途",
        }
    if key == "traditional_chinese":
        return {
            "guide_title": "# 🧠 綜合學習指南",
            "intro": "這份學習指南先逐項深入講解每個 source，再明確整理 source 之間的 connection points、來源圖表、差異爭論和考試應用。",
            "source_heading": "## 1. 逐項資源精講",
            "connection_heading": "## 2. 跨資源 Connection Points",
            "visual_heading": "",
            "synthesis_heading": "## 4. 教授式綜合講解",
            "visual_intro": "",
            "connection_intro": "下面不是告訴你「如何找共同點」，而是直接把這組資料之間真正的共同 ideas、互相補充關係、差異和證據整理出來。",
            "visual_card_title": "來源圖表",
            "source_label": "來源",
            "what_shows": "圖中/表中顯示",
            "argument": "為什麼放在這裡",
            "connection": "連接到其他 source",
            "how_to_read": "閱讀方法",
            "exam_use": "考試/複習用途",
        }
    return {
        "guide_title": "# 🧠 Integrated Study Guide",
        "intro": "This guide teaches the concepts in normal note flow, embedding uploaded source screenshots directly beside the concepts they explain.",
        "source_heading": "## 1. Source-by-Source Professor Notes",
        "connection_heading": "## 2. Cross-Source Connection Points",
        "visual_heading": "",
        "synthesis_heading": "## 3. Professor-Style Synthesis",
        "visual_intro": "",
        "connection_intro": "This section does not tell you how to find connections; it directly maps the real shared ideas, extensions, differences, and evidence across the sources.",
        "visual_card_title": "Source figure",
        "source_label": "Source",
        "what_shows": "What this source figure shows",
        "argument": "Why it matters here",
        "connection": "Connection to other sources",
        "how_to_read": "How to read it",
        "exam_use": "Exam / revision use",
    }


def image_url_from_part(part: dict) -> str:
    if not isinstance(part, dict):
        return ""
    return ((part.get("image_url") or {}).get("url") or "").strip()


def image_part_from_url(url: str) -> dict:
    return {"type": "image_url", "image_url": {"url": url}}


def visual_source_location_from_label(label: str) -> Tuple[str, str]:
    label = normalise_space(label or "")
    source = ""
    location = ""
    m = re.search(r"FROM\s+(.+?)\s+—\s+(.+?)(?:\.|$)", label, flags=re.I)
    if m:
        source = m.group(1).strip()
        location = m.group(2).strip()
    else:
        page = re.search(r"PDF page\s*(\d+)", label, flags=re.I)
        slide = re.search(r"PPT slide\s*(\d+)", label, flags=re.I)
        if page:
            location = f"PDF page {page.group(1)}"
        elif slide:
            location = f"PPT slide {slide.group(1)}"
    return source, location


def find_libreoffice_binary() -> Optional[str]:
    candidates = [
        os.getenv("LIBREOFFICE_PATH"),
        "soffice",
        "libreoffice",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        "/usr/bin/libreoffice", "/usr/local/bin/libreoffice", "/opt/homebrew/bin/libreoffice",
    ]
    import shutil
    for candidate in candidates:
        if not candidate:
            continue
        resolved = shutil.which(candidate) if not candidate.startswith("/") else candidate
        if resolved and Path(resolved).exists():
            return resolved
    return None


def extract_json_object(text: str) -> dict:
    try:
        return json.loads(text)
    except Exception:
        pass
    # Pull JSON from fenced code or mixed prose.
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, flags=re.I)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except Exception:
            pass
    start = text.find("{")
    end = text.rfind("}")
    if 0 <= start < end:
        try:
            return json.loads(text[start:end + 1])
        except Exception:
            return {}
    return {}


def fallback_visual_card(candidate: dict, index: int, labels: dict) -> dict:
    title_label = labels.get("figure_title") or labels.get("visual_card_title") or "Source figure"
    return {
        "index": index,
        "source_index": candidate.get("source_index"),
        "source_title": candidate.get("source_title", ""),
            "location": candidate.get("location", ""),
            "caption": clean_source_figure_caption(candidate.get("caption", "")),
            "url": candidate.get("url", ""),
            "title": f"{title_label} {index + 1}",
            "what_shows": clean_source_figure_caption(candidate.get("caption", "")) or "This source figure comes from the uploaded source.",
        "argument_supported": "Use this source figure as direct support for the nearby concept in the notes.",
        "cross_source_connection": "Connect this source figure to the source's main concept and compare it with related concepts from the other uploaded materials.",
        "how_to_read": "Start with the title/labels, then identify what is being compared, measured, sequenced, or illustrated.",
        "exam_use": "Refer to this source figure when explaining evidence, interpreting a diagram, or comparing sources in an exam answer.",
    }


def v20_visual_parts_count(unit: dict) -> int:
    count = 0
    for part in unit.get("visual_parts") or []:
        if isinstance(part, dict) and part.get("type") == "image_url":
            count += 1
    return count


def v20_source_has_visuals(unit: dict) -> bool:
    return v20_visual_parts_count(unit) > 0


def source_card_min_units(unit: dict) -> int:
    """v20: demand deeper source cards, especially for multi-source packs.

    Previous versions allowed slide-heavy sources to collapse into the sentence
    'Readable text was limited'. That is no longer acceptable when screenshots or
    embedded images are available: the model must inspect visuals and teach them.
    """
    text_len = len(unit.get("text_excerpt") or "")
    visual_bonus = v20_visual_parts_count(unit)
    if text_len >= 90000:
        return env_int("MULTISOURCE_LONG_CARD_MIN_UNITS", 3600)
    if text_len >= 35000:
        return env_int("MULTISOURCE_MEDIUM_CARD_MIN_UNITS", 2800)
    if text_len >= 8000:
        return env_int("MULTISOURCE_SHORT_CARD_MIN_UNITS", 1900)
    if visual_bonus:
        return env_int("MULTISOURCE_VISUAL_ONLY_CARD_MIN_UNITS", 1400)
    return env_int("MULTISOURCE_TINY_CARD_MIN_UNITS", 950)


def v20_source_visual_brief(unit: dict, limit: int = 8) -> str:
    rows = []
    for cand in iter_visual_candidates([unit])[:limit]:
        rows.append(f"- {cand.get('location')}: {cand.get('caption')}")
    return "\n".join(rows) if rows else "No visual candidates extracted."


def generate_individual_source_digest(index: int, unit: dict, language_rule: str) -> str:
    """v20: create a deep source card from text AND screenshots.

    Important change: if text extraction is weak but visuals exist, we still send
    the screenshots to the model and require a visual-led source card. This fixes
    PPT/PDF sources that previously appeared as 'Readable text was limited'.
    """
    excerpt_limit = env_int("MULTISOURCE_SOURCE_CARD_CHARS", 180000)
    excerpt = source_unit_text_excerpt(unit, limit=excerpt_limit)
    title = unit.get("title_candidate") or unit.get("display_name") or f"Source {index}"
    min_units = source_card_min_units(unit)
    visual_parts = source_unit_visual_parts(unit, MAX_VISUAL_IMAGES_PER_SOURCE)
    has_visuals = bool(visual_parts)

    if (not excerpt or len(excerpt) < 120) and not has_visuals:
        safe_title = title or f"Source {index}"
        return (
            f"### Source {index}: {safe_title}\n\n"
            f"#### Extraction status\nReadable text and usable visuals were limited for this source. "
            f"Use the filename/title cautiously and regenerate after providing a text-readable PDF/PPT export if possible.\n\n"
            f"#### Revision use\nTreat this source as low-confidence evidence until more text or visuals are available."
        )

    prompt = f"""
You are generating a DEEP professor-style source card for Source {index}.

Language requirement: {language_rule}
Never translate the product name Synapse.

This source card will be placed into a multi-source study guide. It must be detailed enough that a student can revise this source without reopening the original file.

Source identity:
- Source number: {index}
- Display name: {unit.get('display_name')}
- Title/topic: {title}
- Extracted text length: {len(excerpt)} characters
- Screenshot / image evidence count available to you: {v20_visual_parts_count(unit)}

Visual candidates extracted from this source:
{v20_source_visual_brief(unit)}

Reference style to imitate structurally:
{REFERENCE_STYLE_PROFILE}

Return markdown using this architecture. Localise headings into the selected language, but keep the academic depth:

### Source {index}: specific readable lecture/source title

#### Opening frame / central question
Identify the main question/problem this source is teaching. Make it specific, not generic.

#### Source structure / lecture flow
Walk through the source in order. Use actual slide/page titles, sections, cases, diagrams, tables, formulas, examples, or study sequence. If the source is a lecture, write it like detailed lecture notes.

#### Key concepts and definitions
Create a concept table. For each concept: definition, simple explanation, where it appears in this source, why it matters.

#### Important studies / examples / cases / calculations
For every important study/example/case/calculation, use:
- **Question:**
- **Method / process:**
- **Result / answer:**
- **Meaning:**
- **Exam use:**

#### Source images inside the concept notes
If screenshots/images are attached, explain useful diagrams/tables/graphs/slides inside the relevant concept, study, or example note. Do not create a standalone visual section.

#### What this source uniquely contributes
Explain the distinctive role of this source in the whole source pack: theory, evidence, method, case, mechanism, counterpoint, application, visual explanation, etc.

#### Connections to other sources in the pack
Predict explicit links to other sources. Use connection verbs: supports, extends, contrasts, complicates, applies, provides mechanism for, provides evidence for.

#### Common misunderstandings
Name realistic student mistakes and correct them. Make them source-specific.

#### Exam / revision use
Give revision priorities, likely question types, and what a high-scoring answer should include.

Depth rules:
- Do not output a basic summary.
- Use named researchers, theories, studies, examples, diagrams, slide titles, data tables, formulas, cases, and page/slide flow whenever visible.
- If the source is visual-heavy, use the screenshots as primary evidence.
- Minimum expected richness: {min_units} readable units.

Extracted text excerpt:
{truncate_text(excerpt, excerpt_limit) if excerpt else '[Text extraction was limited. Use the attached screenshots/images as the main evidence.]'}
"""

    def call(prompt_text: str, tokens: int) -> str:
        user_content = [{"type": "text", "text": prompt_text}] + visual_parts if visual_parts else prompt_text
        return generate_chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ], model=model_for_depth("comprehensive"), temperature=0, max_tokens=tokens).strip()

    try:
        digest = call(prompt, MULTISOURCE_SOURCE_DIGEST_TOKENS)
        if digest and not is_refusal_or_useless_response(digest) and count_readable_units(digest) >= min_units:
            return digest

        repair_prompt = prompt + f"""

The previous source card was too short or too generic.
Rewrite it as a substantially deeper professor note.
Repair requirements:
- Keep the selected output language.
- If screenshots are attached, explain at least 3 visible slides/pages/images where possible.
- Add specific connection predictions to other sources.
- Add source-specific exam/revision guidance.
- Do not apologise and do not say the source is inaccessible if screenshots or text are present.
- Minimum readable units: {min_units}.
"""
        repaired = call(repair_prompt, max(MULTISOURCE_SOURCE_DIGEST_TOKENS, env_int("MULTISOURCE_SOURCE_REPAIR_TOKENS", 11000)))
        if repaired and not is_refusal_or_useless_response(repaired):
            # Return repaired even if slightly below threshold. A concrete but shorter card
            # is better than hiding source evidence behind a generic fallback.
            if count_readable_units(repaired) >= max(800, int(min_units * 0.55)):
                return repaired
        raise RuntimeError("source card was too short")
    except Exception:
        safe_excerpt = truncate_text(excerpt or "", env_int("MULTISOURCE_FALLBACK_EXCERPT_CHARS", 16000))
        visual_note = v20_source_visual_brief(unit, 10)
        return (
            f"### Source {index}: {title}\n\n"
            f"#### Preserved source evidence\n{safe_excerpt if safe_excerpt else 'Text extraction was limited.'}\n\n"
            f"#### Extracted visual evidence available\n{visual_note}\n\n"
            f"#### Revision use\nUse this preserved evidence and visual list when connecting this source to the rest of the uploaded pack."
        )
def visual_argument_markdown(cards: List[dict], preferred_language: str) -> str:
    labels = worldclass_language_labels(preferred_language)
    if not cards:
        return ""
    chunks = [f"{labels['visual_heading']}\n\n{labels['visual_intro']}"]
    for i, card in enumerate(cards):
        chunks.append(
            f"### {labels['visual_card_title']} {i + 1}: {card.get('title', '')}\n\n"
            f"[[VISUAL:{i}]]\n\n"
            f"**{labels['source_label']}:** Source {card.get('source_index', '')} — {card.get('source_title', '')} ({card.get('location', '')})\n\n"
            f"**{labels['what_shows']}:** {card.get('what_shows', '')}\n\n"
            f"**{labels['argument']}:** {card.get('argument_supported', '')}\n\n"
            f"**{labels['connection']}:** {card.get('cross_source_connection', '')}\n\n"
            f"**{labels['how_to_read']}:** {card.get('how_to_read', '')}\n\n"
            f"**{labels['exam_use']}:** {card.get('exam_use', '')}"
        )
    return "\n\n".join(chunks).strip()


def generate_connection_points_block(source_digest_block: str, source_units: List[dict], preferred_language: str, visual_cards: Optional[List[dict]] = None) -> str:
    """v20: produce actual source-to-source connection points, not advice.

    Earlier outputs said things like 'look for repeated terms'. This function now
    forces concrete source roles, evidence, visual argument links, and source-by-
    source contribution tables.
    """
    if len(source_units or []) < 2 or not source_digest_block:
        return ""
    labels = worldclass_language_labels(preferred_language)
    language_rule = language_instruction_for(preferred_language)
    source_list = "\n".join(
        f"Source {i}: {u.get('title_candidate') or u.get('display_name')}"
        for i, u in enumerate(source_units, start=1)
    )
    visual_context = "\n".join(
        f"Visual {i+1}: Source {c.get('source_index')} {c.get('location')} — {c.get('title')} — argument: {c.get('argument_supported')} — connection: {c.get('cross_source_connection')}"
        for i, c in enumerate(visual_cards or [])
    )

    prompt = f"""
You are writing the CENTRAL section of Synapse: explicit cross-source connection points.

Language requirement: {language_rule}
Never translate Synapse.

Sources:
{source_list}

Detailed source cards:
{truncate_text(source_digest_block, env_int('MULTISOURCE_DIGEST_CONTEXT_CHARS', 420000))}

Visual evidence cards available:
{visual_context if visual_context else 'No visual cards available.'}

Your task is NOT to give advice about finding connections. Your task is to actually identify and explain the real connections.

Write a deep connection map with at least {env_int('MULTISOURCE_REQUIRED_CONNECTION_POINTS', 7)} major connection points if the source pack supports it.

For EACH connection point, use this exact architecture:

### Connection Point X: specific conceptual title

**Core question:** What bigger course question does this connection answer?

**Shared idea:** Explain the idea in professor-level detail.

**Source-by-source contribution table:**
| Source | What it contributes | How it connects | Specific evidence | Useful source image |
|---|---|---|---|---|

**Agreement / extension / tension:** Explain whether sources agree, extend one another, contrast, or complicate the topic.

**Image-supported explanation:** If a source screenshot/slide/table/diagram supports this connection, explain it directly as part of the concept. Do not create a separate visual section.

**Why it matters:** Explain why this connection changes the student's understanding.

**Exam / assignment use:** Give a sentence frame or answer strategy using multiple sources.

Quality rules:
- Every connection point must mention at least two sources.
- Across the section, every uploaded source should appear at least once unless it has no readable text or usable source screenshot.
- Use names, theories, studies, cases, formulas, page/slide visuals, tables, diagrams, examples, or sections from the source cards.
- Do not write generic lines such as 'these sources all discuss psychology'.
- Prefer specific relationships: Source A provides mechanism; Source B provides evolutionary explanation; Source C provides developmental evidence; Source D provides method/measurement; Source E provides an image-supported example.
- If a source has limited readable text, connect it through visible screenshots, slide titles, or filename/title, and label uncertainty.
"""

    def call_connection(p: str, tokens: int) -> str:
        return generate_chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": p},
        ], model=model_for_depth("comprehensive"), temperature=0, max_tokens=tokens).strip()

    try:
        result = call_connection(prompt, max(MULTISOURCE_CONNECTION_TOKENS, env_int("MULTISOURCE_CONNECTION_TOKENS", 16000)))
        if result and not is_refusal_or_useless_response(result):
            units = count_readable_units(result)
            has_tables = result.count("|") >= 20
            has_connections = len(re.findall(r"Connection Point|连接点|連接點|共同|connection", result, flags=re.I)) >= 3
            if units >= env_int("MULTISOURCE_CONNECTION_MIN_UNITS", 3200) and (has_tables or has_connections):
                result = re.sub(r"(?m)^#{1,4}\s*" + re.escape(labels["connection_heading"].lstrip("# ")) + r"\s*$", "", result).strip()
                return f"{labels['connection_heading']}\n\n{labels['connection_intro']}\n\n{result}"

            repair_prompt = prompt + f"""

The previous connection map was too shallow or too short.
Rewrite with MORE SPECIFIC SOURCE-TO-SOURCE CONNECTIONS.
Mandatory repair:
- Do not explain how to find connections; write the connections themselves.
- Add source-by-source contribution tables.
- Use visual evidence cards where relevant.
- Mention every usable source at least once.
- Add at least 7 concrete connection points if possible.
"""
            repaired = call_connection(repair_prompt, max(MULTISOURCE_CONNECTION_TOKENS, env_int("MULTISOURCE_CONNECTION_REPAIR_TOKENS", 18000)))
            if repaired and not is_refusal_or_useless_response(repaired):
                repaired = re.sub(r"(?m)^#{1,4}\s*" + re.escape(labels["connection_heading"].lstrip("# ")) + r"\s*$", "", repaired).strip()
                return f"{labels['connection_heading']}\n\n{labels['connection_intro']}\n\n{repaired}"
    except Exception:
        pass

    # Deterministic but concrete fallback: source list + visual evidence list. This
    # is not as strong as the LLM connection map, but it avoids generic empty prose.
    visual_rows = "\n".join(
        f"| Visual {i+1} | Source {c.get('source_index')} | {c.get('location')} | {c.get('title')} | {c.get('argument_supported')} |"
        for i, c in enumerate(visual_cards or [])
    ) or "| No visual card | - | - | - | - |"
    fallback = f"""
### Connection Point 1: Source roles across the uploaded pack

**Core question:** What does each source contribute to the larger learning problem?

| Source | Likely role | How to connect it | Evidence basis |
|---|---|---|---|
"""
    for i, u in enumerate(source_units or [], start=1):
        title = u.get('title_candidate') or u.get('display_name') or f'Source {i}'
        visual_status = f"{v20_visual_parts_count(u)} extracted visuals" if v20_source_has_visuals(u) else "text/title evidence only"
        fallback += f"| Source {i} | {title} | Connect this source to repeated concepts, methods, examples, and visuals identified in the source card. | {visual_status} |\n"
    fallback += f"""

### Extracted visual evidence that should be used for arguments

| Visual | Source | Location | Visual title | Argument supported |
|---|---|---|---|---|
{visual_rows}
"""
    return f"{labels['connection_heading']}\n\n{labels['connection_intro']}\n\n{fallback.strip()}"


def assemble_worldclass_multisource_output(source_digest_block: str, connection_block: str, visual_block: str, synthesis: str, preferred_language: str) -> str:
    """v20 order: source notes -> visual evidence -> connection points -> synthesis."""
    labels = worldclass_language_labels(preferred_language)
    parts = [
        labels["guide_title"],
        labels["intro"],
        labels["source_heading"],
        source_digest_block.strip(),
    ]
    if visual_block:
        parts.append(visual_block.strip())
    if connection_block:
        parts.append(connection_block.strip())
    clean_synthesis = synthesis.strip()
    clean_synthesis = re.sub(r"(?m)^#\s+.*Integrated Study Guide.*$", "", clean_synthesis).strip()
    if clean_synthesis:
        parts.append(f"{labels['synthesis_heading']}\n\n{clean_synthesis}")
    return "\n\n".join(part for part in parts if part).strip()
# -----------------------------------------------------------------------------
# This layer reduces unnecessary API cost WITHOUT reducing study-guide depth.
# It does not minify the final user-facing notes. It only optimises:
#   1) internal model prompts, especially stable system prompts;
#   2) internal JSON outputs such as mind-map JSON and visual-card JSON;
#   3) cache storage / network payload size;
#   4) observability of token usage.
# Final generated content remains readable and detailed.

TOKEN_OPTIMIZATION_ENABLED = (os.getenv("ENABLE_TOKEN_OPTIMIZATION", "true").lower() not in {"0", "false", "no"})
COMPACT_SYSTEM_PROMPTS = (os.getenv("COMPACT_SYSTEM_PROMPTS", "true").lower() not in {"0", "false", "no"})
MINIFY_MODEL_JSON = (os.getenv("MINIFY_MODEL_JSON", "true").lower() not in {"0", "false", "no"})
MINIFY_CACHE_JSON = (os.getenv("MINIFY_CACHE_JSON", "true").lower() not in {"0", "false", "no"})
LOG_TOKEN_USAGE = (os.getenv("LOG_TOKEN_USAGE", "true").lower() not in {"0", "false", "no"})
ADD_JSON_MINIFY_HINT = (os.getenv("ADD_JSON_MINIFY_HINT", "true").lower() not in {"0", "false", "no"})

TOKEN_USAGE_WINDOW: List[dict] = []
TOKEN_USAGE_WINDOW_LIMIT = env_int("TOKEN_USAGE_WINDOW_LIMIT", 60)

_JSON_MINIFY_RULE = (
    "When the required output is JSON, return ONLY valid minified JSON on one line: "
    "no markdown fences, no comments, no indentation, no unnecessary whitespace. "
    "Use compact keys only when the schema already allows them."
)


def _v21_is_json_task(messages: List[dict]) -> bool:
    """Detect internal JSON-generation tasks so we can add a minified-JSON rule.

    We intentionally do not apply this to normal study-guide generation because
    user-facing content must remain readable.
    """
    try:
        combined = "\n".join(str(m.get("content", "")) for m in messages if isinstance(m, dict))
    except Exception:
        return False
    lowered = combined.lower()
    return (
        "strict json" in lowered
        or "valid json" in lowered
        or "json object" in lowered
        or "return json" in lowered
        or "mind map json" in lowered
        or "visual evidence card" in lowered and '"title"' in combined
    )


def _v21_compact_instruction_text(text: str) -> str:
    """Compact only instruction text, not source excerpts.

    This removes repeated blank lines and extra spaces from stable instructions,
    which helps exact-prefix prompt caching and reduces input tokens. It avoids
    rewriting mathematical/source content by applying mostly to system messages.
    """
    if not text or not TOKEN_OPTIMIZATION_ENABLED or not COMPACT_SYSTEM_PROMPTS:
        return text
    text = str(text).replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _v21_compact_message_content(content):
    """Compact system strings and text parts while preserving images.

    Multimodal image parts are passed through unchanged. User text containing
    long source excerpts is preserved more carefully; only excessive blank lines
    are trimmed to avoid damaging slide structure.
    """
    if isinstance(content, str):
        return _v21_compact_instruction_text(content)
    if isinstance(content, list):
        new_parts = []
        for part in content:
            if not isinstance(part, dict):
                new_parts.append(part)
                continue
            if part.get("type") == "text":
                value = str(part.get("text", ""))
                value = value.replace("\r\n", "\n").replace("\r", "\n")
                # Preserve source/slide line breaks, but remove very excessive gaps.
                value = re.sub(r"\n{4,}", "\n\n", value).strip()
                new_part = {**part, "text": value}
                new_parts.append(new_part)
            else:
                new_parts.append(part)
        return new_parts
    return content


def _v21_optimise_messages(messages: List[dict]) -> List[dict]:
    if not TOKEN_OPTIMIZATION_ENABLED:
        return messages
    optimised = []
    for message in messages:
        if not isinstance(message, dict):
            optimised.append(message)
            continue
        role = message.get("role")
        content = message.get("content")
        # Compact system/developer prompts aggressively. Preserve user sources more.
        if role in {"system", "developer"}:
            content = _v21_compact_message_content(content)
        elif isinstance(content, list):
            content = _v21_compact_message_content(content)
        elif isinstance(content, str):
            content = re.sub(r"\n{4,}", "\n\n", content).strip()
        optimised.append({**message, "content": content})

    if MINIFY_MODEL_JSON and ADD_JSON_MINIFY_HINT and _v21_is_json_task(optimised):
        # Put the rule at the beginning so it can benefit from prompt caching.
        optimised = [{"role": "system", "content": _JSON_MINIFY_RULE}] + optimised
    return optimised


def _v21_record_usage(response, model_name: str, purpose: str = "chat") -> None:
    if not LOG_TOKEN_USAGE:
        return
    try:
        usage = getattr(response, "usage", None)
        if usage is None:
            return
        item = {
            "ts": int(time.time()),
            "purpose": purpose,
            "model": model_name,
            "prompt_tokens": getattr(usage, "prompt_tokens", None),
            "completion_tokens": getattr(usage, "completion_tokens", None),
            "total_tokens": getattr(usage, "total_tokens", None),
        }
        TOKEN_USAGE_WINDOW.append(item)
        del TOKEN_USAGE_WINDOW[:-TOKEN_USAGE_WINDOW_LIMIT]
        logger.info(
            "Token usage: model=%s prompt=%s completion=%s total=%s",
            model_name,
            item["prompt_tokens"],
            item["completion_tokens"],
            item["total_tokens"],
        )
    except Exception:
        return


def _v21_selected_model(primary_model: str) -> str:
    """Return only the selected provider's requested model; retries stay local."""
    return normalise_space(primary_model or CHAT_MODEL) or CHAT_MODEL


def _v21_is_payload_compatibility_error(message: str) -> bool:
    return any(term in message for term in ("temperature", "max_tokens", "max_completion_tokens"))


from contextvars import ContextVar


AI_CALL_TRACE: ContextVar[Optional[List[dict]]] = ContextVar("AI_CALL_TRACE", default=None)


def begin_ai_call_trace():
    return AI_CALL_TRACE.set([])


def reset_ai_call_trace(token) -> None:
    if token is not None:
        AI_CALL_TRACE.reset(token)


def current_ai_call_trace() -> List[dict]:
    trace = AI_CALL_TRACE.get()
    if isinstance(trace, list):
        return list(trace)
    return []


def _sanitize_ai_error(error: Exception | str, max_chars: int = 280) -> str:
    message = str(error or "")
    message = re.sub(r"sk-[A-Za-z0-9_-]+", "sk-...", message)
    message = re.sub(r"AIza[0-9A-Za-z_-]+", "AIza...", message)
    message = re.sub(r"ya29\\.[0-9A-Za-z._-]+", "ya29...", message)
    return truncate_text(normalise_space(message), max_chars)


def _record_ai_call_event(event: dict) -> None:
    trace = AI_CALL_TRACE.get()
    if not isinstance(trace, list):
        return
    safe_event = {
        "ts": int(time.time()),
        "stage": event.get("stage") or "chat",
        "provider": normalise_text_provider(event.get("provider", "")) if "normalise_text_provider" in globals() else event.get("provider", ""),
        "model": normalise_space(str(event.get("model") or "")),
        "requested_model": normalise_space(str(event.get("requested_model") or "")),
        "status": event.get("status") or "unknown",
        "api_request_attempted": bool(event.get("api_request_attempted")),
    }
    for key in ("duration_ms", "prompt_tokens", "completion_tokens", "total_tokens", "error_type", "error"):
        if key in event and event.get(key) not in (None, ""):
            safe_event[key] = event.get(key)
    trace.append(safe_event)


def ai_call_trace_payload(trace: Optional[List[dict]], provider: str, source: str = "model") -> dict:
    events = list(trace or [])
    request_events = [event for event in events if event.get("api_request_attempted")]
    success_events = [event for event in request_events if event.get("status") == "success"]
    failed_events = [event for event in request_events if event.get("status") != "success"]
    fallback_events = [event for event in events if event.get("status") == "fallback"]
    main_fallback = any(event.get("stage") == "main_notes" for event in fallback_events)
    if source == "cache":
        generation_source = "cache"
    elif main_fallback:
        generation_source = "fallback"
    elif success_events:
        generation_source = "model"
    elif request_events:
        generation_source = "failed_model"
    else:
        generation_source = source or "unknown"
    models = []
    for event in request_events:
        model_name = event.get("model") or event.get("requested_model")
        if model_name and model_name not in models:
            models.append(model_name)
    last_error = ""
    for event in reversed(events):
        if event.get("error"):
            last_error = event.get("error", "")
            break
    fallback_stages = []
    for event in fallback_events:
        stage = event.get("stage")
        if stage and stage not in fallback_stages:
            fallback_stages.append(stage)
    auxiliary_fallback = bool(fallback_events) and not main_fallback
    diagnostics = {
        "source": generation_source,
        "provider": normalise_text_provider(provider) if "normalise_text_provider" in globals() else provider,
        "model_call_count": len(request_events),
        "successful_model_calls": len(success_events),
        "failed_model_calls": len(failed_events),
        "models": models,
        "fallback_used": bool(main_fallback),
        "auxiliary_fallback_used": auxiliary_fallback,
        "fallback_stages": fallback_stages,
        "last_error": last_error,
        "events": events[-12:],
    }
    return {
        "ai_generation": diagnostics,
        "ai_generation_source": generation_source,
        "ai_model_call_count": diagnostics["model_call_count"],
        "ai_successful_model_call_count": diagnostics["successful_model_calls"],
        "ai_failed_model_call_count": diagnostics["failed_model_calls"],
        "ai_fallback_used": diagnostics["fallback_used"],
    }


# Override existing helper. Keeps backwards compatibility with old calls.
def generate_chat(
    messages: List[dict],
    model: str = CHAT_MODEL,
    temperature: float = 0,
    max_tokens: int = 4500,
    request_timeout: Optional[float] = None,
    provider_options: Optional[dict] = None,
) -> str:
    active_client = text_generation_client()
    provider = active_text_provider() if "active_text_provider" in globals() else AI_TEXT_PROVIDER
    if active_client is None:
        _record_ai_call_event({
            "stage": "chat",
            "provider": provider,
            "model": model or CHAT_MODEL,
            "status": "configuration_error",
            "api_request_attempted": False,
            "error_type": "RuntimeError",
            "error": "Text generation client is not configured.",
        })
        if provider == "gemini":
            if GEMINI_AUTH_MODE == "adc":
                raise RuntimeError("Gemini ADC is not configured. Add GEMINI_PROJECT_ID to backend/.env.gemini, run gcloud auth application-default login, then restart the backend.")
            raise RuntimeError("GEMINI_API_KEY is not configured. Add it to backend/.env.gemini and restart the backend.")
        raise RuntimeError("OPENAI_API_KEY is not configured. Add it to backend/.env and restart the backend.")

    model_name = model or CHAT_MODEL
    optimised_messages = _v21_optimise_messages(messages)
    request_options = {}
    if request_timeout is not None:
        try:
            timeout_value = max(1.0, float(request_timeout))
            request_options["timeout"] = timeout_value
        except Exception:
            request_options = {}
    if provider_options:
        request_options["extra_body"] = provider_options

    # Some newer models may reject temperature or prefer max_completion_tokens.
    # Try several compatible payload shapes, preserving the previous robustness.
    last_error = None
    candidate_model = _v21_selected_model(model_name)
    payloads = [
        {"model": candidate_model, "messages": optimised_messages, "temperature": temperature, "max_tokens": max_tokens, **request_options},
        {"model": candidate_model, "messages": optimised_messages, "max_tokens": max_tokens, **request_options},
        {"model": candidate_model, "messages": optimised_messages, "temperature": temperature, "max_completion_tokens": max_tokens, **request_options},
        {"model": candidate_model, "messages": optimised_messages, "max_completion_tokens": max_tokens, **request_options},
    ]
    for kwargs in payloads:
        call_started_at = time.monotonic()
        try:
            response = active_client.chat.completions.create(**kwargs)
            _v21_record_usage(response, candidate_model)
            usage = getattr(response, "usage", None)
            _record_ai_call_event({
                "stage": "chat",
                "provider": provider,
                "requested_model": model_name,
                "model": candidate_model,
                "status": "success",
                "api_request_attempted": True,
                "duration_ms": int((time.monotonic() - call_started_at) * 1000),
                "prompt_tokens": getattr(usage, "prompt_tokens", None) if usage is not None else None,
                "completion_tokens": getattr(usage, "completion_tokens", None) if usage is not None else None,
                "total_tokens": getattr(usage, "total_tokens", None) if usage is not None else None,
            })
            content = response.choices[0].message.content or ""
            # If the task is JSON and the model still pretty-printed JSON, compact it.
            if MINIFY_MODEL_JSON and _v21_is_json_task(optimised_messages):
                try:
                    parsed = extract_json_object(content)
                    if isinstance(parsed, dict):
                        return json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
                except Exception:
                    pass
            return content
        except Exception as exc:
            last_error = exc
            msg = str(exc).lower()
            _record_ai_call_event({
                "stage": "chat",
                "provider": provider,
                "requested_model": model_name,
                "model": candidate_model,
                "status": "error",
                "api_request_attempted": True,
                "duration_ms": int((time.monotonic() - call_started_at) * 1000),
                "error_type": type(exc).__name__,
                "error": _sanitize_ai_error(exc),
            })
            if _v21_is_payload_compatibility_error(msg):
                continue
            raise
    raise last_error if last_error else RuntimeError("Text generation request failed.")


@app.get("/health/token-optimization")
def health_token_optimization():
    """Quick dashboard for checking whether token optimisation is active."""
    return {
        "status": "ok",
        "enabled": TOKEN_OPTIMIZATION_ENABLED,
        "compact_system_prompts": COMPACT_SYSTEM_PROMPTS,
        "minify_model_json": MINIFY_MODEL_JSON,
        "minify_cache_json": MINIFY_CACHE_JSON,
        "json_minify_hint": ADD_JSON_MINIFY_HINT,
        "log_token_usage": LOG_TOKEN_USAGE,
        "recent_usage": TOKEN_USAGE_WINDOW[-10:],
        "cache_file": str(CACHE_PATH),
        "cache_version": CACHE_VERSION,
        "note": "Final user-facing study guides are not minified; only internal JSON/prompts/cache are optimised.",
    }

# -----------------------------------------------------------------------------
# v22 Controlled Inline Visual Professor Mode
# -----------------------------------------------------------------------------
# Purpose:
# - Keep the existing HTML/CSS/loading animation unchanged.
# - Shorten waiting time by replacing the old multi-pass source-card + synthesis
#   pipeline with a controlled one-pass study guide plus one batched visual pass.
# - Put useful PDF/PPT visuals directly inside the generated content with
#   [[VISUAL:n]] markers; the existing frontend renderer turns those markers into
#   inline image cards.
# - Prefer relevant teaching visuals in context; keep decorative material out,
#   but do not be timid about diagrams, tables, charts, workflows, or worked examples.

CONTROLLED_INLINE_VISUAL_MODE = os.getenv("CONTROLLED_INLINE_VISUAL_MODE", "true").lower() not in {"0", "false", "no"}
CONTROLLED_MAX_VISUALS = max(1, env_int("CONTROLLED_MAX_VISUALS", 8))
CONTROLLED_MAX_SOURCE_CONTEXT_CHARS = env_int("CONTROLLED_MAX_SOURCE_CONTEXT_CHARS", 110000)
CONTROLLED_MAX_CHARS_PER_SOURCE = env_int("CONTROLLED_MAX_CHARS_PER_SOURCE", 18000)
CONTROLLED_OUTPUT_TOKENS = env_int("CONTROLLED_OUTPUT_TOKENS", 16000)
CONTROLLED_VISUAL_CARD_TOKENS = env_int("CONTROLLED_VISUAL_CARD_TOKENS", 3200)
CONTROLLED_VISUAL_RENDER_DPI = env_int("CONTROLLED_VISUAL_RENDER_DPI", 115)
CONTROLLED_MAX_PDF_PAGES_PER_SOURCE = env_int("CONTROLLED_MAX_PDF_PAGES_PER_SOURCE", 10)
CONTROLLED_MAX_PPTX_SLIDES_PER_SOURCE = env_int("CONTROLLED_MAX_PPTX_SLIDES_PER_SOURCE", 10)
CONTROLLED_INCLUDE_SOURCE_CARDS = os.getenv("CONTROLLED_INCLUDE_SOURCE_CARDS", "false").lower() not in {"0", "false", "no"}
