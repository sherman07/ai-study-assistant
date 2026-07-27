def build_refusal_repair_messages(original_messages: List[dict], language_rule: str, title_hint: str, source_units: List[dict]) -> List[dict]:
    identity_lines = []
    for index, unit in enumerate(source_units, start=1):
        identity_lines.append(
            f"Source {index}: display_name={unit.get('display_name')} | stable_identity={unit.get('source_identity')} | title_candidate={unit.get('title_candidate')}"
        )

    repair_prompt = f"""
The previous attempt produced a refusal or an unusably short answer. Retry as an educational study-note generator.

This is allowed content: the user is asking for academic study notes about material they provided. You are not giving professional legal, medical, financial, or safety instructions. For legal/policy material, explain the text for study purposes only and include a short note that this is not legal advice if appropriate.

Mandatory output language: {language_rule}
Never translate the product name Synapse.

Most likely source title/topic from explicit evidence: {title_hint}
Stable source identity list:
{chr(10).join(identity_lines)}

Output a detailed study guide using EXACTLY these headings, translated/localised into the selected language where appropriate:
# Overview
## Core Argument
## Key Ideas
## Step-by-step Breakdown
## Worked Example / Evidence From Source
## Tutor Explanation
## Common Mistakes
## Critical Thinking

Quality requirements:
- Do not refuse.
- Do not write “I cannot assist”.
- Do not output a one-sentence answer.
- Be source-faithful and detailed.
- Use the actual source title, sections, definitions, formulas, examples, and calculations where visible.
- If some source content is missing, explain what is available and what is missing, but still produce useful study notes from the readable evidence.
"""
    repaired = list(original_messages)
    repaired.insert(1, {"role": "user", "content": repair_prompt})
    return repaired


def generate_study_notes_with_quality_guard(
    messages: List[dict],
    preferred_language: str,
    title_hint: str,
    source_units: List[dict],
    content_parts: List[dict],
    depth_plan: Optional[dict] = None,
) -> str:
    if content_text_length(content_parts) < 80:
        raise RuntimeError("The source was not readable enough to generate notes. Check the URL/file extraction or paste the text directly.")

    language_rule = language_instruction_for(preferred_language)
    depth_plan = depth_plan or {"depth": "detailed", "config": DEPTH_CONFIG["detailed"]}
    depth = depth_plan.get("depth", "detailed")
    config = depth_plan.get("config", DEPTH_CONFIG.get(depth, DEPTH_CONFIG["detailed"]))
    analysis_model = model_for_depth(depth)
    first = generate_chat(messages, model=analysis_model, temperature=0, max_tokens=int(config.get("max_output_tokens", 8000)))
    if not is_refusal_or_useless_response(first) and not is_weak_multisource_response(first, len(source_units or [])):
        return first

    retry_messages = build_refusal_repair_messages(messages, language_rule, title_hint, source_units)
    if len(source_units or []) >= 2:
        retry_messages.insert(1, {"role": "user", "content": f"""
The previous multi-source answer was too shallow. Regenerate as a full professor-style multi-source learning guide.

Use this style target:
{REFERENCE_STYLE_PROFILE}

Use this structure:
{MULTISOURCE_REFERENCE_STRUCTURE}

Important: include source-by-source detail, named studies/examples, visual explanations, common ideas across sources, cross-source evidence table, and exam/revision focus. Do not shorten for token saving.
"""})
    second = generate_chat(retry_messages, model=analysis_model, temperature=0, max_tokens=int(config.get("max_output_tokens", 8000)))
    if not is_refusal_or_useless_response(second) and not is_weak_multisource_response(second, len(source_units or [])):
        return second

    # Do not silently save a refusal into cache/history. Surface a clear error.
    raise RuntimeError(
        "The model returned a refusal or unusably short response twice. Try a less restrictive model, confirm the source text is readable, or paste the text directly."
    )


# -------------------------
# URL / source identity helpers
# -------------------------
def canonicalize_url(url: str) -> Tuple[str, str]:
    normalized_url = normalize_public_http_url(url, "source URL")
    parsed = urlparse(normalized_url)
    scheme = parsed.scheme or "https"
    netloc = parsed.netloc.lower()
    path = re.sub(r"/+", "/", parsed.path or "/")

    query_pairs = parse_qs(parsed.query, keep_blank_values=False)
    drop_keys = {
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "fbclid", "gclid", "active_tab", "spm", "igshid"
    }
    filtered_query = []
    for key in sorted(query_pairs):
        if key.lower() in drop_keys:
            continue
        for value in query_pairs[key]:
            filtered_query.append((key, value))
    query = urlencode(filtered_query)

    canonical = urlunparse((scheme, netloc, path.rstrip("/") or "/", "", query, ""))

    identity = canonical
    if netloc.endswith("legislation.govt.nz"):
        match = re.search(r"/act/public/(\d{4})/(\d+)", path)
        if match:
            identity = f"nzl_act:{match.group(1)}:{match.group(2)}"
    return canonical, identity


def detect_legislation_title(text: str) -> Optional[str]:
    patterns = [
        r"([A-Z][A-Za-z0-9'’(),/&\- ]+ Act \d{4})",
        r"([A-Z][A-Za-z0-9'’(),/&\- ]+ Amendment Act \d{4})",
        r"([A-Z][A-Za-z0-9'’(),/&\- ]+ Order \d{4})",
        r"([A-Z][A-Za-z0-9'’(),/&\- ]+ Regulations \d{4})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text or "")
        if match:
            return normalise_space(match.group(1))
    return None


def detect_course_or_topic_title(text: str) -> Optional[str]:
    patterns = [
        r"\b(FINEARTS\s*\d{3,4}[A-Z]?(?:\s*[-–—:]\s*[^\n.,;:]{1,60})?)",
        r"\b(WTRENG\s*\d{3,4}[A-Z]?(?:\s*[-–—:]\s*[^\n.,;:]{1,60})?)",
        r"\b([A-Z]{2,}\s*\d{3,4}[A-Z]?(?:\s*[-–—:]\s*[^\n.,;:]{1,60})?)",
        r"\b(Pythagorean Theorem)\b",
        r"\b(Cross Product)\b",
        r"\b(Curvature of Vector Function)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text or "", flags=re.I)
        if match:
            return normalise_space(match.group(1))
    return None


def choose_best_source_title(candidates: List[str]) -> str:
    cleaned = [normalise_space(c) for c in candidates if c and normalise_space(c)]
    cleaned = [c for c in cleaned if len(c) >= 3]
    if not cleaned:
        return "Generated Study Notes"

    for candidate in cleaned:
        law = detect_legislation_title(candidate)
        if law:
            return law
    for candidate in cleaned:
        topic = detect_course_or_topic_title(candidate)
        if topic:
            return topic
    for candidate in cleaned:
        if len(candidate) <= 72:
            return candidate
    return cleaned[0][:72].strip()


def extract_title_candidates_from_html(raw_html: str) -> List[str]:
    results: List[str] = []
    if BeautifulSoup is None:
        title_match = re.search(r"<title>(.*?)</title>", raw_html or "", flags=re.I | re.S)
        if title_match:
            results.append(clean_html(title_match.group(1)))
        h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", raw_html or "", flags=re.I | re.S)
        if h1_match:
            results.append(clean_html(h1_match.group(1)))
        return [r for r in results if r]

    soup = BeautifulSoup(raw_html or "", "html.parser")
    metas = [
        soup.find("meta", attrs={"property": "og:title"}),
        soup.find("meta", attrs={"name": "title"}),
        soup.find("meta", attrs={"name": "dc.title"}),
        soup.find("meta", attrs={"name": "DC.Title"}),
    ]
    for meta in metas:
        if meta and meta.get("content"):
            results.append(normalise_space(meta.get("content")))

    if soup.title and soup.title.string:
        results.append(normalise_space(soup.title.string))

    for tag in soup.find_all(["h1", "h2"], limit=5):
        text = normalise_space(tag.get_text(" ", strip=True))
        if text:
            results.append(text)
    return [r for r in results if r]


def extract_main_html_text(raw_html: str) -> str:
    if BeautifulSoup is None:
        return clean_html(raw_html)

    soup = BeautifulSoup(raw_html or "", "html.parser")

    for tag in soup(["script", "style", "noscript", "svg", "form"]):
        tag.decompose()

    for selector in [
        "nav", "header", "footer", "aside", ".sidebar", ".breadcrumb", ".search", ".toolbar", ".menu", ".related",
    ]:
        for tag in soup.select(selector):
            tag.decompose()

    selectors = [
        "#legislation-content",
        ".legislation-content",
        "main",
        "article",
        "[role='main']",
        "#content",
        ".content",
        ".main-content",
        ".article-content",
        ".entry-content",
    ]

    chunks = []
    for selector in selectors:
        for tag in soup.select(selector):
            text = normalise_space(tag.get_text(" ", strip=True))
            if len(text) > 300:
                chunks.append(text)
        if chunks:
            break

    if not chunks:
        body = soup.body or soup
        body_text = normalise_space(body.get_text(" ", strip=True))
        if body_text:
            chunks.append(body_text)

    seen = set()
    unique_chunks = []
    for chunk in chunks:
        key = chunk[:500]
        if key not in seen:
            seen.add(key)
            unique_chunks.append(chunk)

    text = "\n\n".join(unique_chunks)
    return text.strip()



class PublicURLRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Prevent a public fetch from following a redirect into a private network."""

    def redirect_request(self, req, fp, code, msg, headers, newurl, method=None):
        normalize_public_http_url(newurl, "remote URL")
        return super().redirect_request(req, fp, code, msg, headers, newurl, method)


def urlopen_bytes(request_or_url, timeout: int = 20, max_bytes: Optional[int] = None) -> bytes:
    """Fetch URL bytes with certifi SSL support and a clear fallback.
    This fixes macOS/Python CERTIFICATE_VERIFY_FAILED issues while still trying
    normal certificate verification first.
    """
    target_url = request_or_url.full_url if isinstance(request_or_url, urllib.request.Request) else str(request_or_url)
    parsed_target = urlparse(target_url)
    if parsed_target.scheme.lower() not in {"http", "https"}:
        raise ValueError("Only http and https URLs can be fetched.")
    normalize_public_http_url(target_url, "remote URL")
    opener = urllib.request.build_opener(PublicURLRedirectHandler)

    contexts = []
    if certifi is not None:
        try:
            contexts.append(ssl.create_default_context(cafile=certifi.where()))
        except Exception:
            pass
    try:
        contexts.append(ssl.create_default_context())
    except Exception:
        pass

    last_error = None
    for context in contexts or [None]:
        try:
            kwargs = {"timeout": timeout}
            if context is not None:
                kwargs["context"] = context
            # URL scheme is validated above before urllib receives the request.
            with opener.open(request_or_url, **kwargs) as response:  # nosec B310
                return response.read(max_bytes) if max_bytes else response.read()
        except Exception as error:
            last_error = error

    raise last_error or RuntimeError("Failed to fetch URL")


def fetch_webpage(url: str) -> Tuple[str, dict]:
    canonical_url, base_identity = canonicalize_url(url)
    req = urllib.request.Request(canonical_url, headers={"User-Agent": "Mozilla/5.0"})
    raw_bytes = urlopen_bytes(req, timeout=20, max_bytes=900000)
    raw_html = raw_bytes.decode("utf-8", errors="ignore")

    title_candidates = extract_title_candidates_from_html(raw_html)
    main_text = extract_main_html_text(raw_html)
    combined_title_text = " | ".join(title_candidates)

    detected_title = detect_legislation_title(combined_title_text) or detect_legislation_title(main_text[:5000])
    if not detected_title:
        detected_title = choose_best_source_title(title_candidates)

    source_identity = base_identity
    if base_identity.startswith("nzl_act:") and detected_title and detected_title != "Generated Study Notes":
        source_identity = f"{base_identity}:{detected_title}"

    metadata = {
        "url": canonical_url,
        "source_identity": source_identity,
        "detected_title": detected_title,
        "title_candidates": title_candidates[:6],
        "content_hash": sha256_text(main_text[:40000]),
    }
    return main_text, metadata


YOUTUBE_TRANSCRIPT_UNAVAILABLE_TEXT = "No readable YouTube transcript could be accessed."
YOUTUBE_TRANSCRIPT_LANGUAGES = [
    "en",
    "en-US",
    "en-GB",
    "en-CA",
    "en-AU",
    "zh-Hans",
    "zh-CN",
    "zh",
    "zh-Hant",
    "zh-TW",
]
YOUTUBE_CAPTION_MAX_BYTES = 5 * 1024 * 1024
YOUTUBE_CAPTION_FORMAT_PRIORITY = {
    "vtt": 0,
    "srt": 1,
    "json3": 2,
    "json": 2,
    "srv3": 3,
    "ttml": 4,
    "xml": 5,
}


def clean_caption_text(text: str) -> str:
    text = html.unescape(str(text or ""))
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\{\\[^}]*\}", " ", text)
    text = text.replace("\xa0", " ")
    return normalise_space(text)


def caption_lines_to_text(lines: List[str]) -> str:
    cleaned: List[str] = []
    for raw in lines:
        line = clean_caption_text(raw)
        if not line:
            continue
        if re.match(r"^\d+$", line):
            continue
        if "-->" in line:
            continue
        if re.match(r"^\d{1,2}:\d{2}(?::\d{2})?[\.,]\d{1,3}", line):
            continue
        upper_line = line.upper()
        if upper_line.startswith(("WEBVTT", "KIND:", "LANGUAGE:", "STYLE", "NOTE ")):
            continue
        if cleaned:
            previous = cleaned[-1]
            if line == previous or previous.startswith(line):
                continue
            if line.startswith(previous) and len(line) > len(previous) + 8:
                cleaned[-1] = line
                continue
        cleaned.append(line)
    return "\n".join(cleaned)


def transcript_item_text(item) -> str:
    if isinstance(item, dict):
        return item.get("text", "") or ""
    if hasattr(item, "text"):
        return getattr(item, "text", "") or ""
    return str(item or "")


def fetched_transcript_to_text(fetched: Any) -> str:
    try:
        iterable = fetched.to_raw_data() if hasattr(fetched, "to_raw_data") else fetched
    except Exception:
        iterable = fetched
    try:
        lines = [transcript_item_text(item) for item in iterable]
    except TypeError:
        lines = [transcript_item_text(iterable)]
    return caption_lines_to_text(lines)


def parse_youtube_json_caption(raw_text: str) -> str:
    try:
        payload = json.loads(raw_text)
    except Exception:
        return ""
    lines: List[str] = []
    for event in payload.get("events", []):
        segments = event.get("segs") or []
        if not isinstance(segments, list):
            continue
        text = "".join((segment.get("utf8") or "") for segment in segments if isinstance(segment, dict))
        if text.strip():
            lines.append(text.replace("\n", " "))
    return caption_lines_to_text(lines)


def caption_bytes_to_text(data: bytes, ext: str = "") -> str:
    raw = data.decode("utf-8-sig", errors="ignore")
    ext = (ext or "").lower()
    if ext in {"json3", "json"} or raw.lstrip().startswith("{"):
        parsed = parse_youtube_json_caption(raw)
        if parsed:
            return parsed
    return caption_lines_to_text(raw.splitlines())


def caption_language_score(language: str) -> int:
    normalized = (language or "").lower()
    for index, preferred in enumerate(YOUTUBE_TRANSCRIPT_LANGUAGES):
        preferred_normalized = preferred.lower()
        if normalized == preferred_normalized or normalized.startswith(f"{preferred_normalized}-"):
            return index
    if normalized.startswith("en"):
        return 50
    if normalized.startswith("zh"):
        return 60
    return 100


def iter_youtube_caption_entries(info: dict) -> List[dict]:
    entries: List[dict] = []
    for source_index, key in enumerate(("subtitles", "automatic_captions")):
        tracks = info.get(key) or {}
        if not isinstance(tracks, dict):
            continue
        for language, options in tracks.items():
            if not isinstance(options, list):
                continue
            for option in options:
                if not isinstance(option, dict) or not option.get("url"):
                    continue
                ext = (option.get("ext") or "").lower()
                entries.append({
                    "url": option["url"],
                    "ext": ext,
                    "language": language or "",
                    "score": (
                        caption_language_score(language or ""),
                        source_index,
                        YOUTUBE_CAPTION_FORMAT_PRIORITY.get(ext, 50),
                    ),
                })
    return sorted(entries, key=lambda item: item["score"])


def fetch_caption_url_text(caption_url: str, ext: str = "") -> str:
    request = urllib.request.Request(caption_url, headers={"User-Agent": "Mozilla/5.0"})
    data = urlopen_bytes(request, timeout=20, max_bytes=YOUTUBE_CAPTION_MAX_BYTES)
    return caption_bytes_to_text(data, ext)


def fetch_youtube_transcript_api_text(video_id: str) -> str:
    if not video_id or YouTubeTranscriptApi is None:
        return ""

    api = None
    try:
        api = YouTubeTranscriptApi()
    except Exception:
        api = None

    fetchers = []
    if api is not None and hasattr(api, "fetch"):
        fetchers.append(lambda: api.fetch(video_id, languages=YOUTUBE_TRANSCRIPT_LANGUAGES))
    if hasattr(YouTubeTranscriptApi, "fetch"):
        fetchers.append(lambda: YouTubeTranscriptApi.fetch(video_id, languages=YOUTUBE_TRANSCRIPT_LANGUAGES))

    for fetcher in fetchers:
        try:
            text = fetched_transcript_to_text(fetcher())
            if len(text.strip()) > 20:
                return text
        except Exception:
            pass

    list_fetchers = []
    if api is not None and hasattr(api, "list"):
        list_fetchers.append(lambda: api.list(video_id))
    if hasattr(YouTubeTranscriptApi, "list"):
        list_fetchers.append(lambda: YouTubeTranscriptApi.list(video_id))
    if hasattr(YouTubeTranscriptApi, "list_transcripts"):
        list_fetchers.append(lambda: YouTubeTranscriptApi.list_transcripts(video_id))

    for list_fetcher in list_fetchers:
        try:
            transcript_list = list_fetcher()
        except Exception:
            continue
        candidates = []
        for finder_name in ("find_transcript", "find_generated_transcript"):
            finder = getattr(transcript_list, finder_name, None)
            if callable(finder):
                try:
                    candidates.append(finder(YOUTUBE_TRANSCRIPT_LANGUAGES))
                except Exception:
                    pass
        try:
            candidates.extend(list(transcript_list))
        except Exception:
            pass
        for transcript in candidates:
            try:
                text = fetched_transcript_to_text(transcript.fetch())
                if len(text.strip()) > 20:
                    return text
            except Exception:
                pass
    return ""


def fetch_youtube_subtitle_transcript(url: str) -> str:
    if not ENABLE_YOUTUBE_YTDLP_FALLBACK or yt_dlp is None:
        return ""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "socket_timeout": 15,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitlesformat": "vtt/srt/json3/best",
        "subtitleslangs": YOUTUBE_TRANSCRIPT_LANGUAGES,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception:
        return ""
    if not isinstance(info, dict):
        return ""
    for entry in iter_youtube_caption_entries(info):
        try:
            text = fetch_caption_url_text(entry["url"], entry.get("ext", ""))
            if len(text.strip()) > 20:
                return text
        except Exception:
            pass
    return ""


def parse_json_object_after_marker(raw_text: str, marker: str) -> Optional[dict]:
    marker_index = raw_text.find(marker)
    if marker_index < 0:
        return None

    start = raw_text.find("{", marker_index)
    if start < 0:
        return None

    depth = 0
    in_string = False
    escape_next = False
    for index in range(start, len(raw_text)):
        char = raw_text[index]
        if escape_next:
            escape_next = False
            continue
        if char == "\\":
            escape_next = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                try:
                    payload = json.loads(raw_text[start:index + 1])
                except Exception:
                    return None
                return payload if isinstance(payload, dict) else None
    return None


def find_youtube_caption_tracks(value: Any) -> List[dict]:
    tracks: List[dict] = []
    if isinstance(value, dict):
        caption_tracks = value.get("captionTracks")
        if isinstance(caption_tracks, list):
            tracks.extend(track for track in caption_tracks if isinstance(track, dict))
        for child in value.values():
            tracks.extend(find_youtube_caption_tracks(child))
    elif isinstance(value, list):
        for child in value:
            tracks.extend(find_youtube_caption_tracks(child))
    return tracks


def caption_track_language(track: dict) -> str:
    name = track.get("name")
    name_text = ""
    if isinstance(name, dict):
        name_text = str(name.get("simpleText") or "")
        if not name_text:
            runs = name.get("runs")
            if isinstance(runs, list):
                name_text = " ".join(
                    str(run.get("text") or "")
                    for run in runs
                    if isinstance(run, dict) and run.get("text")
                ).strip()
    return str(track.get("languageCode") or track.get("vssId") or name_text or "")


def caption_track_sort_key(track: dict) -> Tuple[int, int]:
    language = caption_track_language(track)
    kind = str(track.get("kind") or "").lower()
    is_auto_generated = 1 if kind == "asr" else 0
    return (caption_language_score(language), is_auto_generated)


def caption_url_with_format(base_url: str, fmt: str) -> str:
    if not base_url:
        return ""
    decoded_url = html.unescape(base_url)
    if re.search(r"([?&])fmt=", decoded_url):
        return re.sub(r"([?&])fmt=[^&]*", rf"\1fmt={fmt}", decoded_url)
    separator = "&" if "?" in decoded_url else "?"
    return f"{decoded_url}{separator}fmt={fmt}"


def fetch_youtube_watch_caption_transcript(url: str) -> str:
    video_id = get_youtube_video_id(url)
    if not video_id:
        return ""

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.7,zh;q=0.6",
    }
    watch_url = f"https://www.youtube.com/watch?{urlencode({'v': video_id, 'hl': 'en'})}"

    try:
        request = urllib.request.Request(watch_url, headers=headers)
        raw_page = urlopen_bytes(request, timeout=20, max_bytes=3_000_000).decode("utf-8", errors="ignore")
    except Exception:
        raw_page = ""

    player_response = parse_json_object_after_marker(raw_page, "ytInitialPlayerResponse") if raw_page else None
    caption_tracks = find_youtube_caption_tracks(player_response or {})
    seen_caption_urls: set[str] = set()
    for track in sorted(caption_tracks, key=caption_track_sort_key):
        base_url = str(track.get("baseUrl") or "")
        if not base_url:
            continue
        for fmt in ("vtt", "json3", "srv3", "srt"):
            caption_url = caption_url_with_format(base_url, fmt)
            if not caption_url or caption_url in seen_caption_urls:
                continue
            seen_caption_urls.add(caption_url)
            try:
                text = fetch_caption_url_text(caption_url, fmt)
                if len(text.strip()) > 20:
                    return text
            except Exception:
                pass

    for language in YOUTUBE_TRANSCRIPT_LANGUAGES:
        for is_auto_generated in (False, True):
            for fmt in ("vtt", "json3", "srv3"):
                params = {"v": video_id, "lang": language, "fmt": fmt}
                if is_auto_generated:
                    params["kind"] = "asr"
                timedtext_url = f"https://www.youtube.com/api/timedtext?{urlencode(params)}"
                try:
                    text = fetch_caption_url_text(timedtext_url, fmt)
                    if len(text.strip()) > 20:
                        return text
                except Exception:
                    pass
    return ""


def fetch_youtube_caption_transcript(url: str) -> str:
    video_id = get_youtube_video_id(url)
    if not video_id:
        return ""
    for fetcher in (
        lambda: fetch_youtube_transcript_api_text(video_id),
        lambda: fetch_youtube_watch_caption_transcript(url),
        lambda: fetch_youtube_subtitle_transcript(url),
    ):
        try:
            transcript = fetcher()
            if len(transcript.strip()) > 20:
                return transcript
        except Exception:
            pass
    return ""


def format_duration(seconds) -> str:
    try:
        total_seconds = int(float(seconds))
    except Exception:
        return ""
    hours, remainder = divmod(total_seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def fetch_youtube_metadata(url: str) -> dict:
    if yt_dlp is None:
        return {}
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "socket_timeout": 12,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        if not isinstance(info, dict):
            return {}
        return {
            "title": normalise_space(info.get("title") or ""),
            "channel": normalise_space(info.get("uploader") or info.get("channel") or ""),
            "duration": format_duration(info.get("duration")),
            "webpage_url": info.get("webpage_url") or url,
        }
    except Exception:
        return {}


def transcribe_media_bytes(filename: str, data: bytes) -> str:
    require_openai_api()
    if not data:
        return "No audio/video data was provided."
    if len(data) > MAX_AUDIO_BYTES:
        size_mb = len(data) / (1024 * 1024)
        limit_mb = MAX_AUDIO_BYTES / (1024 * 1024)
        return (
            f"The audio/video file is too large to transcribe directly ({size_mb:.1f}MB). "
            f"The current limit is about {limit_mb:.0f}MB. Upload a shorter clip or paste the transcript."
        )

    suffix = Path(filename or "audio.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(data)
        temp_path = temp_file.name
    try:
        with open(temp_path, "rb") as audio_file:
            try:
                result = client.audio.transcriptions.create(
                    model=TRANSCRIBE_MODEL,
                    file=audio_file,
                    prompt="Academic tutorial or lecture. Preserve formulas, numbers, mixed Chinese-English, and correction steps.",
                )
            except Exception:
                audio_file.seek(0)
                result = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    prompt="Academic lecture/tutorial. Preserve formulas and numbers.",
                )
        return getattr(result, "text", str(result)).strip()
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


def extract_video_frames_from_file(video_path: str, max_frames: int = MAX_VIDEO_FRAMES, source_name: str = "video") -> List[dict]:
    if cv2 is None:
        return []
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return []
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if frame_count <= 0:
        cap.release()
        return []

    if max_frames <= 1:
        indices = [frame_count // 2]
    else:
        start = int(frame_count * 0.1)
        end = int(frame_count * 0.9)
        step = max(1, (end - start) // max(1, max_frames - 1))
        indices = [min(frame_count - 1, start + i * step) for i in range(max_frames)]

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
    source_label = normalise_space(source_name or Path(video_path).name or "video")

    parts = []
    for frame_number, idx in enumerate(indices, start=1):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, frame = cap.read()
        if not ok or frame is None:
            continue
        height, width = frame.shape[:2]
        max_side = 1200
        scale = min(1.0, max_side / max(width, height))
        if scale < 1.0:
            frame = cv2.resize(frame, (int(width * scale), int(height * scale)))
        ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
        if ok:
            timestamp = format_duration(idx / fps) if fps > 0 else f"frame {idx}"
            parts.append({
                "type": "text",
                "text": (
                    f"IN-TEXT SOURCE FIGURE FROM {source_label} — video frame {frame_number} "
                    f"sampled at approximately {timestamp}. Actual source screenshot selected "
                    "to preserve visual evidence from the video."
                ),
            })
            parts.append(image_part_from_bytes(buffer.tobytes(), "image/jpeg"))
    cap.release()
    return parts
