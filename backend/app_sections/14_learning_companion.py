LEARNING_COMPANION_INTENTIONS = {"hobby", "skill", "project", "assessment"}


def learning_companion_history(items: Any) -> List[dict]:
    history: List[dict] = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        role = normalise_space(str(item.get("role") or "")).lower()
        content = normalise_space(str(item.get("content") or item.get("text") or ""))
        if role not in {"user", "assistant"} or not content:
            continue
        history.append({"role": role, "text": truncate_text(content, 1400)})
    return history[-12:]


def learning_companion_intent_guidance(intention: str) -> str:
    return {
        "hobby": "Prioritise curiosity, enjoyment, clear mental models, and a low-pressure invitation to try something.",
        "skill": "Use deliberate practice: one observable subskill, a worked example when needed, and feedback on the learner's attempt.",
        "project": "Work backward from a concrete deliverable. Help the learner choose the next smallest useful project action and name a checkpoint.",
        "assessment": "Use retrieval practice and exam-like application. Diagnose gaps, ask one discriminating question, and distinguish confidence from evidence.",
    }[intention]


def learning_companion_defaults(message: str, history: List[dict]) -> Tuple[str, str]:
    topic = normalise_space(message) or normalise_space(history[-1]["text"] if history else "") or "your learning goal"
    return truncate_text(topic, 120), "skill"


def learning_companion_research_request(message: str, subject_title: str) -> Tuple[bool, str]:
    """Signal a research need without silently searching on the learner's behalf."""
    lowered = message.lower()
    time_sensitive_terms = ("latest", "current", "today", "recent", "newest", "up to date")
    requires_research = any(term in lowered for term in time_sensitive_terms)
    if not requires_research:
        return False, ""
    return True, truncate_text(normalise_space(f"{subject_title} {message}"), 280)


@app.post("/learning-companion/respond")
async def learning_companion_respond(data: dict):
    provider_token = None
    try:
        requested_provider = str((data or {}).get("ai_provider") or "").strip()
        provider_token = set_request_text_provider(requested_provider)
        subject = data.get("subject") if isinstance(data.get("subject"), dict) else {}
        learning_context_raw = data.get("learning_context") if isinstance(data.get("learning_context"), dict) else data.get("learningContext")
        learning_context = learning_context_raw if isinstance(learning_context_raw, dict) else {}
        title = normalise_space(str(subject.get("title") or learning_context.get("topic") or ""))
        intention = normalise_space(str(subject.get("intention") or "")).lower()
        goal = normalise_space(str(subject.get("goal") or learning_context.get("goal") or ""))
        history = learning_companion_history(data.get("messages"))
        message = normalise_space(str(data.get("message") or ""))
        if not message:
            return analysis_error_response("Write a message for Synapse first.", 400)
        if intention and intention not in LEARNING_COMPANION_INTENTIONS:
            return analysis_error_response("Learning intention must be hobby, skill, project, or assessment.", 400)
        if not title:
            title, inferred_intention = learning_companion_defaults(message, history)
            intention = intention or inferred_intention
        if not intention:
            intention = "skill"

        try:
            available_time_minutes = int(data.get("available_time_minutes") or data.get("availableTimeMinutes") or 0)
        except (TypeError, ValueError):
            available_time_minutes = 0
        available_time_minutes = max(0, min(available_time_minutes, 480))
        is_opening_turn = not message and not history
        requires_research, research_query = learning_companion_research_request(message, title)
        research_context = ""
        research_results: List[dict] = []
        if requires_research:
            research_context, research_results = await run_blocking(
                gather_tutor_web_research,
                question=message,
                selected_section="",
                source_identity="",
                title=title,
            )
        current_instruction = (
            "Open warmly, explain how this companion will help with this subject, and ask exactly one brief diagnostic question."
            if is_opening_turn else
            "Respond directly to the learner's latest message. Diagnose their goal or level briefly, teach only the smallest useful next step, and ask exactly one follow-up only when it is needed to continue."
        )
        history_text = "\n".join(f"{turn['role']}: {turn['text']}" for turn in history) or "No previous turns."
        time_guidance = (
            f"The learner has about {available_time_minutes} minutes. Keep the next step small enough to complete now."
            if available_time_minutes else
            "The learner has not chosen a time limit. Offer a small next step and let them set the pace."
        )
        context_topic = normalise_space(str(learning_context.get("topic") or title))
        context_goal = normalise_space(str(learning_context.get("goal") or goal))
        context_level = normalise_space(str(learning_context.get("student_level") or learning_context.get("studentLevel") or ""))
        context_subskill = normalise_space(str(learning_context.get("active_subskill") or learning_context.get("activeSubskill") or ""))
        learning_context_block = "\n".join([
            f"Persisted topic: {context_topic or 'Not stated yet'}",
            f"Persisted goal: {context_goal or 'Not stated yet'}",
            f"Persisted student level: {context_level or 'unclear'}",
            f"Active subskill: {context_subskill or 'Not selected yet'}",
        ])
        prompt = f"""
You are Synapse Learning Companion, a patient long-term tutor. You are not a generic chatbot.

Subject: {title}
Learning intention: {intention}
Learner goal: {goal or 'Not stated yet'}
Intent-specific teaching approach: {learning_companion_intent_guidance(intention)}
{time_guidance}

Persisted learning context from Synapse:
{learning_context_block}

Conversation so far:
{history_text}

Latest learner message:
{message or '[Opening turn: no learner message yet]'}

Sourced research context:
{research_context[:MAX_TUTOR_RESEARCH_CHARS] if research_context else 'No current research source was available. Say so plainly instead of guessing.'}

Companion rules:
- Keep one continuing thread for this subject. Do not ask the learner to restate their goal.
- Prefer the persisted learning context above when it conflicts with a generic topic guess.
- On a first free-text turn without a preselected subject, infer the likely learning topic from the learner's own words and respond to that topic directly.
- Adapt to their answer: diagnose first, teach only the smallest useful idea, then invite an attempt.
- Follow a compact coaching loop: clarify the learner's practical goal, aim for one observable subskill, and prefer a single discriminating follow-up over a broad questionnaire.
- Never present a permanent menu of generic resources.
- Be concise, warm, practical, and honest about uncertainty.
- Keep any internal diagnosis private. Do not mention hidden state, mastery scoring, or diagnosis labels in the learner-facing reply.
- For time-sensitive questions, use only the sourced research context above and say when no source was available. Do not invent citations or claim a source says more than it does.
- End with exactly one clear next action unless the learner has demonstrated stable mastery.

Current instruction: {current_instruction}

Return JSON only:
{{
  "reply": "learner-facing response",
  "state": "diagnose | teach | practice | hint | review | mastered",
  "mastery": 0,
  "student_level": "unclear | beginner | developing | secure | strong",
  "diagnosis": "brief private-facing diagnosis",
  "next_prompt": "the one next question or action, empty only when mastered",
  "hint": "short hint if useful",
  "exercise": {{"type":"short_answer | explain | example | compare | apply | correct_mistake","question":"...","expected_answer":"..."}},
  "can_end": false,
  "suggested_actions": ["Give me a hint", "Ask a simpler question", "Give me an example"]
}}
"""
        require_text_ai()
        chat_model = chat_model_for_active_provider() if "chat_model_for_active_provider" in globals() else CHAT_MODEL
        selected_provider = active_text_provider() if "active_text_provider" in globals() else AI_TEXT_PROVIDER
        raw = generate_chat(
            [
                {"role": "system", "content": SYSTEM_PROMPT + "\n\nYou are running a companion tutoring loop. Return compact JSON only."},
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
        fallback = f"Let's begin with {title}. What do you already understand about it, in your own words?"
        decision = normalise_voice_tutor_json(parsed, fallback, message, history)
        decision.update({
            "subject_title": title,
            "intention": intention,
            "available_time_minutes": available_time_minutes,
            "requires_research": requires_research,
            "research_query": research_query,
            "ai_provider": selected_provider,
            "model": chat_model,
            "learning_context": {
                "topic": context_topic,
                "goal": context_goal,
                "student_level": context_level or "unclear",
                "active_subskill": context_subskill,
            },
            "research_sources": [
                {"title": item.get("title"), "url": item.get("url")}
                for item in research_results[:MAX_TUTOR_SEARCH_RESULTS]
            ],
        })
        return decision
    except Exception as error:
        return analysis_error_response(str(error), analysis_exception_status(error))
    finally:
        if provider_token is not None and "reset_request_text_provider" in globals():
            reset_request_text_provider(provider_token)
