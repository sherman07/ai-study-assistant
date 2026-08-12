"""Contract: Learning Companion live route must honor persisted learning_context."""

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import app


class LearningCompanionContextTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_learning_context_shapes_subject_and_response(self):
        captured = {}

        def fake_generate_chat(messages, **kwargs):
            captured["prompt"] = messages[-1]["content"]
            return (
                '{"reply":"Continue with Behaviourism retrieval practice.",'
                '"state":"practice","mastery":40,"student_level":"developing",'
                '"diagnosis":"needs retrieval","next_prompt":"Explain one example.",'
                '"hint":"","exercise":null,"can_end":false,'
                '"suggested_actions":["Give me a hint"]}'
            )

        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.generate_chat", side_effect=fake_generate_chat),
            patch("backend.app.chat_model_for_active_provider", return_value="test-model"),
            patch("backend.app.active_text_provider", return_value="openai"),
        ):
            response = self.client.post(
                "/learning-companion/respond",
                json={
                    "message": "Help me revise the key idea.",
                    "messages": [],
                    "learning_context": {
                        "topic": "Behaviourism",
                        "goal": "Pass the quiz",
                        "student_level": "developing",
                        "active_subskill": "stimulus-response examples",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertNotIn("error", payload)
        self.assertEqual(payload["subject_title"], "Behaviourism")
        self.assertEqual(payload["learning_context"]["goal"], "Pass the quiz")
        self.assertEqual(payload["learning_context"]["active_subskill"], "stimulus-response examples")
        self.assertIn("Persisted learning context from Synapse", captured["prompt"])
        self.assertIn("Behaviourism", captured["prompt"])
        self.assertIn("Pass the quiz", captured["prompt"])


if __name__ == "__main__":
    unittest.main()
