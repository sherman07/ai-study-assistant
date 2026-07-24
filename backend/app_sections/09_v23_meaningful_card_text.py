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


def _professional_concept_teaching(point: dict) -> dict:
    text = f"{point.get('title', '')} {point.get('excerpt', '')}".lower()

    if re.search(r"\blife[- ]?span\b|\bdevelopmental\b|growing up|growing older", text):
        return {
            "core": "The core idea is developmental change across the life-span: the source is asking how psychological abilities, behaviour, reasoning, and adaptation change with age rather than treating psychology as a fixed snapshot of adults.",
            "exam": "Likely questions ask why developmental psychology matters, how life-span thinking changes an explanation, or how a developmental scientist would study change over time.",
            "trap": "A weak answer treats development as only childhood or only lists ages. A strong answer explains the pattern of change and the evidence or method used to study it.",
            "application": "In a new case, identify the age or developmental stage, name the ability or behaviour changing, then explain the mechanism or evidence that shows change.",
        }
    if re.search(r"\bpiaget|\breflexes?\b|reason|piagetian", text):
        return {
            "core": "The core idea is the movement from simple sensorimotor responses toward structured reasoning. Piaget matters here because the source is using him as a theory of how children's thinking changes qualitatively, not just how they know more facts.",
            "exam": "Likely questions ask students to explain Piaget's developmental logic, apply it to an unfamiliar child behaviour, or critique whether a task really shows a stage of reasoning.",
            "trap": "A weak answer memorises Piaget's name without explaining the mechanism. A strong answer connects behaviour, stage logic, and what the evidence can or cannot prove.",
            "application": "When given a child example, ask what kind of reasoning the child shows, what task condition reveals it, and whether the behaviour fits or challenges a Piagetian interpretation.",
        }
    if re.search(r"\bmemory\b|\bnumber\b|\bphysics\b|core topics", text):
        return {
            "core": "The core idea is that developmental psychology studies specific cognitive systems, such as memory, number understanding, and physical reasoning, to see how children build increasingly organised models of the world.",
            "exam": "Likely questions ask students to compare cognitive domains, interpret an experimental task, or explain what a child's response shows about an underlying concept.",
            "trap": "A weak answer says children simply get better with age. A strong answer explains which cognitive system is being tested and what the task reveals about representation or reasoning.",
            "application": "For a new task, identify the cognitive domain, the response being measured, and the inference the researcher is allowed to make from that response.",
        }
    if re.search(r"\baggression\b|selfish|cooperat|fairness|violent|human nature", text):
        return {
            "core": "The core idea is whether behaviour should be explained as fixed human nature or as a response shaped by context, evidence, incentives, and social conditions.",
            "exam": "Likely questions ask students to compare selfishness and cooperation claims, evaluate evidence, or apply a theory of aggression or fairness to a new case.",
            "trap": "A weak answer turns one example into a universal claim. A strong answer separates what the source directly shows from what it only suggests.",
            "application": "In a new case, identify the behaviour, the proposed cause, the evidence for that cause, and the limit of the conclusion.",
        }
    if re.search(r"\bvector|magnitude|direction|component|axes|angle", text):
        return {
            "core": "The core idea is that vectors represent quantities with both size and direction, so problem solving depends on choosing axes, resolving components, and preserving sign and units.",
            "exam": "Likely questions ask students to resolve a vector, interpret a diagram, or explain why a component method fits the geometry.",
            "trap": "A weak answer memorises formulas without tracking the angle reference or sign convention. A strong answer explains the geometry before calculating.",
            "application": "In a new problem, draw axes, identify the angle reference, resolve components, and check whether the result's sign and unit make physical sense.",
        }
    return {
        "core": f"The core idea is the relationship between {point.get('term_phrase') or point.get('title')}: what the source states, why that point matters, and what condition controls whether it applies.",
        "exam": "Likely questions ask students to define the source idea, explain the mechanism or reasoning behind it, and apply it to a new example without overstating the evidence.",
        "trap": "A weak answer repeats the source wording. A strong answer names the concept, explains how it works, and states the limit of the source evidence.",
        "application": "In a new question, identify the matching source concept, state the condition or assumption, explain the mechanism, and then test the limit.",
    }


def _professional_low_value_anchor(title: str, segment: str) -> bool:
    text = f"{title} {segment}".lower()
    if re.search(r"\b(outline|agenda|contents?|housekeeping|schedule)\b", text) and not re.search(
        r"\b(theory|model|concept|method|evidence|objective|piaget|developmental|memory|number|physics|formula|case|experiment)\b",
        text,
    ):
        return True
    return False


def _professional_source_learning_points(source_units: List[dict]) -> List[dict]:
    points: List[dict] = []
    for i, unit in enumerate(source_units or [], start=1):
        source_title = normalise_space(unit.get("title_candidate") or unit.get("display_name") or f"Source {i}")
        excerpt = normalise_space(unit.get("text_excerpt") or "")
        segments = _professional_split_source_excerpt(excerpt) or [excerpt]
        for segment_index, segment in enumerate(segments, start=1):
            title = _professional_anchor_title(source_title, segment, segment_index)
            if _professional_low_value_anchor(title, segment):
                continue
            terms = source_specific_anchor_terms(f"{source_title} {title} {segment}", limit=7)
            term_phrase = ", ".join(terms[:5]) if terms else title
            point = {
                "label": f"Source {i}.{segment_index}",
                "source_title": source_title,
                "title": title,
                "excerpt": truncate_text(segment, 420) or "Readable text was limited; use any extracted source figures or metadata as the source anchor.",
                "terms": terms,
                "term_phrase": term_phrase,
            }
            point.update(_professional_concept_teaching(point))
            points.append(point)
            if len(points) >= PROFESSIONAL_FALLBACK_MAX_POINTS:
                return points
    return points


def _professional_terms_phrase(points: List[dict], fallback: str = "the uploaded source concepts") -> str:
    terms: List[str] = []
    seen = set()
    for point in points:
        for term in point.get("terms") or []:
            if term in seen:
                continue
            seen.add(term)
            terms.append(term)
            if len(terms) >= 8:
                return ", ".join(terms)
    return ", ".join(terms) if terms else fallback


def _professional_source_anchor_block(points: List[dict]) -> str:
    lines = []
    for point in points:
        terms = ", ".join(point.get("terms") or []) or "source-specific terms"
        lines.append(
            f"- [Source anchor] {point['label']} - {point['title']}: key study terms: {terms}. "
            f"Source says: {point['excerpt']}"
        )
    return "\n".join(lines) if lines else "- [Source anchor] No readable source anchors were available."


def _professional_table_cell(value: str, max_chars: int = 180) -> str:
    return truncate_text(normalise_space(value or "").replace("|", "/"), max_chars)


def _professional_exam_focus_table(points: List[dict]) -> str:
    rows = [
        "| Likely question type | Source anchor | What the question is testing | What a high-grade answer must do | Common trap |",
        "| -------------------- | ------------- | ---------------------------- | -------------------------------- | ----------- |",
    ]
    for point in points[:5]:
        rows.append(
            "| Explain / apply | "
            f"{_professional_table_cell(point['title'], 90)} | "
            f"{_professional_table_cell(point['exam'])} | "
            f"Use {point['label']} as the anchor, explain the mechanism, then apply it to a changed case. | "
            f"{_professional_table_cell(point['trap'])} |"
        )
    return "\n".join(rows)


def _professional_understanding_targets(points: List[dict]) -> str:
    lines = []
    for point in points:
        lines.append(
            f"- [Source anchor] **{point['title']}**: {point['excerpt']}\n"
            f"  [Professional explanation] {point['core']}\n"
            f"  [Exam intelligence] {point['exam']}"
        )
    return "\n".join(lines)


def _professional_deep_concept_blocks(points: List[dict]) -> str:
    blocks = []
    for point in points:
        blocks.append(
            f"### {point['title']}\n\n"
            f"[Source anchor] {point['excerpt']}\n\n"
            f"[Professional explanation] {point['core']}\n\n"
            f"[Exam intelligence] {point['exam']}\n\n"
            f"[Limitation] {point['trap']}\n\n"
            f"[Application] {point['application']}"
        )
    return "\n\n".join(blocks)


def _professional_connection_map(points: List[dict]) -> str:
    titles = [point["title"] for point in points[:5]]
    if not titles:
        return "Uploaded source anchor -> mechanism -> exam use -> limitation"
    if len(titles) == 1:
        return f"{titles[0]} -> mechanism in the source -> likely exam application -> limitation"
    return " -> ".join(titles) + " -> high-grade application with limits"


def _professional_application_table(points: List[dict]) -> str:
    rows = [
        "| Source concept | New situation the exam might use | How to recognise it | How to apply the concept | What to avoid |",
        "| -------------- | -------------------------------- | ------------------- | ------------------------ | ------------- |",
    ]
    for point in points[:5]:
        rows.append(
            f"| {_professional_table_cell(point['title'], 80)} | "
            "An unfamiliar case, task, diagram, or short-answer prompt using the same underlying idea. | "
            f"Look for {_professional_table_cell(point.get('term_phrase') or point['title'], 90)}. | "
            f"{_professional_table_cell(point['application'])} | "
            f"{_professional_table_cell(point['trap'])} |"
        )
    return "\n".join(rows)


def _professional_mistake_list(points: List[dict]) -> str:
    return "\n".join(
        f"- **{point['title']}**: {point['trap']}"
        for point in points[:6]
    )


def _professional_model_answers(points: List[dict]) -> str:
    if not points:
        return "A strong answer identifies the source concept, explains the mechanism, applies it to the new question, and states a limitation."
    first = points[0]
    second = points[1] if len(points) > 1 else points[0]
    return (
        f"**Short-answer model:** {first['title']} matters because {first['core']} A strong answer would name the source anchor, then explain the mechanism rather than only repeating the slide title.\n\n"
        f"**Longer explanation model:** The source moves from {first['title']} to {second['title']} because the student needs to connect the big idea with a more precise concept or method. The answer should state what the source says, explain why it matters, and show what changes when the idea is used in a new case.\n\n"
        f"**Application model:** If a new question changes the example, use this sequence: identify {first.get('term_phrase') or first['title']}, state the condition, explain the mechanism, apply it to the new case, then add the limitation: {first['trap']}"
    )


def _professional_question_bank(points: List[dict]) -> str:
    if not points:
        return "- Easy: Define the source concept.\n- Medium: Explain the mechanism.\n- Hard: Apply it to a new case and state a limitation."
    easy = "\n".join(f"- Define or explain **{point['title']}**. Testing: source recall plus meaning. Common mistake: repeating the title without explanation." for point in points[:3])
    medium = "\n".join(f"- How does **{point['title']}** connect to another source idea? Testing: mechanism and relationship. Common mistake: listing both ideas without explaining the link." for point in points[:3])
    hard = "\n".join(f"- Apply **{point['title']}** to an unfamiliar case. Testing: transfer and limits. Common mistake: {point['trap']}" for point in points[:3])
    return f"### Easy / Foundation\n\n{easy}\n\n### Medium / Understanding\n\n{medium}\n\n### Hard / High Grade\n\n{hard}"


def _professional_fallback_notes(source_units: List[dict], is_chinese_fallback: bool = False) -> str:
    points = _professional_source_learning_points(source_units)
    anchors = _professional_source_anchor_block(points)
    term_phrase = _professional_terms_phrase(points)
    title_phrase = "; ".join(point["title"] for point in points[:4]) or "the uploaded material"
    exam_table = _professional_exam_focus_table(points)
    understanding_targets = _professional_understanding_targets(points)
    deep_blocks = _professional_deep_concept_blocks(points)
    connection_map = _professional_connection_map(points)
    application_table = _professional_application_table(points)
    mistake_list = _professional_mistake_list(points)
    model_answers = _professional_model_answers(points)
    question_bank = _professional_question_bank(points)
    if is_chinese_fallback:
        return (
            "# Professional Study Guide: 来源材料\n\n"
            "## 1. Big Picture: What This Material Is Really About\n\n"
            f"[Source-based] 这份材料的核心学习对象包括：{title_phrase}。\n\n"
            f"[Professional explanation] 学习重点不是复述来源，而是解释这些来源中的关键概念如何共同回答一个问题：{term_phrase} 这些概念如何改变你对主题的理解。\n\n"
            "## 2. The Exam Will Probably Test These Ideas\n\n"
            f"[Exam intelligence] 题目很可能要求你定义、比较、解释或应用这些来源概念：{term_phrase}。高分答案需要引用具体来源锚点，解释机制，并说明限制。\n\n"
            "## 3. What You Actually Need To Understand\n\n"
            f"{anchors}\n\n"
            "## 4. Deep Explanation of the Core Concepts\n\n"
            f"[Source-based] 逐个来源读具体概念：\n\n{anchors}\n\n"
            f"[Professional explanation] 对每个来源都要回答：它提出了什么概念？用了什么例子或证据？这个例子能支持什么？不能支持什么？它和 {term_phrase} 中的其他概念如何连接？\n\n"
            "## 5. Concept Connections: How The Ideas Work Together\n\n"
            f"[Professional explanation] 把这些来源连接起来：先找出 {term_phrase} 的定义或例子，再解释它们之间的机制、条件、限制和可能冲突。\n\n"
            f"```text\n{term_phrase} -> 机制/条件 -> 来源例子 -> 新题目应用 -> 限制\n```\n\n"
            "## 6. Background Knowledge Needed To Understand This Properly\n\n"
            f"[Background knowledge] 只补足理解 {term_phrase} 所需要的背景，例如术语定义、研究逻辑、比较标准、机制或学科假设。不要用背景知识替代来源内容。\n\n"
            "## 7. How To Apply This To New Questions\n\n"
            f"[Application] 遇到新题目时，先点名一个来源概念，例如 {term_phrase}，再说明它的机制、来源例子、适用条件和限制。\n\n"
            "## 8. Common Mistakes That Lose Marks\n\n"
            f"- 把 {term_phrase} 当成孤立术语背诵。\n- 只列来源标题，不解释具体概念如何工作。\n- 把某一个来源例子扩大成普遍结论。\n\n"
            "## 9. High-Quality Student Thinking\n\n"
            f"[Professional explanation] 基础理解会复述来源；强理解会解释 {term_phrase} 为什么重要；高水平理解会比较来源之间的关系，并指出每个例子的证据边界。\n\n"
            "## 10. Model High-Quality Answers\n\n"
            f"[Application] 一个强答案会这样写：这些来源共同说明，{term_phrase} 不是孤立事实，而是需要通过具体例子、条件和限制来解释的概念网络。\n\n"
            "## 11. Exam Question Bank\n\n"
            f"- Easy: 定义 {term_phrase} 中的一个核心概念，并指出来源例子。\n- Medium: 解释两个来源概念之间的机制关系。\n- Hard: 把来源概念应用到一个新案例，并说明限制。\n\n"
            "## 12. Memory and Practice\n\n"
            f"- 记住具体来源概念：{term_phrase}。\n- 练习用每个来源例子解释一个机制。\n- 练习说明每个例子能证明什么、不能证明什么。\n"
        )
    return (
        "# Professional Study Guide: Uploaded Material\n\n"
        "## 1. Big Picture: What This Material Is Really About\n\n"
        f"[Source-based] The uploaded material centres on these concrete study anchors: {title_phrase}.\n\n"
        f"[Professional explanation] The real study task is to explain how {term_phrase} changes the student's mental model of the topic, not to memorise a list of source titles.\n\n"
        "## 2. The Exam Will Probably Test These Ideas\n\n"
        f"[Exam intelligence] Likely questions will ask the student to define, compare, explain, or apply these source concepts: {term_phrase}. A high-grade answer must use concrete source anchors, explain the mechanism, and state limits.\n\n"
        f"{exam_table}\n\n"
        "## 3. What You Actually Need To Understand\n\n"
        f"{understanding_targets or anchors}\n\n"
        "## 4. Deep Explanation of the Core Concepts\n\n"
        f"{deep_blocks or anchors}\n\n"
        "## 5. Concept Connections: How The Ideas Work Together\n\n"
        f"```text\n{connection_map}\n```\n\n"
        f"[Professional explanation] The important connection is not the order of the slides; it is how the source moves from named concepts ({term_phrase}) to mechanisms, examples, and assessment use. Use the map to explain why each concept comes before or after the next one.\n\n"
        "## 6. Background Knowledge Needed To Understand This Properly\n\n"
        f"[Background knowledge] Add only background needed to understand {term_phrase}: definitions, research logic, comparison standards, mechanisms, assumptions, or discipline vocabulary. Background must clarify these named source anchors, not replace them: {title_phrase}.\n\n"
        "## 7. How To Apply This To New Questions\n\n"
        f"{application_table}\n\n"
        "## 8. Common Mistakes That Lose Marks\n\n"
        f"{mistake_list}\n\n"
        "## 9. High-Quality Student Thinking\n\n"
        "| Level | What the student does | Example using this topic |\n"
        "| ----- | --------------------- | ------------------------ |\n"
        f"| Basic | Names the concept | Lists {term_phrase}. |\n"
        f"| Good | Explains the concept | States what {points[0]['title'] if points else 'the first source anchor'} means. |\n"
        f"| Strong | Connects mechanism and evidence | Explains how {term_phrase} work together in the source. |\n"
        f"| Excellent | Transfers and limits | Applies {points[0]['title'] if points else 'the source concept'} to a new case and states what the source cannot prove. |\n\n"
        "## 10. Model High-Quality Answers\n\n"
        f"{model_answers}\n\n"
        "## 11. Exam Question Bank\n\n"
        f"{question_bank}\n\n"
        "## 12. Memory and Practice\n\n"
        f"- Memorise the concrete source concepts: {term_phrase}.\n- Practise explaining the core mechanism behind: {title_phrase}.\n- Practise turning each source anchor into a likely exam answer.\n- Practise stating what each example proves, what it does not prove, and how it transfers to a new case.\n"
    )


GENERAL_FALLBACK_MAX_POINTS = 5


def _fallback_clean_text(value: str, max_chars: int = 260) -> str:
    return truncate_text(normalise_space(value or ""), max_chars)


def _fallback_topic_title(source_units: List[dict], points: List[dict]) -> str:
    for unit in source_units or []:
        title = _fallback_clean_text(unit.get("title_candidate") or unit.get("display_name"), 90)
        if title and not re.search(r"(?i)^uploaded file$|^source \d+$", title):
            return title
    if points:
        return _fallback_clean_text(points[0].get("title"), 90)
    return "Uploaded Material"


def _fallback_visual_learning_points(visual_cards: List[dict]) -> List[dict]:
    points: List[dict] = []
    for marker_index, card in enumerate(visual_cards or []):
        title = (
            _v23_meaningful_card_text(card.get("title"))
            or _v23_meaningful_card_text(card.get("caption"))
            or f"Diagram or example {marker_index + 1}"
        )
        what = (
            _v23_meaningful_card_text(card.get("what_shows"))
            or _v23_meaningful_card_text(card.get("caption"))
        )
        why = (
            _v23_meaningful_card_text(card.get("argument_supported"))
            or _v23_meaningful_card_text(card.get("why_relevant"))
            or _v23_meaningful_card_text(card.get("cross_source_connection"))
        )
        if not what and not why:
            continue
        terms = source_specific_anchor_terms(f"{title} {what} {why}", limit=7)
        core = " ".join(part for part in [
            f"The concrete idea is **{title}**.",
            f"It shows {what}." if what else "",
            f"The learning point is {why}." if why else "",
        ] if part)
        points.append({
            "label": f"Visual {marker_index + 1}",
            "title": _fallback_clean_text(title, 100),
            "excerpt": _fallback_clean_text(what or why, 360),
            "terms": terms,
            "term_phrase": ", ".join(terms[:5]) if terms else _fallback_clean_text(title, 80),
            "core": core,
            "exam": "A question may ask you to interpret the diagram or example, explain what it proves, and state what it cannot prove.",
            "trap": "Do not describe the picture only. Explain the concept or comparison it is being used to teach.",
            "application": "In a new question, name the concept, describe the visible pattern, explain the mechanism, and state the boundary of the conclusion.",
            "marker_index": marker_index,
        })
    return points


def _fallback_learning_points(source_units: List[dict], visual_cards: List[dict]) -> List[dict]:
    points: List[dict] = []
    seen_titles = set()
    for point in _professional_source_learning_points(source_units):
        title_key = _fallback_clean_text(point.get("title"), 120).lower()
        if not title_key or title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        points.append(point)
        if len(points) >= GENERAL_FALLBACK_MAX_POINTS:
            break
    for point in _fallback_visual_learning_points(visual_cards):
        title_key = _fallback_clean_text(point.get("title"), 120).lower()
        if not title_key or title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        points.append(point)
        if len(points) >= GENERAL_FALLBACK_MAX_POINTS:
            break
    return points


def _fallback_terms(points: List[dict]) -> str:
    return _professional_terms_phrase(points, "the core uploaded concepts")


def _fallback_key_concepts(points: List[dict], limit: int = 4) -> str:
    if not points:
        return "- **Core idea**: Read the uploaded material for its concepts, examples, mechanisms, and limits."
    lines = []
    for point in points[:limit]:
        lines.append(
            f"- **{point['title']}**: {point.get('core') or point.get('excerpt') or 'This is a core learning target.'}"
        )
    return "\n".join(lines)


def _fallback_common_traps(points: List[dict], limit: int = 4) -> str:
    if not points:
        return "- Do not stop at naming the topic. Explain the mechanism and the limit."
    return "\n".join(f"- **{point['title']}**: {point.get('trap') or 'Explain the idea, not just the label.'}" for point in points[:limit])


def _fallback_visual_examples(visual_cards: List[dict]) -> str:
    blocks = []
    for marker_index, point in enumerate(_fallback_visual_learning_points(visual_cards)):
        blocks.append(
            f"### {point['title']}\n\n"
            f"**What it shows:** {point['excerpt']}\n\n"
            f"**Why it matters:** {point['core']}\n\n"
            f"[[VISUAL:{point.get('marker_index', marker_index)}]]"
        )
    return "\n\n".join(blocks)


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
                "status": "fallback",
                "api_request_attempted": False,
                "error_type": type(error).__name__,
                "error": _sanitize_ai_error(error) if "_sanitize_ai_error" in globals() else str(error),
            })
        is_chinese_fallback = generation_language in {"simplified_chinese", "traditional_chinese", "mixed_chinese_english"}
        if is_professional_mode:
            result = _professional_fallback_notes(source_units, is_chinese_fallback)
        else:
            result = _mode_specific_fallback_notes(
                prompt_mode_key,
                source_units,
                visual_cards,
                generation_language,
            )
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
