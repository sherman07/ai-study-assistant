import threading


# -------------------------
# Tutor language + external research helpers
# -------------------------
def detect_question_language(question: str, fallback_language: str = "auto") -> str:
    """Lightweight language detector for tutor replies.
    The tutor should answer in the language used by the user's current question,
    not necessarily the language used for the generated notes.
    """
    q = question or ""
    if re.search(r"[\u4e00-\u9fff]", q):
        # Chinese characters are enough for choosing Chinese output; simplify by default.
        return "Simplified Chinese"
    if re.search(r"[\u3040-\u30ff]", q):
        return "Japanese"
    if re.search(r"[\uac00-\ud7af]", q):
        return "Korean"
    if re.search(r"[\u0600-\u06ff]", q):
        return "Arabic"
    if re.search(r"[\u0900-\u097f]", q):
        return "Hindi"
    if re.search(r"[\u0e00-\u0e7f]", q):
        return "Thai"
    if re.search(r"[\u0400-\u04ff]", q):
        return "Russian"

    # For Latin-script languages, let the model infer from the user text.
    # This avoids false certainty between English/French/Spanish/etc.
    if q.strip():
        return "the same language as the user's latest question"

    language_name = target_language_name(fallback_language)
    return language_name or "the same language as the user's latest question"


def safe_unquote_duckduckgo_url(url: str) -> str:
    parsed = urlparse(url or "")
    if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
        qs = parse_qs(parsed.query)
        if qs.get("uddg"):
            return qs["uddg"][0]
    return url


def search_web_duckduckgo_instant(query: str, max_results: int = 4) -> List[dict]:
    """JSON Instant Answer API fallback when HTML scrape is blocked."""
    query = normalise_space(query)
    if not query or not ENABLE_TUTOR_WEB_RESEARCH:
        return []
    api_url = "https://api.duckduckgo.com/?" + urlencode({
        "q": query,
        "format": "json",
        "no_html": "1",
        "skip_disambig": "1",
    })
    request = urllib.request.Request(api_url, headers={"User-Agent": "Mozilla/5.0 SynapseTutor/1.0"})
    try:
        raw = urlopen_bytes(request, timeout=4, max_bytes=1_000_000)
        payload = json.loads(raw.decode("utf-8", errors="ignore") or "{}")
    except Exception:
        return []

    results: List[dict] = []
    seen = set()

    def push(title: str, url: str, snippet: str = "") -> None:
        title = normalise_space(title)
        url = normalise_space(url)
        if not title or not url or url in seen:
            return
        seen.add(url)
        results.append({"title": title, "url": url, "snippet": normalise_space(snippet)})

    abstract = normalise_space(payload.get("AbstractText") or "")
    abstract_url = normalise_space(payload.get("AbstractURL") or "")
    heading = normalise_space(payload.get("Heading") or query)
    if abstract and abstract_url:
        push(heading or abstract_url, abstract_url, abstract)

    for topic in payload.get("RelatedTopics") or []:
        if len(results) >= max_results:
            break
        if isinstance(topic, dict) and topic.get("Topics"):
            for nested in topic.get("Topics") or []:
                if not isinstance(nested, dict):
                    continue
                push(nested.get("Text") or nested.get("FirstURL") or "", nested.get("FirstURL") or "", nested.get("Text") or "")
                if len(results) >= max_results:
                    break
            continue
        if isinstance(topic, dict):
            push(topic.get("Text") or topic.get("FirstURL") or "", topic.get("FirstURL") or "", topic.get("Text") or "")

    return results[:max_results]


def search_web_wikipedia(query: str, max_results: int = 4) -> List[dict]:
    """Reliable no-key fallback when DuckDuckGo HTML/Instant Answer are empty from cloud IPs."""
    query = normalise_space(query)
    if not query or not ENABLE_TUTOR_WEB_RESEARCH:
        return []

    api_url = "https://en.wikipedia.org/w/api.php?" + urlencode({
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": max(1, min(int(max_results or 4), 8)),
        "srprop": "snippet|titlesnippet",
        "format": "json",
        "utf8": "1",
    })
    headers = {
        "User-Agent": "SynapseTutor/1.0 (study assistant; +https://synapse-ai-study-assistant-tutor.vercel.app)",
        "Accept": "application/json",
    }

    payload = {}
    try:
        if "requests" in globals() and requests is not None:
            response = requests.get(api_url, headers=headers, timeout=4)
            response.raise_for_status()
            payload = response.json() if response.content else {}
        else:
            raw = urlopen_bytes(
                urllib.request.Request(api_url, headers=headers),
                timeout=4,
                max_bytes=500_000,
            )
            payload = json.loads(raw.decode("utf-8", errors="ignore") or "{}")
    except Exception:
        # Older OpenSearch shape as a second chance.
        try:
            open_url = "https://en.wikipedia.org/w/api.php?" + urlencode({
                "action": "opensearch",
                "search": query,
                "limit": max(1, min(int(max_results or 4), 8)),
                "namespace": 0,
                "format": "json",
            })
            if "requests" in globals() and requests is not None:
                response = requests.get(open_url, headers=headers, timeout=4)
                response.raise_for_status()
                open_payload = response.json() if response.content else []
            else:
                raw = urlopen_bytes(
                    urllib.request.Request(open_url, headers=headers),
                    timeout=4,
                    max_bytes=500_000,
                )
                open_payload = json.loads(raw.decode("utf-8", errors="ignore") or "[]")
            if isinstance(open_payload, list) and len(open_payload) >= 4:
                titles = open_payload[1] if isinstance(open_payload[1], list) else []
                descriptions = open_payload[2] if isinstance(open_payload[2], list) else []
                urls = open_payload[3] if isinstance(open_payload[3], list) else []
                results = []
                for index, title in enumerate(titles):
                    if len(results) >= max_results:
                        break
                    title_text = normalise_space(title)
                    url = normalise_space(urls[index] if index < len(urls) else "")
                    snippet = normalise_space(clean_html(descriptions[index] if index < len(descriptions) else "") if "clean_html" in globals() else (descriptions[index] if index < len(descriptions) else ""))
                    if title_text and url:
                        results.append({"title": title_text, "url": url, "snippet": snippet, "provider": "wikipedia"})
                return results
        except Exception:
            return []
        return []

    search_hits = ((payload.get("query") or {}).get("search") or []) if isinstance(payload, dict) else []
    results: List[dict] = []
    for hit in search_hits:
        if len(results) >= max_results:
            break
        if not isinstance(hit, dict):
            continue
        title_text = normalise_space(hit.get("title") or "")
        if not title_text:
            continue
        page_id = hit.get("pageid")
        url = f"https://en.wikipedia.org/wiki/{quote(title_text.replace(' ', '_'))}"
        if page_id:
            url = f"https://en.wikipedia.org/?curid={page_id}"
        snippet_raw = hit.get("snippet") or hit.get("titlesnippet") or ""
        snippet = normalise_space(clean_html(snippet_raw) if "clean_html" in globals() else re.sub(r"<[^>]+>", " ", str(snippet_raw)))
        results.append({
            "title": title_text,
            "url": url,
            "snippet": snippet,
            "provider": "wikipedia",
        })
    return results


def probe_tutor_web_research(query: str = "evolutionary psychology") -> dict:
    """Diagnostic helper for /health/tutor-web — shows which research backends respond."""
    query = normalise_space(query) or "evolutionary psychology"
    report = {
        "enabled": bool(ENABLE_TUTOR_WEB_RESEARCH),
        "query": query,
        "duckduckgo_html_count": 0,
        "duckduckgo_instant_count": 0,
        "wikipedia_count": 0,
        "selected_provider": "",
        "sample_titles": [],
        "ok": False,
    }
    if not ENABLE_TUTOR_WEB_RESEARCH:
        report["error"] = "ENABLE_TUTOR_WEB_RESEARCH is false"
        return report
    try:
        # Skip DuckDuckGo HTML here — it is often slow/blocked from cloud IPs and
        # would make the health probe exceed Render's request budget.
        instant = search_web_duckduckgo_instant(query, max_results=2)
        report["duckduckgo_instant_count"] = len(instant or [])
        wiki = search_web_wikipedia(query, max_results=2)
        report["wikipedia_count"] = len(wiki or [])
        selected = wiki or instant or []
        if selected:
            report["ok"] = True
            report["selected_provider"] = str(selected[0].get("provider") or "")
            report["sample_titles"] = [str(item.get("title") or "") for item in selected[:3]]
        else:
            report["error"] = "No research backend returned results"
    except Exception as error:
        report["error"] = str(error)[:280]
    return report


def search_web_duckduckgo(query: str, max_results: int = 4) -> List[dict]:
    """Small no-key web search fallback for tutor mode.
    For production you can replace this with SerpAPI/Tavily/Brave Search, but this keeps
    the local prototype functional without another paid API.
    """
    query = normalise_space(query)
    if not query or not ENABLE_TUTOR_WEB_RESEARCH:
        return []

    search_url = "https://duckduckgo.com/html/?" + urlencode({"q": query})
    request = urllib.request.Request(
        search_url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; SynapseTutor/1.0; +https://synapse-ai-study-assistant-tutor.vercel.app)",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    results: List[dict] = []
    seen = set()
    try:
        # Keep HTML scrape short so cloud hosts can fall through to Instant Answer / Wikipedia.
        raw = urlopen_bytes(request, timeout=6, max_bytes=2_000_000)
        html = raw.decode("utf-8", errors="ignore")
    except Exception:
        html = ""

    if html and BeautifulSoup is not None:
        soup = BeautifulSoup(html, "html.parser")
        for link in soup.select("a.result__a"):
            title = clean_html(str(link))
            href = safe_unquote_duckduckgo_url(link.get("href") or "")
            if not title or not href or href in seen:
                continue
            seen.add(href)
            snippet = ""
            parent = link.find_parent(class_="result")
            if parent:
                snippet_tag = parent.select_one(".result__snippet")
                if snippet_tag:
                    snippet = normalise_space(snippet_tag.get_text(" ", strip=True))
            results.append({"title": title, "url": href, "snippet": snippet})
            if len(results) >= max_results:
                break
    elif html:
        for match in re.finditer(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, flags=re.I | re.S):
            href = safe_unquote_duckduckgo_url(match.group(1))
            title = clean_html(match.group(2))
            if title and href and href not in seen:
                seen.add(href)
                results.append({"title": title, "url": href, "snippet": ""})
            if len(results) >= max_results:
                break

    if results:
        for item in results:
            item.setdefault("provider", "duckduckgo")
        return results
    instant = search_web_duckduckgo_instant(query, max_results=max_results)
    if instant:
        for item in instant:
            item.setdefault("provider", "duckduckgo_instant")
        return instant
    return search_web_wikipedia(query, max_results=max_results)


def fetch_research_result_text(result: dict, max_chars: int = 2200) -> dict:
    url = result.get("url") or ""
    output = dict(result)
    output["content"] = ""
    if not url:
        return output
    try:
        url = normalize_public_http_url(url, "research result URL")
        raw = urlopen_bytes(
            urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}),
            timeout=15,
            max_bytes=1_500_000,
        )
        html = raw.decode("utf-8", errors="ignore")
        content = extract_main_html_text(html) if "extract_main_html_text" in globals() else clean_html(html)
        output["content"] = truncate_text(content, max_chars)
    except Exception:
        output["content"] = result.get("snippet") or ""
    return output


def build_tutor_search_query(question: str, selected_section: str, source_identity: str, title: str) -> str:
    parts = [question or ""]
    if selected_section:
        parts.append(selected_section)
    if source_identity:
        parts.append(source_identity)
    elif title:
        parts.append(title)
    query = normalise_space(" ".join(parts))
    return query[:280]


def run_tutor_research_call(callback, deadline: float) -> List[dict]:
    """Return one provider's results without letting it exceed the shared research budget."""
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        return []

    outcome = {"results": []}
    completed = threading.Event()

    def invoke() -> None:
        try:
            results = callback()
            if isinstance(results, list):
                outcome["results"] = results
        except Exception:
            outcome["results"] = []
        finally:
            completed.set()

    threading.Thread(target=invoke, daemon=True).start()
    completed.wait(remaining)
    return outcome["results"] if completed.is_set() else []


def usable_tutor_research_results(results: List[dict]) -> List[dict]:
    """Keep only results that contain grounding text for the Tutor prompt."""
    return [
        item for item in results if isinstance(item, dict) and normalise_space(item.get("snippet") or "")
    ]


def gather_tutor_web_research(question: str, selected_section: str, source_identity: str, title: str) -> Tuple[str, List[dict]]:
    """Search the web for additional context when the stored notes are incomplete.
    Returns a compact research context and result metadata.
    """
    if not ENABLE_TUTOR_WEB_RESEARCH:
        return "", []

    query = build_tutor_search_query(question, selected_section, source_identity, title)
    # Prefer Wikipedia first on cloud hosts, while keeping research within the hosted
    # request budget. DuckDuckGo HTML and arbitrary result-page fetches are routinely
    # slow or blocked from datacenter IPs.
    deadline = time.monotonic() + TUTOR_WEB_RESEARCH_BUDGET_SECONDS
    results = usable_tutor_research_results(run_tutor_research_call(
        lambda: search_web_wikipedia(query, max_results=MAX_TUTOR_SEARCH_RESULTS),
        deadline,
    ))
    if not results:
        results = usable_tutor_research_results(run_tutor_research_call(
            lambda: search_web_duckduckgo_instant(query, max_results=MAX_TUTOR_SEARCH_RESULTS),
            deadline,
        ))
        for item in results:
            item.setdefault("provider", "duckduckgo_instant")
    enriched = []
    total = 0
    for item in results:
        # Search snippets are enough to ground a tutor reply and avoid serial page fetches.
        enriched_item = dict(item)
        enriched_item["content"] = truncate_text(item.get("snippet") or "", 2400)
        content = enriched_item.get("content") or enriched_item.get("snippet") or ""
        total += len(content)
        enriched.append(enriched_item)
        if total >= MAX_TUTOR_RESEARCH_CHARS:
            break

    if not enriched:
        return "", []

    blocks = []
    for i, item in enumerate(enriched, 1):
        blocks.append(
            f"Source {i}: {item.get('title','Untitled')}\n"
            f"URL: {item.get('url','')}\n"
            f"Provider: {item.get('provider') or 'web'}\n"
            f"Snippet: {item.get('snippet','')}\n"
            f"Extracted content: {truncate_text(item.get('content',''), 2400)}"
        )
    return "\n\n".join(blocks), enriched


def parse_json_list(value: str) -> List[dict]:
    try:
        parsed = json.loads(value or "[]")
    except Exception:
        return []
    return parsed if isinstance(parsed, list) else []


def parse_json_dict(value: str) -> dict:
    try:
        parsed = json.loads(value or "{}")
    except Exception:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def normalise_voice_tutor_history(history: List[dict]) -> List[dict]:
    turns: List[dict] = []
    for item in history or []:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role") or "").strip().lower()
        if role not in {"user", "assistant"}:
            continue
        text = normalise_space(str(item.get("text") or item.get("content") or ""))
        if not text:
            continue
        turn = {
            "role": role,
            "text": truncate_text(text, 1400),
        }
        if item.get("state"):
            turn["state"] = str(item.get("state"))
        if item.get("mastery") is not None:
            turn["mastery"] = item.get("mastery")
        turns.append(turn)
    return turns[-VOICE_TUTOR_HISTORY_LIMIT:]


def voice_tutor_context_from_sections(sections: dict, selected_section: str) -> str:
    if not isinstance(sections, dict):
        return ""
    if selected_section and sections.get(selected_section):
        return f"Selected section: {selected_section}\n{truncate_text(str(sections.get(selected_section)), 4500)}"
    blocks = []
    for title, content in list(sections.items())[:10]:
        text = normalise_space(str(content))
        if text:
            blocks.append(f"{title}: {truncate_text(text, 900)}")
    return "\n".join(blocks)
