

def normalise_voice_tutor_json(parsed: dict, fallback_reply: str, transcript: str, history: List[dict]) -> dict:
    if not isinstance(parsed, dict):
        parsed = {}
    try:
        mastery = int(float(parsed.get("mastery", 0)))
    except Exception:
        mastery = 0
    mastery = max(0, min(100, mastery))
    state = normalise_space(str(parsed.get("state") or "diagnose")).lower().replace("-", "_")
    if state not in {"diagnose", "teach", "practice", "hint", "review", "mastered"}:
        state = "diagnose"
    reply = normalise_space(str(parsed.get("reply") or fallback_reply or "Tell me what you understand so far, and I will guide you from there."))
    next_prompt = normalise_space(str(parsed.get("next_prompt") or ""))
    if state != "mastered" and not next_prompt:
        next_prompt = "Answer the next question in your own words."
    exercise = parsed.get("exercise") if isinstance(parsed.get("exercise"), dict) else {}
    exercise = {
        "type": normalise_space(str(exercise.get("type") or "short_answer")),
        "question": normalise_space(str(exercise.get("question") or next_prompt)),
        "expected_answer": normalise_space(str(exercise.get("expected_answer") or "")),
    }
    suggestions = parsed.get("suggested_actions") if isinstance(parsed.get("suggested_actions"), list) else []
    suggestions = [normalise_space(str(item)) for item in suggestions if normalise_space(str(item))][:4]
    if not suggestions:
        suggestions = ["Give me a hint", "Ask a simpler question", "Give me another example"]
        if state == "mastered" or mastery >= 85:
            suggestions.append("End session")
    can_end = bool(parsed.get("can_end")) or state == "mastered" or mastery >= 88
    return {
        "transcript": transcript,
        "reply": reply,
        "state": "mastered" if can_end and mastery >= 85 else state,
        "mastery": mastery,
        "student_level": normalise_space(str(parsed.get("student_level") or "unclear")),
        "diagnosis": normalise_space(str(parsed.get("diagnosis") or "")),
        "next_prompt": "" if can_end and mastery >= 85 else next_prompt,
        "hint": normalise_space(str(parsed.get("hint") or "")),
        "exercise": exercise,
        "can_end": can_end,
        "suggested_actions": suggestions,
        "turn_count": len(history) + (1 if transcript else 0),
    }


def realtime_tutor_instructions(
    title: str,
    note_summary: str,
    section_context: str,
    topic_title: str,
    topic_context: str,
    topic_scope: str,
    history: List[dict],
    preferred_language: str,
    source_identity: str,
) -> str:
    focused_topic = normalise_space(topic_title) or normalise_space(title) or "current study topic"
    focused_context = str(topic_context or "").strip() or str(section_context or "").strip()
    language_source_text = focused_context or note_summary or section_context
    resolved_language_key = resolve_generation_language_key(preferred_language, language_source_text)
    language_name = target_language_name(resolved_language_key)
    different_script_warning = (
        "If the transcript is a very short word in Chinese, Japanese, Korean, Arabic, or another writing system, "
        "treat it as a likely speech-recognition mistake. Ask the learner to repeat in English or type it."
        if resolved_language_key == "english" else
        "If a very short transcript appears in a different writing system from the lesson language, treat it as a likely speech-recognition mistake and ask the learner to repeat or type it."
    )
    recent_history = "\n".join(
        f"{turn.get('role', 'user')}: {normalise_space(str(turn.get('text', '')))}"
        for turn in history[-10:]
    ) or "No prior voice tutor turns."
    broader_note_context = truncate_text(note_summary, 2800 if focused_context else VOICE_TUTOR_REALTIME_CONTEXT_CHARS)
    return f"""
You are Synapse Realtime Voice Tutor, a live speech-to-speech academic tutor.

Voice persona:
- Sound like a young adult female academic tutor in a modern chat app.
- Warm, natural, gentle, curious, encouraging, and conversational.
- Use a light smile in the voice and small natural pauses.
- Do not sound like a narrator, audiobook reader, news anchor, customer-service bot, or corporate assistant.
- Avoid long monologues. Speak in short, human turns.

Language:
- Speak in {language_name}.
- Keep the session in {language_name}. Only switch languages if the learner gives a clear full sentence in another language.
- Do not switch languages because of one short anomalous transcript.
- {different_script_warning}
- Never translate the product name Synapse.

Current note:
Title: {normalise_space(title) or 'current study topic'}
Primary source identity: {source_identity or 'current uploaded material'}

Current focused topic:
Topic title: {focused_topic}
Topic scope: {normalise_space(topic_scope) or 'current visible generated topic'}
Topic context:
{truncate_text(focused_context, 6500) if focused_context else 'No focused topic was sent. Use the note overview carefully.'}

Opening line:
- On the first assistant turn of the live session, start exactly with: "Hi, I'm your Synapse tutor for {focused_topic}. We'll build this step by step."

Small broader-note guardrail:
{broader_note_context}

Conversation memory:
{recent_history}

Strict scope rule:
- Treat the Current focused topic as the primary lesson scope.
- Answer about this topic only. Use the broader-note guardrail only for one-sentence connections if helpful.
- Never ask what subject, course, material, or topic the learner is working on. You already know the focused topic above.
- If the learner says "I have no idea", "I don't know", "I'm lost", or gives a very short answer, start teaching the focused topic directly from basics. Do not ask them to pick a subject.
- If the learner asks something outside this generated topic, briefly say it is outside the current topic and bring them back to this topic.
- Do not lecture through the whole note unless the current topic is the whole note overview.
- Every assistant turn must end with exactly one clear next step: a short question, a prompt for the learner to continue explaining, or a mini-example for them to try. Never end a tutoring turn with only a statement.

Adaptive tutoring loop:
1. Start the session with the exact opening line above, then ask the learner what they already understand about that exact topic. Do not ask for the subject.
2. Listen to the learner's explanation and diagnose gaps.
3. Ask exactly one focused question or mini-example at a time.
4. If the learner is stuck or wrong, give a gentle hint or micro-lesson, then ask a simpler question.
5. If the learner is doing well, ask a transfer/application question using the uploaded source material.
6. Only end when the learner shows stable understanding across definition, source evidence/example, and application.
7. Do not say they have mastered it just because they say they are done.

When useful, mention the source evidence naturally, but do not read long notes aloud. Be interactive.
""".strip()


@app.post("/voice-tutor/realtime-call")
async def voice_tutor_realtime_call(
    sdp: str = Form(...),
    history: str = Form(default="[]"),
    title: str = Form(default=""),
    summary: str = Form(default=""),
    sections: str = Form(default="{}"),
    selected_section: str = Form(default=""),
    topic_title: str = Form(default=""),
    topic_context: str = Form(default=""),
    topic_scope: str = Form(default=""),
    preferred_language: str = Form(default="auto"),
    voice_input_language: str = Form(default=""),
    source_identity: str = Form(default=""),
):
    try:
        require_openai_api()
        parsed_history = normalise_voice_tutor_history(parse_json_list(history))
        sections_dict = parse_json_dict(sections)
        note_summary = str(summary or "").strip()
        focused_topic_context = str(topic_context or "").strip()
        if not note_summary and not sections_dict and not focused_topic_context:
            return Response(
                content=json.dumps({"error": "No current note context was provided. Open or generate the note before starting voice tutor."}),
                media_type="application/json",
                status_code=400,
            )

        section_context = voice_tutor_context_from_sections(sections_dict, selected_section)
        language_source_text = focused_topic_context or section_context or note_summary
        transcription_language = realtime_transcription_language_code(
            preferred_language=preferred_language,
            source_text=language_source_text,
            explicit_language=voice_input_language,
        )
        transcription_config = {"model": TRANSCRIBE_MODEL}
        if transcription_language:
            transcription_config["language"] = transcription_language
        session_config = {
            "type": "realtime",
            "model": REALTIME_MODEL,
            "output_modalities": ["audio"],
            "instructions": realtime_tutor_instructions(
                title=title,
                note_summary=note_summary,
                section_context=section_context,
                topic_title=topic_title,
                topic_context=focused_topic_context,
                topic_scope=topic_scope,
                history=parsed_history,
                preferred_language=preferred_language,
                source_identity=source_identity,
            ),
            "audio": {
                "output": {"voice": REALTIME_VOICE},
                "input": {
                    "transcription": transcription_config,
                    "noise_reduction": {"type": "near_field"},
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.45,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 650,
                        "create_response": True,
                        "interrupt_response": True,
                    },
                },
            },
        }
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        if OPENAI_ORG_ID:
            headers["OpenAI-Organization"] = OPENAI_ORG_ID
        if OPENAI_PROJECT_ID:
            headers["OpenAI-Project"] = OPENAI_PROJECT_ID
        response = requests.post(
            "https://api.openai.com/v1/realtime/calls",
            headers=headers,
            files={
                "sdp": (None, sdp),
                "session": (None, json.dumps(session_config)),
            },
            timeout=30,
        )
        if response.status_code >= 400:
            return Response(
                content=json.dumps({
                    "error": voice_realtime_provider_error_message(response),
                    "status": response.status_code,
                }),
                media_type="application/json",
                status_code=response.status_code,
            )
        return Response(
            content=response.text,
            media_type="application/sdp",
            headers={"Cache-Control": "no-store"},
        )
    except Exception as error:
        return Response(
            content=json.dumps({"error": str(error)}),
            media_type="application/json",
            status_code=analysis_exception_status(error),
        )


@app.post("/voice-tutor/respond")
async def voice_tutor_respond(
    audio: Optional[UploadFile] = File(default=None),
    transcript: str = Form(default=""),
    history: str = Form(default="[]"),
    title: str = Form(default=""),
    summary: str = Form(default=""),
    sections: str = Form(default="{}"),
    selected_section: str = Form(default=""),
    preferred_language: str = Form(default="auto"),
    source_identity: str = Form(default=""),
    ai_provider: str = Form(default=""),
):
    provider_token = None
    try:
        provider_token = set_request_text_provider(ai_provider)
        require_text_ai()
        chat_model = chat_model_for_active_provider() if "chat_model_for_active_provider" in globals() else CHAT_MODEL
        parsed_history = normalise_voice_tutor_history(parse_json_list(history))
        sections_dict = parse_json_dict(sections)
        note_summary = str(summary or "").strip()
        if not note_summary and not sections_dict:
            return analysis_error_response(
                "No current note context was provided. Open or generate the note before starting voice tutor.",
                400,
            )

        transcript_text = normalise_space(transcript)
        if audio is not None and audio.filename:
            audio_bytes = await read_upload_bytes(audio, MAX_AUDIO_BYTES, audio.filename or "voice audio")
            if audio_bytes:
                transcript_text = normalise_space(transcribe_media_bytes(audio.filename, audio_bytes))
        is_opening_turn = not transcript_text and not parsed_history

        section_context = voice_tutor_context_from_sections(sections_dict, selected_section)
        topic = normalise_space(title) or "the current study topic"
        language_source_text = note_summary or section_context
        answer_language = (
            detect_question_language(transcript_text, preferred_language)
            if transcript_text else
            target_language_name(resolve_generation_language_key(preferred_language, language_source_text))
        )
        history_lines = "\n".join(
            f"{turn['role']}: {turn['text']}" + (f" [state={turn.get('state')}, mastery={turn.get('mastery')}]" if turn.get("state") else "")
            for turn in parsed_history[-VOICE_TUTOR_HISTORY_LIMIT:]
        ) or "No prior voice tutor turns."
        opening_instruction = (
            "This is the opening turn. Ask the learner to explain what they already understand about the topic before teaching. "
            "Do not lecture yet. Give a warm, short diagnostic prompt."
            if is_opening_turn else
            "Evaluate the learner's latest answer, then decide whether to teach, hint, ask a simpler question, ask a harder transfer question, or end."
        )

        prompt = f"""
You are Synapse Voice Tutor, an adaptive spoken academic tutor.

Speak in: {answer_language}
Never translate the product name Synapse.

Current note:
Title: {topic}
Primary source identity: {source_identity or 'current uploaded material'}
Selected section context:
{section_context[:5000] if section_context else 'Full note context is used.'}

Generated notes context:
{truncate_text(note_summary, VOICE_TUTOR_CONTEXT_CHARS)}

Voice tutor conversation so far:
{history_lines}

Latest learner answer transcript:
{transcript_text or '[No learner answer yet]'}

Tutor mission:
- Start by asking what the learner already understands about this topic.
- Use the learner's first explanation as a diagnostic baseline.
- Keep asking one focused question or example at a time.
- If the learner is vague, wrong, or stuck, give a hint, a simpler question, or a short micro-lesson before asking again.
- If the learner is doing well, ask a harder transfer/example question, not just recall.
- End only when the learner has shown stable understanding across definition, evidence/example, and application.
- Do not mark mastery just because the learner says they are done.
- Keep the reply speakable: short paragraphs, no markdown tables, no long lists.
- Write the reply like a natural voice-chat script from a warm young female academic tutor. Use conversational phrasing, not textbook prose.
- In English, use natural contractions where appropriate. Do not use headings like "Diagnosis:" or "Question:" in the spoken reply.
- Use the source notes as the authority. Do not invent facts outside the uploaded material.
- Ask exactly one main question at the end unless can_end is true.
- If can_end is true, give a brief mastery summary and tell the learner they can finish or ask for one final challenge.

Current instruction:
{opening_instruction}

Return JSON only:
{{
  "reply": "what the voice tutor should say aloud",
  "state": "diagnose | teach | practice | hint | review | mastered",
  "mastery": 0,
  "student_level": "unclear | beginner | developing | secure | strong",
  "diagnosis": "brief private-facing diagnosis for UI",
  "next_prompt": "the one question the learner should answer next, empty if mastered",
  "hint": "short hint if useful",
  "exercise": {{"type":"short_answer | explain | example | compare | apply | correct_mistake","question":"...","expected_answer":"..."}},
  "can_end": false,
  "suggested_actions": ["Give me a hint", "Ask a simpler question", "Give me another example"]
}}
"""
        raw = generate_chat(
            [
                {"role": "system", "content": SYSTEM_PROMPT + "\n\nYou are running a spoken tutoring loop. Return compact JSON only."},
                {"role": "user", "content": prompt},
            ],
            model=chat_model,
            temperature=0.25,
            max_tokens=VOICE_TUTOR_TOKENS,
        )
        try:
            parsed = extract_json_object(raw)
        except Exception:
            parsed = {}
        fallback = "Tell me what you already understand about this topic. Start with the main idea, then one example or source detail you remember."
        return normalise_voice_tutor_json(parsed, fallback, transcript_text, parsed_history)
    except Exception as error:
        return analysis_error_response(str(error), analysis_exception_status(error))
    finally:
        if provider_token is not None:
            reset_request_text_provider(provider_token)

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    return await analyze_materials(files=[file], links="[]", free_text="", preferred_language="auto", client_fingerprint="")
