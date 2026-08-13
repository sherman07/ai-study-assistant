def _v23_meaningful_card_text(value: str) -> str:
    text = normalise_space(value or "")
    if not text:
        return ""
    if re.search(
        r"\b("
        r"direct support|nearby concept|uploaded material|source figure|visual evidence|"
        r"connect this source figure|main concept|other uploaded materials|read the labels/title first"
        r")\b",
        text,
        flags=re.I,
    ):
        return ""
    return clean_source_figure_caption(text)


def _v23_default_how_to_read(kind: str, preferred_language: str) -> str:
    key = normalise_language_key(preferred_language)
    kind = normalise_space(kind or "")
    if key in {"simplified_chinese", "mixed_chinese_english"}:
        mapping = {
            "data/table": "先看行列分别在比较什么，再抓住最大/最小值、均值/比例和组间差异；最后问这些数字支持或限制了哪个论点。",
            "graph/chart": "先读标题和坐标轴，再看趋势方向、组间差异、异常点和变量关系；不要只记图形，要说清它证明了什么。",
            "diagram/model": "按标签、箭头或空间位置读图：先确定组成部分，再解释它们之间的关系和机制。",
            "experiment/event": "先分清参与者、条件、步骤和结果，再说明这个实验设计如何检验一个理论假设。",
            "formula/calculation": "先识别每个变量代表什么，再看公式如何把变量关系转化为可计算的结论。",
            "method/result figure": "先看研究方法或测量对象，再把结果与讲义中的理论主张连接起来，同时注意样本和方法限制。",
        }
    elif key == "traditional_chinese":
        mapping = {
            "data/table": "先看行列分別在比較什麼，再抓住最大/最小值、均值/比例和組間差異；最後問這些數字支持或限制了哪個論點。",
            "graph/chart": "先讀標題和座標軸，再看趨勢方向、組間差異、異常點和變量關係；不要只記圖形，要說清它證明了什麼。",
            "diagram/model": "按標籤、箭頭或空間位置讀圖：先確定組成部分，再解釋它們之間的關係和機制。",
            "experiment/event": "先分清參與者、條件、步驟和結果，再說明這個實驗設計如何檢驗一個理論假設。",
            "formula/calculation": "先識別每個變量代表什麼，再看公式如何把變量關係轉化為可計算的結論。",
            "method/result figure": "先看研究方法或測量對象，再把結果與講義中的理論主張連接起來，同時注意樣本和方法限制。",
        }
    else:
        mapping = {
            "data/table": "Read the rows and columns first, then identify the key values, contrasts, and limits. Ask what claim the numbers support or qualify.",
            "graph/chart": "Read the title and axes first, then describe the trend, group difference, outlier, or variable relationship before interpreting it.",
            "diagram/model": "Follow the labels, arrows, or spatial layout: identify the parts, then explain the relationship or mechanism between them.",
            "experiment/event": "Identify the participants, conditions, sequence, and result, then explain how the design tests the theory.",
            "formula/calculation": "Identify what each variable means, then explain how the formula turns the relationship into a usable conclusion.",
            "method/result figure": "Read the method or measurement first, then connect the result to the lecture claim and note any sample or method limit.",
        }
    return mapping.get(kind, mapping.get("diagram/model", "Read the labels and relationship first, then connect the visual to the claim it is meant to support."))


def _v23_source_figure_note_block(card: dict, marker_index: int, preferred_language: str) -> str:
    return f"\n\n[[VISUAL:{marker_index}]]\n\n"


def ensure_markdown_note_headings(summary: str, preferred_language: str) -> str:
    """Promote common note labels to markdown headings so navigation is stable."""
    if not summary:
        return summary
    heading_pattern = re.compile(
        r"^\s*(?:"
        r"Source question|Direct source claims|Source evidence|Inferences allowed by the source|Gaps\s*/\s*limits|Exam\s*/\s*research use|Compact revision summary|"
        r"Learning question|Key takeaways?|Core concept map|Main notes by lecture section|Key terms table|Case study\s*/\s*example breakdown|"
        r"Evidence bank|Exam answer templates|Common mistakes|Revision checklist|Flashcard-ready summary|"
        r"Source and argument map|Core notes|Key terms(?: and mechanisms)?|Core argument|Key ideas?|Concepts? explained|"
        r"Sources? \(|Sources?:|Source evidence(?:\s*/\s*example matrix)?|Reading the source evidence|Worked examples?|Evidence matrix|Comparison table|"
        r"Exam strategy|Common mistakes|Revision(?: checklist)?|Conclusion|"
        r"学习问题|关键结论|核心概念图|分章节主笔记|关键术语表|案例\s*/\s*例子拆解|证据库|考试答题模板|常见错误|复习清单|闪卡速记总结|"
        r"學習問題|關鍵結論|核心概念圖|分章節主筆記|關鍵術語表|案例\s*/\s*例子拆解|證據庫|考試答題模板|常見錯誤|複習清單|閃卡速記總結|"
        r"来源与论点地图|來源與論點地圖|核心笔记|核心筆記|关键术语与机制|關鍵術語與機制|核心论点|关键概念|源内证据|源內證據|证据矩阵|例子与证据|概念比较表|"
        r"考试策略|考試策略|复习|復習|结论|結論"
        r")\b.*$",
        flags=re.I,
    )
    lines: List[str] = []
    heading_count = 0
    for raw_line in summary.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if re.match(r"^#{1,4}\s+", stripped):
            heading_count += 1
            lines.append(line)
            continue
        if heading_pattern.match(stripped) and len(stripped) <= 140:
            heading_count += 1
            lines.append(f"## {stripped}")
        else:
            lines.append(line)

    text = "\n".join(lines).strip()
    if heading_count <= 1:
        key = normalise_language_key(preferred_language)
        heading = "## 核心笔记" if key in {"simplified_chinese", "mixed_chinese_english"} else "## Core Notes"
        first_heading = re.search(r"^#\s+.+$", text, flags=re.M)
        if first_heading:
            insert_at = first_heading.end()
            text = text[:insert_at] + "\n\n" + heading + text[insert_at:]
        else:
            text = heading + "\n\n" + text
    return text


def validate_source_strict_summary(
    summary: str,
    preferred_language: str,
    note_length_mode: str = DEFAULT_NOTE_LENGTH_MODE,
) -> str:
    rebuilt = validate_note_output("source_strict_research_mode", summary or "", {
        "requested_language": preferred_language,
        "generation_language": preferred_language,
        "preferred_language": preferred_language,
        "note_length_mode": note_length_mode,
    })
    rebuilt = remove_auto_bilingual_heading_leakage(rebuilt, preferred_language, rebuilt)
    rebuilt = polish_note_readability_markdown(rebuilt, preferred_language)
    rebuilt = ensure_markdown_note_headings(rebuilt, preferred_language)
    return rebuilt.strip()


def _v23_fallback_visual_cards(candidates: List[dict], labels: dict, preferred_language: str = "auto") -> List[dict]:
    """Guarantee source figures render when the vision filter is overly cautious."""
    cards: List[dict] = []
    for cand in candidates or []:
        if not _v23_candidate_has_source_teaching_value(cand):
            continue
        caption = clean_source_figure_caption(cand.get("caption") or "")
        kind = normalise_space(cand.get("visual_kind") or "")
        location = normalise_space(cand.get("location") or "")
        kind_title = kind.replace("/", " / ").title() if kind and kind != "unknown" else labels.get("figure_title", "Source figure")
        caption_title = truncate_text(re.sub(r"^(?:Render-mode|visual-score)\b.*?\.\s*", "", caption).strip(), 72)
        title = caption_title if len(caption_title) >= 8 else kind_title
        cards.append({
            "index": len(cards),
            "source_index": cand.get("source_index"),
            "source_title": cand.get("source_title", ""),
            "location": location,
            "caption": caption,
            "url": cand.get("url", ""),
            "title": title,
            "what_shows": caption,
            "argument_supported": "Read the visible data, labels, or comparison, then connect that concrete pattern back to the nearby concept.",
            "cross_source_connection": "",
            "how_to_read": _v23_default_how_to_read(kind, preferred_language),
            "exam_use": "Describe what is visible, interpret it, then state the limitation or implication.",
            "visual_kind": kind,
        })
        cards[-1] = _v23_enrich_visual_card_details(cards[-1], labels, preferred_language)
        if len(cards) >= CONTROLLED_MAX_VISUALS:
            break
    return cards


def _v23_marker_block(card: dict, marker_index: int, preferred_language: str) -> str:
    return _v23_source_figure_note_block(card, marker_index, preferred_language)


def _v23_ensure_visual_note_blocks(summary: str, cards: List[dict], preferred_language: str) -> str:
    """Replace bare visual markers with inline source-figure reading notes."""
    text = summary or ""
    for marker_index, card in enumerate(cards or []):
        marker = f"[[VISUAL:{marker_index}]]"
        if marker not in text:
            continue
        pos = text.find(marker)
        window_before = text[max(0, pos - 360):pos]
        if re.search(r"Source-figure reading note|Figure focus|图表焦点|圖表焦點|源内图表讲解|源內圖表講解", window_before, flags=re.I):
            continue
        text = text.replace(marker, _v23_source_figure_note_block(card, marker_index, preferred_language).strip(), 1)
    return text


def remove_standalone_visual_diagram_headings(summary: str) -> str:
    """Remove old standalone visual-feature headings so figures stay fused into notes."""
    visual_heading_pattern = re.compile(
        r"^#{1,4}\s*(?:"
        r"visual\s*(?:/|and)?\s*diagram(?:-based)?(?:\s*explanation)?|"
        r"visual\s*evidence(?:\s*in\s*context)?|"
        r"source\s*figures(?:\s*in\s*context)?|"
        r"source\s*visuals|"
        r"diagram(?:-based)?\s*explanation|"
        r"图像证据|圖像證據|视觉证据|視覺證據|来源图表|來源圖表|图表说明|圖表說明"
        r")\b.*$",
        flags=re.I,
    )
    kept: List[str] = []
    for line in (summary or "").splitlines():
        if visual_heading_pattern.match(line.strip()):
            continue
        kept.append(line)
    text = "\n".join(kept)
    text = re.sub(r"\bVisual evidence in Context\b", "", text, flags=re.I)
    text = re.sub(r"\bVisual evidence\b", "Source example", text, flags=re.I)
    text = re.sub(r"图像证据|圖像證據", "来源例子", text)
    return re.sub(r"\n{4,}", "\n\n\n", text).strip()


VISUAL_CARD_SECTION_HEADING_RE = re.compile(
    r"^#{1,6}\s*(?:"
    r"source\s+examples?\s+and\s+evidence|"
    r"source\s+evidence\s+table|"
    r"source\s+figures?(?:\s+and\s+evidence|\s+in\s+context)?|"
    r"source\s+visuals?|"
    r"visual\s+evidence(?:\s+in\s+context)?|"
    r"visual\s*/\s*diagram(?:-based)?\s*explanation|"
    r"diagram(?:-based)?\s*explanation|"
    r"图像证据|圖像證據|视觉证据|視覺證據|来源图表|來源圖表|图表说明|圖表說明"
    r")\b.*$",
    flags=re.I,
)

VISUAL_CARD_POLLUTION_RE = re.compile(
    r"(?i)(?:"
    r"this\s+source\s+figure\s+belongs\s+in\s+the\s+notes\s+because|"
    r"making\s+the\s+method,\s*pattern,\s*mechanism,\s*or\s*contrast\s+visible|"
    r"memorise\s+an\s+abstract\s+claim|"
    r"figure\s+focus\s*:|"
    r"source-figure\s+reading\s+note\s*:|"
    r"图表焦点|圖表焦點|源内图表讲解|源內圖表講解"
    r")"
)


def _markdown_heading_level(line: str) -> int:
    match = re.match(r"^(#{1,6})\s+", line.strip())
    return len(match.group(1)) if match else 0


def strip_visual_card_pollution(summary: str) -> str:
    """Keep visual-card prose out of notes while preserving renderable marker tokens."""
    text = str(summary or "")
    if not text:
        return ""

    kept_lines: List[str] = []
    skipping_visual_section_level = 0
    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        heading_level = _markdown_heading_level(stripped)

        if skipping_visual_section_level:
            if heading_level and heading_level <= skipping_visual_section_level:
                skipping_visual_section_level = 0
            else:
                continue

        if VISUAL_CARD_SECTION_HEADING_RE.match(stripped):
            skipping_visual_section_level = heading_level or 6
            continue

        kept_lines.append(raw_line.rstrip())

    text = "\n".join(kept_lines)
    text = re.sub(
        r"(?im)^\s*\*?(?:Figure focus|Source-figure reading note|图表焦点|圖表焦點|源内图表讲解|源內圖表講解)\s*[:：].*?\*?\s*$",
        "",
        text,
    )
    text = re.sub(r"\s+(?:near|beside|next to|below|above)\s+(\[\[VISUAL:\d+\]\])", r"\n\n\1", text, flags=re.I)

    blocks = re.split(r"(\n{2,})", text)
    cleaned_blocks: List[str] = []
    for block in blocks:
        if block.startswith("\n"):
            cleaned_blocks.append(block)
            continue
        if VISUAL_CARD_POLLUTION_RE.search(normalise_space(block)):
            continue
        cleaned_blocks.append(block)

    text = "".join(cleaned_blocks)
    text = re.sub(r"[ \t]+([.,;:])", r"\1", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def enforce_thetawave_inline_note_format(summary: str, cards: List[dict], preferred_language: str) -> str:
    summary = _v22_ensure_visual_markers(summary or "", cards or [], preferred_language)
    return remove_standalone_visual_diagram_headings(summary)


def _v22_ensure_visual_markers(summary: str, cards: List[dict], preferred_language: str) -> str:
    """v23 override: insert missing visuals near relevant text, not in an end gallery."""
    summary = summary or ""
    if not cards:
        return summary
    existing = {int(x) for x in re.findall(r"\[\[VISUAL:(\d+)\]\]", summary)}
    missing = [i for i in range(len(cards)) if i not in existing]
    if not missing:
        return summary

    blocks = re.split(r"(\n{2,})", summary.rstrip())
    paragraph_indices = [i for i in range(0, len(blocks), 2) if blocks[i].strip()]
    used_paragraphs = set()
    for marker_index in missing:
        card = cards[marker_index]
        keywords = _v23_keywords_for_card(card)
        location_terms = _v23_location_terms(card)
        best_i = None
        best_score = -1
        for i in paragraph_indices:
            if i in used_paragraphs or f"[[VISUAL:{marker_index}]]" in blocks[i]:
                continue
            text = blocks[i].lower()
            if text.startswith("#"):
                continue
            score = sum(1 for keyword in keywords if keyword and keyword in text)
            score += 4 * sum(1 for term in location_terms if term and term.lower() in text)
            if "visual" in text or "图" in text or "表" in text:
                score += 1
            if re.search(r"\b(ultimatum|dictator|bowles|gintis|correlation|maoa|genotype|heritability|chimp|公平|最后通牒|独裁者|相关|基因|遗传)\b", text, flags=re.I):
                score += 2
            if score > best_score:
                best_score = score
                best_i = i
        if best_i is None or best_score <= 0:
            # Prefer the visual-argument section if the model created one.
            for i in paragraph_indices:
                if re.search(r"Source Figures|来源图表|图像|圖像|Diagram|图表|圖表|Data|数据", blocks[i], flags=re.I):
                    best_i = i
                    break
        if best_i is None:
            best_i = paragraph_indices[min(marker_index, len(paragraph_indices) - 1)] if paragraph_indices else 0
        blocks[best_i] = _v23_remove_visible_slide_refs(blocks[best_i]).rstrip() + _v23_marker_block(card, marker_index, preferred_language)
        used_paragraphs.add(best_i)
    return "".join(blocks).strip()


def expand_sparse_inline_summary(
    summary: str,
    source_context: str,
    visual_context: str,
    preferred_language: str,
    min_units: int,
    force: bool = False,
    quality_gaps: Optional[List[str]] = None,
    prompt_mode: str = DEFAULT_NOTE_PROMPT_MODE,
) -> str:
    """Expand notes only when the first pass became too thin after adding visuals."""
    if not note_prompt_mode_allows_expansion(prompt_mode):
        return summary
    if not summary or (not force and count_readable_units(summary) >= min_units):
        return summary
    language_rule = language_instruction_for(preferred_language)
    prompt_mode_key = normalise_note_prompt_mode(prompt_mode)
    prompt_mode_label = note_prompt_mode_label(prompt_mode_key)
    prompt = build_note_prompt({
        "prompt_mode": prompt_mode_key,
        "prompt_mode_label": prompt_mode_label,
        "language_rule": language_rule,
        "source_context": truncate_text(source_context, 45000),
        "visual_context": visual_context if visual_context else "No visual card metadata.",
        "recommended_structure": note_structure_for_language(preferred_language, source_context, prompt_mode_key),
        "is_expansion": True,
        "current_summary": summary,
        "quality_gaps": quality_gaps or [],
    })
    try:
        expanded = generate_chat(
            [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
            model=model_for_depth("detailed"),
            temperature=0,
            max_tokens=CONTROLLED_OUTPUT_TOKENS,
        ).strip()
        original_units = count_readable_units(summary)
        expanded_units = count_readable_units(expanded)
        original_markers = set(re.findall(r"\[\[VISUAL:\d+\]\]", summary))
        expanded_markers = set(re.findall(r"\[\[VISUAL:\d+\]\]", expanded))
        minimum_units = max(int(min_units * 0.85), int(original_units * 0.9)) if force else max(original_units + 500, int(min_units * 0.85))
        if (
            expanded
            and not is_refusal_or_useless_response(expanded)
            and expanded_units >= minimum_units
            and original_markers.issubset(expanded_markers)
        ):
            return expanded
    except Exception as error:
        if "_record_ai_call_event" in globals():
            _record_ai_call_event({
                "stage": "note_expansion",
                "provider": active_text_provider() if "active_text_provider" in globals() else AI_TEXT_PROVIDER,
                "model": model_for_depth("detailed") if "model_for_depth" in globals() else CHAT_MODEL,
                "status": "fallback",
                "api_request_attempted": False,
                "error_type": type(error).__name__,
                "error": _sanitize_ai_error(error) if "_sanitize_ai_error" in globals() else str(error),
            })
        pass
    return summary


def analysis_stage_has_budget(analysis_started_at: Optional[float], min_remaining_seconds: int) -> bool:
    if analysis_started_at is None:
        return True
    try:
        remaining = analysis_remaining_seconds_since(float(analysis_started_at))
        return remaining >= max(0, int(min_remaining_seconds))
    except Exception:
        return True


def record_skipped_analysis_stage(skipped_optional_stages: Optional[List[str]], stage: str) -> None:
    if isinstance(skipped_optional_stages, list) and stage not in skipped_optional_stages:
        skipped_optional_stages.append(stage)


def analysis_model_call_timeout(
    analysis_started_at: Optional[float],
    reserve_seconds: int = 0,
    default_seconds: Optional[int] = None,
) -> Optional[float]:
    try:
        provider_timeout = max(1.0, float(OPENAI_TIMEOUT_SECONDS))
    except Exception:
        provider_timeout = 240.0
    try:
        default_timeout = max(1.0, float(default_seconds)) if default_seconds is not None else provider_timeout
    except Exception:
        default_timeout = provider_timeout
    if analysis_started_at is None:
        return min(provider_timeout, default_timeout)
    available = analysis_remaining_seconds_since(float(analysis_started_at)) - max(0, int(reserve_seconds or 0))
    return max(1.0, min(provider_timeout, default_timeout, available))


def visual_card_model_budget(analysis_started_at: Optional[float], skipped_optional_stages: Optional[List[str]]) -> Tuple[bool, Optional[float]]:
    notes_reserve = env_int("MAIN_NOTES_STAGE_MIN_SECONDS", 120)
    visual_timeout = env_int("VISUAL_CARD_MODEL_TIMEOUT_SECONDS", 45)
    min_remaining = max(
        env_int("VISUAL_CARD_STAGE_MIN_SECONDS", 80),
        notes_reserve + max(1, visual_timeout),
    )
    if not analysis_stage_has_budget(analysis_started_at, min_remaining):
        record_skipped_analysis_stage(skipped_optional_stages, "visual_card_filter")
        return False, None
    return True, analysis_model_call_timeout(
        analysis_started_at,
        reserve_seconds=notes_reserve,
        default_seconds=visual_timeout,
    )


PROFESSIONAL_FALLBACK_MAX_POINTS = 7


def _professional_split_source_excerpt(excerpt: str) -> List[str]:
    value = normalise_space(excerpt or "")
    if not value:
        return []
    marker_split = re.split(
        r"(?=\[(?:PPT\s+SLIDE|PDF\s+PAGE|SLIDE)\s*\d+\]|\bLecture\s+\d+\s*[:.-])",
        value,
        flags=re.I,
    )
    chunks = [normalise_space(chunk) for chunk in marker_split if count_readable_units(chunk) >= 4]
    if len(chunks) >= 2:
        return chunks[:PROFESSIONAL_FALLBACK_MAX_POINTS]

    sentence_split = re.split(r"(?<=[.!?])\s+(?=[A-Z\[])", value)
    chunks = [normalise_space(chunk) for chunk in sentence_split if count_readable_units(chunk) >= 10]
    if chunks:
        return chunks[:PROFESSIONAL_FALLBACK_MAX_POINTS]
    return [value]


def _professional_anchor_title(source_title: str, segment: str, index: int) -> str:
    has_explicit_segment_marker = re.match(
        r"^\s*(?:\[(?:PPT\s+SLIDE|PDF\s+PAGE|SLIDE)\s*\d+\]|\bLecture\s+\d+\s*[:.-])",
        segment or "",
        flags=re.I,
    )
    if not has_explicit_segment_marker and source_title and not re.search(r"(?i)^uploaded file$|^source \d+$", source_title):
        return source_title
    cleaned = re.sub(r"^\s*\[(?:PPT\s+SLIDE|PDF\s+PAGE|SLIDE)\s*\d+\]\s*", "", segment or "", flags=re.I)
    if re.match(r"(?i)^learning objectives\b", cleaned):
        return "Learning Objectives"
    quoted = re.search(r"[\"“']([^\"”']{4,90})[\"”']", cleaned)
    if quoted:
        return normalise_space(quoted.group(1))
    colon_match = re.search(r"([A-Z][^.!?\[]{0,90}?):", cleaned)
    if colon_match:
        return normalise_space(colon_match.group(1))
    title = normalise_space(re.split(r"(?<=[.!?])\s+", cleaned)[0] if cleaned else "")
    title = re.sub(r"\b(?:PPT|PDF)\s+(?:SLIDE|PAGE)\s+\d+\b", "", title, flags=re.I)
    title = truncate_text(title, 90)
    if title:
        return title
    return f"{source_title} anchor {index}"
