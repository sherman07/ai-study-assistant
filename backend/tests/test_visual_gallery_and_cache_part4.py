import asyncio
import base64
import importlib
import json
import re
import tempfile
import time
import unittest
from types import SimpleNamespace
from pathlib import Path
from urllib.parse import urlparse
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import app
from backend import app as backend_app_module
from backend.core import config as core_config
from backend.app import analyze_materials
from backend.app import build_analysis_fingerprint
from backend.app import build_visual_gallery
from backend.app import choose_learning_depth
from backend.app import enforce_requested_language
from backend.app import file_to_source_unit
from backend.app import finalize_generated_summary
from backend.app import generate_reference_style_multisource_notes
from backend.app import iter_visual_candidates
from backend.app import link_to_source_unit
from backend.app import rebuild_cached_visual_argument_cards
from backend.app import render_pptx_source_preview_svg_images
from backend.app import source_preview_image_url
from backend.app import validate_source_strict_summary
from backend.core.analysis_cache import AnalysisCacheStore
from backend.core import visual_assets
from backend.core.visual_assets import prune_unavailable_visual_markers, visual_asset_url_for_browser

try:
    from pptx import Presentation
except Exception:
    Presentation = None


def assert_served_visual_asset(test_case, url: str, expected_content_type: str = "image/png"):
    parsed = urlparse(url)
    test_case.assertEqual(parsed.scheme, "http")
    test_case.assertEqual(parsed.netloc, "127.0.0.1:8001")
    test_case.assertTrue(parsed.path.startswith("/assets/visuals/"))

    response = TestClient(app).get(parsed.path)
    test_case.assertEqual(response.status_code, 200)
    test_case.assertEqual(response.headers.get("content-type", "").split(";")[0], expected_content_type)


class AnalysisCacheTests(unittest.TestCase):
    def test_tight_analysis_budget_skips_optional_visual_model_filter(self):
        source_units = [{
            "display_name": "budget.pdf",
            "title_candidate": "Budget Control Lecture",
            "source_identity": "file:budget",
            "text_excerpt": "This lecture compares evidence tables, diagrams, and revision uses for budget control.",
            "visual_parts": [
                {
                    "type": "text",
                    "text": (
                        "IN-TEXT SOURCE FIGURE FROM budget.pdf — PDF page 2. "
                        "Actual source screenshot selected for its teaching figure/table/data value. "
                        "Image-count=1; drawing-count=22; visual-score=82. "
                        "Page text preview: Table comparing concepts, evidence, and study use."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": (
                            "data:image/png;base64,"
                            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
                        ),
                    },
                },
            ],
        }]
        started_at = time.monotonic() - (backend_app_module.ANALYSIS_MAX_SECONDS - 100)
        skipped = []
        generated_calls = []

        def fake_generate_chat(messages, **kwargs):
            call_text = json.dumps(messages, default=str)
            generated_calls.append(call_text)
            self.assertNotIn("selecting separate source-figure support cards", call_text)
            return "# Budget-Controlled Study Notes\n\n" + (
                "This source-grounded note explains the concepts, evidence, diagram, comparison table, "
                "and revision use without spending an optional visual-filter model call. "
                * 80
            )

        with (
            patch("backend.app.generate_chat", side_effect=fake_generate_chat),
            patch("backend.app.advanced_notes_quality_flags", return_value=[]),
            patch("backend.app.markdown_table_count", return_value=3),
        ):
            result = generate_reference_style_multisource_notes(
                source_units,
                preferred_language="english",
                depth_plan={"depth": "detailed", "config": backend_app_module.DEPTH_CONFIG["detailed"]},
                prompt_mode="professor_mode",
                note_length_mode="standard_notes",
                analysis_started_at=started_at,
                skipped_optional_stages=skipped,
            )

        self.assertIn("Budget-Controlled Study Notes", result)
        self.assertEqual(len(generated_calls), 1)
        self.assertIn("visual_card_filter", skipped)

    def test_cache_round_trip_and_ttl_cleanup(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache_path = Path(tmp) / "cache.json"
            store = AnalysisCacheStore(cache_path=cache_path, ttl_seconds=60)

            store.set("fingerprint", {"summary": "ok", "visual_gallery": []})

            self.assertEqual(store.get("fingerprint")["summary"], "ok")
            self.assertTrue(cache_path.exists())

            cache_path.write_text(
                json.dumps({
                    "expired": {
                        "created_at": time.time() - 120,
                        "result": {"summary": "old"},
                    }
                }),
                encoding="utf-8",
            )
            expired_store = AnalysisCacheStore(cache_path=cache_path, ttl_seconds=1)

            self.assertIsNone(expired_store.get("expired"))

    def test_cache_save_uses_complete_file_without_temp_artifacts(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache_path = Path(tmp) / "cache.json"
            store = AnalysisCacheStore(cache_path=cache_path, ttl_seconds=60)

            store.set("fingerprint", {"summary": "ok", "visual_gallery": [{"index": 0}]})

            self.assertEqual(store.get("fingerprint")["summary"], "ok")
            self.assertFalse(list(Path(tmp).glob(".cache.json.*.tmp")))

    def test_analyze_cache_hit_does_not_require_text_ai_client(self):
        cached_result = {
            "title": "Cached Study Notes",
            "summary": "# Cached Study Notes\n\nCached body from an earlier successful analysis.",
            "display_summary": "# Cached Study Notes\n\nCached body from an earlier successful analysis.",
            "sections": {"Cached Study Notes": "Cached body from an earlier successful analysis."},
            "connections": [],
            "mind_map": {"center": "Cached Study Notes", "branches": []},
            "source_identity": "text:cached",
            "primary_source_identity": "text:cached",
            "visual_gallery": [],
            "visuals": [],
        }

        with (
            patch("backend.app.require_text_ai", side_effect=RuntimeError("OPENAI_API_KEY is not configured.")) as require_text_ai,
            patch("backend.app.cache_get", return_value=cached_result) as cache_get,
            patch("backend.app.generate_chat", side_effect=AssertionError("cache hit should not call the model")),
            patch("backend.app.persist_generated_analysis_result", return_value={}),
        ):
            result = asyncio.run(analyze_materials(
                files=[],
                links="[]",
                free_text="Cached source text",
                preferred_language="english",
                detail_level="standard",
                prompt_mode="professor_mode",
                note_length="standard_notes",
                ai_provider="openai",
                client_fingerprint="cache-client",
                request=None,
            ))

        self.assertIsInstance(result, dict)
        self.assertTrue(result["cached"])
        self.assertEqual(result["title"], "Cached Study Notes")
        self.assertIn("Cached body", result["summary"])
        require_text_ai.assert_not_called()
        cache_get.assert_called_once()

    def test_analyze_records_safe_stage_diagnostics_for_cache_hit(self):
        cached_result = {
            "title": "Cached Study Notes",
            "summary": "# Cached Study Notes\n\nCached body.",
            "display_summary": "# Cached Study Notes\n\nCached body.",
            "sections": {"Cached Study Notes": "Cached body."},
            "connections": [],
            "mind_map": {"center": "Cached Study Notes", "branches": []},
            "source_identity": "text:cached",
            "primary_source_identity": "text:cached",
            "visual_gallery": [],
            "visuals": [],
        }
        emitted_events = []

        def capture_event(message, *args, **kwargs):
            emitted_events.append(message % args if args else message)

        with (
            patch("backend.app.cache_get", return_value=cached_result),
            patch("backend.app.persist_generated_analysis_result", return_value={}),
            patch("backend.app.logger.info", side_effect=capture_event),
        ):
            result = asyncio.run(analyze_materials(
                files=[],
                links="[]",
                free_text="A short source about opportunity cost.",
                preferred_language="english",
                detail_level="standard",
                prompt_mode="professor_mode",
                note_length="standard_notes",
                ai_provider="openai",
                client_fingerprint="diagnostic-client",
                request=None,
            ))

        self.assertTrue(result["cached"])
        self.assertTrue(any("analysis_event=received" in event for event in emitted_events))
        self.assertTrue(any("analysis_event=sources_ready" in event for event in emitted_events))
        self.assertTrue(any("analysis_event=cache_hit" in event for event in emitted_events))

    def test_analyze_stops_before_model_generation_when_client_disconnected(self):
        class DisconnectedRequest:
            async def is_disconnected(self):
                return True

        with (
            patch("backend.app.cache_get", return_value=None),
            patch("backend.app.require_text_ai") as require_text_ai,
            patch(
                "backend.app.generate_reference_style_multisource_notes",
                side_effect=AssertionError("model should not be called after disconnect"),
            ) as generate_notes,
            patch("backend.app.generate_chat", side_effect=AssertionError("model should not be called after disconnect")),
            patch("backend.app.persist_generated_analysis_result", return_value={}),
        ):
            response = asyncio.run(analyze_materials(
                files=[],
                links="[]",
                free_text="A short source about opportunity cost and scarce resources.",
                preferred_language="english",
                detail_level="focused",
                prompt_mode="professor_mode",
                note_length="standard_notes",
                ai_provider="openai",
                client_fingerprint="disconnect-client",
                request=DisconnectedRequest(),
            ))

        self.assertEqual(response.status_code, 499)
        self.assertIn("application/json", response.media_type)
        self.assertIn("Client disconnected", response.body.decode("utf-8"))
        require_text_ai.assert_not_called()
        generate_notes.assert_not_called()




if __name__ == "__main__":
    unittest.main()
