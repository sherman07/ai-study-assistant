

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
        card = {
            "index": len(cards),
            "source_index": cand.get("source_index"),
            "source_title": cand.get("source_title", ""),
            "location": cand.get("location", ""),
            "caption": clean_source_figure_caption(cand.get("caption", "")),
            "url": cand.get("url", ""),
            "title": normalise_space(item.get("title") or f"{labels['figure_title']} {len(cards) + 1}"),
            "what_shows": normalise_space(item.get("what_shows") or clean_source_figure_caption(cand.get("caption", ""))),
            "argument_supported": normalise_space(item.get("argument_supported") or reason),
            "cross_source_connection": normalise_space(item.get("cross_source_connection") or ""),
            "how_to_read": normalise_space(item.get("how_to_read") or "Read the labels/title first, then identify the relationship, comparison, sequence, or values."),
            "exam_use": normalise_space(item.get("exam_use") or ""),
            "visual_kind": cand.get("visual_kind", ""),
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

    if chinese:
        base = {
            "what_shows": key_text,
            "why_relevant": f"这个图表不是装饰图；它把“{title}”这个知识点变成可以观察的证据，让学生能看到变量、步骤、比较或数据关系。",
            "argument_supported": "它支持正文中的论点，因为学生可以从图中直接指出实验条件、数据模式、机制结构或关键对比，而不是只背结论。",
            "cross_source_connection": "把这个图表和相邻知识点一起读：先说图中证据，再解释它如何支持、限制或修正正文中的概念。",
            "how_to_read": _v23_default_how_to_read(kind, "simplified_chinese"),
            "exam_use": "答题时先描述图中可见内容，再解释它证明了什么、不能证明什么，并把它连接到核心概念或研究方法。",
        }
    else:
        base = {
            "what_shows": key_text,
            "why_relevant": f"This is not decoration: it turns the idea of {title} into inspectable source evidence, so the student can see the variables, sequence, comparison, or data relationship.",
            "argument_supported": "It helps the student point to the visible method, pattern, mechanism, or contrast and explain what that evidence can and cannot show.",
            "cross_source_connection": "Read it with the nearby concept: describe the visible evidence first, then explain how it supports, limits, or sharpens the claim in the notes.",
            "how_to_read": _v23_default_how_to_read(kind, "english"),
            "exam_use": "In an answer, describe what is visible, interpret the source evidence, state the limit or implication, and connect it back to the concept.",
        }

    if source and not base["cross_source_connection"].startswith(source):
        base["cross_source_connection"] = f"{source}: {base['cross_source_connection']}"
    return base


def _v23_enrich_visual_card_details(card: dict, labels: dict, preferred_language: str = "auto") -> dict:
    """Ensure every in-text source figure has teachable explanation fields."""
    enriched = dict(card or {})
    fallback = _v23_visual_detail_fallbacks(enriched, labels)
    for key in ("caption", "title", "what_shows", "why_relevant", "argument_supported", "cross_source_connection", "how_to_read", "exam_use"):
        if key in enriched:
            enriched[key] = clean_source_figure_caption(enriched.get(key, ""))
    for key in ("what_shows", "why_relevant", "argument_supported", "cross_source_connection", "how_to_read", "exam_use"):
        if _v23_visual_detail_is_generic(enriched.get(key, "")):
            enriched[key] = fallback.get(key, "")
    if _v23_visual_detail_is_generic(enriched.get("what_shows", "")) and enriched.get("caption"):
        enriched["what_shows"] = clean_source_figure_caption(enriched.get("caption", ""))
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
{{"cards":[{{"visual_index":0,"is_useful":true,"title":"...","why_relevant":"...","what_shows":"...","argument_supported":"...","cross_source_connection":"...","how_to_read":"...","exam_use":"..."}}]}}

Rules:
- Return at most {hard_limit} cards.
- Do not include decorative images.
- Prefer data/charts/diagrams/experiment sequences over photos.
- When uncertain between including and excluding a non-decorative diagram/table/chart/worked example, include it if the notes can explain how to read it.
- If an image is a generic stock/product/person photo, set is_useful=false or omit it.
- If the image does not visibly add information beyond nearby text, set is_useful=false or omit it.
- why_relevant must name the specific concept/data relationship shown; generic phrases such as "supports the nearby concept" are invalid.
- For every useful card, write concrete teaching text in every explanation field:
  - what_shows: 1-2 sentences naming the visible variables, conditions, labels, sequence, pattern, or values.
  - why_relevant: explain the exact concept/question this figure helps answer.
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
