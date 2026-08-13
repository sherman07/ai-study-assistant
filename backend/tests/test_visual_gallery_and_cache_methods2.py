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


class ApiShapeTests(unittest.TestCase):
    def test_analysis_deadline_skips_optional_model_stages(self):
        with (
            patch("backend.app.ANALYSIS_MAX_SECONDS", 60),
            patch("backend.app.analysis_elapsed_seconds_since", return_value=60.0),
            patch("backend.app.should_run_optional_analysis_stage", return_value=False),
            patch("backend.app.require_text_ai"),
            patch("backend.app.cache_get", return_value=None),
            patch("backend.app.cache_set"),
            patch(
                "backend.app.generate_reference_style_multisource_notes",
                return_value="# Overview\n\nTiny source note about slope.\n\n## Key Ideas\n\nSlope compares rise and run.",
            ),
            patch("backend.app.make_notes_title", side_effect=AssertionError("title model should be skipped")),
            patch("backend.app.generate_ai_mind_map", side_effect=AssertionError("AI mind map should be skipped")),
        ):
            payload = asyncio.run(analyze_materials(
                files=[],
                links="[]",
                free_text="Tiny note about slope.",
                preferred_language="english",
                detail_level="auto",
                prompt_mode="professor_mode",
                client_fingerprint="",
            ))

        self.assertNotIn("error", payload)
        self.assertIn("title", payload["optional_stages_skipped"])
        self.assertIn("mind_map", payload["optional_stages_skipped"])
        self.assertEqual(payload["analysis_max_seconds"], 60)
        self.assertGreaterEqual(payload["analysis_elapsed_seconds"], 60)
        self.assertEqual(payload["language"], "english")
        self.assertEqual(payload["output_language"], "english")
        self.assertTrue(payload["mind_map"].get("branches"))

    def test_analyze_bounds_optional_post_note_model_timeouts(self):
        captured_timeouts = {}

        def fake_language_rewrite(summary, preferred_language, **kwargs):
            captured_timeouts["language"] = kwargs.get("request_timeout")
            return summary

        def fake_title(summary, candidates, **kwargs):
            captured_timeouts["title"] = kwargs.get("request_timeout")
            return "Bounded Optional Title"

        def fake_localise_title(title, preferred_language, **kwargs):
            captured_timeouts["localise_title"] = kwargs.get("request_timeout")
            return title

        def fake_mind_map(title, section_map, preferred_language, depth, prompt_mode, **kwargs):
            captured_timeouts["mind_map"] = kwargs.get("request_timeout")
            return {"center": title, "branches": [{"label": "Key Ideas", "points": []}]}

        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.cache_get", return_value=None),
            patch("backend.app.cache_set"),
            patch("backend.app.should_run_optional_analysis_stage", return_value=True),
            patch("backend.app.analysis_model_call_timeout", side_effect=[33.0, 12.0, 11.0, 22.0]),
            patch(
                "backend.app.generate_reference_style_multisource_notes",
                return_value="# Overview\n\nTiny source note about slope.\n\n## Key Ideas\n\nSlope compares rise and run.",
            ),
            patch("backend.app.enforce_requested_language", side_effect=fake_language_rewrite),
            patch("backend.app.make_notes_title", side_effect=fake_title),
            patch("backend.app.localise_title_if_needed", side_effect=fake_localise_title),
            patch("backend.app.generate_ai_mind_map", side_effect=fake_mind_map),
        ):
            payload = asyncio.run(analyze_materials(
                files=[],
                links="[]",
                free_text="Tiny note about slope.",
                preferred_language="english",
                detail_level="auto",
                prompt_mode="professor_mode",
                client_fingerprint="",
            ))

        self.assertNotIn("error", payload)
        self.assertEqual(captured_timeouts["language"], 33.0)
        self.assertEqual(captured_timeouts["title"], 12.0)
        self.assertEqual(captured_timeouts["localise_title"], 11.0)
        self.assertEqual(captured_timeouts["mind_map"], 22.0)

    def test_analyze_route_returns_http_error_for_empty_request(self):
        with patch("backend.app.require_text_ai"):
            response = TestClient(app).post("/analyze", data={})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "No readable files, links, or text were provided."})

    def test_analyze_route_returns_service_error_when_text_provider_missing(self):
        with patch("backend.app.require_text_ai", side_effect=RuntimeError("GEMINI_API_KEY is missing.")):
            response = TestClient(app).post("/analyze", data={"free_text": "short source"})

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"error": "GEMINI_API_KEY is missing."})

    def test_analyze_response_exposes_source_identity_alias(self):
        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.cache_get", return_value=None),
            patch("backend.app.cache_set"),
            patch("backend.app.should_run_optional_analysis_stage", return_value=False),
            patch("backend.app.build_visual_gallery", return_value=[]),
            patch(
                "backend.app.generate_reference_style_multisource_notes",
                return_value="# Overview\n\nThis source explains evidence and revision use.",
            ),
        ):
            payload = asyncio.run(analyze_materials(
                files=[],
                links="[]",
                free_text="A short source about evidence, concepts, and revision use.",
                preferred_language="english",
                detail_level="auto",
                prompt_mode="professor_mode",
                client_fingerprint="",
            ))

        self.assertNotIn("error", payload)
        self.assertTrue(payload["source_identity"].startswith("text:"))
        self.assertEqual(payload["source_identity"], payload["primary_source_identity"])

    def test_cached_result_visual_rebuild_never_calls_model(self):
        visual_parts = [
            {
                "type": "text",
                "text": (
                    "IN-TEXT SOURCE FIGURE FROM cached lecture — PDF page 2. "
                    "Page text preview: table graph data results comparison. "
                    "Image-count=1; drawing-count=12; visual-score=28."
                ),
            },
            {"type": "image_url", "image_url": {"url": "data:image/png;base64,AA=="}},
        ]
        source_meta = {
            "display_name": "cached lecture",
            "source_identity": "url:https://example.com/cached-lecture",
            "title_candidate": "Cached lecture",
            "content_hash": "cached-lecture",
            "text_excerpt": "The source includes a result table used as evidence.",
            "visual_parts": visual_parts,
            "url": "https://example.com/cached-lecture",
        }
        cached_result = {
            "title": "Cached lecture notes",
            "summary": "# Overview\n\nCached notes discuss the source result table.",
            "sections": {"Overview": "Cached notes discuss the source result table."},
            "connections": [],
            "mind_map": {"center": "Cached lecture notes", "branches": []},
            "visual_gallery": [],
            "primary_source_identity": source_meta["source_identity"],
        }

        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.cache_get", return_value=cached_result),
            patch("backend.app.rebuild_cached_visual_argument_cards", return_value=[]),
            patch("backend.app.link_to_source_unit", return_value=(
                [{"type": "text", "text": "Cached lecture with a result table."}],
                source_meta,
            )),
            patch("backend.app.generate_chat", side_effect=AssertionError("cache hit should not call the model")),
        ):
            payload = asyncio.run(analyze_materials(
                files=[],
                links=json.dumps(["https://example.com/cached-lecture"]),
                free_text="",
                preferred_language="english",
                detail_level="auto",
                prompt_mode="professor_mode",
                client_fingerprint="",
            ))

        self.assertNotIn("error", payload)
        self.assertTrue(payload["cached"])
        self.assertEqual(payload["ai_generation_source"], "cache")
        self.assertEqual(payload["ai_model_call_count"], 0)
        self.assertFalse(payload["ai_fallback_used"])
        self.assertNotIn("[[VISUAL:", payload["summary"])
        self.assertNotIn("This source figure belongs in the notes", payload["summary"])
        self.assertNotIn("Figure focus:", payload["summary"])
        self.assertEqual(len(payload["visual_gallery"]), 1)
        self.assertEqual(payload["source_evidence_cards"], payload["visual_gallery"])
        self.assertEqual(payload["figure_cards"], payload["visual_gallery"])

    def test_analyze_returns_an_error_when_main_note_model_fails(self):
        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.cache_get", return_value=None),
            patch("backend.app.cache_set"),
            patch("backend.app.should_run_optional_analysis_stage", return_value=False),
            patch("backend.app.build_visual_gallery", return_value=[]),
            patch("backend.app.persist_generated_analysis_result", return_value=None),
            patch("backend.app.generate_chat", side_effect=RuntimeError("forced model failure")),
        ):
            payload = asyncio.run(analyze_materials(
                files=[],
                links="[]",
                free_text="Human nature lecture about aggression, cooperation, evidence, and exam interpretation.",
                preferred_language="english",
                detail_level="auto",
                prompt_mode="professor_mode",
                client_fingerprint="",
            ))

        self.assertEqual(payload.status_code, 500)
        self.assertEqual(json.loads(payload.body), {"error": "forced model failure"})

    def test_deadline_skips_visual_filter_and_note_expansion_model_stages(self):
        long_summary = "# Overview\n\n" + ("This source explains table data, comparison, evidence, and exam use. " * 700)
        candidate = {
            "source_index": 1,
            "source_title": "Lecture results",
            "display_name": "lecture.pdf",
            "caption": "A table with data, results, comparison groups, and statistical evidence.",
            "location": "PDF page 2",
            "url": "data:image/png;base64,AA==",
            "score": 32,
            "visual_kind": "data/table",
            "teaching_signals": 4,
            "decorative_signals": 0,
            "is_likely_decorative": False,
        }
        source_units = [{
            "display_name": "lecture.pdf",
            "title_candidate": "Lecture results",
            "text_excerpt": "The source includes a table with data, results, and comparison evidence.",
            "visual_parts": [],
        }]
        skipped = []

        with (
            patch("backend.app.analysis_remaining_seconds_since", return_value=20),
            patch("backend.app.select_visual_candidates_for_argument", return_value=[candidate]),
            patch("backend.app.generate_chat", return_value=long_summary) as generate_chat_mock,
            patch("backend.app.expand_sparse_inline_summary", side_effect=AssertionError("expansion should be skipped")),
        ):
            summary = generate_reference_style_multisource_notes(
                source_units,
                "english",
                {"depth": "detailed", "config": backend_app_module.DEPTH_CONFIG["detailed"]},
                "professor_mode",
                analysis_started_at=1.0,
                skipped_optional_stages=skipped,
            )

        self.assertEqual(generate_chat_mock.call_count, 1)
        self.assertIn("visual_card_filter", skipped)
        self.assertIn("note_expansion", skipped)
        self.assertIn("[[VISUAL:0]]", summary)
        self.assertNotIn("This source figure belongs in the notes", summary)
        self.assertNotIn("Figure focus:", summary)

    def test_analyze_cache_preserves_browser_visual_metadata(self):
        captured = {}
        gallery = [{
            "index": 0,
            "url": "http://127.0.0.1:8001/assets/visuals/result-table.png",
            "title": "Result table",
            "caption": "Table with data and results.",
            "visual_kind": "data/table",
        }]

        def capture_cache_set(fingerprint, result):
            captured["fingerprint"] = fingerprint
            captured["result"] = result

        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.cache_get", return_value=None),
            patch("backend.app.cache_set", side_effect=capture_cache_set),
            patch("backend.app.should_run_optional_analysis_stage", return_value=False),
            patch("backend.app.build_visual_gallery", return_value=gallery),
            patch(
                "backend.app.generate_reference_style_multisource_notes",
                return_value="# Overview\n\nThe table evidence is explained near [[VISUAL:0]].\n\n## Key Ideas\n\nData supports the claim.",
            ),
        ):
            payload = asyncio.run(analyze_materials(
                files=[],
                links="[]",
                free_text="Tiny note about a result table.",
                preferred_language="english",
                detail_level="auto",
                prompt_mode="professor_mode",
                client_fingerprint="",
            ))

        self.assertNotIn("error", payload)
        self.assertIn("[[VISUAL:0]]", payload["summary"])
        self.assertEqual(payload["visual_gallery"], gallery)
        self.assertEqual(payload["visuals"], gallery)
        self.assertEqual(payload["source_evidence_cards"], gallery)
        self.assertEqual(payload["figure_cards"], gallery)
        self.assertIn("[[VISUAL:0]]", captured["result"]["summary"])
        self.assertEqual(captured["result"]["visual_gallery"], gallery)
        self.assertEqual(captured["result"]["visuals"], gallery)
        self.assertEqual(captured["result"]["source_evidence_cards"], gallery)
        self.assertEqual(captured["result"]["figure_cards"], gallery)

    def test_cached_result_uses_cached_visual_gallery_when_live_rebuild_is_empty(self):
        asset_path = backend_app_module.RUNTIME_ASSETS_DIR / "visuals" / "test-cached-table.png"
        asset_path.parent.mkdir(parents=True, exist_ok=True)
        asset_path.write_bytes(b"cached visual")
        cached_gallery = [{
            "index": 0,
            "url": "http://127.0.0.1:8001/assets/visuals/test-cached-table.png",
            "title": "Cached result table",
            "caption": "Cached table metadata.",
            "visual_kind": "data/table",
        }]
        cached_result = {
            "title": "Cached notes",
            "summary": "# Overview\n\nCached notes keep [[VISUAL:0]].",
            "sections": {"Overview": "Cached notes keep [[VISUAL:0]]."},
            "connections": [],
            "mind_map": {"center": "Cached notes", "branches": []},
            "visual_gallery": cached_gallery,
            "primary_source_identity": "text:cached",
        }

        try:
            with (
                patch("backend.app.require_text_ai"),
                patch("backend.app.cache_get", return_value=cached_result),
                patch("backend.app.rebuild_cached_visual_argument_cards", return_value=[]),
                patch("backend.app.build_visual_gallery", return_value=[]),
                patch("backend.app.generate_chat", side_effect=AssertionError("cache hit should not need a model call")),
            ):
                payload = asyncio.run(analyze_materials(
                    files=[],
                    links="[]",
                    free_text="Tiny note about a result table.",
                    preferred_language="english",
                    detail_level="auto",
                    prompt_mode="professor_mode",
                    client_fingerprint="",
                ))
        finally:
            asset_path.unlink(missing_ok=True)

        self.assertTrue(payload["cached"])
        self.assertIn("[[VISUAL:0]]", payload["summary"])
        self.assertEqual(payload["visual_gallery"], cached_gallery)
        self.assertEqual(payload["visuals"], cached_gallery)
        self.assertEqual(payload["source_evidence_cards"], cached_gallery)
        self.assertEqual(payload["figure_cards"], cached_gallery)

    def test_cached_result_does_not_return_missing_runtime_visual_asset(self):
        cached_result = {
            "title": "Cached notes",
            "summary": "# Overview\n\nCached notes still reference [[VISUAL:0]].",
            "sections": {"Overview": "Cached notes still reference [[VISUAL:0]]."},
            "connections": [],
            "mind_map": {"center": "Cached notes", "branches": []},
            "visual_gallery": [{
                "index": 0,
                "url": "http://127.0.0.1:8001/assets/visuals/definitely-missing-cached-asset.png",
                "title": "Missing cached table",
                "caption": "The cache entry points to a runtime asset that no longer exists.",
                "visual_kind": "data/table",
            }],
            "primary_source_identity": "text:cached",
        }

        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.cache_get", return_value=cached_result),
            patch("backend.app.rebuild_cached_visual_argument_cards", return_value=[]),
            patch("backend.app.build_visual_gallery", return_value=[]),
            patch("backend.app.generate_chat", side_effect=AssertionError("cache hit should not need a model call")),
        ):
            payload = asyncio.run(analyze_materials(
                files=[],
                links="[]",
                free_text="Tiny note about a missing cached result table.",
                preferred_language="english",
                detail_level="auto",
                prompt_mode="professor_mode",
                client_fingerprint="",
            ))

        self.assertTrue(payload["cached"])
        self.assertEqual(payload["visual_gallery"], [])
        self.assertEqual(payload["visuals"], [])
        self.assertNotIn("[[VISUAL:0]]", payload["summary"])

    def test_language_enforcement_skips_rewrite_when_english_already_satisfied(self):
        summary = "# Overview\n\nThis study note explains the source evidence, comparison table, and revision use."

        with patch("backend.app.generate_chat", side_effect=AssertionError("English notes should not be rewritten")):
            result = enforce_requested_language(summary, "english")

        self.assertEqual(result, summary)

    def test_language_enforcement_skips_rewrite_when_chinese_already_satisfied(self):
        summary = "# 概述\n\n这份学习笔记解释来源证据、比较表格、核心概念和复习用途，帮助学生直接按照材料复习。"

        with patch("backend.app.generate_chat", side_effect=AssertionError("Chinese notes should not be rewritten")):
            result = enforce_requested_language(summary, "simplified_chinese")

        self.assertEqual(result, summary)

    def test_language_enforcement_rewrites_visible_mismatch(self):
        rewritten = "# 概述\n\n这份笔记已经改写为中文。"

        with patch("backend.app.generate_chat", return_value=rewritten) as generate_chat_mock:
            result = enforce_requested_language("# Overview\n\nThis note is still English.", "simplified_chinese")

        self.assertEqual(result, rewritten)
        self.assertEqual(generate_chat_mock.call_count, 1)

    def test_language_enforcement_rewrites_simplified_when_traditional_requested(self):
        rewritten = "# 概覽\n\n這份筆記已經改寫為繁體中文。"

        with patch("backend.app.generate_chat", return_value=rewritten) as generate_chat_mock:
            result = enforce_requested_language("# 概述\n\n这份学习笔记解释来源证据和复习用途。", "traditional_chinese")

        self.assertEqual(result, rewritten)
        self.assertEqual(generate_chat_mock.call_count, 1)
    def test_auto_detail_level_keeps_adaptive_depth(self):
        payload = choose_learning_depth("Tiny note about slope.", [], "auto")

        self.assertEqual(payload["depth"], "focused")
        self.assertFalse(payload["override"])
        self.assertEqual(payload["requested_detail_level"], "auto")






if __name__ == "__main__":
    unittest.main()
