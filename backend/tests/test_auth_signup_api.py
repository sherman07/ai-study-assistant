import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

from backend import app as backend_app_module
from backend.app import app


class FakeSupabaseResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}
        self.text = text or "{}"

    def json(self):
        return self._payload


def signup_payload(email="New.User@Example.com", password="Strongpass1", confirm_password="Strongpass1"):
    return {
        "firstName": "New",
        "lastName": "User",
        "email": email,
        "role": "student",
        "password": password,
        "confirmPassword": confirm_password,
        "termsAccepted": True,
        "redirectTo": "http://localhost:5176/frontend/verify.html",
    }


class AuthSignupApiTests(unittest.TestCase):
    def setUp(self):
        self.previous_supabase_url = backend_app_module.SUPABASE_URL
        self.previous_anon_key = backend_app_module.SUPABASE_ANON_KEY
        self.previous_service_key = backend_app_module.SUPABASE_SERVICE_ROLE_KEY
        self.previous_smtp_host = backend_app_module.SYNAPSE_SMTP_HOST
        self.previous_smtp_from_email = backend_app_module.SYNAPSE_SMTP_FROM_EMAIL
        self.previous_smtp_security = backend_app_module.SYNAPSE_SMTP_SECURITY
        backend_app_module.SUPABASE_URL = "https://project.supabase.co"
        backend_app_module.SUPABASE_ANON_KEY = "anon-key"
        backend_app_module.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
        backend_app_module.SYNAPSE_SMTP_HOST = "smtp.example.com"
        backend_app_module.SYNAPSE_SMTP_FROM_EMAIL = "noreply@example.com"
        backend_app_module.SYNAPSE_SMTP_SECURITY = "starttls"
        self.mailer_patcher = patch("backend.app.send_synapse_auth_email")
        self.mailer_mock = self.mailer_patcher.start()
        self.client = TestClient(app)

    def tearDown(self):
        backend_app_module.SUPABASE_URL = self.previous_supabase_url
        backend_app_module.SUPABASE_ANON_KEY = self.previous_anon_key
        backend_app_module.SUPABASE_SERVICE_ROLE_KEY = self.previous_service_key
        backend_app_module.SYNAPSE_SMTP_HOST = self.previous_smtp_host
        backend_app_module.SYNAPSE_SMTP_FROM_EMAIL = self.previous_smtp_from_email
        backend_app_module.SYNAPSE_SMTP_SECURITY = self.previous_smtp_security
        self.mailer_patcher.stop()

    def test_new_email_creates_account_and_reports_confirmation_sent(self):
        def fake_get(*args, **kwargs):
            return FakeSupabaseResponse(payload={"users": []})

        def fake_post(url, **kwargs):
            self.assertTrue(url.endswith("/auth/v1/admin/generate_link"))
            self.assertEqual(kwargs["json"]["type"], "signup")
            self.assertEqual(kwargs["json"]["email"], "new.user@example.com")
            self.assertEqual(kwargs["json"]["data"]["plan"], "free")
            self.assertEqual(kwargs["json"]["redirect_to"], "http://localhost:5176/frontend/verify.html")
            return FakeSupabaseResponse(payload={
                "action_link": "https://project.supabase.co/auth/v1/verify?token=signup&type=signup",
                "user": {"id": "user-1", "email": "new.user@example.com"},
            })

        with patch("backend.app.requests.get", side_effect=fake_get), patch("backend.app.requests.post", side_effect=fake_post):
            response = self.client.post("/api/auth/signup", json=signup_payload())

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["state"], "created_confirmation_sent")
        self.assertEqual(data["email"], "new.user@example.com")

    def test_new_email_uses_supabase_admin_link_and_synapse_delivery(self):
        def fake_post(url, **kwargs):
            self.assertTrue(url.endswith("/auth/v1/admin/generate_link"))
            self.assertEqual(kwargs["json"]["type"], "signup")
            self.assertEqual(kwargs["json"]["email"], "new.user@example.com")
            self.assertEqual(kwargs["json"]["redirect_to"], "http://localhost:5176/frontend/verify.html")
            return FakeSupabaseResponse(
                payload={
                    "action_link": "https://project.supabase.co/auth/v1/verify?token=signup&type=signup",
                    "user": {"id": "user-1", "email": "new.user@example.com"},
                }
            )

        with (
            patch.object(backend_app_module, "SYNAPSE_SMTP_HOST", "smtp.example.com"),
            patch.object(backend_app_module, "SYNAPSE_SMTP_FROM_EMAIL", "noreply@example.com"),
            patch.object(backend_app_module, "SYNAPSE_SMTP_SECURITY", "starttls"),
            patch("backend.app.requests.get", return_value=FakeSupabaseResponse(payload={"users": []})),
            patch("backend.app.requests.post", side_effect=fake_post),
            patch("backend.app.send_synapse_auth_email") as send_email,
        ):
            response = self.client.post("/api/auth/signup", json=signup_payload())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["state"], "created_confirmation_sent")
        send_email.assert_called_once()

    def test_existing_confirmed_email_returns_login_action(self):
        existing = {
            "id": "user-1",
            "email": "student@example.com",
            "email_confirmed_at": "2026-07-01T00:00:00Z",
        }

        with patch("backend.app.requests.get", return_value=FakeSupabaseResponse(payload={"users": [existing]})):
            response = self.client.post("/api/auth/signup", json=signup_payload(email="STUDENT@example.com"))

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["state"], "existing_confirmed")
        self.assertIn("login", data["actions"])
        self.assertIn("forgot_password", data["actions"])

    def test_existing_unconfirmed_email_returns_resend_action(self):
        existing = {
            "id": "user-1",
            "email": "pending@example.com",
            "confirmation_sent_at": "2026-07-01T00:00:00Z",
        }

        with patch("backend.app.requests.get", return_value=FakeSupabaseResponse(payload={"users": [existing]})):
            response = self.client.post("/api/auth/signup", json=signup_payload(email="pending@example.com"))

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["state"], "existing_unconfirmed")
        self.assertIn("resend_confirmation", data["actions"])

    def test_existing_email_lookup_continues_past_first_admin_page(self):
        first_page_users = [{"id": f"user-{index}", "email": f"user{index}@example.com"} for index in range(1000)]
        confirmed = {
            "id": "user-target",
            "email": "target@example.com",
            "email_confirmed_at": "2026-07-01T00:00:00Z",
        }

        with patch("backend.app.requests.get", side_effect=[
            FakeSupabaseResponse(payload={"users": first_page_users}),
            FakeSupabaseResponse(payload={"users": [confirmed]}),
        ]):
            response = self.client.post("/api/auth/signup", json=signup_payload(email="target@example.com"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["state"], "existing_confirmed")

    def test_password_mismatch_returns_field_error(self):
        response = self.client.post(
            "/api/auth/signup",
            json=signup_payload(password="Strongpass1", confirm_password="Strongpass2"),
        )

        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertEqual(data["state"], "validation_error")
        self.assertIn("confirmPassword", data["errors"])

    def test_short_email_name_is_allowed_inside_otherwise_strong_password(self):
        with (
            patch("backend.app.requests.get", return_value=FakeSupabaseResponse(payload={"users": []})),
            patch("backend.app.requests.post", return_value=FakeSupabaseResponse(payload={
                "action_link": "https://project.supabase.co/auth/v1/verify?token=signup&type=signup",
                "user": {"id": "user-1", "email": "me@example.com"},
            })),
        ):
            response = self.client.post(
                "/api/auth/signup",
                json=signup_payload(email="me@example.com", password="meStrong1", confirm_password="meStrong1"),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["state"], "created_confirmation_sent")

    def test_terms_unchecked_blocks_signup(self):
        payload = signup_payload()
        payload["termsAccepted"] = False

        response = self.client.post("/api/auth/signup", json=payload)

        self.assertEqual(response.status_code, 422)
        self.assertIn("terms", response.json()["errors"])

    def test_supabase_signup_failure_returns_clean_message(self):
        with (
            patch("backend.app.requests.get", return_value=FakeSupabaseResponse(payload={"users": []})),
            patch("backend.app.requests.post", return_value=FakeSupabaseResponse(500, text="smtp server exploded with private detail")),
        ):
            response = self.client.post("/api/auth/signup", json=signup_payload())

        self.assertEqual(response.status_code, 502)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["state"], "signup_failed")
        self.assertNotIn("private detail", data["message"])

    def test_signup_rewrites_confirmation_link_onto_frontend_verify_page(self):
        def fake_post(url, **kwargs):
            self.assertTrue(url.endswith("/auth/v1/admin/generate_link"))
            return FakeSupabaseResponse(
                payload={
                    "action_link": "https://project.supabase.co/auth/v1/verify?token=raw&type=signup&redirect_to=http%3A%2F%2Flocalhost",
                    "hashed_token": "signup-token-hash",
                    "verification_type": "signup",
                    "user": {"id": "user-1", "email": "new.user@example.com"},
                }
            )

        with (
            patch("backend.app.requests.get", return_value=FakeSupabaseResponse(payload={"users": []})),
            patch("backend.app.requests.post", side_effect=fake_post),
            patch("backend.app.send_synapse_signup_confirmation_email") as send_email,
        ):
            response = self.client.post("/api/auth/signup", json=signup_payload())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["state"], "created_confirmation_sent")
        send_email.assert_called_once()
        _recipient, public_link = send_email.call_args.args
        parsed = urlparse(public_link)
        fragment = parse_qs(parsed.fragment)
        self.assertTrue(parsed.path.endswith("/verify.html"))
        self.assertEqual(fragment.get("token_hash"), ["signup-token-hash"])
        self.assertEqual(fragment.get("type"), ["signup"])
        self.assertIn("/frontend/verify.html#", public_link)

    def test_hosted_backend_never_emails_localhost_confirmation_links(self):
        payload = signup_payload()
        payload["redirectTo"] = "http://localhost:5176/frontend/verify.html"

        def fake_post(url, **kwargs):
            self.assertEqual(
                kwargs["json"]["redirect_to"],
                "https://synapse-ai-study-assistant-tutor.vercel.app/frontend/verify.html",
            )
            return FakeSupabaseResponse(
                payload={
                    "hashed_token": "prod-token",
                    "verification_type": "signup",
                    "user": {"id": "user-1", "email": "new.user@example.com"},
                }
            )

        with (
            patch.object(backend_app_module, "SYNAPSE_FRONTEND_BASE_URL", "http://localhost:5176/frontend"),
            patch.object(
                backend_app_module,
                "SYNAPSE_PUBLIC_BACKEND_URL",
                "https://synapse-ai-backend-idnc.onrender.com",
            ),
            patch.object(
                backend_app_module,
                "SYNAPSE_CANONICAL_FRONTEND_BASE_URL",
                "https://synapse-ai-study-assistant-tutor.vercel.app/frontend",
            ),
            patch("backend.app.requests.get", return_value=FakeSupabaseResponse(payload={"users": []})),
            patch("backend.app.requests.post", side_effect=fake_post),
            patch("backend.app.send_synapse_signup_confirmation_email") as send_email,
        ):
            response = self.client.post("/api/auth/signup", json=payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["state"], "created_confirmation_sent")
        _recipient, public_link = send_email.call_args.args
        self.assertTrue(
            public_link.startswith(
                "https://synapse-ai-study-assistant-tutor.vercel.app/frontend/verify.html#"
            )
        )

    def test_resend_confirmation_for_pending_account(self):
        existing = {
            "id": "user-1",
            "email": "pending@example.com",
            "confirmation_sent_at": "2026-07-01T00:00:00Z",
        }

        def fake_post(url, **kwargs):
            self.assertTrue(url.endswith("/auth/v1/admin/generate_link"))
            self.assertEqual(kwargs["json"]["type"], "invite")
            self.assertEqual(kwargs["json"]["email"], "pending@example.com")
            self.assertEqual(kwargs["json"]["redirect_to"], "http://localhost:5176/frontend/verify.html")
            return FakeSupabaseResponse(payload={
                "action_link": "https://project.supabase.co/auth/v1/verify?token=invite&type=invite",
            })

        with (
            patch("backend.app.requests.get", return_value=FakeSupabaseResponse(payload={"users": [existing]})),
            patch("backend.app.requests.post", side_effect=fake_post),
        ):
            response = self.client.post(
                "/api/auth/resend-confirmation",
                json={"email": "pending@example.com", "redirectTo": "http://localhost:5176/frontend/verify.html"},
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["state"], "confirmation_resent")

    def test_password_reset_endpoint_requires_synapse_email_delivery_config(self):
        with (
            patch.object(backend_app_module, "SYNAPSE_SMTP_HOST", ""),
            patch.object(backend_app_module, "SYNAPSE_SMTP_FROM_EMAIL", ""),
        ):
            response = self.client.post(
                "/api/auth/request-password-reset",
                json={
                    "email": "student@example.com",
                    "redirectTo": "http://localhost:5176/frontend/reset-password.html",
                },
            )

        self.assertEqual(response.status_code, 503)
        data = response.json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["state"], "email_not_configured")

    def test_password_reset_generates_public_recovery_link_and_sends_synapse_email(self):
        recovery_link = "https://project.supabase.co/auth/v1/verify?token=one-time&type=recovery"

        def fake_post(url, **kwargs):
            self.assertTrue(url.endswith("/auth/v1/admin/generate_link"))
            self.assertEqual(kwargs["json"]["type"], "recovery")
            self.assertEqual(kwargs["json"]["email"], "student@example.com")
            self.assertEqual(
                kwargs["json"]["redirect_to"],
                "https://synapse-ai-study-assistant-tutor.vercel.app/frontend/reset-password.html",
            )
            return FakeSupabaseResponse(
                payload={
                    "action_link": recovery_link,
                    "hashed_token": "one-time-token-hash",
                    "verification_type": "recovery",
                }
            )

        with (
            patch.object(backend_app_module, "SYNAPSE_SMTP_HOST", "smtp.example.com"),
            patch.object(backend_app_module, "SYNAPSE_SMTP_FROM_EMAIL", "noreply@example.com"),
            patch.object(backend_app_module, "SYNAPSE_SMTP_SECURITY", "starttls"),
            patch.object(
                backend_app_module,
                "SYNAPSE_FRONTEND_BASE_URL",
                "https://synapse-ai-study-assistant-tutor.vercel.app/frontend",
            ),
            patch("backend.app.requests.post", side_effect=fake_post),
            patch("backend.app.send_synapse_password_reset_email") as send_email,
        ):
            response = self.client.post(
                "/api/auth/request-password-reset",
                json={
                    "email": "student@example.com",
                    "redirectTo": "https://synapse-ai-study-assistant-tutor.vercel.app/frontend/reset-password.html",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["state"], "password_reset_requested")
        send_email.assert_called_once()
        recipient, public_link = send_email.call_args.args
        parsed_link = urlparse(public_link)
        link_fragment = parse_qs(parsed_link.fragment)
        self.assertEqual(recipient, "student@example.com")
        self.assertEqual(
            f"{parsed_link.scheme}://{parsed_link.netloc}{parsed_link.path}",
            "https://synapse-ai-study-assistant-tutor.vercel.app/frontend/reset-password.html",
        )
        self.assertEqual(parsed_link.query, "")
        self.assertEqual(link_fragment["token_hash"], ["one-time-token-hash"])
        self.assertEqual(link_fragment["type"], ["recovery"])
        self.assertNotIn("project.supabase.co", public_link)


if __name__ == "__main__":
    unittest.main()
