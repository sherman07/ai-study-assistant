from routers.assets import serve_runtime_asset_response, serve_visual_asset_response


@app.get("/assets/visuals/{asset_name}")
def serve_visual_asset(asset_name: str):
    """Serve a local visual or restore it from private durable storage."""
    return serve_visual_asset_response(
        asset_name,
        runtime_asset_path_for_relative_path=runtime_asset_path_for_relative_path,
        fetch_visual_asset_from_durable_storage=fetch_visual_asset_from_durable_storage,
    )


@app.get("/assets/{asset_path:path}")
def serve_runtime_asset(asset_path: str):
    """Keep existing runtime audio and preview URLs working without static mounts."""
    return serve_runtime_asset_response(
        asset_path,
        runtime_asset_path_for_relative_path=runtime_asset_path_for_relative_path,
    )

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
