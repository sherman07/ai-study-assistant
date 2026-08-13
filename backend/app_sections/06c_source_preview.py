

def _record_ai_call_event(event: dict) -> None:
    trace = AI_CALL_TRACE.get()
    if not isinstance(trace, list):
        return
    safe_event = {
        "ts": int(time.time()),
        "stage": event.get("stage") or "chat",
        "provider": normalise_text_provider(event.get("provider", "")) if "normalise_text_provider" in globals() else event.get("provider", ""),
        "model": normalise_space(str(event.get("model") or "")),
        "requested_model": normalise_space(str(event.get("requested_model") or "")),
        "status": event.get("status") or "unknown",
        "api_request_attempted": bool(event.get("api_request_attempted")),
    }
    for key in ("duration_ms", "prompt_tokens", "completion_tokens", "total_tokens", "error_type", "error"):
        if key in event and event.get(key) not in (None, ""):
            safe_event[key] = event.get(key)
    trace.append(safe_event)


def ai_call_trace_payload(trace: Optional[List[dict]], provider: str, source: str = "model") -> dict:
    events = list(trace or [])
    request_events = [event for event in events if event.get("api_request_attempted")]
    success_events = [event for event in request_events if event.get("status") == "success"]
    failed_events = [event for event in request_events if event.get("status") != "success"]
    fallback_events = [event for event in events if event.get("status") == "fallback"]
    main_fallback = any(event.get("stage") == "main_notes" for event in fallback_events)
    if source == "cache":
        generation_source = "cache"
    elif main_fallback:
        generation_source = "fallback"
    elif success_events:
        generation_source = "model"
    elif request_events:
        generation_source = "failed_model"
    else:
        generation_source = source or "unknown"
    models = []
    for event in request_events:
        model_name = event.get("model") or event.get("requested_model")
        if model_name and model_name not in models:
            models.append(model_name)
    last_error = ""
    for event in reversed(events):
        if event.get("error"):
            last_error = event.get("error", "")
            break
    fallback_stages = []
    for event in fallback_events:
        stage = event.get("stage")
        if stage and stage not in fallback_stages:
            fallback_stages.append(stage)
    auxiliary_fallback = bool(fallback_events) and not main_fallback
    diagnostics = {
        "source": generation_source,
        "provider": normalise_text_provider(provider) if "normalise_text_provider" in globals() else provider,
        "model_call_count": len(request_events),
        "successful_model_calls": len(success_events),
        "failed_model_calls": len(failed_events),
        "models": models,
        "fallback_used": bool(main_fallback),
        "auxiliary_fallback_used": auxiliary_fallback,
        "fallback_stages": fallback_stages,
        "last_error": last_error,
        "events": events[-12:],
    }
    return {
        "ai_generation": diagnostics,
        "ai_generation_source": generation_source,
        "ai_model_call_count": diagnostics["model_call_count"],
        "ai_successful_model_call_count": diagnostics["successful_model_calls"],
        "ai_failed_model_call_count": diagnostics["failed_model_calls"],
        "ai_fallback_used": diagnostics["fallback_used"],
    }


# Override existing helper. Keeps backwards compatibility with old calls.
def generate_chat(
    messages: List[dict],
    model: str = "",
    temperature: float = 0,
    max_tokens: int = 4500,
    request_timeout: Optional[float] = None,
    provider_options: Optional[dict] = None,
) -> str:
    active_client = text_generation_client()
    provider = active_text_provider() if "active_text_provider" in globals() else AI_TEXT_PROVIDER
    model_name = model or (chat_model_for_active_provider() if "chat_model_for_active_provider" in globals() else CHAT_MODEL)
    if provider == "deepseek":
        # Avoid handing DeepSeek V4 the much larger GPT-oriented generation
        # allowance: on synchronous hosts it can exceed the gateway window.
        max_tokens = min(max(1, int(max_tokens)), DEEPSEEK_MAX_OUTPUT_TOKENS)
    if active_client is None:
        _record_ai_call_event({
            "stage": "chat",
            "provider": provider,
            "model": model_name,
            "status": "configuration_error",
            "api_request_attempted": False,
            "error_type": "RuntimeError",
            "error": "Text generation client is not configured.",
        })
        if provider == "gemini":
            if GEMINI_AUTH_MODE == "adc":
                raise RuntimeError("Gemini ADC is not configured. Add GEMINI_PROJECT_ID to backend/.env.gemini, run gcloud auth application-default login, then restart the backend.")
            raise RuntimeError("GEMINI_API_KEY is not configured. Add it to backend/.env.gemini and restart the backend.")
        if provider == "deepseek":
            raise RuntimeError("DEEPSEEK_API_KEY is not configured. Add it to the deployment environment and restart the backend.")
        raise RuntimeError("OPENAI_API_KEY is not configured. Add it to backend/.env and restart the backend.")

    optimised_messages = _v21_optimise_messages(messages)
    request_options = {}
    if request_timeout is not None:
        try:
            timeout_value = max(1.0, float(request_timeout))
            request_options["timeout"] = timeout_value
        except Exception:
            request_options = {}
    if provider_options:
        request_options["extra_body"] = provider_options
    elif provider == "deepseek":
        # DeepSeek V4 defaults to thinking mode, which can consume an entire
        # bounded study-generation budget before producing visible content.
        # Non-thinking is the dependable default for Synapse's normal request
        # path; deployments can explicitly opt in with DEEPSEEK_THINKING_MODE.
        request_options["extra_body"] = {"thinking": {"type": DEEPSEEK_THINKING_MODE}}

    # Some newer models may reject temperature or prefer max_completion_tokens.
    # Try several compatible payload shapes, preserving the previous robustness.
    last_error = None
    candidate_model = _v21_selected_model(model_name)
    payloads = [
        {"model": candidate_model, "messages": optimised_messages, "temperature": temperature, "max_tokens": max_tokens, **request_options},
        {"model": candidate_model, "messages": optimised_messages, "max_tokens": max_tokens, **request_options},
        {"model": candidate_model, "messages": optimised_messages, "temperature": temperature, "max_completion_tokens": max_tokens, **request_options},
        {"model": candidate_model, "messages": optimised_messages, "max_completion_tokens": max_tokens, **request_options},
    ]
    for kwargs in payloads:
        call_started_at = time.monotonic()
        try:
            response = active_client.chat.completions.create(**kwargs)
            _v21_record_usage(response, candidate_model)
            usage = getattr(response, "usage", None)
            _record_ai_call_event({
                "stage": "chat",
                "provider": provider,
                "requested_model": model_name,
                "model": candidate_model,
                "status": "success",
                "api_request_attempted": True,
                "duration_ms": int((time.monotonic() - call_started_at) * 1000),
                "prompt_tokens": getattr(usage, "prompt_tokens", None) if usage is not None else None,
                "completion_tokens": getattr(usage, "completion_tokens", None) if usage is not None else None,
                "total_tokens": getattr(usage, "total_tokens", None) if usage is not None else None,
            })
            content = response.choices[0].message.content or ""
            # If the task is JSON and the model still pretty-printed JSON, compact it.
            if MINIFY_MODEL_JSON and _v21_is_json_task(optimised_messages):
                try:
                    parsed = extract_json_object(content)
                    if isinstance(parsed, dict):
                        return json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
                except Exception:
                    pass
            return content
        except Exception as exc:
            last_error = exc
            msg = str(exc).lower()
            _record_ai_call_event({
                "stage": "chat",
                "provider": provider,
                "requested_model": model_name,
                "model": candidate_model,
                "status": "error",
                "api_request_attempted": True,
                "duration_ms": int((time.monotonic() - call_started_at) * 1000),
                "error_type": type(exc).__name__,
                "error": _sanitize_ai_error(exc),
            })
            if _v21_is_payload_compatibility_error(msg):
                continue
            raise
    raise last_error if last_error else RuntimeError("Text generation request failed.")


@app.get("/health/token-optimization")
def health_token_optimization():
    """Quick dashboard for checking whether token optimisation is active."""
    return {
        "status": "ok",
        "enabled": TOKEN_OPTIMIZATION_ENABLED,
        "compact_system_prompts": COMPACT_SYSTEM_PROMPTS,
        "minify_model_json": MINIFY_MODEL_JSON,
        "minify_cache_json": MINIFY_CACHE_JSON,
        "json_minify_hint": ADD_JSON_MINIFY_HINT,
        "log_token_usage": LOG_TOKEN_USAGE,
        "recent_usage": TOKEN_USAGE_WINDOW[-10:],
        "cache_file": str(CACHE_PATH),
        "cache_version": CACHE_VERSION,
        "note": "Final user-facing study guides are not minified; only internal JSON/prompts/cache are optimised.",
    }

# -----------------------------------------------------------------------------
# v22 Controlled Inline Visual Professor Mode
# -----------------------------------------------------------------------------
# Purpose:
# - Keep the existing HTML/CSS/loading animation unchanged.
# - Shorten waiting time by replacing the old multi-pass source-card + synthesis
#   pipeline with a controlled one-pass study guide plus one batched visual pass.
# - Put useful PDF/PPT visuals directly inside the generated content with
#   [[VISUAL:n]] markers; the existing frontend renderer turns those markers into
#   inline image cards.
# - Prefer relevant teaching visuals in context; keep decorative material out,
#   but do not be timid about diagrams, tables, charts, workflows, or worked examples.

CONTROLLED_INLINE_VISUAL_MODE = os.getenv("CONTROLLED_INLINE_VISUAL_MODE", "true").lower() not in {"0", "false", "no"}
CONTROLLED_MAX_VISUALS = max(1, env_int("CONTROLLED_MAX_VISUALS", 8))
CONTROLLED_MAX_SOURCE_CONTEXT_CHARS = env_int("CONTROLLED_MAX_SOURCE_CONTEXT_CHARS", 110000)
CONTROLLED_MAX_CHARS_PER_SOURCE = env_int("CONTROLLED_MAX_CHARS_PER_SOURCE", 18000)
CONTROLLED_OUTPUT_TOKENS = env_int("CONTROLLED_OUTPUT_TOKENS", 16000)
CONTROLLED_VISUAL_CARD_TOKENS = env_int("CONTROLLED_VISUAL_CARD_TOKENS", 3200)
CONTROLLED_VISUAL_RENDER_DPI = env_int("CONTROLLED_VISUAL_RENDER_DPI", 115)
CONTROLLED_MAX_PDF_PAGES_PER_SOURCE = env_int("CONTROLLED_MAX_PDF_PAGES_PER_SOURCE", 10)
CONTROLLED_MAX_PPTX_SLIDES_PER_SOURCE = env_int("CONTROLLED_MAX_PPTX_SLIDES_PER_SOURCE", 10)
CONTROLLED_INCLUDE_SOURCE_CARDS = os.getenv("CONTROLLED_INCLUDE_SOURCE_CARDS", "false").lower() not in {"0", "false", "no"}
