

@app.post("/broadcast/generate")
async def generate_broadcast_mode(data: dict):
    provider_token = None
    try:
        payload = data or {}
        title = clean_broadcast_string(payload.get("title"), "Generated Study Notes")
        context = build_broadcast_context(payload)
        if len(context) < 300:
            return analysis_error_response("No generated Synapse content is available for Broadcast Mode yet.", 400)
        provider_token = set_request_text_provider("openai")
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
