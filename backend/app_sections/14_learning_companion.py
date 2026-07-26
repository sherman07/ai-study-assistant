LEARNING_COMPANION_INTENTIONS = {"hobby", "skill", "project", "assessment"}
LEARNING_COMPANION_TOOL_IDS = {
    "quiz",
    "flashcards",
    "teachback",
    "keypoints",
    "broadcast",
    "quiz_from_notes",
    "cards_from_notes",
}
LEARNING_COMPANION_TOOL_LABELS = {
    "quiz": "Quiz me",
    "flashcards": "Flashcards",
    "teachback": "Teach-back",
    "keypoints": "Key points",
    "broadcast": "AI Broadcast",
    "quiz_from_notes": "Quiz from notes",
    "cards_from_notes": "Cards from notes",
}


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


def _companion_tool_id(value: Any) -> str:
    raw = normalise_space(str(value or "")).lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "quiz_me": "quiz",
        "practice_quiz": "quiz",
        "flash_cards": "flashcards",
        "flashcard": "flashcards",
        "cards": "flashcards",
        "teach_back": "teachback",
        "check_understanding": "teachback",
        "key_points": "keypoints",
        "summary": "keypoints",
        "ai_broadcast": "broadcast",
        "podcast": "broadcast",
        "notes_quiz": "quiz_from_notes",
        "quiz_notes": "quiz_from_notes",
        "notes_flashcards": "cards_from_notes",
        "flashcards_from_notes": "cards_from_notes",
        "cards_notes": "cards_from_notes",
    }
    tool_id = aliases.get(raw, raw)
    return tool_id if tool_id in LEARNING_COMPANION_TOOL_IDS else ""


def normalise_companion_suggested_tools(raw_tools: Any, message: str = "") -> List[dict]:
    """Keep companion practice buttons AI-gated; never invent a permanent dock."""
    tools: List[dict] = []
    seen = set()
    for item in raw_tools if isinstance(raw_tools, list) else []:
        if isinstance(item, dict):
            tool_id = _companion_tool_id(item.get("id") or item.get("tool") or item.get("type"))
            label = normalise_space(str(item.get("label") or LEARNING_COMPANION_TOOL_LABELS.get(tool_id, "")))
            reason = truncate_text(normalise_space(str(item.get("reason") or "")), 160)
        else:
            tool_id = _companion_tool_id(item)
            label = LEARNING_COMPANION_TOOL_LABELS.get(tool_id, "")
            reason = ""
        if not tool_id or tool_id in seen:
            continue
        seen.add(tool_id)
        tools.append({
            "id": tool_id,
            "label": label or LEARNING_COMPANION_TOOL_LABELS[tool_id],
            "reason": reason,
        })
        if len(tools) >= 4:
            break

    # Soft intent recovery when the learner explicitly asked for a practice tool
    # but the model omitted suggested_tools.
    lowered = normalise_space(message).lower()
    intent_map = (
        (("quiz me", "give me a quiz", "practice questions", "test me"), "quiz"),
        (("flashcard", "flash card", "make cards"), "flashcards"),
        (("teach-back", "teach back", "check my understanding"), "teachback"),
        (("key points", "revision sheet", "summarize our chat"), "keypoints"),
        (("broadcast", "podcast", "listen to this"), "broadcast"),
        (("quiz from notes", "quiz my notes"), "quiz_from_notes"),
        (("cards from notes", "flashcards from notes"), "cards_from_notes"),
    )
    for phrases, tool_id in intent_map:
        if tool_id in seen:
            continue
        if any(phrase in lowered for phrase in phrases):
            seen.add(tool_id)
            tools.append({
                "id": tool_id,
                "label": LEARNING_COMPANION_TOOL_LABELS[tool_id],
                "reason": "Learner requested this practice tool.",
            })
        if len(tools) >= 4:
            break
    return tools


@app.post("/learning-companion/respond")
async def learning_companion_respond(data: dict):
    try:
        subject = data.get("subject") if isinstance(data.get("subject"), dict) else {}
        title = normalise_space(str(subject.get("title") or ""))
        intention = normalise_space(str(subject.get("intention") or "")).lower()
        goal = normalise_space(str(subject.get("goal") or ""))
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
        prompt = f"""
You are Synapse Learning Companion, a patient long-term tutor. You are not a generic chatbot.

Subject: {title}
Learning intention: {intention}
Learner goal: {goal or 'Not stated yet'}
Intent-specific teaching approach: {learning_companion_intent_guidance(intention)}
{time_guidance}

Conversation so far:
{history_text}

Latest learner message:
{message or '[Opening turn: no learner message yet]'}

Sourced research context:
{research_context[:MAX_TUTOR_RESEARCH_CHARS] if research_context else 'No current research source was available. Say so plainly instead of guessing.'}

Companion rules:
- Keep one continuing thread for this subject. Do not ask the learner to restate their goal.
- On a first free-text turn without a preselected subject, infer the likely learning topic from the learner's own words and respond to that topic directly.
- Adapt to their answer: diagnose first, teach only the smallest useful idea, then invite an attempt.
- Follow a compact coaching loop: clarify the learner's practical goal, aim for one observable subskill, and prefer a single discriminating follow-up over a broad questionnaire.
- Never present a permanent menu of generic resources.
- Be concise, warm, practical, and honest about uncertainty.
- Keep any internal diagnosis private. Do not mention hidden state, mastery scoring, or diagnosis labels in the learner-facing reply.
- For time-sensitive questions, use only the sourced research context above and say when no source was available. Do not invent citations or claim a source says more than it does.
- End with exactly one clear next action unless the learner has demonstrated stable mastery.
- Practice tools are AI-gated. Only fill suggested_tools when the learner is ready for practice or clearly asks for a quiz, flashcards, teach-back, key points, AI broadcast, or notes-based practice. Otherwise return an empty suggested_tools array.
- Never suggest every tool at once. Prefer at most 1-3 tools that fit the current turn.
- Flashcards and quizzes generated from the companion conversation are separate from Materials class tools, even though they reuse the same generation backends.
- Use quiz_from_notes / cards_from_notes only when uploaded notes are clearly relevant.

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
  "suggested_actions": ["Give me a hint", "Ask a simpler question", "Give me an example"],
  "suggested_tools": [
    {{"id":"quiz|flashcards|teachback|keypoints|broadcast|quiz_from_notes|cards_from_notes","label":"button label","reason":"why this tool helps now"}}
  ]
}}
"""
        require_text_ai()
        raw = generate_chat(
            [
                {"role": "system", "content": SYSTEM_PROMPT + "\n\nYou are running a companion tutoring loop. Return compact JSON only."},
                {"role": "user", "content": prompt},
            ],
            model=CHAT_MODEL,
            temperature=0.25,
            max_tokens=VOICE_TUTOR_TOKENS,
        )
        try:
            parsed = extract_json_object(raw)
        except Exception:
            parsed = {}
        fallback = f"Let's begin with {title}. What do you already understand about it, in your own words?"
        decision = normalise_voice_tutor_json(parsed, fallback, message, history)
        suggested_tools = normalise_companion_suggested_tools(
            parsed.get("suggested_tools") if isinstance(parsed, dict) else [],
            message,
        )
        decision.update({
            "subject_title": title,
            "intention": intention,
            "available_time_minutes": available_time_minutes,
            "requires_research": requires_research,
            "research_query": research_query,
            "research_sources": [
                {"title": item.get("title"), "url": item.get("url")}
                for item in research_results[:MAX_TUTOR_SEARCH_RESULTS]
            ],
            "suggested_tools": suggested_tools,
        })
        return decision
    except Exception as error:
        return analysis_error_response(str(error), analysis_exception_status(error))
