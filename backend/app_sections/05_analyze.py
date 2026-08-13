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
    from domain.analysis_timing import elapsed_seconds_since
    return elapsed_seconds_since(started_at, time.monotonic())


def analysis_remaining_seconds_since(started_at: float) -> float:
    from domain.analysis_timing import remaining_seconds_since
    return remaining_seconds_since(started_at, time.monotonic(), ANALYSIS_MAX_SECONDS)


def should_run_optional_analysis_stage(started_at: float, min_remaining_seconds: int) -> bool:
    from domain.analysis_timing import should_run_optional_stage
    return should_run_optional_stage(
        started_at,
        time.monotonic(),
        ANALYSIS_MAX_SECONDS,
        max(0, int(min_remaining_seconds)),
    )


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
