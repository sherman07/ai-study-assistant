"""Request-size guards for /analyze uploads."""

from __future__ import annotations

import sys

from fastapi import Request
from fastapi.routing import APIRoute
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.config import (
    MAX_ANALYZE_FILES as _DEFAULT_MAX_ANALYZE_FILES,
    MAX_ANALYZE_TOTAL_UPLOAD_BYTES,
    env_int,
)

MAX_ANALYZE_REQUEST_BYTES = max(
    1,
    env_int(
        "MAX_ANALYZE_REQUEST_BYTES",
        MAX_ANALYZE_TOTAL_UPLOAD_BYTES + (_DEFAULT_MAX_ANALYZE_FILES * 64 * 1024) + (1024 * 1024),
    ),
)


def _app_module():
    return sys.modules.get("backend.app") or sys.modules.get("app")


def _limit(name: str, default):
    mod = _app_module()
    if mod is not None and hasattr(mod, name):
        return getattr(mod, name)
    return default


class AnalyzeRequestLimitMiddleware:
    """Reject oversized /analyze bodies before multipart parsing allocates them."""

    def __init__(self, app):
        self.app = app

    @staticmethod
    async def _send_too_large(send) -> None:
        body = b'{"error":"Analyze request body is too large."}'
        await send({
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode("ascii")),
            ],
        })
        await send({"type": "http.response.body", "body": body})

    async def __call__(self, scope, receive, send):
        if not (
            scope.get("type") == "http"
            and scope.get("method") == "POST"
            and scope.get("path") == "/analyze"
        ):
            return await self.app(scope, receive, send)

        max_bytes = int(_limit("MAX_ANALYZE_REQUEST_BYTES", MAX_ANALYZE_REQUEST_BYTES))
        headers = {
            name.lower(): value
            for name, value in scope.get("headers", ())
        }
        declared_length = headers.get(b"content-length")
        if declared_length is not None:
            try:
                if int(declared_length) > max_bytes:
                    return await self._send_too_large(send)
            except (TypeError, ValueError):
                pass

        received_bytes = 0

        async def limited_receive():
            nonlocal received_bytes
            message = await receive()
            if message.get("type") == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > max_bytes:
                    raise _AnalyzeRequestTooLarge
            return message

        try:
            return await self.app(scope, limited_receive, send)
        except _AnalyzeRequestTooLarge:
            return await self._send_too_large(send)


class _AnalyzeRequestTooLarge(Exception):
    pass


class AnalyzeMultipartLimitRoute(APIRoute):
    """Apply the analyze file ceiling inside Starlette's multipart parser."""

    def get_route_handler(self):
        route_handler = super().get_route_handler()

        async def capped_route_handler(request: Request):
            if self.path == "/analyze":
                max_files = int(_limit("MAX_ANALYZE_FILES", _DEFAULT_MAX_ANALYZE_FILES))
                try:
                    await request.form(max_files=max_files)
                except StarletteHTTPException as exc:
                    if exc.status_code == 400 and str(exc.detail).startswith("Too many files."):
                        exc.status_code = 413
                    raise
            return await route_handler(request)

        return capped_route_handler
