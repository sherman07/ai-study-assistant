"""Contract: empty visual-guide requests must not return misleading HTTP 200."""

import unittest

from fastapi.testclient import TestClient

from backend.app import app


class VisualGuideValidationTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_visual_guide_without_notes_returns_400(self):
        response = self.client.post("/visual-guide/generate", json={})
        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn("error", payload)
        self.assertIn("visual guide", payload["error"].lower())

    def test_visual_image_guide_without_notes_returns_400(self):
        response = self.client.post("/visual-image-guide/generate", json={})
        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn("error", payload)
        self.assertIn("visual image guide", payload["error"].lower())


if __name__ == "__main__":
    unittest.main()
