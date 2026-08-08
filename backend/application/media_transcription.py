"""Application orchestration for uploaded audio/video analysis.

Transcribes media via OpenAI and builds source-unit payloads for /analyze.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any, Callable, Optional

from backend.domain.media_analysis import (
    assess_transcript_quality,
    build_media_analysis_brief,
    is_video_upload,
    media_kind_from_name_and_type,
)


ACADEMIC_TRANSCRIBE_PROMPT = (
    "Academic lecture, tutorial, or study recording. "
    "Preserve formulas, numbers, definitions, speaker corrections, "
    "and mixed Chinese-English or other bilingual terms."
)


def transcribe_media_file(
    filename: str,
    data: bytes,
    *,
    client: Any,
    primary_model: str,
    fallback_model: str = "whisper-1",
    max_audio_bytes: int,
    require_openai_api: Callable[[], None],
) -> dict[str, Any]:
    """Return a structured transcription result (never raises for size/key issues)."""
    require_openai_api()
    name = filename or "audio.webm"
    if not data:
        text = "No audio/video data was provided."
        quality = assess_transcript_quality(text)
        return {"text": text, "model": "", "quality": quality}

    if len(data) > max_audio_bytes:
        size_mb = len(data) / (1024 * 1024)
        limit_mb = max_audio_bytes / (1024 * 1024)
        text = (
            f"The audio/video file is too large to transcribe directly ({size_mb:.1f}MB). "
            f"The current limit is about {limit_mb:.0f}MB. Upload a shorter clip or paste the transcript."
        )
        quality = assess_transcript_quality(text, byte_size=len(data), max_audio_bytes=max_audio_bytes)
        return {"text": text, "model": "", "quality": quality}

    suffix = Path(name).suffix or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(data)
        temp_path = temp_file.name

    used_model = primary_model
    try:
        with open(temp_path, "rb") as audio_file:
            try:
                result = client.audio.transcriptions.create(
                    model=primary_model,
                    file=audio_file,
                    prompt=ACADEMIC_TRANSCRIBE_PROMPT,
                )
            except Exception:
                audio_file.seek(0)
                used_model = fallback_model
                result = client.audio.transcriptions.create(
                    model=fallback_model,
                    file=audio_file,
                    prompt="Academic lecture/tutorial. Preserve formulas and numbers.",
                )
        text = getattr(result, "text", str(result)).strip()
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass

    quality = assess_transcript_quality(text, byte_size=len(data), max_audio_bytes=max_audio_bytes)
    return {"text": text, "model": used_model, "quality": quality}


def build_uploaded_media_source(
    name: str,
    content_type: str,
    data: bytes,
    *,
    has_openai: bool,
    client: Any,
    primary_model: str,
    max_audio_bytes: int,
    require_openai_api: Callable[[], None],
    extract_video_frames: Optional[Callable[..., list]] = None,
    truncate_text: Optional[Callable[[str], str]] = None,
    detect_title: Optional[Callable[[str], str]] = None,
    sha256_bytes: Optional[Callable[[bytes], str]] = None,
    sha256_text: Optional[Callable[[str], str]] = None,
) -> tuple[list[dict], dict]:
    """High-quality audio/video → content_parts + source_meta for analyze."""
    display_name = name or "uploaded media"
    media_kind = media_kind_from_name_and_type(name, content_type) or "audio"
    raw_hash = sha256_bytes(data) if sha256_bytes else ""

    if not has_openai:
        transcript = "Audio/video transcription requires a valid OPENAI_API_KEY."
        quality = assess_transcript_quality(transcript)
        transcription = {"text": transcript, "model": "", "quality": quality}
    else:
        transcription = transcribe_media_file(
            display_name,
            data,
            client=client,
            primary_model=primary_model,
            max_audio_bytes=max_audio_bytes,
            require_openai_api=require_openai_api,
        )

    transcript = str(transcription.get("text") or "")
    quality = transcription.get("quality") or assess_transcript_quality(transcript)

    frame_parts: list[dict] = []
    if is_video_upload(name, content_type) and extract_video_frames:
        suffix = Path(display_name).suffix or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(data)
            temp_path = temp_file.name
        try:
            frame_parts = extract_video_frames(temp_path, source_name=display_name) or []
        finally:
            try:
                os.remove(temp_path)
            except OSError:
                pass

    brief = build_media_analysis_brief(
        display_name=display_name,
        media_kind=media_kind,
        transcript=transcript,
        quality=quality,
        frame_count=max(0, len(frame_parts) // 2),
    )
    if truncate_text:
        brief_for_model = truncate_text(brief)
        excerpt = truncate_text(transcript) if transcript else ""
    else:
        brief_for_model = brief
        excerpt = transcript

    title = display_name
    if detect_title and quality.get("usable"):
        title = detect_title(transcript[:4000]) or detect_title(transcript[:2500]) or display_name

    content_hash = sha256_text(f"{raw_hash}\n{transcript[:50000]}") if sha256_text else raw_hash
    parts = [{"type": "text", "text": f"\n\n{brief_for_model}"}]
    parts.extend(frame_parts)

    source_meta = {
        "display_name": display_name,
        "source_identity": f"file:{raw_hash}" if raw_hash else f"media:{display_name}",
        "title_candidate": title,
        "content_hash": content_hash,
        "file_hash": raw_hash,
        "text_excerpt": excerpt[:60000] if isinstance(excerpt, str) else excerpt,
        "visual_parts": frame_parts,
        "media_kind": media_kind,
        "transcript_status": quality.get("status"),
        "transcript_characters": quality.get("characters", 0),
        "transcript_warning": quality.get("warning", ""),
        "transcript_model": transcription.get("model") or "",
        "transcript_usable": bool(quality.get("usable")),
    }
    return parts, source_meta
