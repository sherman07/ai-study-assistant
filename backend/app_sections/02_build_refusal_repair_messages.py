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

class PublicHttpRedirectHandler(urllib.request.HTTPRedirectHandler):
    max_redirections = 5

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validated_url = normalize_public_http_url(newurl, "redirect URL")
        return super().redirect_request(req, fp, code, msg, headers, validated_url)


class _PinnedHTTPConnection(http.client.HTTPConnection):
    def __init__(self, host, *, pinned_address: str, **kwargs):
        self._pinned_address = pinned_address
        super().__init__(host, **kwargs)

    def connect(self):
        self.sock = self._create_connection(
            (self._pinned_address, self.port),
            self.timeout,
            self.source_address,
        )
        if self._tunnel_host:
            self._tunnel()


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host, *, pinned_address: str, **kwargs):
        self._pinned_address = pinned_address
        super().__init__(host, **kwargs)

    def connect(self):
        self.sock = self._create_connection(
            (self._pinned_address, self.port),
            self.timeout,
            self.source_address,
        )
        if self._tunnel_host:
            self._tunnel()
        self.sock = self._context.wrap_socket(self.sock, server_hostname=self.host)


class _PinnedHTTPHandler(urllib.request.HTTPHandler):
    def __init__(self, pinned_address: str):
        self._pinned_address = pinned_address
        super().__init__()

    def http_open(self, request):
        return self.do_open(
            lambda host, **kwargs: _PinnedHTTPConnection(
                host,
                pinned_address=self._pinned_address,
                **kwargs,
            ),
            request,
        )


class _PinnedHTTPSHandler(urllib.request.HTTPSHandler):
    def __init__(self, pinned_address: str, context):
        self._pinned_address = pinned_address
        self._pinned_context = context
        super().__init__(context=context)

    def https_open(self, request):
        return self.do_open(
            lambda host, **kwargs: _PinnedHTTPSConnection(
                host,
                pinned_address=self._pinned_address,
                context=self._pinned_context,
                **kwargs,
            ),
            request,
        )


class _ManualRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Return redirect responses so each next hop can be resolved and pinned."""

    def http_error_302(self, request, response, code, message, headers):
        return response

    http_error_301 = http_error_302
    http_error_303 = http_error_302
    http_error_307 = http_error_302
    http_error_308 = http_error_302


def _open_pinned_http_response(request_or_url, pinned_address: str, timeout: int, context):
    handlers = [
        urllib.request.ProxyHandler({}),
        _ManualRedirectHandler(),
        _PinnedHTTPHandler(pinned_address),
        _PinnedHTTPSHandler(pinned_address, context),
    ]
    opener = urllib.request.build_opener(*handlers)
    return opener.open(request_or_url, timeout=timeout)  # nosec B310 -- DNS-pinned above


def _request_for_redirect(original_request, target_url: str):
    if not isinstance(original_request, urllib.request.Request):
        return target_url
    return urllib.request.Request(
        target_url,
        data=original_request.data,
        headers=dict(original_request.header_items()),
        method=original_request.get_method(),
    )


def urlopen_bytes(request_or_url, timeout: int = 20, max_bytes: Optional[int] = None) -> bytes:
    """Fetch URL bytes with certifi SSL support and a clear fallback.
    This fixes macOS/Python CERTIFICATE_VERIFY_FAILED issues while still trying
    normal certificate verification first.
    """
    target_url = request_or_url.full_url if isinstance(request_or_url, urllib.request.Request) else str(request_or_url)

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
        current_url = target_url
        try:
            for redirect_count in range(PublicHttpRedirectHandler.max_redirections + 1):
                validated_url, pinned_address = resolve_public_http_target(current_url, "fetch URL")
                current_request = _request_for_redirect(request_or_url, validated_url)
                response = _open_pinned_http_response(
                    current_request,
                    pinned_address,
                    timeout,
                    context,
                )
                status = int(getattr(response, "status", 200) or 200)
                location = response.getheader("Location") if hasattr(response, "getheader") else None
                if status in {301, 302, 303, 307, 308} and location:
                    close = getattr(response, "close", None)
                    if callable(close):
                        close()
                    if redirect_count >= PublicHttpRedirectHandler.max_redirections:
                        raise ValueError("fetch URL redirected too many times.")
                    current_url = urljoin(validated_url, location)
                    continue

                final_url = response.geturl() if hasattr(response, "geturl") else validated_url
                if final_url != validated_url:
                    resolve_public_http_target(final_url, "final response URL")
                try:
                    return response.read(max_bytes) if max_bytes else response.read()
                finally:
                    close = getattr(response, "close", None)
                    if callable(close):
                        close()
            raise ValueError("fetch URL redirected too many times.")
        except ValueError:
            raise
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
