"""Pure, bounded contracts for the grounded Learning Companion."""

from urllib.parse import urlparse


MAX_COMPANION_SOURCES = 6
MAX_COMPANION_SOURCE_EXCERPT_CHARS = 6000
MAX_COMPANION_SOURCE_TOTAL_CHARS = 24000
MAX_COMPANION_LIST_ENTRIES = 8
MAX_COMPANION_TEXT_CHARS = 180
MAX_COMPANION_RESEARCH_SOURCES = 6

ALLOWED_TURN_MODES = {
    "direct_answer", "source_answer", "discover_outcome", "recommend_path",
    "teach", "practice", "hint", "reflect", "review", "session_summary",
}
ALLOWED_EVIDENCE_MODES = {"tutor", "materials", "research"}
_STATES = {"diagnose", "teach", "practice", "hint", "review", "mastered"}
_LEVELS = {"unclear", "beginner", "developing", "secure", "strong"}
_EXERCISE_TYPES = {"short_answer", "explain", "example", "compare", "apply", "correct_mistake"}


def clean_text(value: object, limit: int = MAX_COMPANION_TEXT_CHARS) -> str:
    text = " ".join(str(value if value is not None else "").split())
    return text[:max(0, limit)]


def safe_http_url(value: object) -> str:
    if not isinstance(value, str) or any(character.isspace() for character in value):
        return ""
    url = clean_text(value, 2048)
    try:
        parsed = urlparse(url)
    except ValueError:
        return ""
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    try:
        if not parsed.hostname or parsed.port is not None and not 0 < parsed.port < 65536:
            return ""
    except ValueError:
        return ""
    return url


def _bounded_text_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [clean_text(item) for item in value[:MAX_COMPANION_LIST_ENTRIES] if clean_text(item)]


def _bounded_int(value: object, default: int = 0, low: int = 0, high: int = 480) -> int:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        number = default
    return max(low, min(high, number))


def _safe_bool(value: object) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _bounded_research_sources(value: object) -> list[dict]:
    items = value if isinstance(value, list) else []
    sources = []
    total = 0
    for item in items:
        if not isinstance(item, dict) or len(sources) >= MAX_COMPANION_RESEARCH_SOURCES:
            continue
        text = clean_text(item.get("text") or item.get("excerpt"), MAX_COMPANION_SOURCE_EXCERPT_CHARS)
        text = text[:max(0, MAX_COMPANION_SOURCE_TOTAL_CHARS - total)]
        if not text:
            break
        total += len(text)
        sources.append({"title": clean_text(item.get("title")), "url": safe_http_url(item.get("url")), "text": text})
    return sources


def normalise_learning_context(value: object) -> dict:
    raw = value if isinstance(value, dict) else {}
    context = {
        "topic": clean_text(raw.get("topic")),
        "goal": clean_text(raw.get("goal")),
        "deadline": clean_text(raw.get("deadline")),
        "permanent_daily_minutes": _bounded_int(raw.get("permanent_daily_minutes")),
        "student_level": clean_text(raw.get("student_level"), 40).lower() or "unclear",
        "current_level_id": clean_text(raw.get("current_level_id")),
        "current_session": clean_text(raw.get("current_session")),
        "active_subskill": clean_text(raw.get("active_subskill")),
        "misconceptions": _bounded_text_list(raw.get("misconceptions")),
        "review_candidates": _bounded_text_list(raw.get("review_candidates")),
        "selected_source_ids": _bounded_text_list(raw.get("selected_source_ids")),
        "source_fingerprint": clean_text(raw.get("source_fingerprint")),
        "path_levels": _bounded_text_list(raw.get("path_levels")),
    }
    if context["student_level"] not in _LEVELS:
        context["student_level"] = "unclear"
    return context


def normalise_companion_source_bundle(value: object) -> dict:
    raw = value if isinstance(value, dict) else {}
    total = 0
    sources = []
    items = raw.get("sources") if isinstance(raw.get("sources"), list) else []
    for item in items:
        if not isinstance(item, dict) or len(sources) >= MAX_COMPANION_SOURCES:
            continue
        source_id = clean_text(item.get("id"))
        title = clean_text(item.get("title"))
        excerpt = clean_text(item.get("excerpt"), MAX_COMPANION_SOURCE_EXCERPT_CHARS)
        if not source_id or not title or not excerpt:
            continue
        excerpt = excerpt[:max(0, MAX_COMPANION_SOURCE_TOTAL_CHARS - total)]
        if not excerpt:
            break
        total += len(excerpt)
        sources.append({"id": source_id, "title": title, "url": safe_http_url(item.get("url")), "excerpt": excerpt})
    return {"fingerprint": clean_text(raw.get("fingerprint")), "sources": sources}


def _normalise_exercise(value: object, next_prompt: str) -> dict:
    raw = value if isinstance(value, dict) else {}
    exercise_type = clean_text(raw.get("type"), 40).lower() or "short_answer"
    if exercise_type not in _EXERCISE_TYPES:
        exercise_type = "short_answer"
    return {
        "type": exercise_type,
        "question": clean_text(raw.get("question")) or next_prompt,
        "expected_answer": clean_text(raw.get("expected_answer"), 1000),
    }


def _normalise_path_update(value: object) -> dict:
    if not isinstance(value, dict):
        return {}
    path = {}
    for field in ("title", "status", "current_level_id", "next_level_id", "next_session"):
        text = clean_text(value.get(field))
        if text:
            path[field] = text
    for field, limit in (("summary", MAX_COMPANION_TEXT_CHARS), ("total_hours", 80)):
        text = clean_text(value.get(field), limit)
        if text:
            path[field] = text
    completed = _bounded_text_list(value.get("completed_level_ids"))
    if completed:
        path["completed_level_ids"] = completed
    levels = []
    raw_levels = value.get("levels") if isinstance(value.get("levels"), list) else []
    for item in raw_levels[:MAX_COMPANION_LIST_ENTRIES]:
        if not isinstance(item, dict):
            continue
        level = {}
        for field in ("id", "title", "objective", "status", "graduation", "hours"):
            text = clean_text(item.get(field))
            if text:
                level[field] = text
        subskills = _bounded_text_list(item.get("subskills"))
        if subskills:
            level["subskills"] = subskills
        if level:
            levels.append(level)
    if levels:
        path["levels"] = levels
    return path


def normalise_companion_decision(
    parsed, fallback_reply, message, history, prior_context, source_bundle, research_sources
) -> dict:
    is_valid_model_response = isinstance(parsed, dict)
    raw = parsed if is_valid_model_response else {}
    bundle = normalise_companion_source_bundle(source_bundle)
    context_raw = dict(prior_context) if is_valid_model_response and isinstance(prior_context, dict) else {}
    if is_valid_model_response and isinstance(raw.get("learning_context"), dict):
        context_raw.update(raw["learning_context"])
    context = normalise_learning_context(context_raw)
    state = clean_text(raw.get("state"), 40).lower().replace("-", "_")
    if state not in _STATES:
        state = "diagnose"
    mastery = _bounded_int(raw.get("mastery"), high=100)
    can_end = _safe_bool(raw.get("can_end")) or state == "mastered" or mastery >= 88
    if can_end and mastery >= 85:
        state = "mastered"
    next_prompt = clean_text(raw.get("next_prompt"))
    if state != "mastered" and not next_prompt:
        next_prompt = "Answer the next question in your own words."
    evidence_mode = clean_text(raw.get("evidence_mode"), 40).lower()
    if evidence_mode not in ALLOWED_EVIDENCE_MODES:
        evidence_mode = "tutor"
    research_items = _bounded_research_sources(research_sources)
    research_ids = {f"web:{index}" for index, item in enumerate(research_items, 1) if isinstance(item, dict)}
    allowed_ids = {
        "materials": {item["id"] for item in bundle["sources"]},
        "research": research_ids,
        "tutor": set(),
    }[evidence_mode]
    citations = []
    seen_citation_ids = set()
    for item in raw.get("citations") if isinstance(raw.get("citations"), list) else []:
        if not isinstance(item, dict):
            continue
        source_id = clean_text(item.get("source_id"))
        if source_id in seen_citation_ids or source_id not in allowed_ids or source_id.startswith("web:") and source_id not in research_ids:
            continue
        if len(citations) >= MAX_COMPANION_LIST_ENTRIES:
            break
        seen_citation_ids.add(source_id)
        if source_id.startswith("web:"):
            index = int(source_id.split(":", 1)[1]) - 1
            source = research_items[index]
            citations.append({"source_id": source_id, "label": clean_text(item.get("label") or source.get("title")), "url": safe_http_url(item.get("url") or source.get("url"))})
        else:
            source = next(source for source in bundle["sources"] if source["id"] == source_id)
            citations.append({"source_id": source_id, "label": clean_text(item.get("label") or source["title"]), "url": safe_http_url(item.get("url") or source["url"])})
    turn_mode = clean_text(raw.get("turn_mode"), 40).lower().replace("-", "_")
    if turn_mode not in ALLOWED_TURN_MODES:
        turn_mode = "direct_answer"
    return {
        "transcript": clean_text(message, 1400),
        "reply": clean_text(raw.get("reply")) or clean_text(fallback_reply) or "Tell me what you understand so far, and I will guide you from there.",
        "state": state,
        "mastery": mastery,
        "student_level": context["student_level"],
        "diagnosis": clean_text(raw.get("diagnosis")),
        "next_prompt": "" if state == "mastered" else next_prompt,
        "hint": clean_text(raw.get("hint")),
        "exercise": _normalise_exercise(raw.get("exercise"), next_prompt),
        "can_end": can_end,
        "suggested_actions": _bounded_text_list(raw.get("suggested_actions"))[:4] or ["Give me a hint", "Ask a simpler question", "Give me another example"],
        "turn_count": len(history) + (1 if message else 0) if isinstance(history, list) else (1 if message else 0),
        "turn_mode": turn_mode,
        "evidence_mode": evidence_mode,
        "learning_context": context,
        "path_update": _normalise_path_update(raw.get("path_update")) if is_valid_model_response else {},
        "citations": citations if evidence_mode != "tutor" else [],
    }


COMPANION_EVIDENCE_BLOCK = """Evidence rules:
- Use tutor knowledge for ordinary free chat.
- In materials mode, use only supplied material excerpts; do not fill gaps from memory.
- In research mode, use only retrieved web text for current claims; do not invent citations.
"""
COMPANION_ROUTING_BLOCK = """Turn-routing rules:
- Route free-chat messages directly to the learner's latest question.
- A recommended path is a lifecycle: propose it, let the learner choose or revise it, then track progress.
- One-question active practice: ask one question at a time.
- Correct errors directly, briefly, and explain the smallest useful correction.
"""
COMPANION_ADAPTIVE_BLOCK = """Adaptive-teaching rules:
- Keep the learner's topic and goal in context, diagnose one observable subskill, and give one next action.
- Preserve useful context across turns and update the path only when the learner's evidence supports it.
"""
COMPANION_JSON_BLOCK = '''Return JSON only with exactly these fields: "reply", "state", "mastery", "student_level", "diagnosis", "next_prompt", "hint", "exercise", "can_end", "suggested_actions", "turn_mode", "evidence_mode", "learning_context", "path_update", "citations".'''


def build_companion_prompt_blocks(
    message="", history=None, prior_context=None, source_bundle=None, research_sources=None,
    evidence_mode="tutor", turn_mode="direct_answer", learning_context=None,
) -> str:
    bundle = normalise_companion_source_bundle(source_bundle)
    material_text = "\n".join(f"[{item['id']}] {item['title']}: {item['excerpt']}" for item in bundle["sources"])
    bounded_research_sources = _bounded_research_sources(research_sources)
    web_text = "\n".join(
        f"[web:{index}] {clean_text(item.get('title'))}: {clean_text(item.get('text') or item.get('excerpt'), 6000)}"
        for index, item in enumerate(bounded_research_sources, 1)
    )
    evidence = material_text if evidence_mode == "materials" else web_text if evidence_mode == "research" else "No external evidence supplied."
    bounded_history = [item for item in (history or []) if isinstance(item, dict)][-MAX_COMPANION_LIST_ENTRIES:]
    history_text = "\n".join(
        f"{clean_text(item.get('role'), 20)}: {clean_text(item.get('text') or item.get('content'), MAX_COMPANION_TEXT_CHARS)}"
        for item in bounded_history
    ) or "No previous turns."
    return "\n\n".join([
        COMPANION_EVIDENCE_BLOCK,
        COMPANION_ROUTING_BLOCK,
        COMPANION_ADAPTIVE_BLOCK,
        f"Turn mode: {clean_text(turn_mode, 40)}\nLearner message: {clean_text(message, 1400)}\nHistory:\n{history_text}\nLearning context: {normalise_learning_context(learning_context or prior_context)}\nEvidence:\n{evidence}",
        COMPANION_JSON_BLOCK,
    ])
