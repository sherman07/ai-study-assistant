import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import app


class HealthOpenAIProbeTests(unittest.TestCase):
    def test_openai_health_does_not_call_model_by_default(self):
        with (
            patch("backend.app.require_text_ai") as require_text_ai,
            patch("backend.app.generate_chat", return_value="OK") as generate_chat,
        ):
            response = TestClient(app).get("/health/openai")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertFalse(payload["probe"])
        require_text_ai.assert_called_once()
        generate_chat.assert_not_called()

    def test_openai_health_probe_query_calls_model_once(self):
        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.generate_chat", return_value="OK") as generate_chat,
        ):
            response = TestClient(app).get("/health/openai?probe=true")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertTrue(payload["probe"])
        self.assertEqual(payload["reply"], "OK")
        generate_chat.assert_called_once()

    def test_openai_health_probe_provider_failure_is_unavailable_and_safe(self):
        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.generate_chat", side_effect=RuntimeError("private provider detail")),
        ):
            response = TestClient(app).get("/health/openai?probe=true")

        self.assertEqual(response.status_code, 503)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertNotIn("private provider detail", response.text)
        self.assertIn("health probe failed", payload["message"].lower())


class HealthDeepSeekProbeTests(unittest.TestCase):
    def test_deepseek_health_reports_a_safe_configuration_failure(self):
        with patch(
            "backend.app.set_request_text_provider",
            side_effect=RuntimeError("DeepSeek is not configured. private key detail"),
        ):
            response = TestClient(app).get("/health/deepseek")

        self.assertEqual(response.status_code, 503)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["provider"], "deepseek")
        self.assertNotIn("private key detail", response.text)
        self.assertIn("deepseek", payload["message"].lower())

    def test_deepseek_health_probe_uses_the_deepseek_request_context(self):
        request_token = object()
        with (
            patch("backend.app.set_request_text_provider", return_value=request_token) as select_provider,
            patch("backend.app.require_text_ai") as require_text_ai,
            patch("backend.app.chat_model_for_active_provider", return_value="deepseek-v4-flash"),
            patch("backend.app.generate_chat", return_value="OK") as generate_chat,
            patch("backend.app.reset_request_text_provider") as reset_provider,
        ):
            response = TestClient(app).get("/health/deepseek?probe=true")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "status": "ok",
                "provider": "deepseek",
                "model": "deepseek-v4-flash",
                "probe": True,
                "reply": "OK",
            },
        )
        select_provider.assert_called_once_with("deepseek")
        require_text_ai.assert_called_once()
        generate_chat.assert_called_once()
        reset_provider.assert_called_once_with(request_token)

    def test_deepseek_health_probe_rejects_an_empty_model_reply(self):
        request_token = object()
        with (
            patch("backend.app.set_request_text_provider", return_value=request_token),
            patch("backend.app.require_text_ai"),
            patch("backend.app.chat_model_for_active_provider", return_value="deepseek-v4-flash"),
            patch("backend.app.generate_chat", return_value="") as generate_chat,
            patch("backend.app.reset_request_text_provider") as reset_provider,
        ):
            response = TestClient(app).get("/health/deepseek?probe=true")

        self.assertEqual(response.status_code, 503)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["provider"], "deepseek")
        generate_chat.assert_called_once_with(
            [{"role": "user", "content": "Reply with OK only."}],
            model="deepseek-v4-flash",
            temperature=0,
            max_tokens=16,
            provider_options={"thinking": {"type": "disabled"}},
        )
        reset_provider.assert_called_once_with(request_token)


if __name__ == "__main__":
    unittest.main()
