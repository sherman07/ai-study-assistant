# -------------------------
# Source-unit builders
# -------------------------
def file_to_source_unit(name: str, content_type: str, data: bytes) -> Tuple[List[dict], dict]:
    lower_name = (name or "").lower()
    parts: List[dict] = []
    raw_file_hash = sha256_bytes(data)
    source_meta = {
        "display_name": name or "uploaded file",
        "source_identity": f"file:{raw_file_hash}",
        "title_candidate": name or "uploaded file",
        "content_hash": raw_file_hash,
        "file_hash": raw_file_hash,
    }

    if content_type and content_type.startswith("image/"):
        visual_label = {
            "type": "text",
            "text": (
                f"IN-TEXT SOURCE FIGURE FROM {name} - uploaded image source. "
                "This uploaded image is primary source evidence. Inspect the actual image for any "
                "chart, table, graph, diagram, formula, data, result, comparison, method figure, "
                "screenshot text, or labelled teaching structure before deciding whether it is useful."
            ),
        }
        image_part = image_part_from_bytes(data, content_type)
        parts.append({
            "type": "text",
            "text": f"\n\nSOURCE FILE: {name}\nThis is an uploaded image. Use the attached image as primary evidence.",
        })
        parts.append(visual_label)
        parts.append(image_part)
        source_meta["text_excerpt"] = (
            f"Uploaded image file: {name}. Visual analysis should use the attached image as primary source evidence."
        )
        source_meta["visual_parts"] = [visual_label, image_part]
        return parts, source_meta

    is_audio_video = (
        (content_type and (content_type.startswith("audio/") or content_type.startswith("video/")))
        or lower_name.endswith((".mp3", ".m4a", ".wav", ".webm", ".mp4", ".mov", ".m4v", ".avi", ".mkv"))
    )

    frame_parts: List[dict] = []
    if is_audio_video:
        transcript = transcribe_media_bytes(name, data) if has_openai() else "Audio/video transcription requires a valid OPENAI_API_KEY."
        text = transcript
        if lower_name.endswith((".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv")):
            suffix = Path(name or "video.mp4").suffix or ".mp4"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(data)
                temp_path = temp_file.name
            try:
                frame_parts = extract_video_frames_from_file(temp_path, source_name=name or "uploaded video")
            finally:
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
    elif lower_name.endswith(".pdf") or content_type == "application/pdf":
        text = extract_pdf(data)
        frame_parts = (
            render_pdf_visual_parts(data, name, MAX_VISUAL_IMAGES_PER_SOURCE)
            if ENABLE_PDF_VISUAL_EXTRACTION
            else []
        )
    elif lower_name.endswith(".pptx"):
        text, frame_parts = extract_pptx(data, name)
    elif lower_name.endswith(".docx"):
        text = extract_docx(data)
    else:
        text = extract_text_file(data)

    detected_title = detect_legislation_title(text[:4000]) or detect_course_or_topic_title(text[:2500]) or (name or "uploaded file")
    source_meta["title_candidate"] = detected_title
    source_meta["content_hash"] = sha256_text(f"{raw_file_hash}\n{text[:50000]}")
    source_meta["source_identity"] = f"file:{raw_file_hash}"
    source_meta["text_excerpt"] = truncate_text(text, 60000)
    source_meta["visual_parts"] = frame_parts

    parts.append({
        "type": "text",
        "text": (
            f"\n\nSOURCE FILE: {name}\n"
            f"Detected title/topic: {detected_title}\n"
            f"Extracted content:\n{truncate_text(text)}"
        ),
    })
    parts.extend(frame_parts)
    return parts, source_meta


def link_to_source_unit(url: str) -> Tuple[List[dict], dict]:
    if get_youtube_video_id(url):
        transcript, frame_parts, meta = analyse_youtube_url(url)
        parts = [{
            "type": "text",
            "text": (
                f"\n\nSOURCE YOUTUBE VIDEO: {meta.get('url') or url}\n"
                f"Stable identity: {meta['source_identity']}\n"
                f"Detected title/topic: {meta['detected_title']}\n"
                f"Transcript:\n{truncate_text(transcript)}"
            ),
        }]
        parts.extend(frame_parts)
        return parts, {
            "display_name": meta.get("url") or url,
            "source_identity": meta["source_identity"],
            "title_candidate": meta["detected_title"],
            "url": meta.get("url") or canonicalize_youtube_watch_url(url),
            "content_hash": meta["content_hash"],
            "text_excerpt": transcript,
            "visual_parts": frame_parts or meta.get("visual_parts") or [],
            "transcript_status": meta.get("transcript_status", "unknown"),
            "transcript_characters": meta.get("transcript_characters", 0),
            "transcript_warning": meta.get("transcript_warning", ""),
        }

    url = normalize_public_http_url(url, "source URL")
    parsed = urlparse(url)
    lower_path = parsed.path.lower()
    if lower_path.endswith((".mp3", ".m4a", ".wav", ".mp4", ".webm", ".mov", ".avi", ".mkv")):
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        data = urlopen_bytes(req, timeout=20, max_bytes=MAX_VIDEO_BYTES + 1)
        frame_parts: List[dict] = []
        linked_name = Path(parsed.path).name or "linked media"
        if lower_path.endswith((".mp4", ".webm", ".mov", ".avi", ".mkv")):
            suffix = Path(linked_name).suffix or ".mp4"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(data)
                temp_path = temp_file.name
            try:
                frame_parts = extract_video_frames_from_file(temp_path, source_name=linked_name)
            finally:
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
        transcript = transcribe_media_bytes(Path(parsed.path).name or "linked-media", data) if has_openai() else "Media transcription requires a valid OPENAI_API_KEY."
        parts = [{"type": "text", "text": f"\n\nSOURCE MEDIA LINK: {url}\nTranscript:\n{truncate_text(transcript)}"}]
        parts.extend(frame_parts)
        return parts, {
            "display_name": url,
            "source_identity": canonicalize_url(url)[1],
            "title_candidate": linked_name,
            "content_hash": sha256_text(transcript),
            "text_excerpt": transcript,
            "visual_parts": frame_parts,
        }

    try:
        webpage_text, meta = fetch_webpage(url)
        detected_title = meta.get("detected_title") or url
        parts = [{
            "type": "text",
            "text": (
                f"\n\nSOURCE WEBPAGE: {meta['url']}\n"
                f"Stable identity: {meta['source_identity']}\n"
                f"Detected title: {detected_title}\n"
                f"Main webpage text:\n{truncate_text(webpage_text)}"
            ),
        }]
        return parts, {
            "display_name": meta["url"],
            "source_identity": meta["source_identity"],
            "title_candidate": detected_title,
            "content_hash": meta["content_hash"],
            "text_excerpt": webpage_text,
        }
    except Exception as error:
        canonical_url, stable_identity = canonicalize_url(url)
        message = (
            f"\n\nSOURCE WEBPAGE: {canonical_url}\n"
            f"Stable identity: {stable_identity}\n"
            f"The webpage could not be accessed by the backend. Error: {str(error)}\n"
            "Do not guess the content of this webpage. Analyse only this access failure and any other uploaded sources."
        )
        return [{"type": "text", "text": message}], {
            "display_name": canonical_url,
            "source_identity": f"inaccessible:{stable_identity}",
            "title_candidate": canonical_url,
            "content_hash": sha256_text(str(error)),
            "text_excerpt": message,
        }


def youtube_source_key(url: str) -> Optional[str]:
    video_id = get_youtube_video_id(url)
    return f"youtube:{video_id}" if video_id else None


def expand_embedded_youtube_sources(text: str, parent_meta: dict, seen_youtube_sources: set) -> Tuple[List[dict], List[dict], List[str]]:
    """Turn YouTube URLs found inside an uploaded file's extracted text into real source units."""
    if not ENABLE_EMBEDDED_YOUTUBE_SOURCES:
        return [], [], []

    embedded_parts: List[dict] = []
    embedded_units: List[dict] = []
    embedded_titles: List[str] = []
    parent_name = parent_meta.get("display_name") or parent_meta.get("title_candidate") or "uploaded source"

    for url in extract_youtube_urls_from_text(text):
        key = youtube_source_key(url)
        if not key or key in seen_youtube_sources:
            continue
        seen_youtube_sources.add(key)
        parts, meta = link_to_source_unit(url)
        title = meta.get("title_candidate") or meta.get("display_name") or url
        embedded_parts.append({
            "type": "text",
            "text": (
                f"\n\nEMBEDDED YOUTUBE LINK DETECTED IN SOURCE FILE: {parent_name}\n"
                f"Synapse expanded this link into an analyzable transcript source instead of treating it as plain slide text.\n"
                f"Embedded URL: {url}\n"
                f"Video source title/topic: {title}"
            ),
        })
        embedded_parts.extend(parts)
        meta["display_name"] = f"Embedded YouTube from {parent_name}: {title}"
        meta["parent_source"] = parent_name
        meta["embedded_url"] = url
        embedded_units.append(meta)
        embedded_titles.append(title)

    return embedded_parts, embedded_units, embedded_titles


def build_analysis_fingerprint(
    preferred_language: str,
    units: List[dict],
    depth: str = "auto",
    prompt_mode: str = "professor_mode",
    note_length_mode: str = "standard_notes",
    ai_provider: str = "",
) -> str:
    identity_bits = [
        f"cache:{globals().get('CACHE_VERSION', 'v0')}",
        f"visual_pipeline:{globals().get('VISUAL_PIPELINE_VERSION', 'visual-v0')}",
        f"ai_provider:{normalise_text_provider(ai_provider) if 'normalise_text_provider' in globals() else (ai_provider or 'openai')}",
        f"lang:{preferred_language or 'auto'}",
        f"depth:{depth or 'auto'}",
        f"prompt_mode:{normalise_note_prompt_mode(prompt_mode)}",
        f"note_length:{normalise_note_length_mode(note_length_mode)}",
        f"prompt_hash:{prompt_mode_prompt_hash(prompt_mode)}",
    ]
    for unit in units:
        source_identity = unit.get("source_identity") or ""
        content_hash = unit.get("content_hash") or ""
        if source_identity.startswith("nzl_act:"):
            identity_bits.append(f"id:{source_identity}")
        else:
            identity_bits.append(f"id:{source_identity}|hash:{content_hash}")
    return sha256_text("||".join(identity_bits))




def normalise_plain_sqrt_text(text: str) -> str:
    """Make plain sqrt(...) readable when a model returns non-LaTeX math."""
    if not text:
        return ""
    value = str(text)
    value = re.sub(r"(?i)sqrt\s*\(\s*([^()\n]+?)\s*\)", r"√(\1)", value)
    value = re.sub(r"(?i)sqrt\s*([0-9A-Za-z]+)", r"√(\1)", value)
    value = re.sub(r"\(\s*√\(([^()]+)\)\s*\)\s*\^\s*([0-9]+)", r"(√(\1))^\2", value)
    value = re.sub(r"\s+", " ", value) if "\n" not in value else value
    return value



LANGUAGE_POLICIES = {
    "auto": {
        "name": "the source's main language",
        "instruction": "Use only the source's dominant language. If the source is English, write only English. Do not add bilingual headings, Chinese translations, or mixed-language section titles unless the source itself is mixed-language.",
        "rewrite": False,
    },
    "english": {
        "name": "English",
        "instruction": "Write everything in English.",
        "rewrite": True,
    },
    "simplified_chinese": {
        "name": "Simplified Chinese",
        "instruction": "Write everything in Simplified Chinese. Keep short key English technical terms in brackets only when helpful.",
        "rewrite": True,
    },
    "traditional_chinese": {
        "name": "Traditional Chinese",
        "instruction": "Write everything in Traditional Chinese. Keep short key English technical terms in brackets only when helpful.",
        "rewrite": True,
    },
    "mixed_chinese_english": {
        "name": "mainly Chinese with key English academic terms in brackets",
        "instruction": "Write mainly in Chinese and keep important academic or technical terms in English brackets when useful.",
        "rewrite": True,
    },
    "japanese": {"name": "Japanese", "instruction": "Write everything in Japanese.", "rewrite": True},
    "korean": {"name": "Korean", "instruction": "Write everything in Korean.", "rewrite": True},
    "french": {"name": "French", "instruction": "Write everything in French.", "rewrite": True},
    "spanish": {"name": "Spanish", "instruction": "Write everything in Spanish.", "rewrite": True},
    "german": {"name": "German", "instruction": "Write everything in German.", "rewrite": True},
    "italian": {"name": "Italian", "instruction": "Write everything in Italian.", "rewrite": True},
    "portuguese": {"name": "Portuguese", "instruction": "Write everything in Portuguese.", "rewrite": True},
    "arabic": {"name": "Arabic", "instruction": "Write everything in Arabic.", "rewrite": True},
    "hindi": {"name": "Hindi", "instruction": "Write everything in Hindi.", "rewrite": True},
    "vietnamese": {"name": "Vietnamese", "instruction": "Write everything in Vietnamese.", "rewrite": True},
    "thai": {"name": "Thai", "instruction": "Write everything in Thai.", "rewrite": True},
    "indonesian": {"name": "Indonesian", "instruction": "Write everything in Indonesian.", "rewrite": True},
    "malay": {"name": "Malay", "instruction": "Write everything in Malay.", "rewrite": True},
    "russian": {"name": "Russian", "instruction": "Write everything in Russian.", "rewrite": True},
}


def normalise_language_key(preferred_language: str) -> str:
    key = (preferred_language or "auto").strip().lower().replace("-", "_")
    aliases = {
        "en": "english",
        "eng": "english",
        "zh": "simplified_chinese",
        "zh_cn": "simplified_chinese",
        "zh_hans": "simplified_chinese",
        "chinese": "simplified_chinese",
        "中文": "simplified_chinese",
        "简体": "simplified_chinese",
        "简体中文": "simplified_chinese",
        "simplified": "simplified_chinese",
        "zh_tw": "traditional_chinese",
        "zh_hant": "traditional_chinese",
        "繁體": "traditional_chinese",
        "繁體中文": "traditional_chinese",
        "traditional": "traditional_chinese",
        "ja": "japanese",
        "jp": "japanese",
        "ko": "korean",
        "kr": "korean",
        "fr": "french",
        "es": "spanish",
        "de": "german",
        "it": "italian",
        "pt": "portuguese",
        "ar": "arabic",
        "hi": "hindi",
        "vi": "vietnamese",
        "th": "thai",
        "id": "indonesian",
        "ms": "malay",
        "ru": "russian",
    }
    key = aliases.get(key, key)
    return key if key in LANGUAGE_POLICIES else "auto"


def target_language_name(preferred_language: str) -> str:
    key = normalise_language_key(preferred_language)
    return LANGUAGE_POLICIES[key]["name"]


def language_instruction_for(preferred_language: str) -> str:
    key = normalise_language_key(preferred_language)
    return LANGUAGE_POLICIES[key]["instruction"]


def detect_dominant_source_language_key(source_text: str) -> str:
    """Best-effort language detection for Auto output without adding dependencies."""
    text = source_text or ""
    if not text.strip():
        return "english"
    chinese_chars = len(re.findall(r"[\u4e00-\u9fff]", text))
    japanese_chars = len(re.findall(r"[\u3040-\u30ff]", text))
    korean_chars = len(re.findall(r"[\uac00-\ud7af]", text))
    arabic_chars = len(re.findall(r"[\u0600-\u06ff]", text))
    latin_words = len(re.findall(r"\b[A-Za-z]{3,}\b", text))

    if japanese_chars >= 30 and japanese_chars >= chinese_chars * 0.4:
        return "japanese"
    if korean_chars >= 30:
        return "korean"
    if arabic_chars >= 30:
        return "arabic"
    if chinese_chars >= 80 and chinese_chars >= max(30, latin_words * 0.25):
        return "simplified_chinese"
    if latin_words >= 30:
        return "english"
    return "english"


def resolve_generation_language_key(preferred_language: str, source_text: str = "") -> str:
    key = normalise_language_key(preferred_language)
    if key != "auto":
        return key
    return "english"


REALTIME_TRANSCRIPTION_LANGUAGE_CODES = {
    "english": "en",
    "simplified_chinese": "zh",
    "traditional_chinese": "zh",
    "japanese": "ja",
    "korean": "ko",
    "french": "fr",
    "spanish": "es",
    "german": "de",
    "italian": "it",
    "portuguese": "pt",
    "arabic": "ar",
    "hindi": "hi",
    "vietnamese": "vi",
    "thai": "th",
    "indonesian": "id",
    "malay": "ms",
    "russian": "ru",
}


def realtime_transcription_language_code(
    preferred_language: str,
    source_text: str = "",
    explicit_language: str = "",
) -> str:
    """
    Return an ISO-639-1 language hint for Realtime input transcription.
    Auto uses the current note/source language; mixed mode stays automatic so
    genuinely bilingual learners are not forced into a single recognizer.
    """
    explicit = normalise_space(explicit_language).lower().replace("_", "-")
    if explicit in set(REALTIME_TRANSCRIPTION_LANGUAGE_CODES.values()):
        return explicit
    explicit_key = normalise_language_key(explicit_language)
    if explicit_language and explicit_key != "auto":
        return REALTIME_TRANSCRIPTION_LANGUAGE_CODES.get(explicit_key, "")

    key = normalise_language_key(preferred_language)
    if key == "mixed_chinese_english":
        return ""
    if key == "auto":
        key = detect_dominant_source_language_key(source_text)
    return REALTIME_TRANSCRIPTION_LANGUAGE_CODES.get(key, "")


def language_instruction_for_generation(preferred_language: str, source_text: str = "") -> str:
    requested_key = normalise_language_key(preferred_language)
    if requested_key != "auto":
        return language_instruction_for(requested_key)
    default_key = resolve_generation_language_key(preferred_language, source_text)
    return (
        "Auto language uses English by default. "
        f"{LANGUAGE_POLICIES[default_key]['instruction']} "
        "Keep the entire generated notes page in this one language. "
        "Do not use bilingual headings or add translations from another language."
    )


def source_strict_note_structure_for_language(preferred_language: str, source_text: str = "") -> str:
    return "\n".join([
        "# [specific topic title]",
        "## Source Question",
        "## Direct Source Claims",
        "## Source Evidence",
        "## Inferences Allowed By The Source",
        "## Gaps / Limits",
        "## Exam / Research Use",
        "## Compact Revision Summary",
    ])


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


def requested_language_already_satisfied(summary: str, language_key: str) -> bool:
    """Avoid a second full rewrite when the primary generation already obeyed the selected language."""
    text = summary or ""
    if not text.strip():
        return True

    cjk = len(re.findall(r"[\u4e00-\u9fff]", text))
    japanese = len(re.findall(r"[\u3040-\u30ff]", text))
    korean = len(re.findall(r"[\uac00-\ud7af]", text))
    arabic = len(re.findall(r"[\u0600-\u06ff]", text))
    devanagari = len(re.findall(r"[\u0900-\u097f]", text))
    thai = len(re.findall(r"[\u0e00-\u0e7f]", text))
    cyrillic = len(re.findall(r"[\u0400-\u04ff]", text))
    latin_words = len(re.findall(r"\b[A-Za-z]{3,}\b", text))
    non_latin = cjk + japanese + korean + arabic + devanagari + thai + cyrillic

    if language_key == "english":
        return non_latin <= max(40, latin_words * 0.18)
    if language_key == "mixed_chinese_english":
        return contains_enough_chinese(text)
    if language_key in {"simplified_chinese", "traditional_chinese"}:
        if not contains_enough_chinese(text):
            return False
        simplified_only = "这习学义证据图复总览语体会与应关数实验证结对观问题说读写"
        traditional_only = "這習學義證據圖複總覽語體會與應關數實驗證結對觀問題說讀寫"
        simplified_hits = sum(text.count(char) for char in simplified_only)
        traditional_hits = sum(text.count(char) for char in traditional_only)
        if language_key == "simplified_chinese":
            return traditional_hits <= max(3, simplified_hits * 0.2)
        return traditional_hits >= max(2, simplified_hits * 0.5)

    script_counts = {
        "japanese": japanese,
        "korean": korean,
        "arabic": arabic,
        "hindi": devanagari,
        "thai": thai,
        "russian": cyrillic,
    }
    if language_key in script_counts:
        count = script_counts[language_key]
        return count >= 40 or count >= max(12, latin_words * 0.25)

    return False


def enforce_requested_language(summary: str, preferred_language: str, request_timeout: Optional[float] = None) -> str:
    """
    Universal language enforcement.
    If the user selects any specific output language, rewrite the whole notes into that language.
    This keeps Generated Content, headings, examples, common mistakes, and critical-thinking questions consistent.
    """
    key = normalise_language_key(preferred_language)
    if key == "auto" or not summary:
        return summary
    if requested_language_already_satisfied(summary, key):
        return summary

    language_name = target_language_name(key)
    language_rule = language_instruction_for(key)
    prompt = f"""
Rewrite the following study notes so they fully follow the selected output language.

Selected language: {language_name}
Language rule: {language_rule}

Strict requirements:
- Preserve the same study meaning and source facts.
- Preserve the same markdown structure using headings with # or ##.
- Translate/rewrite headings, explanations, examples, common mistakes, and critical-thinking questions into the selected language.
- Never translate the product name Synapse. If a heading says "Synapse Summary", rewrite it as the selected-language equivalent of "Overview" instead of translating Synapse.
- Do not add new facts.
- Do not remove important facts, examples, subsections, section numbers, legal duties, calculations, exceptions, or caveats.
- Keep the same level of detail as the original analysis; do not compress the notes during rewriting.
- Keep official names, formulas, code, and short technical terms unchanged only when translation would reduce accuracy.
- Keep mathematical notation readable: use √(x), (a)/(b), r'(t)=<1,2,6t>, and never raw escaped LaTeX like \\( ... \\).
- Output only the rewritten notes.

NOTES TO REWRITE:
{summary}
"""
    try:
        rewritten = generate_chat([
            {"role": "system", "content": "You are a precise multilingual academic editor. You rewrite study notes into the user's selected language while preserving structure, meaning, source faithfulness, and the exact brand name Synapse."},
            {"role": "user", "content": prompt},
        ], model=ANALYSIS_MODEL, temperature=0, max_tokens=12000, request_timeout=request_timeout)
        return rewritten or summary
    except Exception:
        return summary


def localise_title_if_needed(title: str, preferred_language: str, request_timeout: Optional[float] = None) -> str:
    key = normalise_language_key(preferred_language)
    if key in {"auto", "english"} or not title:
        return title
    language_name = target_language_name(key)
    try:
        result = generate_chat([
            {"role": "system", "content": "Translate or localise a short study-note title. Return only the title, no punctuation around it."},
            {"role": "user", "content": f"Translate/localise this title into {language_name}. Keep official legal act names understandable and concise. Never translate the brand name Synapse. Title: {title}"},
        ], model=TITLE_MODEL, temperature=0, max_tokens=80, request_timeout=request_timeout)
        return normalise_space(result)[:90] or title
    except Exception:
        return title
