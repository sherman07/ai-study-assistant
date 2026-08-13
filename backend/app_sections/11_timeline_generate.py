@app.post("/timeline/generate")
async def generate_timeline(data: dict):
    try:
        require_text_ai()
        payload = data or {}
        title = clean_quiz_string(payload.get("title") if isinstance(payload, dict) else "", "Study Path")
        context = quiz_summary_context(payload)
        if not context:
            return analysis_error_response("No generated notes are available for timeline generation yet.", 400)

        sections_payload = payload.get("sections") if isinstance(payload, dict) else {}
        sections_source = sections_payload if isinstance(sections_payload, dict) and sections_payload else {}
        fallback = fallback_timeline_from_context(title, sections_source if isinstance(sections_source, dict) else {}, context)
        language_rule = language_instruction_for(payload.get("preferred_language", "auto") if isinstance(payload, dict) else "auto")

        prompt = f"""
Create an interactive Study Path for a learning app.
{language_rule}

This should NOT behave like a mind map and should NOT merely reorder the notes.
It must be an actionable sequence of study tasks. Each item should tell the student what to do next, how long to spend, how to actively recall, what output to produce, and how to know they have mastered it.

Return JSON only with this shape:
{{
  "title": "short study path title",
  "summary": "one sentence explaining how this path helps the learner study",
  "events": [
    {{
      "marker": "Task 1 / 10 min / First pass",
      "type": "warm_up | learn | apply | check | revise",
      "title": "short task title",
      "section": "matching section heading from the notes if possible",
      "summary": "why this task exists",
      "task": "specific action the student should do now",
      "active_prompt": "self-test prompt the student should answer from memory",
      "practice_question": {{
        "type": "short_answer | single_choice | multiple_choice | true_false | case_analysis | compare | essay_outline | diagram_prompt",
        "prompt": "one short, direct question the student can answer now",
        "options": ["only for single_choice, multiple_choice, or true_false"],
        "correct_option_indexes": [0],
        "correct_boolean": true,
        "expected_answer": "brief answer guide or key points",
        "explanation": "why this answer is right or how to approach it",
        "source_reference": "source evidence or concept used by the question"
      }},
      "deliverable": "what the student should produce",
      "mastery_check": "how the student knows they are ready to move on",
      "estimated_minutes": 8,
      "priority": "high | medium | low",
      "detail": "supporting explanation for the task",
      "evidence": "specific source evidence, figure, table, study, or example if relevant",
      "why_it_matters": "why this checkpoint matters for understanding or exam readiness",
      "misconception": "specific misunderstanding or common mistake this task repairs",
      "exam_use": "how this task prepares the student for an exam question",
      "source_reference": "section, source, slide, page, figure, or concept this task is grounded in",
      "related_terms": ["term 1", "term 2"]
    }}
  ]
}}

Rules:
- Return 6 to 12 tasks unless the notes are very short.
- The first task should orient the learner; the middle tasks should practise concepts/evidence/examples; the final tasks should check exam readiness or revision.
- Every task must include practice_question. This is the explicit short question the student sees first, so it must make the student know exactly what to answer.
- Use a varied mix of practice_question types. Do not default to multiple choice. Prefer short_answer, case_analysis, compare, diagram_prompt, and essay_outline when those are better for understanding; use single_choice, multiple_choice, and true_false only when options genuinely help.
- Practice questions should be answerable from the notes and should be shorter than the supporting explanation.
- The "task" field must be a complete student-facing instruction in 1 to 3 full sentences. It must not end with ellipses, a colon, or a dangling word such as "and", "or", "with", "about", "of", or "to".
- The "task" field should say exactly what to read/do and what mini-output to produce. Do not simply repeat the section title.
- The "deliverable" and "mastery_check" fields must be concrete enough to display as completion criteria in the UI.
- The "misconception" field must name the likely mistake this task prevents or repairs. If the notes do not imply one, write a concise trap such as "Only memorising the term without explaining the mechanism."
- The "exam_use" field must say how this checkpoint helps answer exam questions, solve problems, compare concepts, interpret evidence, or avoid a common marking error.
- The "source_reference" field must point to the section, source title, slide/page/figure, named concept, formula, example, or evidence used. Do not leave it blank.
- Use realistic estimated_minutes values from 5 to 25.
- Do not invent dates. If no real date exists, use Step markers.
- Use exact course concepts, named researchers, experiments, diagrams, tables, and data only when they appear in the notes context.
- Do not add external researchers, studies, citations, dates, or examples that are not present in the generated notes context.
- If a checkpoint has no explicit study/table/figure in the notes, keep evidence brief and say what the notes themselves state; do not fabricate a source.
- Do not ask the student to merely remember slide/page numbers.
- Keep every user-facing value in the required language.
- Keep task titles short enough for a vertical rail.
- Make tasks meaningfully different from each other; no duplicated checkpoints.
- Every task must be action-oriented, for example "draw", "compare", "explain from memory", "answer", "identify", "rewrite", "test yourself".

Current note title: {title}

Generated notes context:
{context}
"""
        raw = generate_chat(
            [
                {"role": "system", "content": "You generate rigorous source-grounded study timelines as strict JSON. Never include markdown fences or prose outside JSON."},
                {"role": "user", "content": prompt},
            ],
            model=model_for_depth("detailed"),
            temperature=float(os.getenv("TIMELINE_TEMPERATURE", "0.25")),
            max_tokens=env_int("TIMELINE_GENERATION_TOKENS", 6500),
        )
        parsed = extract_json_object(raw)
        timeline = normalise_timeline(parsed or {}, fallback)
        return {
            **timeline,
            "generated_at": utc_timestamp("microseconds"),
        }
    except Exception as error:
        return analysis_error_response(str(error), analysis_exception_status(error))


def study_path_answer_text(answer_payload) -> str:
    if isinstance(answer_payload, dict):
        if isinstance(answer_payload.get("selected_options"), list) and answer_payload.get("selected_options"):
            return "; ".join(clean_quiz_string(item) for item in answer_payload.get("selected_options") if clean_quiz_string(item))
        return clean_quiz_string(answer_payload.get("text") or answer_payload.get("answer") or answer_payload.get("value"))
    if isinstance(answer_payload, list):
        return "; ".join(clean_quiz_string(item) for item in answer_payload if clean_quiz_string(item))
    return clean_quiz_string(answer_payload)


def study_path_selected_indexes(answer_payload, options: List[str]) -> List[int]:
    if isinstance(answer_payload, dict):
        raw = answer_payload.get("selected_indexes")
        if raw is None:
            raw = answer_payload.get("selectedIndexes")
        if raw is None:
            raw = answer_payload.get("selected_index")
        if raw is None:
            raw = answer_payload.get("answer")
        return coerce_option_indexes(raw, options)
    return coerce_option_indexes(answer_payload, options)


def study_path_local_correct(question: dict, answer_payload) -> Optional[bool]:
    qtype = normalise_study_path_question_type(question.get("type"))
    options = question.get("options") if isinstance(question.get("options"), list) else []
    options = [clean_quiz_string(option) for option in options if clean_quiz_string(option)]
    selected_indexes = study_path_selected_indexes(answer_payload, options)
    if qtype == "single_choice":
        correct_indexes = coerce_option_indexes(question.get("correct_option_indexes") or question.get("correctOptionIndexes"), options)
        return bool(correct_indexes) and selected_indexes[:1] == correct_indexes[:1]
    if qtype == "multiple_choice":
        correct_indexes = coerce_option_indexes(question.get("correct_option_indexes") or question.get("correctOptionIndexes"), options)
        return bool(correct_indexes) and sorted(selected_indexes) == sorted(correct_indexes)
    if qtype == "true_false":
        correct_boolean = coerce_boolean(question.get("correct_boolean", question.get("correctBoolean")))
        if correct_boolean is None:
            return None
        if selected_indexes:
            answer_boolean = selected_indexes[0] == 0
        else:
            answer_boolean = coerce_boolean(study_path_answer_text(answer_payload))
        return answer_boolean is not None and answer_boolean == correct_boolean
    return None


def fallback_replacement_study_path_question(event: dict, previous_question: dict, answer_text: str) -> dict:
    event_type = normalise_timeline_type(event.get("type"))
    title = clean_quiz_string(event.get("title") or event.get("section"), "this checkpoint")
    summary = clean_quiz_string(event.get("summary") or event.get("detail") or event.get("task"), previous_question.get("expected_answer", ""))
    replacement = fallback_study_path_question(event_type, title, summary, event.get("source_reference") or event.get("sourceReference") or title)
    previous_type = normalise_study_path_question_type(previous_question.get("type"))
    if previous_type == "single_choice":
        replacement.update({
            "type": "short_answer",
            "prompt": f"In one or two sentences, correct the misunderstanding in this answer: {truncate_text(answer_text, 120)}",
            "options": [],
            "correct_option_indexes": [],
            "correct_boolean": None,
        })
    elif previous_type in {"short_answer", "case_analysis", "compare"}:
        replacement.update({
            "type": "true_false",
            "prompt": f"True or false: {truncate_text(summary, 150)}",
            "options": ["True", "False"],
            "correct_option_indexes": [],
            "correct_boolean": True,
        })
    return replacement


def generate_replacement_study_path_question(event: dict, question: dict, answer_text: str, preferred_language: str) -> dict:
    language_rule = language_instruction_for(preferred_language or "auto")
    prompt = f"""
Create ONE new practice question for the same Study Path task because the student got the previous question wrong.
{language_rule}

Return JSON only:
{{
  "type": "short_answer | single_choice | multiple_choice | true_false | case_analysis | compare | essay_outline | diagram_prompt",
  "prompt": "short direct question",
  "options": ["only if needed"],
  "correct_option_indexes": [0],
  "correct_boolean": true,
  "expected_answer": "brief answer guide",
  "explanation": "why this answer is right",
  "source_reference": "source concept/evidence"
}}

Rules:
- Make it different from the previous question.
- Keep it directly about the same task, source concept, or evidence.
- Prefer a simpler diagnostic question if the previous answer shows confusion.
- Do not invent external examples or studies.
- Do not ask only for a page or slide number.

Study Path task:
Title: {clean_quiz_string(event.get("title"))}
Type: {normalise_timeline_type(event.get("type"))}
Summary: {truncate_text(clean_quiz_string(event.get("summary")), 700)}
Task: {truncate_text(clean_quiz_string(event.get("task")), 700)}
Evidence: {truncate_text(clean_quiz_string(event.get("evidence")), 700)}
Source reference: {clean_quiz_string(event.get("source_reference") or event.get("sourceReference"))}

Previous question:
{json.dumps(question, ensure_ascii=False)[:1800]}

Student's wrong answer:
{truncate_text(answer_text, 700)}
"""
    try:
        raw = generate_chat(
            [
                {"role": "system", "content": "You create concise source-grounded study practice questions as strict JSON."},
                {"role": "user", "content": prompt},
            ],
            model=model_for_depth("focused"),
            temperature=0.35,
            max_tokens=env_int("TIMELINE_CHECK_TOKENS", 1600),
        )
        parsed = extract_json_object(raw)
        if isinstance(parsed, dict):
            return normalise_study_path_practice_question(parsed, event, event.get("title", ""), 0)
    except Exception:
        pass
    return normalise_study_path_practice_question(
        fallback_replacement_study_path_question(event, question, answer_text),
        event,
        event.get("title", ""),
        0,
    )


@app.post("/timeline/check-answer")
async def check_timeline_answer(data: dict):
    try:
        require_text_ai()
        payload = data or {}
        raw_event = payload.get("event") if isinstance(payload.get("event"), dict) else {}
        raw_question = payload.get("question") if isinstance(payload.get("question"), dict) else {}
        preferred_language = payload.get("preferred_language", "auto")
        if not raw_question:
            return {"error": "No practice question was provided."}

        event = {
            "type": normalise_timeline_type(raw_event.get("type")),
            "title": clean_quiz_string(raw_event.get("title") or raw_event.get("section"), "Study task"),
            "section": clean_quiz_string(raw_event.get("section")),
            "summary": truncate_text(clean_quiz_string(raw_event.get("summary")), 700),
            "detail": truncate_text(clean_quiz_string(raw_event.get("detail")), 900),
            "task": truncate_text(clean_quiz_string(raw_event.get("task")), 700),
            "evidence": truncate_text(clean_quiz_string(raw_event.get("evidence")), 700),
            "source_reference": truncate_text(clean_quiz_string(raw_event.get("source_reference") or raw_event.get("sourceReference")), 220),
        }
        question = normalise_study_path_practice_question(raw_question, event, event.get("title", ""), 0)
        answer_payload = payload.get("answer")
        answer_text = study_path_answer_text(answer_payload)
        if not answer_text:
            return {"error": "Answer is empty."}

        local_correct = study_path_local_correct(question, answer_payload)
        feedback = ""
        correct = bool(local_correct) if local_correct is not None else False

        if local_correct is None:
            language_rule = language_instruction_for(preferred_language or "auto")
            context = quiz_summary_context(payload)
            prompt = f"""
Grade the student's answer to one Study Path practice question.
{language_rule}

Return JSON only:
{{
  "correct": true,
  "feedback": "one or two sentences explaining the judgement"
}}

Mark correct only if the answer captures the core idea accurately enough to move on.
Accept wording differences, but reject vague, contradictory, or source-unsupported answers.

Question:
{json.dumps(question, ensure_ascii=False)[:1800]}

Study Path task:
Title: {event['title']}
Summary: {event['summary']}
Task: {event['task']}
Evidence: {event['evidence']}

Student answer:
{truncate_text(answer_text, 1200)}

Notes context:
{truncate_text(context, 5000)}
"""
            raw = generate_chat(
                [
                    {"role": "system", "content": "You are a strict but helpful study-answer grader. Return strict JSON."},
                    {"role": "user", "content": prompt},
                ],
                model=model_for_depth("focused"),
                temperature=0,
                max_tokens=env_int("TIMELINE_CHECK_TOKENS", 1600),
            )
            parsed = extract_json_object(raw)
            if isinstance(parsed, dict):
                correct = bool(parsed.get("correct"))
                feedback = truncate_text(clean_quiz_string(parsed.get("feedback")), 420)

        if correct:
            if not feedback:
                feedback = "Correct. You can mark this task done."
            return {"correct": True, "feedback": feedback}

        new_question = generate_replacement_study_path_question(event, question, answer_text, preferred_language)
        if not feedback:
            feedback = "Not quite. Try the new question below before marking this task done."
        return {
            "correct": False,
            "feedback": feedback,
            "new_question": new_question,
        }
    except Exception as error:
        return {"error": str(error)}


def quiz_question_signature(value: str) -> str:
    text = normalise_space(str(value or "")).lower()
    text = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", " ", text)
    return normalise_space(text)[:220]


def extract_quiz_avoidance(data: dict) -> List[dict]:
    raw_items = []
    if isinstance(data, dict):
        for key in ["avoid_questions", "previous_questions"]:
            value = data.get(key)
            if isinstance(value, list):
                raw_items.extend(value)
        previous_quizzes = data.get("previous_quizzes")
        if isinstance(previous_quizzes, list):
            for quiz in previous_quizzes:
                if isinstance(quiz, dict) and isinstance(quiz.get("questions"), list):
                    raw_items.extend(quiz.get("questions") or [])

    items: List[dict] = []
    seen = set()
    for raw in raw_items:
        if isinstance(raw, str):
            question = clean_quiz_string(raw)
            qtype = ""
            source = ""
            options: List[str] = []
        elif isinstance(raw, dict):
            question = clean_quiz_string(raw.get("question") or raw.get("prompt"))
            qtype = normalise_quiz_type(raw.get("type") or "")
            source = clean_quiz_string(raw.get("source_reference") or raw.get("sourceReference") or raw.get("source"))
            raw_options = raw.get("options") if isinstance(raw.get("options"), list) else []
            options = [clean_quiz_string(option) for option in raw_options if clean_quiz_string(option)][:5]
        else:
            continue
        signature = quiz_question_signature(question)
        if not signature or signature in seen:
            continue
        seen.add(signature)
        items.append({
            "type": qtype,
            "question": truncate_text(question, 260),
            "source_reference": truncate_text(source, 160),
            "options": options,
            "signature": signature,
        })
        if len(items) >= env_int("QUIZ_AVOID_QUESTION_LIMIT", 80):
            break
    return items


def quiz_avoidance_prompt(items: List[dict]) -> str:
    if not items:
        return "No previous quiz questions were provided."
    lines = []
    for index, item in enumerate(items[: env_int("QUIZ_AVOID_PROMPT_LIMIT", 36)], start=1):
        details = []
        if item.get("type"):
            details.append(item["type"])
        if item.get("source_reference"):
            details.append(item["source_reference"])
        if item.get("options"):
            details.append("options: " + " | ".join(item["options"][:4]))
        suffix = f" ({'; '.join(details)})" if details else ""
        lines.append(f"{index}. {item['question']}{suffix}")
    return "\n".join(lines)


def coerce_option_indexes(value, options: List[str]) -> List[int]:
    if value is None:
        return []
    raw_values = value if isinstance(value, list) else [value]
    indexes = []
    for raw in raw_values:
        idx = None
        if isinstance(raw, int):
            idx = raw
        elif isinstance(raw, str):
            stripped = raw.strip()
            if stripped.isdigit():
                idx = int(stripped)
            elif len(stripped) == 1 and stripped.upper() in "ABCDE":
                idx = ord(stripped.upper()) - ord("A")
            else:
                for option_index, option in enumerate(options):
                    if normalise_space(option).lower() == normalise_space(stripped).lower():
                        idx = option_index
                        break
        if idx is not None and 0 <= idx < len(options) and idx not in indexes:
            indexes.append(idx)
    return indexes


def coerce_boolean(value) -> Optional[bool]:
    if isinstance(value, bool):
        return value
    text = normalise_space(str(value or "")).lower()
    if text in {"true", "t", "yes", "correct", "right", "对", "正确", "是"}:
        return True
    if text in {"false", "f", "no", "incorrect", "wrong", "错", "错误", "否"}:
        return False
    return None


def clean_quiz_string(value, fallback: str = "") -> str:
    cleaned = normalise_space(str(value or ""))
    return cleaned or fallback


def clean_quiz_rich_text(value, fallback: str = "") -> str:
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\s+(Steps?|Solution|Answer|Explanation|Rubric):", r"\n\1:", text, flags=re.I)
    text = re.sub(r"\^\\?\(([^)\n]{1,80})\\?\)", r"^{\1}", text)
    lines = [normalise_space(line) for line in text.split("\n")]
    cleaned_lines: List[str] = []
    blank_seen = False
    for line in lines:
        if not line:
            if cleaned_lines and not blank_seen:
                cleaned_lines.append("")
            blank_seen = True
            continue
        cleaned_lines.append(line)
        blank_seen = False
    cleaned = "\n".join(cleaned_lines).strip()
    return cleaned or fallback
