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
