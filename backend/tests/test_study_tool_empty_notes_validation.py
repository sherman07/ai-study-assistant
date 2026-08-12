"""Contract: empty study-tool generate requests return actionable 400s before AI gates."""

import unittest

from fastapi.testclient import TestClient

from backend.app import app


class StudyToolEmptyNotesValidationTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_quiz_without_notes_returns_400(self):
        response = self.client.post("/quiz/generate", json={})
        self.assertEqual(response.status_code, 400)
        self.assertIn("quiz", response.json()["error"].lower())

    def test_flashcards_without_notes_returns_400(self):
        response = self.client.post("/flashcards/generate", json={})
        self.assertEqual(response.status_code, 400)
        self.assertIn("flashcard", response.json()["error"].lower())

    def test_timeline_without_notes_returns_400(self):
        response = self.client.post("/timeline/generate", json={})
        self.assertEqual(response.status_code, 400)
        self.assertIn("timeline", response.json()["error"].lower())


if __name__ == "__main__":
    unittest.main()
