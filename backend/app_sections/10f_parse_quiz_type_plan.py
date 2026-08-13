

@app.post("/visual-image-guide/generate")
async def generate_visual_image_guide(data: dict):
    try:
        data = data or {}
        title = clean_quiz_string(data.get("title"), stored_title or "Study Material")
        context = quiz_summary_context(data)
        if not context:
            return {"error": "No generated notes are available for visual image guide generation yet."}

        requested_language = data.get("preferred_language", "auto")
        preferred_language = (
            resolve_generation_language_key("auto", context)
            if normalise_language_key(requested_language) == "auto"
            else normalise_quiz_language(requested_language)
        )
        source_context = visual_guide_source_context(data)
        figure_context = visual_guide_figure_context(data)
        blueprint = build_visual_image_guide_blueprint(title, context, source_context, figure_context, preferred_language)
        prompt = visual_image_guide_prompt(title, context, source_context, figure_context, preferred_language, blueprint)
        response_title = clean_visual_guide_text(blueprint.get("title") or title)

        if visual_image_use_strict_text_renderer(preferred_language, blueprint):
            return visual_image_local_fallback_response(
                title=title,
                response_title=response_title,
                blueprint=blueprint,
                preferred_language=preferred_language,
                model="synapse-local-image-renderer-strict-text",
                rendering_note="Used strict local renderer for exact Chinese labels; GPT Image 1.5 remains configured for non-CJK visual image guides.",
            )

        if visual_image_use_domain_renderer(preferred_language, blueprint):
            return visual_image_local_fallback_response(
                title=title,
                response_title=response_title,
                blueprint=blueprint,
                preferred_language=preferred_language,
                model="synapse-local-image-renderer-domain",
                rendering_note="Used domain-specific renderer for exact open-economy formulas, curve labels, and policy chains; GPT Image 1.5 remains configured for other visual image guides.",
            )

        if visual_image_use_local_renderer():
            image_b64, image_processing = render_visual_image_guide_local_b64(title, blueprint, preferred_language)
            width, height = parse_visual_image_size(VISUAL_IMAGE_GUIDE_SIZE)
            if image_processing.get("final_size"):
                width, height = image_processing["final_size"][:2]
            return {
                "title": response_title,
                "image_data_url": f"data:image/png;base64,{image_b64}",
                "model": "synapse-local-image-renderer",
                "size": f"{width}x{height}",
                "quality": "readable-text",
                "style_version": VISUAL_IMAGE_GUIDE_STYLE_VERSION,
                "language": normalise_quiz_language(preferred_language),
                "blueprint": blueprint,
                "image_processing": image_processing,
                "created": int(time.time()),
            }

        require_openai_api()
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        if OPENAI_ORG_ID:
            headers["OpenAI-Organization"] = OPENAI_ORG_ID
        if OPENAI_PROJECT_ID:
            headers["OpenAI-Project"] = OPENAI_PROJECT_ID

        payload = {
            "model": VISUAL_IMAGE_GUIDE_MODEL,
            "prompt": prompt,
            "n": 1,
            "size": visual_image_guide_portrait_size(),
            "quality": VISUAL_IMAGE_GUIDE_QUALITY,
            "output_format": "png",
        }
        response = None
        last_warning = ""
        max_retries = max(0, min(2, env_int("VISUAL_IMAGE_GUIDE_RETRIES", 1)))
        for attempt in range(max_retries + 1):
            try:
                response = requests.post(
                    "https://api.openai.com/v1/images/generations",
                    headers=headers,
                    json=payload,
                    timeout=env_int("VISUAL_IMAGE_GUIDE_TIMEOUT_SECONDS", 240),
                )
            except Exception as request_error:
                last_warning = visual_image_error_summary(detail=request_error)
                if attempt < max_retries:
                    continue
                return visual_image_local_fallback_response(
                    title=title,
                    response_title=response_title,
                    blueprint=blueprint,
                    preferred_language=preferred_language,
                    warning=last_warning,
                )
            if response.ok:
                break
            try:
                detail = response.json()
            except Exception:
                detail = response.text
            last_warning = visual_image_error_summary(response.status_code, detail)
            if attempt < max_retries and visual_image_is_transient_status(response.status_code):
                continue
            if visual_image_is_transient_status(response.status_code):
                return visual_image_local_fallback_response(
                    title=title,
                    response_title=response_title,
                    blueprint=blueprint,
                    preferred_language=preferred_language,
                    warning=last_warning,
                )
            return {"error": f"Image generation failed with {last_warning}"}
        if not response.ok:
            try:
                detail = response.json()
            except Exception:
                detail = response.text
            return {"error": f"Image generation failed with {visual_image_error_summary(response.status_code, detail)}"}

        parsed = response.json()
        image_items = parsed.get("data") if isinstance(parsed, dict) else []
        image_b64 = ""
        if isinstance(image_items, list) and image_items:
            image_b64 = str((image_items[0] or {}).get("b64_json") or "").strip()
        if not image_b64:
            return visual_image_local_fallback_response(
                title=title,
                response_title=response_title,
                blueprint=blueprint,
                preferred_language=preferred_language,
                warning="GPT Image response did not include image data.",
            )
        image_b64, image_processing = enhance_visual_image_guide_b64(image_b64)

        return {
            "title": response_title,
            "image_data_url": f"data:image/png;base64,{image_b64}",
            "model": VISUAL_IMAGE_GUIDE_MODEL,
            "size": visual_image_guide_portrait_size(),
            "quality": VISUAL_IMAGE_GUIDE_QUALITY,
            "style_version": VISUAL_IMAGE_GUIDE_STYLE_VERSION,
            "language": normalise_quiz_language(preferred_language),
            "blueprint": blueprint,
            "image_processing": image_processing,
            "created": parsed.get("created"),
        }
    except Exception as error:
        return {"error": str(error)}


def fetch_image_data_url(url: str, max_bytes: int = 320_000) -> str:
    try:
        url = normalize_public_http_url(url, "visual guide image URL")
        data = urlopen_bytes(
            urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Synapse visual guide)"}),
            timeout=12,
            max_bytes=max_bytes + 1,
        )
    except Exception:
        return ""
    if not data or len(data) > max_bytes:
        return ""
    mime = mimetypes.guess_type(urlparse(url).path)[0] or "image/jpeg"
    if mime not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        return ""
    return f"data:{mime};base64,{base64.b64encode(data).decode('ascii')}"


def commons_metadata_value(metadata: dict, key: str) -> str:
    raw = metadata.get(key) if isinstance(metadata, dict) else None
    if isinstance(raw, dict):
        return normalise_space(clean_html(str(raw.get("value") or "")))
    return normalise_space(clean_html(str(raw or "")))


def search_wikimedia_commons_images(query: str, limit: int = 2) -> List[dict]:
    query = normalise_space(query)
    if not query:
        return []
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrnamespace": "6",
        "gsrsearch": query,
        "gsrlimit": str(max(3, limit * 4)),
        "prop": "imageinfo",
        "iiprop": "url|mime|size|extmetadata",
        "iiurlwidth": "520",
    }
    url = WIKIMEDIA_COMMONS_API + "?" + urlencode(params)
    try:
        raw = urlopen_bytes(
            urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Synapse visual guide)"}),
            timeout=12,
            max_bytes=1_800_000,
        )
        payload = json.loads(raw.decode("utf-8", errors="ignore"))
    except Exception:
        return []

    results: List[dict] = []
    pages = (payload.get("query") or {}).get("pages") or {}
    for page in pages.values():
        if not isinstance(page, dict):
            continue
        imageinfo = (page.get("imageinfo") or [{}])[0]
        if not isinstance(imageinfo, dict):
            continue
        mime = imageinfo.get("mime") or ""
        if not str(mime).startswith("image/"):
            continue
        thumb_url = imageinfo.get("thumburl") or imageinfo.get("url") or ""
        if not thumb_url:
            continue
        data_url = fetch_image_data_url(thumb_url)
        if not data_url:
            continue
        title = normalise_space(str(page.get("title") or "")).replace("File:", "")
        metadata = imageinfo.get("extmetadata") or {}
        credit = commons_metadata_value(metadata, "Artist") or commons_metadata_value(metadata, "Credit")
        license_name = commons_metadata_value(metadata, "LicenseShortName") or commons_metadata_value(metadata, "UsageTerms")
        results.append({
            "title": truncate_text(title or query, 90),
            "url": data_url,
            "source_url": imageinfo.get("descriptionurl") or imageinfo.get("url") or thumb_url,
            "provider": "Wikimedia Commons",
            "credit": truncate_text(credit, 120),
            "license": truncate_text(license_name, 80),
            "query": truncate_text(query, 80),
        })
        if len(results) >= limit:
            break
    return results


def collect_visual_guide_web_images(title: str, parsed: dict, panels: List[dict], limit: int = VISUAL_GUIDE_WEB_IMAGE_LIMIT) -> List[dict]:
    if not ENABLE_VISUAL_GUIDE_WEB_IMAGES or limit <= 0:
        return []
    queries = clean_visual_guide_list(parsed.get("image_queries") if isinstance(parsed, dict) else [], 4, 80)
    if not queries:
        queries = [title]
        queries.extend(panel.get("title", "") for panel in panels[:4] if isinstance(panel, dict))
    output: List[dict] = []
    seen_urls = set()
    for query in queries:
        for item in search_wikimedia_commons_images(query, limit=1):
            source_url = item.get("source_url") or item.get("url")
            if not source_url or source_url in seen_urls:
                continue
            seen_urls.add(source_url)
            item["index"] = len(output)
            output.append(item)
            if len(output) >= limit:
                return output
    return output


def clamp_visual_guide_panel_type(value: str) -> str:
    key = normalise_space(str(value or "concept")).lower().replace("-", "_").replace(" ", "_")
    return key if key in VISUAL_GUIDE_PANEL_TYPES else "concept"


def clean_visual_guide_list(value, limit: int = 6, item_limit: int = 180) -> List[str]:
    if isinstance(value, str):
        raw_items = re.split(r"\n+|;\s*", value)
    elif isinstance(value, list):
        raw_items = value
    else:
        raw_items = []
    cleaned = [truncate_text(clean_quiz_rich_text(item), item_limit) for item in raw_items if clean_quiz_rich_text(item)]
    return cleaned[:limit]


VISUAL_GUIDE_HEADING_ONLY_RE = re.compile(
    r"^(?:#{1,4}\s*)?(?:Learning Question|Source and Argument Map|Core Notes|Key Terms(?: and Mechanisms)?|"
    r"Concepts Explained(?: With Source Evidence)?|Reading the Source Evidence|Worked Examples(?: and Evidence)?|"
    r"Source Evidence(?:\s*/\s*Example Matrix)?|Evidence Matrix|Exam Strategy(?: and Common Mistakes)?|Revision Checklist)\s*$",
    flags=re.I,
)


def clean_visual_guide_text(value: str) -> str:
    text = clean_quiz_rich_text(value, "")
    text = re.sub(r"\btotaldeposits\b", "total deposits", text, flags=re.I)
    text = re.sub(r"\bpotential(\d+(?:\.\d+)?\s*[KMBT])\b", r"potential $\1", text, flags=re.I)
    return normalise_space(text)


def is_visual_guide_heading_only(value: str) -> bool:
    return bool(VISUAL_GUIDE_HEADING_ONLY_RE.match(clean_visual_guide_text(value)))


def visual_guide_worked_example_panel(context: str) -> Optional[dict]:
    if not re.search(r"worked example|examples? from source|source exercise|D\s*=|V\s+fell|r\s*=|≈|%", context or "", flags=re.I):
        return None
    lines = [
        clean_visual_guide_text(re.sub(r"^\s*(?:#{1,4}|[-*])\s*", "", line))
        for line in (context or "").splitlines()
    ]
    lines = [
        line for line in lines
        if 18 <= len(line) <= 180 and not is_visual_guide_heading_only(line)
    ]
    example_lines = [
        line for line in lines
        if re.search(r"example|exercise|if\s+[A-Z]|D\s*=|V\s+fell|r\s*=|≈|%|→|\d+\s*[+\-*/]\s*\d+", line, flags=re.I)
    ]
    body = (example_lines or lines or [""])[0]
    if not body:
        return None
    return {
        "id": "vg-panel-worked-example",
        "kicker": "Worked example",
        "title": "Worked Example",
        "body": truncate_text(body, 240),
        "key_points": [truncate_text(item, 90) for item in (example_lines[1:3] if example_lines else lines[1:3])],
        "source_evidence": "Worked/example section in generated notes",
        "visual_type": "case",
        "visual_prompt": "small worked calculation card with givens, operation arrow, and result",
        "formula": "",
        "source_refs": ["Worked Examples and Evidence"],
        "source_figure_indexes": [],
        "web_image_indexes": [],
        "accent": "",
    }


def normalise_visual_guide(parsed: dict, title: str, context: str, sources: List[dict], figures: List[dict], web_images: Optional[List[dict]] = None) -> dict:
    if not isinstance(parsed, dict):
        parsed = {}
    raw_panels = parsed.get("panels") if isinstance(parsed.get("panels"), list) else []
    panels: List[dict] = []
    panel_limit = max(env_int("VISUAL_GUIDE_MAX_PANELS", 6), 7)
    for index, raw in enumerate(raw_panels[:panel_limit]):
        if not isinstance(raw, dict):
            continue
        panel_title = clean_quiz_string(clean_visual_guide_text(raw.get("title")), f"Key idea {index + 1}")
        body = clean_visual_guide_text(raw.get("body") or raw.get("explanation"))
        key_points = [clean_visual_guide_text(item) for item in clean_visual_guide_list(raw.get("key_points") or raw.get("points"), 2, 90)]
        evidence = clean_visual_guide_text(raw.get("source_evidence") or raw.get("evidence"))
        if is_visual_guide_heading_only(evidence):
            evidence = ""
        if not panel_title or not (body or key_points or evidence):
            continue
        figure_indexes = []
        for item in raw.get("source_figure_indexes") or raw.get("figure_indexes") or []:
            try:
                figure_index = int(item)
            except Exception:
                continue
            if 0 <= figure_index < len(figures) and figure_index not in figure_indexes:
                figure_indexes.append(figure_index)
        panels.append({
            "id": clean_quiz_string(raw.get("id"), f"vg-panel-{index + 1}"),
            "kicker": truncate_text(clean_quiz_string(clean_visual_guide_text(raw.get("kicker") or raw.get("label")), f"Part {index + 1}"), 28),
            "title": truncate_text(panel_title, 58),
            "body": truncate_text(body, 240),
            "key_points": key_points,
            "source_evidence": truncate_text(evidence, 160),
            "visual_type": clamp_visual_guide_panel_type(raw.get("visual_type") or raw.get("type")),
            "visual_prompt": truncate_text(clean_visual_guide_text(raw.get("visual_prompt") or raw.get("visual")), 130),
            "formula": truncate_text(clean_visual_guide_text(raw.get("formula")), 140),
            "source_refs": clean_visual_guide_list(raw.get("source_refs") or raw.get("source_references"), 3, 58),
            "source_figure_indexes": figure_indexes,
            "web_image_indexes": [],
            "accent": clean_quiz_string(raw.get("accent"), ""),
        })

    worked_panel = visual_guide_worked_example_panel(context)
    if worked_panel and not any(re.search(r"worked examples?", panel.get("title", ""), flags=re.I) for panel in panels):
        panels.append(worked_panel)

    if figures and panels:
        image_slot_limit = max(0, min(len(figures), env_int("VISUAL_GUIDE_IMAGE_SLOTS", 8)))
        used_figure_indexes = {
            figure_index
            for panel in panels
            for figure_index in panel.get("source_figure_indexes", [])
            if isinstance(figure_index, int)
        }
        unused_figure_indexes = [
            figure_index
            for figure_index in range(min(len(figures), image_slot_limit))
            if figure_index not in used_figure_indexes
        ]
        preferred_visual_types = {"source", "evidence", "case", "comparison", "process", "formula", "concept"}
        for panel in panels:
            if not unused_figure_indexes:
                break
            if panel.get("source_figure_indexes"):
                continue
            if panel.get("visual_type") not in preferred_visual_types:
                continue
            panel["source_figure_indexes"] = [unused_figure_indexes.pop(0)]

    if not panels:
        section_lines = [
            normalise_space(line.lstrip("#-0123456789. "))
            for line in context.splitlines()
            if 34 <= len(normalise_space(line.lstrip("#-0123456789. "))) <= 260
        ][:6]
        for index, line in enumerate(section_lines or [title]):
            panels.append({
                "id": f"vg-panel-{index + 1}",
                "kicker": f"Part {index + 1}",
                "title": truncate_text(line, 90),
            "body": truncate_text(line, 520),
                "key_points": [],
                "source_evidence": "",
                "visual_type": "concept",
                "visual_prompt": "",
                "formula": "",
            "source_refs": [],
            "source_figure_indexes": [],
            "web_image_indexes": [],
            "accent": "",
        })

    web_images = [item for item in (web_images or []) if isinstance(item, dict) and item.get("url")]
    if web_images and panels:
        web_cursor = 0
        for panel in panels:
            if web_cursor >= len(web_images):
                break
            if panel.get("source_figure_indexes"):
                continue
            panel["web_image_indexes"] = [web_cursor]
            web_cursor += 1

    raw_source_map = parsed.get("source_map") if isinstance(parsed.get("source_map"), list) else []
    source_map = []
    for index, raw in enumerate(raw_source_map[:16]):
        if not isinstance(raw, dict):
            continue
        source_map.append({
            "source": truncate_text(clean_quiz_string(raw.get("source"), f"Source {index + 1}"), 120),
            "role": truncate_text(clean_quiz_rich_text(raw.get("role"), ""), 220),
            "evidence": truncate_text(clean_quiz_rich_text(raw.get("evidence"), ""), 260),
        })
    if not source_map and sources:
        for index, source in enumerate(sources[:12], start=1):
            if not isinstance(source, dict):
                continue
            source_map.append({
                "source": truncate_text(clean_quiz_string(source.get("title_candidate") or source.get("display_name"), f"Source {index}"), 120),
                "role": "Provides source material for this visual guide.",
                "evidence": truncate_text(clean_quiz_rich_text(source.get("text_excerpt"), ""), 240),
            })

    return {
        "title": truncate_text(clean_quiz_string(parsed.get("title"), f"{title} Visual Guide"), 120),
        "subtitle": truncate_text(clean_quiz_rich_text(parsed.get("subtitle"), ""), 140),
        "thesis": truncate_text(clean_quiz_rich_text(parsed.get("thesis") or parsed.get("overview"), ""), 220),
        "coverage_note": truncate_text(clean_quiz_rich_text(parsed.get("coverage_note"), ""), 150),
        "panels": panels[:panel_limit],
        "flow": [
            {
                "label": truncate_text(clean_quiz_string(item.get("label"), f"Step {index + 1}"), 58),
                "text": truncate_text(clean_quiz_rich_text(item.get("text") or item.get("explanation"), ""), 180),
            }
            for index, item in enumerate(parsed.get("flow") if isinstance(parsed.get("flow"), list) else [])
            if isinstance(item, dict) and (item.get("label") or item.get("text") or item.get("explanation"))
        ][:4],
        "source_map": source_map,
        "review_prompts": clean_visual_guide_list(parsed.get("review_prompts"), 3, 110),
        "web_images": web_images,
    }
