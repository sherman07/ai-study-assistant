"""Assemble analyze() cache-hit responses without repeating the route body."""

from __future__ import annotations

from typing import Any, Awaitable, Callable, Dict, List, Optional


async def build_analyze_cache_hit_response(
    *,
    cached_result: Dict[str, Any],
    source_units: List[dict],
    postprocess_language: str,
    preferred_language: str,
    combined_source_text: str,
    selected_prompt_mode: str,
    selected_note_length: str,
    selected_prompt_label: str,
    selected_note_length_label: str,
    selected_ai_provider: str,
    source_fingerprint: str,
    request: Any,
    client_fingerprint: str,
    analysis_max_seconds: int,
    analysis_elapsed_seconds: Callable[[], float],
    ai_diagnostic_payload: Callable[..., dict],
    run_blocking: Callable[..., Awaitable[Any]],
    rebuild_cached_visual_argument_cards: Optional[Callable[..., Any]],
    strip_visual_card_pollution: Optional[Callable[..., str]],
    finalize_generated_summary: Callable[..., Any],
    build_visual_gallery: Callable[..., Any],
    filter_browser_visual_gallery: Callable[..., list],
    prune_unavailable_visual_markers: Callable[..., str],
    parse_sections: Callable[..., list],
    persist_generated_analysis_result: Callable[..., Any],
    logger: Any,
) -> Dict[str, Any]:
    if rebuild_cached_visual_argument_cards is not None:
        await run_blocking(rebuild_cached_visual_argument_cards, source_units, postprocess_language)
    cached_raw_summary = (
        cached_result.get("raw_summary")
        or cached_result.get("display_summary")
        or cached_result.get("summary", "")
    )
    if strip_visual_card_pollution is not None:
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
        "analysis_max_seconds": analysis_max_seconds,
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
    return {
        "response_payload": response_payload,
        "stored_summary": stored_summary,
        "stored_sections": stored_sections,
        "stored_connections": stored_connections,
        "stored_mind_map": stored_mind_map,
        "stored_title": stored_title,
        "stored_source_identity": stored_source_identity,
    }
