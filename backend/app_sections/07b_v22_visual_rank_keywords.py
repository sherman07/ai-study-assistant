

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
