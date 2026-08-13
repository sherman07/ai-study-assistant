import asyncio
import base64
import html
import http.client
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
from urllib.parse import parse_qs, quote, urlencode, urljoin, urlparse, urlunparse

import requests
from dotenv import dotenv_values
from fastapi import BackgroundTasks, FastAPI, File, Form, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.routing import APIRoute
from starlette.exceptions import HTTPException as StarletteHTTPException

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
    DEEPSEEK_MAX_OUTPUT_TOKENS,
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
    MAX_ANALYZE_FILES,
    MAX_ANALYZE_TOTAL_UPLOAD_BYTES,
    MAX_MULTI_SOURCE_VISUAL_IMAGES,
    MAX_SOURCE_CHARS,
    MAX_TUTOR_RESEARCH_CHARS,
    MAX_TUTOR_SEARCH_RESULTS,
    TUTOR_WEB_RESEARCH_BUDGET_SECONDS,
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
from core.url_security import normalize_public_http_url, resolve_public_http_target
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


from core.optional_deps import *  # noqa: F403

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

from core.analyze_limits import (
    MAX_ANALYZE_REQUEST_BYTES,
    AnalyzeMultipartLimitRoute,
    AnalyzeRequestLimitMiddleware,
)
from core.rate_limit import (
    AUTH_EMAIL_RATE_LIMITED_PATHS,
    AUTH_EMAIL_RATE_WINDOW_SECONDS,
    AUTH_EMAIL_RECIPIENT_RATE_LIMIT,
    AUTH_EMAIL_SOURCE_RATE_LIMIT,
    GENERATION_RATE_LIMIT,
    GENERATION_RATE_WINDOW_SECONDS,
    RATE_LIMITED_PATHS,
    TRUSTED_PROXY_HOPS,
    _RATE_EXEMPT_HOSTS,
    _auth_email_rate_limit_hits,
    _rate_limit_hits,
    _rate_limit_lock,
    install_generation_rate_limit,
)

app = FastAPI(title="Synapse Backend")
app.router.route_class = AnalyzeMultipartLimitRoute
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AnalyzeRequestLimitMiddleware)
RUNTIME_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

install_generation_rate_limit(app)

async def run_blocking(func, *args, **kwargs):
    """Run synchronous parsing/model/persistence work without blocking Uvicorn."""
    return await asyncio.to_thread(partial(func, *args, **kwargs))


APP_SECTION_FILES = (
    "01_health.py",
    "01b_health.py",
    "02_build_refusal_repair_messages.py",
    "02b_build_refusal_repair_messages.py",
    "03_download_youtube_media.py",
    "03b_download_youtube_media.py",
    "04_file_to_source_unit.py",
    "04b_file_to_source_unit.py",
    "04c_file_to_source_unit.py",
    "05_analyze.py",
    "05b_analyze.py",
    "05c_analyze.py",
    "05d_analyze.py",
    "06_source_preview.py",
    "06b_source_preview.py",
    "06c_source_preview.py",
    "07_v22_visual_rank_keywords.py",
    "07b_v22_visual_rank_keywords.py",
    "08_convert_pptx_to_pdf_with_powerpoint.py",
    "08b_convert_pptx_to_pdf_with_powerpoint.py",
    "09_v23_meaningful_card_text.py",
    "09b_v23_meaningful_card_text.py",
    "09c_v23_meaningful_card_text.py",
    "09d_v23_meaningful_card_text.py",
    "10_parse_quiz_type_plan.py",
    "10b_parse_quiz_type_plan.py",
    "10c_parse_quiz_type_plan.py",
    "10d_parse_quiz_type_plan.py",
    "10e_parse_quiz_type_plan.py",
    "10f_parse_quiz_type_plan.py",
    "10g_parse_quiz_type_plan.py",
    "11_timeline_generate.py",
    "11b_timeline_generate.py",
    "12_flashcards_generate.py",
    "13_broadcast_mode.py",
    "13b_broadcast_mode.py",
    "14_learning_companion.py",
    "15_assets_and_auth_helpers.py",
    "16_auth_email_and_billing_helpers.py",
    "17_auth_and_billing_routes.py",
    "18_account_routes.py",
)

AppSectionLoader(BACKEND_PACKAGE_DIR, APP_SECTION_FILES).load(globals())
