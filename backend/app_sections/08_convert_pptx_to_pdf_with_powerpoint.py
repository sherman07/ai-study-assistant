def convert_pptx_to_pdf_with_powerpoint(pptx_path: Path, pdf_path: Path) -> Tuple[bool, str]:
    if sys.platform != "darwin" or not shutil.which("osascript") or not macos_app_exists("Microsoft PowerPoint.app"):
        return False, ""
    script = [
        'on run argv',
        'set inputPath to item 1 of argv',
        'set outputPath to item 2 of argv',
        'tell application "Microsoft PowerPoint"',
        'with timeout of 1200 seconds',
        'open POSIX file inputPath',
        'delay 1',
        'set thePresentation to active presentation',
        'save thePresentation in POSIX file outputPath as save as PDF',
        'close thePresentation saving no',
        'end timeout',
        'end tell',
        'end run',
    ]
    command: List[str] = ["osascript"]
    for line in script:
        command.extend(["-e", line])
    command.extend([str(pptx_path), str(pdf_path)])
    try:
        subprocess.run(
            command,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=max(20, SOURCE_PREVIEW_PPTX_CONVERT_TIMEOUT),
        )
        if pdf_path.exists() and pdf_path.stat().st_size > 0:
            return True, "powerpoint"
    except Exception:
        pass
    return False, ""


def convert_pptx_to_pdf_with_keynote(pptx_path: Path, pdf_path: Path) -> Tuple[bool, str]:
    if sys.platform != "darwin" or not shutil.which("osascript") or not macos_app_exists("Keynote.app"):
        return False, ""
    script = [
        'on run argv',
        'set inputPath to item 1 of argv',
        'set outputPath to item 2 of argv',
        'tell application "Keynote"',
        'with timeout of 1200 seconds',
        'set docRef to open POSIX file inputPath',
        'export docRef to POSIX file outputPath as PDF',
        'close docRef saving no',
        'end timeout',
        'end tell',
        'end run',
    ]
    command: List[str] = ["osascript"]
    for line in script:
        command.extend(["-e", line])
    command.extend([str(pptx_path), str(pdf_path)])
    try:
        subprocess.run(
            command,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=max(20, SOURCE_PREVIEW_PPTX_CONVERT_TIMEOUT),
        )
        if pdf_path.exists() and pdf_path.stat().st_size > 0:
            return True, "keynote"
    except Exception:
        pass
    return False, ""


def convert_pptx_to_pdf_with_macos_app(pptx_path: Path, pdf_path: Path) -> Tuple[bool, str]:
    for converter in (convert_pptx_to_pdf_with_powerpoint, convert_pptx_to_pdf_with_keynote):
        ok, mode = converter(pptx_path, pdf_path)
        if ok:
            return True, mode
    return False, ""


def render_pptx_source_preview_images(data: bytes, prs: Any, max_slides: int) -> Tuple[Dict[int, str], str]:
    """Render PPTX slides for the interactive source viewer.

    This is separate from generation-time slide rendering. The user explicitly
    opened a source, so a short on-demand conversion is worth the cost. The
    production path is LibreOffice/headless PPTX-to-PDF conversion, which can run
    in a deployed server or container. Local desktop apps are an explicit
    developer-only fallback and are disabled by default. If native conversion is
    unavailable, keep the reader useful by returning complete SVG slide canvases
    instead of fragmented extracted text/images.
    """
    if max_slides <= 0:
        return {}, ""

    if ENABLE_SOURCE_PPTX_PREVIEW_RENDER:
        soffice = find_libreoffice_binary()
        if fitz is not None and soffice:
            with tempfile.TemporaryDirectory() as tmp:
                tmpdir = Path(tmp)
                pptx_path = tmpdir / "source-preview.pptx"
                pptx_path.write_bytes(data)
                try:
                    subprocess.run(
                        [soffice, "--headless", "--convert-to", "pdf", "--outdir", str(tmpdir), str(pptx_path)],
                        check=True,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        timeout=max(20, SOURCE_PREVIEW_PPTX_CONVERT_TIMEOUT),
                    )
                    pdf_candidates = list(tmpdir.glob("*.pdf"))
                    if pdf_candidates:
                        rendered = render_pdf_path_to_source_preview_images(
                            pdf_candidates[0],
                            max_slides,
                            browser_assets=True,
                        )
                        if rendered:
                            return rendered, "libreoffice"
                except Exception:
                    pass

        if fitz is not None and ENABLE_LOCAL_PPTX_APP_RENDER:
            with tempfile.TemporaryDirectory() as tmp:
                tmpdir = Path(tmp)
                pptx_path = tmpdir / "source-preview.pptx"
                pdf_path = tmpdir / "source-preview-local-app.pdf"
                pptx_path.write_bytes(data)
                ok, app_mode = convert_pptx_to_pdf_with_macos_app(pptx_path, pdf_path)
                if ok:
                    rendered = render_pdf_path_to_source_preview_images(
                        pdf_path,
                        max_slides,
                        browser_assets=True,
                    )
                    if rendered:
                        return rendered, f"local-{app_mode}"

    svg_rendered = render_pptx_source_preview_svg_images(prs, max_slides, browser_assets=True)
    if svg_rendered:
        return svg_rendered, "server-svg"
    return {}, ""


def build_pdf_source_preview(data: bytes, source_name: str) -> dict:
    if fitz is None:
        return {
            "kind": "pdf",
            "title": source_name,
            "error": "PDF page preview requires PyMuPDF on the backend.",
        }

    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception:
        return {
            "kind": "pdf",
            "title": source_name,
            "error": "This PDF could not be opened for preview.",
        }

    try:
        page_count = len(doc)
        page_limit = max(1, min(SOURCE_PREVIEW_MAX_PDF_PAGES, page_count))
        matrix = source_visual_render_matrix(SOURCE_PREVIEW_RENDER_DPI)
        pages: List[dict] = []

        for page_index in range(page_limit):
            page = doc.load_page(page_index)
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            pages.append({
                "number": page_index + 1,
                "image": source_preview_image_url(pix.tobytes("png"), "image/png", browser_asset=True),
            })

        warning = ""
        if page_count > page_limit:
            warning = f"Showing the first {page_limit} of {page_count} pages for browser performance."

        return {
            "kind": "pdf",
            "title": source_name,
            "page_count": page_count,
            "shown_count": len(pages),
            "warning": warning,
            "pages": pages,
        }
    except Exception as error:
        return {
            "kind": "pdf",
            "title": source_name,
            "error": f"PDF preview could not be rendered: {error}",
        }
    finally:
        try:
            doc.close()
        except Exception:
            pass


def build_pptx_source_preview(data: bytes, source_name: str) -> dict:
    if Presentation is None:
        return {
            "kind": "presentation",
            "title": source_name,
            "error": "PPTX preview requires python-pptx on the backend.",
        }
    try:
        prs = Presentation(BytesIO(data))
    except Exception:
        return {
            "kind": "presentation",
            "title": source_name,
            "error": "This PPTX could not be parsed. Try exporting it to PDF and uploading the PDF.",
        }

    slide_limit = max(1, min(SOURCE_PREVIEW_MAX_SLIDES, len(prs.slides)))
    rendered_slides, render_mode = render_pptx_source_preview_images(data, prs, slide_limit)
    embedded_image_count = 0
    slides: List[dict] = []

    for slide_index, slide in enumerate(prs.slides, start=1):
        if slide_index > slide_limit:
            break
        lines: List[str] = []
        images: List[dict] = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text and shape.text.strip():
                lines.append(shape.text.strip())
            if getattr(shape, "has_table", False):
                table_md = pptx_table_to_markdown(shape.table)
                if table_md:
                    lines.append(f"Table on slide {slide_index}\n{table_md}")
            chart_text = pptx_chart_to_text(shape, slide_index)
            if chart_text:
                lines.append(chart_text)
            if (
                not rendered_slides
                and hasattr(shape, "image")
                and embedded_image_count < SOURCE_PREVIEW_MAX_EMBEDDED_IMAGES
            ):
                try:
                    blob = shape.image.blob
                    content_type = shape.image.content_type or "image/png"
                    embedded_image_count += 1
                    images.append({
                        "alt": f"Embedded image {len(images) + 1} on slide {slide_index}",
                        "url": source_preview_image_url(blob, content_type, browser_asset=True),
                    })
                except Exception:
                    pass

        slide_text = "\n\n".join(part for part in lines if part).strip()
        slides.append({
            "number": slide_index,
            "title": source_preview_title_from_text(slide_text, f"Slide {slide_index}"),
            "text": slide_text,
            "screenshot": rendered_slides.get(slide_index, ""),
            "images": images,
        })

    warning = ""
    if len(prs.slides) > slide_limit:
        warning = f"Showing the first {slide_limit} of {len(prs.slides)} slides for browser performance."
    elif not rendered_slides:
        warning = "Full slide-page previews are unavailable. Install LibreOffice on the server for production PPTX rendering, or upload/export this presentation as PDF."

    return {
        "kind": "presentation",
        "title": source_name,
        "slide_count": len(prs.slides),
        "shown_count": len(slides),
        "render_mode": render_mode,
        "rendered_slide_pages": bool(rendered_slides),
        "warning": warning,
        "slides": slides,
    }


def build_docx_source_preview(data: bytes, source_name: str) -> dict:
    if Document is None:
        return {
            "kind": "document",
            "title": source_name,
            "error": "DOCX preview requires python-docx on the backend.",
        }
    try:
        document = Document(BytesIO(data))
    except Exception:
        return {
            "kind": "document",
            "title": source_name,
            "error": "This DOCX could not be parsed.",
        }

    blocks: List[str] = []
    for paragraph in document.paragraphs:
        text = normalise_space(paragraph.text)
        if text:
            blocks.append(text)
    for table in document.tables:
        rows: List[List[str]] = []
        for row in table.rows:
            cells = [normalise_space(cell.text).replace("|", "/") for cell in row.cells]
            if any(cells):
                rows.append(cells)
        if rows:
            width = max(len(row) for row in rows)
            rows = [row + [""] * (width - len(row)) for row in rows]
            table_lines = [
                "| " + " | ".join(rows[0]) + " |",
                "| " + " | ".join(["---"] * width) + " |",
            ]
            table_lines.extend("| " + " | ".join(row) + " |" for row in rows[1:])
            blocks.append("\n".join(table_lines))

    text = "\n\n".join(blocks).strip()
    return {
        "kind": "document",
        "title": source_preview_title_from_text(text, source_name),
        "text": truncate_text(text, 160000),
    }


def _v23_visual_kind(label: str) -> str:
    value = _v23_scoring_text(label).lower()
    if re.search(r"\b(table|mean|median|rate|statistics?|data|results?|percentage|sample|cohort|survey|risk ratio|odds ratio|confidence interval|p[- ]?value)\b|表|统计|数据|结果", value):
        return "data/table"
    if re.search(r"\b(graph|chart|plot|axis|axes|distribution|curve|regression|histogram|boxplot|scatter)\b|图表|坐标|曲线", value):
        return "graph/chart"
    if re.search(r"\b(correlation|scatter|height|weight|iq gain|flynn effect|gwas|genome-wide|snp|association)\b", value):
        return "graph/chart"
    if re.search(r"\b(diagram|model|process|flow|mechanism|schema|schematic|map|timeline|flowchart|cycle|pathway|network|framework|architecture|structure|anatomy|classification|taxonomy)\b|模型|机制|流程", value):
        return "diagram/model"
    if re.search(r"\b(dna|chromosome|allele|locus|genotype|phenotype|homozygous|heterozygous|dominant|recessive|pku|phenylketonuria)\b", value):
        return "diagram/model"
    if re.search(r"\b(experiment|method|procedure|protocol|trial|task|event|condition|control|participant|stimulus|response|measurement|habituation|possible|impossible|observed|violation|ultimatum|dictator|proposer|responder|equal split|selfish split|fairness|chimp|token)\b|实验|事件", value):
        return "experiment/event"
    if re.search(r"\b(maoa|warrior gene|maltreatment|childhood experience|antisocial|role of genotype|environment)\b", value):
        return "method/result figure"
    if re.search(r"\b(heritability|monozygotic|dizygotic|identical twins?|adoption|shared genes|lewontin|within-group|between-group)\b", value):
        return "method/result figure"
    if re.search(r"\b(formula|equation|calculation|matrix|vector)\b|公式", value):
        return "formula/calculation"
    if re.search(r"\b(mri|fmri|eeg|bold|activation|neuroimaging|brain scan|biomarker|network|applications? in research)\b|脑成像|神经影像|激活", value):
        return "method/result figure"
    return "unknown"


def _pdf_page_visual_counts(page) -> Tuple[int, int]:
    try:
        image_count = len(page.get_images(full=True))
    except Exception:
        image_count = 0
    try:
        drawing_count = len(page.get_drawings())
    except Exception:
        drawing_count = 0
    return image_count, drawing_count


def _is_overview_or_admin_page(text: str) -> bool:
    value = normalise_space(text or "").lower()
    return bool(re.search(r"\b(learning objectives?|lecture plan|agenda|outline|overview checklist|course information|contact)\b", value))


def score_pdf_page_visual_value(page, text: str, index: int = 0) -> Tuple[int, int, int]:
    """Rank rendered PDF pages by real teaching-image value, not by page order."""
    image_count, drawing_count = _pdf_page_visual_counts(page)
    if _is_overview_or_admin_page(text) and image_count == 0 and drawing_count <= 4:
        return -60, image_count, drawing_count
    text_score = score_visual_text(text, index)
    visual_bonus = min(image_count, 6) * 6 + min(max(drawing_count - 2, 0), 90) // 5
    value = normalise_space(text or "").lower()
    has_teaching_terms = _has_strong_visual_teaching_terms(value)

    if image_count >= 1 and has_teaching_terms:
        visual_bonus += 10
    if drawing_count >= 8 and has_teaching_terms:
        visual_bonus += 10
    if image_count >= 1 and not _is_overview_or_admin_page(text) and len(normalise_space(text or "")) < 120:
        # Some useful lecture figures are a mostly image-only PDF page.
        # Keep them in the candidate pool so the vision model can judge them.
        visual_bonus += 8
    if drawing_count >= 18 and not _is_overview_or_admin_page(text):
        visual_bonus += 8
    if image_count >= 1 and re.search(r"\b(dna|chromosome|allele|maoa|gwas|snp|flynn|iq|heritability|correlation|lewontin|pku|maltreatment)\b", value):
        visual_bonus += 12
    if drawing_count >= 20 and re.search(r"\b(correlation|plot|axis|height|weight|iq|curve|regression|scatter|histogram|boxplot|distribution)\b", value):
        visual_bonus += 18
    if re.search(r"\b(fig\.|figure|table|graph|chart|plot|diagram|schema|schematic|correlation|experiment|procedure|model|mechanism|pathway|timeline|flowchart|role of genotype|genome-wide|flynn effect|within vs between|shared genes)\b", value):
        visual_bonus += 10
    if image_count >= 2 and re.search(r"\b(gwas|genome-wide complex trait analysis|snp-based associations?|manhattan plot)\b", value):
        visual_bonus += 42
    if len(normalise_space(text or "")) < 25 and image_count == 0 and drawing_count < 8:
        visual_bonus -= 18
    return text_score + visual_bonus, image_count, drawing_count


def selected_pdf_visual_indices(doc, limit: int) -> List[int]:
    scored: List[Tuple[int, int, int, int, str]] = []
    for index, page in enumerate(doc):
        try:
            text = page.get_text("text") or ""
        except Exception:
            text = ""
        score, image_count, drawing_count = score_pdf_page_visual_value(page, text, index)
        if _is_overview_or_admin_page(text) and score < 20:
            continue
        scored.append((score, index, image_count, drawing_count, text))

    threshold = max(RELEVANT_VISUAL_MIN_SCORE, 12)
    useful = [item for item in scored if item[0] >= threshold]
    ranked = useful if useful else scored
    selected = [
        index for score, index, image_count, drawing_count, text in sorted(
            ranked,
            key=lambda item: (-item[0], item[1]),
        )[:limit]
    ]
    return sorted(selected)


def render_pdf_visual_parts(data: bytes, source_name: str, max_pages: Optional[int] = None) -> List[dict]:
    """v39: scan the whole PDF and render the pages with the strongest teaching visuals."""
    if fitz is None:
        return []
    requested_pages = int(max_pages or MAX_VISUAL_IMAGES_PER_SOURCE)
    max_pages_to_render = min(
        max(requested_pages, CONTROLLED_MAX_PDF_PAGES_PER_SOURCE, RELEVANT_VISUAL_POOL_LIMIT),
        PDF_VISUAL_CANDIDATE_LIMIT,
    )
    if max_pages_to_render <= 0:
        return []
    parts: List[dict] = []
    try:
        doc = fitz.open(stream=data, filetype="pdf")
        selected = selected_pdf_visual_indices(doc, max_pages_to_render)
        matrix = source_visual_render_matrix(CONTROLLED_VISUAL_RENDER_DPI)
        for idx in selected:
            page = doc.load_page(idx)
            page_text = page.get_text("text") or ""
            score, image_count, drawing_count = score_pdf_page_visual_value(page, page_text, idx)
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            img_bytes = pix.tobytes("png")
            preview = truncate_text(normalise_space(page_text), 680)
            label = (
                f"IN-TEXT SOURCE FIGURE FROM {source_name} — PDF page {idx + 1}. "
                f"Actual source screenshot selected for its teaching figure/graph/data value. "
                f"Image-count={image_count}; drawing-count={drawing_count}; visual-score={score}. "
                f"Page text preview: {preview}"
            )
            parts.append({"type": "text", "text": label})
            parts.append(image_part_from_bytes(img_bytes, "image/png"))
        doc.close()
    except Exception:
        return []
    return parts


def iter_visual_candidates(source_units: List[dict]) -> List[dict]:
    """v23 override: attach relevance metadata for sorting and model filtering."""
    candidates: List[dict] = []
    for source_index, unit in enumerate(source_units or [], start=1):
        title = unit.get("title_candidate") or unit.get("display_name") or f"Source {source_index}"
        label = ""
        visual_number = 0
        for part in unit.get("visual_parts") or []:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "text":
                label = normalise_space(part.get("text") or "")
                continue
            if part.get("type") != "image_url":
                continue
            url = image_url_from_part(part)
            if not url:
                continue
            visual_number += 1
            _, location = visual_source_location_from_label(label)
            label_score = re.search(r"\bvisual-score=(-?\d+)\b", label, flags=re.I)
            if label_score:
                try:
                    score = int(label_score.group(1))
                except Exception:
                    score = score_visual_text(f"{label} {title}", visual_number)
            else:
                score = score_visual_text(f"{label} {title}", visual_number)
            kind = _v23_visual_kind(label)
            signals = _v23_signal_counts(label)
            is_unusable_unknown = kind == "unknown" and signals["teaching"] <= 0
            candidates.append({
                "source_index": source_index,
                "source_title": title,
                "display_name": unit.get("display_name", title),
                "caption": label[:620] if label else f"In-text source figure from Source {source_index}",
                "location": location or f"figure {visual_number}",
                "url": url,
                "score": score,
                "visual_kind": kind,
                "teaching_signals": signals["teaching"],
                "decorative_signals": signals["decorative"],
                "is_likely_decorative": is_unusable_unknown or (signals["decorative"] > signals["teaching"] and score < RELEVANT_VISUAL_MIN_SCORE),
            })
    return candidates


def _v23_candidate_is_explicitly_decorative(cand: dict) -> bool:
    text = normalise_space(f"{cand.get('caption', '')} {cand.get('title', '')} {cand.get('location', '')}").lower()
    return bool(re.search(
        r"\b(title slide|cover|about me|lecturer|email|contact|logo|decorative|stock photo|background)\b",
        text,
        flags=re.I,
    )) and int(cand.get("score") or 0) < RELEVANT_VISUAL_MIN_SCORE


def _v23_candidate_has_source_teaching_value(cand: dict) -> bool:
    """Keep useful lecture/PDF screenshots from being over-filtered."""
    if not cand or not cand.get("url"):
        return False
    if _v23_candidate_is_explicitly_decorative(cand):
        return False
    text = normalise_space(f"{cand.get('caption', '')} {cand.get('visual_kind', '')} {cand.get('source_title', '')}")
    score = int(cand.get("score") or 0)
    teaching_signals = int(cand.get("teaching_signals") or 0)
    decorative_signals = int(cand.get("decorative_signals") or 0)
    if cand.get("visual_kind") != "unknown" and not cand.get("is_likely_decorative"):
        return True
    if score >= max(4, RELEVANT_VISUAL_MIN_SCORE // 2) and teaching_signals >= max(1, decorative_signals):
        return True
    if score >= 2 and teaching_signals >= 1 and decorative_signals <= teaching_signals + 1:
        return True
    return bool(re.search(
        r"IN-TEXT SOURCE FIGURE|PPT slide|PDF page|rendered slide|diagram|model|table|graph|chart|"
        r"key terms|concepts|experiment|method|result|comparison|data|evidence|formula|figure|"
        r"workflow|pipeline|worked example|exercise|annotated|labelled|labeled|curve|axis|axes|"
        r"demand|supply|equilibrium|classification|taxonomy|流程|模型|图表|数据|实验|概念|例题|标注|分类",
        text,
        flags=re.I,
    )) and teaching_signals >= decorative_signals


def select_visual_candidates_for_argument(source_units: List[dict], limit: Optional[int] = None) -> List[dict]:
    limit = int(limit or CONTROLLED_MAX_VISUALS or VISUAL_ARGUMENT_CARD_LIMIT)
    candidates = iter_visual_candidates(source_units)
    if not candidates or limit <= 0:
        return []

    useful = [
        cand for cand in candidates
        if cand.get("score", 0) >= RELEVANT_VISUAL_MIN_SCORE
        and not cand.get("is_likely_decorative")
        and cand.get("visual_kind") != "unknown"
    ]
    source_teaching = [
        cand for cand in candidates
        if _v23_candidate_has_source_teaching_value(cand)
    ]
    non_decorative = [
        cand for cand in candidates
        if not cand.get("is_likely_decorative") and cand.get("visual_kind") != "unknown"
    ]
    pool = []
    seen_pool = set()
    for group in (useful, source_teaching, non_decorative):
        for cand in group:
            key = (
                cand.get("source_index"),
                normalise_space(cand.get("location") or cand.get("caption") or "")[:180],
                cand.get("url"),
            )
            if key in seen_pool:
                continue
            seen_pool.add(key)
            pool.append(cand)
    if not pool:
        pool = [
            cand for cand in sorted(candidates, key=lambda c: (-c.get("score", 0), c.get("source_index", 0), c.get("location", "")))
            if cand.get("url") and not _v23_candidate_is_explicitly_decorative(cand)
        ][:limit]
    if not pool:
        return []

    def location_key(cand: dict) -> Tuple[int, str]:
        location = normalise_space(cand.get("location") or cand.get("caption") or "")
        return int(cand.get("source_index") or 0), location.lower()[:120]

    def append_unique(cand: dict, selected: List[dict], seen_locations: set) -> bool:
        key = location_key(cand)
        if key in seen_locations:
            return False
        selected.append(cand)
        seen_locations.add(key)
        return True

    ranked = sorted(pool, key=lambda c: (-c.get("score", 0), c.get("source_index", 0), c.get("location", "")))
    selected: List[dict] = []
    seen_sources = set()
    seen_locations = set()

    # First pass: give each uploaded source a fair chance, but do not let one
    # slide/page with several extracted images fill the whole vision budget.
    for cand in ranked:
        if cand["source_index"] not in seen_sources and append_unique(cand, selected, seen_locations):
            seen_sources.add(cand["source_index"])
        if len(selected) >= limit:
            return selected[:limit]

    # Second pass: add the best remaining distinct page/slide from any source.
    for cand in ranked:
        if cand not in selected:
            append_unique(cand, selected, seen_locations)
        if len(selected) >= limit:
            break

    return selected[:limit]


def _v23_parse_relevant_visual_cards(raw: str, candidates: List[dict], labels: dict) -> List[dict]:
    parsed = extract_json_object(raw)
    raw_cards = parsed.get("cards") if isinstance(parsed, dict) else []
    cards: List[dict] = []
    if not isinstance(raw_cards, list):
        raw_cards = []
    for item in raw_cards:
        if not isinstance(item, dict):
            continue
        try:
            cand_index = int(item.get("visual_index", len(cards)))
        except Exception:
            cand_index = len(cards)
        if cand_index < 0 or cand_index >= len(candidates):
            continue
        cand = candidates[cand_index]
        if _v23_candidate_is_explicitly_decorative(cand):
            continue
        useful = item.get("is_useful")
        if useful is not True:
            continue
        reason = normalise_space(item.get("why_relevant") or item.get("argument_supported") or "")
        visible = normalise_space(item.get("what_shows") or clean_source_figure_caption(cand.get("caption", "")))
        if not visible or re.fullmatch(r"(?:image|picture|source figure|visual|figure)", visible, flags=re.I):
            continue
        teaching_intent = normalise_teaching_intent(str(item.get("teaching_intent") or item.get("intent") or ""))
        teaching_goal = normalise_space(item.get("teaching_goal") or item.get("learning_goal") or "")
        card = {
            "index": len(cards),
            "source_index": cand.get("source_index"),
            "source_title": cand.get("source_title", ""),
            "location": cand.get("location", ""),
            "caption": clean_source_figure_caption(cand.get("caption", "")),
            "url": cand.get("url", ""),
            "title": normalise_space(item.get("title") or f"{labels['figure_title']} {len(cards) + 1}"),
            "what_shows": normalise_space(item.get("what_shows") or clean_source_figure_caption(cand.get("caption", ""))),
            "why_relevant": normalise_space(item.get("why_relevant") or reason),
            "argument_supported": normalise_space(item.get("argument_supported") or reason),
            "cross_source_connection": normalise_space(item.get("cross_source_connection") or ""),
            "how_to_read": normalise_space(item.get("how_to_read") or "Read the labels/title first, then identify the relationship, comparison, sequence, or values."),
            "exam_use": normalise_space(item.get("exam_use") or ""),
            "visual_kind": cand.get("visual_kind", ""),
            "teaching_intent": teaching_intent,
            "teaching_goal": teaching_goal,
        }
        cards.append(_v23_enrich_visual_card_details(card, labels))
        if len(cards) >= CONTROLLED_MAX_VISUALS:
            break
    return cards


def _v23_visual_detail_is_generic(value: str) -> bool:
    text = normalise_space(value or "")
    if not text:
        return True
    if len(text) < 18:
        return True
    return bool(re.search(
        r"\b("
        r"direct support|nearby concept|uploaded material|source figure|visual evidence|"
        r"connect this source figure|main concept|other uploaded materials|refer to this source figure|"
        r"read alongside|actual screenshot from the source"
        r")\b",
        text,
        flags=re.I,
    ))


def _v23_visual_detail_fallbacks(card: dict, labels: dict) -> dict:
    kind = normalise_space(card.get("visual_kind") or "")
    caption = clean_source_figure_caption(card.get("caption") or card.get("what_shows") or "")
    title = normalise_space(card.get("title") or labels.get("figure_title") or "Source figure")
    source = normalise_space(card.get("source_title") or "")
    key_text = caption or title
    chinese = any(re.search(r"[\u4e00-\u9fff]", str(labels.get(k, ""))) for k in labels)
    intent = infer_teaching_intent(card)

    if chinese:
        if intent == TEACHING_INTENT_CLARITY:
            base = {
                "what_shows": key_text,
                "why_relevant": f"这张幻灯片/页面需要先讲清楚：学生应先看懂“{title}”里的标签、结构或阅读顺序，再把它连回正文概念。",
                "argument_supported": "它帮助学生把抽象名词变成可见结构：先指出图中各部分，再说明它们如何组成这个概念。",
                "cross_source_connection": "先把图读明白，再用一句话把它接到相邻知识点；不要一开始就跳到结论。",
                "how_to_read": _v23_default_how_to_read(kind, "simplified_chinese"),
                "exam_use": "答题时先准确描述图中可见结构，再解释这个结构对应哪个概念，避免只背定义。",
                "teaching_goal": default_teaching_goal({"title": title, "teaching_intent": intent}, labels),
            }
        else:
            base = {
                "what_shows": key_text,
                "why_relevant": f"这个图表适合做深入分析：它把“{title}”变成可检验的证据，让学生看到变量、步骤、比较或数据关系。",
                "argument_supported": "它支持正文中的论点，因为学生可以从图中直接指出实验条件、数据模式、机制结构或关键对比，而不是只背结论。",
                "cross_source_connection": "把这个图表和相邻知识点一起读：先说图中证据，再解释它如何支持、限制或修正正文中的概念。",
                "how_to_read": _v23_default_how_to_read(kind, "simplified_chinese"),
                "exam_use": "答题时先描述图中可见内容，再解释它证明了什么、不能证明什么，并把它连接到核心概念或研究方法。",
                "teaching_goal": default_teaching_goal({"title": title, "teaching_intent": intent}, labels),
            }
    else:
        if intent == TEACHING_INTENT_CLARITY:
            base = {
                "what_shows": key_text,
                "why_relevant": f"This slide/page needs clarity first: help the student decode {title} by naming the labels, structure, or reading order before connecting it to the concept.",
                "argument_supported": "It turns an abstract label into a visible structure the student can point to, so the nearby notes stay concrete instead of vague.",
                "cross_source_connection": "Decode the figure clearly first, then attach one precise sentence that links it to the nearby concept.",
                "how_to_read": _v23_default_how_to_read(kind, "english"),
                "exam_use": "In an answer, accurately describe the visible structure, then state which concept it maps to before adding interpretation.",
                "teaching_goal": default_teaching_goal({"title": title, "teaching_intent": intent}, labels),
            }
        else:
            base = {
                "what_shows": key_text,
                "why_relevant": f"This figure is best used for deeper analysis: it turns {title} into inspectable source evidence with variables, sequence, comparison, or data relationships.",
                "argument_supported": "It helps the student point to the visible method, pattern, mechanism, or contrast and explain what that evidence can and cannot show.",
                "cross_source_connection": "Read it with the nearby concept: describe the visible evidence first, then explain how it supports, limits, or sharpens the claim in the notes.",
                "how_to_read": _v23_default_how_to_read(kind, "english"),
                "exam_use": "In an answer, describe what is visible, interpret the source evidence, state the limit or implication, and connect it back to the concept.",
                "teaching_goal": default_teaching_goal({"title": title, "teaching_intent": intent}, labels),
            }

    if source and not base["cross_source_connection"].startswith(source):
        base["cross_source_connection"] = f"{source}: {base['cross_source_connection']}"
    return base


def _v23_enrich_visual_card_details(card: dict, labels: dict, preferred_language: str = "auto") -> dict:
    """Ensure every in-text source figure has teachable explanation fields."""
    enriched = dict(card or {})
    enriched["teaching_intent"] = infer_teaching_intent(enriched)
    fallback = _v23_visual_detail_fallbacks(enriched, labels)
    for key in ("caption", "title", "what_shows", "why_relevant", "argument_supported", "cross_source_connection", "how_to_read", "exam_use", "teaching_goal"):
        if key in enriched:
            enriched[key] = clean_source_figure_caption(enriched.get(key, ""))
    for key in ("what_shows", "why_relevant", "argument_supported", "cross_source_connection", "how_to_read", "exam_use", "teaching_goal"):
        if _v23_visual_detail_is_generic(enriched.get(key, "")):
            enriched[key] = fallback.get(key, "")
    if _v23_visual_detail_is_generic(enriched.get("what_shows", "")) and enriched.get("caption"):
        enriched["what_shows"] = clean_source_figure_caption(enriched.get("caption", ""))
    if not normalise_space(enriched.get("teaching_goal") or ""):
        enriched["teaching_goal"] = default_teaching_goal(enriched, labels)
    enriched["teaching_intent_label"] = teaching_intent_label(enriched["teaching_intent"], labels)
    return enriched


def generate_visual_argument_cards(
    source_units: List[dict],
    source_digest_block: str,
    preferred_language: str,
    allow_model: bool = True,
    request_timeout: Optional[float] = None,
) -> List[dict]:
    """Model filters decorative candidates and keeps only separate teaching-image cards."""
    labels = source_figure_labels(preferred_language)
    existing = []
    for unit in source_units or []:
        existing.extend(unit.get("visual_argument_cards") or [])
    if existing:
        return [
            _v23_enrich_visual_card_details(card, labels, preferred_language)
            for card in existing
            if isinstance(card, dict)
        ]

    hard_limit = max(1, min(CONTROLLED_MAX_VISUALS, VISUAL_ARGUMENT_CARD_LIMIT, MAX_MULTI_SOURCE_VISUAL_IMAGES))
    candidate_pool = select_visual_candidates_for_argument(source_units, hard_limit)
    if not candidate_pool:
        return []

    if not allow_model:
        cards = _v23_fallback_visual_cards(candidate_pool, labels, preferred_language)
        if source_units:
            source_units[0]["visual_argument_cards"] = cards
        return cards

    language_rule = language_instruction_for(preferred_language)
    context = truncate_text(source_digest_block or _v22_source_context(source_units), env_int("VISUAL_ARGUMENT_CONTEXT_CHARS", 35000))
    metadata = []
    for idx, cand in enumerate(candidate_pool):
        metadata.append(
            f"Candidate {idx}: Source {cand.get('source_index')} | {cand.get('source_title')} | {cand.get('location')} | "
            f"kind={cand.get('visual_kind')} | score={cand.get('score')} | decorative={cand.get('is_likely_decorative')} | "
            f"caption={cand.get('caption')}"
        )

    prompt = f"""
You are selecting separate source-figure support cards for a professor-style study guide.

Language requirement: {language_rule}
Never translate the product name Synapse.

For every useful slide/page/figure, decide the best teaching intent before writing explanations:
- "clarity": use when the slide/page is dense, labelled, process-like, or easy to misunderstand. Goal = make the visual clearer so the student can decode what the slide/page is showing.
- "deeper_analysis": use when the slide/page contains evidence, results, comparisons, mechanisms, formulas, worked examples, or exam-worthy implications. Goal = use the visual for deeper analysis of what the slide/page is arguing, proving, limiting, or testing.

Choose ONLY source figures that help students understand:
- diagrams, experiment/event sequences, tables, charts, graphs, statistical evidence, formulas, process models, or method/result figures.
- Be sensitive to teaching value: a slide/page does not need to be perfect to be useful. Include it when it contains labelled structure, axes, curves, variables, values, formulas, worked examples, classification boxes, process arrows, method steps, source evidence, or a concrete comparison that the notes can teach from.

Reject images that are mainly:
- cover/title slides, portraits, lecturer photos, logos, stock photos, decorative backgrounds, contact/about-me slides, or generic pictures without teaching value.
- literal photos of a child/person using an object, product photos, phone photos, landscape photos, and generic illustrative photos, even if the surrounding slide text mentions an important concept.
- images that merely decorate a concept. The image itself must contain teachable structure: labels, axes, values, experimental layout, steps, comparison, formula, or a source-data display.

Source context:
{context}

Candidate metadata:
{chr(10).join(metadata)}

Inspect every attached candidate image. Return JSON only:
{{"cards":[{{"visual_index":0,"is_useful":true,"teaching_intent":"clarity|deeper_analysis","teaching_goal":"...","title":"...","why_relevant":"...","what_shows":"...","argument_supported":"...","cross_source_connection":"...","how_to_read":"...","exam_use":"..."}}]}}

Rules:
- Return at most {hard_limit} cards.
- Do not include decorative images.
- Prefer data/charts/diagrams/experiment sequences over photos.
- When uncertain between including and excluding a non-decorative diagram/table/chart/worked example, include it if the notes can explain how to read it.
- If an image is a generic stock/product/person photo, set is_useful=false or omit it.
- If the image does not visibly add information beyond nearby text, set is_useful=false or omit it.
- teaching_intent is required for every useful card and must be exactly "clarity" or "deeper_analysis".
- teaching_goal must be one concrete sentence telling the student what this visual is for (clarity decode vs deeper analysis).
- why_relevant must name the specific concept/data relationship shown; generic phrases such as "supports the nearby concept" are invalid.
- For every useful card, write concrete teaching text in every explanation field, matched to teaching_intent:
  - clarity: emphasise what part of the slide/page to notice, the reading order, and how the visual makes the concept clearer.
  - deeper_analysis: emphasise interpretation, evidence strength/limits, comparisons, mechanisms, and how to use the visual in a strong answer.
  - what_shows: 1-2 sentences naming the visible variables, conditions, labels, sequence, pattern, or values.
  - why_relevant: explain the exact concept/question this figure helps answer, and whether the goal is clarity or deeper analysis.
  - argument_supported: explain how the figure supports, limits, or tests the surrounding argument.
  - cross_source_connection: connect the figure to another idea, source, limitation, or exam theme when possible.
  - how_to_read: give a practical reading method for this specific figure, not a generic label-reading sentence.
  - exam_use: say how a student should use the figure in an answer.
- Do not simply copy OCR text. Interpret the source screenshot as a tutor would.
- Do not use generic phrases like "direct support", "nearby concept", "uploaded materials", or "read the labels/title first" unless followed by specific details from the figure.
- Titles should name the concept shown in the figure, not the page/slide number.
- For PDF/PPT pages, treat the attached image as a source screenshot that can support the notes separately.
- Keep the same order as their educational usefulness, not necessarily candidate order.
- If none are useful, return {{"cards":[]}}.
"""
    content = [{"type": "text", "text": prompt}]
    for idx, cand in enumerate(candidate_pool):
        content.append({"type": "text", "text": f"Candidate image {idx}: Source {cand.get('source_index')} — {cand.get('location')} — {cand.get('visual_kind')}"})
        content.append(image_part_from_url(cand["url"]))

    try:
        raw = generate_chat(
            [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": content}],
            model=model_for_depth("detailed"),
            temperature=0,
            max_tokens=CONTROLLED_VISUAL_CARD_TOKENS,
            request_timeout=request_timeout,
        )
        cards = _v23_parse_relevant_visual_cards(raw, candidate_pool, labels)
    except Exception as error:
        if "_record_ai_call_event" in globals():
            _record_ai_call_event({
                "stage": "visual_cards",
                "provider": active_text_provider() if "active_text_provider" in globals() else AI_TEXT_PROVIDER,
                "model": model_for_depth("detailed") if "model_for_depth" in globals() else CHAT_MODEL,
                "status": "fallback",
                "api_request_attempted": False,
                "error_type": type(error).__name__,
                "error": _sanitize_ai_error(error) if "_sanitize_ai_error" in globals() else str(error),
            })
        cards = []

    if not cards:
        cards = _v23_fallback_visual_cards(candidate_pool, labels, preferred_language)

    if source_units:
        source_units[0]["visual_argument_cards"] = cards
    return cards


def _v23_keywords_for_card(card: dict) -> List[str]:
    text = " ".join(
        str(card.get(key, ""))
        for key in ("title", "what_shows", "argument_supported", "cross_source_connection", "caption", "visual_kind", "location")
    ).lower()
    words = re.findall(r"[A-Za-z][A-Za-z-]{3,}|[\u4e00-\u9fff]{2,}", text)
    stop = {
        "this", "that", "with", "from", "source", "visual", "image", "shows", "supports", "student",
        "concept", "evidence", "uploaded", "material", "direct", "table", "figure", "diagram",
        "这个", "图像", "图片", "来源", "显示", "支持", "概念", "材料", "证据",
    }
    unique = []
    for word in words:
        w = word.lower()
        if w not in stop and w not in unique:
            unique.append(w)
    return unique[:18]


def _v23_location_terms(card: dict) -> List[str]:
    terms: List[str] = []
    location = normalise_space(card.get("location", ""))
    for number in re.findall(r"\b\d+\b", location):
        terms.extend([
            f"slide {number}",
            f"page {number}",
            f"p.{number}",
            f"p. {number}",
            f"p {number}",
            f"第{number}页",
            f"第 {number} 页",
        ])
    return terms


def _v23_remove_visible_slide_refs(text: str) -> str:
    cleaned = re.sub(r"\s*\((?:[^)]*\b(?:slide|slides|page|pages|p\.)\s*\d+[^)]*)\)", "", text, flags=re.I)
    cleaned = re.sub(r"\s*（(?:[^）]*(?:slide|slides|page|pages|p\.|第\s*\d+\s*页)[^）]*)）", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\b(?:as used on the slide|from the slide|on the slide)\b", "", cleaned, flags=re.I)
    return normalise_space(cleaned) if "\n" not in cleaned else cleaned
