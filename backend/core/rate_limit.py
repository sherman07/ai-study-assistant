"""In-memory generation and auth-email rate limiting middleware."""

from __future__ import annotations

import json
import sys
import threading as _threading
import time
from typing import Dict, List, Tuple

from fastapi import Request, Response

from core.config import env_int


def _normalize_email_key(value) -> str:
    return str(value or "").strip().lower()


def _app_module():
    return sys.modules.get("backend.app") or sys.modules.get("app")


def _app_setting(name: str, default):
    mod = _app_module()
    if mod is not None and hasattr(mod, name):
        return getattr(mod, name)
    return default


GENERATION_RATE_LIMIT = env_int("SYNAPSE_GENERATION_RATE_LIMIT", 30)
GENERATION_RATE_WINDOW_SECONDS = max(1, env_int("SYNAPSE_GENERATION_RATE_WINDOW_SECONDS", 60))
AUTH_EMAIL_SOURCE_RATE_LIMIT = max(1, env_int("SYNAPSE_AUTH_EMAIL_SOURCE_RATE_LIMIT", 10))
AUTH_EMAIL_RECIPIENT_RATE_LIMIT = max(1, env_int("SYNAPSE_AUTH_EMAIL_RECIPIENT_RATE_LIMIT", 3))
AUTH_EMAIL_RATE_WINDOW_SECONDS = max(1, env_int("SYNAPSE_AUTH_EMAIL_RATE_WINDOW_SECONDS", 600))
TRUSTED_PROXY_HOPS = max(0, env_int("SYNAPSE_TRUSTED_PROXY_HOPS", 0))
AUTH_EMAIL_RATE_LIMITED_PATHS = frozenset({
    "/api/auth/signup",
    "/api/auth/resend-confirmation",
    "/api/auth/request-password-reset",
})
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
_auth_email_rate_limit_hits: Dict[str, List[float]] = {}


def _rate_limit_client_key(request: Request) -> Tuple[str, str]:
    host = (request.client.host if request.client else "") or ""
    forwarded = request.headers.get("x-forwarded-for", "")
    forwarded_chain = [part.strip() for part in forwarded.split(",") if part.strip()]
    key = host
    trusted_hops = _app_setting("TRUSTED_PROXY_HOPS", TRUSTED_PROXY_HOPS)
    if trusted_hops and len(forwarded_chain) >= trusted_hops:
        key = forwarded_chain[-trusted_hops]
    return key or "unknown", host


def install_generation_rate_limit(app):
    @app.middleware("http")
    async def generation_rate_limit_middleware(request: Request, call_next):
        auth_paths = _app_setting("AUTH_EMAIL_RATE_LIMITED_PATHS", AUTH_EMAIL_RATE_LIMITED_PATHS)
        auth_window = _app_setting("AUTH_EMAIL_RATE_WINDOW_SECONDS", AUTH_EMAIL_RATE_WINDOW_SECONDS)
        auth_source_limit = _app_setting("AUTH_EMAIL_SOURCE_RATE_LIMIT", AUTH_EMAIL_SOURCE_RATE_LIMIT)
        auth_recipient_limit = _app_setting("AUTH_EMAIL_RECIPIENT_RATE_LIMIT", AUTH_EMAIL_RECIPIENT_RATE_LIMIT)
        exempt_hosts = _app_setting("_RATE_EXEMPT_HOSTS", _RATE_EXEMPT_HOSTS)
        auth_hits = _app_setting("_auth_email_rate_limit_hits", _auth_email_rate_limit_hits)
        lock = _app_setting("_rate_limit_lock", _rate_limit_lock)
        generation_limit = _app_setting("GENERATION_RATE_LIMIT", GENERATION_RATE_LIMIT)
        generation_window = _app_setting("GENERATION_RATE_WINDOW_SECONDS", GENERATION_RATE_WINDOW_SECONDS)
        generation_paths = _app_setting("RATE_LIMITED_PATHS", RATE_LIMITED_PATHS)
        generation_hits = _app_setting("_rate_limit_hits", _rate_limit_hits)

        if request.method == "POST" and request.url.path in auth_paths:
            key, host = _rate_limit_client_key(request)
            if key not in exempt_hosts:
                try:
                    payload = json.loads((await request.body()).decode("utf-8"))
                except Exception:
                    payload = {}
                recipient = _normalize_email_key(payload.get("email")) if isinstance(payload, dict) else ""
                now = time.monotonic()
                window_start = now - auth_window
                bucket_limits = [
                    (f"source:{key}", auth_source_limit),
                    (f"recipient:{recipient}", auth_recipient_limit),
                ]
                with lock:
                    if len(auth_hits) > 10000:
                        stale_keys = [
                            bucket for bucket, hits in auth_hits.items()
                            if not hits or hits[-1] < window_start
                        ]
                        for bucket in stale_keys:
                            auth_hits.pop(bucket, None)
                    active_buckets = []
                    retry_after = 0
                    for bucket, limit in bucket_limits:
                        hits = [hit for hit in auth_hits.get(bucket, []) if hit >= window_start]
                        active_buckets.append((bucket, hits))
                        if len(hits) >= limit:
                            retry_after = max(
                                retry_after,
                                max(1, int(auth_window - (now - hits[0]))),
                            )
                    if retry_after:
                        for bucket, hits in active_buckets:
                            auth_hits[bucket] = hits
                        return Response(
                            json.dumps({"error": "Too many email requests. Please wait and try again."}),
                            status_code=429,
                            media_type="application/json",
                            headers={"Retry-After": str(retry_after)},
                        )
                    for bucket, hits in active_buckets:
                        hits.append(now)
                        auth_hits[bucket] = hits
        if (
            generation_limit > 0
            and request.method == "POST"
            and request.url.path in generation_paths
        ):
            key, host = _rate_limit_client_key(request)
            if key not in exempt_hosts:
                now = time.monotonic()
                window_start = now - generation_window
                with lock:
                    if len(generation_hits) > 10000:
                        for stale_key in [k for k, v in generation_hits.items() if not v or v[-1] < window_start]:
                            generation_hits.pop(stale_key, None)
                    hits = [hit for hit in generation_hits.get(key, []) if hit >= window_start]
                    if len(hits) >= generation_limit:
                        retry_after = max(1, int(generation_window - (now - hits[0])))
                        generation_hits[key] = hits
                        return Response(
                            json.dumps({"error": "Too many requests. Please wait a moment and try again."}),
                            status_code=429,
                            media_type="application/json",
                            headers={"Retry-After": str(retry_after)},
                        )
                    hits.append(now)
                    generation_hits[key] = hits
        return await call_next(request)
