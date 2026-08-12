@app.post("/timeline/generate")
async def generate_timeline(data: dict):
    try:
        payload = data or {}
        title = clean_quiz_string(payload.get("title") if isinstance(payload, dict) else "", "Study Path")
        context = quiz_summary_context(payload)
        if not context:
            return analysis_error_response("No generated notes are available for timeline generation yet.", 400)
        require_text_ai()

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


def fallback_quiz_question(qtype: str, index: int, title: str, context: str) -> dict:
    topic = title or stored_title or "the uploaded material"
    snippets = [
        normalise_space(line.lstrip("#-0123456789. "))
        for line in context.splitlines()
        if len(normalise_space(line.lstrip("#-0123456789. "))) > 24
    ]
    focus = snippets[index % len(snippets)] if snippets else f"the main idea in {topic}"
    base = {
        "id": f"q{index + 1}",
        "type": qtype,
        "question": f"Using the study material, explain or judge this key point: {focus[:180]}",
        "options": [],
        "correct_option_indexes": [],
        "correct_boolean": None,
        "expected_answer": f"A strong answer should accurately explain: {focus[:220]}",
        "explanation": "This question checks whether you can connect the key concept to source evidence instead of memorising only a heading.",
        "source_reference": topic,
        "difficulty": "medium",
        "points": 1,
        "rubric": ["Use the relevant concept from the material", "Explain the reason or evidence", "Avoid vague general statements"],
    }
    if qtype == "single_choice":
        base.update({
            "question": f"Which option best matches this point from the material: {focus[:160]}",
            "options": [focus[:160], "A decorative detail unrelated to the topic", "Only the page number matters", "The material provides no evidence"],
            "correct_option_indexes": [0],
        })
    elif qtype == "multiple_choice":
        base.update({
            "question": f"Which statements are reasonable about this point from the material? {focus[:150]}",
            "options": [focus[:150], "It should be understood with source evidence", "The heading alone is enough for the full answer", "It can be explained with relevant examples or figures", "It is unrelated to the core course concepts"],
            "correct_option_indexes": [0, 1, 3],
        })
    elif qtype == "true_false":
        base.update({
            "question": f"True or false: this point should be understood with concrete evidence, not only by memorising a page number. Point: {focus[:140]}",
            "options": ["True", "False"],
            "correct_boolean": True,
        })
    elif qtype == "case_analysis":
        base.update({
            "points": 4,
            "question": f"Case analysis: if an exam asks you to explain \"{focus[:120]}\" using the material, how would you organise your answer?",
        })
    elif qtype == "worked_problem":
        base.update({
            "points": 4,
            "question": f"Worked problem: solve or prove the exam-style task connected to \"{focus[:130]}\". Show the key steps and final answer.",
            "expected_answer": f"A strong solution should set up the relevant method, carry out each required step, and justify the final result using this point from the notes: {focus[:220]}",
            "rubric": ["Set up the correct method", "Show the main calculation or reasoning steps", "State the final answer clearly", "Use the notes' conditions or assumptions"],
        })
    elif qtype == "error_diagnosis":
        base.update({
            "points": 3,
            "question": f"Error diagnosis: a student gives an answer about \"{focus[:130]}\" but skips a required condition or step. Identify the likely mistake and correct it.",
            "expected_answer": f"The answer should name the mistaken step or assumption, explain why it is wrong, and replace it with the correct reasoning from the notes: {focus[:220]}",
            "rubric": ["Identify the incorrect step", "Explain why it fails", "Give the corrected step or answer"],
        })
    elif qtype == "essay":
        base.update({
            "points": 5,
            "question": f"Essay: write a structured response about \"{focus[:130]}\" using concepts, evidence, and examples from the material.",
        })
    elif qtype == "short_answer":
        base.update({"points": 2})
    return base


def normalise_objective_options(qtype: str, options: List[str], correct_indexes: List[int], fallback: dict) -> Tuple[List[str], List[int]]:
    fallback_options = list(fallback.get("options") or [])
    fallback_indexes = [idx for idx in fallback.get("correct_option_indexes", []) if isinstance(idx, int)]
    clean_options = [truncate_text(clean_quiz_rich_text(option), 280) for option in options if clean_quiz_rich_text(option)]
    if qtype == "single_choice":
        if len(clean_options) < 4:
            clean_options = fallback_options
            correct_indexes = fallback_indexes or [0]
        correct = correct_indexes[0] if correct_indexes else 0
        if correct < 0 or correct >= len(clean_options):
            correct = 0
        if correct >= 4:
            correct_option = clean_options[correct]
            distractors = [option for idx, option in enumerate(clean_options) if idx != correct][:3]
            clean_options = [correct_option, *distractors]
            correct = 0
        else:
            clean_options = clean_options[:4]
        while len(clean_options) < 4:
            clean_options.append(f"Review the source material carefully before choosing option {len(clean_options) + 1}.")
        return clean_options[:4], [correct]

    if qtype == "multiple_choice":
        if len(clean_options) < 5:
            clean_options = fallback_options
            correct_indexes = fallback_indexes or [0, 1]
        valid_correct = [idx for idx in correct_indexes if isinstance(idx, int) and 0 <= idx < len(clean_options)]
        if len(valid_correct) < 2:
            valid_correct = [0, 1] if len(clean_options) >= 2 else [0]
        keep_indexes = []
        for idx in valid_correct:
            if idx not in keep_indexes:
                keep_indexes.append(idx)
        for idx in range(len(clean_options)):
            if len(keep_indexes) >= 5:
                break
            if idx not in keep_indexes:
                keep_indexes.append(idx)
        remap = {old_idx: new_idx for new_idx, old_idx in enumerate(keep_indexes)}
        clean_options = [clean_options[idx] for idx in keep_indexes]
        correct_indexes = [remap[idx] for idx in valid_correct if idx in remap]
        while len(clean_options) < 5:
            clean_options.append(f"Additional distractor {len(clean_options) + 1}")
        return clean_options[:5], correct_indexes[:5]

    return clean_options, []


def normalise_quiz_questions(parsed: dict, desired_types: List[str], title: str, context: str, avoid_items: Optional[List[dict]] = None) -> List[dict]:
    raw_questions = parsed.get("questions") if isinstance(parsed, dict) else []
    if not isinstance(raw_questions, list):
        raw_questions = []

    questions: List[dict] = []
    used_signatures = {item.get("signature") for item in (avoid_items or []) if item.get("signature")}
    for index, desired_type in enumerate(desired_types):
        raw = raw_questions[index] if index < len(raw_questions) and isinstance(raw_questions[index], dict) else {}
        qtype = normalise_quiz_type(raw.get("type") or desired_type)
        if qtype != desired_type:
            qtype = desired_type
        fallback = fallback_quiz_question(qtype, index, title, context)

        options = raw.get("options") if isinstance(raw.get("options"), list) else fallback.get("options", [])
        options = [clean_quiz_rich_text(option) for option in options if clean_quiz_rich_text(option)]

        correct_indexes = coerce_option_indexes(
            raw.get("correct_option_indexes", raw.get("correct_indexes", raw.get("answer_index", raw.get("answer")))),
            options,
        )
        correct_boolean = coerce_boolean(raw.get("correct_boolean", raw.get("answer")))

        if qtype in {"single_choice", "multiple_choice"}:
            if not correct_indexes:
                correct_indexes = fallback.get("correct_option_indexes", [0])
            options, correct_indexes = normalise_objective_options(qtype, options, correct_indexes, fallback)
        elif qtype == "true_false":
            options = ["True", "False"]
            if correct_boolean is None:
                correct_boolean = fallback.get("correct_boolean", True)
            correct_indexes = [0 if correct_boolean else 1]
        else:
            options = []
            correct_indexes = []
            correct_boolean = None

        question = {
            "id": f"q{index + 1}",
            "type": qtype,
            "label": QUIZ_TYPE_LABELS.get(qtype, qtype),
            "question": clean_quiz_rich_text(raw.get("question") or raw.get("prompt"), fallback["question"]),
            "options": options,
            "correct_option_indexes": correct_indexes,
            "correct_boolean": correct_boolean,
            "expected_answer": clean_quiz_rich_text(raw.get("expected_answer") or raw.get("answer_text"), fallback["expected_answer"]),
            "explanation": clean_quiz_rich_text(raw.get("explanation"), fallback["explanation"]),
            "source_reference": clean_quiz_string(raw.get("source_reference") or raw.get("source"), fallback["source_reference"]),
            "difficulty": clean_quiz_string(raw.get("difficulty"), fallback["difficulty"]).lower(),
            "points": clamp_quiz_count(raw.get("points"), fallback.get("points", 1)),
            "rubric": raw.get("rubric") if isinstance(raw.get("rubric"), list) else fallback["rubric"],
        }
        signature = quiz_question_signature(question["question"])
        if signature in used_signatures:
            replacement = fallback_quiz_question(qtype, index + len(used_signatures), title, context)
            question.update({
                "question": replacement["question"],
                "options": replacement.get("options", []),
                "correct_option_indexes": replacement.get("correct_option_indexes", []),
                "correct_boolean": replacement.get("correct_boolean"),
                "expected_answer": replacement.get("expected_answer", question["expected_answer"]),
                "explanation": "This replacement avoids repeating a quiz question already generated for these notes.",
                "source_reference": replacement.get("source_reference", question["source_reference"]),
                "difficulty": replacement.get("difficulty", question["difficulty"]),
                "points": replacement.get("points", question["points"]),
                "rubric": replacement.get("rubric", question["rubric"]),
            })
            signature = quiz_question_signature(question["question"])
        used_signatures.add(signature)
        question["rubric"] = [clean_quiz_rich_text(item) for item in question["rubric"] if clean_quiz_rich_text(item)][:6]
        questions.append(question)
    return questions


@app.post("/quiz/generate")
async def generate_quiz(data: dict):
    try:
        plan = parse_quiz_type_plan(data or {})
        desired_types = expand_quiz_type_plan(plan)
        title = clean_quiz_string(data.get("title") if isinstance(data, dict) else "", "Study Quiz")
        preferred_language = normalise_quiz_language(data.get("preferred_language", "english") if isinstance(data, dict) else "english")
        exam_mode = bool(data.get("exam_mode", False)) if isinstance(data, dict) else False
        avoid_items = extract_quiz_avoidance(data or {})
        try:
            previous_quiz_count = int((data or {}).get("previous_quiz_count", len(avoid_items))) if isinstance(data, dict) else 0
        except Exception:
            previous_quiz_count = len(avoid_items)
        previous_quiz_count = max(0, min(previous_quiz_count, 200))
        variant_seed = clean_quiz_string((data or {}).get("variant_seed") if isinstance(data, dict) else "", "")
        context = quiz_summary_context(data or {})
        if not context:
            return analysis_error_response("No generated notes are available for quiz generation yet.", 400)
        require_text_ai()
        if not variant_seed:
            variant_seed = sha256_text(f"{title}|{len(avoid_items)}|{context[:400]}")[:12]

        plan_lines = "\n".join(
            f"- {QUIZ_TYPE_LABELS.get(item['type'], item['type'])} ({item['type']}): {item['count']}"
            for item in plan
        )
        language_rule = quiz_language_instruction(preferred_language)
        avoid_prompt = quiz_avoidance_prompt(avoid_items)
        schema = """
Return JSON only with this exact shape. Keep JSON keys in English. Every user-facing value must follow the language requirement:
{
  "title": "short quiz title",
  "questions": [
    {
      "type": "single_choice | multiple_choice | true_false | worked_problem | error_diagnosis | short_answer | case_analysis | essay",
      "question": "question text",
      "options": ["A", "B", "C", "D"],
      "correct_option_indexes": [0],
      "correct_boolean": true,
      "expected_answer": "model answer",
      "explanation": "explanation grounded in the uploaded material",
      "source_reference": "nearby concept/source evidence, not just a page number",
      "difficulty": "easy | medium | hard",
      "points": 1,
      "rubric": ["criterion 1", "criterion 2"]
    }
  ]
}
"""
        prompt = f"""
Create a high-quality study quiz from the generated notes below.

Language requirement: {language_rule}
Additional hard rule: all user-facing quiz content must follow the language requirement, including title, questions, options, explanations, expected answers, source_reference, and rubric.
Quiz title/topic: {title}
Exam mode enabled: {exam_mode}
Already generated quiz count for this note: {previous_quiz_count}
Variation seed: {variant_seed}

Question type plan. Return exactly {len(desired_types)} questions, in this order:
{plan_lines}

Previously generated questions for this exact note. Avoid repeating these question wordings, scenarios, answer options, and source angles:
{avoid_prompt}

Quality requirements:
- Act like a real exam setter and a strong tutor. Questions should look like normal assessment questions for this subject, not random trivia or generic recall.
- Test understanding, transfer, source evidence, common confusions, and method choice.
- Use the student's uploaded-file content as the authority.
- Prefer concepts that were explained with concrete examples, diagrams, tables, data, experiments, or source images in the notes.
- If previous questions exist, choose different concepts, different examples, different source visuals/data, or a harder/different angle. Do not make a paraphrase of an old question.
- Do not ask "what page/slide number"; use the concept or image/data content directly.
- Build a balanced quiz when the plan allows: include realistic worked problems, a common-error diagnosis, one application or interpretation question, and at most one pure definition question.
- For mathematics, common exam forms include: compute with shown method, choose the valid next step, diagnose a wrong algebra/calculus step, explain a condition or exception, compare two methods, or interpret a result. Avoid artificial prompts that only say "compute this" unless it is part of a normal worked problem.
- For single choice, provide exactly 4 plausible options and one correct index.
- For multiple choice, provide 5 plausible options and at least 2 correct indexes.
- For true/false, provide correct_boolean and a short explanation.
- For worked_problem, error_diagnosis, short_answer, case_analysis, and essay, provide expected_answer and a clear rubric.
- For error_diagnosis questions, include a realistic incorrect student step inside the question, then ask the learner to identify and correct it.
- For objective-question options, every option must be a complete readable sentence. Do not make options vague, joke-like, obviously wrong, or purely decorative.
- Keep each option concise: usually 1 sentence, maximum 2 short clauses. Put only the mathematical symbols inside MathJax, never the whole English sentence.
- Keep each question self-contained and useful for revision.
- Use source_reference to name the concept/evidence, not only a page or slide number.

Math display requirements:
- Use MathJax for every mathematical expression: inline `\\( ... \\)` or display `\\[ ... \\]`.
- Use readable LaTeX: `\\frac{{a}}{{b}}`, `x^{{n+1}}`, `\\int`, `\\,dx`, `\\ne`, `\\lvert x \\rvert`, matrices with `\\begin{{bmatrix}} ... \\end{{bmatrix}}`.
- Do not write raw forms such as x^2, ax^n, x^(n+1), A^T, [[1,2],[3,4]], ∫ without MathJax wrappers, or `|x|` in tables.
- Keep prose outside formulas. Put final answer and steps on separate Markdown lines, for example:
  `\\[ \\int (4x^{{2}} - 5x + 6)\\,dx = \\frac{{4}}{{3}}x^{{3}} - \\frac{{5}}{{2}}x^{{2}} + 6x + C \\]`
  `Steps: add 1 to each exponent, divide by the new exponent, and include \\(C\\).`
- Never put "Steps:" or explanatory prose inside one long math expression.
- Never put question wording such as "Which is correct?", "What is the next step?", or "Explain why" inside math delimiters. Close the formula first, then write the question text as normal prose.
- Never put source names, citations, URLs, YouTube links, or ordinary English explanations inside math delimiters.
- In answer options, write like this: `Because \\(n=-1\\) makes \\(n+1=0\\), the add/divide step would divide by zero.`
- Never write like this: `\\(n=-1 makes (n+1)=0 causing division by zero\\)`.

{schema}

Generated notes context:
{context}
"""
        raw = generate_chat(
            [
                {"role": "system", "content": "You generate rigorous, source-grounded quizzes as strict JSON. Never include markdown fences or prose outside JSON."},
                {"role": "user", "content": prompt},
            ],
            model=model_for_depth("detailed"),
            temperature=float(os.getenv("QUIZ_TEMPERATURE", "0.45")),
            max_tokens=env_int("QUIZ_GENERATION_TOKENS", 6500),
        )
        parsed = extract_json_object(raw)
        questions = normalise_quiz_questions(parsed, desired_types, title, context, avoid_items)
        return {
            "title": clean_quiz_string(parsed.get("title") if isinstance(parsed, dict) else "", f"{title} Quiz"),
            "exam_mode": exam_mode,
            "preferred_language": preferred_language,
            "total_questions": len(questions),
            "question_types": plan,
            "questions": questions,
        }
    except Exception as error:
        return analysis_error_response(str(error), analysis_exception_status(error))


# -----------------------------------------------------------------------------
# Flashcard generation
# -----------------------------------------------------------------------------

def clamp_flashcard_count(value, default: int = 16) -> int:
    try:
        number = int(value)
    except Exception:
        number = default
    return max(1, min(number, env_int("FLASHCARD_MAX_CARDS", 80)))


def resolve_flashcard_count(data: dict, context: str) -> Tuple[str, int]:
    mode = normalise_space(str(data.get("count_mode") or "auto")).lower().replace("-", "_")
    if mode in {"30", "thirty"}:
        return "30", clamp_flashcard_count(30)
    if mode in {"60", "sixty"}:
        return "60", clamp_flashcard_count(60)
    if mode == "custom":
        return "custom", clamp_flashcard_count(data.get("card_count") or data.get("count"), 20)

    section_count = len(data.get("sections") or {}) if isinstance(data.get("sections"), dict) else 0
    estimated = max(12, min(32, section_count * 3 if section_count else max(12, len(context) // 1800)))
    return "auto", clamp_flashcard_count(data.get("card_count"), estimated)


def compact_flashcard_text(value, fallback: str = "", max_words: int = 18, max_chars: int = 120) -> str:
    cleaned = clean_quiz_string(value, fallback)
    cleaned = re.sub(r"\s*(?:\.{2,}|\u2026)+\s*", " ", cleaned)
    cleaned = re.sub(r"^[*-]\s*", "", cleaned)
    if not cleaned:
        return fallback

    first_sentence = re.match(r"^(.{20,}?[.!?])(?:\s|$)", cleaned)
    if first_sentence:
        cleaned = first_sentence.group(1)

    words = cleaned.split()
    if len(words) > max_words:
        cleaned = " ".join(words[:max_words])
    cleaned = truncate_text(cleaned, max_chars)
    cleaned = re.sub(r"[\s,;:.-]+$", "", cleaned)
    return cleaned or fallback


def fallback_flashcard_cards(title: str, context: str, count: int) -> List[dict]:
    topic = title or stored_title or "Study material"
    candidates = []
    for line in context.splitlines():
        cleaned = normalise_space(line.lstrip("#-0123456789. "))
        if 28 <= len(cleaned) <= 220 and not cleaned.lower().startswith(("source:", "generated notes context")):
            candidates.append(cleaned)
        if len(candidates) >= count:
            break
    if not candidates:
        candidates = [f"Main idea from {topic}"]

    cards = []
    for index in range(count):
        focus = candidates[index % len(candidates)]
        cards.append({
            "id": f"fc{index + 1}",
            "front": compact_flashcard_text(focus, f"Key idea from {topic}", 12, 90),
            "back": compact_flashcard_text(focus, f"Source-grounded idea from {topic}", 18, 120),
            "hint": "Look for the definition, example, or evidence around this point.",
            "source_reference": topic,
            "difficulty": "medium",
            "tags": ["source notes"],
        })
    return cards


def normalise_flashcard_cards(parsed: dict, title: str, context: str, count: int) -> List[dict]:
    raw_cards = parsed.get("cards") if isinstance(parsed, dict) else []
    if not isinstance(raw_cards, list):
        raw_cards = []

    fallback_cards = fallback_flashcard_cards(title, context, count)
    cards: List[dict] = []
    for index in range(count):
        raw = raw_cards[index] if index < len(raw_cards) and isinstance(raw_cards[index], dict) else {}
        fallback = fallback_cards[index]
        tags = raw.get("tags") if isinstance(raw.get("tags"), list) else fallback["tags"]
        cards.append({
            "id": f"fc{index + 1}",
            "front": compact_flashcard_text(raw.get("front") or raw.get("term") or raw.get("question"), fallback["front"], 12, 90),
            "back": compact_flashcard_text(raw.get("back") or raw.get("definition") or raw.get("answer"), fallback["back"], 20, 130),
            "hint": clean_quiz_string(raw.get("hint"), fallback["hint"]),
            "source_reference": clean_quiz_string(raw.get("source_reference") or raw.get("source"), fallback["source_reference"]),
            "difficulty": clean_quiz_string(raw.get("difficulty"), fallback["difficulty"]).lower(),
            "tags": [clean_quiz_string(tag) for tag in tags if clean_quiz_string(tag)][:4],
        })
    return cards
