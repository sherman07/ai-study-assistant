

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

        if len(files) > MAX_ANALYZE_FILES:
            raise ValueError(
                f"Uploaded file count is too large ({len(files)}). The current limit is {MAX_ANALYZE_FILES}."
            )

        aggregate_upload_bytes = 0
        for uploaded in files:
            analysis_stage = "file_read"
            data = await read_upload_bytes(uploaded, MAX_UPLOAD_BYTES, uploaded.filename or "uploaded file")
            if not data:
                continue
            aggregate_upload_bytes += len(data)
            if aggregate_upload_bytes > MAX_ANALYZE_TOTAL_UPLOAD_BYTES:
                raise ValueError(
                    "Uploaded files are too large in total "
                    f"({aggregate_upload_bytes} bytes). The current aggregate limit is "
                    f"{MAX_ANALYZE_TOTAL_UPLOAD_BYTES} bytes."
                )
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
            from services.analyze_cache_hit import build_analyze_cache_hit_response
            from core.visual_assets import filter_browser_visual_gallery, prune_unavailable_visual_markers
            cache_hit = await build_analyze_cache_hit_response(
                cached_result=cached_result,
                source_units=source_units,
                postprocess_language=postprocess_language,
                preferred_language=preferred_language,
                combined_source_text=combined_source_text,
                selected_prompt_mode=selected_prompt_mode,
                selected_note_length=selected_note_length,
                selected_prompt_label=selected_prompt_label,
                selected_note_length_label=selected_note_length_label,
                selected_ai_provider=selected_ai_provider,
                source_fingerprint=source_fingerprint,
                request=request,
                client_fingerprint=client_fingerprint,
                analysis_max_seconds=ANALYSIS_MAX_SECONDS,
                analysis_elapsed_seconds=analysis_elapsed_seconds,
                ai_diagnostic_payload=ai_diagnostic_payload,
                run_blocking=run_blocking,
                rebuild_cached_visual_argument_cards=rebuild_cached_visual_argument_cards if "rebuild_cached_visual_argument_cards" in globals() else None,
                strip_visual_card_pollution=strip_visual_card_pollution if "strip_visual_card_pollution" in globals() else None,
                finalize_generated_summary=finalize_generated_summary,
                build_visual_gallery=build_visual_gallery,
                filter_browser_visual_gallery=filter_browser_visual_gallery,
                prune_unavailable_visual_markers=prune_unavailable_visual_markers,
                parse_sections=parse_sections,
                persist_generated_analysis_result=persist_generated_analysis_result,
                logger=logger,
            )
            stored_summary = cache_hit["stored_summary"]
            stored_sections = cache_hit["stored_sections"]
            stored_connections = cache_hit["stored_connections"]
            stored_mind_map = cache_hit["stored_mind_map"]
            stored_title = cache_hit["stored_title"]
            stored_source_identity = cache_hit["stored_source_identity"]
            return cache_hit["response_payload"]

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
