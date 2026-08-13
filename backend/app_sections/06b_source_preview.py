

def generate_individual_source_digest(index: int, unit: dict, language_rule: str) -> str:
    """v20: create a deep source card from text AND screenshots.

    Important change: if text extraction is weak but visuals exist, we still send
    the screenshots to the model and require a visual-led source card. This fixes
    PPT/PDF sources that previously appeared as 'Readable text was limited'.
    """
    excerpt_limit = env_int("MULTISOURCE_SOURCE_CARD_CHARS", 180000)
    excerpt = source_unit_text_excerpt(unit, limit=excerpt_limit)
    title = unit.get("title_candidate") or unit.get("display_name") or f"Source {index}"
    min_units = source_card_min_units(unit)
    visual_parts = source_unit_visual_parts(unit, MAX_VISUAL_IMAGES_PER_SOURCE)
    has_visuals = bool(visual_parts)

    if (not excerpt or len(excerpt) < 120) and not has_visuals:
        safe_title = title or f"Source {index}"
        return (
            f"### Source {index}: {safe_title}\n\n"
            f"#### Extraction status\nReadable text and usable visuals were limited for this source. "
            f"Use the filename/title cautiously and regenerate after providing a text-readable PDF/PPT export if possible.\n\n"
            f"#### Revision use\nTreat this source as low-confidence evidence until more text or visuals are available."
        )

    prompt = f"""
You are generating a DEEP professor-style source card for Source {index}.

Language requirement: {language_rule}
Never translate the product name Synapse.

This source card will be placed into a multi-source study guide. It must be detailed enough that a student can revise this source without reopening the original file.

Source identity:
- Source number: {index}
- Display name: {unit.get('display_name')}
- Title/topic: {title}
- Extracted text length: {len(excerpt)} characters
- Screenshot / image evidence count available to you: {v20_visual_parts_count(unit)}

Visual candidates extracted from this source:
{v20_source_visual_brief(unit)}

Reference style to imitate structurally:
{REFERENCE_STYLE_PROFILE}

Return markdown using this architecture. Localise headings into the selected language, but keep the academic depth:

### Source {index}: specific readable lecture/source title

#### Opening frame / central question
Identify the main question/problem this source is teaching. Make it specific, not generic.

#### Source structure / lecture flow
Walk through the source in order. Use actual slide/page titles, sections, cases, diagrams, tables, formulas, examples, or study sequence. If the source is a lecture, write it like detailed lecture notes.

#### Key concepts and definitions
Create a concept table. For each concept: definition, simple explanation, where it appears in this source, why it matters.

#### Important studies / examples / cases / calculations
For every important study/example/case/calculation, use:
- **Question:**
- **Method / process:**
- **Result / answer:**
- **Meaning:**
- **Exam use:**

#### Source images inside the concept notes
If screenshots/images are attached, explain useful diagrams/tables/graphs/slides inside the relevant concept, study, or example note. Do not create a standalone visual section.

#### What this source uniquely contributes
Explain the distinctive role of this source in the whole source pack: theory, evidence, method, case, mechanism, counterpoint, application, visual explanation, etc.

#### Connections to other sources in the pack
Predict explicit links to other sources. Use connection verbs: supports, extends, contrasts, complicates, applies, provides mechanism for, provides evidence for.

#### Common misunderstandings
Name realistic student mistakes and correct them. Make them source-specific.

#### Exam / revision use
Give revision priorities, likely question types, and what a high-scoring answer should include.

Depth rules:
- Do not output a basic summary.
- Use named researchers, theories, studies, examples, diagrams, slide titles, data tables, formulas, cases, and page/slide flow whenever visible.
- If the source is visual-heavy, use the screenshots as primary evidence.
- Minimum expected richness: {min_units} readable units.

Extracted text excerpt:
{truncate_text(excerpt, excerpt_limit) if excerpt else '[Text extraction was limited. Use the attached screenshots/images as the main evidence.]'}
"""

    def call(prompt_text: str, tokens: int) -> str:
        user_content = [{"type": "text", "text": prompt_text}] + visual_parts if visual_parts else prompt_text
        return generate_chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ], model=model_for_depth("comprehensive"), temperature=0, max_tokens=tokens).strip()

    try:
        digest = call(prompt, MULTISOURCE_SOURCE_DIGEST_TOKENS)
        if digest and not is_refusal_or_useless_response(digest) and count_readable_units(digest) >= min_units:
            return digest

        repair_prompt = prompt + f"""

The previous source card was too short or too generic.
Rewrite it as a substantially deeper professor note.
Repair requirements:
- Keep the selected output language.
- If screenshots are attached, explain at least 3 visible slides/pages/images where possible.
- Add specific connection predictions to other sources.
- Add source-specific exam/revision guidance.
- Do not apologise and do not say the source is inaccessible if screenshots or text are present.
- Minimum readable units: {min_units}.
"""
        repaired = call(repair_prompt, max(MULTISOURCE_SOURCE_DIGEST_TOKENS, env_int("MULTISOURCE_SOURCE_REPAIR_TOKENS", 11000)))
        if repaired and not is_refusal_or_useless_response(repaired):
            # Return repaired even if slightly below threshold. A concrete but shorter card
            # is better than hiding source evidence behind a generic fallback.
            if count_readable_units(repaired) >= max(800, int(min_units * 0.55)):
                return repaired
        raise RuntimeError("source card was too short")
    except Exception:
        safe_excerpt = truncate_text(excerpt or "", env_int("MULTISOURCE_FALLBACK_EXCERPT_CHARS", 16000))
        visual_note = v20_source_visual_brief(unit, 10)
        return (
            f"### Source {index}: {title}\n\n"
            f"#### Preserved source evidence\n{safe_excerpt if safe_excerpt else 'Text extraction was limited.'}\n\n"
            f"#### Extracted visual evidence available\n{visual_note}\n\n"
            f"#### Revision use\nUse this preserved evidence and visual list when connecting this source to the rest of the uploaded pack."
        )
def visual_argument_markdown(cards: List[dict], preferred_language: str) -> str:
    labels = worldclass_language_labels(preferred_language)
    if not cards:
        return ""
    chunks = [f"{labels['visual_heading']}\n\n{labels['visual_intro']}"]
    for i, card in enumerate(cards):
        chunks.append(
            f"### {labels['visual_card_title']} {i + 1}: {card.get('title', '')}\n\n"
            f"[[VISUAL:{i}]]\n\n"
            f"**{labels['source_label']}:** Source {card.get('source_index', '')} — {card.get('source_title', '')} ({card.get('location', '')})\n\n"
            f"**{labels['what_shows']}:** {card.get('what_shows', '')}\n\n"
            f"**{labels['argument']}:** {card.get('argument_supported', '')}\n\n"
            f"**{labels['connection']}:** {card.get('cross_source_connection', '')}\n\n"
            f"**{labels['how_to_read']}:** {card.get('how_to_read', '')}\n\n"
            f"**{labels['exam_use']}:** {card.get('exam_use', '')}"
        )
    return "\n\n".join(chunks).strip()


def generate_connection_points_block(source_digest_block: str, source_units: List[dict], preferred_language: str, visual_cards: Optional[List[dict]] = None) -> str:
    """v20: produce actual source-to-source connection points, not advice.

    Earlier outputs said things like 'look for repeated terms'. This function now
    forces concrete source roles, evidence, visual argument links, and source-by-
    source contribution tables.
    """
    if len(source_units or []) < 2 or not source_digest_block:
        return ""
    labels = worldclass_language_labels(preferred_language)
    language_rule = language_instruction_for(preferred_language)
    source_list = "\n".join(
        f"Source {i}: {u.get('title_candidate') or u.get('display_name')}"
        for i, u in enumerate(source_units, start=1)
    )
    visual_context = "\n".join(
        f"Visual {i+1}: Source {c.get('source_index')} {c.get('location')} — {c.get('title')} — argument: {c.get('argument_supported')} — connection: {c.get('cross_source_connection')}"
        for i, c in enumerate(visual_cards or [])
    )

    prompt = f"""
You are writing the CENTRAL section of Synapse: explicit cross-source connection points.

Language requirement: {language_rule}
Never translate Synapse.

Sources:
{source_list}

Detailed source cards:
{truncate_text(source_digest_block, env_int('MULTISOURCE_DIGEST_CONTEXT_CHARS', 420000))}

Visual evidence cards available:
{visual_context if visual_context else 'No visual cards available.'}

Your task is NOT to give advice about finding connections. Your task is to actually identify and explain the real connections.

Write a deep connection map with at least {env_int('MULTISOURCE_REQUIRED_CONNECTION_POINTS', 7)} major connection points if the source pack supports it.

For EACH connection point, use this exact architecture:

### Connection Point X: specific conceptual title

**Core question:** What bigger course question does this connection answer?

**Shared idea:** Explain the idea in professor-level detail.

**Source-by-source contribution table:**
| Source | What it contributes | How it connects | Specific evidence | Useful source image |
|---|---|---|---|---|

**Agreement / extension / tension:** Explain whether sources agree, extend one another, contrast, or complicate the topic.

**Image-supported explanation:** If a source screenshot/slide/table/diagram supports this connection, explain it directly as part of the concept. Do not create a separate visual section.

**Why it matters:** Explain why this connection changes the student's understanding.

**Exam / assignment use:** Give a sentence frame or answer strategy using multiple sources.

Quality rules:
- Every connection point must mention at least two sources.
- Across the section, every uploaded source should appear at least once unless it has no readable text or usable source screenshot.
- Use names, theories, studies, cases, formulas, page/slide visuals, tables, diagrams, examples, or sections from the source cards.
- Do not write generic lines such as 'these sources all discuss psychology'.
- Prefer specific relationships: Source A provides mechanism; Source B provides evolutionary explanation; Source C provides developmental evidence; Source D provides method/measurement; Source E provides an image-supported example.
- If a source has limited readable text, connect it through visible screenshots, slide titles, or filename/title, and label uncertainty.
"""

    def call_connection(p: str, tokens: int) -> str:
        return generate_chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": p},
        ], model=model_for_depth("comprehensive"), temperature=0, max_tokens=tokens).strip()

    try:
        result = call_connection(prompt, max(MULTISOURCE_CONNECTION_TOKENS, env_int("MULTISOURCE_CONNECTION_TOKENS", 16000)))
        if result and not is_refusal_or_useless_response(result):
            units = count_readable_units(result)
            has_tables = result.count("|") >= 20
            has_connections = len(re.findall(r"Connection Point|连接点|連接點|共同|connection", result, flags=re.I)) >= 3
            if units >= env_int("MULTISOURCE_CONNECTION_MIN_UNITS", 3200) and (has_tables or has_connections):
                result = re.sub(r"(?m)^#{1,4}\s*" + re.escape(labels["connection_heading"].lstrip("# ")) + r"\s*$", "", result).strip()
                return f"{labels['connection_heading']}\n\n{labels['connection_intro']}\n\n{result}"

            repair_prompt = prompt + f"""

The previous connection map was too shallow or too short.
Rewrite with MORE SPECIFIC SOURCE-TO-SOURCE CONNECTIONS.
Mandatory repair:
- Do not explain how to find connections; write the connections themselves.
- Add source-by-source contribution tables.
- Use visual evidence cards where relevant.
- Mention every usable source at least once.
- Add at least 7 concrete connection points if possible.
"""
            repaired = call_connection(repair_prompt, max(MULTISOURCE_CONNECTION_TOKENS, env_int("MULTISOURCE_CONNECTION_REPAIR_TOKENS", 18000)))
            if repaired and not is_refusal_or_useless_response(repaired):
                repaired = re.sub(r"(?m)^#{1,4}\s*" + re.escape(labels["connection_heading"].lstrip("# ")) + r"\s*$", "", repaired).strip()
                return f"{labels['connection_heading']}\n\n{labels['connection_intro']}\n\n{repaired}"
    except Exception:
        pass

    # Deterministic but concrete fallback: source list + visual evidence list. This
    # is not as strong as the LLM connection map, but it avoids generic empty prose.
    visual_rows = "\n".join(
        f"| Visual {i+1} | Source {c.get('source_index')} | {c.get('location')} | {c.get('title')} | {c.get('argument_supported')} |"
        for i, c in enumerate(visual_cards or [])
    ) or "| No visual card | - | - | - | - |"
    fallback = f"""
### Connection Point 1: Source roles across the uploaded pack

**Core question:** What does each source contribute to the larger learning problem?

| Source | Likely role | How to connect it | Evidence basis |
|---|---|---|---|
"""
    for i, u in enumerate(source_units or [], start=1):
        title = u.get('title_candidate') or u.get('display_name') or f'Source {i}'
        visual_status = f"{v20_visual_parts_count(u)} extracted visuals" if v20_source_has_visuals(u) else "text/title evidence only"
        fallback += f"| Source {i} | {title} | Connect this source to repeated concepts, methods, examples, and visuals identified in the source card. | {visual_status} |\n"
    fallback += f"""

### Extracted visual evidence that should be used for arguments

| Visual | Source | Location | Visual title | Argument supported |
|---|---|---|---|---|
{visual_rows}
"""
    return f"{labels['connection_heading']}\n\n{labels['connection_intro']}\n\n{fallback.strip()}"


def assemble_worldclass_multisource_output(source_digest_block: str, connection_block: str, visual_block: str, synthesis: str, preferred_language: str) -> str:
    """v20 order: source notes -> visual evidence -> connection points -> synthesis."""
    labels = worldclass_language_labels(preferred_language)
    parts = [
        labels["guide_title"],
        labels["intro"],
        labels["source_heading"],
        source_digest_block.strip(),
    ]
    if visual_block:
        parts.append(visual_block.strip())
    if connection_block:
        parts.append(connection_block.strip())
    clean_synthesis = synthesis.strip()
    clean_synthesis = re.sub(r"(?m)^#\s+.*Integrated Study Guide.*$", "", clean_synthesis).strip()
    if clean_synthesis:
        parts.append(f"{labels['synthesis_heading']}\n\n{clean_synthesis}")
    return "\n\n".join(part for part in parts if part).strip()
# -----------------------------------------------------------------------------
# This layer reduces unnecessary API cost WITHOUT reducing study-guide depth.
# It does not minify the final user-facing notes. It only optimises:
#   1) internal model prompts, especially stable system prompts;
#   2) internal JSON outputs such as mind-map JSON and visual-card JSON;
#   3) cache storage / network payload size;
#   4) observability of token usage.
# Final generated content remains readable and detailed.

TOKEN_OPTIMIZATION_ENABLED = (os.getenv("ENABLE_TOKEN_OPTIMIZATION", "true").lower() not in {"0", "false", "no"})
COMPACT_SYSTEM_PROMPTS = (os.getenv("COMPACT_SYSTEM_PROMPTS", "true").lower() not in {"0", "false", "no"})
MINIFY_MODEL_JSON = (os.getenv("MINIFY_MODEL_JSON", "true").lower() not in {"0", "false", "no"})
MINIFY_CACHE_JSON = (os.getenv("MINIFY_CACHE_JSON", "true").lower() not in {"0", "false", "no"})
LOG_TOKEN_USAGE = (os.getenv("LOG_TOKEN_USAGE", "true").lower() not in {"0", "false", "no"})
ADD_JSON_MINIFY_HINT = (os.getenv("ADD_JSON_MINIFY_HINT", "true").lower() not in {"0", "false", "no"})

TOKEN_USAGE_WINDOW: List[dict] = []
TOKEN_USAGE_WINDOW_LIMIT = env_int("TOKEN_USAGE_WINDOW_LIMIT", 60)

_JSON_MINIFY_RULE = (
    "When the required output is JSON, return ONLY valid minified JSON on one line: "
    "no markdown fences, no comments, no indentation, no unnecessary whitespace. "
    "Use compact keys only when the schema already allows them."
)


def _v21_is_json_task(messages: List[dict]) -> bool:
    """Detect internal JSON-generation tasks so we can add a minified-JSON rule.

    We intentionally do not apply this to normal study-guide generation because
    user-facing content must remain readable.
    """
    try:
        combined = "\n".join(str(m.get("content", "")) for m in messages if isinstance(m, dict))
    except Exception:
        return False
    lowered = combined.lower()
    return (
        "strict json" in lowered
        or "valid json" in lowered
        or "json object" in lowered
        or "return json" in lowered
        or "mind map json" in lowered
        or "visual evidence card" in lowered and '"title"' in combined
    )


def _v21_compact_instruction_text(text: str) -> str:
    """Compact only instruction text, not source excerpts.

    This removes repeated blank lines and extra spaces from stable instructions,
    which helps exact-prefix prompt caching and reduces input tokens. It avoids
    rewriting mathematical/source content by applying mostly to system messages.
    """
    if not text or not TOKEN_OPTIMIZATION_ENABLED or not COMPACT_SYSTEM_PROMPTS:
        return text
    text = str(text).replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _v21_compact_message_content(content):
    """Compact system strings and text parts while preserving images.

    Multimodal image parts are passed through unchanged. User text containing
    long source excerpts is preserved more carefully; only excessive blank lines
    are trimmed to avoid damaging slide structure.
    """
    if isinstance(content, str):
        return _v21_compact_instruction_text(content)
    if isinstance(content, list):
        new_parts = []
        for part in content:
            if not isinstance(part, dict):
                new_parts.append(part)
                continue
            if part.get("type") == "text":
                value = str(part.get("text", ""))
                value = value.replace("\r\n", "\n").replace("\r", "\n")
                # Preserve source/slide line breaks, but remove very excessive gaps.
                value = re.sub(r"\n{4,}", "\n\n", value).strip()
                new_part = {**part, "text": value}
                new_parts.append(new_part)
            else:
                new_parts.append(part)
        return new_parts
    return content


def _v21_optimise_messages(messages: List[dict]) -> List[dict]:
    if not TOKEN_OPTIMIZATION_ENABLED:
        return messages
    optimised = []
    for message in messages:
        if not isinstance(message, dict):
            optimised.append(message)
            continue
        role = message.get("role")
        content = message.get("content")
        # Compact system/developer prompts aggressively. Preserve user sources more.
        if role in {"system", "developer"}:
            content = _v21_compact_message_content(content)
        elif isinstance(content, list):
            content = _v21_compact_message_content(content)
        elif isinstance(content, str):
            content = re.sub(r"\n{4,}", "\n\n", content).strip()
        optimised.append({**message, "content": content})

    if MINIFY_MODEL_JSON and ADD_JSON_MINIFY_HINT and _v21_is_json_task(optimised):
        # Put the rule at the beginning so it can benefit from prompt caching.
        optimised = [{"role": "system", "content": _JSON_MINIFY_RULE}] + optimised
    return optimised


def _v21_record_usage(response, model_name: str, purpose: str = "chat") -> None:
    if not LOG_TOKEN_USAGE:
        return
    try:
        usage = getattr(response, "usage", None)
        if usage is None:
            return
        item = {
            "ts": int(time.time()),
            "purpose": purpose,
            "model": model_name,
            "prompt_tokens": getattr(usage, "prompt_tokens", None),
            "completion_tokens": getattr(usage, "completion_tokens", None),
            "total_tokens": getattr(usage, "total_tokens", None),
        }
        TOKEN_USAGE_WINDOW.append(item)
        del TOKEN_USAGE_WINDOW[:-TOKEN_USAGE_WINDOW_LIMIT]
        logger.info(
            "Token usage: model=%s prompt=%s completion=%s total=%s",
            model_name,
            item["prompt_tokens"],
            item["completion_tokens"],
            item["total_tokens"],
        )
    except Exception:
        return


def _v21_selected_model(primary_model: str) -> str:
    """Return only the selected provider's requested model; retries stay local."""
    provider_model = chat_model_for_active_provider() if "chat_model_for_active_provider" in globals() else CHAT_MODEL
    return normalise_space(primary_model or provider_model) or provider_model


def _v21_is_payload_compatibility_error(message: str) -> bool:
    return any(term in message for term in ("temperature", "max_tokens", "max_completion_tokens"))


from contextvars import ContextVar


AI_CALL_TRACE: ContextVar[Optional[List[dict]]] = ContextVar("AI_CALL_TRACE", default=None)


def begin_ai_call_trace():
    return AI_CALL_TRACE.set([])


def reset_ai_call_trace(token) -> None:
    if token is not None:
        AI_CALL_TRACE.reset(token)


def current_ai_call_trace() -> List[dict]:
    trace = AI_CALL_TRACE.get()
    if isinstance(trace, list):
        return list(trace)
    return []


def _sanitize_ai_error(error: Exception | str, max_chars: int = 280) -> str:
    message = str(error or "")
    message = re.sub(r"sk-[A-Za-z0-9_-]+", "sk-...", message)
    message = re.sub(r"AIza[0-9A-Za-z_-]+", "AIza...", message)
    message = re.sub(r"ya29\\.[0-9A-Za-z._-]+", "ya29...", message)
    return truncate_text(normalise_space(message), max_chars)
