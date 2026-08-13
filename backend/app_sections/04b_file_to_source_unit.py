

def note_structure_for_language(preferred_language: str, source_text: str = "", prompt_mode: str = "professor_mode") -> str:
    prompt_mode_key = normalise_note_prompt_mode(prompt_mode)
    if prompt_mode_key == "source_strict_research_mode":
        return source_strict_note_structure_for_language(preferred_language, source_text)
    if prompt_mode_key == "quick_answer":
        return "\n".join([
            "# [specific topic title]",
            "## Direct Answer",
            "## Why",
            "## What To Do / Remember",
        ])
    if prompt_mode_key == "detailed_explanation":
        return "\n".join([
            "# [specific topic title]",
            "## Main Idea",
            "## Key Concepts",
            "## Step-by-Step Explanation",
            "## Examples / Diagrams / Formulas",
            "## Common Confusions",
            "## Practice / Revision Checklist",
        ])
    if prompt_mode_key == "professor_mode":
        return "\n".join([
            "# Professional Study Guide: [specific topic title]",
            "## 1. Big Picture: What This Material Is Really About",
            "## 2. The Exam Will Probably Test These Ideas",
            "## 3. What You Actually Need To Understand",
            "## 4. Deep Explanation of the Core Concepts",
            "## 5. Concept Connections: How The Ideas Work Together",
            "## 6. Background Knowledge Needed To Understand This Properly",
            "## 7. How To Apply This To New Questions",
            "## 8. Common Mistakes That Lose Marks",
            "## 9. High-Quality Student Thinking",
            "## 10. Model High-Quality Answers",
            "## 11. Exam Question Bank",
            "## 12. Memory and Practice",
        ])
    if prompt_mode_key == "tutor_mode":
        return "\n".join([
            "# [specific topic title]",
            "## Start From The Basic Idea",
            "## Build The Concept Step By Step",
            "## Where Students Usually Get Confused",
            "## Worked Example / Guided Explanation",
            "## Try This",
            "## Check Your Understanding",
        ])
    if prompt_mode_key == "assignment_apa_mode":
        return "\n".join([
            "# [specific topic title]",
            "## Working Thesis / Answer",
            "## APA-Style Outline",
            "## Evidence Paragraphs",
            "## Application / Analysis",
            "## Counterpoint or Limitation",
            "## References From Uploaded Sources",
        ])
    key = resolve_generation_language_key(preferred_language, source_text)
    if key in {"simplified_chinese", "mixed_chinese_english"}:
        return "\n".join([
            "# [具体主题标题]",
            "## 学习问题",
            "## 来源与论点地图",
            "## 核心笔记",
            "## 关键术语与机制",
            "## 结合源内证据讲解概念",
            "## 源内证据怎么读",
            "## 例子与证据表",
            "## 考试策略与常见错误",
            "## 如何使用源内证据",
            "## 复习清单",
        ])
    if key == "traditional_chinese":
        return "\n".join([
            "# [具體主題標題]",
            "## 學習問題",
            "## 來源與論點地圖",
            "## 核心筆記",
            "## 關鍵術語與機制",
            "## 結合源內證據講解概念",
            "## 源內證據怎麼讀",
            "## 例子與證據表",
            "## 考試策略與常見錯誤",
            "## 如何使用源內證據",
            "## 複習清單",
        ])
    return "\n".join([
        "# [specific topic title]",
        "## Learning Question",
        "## Source and Argument Map",
        "## Core Notes",
        "## Key Terms and Mechanisms",
        "## Concepts Explained With Source Evidence",
        "## Reading the Source Evidence",
        "## Worked Examples and Evidence Matrix",
        "## Exam Strategy and Common Mistakes",
        "## How To Use Source Evidence",
        "## Revision Checklist",
    ])


def remove_auto_bilingual_heading_leakage(summary: str, preferred_language: str, source_text: str = "") -> str:
    """When Auto detects English, remove accidental Chinese translations from headings."""
    if not summary or normalise_language_key(preferred_language) != "auto":
        return summary
    if resolve_generation_language_key(preferred_language, source_text) != "english":
        return summary

    cleaned_lines: List[str] = []
    for line in summary.splitlines():
        heading_match = re.match(r"^(\s*#{1,4}\s+)(.+?)\s*$", line)
        if not heading_match:
            cleaned_lines.append(line)
            continue
        prefix, heading = heading_match.groups()
        if "/" in heading:
            left, right = [part.strip() for part in heading.split("/", 1)]
            if re.search(r"[A-Za-z]", left) and re.search(r"[\u4e00-\u9fff]", right):
                heading = left
        cleaned_lines.append(prefix + heading)
    return "\n".join(cleaned_lines)


READABILITY_NOTE_LABEL_PATTERN = re.compile(
    r"^(Definition(?:/mechanism)?|Mechanism|Explanation|Source example|Source evidence|Evidence|Implication|"
    r"Limitation(?:/(?:misunderstanding|mistake))?|Common mistake|Exam use|Memory hook|Why it matters|How to read it|What to remember|"
    r"定义|定義|解释|解釋|来源例子|來源例子|源内证据|源內證據|证据|證據|含义|意義|局限|误区|誤區|"
    r"考试用法|考試用法|常见错误|常見錯誤|记忆钩子|記憶鉤子|为什么重要|為什麼重要|怎么读|怎麼讀|需要记住)\s*[:：]\s*",
    flags=re.I,
)


def polish_note_readability_markdown(summary: str, preferred_language: str = "auto") -> str:
    """Remove visible prompt scaffolding and soften repetitive AI-note structures."""
    if not summary:
        return summary

    canonical_headings = [
        (r"Learning question|学习问题|學習問題", "Learning Question", "学习问题", "學習問題"),
        (r"Key takeaways?|关键结论|關鍵結論", "Key Takeaways", "关键结论", "關鍵結論"),
        (r"Core concept map|核心概念图|核心概念圖", "Core Concept Map", "核心概念图", "核心概念圖"),
        (r"Main notes by lecture section|分章节主笔记|分章節主筆記", "Main Notes by Lecture Section", "分章节主笔记", "分章節主筆記"),
        (r"Key terms table|关键术语表|關鍵術語表", "Key Terms Table", "关键术语表", "關鍵術語表"),
        (r"Case study\s*/\s*example breakdown|案例\s*/\s*例子拆解", "Case Study / Example Breakdown", "案例 / 例子拆解", "案例 / 例子拆解"),
        (r"Evidence bank|证据库|證據庫", "Evidence Bank", "证据库", "證據庫"),
        (r"Exam answer templates|考试答题模板|考試答題模板", "Exam Answer Templates", "考试答题模板", "考試答題模板"),
        (r"Source and argument map|来源与论点地图|來源與論點地圖", "Source and Argument Map", "来源与论点地图", "來源與論點地圖"),
        (r"Core notes?|核心笔记|核心筆記", "Core Notes", "核心笔记", "核心筆記"),
        (r"Key terms(?: and mechanisms)?|关键术语与机制|關鍵術語與機制", "Key Terms and Mechanisms", "关键术语与机制", "關鍵術語與機制"),
        (r"Concepts? explained(?: with source evidence)?|结合源内证据讲解概念|結合源內證據講解概念", "Concepts Explained With Source Evidence", "结合源内证据讲解概念", "結合源內證據講解概念"),
        (r"Reading the source evidence|源内证据怎么读|源內證據怎麼讀", "Reading the Source Evidence", "源内证据怎么读", "源內證據怎麼讀"),
        (r"Worked examples?(?!\s*/\s*guided)(?: and evidence matrix)?|Source evidence\s*/\s*example matrix|例子与证据表|例子與證據表", "Worked Examples and Evidence", "例子与证据", "例子與證據"),
        (r"Exam strategy(?: and common student mistakes)?|考试策略与常见错误|考試策略與常見錯誤", "Exam Strategy and Common Mistakes", "考试策略与常见错误", "考試策略與常見錯誤"),
        (r"How to use major pieces of source evidence|Using source evidence|使用源内证据|使用源內證據", "Using Source Evidence", "使用源内证据", "使用源內證據"),
        (r"Common mistakes|常见错误|常見錯誤", "Common Mistakes", "常见错误", "常見錯誤"),
        (r"Revision checklist|复习清单|複習清單", "Revision Checklist", "复习清单", "複習清單"),
        (r"Flashcard-ready summary|闪卡速记总结|閃卡速記總結", "Flashcard-ready Summary", "闪卡速记总结", "閃卡速記總結"),
    ]

    def canonical_heading_text(title: str) -> str:
        key = normalise_language_key(preferred_language)
        clean = normalise_space(title)
        clean = re.sub(r"\s*[\(（][^)\n）]*(?:->|→|definition|claim|evidence|visual|explicit|teach|exam|quick|writing|interpret|source|定义|定義|证据|證據|图|圖)[^)\n）]*[\)）]\s*", "", clean, flags=re.I)
        clean = re.sub(r"\s*(?:—|--|-|:)\s*(?:what\b|how\b|teach\b|then\b|quick\b|high-level\b|definition\b|explicit\b|interpret\b|source\b).*$", "", clean, flags=re.I)
        for pattern, english, simplified, traditional in canonical_headings:
            if re.search(rf"^(?:{pattern})\b", clean, flags=re.I):
                if key == "traditional_chinese":
                    return traditional
                if key in {"simplified_chinese", "mixed_chinese_english"}:
                    return simplified
                return english
        return clean

    def split_visual_marker_line(line: str) -> Optional[List[str]]:
        if not re.search(r"\[\[VISUAL:\d+\]\]", line or ""):
            return None
        stripped = line.strip()
        if re.fullmatch(r"\[\[VISUAL:\d+\]\]", stripped):
            return [stripped]
        stripped = re.sub(r"^\s*(?:[-*+]\s+|\d+[.)]\s+)", "", stripped)
        marker_match = re.search(r"\[\[VISUAL:(\d+)\]\]", stripped)
        if not marker_match:
            return [line]
        marker = marker_match.group(0)
        before = normalise_space(stripped[:marker_match.start()])
        after = normalise_space(stripped[marker_match.end():])
        before = re.sub(r"^(?:before|after)\s+(?:the\s+)?(?:visual|image|figure|source figure|source image)\s*[:：-]?\s*$", "", before, flags=re.I)
        before = re.sub(r"^(?:before|after)\s*[:：-]?\s*$", "", before, flags=re.I)
        after = re.sub(r"^[:：,;.\-\s]+", "", after)
        after = re.sub(r"^(?:after|before)\s+(?:the\s+)?(?:visual|image|figure|source figure|source image)\s*[:：-]?\s*", "", after, flags=re.I)
        pieces: List[str] = []
        if before:
            pieces.append(before)
        pieces.append(marker)
        if after:
            pieces.append(after)
        return pieces

    template_heading_pattern = re.compile(
        r"^\s*(?P<hashes>#{1,4}\s*)?(?P<title>"
        r"Learning question|Key takeaways?|Core concept map|Main notes by lecture section|Key terms table|"
        r"Case study\s*/\s*example breakdown|Evidence bank|Exam answer templates|Common mistakes|Flashcard-ready summary|"
        r"Source and argument map|Core notes?|Key terms(?: and mechanisms)?|Concepts? explained(?: with source evidence)?|"
        r"Reading the source evidence|Worked examples?(?: and evidence matrix)?|Source evidence\s*/\s*example matrix|Exam strategy(?: and common student mistakes)?|"
        r"How to use major pieces of source evidence|Revision checklist|"
        r"学习问题|关键结论|核心概念图|分章节主笔记|关键术语表|案例\s*/\s*例子拆解|证据库|考试答题模板|常见错误|复习清单|闪卡速记总结|"
        r"學習問題|關鍵結論|核心概念圖|分章節主筆記|關鍵術語表|案例\s*/\s*例子拆解|證據庫|考試答題模板|常見錯誤|複習清單|閃卡速記總結|"
        r"來源與論點地圖|来源与论点地图|核心笔记|核心筆記|关键术语与机制|關鍵術語與機制"
        r")\b.*$",
        flags=re.I,
    )
    list_item_pattern = re.compile(r"^(\s*)\d+\.\s+(.+?)\s*$")

    def has_template_label(line: str) -> bool:
        stripped = line.strip()
        stripped = re.sub(r"^[-*]\s+", "", stripped)
        return bool(READABILITY_NOTE_LABEL_PATTERN.match(stripped))

    raw_lines = (summary or "").splitlines()
    lines: List[str] = []
    for index, raw_line in enumerate(raw_lines):
        line = raw_line.rstrip()
        stripped = line.strip()

        template_heading = template_heading_pattern.match(stripped)
        if template_heading:
            hashes = template_heading.group("hashes") or "## "
            title = canonical_heading_text(template_heading.group("title"))
            lines.append(f"{hashes}{title}".rstrip())
            continue

        visual_split = split_visual_marker_line(line)
        if visual_split is not None:
            lines.extend(visual_split)
            continue

        ordered_match = list_item_pattern.match(line)
        if ordered_match:
            next_nonblank = ""
            for next_line in raw_lines[index + 1:]:
                if next_line.strip():
                    next_nonblank = next_line
                    break
            if has_template_label(next_nonblank):
                concept_title = ordered_match.group(2).strip()
                if 3 <= len(concept_title) <= 140 and not concept_title.endswith(":"):
                    lines.append(f"### {concept_title}")
                    continue

        label_match = re.match(r"^(\s*[-*]\s+)(.+)$", line)
        if label_match:
            _, body = label_match.groups()
            body = READABILITY_NOTE_LABEL_PATTERN.sub(
                lambda match: f"**{match.group(1)}:** ",
                body,
                count=1,
            )
            line = body

        lines.append(line)

    text = "\n".join(lines)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text.strip()


def dedupe_visual_markers(summary: str) -> str:
    """Keep each in-text source figure marker once so generated notes do not render duplicate references."""
    if not summary:
        return summary

    seen_markers = set()
    kept_lines: List[str] = []
    previous_blank = False
    marker_line_pattern = re.compile(r"^\s*\[\[VISUAL:(\d+)\]\]\s*$")

    for raw_line in summary.splitlines():
        marker_match = marker_line_pattern.match(raw_line)
        if marker_match:
            marker_id = int(marker_match.group(1))
            if marker_id in seen_markers:
                continue
            seen_markers.add(marker_id)

        is_blank = not raw_line.strip()
        if is_blank and previous_blank:
            continue
        kept_lines.append(raw_line.rstrip())
        previous_blank = is_blank

    return re.sub(r"\n{4,}", "\n\n\n", "\n".join(kept_lines)).strip()


def markdown_table_count(text: str) -> int:
    return len(re.findall(r"(?m)^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$", text or ""))


def markdown_heading_count(text: str) -> int:
    return len(re.findall(r"(?m)^\s*#{1,4}\s+\S+", text or ""))


def source_looks_academic_or_dense(source_context: str) -> bool:
    value = (source_context or "").lower()
    signals = len(re.findall(
        r"\b(lecture|slide|chapter|study|experiment|method|results?|figure|table|data|theory|model|"
        r"evidence|correlation|comparison|definition|exam|limitation|critique|argument|hypothesis|"
        r"psychology|biology|genetics|neuroscience|law|formula|equation)\b|图|表|实验|数据|理论|模型|证据|比较|局限|定义",
        value,
        flags=re.I,
    ))
    return count_readable_units(source_context) >= 1800 or signals >= 14


PROFESSIONAL_TEMPLATE_PHRASES = (
    "add only the background knowledge that makes the source easier to understand",
    "to transfer the idea, identify the concept",
    "a strong answer does more than repeat the source",
    "use this sequence: define the concept",
    "a high-quality response states the key judgement clearly",
    "the value of this material is not just what the source says",
    "the key task is to understand the central ideas",
    "focus on the mental model behind the content",
    "connect the material as a learning chain",
)

SOURCE_ANCHOR_STOPWORDS = {
    "about", "accessed", "after", "again", "against", "answer", "appears", "because",
    "before", "being", "between", "channel", "could", "definition", "describes",
    "discussion", "document", "duration", "example", "explains", "figure", "first",
    "from", "general", "important", "inside", "lecture", "material", "metadata",
    "model", "notes", "original", "provided", "readable", "really", "section",
    "source", "states", "study", "terms", "text", "their", "there", "these",
    "thing", "title", "transcript", "uploaded", "video", "where", "which", "with",
    "would", "youtube",
    "course", "dr", "intro", "older", "outline", "psych", "slide", "slides",
    "week", "wiser", "broader", "christopher", "contemporary", "field", "growing",
    "ideas", "major", "picture", "place", "students", "think", "understand", "views",
}


def source_specific_anchor_terms(source_context: str, limit: int = 18) -> List[str]:
    terms: List[str] = []
    seen = set()
    for token in re.findall(r"\b[A-Za-z][A-Za-z'-]{4,}\b", source_context or ""):
        term = token.strip("'").lower()
        if term in SOURCE_ANCHOR_STOPWORDS or len(term) < 5:
            continue
        if term in seen:
            continue
        seen.add(term)
        terms.append(term)
        if len(terms) >= limit:
            break
    return terms


def source_anchor_hit_count(summary: str, source_context: str) -> int:
    lower_summary = (summary or "").lower()
    return sum(1 for term in source_specific_anchor_terms(source_context) if term in lower_summary)


def advanced_notes_quality_flags(summary: str, source_context: str) -> List[str]:
    """Return detail gaps that should trigger a targeted expansion pass."""
    flags: List[str] = []
    text = summary or ""
    lower = text.lower()
    units = count_readable_units(text)
    headings = markdown_heading_count(text)
    tables = markdown_table_count(text)
    dense_source = source_looks_academic_or_dense(source_context)

    if units < RICH_INLINE_MIN_OUTPUT_UNITS:
        flags.append("too short for advanced study notes")
    if dense_source and headings < ADVANCED_NOTES_MIN_HEADINGS:
        flags.append("too few navigable teaching sections")
    if dense_source and tables < ADVANCED_NOTES_MIN_TABLES and re.search(
        r"\b(table|figure|graph|chart|correlation|comparison|data|results?|study|experiment|mean|median|rate|percentage)\b|图|表|数据|实验|结果|对比",
        source_context or "",
        flags=re.I,
    ):
        flags.append("missing comparison/evidence tables")

    required_signals = {
        "evidence": r"\b(evidence|source|data|study|experiment|result|finding|example)\b|证据|数据|实验|例子",
        "limitation": r"\b(limitation|caveat|critique|problem|weakness|misleading|cannot|does not prove)\b|局限|限制|误区|不能证明",
        "exam use": r"\b(exam|essay|answer|revision|remember|application|use this)\b|考试|答题|复习|应用",
        "mechanism": r"\b(mechanism|process|because|therefore|works by|leads to|explains why)\b|机制|过程|因为|所以",
    }
    for label, pattern in required_signals.items():
        if not re.search(pattern, lower, flags=re.I):
            flags.append(f"missing {label}")
    if any(phrase in lower for phrase in PROFESSIONAL_TEMPLATE_PHRASES):
        flags.append("professional output is template-like")
    anchor_terms = source_specific_anchor_terms(source_context)
    if len(anchor_terms) >= 5 and source_anchor_hit_count(text, source_context) < 3:
        flags.append("too few source-specific concepts")
    return flags


def localized_overview_heading(preferred_language: str) -> str:
    key = normalise_language_key(preferred_language)
    mapping = {
        "english": "Overview",
        "simplified_chinese": "概述",
        "traditional_chinese": "概覽",
        "mixed_chinese_english": "概述",
        "japanese": "概要",
        "korean": "개요",
        "french": "Vue d’ensemble",
        "spanish": "Resumen general",
        "german": "Überblick",
        "italian": "Panoramica",
        "portuguese": "Visão geral",
        "arabic": "نظرة عامة",
        "hindi": "अवलोकन",
        "vietnamese": "Tổng quan",
        "thai": "ภาพรวม",
        "indonesian": "Gambaran Umum",
        "malay": "Gambaran Keseluruhan",
        "russian": "Обзор",
    }
    return mapping.get(key, "Overview")


def protect_synapse_brand_and_first_heading(summary: str, preferred_language: str) -> str:
    """Protect the Synapse brand and remove the awkward translated heading 突触总结."""
    if not summary:
        return summary
    overview = localized_overview_heading(preferred_language)
    value = summary

    # Specific heading fixes first.
    value = re.sub(r"(?im)^\s*#{1,3}\s*(突触总结|突觸總結|突触概要|突觸概要)\s*$", f"# {overview}", value)
    value = re.sub(r"(?im)^\s*#{1,3}\s*Synapse\s+Summary\s*$", f"# {overview}", value)

    # Protect brand references elsewhere. Do not translate the product name.
    value = value.replace("突触", "Synapse")
    value = value.replace("突觸", "Synapse")

    # If the model produced notes without a first heading, add a localised overview heading.
    stripped = value.lstrip()
    if stripped and not stripped.startswith("#"):
        value = f"# {overview}\n" + value

    return value


def should_rewrite_for_language(preferred_language: str) -> bool:
    key = normalise_language_key(preferred_language)
    return bool(LANGUAGE_POLICIES[key].get("rewrite"))


def contains_enough_chinese(text: str) -> bool:
    if not text:
        return False
    cjk = len(re.findall(r"[\u4e00-\u9fff]", text))
    latin_words = len(re.findall(r"\b[A-Za-z]{3,}\b", text))
    return cjk >= 80 or cjk >= latin_words * 0.35
