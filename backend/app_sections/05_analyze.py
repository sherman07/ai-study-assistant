@app.get("/prompt-modes")
def prompt_modes():
    return {
        "default": DEFAULT_NOTE_PROMPT_MODE,
        "options": note_prompt_mode_options(),
        "note_length_default": DEFAULT_NOTE_LENGTH_MODE,
        "note_length_options": note_length_mode_options(),
    }


@app.get("/health/tutor-web")
def health_tutor_web(q: str = "evolutionary psychology"):
    """Probe Open Tutor web-research backends (DuckDuckGo + Wikipedia)."""
    callback = globals().get("probe_tutor_web_research")
    if not callable(callback):
        return {
            "enabled": bool(globals().get("ENABLE_TUTOR_WEB_RESEARCH")),
            "ok": False,
            "error": "probe_tutor_web_research is not loaded yet",
        }
    return callback(q)


def analysis_elapsed_seconds_since(started_at: float) -> float:
    return max(0.0, time.monotonic() - started_at)


def analysis_remaining_seconds_since(started_at: float) -> float:
    return max(0.0, float(ANALYSIS_MAX_SECONDS) - analysis_elapsed_seconds_since(started_at))


def should_run_optional_analysis_stage(started_at: float, min_remaining_seconds: int) -> bool:
    return analysis_remaining_seconds_since(started_at) >= max(0, int(min_remaining_seconds))


def analysis_error_response(message: str, status_code: int = 400) -> Response:
    return Response(
        json.dumps({"error": message}),
        status_code=status_code,
        media_type="application/json",
    )


def analysis_exception_status(error: Exception) -> int:
    if isinstance(error, AnalysisClientDisconnected):
        return 499
    message = str(error)
    if "OPENAI_API_KEY" in message or "GEMINI_API_KEY" in message or "not configured" in message:
        return 503
    if "too large" in message and "limit" in message:
        return 413
    if isinstance(error, ValueError):
        return 400
    return 500


class AnalysisClientDisconnected(RuntimeError):
    """Raised when the browser has already cancelled the analysis request."""


async def raise_if_analysis_client_disconnected(request: Optional[Request], stage: str = "analysis") -> None:
    if request is None or not hasattr(request, "is_disconnected"):
        return
    try:
        disconnected = await request.is_disconnected()
    except Exception:
        return
    if disconnected:
        raise AnalysisClientDisconnected(
            f"Client disconnected before {stage}. Analysis stopped before additional generation."
        )


def voice_realtime_provider_error_message(response: requests.Response) -> str:
    fallback = f"OpenAI Realtime returned HTTP {response.status_code}."
    try:
        payload = response.json()
    except Exception:
        text = normalise_space(response.text or "")
        return text or fallback

    error_payload = payload.get("error") if isinstance(payload, dict) else payload
    if isinstance(error_payload, dict):
        message = normalise_space(error_payload.get("message") or "")
        code = normalise_space(error_payload.get("code") or "")
        error_type = normalise_space(error_payload.get("type") or "")
        suffix = " / ".join(part for part in [code, error_type] if part)
        if message and suffix:
            return f"{message} ({suffix})"
        return message or suffix or fallback
    if isinstance(error_payload, str):
        return normalise_space(error_payload) or fallback
    return fallback


@app.post("/analyze")
async def analyze_materials(
    files: List[UploadFile] = File(default=[]),
    links: str = Form(default="[]"),
    free_text: str = Form(default=""),
    preferred_language: str = Form(default="auto"),
    detail_level: str = Form(default="auto"),
    prompt_mode: str = Form(default=DEFAULT_NOTE_PROMPT_MODE),
    note_length: str = Form(default=DEFAULT_NOTE_LENGTH_MODE),
    ai_provider: str = Form(default=""),
    client_fingerprint: str = Form(default=""),
    request: Request = None,
):
    global stored_summary, stored_sections, stored_connections, stored_mind_map, stored_title, stored_source_identity

    provider_token = set_request_text_provider(ai_provider)
    trace_token = begin_ai_call_trace() if "begin_ai_call_trace" in globals() else None
    analysis_started_at = time.monotonic()
    analysis_stage = "initializing"
    selected_ai_provider = "unresolved"
    source_units: List[dict] = []
    try:
        selected_ai_provider = active_text_provider()
        skipped_optional_stages: List[str] = []
        logger.info(
            "analysis_event=received provider=%s file_count=%d link_payload_chars=%d free_text_chars=%d",
            selected_ai_provider,
            len(files),
            len(links or ""),
            len(free_text or ""),
        )

        def ai_diagnostic_payload(source: str = "model") -> dict:
            if "ai_call_trace_payload" not in globals() or "current_ai_call_trace" not in globals():
                return {}
            return ai_call_trace_payload(current_ai_call_trace(), selected_ai_provider, source)

        def analysis_elapsed_seconds() -> float:
            return analysis_elapsed_seconds_since(analysis_started_at)

        def analysis_remaining_seconds() -> float:
            return analysis_remaining_seconds_since(analysis_started_at)

        def allow_optional_stage(stage: str, min_remaining_seconds: int) -> bool:
            if should_run_optional_analysis_stage(analysis_started_at, min_remaining_seconds):
                return True
            skipped_optional_stages.append(stage)
            return False

        content_parts: List[dict] = []
        title_candidates: List[str] = []
        seen_youtube_sources = set()

        for uploaded in files:
            analysis_stage = "file_read"
            data = await read_upload_bytes(uploaded, MAX_UPLOAD_BYTES, uploaded.filename or "uploaded file")
            if not data:
                continue
            analysis_stage = "file_extract"
            content_type = uploaded.content_type or mimetypes.guess_type(uploaded.filename or "")[0] or "application/octet-stream"
            parts, meta = await run_blocking(
                file_to_source_unit,
                uploaded.filename or "uploaded file",
                content_type,
                data,
            )
            content_parts.extend(parts)
            source_units.append(meta)
            title_candidates.append(meta.get("title_candidate") or meta.get("display_name") or "")
            extension = (uploaded.filename or "").rsplit(".", 1)[-1].lower() if "." in (uploaded.filename or "") else "none"
            logger.info(
                "analysis_event=source_extracted source_kind=file extension=%s bytes=%d text_chars=%d visual_count=%d elapsed_seconds=%.2f",
                extension,
                len(data),
                len(meta.get("text_excerpt", "")),
                len(meta.get("visual_parts", [])),
                analysis_elapsed_seconds(),
            )
            embedded_parts, embedded_units, embedded_titles = await run_blocking(
                expand_embedded_youtube_sources,
                meta.get("text_excerpt", ""),
                meta,
                seen_youtube_sources,
            )
            if embedded_units:
                content_parts.extend(embedded_parts)
                source_units.extend(embedded_units)
                title_candidates.extend(embedded_titles)

        try:
            parsed_links = json.loads(links) if links else []
        except Exception:
            parsed_links = []

        has_file_sources = any(
            str(unit.get("source_identity") or "").startswith("file:")
            for unit in source_units
        )
        # Prefer captions-only YouTube extraction when files already provide
        # study evidence, or when the remaining budget is too tight for yt-dlp.
        youtube_captions_only = has_file_sources or analysis_remaining_seconds() < 45

        for url in parsed_links:
            if not isinstance(url, str) or not url.strip():
                continue
            cleaned_url = clean_detected_url(url.strip())
            if get_youtube_video_id(cleaned_url):
                cleaned_url = canonicalize_youtube_watch_url(cleaned_url)
                key = youtube_source_key(cleaned_url)
                if key in seen_youtube_sources:
                    continue
                seen_youtube_sources.add(key)
            parts, meta = await run_blocking(
                link_to_source_unit,
                cleaned_url,
                youtube_captions_only if get_youtube_video_id(cleaned_url) else False,
            )
            content_parts.extend(parts)
            source_units.append(meta)
            title_candidates.append(meta.get("title_candidate") or meta.get("display_name") or "")

        for url in extract_youtube_urls_from_text(free_text):
            key = youtube_source_key(url)
            if not key or key in seen_youtube_sources:
                continue
            seen_youtube_sources.add(key)
            parts, meta = await run_blocking(link_to_source_unit, url, youtube_captions_only)
            meta["display_name"] = f"YouTube link from pasted text: {meta.get('title_candidate') or url}"
            content_parts.extend(parts)
            source_units.append(meta)
            title_candidates.append(meta.get("title_candidate") or meta.get("display_name") or "")

        cleaned_free_text = remove_urls_from_text(free_text)
        if cleaned_free_text:
            inferred_title = detect_legislation_title(cleaned_free_text[:4000]) or detect_course_or_topic_title(cleaned_free_text[:2500]) or "Pasted text"
            content_hash = sha256_text(cleaned_free_text)
            content_parts.append({
                "type": "text",
                "text": (
                    f"\n\nUSER PROVIDED TEXT\n"
                    f"Detected title/topic: {inferred_title}\n"
                    f"Content:\n{truncate_text(cleaned_free_text)}"
                ),
            })
            source_units.append({
                "display_name": "pasted text",
                "source_identity": f"text:{content_hash}",
                "title_candidate": inferred_title,
                "content_hash": content_hash,
                "text_excerpt": truncate_text(cleaned_free_text, 60000),
            })
            title_candidates.append(inferred_title)

        if not content_parts:
            return analysis_error_response("No readable files, links, or text were provided.", 400)

        unavailable_youtube_sources = [
            unit for unit in source_units
            if str(unit.get("source_identity") or "").startswith("youtube:")
            and unit.get("transcript_status") == "unavailable"
        ]
        if unavailable_youtube_sources and len(unavailable_youtube_sources) == len(source_units):
            labels = ", ".join(
                unit.get("title_candidate") or unit.get("display_name") or "YouTube video"
                for unit in unavailable_youtube_sources
            )
            return analysis_error_response(
                "Synapse could not access readable captions for this YouTube source "
                f"({labels}). To protect note quality, it will not generate study notes from a title or player alone. "
                "Choose a video with captions, upload a transcript, or paste the relevant transcript text.",
                422,
            )

        analysis_stage = "source_preparation"
        combined_source_text = "\n\n".join(
            part.get("text", "") for part in content_parts
            if isinstance(part, dict) and part.get("type") == "text"
        )
        selected_prompt_mode = normalise_note_prompt_mode(prompt_mode)
        selected_prompt_label = note_prompt_mode_label(selected_prompt_mode)
        selected_note_length = normalise_note_length_mode(note_length)
        selected_note_length_label = note_length_mode_label(selected_note_length)
        resolved_language_key = resolve_generation_language_key(preferred_language, combined_source_text)
        postprocess_language = resolved_language_key if normalise_language_key(preferred_language) == "auto" else preferred_language
        depth_plan = choose_learning_depth(combined_source_text, source_units, detail_level)
        depth = depth_plan["depth"]
        depth_config = depth_plan["config"]
        if len(source_units) >= 2 and depth_plan.get("auto_selected", True):
            depth = "comprehensive"
            depth_config = DEPTH_CONFIG["comprehensive"]
            depth_plan["depth"] = depth
            depth_plan["config"] = depth_config
            depth_plan["reason"] = (depth_plan.get("reason", "") + ", academic multi-source synthesis").strip(", ")

        source_fingerprint = build_analysis_fingerprint(
            preferred_language,
            source_units,
            depth,
            selected_prompt_mode,
            selected_note_length,
            selected_ai_provider,
        )
        logger.info(
            "analysis_event=sources_ready provider=%s source_count=%d text_chars=%d elapsed_seconds=%.2f",
            selected_ai_provider,
            len(source_units),
            len(combined_source_text),
            analysis_elapsed_seconds(),
        )
        cached_result = cache_get(source_fingerprint)
        if cached_result:
            analysis_stage = "cache_hit"
            logger.info(
                "analysis_event=cache_hit provider=%s source_count=%d elapsed_seconds=%.2f",
                selected_ai_provider,
                len(source_units),
                analysis_elapsed_seconds(),
            )
            # Rebuild live visual cards from the freshly uploaded files. The cache
            # intentionally does not store large base64 images, but the current
            # request still has the source_units needed to recreate them. Use the
            # deterministic selector here so cache hits do not make fresh model calls.
            if "rebuild_cached_visual_argument_cards" in globals():
                await run_blocking(rebuild_cached_visual_argument_cards, source_units, postprocess_language)
            cached_raw_summary = (
                cached_result.get("raw_summary")
                or cached_result.get("display_summary")
                or cached_result.get("summary", "")
            )
            if "strip_visual_card_pollution" in globals():
                cached_raw_summary = strip_visual_card_pollution(cached_raw_summary)
            cached_summary = await run_blocking(
                finalize_generated_summary,
                cached_result.get("display_summary") or cached_result.get("summary", "") or cached_raw_summary,
                requested_language=preferred_language,
                generation_language=postprocess_language,
                source_context=combined_source_text,
                source_units=source_units,
                attach_visuals=False,
                protect_heading=False,
                prompt_mode=selected_prompt_mode,
                note_length_mode=selected_note_length,
            )
            live_visual_gallery = await run_blocking(build_visual_gallery, source_units)
            from core.visual_assets import filter_browser_visual_gallery, prune_unavailable_visual_markers
            cached_visual_gallery = filter_browser_visual_gallery(
                cached_result.get("visual_gallery")
                or cached_result.get("source_evidence_cards")
                or cached_result.get("figure_cards")
                or cached_result.get("visuals")
                or []
            )
            visual_gallery = live_visual_gallery or cached_visual_gallery
            cached_summary = prune_unavailable_visual_markers(cached_summary, visual_gallery)
            cached_result = {
                **cached_result,
                "raw_summary": cached_raw_summary,
                "display_summary": cached_summary,
                "summary": cached_summary,
                "visual_gallery": visual_gallery,
                "visuals": visual_gallery,
                "source_evidence_cards": visual_gallery,
                "figure_cards": visual_gallery,
            }
            stored_summary = cached_summary
            stored_sections = parse_sections(stored_summary)
            cached_result["sections"] = stored_sections
            stored_connections = cached_result.get("connections", [])
            stored_mind_map = cached_result.get("mind_map", {})
            stored_title = cached_result.get("title", "Generated Study Notes")
            stored_source_identity = cached_result.get("primary_source_identity") or cached_result.get("source_identity", "")
            response_payload = {
                **cached_result,
                "cached": True,
                "source_fingerprint": source_fingerprint,
                "primary_source_identity": cached_result.get("primary_source_identity") or stored_source_identity,
                "source_identity": cached_result.get("source_identity") or stored_source_identity,
                "language": postprocess_language,
                "output_language": postprocess_language,
                "prompt_mode": selected_prompt_mode,
                "prompt_mode_label": selected_prompt_label,
                "ai_provider": selected_ai_provider,
                "note_length": cached_result.get("note_length") or selected_note_length,
                "note_length_label": cached_result.get("note_length_label") or selected_note_length_label,
                "analysis_max_seconds": ANALYSIS_MAX_SECONDS,
                "analysis_elapsed_seconds": round(analysis_elapsed_seconds(), 2),
                "optional_stages_skipped": [],
            }
            response_payload.update(ai_diagnostic_payload("cache"))
            database_record = await run_blocking(
                persist_generated_analysis_result,
                request,
                response_payload,
                client_fingerprint,
            )
            if database_record:
                response_payload["database_record"] = database_record
            logger.info(
                "analysis_event=completed cached=true provider=%s source_count=%d elapsed_seconds=%.2f",
                selected_ai_provider,
                len(source_units),
                analysis_elapsed_seconds(),
            )
            return response_payload

        analysis_stage = "generation"
        logger.info(
            "analysis_event=generation_started provider=%s source_count=%d remaining_seconds=%.2f",
            selected_ai_provider,
            len(source_units),
            analysis_remaining_seconds(),
        )
        await raise_if_analysis_client_disconnected(request, "fresh study-note generation")
        require_text_ai()

        title_hint = choose_best_source_title(title_candidates)
        # v42: use the controlled advanced tutor generator for both single and
        # multi-source uploads. This avoids an expensive source-digest prepass
        # and prevents the old single-source path from producing thin notes that
        # need visual cards patched on afterward.
        generated_summary = await run_blocking(
            generate_reference_style_multisource_notes,
            source_units,
            preferred_language,
            depth_plan,
            selected_prompt_mode,
            selected_note_length,
            analysis_started_at=analysis_started_at,
            skipped_optional_stages=skipped_optional_stages,
        )

        generated_summary = await run_blocking(
            enforce_requested_language,
            generated_summary,
            preferred_language,
            request_timeout=analysis_model_call_timeout(
                analysis_started_at,
                reserve_seconds=env_int("POST_LANGUAGE_STAGE_BUFFER_SECONDS", 45),
                default_seconds=env_int("LANGUAGE_REWRITE_TIMEOUT_SECONDS", 60),
            ),
        )
        raw_summary = (
            strip_visual_card_pollution(generated_summary)
            if "strip_visual_card_pollution" in globals()
            else generated_summary
        )
        stored_summary = finalize_generated_summary(
            raw_summary,
            requested_language=preferred_language,
            generation_language=postprocess_language,
            source_context=combined_source_text,
            source_units=source_units,
            attach_visuals=False,
            protect_heading=True,
            prompt_mode=selected_prompt_mode,
            note_length_mode=selected_note_length,
        )
        stored_sections = parse_sections(stored_summary)
        await raise_if_analysis_client_disconnected(request, "optional title and mind-map generation")
        if allow_optional_stage("title", env_int("TITLE_STAGE_MIN_SECONDS", 18)):
            stored_title = await run_blocking(
                make_notes_title,
                stored_summary,
                title_candidates,
                request_timeout=analysis_model_call_timeout(
                    analysis_started_at,
                    default_seconds=env_int("TITLE_STAGE_TIMEOUT_SECONDS", 15),
                ),
            )
        else:
            stored_title = title_hint if title_hint and title_hint != "Generated Study Notes" else "Generated Study Notes"
        if len(source_units) >= 2:
            # Avoid naming the whole analysis after only the first file.
            shared_title_hint = detect_course_or_topic_title(combined_source_text[:5000]) or "Multi-Source Study Synthesis"
            if stored_title in title_candidates or len(stored_title) < 18:
                stored_title = shared_title_hint
        stored_title = await run_blocking(
            localise_title_if_needed,
            stored_title,
            postprocess_language,
            request_timeout=analysis_model_call_timeout(
                analysis_started_at,
                default_seconds=env_int("TITLE_LOCALISE_TIMEOUT_SECONDS", 12),
            ),
        )
        stored_connections = generate_connections_from_sections(stored_sections)
        await raise_if_analysis_client_disconnected(request, "optional mind-map generation")
        if allow_optional_stage("mind_map", env_int("MINDMAP_STAGE_MIN_SECONDS", 35)):
            stored_mind_map = await run_blocking(
                generate_ai_mind_map,
                stored_title,
                stored_sections,
                postprocess_language,
                depth,
                selected_prompt_mode,
                request_timeout=analysis_model_call_timeout(
                    analysis_started_at,
                    default_seconds=env_int("MINDMAP_STAGE_TIMEOUT_SECONDS", 30),
                ),
            )
        else:
            stored_mind_map = generate_mind_map(stored_title, stored_sections, depth)
        stored_source_identity = source_units[0].get("source_identity", "") if source_units else ""

        visual_gallery = await run_blocking(build_visual_gallery, source_units)
        result = {
            "title": stored_title,
            "raw_summary": raw_summary,
            "display_summary": stored_summary,
            "summary": stored_summary,
            "sections": stored_sections,
            "connections": stored_connections,
            "mind_map": stored_mind_map,
            "visual_gallery": visual_gallery,
            "visuals": visual_gallery,
            "source_evidence_cards": visual_gallery,
            "figure_cards": visual_gallery,
            "primary_source_identity": stored_source_identity,
            "source_identity": stored_source_identity,
            "source_count": len(source_units),
            "sources": [
                {
                    "index": i + 1,
                    "display_name": unit.get("display_name", ""),
                    "title_candidate": unit.get("title_candidate", ""),
                    "source_identity": unit.get("source_identity", ""),
                    "url": unit.get("url", "") or unit.get("embedded_url", ""),
                    "embedded_url": unit.get("embedded_url", ""),
                    "text_excerpt": truncate_text(unit.get("text_excerpt", ""), 60000),
                    "kind": "youtube" if str(unit.get("source_identity") or "").startswith("youtube:") else "source",
                    "transcript_status": unit.get("transcript_status", ""),
                    "transcript_characters": unit.get("transcript_characters", 0),
                    "transcript_warning": unit.get("transcript_warning", ""),
                }
                for i, unit in enumerate(source_units)
            ],
            "source_fingerprint": source_fingerprint,
            "detail_level": depth,
            "generation_depth": depth,
            "depth_label": depth_config.get("label", depth),
            "depth_reason": depth_plan.get("reason", ""),
            "detail_plan": {k: v for k, v in depth_plan.items() if k != "config"},
            "language": postprocess_language,
            "output_language": postprocess_language,
            "prompt_mode": selected_prompt_mode,
            "prompt_mode_label": selected_prompt_label,
            "ai_provider": selected_ai_provider,
            "note_length": selected_note_length,
            "note_length_label": selected_note_length_label,
            "analysis_max_seconds": ANALYSIS_MAX_SECONDS,
            "analysis_elapsed_seconds": round(analysis_elapsed_seconds(), 2),
            "optional_stages_skipped": skipped_optional_stages,
            "cached": False,
        }
        result.update(ai_diagnostic_payload("model"))
        # Persist compact browser-safe visual metadata. build_visual_gallery()
        # converts model-facing data URLs into /assets URLs, so cached notes can
        # keep inline figure metadata without storing large base64 payloads.
        cache_result = {
            **result,
            "visual_gallery": visual_gallery,
            "visuals": visual_gallery,
            "source_evidence_cards": visual_gallery,
            "figure_cards": visual_gallery,
        }
        cache_set(source_fingerprint, cache_result)
        database_record = await run_blocking(
            persist_generated_analysis_result,
            request,
            result,
            client_fingerprint,
        )
        if database_record:
            result["database_record"] = database_record
        analysis_stage = "completed"
        logger.info(
            "analysis_event=completed cached=false provider=%s source_count=%d elapsed_seconds=%.2f optional_stages_skipped=%d",
            selected_ai_provider,
            len(source_units),
            analysis_elapsed_seconds(),
            len(skipped_optional_stages),
        )
        return result

    except Exception as error:
        logger.error(
            "analysis_event=failed stage=%s provider=%s source_count=%d elapsed_seconds=%.2f error_type=%s status_code=%d",
            analysis_stage,
            selected_ai_provider,
            len(source_units),
            analysis_elapsed_seconds_since(analysis_started_at),
            type(error).__name__,
            analysis_exception_status(error),
        )
        return analysis_error_response(str(error), analysis_exception_status(error))
    finally:
        if "reset_ai_call_trace" in globals():
            reset_ai_call_trace(trace_token)
        reset_request_text_provider(provider_token)


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
    completed = _threading.Event()

    def invoke() -> None:
        try:
            results = callback()
            if isinstance(results, list):
                outcome["results"] = results
        except Exception:
            outcome["results"] = []
        finally:
            completed.set()

    _threading.Thread(target=invoke, daemon=True).start()
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


def normalise_voice_tutor_json(parsed: dict, fallback_reply: str, transcript: str, history: List[dict]) -> dict:
    if not isinstance(parsed, dict):
        parsed = {}
    try:
        mastery = int(float(parsed.get("mastery", 0)))
    except Exception:
        mastery = 0
    mastery = max(0, min(100, mastery))
    state = normalise_space(str(parsed.get("state") or "diagnose")).lower().replace("-", "_")
    if state not in {"diagnose", "teach", "practice", "hint", "review", "mastered"}:
        state = "diagnose"
    reply = normalise_space(str(parsed.get("reply") or fallback_reply or "Tell me what you understand so far, and I will guide you from there."))
    next_prompt = normalise_space(str(parsed.get("next_prompt") or ""))
    if state != "mastered" and not next_prompt:
        next_prompt = "Answer the next question in your own words."
    exercise = parsed.get("exercise") if isinstance(parsed.get("exercise"), dict) else {}
    exercise = {
        "type": normalise_space(str(exercise.get("type") or "short_answer")),
        "question": normalise_space(str(exercise.get("question") or next_prompt)),
        "expected_answer": normalise_space(str(exercise.get("expected_answer") or "")),
    }
    suggestions = parsed.get("suggested_actions") if isinstance(parsed.get("suggested_actions"), list) else []
    suggestions = [normalise_space(str(item)) for item in suggestions if normalise_space(str(item))][:4]
    if not suggestions:
        suggestions = ["Give me a hint", "Ask a simpler question", "Give me another example"]
        if state == "mastered" or mastery >= 85:
            suggestions.append("End session")
    can_end = bool(parsed.get("can_end")) or state == "mastered" or mastery >= 88
    return {
        "transcript": transcript,
        "reply": reply,
        "state": "mastered" if can_end and mastery >= 85 else state,
        "mastery": mastery,
        "student_level": normalise_space(str(parsed.get("student_level") or "unclear")),
        "diagnosis": normalise_space(str(parsed.get("diagnosis") or "")),
        "next_prompt": "" if can_end and mastery >= 85 else next_prompt,
        "hint": normalise_space(str(parsed.get("hint") or "")),
        "exercise": exercise,
        "can_end": can_end,
        "suggested_actions": suggestions,
        "turn_count": len(history) + (1 if transcript else 0),
    }


def realtime_tutor_instructions(
    title: str,
    note_summary: str,
    section_context: str,
    topic_title: str,
    topic_context: str,
    topic_scope: str,
    history: List[dict],
    preferred_language: str,
    source_identity: str,
) -> str:
    focused_topic = normalise_space(topic_title) or normalise_space(title) or "current study topic"
    focused_context = str(topic_context or "").strip() or str(section_context or "").strip()
    language_source_text = focused_context or note_summary or section_context
    resolved_language_key = resolve_generation_language_key(preferred_language, language_source_text)
    language_name = target_language_name(resolved_language_key)
    different_script_warning = (
        "If the transcript is a very short word in Chinese, Japanese, Korean, Arabic, or another writing system, "
        "treat it as a likely speech-recognition mistake. Ask the learner to repeat in English or type it."
        if resolved_language_key == "english" else
        "If a very short transcript appears in a different writing system from the lesson language, treat it as a likely speech-recognition mistake and ask the learner to repeat or type it."
    )
    recent_history = "\n".join(
        f"{turn.get('role', 'user')}: {normalise_space(str(turn.get('text', '')))}"
        for turn in history[-10:]
    ) or "No prior voice tutor turns."
    broader_note_context = truncate_text(note_summary, 2800 if focused_context else VOICE_TUTOR_REALTIME_CONTEXT_CHARS)
    return f"""
You are Synapse Realtime Voice Tutor, a live speech-to-speech academic tutor.

Voice persona:
- Sound like a young adult female academic tutor in a modern chat app.
- Warm, natural, gentle, curious, encouraging, and conversational.
- Use a light smile in the voice and small natural pauses.
- Do not sound like a narrator, audiobook reader, news anchor, customer-service bot, or corporate assistant.
- Avoid long monologues. Speak in short, human turns.

Language:
- Speak in {language_name}.
- Keep the session in {language_name}. Only switch languages if the learner gives a clear full sentence in another language.
- Do not switch languages because of one short anomalous transcript.
- {different_script_warning}
- Never translate the product name Synapse.

Current note:
Title: {normalise_space(title) or 'current study topic'}
Primary source identity: {source_identity or 'current uploaded material'}

Current focused topic:
Topic title: {focused_topic}
Topic scope: {normalise_space(topic_scope) or 'current visible generated topic'}
Topic context:
{truncate_text(focused_context, 6500) if focused_context else 'No focused topic was sent. Use the note overview carefully.'}

Opening line:
- On the first assistant turn of the live session, start exactly with: "Hi, I'm your Synapse tutor for {focused_topic}. We'll build this step by step."

Small broader-note guardrail:
{broader_note_context}

Conversation memory:
{recent_history}

Strict scope rule:
- Treat the Current focused topic as the primary lesson scope.
- Answer about this topic only. Use the broader-note guardrail only for one-sentence connections if helpful.
- Never ask what subject, course, material, or topic the learner is working on. You already know the focused topic above.
- If the learner says "I have no idea", "I don't know", "I'm lost", or gives a very short answer, start teaching the focused topic directly from basics. Do not ask them to pick a subject.
- If the learner asks something outside this generated topic, briefly say it is outside the current topic and bring them back to this topic.
- Do not lecture through the whole note unless the current topic is the whole note overview.
- Every assistant turn must end with exactly one clear next step: a short question, a prompt for the learner to continue explaining, or a mini-example for them to try. Never end a tutoring turn with only a statement.

Adaptive tutoring loop:
1. Start the session with the exact opening line above, then ask the learner what they already understand about that exact topic. Do not ask for the subject.
2. Listen to the learner's explanation and diagnose gaps.
3. Ask exactly one focused question or mini-example at a time.
4. If the learner is stuck or wrong, give a gentle hint or micro-lesson, then ask a simpler question.
5. If the learner is doing well, ask a transfer/application question using the uploaded source material.
6. Only end when the learner shows stable understanding across definition, source evidence/example, and application.
7. Do not say they have mastered it just because they say they are done.

When useful, mention the source evidence naturally, but do not read long notes aloud. Be interactive.
""".strip()


@app.post("/voice-tutor/realtime-call")
async def voice_tutor_realtime_call(
    sdp: str = Form(...),
    history: str = Form(default="[]"),
    title: str = Form(default=""),
    summary: str = Form(default=""),
    sections: str = Form(default="{}"),
    selected_section: str = Form(default=""),
    topic_title: str = Form(default=""),
    topic_context: str = Form(default=""),
    topic_scope: str = Form(default=""),
    preferred_language: str = Form(default="auto"),
    voice_input_language: str = Form(default=""),
    source_identity: str = Form(default=""),
):
    try:
        require_openai_api()
        parsed_history = normalise_voice_tutor_history(parse_json_list(history))
        sections_dict = parse_json_dict(sections)
        note_summary = str(summary or "").strip()
        focused_topic_context = str(topic_context or "").strip()
        if not note_summary and not sections_dict and not focused_topic_context:
            return Response(
                content=json.dumps({"error": "No current note context was provided. Open or generate the note before starting voice tutor."}),
                media_type="application/json",
                status_code=400,
            )

        section_context = voice_tutor_context_from_sections(sections_dict, selected_section)
        language_source_text = focused_topic_context or section_context or note_summary
        transcription_language = realtime_transcription_language_code(
            preferred_language=preferred_language,
            source_text=language_source_text,
            explicit_language=voice_input_language,
        )
        transcription_config = {"model": TRANSCRIBE_MODEL}
        if transcription_language:
            transcription_config["language"] = transcription_language
        session_config = {
            "type": "realtime",
            "model": REALTIME_MODEL,
            "output_modalities": ["audio"],
            "instructions": realtime_tutor_instructions(
                title=title,
                note_summary=note_summary,
                section_context=section_context,
                topic_title=topic_title,
                topic_context=focused_topic_context,
                topic_scope=topic_scope,
                history=parsed_history,
                preferred_language=preferred_language,
                source_identity=source_identity,
            ),
            "audio": {
                "output": {"voice": REALTIME_VOICE},
                "input": {
                    "transcription": transcription_config,
                    "noise_reduction": {"type": "near_field"},
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.45,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 650,
                        "create_response": True,
                        "interrupt_response": True,
                    },
                },
            },
        }
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        if OPENAI_ORG_ID:
            headers["OpenAI-Organization"] = OPENAI_ORG_ID
        if OPENAI_PROJECT_ID:
            headers["OpenAI-Project"] = OPENAI_PROJECT_ID
        response = requests.post(
            "https://api.openai.com/v1/realtime/calls",
            headers=headers,
            files={
                "sdp": (None, sdp),
                "session": (None, json.dumps(session_config)),
            },
            timeout=30,
        )
        if response.status_code >= 400:
            return Response(
                content=json.dumps({
                    "error": voice_realtime_provider_error_message(response),
                    "status": response.status_code,
                }),
                media_type="application/json",
                status_code=response.status_code,
            )
        return Response(
            content=response.text,
            media_type="application/sdp",
            headers={"Cache-Control": "no-store"},
        )
    except Exception as error:
        return Response(
            content=json.dumps({"error": str(error)}),
            media_type="application/json",
            status_code=analysis_exception_status(error),
        )


@app.post("/voice-tutor/respond")
async def voice_tutor_respond(
    audio: Optional[UploadFile] = File(default=None),
    transcript: str = Form(default=""),
    history: str = Form(default="[]"),
    title: str = Form(default=""),
    summary: str = Form(default=""),
    sections: str = Form(default="{}"),
    selected_section: str = Form(default=""),
    preferred_language: str = Form(default="auto"),
    source_identity: str = Form(default=""),
    ai_provider: str = Form(default=""),
):
    provider_token = None
    try:
        provider_token = set_request_text_provider(ai_provider)
        require_text_ai()
        chat_model = chat_model_for_active_provider() if "chat_model_for_active_provider" in globals() else CHAT_MODEL
        parsed_history = normalise_voice_tutor_history(parse_json_list(history))
        sections_dict = parse_json_dict(sections)
        note_summary = str(summary or "").strip()
        if not note_summary and not sections_dict:
            return analysis_error_response(
                "No current note context was provided. Open or generate the note before starting voice tutor.",
                400,
            )

        transcript_text = normalise_space(transcript)
        if audio is not None and audio.filename:
            audio_bytes = await read_upload_bytes(audio, MAX_AUDIO_BYTES, audio.filename or "voice audio")
            if audio_bytes:
                transcript_text = normalise_space(transcribe_media_bytes(audio.filename, audio_bytes))
        is_opening_turn = not transcript_text and not parsed_history

        section_context = voice_tutor_context_from_sections(sections_dict, selected_section)
        topic = normalise_space(title) or "the current study topic"
        language_source_text = note_summary or section_context
        answer_language = (
            detect_question_language(transcript_text, preferred_language)
            if transcript_text else
            target_language_name(resolve_generation_language_key(preferred_language, language_source_text))
        )
        history_lines = "\n".join(
            f"{turn['role']}: {turn['text']}" + (f" [state={turn.get('state')}, mastery={turn.get('mastery')}]" if turn.get("state") else "")
            for turn in parsed_history[-VOICE_TUTOR_HISTORY_LIMIT:]
        ) or "No prior voice tutor turns."
        opening_instruction = (
            "This is the opening turn. Ask the learner to explain what they already understand about the topic before teaching. "
            "Do not lecture yet. Give a warm, short diagnostic prompt."
            if is_opening_turn else
            "Evaluate the learner's latest answer, then decide whether to teach, hint, ask a simpler question, ask a harder transfer question, or end."
        )

        prompt = f"""
You are Synapse Voice Tutor, an adaptive spoken academic tutor.

Speak in: {answer_language}
Never translate the product name Synapse.

Current note:
Title: {topic}
Primary source identity: {source_identity or 'current uploaded material'}
Selected section context:
{section_context[:5000] if section_context else 'Full note context is used.'}

Generated notes context:
{truncate_text(note_summary, VOICE_TUTOR_CONTEXT_CHARS)}

Voice tutor conversation so far:
{history_lines}

Latest learner answer transcript:
{transcript_text or '[No learner answer yet]'}

Tutor mission:
- Start by asking what the learner already understands about this topic.
- Use the learner's first explanation as a diagnostic baseline.
- Keep asking one focused question or example at a time.
- If the learner is vague, wrong, or stuck, give a hint, a simpler question, or a short micro-lesson before asking again.
- If the learner is doing well, ask a harder transfer/example question, not just recall.
- End only when the learner has shown stable understanding across definition, evidence/example, and application.
- Do not mark mastery just because the learner says they are done.
- Keep the reply speakable: short paragraphs, no markdown tables, no long lists.
- Write the reply like a natural voice-chat script from a warm young female academic tutor. Use conversational phrasing, not textbook prose.
- In English, use natural contractions where appropriate. Do not use headings like "Diagnosis:" or "Question:" in the spoken reply.
- Use the source notes as the authority. Do not invent facts outside the uploaded material.
- Ask exactly one main question at the end unless can_end is true.
- If can_end is true, give a brief mastery summary and tell the learner they can finish or ask for one final challenge.

Current instruction:
{opening_instruction}

Return JSON only:
{{
  "reply": "what the voice tutor should say aloud",
  "state": "diagnose | teach | practice | hint | review | mastered",
  "mastery": 0,
  "student_level": "unclear | beginner | developing | secure | strong",
  "diagnosis": "brief private-facing diagnosis for UI",
  "next_prompt": "the one question the learner should answer next, empty if mastered",
  "hint": "short hint if useful",
  "exercise": {{"type":"short_answer | explain | example | compare | apply | correct_mistake","question":"...","expected_answer":"..."}},
  "can_end": false,
  "suggested_actions": ["Give me a hint", "Ask a simpler question", "Give me another example"]
}}
"""
        raw = generate_chat(
            [
                {"role": "system", "content": SYSTEM_PROMPT + "\n\nYou are running a spoken tutoring loop. Return compact JSON only."},
                {"role": "user", "content": prompt},
            ],
            model=chat_model,
            temperature=0.25,
            max_tokens=VOICE_TUTOR_TOKENS,
        )
        try:
            parsed = extract_json_object(raw)
        except Exception:
            parsed = {}
        fallback = "Tell me what you already understand about this topic. Start with the main idea, then one example or source detail you remember."
        return normalise_voice_tutor_json(parsed, fallback, transcript_text, parsed_history)
    except Exception as error:
        return analysis_error_response(str(error), analysis_exception_status(error))
    finally:
        if provider_token is not None:
            reset_request_text_provider(provider_token)

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    return await analyze_materials(files=[file], links="[]", free_text="", preferred_language="auto", client_fingerprint="")
