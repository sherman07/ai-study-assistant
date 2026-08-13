

def _professional_concept_teaching(point: dict) -> dict:
    text = f"{point.get('title', '')} {point.get('excerpt', '')}".lower()

    if re.search(r"\blife[- ]?span\b|\bdevelopmental\b|growing up|growing older", text):
        return {
            "core": "The core idea is developmental change across the life-span: the source is asking how psychological abilities, behaviour, reasoning, and adaptation change with age rather than treating psychology as a fixed snapshot of adults.",
            "exam": "Likely questions ask why developmental psychology matters, how life-span thinking changes an explanation, or how a developmental scientist would study change over time.",
            "trap": "A weak answer treats development as only childhood or only lists ages. A strong answer explains the pattern of change and the evidence or method used to study it.",
            "application": "In a new case, identify the age or developmental stage, name the ability or behaviour changing, then explain the mechanism or evidence that shows change.",
        }
    if re.search(r"\bpiaget|\breflexes?\b|reason|piagetian", text):
        return {
            "core": "The core idea is the movement from simple sensorimotor responses toward structured reasoning. Piaget matters here because the source is using him as a theory of how children's thinking changes qualitatively, not just how they know more facts.",
            "exam": "Likely questions ask students to explain Piaget's developmental logic, apply it to an unfamiliar child behaviour, or critique whether a task really shows a stage of reasoning.",
            "trap": "A weak answer memorises Piaget's name without explaining the mechanism. A strong answer connects behaviour, stage logic, and what the evidence can or cannot prove.",
            "application": "When given a child example, ask what kind of reasoning the child shows, what task condition reveals it, and whether the behaviour fits or challenges a Piagetian interpretation.",
        }
    if re.search(r"\bmemory\b|\bnumber\b|\bphysics\b|core topics", text):
        return {
            "core": "The core idea is that developmental psychology studies specific cognitive systems, such as memory, number understanding, and physical reasoning, to see how children build increasingly organised models of the world.",
            "exam": "Likely questions ask students to compare cognitive domains, interpret an experimental task, or explain what a child's response shows about an underlying concept.",
            "trap": "A weak answer says children simply get better with age. A strong answer explains which cognitive system is being tested and what the task reveals about representation or reasoning.",
            "application": "For a new task, identify the cognitive domain, the response being measured, and the inference the researcher is allowed to make from that response.",
        }
    if re.search(r"\baggression\b|selfish|cooperat|fairness|violent|human nature", text):
        return {
            "core": "The core idea is whether behaviour should be explained as fixed human nature or as a response shaped by context, evidence, incentives, and social conditions.",
            "exam": "Likely questions ask students to compare selfishness and cooperation claims, evaluate evidence, or apply a theory of aggression or fairness to a new case.",
            "trap": "A weak answer turns one example into a universal claim. A strong answer separates what the source directly shows from what it only suggests.",
            "application": "In a new case, identify the behaviour, the proposed cause, the evidence for that cause, and the limit of the conclusion.",
        }
    if re.search(r"\bvector|magnitude|direction|component|axes|angle", text):
        return {
            "core": "The core idea is that vectors represent quantities with both size and direction, so problem solving depends on choosing axes, resolving components, and preserving sign and units.",
            "exam": "Likely questions ask students to resolve a vector, interpret a diagram, or explain why a component method fits the geometry.",
            "trap": "A weak answer memorises formulas without tracking the angle reference or sign convention. A strong answer explains the geometry before calculating.",
            "application": "In a new problem, draw axes, identify the angle reference, resolve components, and check whether the result's sign and unit make physical sense.",
        }
    return {
        "core": f"The core idea is the relationship between {point.get('term_phrase') or point.get('title')}: what the source states, why that point matters, and what condition controls whether it applies.",
        "exam": "Likely questions ask students to define the source idea, explain the mechanism or reasoning behind it, and apply it to a new example without overstating the evidence.",
        "trap": "A weak answer repeats the source wording. A strong answer names the concept, explains how it works, and states the limit of the source evidence.",
        "application": "In a new question, identify the matching source concept, state the condition or assumption, explain the mechanism, and then test the limit.",
    }


def _professional_low_value_anchor(title: str, segment: str) -> bool:
    text = f"{title} {segment}".lower()
    if re.search(r"\b(outline|agenda|contents?|housekeeping|schedule)\b", text) and not re.search(
        r"\b(theory|model|concept|method|evidence|objective|piaget|developmental|memory|number|physics|formula|case|experiment)\b",
        text,
    ):
        return True
    return False


def _professional_source_learning_points(source_units: List[dict]) -> List[dict]:
    points: List[dict] = []
    for i, unit in enumerate(source_units or [], start=1):
        source_title = normalise_space(unit.get("title_candidate") or unit.get("display_name") or f"Source {i}")
        excerpt = normalise_space(unit.get("text_excerpt") or "")
        segments = _professional_split_source_excerpt(excerpt) or [excerpt]
        for segment_index, segment in enumerate(segments, start=1):
            title = _professional_anchor_title(source_title, segment, segment_index)
            if _professional_low_value_anchor(title, segment):
                continue
            terms = source_specific_anchor_terms(f"{source_title} {title} {segment}", limit=7)
            term_phrase = ", ".join(terms[:5]) if terms else title
            point = {
                "label": f"Source {i}.{segment_index}",
                "source_title": source_title,
                "title": title,
                "excerpt": truncate_text(segment, 420) or "Readable text was limited; use any extracted source figures or metadata as the source anchor.",
                "terms": terms,
                "term_phrase": term_phrase,
            }
            point.update(_professional_concept_teaching(point))
            points.append(point)
            if len(points) >= PROFESSIONAL_FALLBACK_MAX_POINTS:
                return points
    return points


def _professional_terms_phrase(points: List[dict], fallback: str = "the uploaded source concepts") -> str:
    terms: List[str] = []
    seen = set()
    for point in points:
        for term in point.get("terms") or []:
            if term in seen:
                continue
            seen.add(term)
            terms.append(term)
            if len(terms) >= 8:
                return ", ".join(terms)
    return ", ".join(terms) if terms else fallback


def _professional_source_anchor_block(points: List[dict]) -> str:
    lines = []
    for point in points:
        terms = ", ".join(point.get("terms") or []) or "source-specific terms"
        lines.append(
            f"- [Source anchor] {point['label']} - {point['title']}: key study terms: {terms}. "
            f"Source says: {point['excerpt']}"
        )
    return "\n".join(lines) if lines else "- [Source anchor] No readable source anchors were available."


def _professional_table_cell(value: str, max_chars: int = 180) -> str:
    return truncate_text(normalise_space(value or "").replace("|", "/"), max_chars)


def _professional_exam_focus_table(points: List[dict]) -> str:
    rows = [
        "| Likely question type | Source anchor | What the question is testing | What a high-grade answer must do | Common trap |",
        "| -------------------- | ------------- | ---------------------------- | -------------------------------- | ----------- |",
    ]
    for point in points[:5]:
        rows.append(
            "| Explain / apply | "
            f"{_professional_table_cell(point['title'], 90)} | "
            f"{_professional_table_cell(point['exam'])} | "
            f"Use {point['label']} as the anchor, explain the mechanism, then apply it to a changed case. | "
            f"{_professional_table_cell(point['trap'])} |"
        )
    return "\n".join(rows)


def _professional_understanding_targets(points: List[dict]) -> str:
    lines = []
    for point in points:
        lines.append(
            f"- [Source anchor] **{point['title']}**: {point['excerpt']}\n"
            f"  [Professional explanation] {point['core']}\n"
            f"  [Exam intelligence] {point['exam']}"
        )
    return "\n".join(lines)


def _professional_deep_concept_blocks(points: List[dict]) -> str:
    blocks = []
    for point in points:
        blocks.append(
            f"### {point['title']}\n\n"
            f"[Source anchor] {point['excerpt']}\n\n"
            f"[Professional explanation] {point['core']}\n\n"
            f"[Exam intelligence] {point['exam']}\n\n"
            f"[Limitation] {point['trap']}\n\n"
            f"[Application] {point['application']}"
        )
    return "\n\n".join(blocks)


def _professional_connection_map(points: List[dict]) -> str:
    titles = [point["title"] for point in points[:5]]
    if not titles:
        return "Uploaded source anchor -> mechanism -> exam use -> limitation"
    if len(titles) == 1:
        return f"{titles[0]} -> mechanism in the source -> likely exam application -> limitation"
    return " -> ".join(titles) + " -> high-grade application with limits"


def _professional_application_table(points: List[dict]) -> str:
    rows = [
        "| Source concept | New situation the exam might use | How to recognise it | How to apply the concept | What to avoid |",
        "| -------------- | -------------------------------- | ------------------- | ------------------------ | ------------- |",
    ]
    for point in points[:5]:
        rows.append(
            f"| {_professional_table_cell(point['title'], 80)} | "
            "An unfamiliar case, task, diagram, or short-answer prompt using the same underlying idea. | "
            f"Look for {_professional_table_cell(point.get('term_phrase') or point['title'], 90)}. | "
            f"{_professional_table_cell(point['application'])} | "
            f"{_professional_table_cell(point['trap'])} |"
        )
    return "\n".join(rows)


def _professional_mistake_list(points: List[dict]) -> str:
    return "\n".join(
        f"- **{point['title']}**: {point['trap']}"
        for point in points[:6]
    )


def _professional_model_answers(points: List[dict]) -> str:
    if not points:
        return "A strong answer identifies the source concept, explains the mechanism, applies it to the new question, and states a limitation."
    first = points[0]
    second = points[1] if len(points) > 1 else points[0]
    return (
        f"**Short-answer model:** {first['title']} matters because {first['core']} A strong answer would name the source anchor, then explain the mechanism rather than only repeating the slide title.\n\n"
        f"**Longer explanation model:** The source moves from {first['title']} to {second['title']} because the student needs to connect the big idea with a more precise concept or method. The answer should state what the source says, explain why it matters, and show what changes when the idea is used in a new case.\n\n"
        f"**Application model:** If a new question changes the example, use this sequence: identify {first.get('term_phrase') or first['title']}, state the condition, explain the mechanism, apply it to the new case, then add the limitation: {first['trap']}"
    )


def _professional_question_bank(points: List[dict]) -> str:
    if not points:
        return "- Easy: Define the source concept.\n- Medium: Explain the mechanism.\n- Hard: Apply it to a new case and state a limitation."
    easy = "\n".join(f"- Define or explain **{point['title']}**. Testing: source recall plus meaning. Common mistake: repeating the title without explanation." for point in points[:3])
    medium = "\n".join(f"- How does **{point['title']}** connect to another source idea? Testing: mechanism and relationship. Common mistake: listing both ideas without explaining the link." for point in points[:3])
    hard = "\n".join(f"- Apply **{point['title']}** to an unfamiliar case. Testing: transfer and limits. Common mistake: {point['trap']}" for point in points[:3])
    return f"### Easy / Foundation\n\n{easy}\n\n### Medium / Understanding\n\n{medium}\n\n### Hard / High Grade\n\n{hard}"


def _professional_fallback_notes(source_units: List[dict], is_chinese_fallback: bool = False) -> str:
    points = _professional_source_learning_points(source_units)
    anchors = _professional_source_anchor_block(points)
    term_phrase = _professional_terms_phrase(points)
    title_phrase = "; ".join(point["title"] for point in points[:4]) or "the uploaded material"
    exam_table = _professional_exam_focus_table(points)
    understanding_targets = _professional_understanding_targets(points)
    deep_blocks = _professional_deep_concept_blocks(points)
    connection_map = _professional_connection_map(points)
    application_table = _professional_application_table(points)
    mistake_list = _professional_mistake_list(points)
    model_answers = _professional_model_answers(points)
    question_bank = _professional_question_bank(points)
    if is_chinese_fallback:
        return (
            "# Professional Study Guide: 来源材料\n\n"
            "## 1. Big Picture: What This Material Is Really About\n\n"
            f"[Source-based] 这份材料的核心学习对象包括：{title_phrase}。\n\n"
            f"[Professional explanation] 学习重点不是复述来源，而是解释这些来源中的关键概念如何共同回答一个问题：{term_phrase} 这些概念如何改变你对主题的理解。\n\n"
            "## 2. The Exam Will Probably Test These Ideas\n\n"
            f"[Exam intelligence] 题目很可能要求你定义、比较、解释或应用这些来源概念：{term_phrase}。高分答案需要引用具体来源锚点，解释机制，并说明限制。\n\n"
            "## 3. What You Actually Need To Understand\n\n"
            f"{anchors}\n\n"
            "## 4. Deep Explanation of the Core Concepts\n\n"
            f"[Source-based] 逐个来源读具体概念：\n\n{anchors}\n\n"
            f"[Professional explanation] 对每个来源都要回答：它提出了什么概念？用了什么例子或证据？这个例子能支持什么？不能支持什么？它和 {term_phrase} 中的其他概念如何连接？\n\n"
            "## 5. Concept Connections: How The Ideas Work Together\n\n"
            f"[Professional explanation] 把这些来源连接起来：先找出 {term_phrase} 的定义或例子，再解释它们之间的机制、条件、限制和可能冲突。\n\n"
            f"```text\n{term_phrase} -> 机制/条件 -> 来源例子 -> 新题目应用 -> 限制\n```\n\n"
            "## 6. Background Knowledge Needed To Understand This Properly\n\n"
            f"[Background knowledge] 只补足理解 {term_phrase} 所需要的背景，例如术语定义、研究逻辑、比较标准、机制或学科假设。不要用背景知识替代来源内容。\n\n"
            "## 7. How To Apply This To New Questions\n\n"
            f"[Application] 遇到新题目时，先点名一个来源概念，例如 {term_phrase}，再说明它的机制、来源例子、适用条件和限制。\n\n"
            "## 8. Common Mistakes That Lose Marks\n\n"
            f"- 把 {term_phrase} 当成孤立术语背诵。\n- 只列来源标题，不解释具体概念如何工作。\n- 把某一个来源例子扩大成普遍结论。\n\n"
            "## 9. High-Quality Student Thinking\n\n"
            f"[Professional explanation] 基础理解会复述来源；强理解会解释 {term_phrase} 为什么重要；高水平理解会比较来源之间的关系，并指出每个例子的证据边界。\n\n"
            "## 10. Model High-Quality Answers\n\n"
            f"[Application] 一个强答案会这样写：这些来源共同说明，{term_phrase} 不是孤立事实，而是需要通过具体例子、条件和限制来解释的概念网络。\n\n"
            "## 11. Exam Question Bank\n\n"
            f"- Easy: 定义 {term_phrase} 中的一个核心概念，并指出来源例子。\n- Medium: 解释两个来源概念之间的机制关系。\n- Hard: 把来源概念应用到一个新案例，并说明限制。\n\n"
            "## 12. Memory and Practice\n\n"
            f"- 记住具体来源概念：{term_phrase}。\n- 练习用每个来源例子解释一个机制。\n- 练习说明每个例子能证明什么、不能证明什么。\n"
        )
    return (
        "# Professional Study Guide: Uploaded Material\n\n"
        "## 1. Big Picture: What This Material Is Really About\n\n"
        f"[Source-based] The uploaded material centres on these concrete study anchors: {title_phrase}.\n\n"
        f"[Professional explanation] The real study task is to explain how {term_phrase} changes the student's mental model of the topic, not to memorise a list of source titles.\n\n"
        "## 2. The Exam Will Probably Test These Ideas\n\n"
        f"[Exam intelligence] Likely questions will ask the student to define, compare, explain, or apply these source concepts: {term_phrase}. A high-grade answer must use concrete source anchors, explain the mechanism, and state limits.\n\n"
        f"{exam_table}\n\n"
        "## 3. What You Actually Need To Understand\n\n"
        f"{understanding_targets or anchors}\n\n"
        "## 4. Deep Explanation of the Core Concepts\n\n"
        f"{deep_blocks or anchors}\n\n"
        "## 5. Concept Connections: How The Ideas Work Together\n\n"
        f"```text\n{connection_map}\n```\n\n"
        f"[Professional explanation] The important connection is not the order of the slides; it is how the source moves from named concepts ({term_phrase}) to mechanisms, examples, and assessment use. Use the map to explain why each concept comes before or after the next one.\n\n"
        "## 6. Background Knowledge Needed To Understand This Properly\n\n"
        f"[Background knowledge] Add only background needed to understand {term_phrase}: definitions, research logic, comparison standards, mechanisms, assumptions, or discipline vocabulary. Background must clarify these named source anchors, not replace them: {title_phrase}.\n\n"
        "## 7. How To Apply This To New Questions\n\n"
        f"{application_table}\n\n"
        "## 8. Common Mistakes That Lose Marks\n\n"
        f"{mistake_list}\n\n"
        "## 9. High-Quality Student Thinking\n\n"
        "| Level | What the student does | Example using this topic |\n"
        "| ----- | --------------------- | ------------------------ |\n"
        f"| Basic | Names the concept | Lists {term_phrase}. |\n"
        f"| Good | Explains the concept | States what {points[0]['title'] if points else 'the first source anchor'} means. |\n"
        f"| Strong | Connects mechanism and evidence | Explains how {term_phrase} work together in the source. |\n"
        f"| Excellent | Transfers and limits | Applies {points[0]['title'] if points else 'the source concept'} to a new case and states what the source cannot prove. |\n\n"
        "## 10. Model High-Quality Answers\n\n"
        f"{model_answers}\n\n"
        "## 11. Exam Question Bank\n\n"
        f"{question_bank}\n\n"
        "## 12. Memory and Practice\n\n"
        f"- Memorise the concrete source concepts: {term_phrase}.\n- Practise explaining the core mechanism behind: {title_phrase}.\n- Practise turning each source anchor into a likely exam answer.\n- Practise stating what each example proves, what it does not prove, and how it transfers to a new case.\n"
    )


GENERAL_FALLBACK_MAX_POINTS = 5


def _fallback_clean_text(value: str, max_chars: int = 260) -> str:
    return truncate_text(normalise_space(value or ""), max_chars)


def _fallback_topic_title(source_units: List[dict], points: List[dict]) -> str:
    for unit in source_units or []:
        title = _fallback_clean_text(unit.get("title_candidate") or unit.get("display_name"), 90)
        if title and not re.search(r"(?i)^uploaded file$|^source \d+$", title):
            return title
    if points:
        return _fallback_clean_text(points[0].get("title"), 90)
    return "Uploaded Material"


def _fallback_visual_learning_points(visual_cards: List[dict]) -> List[dict]:
    points: List[dict] = []
    for marker_index, card in enumerate(visual_cards or []):
        title = (
            _v23_meaningful_card_text(card.get("title"))
            or _v23_meaningful_card_text(card.get("caption"))
            or f"Diagram or example {marker_index + 1}"
        )
        what = (
            _v23_meaningful_card_text(card.get("what_shows"))
            or _v23_meaningful_card_text(card.get("caption"))
        )
        why = (
            _v23_meaningful_card_text(card.get("argument_supported"))
            or _v23_meaningful_card_text(card.get("why_relevant"))
            or _v23_meaningful_card_text(card.get("cross_source_connection"))
        )
        if not what and not why:
            continue
        terms = source_specific_anchor_terms(f"{title} {what} {why}", limit=7)
        core = " ".join(part for part in [
            f"The concrete idea is **{title}**.",
            f"It shows {what}." if what else "",
            f"The learning point is {why}." if why else "",
        ] if part)
        points.append({
            "label": f"Visual {marker_index + 1}",
            "title": _fallback_clean_text(title, 100),
            "excerpt": _fallback_clean_text(what or why, 360),
            "terms": terms,
            "term_phrase": ", ".join(terms[:5]) if terms else _fallback_clean_text(title, 80),
            "core": core,
            "exam": "A question may ask you to interpret the diagram or example, explain what it proves, and state what it cannot prove.",
            "trap": "Do not describe the picture only. Explain the concept or comparison it is being used to teach.",
            "application": "In a new question, name the concept, describe the visible pattern, explain the mechanism, and state the boundary of the conclusion.",
            "marker_index": marker_index,
        })
    return points


def _fallback_learning_points(source_units: List[dict], visual_cards: List[dict]) -> List[dict]:
    points: List[dict] = []
    seen_titles = set()
    for point in _professional_source_learning_points(source_units):
        title_key = _fallback_clean_text(point.get("title"), 120).lower()
        if not title_key or title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        points.append(point)
        if len(points) >= GENERAL_FALLBACK_MAX_POINTS:
            break
    for point in _fallback_visual_learning_points(visual_cards):
        title_key = _fallback_clean_text(point.get("title"), 120).lower()
        if not title_key or title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        points.append(point)
        if len(points) >= GENERAL_FALLBACK_MAX_POINTS:
            break
    return points


def _fallback_terms(points: List[dict]) -> str:
    return _professional_terms_phrase(points, "the core uploaded concepts")


def _fallback_key_concepts(points: List[dict], limit: int = 4) -> str:
    if not points:
        return "- **Core idea**: Read the uploaded material for its concepts, examples, mechanisms, and limits."
    lines = []
    for point in points[:limit]:
        lines.append(
            f"- **{point['title']}**: {point.get('core') or point.get('excerpt') or 'This is a core learning target.'}"
        )
    return "\n".join(lines)


def _fallback_common_traps(points: List[dict], limit: int = 4) -> str:
    if not points:
        return "- Do not stop at naming the topic. Explain the mechanism and the limit."
    return "\n".join(f"- **{point['title']}**: {point.get('trap') or 'Explain the idea, not just the label.'}" for point in points[:limit])


def _fallback_visual_examples(visual_cards: List[dict]) -> str:
    blocks = []
    for marker_index, point in enumerate(_fallback_visual_learning_points(visual_cards)):
        blocks.append(
            f"### {point['title']}\n\n"
            f"**What it shows:** {point['excerpt']}\n\n"
            f"**Why it matters:** {point['core']}\n\n"
            f"[[VISUAL:{point.get('marker_index', marker_index)}]]"
        )
    return "\n\n".join(blocks)
