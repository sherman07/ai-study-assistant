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
