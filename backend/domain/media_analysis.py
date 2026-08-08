"""Domain rules for audio/video study-material analysis.

Pure classification, size policy, and transcript-quality assessment.
No OpenAI / filesystem / HTTP here.
"""

from __future__ import annotations

from typing import Any

AUDIO_EXTENSIONS = (".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac", ".wma")
VIDEO_EXTENSIONS = (".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv", ".mpeg", ".mpg")
MEDIA_EXTENSIONS = AUDIO_EXTENSIONS + VIDEO_EXTENSIONS

TRANSCRIPT_STATUS_OK = "ok"
TRANSCRIPT_STATUS_EMPTY = "empty"
TRANSCRIPT_STATUS_TOO_LARGE = "too_large"
TRANSCRIPT_STATUS_NEEDS_KEY = "needs_api_key"
TRANSCRIPT_STATUS_FAILED = "failed"
TRANSCRIPT_STATUS_LOW_SIGNAL = "low_signal"

_MIN_USEFUL_CHARS = 80
_LOW_SIGNAL_MARKERS = (
    "too large to transcribe",
    "requires a valid openai_api_key",
    "no audio/video data",
    "could not transcribe",
    "transcription failed",
)


def media_kind_from_name_and_type(name: str = "", content_type: str = "") -> str:
    """Return 'audio', 'video', or ''."""
    lower_name = (name or "").lower().strip()
    ctype = (content_type or "").lower().strip()
    if ctype.startswith("audio/") or lower_name.endswith(AUDIO_EXTENSIONS):
        return "audio"
    if ctype.startswith("video/") or lower_name.endswith(VIDEO_EXTENSIONS):
        return "video"
    if lower_name.endswith(MEDIA_EXTENSIONS):
        # Extension catch-all already covered above; keep for safety.
        return "video" if lower_name.endswith(VIDEO_EXTENSIONS) else "audio"
    return ""


def is_media_upload(name: str = "", content_type: str = "") -> bool:
    return bool(media_kind_from_name_and_type(name, content_type))


def is_video_upload(name: str = "", content_type: str = "") -> bool:
    return media_kind_from_name_and_type(name, content_type) == "video"


def bytes_within_limit(size: int, limit: int) -> bool:
    try:
        return int(size) <= int(limit)
    except (TypeError, ValueError):
        return False


def media_size_warning(size: int, max_audio_bytes: int, max_upload_bytes: int) -> str:
    """User-facing warning before analyze. Empty when OK."""
    try:
        size_n = int(size)
    except (TypeError, ValueError):
        return ""
    if size_n <= 0:
        return ""
    if size_n > max_upload_bytes:
        return (
            f"This file is about {size_n / (1024 * 1024):.1f}MB and exceeds the upload limit "
            f"({max_upload_bytes / (1024 * 1024):.0f}MB)."
        )
    if size_n > max_audio_bytes:
        return (
            f"This media file is about {size_n / (1024 * 1024):.1f}MB. "
            f"Direct transcription works best under about {max_audio_bytes / (1024 * 1024):.0f}MB. "
            "Use a shorter clip, compress the file, or paste a transcript for fuller notes."
        )
    return ""


def assess_transcript_quality(transcript: str, *, byte_size: int = 0, max_audio_bytes: int = 0) -> dict[str, Any]:
    text = " ".join(str(transcript or "").split()).strip()
    lower = text.lower()
    char_count = len(text)

    if max_audio_bytes and byte_size > max_audio_bytes:
        return {
            "status": TRANSCRIPT_STATUS_TOO_LARGE,
            "characters": char_count,
            "usable": False,
            "warning": text or "Media exceeds the transcription size limit.",
        }
    if "requires a valid openai_api_key" in lower:
        return {
            "status": TRANSCRIPT_STATUS_NEEDS_KEY,
            "characters": char_count,
            "usable": False,
            "warning": text,
        }
    if not text or text == "No audio/video data was provided.":
        return {
            "status": TRANSCRIPT_STATUS_EMPTY,
            "characters": 0,
            "usable": False,
            "warning": "No transcript was produced from this media file.",
        }
    if any(marker in lower for marker in _LOW_SIGNAL_MARKERS) and char_count < 400:
        return {
            "status": TRANSCRIPT_STATUS_FAILED,
            "characters": char_count,
            "usable": False,
            "warning": text,
        }
    if char_count < _MIN_USEFUL_CHARS:
        return {
            "status": TRANSCRIPT_STATUS_LOW_SIGNAL,
            "characters": char_count,
            "usable": False,
            "warning": "Transcript is too short for reliable study notes. Check audio quality or upload a clearer recording.",
        }
    return {
        "status": TRANSCRIPT_STATUS_OK,
        "characters": char_count,
        "usable": True,
        "warning": "",
    }


def build_media_analysis_brief(
    *,
    display_name: str,
    media_kind: str,
    transcript: str,
    quality: dict[str, Any],
    frame_count: int = 0,
) -> str:
    """Structured text the analyze pipeline feeds to the note model."""
    kind_label = "audio lecture/recording" if media_kind == "audio" else "video lecture/recording"
    status = quality.get("status") or TRANSCRIPT_STATUS_FAILED
    characters = int(quality.get("characters") or 0)
    warning = str(quality.get("warning") or "").strip()
    usable = bool(quality.get("usable"))

    lines = [
        f"SOURCE MEDIA ({media_kind.upper()}): {display_name}",
        f"Media kind: {kind_label}",
        f"Transcript status: {status}",
        f"Transcript characters: {characters}",
        f"Sampled visual frames attached: {frame_count}",
        "",
        "Study-analysis instructions for this media source:",
        "- Treat the transcript as the primary spoken evidence from the recording.",
        "- Build tutor-style notes: key claims, definitions, examples, and exam-ready takeaways.",
        "- Preserve formulas, numbers, names, and mixed-language terms exactly when present.",
        "- If visual frames are attached, use them only as supporting evidence for diagrams, slides, or board work.",
        "- If the transcript is unusable, explain the limitation briefly and do not invent lecture content.",
    ]
    if warning:
        lines.extend(["", f"Transcript warning: {warning}"])
    lines.extend(["", "Transcript:", transcript.strip() if usable or transcript.strip() else "[No usable transcript]"])
    return "\n".join(lines)
