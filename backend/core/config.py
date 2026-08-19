import os
from contextvars import ContextVar
from pathlib import Path

from dotenv import dotenv_values, load_dotenv
from openai import OpenAI

try:
    from google.auth import default as google_auth_default
    from google.auth.exceptions import DefaultCredentialsError
    from google.auth.transport.requests import Request as GoogleAuthRequest
except Exception:
    google_auth_default = None
    DefaultCredentialsError = Exception
    GoogleAuthRequest = None


def env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).lower() not in {"0", "false", "no"}


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except Exception:
        return default


def env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except Exception:
        return default


def env_list(name: str, default: str = "") -> list:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def env_str(name: str, default: str = "") -> str:
    value = (os.getenv(name) or "").strip()
    return value or default


PLACEHOLDER_ENV_MARKERS = (
    "__ADD_",
    "__YOUR",
    "YOUR_",
    "your_key_here",
    "PASTE_",
)


def is_placeholder_env_value(value: str | None) -> bool:
    text = str(value or "").strip()
    if not text:
        return True
    upper_text = text.upper()
    return any(marker.upper() in upper_text for marker in PLACEHOLDER_ENV_MARKERS)


def apply_env_values(
    values: dict,
    *,
    environ: dict | None = None,
    override: bool = False,
    override_placeholders: bool = False,
) -> None:
    target = environ if environ is not None else os.environ
    for key, value in values.items():
        if value is None:
            continue
        current = str(target.get(key, "") or "").strip()
        should_replace = override or not current
        if override_placeholders and current:
            should_replace = should_replace or is_placeholder_env_value(current)
        if should_replace:
            target[key] = str(value).strip()


def load_env_defaults(env_paths: tuple[Path, ...]) -> None:
    for env_path in env_paths:
        load_dotenv(env_path)


def load_env_overrides_for_placeholders(env_paths: tuple[Path, ...]) -> None:
    for env_path in env_paths:
        if env_path.exists():
            apply_env_values(
                dotenv_values(env_path),
                override_placeholders=True,
            )


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
BASE_ENV_PATHS = (
    BACKEND_DIR / ".env",
    BACKEND_DIR / "core" / ".env",
    PROJECT_ROOT / ".env",
)
GPT_ENV_PATHS = (
    BACKEND_DIR / ".env.gpt",
    BACKEND_DIR / "core" / ".env.gpt",
    PROJECT_ROOT / ".env.gpt",
)
GEMINI_ENV_PATHS = (
    BACKEND_DIR / ".env.gemini",
    BACKEND_DIR / "core" / ".env.gemini",
    PROJECT_ROOT / ".env.gemini",
)
DEEPSEEK_ENV_PATHS = (
    BACKEND_DIR / ".env.deepseek",
    BACKEND_DIR / "core" / ".env.deepseek",
    PROJECT_ROOT / ".env.deepseek",
)
CONFIG_ENV_PATHS = BASE_ENV_PATHS + GPT_ENV_PATHS + GEMINI_ENV_PATHS + DEEPSEEK_ENV_PATHS
load_env_defaults(BASE_ENV_PATHS + GEMINI_ENV_PATHS + DEEPSEEK_ENV_PATHS)
load_env_overrides_for_placeholders(GPT_ENV_PATHS)
load_dotenv()

AI_TEXT_PROVIDER = env_str("AI_TEXT_PROVIDER", "openai").lower()
if AI_TEXT_PROVIDER not in {"openai", "gemini", "deepseek"}:
    AI_TEXT_PROVIDER = "openai"
REQUEST_AI_TEXT_PROVIDER: ContextVar[str] = ContextVar(
    "REQUEST_AI_TEXT_PROVIDER",
    default="",
)

OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
if is_placeholder_env_value(OPENAI_API_KEY):
    # Example/template values must not count as configured credentials.
    OPENAI_API_KEY = ""
OPENAI_ORG_ID = (os.getenv("OPENAI_ORG_ID") or "").strip() or None
OPENAI_PROJECT_ID = (os.getenv("OPENAI_PROJECT_ID") or "").strip() or None
OPENAI_TIMEOUT_SECONDS = max(30.0, env_float("OPENAI_TIMEOUT_SECONDS", 240.0))
# Keep the request budget configurable for constrained hosts such as Render's
# free instance. The request pipeline skips optional stages as the budget runs
# down, so a shorter explicit budget is safer than letting the platform kill
# the worker while a long model call is still in flight.
ANALYSIS_MAX_SECONDS = max(30, env_int("ANALYSIS_MAX_SECONDS", 300))
GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or "").strip()
if is_placeholder_env_value(GEMINI_API_KEY):
    GEMINI_API_KEY = ""
GEMINI_AUTH_MODE = env_str("GEMINI_AUTH_MODE", "api_key" if GEMINI_API_KEY else "adc").lower()
if GEMINI_AUTH_MODE not in {"api_key", "adc"}:
    GEMINI_AUTH_MODE = "api_key" if GEMINI_API_KEY else "adc"
GEMINI_PROJECT_ID = env_str(
    "GEMINI_PROJECT_ID",
    env_str("GOOGLE_CLOUD_PROJECT", env_str("GCLOUD_PROJECT", "")),
)
GEMINI_LOCATION = env_str("GEMINI_LOCATION", "us-central1")
GEMINI_OPENAI_BASE_URL = env_str(
    "GEMINI_OPENAI_BASE_URL",
    "https://generativelanguage.googleapis.com/v1beta/openai/",
)

client = (
    OpenAI(
        api_key=OPENAI_API_KEY,
        organization=OPENAI_ORG_ID,
        project=OPENAI_PROJECT_ID,
        timeout=OPENAI_TIMEOUT_SECONDS,
    )
    if OPENAI_API_KEY
    else None
)
gemini_client = (
    OpenAI(
        api_key=GEMINI_API_KEY,
        base_url=GEMINI_OPENAI_BASE_URL,
        timeout=OPENAI_TIMEOUT_SECONDS,
    )
    if GEMINI_API_KEY and GEMINI_AUTH_MODE == "api_key"
    else None
)
DEEPSEEK_API_KEY = (os.getenv("DEEPSEEK_API_KEY") or "").strip()
DEEPSEEK_OPENAI_BASE_URL = env_str("DEEPSEEK_OPENAI_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_THINKING_MODE = env_str("DEEPSEEK_THINKING_MODE", "disabled").lower()
if DEEPSEEK_THINKING_MODE not in {"enabled", "disabled"}:
    DEEPSEEK_THINKING_MODE = "disabled"
# DeepSeek V4 can take too long for Render's synchronous request window when
# given the large GPT-oriented output budget. Keep its normal response bounded;
# deployments may raise this deliberately after validating their host limits.
DEEPSEEK_MAX_OUTPUT_TOKENS = max(256, env_int("DEEPSEEK_MAX_OUTPUT_TOKENS", 650))
deepseek_client = (
    OpenAI(
        api_key=DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_OPENAI_BASE_URL,
        timeout=OPENAI_TIMEOUT_SECONDS,
    )
    if DEEPSEEK_API_KEY
    else None
)

DEFAULT_TEXT_MODEL = "gpt-5.4-mini"
DEFAULT_GEMINI_TEXT_MODEL = "gemini-3.1-flash-lite"
DEFAULT_DEEPSEEK_TEXT_MODEL = "deepseek-v4-flash"
DEFAULT_REALTIME_MODEL = "gpt-realtime-2"
DEFAULT_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe"
DEFAULT_VISUAL_IMAGE_GUIDE_MODEL = "gpt-image-1.5"

OPENAI_ANALYSIS_MODEL_NAME = env_str("OPENAI_ANALYSIS_MODEL", DEFAULT_TEXT_MODEL)
OPENAI_CHAT_MODEL_NAME = env_str("OPENAI_CHAT_MODEL", DEFAULT_TEXT_MODEL)
# Kept as compatibility exports for existing health/config consumers. They are
# deliberately not used for retries: a request must stay with its selected AI
# provider and report a failure instead of changing model or provider.
OPENAI_FALLBACK_MODEL_NAME = OPENAI_ANALYSIS_MODEL_NAME
OPENAI_MINDMAP_MODEL_NAME = env_str("OPENAI_MINDMAP_MODEL", OPENAI_ANALYSIS_MODEL_NAME)
OPENAI_TITLE_MODEL_NAME = env_str("OPENAI_TITLE_MODEL", OPENAI_ANALYSIS_MODEL_NAME)

GEMINI_ANALYSIS_MODEL = env_str("GEMINI_ANALYSIS_MODEL", env_str("GEMINI_MODEL", DEFAULT_GEMINI_TEXT_MODEL))
GEMINI_CHAT_MODEL = env_str("GEMINI_CHAT_MODEL", GEMINI_ANALYSIS_MODEL)
GEMINI_FALLBACK_MODEL = GEMINI_CHAT_MODEL
GEMINI_MINDMAP_MODEL = env_str("GEMINI_MINDMAP_MODEL", GEMINI_ANALYSIS_MODEL)
GEMINI_TITLE_MODEL = env_str("GEMINI_TITLE_MODEL", GEMINI_CHAT_MODEL)
GEMINI_FOCUSED_MODEL = env_str("GEMINI_FOCUSED_MODEL", env_str("GEMINI_BRIEF_MODEL", GEMINI_ANALYSIS_MODEL))
GEMINI_STANDARD_MODEL = env_str("GEMINI_STANDARD_MODEL", GEMINI_ANALYSIS_MODEL)
GEMINI_DETAILED_MODEL = env_str("GEMINI_DETAILED_MODEL", GEMINI_ANALYSIS_MODEL)
GEMINI_COMPREHENSIVE_MODEL = env_str(
    "GEMINI_COMPREHENSIVE_MODEL",
    env_str("GEMINI_DEEP_MODEL", GEMINI_ANALYSIS_MODEL),
)
DEEPSEEK_ANALYSIS_MODEL = env_str("DEEPSEEK_ANALYSIS_MODEL", env_str("DEEPSEEK_MODEL", DEFAULT_DEEPSEEK_TEXT_MODEL))
DEEPSEEK_CHAT_MODEL = env_str("DEEPSEEK_CHAT_MODEL", DEEPSEEK_ANALYSIS_MODEL)
DEEPSEEK_MINDMAP_MODEL = env_str("DEEPSEEK_MINDMAP_MODEL", DEEPSEEK_ANALYSIS_MODEL)
DEEPSEEK_TITLE_MODEL = env_str("DEEPSEEK_TITLE_MODEL", DEEPSEEK_CHAT_MODEL)
DEEPSEEK_FOCUSED_MODEL = env_str("DEEPSEEK_FOCUSED_MODEL", env_str("DEEPSEEK_BRIEF_MODEL", DEEPSEEK_ANALYSIS_MODEL))
DEEPSEEK_STANDARD_MODEL = env_str("DEEPSEEK_STANDARD_MODEL", DEEPSEEK_ANALYSIS_MODEL)
DEEPSEEK_DETAILED_MODEL = env_str("DEEPSEEK_DETAILED_MODEL", DEEPSEEK_ANALYSIS_MODEL)
DEEPSEEK_COMPREHENSIVE_MODEL = env_str(
    "DEEPSEEK_COMPREHENSIVE_MODEL",
    env_str("DEEPSEEK_DEEP_MODEL", DEEPSEEK_ANALYSIS_MODEL),
)

if AI_TEXT_PROVIDER == "gemini":
    ANALYSIS_MODEL = GEMINI_ANALYSIS_MODEL
    CHAT_MODEL = GEMINI_CHAT_MODEL
    FALLBACK_MODEL = GEMINI_FALLBACK_MODEL
    MINDMAP_MODEL = GEMINI_MINDMAP_MODEL
    TITLE_MODEL = GEMINI_TITLE_MODEL
elif AI_TEXT_PROVIDER == "deepseek":
    ANALYSIS_MODEL = DEEPSEEK_ANALYSIS_MODEL
    CHAT_MODEL = DEEPSEEK_CHAT_MODEL
    FALLBACK_MODEL = DEEPSEEK_CHAT_MODEL
    MINDMAP_MODEL = DEEPSEEK_MINDMAP_MODEL
    TITLE_MODEL = DEEPSEEK_TITLE_MODEL
else:
    ANALYSIS_MODEL = OPENAI_ANALYSIS_MODEL_NAME
    CHAT_MODEL = OPENAI_CHAT_MODEL_NAME
    FALLBACK_MODEL = OPENAI_FALLBACK_MODEL_NAME
    MINDMAP_MODEL = OPENAI_MINDMAP_MODEL_NAME
    TITLE_MODEL = OPENAI_TITLE_MODEL_NAME
TRANSCRIBE_MODEL = env_str("OPENAI_TRANSCRIBE_MODEL", DEFAULT_TRANSCRIBE_MODEL)
REALTIME_MODEL = env_str("OPENAI_REALTIME_MODEL", DEFAULT_REALTIME_MODEL)
REALTIME_VOICE = env_str("OPENAI_REALTIME_VOICE", "marin")
BROADCAST_SCRIPT_MODEL = env_str("BROADCAST_SCRIPT_MODEL", OPENAI_ANALYSIS_MODEL_NAME)
BROADCAST_TTS_PROVIDER = env_str("BROADCAST_TTS_PROVIDER", "openai").lower()
BROADCAST_TTS_MODEL = env_str("BROADCAST_TTS_MODEL", "gpt-4o-mini-tts")
BROADCAST_TTS_VOICE = env_str("BROADCAST_TTS_VOICE", "alloy")
BROADCAST_REALTIME_MODEL = env_str("BROADCAST_REALTIME_MODEL", DEFAULT_REALTIME_MODEL)
BROADCAST_TTS_INPUT_CHAR_LIMIT = max(1200, env_int("BROADCAST_TTS_INPUT_CHAR_LIMIT", 5200))
VISUAL_IMAGE_GUIDE_MODEL = env_str("OPENAI_VISUAL_IMAGE_GUIDE_MODEL", DEFAULT_VISUAL_IMAGE_GUIDE_MODEL)
VISUAL_IMAGE_GUIDE_SIZE = env_str("OPENAI_VISUAL_IMAGE_GUIDE_SIZE", "1024x1536")
VISUAL_IMAGE_GUIDE_QUALITY = env_str("OPENAI_VISUAL_IMAGE_GUIDE_QUALITY", "medium")

ENABLE_TUTOR_WEB_RESEARCH = env_bool("ENABLE_TUTOR_WEB_RESEARCH", "true")
ENABLE_EMBEDDED_YOUTUBE_SOURCES = env_bool("ENABLE_EMBEDDED_YOUTUBE_SOURCES", "false")
ENABLE_YOUTUBE_YTDLP_FALLBACK = env_bool("ENABLE_YOUTUBE_YTDLP_FALLBACK", "true")
MAX_TUTOR_SEARCH_RESULTS = env_int("MAX_TUTOR_SEARCH_RESULTS", 4)
MAX_TUTOR_RESEARCH_CHARS = env_int("MAX_TUTOR_RESEARCH_CHARS", 9000)
TUTOR_WEB_RESEARCH_BUDGET_SECONDS = max(1.0, env_float("TUTOR_WEB_RESEARCH_BUDGET_SECONDS", 8.0))
VOICE_TUTOR_HISTORY_LIMIT = env_int("VOICE_TUTOR_HISTORY_LIMIT", 24)
VOICE_TUTOR_CONTEXT_CHARS = env_int("VOICE_TUTOR_CONTEXT_CHARS", 18000)
VOICE_TUTOR_TOKENS = env_int("VOICE_TUTOR_TOKENS", 2200)
VOICE_TUTOR_REALTIME_CONTEXT_CHARS = env_int("VOICE_TUTOR_REALTIME_CONTEXT_CHARS", 16000)

MAX_AUDIO_BYTES = env_int("MAX_AUDIO_BYTES", 24 * 1024 * 1024)
MAX_VIDEO_BYTES = env_int("MAX_VIDEO_BYTES", 60 * 1024 * 1024)
MAX_UPLOAD_BYTES = env_int("MAX_UPLOAD_BYTES", 100 * 1024 * 1024)
MAX_ANALYZE_FILES = max(1, env_int("MAX_ANALYZE_FILES", 20))
MAX_ANALYZE_TOTAL_UPLOAD_BYTES = max(
    1,
    env_int("MAX_ANALYZE_TOTAL_UPLOAD_BYTES", 200 * 1024 * 1024),
)
MAX_SOURCE_CHARS = env_int("MAX_SOURCE_CHARS", 90000)
MAX_VIDEO_FRAMES = env_int("MAX_VIDEO_FRAMES", 8)
MAX_VISUAL_IMAGES_PER_SOURCE = env_int("MAX_VISUAL_IMAGES_PER_SOURCE", 10)
ENABLE_PDF_VISUAL_EXTRACTION = env_bool("ENABLE_PDF_VISUAL_EXTRACTION", "true")
MAX_MULTI_SOURCE_VISUAL_IMAGES = env_int("MAX_MULTI_SOURCE_VISUAL_IMAGES", 64)
MULTISOURCE_VISUAL_GALLERY_LIMIT = env_int("MULTISOURCE_VISUAL_GALLERY_LIMIT", 36)
MULTISOURCE_SYNTHESIS_PART_TOKENS = env_int("MULTISOURCE_SYNTHESIS_PART_TOKENS", 9000)
MULTISOURCE_CONNECTION_TOKENS = env_int("MULTISOURCE_CONNECTION_TOKENS", 14000)
VISUAL_ARGUMENT_CARD_LIMIT = env_int("VISUAL_ARGUMENT_CARD_LIMIT", 18)
VISUAL_ARGUMENT_TOKENS = env_int("VISUAL_ARGUMENT_TOKENS", 1100)
VISUAL_RENDER_DPI = env_int("VISUAL_RENDER_DPI", 170)

ENABLE_PPTX_SLIDE_RENDER = env_bool("ENABLE_PPTX_SLIDE_RENDER", "true")
ENABLE_PPTX_SVG_FALLBACK_RENDER = env_bool("ENABLE_PPTX_SVG_FALLBACK_RENDER", "true")
ENABLE_SOURCE_PPTX_PREVIEW_RENDER = env_bool("ENABLE_SOURCE_PPTX_PREVIEW_RENDER", "true")
ENABLE_PPTX_EMBEDDED_IMAGE_EXTRACTION = env_bool("ENABLE_PPTX_EMBEDDED_IMAGE_EXTRACTION", "true")
ENABLE_LOCAL_PPTX_APP_RENDER = env_bool(
    "ENABLE_LOCAL_PPTX_APP_RENDER",
    os.getenv("ENABLE_SOURCE_PPTX_APP_RENDER", "false"),
)

SOURCE_PREVIEW_MAX_SLIDES = env_int("SOURCE_PREVIEW_MAX_SLIDES", 80)
SOURCE_PREVIEW_MAX_PDF_PAGES = env_int("SOURCE_PREVIEW_MAX_PDF_PAGES", 160)
SOURCE_PREVIEW_MAX_EMBEDDED_IMAGES = env_int("SOURCE_PREVIEW_MAX_EMBEDDED_IMAGES", 120)
SOURCE_PREVIEW_RENDER_DPI = env_int("SOURCE_PREVIEW_RENDER_DPI", 200)
SOURCE_PREVIEW_PPTX_CONVERT_TIMEOUT = env_int(
    "SOURCE_PREVIEW_PPTX_CONVERT_TIMEOUT",
    env_int("SOURCE_PREVIEW_PPTX_APP_TIMEOUT", 120),
)

ENABLE_MULTI_SOURCE_DIGESTS = env_bool("ENABLE_MULTI_SOURCE_DIGESTS", "true")
MULTISOURCE_SOURCE_DIGEST_TOKENS = env_int("MULTISOURCE_SOURCE_DIGEST_TOKENS", 9000)
MULTISOURCE_SOURCE_CHARS = env_int("MULTISOURCE_SOURCE_CHARS", 500000)
ANALYSIS_CACHE_TTL_SECONDS = env_int("ANALYSIS_CACHE_TTL_SECONDS", 7 * 24 * 60 * 60)
DEFAULT_CACHE_PATH = BACKEND_DIR / "synapse_analysis_cache.json"
RUNTIME_DIR = PROJECT_ROOT / ".synapse_runtime"
RUNTIME_ASSETS_DIR = RUNTIME_DIR / "assets"
PUBLIC_BACKEND_BASE_URL = env_str("SYNAPSE_PUBLIC_BACKEND_URL", "http://127.0.0.1:8001").rstrip("/")
SYNAPSE_DATA_API_INTERNAL_URL = env_str("SYNAPSE_DATA_API_INTERNAL_URL", "http://127.0.0.1:3001").rstrip("/")
SYNAPSE_DATA_API_TIMEOUT_SECONDS = max(1.0, env_float("SYNAPSE_DATA_API_TIMEOUT_SECONDS", 5.0))
SYNAPSE_INTERNAL_API_TOKEN = env_str("SYNAPSE_INTERNAL_API_TOKEN", "")
try:
    RUNTIME_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_PATH = RUNTIME_DIR / "synapse_analysis_cache.json"
except Exception:
    CACHE_PATH = DEFAULT_CACHE_PATH
CACHE_VERSION = "source_identity_mindmap_v68_provider_isolation"
VISUAL_PIPELINE_VERSION = "inline-visual-markers-v1"

DEFAULT_CORS_ALLOW_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5175",
    "http://localhost:5175",
    "http://127.0.0.1:5176",
    "http://localhost:5176",
]
CORS_ALLOW_ORIGINS = env_list(
    "SYNAPSE_CORS_ALLOW_ORIGINS",
    ",".join(DEFAULT_CORS_ALLOW_ORIGINS),
)
for origin in DEFAULT_CORS_ALLOW_ORIGINS:
    if origin not in CORS_ALLOW_ORIGINS:
        CORS_ALLOW_ORIGINS.append(origin)
CORS_ALLOW_ORIGIN_REGEX = (
    os.getenv(
        "SYNAPSE_CORS_ALLOW_ORIGIN_REGEX",
        r"^http://(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}):(?:5175|5176|5500)$",
    ).strip()
    or None
)
CORS_ALLOW_CREDENTIALS = env_bool("SYNAPSE_CORS_ALLOW_CREDENTIALS", "false")


def normalise_text_provider(provider: str = "") -> str:
    value = provider if isinstance(provider, str) else ""
    value = value.strip().lower()
    if value in {"gpt", "openai", "chatgpt"}:
        return "openai"
    if value in {"gemini", "google", "vertex"}:
        return "gemini"
    if value in {"deepseek", "deepsea"}:
        return "deepseek"
    return AI_TEXT_PROVIDER


def active_text_provider() -> str:
    return normalise_text_provider(REQUEST_AI_TEXT_PROVIDER.get() or AI_TEXT_PROVIDER)


def gemini_request_is_configured() -> bool:
    """Return whether this deployment can actually serve a Gemini request."""
    if GEMINI_AUTH_MODE == "api_key":
        return bool(GEMINI_API_KEY and gemini_client)
    return bool(GEMINI_PROJECT_ID and google_auth_default and GoogleAuthRequest)


def deepseek_request_is_configured() -> bool:
    """Return whether this deployment can actually serve a DeepSeek request."""
    return bool(DEEPSEEK_API_KEY and deepseek_client)


def chat_model_for_active_provider() -> str:
    if active_text_provider() == "gemini":
        return GEMINI_CHAT_MODEL
    if active_text_provider() == "deepseek":
        return DEEPSEEK_CHAT_MODEL
    return OPENAI_CHAT_MODEL_NAME


def analysis_model_for_active_provider() -> str:
    if active_text_provider() == "gemini":
        return GEMINI_ANALYSIS_MODEL
    if active_text_provider() == "deepseek":
        return DEEPSEEK_ANALYSIS_MODEL
    return OPENAI_ANALYSIS_MODEL_NAME


def mindmap_model_for_active_provider() -> str:
    if active_text_provider() == "gemini":
        return GEMINI_MINDMAP_MODEL
    if active_text_provider() == "deepseek":
        return DEEPSEEK_MINDMAP_MODEL
    return OPENAI_MINDMAP_MODEL_NAME


def title_model_for_active_provider() -> str:
    if active_text_provider() == "gemini":
        return GEMINI_TITLE_MODEL
    if active_text_provider() == "deepseek":
        return DEEPSEEK_TITLE_MODEL
    return OPENAI_TITLE_MODEL_NAME


def fallback_model_for_active_provider() -> str:
    """Compatibility helper; automatic model fallback is disabled."""
    return chat_model_for_active_provider()


def set_request_text_provider(provider: str):
    """Select one provider for this request without cross-provider fallback."""
    selected = normalise_text_provider(provider)
    if selected == "gemini" and not gemini_request_is_configured():
        if GEMINI_AUTH_MODE == "adc":
            raise RuntimeError(
                "Gemini is not configured. Add GEMINI_PROJECT_ID and Google Application Default Credentials, then restart the backend."
            )
        raise RuntimeError(
            "Gemini is not configured. Add GEMINI_API_KEY to backend/.env.gemini, then restart the backend."
        )
    if selected == "deepseek" and not deepseek_request_is_configured():
        raise RuntimeError(
            "DeepSeek is not configured. Add DEEPSEEK_API_KEY to backend/.env.deepseek, then restart the backend."
        )
    return REQUEST_AI_TEXT_PROVIDER.set(selected)


def reset_request_text_provider(token) -> None:
    REQUEST_AI_TEXT_PROVIDER.reset(token)


def model_for_depth(depth: str) -> str:
    if active_text_provider() == "gemini":
        if depth == "focused":
            return GEMINI_FOCUSED_MODEL
        if depth == "standard":
            return GEMINI_STANDARD_MODEL
        if depth == "detailed":
            return GEMINI_DETAILED_MODEL
        return GEMINI_COMPREHENSIVE_MODEL
    if active_text_provider() == "deepseek":
        if depth == "focused":
            return DEEPSEEK_FOCUSED_MODEL
        if depth == "standard":
            return DEEPSEEK_STANDARD_MODEL
        if depth == "detailed":
            return DEEPSEEK_DETAILED_MODEL
        return DEEPSEEK_COMPREHENSIVE_MODEL
    if depth == "focused":
        return env_str("OPENAI_FOCUSED_MODEL", env_str("OPENAI_BRIEF_MODEL", OPENAI_ANALYSIS_MODEL_NAME))
    if depth == "standard":
        return env_str("OPENAI_STANDARD_MODEL", OPENAI_ANALYSIS_MODEL_NAME)
    if depth == "detailed":
        return env_str("OPENAI_DETAILED_MODEL", OPENAI_ANALYSIS_MODEL_NAME)
    return env_str("OPENAI_COMPREHENSIVE_MODEL", env_str("OPENAI_DEEP_MODEL", OPENAI_ANALYSIS_MODEL_NAME))


def has_openai() -> bool:
    return bool(OPENAI_API_KEY and not is_placeholder_env_value(OPENAI_API_KEY) and client is not None)


def require_openai_api() -> None:
    if not has_openai():
        raise RuntimeError(
            "OPENAI_API_KEY is missing. Create backend/.env and add "
            "OPENAI_API_KEY=your_key_here, then restart uvicorn."
        )


def google_auth_request():
    if GoogleAuthRequest is None:
        return None
    return GoogleAuthRequest()


def has_gemini_adc_credentials() -> bool:
    if google_auth_default is None or not GEMINI_PROJECT_ID.strip():
        return False
    try:
        google_auth_default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        return True
    except DefaultCredentialsError:
        return False
    except Exception:
        return False


def gemini_vertex_openai_base_url() -> str:
    project_id = GEMINI_PROJECT_ID.strip()
    location = (GEMINI_LOCATION or "us-central1").strip() or "us-central1"
    if location == "global":
        return f"https://aiplatform.googleapis.com/v1beta1/projects/{project_id}/locations/global/endpoints/openapi"
    return f"https://{location}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{location}/endpoints/openapi"


def gemini_adc_client():
    if google_auth_default is None:
        return None
    if not GEMINI_PROJECT_ID.strip():
        return None
    credentials, _ = google_auth_default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    request = google_auth_request()
    if request is None:
        return None
    credentials.refresh(request)
    return OpenAI(
        api_key=credentials.token,
        base_url=gemini_vertex_openai_base_url(),
        timeout=OPENAI_TIMEOUT_SECONDS,
    )


def text_generation_client():
    if active_text_provider() == "gemini":
        if GEMINI_AUTH_MODE == "adc":
            return gemini_adc_client()
        return gemini_client
    if active_text_provider() == "deepseek":
        return deepseek_client
    return client


def has_text_ai() -> bool:
    if active_text_provider() == "gemini" and GEMINI_AUTH_MODE == "adc":
        return GoogleAuthRequest is not None and has_gemini_adc_credentials()
    return text_generation_client() is not None


def require_text_ai() -> None:
    if has_text_ai():
        return
    if active_text_provider() == "gemini":
        if GEMINI_AUTH_MODE == "adc":
            if google_auth_default is None or GoogleAuthRequest is None:
                raise RuntimeError(
                    "google-auth is missing. Install backend requirements, then restart uvicorn."
                )
            if not GEMINI_PROJECT_ID.strip():
                raise RuntimeError(
                    "GEMINI_PROJECT_ID is missing. Add it to backend/.env.gemini or set GOOGLE_CLOUD_PROJECT, then restart uvicorn."
                )
            if not has_gemini_adc_credentials():
                raise RuntimeError(
                    "Google Application Default Credentials are missing. Install Google Cloud CLI, run "
                    "`gcloud auth application-default login`, then restart uvicorn."
                )
        raise RuntimeError(
            "GEMINI_API_KEY is missing. Create backend/.env.gemini and add "
            "GEMINI_API_KEY=your_key_here, then restart uvicorn."
        )
    if active_text_provider() == "deepseek":
        raise RuntimeError(
            "DEEPSEEK_API_KEY is missing. Create backend/.env.deepseek and add "
            "DEEPSEEK_API_KEY=your_key_here, then restart uvicorn."
        )
    require_openai_api()


def require_openai() -> None:
    """Backward-compatible text-model guard used by older route code."""
    require_text_ai()
