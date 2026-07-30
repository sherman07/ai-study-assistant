"""Thursday QA: account deletion honesty and contact webhook delivery status."""

import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import app as backend_app_module
from backend.app import app


class FakeResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}
        self.text = text or "{}"

    def json(self):
        return self._payload


class AccountContactBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.temp_dir = tempfile.TemporaryDirectory()
        self.runtime = Path(self.temp_dir.name)
        self.previous_assets = backend_app_module.RUNTIME_ASSETS_DIR
        backend_app_module.RUNTIME_ASSETS_DIR = self.runtime / "assets"
        backend_app_module.RUNTIME_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
        self.previous_supabase_url = backend_app_module.SUPABASE_URL
        self.previous_service_key = backend_app_module.SUPABASE_SERVICE_ROLE_KEY
        self.previous_anon = backend_app_module.SUPABASE_ANON_KEY
        backend_app_module.SUPABASE_URL = "https://project.supabase.co"
        backend_app_module.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
        backend_app_module.SUPABASE_ANON_KEY = "anon-key"

    def tearDown(self):
        backend_app_module.RUNTIME_ASSETS_DIR = self.previous_assets
        backend_app_module.SUPABASE_URL = self.previous_supabase_url
        backend_app_module.SUPABASE_SERVICE_ROLE_KEY = self.previous_service_key
        backend_app_module.SUPABASE_ANON_KEY = self.previous_anon
        self.temp_dir.cleanup()

    def test_account_delete_requires_confirm(self):
        with patch("backend.app.require_verified_user", return_value={"id": "user-1", "email": "a@example.com"}):
            response = self.client.post("/account/delete", json={})
        self.assertEqual(response.status_code, 422)
        self.assertIn("confirm", response.json().get("error", "").lower())

    def test_account_delete_returns_502_when_identity_delete_fails(self):
        def fake_delete(url, **kwargs):
            self.assertIn("/auth/v1/admin/users/user-1", url)
            return FakeResponse(status_code=500, payload={"message": "boom"})

        with (
            patch("backend.app.require_verified_user", return_value={"id": "user-1", "email": "a@example.com"}),
            patch("backend.app.get_billing_profile", return_value={}),
            patch("backend.app.synapse_database.delete_user_content", return_value=2),
            patch("backend.app.requests.delete", side_effect=fake_delete),
        ):
            response = self.client.post("/account/delete", json={"confirm": True})

        self.assertEqual(response.status_code, 502)
        data = response.json()
        self.assertFalse(data.get("ok"))
        self.assertIn("could not be deleted", data.get("error", "").lower())
        self.assertFalse(data["deletion"]["supabase_deleted"])
        self.assertEqual(data["deletion"]["generated_content_deleted"], 2)

    def test_account_delete_succeeds_when_identity_removed(self):
        with (
            patch("backend.app.require_verified_user", return_value={"id": "user-1", "email": "a@example.com"}),
            patch("backend.app.get_billing_profile", return_value={}),
            patch("backend.app.synapse_database.delete_user_content", return_value=1),
            patch("backend.app.requests.delete", return_value=FakeResponse(status_code=200)),
        ):
            response = self.client.post("/account/delete", json={"confirm": True})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("ok"))
        self.assertTrue(data["deletion"]["supabase_deleted"])

    def test_contact_webhook_http_error_does_not_claim_full_delivery(self):
        with patch.dict("os.environ", {"SYNAPSE_CONTACT_WEBHOOK_URL": "https://hooks.example/contact"}, clear=False):
            with patch(
                "backend.app.requests.post",
                return_value=SimpleNamespace(status_code=502, text="bad gateway"),
            ):
                response = self.client.post(
                    "/contact",
                    json={
                        "name": "Student",
                        "email": "student@example.com",
                        "interest": "support",
                        "message": "Please help with my study workflow.",
                    },
                )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("ok"))
        self.assertFalse(data.get("delivered"))
        self.assertIn("webhook", data.get("message", "").lower())
        contact_path = backend_app_module.RUNTIME_ASSETS_DIR.parent / "contact_inquiries.jsonl"
        self.assertTrue(contact_path.exists())
        lines = contact_path.read_text(encoding="utf-8").strip().splitlines()
        self.assertEqual(len(lines), 1)
        self.assertEqual(json.loads(lines[0])["email"], "student@example.com")


if __name__ == "__main__":
    unittest.main()
