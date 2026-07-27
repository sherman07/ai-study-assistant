import asyncio
import urllib.request
import unittest
import warnings
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import app as backend_app_module
from backend.app import app
from backend.app import PublicURLRedirectHandler


class AuxiliaryEndpointErrorStatusTests(unittest.TestCase):
    def setUp(self):
        self.previous_stored_summary = backend_app_module.stored_summary
        self.previous_stored_sections = backend_app_module.stored_sections
        backend_app_module.stored_summary = "Stale summary from a previous analysis"
        backend_app_module.stored_sections = {"Private": "Stale private section text"}

    def tearDown(self):
        backend_app_module.stored_summary = self.previous_stored_summary
        backend_app_module.stored_sections = self.previous_stored_sections

    def test_context_required_auxiliary_routes_return_http_400(self):
        client = TestClient(app)
        cases = [
            ("post", "/ask", {"question": "Explain this."}),
            ("post", "/timeline/generate", {}),
            ("post", "/quiz/generate", {}),
            ("post", "/flashcards/generate", {}),
            ("post", "/broadcast/generate", {}),
        ]

        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.generate_chat", side_effect=AssertionError("model should not be called without request context")),
        ):
            for method, path, payload in cases:
                response = getattr(client, method)(path, json=payload)
                self.assertEqual(response.status_code, 400, path)
                self.assertIn("application/json", response.headers.get("content-type", ""))
                self.assertIn("error", response.json())

    def test_voice_tutor_missing_context_returns_http_400(self):
        with patch("backend.app.require_text_ai"):
            response = TestClient(app).post("/voice-tutor/respond", data={})

        self.assertEqual(response.status_code, 400)
        self.assertIn("application/json", response.headers.get("content-type", ""))
        self.assertIn("error", response.json())


class ToolPromptIsolationTests(unittest.TestCase):
    def setUp(self):
        self.previous_stored_title = backend_app_module.stored_title
        backend_app_module.stored_title = "Other User Private Notes"

    def tearDown(self):
        backend_app_module.stored_title = self.previous_stored_title

    def test_timeline_prompt_does_not_use_stale_global_title(self):
        def fake_generate_chat(messages, **kwargs):
            prompt = messages[-1]["content"]
            self.assertNotIn("Other User Private Notes", prompt)
            self.assertIn("Study Path", prompt)
            return '{"title":"Study Path","summary":"Plan","events":[]}'

        with patch("backend.app.require_text_ai"), patch("backend.app.generate_chat", side_effect=fake_generate_chat):
            payload = asyncio.run(backend_app_module.generate_timeline({
                "summary": "This note explains evidence, concepts, and revision priorities.",
                "sections": {"Overview": "This note explains evidence and concepts."},
            }))

        self.assertNotIn("error", payload)


    def test_timeline_generation_uses_warning_free_utc_timestamp(self):
        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.generate_chat", return_value='{"title":"Study Path","summary":"Plan","events":[]}'),
            warnings.catch_warnings(record=True) as caught,
        ):
            warnings.simplefilter("always", DeprecationWarning)
            payload = asyncio.run(backend_app_module.generate_timeline({
                "summary": "This note explains evidence, concepts, and revision priorities.",
                "sections": {"Overview": "This note explains evidence and concepts."},
            }))

        self.assertNotIn("error", payload)
        self.assertFalse(
            any("utcnow" in str(item.message).lower() for item in caught),
            [str(item.message) for item in caught],
        )

    def test_quiz_prompt_does_not_use_stale_global_title(self):
        def fake_generate_chat(messages, **kwargs):
            prompt = messages[-1]["content"]
            self.assertNotIn("Other User Private Notes", prompt)
            self.assertIn("Study Quiz", prompt)
            return '{"title":"Study Quiz","questions":[]}'

        with patch("backend.app.require_text_ai"), patch("backend.app.generate_chat", side_effect=fake_generate_chat):
            payload = asyncio.run(backend_app_module.generate_quiz({
                "summary": "This note explains evidence, concepts, and revision priorities.",
                "sections": {"Overview": "This note explains evidence and concepts."},
            }))

        self.assertNotIn("error", payload)

    def test_flashcard_prompt_does_not_use_stale_global_title(self):
        def fake_generate_chat(messages, **kwargs):
            prompt = messages[-1]["content"]
            self.assertNotIn("Other User Private Notes", prompt)
            self.assertIn("Study Flashcards", prompt)
            return '{"title":"Study Flashcards","cards":[]}'

        with patch("backend.app.require_text_ai"), patch("backend.app.generate_chat", side_effect=fake_generate_chat):
            payload = asyncio.run(backend_app_module.generate_flashcards({
                "summary": "This note explains evidence, concepts, and revision priorities.",
                "sections": {"Overview": "This note explains evidence and concepts."},
            }))

        self.assertNotIn("error", payload)


class PublicFetchRedirectSecurityTests(unittest.TestCase):
    def test_redirect_handler_rejects_private_destination(self):
        handler = PublicURLRedirectHandler()
        request = urllib.request.Request("https://public.example/source")

        with self.assertRaises(ValueError):
            handler.redirect_request(
                request,
                None,
                302,
                "Found",
                {"Location": "http://127.0.0.1:8001/internal"},
                "http://127.0.0.1:8001/internal",
            )

    def test_urlopen_rejects_private_initial_destination(self):
        with self.assertRaises(ValueError):
            backend_app_module.urlopen_bytes("http://127.0.0.1:8001/internal", timeout=1)


if __name__ == "__main__":
    unittest.main()
