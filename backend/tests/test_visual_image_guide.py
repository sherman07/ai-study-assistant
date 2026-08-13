import unittest
from unittest.mock import patch
import base64
from io import BytesIO
import os

from fastapi.testclient import TestClient
from PIL import Image

from backend.app import (
    app,
    normalise_visual_image_blueprint,
    render_visual_image_guide_local_b64,
    visual_image_renderer_mode,
    visual_image_blueprint_text,
    visual_image_guide_prompt,
    visual_image_guide_fallback_blueprint,
    visual_image_middle_icon_kinds,
    visual_image_prefers_chinese,
    visual_image_spine_labels,
    visual_image_use_local_renderer,
    normalise_language_key,
    resolve_generation_language_key,
)


OPEN_ECONOMY_NOTES = """
# Professional Study Guide: Open-Economy Macroeconomics

## 1. Big Picture: What This Material Is Really About
This material from BUS115 Week 11 is about building an integrated model for how a country's internal saving and investment decisions connect to the global economy through capital flows, exchange rates, and the trade balance.

## 2. The Exam Will Probably Test These Ideas
The likely assessment task is to trace a policy shock through the three-panel open-economy model instead of only naming the final result.

## The `S = I + NCO` Identity
National saving is split between domestic investment and net capital outflow, so an open economy can save more than it invests domestically by buying foreign assets.

## The Three-Panel Open-Economy Model
A budget deficit reduces public saving, shifts the loanable-funds supply curve left, raises the real interest rate, reduces net capital outflow, appreciates the real exchange rate, and lowers net exports.

## Common Mistakes That Lose Marks
Students often confuse national saving with domestic investment, shift the wrong curve, or forget that the foreign-exchange supply curve is determined by net capital outflow.
"""

SCIENCE_NOTES = """
# Professional Study Guide: Photosynthesis and Cellular Respiration

## 1. Core Idea
Photosynthesis stores light energy in glucose, while cellular respiration releases that stored energy as ATP for cell work.

## 2. Key Equation
Photosynthesis: 6CO2 + 6H2O + light -> C6H12O6 + 6O2. Respiration reverses the energy flow by breaking glucose down with oxygen.

## 3. Process Map
Chloroplasts capture light in the thylakoid membranes, build sugar in the Calvin cycle, and mitochondria later use glycolysis, the Krebs cycle, and oxidative phosphorylation to make ATP.

## 4. Evidence and Experiment
A leaf-disc flotation experiment shows oxygen production because discs float faster when photosynthesis is active under light.

## 5. Common Mistake
Students often say plants only photosynthesise, but plant cells also respire continuously to release usable ATP.
"""

CHINESE_OPEN_ECONOMY_NOTES = """
# 开放经济宏观经济学

国民储蓄、投资、净资本流出、实际利率、汇率和净出口共同构成开放经济模型。
开放经济恒等式是 S = I + NCO，且 NX = NCO。
"""


class VisualImageGuideTests(unittest.TestCase):
    def test_fallback_blueprint_uses_generated_note_content_not_placeholder(self):
        blueprint = visual_image_guide_fallback_blueprint("BUS115 - Week 11", OPEN_ECONOMY_NOTES)
        text = visual_image_blueprint_text(blueprint)

        self.assertNotIn("Use the corresponding source concept", text)
        self.assertIn("capital flows", text)
        self.assertTrue(
            any("net capital outflow" in (panel.get("detail") or "").lower() for panel in blueprint["panels"])
        )

    def test_fallback_blueprint_promotes_source_topic_over_course_code_title(self):
        blueprint = visual_image_guide_fallback_blueprint("BUS115 - Week 11", OPEN_ECONOMY_NOTES)

        self.assertIn("Open-Economy Macroeconomics", blueprint["title"])
        self.assertNotEqual("BUS115 - Week 11", blueprint["title"])

    def test_open_economy_blueprint_uses_open_economy_spine_not_machine_learning(self):
        blueprint = visual_image_guide_fallback_blueprint("BUS115 - Week 11", OPEN_ECONOMY_NOTES)
        labels = visual_image_spine_labels("english", blueprint)
        icons = visual_image_middle_icon_kinds(blueprint)

        self.assertIn("NCO", labels)
        self.assertIn("NX", labels)
        self.assertNotIn("Training", labels)
        self.assertTrue(any("loanable" in item for item in icons))
        self.assertTrue(any("exchange" in item for item in icons))

    def test_normalise_blueprint_replaces_generic_placeholder_details(self):
        parsed = {
            "panels": [
                {
                    "title": "The `S = I + NCO` Identity",
                    "visual": "",
                    "labels": ["S = I + NCO"],
                    "detail": "Use the corresponding source concept as a visual panel.",
                }
            ]
        }

        blueprint = normalise_visual_image_blueprint(parsed, "BUS115 - Week 11", OPEN_ECONOMY_NOTES)
        panel = blueprint["panels"][0]

        self.assertNotIn("Use the corresponding source concept", panel["detail"])
        self.assertIn("National saving", panel["detail"])

    def test_open_economy_local_renderer_uses_portrait_domain_layout_in_chinese(self):
        blueprint = visual_image_guide_fallback_blueprint("BUS115 - Week 11", OPEN_ECONOMY_NOTES)

        with patch("backend.app.VISUAL_IMAGE_GUIDE_SIZE", "1024x1536"):
            image_b64, metadata = render_visual_image_guide_local_b64("BUS115 - Week 11", blueprint, "zh")

        image = Image.open(BytesIO(base64.b64decode(image_b64)))
        visible_labels = " ".join(metadata.get("visible_labels") or [])

        self.assertGreater(image.size[1], image.size[0])
        self.assertEqual("open-economy-reference-wallchart-v3", metadata.get("layout"))
        self.assertEqual([896, 1200], metadata.get("reference_canvas"))
        self.assertIn("top-formula-table", metadata.get("reference_features") or [])
        self.assertIn("compact-horizontal-bands", metadata.get("reference_features") or [])
        self.assertIn("可贷资金市场、储蓄与开放经济分析", visible_labels)
        self.assertIn("可贷资金市场与储蓄", visible_labels)
        self.assertIn("政府预算与公共储蓄", visible_labels)
        self.assertIn("开放经济与资本流动", visible_labels)
        self.assertIn("典型案例分析", visible_labels)
        self.assertIn("投资税收抵免的三面板分析", visible_labels)
        self.assertIn("实际汇率与名义汇率换算", visible_labels)
        self.assertIn("案例 2：新西兰禁止海上油气勘探", visible_labels)
        self.assertIn("案例 3：希腊信用评级下调 (2009)", visible_labels)
        self.assertIn("RER = NER · P国内 / P国外", visible_labels)
        self.assertIn("T > G", visible_labels)
        self.assertIn("S = I + NCO", visible_labels)
        self.assertIn("NX = NCO", visible_labels)
        self.assertNotIn("Learning Mechanism", visible_labels)
        self.assertNotIn("Data", visible_labels)

    def test_open_economy_local_renderer_uses_reference_wall_chart_in_english(self):
        blueprint = visual_image_guide_fallback_blueprint("BUS115 - Week 11", OPEN_ECONOMY_NOTES)

        with patch("backend.app.VISUAL_IMAGE_GUIDE_SIZE", "1024x1536"):
            image_b64, metadata = render_visual_image_guide_local_b64("BUS115 - Week 11", blueprint, "english")

        image = Image.open(BytesIO(base64.b64decode(image_b64)))
        visible_labels = " ".join(metadata.get("visible_labels") or [])

        self.assertGreater(image.size[1], image.size[0])
        self.assertEqual("open-economy-reference-wallchart-v3", metadata.get("layout"))
        self.assertEqual([896, 1200], metadata.get("reference_canvas"))
        self.assertIn("top-formula-table", metadata.get("reference_features") or [])
        self.assertIn("compact-horizontal-bands", metadata.get("reference_features") or [])
        self.assertIn("Loanable Funds, Saving, and Open Economy Analysis", visible_labels)
        self.assertIn("Loanable Funds and Saving", visible_labels)
        self.assertIn("Government Budget and Public Saving", visible_labels)
        self.assertIn("Open Economy and Capital Flows", visible_labels)
        self.assertIn("Case Study Analysis", visible_labels)
        self.assertIn("Investment Tax Credit Three-Panel Analysis", visible_labels)
        self.assertIn("Real and Nominal Exchange Rate Conversion", visible_labels)
        self.assertIn("S = I + NCO", visible_labels)
        self.assertIn("NX = NCO", visible_labels)
        self.assertNotIn("Learning Mechanism", visible_labels)
        self.assertNotIn("Use the corresponding source concept", visible_labels)

    def test_generic_local_renderer_uses_dense_portrait_layout_not_learning_mechanism_template(self):
        blueprint = visual_image_guide_fallback_blueprint("BIO101 - Week 5", SCIENCE_NOTES)

        with patch("backend.app.VISUAL_IMAGE_GUIDE_SIZE", "1024x1536"):
            image_b64, metadata = render_visual_image_guide_local_b64("BIO101 - Week 5", blueprint, "english")

        image = Image.open(BytesIO(base64.b64decode(image_b64)))
        visible_labels = " ".join(metadata.get("visible_labels") or [])

        self.assertGreater(image.size[1], image.size[0])
        self.assertEqual("dense-portrait-grid-v1", metadata.get("layout"))
        self.assertIn("Photosynthesis and Cellular Respiration", visible_labels)
        self.assertIn("Concept Map", visible_labels)
        self.assertIn("Evidence", visible_labels)
        self.assertIn("Revision Check", visible_labels)
        self.assertNotIn("Learning Mechanism", visible_labels)
        self.assertNotIn("Fill the central area", visible_labels)
        self.assertNotIn("Use the corresponding source concept", visible_labels)

    def test_visual_image_guide_endpoint_returns_frontend_compatible_v12_image_shape(self):
        with patch.dict(os.environ, {
            "VISUAL_IMAGE_GUIDE_BLUEPRINT": "false",
            "VISUAL_IMAGE_GUIDE_RENDERER": "local",
        }), patch(
            "backend.app.VISUAL_IMAGE_GUIDE_SIZE",
            "1024x1536",
        ):
            response = TestClient(app).post(
                "/visual-image-guide/generate",
                json={
                    "title": "BIO101 - Week 5",
                    "summary": SCIENCE_NOTES,
                    "preferred_language": "english",
                    "sources": [],
                    "visual_gallery": [],
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["title"], "Photosynthesis and Cellular Respiration")
        self.assertEqual(payload["style_version"], "grid-infographic-v13")
        self.assertEqual(payload["size"], "1024x1536")
        self.assertEqual(payload["image_processing"]["layout"], "dense-portrait-grid-v1")
        self.assertTrue(payload["image_data_url"].startswith("data:image/png;base64,"))
        image = Image.open(BytesIO(base64.b64decode(payload["image_data_url"].split(",", 1)[1])))
        self.assertGreater(image.size[1], image.size[0])

    def test_visual_image_renderer_defaults_to_openai_not_local_placeholder(self):
        with patch.dict(os.environ, {"VISUAL_IMAGE_GUIDE_RENDERER": ""}):
            self.assertEqual("openai", visual_image_renderer_mode())
            self.assertFalse(visual_image_use_local_renderer())

    def test_auto_language_defaults_to_english_but_explicit_chinese_still_available(self):
        chinese_blueprint = visual_image_guide_fallback_blueprint("开放经济宏观经济学", CHINESE_OPEN_ECONOMY_NOTES)

        self.assertEqual("english", resolve_generation_language_key("auto", CHINESE_OPEN_ECONOMY_NOTES))
        self.assertEqual("simplified_chinese", normalise_language_key("chinese"))
        self.assertFalse(visual_image_prefers_chinese("english", chinese_blueprint))
        self.assertTrue(visual_image_prefers_chinese("simplified_chinese", chinese_blueprint))

    def test_visual_image_guide_endpoint_sends_gpt_image_15_payload_when_openai_renderer_enabled(self):
        class FakeImageResponse:
            ok = True
            status_code = 200
            text = ""

            def json(self):
                return {"created": 123, "data": [{"b64_json": "FAKE_IMAGE_B64"}]}

        with patch.dict(os.environ, {
            "VISUAL_IMAGE_GUIDE_BLUEPRINT": "false",
            "VISUAL_IMAGE_GUIDE_RENDERER": "openai",
        }), patch("backend.app.require_openai_api"), patch(
            "backend.app.VISUAL_IMAGE_GUIDE_MODEL",
            "gpt-image-1.5",
        ), patch("backend.app.VISUAL_IMAGE_GUIDE_SIZE", "1024x1536"), patch(
            "backend.app.VISUAL_IMAGE_GUIDE_QUALITY",
            "medium",
        ), patch(
            "backend.app.enhance_visual_image_guide_b64",
            return_value=("FAKE_IMAGE_B64", {"enhanced": False}),
        ), patch(
            "backend.app.requests.post",
            return_value=FakeImageResponse(),
        ) as request_post:
            response = TestClient(app).post(
                "/visual-image-guide/generate",
                json={
                    "title": "BIO101 - Week 5",
                    "summary": SCIENCE_NOTES,
                    "preferred_language": "english",
                    "sources": [],
                    "visual_gallery": [],
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        request_payload = request_post.call_args.kwargs["json"]

        self.assertEqual("gpt-image-1.5", request_payload["model"])
        self.assertEqual("1024x1536", request_payload["size"])
        self.assertEqual("medium", request_payload["quality"])
        self.assertEqual("png", request_payload["output_format"])
        self.assertEqual("gpt-image-1.5", payload["model"])
        self.assertEqual("grid-infographic-v13", payload["style_version"])
        self.assertTrue(payload["image_data_url"].startswith("data:image/png;base64,"))

    def test_visual_image_guide_retries_transient_openai_image_5xx_before_success(self):
        class FakeImageResponse:
            def __init__(self, ok, status_code, body):
                self.ok = ok
                self.status_code = status_code
                self.text = body

            def json(self):
                if isinstance(self.text, dict):
                    return self.text
                raise ValueError("not json")

        with patch.dict(os.environ, {
            "VISUAL_IMAGE_GUIDE_BLUEPRINT": "false",
            "VISUAL_IMAGE_GUIDE_RENDERER": "openai",
            "VISUAL_IMAGE_GUIDE_RETRIES": "1",
            "VISUAL_IMAGE_GUIDE_STRICT_CJK_LOCAL": "false",
            "VISUAL_IMAGE_GUIDE_DOMAIN_LOCAL": "false",
        }), patch("backend.app.require_openai_api"), patch(
            "backend.app.VISUAL_IMAGE_GUIDE_MODEL",
            "gpt-image-1.5",
        ), patch("backend.app.VISUAL_IMAGE_GUIDE_SIZE", "1024x1536"), patch(
            "backend.app.enhance_visual_image_guide_b64",
            return_value=("FAKE_IMAGE_B64", {"enhanced": False}),
        ), patch(
            "backend.app.requests.post",
            side_effect=[
                FakeImageResponse(False, 520, "<html><title>api.openai.com | 520</title>cloudflare</html>"),
                FakeImageResponse(True, 200, {"created": 456, "data": [{"b64_json": "FAKE_IMAGE_B64"}]}),
            ],
        ) as request_post:
            response = TestClient(app).post(
                "/visual-image-guide/generate",
                json={
                    "title": "BIO101 - Week 5",
                    "summary": SCIENCE_NOTES,
                    "preferred_language": "english",
                    "sources": [],
                    "visual_gallery": [],
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(2, request_post.call_count)
        self.assertEqual("gpt-image-1.5", response.json()["model"])
        self.assertTrue(response.json()["image_data_url"].startswith("data:image/png;base64,"))

    def test_visual_image_guide_returns_local_fallback_when_openai_image_5xx_persists(self):
        class FakeImageResponse:
            ok = False
            status_code = 520
            text = "<html><title>api.openai.com | 520</title><body>cloudflare body</body></html>"

            def json(self):
                raise ValueError("not json")

        with patch.dict(os.environ, {
            "VISUAL_IMAGE_GUIDE_BLUEPRINT": "false",
            "VISUAL_IMAGE_GUIDE_RENDERER": "openai",
            "VISUAL_IMAGE_GUIDE_RETRIES": "1",
            "VISUAL_IMAGE_GUIDE_STRICT_CJK_LOCAL": "false",
            "VISUAL_IMAGE_GUIDE_DOMAIN_LOCAL": "false",
        }), patch("backend.app.require_openai_api"), patch(
            "backend.app.VISUAL_IMAGE_GUIDE_MODEL",
            "gpt-image-1.5",
        ), patch("backend.app.VISUAL_IMAGE_GUIDE_SIZE", "1024x1536"), patch(
            "backend.app.requests.post",
            return_value=FakeImageResponse(),
        ) as request_post:
            response = TestClient(app).post(
                "/visual-image-guide/generate",
                json={
                    "title": "BUS115 - Week 11",
                    "summary": OPEN_ECONOMY_NOTES,
                    "preferred_language": "zh",
                    "sources": [],
                    "visual_gallery": [],
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(2, request_post.call_count)
        self.assertEqual("synapse-local-image-renderer-fallback", payload["model"])
        self.assertEqual("gpt-image-1.5", payload["requested_model"])
        self.assertEqual("grid-infographic-v13", payload["style_version"])
        self.assertTrue(payload["image_data_url"].startswith("data:image/png;base64,"))
        self.assertIn("GPT Image generation failed", payload["warning"])
        self.assertNotIn("<html", payload["warning"].lower())
        self.assertNotIn("cloudflare body", payload["warning"].lower())

    def test_chinese_visual_image_guide_uses_strict_text_renderer_before_openai_image(self):
        with patch.dict(os.environ, {
            "VISUAL_IMAGE_GUIDE_BLUEPRINT": "false",
            "VISUAL_IMAGE_GUIDE_RENDERER": "openai",
            "VISUAL_IMAGE_GUIDE_STRICT_CJK_LOCAL": "true",
        }), patch("backend.app.requests.post") as request_post:
            response = TestClient(app).post(
                "/visual-image-guide/generate",
                json={
                    "title": "BUS115 - Week 11",
                    "summary": OPEN_ECONOMY_NOTES,
                    "preferred_language": "zh",
                    "sources": [],
                    "visual_gallery": [],
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        request_post.assert_not_called()
        self.assertEqual("synapse-local-image-renderer-strict-text", payload["model"])
        self.assertEqual("gpt-image-1.5", payload["requested_model"])
        self.assertEqual("grid-infographic-v13", payload["style_version"])
        self.assertIn("exact Chinese labels", payload["rendering_note"])
        self.assertEqual("open-economy-reference-wallchart-v3", payload["image_processing"]["layout"])
        self.assertEqual([896, 1200], payload["image_processing"]["reference_canvas"])
        self.assertTrue(payload["image_data_url"].startswith("data:image/png;base64,"))

    def test_open_economy_visual_image_guide_defaults_to_gpt_image_15_for_auto_english(self):
        class FakeImageResponse:
            ok = True
            status_code = 200
            text = ""

            def json(self):
                return {"created": 789, "data": [{"b64_json": "FAKE_IMAGE_B64"}]}

        with patch.dict(os.environ, {
            "VISUAL_IMAGE_GUIDE_BLUEPRINT": "false",
            "VISUAL_IMAGE_GUIDE_RENDERER": "openai",
            "VISUAL_IMAGE_GUIDE_STRICT_CJK_LOCAL": "true",
            "VISUAL_IMAGE_GUIDE_DOMAIN_LOCAL": "",
        }), patch("backend.app.require_openai_api"), patch(
            "backend.app.VISUAL_IMAGE_GUIDE_MODEL",
            "gpt-image-1.5",
        ), patch("backend.app.VISUAL_IMAGE_GUIDE_SIZE", "1536x1024"), patch(
            "backend.app.VISUAL_IMAGE_GUIDE_QUALITY",
            "medium",
        ), patch(
            "backend.app.enhance_visual_image_guide_b64",
            return_value=("FAKE_IMAGE_B64", {"enhanced": False}),
        ), patch("backend.app.requests.post", return_value=FakeImageResponse()) as request_post:
            response = TestClient(app).post(
                "/visual-image-guide/generate",
                json={
                    "title": "BUS115 - Week 11",
                    "summary": OPEN_ECONOMY_NOTES,
                    "preferred_language": "auto",
                    "sources": [],
                    "visual_gallery": [],
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(1, request_post.call_count)
        self.assertEqual("gpt-image-1.5", payload["model"])
        self.assertEqual("english", payload["language"])
        request_payload = request_post.call_args.kwargs["json"]
        self.assertEqual("gpt-image-1.5", request_payload["model"])
        self.assertEqual("1024x1536", request_payload["size"])
        self.assertEqual("1024x1536", payload["size"])
        self.assertIn("Open-Economy Macroeconomics", request_payload["prompt"])
        self.assertIn("reference-style educational infographic", request_payload["prompt"])



if __name__ == "__main__":
    unittest.main()
