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
        lines.append(
            f"Source figure {i}: Source {card.get('source_index')} {card.get('location')} | "
            f"Title: {card.get('title')} | Shows: {card.get('what_shows')} | "
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
        }
    return {
        "figure_title": "Source figure",
        "visual_card_title": "Source figure",
        "what_shows": "What the image shows",
        "argument": "Why it matters here",
        "connection": "Connection to the concept",
        "how_to_read": "How to read it",
        "exam_use": "Exam / revision use",
    }


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
