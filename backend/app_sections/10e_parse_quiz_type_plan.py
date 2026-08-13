

def render_visual_image_guide_dense_portrait_b64(title: str, blueprint: dict, preferred_language: str) -> Tuple[str, dict]:
    """Render a source-grounded portrait infographic for general subjects.

    This path intentionally avoids the old side-card "Learning Mechanism" template.
    It uses the blueprint's real panels, formulas, fillers, and spine labels to build
    a dense textbook-style poster with readable text and domain-neutral diagrams.
    """
    from PIL import Image, ImageDraw

    target_width, target_height = parse_visual_image_size(VISUAL_IMAGE_GUIDE_SIZE)
    if target_width > target_height:
        target_width, target_height = target_height, target_width

    base_width, base_height = 1024, 1536
    img = Image.new("RGB", (base_width, base_height), "#edf6fb")
    draw = ImageDraw.Draw(img)
    labels_seen: List[str] = []

    copy = visual_image_generic_copy(preferred_language, blueprint)
    panels = [panel for panel in (blueprint.get("panels") or []) if isinstance(panel, dict)]
    if len(panels) < 7:
        panels = (panels + visual_image_guide_fallback_blueprint(title, "").get("panels", []))[:7]
    panels = panels[:10]

    navy = "#14243e"
    deep = "#213b5c"
    text = "#101a2e"
    muted = "#52677d"
    teal = "#1f7a82"
    green = "#2d7d69"
    orange = "#c96b3e"
    blue = "#2f7ca7"
    purple = "#7b5ba6"
    amber = "#b77a2c"
    panel_border = "#b9d2e7"
    header_fill = "#cae8f6"
    panel_colors = [teal, green, orange, blue, purple, amber, "#557a75", "#9b5b5b", "#6b7d3d", "#3f6c94"]

    def remember(value: str) -> str:
        value = clean_visual_guide_text(value)
        if value and value not in labels_seen:
            labels_seen.append(value)
        return value

    def write(
        xy: Tuple[int, int],
        value: str,
        size: int,
        fill: str = text,
        bold: bool = False,
        max_width: Optional[int] = None,
        max_lines: int = 2,
        line_gap: int = 5,
        track: bool = True,
    ) -> int:
        value = remember(value) if track else clean_visual_guide_text(value)
        font = visual_image_font(size, bold=bold)
        if max_width:
            return visual_image_draw_wrapped(draw, xy, value, font, fill, max_width, max_lines=max_lines, line_gap=line_gap)
        draw.text(xy, value, font=font, fill=fill)
        return xy[1] + visual_image_text_size(draw, value, font)[1]

    def centered(box: Tuple[int, int, int, int], value: str, size: int, fill: str = text, bold: bool = True) -> None:
        value = remember(value)
        font = visual_image_fit_text(draw, value, box[2] - box[0] - 16, size, min_size=12, bold=bold)
        tw, th = visual_image_text_size(draw, value, font)
        draw.text((box[0] + (box[2] - box[0] - tw) / 2, box[1] + (box[3] - box[1] - th) / 2 - 1), value, font=font, fill=fill)

    def arrow(start: Tuple[int, int], end: Tuple[int, int], color: str = teal, width: int = 5) -> None:
        visual_image_draw_arrow(draw, start, end, fill=color, width=width)

    def section(box: Tuple[int, int, int, int], heading: str, accent: str = header_fill) -> None:
        x1, y1, x2, y2 = box
        draw.rounded_rectangle(box, radius=16, fill="#ffffff", outline=panel_border, width=2)
        draw.rounded_rectangle((x1, y1, x2, y1 + 46), radius=16, fill=accent)
        draw.rectangle((x1, y1 + 28, x2, y1 + 46), fill=accent)
        write((x1 + 16, y1 + 10), heading, 25, fill="#071426", bold=True, max_width=x2 - x1 - 32, max_lines=1)

    def panel_title(panel: dict, fallback: str) -> str:
        return truncate_text(clean_visual_guide_text(panel.get("title") or fallback), 42)

    def panel_detail(panel: dict) -> str:
        detail = clean_visual_guide_text(panel.get("detail") or panel.get("visual") or "")
        return truncate_text(detail, 116)

    def draw_icon_cluster(box: Tuple[int, int, int, int], panel: dict, accent: str, index: int) -> None:
        x1, y1, x2, y2 = box
        visual = f"{panel.get('title', '')} {panel.get('visual', '')} {panel.get('detail', '')}"
        visual_image_draw_icon(draw, (x1, y1, x2, y2), visual, accent)
        draw.ellipse((x2 - 28, y1 - 8, x2 + 8, y1 + 28), fill="#ffffff", outline=accent, width=3)
        centered((x2 - 28, y1 - 8, x2 + 8, y1 + 28), str(index + 1), 16, fill=accent)

    def draw_info_panel(box: Tuple[int, int, int, int], panel: dict, index: int, kicker: str = "") -> None:
        x1, y1, x2, y2 = box
        accent = panel_colors[index % len(panel_colors)]
        draw.rounded_rectangle(box, radius=14, fill="#ffffff", outline=panel_border, width=2)
        draw.rounded_rectangle((x1, y1, x2, y1 + 42), radius=14, fill=accent)
        draw.rectangle((x1, y1 + 24, x2, y1 + 42), fill=accent)
        if kicker:
            write((x1 + 14, y1 + 9), kicker, 12, fill="#eaf7ff", bold=True, max_width=136, max_lines=1)
            title_x = x1 + 156
            title_width = x2 - title_x - 12
        else:
            title_x = x1 + 14
            title_width = x2 - x1 - 28
        write((title_x, y1 + 8), panel_title(panel, f"Panel {index + 1}"), 19, fill="#ffffff", bold=True, max_width=title_width, max_lines=1)
        draw_icon_cluster((x1 + 18, y1 + 62, x1 + 116, y1 + 144), panel, accent, index)
        detail = panel_detail(panel)
        write((x1 + 132, y1 + 60), detail, 17, fill=text, max_width=x2 - x1 - 152, max_lines=3)
        labels = [clean_visual_guide_text(item) for item in clean_visual_guide_list(panel.get("labels"), 3, 26)]
        chip_y = y2 - 32
        chip_x = x1 + 132
        for label in labels[:2]:
            chip_w = min(138, visual_image_text_size(draw, label, visual_image_font(13, bold=True))[0] + 22)
            draw.rounded_rectangle((chip_x, chip_y, chip_x + chip_w, chip_y + 22), radius=11, fill="#eef6fb", outline="#d0e1ef")
            centered((chip_x, chip_y, chip_x + chip_w, chip_y + 22), label, 13, fill=muted)
            chip_x += chip_w + 8
            if chip_x > x2 - 82:
                break

    def draw_mini_chart(box: Tuple[int, int, int, int], accent: str, label: str, mode: int) -> None:
        x1, y1, x2, y2 = box
        draw.rounded_rectangle(box, radius=12, fill="#f8fcff", outline="#c5d9ea", width=1)
        if mode % 3 == 0:
            for idx, height in enumerate((34, 56, 44, 72)):
                bx = x1 + 28 + idx * 34
                draw.rounded_rectangle((bx, y2 - 28 - height, bx + 20, y2 - 28), radius=5, fill=accent)
            draw.line((x1 + 18, y2 - 28, x2 - 18, y2 - 28), fill=navy, width=3)
        elif mode % 3 == 1:
            draw.line((x1 + 22, y2 - 32, x2 - 18, y1 + 34), fill=accent, width=5)
            draw.line((x1 + 22, y1 + 48, x2 - 18, y2 - 42), fill="#7f9bb5", width=5)
            draw.line((x1 + 18, y2 - 30, x2 - 14, y2 - 30), fill=navy, width=3)
            draw.line((x1 + 18, y2 - 30, x1 + 18, y1 + 24), fill=navy, width=3)
        else:
            nodes = [(x1 + 30, y1 + 58), ((x1 + x2) // 2, y1 + 34), ((x1 + x2) // 2, y2 - 34), (x2 - 30, y1 + 58)]
            for start in nodes[:3]:
                draw.line((start, nodes[-1]), fill="#8ca7bb", width=3)
            for point in nodes:
                draw.ellipse((point[0] - 10, point[1] - 10, point[0] + 10, point[1] + 10), fill="#ffffff", outline=accent, width=4)
        write((x1 + 14, y1 + 10), label, 14, fill=muted, bold=True, max_width=x2 - x1 - 28, max_lines=1)

    title_text = truncate_text(clean_visual_guide_text(blueprint.get("title") or title), 62)
    subtitle_text = truncate_text(clean_visual_guide_text(blueprint.get("subtitle") or ""), 76)

    # Header.
    draw.rounded_rectangle((28, 24, 996, 126), radius=20, fill=navy)
    centered((56, 38, 968, 82), title_text, 42, fill="#ffffff")
    if subtitle_text:
        centered((88, 84, 936, 114), subtitle_text, 21, fill="#c3ddf2", bold=False)

    # Concept map core.
    section((28, 150, 996, 456), copy["concept_map"], "#c7e6f5")
    labels = visual_image_spine_labels(preferred_language, blueprint)
    labels = labels[:6] if labels else [panel_title(panel, f"Step {idx + 1}") for idx, panel in enumerate(panels[:6])]
    node_y = 218
    node_w = 134
    node_gap = max(12, int((900 - node_w * len(labels)) / max(1, len(labels) - 1)))
    node_x = 62
    centers: List[Tuple[int, int]] = []
    for index, label in enumerate(labels):
        x = node_x + index * (node_w + node_gap)
        color = panel_colors[index % len(panel_colors)]
        draw.rounded_rectangle((x, node_y, x + node_w, node_y + 52), radius=16, fill=color)
        centered((x + 8, node_y + 7, x + node_w - 8, node_y + 45), label, 18, fill="#ffffff")
        centers.append((x + node_w, node_y + 26))
        if index:
            arrow((centers[index - 1][0] + 4, centers[index - 1][1]), (x - 10, node_y + 26), "#456982", 4)

    main_box = (80, 304, 944, 424)
    draw.rounded_rectangle(main_box, radius=20, fill="#f8fcff", outline="#c5d9ea", width=2)
    for index, panel in enumerate(panels[:4]):
        icon_box = (112 + index * 208, 322, 224 + index * 208, 404)
        draw_icon_cluster(icon_box, panel, panel_colors[index % len(panel_colors)], index)
        if index < 3:
            arrow((icon_box[2] + 18, 364), (icon_box[2] + 78, 364), "#456982", 4)
    focus_text = clean_visual_guide_text(blueprint.get("middle_focus") or blueprint.get("central_visual") or "")
    if visual_image_is_generic_panel_text(focus_text):
        if panels:
            chain_titles = [panel_title(panel, f"Step {index + 1}") for index, panel in enumerate(panels[:4])]
            focus_text = " -> ".join(item for item in chain_titles if item) or panel_detail(panels[0])
        else:
            focus_text = title_text
    focus_text = truncate_text(focus_text, 116)
    if focus_text:
        write((106, 430), focus_text, 16, fill=muted, max_width=812, max_lines=1)

    # Main teaching panels.
    draw_info_panel((28, 486, 500, 682), panels[0] if panels else {}, 0, copy["what_to_notice"])
    draw_info_panel((524, 486, 996, 682), panels[1] if len(panels) > 1 else {}, 1, copy["how_it_connects"])

    # Evidence and process band.
    section((28, 714, 996, 1004), f"2. {copy['source_evidence']} / {copy['process']}", "#d7edf1")
    process_panels = panels[2:5] or panels[:3]
    for index, panel in enumerate(process_panels[:3]):
        x = 58 + index * 312
        draw_mini_chart((x, 782, x + 252, 918), panel_colors[(index + 2) % len(panel_colors)], panel_title(panel, f"Evidence {index + 1}"), index)
        write((x, 928), panel_detail(panel), 15, fill=text, max_width=252, max_lines=2)
        if index < 2:
            arrow((x + 262, 850), (x + 296, 850), "#456982", 4)

    formulas = [clean_visual_guide_text(item) for item in (blueprint.get("formula_tiles") or []) if clean_visual_guide_text(item)]
    formula_items = formulas[:3] or [item for item in (blueprint.get("detail_fillers") or [])[:3] if clean_visual_guide_text(item)]
    chip_x = 64
    for index, item in enumerate(formula_items[:4]):
        item = truncate_text(item, 34)
        chip_w = min(222, visual_image_text_size(draw, item, visual_image_font(17, bold=True))[0] + 34)
        draw.rounded_rectangle((chip_x, 968, chip_x + chip_w, 994), radius=13, fill="#ffffff", outline="#cbddea")
        centered((chip_x, 968, chip_x + chip_w, 994), item, 16, fill=panel_colors[index % len(panel_colors)])
        chip_x += chip_w + 16
        if chip_x > 900:
            break

    # Bottom panel grid.
    section((28, 1036, 996, 1450), f"3. {copy['exam_value']} / {copy['revision_check']}", "#cfe8ee")
    bottom_panels = (panels[5:9] or panels[2:6] or panels[:4])[:4]
    card_boxes = [
        (58, 1104, 484, 1250),
        (540, 1104, 966, 1250),
        (58, 1272, 484, 1418),
        (540, 1272, 966, 1418),
    ]
    for index, box in enumerate(card_boxes):
        panel = bottom_panels[index % len(bottom_panels)] if bottom_panels else {}
        draw_info_panel(box, panel, index + 5, copy["study_task"] if index == 3 else "")

    # Footer takeaway strip.
    draw.rounded_rectangle((28, 1470, 996, 1518), radius=18, fill=deep)
    footer_items = [copy["revision_check"], copy["key_terms"], copy["source_evidence"]]
    footer_items.extend([clean_visual_guide_text(item) for item in (blueprint.get("bottom_strip") or [])])
    x = 56
    for item in footer_items[:5]:
        item = truncate_text(item, 28)
        chip_w = min(188, visual_image_text_size(draw, item, visual_image_font(17, bold=True))[0] + 30)
        draw.rounded_rectangle((x, 1482, x + chip_w, 1508), radius=13, fill="#ffffff")
        centered((x, 1482, x + chip_w, 1508), item, 17, fill=deep)
        x += chip_w + 16
        if x > 910:
            break

    if (target_width, target_height) != (base_width, base_height):
        resampling = getattr(Image, "Resampling", None)
        resample = resampling.LANCZOS if resampling else getattr(Image, "LANCZOS", 1)
        img = img.resize((target_width, target_height), resample)

    out = BytesIO()
    img.save(out, format="PNG", optimize=True)
    image_b64 = base64.b64encode(out.getvalue()).decode("ascii")
    return image_b64, {
        "enhanced": False,
        "renderer": "local-pillow",
        "layout": "dense-portrait-grid-v1",
        "final_size": [target_width, target_height],
        "text_rendering": "native-font",
        "visible_labels": labels_seen[:110],
    }


def visual_image_blueprint_domain_text(blueprint: dict) -> str:
    parts = [
        str(blueprint.get("title") or ""),
        str(blueprint.get("subtitle") or ""),
        str(blueprint.get("central_visual") or ""),
        str(blueprint.get("middle_focus") or ""),
        " ".join(str(item) for item in (blueprint.get("detail_fillers") or [])),
        " ".join(str(item) for item in (blueprint.get("formula_tiles") or [])),
    ]
    for panel in blueprint.get("panels") or []:
        if not isinstance(panel, dict):
            continue
        parts.extend([
            str(panel.get("title") or ""),
            str(panel.get("visual") or ""),
            str(panel.get("detail") or ""),
            " ".join(str(item) for item in (panel.get("labels") or [])),
        ])
    return "\n".join(parts)


def visual_image_middle_icon_kinds(blueprint: dict) -> List[str]:
    haystack = visual_image_blueprint_domain_text(blueprint)
    if VISUAL_IMAGE_OPEN_ECONOMY_RE.search(haystack):
        return ["loanable funds graph", "NCO capital flow arrows", "FX exchange rate chart"]
    if VISUAL_IMAGE_PROBABILITY_RE.search(haystack):
        return ["sample space venn", "conditional probability arrow", "formula identity card"]
    if VISUAL_IMAGE_MACHINE_LEARNING_RE.search(haystack):
        return ["data table", "network model", "evaluation chart"]
    if VISUAL_IMAGE_ECONOMICS_RE.search(haystack):
        return ["money market graph", "bank reserves flow", "loanable funds graph"]
    return ["concept map", "process arrows", "evidence chart"]


def visual_image_spine_labels(preferred_language: str, blueprint: dict) -> List[str]:
    haystack = visual_image_blueprint_domain_text(blueprint)
    if visual_image_prefers_chinese(preferred_language, blueprint):
        if VISUAL_IMAGE_OPEN_ECONOMY_RE.search(haystack):
            return ["储蓄", "利率", "NCO", "外汇市场", "汇率", "NX"]
        if VISUAL_IMAGE_PROBABILITY_RE.search(haystack):
            return ["样本空间", "并集", "交集", "条件", "独立", "检验"]
        if VISUAL_IMAGE_MACHINE_LEARNING_RE.search(haystack):
            return ["数据", "特征", "训练", "模型", "预测", "评估"]
        if VISUAL_IMAGE_ECONOMICS_RE.search(haystack):
            return ["市场", "利率", "政策", "产出", "价格", "应用"]
        return ["概念", "证据", "机制", "例子", "限制", "练习"]
    if VISUAL_IMAGE_OPEN_ECONOMY_RE.search(haystack):
        return ["Saving", "Interest", "NCO", "FX Market", "Exchange Rate", "NX"]
    if VISUAL_IMAGE_PROBABILITY_RE.search(haystack):
        return ["Sample Space", "Union", "Intersection", "Conditional", "Independence", "Check"]
    if VISUAL_IMAGE_MACHINE_LEARNING_RE.search(haystack):
        return ["Data", "Features", "Training", "Model", "Prediction", "Evaluation"]
    if VISUAL_IMAGE_ECONOMICS_RE.search(haystack):
        return ["Market", "Rates", "Policy", "Output", "Prices", "Application"]
    return ["Concept", "Evidence", "Mechanism", "Example", "Limit", "Practice"]


def render_visual_image_guide_local_b64(title: str, blueprint: dict, preferred_language: str) -> Tuple[str, dict]:
    if visual_image_is_open_economy_blueprint(blueprint):
        return render_visual_image_guide_open_economy_b64(title, blueprint, preferred_language)
    return render_visual_image_guide_dense_portrait_b64(title, blueprint, preferred_language)


def visual_image_error_summary(status_code: Optional[int] = None, detail: object = None) -> str:
    raw = str(detail or "").strip()
    lowered = raw.lower()
    if "<html" in lowered or "cloudflare" in lowered or "web server is returning an unknown error" in lowered:
        prefix = f"status {status_code}: " if status_code else ""
        return f"{prefix}OpenAI image service returned a transient gateway error."
    text = raw
    text = re.sub(r"(?is)<script\b.*?</script>|<style\b.*?</style>", " ", text)
    text = re.sub(r"(?is)<[^>]+>", " ", text)
    text = normalise_space(text)
    if not text:
        text = "image service did not return a JSON error body"
    prefix = f"status {status_code}: " if status_code else ""
    return truncate_text(f"{prefix}{text}", 180)


def visual_image_is_transient_status(status_code: int) -> bool:
    return status_code in {408, 409, 425, 429} or status_code >= 500


def visual_image_local_fallback_response(
    *,
    title: str,
    response_title: str,
    blueprint: dict,
    preferred_language: str,
    warning: str = "",
    model: str = "synapse-local-image-renderer-fallback",
    rendering_note: str = "",
) -> dict:
    image_b64, image_processing = render_visual_image_guide_local_b64(title, blueprint, preferred_language)
    width, height = parse_visual_image_size(VISUAL_IMAGE_GUIDE_SIZE)
    if image_processing.get("final_size"):
        width, height = image_processing["final_size"][:2]
    result = {
        "title": response_title,
        "image_data_url": f"data:image/png;base64,{image_b64}",
        "model": model,
        "requested_model": VISUAL_IMAGE_GUIDE_MODEL,
        "size": f"{width}x{height}",
        "quality": "readable-text",
        "style_version": VISUAL_IMAGE_GUIDE_STYLE_VERSION,
        "language": normalise_quiz_language(preferred_language),
        "blueprint": blueprint,
        "image_processing": image_processing,
        "created": int(time.time()),
    }
    if warning:
        result["warning"] = f"GPT Image generation failed; returned a local source-grounded fallback. {warning}"
    if rendering_note:
        result["rendering_note"] = rendering_note
    return result


def visual_image_visible_language_rules(preferred_language: str, blueprint: dict) -> str:
    if visual_image_prefers_chinese(preferred_language, blueprint):
        return "\n".join([
            "All visible non-formula text must be Simplified Chinese.",
            "Translate blueprint titles and labels into Simplified Chinese; do not copy English blueprint wording unless it is a formula, variable, or standard acronym.",
            "Do not copy English labels such as Big Picture, Loanable Funds, Net Exports, Common Mistakes, or Exam Chain.",
            "Use only these exact Simplified Chinese visible labels when relevant: 开放经济宏观经济学, 关键概念与公式, 政策案例与储蓄分析, 资金流动与外汇市场, 市场联动模型与政策分析, 可贷资金市场, 净资本流出, 外汇市场, 实际汇率, 净出口, 常见错误, 考试链条, 预算赤字, 储蓄, 利率, 汇率, 进口, 出口.",
            "Use these Chinese label targets when relevant: Open-Economy Macroeconomics = 开放经济宏观经济学; Big Picture = 总览; Loanable Funds = 可贷资金市场; Net Capital Outflow = 净资本流出; FX Market = 外汇市场; Real Exchange Rate = 实际汇率; Net Exports = 净出口; Common Mistakes = 常见错误; Exam Chain = 考试链条; Budget Deficit = 预算赤字; Saving = 储蓄; Interest = 利率; Exchange Rate = 汇率.",
            "Keep formulas and standard variables exactly: S = I + NCO, NX = NCO, NCO, NX, r, e.",
            "Never invent approximate Chinese-looking glyphs. If a Chinese label would be uncertain, omit the label and use an icon, arrow, or numbered badge instead.",
        ])
    return "Use the requested language for visible labels. Keep formulas, variables, and standard acronyms exact."


def visual_image_guide_prompt(title: str, context: str, source_context: str, figure_context: str, preferred_language: str, blueprint: Optional[dict] = None) -> str:
    language_rule = quiz_language_instruction(preferred_language)
    visible_language_rules = visual_image_visible_language_rules(preferred_language, blueprint or {})
    diagram_rules = visual_image_guide_diagram_rules(context)
    domain_guidance = visual_image_guide_domain_guidance(title, context)
    blueprint = blueprint or visual_image_guide_fallback_blueprint(title, context)
    visible_language_rules = visual_image_visible_language_rules(preferred_language, blueprint)
    display_title = clean_visual_guide_text(blueprint.get("title") or title) or title
    blueprint_text = visual_image_blueprint_text(blueprint)
    return f"""
Create one finished educational visual image guide as a high-detail, high-clarity 1024x1536 portrait infographic.

This is NOT an HTML card layout and NOT a wireframe. The output should be one real generated image: a coherent study poster / infographic that visually teaches the source.

Language requirement for any visible text: {language_rule}
Visible label translation rules:
{visible_language_rules}
Topic/title: {display_title}

Use this content blueprint exactly. Do not add unrelated concepts:
{blueprint_text}

Mandatory diagram accuracy rules:
{diagram_rules}

Domain-specific visual rules:
{domain_guidance}

Design goals:
- Make an exam-revision wall chart, not a generic app poster. It should feel like the reference: dense, source-specific, printable, and useful for studying.
- Generate a reference-style educational infographic, not a loose decorative illustration.
- Match the second reference style: a crisp editorial grid infographic with a strong title band, numbered section bands, 8-10 structured panels, clean dividers, icon systems, arrows, mini charts, callouts, and a bottom takeaway strip.
- Include at least one formula/table block, multiple small supply-demand-style graphs when the source is economics, source-grounded case-study or policy-analysis panels, and an explicit revision / exam-chain area when the notes contain exam value.
- Use a modern academic palette: navy headers, pale blue/green panels, dark readable labels, precise black linework, and subtle accent colors for warnings or examples.
- Make it visually detailed through diagrams, icons, chart marks, arrows, small scenes, legends, and comparison blocks, not through paragraphs.
- Do not leave a large empty middle band. The central 45% of the poster must contain the middle_focus mechanism, connecting arrows, two mini charts, and several detail_fillers.
- Fill unused white space with meaningful micro-content: unlabelled icons, legend chips, tiny charts without words, arrows, badges, or comparison insets from detail_fillers.
- Balance density across the canvas: no blank rectangle should be visually larger than one small panel.
- Use only the concepts from the Visible text whitelist in the blueprint. Translate labels according to the Visible label translation rules; keep formulas and standard variables exact. Do not invent other visible words.
- Visible text must be large, horizontal, and spelled correctly. No paragraph text blocks, no tiny text, no labels on small documents/cards/faces/data rows.
- In the central middle_focus area, use iconography and arrows. If a label would be smaller than a panel title, replace it with a numbered badge or an icon.
- Include a clearly labelled worked-example area only if the blueprint contains one, with givens, operation arrow, and result.
- Do not imitate the current website UI. Do not draw browser chrome, buttons, cards from the app, or screenshots.
- Never use the title "Learning Mechanism" unless the source literally uses that phrase. Use source-specific section titles instead.
- Do not use machine-learning labels such as Data, Features, Training, Model, Prediction, or Evaluation unless the source is actually about machine learning.
- Never use placeholder text like "Use the corresponding source concept", "source concept as...", "fill this area", or any generic production instruction as visible text.
- Avoid malformed mathematical notation. Keep equations short, clean, and visually separated.
- Before finalizing, visually audit labels for diagram correctness. If a graph contains both supply and demand, make sure their labels are not duplicated or swapped.
- Absolutely avoid fake filler text, misspelled pseudo-words, unrelated formulas, and generic lorem ipsum. If text would be too small, replace it with icons/arrows.
""".strip()
