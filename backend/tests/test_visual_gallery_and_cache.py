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
    def test_liveness_endpoint_is_minimal_for_platform_health_checks(self):
        response = TestClient(app).get("/healthz")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "ok")
        self.assertLess(len(response.content), 32)

    def test_health_response_shape(self):
        response = TestClient(app).get("/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("analysis_model", payload)
        self.assertIn("fallback_model", payload)
        self.assertIn("mindmap_model", payload)
        self.assertIn("title_model", payload)
        self.assertIn("visual_image_guide_model", payload)
        self.assertIn("openai_timeout_seconds", payload)
        self.assertIn("pdf_visual_extraction_enabled", payload)
        self.assertIn("embedded_youtube_sources_enabled", payload)
        self.assertIn("youtube_ytdlp_fallback_enabled", payload)
        self.assertIn("public_backend_base_url", payload)
        self.assertIn("supabase_auth_configured", payload)
        self.assertIn("synapse_email_delivery_configured", payload)
        self.assertIn("runtime_assets_dir", payload)
        self.assertNotIn("OPENAI_API_KEY", payload)

    def test_default_frontend_base_url_matches_documented_vite_server(self):
        self.assertEqual(
            backend_app_module.SYNAPSE_FRONTEND_BASE_URL,
            "http://127.0.0.1:5175/frontend",
        )

    def test_default_cors_allows_documented_static_frontend_server(self):
        self.assertTrue(
            {
                "http://127.0.0.1:5500",
                "http://localhost:5500",
                "http://127.0.0.1:5176",
                "http://localhost:5176",
            }.issubset(set(backend_app_module.CORS_ALLOW_ORIGINS))
        )

    def test_default_cors_allows_private_lan_vite_frontend(self):
        response = TestClient(app).options(
            "/health",
            headers={
                "Origin": "http://192.168.1.141:5176",
                "Access-Control-Request-Method": "GET",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            "http://192.168.1.141:5176",
        )

    def test_backend_loads_gemini_settings_from_separate_env_file(self):
        self.assertIn(
            backend_app_module.BACKEND_PACKAGE_DIR / ".env.gemini",
            core_config.GEMINI_ENV_PATHS,
        )
        self.assertIn(
            backend_app_module.BACKEND_PACKAGE_DIR / ".env.gemini",
            core_config.CONFIG_ENV_PATHS,
        )

    def test_backend_loads_deepseek_settings_from_separate_env_file(self):
        self.assertIn(
            backend_app_module.BACKEND_PACKAGE_DIR / ".env.deepseek",
            core_config.DEEPSEEK_ENV_PATHS,
        )
        self.assertIn(
            backend_app_module.BACKEND_PACKAGE_DIR / ".env.deepseek",
            core_config.CONFIG_ENV_PATHS,
        )

    def test_backend_loads_gpt_settings_from_separate_env_file(self):
        self.assertIn(
            backend_app_module.BACKEND_PACKAGE_DIR / ".env.gpt",
            core_config.GPT_ENV_PATHS,
        )
        self.assertIn(
            backend_app_module.BACKEND_PACKAGE_DIR / "core" / ".env.gpt",
            core_config.GPT_ENV_PATHS,
        )
        self.assertIn(
            backend_app_module.BACKEND_PACKAGE_DIR / "core" / ".env.gpt",
            core_config.CONFIG_ENV_PATHS,
        )

    def test_gpt_env_values_replace_placeholder_openai_settings(self):
        environ = {
            "OPENAI_API_KEY": "__ADD_YOUR_OPENAI_API_KEY__",
            "OPENAI_REALTIME_MODEL": "__ADD_YOUR_REALTIME_MODEL__",
            "UNRELATED_VALUE": "keep-me",
        }

        core_config.apply_env_values(
            {
                "OPENAI_API_KEY": "sk-proj-real-test-key",
                "OPENAI_REALTIME_MODEL": "gpt-realtime-2",
                "UNRELATED_VALUE": "replace-me",
            },
            environ=environ,
            override_placeholders=True,
        )

        self.assertEqual(environ["OPENAI_API_KEY"], "sk-proj-real-test-key")
        self.assertEqual(environ["OPENAI_REALTIME_MODEL"], "gpt-realtime-2")
        self.assertEqual(environ["UNRELATED_VALUE"], "keep-me")

    def test_model_for_depth_uses_gemini_models_when_text_provider_is_gemini(self):
        with (
            patch.object(core_config, "AI_TEXT_PROVIDER", "gemini"),
            patch.object(core_config, "GEMINI_AUTH_MODE", "api_key", create=True),
            patch.object(core_config, "GEMINI_FOCUSED_MODEL", "gemini-focused"),
            patch.object(core_config, "GEMINI_STANDARD_MODEL", "gemini-standard"),
            patch.object(core_config, "GEMINI_DETAILED_MODEL", "gemini-detailed"),
            patch.object(core_config, "GEMINI_COMPREHENSIVE_MODEL", "gemini-comprehensive"),
        ):
            self.assertEqual(core_config.model_for_depth("focused"), "gemini-focused")
            self.assertEqual(core_config.model_for_depth("standard"), "gemini-standard")
            self.assertEqual(core_config.model_for_depth("detailed"), "gemini-detailed")
            self.assertEqual(core_config.model_for_depth("comprehensive"), "gemini-comprehensive")

    def test_unconfigured_gemini_request_reports_configuration_error_without_openai_substitution(self):
        with (
            patch.object(core_config, "AI_TEXT_PROVIDER", "openai"),
            patch.object(core_config, "OPENAI_API_KEY", "test-openai-key"),
            patch.object(core_config, "client", object()),
            patch.object(core_config, "GEMINI_AUTH_MODE", "adc"),
            patch.object(core_config, "GEMINI_PROJECT_ID", ""),
        ):
            with self.assertRaisesRegex(RuntimeError, "Gemini.*not configured"):
                core_config.set_request_text_provider("gemini")
            self.assertEqual(core_config.active_text_provider(), "openai")

    def test_deepseek_request_selects_the_deepseek_client_and_model(self):
        deepseek_client = object()
        with (
            patch.object(core_config, "AI_TEXT_PROVIDER", "openai"),
            patch.object(core_config, "DEEPSEEK_API_KEY", "deepseek-test-key", create=True),
            patch.object(core_config, "deepseek_client", deepseek_client, create=True),
            patch.object(core_config, "DEEPSEEK_CHAT_MODEL", "deepseek-v4-flash", create=True),
        ):
            token = core_config.set_request_text_provider("deepseek")
            try:
                self.assertEqual(core_config.active_text_provider(), "deepseek")
                self.assertEqual(core_config.chat_model_for_active_provider(), "deepseek-v4-flash")
                self.assertIs(core_config.text_generation_client(), deepseek_client)
            finally:
                core_config.reset_request_text_provider(token)

    def test_unconfigured_deepseek_request_is_not_substituted_with_openai(self):
        with (
            patch.object(core_config, "AI_TEXT_PROVIDER", "openai"),
            patch.object(core_config, "OPENAI_API_KEY", "test-openai-key"),
            patch.object(core_config, "client", object()),
            patch.object(core_config, "DEEPSEEK_API_KEY", "", create=True),
            patch.object(core_config, "deepseek_client", None, create=True),
        ):
            with self.assertRaisesRegex(RuntimeError, "DeepSeek.*not configured"):
                core_config.set_request_text_provider("deepseek")
            self.assertEqual(core_config.active_text_provider(), "openai")

    def test_gemini_never_retries_an_openai_fallback_model(self):
        class FailingCompletions:
            def __init__(self):
                self.calls = []

            def create(self, **kwargs):
                self.calls.append(kwargs)
                raise RuntimeError("404: model is unavailable")

        completions = FailingCompletions()
        gemini_client = SimpleNamespace(chat=SimpleNamespace(completions=completions))

        with (
            patch.object(backend_app_module, "AI_TEXT_PROVIDER", "gemini", create=True),
            patch.object(backend_app_module, "FALLBACK_MODEL", "gpt-5.4-mini", create=True),
            patch.object(backend_app_module, "text_generation_client", return_value=gemini_client, create=True),
            patch.object(backend_app_module, "active_text_provider", return_value="gemini", create=True),
        ):
            with self.assertRaisesRegex(RuntimeError, "404"):
                backend_app_module.generate_chat(
                    [{"role": "user", "content": "Generate study notes."}],
                    model="gemini-3.1-flash-lite",
                    max_tokens=20,
                )

        self.assertEqual(
            [call["model"] for call in completions.calls],
            ["gemini-3.1-flash-lite"],
            "a Gemini request must not send an OpenAI model name to the Gemini API",
        )

    def test_note_generation_propagates_model_failure_instead_of_returning_local_notes(self):
        source_units = [{
            "display_name": "lecture.txt",
            "title_candidate": "Lecture",
            "text_excerpt": "A source-grounded study note must only be returned after a model succeeds.",
            "visual_parts": [],
        }]

        with (
            patch("backend.app.generate_visual_argument_cards", return_value=[]),
            patch("backend.app.generate_chat", side_effect=RuntimeError("Gemini model request failed")),
        ):
            with self.assertRaisesRegex(RuntimeError, "Gemini model request failed"):
                generate_reference_style_multisource_notes(
                    source_units,
                    "english",
                    {"depth": "detailed", "config": {}},
                    "professor_mode",
                )

    def test_generate_chat_uses_gemini_client_when_provider_is_gemini(self):
        class FakeCompletions:
            def __init__(self, content):
                self.content = content
                self.calls = []

            def create(self, **kwargs):
                self.calls.append(kwargs)
                return SimpleNamespace(
                    choices=[
                        SimpleNamespace(
                            message=SimpleNamespace(content=self.content),
                        ),
                    ],
                    usage=SimpleNamespace(prompt_tokens=1, completion_tokens=2, total_tokens=3),
                )

        class FakeClient:
            def __init__(self, content):
                self.completions = FakeCompletions(content)
                self.chat = SimpleNamespace(completions=self.completions)

        openai_client = FakeClient("openai output")
        gemini_client = FakeClient("gemini output")

        trace_token = backend_app_module.begin_ai_call_trace()
        with (
            patch.object(backend_app_module, "AI_TEXT_PROVIDER", "gemini", create=True),
            patch.object(backend_app_module, "client", openai_client),
            patch.object(backend_app_module, "text_generation_client", return_value=gemini_client, create=True),
        ):
            result = backend_app_module.generate_chat(
                [{"role": "user", "content": "Use the selected Synapse prompt."}],
                model="gemini-2.5-flash",
                temperature=0,
                max_tokens=20,
            )
        trace = backend_app_module.current_ai_call_trace()
        backend_app_module.reset_ai_call_trace(trace_token)

        self.assertEqual(result, "gemini output")
        self.assertEqual(len(gemini_client.completions.calls), 1)
        self.assertEqual(len(openai_client.completions.calls), 0)
        self.assertEqual(gemini_client.completions.calls[0]["model"], "gemini-2.5-flash")
        self.assertEqual(len(trace), 1)
        self.assertEqual(trace[0]["status"], "success")
        self.assertTrue(trace[0]["api_request_attempted"])
        self.assertEqual(trace[0]["model"], "gemini-2.5-flash")
        self.assertEqual(trace[0]["total_tokens"], 3)

    def test_deepseek_generation_disables_thinking_by_default(self):
        class FakeCompletions:
            def __init__(self):
                self.calls = []

            def create(self, **kwargs):
                self.calls.append(kwargs)
                return SimpleNamespace(
                    choices=[SimpleNamespace(message=SimpleNamespace(content="DeepSeek response"))],
                    usage=SimpleNamespace(prompt_tokens=1, completion_tokens=2, total_tokens=3),
                )

        completions = FakeCompletions()
        deepseek_client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
        with (
            patch.object(backend_app_module, "text_generation_client", return_value=deepseek_client),
            patch.object(backend_app_module, "active_text_provider", return_value="deepseek"),
        ):
            response = backend_app_module.generate_chat(
                [{"role": "user", "content": "Explain photosynthesis."}],
                model="deepseek-v4-flash",
                max_tokens=120,
            )

        self.assertEqual(response, "DeepSeek response")
        self.assertEqual(completions.calls[0]["extra_body"], {"thinking": {"type": "disabled"}})

    def test_deepseek_generation_caps_oversized_output_budget(self):
        class FakeCompletions:
            def __init__(self):
                self.calls = []

            def create(self, **kwargs):
                self.calls.append(kwargs)
                return SimpleNamespace(
                    choices=[SimpleNamespace(message=SimpleNamespace(content="DeepSeek response"))],
                    usage=SimpleNamespace(prompt_tokens=1, completion_tokens=2, total_tokens=3),
                )

        completions = FakeCompletions()
        deepseek_client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
        with (
            patch.object(backend_app_module, "DEEPSEEK_MAX_OUTPUT_TOKENS", 650),
            patch.object(backend_app_module, "text_generation_client", return_value=deepseek_client),
            patch.object(backend_app_module, "active_text_provider", return_value="deepseek"),
        ):
            backend_app_module.generate_chat(
                [{"role": "user", "content": "Explain photosynthesis."}],
                model="deepseek-v4-flash",
                max_tokens=8000,
            )

        self.assertEqual(completions.calls[0]["max_tokens"], 650)

    def test_missing_deepseek_client_reports_deepseek_configuration(self):
        with (
            patch.object(backend_app_module, "text_generation_client", return_value=None),
            patch.object(backend_app_module, "active_text_provider", return_value="deepseek"),
        ):
            with self.assertRaisesRegex(RuntimeError, "DEEPSEEK_API_KEY.*not configured"):
                backend_app_module.generate_chat([
                    {"role": "user", "content": "Explain photosynthesis."},
                ])

    def test_deepseek_mind_map_uses_a_deepseek_model(self):
        class FakeCompletions:
            def __init__(self):
                self.calls = []

            def create(self, **kwargs):
                self.calls.append(kwargs)
                return SimpleNamespace(
                    choices=[SimpleNamespace(message=SimpleNamespace(content='{"center":"Enzymes","branches":[]}'))],
                    usage=SimpleNamespace(prompt_tokens=1, completion_tokens=2, total_tokens=3),
                )

        completions = FakeCompletions()
        deepseek_client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
        runtime_config = importlib.import_module(backend_app_module.mindmap_model_for_active_provider.__module__)
        with (
            patch.object(backend_app_module, "MINDMAP_MODEL", "gpt-5.4-mini"),
            patch.object(backend_app_module, "text_generation_client", return_value=deepseek_client),
            patch.object(runtime_config, "active_text_provider", return_value="deepseek"),
        ):
            backend_app_module.generate_ai_mind_map(
                "Enzymes",
                {"Overview": "Enzymes lower activation energy."},
            )

        self.assertEqual(completions.calls[0]["model"], "deepseek-v4-flash")

    def test_deepseek_default_chat_model_is_provider_scoped(self):
        class FakeCompletions:
            def __init__(self):
                self.calls = []

            def create(self, **kwargs):
                self.calls.append(kwargs)
                return SimpleNamespace(
                    choices=[SimpleNamespace(message=SimpleNamespace(content="DeepSeek response"))],
                    usage=SimpleNamespace(prompt_tokens=1, completion_tokens=2, total_tokens=3),
                )

        completions = FakeCompletions()
        deepseek_client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
        runtime_config = importlib.import_module(backend_app_module.chat_model_for_active_provider.__module__)
        with (
            patch.object(backend_app_module, "text_generation_client", return_value=deepseek_client),
            patch.object(runtime_config, "active_text_provider", return_value="deepseek"),
        ):
            backend_app_module.generate_chat([
                {"role": "user", "content": "Explain enzymes."},
            ], max_tokens=120)

        self.assertEqual(completions.calls[0]["model"], "deepseek-v4-flash")

    def test_gemini_adc_client_uses_vertex_openai_endpoint_and_token(self):
        class FakeCredentials:
            token = "adc-token"

            def __init__(self):
                self.refreshed = False

            def refresh(self, request):
                self.refreshed = request == "adc-request"

        credentials = FakeCredentials()

        with (
            patch.object(core_config, "AI_TEXT_PROVIDER", "gemini"),
            patch.object(core_config, "GEMINI_AUTH_MODE", "adc", create=True),
            patch.object(core_config, "GEMINI_PROJECT_ID", "synapse-project", create=True),
            patch.object(core_config, "GEMINI_LOCATION", "us-central1", create=True),
            patch.object(core_config, "google_auth_default", return_value=(credentials, None), create=True),
            patch.object(core_config, "google_auth_request", return_value="adc-request", create=True),
            patch.object(core_config, "OpenAI") as openai_mock,
        ):
            client = core_config.text_generation_client()

        self.assertIs(client, openai_mock.return_value)
        self.assertTrue(credentials.refreshed)
        openai_mock.assert_called_once_with(
            api_key="adc-token",
            base_url="https://us-central1-aiplatform.googleapis.com/v1/projects/synapse-project/locations/us-central1/endpoints/openapi",
            timeout=core_config.OPENAI_TIMEOUT_SECONDS,
        )

    def test_gemini_adc_global_location_uses_global_vertex_endpoint(self):
        with (
            patch.object(core_config, "GEMINI_PROJECT_ID", "synapse-project", create=True),
            patch.object(core_config, "GEMINI_LOCATION", "global", create=True),
        ):
            self.assertEqual(
                core_config.gemini_vertex_openai_base_url(),
                "https://aiplatform.googleapis.com/v1beta1/projects/synapse-project/locations/global/endpoints/openapi",
            )

    def test_explicit_detail_level_overrides_auto_depth(self):
        payload = choose_learning_depth("Tiny note about slope.", [], "detailed")

        self.assertEqual(payload["depth"], "detailed")
        self.assertTrue(payload["override"])
        self.assertEqual(payload["requested_detail_level"], "detailed")
        self.assertEqual(payload["auto_selected_depth"], "focused")



if __name__ == "__main__":
    unittest.main()
