"""Contract tests for analyze input validation (upload/links/webpage gates)."""

from __future__ import annotations

import asyncio
import json
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import analyze_materials, app


class AnalyzeInputValidationTests(unittest.TestCase):
    def test_invalid_links_json_returns_400(self):
        with patch("backend.app.require_text_ai"):
            response = TestClient(app).post(
                "/analyze",
                data={
                    "free_text": "enough pasted study text to analyze if links were ignored",
                    "links": "{not-json",
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("JSON array", response.json()["error"])

    def test_links_object_instead_of_array_returns_400(self):
        with patch("backend.app.require_text_ai"):
            response = TestClient(app).post(
                "/analyze",
                data={
                    "free_text": "enough pasted study text to analyze if links were ignored",
                    "links": '{"url":"https://example.com"}',
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("JSON array", response.json()["error"])

    def test_all_inaccessible_webpages_return_422(self):
        inaccessible_unit = {
            "display_name": "https://example.com/missing",
            "source_identity": "inaccessible:example.com/missing",
            "title_candidate": "https://example.com/missing",
            "content_hash": "deadbeef",
            "text_excerpt": "The webpage could not be accessed by the backend.",
        }
        inaccessible_parts = [{
            "type": "text",
            "text": "The webpage could not be accessed by the backend. Error: timed out",
        }]

        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.cache_get", return_value=None),
            patch(
                "backend.app.link_to_source_unit",
                return_value=(inaccessible_parts, inaccessible_unit),
            ),
            patch("backend.app.generate_reference_style_multisource_notes") as generate_notes,
        ):
            payload = asyncio.run(analyze_materials(
                files=[],
                links='["https://example.com/missing"]',
                free_text="",
                preferred_language="english",
                detail_level="auto",
                prompt_mode="professor_mode",
                client_fingerprint="",
            ))

        self.assertEqual(payload.status_code, 422)
        error = json.loads(payload.body.decode("utf-8"))["error"]
        self.assertIn("could not access this webpage", error.lower())
        generate_notes.assert_not_called()


if __name__ == "__main__":
    unittest.main()
