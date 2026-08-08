import asyncio
import base64
import html
import json
import mimetypes
import smtplib
import ssl
import os
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
import time
import urllib.request
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formataddr
from functools import partial
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, quote, urlencode, urlparse, urlunparse

import requests
from dotenv import dotenv_values
from fastapi import BackgroundTasks, FastAPI, File, Form, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

BACKEND_PACKAGE_DIR = Path(__file__).resolve().parent
if str(BACKEND_PACKAGE_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_PACKAGE_DIR))

from core.analysis_cache import cache_get, cache_set
from core.config import (
    AI_TEXT_PROVIDER,
    ANALYSIS_MAX_SECONDS,
    ANALYSIS_MODEL,
    BROADCAST_REALTIME_MODEL,
    BROADCAST_SCRIPT_MODEL,
    BROADCAST_TTS_INPUT_CHAR_LIMIT,
    BROADCAST_TTS_MODEL,
    BROADCAST_TTS_PROVIDER,
    BROADCAST_TTS_VOICE,
    CACHE_PATH,
    CACHE_VERSION,
    CHAT_MODEL,
    CONFIG_ENV_PATHS,
    CORS_ALLOW_CREDENTIALS,
    CORS_ALLOW_ORIGIN_REGEX,
    CORS_ALLOW_ORIGINS,
    ENABLE_LOCAL_PPTX_APP_RENDER,
    ENABLE_EMBEDDED_YOUTUBE_SOURCES,
    ENABLE_MULTI_SOURCE_DIGESTS,
    ENABLE_PDF_VISUAL_EXTRACTION,
    ENABLE_PPTX_SLIDE_RENDER,
    ENABLE_PPTX_SVG_FALLBACK_RENDER,
    ENABLE_PPTX_EMBEDDED_IMAGE_EXTRACTION,
    ENABLE_SOURCE_PPTX_PREVIEW_RENDER,
    ENABLE_TUTOR_WEB_RESEARCH,
    ENABLE_YOUTUBE_YTDLP_FALLBACK,
    DEEPSEEK_API_KEY,
    DEEPSEEK_CHAT_MODEL,
    DEEPSEEK_ENV_PATHS,
    DEEPSEEK_OPENAI_BASE_URL,
    DEEPSEEK_THINKING_MODE,
    FALLBACK_MODEL,
    GEMINI_API_KEY,
    GEMINI_AUTH_MODE,
    GEMINI_CHAT_MODEL,
    GEMINI_ENV_PATHS,
    GEMINI_FALLBACK_MODEL,
    GEMINI_OPENAI_BASE_URL,
    GEMINI_LOCATION,
    GEMINI_PROJECT_ID,
    MAX_AUDIO_BYTES,
    MAX_MULTI_SOURCE_VISUAL_IMAGES,
    MAX_SOURCE_CHARS,
    MAX_TUTOR_RESEARCH_CHARS,
    MAX_TUTOR_SEARCH_RESULTS,
    MAX_UPLOAD_BYTES,
    MAX_VIDEO_BYTES,
    MAX_VIDEO_FRAMES,
    MAX_VISUAL_IMAGES_PER_SOURCE,
    MINDMAP_MODEL,
    MULTISOURCE_CONNECTION_TOKENS,
    MULTISOURCE_SOURCE_CHARS,
    MULTISOURCE_SOURCE_DIGEST_TOKENS,
    MULTISOURCE_SYNTHESIS_PART_TOKENS,
    MULTISOURCE_VISUAL_GALLERY_LIMIT,
    OPENAI_API_KEY,
    OPENAI_ORG_ID,
    OPENAI_PROJECT_ID,
    OPENAI_TIMEOUT_SECONDS,
    PUBLIC_BACKEND_BASE_URL,
    REALTIME_MODEL,
    REALTIME_VOICE,
    RUNTIME_ASSETS_DIR,
    SOURCE_PREVIEW_MAX_EMBEDDED_IMAGES,
    SOURCE_PREVIEW_MAX_PDF_PAGES,
    SOURCE_PREVIEW_MAX_SLIDES,
    SOURCE_PREVIEW_PPTX_CONVERT_TIMEOUT,
    SOURCE_PREVIEW_RENDER_DPI,
    TITLE_MODEL,
    TRANSCRIBE_MODEL,
    VISUAL_ARGUMENT_CARD_LIMIT,
    VISUAL_ARGUMENT_TOKENS,
    VISUAL_IMAGE_GUIDE_MODEL,
    VISUAL_IMAGE_GUIDE_QUALITY,
    VISUAL_IMAGE_GUIDE_SIZE,
    VISUAL_PIPELINE_VERSION,
    VISUAL_RENDER_DPI,
    VOICE_TUTOR_CONTEXT_CHARS,
    VOICE_TUTOR_HISTORY_LIMIT,
    VOICE_TUTOR_REALTIME_CONTEXT_CHARS,
    VOICE_TUTOR_TOKENS,
    client,
    deepseek_client,
    deepseek_request_is_configured,
    env_int,
    gemini_adc_client,
    gemini_client,
    gemini_vertex_openai_base_url,
    has_openai,
    has_text_ai,
    analysis_model_for_active_provider,
    mindmap_model_for_active_provider,
    model_for_depth,
    active_text_provider,
    chat_model_for_active_provider,
    fallback_model_for_active_provider,
    gemini_request_is_configured,
    normalise_text_provider,
    require_openai,
    require_openai_api,
    require_text_ai,
    reset_request_text_provider,
    select_request_text_provider,
    set_request_text_provider,
    text_generation_client,
    title_model_for_active_provider,
)
from core.database import synapse_database
from core.request_limits import read_upload_bytes
from core.section_loader import AppSectionLoader
from core.visual_assets import (
    fetch_visual_asset_from_durable_storage,
    runtime_asset_path_for_relative_path,
)
from core.note_prompt_modes import (
    DEFAULT_NOTE_LENGTH_MODE,
    DEFAULT_NOTE_PROMPT_MODE,
    build_note_prompt,
    load_note_prompt_mode_text,
    normalise_note_length_mode,
    normalise_note_prompt_mode,
    note_length_mode_allows_expansion,
    note_length_mode_label,
    note_length_mode_options,
    note_length_mode_target_words,
    note_length_mode_unit_target,
    note_length_mode_word_bounds,
    note_prompt_mode_allows_expansion,
    note_prompt_mode_label,
    note_prompt_mode_min_units,
    note_prompt_mode_options,
    prompt_mode_prompt_hash,
    validate_note_output,
)
from core.source_extractors import (
    extract_docx,
    extract_pdf,
    extract_text_file,
    source_unit_visual_parts,
)
from core.url_security import normalize_public_http_url
from core.text_utils import (
    canonicalize_youtube_watch_url,
    clean_detected_url,
    clean_html,
    extract_urls_from_text,
    extract_youtube_urls_from_text,
    get_youtube_video_id,
    normalise_space,
    normalise_youtube_video_id,
    remove_urls_from_text,
    sha256_bytes,
    sha256_text,
    truncate_text,
)


try:
    import certifi
except Exception:
    certifi = None

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

try:
    from docx import Document
except Exception:
    Document = None

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except Exception:
    YouTubeTranscriptApi = None

try:
    import yt_dlp
except Exception:
    yt_dlp = None

try:
    import cv2
except Exception:
    cv2 = None

try:
    import fitz  # PyMuPDF: used to render PDF pages as visual evidence
    try:
        # Keep recoverable MuPDF structure-tree warnings from flooding dev logs.
        # Python exceptions are still raised and handled by the PDF pipeline.
        fitz.TOOLS.mupdf_display_warnings(False)
        fitz.TOOLS.mupdf_display_errors(False)
    except Exception:
        pass
except Exception:
    fitz = None

try:
    from pptx import Presentation
except Exception:
    Presentation = None

try:
    import stripe
except Exception:
    stripe = None

import logging
logging.getLogger("pypdf").setLevel(logging.ERROR)
logger = logging.getLogger(__name__)


def utc_timestamp(timespec: str = "seconds") -> str:
    return datetime.now(timezone.utc).isoformat(timespec=timespec).replace("+00:00", "Z")


# Defensive literals for LaTeX environments inside f-string prompts. If a
# prompt accidentally contains "\begin{bmatrix}" instead of escaped braces,
# Python would otherwise try to interpolate a variable named bmatrix.
for _latex_env_name in (
    "bmatrix", "pmatrix", "matrix", "vmatrix", "Vmatrix", "Bmatrix",
    "smallmatrix", "array", "cases", "aligned", "align", "gathered",
    "gather", "split", "equation",
):
    globals()[_latex_env_name] = "{" + _latex_env_name + "}"
del _latex_env_name

app = FastAPI(title="Synapse Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)
RUNTIME_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Per-client rate limiting for expensive AI-generation endpoints.
# These routes have no auth requirement (anonymous study is supported), so an
# unmetered caller could otherwise drive unbounded OpenAI/Gemini spend. This is
# a lightweight in-memory fixed-window limiter; it is per-process, which is
# sufficient for the single-worker MVP deployment. Set the limit to 0 to
# disable. Loopback/test clients are exempt so local tooling and the test suite
# are unaffected.
# ---------------------------------------------------------------------------
import threading as _threading

GENERATION_RATE_LIMIT = env_int("SYNAPSE_GENERATION_RATE_LIMIT", 30)
GENERATION_RATE_WINDOW_SECONDS = max(1, env_int("SYNAPSE_GENERATION_RATE_WINDOW_SECONDS", 60))
RATE_LIMITED_PATHS = frozenset({
    "/analyze",
    "/upload-pdf",
    "/ask",
    "/source-preview",
    "/voice-tutor/respond",
    "/voice-tutor/realtime-call",
    "/learning-companion/respond",
    "/quiz/generate",
    "/flashcards/generate",
    "/timeline/generate",
    "/timeline/check-answer",
    "/translate-notes",
    "/visual-image-guide/generate",
    "/visual-guide/generate",
    "/broadcast/generate",
    "/broadcast/tts",
    "/broadcast/realtime-call",
})
_RATE_EXEMPT_HOSTS = {"127.0.0.1", "::1", "localhost", "testclient", "testserver"}
_rate_limit_lock = _threading.Lock()
_rate_limit_hits: Dict[str, List[float]] = {}


def _rate_limit_client_key(request: Request) -> Tuple[str, str]:
    host = (request.client.host if request.client else "") or ""
    forwarded = request.headers.get("x-forwarded-for", "")
    key = forwarded.split(",")[0].strip() if forwarded else host
    return key or "unknown", host


@app.middleware("http")
async def generation_rate_limit_middleware(request: Request, call_next):
    if (
        GENERATION_RATE_LIMIT > 0
        and request.method == "POST"
        and request.url.path in RATE_LIMITED_PATHS
    ):
        key, host = _rate_limit_client_key(request)
        if key not in _RATE_EXEMPT_HOSTS and host not in _RATE_EXEMPT_HOSTS:
            now = time.monotonic()
            window_start = now - GENERATION_RATE_WINDOW_SECONDS
            with _rate_limit_lock:
                if len(_rate_limit_hits) > 10000:
                    for stale_key in [k for k, v in _rate_limit_hits.items() if not v or v[-1] < window_start]:
                        _rate_limit_hits.pop(stale_key, None)
                hits = [hit for hit in _rate_limit_hits.get(key, []) if hit >= window_start]
                if len(hits) >= GENERATION_RATE_LIMIT:
                    retry_after = max(1, int(GENERATION_RATE_WINDOW_SECONDS - (now - hits[0])))
                    _rate_limit_hits[key] = hits
                    return Response(
                        json.dumps({"error": "Too many requests. Please wait a moment and try again."}),
                        status_code=429,
                        media_type="application/json",
                        headers={"Retry-After": str(retry_after)},
                    )
                hits.append(now)
                _rate_limit_hits[key] = hits
    return await call_next(request)


async def run_blocking(func, *args, **kwargs):
    """Run synchronous parsing/model/persistence work without blocking Uvicorn."""
    return await asyncio.to_thread(partial(func, *args, **kwargs))

APP_SECTION_FILES = (
    "01_health.py",
    "02_build_refusal_repair_messages.py",
    "03_download_youtube_media.py",
    "04_file_to_source_unit.py",
    "05_analyze.py",
    "06_source_preview.py",
    "07_v22_visual_rank_keywords.py",
    "08_convert_pptx_to_pdf_with_powerpoint.py",
    "09_v23_meaningful_card_text.py",
    "10_parse_quiz_type_plan.py",
    "11_timeline_generate.py",
    "12_flashcards_generate.py",
    "13_broadcast_mode.py",
    "14_learning_companion.py",
)

AppSectionLoader(BACKEND_PACKAGE_DIR, APP_SECTION_FILES).load(globals())


@app.get("/assets/visuals/{asset_name}")
def serve_visual_asset(asset_name: str):
    """Serve a local visual or restore it from private durable storage."""
    asset_path = runtime_asset_path_for_relative_path(f"visuals/{asset_name}")
    if asset_path and asset_path.is_file():
        return FileResponse(asset_path)

    restored = fetch_visual_asset_from_durable_storage(asset_name)
    if not restored:
        return Response(status_code=404)

    content, content_type = restored
    if asset_path:
        try:
            asset_path.parent.mkdir(parents=True, exist_ok=True)
            asset_path.write_bytes(content)
        except OSError:
            pass
    return Response(content=content, media_type=content_type)


@app.get("/assets/{asset_path:path}")
def serve_runtime_asset(asset_path: str):
    """Keep existing runtime audio and preview URLs working without static mounts."""
    path = runtime_asset_path_for_relative_path(asset_path)
    if not path or not path.is_file():
        return Response(status_code=404)
    return FileResponse(path)

SERVER_ENV_VALUES = dotenv_values(BACKEND_PACKAGE_DIR.parent / "server" / ".env")


def auth_env_value(*names: str) -> str:
    for name in names:
        value = (os.getenv(name) or SERVER_ENV_VALUES.get(name) or "").strip()
        if value:
            return value
    return ""


SUPABASE_URL = auth_env_value("SUPABASE_URL", "SYNAPSE_SUPABASE_URL").rstrip("/")
SUPABASE_ANON_KEY = auth_env_value("SUPABASE_ANON_KEY", "SYNAPSE_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = (
    auth_env_value("SUPABASE_SERVICE_ROLE_KEY", "SYNAPSE_SUPABASE_SERVICE_ROLE_KEY")
)
STRIPE_SECRET_KEY = (os.getenv("STRIPE_SECRET_KEY") or "").strip()
STRIPE_WEBHOOK_SECRET = (os.getenv("STRIPE_WEBHOOK_SECRET") or "").strip()
SYNAPSE_ALLOW_UNSIGNED_STRIPE_WEBHOOK = (
    os.getenv("SYNAPSE_ALLOW_UNSIGNED_STRIPE_WEBHOOK", "false").lower() not in {"0", "false", "no"}
)
# Development-only. When true, the backend trusts an "X-Synapse-User-Id" header
# as an account identity. This lets any caller impersonate any demo account, so
# it must stay false in production. Verified Supabase bearer tokens are never
# gated by this flag.
SYNAPSE_ALLOW_LOCAL_DEMO_AUTH = (
    os.getenv("SYNAPSE_ALLOW_LOCAL_DEMO_AUTH", "false").lower() in {"1", "true", "yes", "on"}
)
SYNAPSE_FRONTEND_BASE_URL = (
    os.getenv("SYNAPSE_FRONTEND_BASE_URL")
    or os.getenv("SYNAPSE_PUBLIC_FRONTEND_URL")
    or "http://127.0.0.1:5175/frontend"
).rstrip("/")
SYNAPSE_CANONICAL_FRONTEND_BASE_URL = (
    os.getenv("SYNAPSE_CANONICAL_FRONTEND_BASE_URL")
    or "https://synapse-ai-study-assistant-tutor.vercel.app/frontend"
).rstrip("/")
SYNAPSE_PUBLIC_BACKEND_URL = (
    os.getenv("SYNAPSE_PUBLIC_BACKEND_URL")
    or os.getenv("SYNAPSE_PUBLIC_API_BASE")
    or ""
).rstrip("/")
SYNAPSE_SMTP_HOST = auth_env_value("SYNAPSE_SMTP_HOST")
try:
    SYNAPSE_SMTP_PORT = int(auth_env_value("SYNAPSE_SMTP_PORT") or "587")
except ValueError:
    SYNAPSE_SMTP_PORT = 587
SYNAPSE_SMTP_USERNAME = auth_env_value("SYNAPSE_SMTP_USERNAME")
SYNAPSE_SMTP_PASSWORD = auth_env_value("SYNAPSE_SMTP_PASSWORD")
SYNAPSE_SMTP_FROM_EMAIL = auth_env_value("SYNAPSE_SMTP_FROM_EMAIL") or SYNAPSE_SMTP_USERNAME
SYNAPSE_SMTP_FROM_NAME = auth_env_value("SYNAPSE_SMTP_FROM_NAME") or "Synapse"
SYNAPSE_SMTP_SECURITY = (auth_env_value("SYNAPSE_SMTP_SECURITY") or "starttls").lower()
STRIPE_PRICE_IDS = {
    "starter": (os.getenv("STRIPE_PRICE_STARTER") or os.getenv("SYNAPSE_STRIPE_PRICE_STARTER") or "").strip(),
    "student": (os.getenv("STRIPE_PRICE_STUDENT") or os.getenv("SYNAPSE_STRIPE_PRICE_STUDENT") or "").strip(),
    "pro": (os.getenv("STRIPE_PRICE_PRO") or os.getenv("SYNAPSE_STRIPE_PRICE_PRO") or "").strip(),
}

if stripe and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


def json_error(message: str, status_code: int = 400) -> Response:
    return Response(
        json.dumps({"error": message}),
        status_code=status_code,
        media_type="application/json",
    )


def json_payload(payload: Dict[str, Any], status_code: int = 200) -> Response:
    return Response(
        json.dumps(payload),
        status_code=status_code,
        media_type="application/json",
    )


def runtime_path(name: str) -> Path:
    root = RUNTIME_ASSETS_DIR.parent
    root.mkdir(parents=True, exist_ok=True)
    return root / name


def read_runtime_json(name: str, fallback: Any) -> Any:
    path = runtime_path(name)
    try:
        if not path.exists():
            return fallback
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def write_runtime_json(name: str, value: Any) -> None:
    path = runtime_path(name)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def append_runtime_jsonl(name: str, value: Dict[str, Any]) -> None:
    path = runtime_path(name)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(value, ensure_ascii=False) + "\n")


def read_runtime_jsonl(name: str) -> List[Dict[str, Any]]:
    path = runtime_path(name)
    if not path.exists():
        return []
    items = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            parsed = json.loads(line)
            if isinstance(parsed, dict):
                items.append(parsed)
        except Exception:
            continue
    return items


def bearer_token_from_request(request: Request) -> str:
    header = request.headers.get("authorization", "")
    match = re.match(r"^Bearer\s+(.+)$", header.strip(), re.I)
    return match.group(1).strip() if match else ""


def verified_supabase_user(request: Request) -> Optional[Dict[str, Any]]:
    token = bearer_token_from_request(request)
    if not token:
        return None
    if not SUPABASE_URL or not (SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY):
        return None
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY,
    }
    try:
        response = requests.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers, timeout=12)
    except Exception:
        return None
    if response.status_code >= 400:
        return None
    user = response.json()
    if not user.get("id"):
        return None
    return user


def require_verified_user(request: Request) -> Any:
    user = verified_supabase_user(request)
    if not user:
        return json_error("Authentication is required. Configure Supabase and sign in again.", 401)
    return user


def public_user_payload(user: Dict[str, Any]) -> Dict[str, Any]:
    metadata = user.get("user_metadata") or {}
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "created_at": user.get("created_at"),
        "role": metadata.get("role") or "student",
        "display_name": (
            metadata.get("full_name")
            or metadata.get("name")
            or " ".join(
                item for item in [
                    metadata.get("first_name") or metadata.get("firstName"),
                    metadata.get("last_name") or metadata.get("lastName"),
                ]
                if item
            ).strip()
            or user.get("email")
        ),
    }


def _clean_identity_header(value: Any, limit: int = 180) -> str:
    return re.sub(r"[\r\n]+", " ", str(value or "").strip())[:limit]


def database_identity_from_verified_user(user: Dict[str, Any]) -> Dict[str, Any]:
    public = public_user_payload(user)
    return {
        "auth_provider": "supabase",
        "auth_subject": public.get("id") or public.get("email") or "unknown",
        "email": public.get("email") or "",
        "display_name": public.get("display_name") or "",
        "auth_mode": "supabase",
        "role": public.get("role") or "student",
        "metadata": {"supabase_user_id": public.get("id")},
    }


def database_identity_from_request(request: Optional[Request], client_fingerprint: str = "") -> Dict[str, Any]:
    if request is not None:
        supabase_user = verified_supabase_user(request)
        if supabase_user:
            return database_identity_from_verified_user(supabase_user)

        client_id = _clean_identity_header(request.headers.get("x-synapse-client-id"), 160)
        local_user_id = _clean_identity_header(request.headers.get("x-synapse-user-id"), 160)
        auth_mode = _clean_identity_header(request.headers.get("x-synapse-auth-mode"), 60) or "anonymous"
        # The user-id header asserts an arbitrary account identity, so it is only
        # honoured when local demo auth is explicitly enabled (development). In
        # production this branch is skipped and the request falls back to an
        # anonymous, self-scoped client bucket, which prevents cross-user access.
        if local_user_id and SYNAPSE_ALLOW_LOCAL_DEMO_AUTH:
            return {
                "auth_provider": "local_demo",
                "auth_subject": local_user_id,
                "email": _clean_identity_header(request.headers.get("x-synapse-user-email"), 220).lower(),
                "display_name": _clean_identity_header(request.headers.get("x-synapse-user-name"), 180),
                "auth_mode": auth_mode or "local_demo",
                "role": _clean_identity_header(request.headers.get("x-synapse-user-role"), 80) or "student",
                "metadata": {"client_id": client_id},
            }
        if client_id:
            return {
                "auth_provider": "anonymous",
                "auth_subject": client_id,
                "email": "",
                "display_name": "Anonymous Synapse user",
                "auth_mode": "anonymous",
                "role": "student",
                "metadata": {"client_id": client_id},
            }

        user_agent = _clean_identity_header(request.headers.get("user-agent"), 260)
        fallback_subject = sha256_text(f"{client_fingerprint}|{user_agent}")[:32] if (client_fingerprint or user_agent) else "anonymous"
        return {
            "auth_provider": "anonymous",
            "auth_subject": fallback_subject,
            "email": "",
            "display_name": "Anonymous Synapse user",
            "auth_mode": "anonymous",
            "role": "student",
            "metadata": {},
        }

    fallback_subject = sha256_text(client_fingerprint or "direct-call")[:32]
    return {
        "auth_provider": "direct",
        "auth_subject": fallback_subject,
        "email": "",
        "display_name": "Direct backend call",
        "auth_mode": "direct",
        "role": "student",
        "metadata": {},
    }


AUTH_SIGNUP_ROLES = {"student", "teacher", "professional", "other"}
AUTH_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
AUTH_COMMON_WEAK_PASSWORDS = {
    "password",
    "password1",
    "password12",
    "password123",
    "12345678",
    "123456789",
    "qwerty123",
    "synapse123",
}


def auth_api_response(
    ok: bool,
    state: str,
    message: str,
    status_code: int = 200,
    **extra: Any,
) -> Response:
    payload = {"ok": ok, "state": state, "message": message}
    payload.update(extra)
    return json_payload(payload, status_code)


def normalize_auth_email(value: Any) -> str:
    return str(value or "").strip().lower()


def clean_signup_text(value: Any, limit: int = 80) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())[:limit]


def auth_private_ipv4_host(hostname: str) -> bool:
    parts = str(hostname or "").split(".")
    if len(parts) != 4 or any(not part.isdigit() for part in parts):
        return False
    nums = [int(part) for part in parts]
    if any(num < 0 or num > 255 for num in nums):
        return False
    return nums[0] == 10 or (nums[0] == 172 and 16 <= nums[1] <= 31) or (nums[0] == 192 and nums[1] == 168)


def auth_local_dev_host(hostname: str) -> bool:
    value = str(hostname or "").lower()
    return value in {"localhost", "127.0.0.1", "::1"} or auth_private_ipv4_host(value)


def auth_public_backend_is_production() -> bool:
    host = urlparse(SYNAPSE_PUBLIC_BACKEND_URL).hostname or ""
    return bool(host) and not auth_local_dev_host(host)


def auth_email_frontend_base_url() -> str:
    """
    Frontend origin embedded in confirmation / reset emails.
    Never emit localhost links from a hosted production backend.
    """
    configured = (SYNAPSE_FRONTEND_BASE_URL or "").rstrip("/")
    parsed = urlparse(configured)
    host = parsed.hostname or ""
    if configured and not auth_local_dev_host(host):
        return configured
    if auth_public_backend_is_production():
        return SYNAPSE_CANONICAL_FRONTEND_BASE_URL
    return configured or SYNAPSE_CANONICAL_FRONTEND_BASE_URL


def auth_redirect_allowed_hosts() -> set[str]:
    hosts = set()
    for candidate in (
        SYNAPSE_FRONTEND_BASE_URL,
        SYNAPSE_CANONICAL_FRONTEND_BASE_URL,
        auth_email_frontend_base_url(),
    ):
        host = (urlparse(candidate).hostname or "").lower()
        if host:
            hosts.add(host)
    return hosts


def is_allowed_auth_redirect(url: str, *, kind: str) -> bool:
    parsed = urlparse(str(url or "").strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False
    suffix = "/verify.html" if kind == "verify" else "/reset-password.html"
    if not parsed.path.endswith(suffix):
        return False
    host = (parsed.hostname or "").lower()
    if host in auth_redirect_allowed_hosts():
        return True
    configured_is_local = auth_local_dev_host(urlparse(SYNAPSE_FRONTEND_BASE_URL).hostname or "")
    return configured_is_local and not auth_public_backend_is_production() and auth_local_dev_host(host)


def masked_auth_email(email: str) -> str:
    normalized = normalize_auth_email(email)
    if not normalized:
        return "<missing>"
    return f"email_hash:{sha256_text(normalized)[:12]}"


def signup_redirect_to(request: Request, payload: Dict[str, Any]) -> str:
    raw = str(payload.get("redirectTo") or payload.get("redirect_to") or "").strip()
    email_base = auth_email_frontend_base_url()
    if is_allowed_auth_redirect(raw, kind="verify"):
        raw_host = urlparse(raw).hostname or ""
        # Hosted backends must never email localhost confirmation links.
        if auth_local_dev_host(raw_host) and auth_public_backend_is_production():
            return f"{email_base}/verify.html"
        return raw
    return f"{email_base}/verify.html"


async def request_json_payload(request: Request) -> Dict[str, Any]:
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    return payload if isinstance(payload, dict) else {}


def validate_signup_payload(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, str]]:
    first_name = clean_signup_text(payload.get("firstName") or payload.get("first_name"))
    last_name = clean_signup_text(payload.get("lastName") or payload.get("last_name"))
    role = clean_signup_text(payload.get("role") or "student", 40).lower()
    email = normalize_auth_email(payload.get("email"))
    password = str(payload.get("password") or "")
    confirm_password = str(payload.get("confirmPassword") or payload.get("confirm_password") or "")
    terms_accepted = payload.get("termsAccepted")
    if terms_accepted is None:
        terms_accepted = payload.get("terms_accepted")

    errors: Dict[str, str] = {}
    if not first_name:
        errors["firstName"] = "First name is required."
    if not last_name:
        errors["lastName"] = "Last name is required."
    if role not in AUTH_SIGNUP_ROLES:
        errors["role"] = "Choose a valid account type."
    if not email:
        errors["email"] = "Email is required."
    elif not AUTH_EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."
    if not password:
        errors["password"] = "Password is required."
    elif len(password) < 8:
        errors["password"] = "Password must be at least 8 characters."
    elif not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        errors["password"] = "Password must include at least one letter and one number."
    elif password.lower() in AUTH_COMMON_WEAK_PASSWORDS:
        errors["password"] = "Choose a stronger password."
    else:
        email_name = email.split("@", 1)[0].lower() if email else ""
        if len(email_name) >= 4 and email_name in password.lower():
            errors["password"] = "Password cannot contain your email name."
    if not confirm_password:
        errors["confirmPassword"] = "Please confirm your password."
    elif password and password != confirm_password:
        errors["confirmPassword"] = "Passwords do not match."
    if terms_accepted is not True:
        errors["terms"] = "You must agree to the Terms of Service and Privacy Policy."

    clean_payload = {
        "first_name": first_name,
        "last_name": last_name,
        "role": role,
        "email": email,
        "password": password,
    }
    return clean_payload, errors


def validate_resend_payload(payload: Dict[str, Any]) -> Tuple[str, Dict[str, str]]:
    email = normalize_auth_email(payload.get("email"))
    errors: Dict[str, str] = {}
    if not email:
        errors["email"] = "Email is required."
    elif not AUTH_EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."
    return email, errors


def supabase_admin_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
    }


def supabase_public_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }


def supabase_auth_config_error(require_service_role: bool = False) -> Optional[str]:
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_ANON_KEY:
        missing.append("SUPABASE_ANON_KEY")
    if require_service_role and not SUPABASE_SERVICE_ROLE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if missing:
        return f"Supabase Auth is not configured on the backend. Missing: {', '.join(missing)}."
    return None


def synapse_email_config_error() -> Optional[str]:
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_ROLE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if not SYNAPSE_SMTP_HOST:
        missing.append("SYNAPSE_SMTP_HOST")
    if not SYNAPSE_SMTP_FROM_EMAIL:
        missing.append("SYNAPSE_SMTP_FROM_EMAIL")
    if SYNAPSE_SMTP_SECURITY not in {"starttls", "ssl", "none"}:
        missing.append("SYNAPSE_SMTP_SECURITY (starttls, ssl, or none)")
    if missing:
        return f"Synapse email delivery is not configured. Missing: {', '.join(missing)}."
    return None


def supabase_user_confirmed(user: Dict[str, Any]) -> bool:
    return bool(
        user.get("email_confirmed_at")
        or user.get("confirmed_at")
        or (user.get("confirmation_sent_at") and user.get("last_sign_in_at"))
    )


def supabase_auth_error_message(error_text: str) -> str:
    lowered = error_text.lower()
    if "rate" in lowered or "too many" in lowered:
        return "Supabase is rate-limiting confirmation emails. Please wait a moment and try again."
    if "smtp" in lowered or "email" in lowered or "mail" in lowered:
        return "Supabase could not send the confirmation email. Check Auth email/SMTP settings."
    if "redirect" in lowered:
        return "Supabase rejected the confirmation redirect URL. Check the Site URL and redirect allow list."
    return "Supabase could not complete the auth request. Please try again."


def find_supabase_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    target = normalize_auth_email(email)

    def match_users(users: Any) -> Optional[Dict[str, Any]]:
        if not isinstance(users, list):
            return None
        for user in users:
            if normalize_auth_email(user.get("email")) == target:
                return user
        return None

    # Prefer a filtered lookup so signup does not wait on a full user scan.
    filtered = requests.get(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=supabase_admin_headers(),
        params={"page": 1, "per_page": 200, "filter": target},
        timeout=8,
    )
    if filtered.status_code < 400:
        payload = filtered.json()
        users = payload.get("users") if isinstance(payload, dict) else payload
        matched = match_users(users)
        if matched:
            return matched
        # Some GoTrue builds honor filter as an exact/prefix search. If the page
        # is empty, the email is not present and we can skip the full scan.
        if isinstance(users, list) and not users:
            return None

    per_page = 200
    max_pages = 5
    for page in range(1, max_pages + 1):
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=supabase_admin_headers(),
            params={"page": page, "per_page": per_page},
            timeout=8,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"admin list users failed: {response.status_code} {response.text[:240]}")
        payload = response.json()
        users = payload.get("users") if isinstance(payload, dict) else payload
        matched = match_users(users)
        if matched:
            return matched
        if not isinstance(users, list) or len(users) < per_page:
            return None
    return None


def synapse_link_from_generate_payload(payload: Dict[str, Any], redirect_to: str, fallback_type: str) -> Optional[str]:
    if not isinstance(payload, dict):
        return None
    token_hash = payload.get("hashed_token")
    verification_type = str(payload.get("verification_type") or fallback_type or "").strip() or fallback_type
    if token_hash:
        return build_synapse_auth_link(redirect_to, str(token_hash), verification_type)
    action_link = payload.get("action_link")
    return str(action_link) if action_link else None


def call_supabase_generate_signup_link(
    clean_payload: Dict[str, Any],
    redirect_to: str,
) -> Tuple[Optional[str], Optional[Dict[str, Any]], Optional[str], int]:
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/generate_link",
        headers=supabase_admin_headers(),
        json={
            "type": "signup",
            "email": clean_payload["email"],
            "password": clean_payload["password"],
            "data": {
                "first_name": clean_payload["first_name"],
                "last_name": clean_payload["last_name"],
                "role": clean_payload["role"],
                "plan": "free",
                "credits": 500,
            },
            "redirect_to": redirect_to,
        },
        timeout=12,
    )
    if response.status_code >= 400:
        return None, None, response.text[:500], response.status_code
    payload = response.json()
    action_link = synapse_link_from_generate_payload(payload if isinstance(payload, dict) else {}, redirect_to, "signup")
    if not action_link:
        return None, None, "Supabase did not return a signup action link.", 502
    user = payload.get("user") if isinstance(payload, dict) else None
    return str(action_link), user if isinstance(user, dict) else None, None, response.status_code


def call_supabase_resend(email: str, redirect_to: str) -> Tuple[bool, Optional[str], int]:
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/resend",
        headers=supabase_public_headers(),
        params={"redirect_to": redirect_to},
        json={"type": "signup", "email": email},
        timeout=18,
    )
    if response.status_code >= 400:
        return False, response.text[:500], response.status_code
    return True, None, response.status_code


def password_reset_redirect_to(request: Request, payload: Dict[str, Any]) -> str:
    raw = str(payload.get("redirectTo") or payload.get("redirect_to") or "").strip()
    email_base = auth_email_frontend_base_url()
    if is_allowed_auth_redirect(raw, kind="reset"):
        raw_host = urlparse(raw).hostname or ""
        if auth_local_dev_host(raw_host) and auth_public_backend_is_production():
            return f"{email_base}/reset-password.html"
        return raw
    return f"{email_base}/reset-password.html"


def build_synapse_auth_link(redirect_to: str, token_hash: str, verification_type: str) -> str:
    parsed = urlparse(redirect_to)
    fragment = urlencode({"token_hash": token_hash, "type": verification_type})
    return urlunparse(parsed._replace(fragment=fragment))


def call_supabase_generate_recovery_link(email: str, redirect_to: str) -> Tuple[Optional[str], Optional[str], int]:
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/generate_link",
        headers=supabase_admin_headers(),
        json={
            "type": "recovery",
            "email": email,
            "redirect_to": redirect_to,
        },
        timeout=18,
    )
    if response.status_code >= 400:
        return None, response.text[:500], response.status_code
    payload = response.json()
    token_hash = payload.get("hashed_token") if isinstance(payload, dict) else None
    verification_type = payload.get("verification_type") if isinstance(payload, dict) else None
    if not token_hash or verification_type != "recovery":
        return None, "Supabase did not return a valid recovery token.", 502
    return build_synapse_auth_link(redirect_to, str(token_hash), "recovery"), None, response.status_code


def call_supabase_generate_invite_link(email: str, redirect_to: str) -> Tuple[Optional[str], Optional[str], int]:
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/generate_link",
        headers=supabase_admin_headers(),
        json={
            "type": "invite",
            "email": email,
            "redirect_to": redirect_to,
        },
        timeout=12,
    )
    if response.status_code >= 400:
        return None, response.text[:500], response.status_code
    payload = response.json()
    action_link = synapse_link_from_generate_payload(payload if isinstance(payload, dict) else {}, redirect_to, "invite")
    if not action_link:
        return None, "Supabase did not return a confirmation action link.", 502
    return str(action_link), None, response.status_code


def queue_synapse_auth_email(background_tasks: Optional[BackgroundTasks], sender, *args) -> None:
    """Send auth mail immediately in-process, or queue it so the API can return fast."""
    if background_tasks is not None:
        background_tasks.add_task(sender, *args)
        return
    sender(*args)


def send_synapse_auth_email(
    email: str,
    *,
    subject: str,
    heading: str,
    intro: str,
    action_label: str,
    action_link: str,
    safety_note: str,
) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((SYNAPSE_SMTP_FROM_NAME, SYNAPSE_SMTP_FROM_EMAIL))
    message["To"] = email
    message.set_content(
        f"{intro}\n\n"
        f"{action_label}:\n{action_link}\n\n"
        f"{safety_note}\n\n"
        "Synapse\n"
    )
    escaped_link = html.escape(action_link, quote=True)
    message.add_alternative(
        "<!doctype html><html><body style=\"font-family:Arial,sans-serif;color:#17233c;line-height:1.6\">"
        f"<h2>{html.escape(heading)}</h2>"
        f"<p>{html.escape(intro)}</p>"
        f"<p><a href=\"{escaped_link}\" style=\"display:inline-block;padding:12px 18px;background:#4a7cff;color:#fff;text-decoration:none;border-radius:8px\">{html.escape(action_label)}</a></p>"
        f"<p>{html.escape(safety_note)}</p>"
        "<p>Synapse</p></body></html>",
        subtype="html",
    )

    smtp_class = smtplib.SMTP_SSL if SYNAPSE_SMTP_SECURITY == "ssl" else smtplib.SMTP
    with smtp_class(SYNAPSE_SMTP_HOST, SYNAPSE_SMTP_PORT, timeout=20) as server:
        if SYNAPSE_SMTP_SECURITY == "starttls":
            server.starttls(context=ssl.create_default_context())
        if SYNAPSE_SMTP_USERNAME:
            server.login(SYNAPSE_SMTP_USERNAME, SYNAPSE_SMTP_PASSWORD)
        server.send_message(message)


def send_synapse_password_reset_email(email: str, action_link: str) -> None:
    send_synapse_auth_email(
        email,
        subject="Reset your Synapse password",
        heading="Reset your Synapse password",
        intro="We received a request to reset your Synapse password.",
        action_label="Choose a new password",
        action_link=action_link,
        safety_note="This link is single-use. If you did not request this, you can safely ignore this email.",
    )


def send_synapse_signup_confirmation_email(email: str, action_link: str) -> None:
    send_synapse_auth_email(
        email,
        subject="Confirm your Synapse account",
        heading="Confirm your Synapse account",
        intro="Your Synapse account is almost ready. Confirm your email address to start studying.",
        action_label="Confirm email address",
        action_link=action_link,
        safety_note="This link is single-use. If you did not create a Synapse account, you can safely ignore this email.",
    )


def existing_account_response(email: str, user: Dict[str, Any]) -> Response:
    account_ref = user.get("id") or masked_auth_email(email)
    if supabase_user_confirmed(user):
        logger.info("Duplicate confirmed Supabase account detected for %s", account_ref)
        return auth_api_response(
            False,
            "existing_confirmed",
            "An account already exists for this email. Please log in instead.",
            email=email,
            actions=["login", "forgot_password"],
        )
    logger.info("Unconfirmed Supabase account detected for %s", account_ref)
    return auth_api_response(
        False,
        "existing_unconfirmed",
        "This email already has a pending account. Please check your inbox or resend the confirmation email.",
        email=email,
        actions=["resend_confirmation", "change_email"],
    )


def persist_generated_analysis_result(
    request: Optional[Request],
    result: Dict[str, Any],
    client_fingerprint: str = "",
) -> Dict[str, Any]:
    if not isinstance(result, dict) or result.get("error"):
        return {}
    try:
        identity = database_identity_from_request(request, client_fingerprint)
        return synapse_database.upsert_generated_content(identity, result, client_fingerprint)
    except Exception as error:
        logger.warning("Generated content persistence skipped: %s", error)
        return {}


def price_id_for_plan(plan_id: str, explicit_price_id: str = "") -> str:
    clean_plan = re.sub(r"[^a-z0-9_-]", "", str(plan_id or "").lower())
    clean_explicit = str(explicit_price_id or "").strip()
    configured_values = {value for value in STRIPE_PRICE_IDS.values() if value}
    if clean_explicit and clean_explicit in configured_values:
        return clean_explicit
    return STRIPE_PRICE_IDS.get(clean_plan, "")


def require_stripe_ready() -> Optional[Response]:
    if not stripe or not STRIPE_SECRET_KEY:
        return json_error("Stripe billing is not configured. Set STRIPE_SECRET_KEY and Stripe price IDs.", 503)
    return None


def billing_store() -> Dict[str, Any]:
    store = read_runtime_json("billing_customers.json", {})
    return store if isinstance(store, dict) else {}


def save_billing_store(store: Dict[str, Any]) -> None:
    write_runtime_json("billing_customers.json", store)


def get_billing_profile(user: Dict[str, Any]) -> Dict[str, Any]:
    store = billing_store()
    profile = store.get(user["id"])
    if isinstance(profile, dict):
        return profile
    profile = {
        "user_id": user["id"],
        "email": user.get("email"),
        "stripe_customer_id": "",
        "created_at": utc_timestamp(),
        "updated_at": utc_timestamp(),
    }
    store[user["id"]] = profile
    save_billing_store(store)
    return profile


def save_billing_profile(user_id: str, profile: Dict[str, Any]) -> None:
    store = billing_store()
    profile["updated_at"] = utc_timestamp()
    store[user_id] = profile
    save_billing_store(store)


def get_or_create_stripe_customer(user: Dict[str, Any]) -> str:
    profile = get_billing_profile(user)
    if profile.get("stripe_customer_id"):
        return profile["stripe_customer_id"]
    customer = stripe.Customer.create(
        email=user.get("email"),
        metadata={
            "synapse_user_id": user["id"],
            "source": "synapse",
        },
    )
    profile["stripe_customer_id"] = customer.id
    save_billing_profile(user["id"], profile)
    return customer.id


def _clean_contact_text(value: Any, limit: int) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())[:limit]


def _valid_contact_email(value: str) -> bool:
    return bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", value or ""))


@app.post("/api/auth/signup")
async def signup_account(request: Request, background_tasks: BackgroundTasks) -> Response:
    logger.info("Signup attempt started")
    payload = await request_json_payload(request)
    clean_payload, errors = validate_signup_payload(payload)
    email = clean_payload["email"]
    email_ref = masked_auth_email(email)
    logger.info("Signup email normalized: %s", email_ref)
    if errors:
        return auth_api_response(
            False,
            "validation_error",
            "Please fix the highlighted fields.",
            422,
            errors=errors,
        )

    config_error = synapse_email_config_error()
    if config_error:
        logger.error("Signup blocked by auth email configuration: %s", config_error)
        return auth_api_response(False, "email_not_configured", config_error, 503)

    try:
        existing_user = await asyncio.to_thread(find_supabase_user_by_email, email)
    except Exception as error:
        logger.exception("Supabase admin account lookup failed for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "account_lookup_failed",
            "Could not verify this email with Supabase. Please try again.",
            502,
        )
    if existing_user:
        return existing_account_response(email, existing_user)

    redirect_to = signup_redirect_to(request, payload)
    try:
        action_link, user, signup_error, signup_status = await asyncio.to_thread(
            call_supabase_generate_signup_link,
            clean_payload,
            redirect_to,
        )
    except Exception as error:
        logger.exception("Supabase signup request failed for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "signup_request_failed",
            "Could not reach Supabase Auth. Please try again.",
            502,
        )

    if signup_error:
        logger.error("Supabase signup error for %s: %s", email_ref, signup_error)
        try:
            existing_user = await asyncio.to_thread(find_supabase_user_by_email, email)
        except Exception:
            existing_user = None
        if existing_user:
            return existing_account_response(email, existing_user)
        return auth_api_response(
            False,
            "signup_failed",
            supabase_auth_error_message(signup_error),
            502 if signup_status >= 500 else 400,
        )

    if not action_link:
        logger.error("Supabase signup for %s did not return a confirmation link", email_ref)
        return auth_api_response(
            False,
            "signup_failed",
            "Synapse could not prepare the confirmation email. Please try again.",
            502,
        )

    # Queue SMTP delivery so the signup API returns immediately instead of
    # blocking on provider latency (often the multi-minute wait users feel).
    queue_synapse_auth_email(background_tasks, send_synapse_signup_confirmation_email, email, action_link)
    logger.info(
        "Supabase signup accepted for %s; confirmation email queued to %s",
        email_ref,
        urlparse(redirect_to).netloc or redirect_to,
    )
    return auth_api_response(
        True,
        "created_confirmation_sent",
        "Account created. Check your email to confirm your Synapse account, then log in.",
        email=email,
        actions=["login", "resend_confirmation"],
    )


@app.post("/api/auth/resend-confirmation")
async def resend_signup_confirmation(request: Request, background_tasks: BackgroundTasks) -> Response:
    payload = await request_json_payload(request)
    email, errors = validate_resend_payload(payload)
    email_ref = masked_auth_email(email)
    logger.info("Confirmation resend requested for %s", email_ref)
    if errors:
        return auth_api_response(
            False,
            "validation_error",
            "Please enter a valid email address.",
            422,
            errors=errors,
        )

    config_error = synapse_email_config_error()
    if config_error:
        logger.error("Confirmation resend blocked by auth email configuration: %s", config_error)
        return auth_api_response(False, "email_not_configured", config_error, 503)

    try:
        existing_user = await asyncio.to_thread(find_supabase_user_by_email, email)
    except Exception as error:
        logger.exception("Supabase admin account lookup failed before resend for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "account_lookup_failed",
            "Could not verify this email with Supabase. Please try again.",
            502,
        )
    if not existing_user:
        logger.info("Confirmation resend skipped; no Supabase account for %s", email_ref)
        return auth_api_response(
            False,
            "account_not_found",
            "No pending Synapse account was found for this email. Create a new account instead.",
            404,
            email=email,
        )
    if supabase_user_confirmed(existing_user):
        return existing_account_response(email, existing_user)

    redirect_to = signup_redirect_to(request, payload)
    try:
        action_link, resend_error, resend_status = await asyncio.to_thread(
            call_supabase_generate_invite_link,
            email,
            redirect_to,
        )
    except Exception as error:
        logger.exception("Supabase confirmation resend request failed for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "resend_request_failed",
            "Could not reach Supabase Auth. Please try again.",
            502,
        )
    if resend_error or not action_link:
        logger.error("Supabase confirmation resend error for %s: %s", email_ref, resend_error)
        return auth_api_response(
            False,
            "resend_failed",
            supabase_auth_error_message(resend_error or ""),
            502 if resend_status >= 500 else 400,
            email=email,
        )

    queue_synapse_auth_email(background_tasks, send_synapse_signup_confirmation_email, email, action_link)
    logger.info("Supabase confirmation resend accepted for %s", email_ref)
    return auth_api_response(
        True,
        "confirmation_resent",
        "Confirmation email sent. Please check your inbox and spam folder.",
        email=email,
        actions=["login"],
    )


@app.post("/api/auth/request-password-reset")
async def request_password_reset(request: Request) -> Response:
    payload = await request_json_payload(request)
    email, errors = validate_resend_payload(payload)
    email_ref = masked_auth_email(email)
    if errors:
        return auth_api_response(
            False,
            "validation_error",
            "Please enter a valid email address.",
            422,
            errors=errors,
        )

    config_error = synapse_email_config_error()
    if config_error:
        logger.error("Password reset email blocked by configuration: %s", config_error)
        return auth_api_response(False, "email_not_configured", config_error, 503)

    redirect_to = password_reset_redirect_to(request, payload)
    try:
        action_link, link_error, link_status = await asyncio.to_thread(
            call_supabase_generate_recovery_link,
            email,
            redirect_to,
        )
    except Exception as error:
        logger.exception("Password reset link generation failed for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "password_reset_failed",
            "Synapse could not prepare the password reset email. Please try again.",
            502,
        )

    if link_error or not action_link:
        # Keep unknown-account responses indistinguishable from accepted requests.
        if link_status in {400, 404}:
            logger.info("Password reset requested for an unavailable account: %s", email_ref)
            return auth_api_response(
                True,
                "password_reset_requested",
                "If this email belongs to a Synapse account, a reset link will arrive shortly.",
            )
        logger.error("Password reset link generation failed for %s: %s", email_ref, link_error or "missing link")
        return auth_api_response(
            False,
            "password_reset_failed",
            "Synapse could not prepare the password reset email. Please try again.",
            502,
        )

    try:
        await asyncio.to_thread(send_synapse_password_reset_email, email, action_link)
    except Exception as error:
        logger.exception("Password reset email delivery failed for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "password_reset_delivery_failed",
            "Synapse could not send the password reset email. Please try again later.",
            502,
        )

    logger.info("Password reset email sent for %s", email_ref)
    return auth_api_response(
        True,
        "password_reset_requested",
        "If this email belongs to a Synapse account, a reset link will arrive shortly.",
    )


@app.post("/contact")
async def submit_contact(request: Request) -> Dict[str, Any]:
    try:
        payload = await request.json()
    except Exception:
        payload = dict(await request.form())

    if _clean_contact_text(payload.get("company"), 160):
        return {"ok": True, "message": "Thanks, your enquiry has been received."}

    name = _clean_contact_text(payload.get("name"), 120)
    email = _clean_contact_text(payload.get("email"), 180).lower()
    interest = _clean_contact_text(payload.get("interest"), 80) or "general"
    message = _clean_contact_text(payload.get("message"), 4000)

    if not name:
        return Response(
            json.dumps({"error": "Name is required."}),
            status_code=422,
            media_type="application/json",
        )
    if not _valid_contact_email(email):
        return Response(
            json.dumps({"error": "A valid email address is required."}),
            status_code=422,
            media_type="application/json",
        )
    if len(message) < 12:
        return Response(
            json.dumps({"error": "Message must be at least 12 characters."}),
            status_code=422,
            media_type="application/json",
        )

    record = {
        "received_at": utc_timestamp(),
        "name": name,
        "email": email,
        "interest": interest,
        "message": message,
        "source": _clean_contact_text(payload.get("source"), 80) or "website",
        "user_agent": request.headers.get("user-agent", "")[:300],
    }
    contact_path = RUNTIME_ASSETS_DIR.parent / "contact_inquiries.jsonl"
    contact_path.parent.mkdir(parents=True, exist_ok=True)
    with contact_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")

    webhook_url = (os.getenv("SYNAPSE_CONTACT_WEBHOOK_URL") or "").strip()
    if webhook_url:
        try:
            requests.post(webhook_url, json=record, timeout=8)
        except Exception:
            return {
                "ok": True,
                "message": "Thanks, your enquiry has been saved. Email delivery is configured but the webhook did not respond.",
            }

    return {
        "ok": True,
        "message": "Thanks, your enquiry has been received.",
    }


@app.get("/db/status")
def database_status() -> Dict[str, Any]:
    try:
        status = synapse_database.status()
        return {
            "ok": True,
            "database": "supabase-data-api",
            "data_api_reachable": bool(status.get("ok")),
            "data_api_status": status.get("status", "unknown"),
        }
    except Exception as error:
        return {
            "ok": False,
            "database": "supabase-data-api",
            "error": "Data API status check failed.",
        }


@app.get("/content/history")
async def list_generated_content_history(request: Request, limit: int = 50) -> Any:
    try:
        identity = database_identity_from_request(request)
        return {
            "ok": True,
            "items": synapse_database.list_generated_content(identity, limit),
        }
    except Exception as error:
        return json_error(f"Could not load generated content history: {error}", 500)


@app.get("/content/{content_id}")
async def get_generated_content_record(content_id: str, request: Request) -> Any:
    try:
        identity = database_identity_from_request(request)
        record = synapse_database.get_generated_content(identity, content_id)
        if not record:
            return json_error("Generated content was not found for this user.", 404)
        return {"ok": True, "content": record}
    except Exception as error:
        return json_error(f"Could not load generated content: {error}", 500)


@app.delete("/content/{content_id}")
async def delete_generated_content_record(content_id: str, request: Request) -> Any:
    try:
        identity = database_identity_from_request(request)
        deleted = synapse_database.delete_generated_content(identity, content_id)
        if not deleted:
            return json_error("Generated content was not found for this user.", 404)
        return {"ok": True, "deleted": True, "id": content_id}
    except Exception as error:
        return json_error(f"Could not delete generated content: {error}", 500)


@app.post("/billing/checkout")
async def create_billing_checkout(request: Request) -> Any:
    user_or_response = require_verified_user(request)
    if isinstance(user_or_response, Response):
        return user_or_response
    stripe_error = require_stripe_ready()
    if stripe_error:
        return stripe_error
    user = user_or_response
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    plan_id = _clean_contact_text(payload.get("plan_id"), 40) or "student"
    price_id = price_id_for_plan(plan_id, _clean_contact_text(payload.get("price_id"), 120))
    if not price_id:
        return json_error(f"No Stripe price is configured for the {plan_id} plan.", 422)

    success_url = _clean_contact_text(payload.get("success_url"), 500) or f"{SYNAPSE_FRONTEND_BASE_URL}/index.html?billing=success"
    cancel_url = _clean_contact_text(payload.get("cancel_url"), 500) or f"{SYNAPSE_FRONTEND_BASE_URL}/index.html?billing=cancelled"
    customer_id = get_or_create_stripe_customer(user)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        client_reference_id=user["id"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "synapse_user_id": user["id"],
            "synapse_plan_id": plan_id,
            "synapse_price_id": price_id,
        },
        customer_update={"name": "auto"},
    )
    return {
        "ok": True,
        "id": session.id,
        "url": session.url,
        "customer_id": customer_id,
    }


@app.post("/billing/portal")
async def create_billing_portal(request: Request) -> Any:
    user_or_response = require_verified_user(request)
    if isinstance(user_or_response, Response):
        return user_or_response
    stripe_error = require_stripe_ready()
    if stripe_error:
        return stripe_error
    user = user_or_response
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    profile = get_billing_profile(user)
    customer_id = profile.get("stripe_customer_id")
    if not customer_id:
        return json_error("No Stripe customer exists for this account yet. Buy a credit pack first.", 404)
    return_url = _clean_contact_text(payload.get("return_url"), 500) or f"{SYNAPSE_FRONTEND_BASE_URL}/index.html"
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return {
        "ok": True,
        "url": session.url,
        "customer_id": customer_id,
    }


@app.post("/billing/webhook")
async def stripe_billing_webhook(request: Request) -> Any:
    body = await request.body()
    try:
        if STRIPE_WEBHOOK_SECRET:
            if not stripe:
                return json_error("Stripe package is not installed.", 503)
            signature = request.headers.get("stripe-signature", "")
            event = stripe.Webhook.construct_event(body, signature, STRIPE_WEBHOOK_SECRET)
        elif not SYNAPSE_ALLOW_UNSIGNED_STRIPE_WEBHOOK:
            return json_error("Stripe webhook signing is not configured.", 503)
        else:
            event = json.loads(body.decode("utf-8") or "{}")
    except Exception:
        return json_error("Invalid Stripe webhook payload.", 400)

    event_type = event.get("type", "")
    event_object = (event.get("data") or {}).get("object") or {}
    record = {
        "received_at": utc_timestamp(),
        "event_id": event.get("id"),
        "type": event_type,
        "object_id": event_object.get("id"),
        "customer_id": event_object.get("customer"),
        "synapse_user_id": (event_object.get("metadata") or {}).get("synapse_user_id")
            or event_object.get("client_reference_id"),
        "plan_id": (event_object.get("metadata") or {}).get("synapse_plan_id"),
        "price_id": (event_object.get("metadata") or {}).get("synapse_price_id"),
        "payment_status": event_object.get("payment_status"),
        "amount_total": event_object.get("amount_total"),
        "currency": event_object.get("currency"),
    }
    append_runtime_jsonl("billing_ledger.jsonl", record)
    return {"ok": True, "received": True}


@app.get("/account/export")
async def export_account_data(request: Request) -> Any:
    user_or_response = require_verified_user(request)
    if isinstance(user_or_response, Response):
        return user_or_response
    user = user_or_response
    email = (user.get("email") or "").lower()
    profile = get_billing_profile(user)
    ledger = [
        item for item in read_runtime_jsonl("billing_ledger.jsonl")
        if item.get("synapse_user_id") == user["id"] or item.get("customer_id") == profile.get("stripe_customer_id")
    ]
    contacts = [
        item for item in read_runtime_jsonl("contact_inquiries.jsonl")
        if (item.get("email") or "").lower() == email
    ]
    deletions = [
        item for item in read_runtime_jsonl("account_deletions.jsonl")
        if item.get("synapse_user_id") == user["id"]
    ]
    database_identity = database_identity_from_verified_user(user)
    generated_content = synapse_database.export_user_content(database_identity)
    return {
        "ok": True,
        "exported_at": utc_timestamp(),
        "user": public_user_payload(user),
        "billing_profile": profile,
        "billing_ledger": ledger,
        "contact_inquiries": contacts,
        "deletion_requests": deletions,
        "generated_content": generated_content,
        "note": "Browser-local-only history is exported by the frontend. Server-generated content saved after this database feature is included here.",
    }


@app.post("/account/delete")
async def delete_account(request: Request) -> Any:
    user_or_response = require_verified_user(request)
    if isinstance(user_or_response, Response):
        return user_or_response
    user = user_or_response
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    if payload.get("confirm") is not True:
        return json_error("Account deletion requires confirm=true.", 422)

    profile = get_billing_profile(user)
    deletion_record = {
        "deleted_at": utc_timestamp(),
        "synapse_user_id": user["id"],
        "email": user.get("email"),
        "stripe_customer_id": profile.get("stripe_customer_id"),
        "generated_content_deleted": 0,
        "supabase_deleted": False,
        "stripe_marked_deleted": False,
    }
    try:
        deletion_record["generated_content_deleted"] = synapse_database.delete_user_content(
            database_identity_from_verified_user(user)
        )
    except Exception:
        deletion_record["generated_content_deleted"] = 0

    if stripe and STRIPE_SECRET_KEY and profile.get("stripe_customer_id"):
        try:
            stripe.Customer.modify(
                profile["stripe_customer_id"],
                metadata={
                    "synapse_user_id": user["id"],
                    "synapse_deleted_at": deletion_record["deleted_at"],
                },
            )
            deletion_record["stripe_marked_deleted"] = True
        except Exception:
            deletion_record["stripe_marked_deleted"] = False

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            response = requests.delete(
                f"{SUPABASE_URL}/auth/v1/admin/users/{user['id']}",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                },
                timeout=15,
            )
            deletion_record["supabase_deleted"] = response.status_code < 400
            if response.status_code >= 400:
                deletion_record["supabase_delete_status"] = response.status_code
        except Exception:
            deletion_record["supabase_deleted"] = False

    append_runtime_jsonl("account_deletions.jsonl", deletion_record)
    return {
        "ok": True,
        "message": "Account deletion was processed. Local browser data should now be cleared by the client.",
        "deletion": deletion_record,
    }
