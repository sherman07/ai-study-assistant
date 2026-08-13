

def visual_image_best_sentence(value: str, title: str, used_details: Optional[set] = None) -> str:
    used_details = used_details if used_details is not None else set()
    title_terms = visual_image_term_set(title)
    candidates = visual_image_sentence_candidates(value)
    if not candidates:
        return ""

    def score(candidate: str) -> int:
        candidate_terms = visual_image_term_set(candidate)
        value = len(title_terms & candidate_terms) * 4
        if re.search(r"because|therefore|so |means|shows|connect|shift|raises|reduces|leads to|identity|formula", candidate, flags=re.I):
            value += 5
        if VISUAL_IMAGE_OPEN_ECONOMY_RE.search(candidate):
            value += 4
        if re.search(r"example|exam|mistake|trap|assessment", candidate, flags=re.I):
            value += 2
        value += min(4, len(candidate.split()) // 12)
        if candidate.lower() in used_details:
            value -= 20
        return value

    ranked = sorted(candidates, key=score, reverse=True)
    for candidate in ranked:
        if candidate.lower() not in used_details:
            detail = truncate_text(visual_image_compact_panel_detail(candidate), 124)
            used_details.add(detail.lower())
            return detail
    detail = truncate_text(visual_image_compact_panel_detail(ranked[0]), 124)
    used_details.add(detail.lower())
    return detail


def visual_image_panel_detail_for_title(panel_title: str, context: str, index: int = 0, used_details: Optional[set] = None) -> str:
    used_details = used_details if used_details is not None else set()
    sections = visual_image_context_sections(context)
    ranked_sections = sorted(
        enumerate(sections),
        key=lambda item: (visual_image_section_score(panel_title, item[1]), -item[0]),
        reverse=True,
    )
    for _, section in ranked_sections:
        if visual_image_section_score(panel_title, section) <= 0:
            continue
        detail = visual_image_best_sentence(section.get("body") or section.get("title") or "", panel_title, used_details)
        if detail:
            return detail
    if 0 <= index < len(sections):
        detail = visual_image_best_sentence(sections[index].get("body") or "", panel_title, used_details)
        if detail:
            return detail
    detail = visual_image_best_sentence(context, panel_title, used_details)
    if detail:
        return detail
    fallback = f"Show {clean_visual_guide_text(panel_title)} through the notes' concrete terms, relationships, examples, and assessment traps."
    used_details.add(fallback.lower())
    return truncate_text(fallback, 124)


def visual_image_panel_labels_for_detail(panel_title: str, detail: str) -> List[str]:
    haystack = f"{panel_title}\n{detail}"
    labels: List[str] = []

    def add(label: str):
        label = truncate_text(clean_visual_guide_text(label), 32)
        if label and label.lower() not in {item.lower() for item in labels}:
            labels.append(label)

    formula_patterns = [
        r"\bS\s*=\s*I\s*\+\s*NCO\b",
        r"\bNX\s*=\s*NCO\b",
        r"\bMV\s*=\s*PY\b",
        r"\bi\s*≈\s*r\s*\+\s*π\^?e\b",
    ]
    for pattern in formula_patterns:
        match = re.search(pattern, haystack, flags=re.I)
        if match:
            add(match.group(0))
    for term in [
        "loanable funds",
        "real interest rate",
        "net capital outflow",
        "NCO",
        "FX supply",
        "real exchange rate",
        "net exports",
        "trade balance",
        "budget deficit",
        "capital flight",
        "money supply",
        "money demand",
    ]:
        if re.search(rf"\b{re.escape(term)}\b", haystack, flags=re.I):
            add(term)
    if not labels:
        add(panel_title)
    return labels[:4]


def visual_image_panel_visual_for_detail(panel_title: str, detail: str) -> str:
    haystack = f"{panel_title}\n{detail}"
    if VISUAL_IMAGE_OPEN_ECONOMY_RE.search(haystack):
        if re.search(r"mistake|trap|confus|wrong", haystack, flags=re.I):
            return "warning callout beside a corrected open-economy curve-shift chain"
        if re.search(r"loanable|saving|investment|interest", haystack, flags=re.I):
            return "loanable-funds supply-demand graph with real-interest-rate arrow"
        if re.search(r"exchange|foreign|fx|exports?|imports?|trade", haystack, flags=re.I):
            return "foreign-exchange graph linking NCO supply to real exchange rate and NX"
        if re.search(r"S\s*=\s*I\s*\+\s*NCO|NX\s*=\s*NCO|identity", haystack, flags=re.I):
            return "formula balance tile connecting saving, investment, NCO, and NX"
        return "open-economy process arrows from saving to NCO to exchange rate to NX"
    if VISUAL_IMAGE_ECONOMICS_RE.search(haystack):
        return "economics curve shift, formula tile, and worked-example callout"
    if VISUAL_IMAGE_PROBABILITY_RE.search(haystack):
        return "sample-space diagram with event regions and conditional arrow"
    if VISUAL_IMAGE_MACHINE_LEARNING_RE.search(haystack):
        return "data-to-model flow with evaluation chart"
    if re.search(r"mistake|limit|risk|trap", haystack, flags=re.I):
        return "warning callout, corrected arrow, and limitation badge"
    if re.search(r"example|exam|assessment|practice", haystack, flags=re.I):
        return "exam prompt card, answer steps, and scoring checklist"
    return "concept map with source evidence arrow and mini comparison chart"


def visual_image_build_panel(panel_title: str, context: str, index: int, used_details: Optional[set] = None) -> dict:
    detail = visual_image_panel_detail_for_title(panel_title, context, index, used_details)
    visual = visual_image_panel_visual_for_detail(panel_title, detail)
    return {
        "title": truncate_text(clean_visual_guide_text(panel_title), 42),
        "visual": truncate_text(visual, 120),
        "labels": visual_image_panel_labels_for_detail(panel_title, detail),
        "detail": truncate_text(clean_visual_guide_text(detail), 124),
    }


def visual_image_allowed_text_labels(blueprint: dict) -> List[str]:
    labels: List[str] = []

    def add(value: str):
        text = clean_visual_guide_text(value)
        if not text or len(text) > 42:
            return
        if text.lower() in {item.lower() for item in labels}:
            return
        labels.append(text)

    add(blueprint.get("title") or "")
    for panel in blueprint.get("panels") or []:
        if not isinstance(panel, dict):
            continue
        add(panel.get("title") or "")
        for label in clean_visual_guide_list(panel.get("labels"), 2, 30):
            add(label)
    for item in blueprint.get("formula_tiles") or []:
        add(str(item))
    for item in blueprint.get("bottom_strip") or []:
        add(str(item))

    # These common spine labels are stable enough to render as large text.
    for item in visual_image_spine_labels("english", blueprint):
        add(item)

    return labels[:24]


def visual_image_guide_fallback_blueprint(title: str, context: str) -> dict:
    display_title = visual_image_source_topic_title(title, context)
    panel_titles = visual_image_fallback_panel_titles(title, context)
    formulas = []
    formula_patterns = [
        r"\bS\s*=\s*I\s*\+\s*NCO\b",
        r"\bNX\s*=\s*NCO\b",
        r"\bMV\s*=\s*PY\b",
        r"\bi\s*≈\s*r\s*\+\s*π\^?e\b",
        r"\bP\([^)]+\)\s*=\s*[^.\n;]+",
        r"\b\d+(?:\.\d+)?\s*[%]\s*[+\-]\s*\d+(?:\.\d+)?\s*[%]\s*=\s*\d+(?:\.\d+)?\s*[%]",
    ]
    for pattern in formula_patterns:
        for match in re.finditer(pattern, context or "", flags=re.I):
            formulas.append(truncate_text(clean_visual_guide_text(match.group(0)), 42))
            if len(formulas) >= 4:
                break
        if len(formulas) >= 4:
            break
    used_details: set = set()
    blueprint = {
        "title": truncate_text(clean_visual_guide_text(display_title), 62),
        "subtitle": "A modern source-grounded overview",
        "central_visual": visual_image_panel_visual_for_detail(display_title, visual_image_middle_focus(title, context)),
        "middle_focus": visual_image_middle_focus(title, context),
        "panels": [visual_image_build_panel(item, context, index, used_details) for index, item in enumerate(panel_titles[:10])],
        "formula_tiles": formulas[:4],
        "mini_charts": ["comparison bars", "process arrow", "evidence callout"],
        "detail_fillers": visual_image_detail_fillers(title, context),
        "allowed_text_labels": [],
        "worked_example": "",
        "bottom_strip": ["Key terms", "Evidence", "Revision prompts"],
    }
    blueprint["allowed_text_labels"] = visual_image_allowed_text_labels(blueprint)
    return blueprint


def normalise_visual_image_blueprint(parsed: dict, title: str, context: str) -> dict:
    fallback = visual_image_guide_fallback_blueprint(title, context)
    if not isinstance(parsed, dict):
        parsed = {}

    raw_panels = parsed.get("panels") if isinstance(parsed.get("panels"), list) else []
    panels = []
    used_details: set = set()
    fallback_panels = fallback.get("panels") or []
    for index, raw in enumerate(raw_panels[:10]):
        if not isinstance(raw, dict):
            continue
        fallback_panel = fallback_panels[min(index, len(fallback_panels) - 1)] if fallback_panels else {}
        panel_title = truncate_text(clean_visual_guide_text(raw.get("title") or fallback_panel.get("title")), 42)
        visual = truncate_text(clean_visual_guide_text(raw.get("visual") or raw.get("visual_prompt")), 120)
        detail = truncate_text(clean_visual_guide_text(raw.get("detail") or raw.get("teaching_point")), 110)
        labels = clean_visual_guide_list(raw.get("labels"), 4, 32)
        labels = [clean_visual_guide_text(item) for item in labels if clean_visual_guide_text(item)]
        if visual_image_is_generic_panel_text(detail):
            detail = visual_image_panel_detail_for_title(panel_title, context, index, used_details)
        else:
            used_details.add(detail.lower())
        if visual_image_is_generic_panel_text(visual):
            visual = visual_image_panel_visual_for_detail(panel_title, detail)
        if not labels:
            labels = visual_image_panel_labels_for_detail(panel_title, detail)
        if panel_title and panel_title not in labels:
            labels.insert(0, panel_title)
        labels = labels[:4]
        if not panel_title:
            continue
        panels.append({
            "title": panel_title,
            "visual": visual or fallback_panel.get("visual") or visual_image_panel_visual_for_detail(panel_title, detail),
            "labels": labels,
            "detail": detail,
        })

    if len(panels) < 6:
        used = {panel["title"].lower() for panel in panels}
        for fallback_panel in fallback["panels"]:
            if fallback_panel["title"].lower() in used:
                continue
            panels.append(fallback_panel)
            if len(panels) >= 7:
                break

    formula_tiles = [
        truncate_text(clean_visual_guide_text(item), 46)
        for item in clean_visual_guide_list(parsed.get("formula_tiles") or parsed.get("formulas"), 4, 48)
    ] or fallback["formula_tiles"]
    central_visual = truncate_text(clean_visual_guide_text(parsed.get("central_visual") or parsed.get("centralVisual")), 140)
    if visual_image_is_generic_panel_text(central_visual):
        central_visual = fallback["central_visual"]
    middle_focus = truncate_text(clean_visual_guide_text(parsed.get("middle_focus") or parsed.get("middleFocus")), 180)
    if visual_image_is_generic_panel_text(middle_focus):
        middle_focus = fallback["middle_focus"]

    normalised = {
        "title": truncate_text(
            clean_visual_guide_text(parsed.get("title"))
            if parsed.get("title") and not visual_image_is_generic_title(str(parsed.get("title")))
            else fallback["title"],
            62,
        ),
        "subtitle": truncate_text(clean_visual_guide_text(parsed.get("subtitle") or fallback["subtitle"]), 70),
        "central_visual": central_visual,
        "middle_focus": middle_focus,
        "panels": panels[:10],
        "formula_tiles": formula_tiles[:4],
        "mini_charts": [
            truncate_text(clean_visual_guide_text(item), 44)
            for item in clean_visual_guide_list(parsed.get("mini_charts") or parsed.get("charts"), 4, 46)
        ] or fallback["mini_charts"],
        "detail_fillers": [
            truncate_text(clean_visual_guide_text(item), 34)
            for item in clean_visual_guide_list(parsed.get("detail_fillers") or parsed.get("fillers") or parsed.get("micro_details"), 10, 36)
        ] or fallback["detail_fillers"],
        "worked_example": truncate_text(clean_visual_guide_text(parsed.get("worked_example") or parsed.get("example")), 120),
        "bottom_strip": [
            truncate_text(clean_visual_guide_text(item), 38)
            for item in clean_visual_guide_list(parsed.get("bottom_strip") or parsed.get("footer"), 4, 42)
        ] or fallback["bottom_strip"],
    }
    normalised["allowed_text_labels"] = visual_image_allowed_text_labels(normalised)
    return normalised


def build_visual_image_guide_blueprint(title: str, context: str, source_context: str, figure_context: str, preferred_language: str) -> dict:
    if os.getenv("VISUAL_IMAGE_GUIDE_BLUEPRINT", "true").lower() in {"0", "false", "no"}:
        fallback = visual_image_guide_fallback_blueprint(title, context)
        fallback["allowed_text_labels"] = visual_image_allowed_text_labels(fallback)
        return fallback

    language_rule = quiz_language_instruction(preferred_language)
    domain_guidance = visual_image_guide_domain_guidance(title, context)
    schema = """
Return JSON only:
{
  "title": "short poster title",
  "subtitle": "short subtitle",
  "central_visual": "one sentence describing the central visual metaphor or flow",
  "middle_focus": "specific content that must fill the central blank-prone area",
  "panels": [
    {
      "title": "1-4 word panel title",
      "visual": "specific drawing idea: diagram, icon group, chart, map, process arrow, or callout",
      "labels": ["short visible label", "short visible label"],
      "detail": "what this panel teaches"
    }
  ],
  "formula_tiles": ["short exact formula if needed"],
  "mini_charts": ["small chart or graph to include"],
  "detail_fillers": ["tiny visual detail to place in leftover space"],
  "worked_example": "one short worked-example visual if present",
  "bottom_strip": ["short footer label"]
}
"""
    prompt = f"""
Create a concise content blueprint for a generated educational infographic image.
This is NOT the final image prompt. It is the safe source-grounded content plan used by an image model.

Language requirement for visible labels: {language_rule}
Topic/title: {title}

Domain rules:
{domain_guidance}

Blueprint rules:
- Use only facts, concepts, formulas, examples, and relationships from the notes/source.
- Design for a professional dense grid infographic like a textbook "modern overview" poster.
- Choose 8-10 panels. Each panel needs a concrete visual, not just text.
- Add a middle_focus item that explicitly fills the central area between major panels.
- Add 6-10 detail_fillers that can be used as visual-only icons, mini charts, badges, arrows, or callouts in leftover space.
- Visible labels must be short and spellable: usually 1-4 words, never paragraph sentences.
- Keep total visible text under about 120 words. Prefer icons, arrows, charts, and diagrams for detail.
- Include a worked-example visual if the notes contain calculations, examples, source exercises, or model answers.
- Include exact formulas only when central; do not invent formulas from another subject.
- Never include pseudo-text, filler text, browser UI, app buttons, or unrelated domain examples.
{schema}

Generated notes:
{truncate_text(context, 9000)}

Source metadata/excerpts:
{truncate_text(source_context or "No separate source metadata supplied.", 2200)}

Available source figures:
{truncate_text(figure_context or "No source figures supplied.", 1800)}
"""
    try:
        raw = generate_chat(
            [
                {"role": "system", "content": "You create concise infographic blueprints as strict JSON. Do not include markdown fences or prose outside JSON."},
                {"role": "user", "content": prompt},
            ],
            model=model_for_depth("standard"),
            temperature=float(os.getenv("VISUAL_IMAGE_GUIDE_BLUEPRINT_TEMPERATURE", "0.18")),
            max_tokens=env_int("VISUAL_IMAGE_GUIDE_BLUEPRINT_TOKENS", 3200),
        )
        parsed = extract_json_object(raw)
        return normalise_visual_image_blueprint(parsed or {}, title, context)
    except Exception:
        fallback = visual_image_guide_fallback_blueprint(title, context)
        fallback["allowed_text_labels"] = visual_image_allowed_text_labels(fallback)
        return fallback


def visual_image_blueprint_text(blueprint: dict) -> str:
    panels = blueprint.get("panels") if isinstance(blueprint.get("panels"), list) else []
    panel_lines = []
    for index, panel in enumerate(panels[:10], start=1):
        if not isinstance(panel, dict):
            continue
        labels = ", ".join(clean_visual_guide_list(panel.get("labels"), 4, 32))
        label_text = f" Labels: {labels}." if labels else ""
        detail = panel.get("detail") or ""
        detail_text = f" Teaches: {detail}." if detail else ""
        panel_lines.append(f"{index}. {panel.get('title')}: {panel.get('visual')}.{label_text}{detail_text}")
    formulas = "; ".join(blueprint.get("formula_tiles") or [])
    charts = "; ".join(blueprint.get("mini_charts") or [])
    footer = "; ".join(blueprint.get("bottom_strip") or [])
    allowed_labels = "; ".join(blueprint.get("allowed_text_labels") or visual_image_allowed_text_labels(blueprint))
    return "\n".join([
        f"Title: {blueprint.get('title')}",
        f"Subtitle: {blueprint.get('subtitle')}",
        f"Central visual: {blueprint.get('central_visual')}",
        f"Middle focus: {blueprint.get('middle_focus')}",
        "Panels:",
        *panel_lines,
        f"Formula tiles: {formulas or 'none'}",
        f"Mini charts: {charts or 'source-specific small diagrams'}",
        f"Detail fillers: {'; '.join(blueprint.get('detail_fillers') or []) or 'small source-specific icons and callouts'}",
        f"Worked example: {blueprint.get('worked_example') or 'include only if clearly present'}",
        f"Bottom strip: {footer or 'key takeaway labels'}",
        f"Visible text whitelist (copy exactly or omit): {allowed_labels or 'title and large panel labels only'}",
    ]).strip()


def enhance_visual_image_guide_b64(image_b64: str) -> Tuple[str, dict]:
    if os.getenv("VISUAL_IMAGE_GUIDE_ENHANCE_LOCAL", "true").lower() in {"0", "false", "no"}:
        return image_b64, {"enhanced": False, "reason": "disabled"}
    try:
        from PIL import Image, ImageEnhance, ImageFilter

        raw = base64.b64decode(image_b64)
        img = Image.open(BytesIO(raw)).convert("RGB")
        original_size = img.size
        scale_percent = max(100, min(220, env_int("VISUAL_IMAGE_GUIDE_UPSCALE_PERCENT", 100)))
        max_pixels = max(1_800_000, env_int("VISUAL_IMAGE_GUIDE_MAX_ENHANCED_PIXELS", 5_200_000))
        scale = scale_percent / 100
        target_pixels = int(original_size[0] * scale) * int(original_size[1] * scale)
        if target_pixels > max_pixels:
            scale = (max_pixels / max(1, original_size[0] * original_size[1])) ** 0.5
        if scale > 1.01:
            resampling = getattr(Image, "Resampling", None)
            resample = resampling.LANCZOS if resampling else getattr(Image, "LANCZOS", 1)
            target_size = (max(1, int(original_size[0] * scale)), max(1, int(original_size[1] * scale)))
            img = img.resize(target_size, resample)

        img = ImageEnhance.Contrast(img).enhance(float(os.getenv("VISUAL_IMAGE_GUIDE_CONTRAST", "1.04")))
        img = ImageEnhance.Sharpness(img).enhance(float(os.getenv("VISUAL_IMAGE_GUIDE_SHARPNESS", "1.14")))
        img = img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=85, threshold=3))

        out = BytesIO()
        img.save(out, format="PNG", optimize=True)
        enhanced = base64.b64encode(out.getvalue()).decode("ascii")
        return enhanced, {
            "enhanced": True,
            "original_size": list(original_size),
            "final_size": list(img.size),
            "upscale_percent": int(round((img.size[0] / max(1, original_size[0])) * 100)),
        }
    except Exception as error:
        return image_b64, {"enhanced": False, "error": truncate_text(str(error), 180)}


def visual_image_renderer_mode() -> str:
    return (os.getenv("VISUAL_IMAGE_GUIDE_RENDERER") or "openai").strip().lower()


def visual_image_use_local_renderer() -> bool:
    return visual_image_renderer_mode() not in {"gpt", "openai", "image-api", "image_api"}


def visual_image_use_strict_text_renderer(preferred_language: str, blueprint: dict) -> bool:
    strict_enabled = os.getenv("VISUAL_IMAGE_GUIDE_STRICT_CJK_LOCAL", "true").lower() not in {"0", "false", "no"}
    return strict_enabled and visual_image_prefers_chinese(preferred_language, blueprint)


def visual_image_use_domain_renderer(preferred_language: str, blueprint: dict) -> bool:
    domain_value = os.getenv("VISUAL_IMAGE_GUIDE_DOMAIN_LOCAL", "false").strip().lower()
    domain_enabled = domain_value not in {"", "0", "false", "no"}
    return domain_enabled and visual_image_is_open_economy_blueprint(blueprint)


def parse_visual_image_size(size: str) -> Tuple[int, int]:
    match = re.match(r"^\s*(\d{3,4})\s*x\s*(\d{3,4})\s*$", str(size or ""), flags=re.I)
    if not match:
        return 1536, 1024
    width = max(900, min(2400, int(match.group(1))))
    height = max(600, min(1800, int(match.group(2))))
    return width, height


def visual_image_guide_portrait_size() -> str:
    width, height = parse_visual_image_size(VISUAL_IMAGE_GUIDE_SIZE)
    if width > height:
        width, height = height, width
    return f"{width}x{height}"


def visual_image_contains_cjk(text: str) -> bool:
    return bool(re.search(r"[\u3400-\u9fff]", str(text or "")))
