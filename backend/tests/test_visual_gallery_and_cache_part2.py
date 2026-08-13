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


class EmbeddedYoutubeSafetyTests(unittest.TestCase):
    def test_uploaded_file_does_not_expand_embedded_youtube_when_disabled(self):
        previous_value = getattr(backend_app_module, "ENABLE_EMBEDDED_YOUTUBE_SOURCES", None)
        backend_app_module.ENABLE_EMBEDDED_YOUTUBE_SOURCES = False
        try:
            with patch("backend.app.link_to_source_unit") as link_to_source_unit:
                result = backend_app_module.expand_embedded_youtube_sources(
                    "Watch https://www.youtube.com/watch?v=dQw4w9WgXcQ for more context.",
                    {"display_name": "Lecture handout.pdf"},
                    set(),
                )

            self.assertEqual(result, ([], [], []))
            link_to_source_unit.assert_not_called()
        finally:
            if previous_value is None:
                delattr(backend_app_module, "ENABLE_EMBEDDED_YOUTUBE_SOURCES")
            else:
                backend_app_module.ENABLE_EMBEDDED_YOUTUBE_SOURCES = previous_value

    def test_ytdlp_caption_fallback_is_skipped_when_disabled(self):
        previous_value = getattr(backend_app_module, "ENABLE_YOUTUBE_YTDLP_FALLBACK", None)
        backend_app_module.ENABLE_YOUTUBE_YTDLP_FALLBACK = False
        try:
            with patch.object(backend_app_module, "yt_dlp") as yt_dlp:
                transcript = backend_app_module.fetch_youtube_subtitle_transcript(
                    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                )

            self.assertEqual(transcript, "")
            yt_dlp.YoutubeDL.assert_not_called()
        finally:
            if previous_value is None:
                delattr(backend_app_module, "ENABLE_YOUTUBE_YTDLP_FALLBACK")
            else:
                backend_app_module.ENABLE_YOUTUBE_YTDLP_FALLBACK = previous_value

    def test_analyse_youtube_url_captions_only_skips_media_download(self):
        with patch.object(backend_app_module, "fetch_youtube_metadata", return_value={"title": "Sample lecture", "channel": "Synapse", "duration": "10:00"}), \
             patch.object(backend_app_module, "fetch_youtube_caption_transcript", return_value="A" * 80), \
             patch.object(backend_app_module, "download_youtube_media") as download_media, \
             patch.object(backend_app_module, "yt_dlp", object()):
            transcript, frames, meta = backend_app_module.analyse_youtube_url(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                captions_only=True,
            )

        download_media.assert_not_called()
        self.assertEqual(frames, [])
        self.assertIn("Sample lecture", transcript)
        self.assertEqual(meta.get("transcript_status"), "unavailable")


class SourceStrictNotesTests(unittest.TestCase):
    def test_source_strict_validation_rebuilds_required_sections_and_dedupes_repeat(self):
        summary = """
# Vaccination ethics

## Direct Source Claims

- Mandates must be necessary and proportionate (Slide 15).
- Mandates must be necessary and proportionate (Slide 15).

## Source Evidence

The lecture uses Jacobson v. Massachusetts to illustrate necessity and proportionality (Slide 21).
The lecture uses Jacobson v. Massachusetts to illustrate necessity and proportionality (Slide 21).
""".strip()

        validated = validate_source_strict_summary(summary, "english", "standard_notes")

        self.assertIn("## Source Question", validated)
        self.assertIn("## Direct Source Claims", validated)
        self.assertIn("## Source Evidence", validated)
        self.assertIn("## Inferences Allowed By The Source", validated)
        self.assertIn("## Gaps / Limits", validated)
        self.assertIn("## Exam / Research Use", validated)
        self.assertIn("## Compact Revision Summary", validated)
        self.assertIn("Not enough evidence from the uploaded source.", validated)
        self.assertNotIn("[Direct from source]", validated)
        self.assertNotIn("[Tutor explanation]", validated)
        self.assertEqual(validated.count("Mandates must be necessary and proportionate (Slide 15)."), 1)
        self.assertEqual(
            validated.count("Jacobson v. Massachusetts to illustrate necessity and proportionality (Slide 21)."),
            1,
        )

    def test_source_strict_finalize_respects_quick_review_word_limit(self):
        repeated_sentence = "Necessity, proportionality, and liberty must be balanced with cited lecture evidence (Slide 15)."
        summary = "# Vaccination policy\n\n## Direct Source Claims\n\n" + "\n\n".join(repeated_sentence for _ in range(80))

        final = finalize_generated_summary(
            summary,
            requested_language="english",
            generation_language="english",
            prompt_mode="source_strict_research_mode",
            note_length_mode="quick_review",
            attach_visuals=False,
        )

        word_count = len(re.findall(r"[\u4e00-\u9fff]|\b[\w'-]+\b", final))
        self.assertLessEqual(word_count, 560)
        self.assertIn("## Direct Source Claims", final)

    def test_analysis_fingerprint_changes_with_note_length_mode(self):
        units = [{
            "source_identity": "text:abc",
            "content_hash": "hash-1",
        }]

        quick = build_analysis_fingerprint("english", units, "auto", "source_strict_research_mode", "quick_review")
        deep = build_analysis_fingerprint("english", units, "auto", "source_strict_research_mode", "deep_study")

        self.assertNotEqual(quick, deep)

    def test_analysis_fingerprint_changes_with_ai_provider(self):
        units = [{
            "source_identity": "text:abc",
            "content_hash": "hash-1",
        }]

        openai = build_analysis_fingerprint(
            "english",
            units,
            "auto",
            "professor_mode",
            "standard_notes",
            ai_provider="openai",
        )
        gemini = build_analysis_fingerprint(
            "english",
            units,
            "auto",
            "professor_mode",
            "standard_notes",
            ai_provider="gemini",
        )

        self.assertNotEqual(openai, gemini)

    def test_analysis_fingerprint_changes_with_visual_pipeline_version(self):
        units = [{
            "source_identity": "text:abc",
            "content_hash": "hash-1",
        }]

        with patch.object(backend_app_module, "VISUAL_PIPELINE_VERSION", "no-inline-visuals-v2", create=True):
            first = build_analysis_fingerprint("english", units, "auto", "professor_mode", "standard_notes")
        with patch.object(backend_app_module, "VISUAL_PIPELINE_VERSION", "no-inline-visuals-v3", create=True):
            second = build_analysis_fingerprint("english", units, "auto", "professor_mode", "standard_notes")

        self.assertNotEqual(first, second)

    def test_analyze_stores_raw_and_display_summaries_separately(self):
        captured = {}
        gallery = [{
            "index": 0,
            "url": "http://127.0.0.1:8001/assets/visuals/result-table.png",
            "title": "Result table",
            "caption": "Table with data and results.",
            "visual_kind": "data/table",
        }]

        def capture_cache_set(fingerprint, result):
            captured["result"] = result

        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.cache_get", return_value=None),
            patch("backend.app.cache_set", side_effect=capture_cache_set),
            patch("backend.app.should_run_optional_analysis_stage", return_value=False),
            patch("backend.app.build_visual_gallery", return_value=gallery),
            patch(
                "backend.app.generate_reference_style_multisource_notes",
                return_value=(
                    "# Overview\n\n"
                    "The lecture explains the result table as source evidence near [[VISUAL:0]].\n\n"
                    "## Source Examples and Evidence\n\n"
                    "This source figure belongs in the notes because it shows the table.\n\n"
                    "## Core Argument\n\n"
                    "The result table matters because it limits the claim."
                ),
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
        self.assertEqual(payload["summary"], payload["display_summary"])
        self.assertEqual(captured["result"]["summary"], captured["result"]["display_summary"])
        self.assertIn("raw_summary", payload)
        self.assertIn("display_summary", payload)
        for key in ("summary", "display_summary", "raw_summary"):
            self.assertIn("[[VISUAL:0]]", payload[key])
            self.assertNotIn("Source Examples and Evidence", payload[key])
            self.assertNotIn("This source figure belongs in the notes", payload[key])
        self.assertEqual(payload["source_evidence_cards"], gallery)

    def test_text_provider_override_is_request_scoped(self):
        with (
            patch.object(core_config, "AI_TEXT_PROVIDER", "openai"),
            patch.object(core_config, "GEMINI_FOCUSED_MODEL", "gemini-focused"),
            patch.object(core_config, "gemini_request_is_configured", return_value=True),
            patch.dict("os.environ", {"OPENAI_FOCUSED_MODEL": "openai-focused"}),
        ):
            self.assertEqual(core_config.active_text_provider(), "openai")
            self.assertEqual(core_config.model_for_depth("focused"), "openai-focused")
            token = core_config.set_request_text_provider("gemini")
            try:
                self.assertEqual(core_config.active_text_provider(), "gemini")
                self.assertEqual(core_config.model_for_depth("focused"), "gemini-focused")
            finally:
                core_config.reset_request_text_provider(token)
            self.assertEqual(core_config.active_text_provider(), "openai")




if __name__ == "__main__":
    unittest.main()
