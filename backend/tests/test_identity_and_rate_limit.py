import asyncio
import types
import unittest
import urllib.request
from unittest.mock import patch

from starlette.datastructures import Headers
from fastapi.testclient import TestClient

from backend import app as appmod


def make_request(headers):
    return types.SimpleNamespace(headers=Headers(headers))


class DemoAuthGateTests(unittest.TestCase):
    def test_user_id_header_does_not_impersonate_when_demo_auth_disabled(self):
        with patch.object(appmod, "SYNAPSE_ALLOW_LOCAL_DEMO_AUTH", False):
            identity = appmod.database_identity_from_request(
                make_request({"x-synapse-user-id": "victim-account-123"})
            )
        self.assertEqual(identity["auth_provider"], "anonymous")
        self.assertNotEqual(identity["auth_subject"], "victim-account-123")

    def test_user_id_header_is_trusted_only_when_demo_auth_enabled(self):
        with patch.object(appmod, "SYNAPSE_ALLOW_LOCAL_DEMO_AUTH", True):
            identity = appmod.database_identity_from_request(
                make_request({"x-synapse-user-id": "dev-account-123"})
            )
        self.assertEqual(identity["auth_provider"], "local_demo")
        self.assertEqual(identity["auth_subject"], "dev-account-123")

    def test_client_id_maps_to_self_scoped_anonymous_bucket(self):
        identity = appmod.database_identity_from_request(
            make_request({"x-synapse-client-id": "browser-client-abc"})
        )
        self.assertEqual(identity["auth_provider"], "anonymous")
        self.assertEqual(identity["auth_subject"], "browser-client-abc")


class GenerationRateLimitTests(unittest.TestCase):
    def test_generation_endpoint_rate_limits_a_single_client(self):
        client = TestClient(appmod.app)
        with patch.object(appmod, "GENERATION_RATE_LIMIT", 3), \
                patch.object(appmod, "_RATE_EXEMPT_HOSTS", set()):
            appmod._rate_limit_hits.clear()
            statuses = []
            for _ in range(4):
                response = client.post(
                    "/analyze",
                    data={},
                    headers={"X-Forwarded-For": "198.51.100.7"},
                )
                statuses.append(response.status_code)
            appmod._rate_limit_hits.clear()
        # The empty payload is rejected with 400 until the limit is exceeded,
        # after which the limiter short-circuits with 429.
        self.assertNotIn(429, statuses[:3])
        self.assertEqual(statuses[-1], 429)

    def test_loopback_and_test_clients_are_exempt(self):
        client = TestClient(appmod.app)
        with patch.object(appmod, "GENERATION_RATE_LIMIT", 2):
            appmod._rate_limit_hits.clear()
            statuses = [client.post("/analyze", data={}).status_code for _ in range(4)]
            appmod._rate_limit_hits.clear()
        self.assertNotIn(429, statuses)


class PublicUrlRedirectSafetyTests(unittest.TestCase):
    class _Response:
        def __init__(self, url, body=b"public response", status=200, location=None):
            self._url = url
            self._body = body
            self.status = status
            self._location = location

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def geturl(self):
            return self._url

        def getheader(self, name):
            return self._location if name.lower() == "location" else None

        def read(self, _limit=None):
            return self._body

        def close(self):
            pass

    def test_urlopen_bytes_rejects_public_url_redirecting_to_private_target(self):
        request = urllib.request.Request("https://public.example/start")
        redirect = self._Response(
            "https://public.example/start",
            status=302,
            location="http://127.0.0.1/admin",
        )
        with (
            patch.object(
                appmod,
                "resolve_public_http_target",
                side_effect=[
                    ("https://public.example/start", "93.184.216.34"),
                    ValueError("fetch URL points to a private or local network address."),
                ],
            ),
            patch.object(appmod, "_open_pinned_http_response", return_value=redirect),
        ):
            with self.assertRaisesRegex(ValueError, "private or local"):
                appmod.urlopen_bytes(request)

    def test_urlopen_bytes_preserves_public_to_public_redirects(self):
        redirect = self._Response(
            "https://public.example/start",
            status=302,
            location="https://cdn.example/article",
        )
        response = self._Response("https://cdn.example/article", b"article")

        with (
            patch.object(
                appmod,
                "resolve_public_http_target",
                side_effect=[
                    ("https://public.example/start", "93.184.216.34"),
                    ("https://cdn.example/article", "93.184.216.35"),
                ],
            ),
            patch.object(
                appmod,
                "_open_pinned_http_response",
                side_effect=[redirect, response],
            ),
        ):
            body = appmod.urlopen_bytes(urllib.request.Request("https://public.example/start"))

        self.assertEqual(body, b"article")

    def test_urlopen_bytes_connects_to_the_address_validated_for_each_hop(self):
        response = types.SimpleNamespace(
            status=200,
            getheader=lambda _name: None,
            read=lambda _limit=None: b"pinned",
            close=lambda: None,
        )
        with (
            patch.object(
                appmod,
                "resolve_public_http_target",
                return_value=("https://public.example/article", "203.0.113.40"),
            ) as resolve_target,
            patch.object(appmod, "_open_pinned_http_response", return_value=response) as open_pinned,
        ):
            body = appmod.urlopen_bytes("https://public.example/article")

        self.assertEqual(body, b"pinned")
        resolve_target.assert_called_once_with("https://public.example/article", "fetch URL")
        self.assertEqual(open_pinned.call_args.args[1], "203.0.113.40")


class AuthEmailRateLimitTests(unittest.TestCase):
    def setUp(self):
        appmod._auth_email_rate_limit_hits.clear()
        self.client = TestClient(appmod.app)

    def tearDown(self):
        appmod._auth_email_rate_limit_hits.clear()

    @staticmethod
    def payload_for(path, email):
        if path == "/api/auth/signup":
            return {
                "name": "Rate Limit Test",
                "email": email,
                "password": "Strongpass1",
                "confirmPassword": "Strongpass1",
                "role": "student",
                "termsAccepted": True,
            }
        return {"email": email}

    def test_each_auth_email_endpoint_rate_limits_repeated_requests(self):
        paths = (
            "/api/auth/signup",
            "/api/auth/resend-confirmation",
            "/api/auth/request-password-reset",
        )
        with (
            patch.object(appmod, "AUTH_EMAIL_SOURCE_RATE_LIMIT", 1),
            patch.object(appmod, "AUTH_EMAIL_RECIPIENT_RATE_LIMIT", 1),
            patch.object(appmod, "_RATE_EXEMPT_HOSTS", set()),
        ):
            for path in paths:
                with self.subTest(path=path):
                    appmod._auth_email_rate_limit_hits.clear()
                    first = self.client.post(
                        path,
                        json=self.payload_for(path, "student@example.com"),
                        headers={"X-Forwarded-For": "198.51.100.8"},
                    )
                    limited = self.client.post(
                        path,
                        json=self.payload_for(path, "student@example.com"),
                        headers={"X-Forwarded-For": "198.51.100.8"},
                    )
                    self.assertNotEqual(first.status_code, 429)
                    self.assertEqual(limited.status_code, 429)
                    self.assertIn("Retry-After", limited.headers)

    def test_auth_email_limiter_enforces_source_and_normalized_recipient_buckets(self):
        with (
            patch.object(appmod, "AUTH_EMAIL_SOURCE_RATE_LIMIT", 2),
            patch.object(appmod, "AUTH_EMAIL_RECIPIENT_RATE_LIMIT", 2),
            patch.object(appmod, "TRUSTED_PROXY_HOPS", 1),
            patch.object(appmod, "_RATE_EXEMPT_HOSTS", set()),
        ):
            for email in ("one@example.com", "two@example.com"):
                response = self.client.post(
                    "/api/auth/request-password-reset",
                    json={"email": email},
                    headers={"X-Forwarded-For": "198.51.100.9"},
                )
                self.assertNotEqual(response.status_code, 429)
            source_limited = self.client.post(
                "/api/auth/request-password-reset",
                json={"email": "three@example.com"},
                headers={"X-Forwarded-For": "198.51.100.9"},
            )
            self.assertEqual(source_limited.status_code, 429)

            appmod._auth_email_rate_limit_hits.clear()
            for source in ("198.51.100.10", "198.51.100.11"):
                response = self.client.post(
                    "/api/auth/request-password-reset",
                    json={"email": "Student@Example.com"},
                    headers={"X-Forwarded-For": source},
                )
                self.assertNotEqual(response.status_code, 429)
            recipient_limited = self.client.post(
                "/api/auth/request-password-reset",
                json={"email": "student@example.com"},
                headers={"X-Forwarded-For": "198.51.100.12"},
            )
            self.assertEqual(recipient_limited.status_code, 429)

    def test_auth_email_source_limit_ignores_rotated_xff_by_default(self):
        with (
            patch.object(appmod, "AUTH_EMAIL_SOURCE_RATE_LIMIT", 1),
            patch.object(appmod, "AUTH_EMAIL_RECIPIENT_RATE_LIMIT", 10),
            patch.object(appmod, "TRUSTED_PROXY_HOPS", 0),
            patch.object(appmod, "_RATE_EXEMPT_HOSTS", set()),
        ):
            first = self.client.post(
                "/api/auth/request-password-reset",
                json={"email": "one@example.com"},
                headers={"X-Forwarded-For": "198.51.100.1"},
            )
            limited = self.client.post(
                "/api/auth/request-password-reset",
                json={"email": "two@example.com"},
                headers={"X-Forwarded-For": "198.51.100.2"},
            )

        self.assertNotEqual(first.status_code, 429)
        self.assertEqual(limited.status_code, 429)


class AnalyzeAggregateUploadLimitTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(appmod.app)

    def test_analyze_rejects_too_many_files_before_extraction(self):
        with patch.object(appmod, "MAX_ANALYZE_FILES", 1):
            response = self.client.post(
                "/analyze",
                files=[
                    ("files", ("one.txt", b"one", "text/plain")),
                    ("files", ("two.txt", b"two", "text/plain")),
                ],
            )

        self.assertEqual(response.status_code, 413)

    def test_analyze_parser_rejects_excess_file_before_spooling_it(self):
        with (
            patch.object(appmod, "MAX_ANALYZE_FILES", 1),
            patch(
                "starlette.formparsers.SpooledTemporaryFile",
                wraps=appmod.tempfile.SpooledTemporaryFile,
            ) as spooled_file,
        ):
            response = self.client.post(
                "/analyze",
                files=[
                    ("files", ("one.txt", b"one", "text/plain")),
                    ("files", ("two.txt", b"two", "text/plain")),
                ],
            )

        self.assertEqual(response.status_code, 413)
        self.assertEqual(spooled_file.call_count, 1)

    def test_analyze_rejects_aggregate_upload_bytes_over_limit(self):
        with (
            patch.object(appmod, "MAX_ANALYZE_FILES", 2),
            patch.object(appmod, "MAX_ANALYZE_TOTAL_UPLOAD_BYTES", 5),
            patch.object(appmod, "MAX_UPLOAD_BYTES", 10),
        ):
            response = self.client.post(
                "/analyze",
                files=[
                    ("files", ("one.txt", b"one", "text/plain")),
                    ("files", ("two.txt", b"two", "text/plain")),
                ],
            )

        self.assertEqual(response.status_code, 413)

    def test_analyze_accepts_aggregate_upload_bytes_at_exact_limit(self):
        with (
            patch.object(appmod, "MAX_ANALYZE_FILES", 2),
            patch.object(appmod, "MAX_ANALYZE_TOTAL_UPLOAD_BYTES", 6),
            patch.object(appmod, "MAX_UPLOAD_BYTES", 10),
        ):
            response = self.client.post(
                "/analyze",
                files=[
                    ("files", ("one.txt", b"one", "text/plain")),
                    ("files", ("two.txt", b"two", "text/plain")),
                ],
            )

        self.assertNotEqual(response.status_code, 413)

    def test_request_limit_rejects_declared_oversize_body_before_downstream(self):
        downstream_called = False

        async def downstream(_scope, _receive, _send):
            nonlocal downstream_called
            downstream_called = True

        middleware = appmod.AnalyzeRequestLimitMiddleware(downstream)
        messages = []

        async def receive():
            raise AssertionError("oversize Content-Length must be rejected before reading")

        async def send(message):
            messages.append(message)

        scope = {
            "type": "http",
            "method": "POST",
            "path": "/analyze",
            "headers": [(b"content-length", b"101"), (b"content-type", b"multipart/form-data; boundary=x")],
        }
        with patch.object(appmod, "MAX_ANALYZE_REQUEST_BYTES", 100):
            asyncio.run(middleware(scope, receive, send))

        self.assertFalse(downstream_called)
        self.assertEqual(messages[0]["status"], 413)

    def test_request_limit_caps_streamed_body_before_multipart_parser(self):
        downstream_called = False
        chunks = iter([
            {"type": "http.request", "body": b"a" * 60, "more_body": True},
            {"type": "http.request", "body": b"b" * 60, "more_body": False},
        ])

        async def downstream(_scope, _receive, _send):
            nonlocal downstream_called
            downstream_called = True

        async def receive():
            return next(chunks)

        messages = []

        async def send(message):
            messages.append(message)

        scope = {
            "type": "http",
            "method": "POST",
            "path": "/analyze",
            "headers": [(b"content-type", b"multipart/form-data; boundary=x")],
        }
        middleware = appmod.AnalyzeRequestLimitMiddleware(downstream)
        with patch.object(appmod, "MAX_ANALYZE_REQUEST_BYTES", 100):
            asyncio.run(middleware(scope, receive, send))

        self.assertFalse(downstream_called)
        self.assertEqual(messages[0]["status"], 413)


if __name__ == "__main__":
    unittest.main()
