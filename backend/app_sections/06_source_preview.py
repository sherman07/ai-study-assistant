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
