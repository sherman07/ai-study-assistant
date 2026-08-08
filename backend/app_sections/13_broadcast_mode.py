BROADCAST_TONE_LABELS = {
    "calm_study_narrator": "Calm study narrator",
    "exam_preparation_coach": "Exam preparation coach",
    "natural_podcast_style": "Natural podcast style",
    "deep_explanation_mode": "Deep explanation mode",
    "quick_revision_mode": "Quick revision mode",
}

BROADCAST_SPEAKER_INSTRUCTIONS = (
    "Speak in a calm, natural educational broadcast style. Sound warm, confident, "
    "and clear. Use a medium speaking speed. Add slight pauses between sections. "
    "Emphasise key concepts naturally. Do not sound robotic, dramatic, or like reading a list."
)
BROADCAST_SCRIPT_PROMPT_VERSION = "broadcast-script-v3"


def clean_broadcast_string(value, fallback: str = "") -> str:
    return normalise_space(str(value or "")) or fallback


def normalise_broadcast_tone(value: str = "") -> str:
    tone = clean_broadcast_string(value).lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "study_podcast": "natural_podcast_style",
        "exam_revision": "exam_preparation_coach",
        "deep_explanation": "deep_explanation_mode",
        "quick_recap": "quick_revision_mode",
        "calm": "calm_study_narrator",
        "podcast": "natural_podcast_style",
    }
    tone = aliases.get(tone, tone)
    return tone if tone in BROADCAST_TONE_LABELS else "calm_study_narrator"


def broadcast_context_sections(payload: dict) -> str:
    sections_payload = payload.get("sections") if isinstance(payload.get("sections"), dict) else {}
    rows = []
    for heading, content in list(sections_payload.items())[:24]:
        heading_text = clean_broadcast_string(heading, "Section")
        if isinstance(content, (dict, list)):
            body = json.dumps(content, ensure_ascii=False)
        else:
            body = str(content or "")
        body = re.sub(r"\[\[VISUAL:\d+\]\]", "[source image referenced in notes]", body)
        body = truncate_text(normalise_space(body), 1800)
        if body:
            rows.append(f"## {heading_text}\n{body}")
    return "\n\n".join(rows)


def broadcast_study_tool_context(payload: dict) -> str:
    tools = payload.get("studyTools") if isinstance(payload.get("studyTools"), dict) else {}
    rows = []

    flashcards = tools.get("flashcards")
    if isinstance(flashcards, list) and flashcards:
        card_rows = []
        for card in flashcards[:18]:
            if isinstance(card, dict):
                front = clean_broadcast_string(card.get("front") or card.get("question"))
                back = clean_broadcast_string(card.get("back") or card.get("answer"))
                if front or back:
                    card_rows.append(f"- {front}: {back}")
        if card_rows:
            rows.append("Flashcards already generated:\n" + "\n".join(card_rows))

    quiz = tools.get("quiz")
    questions = quiz.get("questions") if isinstance(quiz, dict) else []
    if isinstance(questions, list) and questions:
        question_rows = []
        for question in questions[:14]:
            if isinstance(question, dict):
                prompt = clean_broadcast_string(question.get("question") or question.get("prompt"))
                answer = clean_broadcast_string(question.get("expected_answer") or question.get("explanation") or question.get("answer"))
                if prompt:
                    question_rows.append(f"- {prompt} Answer guide: {answer}")
        if question_rows:
            rows.append("Quiz/exam material already generated:\n" + "\n".join(question_rows))

    timeline = tools.get("timeline")
    events = timeline.get("events") if isinstance(timeline, dict) else []
    if isinstance(events, list) and events:
        event_rows = []
        for event in events[:12]:
            if isinstance(event, dict):
                title = clean_broadcast_string(event.get("title") or event.get("marker"))
                task = clean_broadcast_string(event.get("task") or event.get("summary") or event.get("why_it_matters"))
                misconception = clean_broadcast_string(event.get("misconception") or event.get("exam_use"))
                if title or task:
                    event_rows.append(f"- {title}: {task} {misconception}".strip())
        if event_rows:
            rows.append("Study path already generated:\n" + "\n".join(event_rows))

    mind_map = tools.get("mindMap") or tools.get("mind_map")
    branches = mind_map.get("branches") if isinstance(mind_map, dict) else []
    if isinstance(branches, list) and branches:
        branch_rows = []
        for branch in branches[:14]:
            if isinstance(branch, dict):
                title = clean_broadcast_string(branch.get("title") or branch.get("label") or branch.get("text"))
                detail = clean_broadcast_string(branch.get("summary") or branch.get("detail") or branch.get("description"))
                if title:
                    branch_rows.append(f"- {title}: {detail}")
        if branch_rows:
            rows.append("Mind map already generated:\n" + "\n".join(branch_rows))

    visual_gallery = tools.get("visualGallery") or tools.get("visual_gallery")
    if isinstance(visual_gallery, list) and visual_gallery:
        visual_rows = []
        for visual in visual_gallery[:10]:
            if isinstance(visual, dict):
                title = clean_broadcast_string(visual.get("title") or visual.get("caption") or visual.get("label"))
                evidence = clean_broadcast_string(visual.get("what_shows") or visual.get("argument_supported") or visual.get("description"))
                if title or evidence:
                    visual_rows.append(f"- {title}: {evidence}")
        if visual_rows:
            rows.append("Source figures / visual evidence:\n" + "\n".join(visual_rows))

    return "\n\n".join(rows)


def build_broadcast_context(payload: dict) -> str:
    summary = str(payload.get("summary") or "").strip()
    sections_text = broadcast_context_sections(payload)
    tools_text = broadcast_study_tool_context(payload)
    sources = payload.get("sources") if isinstance(payload.get("sources"), list) else []
    source_rows = []
    for index, source in enumerate(sources[:10], start=1):
        if not isinstance(source, dict):
            continue
        title = clean_broadcast_string(source.get("title") or source.get("name") or source.get("display_name") or f"Source {index}")
        excerpt = clean_broadcast_string(source.get("text_excerpt") or source.get("content") or source.get("summary"))
        source_rows.append(f"Source {index}: {title}. {truncate_text(excerpt, 700)}")
    combined = "\n\n".join(part for part in [
        f"Generated study notes summary:\n{summary}" if summary else "",
        f"Generated note sections:\n{sections_text}" if sections_text else "",
        f"Generated study tools:\n{tools_text}" if tools_text else "",
        f"Source references:\n" + "\n".join(source_rows) if source_rows else "",
    ] if part).strip()
    combined = re.sub(r"\n{3,}", "\n\n", combined)
    return truncate_text(combined, env_int("BROADCAST_CONTEXT_CHARS", 60000))


def broadcast_seconds_to_label(seconds: int) -> str:
    safe_seconds = max(0, int(seconds or 0))
    return f"{safe_seconds // 60}:{str(safe_seconds % 60).zfill(2)}"


def estimate_broadcast_seconds(text: str) -> int:
    words = re.findall(r"\S+", text or "")
    return max(45, int(len(words) / 145 * 60))


def build_broadcast_realtime_instructions(
    *,
    title: str,
    script: str,
    speaker_instructions: str,
    sections: List[dict],
    start_seconds: int = 0,
    rate: str = "1x",
) -> str:
    start_seconds = max(0, int(start_seconds or 0))
    section_lines = []
    for section in sections[:10]:
        if not isinstance(section, dict):
            continue
        section_start = int(float(section.get("start") or 0))
        section_title = clean_broadcast_string(section.get("title"), "Section")
        if section_start >= start_seconds:
            section_lines.append(f"- {broadcast_seconds_to_label(section_start)} {section_title}")
    section_outline = "\n".join(section_lines) or "Start from the beginning."
    return f"""
You are Synapse AI Broadcast, a high-quality realtime educational speaker.

The browser will provide the exact generated broadcast text in each response request. Treat that text as the source of truth: speak it naturally as an educational explanation, without unsupported additions or a robotic read-aloud.

Voice style:
{speaker_instructions}

Realtime speaking rules:
- Use the configured OpenAI realtime voice for all audio output.
- Sound warm, calm, clear, and confident.
- Use a medium pace; the user's selected pace is {clean_broadcast_string(rate, "1x")}.
- Add slight pauses between sections.
- Emphasise key concepts naturally.
- Do not sound dramatic, synthetic, or like reading a list.
- If the script contains two hosts, make turns feel distinct through phrasing and rhythm while using the same configured voice.
- Start at or just after {broadcast_seconds_to_label(start_seconds)}.

Section navigation from this start point:
{section_outline}

Broadcast title:
{clean_broadcast_string(title, "Synapse Broadcast")}
""".strip()


def broadcast_realtime_provider_error_message(response) -> str:
    text = getattr(response, "text", "") or ""
    try:
        data = response.json()
    except Exception:
        data = {}
    detail = ""
    if isinstance(data, dict):
        error = data.get("error")
        if isinstance(error, dict):
            detail = clean_broadcast_string(error.get("message") or error.get("code") or error.get("type"))
        else:
            detail = clean_broadcast_string(error)
    if not detail:
        detail = truncate_text(clean_broadcast_string(text), 280)
    status_code = int(getattr(response, "status_code", 0) or 0)
    if status_code == 401:
        return "OpenAI rejected the realtime request. Check OPENAI_API_KEY, then restart the backend."
    if status_code == 403:
        return "OpenAI Realtime access is not enabled for this API key or project."
    if status_code == 404:
        return f"OpenAI could not find realtime model {BROADCAST_REALTIME_MODEL}. Check BROADCAST_REALTIME_MODEL."
    return detail or "OpenAI Realtime could not start the Broadcast speaker."


def split_broadcast_script_for_tts(script: str, limit: int = BROADCAST_TTS_INPUT_CHAR_LIMIT) -> List[str]:
    clean_script = str(script or "").strip()
    if not clean_script:
        return []
    limit = max(1200, int(limit or BROADCAST_TTS_INPUT_CHAR_LIMIT))
    paragraphs = [part.strip() for part in re.split(r"\n{2,}", clean_script) if part.strip()]
    chunks = []
    current = ""
    for paragraph in paragraphs:
        if len(paragraph) > limit:
            sentences = re.split(r"(?<=[.!?。！？])\s+", paragraph)
            for sentence in sentences:
                if not sentence.strip():
                    continue
                if current and len(current) + len(sentence) + 2 > limit:
                    chunks.append(current.strip())
                    current = ""
                current = f"{current}\n\n{sentence}".strip()
            continue
        if current and len(current) + len(paragraph) + 2 > limit:
            chunks.append(current.strip())
            current = paragraph
        else:
            current = f"{current}\n\n{paragraph}".strip()
    if current.strip():
        chunks.append(current.strip())
    return chunks


def normalise_broadcast_section(raw: dict, index: int, default_start: int) -> dict:
    text = clean_broadcast_string(raw.get("text") if isinstance(raw, dict) else "")
    title = clean_broadcast_string(raw.get("title") if isinstance(raw, dict) else "", f"Section {index + 1}")
    section_id = clean_broadcast_string(raw.get("id") if isinstance(raw, dict) else "", re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_") or f"section_{index + 1}")
    start = raw.get("start") if isinstance(raw, dict) else default_start
    try:
        start = int(float(start))
    except Exception:
        start = default_start
    return {
        "id": section_id[:64],
        "title": truncate_text(title, 80),
        "start": max(0, start),
        "speaker": clean_broadcast_string(raw.get("speaker") if isinstance(raw, dict) else "", "Narrator"),
        "text": truncate_text(text, 3600),
        "sourceReference": truncate_text(clean_broadcast_string(raw.get("sourceReference") or raw.get("source_reference") if isinstance(raw, dict) else ""), 220),
    }


def fallback_broadcast_sections(title: str, context: str, tone: str) -> List[dict]:
    snippets = [
        normalise_space(line.lstrip("#-*0123456789. "))
        for line in str(context or "").splitlines()
        if len(normalise_space(line.lstrip("#-*0123456789. "))) > 45
    ][:10]
    main = snippets[0] if snippets else f"the generated Synapse notes for {title}"
    second = snippets[1] if len(snippets) > 1 else main
    third = snippets[2] if len(snippets) > 2 else second
    return [
        {"id": "opening", "title": "Opening", "start": 0, "speaker": "Narrator", "text": f"Today we are going to make {title} feel easier to hold in your head. The goal is not to reread every line. The goal is to understand the logic behind the notes."},
        {"id": "big_picture", "title": "Big picture", "start": 32, "speaker": "Narrator", "text": f"Here is the big picture. {truncate_text(main, 520)} So the first thing to notice is the problem this material is trying to solve, and why that problem matters for the rest of the topic."},
        {"id": "core_ideas", "title": "Core ideas", "start": 92, "speaker": "Narrator", "text": f"Now here are the core ideas. First, {truncate_text(second, 420)} Next, connect that to this point: {truncate_text(third, 420)} The important move is to explain the relationship, not just name the terms."},
        {"id": "deeper_understanding", "title": "Deeper understanding", "start": 166, "speaker": "Narrator", "text": "So why does this matter? Because strong understanding means you can move from definition, to example, to consequence. When a question changes its wording, you still know what the concept is doing."},
        {"id": "common_mistakes", "title": "Common mistakes", "start": 226, "speaker": "Narrator", "text": "The common mistake is treating the heading as the answer. A better answer explains the mechanism, gives the relevant example, and names the evidence or reasoning that supports it."},
        {"id": "quick_recap", "title": "Quick recap", "start": 276, "speaker": "Narrator", "text": "Quick recap. Start with the big idea, break it into the core mechanisms, connect each mechanism to an example, and finish by checking the mistake you are most likely to make."},
    ]


def normalise_broadcast_package(raw: dict, *, title: str, context: str, tone: str) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    sections_raw = raw.get("sections") if isinstance(raw.get("sections"), list) else []
    sections = []
    start = 0
    for index, section in enumerate(sections_raw[:10]):
        if not isinstance(section, dict):
            continue
        normalised = normalise_broadcast_section(section, index, start)
        if not normalised["text"]:
            continue
        sections.append(normalised)
        start = normalised["start"] + max(24, int(len(normalised["text"].split()) / 145 * 60))
    if len(sections) < 4:
        sections = fallback_broadcast_sections(title, context, tone)

    script = clean_broadcast_string(raw.get("broadcastScript") or raw.get("script"))
    if not script:
        script = "\n\n".join(f"{section['title']}\n{section['text']}" for section in sections)

    seconds = estimate_broadcast_seconds(script)
    key_moments = raw.get("keyMoments") if isinstance(raw.get("keyMoments"), list) else []
    moments = []
    for index, moment in enumerate(key_moments[:10]):
        if not isinstance(moment, dict):
            continue
        moments.append({
            "start": max(0, int(float(moment.get("start") or sections[min(index, len(sections) - 1)]["start"]))),
            "title": truncate_text(clean_broadcast_string(moment.get("title"), sections[min(index, len(sections) - 1)]["title"]), 80),
            "summary": truncate_text(clean_broadcast_string(moment.get("summary") or moment.get("text")), 180),
        })
    if not moments:
        moments = [{"start": section["start"], "title": section["title"], "summary": truncate_text(section["text"], 160)} for section in sections]

    checks = raw.get("qualityChecks") if isinstance(raw.get("qualityChecks"), dict) else {}
    checks = {
        "usesActualGeneratedContent": bool(checks.get("usesActualGeneratedContent", True)),
        "avoidsGenericTopicOnly": bool(checks.get("avoidsGenericTopicOnly", True)),
        "soundsNaturalWhenSpoken": bool(checks.get("soundsNaturalWhenSpoken", True)),
        "usefulForStudent": bool(checks.get("usefulForStudent", True)),
        "explainsInsteadOfOnlySummarising": bool(checks.get("explainsInsteadOfOnlySummarising", True)),
        "hasClearStructureAndTransitions": bool(checks.get("hasClearStructureAndTransitions", True)),
    }

    return {
        "broadcastTitle": truncate_text(clean_broadcast_string(raw.get("broadcastTitle") or raw.get("title"), f"{title} Broadcast"), 140),
        "broadcastScript": script,
        "speakerInstructions": clean_broadcast_string(raw.get("speakerInstructions"), BROADCAST_SPEAKER_INSTRUCTIONS),
        "estimatedDuration": clean_broadcast_string(raw.get("estimatedDuration"), broadcast_seconds_to_label(seconds)),
        "estimatedSeconds": seconds,
        "sections": sections,
        "keyMoments": moments,
        "qualityChecks": checks,
        "scriptModel": BROADCAST_SCRIPT_MODEL,
        "ttsProvider": BROADCAST_TTS_PROVIDER,
        "ttsModel": BROADCAST_TTS_MODEL,
        "realtimeProvider": "openai-realtime",
        "realtimeModel": BROADCAST_REALTIME_MODEL,
        "realtimeVoice": REALTIME_VOICE,
    }


def broadcast_source_term_hit_ratio(context: str, script: str) -> float:
    terms = []
    for match in re.findall(r"\b[A-Z][A-Za-z0-9'’-]{3,}(?:\s+[A-Z][A-Za-z0-9'’-]{2,}){0,4}\b", context or ""):
        value = normalise_space(match).lower()
        if value not in terms and len(value) > 4:
            terms.append(value)
        if len(terms) >= 30:
            break
    if not terms:
        return 1.0
    script_lower = (script or "").lower()
    hits = sum(1 for term in terms if term in script_lower)
    return hits / max(1, min(len(terms), 12))


def tts_response_to_bytes(response) -> bytes:
    if hasattr(response, "read"):
        return response.read()
    if hasattr(response, "content"):
        return response.content
    if isinstance(response, bytes):
        return response
    return bytes(response)


def generate_openai_tts_bytes(script: str, instructions: str) -> Tuple[bytes, List[dict]]:
    require_openai_api()
    chunks = split_broadcast_script_for_tts(script)
    if not chunks:
        raise RuntimeError("Broadcast script is empty.")
    audio_parts = []
    chunk_meta = []
    for index, chunk in enumerate(chunks, start=1):
        kwargs = {
            "model": BROADCAST_TTS_MODEL,
            "voice": BROADCAST_TTS_VOICE,
            "input": chunk,
            "response_format": "mp3",
        }
        if instructions:
            kwargs["instructions"] = instructions
        response = client.audio.speech.create(**kwargs)
        audio_bytes = tts_response_to_bytes(response)
        if not audio_bytes:
            raise RuntimeError("OpenAI TTS returned an empty audio chunk.")
        audio_parts.append(audio_bytes)
        chunk_meta.append({"index": index, "chars": len(chunk)})
    return b"".join(audio_parts), chunk_meta


@app.post("/broadcast/generate")
async def generate_broadcast_mode(data: dict, request: Request):
    provider_token = None
    try:
        payload = data or {}
        title = clean_broadcast_string(payload.get("title"), "Generated Study Notes")
        context = build_broadcast_context(payload)
        if len(context) < 300:
            return analysis_error_response("No generated Synapse content is available for Broadcast Mode yet.", 400)
        authorization = request.headers.get("authorization") or request.headers.get("Authorization") or ""
        # Prefer OpenAI for broadcast quality when the plan allows it; free plans clamp to DeepSeek.
        provider_token, _resolution = select_request_text_provider(
            "openai",
            authorization=authorization,
        )
        require_text_ai()
        tone = normalise_broadcast_tone(payload.get("tone") or payload.get("style"))
        tone_label = BROADCAST_TONE_LABELS[tone]
        length_minutes = max(1, min(20, int(float(payload.get("lengthMinutes") or payload.get("length_minutes") or 5))))
        language_rule = language_instruction_for(payload.get("language") or payload.get("preferred_language") or "auto")
        logger.info("broadcast_generate_started title=%s tone=%s context_chars=%s", title[:80], tone, len(context))

        prompt = f"""
Create a high-quality AI Broadcast script from the generated Synapse content below.
{language_rule}

Broadcast tone: {tone_label}
Target length: about {length_minutes} minutes.
Current generated content title: {title}

This is Broadcast Mode. It must consume Synapse's already generated notes, examples, concepts, summaries, quiz material, mind map material, study path material, flashcards, and source evidence when present.

Rules:
- Use the actual generated content as the main knowledge source.
- Do not create a generic podcast about only the topic name.
- Do not invent outside facts, researchers, dates, studies, examples, or claims unless clearly labelled as extra explanation.
- Do not read the notes word-for-word. Transform them into spoken teaching.
- Explain why ideas matter, how they connect, and what students often misunderstand.
- Sound calm, warm, confident, natural, and useful for a student.
- Use spoken language with short and medium sentences.
- Use transitions such as "First", "Now here is the important part", "So why does this matter?", "Let's connect this back", and "The easiest way to think about this is..."
- Avoid bullet-list reading and repeated phrasing.

Return JSON only with this exact shape:
{{
  "broadcastTitle": "short specific title",
  "broadcastScript": "full spoken script with section headings and natural paragraph breaks",
  "speakerInstructions": "{BROADCAST_SPEAKER_INSTRUCTIONS}",
  "estimatedDuration": "m:ss",
  "sections": [
    {{
      "id": "opening",
      "title": "Opening",
      "start": 0,
      "speaker": "Narrator",
      "text": "spoken section text",
      "sourceReference": "specific generated section, quiz item, flashcard, source figure, or concept used"
    }},
    {{
      "id": "big_picture",
      "title": "Big picture",
      "start": 30,
      "speaker": "Narrator",
      "text": "spoken section text",
      "sourceReference": "..."
    }},
    {{
      "id": "core_ideas",
      "title": "Core ideas",
      "start": 90,
      "speaker": "Narrator",
      "text": "spoken section text",
      "sourceReference": "..."
    }},
    {{
      "id": "deeper_understanding",
      "title": "Deeper understanding",
      "start": 170,
      "speaker": "Narrator",
      "text": "spoken section text",
      "sourceReference": "..."
    }},
    {{
      "id": "common_mistakes",
      "title": "Common mistakes",
      "start": 240,
      "speaker": "Narrator",
      "text": "spoken section text",
      "sourceReference": "..."
    }},
    {{
      "id": "quick_recap",
      "title": "Quick recap",
      "start": 300,
      "speaker": "Narrator",
      "text": "spoken section text",
      "sourceReference": "..."
    }}
  ],
  "keyMoments": [
    {{"start": 0, "title": "Opening", "summary": "what the student will understand"}}
  ],
  "qualityChecks": {{
    "usesActualGeneratedContent": true,
    "avoidsGenericTopicOnly": true,
    "soundsNaturalWhenSpoken": true,
    "usefulForStudent": true,
    "explainsInsteadOfOnlySummarising": true,
    "hasClearStructureAndTransitions": true
  }}
}}

Generated Synapse content package:
{context}
"""
        raw = generate_chat(
            [
                {"role": "system", "content": "You are Synapse Broadcast Mode: a source-grounded educational AI speaker. Return strict JSON only."},
                {"role": "user", "content": prompt},
            ],
            model=BROADCAST_SCRIPT_MODEL,
            temperature=float(os.getenv("BROADCAST_SCRIPT_TEMPERATURE", "0.35")),
            max_tokens=env_int("BROADCAST_SCRIPT_TOKENS", 6500),
        )
        parsed = extract_json_object(raw)
        package = normalise_broadcast_package(parsed or {}, title=title, context=context, tone=tone)
        hit_ratio = broadcast_source_term_hit_ratio(context, package["broadcastScript"])
        if hit_ratio < 0.08:
            package["qualityChecks"]["usesActualGeneratedContent"] = False
            package["qualityChecks"]["avoidsGenericTopicOnly"] = False
            logger.warning("broadcast_low_source_overlap title=%s ratio=%.3f", title[:80], hit_ratio)
        package["tone"] = tone
        package["toneLabel"] = tone_label
        package["sourceFingerprint"] = clean_broadcast_string(payload.get("sourceFingerprint") or payload.get("source_fingerprint"))
        package["generatedAt"] = utc_timestamp("microseconds")
        package["promptVersion"] = BROADCAST_SCRIPT_PROMPT_VERSION
        package["scriptMetadata"] = {
            "model": BROADCAST_SCRIPT_MODEL,
            "promptVersion": BROADCAST_SCRIPT_PROMPT_VERSION,
            "sourceGrounded": True,
            "sourceContextChars": len(context),
            "generatedAt": package["generatedAt"],
            "sourceFingerprint": package["sourceFingerprint"],
        }
        logger.info("broadcast_generate_completed title=%s sections=%s duration=%s", title[:80], len(package["sections"]), package["estimatedDuration"])
        return package
    except Exception as error:
        logger.exception("broadcast_generate_failed")
        return analysis_error_response(str(error), analysis_exception_status(error))
    finally:
        if provider_token is not None:
            reset_request_text_provider(provider_token)


@app.post("/broadcast/tts")
async def generate_broadcast_tts(data: dict):
    try:
        payload = data or {}
        if BROADCAST_TTS_PROVIDER != "openai":
            return analysis_error_response("Broadcast TTS is configured for OpenAI gpt-4o-mini-tts. Set BROADCAST_TTS_PROVIDER=openai and restart the backend.", 500)
        script = clean_broadcast_string(payload.get("broadcastScript") or payload.get("script"))
        if not script and isinstance(payload.get("sections"), list):
            script = "\n\n".join(
                clean_broadcast_string(section.get("text"))
                for section in payload.get("sections")
                if isinstance(section, dict) and clean_broadcast_string(section.get("text"))
            )
        if not script:
            return analysis_error_response("Broadcast script is empty.", 400)
        instructions = clean_broadcast_string(payload.get("speakerInstructions"), BROADCAST_SPEAKER_INSTRUCTIONS)
        logger.info("broadcast_tts_started chars=%s model=%s voice=%s", len(script), BROADCAST_TTS_MODEL, BROADCAST_TTS_VOICE)
        audio_bytes, chunks = await asyncio.to_thread(generate_openai_tts_bytes, script, instructions)
        audio_dir = RUNTIME_ASSETS_DIR / "broadcast_audio"
        audio_dir.mkdir(parents=True, exist_ok=True)
        digest = sha256_text(f"{script}\n{instructions}\n{BROADCAST_TTS_MODEL}\n{BROADCAST_TTS_VOICE}")[:24]
        audio_path = audio_dir / f"{digest}.mp3"
        audio_path.write_bytes(audio_bytes)
        audio_url = f"{PUBLIC_BACKEND_BASE_URL}/assets/broadcast_audio/{audio_path.name}"
        logger.info("broadcast_tts_completed bytes=%s chunks=%s", len(audio_bytes), len(chunks))
        return {
            "audioUrl": audio_url,
            "audioMetadata": {
                "provider": BROADCAST_TTS_PROVIDER,
                "model": BROADCAST_TTS_MODEL,
                "voice": BROADCAST_TTS_VOICE,
                "chunks": chunks,
                "bytes": len(audio_bytes),
                "speakerInstructions": instructions,
            },
        }
    except Exception as error:
        logger.exception("broadcast_tts_failed")
        return analysis_error_response(str(error), analysis_exception_status(error))


@app.post("/broadcast/realtime-call")
async def broadcast_realtime_call(
    sdp: str = Form(...),
    title: str = Form(default=""),
    broadcast_script: str = Form(default=""),
    speaker_instructions: str = Form(default=""),
    sections: str = Form(default="[]"),
    # Browser elapsed positions are fractional seconds. Accept them at the API
    # boundary and normalize below so a seek/resume never fails FastAPI
    # validation before the OpenAI request is attempted.
    start_seconds: float = Form(default=0),
    rate: str = Form(default="1x"),
):
    try:
        script = clean_broadcast_string(broadcast_script)
        if not script:
            return Response(
                content=json.dumps({"error": "No broadcast script was provided. Generate the broadcast before pressing Play."}),
                media_type="application/json",
                status_code=400,
            )
        require_openai_api()
        try:
            parsed_sections = json.loads(sections or "[]")
        except Exception:
            parsed_sections = []
        if not isinstance(parsed_sections, list):
            parsed_sections = []
        safe_start_seconds = max(0, int(float(start_seconds or 0)))
        instructions = build_broadcast_realtime_instructions(
            title=title,
            script=script,
            speaker_instructions=clean_broadcast_string(speaker_instructions, BROADCAST_SPEAKER_INSTRUCTIONS),
            sections=parsed_sections,
            start_seconds=safe_start_seconds,
            rate=rate,
        )
        session_config = {
            "type": "realtime",
            "model": BROADCAST_REALTIME_MODEL,
            "output_modalities": ["audio"],
            "instructions": instructions,
            "audio": {
                "output": {"voice": REALTIME_VOICE},
                "input": {
                    "turn_detection": {
                        "type": "server_vad",
                        "create_response": False,
                        "interrupt_response": False,
                    },
                },
            },
        }
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        if OPENAI_ORG_ID:
            headers["OpenAI-Organization"] = OPENAI_ORG_ID
        if OPENAI_PROJECT_ID:
            headers["OpenAI-Project"] = OPENAI_PROJECT_ID
        logger.info(
            "broadcast_realtime_call_started title=%s model=%s voice=%s chars=%s start=%s",
            title[:80],
            session_config["model"],
            REALTIME_VOICE,
            len(script),
            safe_start_seconds,
        )
        response = requests.post(
            "https://api.openai.com/v1/realtime/calls",
            headers=headers,
            files={
                # The Realtime WebRTC endpoint expects an SDP offer plus a
                # JSON session part. Explicit types match OpenAI's contract.
                "sdp": ("offer.sdp", sdp, "application/sdp"),
                "session": ("session.json", json.dumps(session_config), "application/json"),
            },
            timeout=30,
        )
        if response.status_code >= 400:
            logger.warning(
                "broadcast_realtime_call_failed status=%s body=%s",
                response.status_code,
                truncate_text(response.text or "", 500),
            )
            return Response(
                content=json.dumps({
                    "error": broadcast_realtime_provider_error_message(response),
                    "status": response.status_code,
                }),
                media_type="application/json",
                status_code=response.status_code,
            )
        logger.info("broadcast_realtime_call_ready title=%s", title[:80])
        return Response(
            content=response.text,
            media_type="application/sdp",
            headers={"Cache-Control": "no-store"},
        )
    except Exception as error:
        logger.exception("broadcast_realtime_call_exception")
        return Response(
            content=json.dumps({"error": str(error)}),
            media_type="application/json",
            status_code=analysis_exception_status(error),
        )
