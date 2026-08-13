def _v22_visual_rank_keywords() -> List[str]:
    return [
        "figure", "fig.", "table", "graph", "chart", "diagram", "model", "results", "data", "comparison",
        "compare", "versus", "vs", "experiment", "method", "procedure", "effect", "mechanism", "process",
        "steps", "study", "case", "example", "formula", "calculation", "matrix", "boxplot", "scatter",
        "bar graph", "line graph", "distribution", "brain", "neuron", "synapse", "action potential", "resting potential",
        "mri", "fmri", "eeg", "heritability", "genotype", "phenotype", "pku", "maoa", "chimpanzee", "bonobo",
        "dictator", "ultimatum", "language", "tool", "natural selection", "图", "表", "统计", "数据", "曲线", "坐标",
        "模型", "实验", "研究", "结果", "对比", "比較", "机制", "機制", "步骤", "步驟", "案例", "公式",
    ]


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except Exception:
        return default


def source_visual_render_dpi(default_dpi: int = 200) -> int:
    return max(72, env_int("IMAGE_RENDER_DPI", int(default_dpi or 200)))


def source_visual_render_matrix(default_dpi: int = 200):
    dpi = source_visual_render_dpi(default_dpi)
    return fitz.Matrix(max(1.0, dpi / 72), max(1.0, dpi / 72))


def _v22_resize_image_bytes(data: bytes, content_type: str = "image/jpeg", max_width: Optional[int] = None, quality: Optional[int] = None) -> Tuple[bytes, str]:
    """Prepare source screenshots for readable in-text display without generative changes."""
    if not data or (content_type or "").lower() == "image/svg+xml":
        return data, content_type or "image/jpeg"
    try:
        from PIL import Image, ImageEnhance, ImageFilter

        output_format = (os.getenv("IMAGE_OUTPUT_FORMAT", "png") or "png").strip().lower()
        if output_format not in {"png", "jpeg", "jpg", "webp"}:
            output_format = "png"
        max_width = int(max_width or env_int("IMAGE_MAX_WIDTH", 2200))
        quality = int(quality or env_int("IMAGE_JPEG_QUALITY", 92))
        img = Image.open(BytesIO(data)).convert("RGB")
        if img.width > max_width:
            ratio = max_width / float(img.width)
            resample = getattr(getattr(Image, "Resampling", Image), "LANCZOS", Image.BICUBIC)
            img = img.resize((max_width, max(1, int(img.height * ratio))), resample)
        if os.getenv("IMAGE_ENHANCE_LOCAL", "true").lower() not in {"0", "false", "no"}:
            img = ImageEnhance.Contrast(img).enhance(_env_float("IMAGE_ENHANCE_CONTRAST", 1.12))
            img = ImageEnhance.Sharpness(img).enhance(_env_float("IMAGE_ENHANCE_SHARPNESS", 1.18))
            img = img.filter(ImageFilter.UnsharpMask(
                radius=_env_float("IMAGE_UNSHARP_RADIUS", 1.1),
                percent=env_int("IMAGE_UNSHARP_PERCENT", 105),
                threshold=env_int("IMAGE_UNSHARP_THRESHOLD", 3),
            ))
        out = BytesIO()
        if output_format == "png":
            img.save(out, format="PNG", optimize=True)
            return out.getvalue(), "image/png"
        if output_format == "webp":
            img.save(out, format="WEBP", quality=quality, method=6)
            return out.getvalue(), "image/webp"
        img.save(out, format="JPEG", quality=quality, optimize=True)
        return out.getvalue(), "image/jpeg"
    except Exception:
        return data, content_type or "image/jpeg"


def image_part_from_bytes(data: bytes, content_type: str = "image/jpeg"):
    """v22 override: render source screenshots clearly without changing frontend code."""
    data, content_type = _v22_resize_image_bytes(data, content_type)
    encoded = base64.b64encode(data).decode("utf-8")
    return {"type": "image_url", "image_url": {"url": f"data:{content_type};base64,{encoded}"}}
def render_pptx_slide_screenshots(data: bytes, source_name: str, slide_texts: List[str], max_slides: int) -> List[dict]:
    """Render full-slide source screenshots for in-text evidence.

    Prefer LibreOffice/PDF rendering when available. If it is not installed, use
    the built-in SVG slide renderer so lecture slides still produce in-text
    source images instead of silently falling back to text-only notes.
    """
    if not ENABLE_PPTX_SLIDE_RENDER and not ENABLE_PPTX_SVG_FALLBACK_RENDER:
        return []
    try:
        requested_slides = MAX_VISUAL_IMAGES_PER_SOURCE if max_slides is None else int(max_slides)
    except Exception:
        requested_slides = MAX_VISUAL_IMAGES_PER_SOURCE
    try:
        controlled_cap = int(CONTROLLED_MAX_PPTX_SLIDES_PER_SOURCE)
    except Exception:
        controlled_cap = MAX_VISUAL_IMAGES_PER_SOURCE
    max_slides = min(max(0, requested_slides), max(0, controlled_cap))
    if max_slides <= 0:
        return []

    def svg_fallback_parts() -> List[dict]:
        if Presentation is None:
            return []
        try:
            prs = Presentation(BytesIO(data))
            rendered = render_pptx_source_preview_svg_images(prs, max_slides)
        except Exception:
            return []
        if not rendered:
            return []
        selected = selected_indices_by_score(slide_texts or ["" for _ in range(len(rendered))], max_slides)
        selected_slide_numbers = [idx + 1 for idx in selected if idx + 1 in rendered]
        if not selected_slide_numbers:
            selected_slide_numbers = sorted(rendered.keys())[:max_slides]
        parts: List[dict] = []
        for slide_number in selected_slide_numbers[:max_slides]:
            preview = truncate_text(normalise_space(slide_texts[slide_number - 1] if slide_number - 1 < len(slide_texts) else ""), 680)
            score = score_visual_text(preview, slide_number - 1)
            label = (
                f"IN-TEXT SOURCE FIGURE FROM {source_name} — PPT slide {slide_number}. "
                f"Actual rendered slide screenshot selected for teaching value. "
                f"Render-mode=server-svg; visual-score={score}. "
                f"Slide text preview: {preview}"
            )
            parts.append({"type": "text", "text": label})
            parts.append(image_part_from_url(rendered[slide_number]))
        return parts

    if not ENABLE_PPTX_SLIDE_RENDER:
        return svg_fallback_parts()

    if fitz is None:
        return svg_fallback_parts()

    soffice = find_libreoffice_binary()
    if not soffice:
        return svg_fallback_parts()

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        pptx_path = tmpdir / "input.pptx"
        pptx_path.write_bytes(data)
        try:
            import subprocess
            subprocess.run(
                [soffice, "--headless", "--convert-to", "pdf", "--outdir", str(tmpdir), str(pptx_path)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=35,
            )
        except Exception:
            return svg_fallback_parts()
        pdf_candidates = list(tmpdir.glob("*.pdf"))
        if not pdf_candidates:
            return svg_fallback_parts()
        try:
            doc = fitz.open(str(pdf_candidates[0]))
            selected = selected_indices_by_score(slide_texts or ["" for _ in range(len(doc))], max_slides)
            selected = [i for i in selected if i < len(doc)] or list(range(min(max_slides, len(doc))))
            matrix = source_visual_render_matrix(CONTROLLED_VISUAL_RENDER_DPI)
            parts: List[dict] = []
            for idx in selected:
                page = doc.load_page(idx)
                pix = page.get_pixmap(matrix=matrix, alpha=False)
                img_bytes = pix.tobytes("png")
                preview = truncate_text(normalise_space(slide_texts[idx] if idx < len(slide_texts) else ""), 520)
                label = (
                    f"IN-TEXT SOURCE FIGURE FROM {source_name} — PPT slide {idx + 1}. "
                    f"Actual rendered slide screenshot selected for diagram/table/chart/figure value. "
                    f"Slide text preview: {preview}"
                )
                parts.append({"type": "text", "text": label})
                parts.append(image_part_from_bytes(img_bytes, "image/png"))
            doc.close()
            return parts
        except Exception:
            return svg_fallback_parts()


def balanced_source_excerpt(text: str, budget: int) -> str:
    """Keep long sources representative without sending the entire file."""
    value = (text or "").strip()
    budget = max(1200, int(budget or 0))
    if len(value) <= budget:
        return value

    signal_pattern = re.compile(
        r"\b(table|figure|fig\.|graph|chart|plot|correlation|experiment|study|results?|data|mean|median|"
        r"percentage|rate|comparison|versus|vs|method|sample|case|example|formula|calculation|"
        r"genotype|phenotype|heritability|maoa|pku|gwas|flynn|iq|twin|ultimatum|dictator|chimp|bonobo)\b"
        r"|图|表|数据|实验|结果|对比|案例|公式|基因|遗传|相关",
        flags=re.I,
    )
    seen = set()
    signal_blocks: List[str] = []
    for block in re.split(r"\n{2,}", value):
        clean = normalise_space(block)
        if len(clean) < 50 or not signal_pattern.search(clean):
            continue
        key = sha256_text(clean[:600])
        if key in seen:
            continue
        seen.add(key)
        signal_blocks.append(truncate_text(block.strip(), 900))
        if len("\n\n".join(signal_blocks)) >= int(budget * 0.38):
            break

    signal_text = truncate_text("\n\n".join(signal_blocks), int(budget * 0.38)) if signal_blocks else ""
    remaining = budget - len(signal_text) - 220
    if remaining < 2400:
        return truncate_text(value, budget)

    head_len = max(700, remaining // 3)
    mid_len = max(700, remaining // 3)
    tail_len = max(700, remaining - head_len - mid_len)
    midpoint = max(0, len(value) // 2 - mid_len // 2)

    chunks = [
        "[Opening excerpt]\n" + value[:head_len].strip(),
    ]
    if signal_text:
        chunks.append("[High-signal source excerpts: tables, figures, studies, examples]\n" + signal_text.strip())
    chunks.extend([
        "[Middle excerpt]\n" + value[midpoint: midpoint + mid_len].strip(),
        "[Ending excerpt]\n" + value[-tail_len:].strip(),
    ])
    return truncate_text("\n\n".join(chunk for chunk in chunks if chunk.strip()), budget)


def _v22_source_context(source_units: List[dict]) -> str:
    """Balanced source context so every source is represented without huge prompts."""
    units = source_units or []
    if not units:
        return ""
    total_budget = CONTROLLED_MAX_SOURCE_CONTEXT_CHARS
    per_source = max(5000, min(CONTROLLED_MAX_CHARS_PER_SOURCE, total_budget // max(1, len(units))))
    blocks = []
    for i, unit in enumerate(units, start=1):
        title = unit.get("title_candidate") or unit.get("display_name") or f"Source {i}"
        text = balanced_source_excerpt(unit.get("text_excerpt") or "", per_source)
        visual_count = len([p for p in unit.get("visual_parts") or [] if isinstance(p, dict) and p.get("type") == "image_url"])
        blocks.append(
            f"SOURCE {i}: {title}\n"
            f"File/name: {unit.get('display_name', '')}\n"
            f"Visuals extracted: {visual_count}\n"
            f"Text excerpt:\n{text if text else '[No readable text excerpt; rely on title/source figures if available.]'}"
        )
    return "\n\n---\n\n".join(blocks)


def _v22_parse_visual_cards(raw: str, candidates: List[dict], labels: dict) -> List[dict]:
    parsed = extract_json_object(raw)
    cards_raw = []
    if isinstance(parsed, dict):
        value = parsed.get("cards")
        if isinstance(value, list):
            cards_raw = value
        elif all(k in parsed for k in ("title", "what_shows")):
            cards_raw = [parsed]
    cards: List[dict] = []
    for idx, cand in enumerate(candidates):
        item = cards_raw[idx] if idx < len(cards_raw) and isinstance(cards_raw[idx], dict) else {}
        card = {
            "index": idx,
            "source_index": cand.get("source_index"),
            "source_title": cand.get("source_title", ""),
            "location": cand.get("location", ""),
            "caption": cand.get("caption", ""),
            "url": cand.get("url", ""),
            "title": normalise_space(item.get("title") or f"{labels['visual_card_title']} {idx + 1}"),
            "what_shows": normalise_space(item.get("what_shows") or cand.get("caption", "")),
            "argument_supported": normalise_space(item.get("argument_supported") or "This visual provides direct evidence from the uploaded material."),
            "cross_source_connection": normalise_space(item.get("cross_source_connection") or "Use this visual to connect the source's concrete evidence to the wider study theme."),
            "how_to_read": normalise_space(item.get("how_to_read") or "Read the title/labels first, then identify what is compared, sequenced, measured, or illustrated."),
            "exam_use": normalise_space(item.get("exam_use") or "Use it as visual evidence when explaining or comparing the concept."),
        }
        cards.append(card)
    return cards


def _v22_visual_context_for_prompt(cards: List[dict]) -> str:
    lines = []
    for i, card in enumerate(cards or []):
        intent = infer_teaching_intent(card)
        goal = normalise_space(card.get("teaching_goal") or default_teaching_goal(card))
        lines.append(
            f"Source figure {i}: Source {card.get('source_index')} {card.get('location')} | "
            f"Title: {card.get('title')} | Teaching intent: {intent} | Learning goal: {goal} | "
            f"Shows: {card.get('what_shows')} | "
            f"Argument: {card.get('argument_supported')} | Connection: {card.get('cross_source_connection')}"
        )
    return "\n".join(lines)


@app.get("/health/v22")
def health_v22():
    return {
        "status": "ok",
        "mode": "controlled_inline_visual_professor",
        "html_css_changed": False,
        "controlled_inline_visual_mode": CONTROLLED_INLINE_VISUAL_MODE,
        "controlled_max_visuals": CONTROLLED_MAX_VISUALS,
        "controlled_output_tokens": CONTROLLED_OUTPUT_TOKENS,
        "controlled_max_source_context_chars": CONTROLLED_MAX_SOURCE_CONTEXT_CHARS,
        "controlled_visual_render_dpi": CONTROLLED_VISUAL_RENDER_DPI,
        "cache_path": str(CACHE_PATH),
        "note": "Uses fewer model calls, batched visual-card generation, and inline [[VISUAL:n]] markers rendered by the existing frontend.",
    }


# -----------------------------------------------------------------------------
# v23 Relevant In-Text Teaching Images
# -----------------------------------------------------------------------------
# The user wants images like textbook/lecture-note in-text figures: diagrams,
# data tables, charts, experiment sequences, and statistical evidence that help
# understanding. Decorative screenshots, title slides, logos, presenter photos,
# stock photos, and purely atmospheric images should be ignored whenever useful
# teaching visuals exist.

RELEVANT_VISUAL_MODE = os.getenv("RELEVANT_VISUAL_MODE", "true").lower() not in {"0", "false", "no"}
RELEVANT_VISUAL_POOL_LIMIT = env_int("RELEVANT_VISUAL_POOL_LIMIT", 18)
RELEVANT_VISUAL_MIN_SCORE = env_int("RELEVANT_VISUAL_MIN_SCORE", 5)
PDF_VISUAL_CANDIDATE_LIMIT = env_int("PDF_VISUAL_CANDIDATE_LIMIT", max(10, RELEVANT_VISUAL_POOL_LIMIT, CONTROLLED_MAX_PDF_PAGES_PER_SOURCE))
RICH_INLINE_MIN_OUTPUT_UNITS = env_int("RICH_INLINE_MIN_OUTPUT_UNITS", 6200)
ADVANCED_NOTES_MIN_TABLES = env_int("ADVANCED_NOTES_MIN_TABLES", 2)
ADVANCED_NOTES_MIN_HEADINGS = env_int("ADVANCED_NOTES_MIN_HEADINGS", 9)


def source_figure_labels(preferred_language: str) -> dict:
    key = normalise_language_key(preferred_language)
    if key in {"simplified_chinese", "mixed_chinese_english"}:
        return {
            "figure_title": "来源图表",
            "visual_card_title": "来源图表",
            "what_shows": "图中/表中显示",
            "argument": "为什么放在这里",
            "connection": "和知识点的连接",
            "how_to_read": "阅读方法",
            "exam_use": "考试/复习用途",
            "clarity_intent": "先讲清楚",
            "deeper_intent": "深入分析",
            "teaching_goal": "学习目标",
        }
    if key == "traditional_chinese":
        return {
            "figure_title": "來源圖表",
            "visual_card_title": "來源圖表",
            "what_shows": "圖中/表中顯示",
            "argument": "為什麼放在這裡",
            "connection": "和知識點的連接",
            "how_to_read": "閱讀方法",
            "exam_use": "考試/複習用途",
            "clarity_intent": "先講清楚",
            "deeper_intent": "深入分析",
            "teaching_goal": "學習目標",
        }
    return {
        "figure_title": "Source figure",
        "visual_card_title": "Source figure",
        "what_shows": "What the image shows",
        "argument": "Why it matters here",
        "connection": "Connection to the concept",
        "how_to_read": "How to read it",
        "exam_use": "Exam / revision use",
        "clarity_intent": "Clarity focus",
        "deeper_intent": "Deeper analysis",
        "teaching_goal": "Learning goal",
    }


TEACHING_INTENT_CLARITY = "clarity"
TEACHING_INTENT_DEEPER = "deeper_analysis"


def normalise_teaching_intent(value: str) -> str:
    key = re.sub(r"[\s\-]+", "_", normalise_space(value or "").lower())
    if key in {
        "clarity",
        "clear",
        "simplify",
        "make_clear",
        "learning_clarity",
        "clarity_focus",
        "clearer",
        "clarify",
    }:
        return TEACHING_INTENT_CLARITY
    if key in {
        "deeper_analysis",
        "deeper",
        "deep",
        "analysis",
        "deep_analysis",
        "deeper_understanding",
        "depth",
        "deep_dive",
        "analyze",
        "analyse",
    }:
        return TEACHING_INTENT_DEEPER
    return ""


def infer_teaching_intent(card: dict) -> str:
    """Heuristic when the model omits teaching_intent: clarity for decode-first slides, deeper for evidence/analysis."""
    existing = normalise_teaching_intent(str((card or {}).get("teaching_intent") or ""))
    if existing:
        return existing
    kind = normalise_space((card or {}).get("visual_kind") or "").lower()
    text = " ".join(
        str((card or {}).get(key) or "")
        for key in ("title", "caption", "what_shows", "why_relevant", "argument_supported", "exam_use", "location")
    ).lower()
    deeper_kinds = {
        "data/table",
        "graph/chart",
        "experiment/event",
        "formula/calculation",
        "method/result figure",
    }
    if kind in deeper_kinds or re.search(
        r"\b(result|results|evidence|correlation|regression|limit|limitation|implication|compare|comparison|"
        r"versus|vs|evaluate|evaluation|exam|worked example|method|hypothesis|causation|mechanism)\b|"
        r"结果|证据|相關|相关|比較|比较|限制|含义|考试|例题|机制|因果",
        text,
        flags=re.I,
    ):
        return TEACHING_INTENT_DEEPER
    return TEACHING_INTENT_CLARITY


def teaching_intent_label(intent: str, labels: Optional[dict] = None) -> str:
    intent_key = normalise_teaching_intent(intent) or TEACHING_INTENT_CLARITY
    labels = labels or {}
    if intent_key == TEACHING_INTENT_DEEPER:
        return labels.get("deeper_intent") or "Deeper analysis"
    return labels.get("clarity_intent") or "Clarity focus"


def default_teaching_goal(card: dict, labels: Optional[dict] = None) -> str:
    intent = infer_teaching_intent(card)
    title = normalise_space((card or {}).get("title") or labels and labels.get("figure_title") or "this slide")
    chinese = bool(labels) and any(re.search(r"[\u4e00-\u9fff]", str(labels.get(key, ""))) for key in labels)
    if intent == TEACHING_INTENT_DEEPER:
        if chinese:
            return f"深入分析“{title}”：说明图中证据支持什么、不能说明什么，以及考试如何使用。"
        return f"Go deeper on {title}: interpret what the visible evidence supports, limits, and how to use it in an answer."
    if chinese:
        return f"先把“{title}”讲清楚：识别图中关键标签、结构与阅读顺序，再连回正文概念。"
    return f"Make {title} clearer: identify the key labels, structure, and reading order before connecting it to the concept."


def clean_source_figure_caption(text: str) -> str:
    value = normalise_space(text or "")
    value = re.sub(r"\b(?:IN-TEXT SOURCE FIGURE|VISUAL EVIDENCE)\s+FROM\s+.+?\s+—\s+", "", value, flags=re.I)
    value = re.sub(r"\b(?:PDF page|PPT slide|slide|page|p\.)\s*\d+\.?\s*", "", value, flags=re.I)
    value = re.sub(r"\b(?:Actual source screenshot|Actual rendered slide screenshot)\s+selected\s+for\s+.+?\.\s*", "", value, flags=re.I)
    value = re.sub(r"\bRender-mode=[^.;]+;\s*visual-score=-?\d+\.?\s*", "", value, flags=re.I)
    value = re.sub(r"\bThis is an image extracted from the slide, not the full slide screenshot\.?\s*", "", value, flags=re.I)
    value = re.sub(r"\bTeaching-signal-count=\d+;\s*decorative-signal-count=\d+\.?\s*", "", value, flags=re.I)
    value = re.sub(r"\bImage-count=\d+;\s*drawing-count=\d+;\s*visual-score=-?\d+\.?\s*", "", value, flags=re.I)
    value = re.sub(r"\bUse only if the actual image is\b.*$", "", value, flags=re.I)
    value = re.sub(r"\b(?:Current slide text preview|Nearby slide context|Page text preview|Slide text preview)\s*:\s*", "", value, flags=re.I)
    value = re.sub(r"\[\s*\]\s*", "", value)
    return normalise_space(value)


def _v23_scoring_text(text: str) -> str:
    value = normalise_space(text or "")
    value = re.sub(r"^(?:IN-TEXT SOURCE FIGURE|VISUAL EVIDENCE)\s+FROM\s+.+?\s+—\s+", "", value, flags=re.I)
    value = re.sub(r"Use only if the image is .*?$", "", value, flags=re.I)
    value = re.sub(r"Use only if the actual image is .*?$", "", value, flags=re.I)
    value = re.sub(r"Actual source screenshot selected for .*? value\.", "", value, flags=re.I)
    value = re.sub(r"Actual rendered slide screenshot selected for .*? value\.", "", value, flags=re.I)
    value = re.sub(r"Teaching-signal-count=\d+;\s*decorative-signal-count=\d+\.", "", value, flags=re.I)
    value = re.sub(r"Image-count=\d+;\s*drawing-count=\d+;\s*visual-score=-?\d+\.", "", value, flags=re.I)
    value = re.sub(r"This is an image extracted from the slide, not the full slide screenshot\.", "", value, flags=re.I)
    return normalise_space(value)


def _v23_signal_counts(text: str) -> dict:
    value = _v23_scoring_text(text).lower()
    teaching_patterns = [
        r"\b(table|figure|fig\.|graph|chart|plot|diagram|schema|schematic|model|flow|process|timeline|slide figure)\b",
        r"\b(map|concept map|mind map|anatomy|structure|cycle|pathway|network|framework|architecture|flowchart|decision tree)\b",
        r"\b(data|results?|statistics?|mean|median|weighted|correlation|axis|axes|distribution|percentage|rate)\b",
        r"\b(regression|histogram|boxplot|scatter|sample|cohort|survey|risk|ratio|odds|confidence interval|p[- ]?value)\b",
        r"\b(experiment|method|procedure|trial|task|condition|control|sample|participant|stimulus|response)\b",
        r"\b(case study|worked example|worked problem|source evidence|primary evidence|dataset|measurement|variables?)\b",
        r"\b(exercise|example|annotated|labelled|labeled|labels?|step[- ]?by[- ]?step|workflow|pipeline|derivation|proof|classification|taxonomy)\b",
        r"\b(curve|demand|supply|market|equilibrium|shift|money market|loanable funds|interest rate)\b",
        r"\b(event|habituation|observed|possible|impossible|violation|looking time|occlusion|screen|object permanence)\b",
        r"\b(ultimatum|dictator|proposer|responder|equal split|selfish split|fairness|chimp|banana|token|warfare mortality|bowles|gintis)\b",
        r"\b(formula|equation|calculation|matrix|vector|mri|fmri|eeg|bold|action potential|resting potential|synapse)\b",
        r"\b(comparison|compare|versus|vs|difference|contrast|mechanism|evidence|case study)\b",
        r"\b(gene|genotype|phenotype|allele|chromosome|dna|snp|maoa|pku|phenylketonuria|heritability|monozygotic|dizygotic|twin|iq|flynn|gwas|genome-wide|lewontin|maltreatment)\b",
        r"(图|表|图表|统计|数据|结果|实验|流程|步骤|机制|模型|公式|对比|比较|證據|證据|坐标|曲线|例题|例子|标注|分类|框架)",
    ]
    decorative_patterns = [
        r"\b(title slide|cover|agenda|outline|contents|today|welcome|overview|learning objectives?)\b",
        r"\b(lecturer|professor|dr\.|email|contact|office|university|department|course code|canvas)\b",
        r"\b(photo|photograph|portrait|headshot|people|person|speaker|presenter|biography|about me)\b",
        r"\b(logo|brand|stock|getty|unsplash|image credit|copyright|decorative|background)\b",
        r"(封面|目录|大纲|学习目标|照片|头像|人物照|装饰|背景|作者|讲师|联系方式|邮箱|学校|标志)",
    ]
    teaching = sum(len(re.findall(pattern, value, flags=re.I)) for pattern in teaching_patterns)
    decorative = sum(len(re.findall(pattern, value, flags=re.I)) for pattern in decorative_patterns)
    return {"teaching": teaching, "decorative": decorative, "text_len": len(value)}


def _has_strong_visual_teaching_terms(value: str) -> bool:
    return bool(re.search(
        r"\b("
        r"table|figure|fig\.|graph|chart|plot|diagram|schema|schematic|map|timeline|flowchart|"
        r"data|results?|statistics?|mean|median|percentage|rate|regression|histogram|boxplot|scatter|distribution|axis|axes|"
        r"experiment|method|procedure|protocol|trial|task|condition|control|sample|participant|stimulus|response|measurement|"
        r"formula|equation|calculation|matrix|vector|model|mechanism|pathway|network|architecture|"
        r"process|flow|cycle|framework|structure|anatomy|comparison|compare|versus|vs|difference|contrast|"
        r"case study|worked example|worked problem|exercise|source evidence|primary evidence|dataset|variables?|classification|taxonomy|"
        r"labelled|labeled|annotated|curve|equilibrium|demand|supply|workflow|pipeline|derivation|proof"
        r")\b|图|表|图表|统计|数据|结果|实验|流程|机制|模型|公式|地图|时间线|案例|例题|标注|分类|框架",
        value or "",
        flags=re.I,
    ))


def score_visual_text(text: str, index: int = 0) -> int:
    """v23 override: strongly prefer diagrams/data/figures and demote decoration."""
    counts = _v23_signal_counts(text)
    score = counts["teaching"] * 7 - counts["decorative"] * 8
    value = normalise_space(text or "").lower()
    if 60 <= counts["text_len"] <= 1200:
        score += 4
    if counts["text_len"] > 1200:
        score += 2
    if index == 0:
        score -= 3
    if "table" in value and re.search(r"\b(mean|median|rate|data|results?|percentage|weighted|arithmetic)\b", value):
        score += 10
    if re.search(r"\b(graph|chart|plot|diagram|schema|schematic|flowchart|map|timeline|model|mechanism|pathway|network|concept map|mind map)\b", value):
        score += 10
    if re.search(r"\b(regression|histogram|boxplot|scatter|distribution|axis|axes|confidence interval|p[- ]?value|odds ratio|risk ratio)\b", value):
        score += 12
    if re.search(r"\b(experiment|method|procedure|protocol|trial|task|condition|control|participant|stimulus|response|measurement)\b", value):
        score += 10
    if re.search(r"\b(formula|equation|calculation|matrix|model|simulation|worked example|worked problem|exercise|case study)\b", value):
        score += 10
    if re.search(r"\b(comparison|compare|versus|vs|difference|contrast|classification|taxonomy|structure|anatomy)\b", value):
        score += 8
    if re.search(r"\b(habituation|possible event|impossible event|observed by all infants|violation)\b", value):
        score += 14
    if re.search(r"\b(ultimatum|dictator|equal split|selfish split|proposer|responder|fairness|chimp)\b", value):
        score += 16
    if re.search(r"\b(dna|chromosome|allele|locus|genotype|phenotype|homozygous|heterozygous|dominant|recessive)\b", value):
        score += 14
    if re.search(r"\b(maoa|warrior gene|maltreatment|childhood experience|antisocial|serotonin|dopamine)\b", value):
        score += 16
    if re.search(r"\b(heritability|monozygotic|dizygotic|identical twins?|adoption|shared genes|iq)\b", value):
        score += 14
    if re.search(r"\b(gwas|genome-wide|snp|single nucleotide polymorphisms?|association)\b", value):
        score += 16
    if re.search(r"\b(flynn effect|iq gain|lewontin|within-group|between-group|within vs between|different causes)\b", value):
        score += 16
    if re.search(r"\b(correlation|causation|scatter|height|weight|axis|axes)\b", value):
        score += 12
    if re.search(r"\b(annotated|labelled|labeled|labels?|step[- ]?by[- ]?step|workflow|pipeline|derivation|proof|classification|taxonomy)\b", value):
        score += 9
    if re.search(r"\b(curve|equilibrium|demand|supply|money market|loanable funds|interest rate|quantity of money)\b", value):
        score += 12
    if re.search(r"\b(title slide|cover|about me|lecturer|email|contact)\b", value):
        score -= 12
    if re.search(r"\b(learning objectives?|lecture plan|outline|agenda|overview checklist)\b", value) and not _has_strong_visual_teaching_terms(value):
        score = min(score - 60, -12)
    return score


def selected_indices_by_score(texts: List[str], limit: int) -> List[int]:
    """v23 override: no automatic cover slide; choose high-value teaching pages."""
    if not texts or limit <= 0:
        return []
    scored = [(score_visual_text(text, i), i) for i, text in enumerate(texts)]
    positive = [(score, idx) for score, idx in scored if score >= RELEVANT_VISUAL_MIN_SCORE]
    ranked = positive if positive else scored
    selected = [idx for _, idx in sorted(ranked, key=lambda pair: (-pair[0], pair[1]))[:limit]]
    return sorted(selected)


def pptx_table_to_markdown(table) -> str:
    rows: List[List[str]] = []
    try:
        for row in table.rows:
            cells = [normalise_space(cell.text).replace("|", "/") for cell in row.cells]
            if any(cells):
                rows.append(cells)
    except Exception:
        return ""
    if not rows:
        return ""
    width = max(len(row) for row in rows)
    rows = [row + [""] * (width - len(row)) for row in rows]
    lines = [
        "| " + " | ".join(rows[0]) + " |",
        "| " + " | ".join(["---"] * width) + " |",
    ]
    for row in rows[1:]:
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines)


def pptx_chart_to_text(shape, slide_index: int) -> str:
    try:
        if not getattr(shape, "has_chart", False):
            return ""
        chart = shape.chart
    except Exception:
        return ""
    title = ""
    try:
        if chart.has_title and chart.chart_title and chart.chart_title.text_frame:
            title = normalise_space(chart.chart_title.text_frame.text)
    except Exception:
        title = ""
    lines = [f"[PPT SLIDE {slide_index} CHART] {title}".strip()]
    try:
        for plot_index, plot in enumerate(chart.plots, start=1):
            try:
                categories = [normalise_space(str(category)) for category in plot.categories]
            except Exception:
                categories = []
            for series in plot.series:
                name = normalise_space(getattr(series, "name", "") or f"Series {plot_index}")
                try:
                    values = list(series.values)
                except Exception:
                    values = []
                if categories and values and len(categories) == len(values):
                    lines.append(f"- {name}: " + ", ".join(f"{cat}: {value}" for cat, value in zip(categories, values)))
                elif values:
                    lines.append(f"- {name}: " + ", ".join(str(value) for value in values))
    except Exception:
        pass
    return "\n".join(lines).strip() if len(lines) > 1 or title else ""


def extract_pptx(data: bytes, source_name: str = "presentation") -> Tuple[str, List[dict]]:
    """v23 override: include current and nearby slide context in embedded-image labels."""
    if Presentation is None:
        return "PPTX support is not installed. Run: pip install python-pptx", []
    try:
        prs = Presentation(BytesIO(data))
    except Exception:
        return "PPTX parsing failed. Convert this presentation to PDF or paste slide text for richer extraction.", []

    slide_infos: List[dict] = []
    for slide_index, slide in enumerate(prs.slides, start=1):
        lines: List[str] = []
        image_blobs: List[Tuple[bytes, str]] = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text and shape.text.strip():
                lines.append(shape.text.strip())
            if getattr(shape, "has_table", False):
                table_md = pptx_table_to_markdown(shape.table)
                if table_md:
                    lines.append(f"[PPT SLIDE {slide_index} TABLE]\n{table_md}")
            chart_text = pptx_chart_to_text(shape, slide_index)
            if chart_text:
                lines.append(chart_text)
            if hasattr(shape, "image"):
                try:
                    image_blobs.append((shape.image.blob, shape.image.content_type or "image/png"))
                except Exception:
                    pass
        slide_infos.append({
            "index": slide_index,
            "text": "\n".join(lines),
            "images": image_blobs,
        })

    slide_texts = [f"[PPT SLIDE {info['index']}]\n{info['text']}" for info in slide_infos]
    full_slide_parts = render_pptx_slide_screenshots(data, source_name, slide_texts, MAX_VISUAL_IMAGES_PER_SOURCE)
    if full_slide_parts:
        return "\n\n".join(slide_texts).strip(), full_slide_parts

    if not ENABLE_PPTX_EMBEDDED_IMAGE_EXTRACTION:
        return "\n\n".join(slide_texts).strip(), []

    embedded_candidates: List[dict] = []
    embedded_limit = max(MAX_VISUAL_IMAGES_PER_SOURCE, RELEVANT_VISUAL_POOL_LIMIT)

    for idx, info in enumerate(slide_infos):
        current_preview = truncate_text(normalise_space(info.get("text") or ""), 700)
        prev_preview = truncate_text(normalise_space(slide_infos[idx - 1].get("text") or ""), 360) if idx > 0 else ""
        next_preview = truncate_text(normalise_space(slide_infos[idx + 1].get("text") or ""), 360) if idx + 1 < len(slide_infos) else ""
        context_preview = normalise_space(" ".join(part for part in (prev_preview, current_preview, next_preview) if part))
        signal = _v23_signal_counts(context_preview or current_preview)
        slide_score = score_visual_text(context_preview or current_preview, idx)
        for image_index, (blob, content_type) in enumerate(info.get("images") or [], start=1):
            label = (
                f"IN-TEXT SOURCE FIGURE FROM {source_name} — embedded image on PPT slide {info['index']}. "
                f"Current slide text preview: {current_preview}. "
                f"Nearby slide context: previous={prev_preview}; next={next_preview}. "
                f"Teaching-signal-count={signal['teaching']}; decorative-signal-count={signal['decorative']}; visual-score={slide_score}. "
                "Use only if the actual image is a relevant teaching figure, chart, data display, diagram, experiment sequence, or method/result image."
            )
            embedded_candidates.append({
                "slide_index": info["index"],
                "image_index": image_index,
                "score": slide_score,
                "label": label,
                "blob": blob,
                "content_type": content_type,
            })

    selected_embedded = sorted(
        embedded_candidates,
        key=lambda item: (-item["score"], item["slide_index"], item["image_index"]),
    )[:embedded_limit]
    selected_embedded = sorted(selected_embedded, key=lambda item: (item["slide_index"], item["image_index"]))
    embedded_parts: List[dict] = []
    for item in selected_embedded:
        embedded_parts.append({"type": "text", "text": item["label"]})
        embedded_parts.append(image_part_from_bytes(item["blob"], item["content_type"]))

    return "\n\n".join(slide_texts).strip(), embedded_parts


def rasterize_svg_image_bytes(data: bytes, max_width: Optional[int] = None) -> bytes:
    """Convert generated PPTX SVG fallbacks into PNG without changing labels/text."""
    if not data or fitz is None:
        return b""
    doc = None
    try:
        doc = fitz.open(stream=data, filetype="svg")
        if len(doc) <= 0:
            return b""
        page = doc.load_page(0)
        width = max(float(page.rect.width or 1), 1.0)
        max_width = int(max_width or env_int("PPTX_SVG_RASTER_MAX_WIDTH", 2200))
        scale = min(2.0, max(1.0, max_width / width))
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        return pix.tobytes("png")
    except Exception:
        return b""
    finally:
        if doc is not None:
            try:
                doc.close()
            except Exception:
                pass


def source_preview_image_url(data: bytes, content_type: str = "image/jpeg", browser_asset: bool = False) -> str:
    normalized_type = (content_type or "").lower()
    if normalized_type == "image/svg+xml":
        rasterized = rasterize_svg_image_bytes(data)
        if rasterized:
            data, content_type = _v22_resize_image_bytes(rasterized, "image/png")
        else:
            content_type = "image/svg+xml"
    elif normalized_type.startswith("image/"):
        data, content_type = _v22_resize_image_bytes(data, content_type)
    encoded = base64.b64encode(data).decode("utf-8")
    data_url = f"data:{content_type};base64,{encoded}"
    if not browser_asset:
        return data_url
    try:
        from core.visual_assets import visual_asset_url_for_browser
    except ModuleNotFoundError:
        from backend.core.visual_assets import visual_asset_url_for_browser
    try:
        return visual_asset_url_for_browser(data_url) or data_url
    except Exception:
        return data_url


def source_preview_title_from_text(text: str, fallback: str) -> str:
    for line in str(text or "").splitlines():
        title = normalise_space(line)
        if len(title) >= 3:
            return truncate_text(title, 90)
    return fallback


def pptx_emu_to_px(value: Any) -> float:
    try:
        return round(float(value or 0) / 914400 * 96, 2)
    except Exception:
        return 0.0


def svg_escape(value: Any) -> str:
    return html.escape(str(value or ""), quote=True)


def pptx_color_to_hex(value: Any, fallback: str) -> str:
    try:
        rgb = getattr(value, "rgb", None)
        if rgb:
            return f"#{str(rgb)}"
    except Exception:
        pass
    return fallback


def pptx_shape_fill_hex(shape: Any, fallback: str = "transparent") -> str:
    try:
        fill = getattr(shape, "fill", None)
        if not fill or not getattr(fill, "type", None):
            return fallback
        return pptx_color_to_hex(fill.fore_color, fallback)
    except Exception:
        return fallback


def pptx_shape_line_hex(shape: Any, fallback: str = "transparent") -> str:
    try:
        line = getattr(shape, "line", None)
        if not line or not getattr(line, "color", None):
            return fallback
        return pptx_color_to_hex(line.color, fallback)
    except Exception:
        return fallback


def pptx_text_font_px(shape: Any, box_height: float) -> float:
    try:
        text_frame = getattr(shape, "text_frame", None)
        for paragraph in getattr(text_frame, "paragraphs", []) or []:
            for run in getattr(paragraph, "runs", []) or []:
                size = getattr(getattr(run, "font", None), "size", None)
                if size:
                    return max(9.0, min(64.0, float(size.pt) * 96 / 72))
    except Exception:
        pass
    return max(11.0, min(32.0, (box_height or 96) / 5.5))


def pptx_text_fill_hex(shape: Any, fallback: str = "#111827") -> str:
    try:
        text_frame = getattr(shape, "text_frame", None)
        for paragraph in getattr(text_frame, "paragraphs", []) or []:
            for run in getattr(paragraph, "runs", []) or []:
                color = getattr(getattr(run, "font", None), "color", None)
                rgb = getattr(color, "rgb", None)
                if rgb:
                    return f"#{str(rgb)}"
    except Exception:
        pass
    return fallback


def render_svg_wrapped_text(
    text: str,
    x: float,
    y: float,
    width: float,
    height: float,
    font_px: float,
    fill: str = "#111827",
    weight: str = "500",
) -> str:
    value = str(text or "").strip()
    if not value or width <= 4 or height <= 4:
        return ""

    max_chars = max(8, int(width / max(font_px * 0.52, 1)))
    line_height = max(font_px * 1.22, font_px + 3)
    cursor_y = y + font_px
    lines: List[str] = []
    for raw_line in value.splitlines():
        raw_line = normalise_space(raw_line)
        if not raw_line:
            cursor_y += line_height * 0.55
            continue
        break_long = " " not in raw_line and len(raw_line) > max_chars
        wrapped = textwrap.wrap(raw_line, width=max_chars, break_long_words=break_long, replace_whitespace=False) or [raw_line]
        for line in wrapped:
            if cursor_y > y + height - 2:
                return "".join(lines)
            lines.append(
                f'<text x="{x:.2f}" y="{cursor_y:.2f}" font-family="Inter, Arial, sans-serif" '
                f'font-size="{font_px:.2f}" font-weight="{weight}" fill="{fill}">{svg_escape(line)}</text>'
            )
            cursor_y += line_height
    return "".join(lines)


def render_pptx_table_svg(shape: Any, x: float, y: float, width: float, height: float) -> str:
    try:
        table = shape.table
        rows = list(table.rows)
        cols = list(table.columns)
    except Exception:
        return ""
    if not rows or not cols:
        return ""

    row_count = len(rows)
    col_count = len(cols)
    cell_w = width / max(col_count, 1)
    cell_h = height / max(row_count, 1)
    font_px = max(8.0, min(16.0, cell_h * 0.28))
    parts = []
    for row_index, row in enumerate(rows):
        for col_index, cell in enumerate(row.cells):
            cx = x + col_index * cell_w
            cy = y + row_index * cell_h
            fill = "#f8fafc" if row_index == 0 else "#ffffff"
            parts.append(
                f'<rect x="{cx:.2f}" y="{cy:.2f}" width="{cell_w:.2f}" height="{cell_h:.2f}" '
                f'fill="{fill}" stroke="#d8e0ef" stroke-width="1"/>'
            )
            cell_text = normalise_space(getattr(cell, "text", "") or "")
            if cell_text:
                parts.append(
                    render_svg_wrapped_text(
                        cell_text,
                        cx + 5,
                        cy + 5,
                        max(2, cell_w - 10),
                        max(2, cell_h - 10),
                        font_px,
                        "#1f2937",
                        "700" if row_index == 0 else "500",
                    )
                )
    return "".join(parts)


def render_pptx_chart_placeholder_svg(shape: Any, x: float, y: float, width: float, height: float, slide_index: int) -> str:
    chart_text = pptx_chart_to_text(shape, slide_index)
    if not chart_text:
        return ""
    title = chart_text.splitlines()[0].replace(f"[PPT SLIDE {slide_index} CHART]", "").strip() or "Chart"
    body = "\n".join(chart_text.splitlines()[1:])[:900]
    parts = [
        f'<rect x="{x:.2f}" y="{y:.2f}" width="{width:.2f}" height="{height:.2f}" rx="10" '
        'fill="#f8fbff" stroke="#9db7ff" stroke-width="2"/>',
        render_svg_wrapped_text(title, x + 14, y + 16, width - 28, max(28, height * 0.22), max(14, min(24, height * 0.08)), "#1d4ed8", "800"),
        render_svg_wrapped_text(body, x + 14, y + max(52, height * 0.25), width - 28, height * 0.7, max(10, min(15, height * 0.045)), "#334155", "500"),
    ]
    return "".join(parts)


def render_pptx_slide_as_svg(slide: Any, slide_width_px: float, slide_height_px: float, slide_index: int) -> str:
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{slide_width_px:.0f}" height="{slide_height_px:.0f}" '
        f'viewBox="0 0 {slide_width_px:.2f} {slide_height_px:.2f}">',
        '<rect width="100%" height="100%" fill="#ffffff"/>',
    ]

    for shape in slide.shapes:
        x = pptx_emu_to_px(getattr(shape, "left", 0))
        y = pptx_emu_to_px(getattr(shape, "top", 0))
        width = max(1.0, pptx_emu_to_px(getattr(shape, "width", 0)))
        height = max(1.0, pptx_emu_to_px(getattr(shape, "height", 0)))

        if hasattr(shape, "image"):
            try:
                image = shape.image
                content_type = image.content_type or "image/png"
                encoded = base64.b64encode(image.blob).decode("utf-8")
                parts.append(
                    f'<image x="{x:.2f}" y="{y:.2f}" width="{width:.2f}" height="{height:.2f}" '
                    f'href="data:{content_type};base64,{encoded}" preserveAspectRatio="xMidYMid meet"/>'
                )
                continue
            except Exception:
                pass

        if getattr(shape, "has_table", False):
            table_svg = render_pptx_table_svg(shape, x, y, width, height)
            if table_svg:
                parts.append(table_svg)
                continue

        chart_svg = render_pptx_chart_placeholder_svg(shape, x, y, width, height, slide_index)
        if chart_svg:
            parts.append(chart_svg)
            continue

        fill = pptx_shape_fill_hex(shape)
        stroke = pptx_shape_line_hex(shape)
        text = str(getattr(shape, "text", "") or "").strip()
        if fill != "transparent" or stroke != "transparent" or text:
            rect_fill = fill if fill != "transparent" else "none"
            rect_stroke = stroke if stroke != "transparent" else "none"
            if fill != "transparent" or rect_stroke != "none":
                parts.append(
                    f'<rect x="{x:.2f}" y="{y:.2f}" width="{width:.2f}" height="{height:.2f}" rx="4" '
                    f'fill="{rect_fill}" stroke="{rect_stroke}" stroke-width="1"/>'
                )
        if text:
            font_px = pptx_text_font_px(shape, height)
            font_fill = pptx_text_fill_hex(shape)
            weight = "800" if font_px >= 24 else "600"
            parts.append(
                render_svg_wrapped_text(text, x + 6, y + 6, max(2, width - 12), max(2, height - 12), font_px, font_fill, weight)
            )

    parts.append("</svg>")
    return "".join(parts)


def render_pptx_source_preview_svg_images(prs: Any, max_slides: int, browser_assets: bool = False) -> Dict[int, str]:
    """Best-effort complete slide-page fallback when native PPTX rendering is unavailable."""
    if not prs or max_slides <= 0:
        return {}
    slide_width_px = max(320.0, pptx_emu_to_px(getattr(prs, "slide_width", 0)) or 1280.0)
    slide_height_px = max(240.0, pptx_emu_to_px(getattr(prs, "slide_height", 0)) or 720.0)
    rendered: Dict[int, str] = {}
    for slide_index, slide in enumerate(prs.slides, start=1):
        if slide_index > max_slides:
            break
        try:
            svg = render_pptx_slide_as_svg(slide, slide_width_px, slide_height_px, slide_index)
            rendered[slide_index] = source_preview_image_url(
                svg.encode("utf-8"),
                "image/svg+xml",
                browser_asset=browser_assets,
            )
        except Exception:
            continue
    return rendered


def render_pdf_path_to_source_preview_images(pdf_path: Path, max_pages: int, browser_assets: bool = False) -> Dict[int, str]:
    if fitz is None or max_pages <= 0 or not pdf_path.exists():
        return {}
    doc = None
    try:
        doc = fitz.open(str(pdf_path))
        matrix = source_visual_render_matrix(SOURCE_PREVIEW_RENDER_DPI)
        rendered: Dict[int, str] = {}
        for page_index in range(min(len(doc), max_pages)):
            page = doc.load_page(page_index)
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            rendered[page_index + 1] = source_preview_image_url(
                pix.tobytes("png"),
                "image/png",
                browser_asset=browser_assets,
            )
        return rendered
    except Exception:
        return {}
    finally:
        if doc is not None:
            try:
                doc.close()
            except Exception:
                pass


def macos_app_exists(app_name: str) -> bool:
    if sys.platform != "darwin":
        return False
    candidates = [
        Path("/Applications") / app_name,
        Path("/System/Applications") / app_name,
        Path.home() / "Applications" / app_name,
    ]
    return any(candidate.exists() for candidate in candidates)
