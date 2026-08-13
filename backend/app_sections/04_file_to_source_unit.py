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


def link_to_source_unit(url: str, captions_only: bool = False) -> Tuple[List[dict], dict]:
    if get_youtube_video_id(url):
        transcript, frame_parts, meta = analyse_youtube_url(url, captions_only=captions_only)
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
