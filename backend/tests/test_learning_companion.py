import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import app


class LearningCompanionEndpointTests(unittest.TestCase):
    def test_companion_defaults_blank_intention_to_skill_when_subject_title_is_present(self):
        model_reply = '{"reply":"What kind of photos do you want to make?","state":"diagnose","mastery":0}'
        with patch("backend.app.require_text_ai"), patch("backend.app.generate_chat", return_value=model_reply):
            response = TestClient(app).post("/learning-companion/respond", json={
                "subject": {"title": "Photography"},
                "message": "Teach me aperture",
                "messages": [],
            })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["intention"], "skill")
        self.assertEqual(response.json()["subject_title"], "Photography")

    def test_companion_accepts_a_first_free_text_message_without_a_subject(self):
        model_reply = '{"reply":"What kind of photos do you want to make?","state":"diagnose","mastery":0}'
        with patch("backend.app.require_text_ai"), patch("backend.app.generate_chat", return_value=model_reply):
            response = TestClient(app).post("/learning-companion/respond", json={
                "message": "I want to learn photography",
                "messages": [],
            })

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["intention"], "skill")
        self.assertIn("photo", payload["subject_title"].lower())

    def test_companion_returns_a_typed_tutor_decision_without_web_research_by_default(self):
        model_reply = '''{
          "reply": "Great choice. In one sentence, what do you think aperture changes in a photo?",
          "state": "diagnose",
          "mastery": 0,
          "student_level": "unclear",
          "diagnosis": "Needs a starting baseline.",
          "next_prompt": "What do you think aperture changes?",
          "hint": "Think about light and background blur.",
          "exercise": {"type": "explain", "question": "What does aperture change?", "expected_answer": "Light and depth of field."},
          "can_end": false,
          "suggested_actions": ["Give me a hint"]
        }'''

        with patch("backend.app.require_text_ai"), patch("backend.app.generate_chat", return_value=model_reply):
            response = TestClient(app).post("/learning-companion/respond", json={
                "subject": {"title": "Photography", "intention": "hobby", "goal": "Control motion and light"},
                "available_time_minutes": 20,
                "message": "Teach me aperture in plain English.",
                "messages": [],
            })

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["state"], "diagnose")
        self.assertFalse(payload["requires_research"])
        self.assertEqual(payload["research_query"], "")
        self.assertIn("aperture", payload["reply"].lower())
        self.assertIn("suggested_tools", payload)
        self.assertIsInstance(payload["suggested_tools"], list)

    def test_companion_returns_suggested_tools_when_learner_asks_for_quiz(self):
        model_reply = '''{
          "reply": "Great — I can quiz you on aperture once we confirm one point.",
          "state": "practice",
          "mastery": 20,
          "suggested_actions": ["Ask a simpler question"],
          "suggested_tools": [{"id":"quiz","label":"Quiz me","reason":"Learner asked for a quiz"}]
        }'''
        with patch("backend.app.require_text_ai"), patch("backend.app.generate_chat", return_value=model_reply):
            response = TestClient(app).post("/learning-companion/respond", json={
                "subject": {"title": "Photography", "intention": "skill"},
                "message": "Quiz me on aperture",
                "messages": [],
            })

        self.assertEqual(response.status_code, 200)
        tools = response.json()["suggested_tools"]
        self.assertTrue(any(tool["id"] == "quiz" for tool in tools))

    def test_companion_infers_flashcards_tool_when_model_omits_it(self):
        model_reply = '{"reply":"I can turn this into flashcards.","state":"practice","mastery":25}'
        with patch("backend.app.require_text_ai"), patch("backend.app.generate_chat", return_value=model_reply):
            response = TestClient(app).post("/learning-companion/respond", json={
                "subject": {"title": "Photography", "intention": "skill"},
                "message": "Make flashcards from what we covered",
                "messages": [],
            })

        self.assertEqual(response.status_code, 200)
        tools = response.json()["suggested_tools"]
        self.assertTrue(any(tool["id"] == "flashcards" for tool in tools))

    def test_companion_rejects_invalid_learning_intentions_before_model_invocation(self):
        with patch("backend.app.require_text_ai"), patch("backend.app.generate_chat", side_effect=AssertionError("model should not run")):
            response = TestClient(app).post("/learning-companion/respond", json={
                "subject": {"title": "Photography", "intention": "generic"},
                "message": "Teach me aperture",
            })

        self.assertEqual(response.status_code, 400)
        self.assertIn("intention", response.json()["error"].lower())

    def test_companion_uses_sourced_research_only_for_time_sensitive_questions(self):
        model_reply = '{"reply":"The current answer is sourced.","state":"teach","mastery":10}'
        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.gather_tutor_web_research", return_value=("Source 1: Camera Manual", [{"title": "Camera Manual", "url": "https://example.com/manual"}])) as research,
            patch("backend.app.generate_chat", return_value=model_reply),
        ):
            response = TestClient(app).post("/learning-companion/respond", json={
                "subject": {"title": "Photography", "intention": "skill"},
                "message": "What is the latest autofocus guidance?",
            })

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["requires_research"])
        self.assertEqual(response.json()["research_sources"], [{"title": "Camera Manual", "url": "https://example.com/manual"}])
        research.assert_called_once()


if __name__ == "__main__":
    unittest.main()
