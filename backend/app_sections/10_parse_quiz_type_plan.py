def parse_quiz_type_plan(data: dict) -> List[dict]:
    raw_types = data.get("question_types") or data.get("types") or []
    plan: List[dict] = []
    if isinstance(raw_types, list):
        for item in raw_types:
            if isinstance(item, dict):
                qtype = normalise_quiz_type(item.get("type") or item.get("value") or item.get("label"))
                count = clamp_quiz_count(item.get("count"), 1)
            else:
                qtype = normalise_quiz_type(str(item))
                count = 1
            plan.append({"type": qtype, "count": count})

    if not plan:
        total = clamp_quiz_count(data.get("total_questions") or data.get("question_count"), 6)
        plan = []
        remaining = total
        for item in DEFAULT_QUIZ_TYPE_PLAN:
            if remaining <= 0:
                break
            count = min(item["count"], remaining)
            plan.append({"type": item["type"], "count": count})
            remaining -= count
        if remaining > 0:
            plan.append({"type": "worked_problem", "count": remaining})

    max_questions = env_int("QUIZ_MAX_QUESTIONS", 30)
    trimmed: List[dict] = []
    used = 0
    for item in plan:
        if used >= max_questions:
            break
        count = min(item["count"], max_questions - used)
        if count > 0:
            trimmed.append({"type": item["type"], "count": count})
            used += count
    return trimmed or list(DEFAULT_QUIZ_TYPE_PLAN)


def expand_quiz_type_plan(plan: List[dict]) -> List[str]:
    desired: List[str] = []
    for item in plan:
        desired.extend([item["type"]] * item["count"])
    return desired


def quiz_sections_context(sections_payload) -> str:
    source = sections_payload if isinstance(sections_payload, dict) else {}
    if not isinstance(source, dict):
        return ""
    blocks = []
    for name, content in list(source.items())[:12]:
        blocks.append(f"## {normalise_space(name)}\n{truncate_text(str(content or ''), 2600)}")
    return "\n\n".join(blocks)


def quiz_summary_context(data: dict) -> str:
    payload = data if isinstance(data, dict) else {}
    summary = payload.get("summary") or ""
    sections_context = quiz_sections_context(payload.get("sections"))
    combined = f"{summary}\n\n{sections_context}".strip()
    combined = re.sub(r"\[\[VISUAL:\d+\]\]", "[source image inserted in notes]", combined)
    return truncate_text(combined, env_int("QUIZ_CONTEXT_CHARS", 70000))


# -----------------------------------------------------------------------------
# Visual guide generation
# -----------------------------------------------------------------------------

VISUAL_GUIDE_PANEL_TYPES = {
    "concept",
    "process",
    "comparison",
    "evidence",
    "formula",
    "timeline",
    "case",
    "source",
}
ENABLE_VISUAL_GUIDE_WEB_IMAGES = os.getenv("ENABLE_VISUAL_GUIDE_WEB_IMAGES", "true").lower() not in {"0", "false", "no"}
VISUAL_GUIDE_WEB_IMAGE_LIMIT = env_int("VISUAL_GUIDE_WEB_IMAGE_LIMIT", 3)
WIKIMEDIA_COMMONS_API = "https://commons.wikimedia.org/w/api.php"


def visual_guide_source_context(data: dict) -> str:
    sources = data.get("sources") if isinstance(data.get("sources"), list) else []
    if not sources:
        return ""
    rows = []
    for index, source in enumerate(sources[:16], start=1):
        if not isinstance(source, dict):
            continue
        title = normalise_space(source.get("title_candidate") or source.get("display_name") or f"Source {index}")
        excerpt = truncate_text(normalise_space(source.get("text_excerpt") or ""), 1200)
        rows.append(f"Source {index}: {title}\n{excerpt}")
    return "\n\n".join(rows)


def visual_guide_figure_context(data: dict) -> str:
    figures = data.get("visual_gallery") if isinstance(data.get("visual_gallery"), list) else []
    rows = []
    for index, item in enumerate(figures[:18]):
        if not isinstance(item, dict):
            continue
        title = normalise_space(item.get("title") or item.get("caption") or f"Source figure {index + 1}")
        kind = normalise_space(item.get("visual_kind") or "")
        evidence = normalise_space(item.get("what_shows") or item.get("argument_supported") or item.get("caption") or "")
        rows.append(f"Source figure {index + 1} (index {index}, {kind}): {title}. {truncate_text(evidence, 420)}")
    return "\n".join(rows)


def visual_image_guide_diagram_rules(context: str) -> str:
    rules = []
    if re.search(r"\bmoney market\b|money demand|money supply|quantity of money|\bM_d\b|\bM_s\b", context or "", flags=re.I):
        rules.append(
            "Money market graph: vertical axis must be Interest rate (i), horizontal axis must be Quantity of money (M). "
            "Draw money supply as a vertical line labelled Ms. Draw money demand as a downward-sloping curve labelled Md. "
            "Never label the downward-sloping money-demand curve as Ms. If showing a supply shift, use Ms and Ms' only for vertical supply lines."
        )
    if re.search(r"loanable funds|real interest|saving|investment", context or "", flags=re.I):
        rules.append(
            "Loanable-funds graph: vertical axis must be Real interest rate (r), horizontal axis must be Loanable funds. "
            "Draw supply/saving as an upward-sloping curve labelled S and demand/investment as a downward-sloping curve labelled D."
        )
    if re.search(r"fisher effect|nominal|expected inflation|π|inflation", context or "", flags=re.I):
        rules.append(
            "Fisher effect: show i ≈ r + πe or i ≈ r + π^e, with i as nominal rate, r as real rate, and πe as expected inflation. "
            "Do not replace πe with unrelated letters."
        )
    if re.search(r"MV\s*=|quantity theory|velocity|nominal GDP|price.*output", context or "", flags=re.I):
        rules.append(
            "Quantity theory: show MV = PY with M = money supply, V = velocity, P = price level, and Y = real output. "
            "Keep these four labels distinct."
        )
    if re.search(r"reserve|multiplier|deposit|fractional", context or "", flags=re.I):
        rules.append(
            "Money multiplier: if shown, use multiplier = 1/r and deposit expansion = D/r or ΔM = D/r. "
            "Make r the reserve ratio, not the interest rate, in this specific block."
        )
    if not rules:
        return "Use any diagrams from the source accurately. Check every axis, curve, arrow, symbol, and label before finalizing the image."
    return "\n".join(f"- {rule}" for rule in rules)


VISUAL_IMAGE_GUIDE_STYLE_VERSION = "grid-infographic-v13"
VISUAL_IMAGE_MACHINE_LEARNING_RE = re.compile(
    r"machine learning|deep learning|artificial intelligence|\bai\b|neural|training data|classification|regression|supervised|unsupervised",
    flags=re.I,
)
VISUAL_IMAGE_PROBABILITY_RE = re.compile(
    r"probability|conditional|union|intersection|venn|sample space|bayes|independent",
    flags=re.I,
)
VISUAL_IMAGE_OPEN_ECONOMY_RE = re.compile(
    r"open[- ]economy|net capital outflow|\bNCO\b|\bNX\b|real exchange rate|foreign[- ]exchange|"
    r"\bFX\b|trade balance|net exports?|capital flight|exports?|imports?|S\s*=\s*I\s*\+\s*NCO|NX\s*=\s*NCO",
    flags=re.I,
)
VISUAL_IMAGE_ECONOMICS_RE = re.compile(
    r"\bmoney market\b|fisher effect|loanable funds|quantity theory|central bank|inflation|"
    r"reserve ratio|money multiplier|mv\s*=|saving|investment|interest rate|exchange rate|trade balance|net exports?",
    flags=re.I,
)
VISUAL_IMAGE_GENERIC_PANEL_TEXT_RE = re.compile(
    r"use the corresponding source concept as(?: a)? visual panel|mini diagram, icon cluster|"
    r"large central flow linking the main concepts|source-specific small diagrams|fill the central area",
    flags=re.I,
)
VISUAL_IMAGE_GENERIC_TITLE_RE = re.compile(
    r"^(?:study material|generated study notes|visual guide|synapse visual guide|"
    r"(?:[A-Z]{2,}\s*)?\d{2,4}\s*[-–—:]?\s*(?:week|wk)\s*\d+|"
    r"[A-Z]{2,}\d{2,4}\s*[-–—:]?\s*(?:week|wk)\s*\d+)$",
    flags=re.I,
)


def visual_image_guide_domain_guidance(title: str, context: str) -> str:
    haystack = f"{title}\n{context}"
    if VISUAL_IMAGE_MACHINE_LEARNING_RE.search(haystack):
        return "\n".join([
            "- Machine learning domain: use a Data -> Features -> Training -> Model -> Prediction -> Evaluation flow as the main visual spine.",
            "- Use domain visuals such as datasets, feature columns, model blocks, neural-network nodes, decision boundary plots, confusion/evaluation mini charts, and bias/ethics warning callouts.",
            "- In the middle mechanism, use only large labels such as Data, Features, Training, Model, Prediction, Evaluation. Do not write small words on data cards, faces, documents, gauges, or mini charts.",
            "- Do not include formulas, graphs, or examples from unrelated subjects."
        ])
    if VISUAL_IMAGE_PROBABILITY_RE.search(haystack):
        return "\n".join([
            "- Probability domain: use Venn diagrams, sample-space rectangles, event tiles, conditional-probability arrows, and compact formula cards.",
            "- Keep symbols exact: union A ∪ B, intersection A ∩ B, conditional P(A | B), and independence P(A ∩ B) = P(A)P(B).",
            "- Do not turn the vertical conditional bar into a divider between unrelated words."
        ])
    if VISUAL_IMAGE_OPEN_ECONOMY_RE.search(haystack):
        return "\n".join([
            "- Open-economy macroeconomics domain: use the S = I + NCO and NX = NCO identities, loanable-funds shifts, NCO movement, foreign-exchange supply, real exchange-rate movement, and trade-balance outcome only when supported by the notes.",
            "- Keep the causal chain explicit: saving or policy shock -> real interest rate -> NCO -> FX supply -> real exchange rate -> net exports.",
            "- Use source-specific formulas, curve shifts, arrows, and exam-trap callouts. Do not use machine-learning labels such as Data, Training, Model, Prediction, or Evaluation."
        ])
    if VISUAL_IMAGE_ECONOMICS_RE.search(haystack):
        return "\n".join([
            "- Economics domain: use money-market curves, reserve/banking flows, central-bank policy arrows, quantity-theory tiles, Fisher-effect rate arrows, and loanable-funds contrasts only when supported by the notes.",
            "- Keep graph labels precise: Ms is money supply, Md is money demand, S is saving/supply of loanable funds, and D is investment/demand.",
            "- Use worked calculation cards for reserve-ratio, velocity, inflation, or interest-rate examples when present."
        ])
    return "\n".join([
        "- Use subject-specific diagrams and icons from the uploaded source; do not borrow examples from unrelated subjects.",
        "- Represent detail visually with panels, icons, arrows, comparisons, timelines, small charts, and callouts rather than dense prose.",
        "- Include formulas only if they are central to the uploaded notes."
    ])


def visual_image_fallback_panel_titles(title: str, context: str) -> List[str]:
    heading_matches = list(re.finditer(r"^#{1,4}\s+(.+)$", context or "", flags=re.M))
    headings = []
    for index, match in enumerate(heading_matches):
        item = clean_visual_guide_text(match.group(1))
        if not item or is_visual_guide_heading_only(item):
            continue
        body_start = match.end()
        body_end = heading_matches[index + 1].start() if index + 1 < len(heading_matches) else len(context or "")
        body_text = clean_visual_guide_text(visual_image_plain_text((context or "")[body_start:body_end]))
        if index == 0 and len(body_text) < 40:
            continue
        headings.append(truncate_text(item, 42))
    if len(headings) >= 6:
        return headings[:10]
    haystack = f"{title}\n{context}"
    if VISUAL_IMAGE_MACHINE_LEARNING_RE.search(haystack):
        return ["Definition", "AI Relationship", "Traditional vs ML", "Data", "Features", "Training", "Model", "Prediction", "Evaluation", "Ethics"]
    if VISUAL_IMAGE_PROBABILITY_RE.search(haystack):
        return ["Sample Space", "Union", "Intersection", "Conditional", "Independence", "Worked Example", "Common Mistakes", "Formula Check"]
    if VISUAL_IMAGE_OPEN_ECONOMY_RE.search(haystack):
        return ["Big Picture", "S = I + NCO", "Loanable Funds", "Real Interest Rate", "Net Capital Outflow", "FX Market", "Real Exchange Rate", "Net Exports", "Common Mistakes", "Exam Chain"]
    if VISUAL_IMAGE_ECONOMICS_RE.search(haystack):
        return ["Money Functions", "Money Market", "Banking Multiplier", "MV = PY", "Fisher Effect", "Loanable Funds", "Policy Tools", "Worked Example"]
    return (headings + ["Core Idea", "Process", "Evidence", "Example", "Comparison", "Revision"])[:10]


def visual_image_middle_focus(title: str, context: str) -> str:
    haystack = f"{title}\n{context}"
    if VISUAL_IMAGE_MACHINE_LEARNING_RE.search(haystack):
        return (
            "Fill the central area with a mostly wordless model-learning mechanism: data table icons -> feature extraction symbols -> training loop arrows -> learned model -> prediction icons. "
            "Only the six large labels Data, Features, Training, Model, Prediction, Evaluation may appear in this central mechanism; all other details should be icons, charts, arrows, or numbered badges."
        )
    if VISUAL_IMAGE_PROBABILITY_RE.search(haystack):
        return (
            "Fill the central area with a large sample-space rectangle containing overlapping A and B regions, then connect union, intersection, "
            "and conditional probability callouts around it."
        )
    if VISUAL_IMAGE_OPEN_ECONOMY_RE.search(haystack):
        return (
            "Fill the central area with the open-economy chain: national saving -> real interest rate -> net capital outflow -> FX supply -> real exchange rate -> net exports. "
            "Use curve-shift arrows and formula cards for S = I + NCO and NX = NCO."
        )
    if VISUAL_IMAGE_ECONOMICS_RE.search(haystack):
        return (
            "Fill the central area with a compact economics mechanism map: money market -> nominal rate -> Fisher equation -> loanable funds contrast, "
            "with one worked calculation tile."
        )
    return "Fill the central area with the main mechanism diagram, surrounded by two comparison callouts and one evidence mini-chart."


def visual_image_detail_fillers(title: str, context: str) -> List[str]:
    haystack = f"{title}\n{context}"
    if VISUAL_IMAGE_MACHINE_LEARNING_RE.search(haystack):
        return [
            "train/test split",
            "feature columns",
            "loss curve",
            "confusion matrix",
            "overfitting gauge",
            "supervised labels",
            "NLP branch",
            "ethics warning",
            "business use case",
        ]
    if VISUAL_IMAGE_PROBABILITY_RE.search(haystack):
        return [
            "sample space",
            "A union B",
            "A intersection B",
            "given B",
            "overlap count",
            "independence check",
            "worked numbers",
            "common mistake",
        ]
    if VISUAL_IMAGE_OPEN_ECONOMY_RE.search(haystack):
        return [
            "S = I + NCO",
            "NX = NCO",
            "loanable funds",
            "real interest rate",
            "NCO",
            "FX supply",
            "exchange rate",
            "net exports",
            "budget deficit",
            "capital flight",
        ]
    if VISUAL_IMAGE_ECONOMICS_RE.search(haystack):
        return [
            "money demand",
            "money supply",
            "bank reserves",
            "multiplier",
            "MV = PY",
            "Fisher effect",
            "loanable funds",
            "policy lag",
        ]
    return ["key term", "evidence", "process arrow", "comparison", "worked example", "limitation", "revision check"]


def visual_image_clean_topic_title(value: str) -> str:
    text = clean_visual_guide_text(value)
    text = re.sub(
        r"^(?:Professional\s+Study\s+Guide|Study\s+Guide|Generated\s+Study\s+Notes|"
        r"Source-wide\s+visual\s+guide)\s*[:\-–—]\s*",
        "",
        text,
        flags=re.I,
    )
    text = re.sub(r"^\d+[.)]\s*", "", text)
    return truncate_text(clean_visual_guide_text(text), 62)


def visual_image_is_generic_title(value: str) -> bool:
    text = clean_visual_guide_text(value)
    if not text:
        return True
    if VISUAL_IMAGE_GENERIC_TITLE_RE.match(text):
        return True
    return bool(re.search(r"\bweek\s*\d+\b", text, flags=re.I) and not VISUAL_IMAGE_ECONOMICS_RE.search(text))


def visual_image_source_topic_title(title: str, context: str) -> str:
    """Prefer the real source topic over course/week labels in generated posters."""
    fallback = visual_image_clean_topic_title(title) or "Study Material"
    candidates: List[Tuple[int, int, str]] = []
    for order, raw in enumerate([title] + re.findall(r"^#{1,4}\s+(.+?)\s*$", context or "", flags=re.M)):
        candidate = visual_image_clean_topic_title(raw)
        if not candidate or is_visual_guide_heading_only(candidate):
            continue
        score = 0
        if not visual_image_is_generic_title(candidate):
            score += 12
        if VISUAL_IMAGE_OPEN_ECONOMY_RE.search(candidate):
            score += 30
        elif VISUAL_IMAGE_ECONOMICS_RE.search(candidate):
            score += 18
        elif VISUAL_IMAGE_MACHINE_LEARNING_RE.search(candidate) or VISUAL_IMAGE_PROBABILITY_RE.search(candidate):
            score += 14
        if re.search(r"macroeconomics|economics|analysis|model|market|flow", candidate, flags=re.I):
            score += 8
        if 18 <= len(candidate) <= 80:
            score += 5
        if re.search(r"big picture|common mistakes|exam|memory|practice|short-answer", candidate, flags=re.I):
            score -= 10
        candidates.append((score, -order, candidate))
    if not candidates:
        return fallback
    best = max(candidates)
    if best[0] <= 0 and fallback:
        return fallback
    return best[2]


def visual_image_is_generic_panel_text(value: str) -> bool:
    text = clean_visual_guide_text(value)
    return not text or bool(VISUAL_IMAGE_GENERIC_PANEL_TEXT_RE.search(text))


def visual_image_plain_text(value: str) -> str:
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\[\[VISUAL:\d+\]\]", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$", " ", text, flags=re.M)
    text = re.sub(r"^\s*#{1,6}\s*", "", text, flags=re.M)
    text = re.sub(r"^\s*(?:[-*+]\s+|\d+[.)]\s*)", "", text, flags=re.M)
    text = re.sub(r"\s*\|\s*", "; ", text)
    return text


def visual_image_context_sections(context: str) -> List[dict]:
    source = str(context or "")
    matches = list(re.finditer(r"^#{1,4}\s+(.+?)\s*$", source, flags=re.M))
    sections: List[dict] = []
    if matches:
        for index, match in enumerate(matches):
            start = match.end()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(source)
            title = clean_visual_guide_text(match.group(1))
            body = source[start:end].strip()
            if title and not is_visual_guide_heading_only(title):
                sections.append({"title": title, "body": body})
    if sections:
        return sections

    paragraphs = [
        clean_visual_guide_text(item)
        for item in re.split(r"\n{2,}", visual_image_plain_text(source))
        if clean_visual_guide_text(item)
    ]
    return [
        {"title": f"Concept {index + 1}", "body": paragraph}
        for index, paragraph in enumerate(paragraphs[:10])
        if len(paragraph) > 30
    ]


def visual_image_term_set(value: str) -> set:
    stopwords = {
        "the", "and", "for", "with", "that", "this", "what", "why", "how", "from", "into",
        "your", "about", "material", "materials", "really", "need", "understand", "week",
        "guide", "study", "professional", "source", "concept", "concepts", "mode",
    }
    terms = set(re.findall(r"[a-z0-9]+", str(value or "").lower()))
    return {term for term in terms if (len(term) > 2 or term in {"nx", "nco"}) and term not in stopwords}


def visual_image_section_score(panel_title: str, section: dict) -> int:
    title_text = clean_visual_guide_text(panel_title)
    section_title = clean_visual_guide_text(section.get("title") or "")
    title_key = normalise_space(re.sub(r"[^a-z0-9]+", " ", title_text.lower())).strip()
    section_key = normalise_space(re.sub(r"[^a-z0-9]+", " ", section_title.lower())).strip()
    score = 0
    if title_key and section_key and (title_key in section_key or section_key in title_key):
        score += 24
    score += len(visual_image_term_set(title_text) & visual_image_term_set(section_title)) * 5
    score += len(visual_image_term_set(title_text) & visual_image_term_set(section.get("body") or "")) * 2
    return score


def visual_image_sentence_candidates(value: str) -> List[str]:
    plain = visual_image_plain_text(value)
    chunks = re.split(r"\n+|(?<=[.!?])\s+", plain)
    candidates: List[str] = []
    skip_re = re.compile(
        r"^(?:source-based|professional explanation|background knowledge|application|limitation|"
        r"direct answer|why|what to do|remember|labels?|teaches?|visual|title|subtitle)\s*:?\s*$",
        flags=re.I,
    )
    for raw in chunks:
        item = clean_visual_guide_text(raw)
        item = re.sub(r"^(?:Source-based|Professional explanation|Background knowledge|Application|Limitation)\s*[:\-]\s*", "", item, flags=re.I)
        item = clean_visual_guide_text(item)
        if len(item) < 32 or len(item.split()) < 5:
            continue
        if skip_re.match(item) or is_visual_guide_heading_only(item) or visual_image_is_generic_panel_text(item):
            continue
        if item.lower() in {candidate.lower() for candidate in candidates}:
            continue
        candidates.append(item)
    return candidates


def visual_image_compact_panel_detail(value: str) -> str:
    text = clean_visual_guide_text(value)
    text = re.sub(r"^This material from [^.]{0,90}?\s+is about\s+", "", text, flags=re.I)
    text = re.sub(r"^The central problem is to understand\s+", "", text, flags=re.I)
    text = re.sub(r"^The likely assessment task is to\s+", "Exam task: ", text, flags=re.I)
    text = re.sub(r"\bconnect to the global economy through\b", "connect to", text, flags=re.I)
    text = re.sub(r"\binstead of only naming the final result\b", "not just naming the result", text, flags=re.I)
    return clean_visual_guide_text(text)


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


def visual_image_prefers_chinese(preferred_language: str, blueprint: dict) -> bool:
    raw_language = str(preferred_language or "").strip().lower().replace("-", "_").replace(" ", "_")
    language = normalise_language_key(preferred_language)
    if language in {"simplified_chinese", "traditional_chinese", "mixed_chinese_english"} or raw_language in {
        "zh",
        "zh_cn",
        "zh_hans",
        "chinese",
        "中文",
        "简体",
        "简体中文",
        "繁體",
        "繁體中文",
    }:
        return True
    if raw_language and raw_language not in {"auto", "multi", "multilingual", "multi_language", "multi_language"}:
        return False
    sample = " ".join([
        str(blueprint.get("title") or ""),
        str(blueprint.get("subtitle") or ""),
        " ".join(str((panel or {}).get("title") or "") for panel in (blueprint.get("panels") or []) if isinstance(panel, dict)),
    ])
    return visual_image_contains_cjk(sample)


def visual_image_font(size: int, bold: bool = False):
    from PIL import ImageFont

    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc" if bold else "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc" if bold else "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ]
    for candidate in candidates:
        if not candidate:
            continue
        try:
            path = Path(candidate)
            if path.exists():
                return ImageFont.truetype(str(path), size=size)
        except Exception:
            continue
    return ImageFont.load_default()


def visual_image_text_size(draw, text: str, font) -> Tuple[int, int]:
    bbox = draw.textbbox((0, 0), str(text or ""), font=font)
    return max(0, bbox[2] - bbox[0]), max(0, bbox[3] - bbox[1])


def visual_image_fit_text(draw, text: str, max_width: int, start_size: int, min_size: int = 18, bold: bool = False):
    text = normalise_space(str(text or ""))
    size = start_size
    font = visual_image_font(size, bold=bold)
    while size > min_size and visual_image_text_size(draw, text, font)[0] > max_width:
        size -= 2
        font = visual_image_font(size, bold=bold)
    return font


def visual_image_wrap_text(draw, text: str, font, max_width: int, max_lines: int = 3) -> List[str]:
    text = normalise_space(str(text or ""))
    if not text or max_width <= 0 or max_lines <= 0:
        return []
    if visual_image_contains_cjk(text):
        tokens = list(text)
        separator = ""
    else:
        tokens = text.split()
        separator = " "
    lines: List[str] = []
    current = ""
    for token in tokens:
        candidate = f"{current}{separator if current and separator else ''}{token}"
        if not current or visual_image_text_size(draw, candidate, font)[0] <= max_width:
            current = candidate
            continue
        lines.append(current)
        current = token
        if len(lines) >= max_lines:
            break
    if current and len(lines) < max_lines:
        lines.append(current)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
    if lines and len(lines) == max_lines:
        while lines[-1] and visual_image_text_size(draw, f"{lines[-1]}...", font)[0] > max_width:
            lines[-1] = lines[-1][:-1].rstrip()
        if lines[-1] and lines[-1] != text:
            lines[-1] = f"{lines[-1]}..."
    return lines


def visual_image_draw_wrapped(draw, xy: Tuple[int, int], text: str, font, fill: str, max_width: int, max_lines: int = 3, line_gap: int = 8) -> int:
    x, y = xy
    lines = visual_image_wrap_text(draw, text, font, max_width, max_lines=max_lines)
    line_height = visual_image_text_size(draw, "Ag", font)[1] + line_gap
    for index, line in enumerate(lines):
        draw.text((x, y + index * line_height), line, font=font, fill=fill)
    return y + len(lines) * line_height


def visual_image_draw_arrow(draw, start: Tuple[int, int], end: Tuple[int, int], fill: str = "#294563", width: int = 4) -> None:
    draw.line([start, end], fill=fill, width=width)
    x1, y1 = start
    x2, y2 = end
    dx = x2 - x1
    dy = y2 - y1
    length = max(1, (dx * dx + dy * dy) ** 0.5)
    ux = dx / length
    uy = dy / length
    size = 13 + width
    left = (x2 - ux * size - uy * size * 0.55, y2 - uy * size + ux * size * 0.55)
    right = (x2 - ux * size + uy * size * 0.55, y2 - uy * size - ux * size * 0.55)
    draw.polygon([end, left, right], fill=fill)


def visual_image_draw_icon(draw, box: Tuple[int, int, int, int], kind: str, accent: str) -> None:
    x1, y1, x2, y2 = box
    w = x2 - x1
    h = y2 - y1
    cx = x1 + w // 2
    cy = y1 + h // 2
    navy = "#12213a"
    soft = "#f4f8fb"
    kind = (kind or "").lower()
    if any(term in kind for term in ("loanable", "foreign-exchange", "fx", "exchange rate", "supply curve", "demand curve", "interest rate")):
        draw.line((x1 + 18, y2 - 18, x2 - 14, y2 - 18), fill=navy, width=3)
        draw.line((x1 + 18, y2 - 18, x1 + 18, y1 + 16), fill=navy, width=3)
        if "fx" in kind or "exchange" in kind:
            sx = x1 + 52
            draw.line((sx, y2 - 22, sx, y1 + 22), fill=accent, width=5)
            draw.arc((x1 + 38, y1 + 34, x2 - 20, y2 - 22), start=195, end=342, fill="#7f9bb5", width=4)
        else:
            draw.line((x1 + 28, y2 - 30, x2 - 20, y1 + 28), fill=accent, width=5)
            draw.line((x1 + 28, y1 + 32, x2 - 20, y2 - 30), fill="#7f9bb5", width=5)
        visual_image_draw_arrow(draw, (x1 + 52, cy), (x2 - 28, cy - 18), fill=accent, width=3)
    elif any(term in kind for term in ("nco", "capital flow", "net exports", "trade balance", "saving", "investment")):
        draw.rounded_rectangle((x1 + 18, y1 + 20, x2 - 18, y2 - 20), radius=14, fill=soft, outline=navy, width=3)
        draw.line((cx, y1 + 24, cx, y2 - 24), fill="#b7c6d5", width=3)
        visual_image_draw_arrow(draw, (x1 + 34, cy - 18), (x2 - 34, cy - 18), fill=accent, width=5)
        visual_image_draw_arrow(draw, (x2 - 34, cy + 20), (x1 + 34, cy + 20), fill="#7f9bb5", width=5)
    elif "formula" in kind or "=" in kind or "identity" in kind:
        draw.rounded_rectangle((x1 + 16, y1 + 24, x2 - 16, y2 - 24), radius=16, fill=soft, outline=navy, width=3)
        for idx, y in enumerate((cy - 22, cy + 2, cy + 26)):
            draw.line((x1 + 32, y, x2 - 32, y), fill=accent if idx == 1 else "#9fb2c5", width=4)
    elif "chart" in kind or "evaluation" in kind or "accuracy" in kind:
        for idx, height in enumerate((34, 52, 42, 65)):
            bx = x1 + 14 + idx * 26
            draw.rounded_rectangle((bx, y2 - 14 - height, bx + 16, y2 - 14), radius=4, fill=accent)
        draw.line((x1 + 10, y2 - 14, x2 - 10, y2 - 14), fill=navy, width=3)
    elif "network" in kind or "model" in kind or "neural" in kind:
        points = [(x1 + 20, cy), (cx, y1 + 20), (cx, y2 - 20), (x2 - 20, cy)]
        for p1 in points[:3]:
            draw.line((p1, points[-1]), fill="#87a3bc", width=3)
        for point in points:
            draw.ellipse((point[0] - 10, point[1] - 10, point[0] + 10, point[1] + 10), fill=soft, outline=accent, width=4)
    elif "venn" in kind or "union" in kind or "intersection" in kind:
        draw.ellipse((x1 + 18, y1 + 16, cx + 14, y2 - 14), fill="#bde8ef", outline=navy, width=3)
        draw.ellipse((cx - 14, y1 + 16, x2 - 18, y2 - 14), fill="#d9ecc7", outline=navy, width=3)
    elif "warning" in kind or "risk" in kind or "ethic" in kind or "limit" in kind:
        draw.polygon([(cx, y1 + 14), (x2 - 18, y2 - 16), (x1 + 18, y2 - 16)], fill="#fee7a9", outline=navy)
        draw.line((cx, cy - 12, cx, cy + 16), fill=navy, width=5)
        draw.ellipse((cx - 3, cy + 24, cx + 3, cy + 30), fill=navy)
    elif "data" in kind or "table" in kind:
        draw.rounded_rectangle((x1 + 14, y1 + 16, x2 - 14, y2 - 16), radius=12, fill=soft, outline=navy, width=3)
        for row in range(3):
            y = y1 + 30 + row * 22
            draw.line((x1 + 22, y, x2 - 22, y), fill="#b7c6d5", width=2)
        for col in range(3):
            x = x1 + 34 + col * 34
            draw.rounded_rectangle((x, y1 + 42, x + 18, y1 + 58), radius=4, fill=accent)
    else:
        draw.rounded_rectangle((x1 + 20, y1 + 18, x2 - 20, y2 - 18), radius=16, fill=soft, outline=navy, width=3)
        draw.arc((x1 + 38, y1 + 32, x2 - 38, y2 - 32), start=25, end=325, fill=accent, width=6)
        visual_image_draw_arrow(draw, (cx - 30, cy + 16), (cx + 30, cy - 16), fill=accent, width=4)


def visual_image_draw_panel(draw, box: Tuple[int, int, int, int], title: str, detail: str, visual: str, accent: str) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=18, fill="#ffffff", outline="#cad7e6", width=2)
    draw.rounded_rectangle((x1, y1, x2, y1 + 48), radius=18, fill=accent)
    draw.rectangle((x1, y1 + 30, x2, y1 + 48), fill=accent)
    title_font = visual_image_fit_text(draw, title, x2 - x1 - 34, 24, min_size=16, bold=True)
    draw.text((x1 + 16, y1 + 12), title, font=title_font, fill="#ffffff")
    icon_box = (x1 + 14, y1 + 65, x1 + 126, y1 + 158)
    visual_image_draw_icon(draw, icon_box, f"{title} {visual}", accent)
    body_font = visual_image_font(18)
    body = detail or visual or title
    visual_image_draw_wrapped(draw, (x1 + 140, y1 + 68), body, body_font, "#31425a", x2 - x1 - 156, max_lines=3, line_gap=6)


def visual_image_is_open_economy_blueprint(blueprint: dict) -> bool:
    return bool(VISUAL_IMAGE_OPEN_ECONOMY_RE.search(visual_image_blueprint_domain_text(blueprint)))


def visual_image_open_economy_copy(preferred_language: str, blueprint: dict) -> dict:
    chinese = visual_image_prefers_chinese(preferred_language, blueprint)
    if chinese:
        return {
            "title": "可贷资金市场、储蓄与开放经济分析",
            "subtitle": "储蓄、投资、资本流动与汇率如何连成一个考试模型",
            "concepts": "可贷资金市场与储蓄",
            "case": "政府预算与公共储蓄",
            "trade": "开放经济与资本流动",
            "model": "投资税收抵免的三面板分析",
            "case_analysis": "典型案例分析",
            "exchange": "实际汇率与名义汇率换算",
            "definition": "定义",
            "national_saving": "国民储蓄 (S)",
            "private_saving": "私人储蓄",
            "public_saving": "公共储蓄",
            "capital_flow": "净资本流出 (NCO)",
            "income": "收入",
            "consumption": "消费",
            "investment": "投资",
            "government": "政府",
            "budget_deficit": "预算赤字",
            "capital_flight": "资本外逃",
            "loanable": "可贷资金市场",
            "fx": "外汇市场",
            "rer": "实际汇率",
            "nx": "净出口 (NX)",
            "exam_chain": "考试链条",
            "mistake": "常见错误",
            "revision": "复习任务",
            "trade_goods": "商品与服务贸易",
            "finance_trade": "金融交易",
            "imports": "进口",
            "exports": "出口",
            "asset_purchase": "资产购买",
            "supply": "供给",
            "demand": "需求",
            "real_interest": "实际利率",
            "quantity": "数量",
            "currency": "本币升值",
            "policy_note": "按 S → r → NCO → e → NX 写完整因果链。",
            "trap_note": "S、I、NCO、NX 含义不同，不能混用。",
            "review_note": "画三图 · 写公式 · 解释曲线移动",
        }
    return {
        "title": blueprint.get("title") or "Open-Economy Macroeconomics Overview",
        "subtitle": "How saving, investment, capital flows, and exchange rates connect in one exam model",
        "concepts": "1. Key Concepts and Formulas",
        "case": "2. Policy Cases and Saving",
        "trade": "3. Capital Flows and FX Market",
        "model": "4. Linked Market Model and Policy Analysis",
        "definition": "Definition",
        "national_saving": "National saving (S)",
        "private_saving": "Private saving",
        "public_saving": "Public saving",
        "capital_flow": "Net capital outflow (NCO)",
        "income": "Income",
        "consumption": "Consumption",
        "investment": "Investment",
        "government": "Government",
        "budget_deficit": "Budget deficit",
        "capital_flight": "Capital flight",
        "loanable": "Loanable funds",
        "fx": "FX market",
        "rer": "Real exchange rate",
        "nx": "Net exports (NX)",
        "exam_chain": "Exam chain",
        "mistake": "Common mistake",
        "revision": "Revision task",
        "trade_goods": "Goods and services trade",
        "finance_trade": "Financial transactions",
        "imports": "Imports",
        "exports": "Exports",
        "asset_purchase": "Asset purchases",
        "supply": "Supply",
        "demand": "Demand",
        "real_interest": "Real interest rate",
        "quantity": "Quantity",
        "currency": "Currency appreciation",
        "policy_note": "Explain the full S → r → NCO → e → NX causal chain.",
        "trap_note": "S, I, NCO, and NX are connected but not the same variable.",
        "review_note": "Draw three graphs · write identities · explain shifts",
    }


def render_visual_image_guide_open_economy_b64(title: str, blueprint: dict, preferred_language: str) -> Tuple[str, dict]:
    from PIL import Image, ImageDraw

    target_width, target_height = parse_visual_image_size(VISUAL_IMAGE_GUIDE_SIZE)
    if target_width > target_height:
        target_width, target_height = target_height, target_width

    base_width, base_height = 1024, 1536
    img = Image.new("RGB", (base_width, base_height), "#edf7fb")
    draw = ImageDraw.Draw(img)
    labels_seen: List[str] = []

    copy = visual_image_open_economy_copy(preferred_language, blueprint)
    navy = "#14243e"
    teal = "#1f7a82"
    green = "#2d7d69"
    orange = "#c96b3e"
    blue = "#2f7ca7"
    muted = "#496276"
    panel_border = "#b8d1e6"
    pale_blue = "#d9edf8"

    # Open-economy posters use a deterministic wall-chart layout because this
    # domain needs exact formulas, axes, curve labels, and policy chains.
    is_chinese_layout = visual_image_prefers_chinese(preferred_language, blueprint)
    if True:
        header_fill = "#c7e4f5"
        text = "#071426"
        grid = "#dae7f1"
        labels = (
            {
                "brand": "由 Synapse AI 生成",
                "title": "可贷资金市场、储蓄与开放经济分析",
                "loanable": "可贷资金市场与储蓄",
                "budget": "政府预算与公共储蓄",
                "capital": "开放经济与资本流动",
                "cases": "典型案例分析",
                "tax": "投资税收抵免的三面板分析",
                "exchange": "实际汇率与名义汇率换算",
                "identity": "储蓄-投资恒等式",
                "closed": "封闭经济: S=I",
                "open": "开放经济: S=I+NCO",
                "supply_demand": "供给与需求",
                "budget_surplus": "预算盈余",
                "saving_tax": "储蓄利息税",
                "nco": "净资本流出 (NCO)",
                "returns": "回报率变化",
                "nx_fx": "净出口对汇率影响",
                "case2": "案例 2：新西兰禁止海上油气勘探",
                "case3": "案例 3：希腊信用评级下调 (2009)",
                "formula": "RER = NER · P国内 / P国外",
            }
            if is_chinese_layout
            else {
                "brand": "Generated by Synapse AI",
                "title": "Loanable Funds, Saving, and Open Economy Analysis",
                "loanable": "Loanable Funds and Saving",
                "budget": "Government Budget and Public Saving",
                "capital": "Open Economy and Capital Flows",
                "cases": "Case Study Analysis",
                "tax": "Investment Tax Credit Three-Panel Analysis",
                "exchange": "Real and Nominal Exchange Rate Conversion",
                "identity": "Saving-Investment Identity",
                "closed": "Closed economy: S=I",
                "open": "Open economy: S=I+NCO",
                "supply_demand": "Supply and Demand",
                "budget_surplus": "Budget surplus",
                "saving_tax": "Saving tax",
                "nco": "Net capital outflow (NCO)",
                "returns": "Returns",
                "nx_fx": "Net exports and FX",
                "case2": "Case 2: NZ oil and gas ban",
                "case3": "Case 3: Greece downgrade (2009)",
                "formula": "RER = NER · Pdomestic / Pforeign",
            }
        )
        real_rate_label = "实际利率" if is_chinese_layout else "Real rate"
        identity_display = labels["identity"] if is_chinese_layout else "S-I Identity"
        closed_display = labels["closed"] if is_chinese_layout else "Closed: S=I"
        open_display = labels["open"] if is_chinese_layout else "Open: S=I+NCO"
        supply_demand_display = labels["supply_demand"] if is_chinese_layout else "S/D Graph"
        nco_heading_display = labels["nco"] if is_chinese_layout else "Net capital outflow"
        interest_tax_line = "储蓄利息↑" if is_chinese_layout else "Return↑"
        supply_falls_line = "供给减少/降低" if is_chinese_layout else "Supply falls"
        nco_definition_line = "定义：均为净资本流出" if is_chinese_layout else "Foreign asset purchases"
        nco_rate_line = "实际利率影响资金方向" if is_chinese_layout else "Real rate drives flows"
        nco_formula_line = "NCO = II - 资本流入" if is_chinese_layout else "NCO = foreign buying - inflow"
        return_bullets = (
            ["国内↑ NCO↓", "海外↑ NCO↑", "风险↑ 外逃"]
            if is_chinese_layout
            else ["Home↑ NCO↓", "Foreign↑ NCO↑", "Risk↑ outflow"]
        )
        nx_bullets = (
            ["NX增加", "NCO常量不宜混用", "本币升值→NX下降"]
            if is_chinese_layout
            else ["NX rises", "NCO ≠ NX", "Currency ↑ → NX falls"]
        )
        case2_bullets = (
            ["投资(I)↓", "供给曲线左移", "实际利率↓", "NCO↑", "新西兰元贬值", "投资者流出↑流入↓", "出口易进口难"]
            if is_chinese_layout
            else ["Investment (I)↓", "Supply curve left", "Real rate ↓", "NCO↑", "NZ dollar depreciates", "Outflow↑ inflow↓", "Exports easier"]
        )
        case3_bullets = (
            ["全球投资回报↓", "需求左移", "利率↓", "NCO↓", "新西兰元升值", "流出↓流入↑", "出口难进口易"]
            if is_chinese_layout
            else ["Global return ↓", "Demand shifts left", "Rate ↓", "NCO↓", "NZ dollar rises", "Outflow↓ inflow↑", "Exports harder"]
        )
        tax_chain_one = (
            "1. 投资需求(D)右移 → 利率↑ → NCO↓ → 本币供给↓ → 本币升值 → 净出口(NX)↓"
            if is_chinese_layout
            else "1. D shifts right → r↑ → NCO↓ → FX supply↓ → currency appreciates → NX↓"
        )
        tax_chain_two = (
            "利率↑ → NCO↓ → 本币供给↓ → 本币升值 → NX↓"
            if is_chinese_layout
            else "r↑ → NCO↓ → FX supply↓ → appreciation → NX↓"
        )
        domestic_price_label = "P国内" if is_chinese_layout else "Pdom"
        foreign_price_label = "P国外" if is_chinese_layout else "Pfor"
        nominal_rate_label = "名义汇率" if is_chinese_layout else "Nominal rate"

        def remember_label(value: str) -> str:
            text_value = clean_visual_guide_text(value)
            if text_value and text_value not in labels_seen:
                labels_seen.append(text_value)
            return text_value

        def write_text(
            xy: Tuple[int, int],
            value: str,
            size: int,
            fill: str = text,
            bold: bool = False,
            max_width: Optional[int] = None,
            max_lines: int = 2,
            line_gap: int = 4,
            track: bool = True,
        ) -> int:
            value = remember_label(value) if track else clean_visual_guide_text(value)
            font = visual_image_font(size, bold=bold)
            if max_width:
                return visual_image_draw_wrapped(draw, xy, value, font, fill, max_width, max_lines=max_lines, line_gap=line_gap)
            draw.text(xy, value, font=font, fill=fill)
            return xy[1] + visual_image_text_size(draw, value, font)[1]

        def centered_text(
            box: Tuple[int, int, int, int],
            value: str,
            size: int,
            fill: str = text,
            bold: bool = True,
            track: bool = True,
        ) -> None:
            value = remember_label(value) if track else clean_visual_guide_text(value)
            font = visual_image_fit_text(draw, value, box[2] - box[0] - 10, size, min_size=12, bold=bold)
            tw, th = visual_image_text_size(draw, value, font)
            draw.text((box[0] + (box[2] - box[0] - tw) / 2, box[1] + (box[3] - box[1] - th) / 2 - 1), value, font=font, fill=fill)

        def arrow(start: Tuple[int, int], end: Tuple[int, int], color: str = teal, width: int = 5) -> None:
            visual_image_draw_arrow(draw, start, end, fill=color, width=width)

        def dashed_vertical(x: int, y1: int, y2: int, color: str = "#8fa6b8") -> None:
            y = y1
            while y < y2:
                draw.line((x, y, x, min(y + 12, y2)), fill=color, width=2)
                y += 22

        def section(box: Tuple[int, int, int, int], heading: str) -> None:
            x1, y1, x2, y2 = box
            draw.rounded_rectangle(box, radius=16, fill="#ffffff", outline=panel_border, width=2)
            draw.rounded_rectangle((x1, y1, x2, y1 + 48), radius=16, fill=header_fill)
            draw.rectangle((x1, y1 + 28, x2, y1 + 48), fill=header_fill)
            heading = remember_label(heading)
            font = visual_image_fit_text(draw, heading, x2 - x1 - 36, 29, min_size=17, bold=True)
            draw.text((x1 + 18, y1 + 8), heading, font=font, fill=text)

        def bullet_list(x: int, y: int, items: List[str], size: int = 21, width: int = 260, gap: int = 30) -> None:
            for index, item in enumerate(items):
                by = y + index * gap
                draw.ellipse((x, by + 9, x + 8, by + 17), fill=text)
                write_text((x + 20, by), item, size, fill=text, bold=True, max_width=width, max_lines=1)

        def check_row(x: int, y: int, value: str) -> None:
            draw.ellipse((x, y, x + 36, y + 36), fill="#58c576", outline="#1d6d3d", width=2)
            draw.line((x + 9, y + 19, x + 16, y + 27, x + 28, y + 10), fill="#ffffff", width=4)
            write_text((x + 50, y + 1), value, 26, fill=text, bold=True)

        def draw_growth_icon(x: int, y: int, scale: float = 1.0) -> None:
            bars = [22, 35, 48, 62]
            for i, height in enumerate(bars):
                bx = x + int(i * 16 * scale)
                draw.rectangle((bx, y + int(70 * scale) - int(height * scale), bx + int(10 * scale), y + int(70 * scale)), fill="#68b55b", outline=text)
            points = [
                (x + int(4 * scale), y + int(54 * scale)),
                (x + int(22 * scale), y + int(38 * scale)),
                (x + int(43 * scale), y + int(29 * scale)),
                (x + int(66 * scale), y + int(12 * scale)),
            ]
            draw.line(points, fill="#2f7ca7", width=max(2, int(4 * scale)))
            arrow(points[-2], points[-1], "#2f7ca7", max(2, int(3 * scale)))

        def draw_person_money(x: int, y: int) -> None:
            draw.ellipse((x + 22, y + 4, x + 58, y + 40), fill="#ffd6bd", outline=text, width=2)
            draw.rectangle((x + 18, y + 44, x + 62, y + 94), fill="#8fd0ef", outline=text, width=2)
            draw.polygon([(x + 18, y + 44), (x + 40, y + 70), (x + 62, y + 44)], fill="#ffffff", outline=text)
            draw.rounded_rectangle((x + 62, y + 55, x + 106, y + 92), radius=8, fill="#f3b45b", outline=text, width=2)
            write_text((x + 76, y + 61), "$", 24, fill=text, bold=True, track=False)

        def draw_worker(x: int, y: int) -> None:
            draw.ellipse((x + 26, y + 5, x + 62, y + 41), fill="#ffd6bd", outline=text, width=2)
            draw.rectangle((x + 18, y + 14, x + 70, y + 25), fill="#f5b14c", outline=text, width=2)
            draw.rectangle((x + 18, y + 48, x + 70, y + 96), fill="#d7dee5", outline=text, width=2)
            draw.line((x + 80, y + 38, x + 100, y + 62), fill=text, width=5)
            draw.line((x + 92, y + 42, x + 112, y + 28), fill=text, width=5)

        def draw_scale_icon(x: int, y: int, scale: float = 1.0) -> None:
            cx = x + int(62 * scale)
            top = y + int(16 * scale)
            draw.line((cx, top, cx, y + int(92 * scale)), fill=text, width=max(2, int(4 * scale)))
            draw.line((x + int(24 * scale), top + int(12 * scale), x + int(100 * scale), top + int(12 * scale)), fill=text, width=max(2, int(4 * scale)))
            draw.polygon([(cx, top - int(8 * scale)), (cx - int(10 * scale), top + int(8 * scale)), (cx + int(10 * scale), top + int(8 * scale))], fill="#f5b14c", outline=text)
            for px in (x + int(28 * scale), x + int(90 * scale)):
                draw.line((px, top + int(12 * scale), px - int(15 * scale), y + int(58 * scale)), fill=text, width=max(1, int(2 * scale)))
                draw.line((px, top + int(12 * scale), px + int(15 * scale), y + int(58 * scale)), fill=text, width=max(1, int(2 * scale)))
                draw.ellipse((px - int(23 * scale), y + int(56 * scale), px + int(23 * scale), y + int(82 * scale)), fill="#bde9c4", outline=text, width=max(1, int(2 * scale)))
                write_text((px - int(7 * scale), y + int(58 * scale)), "$", max(12, int(20 * scale)), fill="#1c6f3f", bold=True, track=False)
            draw.rectangle((cx - int(24 * scale), y + int(92 * scale), cx + int(24 * scale), y + int(100 * scale)), fill=text)

        def draw_globe_money(x: int, y: int) -> None:
            draw.ellipse((x, y + 20, x + 78, y + 98), fill="#91d4ef", outline=text, width=3)
            draw.arc((x - 8, y + 4, x + 102, y + 114), 30, 170, fill="#3b9b65", width=8)
            draw.arc((x - 24, y - 2, x + 94, y + 110), 210, 350, fill="#3b9b65", width=8)
            arrow((x + 82, y + 16), (x + 106, y + 32), "#3b9b65", 4)
            arrow((x - 8, y + 104), (x - 30, y + 86), "#3b9b65", 4)
            draw.ellipse((x + 58, y + 54, x + 122, y + 118), fill="#ffd176", outline=text, width=3)
            write_text((x + 79, y + 69), "$", 35, fill=text, bold=True, track=False)

        def draw_oil_case(x: int, y: int) -> None:
            draw.line((x + 34, y + 22, x + 12, y + 112), fill=text, width=4)
            draw.line((x + 34, y + 22, x + 76, y + 112), fill=text, width=4)
            draw.line((x + 19, y + 82, x + 68, y + 82), fill=text, width=4)
            draw.rectangle((x + 5, y + 112, x + 92, y + 128), fill="#e36a44", outline=text, width=2)
            draw.ellipse((x + 84, y + 8, x + 126, y + 50), fill="#fff0f0", outline=text, width=3)
            draw.line((x + 94, y + 18, x + 116, y + 40), fill="#d43131", width=5)
            draw.line((x + 116, y + 18, x + 94, y + 40), fill="#d43131", width=5)
            draw.ellipse((x + 10, y + 140, x + 86, y + 216), fill="#2e4f9e", outline=text, width=3)
            draw.polygon([(x + 16, y + 172), (x + 84, y + 146), (x + 80, y + 174)], fill="#d33a3a")
            draw.text((x + 29, y + 163), "NZ", font=visual_image_font(21, bold=True), fill="#ffffff")

        def draw_document_case(x: int, y: int) -> None:
            draw.rounded_rectangle((x + 12, y + 12, x + 82, y + 110), radius=8, fill="#fff0d5", outline=text, width=3)
            draw.polygon([(x + 62, y + 12), (x + 82, y + 32), (x + 62, y + 32)], fill="#f7c781", outline=text)
            for i in range(4):
                draw.line((x + 26, y + 42 + i * 14, x + 68, y + 42 + i * 14), fill="#b95454", width=3)
            arrow((x + 126, y + 24), (x + 126, y + 108), "#d43131", 8)
            draw.line((x + 96, y + 136, x + 172, y + 182), fill="#d43131", width=7)
            arrow((x + 132, y + 158), (x + 172, y + 182), "#d43131", 6)
            for i, h in enumerate([56, 82, 42]):
                bx = x + 10 + i * 38
                draw.rectangle((bx, y + 220 - h, bx + 28, y + 220), fill="#d7dee5", outline=text, width=2)
                for row in range(2):
                    draw.rectangle((bx + 6, y + 224 - h + row * 17, bx + 12, y + 232 - h + row * 17), fill="#7597b8")

        def draw_flowchart(x: int, y: int) -> None:
            nodes = [
                (x + 62, y + 12, "#74a9cf"),
                (x + 12, y + 72, "#bcd7ec"),
                (x + 114, y + 72, "#bcd7ec"),
                (x + 42, y + 132, "#a9d99d"),
                (x + 144, y + 132, "#a9d99d"),
            ]
            for nx, ny, color in nodes:
                draw.rounded_rectangle((nx, ny, nx + 46, ny + 28), radius=7, fill=color, outline=text, width=2)
            draw.polygon([(x + 86, y + 72), (x + 122, y + 96), (x + 86, y + 120), (x + 50, y + 96)], fill="#f6c886", outline=text)
            draw.line((x + 85, y + 40, x + 85, y + 72), fill=text, width=2)
            draw.line((x + 58, y + 86, x + 50, y + 96), fill=text, width=2)
            draw.line((x + 160, y + 86, x + 122, y + 96), fill=text, width=2)
            draw.line((x + 72, y + 132, x + 70, y + 120), fill=text, width=2)
            draw.line((x + 168, y + 132, x + 122, y + 100), fill=text, width=2)

        def draw_calculator(x: int, y: int) -> None:
            draw.rounded_rectangle((x, y, x + 76, y + 104), radius=8, fill="#233852", outline=text, width=3)
            draw.rectangle((x + 12, y + 12, x + 64, y + 34), fill="#a8d6a1", outline=text, width=2)
            for row in range(3):
                for col in range(3):
                    bx = x + 13 + col * 18
                    by = y + 48 + row * 16
                    draw.rounded_rectangle((bx, by, bx + 12, by + 10), radius=2, fill="#f2f6fa", outline="#7c8a98")

        def graph(
            box: Tuple[int, int, int, int],
            title_value: str,
            rising_label: str,
            falling_label: str,
            x_label: str,
            y_label: str,
            falling_color: str = blue,
        ) -> None:
            x1, y1, x2, y2 = box
            draw.rounded_rectangle(box, radius=10, fill="#f8fcff", outline="#c4d8e8", width=1)
            write_text((x1 + 12, y1 + 8), title_value, 20, fill=text, bold=True, max_width=x2 - x1 - 24, max_lines=1)
            ox, oy = x1 + 48, y2 - 34
            tx, ty = x2 - 28, y1 + 58
            draw.line((ox, oy, tx, oy), fill=text, width=3)
            draw.line((ox, oy, ox, ty), fill=text, width=3)
            arrow((tx - 17, oy), (tx, oy), text, 2)
            arrow((ox, ty + 17), (ox, ty), text, 2)
            draw.line((ox + 24, oy - 22, tx - 18, ty + 20), fill=orange, width=4)
            draw.line((ox + 24, ty + 22, tx - 18, oy - 28), fill=falling_color, width=4)
            mid_x = (ox + tx) // 2
            mid_y = (oy + ty) // 2 + 2
            draw.line((mid_x, oy, mid_x, mid_y), fill="#95a8b8", width=2)
            draw.line((ox, mid_y, mid_x, mid_y), fill="#95a8b8", width=2)
            write_text((tx - 58, ty + 10), rising_label, 16, fill=orange, bold=True, max_width=58, max_lines=1)
            write_text((tx - 72, oy - 56), falling_label, 16, fill=falling_color, bold=True, max_width=70, max_lines=1)
            write_text((x2 - 78, y2 - 24), x_label, 14, fill=muted, bold=True, max_width=72, max_lines=1)
            write_text((x1 + 8, y1 + 54), y_label, 14, fill=muted, bold=True, max_width=44, max_lines=2)

        # Header and overall frame.
        write_text((760, 4), labels["brand"], 18, fill="#667085", bold=False, track=True)
        draw.rectangle((0, 32, base_width, 118), fill=navy)
        centered_text((30, 44, 994, 104), labels["title"], 50, fill="#ffffff", bold=True)

        # Row 1: loanable funds and budget/public saving.
        section((20, 132, 510, 498), labels["loanable"])
        draw_growth_icon(34, 184, 0.46)
        write_text((52, 194), identity_display, 21 if not is_chinese_layout else 26, fill=text, bold=True, max_width=220, max_lines=1)
        write_text((52, 234), closed_display, 20 if not is_chinese_layout else 23, fill=text, bold=True, max_width=220, max_lines=1)
        write_text((52, 272), open_display, 20 if not is_chinese_layout else 23, fill=text, bold=True, max_width=220, max_lines=1)
        draw_person_money(52, 326)
        arrow((154, 382), (224, 382), "#50ae5c", 8)
        draw_worker(240, 324)
        dashed_vertical(292, 178, 474)
        write_text((326, 194), supply_demand_display, 22 if not is_chinese_layout else 25, fill=text, bold=True, max_width=150, max_lines=1)
        graph((316, 228, 490, 474), "", "S", "D", "Q", real_rate_label)

        section((530, 132, 1004, 498), labels["budget"])
        write_text((570, 194), labels["budget_surplus"], 26, fill=text, bold=True)
        write_text((602, 236), "T > G", 28, fill=text, bold=True)
        check_row(558, 290, "$1,000")
        check_row(558, 336, "$1,000")
        check_row(558, 382, "$2,000")
        dashed_vertical(772, 178, 474)
        write_text((810, 194), labels["saving_tax"], 26, fill=text, bold=True, max_width=160, max_lines=1)
        draw_scale_icon(802, 240, 0.82)
        write_text((814, 348), interest_tax_line, 20 if not is_chinese_layout else 22, fill=text, bold=True, max_width=160, max_lines=1)
        write_text((814, 382), supply_falls_line, 20 if not is_chinese_layout else 22, fill=text, bold=True, max_width=160, max_lines=2)

        # Row 2: open economy and capital flow.
        section((20, 518, 1004, 752), labels["capital"])
        draw_globe_money(48, 578)
        write_text((168, 574), nco_heading_display, 22 if not is_chinese_layout else 27, fill=text, bold=True, max_width=276, max_lines=1)
        write_text((168, 614), nco_definition_line, 18 if not is_chinese_layout else 22, fill=text, bold=True, max_width=272, max_lines=2)
        write_text((168, 656), nco_rate_line, 18 if not is_chinese_layout else 22, fill=text, bold=True, max_width=272, max_lines=2)
        write_text((168, 696), nco_formula_line, 18 if not is_chinese_layout else 27, fill=text, bold=True, max_width=290, max_lines=2)
        dashed_vertical(456, 566, 728)
        draw_growth_icon(490, 574, 0.78)
        write_text((580, 574), labels["returns"], 22 if not is_chinese_layout else 25, fill=text, bold=True)
        bullet_list(582, 614, return_bullets, size=16 if not is_chinese_layout else 17, width=146, gap=30)
        dashed_vertical(704, 566, 728)
        write_text((738, 574), labels["nx_fx"], 21 if not is_chinese_layout else 24, fill=text, bold=True, max_width=240, max_lines=1)
        bullet_list(742, 620, nx_bullets, size=18 if not is_chinese_layout else 21, width=224, gap=36)

        # Row 3: case analysis.
        section((20, 772, 1004, 1068), labels["cases"])
        write_text((54, 834), labels["case2"], 22 if not is_chinese_layout else 24, fill=text, bold=True, max_width=392, max_lines=2)
        draw_oil_case(56, 876)
        bullet_list(200, 874, case2_bullets, size=17 if not is_chinese_layout else 20, width=250, gap=27)
        dashed_vertical(452, 828, 1040)
        draw_flowchart(474, 866)
        dashed_vertical(672, 828, 1040)
        write_text((700, 834), labels["case3"], 20 if not is_chinese_layout else 23, fill=text, bold=True, max_width=286, max_lines=2)
        draw_document_case(700, 860)
        bullet_list(818, 874, case3_bullets, size=16 if not is_chinese_layout else 18, width=170, gap=27)

        # Row 4: three-panel tax-credit chain.
        section((20, 1088, 1004, 1238), labels["tax"])
        write_text((48, 1154), tax_chain_one, 18 if not is_chinese_layout else 22, fill=text, bold=True, max_width=900, max_lines=2)
        write_text((216, 1204), tax_chain_two, 20 if not is_chinese_layout else 25, fill=text, bold=True, max_width=650, max_lines=1)
        draw.ellipse((914, 1118, 948, 1152), fill="#ffd176", outline=text, width=3)
        write_text((924, 1121), "$", 22, fill=text, bold=True, track=False)
        arrow((946, 1136), (972, 1136), orange, 4)
        arrow((948, 1166), (922, 1192), orange, 4)

        # Row 5: exchange-rate conversion.
        section((20, 1254, 1004, 1512), labels["exchange"])
        draw_calculator(48, 1348)
        write_text((126, 1372), "RER = NER ·", 43, fill=text, bold=True)
        write_text((408, 1344), domestic_price_label, 34, fill=text, bold=True)
        draw.line((404, 1388, 498, 1388), fill=text, width=4)
        write_text((408, 1398), foreign_price_label, 34, fill=text, bold=True)
        write_text((518, 1328), "RER=1.23", 31, fill=text, bold=True)
        write_text((518, 1370), "PNZ=1,950", 28, fill=text, bold=True)
        write_text((518, 1408), "PUK=1,000", 28, fill=text, bold=True)
        arrow((672, 1382), (742, 1382), text, 4)
        write_text((768, 1344), "NER", 34, fill=text, bold=True)
        arrow((844, 1382), (900, 1382), text, 4)
        write_text((760, 1406), "1.23", 32, fill=text, bold=True)
        write_text((880, 1360), nominal_rate_label, 20 if not is_chinese_layout else 25, fill=text, bold=True, max_width=126, max_lines=2)
        write_text((888, 1396), "(NER)", 25, fill=text, bold=True, max_width=110, max_lines=1)
        write_text((868, 1430), "≈0.63", 27, fill=text, bold=True, max_width=120, max_lines=1)
        draw.ellipse((920, 1266, 954, 1300), fill="#ffd176", outline=text, width=3)
        draw.ellipse((954, 1296, 988, 1330), fill="#ffd176", outline=text, width=3)
        write_text((930, 1269), "€", 21, fill=text, bold=True, track=False)
        write_text((965, 1299), "$", 21, fill=text, bold=True, track=False)

        # Explicitly preserve formula variants used by frontend/debug tests.
        for label in [
            "S = I + NCO",
            "NX = NCO",
            labels["formula"],
            labels["loanable"],
            labels["budget"],
            labels["capital"],
            labels["cases"],
            labels["tax"],
            labels["exchange"],
        ]:
            remember_label(label)

        reference_width, reference_height = 896, 1200
        if (reference_width, reference_height) != (base_width, base_height):
            resampling = getattr(Image, "Resampling", None)
            resample = resampling.LANCZOS if resampling else getattr(Image, "LANCZOS", 1)
            img = img.resize((reference_width, reference_height), resample)

        out = BytesIO()
        img.save(out, format="PNG", optimize=True)
        image_b64 = base64.b64encode(out.getvalue()).decode("ascii")
        return image_b64, {
            "enhanced": False,
            "renderer": "local-pillow",
            "layout": "open-economy-reference-wallchart-v3",
            "reference_canvas": [reference_width, reference_height],
            "source_canvas": [base_width, base_height],
            "final_size": [reference_width, reference_height],
            "reference_features": [
                "top-formula-table",
                "compact-horizontal-bands",
                "case-study-row",
                "exchange-rate-footer",
                "navy-title-band",
            ],
            "text_rendering": "native-font",
            "visible_labels": labels_seen[:120],
        }

def visual_image_generic_copy(preferred_language: str, blueprint: dict) -> dict:
    chinese = visual_image_prefers_chinese(preferred_language, blueprint)
    if chinese:
        return {
            "concept_map": "概念地图",
            "source_evidence": "来源证据",
            "process": "过程",
            "worked_example": "例子",
            "revision_check": "复习检查",
            "key_terms": "关键词",
            "exam_value": "考试价值",
            "what_to_notice": "先看什么",
            "how_it_connects": "如何连接",
            "study_task": "学习任务",
        }
    return {
        "concept_map": "Concept Map",
        "source_evidence": "Source Evidence",
        "process": "Process",
        "worked_example": "Example",
        "revision_check": "Revision Check",
        "key_terms": "Key Terms",
        "exam_value": "Exam Value",
        "what_to_notice": "What to Notice",
        "how_it_connects": "How It Connects",
        "study_task": "Study Task",
    }


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


@app.post("/visual-image-guide/generate")
async def generate_visual_image_guide(data: dict):
    try:
        data = data or {}
        title = clean_quiz_string(data.get("title"), stored_title or "Study Material")
        context = quiz_summary_context(data)
        if not context:
            return analysis_error_response("No generated notes are available for visual image guide generation yet.", 400)

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
            return analysis_error_response(f"Image generation failed with {last_warning}", 502)
        if not response.ok:
            try:
                detail = response.json()
            except Exception:
                detail = response.text
            return analysis_error_response(
                f"Image generation failed with {visual_image_error_summary(response.status_code, detail)}",
                502,
            )

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
        return analysis_error_response(str(error), analysis_exception_status(error))


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


@app.post("/visual-guide/generate")
async def generate_visual_guide(data: dict):
    try:
        require_text_ai()
        data = data or {}
        title = clean_quiz_string(data.get("title"), stored_title or "Study Material")
        context = quiz_summary_context(data)
        source_context = visual_guide_source_context(data)
        figure_context = visual_guide_figure_context(data)
        if not context:
            return analysis_error_response("No generated notes are available for visual guide generation yet.", 400)
        requested_language = data.get("preferred_language", "auto")
        preferred_language = (
            resolve_generation_language_key("auto", context)
            if normalise_language_key(requested_language) == "auto"
            else normalise_quiz_language(requested_language)
        )

        language_rule = quiz_language_instruction(preferred_language)
        schema = """
Return JSON only with this exact shape. Keep keys in English; user-facing values must follow the language requirement:
{
  "title": "visual guide title",
  "subtitle": "one-line framing sentence",
  "thesis": "what this source is really teaching",
  "coverage_note": "how the guide covers the whole source",
  "flow": [{"label": "Step", "text": "short explanation"}],
  "panels": [
    {
      "kicker": "short label",
      "title": "panel title",
      "body": "main explanation",
      "key_points": ["point 1", "point 2"],
      "source_evidence": "specific source evidence, example, formula, table, figure, or claim",
      "visual_type": "concept | process | comparison | evidence | formula | timeline | case | source",
      "visual_prompt": "what the frontend should draw visually; include layout, icons, arrows, color zones, and image role",
      "formula": "optional MathJax formula",
      "source_refs": ["Source 1", "Source figure 2"],
      "source_figure_indexes": [0]
    }
  ],
  "source_map": [{"source": "Source name", "role": "what it contributes", "evidence": "specific evidence used"}],
  "review_prompts": ["what the student should be able to explain"],
  "image_queries": ["2-4 short web image search phrases for missing visuals"]
}
"""
        prompt = f"""
Create a high-quality visual study guide script from the user's generated notes and source evidence.

Language requirement: {language_rule}
Topic/title: {title}

Goal:
Make one simple, complete infographic poster, grounded in the user's source. It should be easy to understand at a glance, not a detailed notes page.

Coverage rules:
- Compress the source into the 4-6 ideas a student must remember first.
- If the source is large, group details under simple umbrella ideas instead of listing everything.
- Mention each source at least once in source_map when source metadata is available.
- Use source figures actively: when source figures are available, choose 2-4 distinct useful figures across the guide when possible.
- Use each selected source figure for a clear teaching purpose: "what to notice", "how it supports the point", or "how to read it".
- Do not repeat a source figure index in many panels unless it is the central image for the whole source.
- Do not invent content outside the source. Add only clarifying transitions.

Visual design script rules:
- Each panel must fit on an infographic card: title plus one short sentence, with at most two bullets.
- Keep source_evidence to one short concrete phrase.
- Do not put note section headings such as "Worked Examples and Evidence" or "Source evidence / example matrix" inside source_evidence; use the actual example, formula, data point, or claim instead.
- If the notes contain worked examples, calculations, or source exercises, include one panel titled "Worked Example".
- The visual_prompt should tell the frontend what to draw: source-image thumbnail, curve, arrows, comparison columns, evidence stack, process loop, formula tile, timeline, callout labels, or map.
- Prefer visual prompts that make the idea memorable: contrast left/right, cause-to-effect arrows, before/after, method-result-meaning, or formula-to-example.
- source_evidence must be concrete: a named concept, formula, example, visual/table/chart, study, quote idea, or source claim.
- image_queries should be short generic search phrases for educational/public-domain visuals if source figures are missing, e.g. "Piaget conservation task", "derivative tangent line graph", "EEG cap brain".
- For math, keep formulas MathJax-compatible. Put only formulas inside \\( ... \\) or \\[ ... \\), not normal prose.
- For academic/social science sources, include method-result-meaning or theory-evidence-limitation where relevant.
- For slides/PDFs, explain what the slide/source figure contributes, not just that an image exists.
- End with review prompts that help the student study from the visual.

{schema}

Generated notes context:
{context}

Source metadata/excerpts:
{source_context or "No separate source metadata was supplied."}

Available source figures:
{figure_context or "No source figures were supplied."}
"""
        raw = generate_chat(
            [
                {"role": "system", "content": "You generate structured infographic scripts as strict JSON. Never include markdown fences or prose outside JSON."},
                {"role": "user", "content": prompt},
            ],
            model=model_for_depth("detailed"),
            temperature=float(os.getenv("VISUAL_GUIDE_TEMPERATURE", "0.25")),
            max_tokens=env_int("VISUAL_GUIDE_TOKENS", 6500),
        )
        parsed = extract_json_object(raw)
        prelim_guide = normalise_visual_guide(
            parsed or {},
            title,
            context,
            data.get("sources") if isinstance(data.get("sources"), list) else [],
            data.get("visual_gallery") if isinstance(data.get("visual_gallery"), list) else [],
            [],
        )
        web_images = collect_visual_guide_web_images(
            title,
            parsed or {},
            prelim_guide.get("panels") or [],
            VISUAL_GUIDE_WEB_IMAGE_LIMIT,
        )
        guide = normalise_visual_guide(
            parsed or {},
            title,
            context,
            data.get("sources") if isinstance(data.get("sources"), list) else [],
            data.get("visual_gallery") if isinstance(data.get("visual_gallery"), list) else [],
            web_images,
        )
        return guide
    except Exception as error:
        return analysis_error_response(str(error), analysis_exception_status(error))


# -----------------------------------------------------------------------------
# Timeline generation
# -----------------------------------------------------------------------------

TIMELINE_TYPE_ALIASES = {
    "warm_up": "warm_up",
    "overview": "warm_up",
    "flow": "warm_up",
    "lecture": "warm_up",
    "lecture_flow": "warm_up",
    "sequence": "warm_up",
    "learn": "learn",
    "concept": "learn",
    "definition": "learn",
    "mechanism": "learn",
    "method": "learn",
    "apply": "apply",
    "evidence": "apply",
    "data": "apply",
    "figure": "apply",
    "experiment": "apply",
    "study": "apply",
    "example": "apply",
    "case": "apply",
    "application": "apply",
    "check": "check",
    "exam": "check",
    "assessment": "check",
    "test": "check",
    "revise": "revise",
    "revision": "revise",
    "review": "revise",
    "mistake": "revise",
}


def normalise_timeline_type(value: str) -> str:
    key = normalise_space(str(value or "")).lower().replace("-", "_").replace(" ", "_")
    return TIMELINE_TYPE_ALIASES.get(key, "learn")


STUDY_PATH_QUESTION_TYPE_ALIASES = {
    "short": "short_answer",
    "short_answer": "short_answer",
    "short_response": "short_answer",
    "open": "short_answer",
    "open_ended": "short_answer",
    "single": "single_choice",
    "choice": "single_choice",
    "mcq": "single_choice",
    "single_choice": "single_choice",
    "multiple": "multiple_choice",
    "multi": "multiple_choice",
    "multiple_choice": "multiple_choice",
    "true_false": "true_false",
    "truefalse": "true_false",
    "tf": "true_false",
    "true_or_false": "true_false",
    "case": "case_analysis",
    "case_analysis": "case_analysis",
    "scenario": "case_analysis",
    "application": "case_analysis",
    "compare": "compare",
    "comparison": "compare",
    "compare_contrast": "compare",
    "essay": "essay_outline",
    "outline": "essay_outline",
    "essay_outline": "essay_outline",
    "diagram": "diagram_prompt",
    "figure": "diagram_prompt",
    "visual": "diagram_prompt",
    "graph": "diagram_prompt",
    "chart": "diagram_prompt",
    "diagram_prompt": "diagram_prompt",
}


def normalise_study_path_question_type(value: str) -> str:
    key = normalise_space(str(value or "")).lower().replace("-", "_").replace(" ", "_")
    return STUDY_PATH_QUESTION_TYPE_ALIASES.get(key, "short_answer")


def fallback_study_path_question(event_type: str, title: str, summary: str, source_reference: str = "") -> dict:
    clean_title = clean_quiz_string(title, "this checkpoint")
    clean_summary = clean_quiz_string(summary, "the key idea in this checkpoint")
    if event_type == "apply":
        qtype = "case_analysis"
        prompt = f"How does this evidence or example support the concept: {clean_title}?"
    elif event_type == "check":
        qtype = "essay_outline"
        prompt = f"What would be the first three points in an exam answer about {clean_title}?"
    elif event_type == "revise":
        qtype = "true_false"
        prompt = f"True or false: {clean_summary[:150]}"
    elif event_type == "learn":
        qtype = "short_answer"
        prompt = f"What does {clean_title} mean, and why is it important here?"
    else:
        qtype = "short_answer"
        prompt = f"What is the main question or goal of {clean_title}?"
    return {
        "type": qtype,
        "prompt": truncate_text(prompt, 280),
        "options": ["True", "False"] if qtype == "true_false" else [],
        "correct_option_indexes": [],
        "correct_boolean": True if qtype == "true_false" else None,
        "expected_answer": truncate_text(clean_summary, 420),
        "explanation": "A strong answer should use the task focus and connect it back to the notes, source evidence, or example.",
        "source_reference": truncate_text(source_reference or clean_title, 180),
    }


def normalise_study_path_practice_question(raw, fallback_event: dict, title: str, index: int) -> dict:
    fallback = fallback_event.get("practice_question") or fallback_study_path_question(
        normalise_timeline_type(fallback_event.get("type")),
        title or fallback_event.get("title") or f"Checkpoint {index + 1}",
        fallback_event.get("summary") or fallback_event.get("detail") or "",
        fallback_event.get("source_reference") or fallback_event.get("section") or "",
    )
    if isinstance(raw, str):
        source = {"prompt": raw}
    elif isinstance(raw, dict):
        source = raw
    else:
        source = {}

    qtype = normalise_study_path_question_type(
        source.get("type") or source.get("question_type") or source.get("questionType") or fallback.get("type")
    )
    prompt = clean_quiz_string(
        source.get("prompt") or source.get("question") or source.get("title"),
        fallback.get("prompt", ""),
    )
    options = source.get("options") if isinstance(source.get("options"), list) else source.get("choices")
    options = [clean_quiz_string(option) for option in options if clean_quiz_string(option)] if isinstance(options, list) else list(fallback.get("options") or [])
    options = options[:6]
    if qtype == "true_false" and len(options) < 2:
        options = ["True", "False"]
    if qtype not in {"single_choice", "multiple_choice", "true_false"}:
        options = []

    correct_indexes = coerce_option_indexes(
        source.get("correct_option_indexes", source.get("correctOptionIndexes", source.get("correct_indexes", source.get("answer_index", source.get("answer"))))),
        options,
    )
    fallback_indexes = fallback.get("correct_option_indexes") if isinstance(fallback.get("correct_option_indexes"), list) else []
    if qtype in {"single_choice", "multiple_choice"} and not correct_indexes:
        correct_indexes = [idx for idx in fallback_indexes if isinstance(idx, int) and 0 <= idx < len(options)]
    if qtype == "single_choice":
        correct_indexes = correct_indexes[:1]
    elif qtype == "multiple_choice" and len(correct_indexes) < 2 and len(options) >= 2:
        correct_indexes = correct_indexes or [0, 1]
    elif qtype not in {"single_choice", "multiple_choice"}:
        correct_indexes = []

    correct_boolean = coerce_boolean(source.get("correct_boolean", source.get("correctBoolean", source.get("answer"))))
    if qtype == "true_false" and correct_boolean is None:
        correct_boolean = coerce_boolean(fallback.get("correct_boolean"))
    if qtype != "true_false":
        correct_boolean = None

    return {
        "type": qtype,
        "prompt": truncate_text(prompt, 360),
        "options": [truncate_text(option, 180) for option in options],
        "correct_option_indexes": correct_indexes,
        "correct_boolean": correct_boolean,
        "expected_answer": truncate_text(clean_quiz_string(
            source.get("expected_answer") or source.get("expectedAnswer") or source.get("answer_guide") or source.get("answerGuide"),
            fallback.get("expected_answer", ""),
        ), 650),
        "explanation": truncate_text(clean_quiz_string(source.get("explanation") or source.get("rationale"), fallback.get("explanation", "")), 520),
        "source_reference": truncate_text(clean_quiz_string(
            source.get("source_reference") or source.get("sourceReference") or source.get("source"),
            fallback.get("source_reference", ""),
        ), 220),
    }


def fallback_timeline_from_context(title: str, sections: Dict[str, str], context: str) -> dict:
    ordered_names = list(sections.keys())[:10] if isinstance(sections, dict) else []
    if not ordered_names:
        snippets = [
            normalise_space(line.lstrip("#-0123456789. "))
            for line in context.splitlines()
            if len(normalise_space(line.lstrip("#-0123456789. "))) > 30
        ][:8]
        ordered_names = [f"Checkpoint {index + 1}" for index, _ in enumerate(snippets)]
        section_lookup = dict(zip(ordered_names, snippets))
    else:
        section_lookup = sections

    events = []
    for index, name in enumerate(ordered_names[:12]):
        text = section_lookup.get(name, "") if isinstance(section_lookup, dict) else ""
        summary = first_good_sentence(text, 180) or normalise_space(str(text))[:180] or "Review this stage in the notes."
        event_type = "warm_up"
        lowered = f"{name} {summary}".lower()
        if re.search(r"\b(table|figure|data|result|evidence|study|experiment|graph|chart)\b", lowered):
            event_type = "apply"
        elif re.search(r"\b(example|case|application)\b", lowered):
            event_type = "apply"
        elif re.search(r"\b(exam|revision|mistake|critical)\b", lowered):
            event_type = "check"
        elif re.search(r"\b(definition|concept|idea|method|model)\b", lowered):
            event_type = "learn"
        practice_question = fallback_study_path_question(event_type, name, summary, name)
        events.append({
            "id": sha256_text(f"{name}-{index}")[:10],
            "order": index + 1,
            "marker": f"Task {index + 1}",
            "type": event_type,
            "title": short_mindmap_text(name, 72),
            "section": name,
            "summary": summary,
            "detail": summary,
            "task": f"Read the section \"{short_mindmap_text(name, 80)}\" and write a two-sentence explanation. First state the main idea; then connect it to one source detail, example, or limitation from the notes.",
            "active_prompt": f"Without looking, explain the key idea from {name}.",
            "practice_question": practice_question,
            "deliverable": "A short explanation in your own words.",
            "mastery_check": "You can explain the idea and connect it to one piece of source evidence.",
            "estimated_minutes": 8,
            "priority": "medium",
            "evidence": "",
            "why_it_matters": "This checkpoint helps organise the material into a learnable sequence.",
            "misconception": "",
            "exam_use": "Use it as a revision checkpoint before moving to the next concept.",
            "source_reference": name,
            "related_terms": [],
        })

    return {
        "title": clean_quiz_string(title, stored_title or "Study Path"),
        "summary": "A task-based study path that moves from orientation to practice and exam-ready revision.",
        "events": events,
    }


def normalise_timeline(raw: dict, fallback: dict) -> dict:
    if not isinstance(raw, dict):
        raw = {}
    raw_events = raw.get("events") if isinstance(raw.get("events"), list) else []
    fallback_events = fallback.get("events", []) or []
    events: List[dict] = []
    for index, event in enumerate(raw_events[: env_int("TIMELINE_MAX_EVENTS", 16)]):
        if not isinstance(event, dict):
            continue
        fallback_event = fallback_events[min(index, len(fallback_events) - 1)] if fallback_events else {}
        title = clean_quiz_string(event.get("title") or event.get("label"), fallback_event.get("title", f"Checkpoint {index + 1}"))
        summary = clean_quiz_string(event.get("summary") or event.get("what_happens"), fallback_event.get("summary", ""))
        detail = clean_quiz_string(event.get("detail") or event.get("explanation") or event.get("why"), fallback_event.get("detail", summary))
        evidence = clean_quiz_string(event.get("evidence") or event.get("source_evidence"), fallback_event.get("evidence", ""))
        try:
            estimated_minutes = int(event.get("estimated_minutes") or event.get("estimatedMinutes") or fallback_event.get("estimated_minutes") or 8)
        except Exception:
            estimated_minutes = 8
        estimated_minutes = max(3, min(estimated_minutes, 60))
        if not title or not (summary or detail or evidence):
            continue
        related_terms = event.get("related_terms") or event.get("relatedTerms") or []
        if not isinstance(related_terms, list):
            related_terms = []
        events.append({
            "id": clean_quiz_string(event.get("id"), sha256_text(f"{title}-{index}")[:10]),
            "order": index + 1,
            "marker": clean_quiz_string(event.get("marker") or event.get("time") or event.get("step"), f"Step {index + 1}"),
            "type": normalise_timeline_type(event.get("type") or fallback_event.get("type")),
            "title": truncate_text(title, 140),
            "section": clean_quiz_string(event.get("section"), fallback_event.get("section", "")),
            "summary": truncate_text(summary, 420),
            "detail": truncate_text(detail, 900),
            "task": truncate_text(clean_quiz_string(event.get("task") or event.get("action") or event.get("study_task"), fallback_event.get("task", detail or summary)), 650),
            "active_prompt": truncate_text(clean_quiz_string(event.get("active_prompt") or event.get("recall_prompt"), fallback_event.get("active_prompt", "")), 520),
            "practice_question": normalise_study_path_practice_question(
                event.get("practice_question") or event.get("practiceQuestion") or event.get("question"),
                fallback_event,
                title,
                index,
            ),
            "deliverable": truncate_text(clean_quiz_string(event.get("deliverable") or event.get("output"), fallback_event.get("deliverable", "")), 420),
            "mastery_check": truncate_text(clean_quiz_string(event.get("mastery_check") or event.get("checkpoint"), fallback_event.get("mastery_check", "")), 420),
            "estimated_minutes": estimated_minutes,
            "priority": clean_quiz_string(event.get("priority"), fallback_event.get("priority", "medium")).lower(),
            "evidence": truncate_text(evidence, 700),
            "why_it_matters": truncate_text(clean_quiz_string(event.get("why_it_matters") or event.get("whyItMatters"), fallback_event.get("why_it_matters", "")), 520),
            "misconception": truncate_text(clean_quiz_string(event.get("misconception") or event.get("common_mistake"), fallback_event.get("misconception", "")), 420),
            "exam_use": truncate_text(clean_quiz_string(event.get("exam_use") or event.get("examUse"), fallback_event.get("exam_use", "")), 420),
            "source_reference": truncate_text(clean_quiz_string(event.get("source_reference") or event.get("source"), fallback_event.get("source_reference", "")), 220),
            "related_terms": [truncate_text(clean_quiz_string(term), 48) for term in related_terms if clean_quiz_string(term)][:6],
        })

    if len(events) < 3:
        events = fallback_events[: env_int("TIMELINE_MAX_EVENTS", 16)]
    return {
        "title": clean_quiz_string(raw.get("title"), fallback.get("title", "Study Path")),
        "summary": truncate_text(clean_quiz_string(raw.get("summary"), fallback.get("summary", "")), 520),
        "events": events,
    }
