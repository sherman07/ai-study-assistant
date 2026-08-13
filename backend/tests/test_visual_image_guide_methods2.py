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
    def test_gpt_image_prompt_requires_chinese_visual_labels_when_language_is_chinese(self):
        blueprint = visual_image_guide_fallback_blueprint("BUS115 - Week 11", OPEN_ECONOMY_NOTES)
        prompt = visual_image_guide_prompt("BUS115 - Week 11", OPEN_ECONOMY_NOTES, "", "", "zh", blueprint)

        self.assertIn("All visible non-formula text must be Simplified Chinese", prompt)
        self.assertIn("Translate blueprint titles and labels into Simplified Chinese", prompt)
        self.assertIn("Do not copy English labels such as Big Picture, Loanable Funds, Net Exports, Common Mistakes, or Exam Chain", prompt)
        self.assertIn("Use only these exact Simplified Chinese visible labels", prompt)
        self.assertIn("开放经济宏观经济学", prompt)
        self.assertIn("可贷资金市场", prompt)
        self.assertIn("净资本流出", prompt)
        self.assertIn("外汇市场", prompt)
        self.assertIn("实际汇率", prompt)
        self.assertIn("净出口", prompt)
        self.assertIn("Keep formulas and standard variables exactly: S = I + NCO, NX = NCO, NCO, NX, r, e", prompt)
        self.assertIn("Never invent approximate Chinese-looking glyphs", prompt)
    def test_open_economy_domain_renderer_is_opt_in_before_openai_image(self):
        with patch.dict(os.environ, {
            "VISUAL_IMAGE_GUIDE_BLUEPRINT": "false",
            "VISUAL_IMAGE_GUIDE_RENDERER": "openai",
            "VISUAL_IMAGE_GUIDE_STRICT_CJK_LOCAL": "true",
            "VISUAL_IMAGE_GUIDE_DOMAIN_LOCAL": "true",
        }), patch("backend.app.requests.post") as request_post:
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

        request_post.assert_not_called()
        self.assertEqual("synapse-local-image-renderer-domain", payload["model"])
        self.assertEqual("gpt-image-1.5", payload["requested_model"])
        self.assertEqual("english", payload["language"])
        self.assertEqual("open-economy-reference-wallchart-v3", payload["image_processing"]["layout"])
        self.assertEqual([896, 1200], payload["image_processing"]["reference_canvas"])
        self.assertNotIn("Learning Mechanism", str(payload.get("image_processing", {})))

    def test_gpt_image_prompt_demands_reference_style_and_blocks_bad_template(self):
        blueprint = visual_image_guide_fallback_blueprint("BUS115 - Week 11", OPEN_ECONOMY_NOTES)
        prompt = visual_image_guide_prompt("BUS115 - Week 11", OPEN_ECONOMY_NOTES, "", "", "zh", blueprint)

        self.assertIn("Open-Economy Macroeconomics", prompt)
        self.assertIn("1024x1536", prompt)
        self.assertIn("numbered section bands", prompt)
        self.assertIn("formula/table block", prompt)
        self.assertIn("multiple small supply-demand-style graphs", prompt)
        self.assertIn("case-study or policy-analysis panels", prompt)
        self.assertIn("exam-revision wall chart", prompt)
        self.assertIn("Never use the title \"Learning Mechanism\"", prompt)
        self.assertIn("Never use placeholder text like \"Use the corresponding source concept\"", prompt)
        self.assertIn("Do not use machine-learning labels such as Data, Features, Training, Model, Prediction, or Evaluation", prompt)
        self.assertNotIn("Topic/title: BUS115 - Week 11", prompt)






if __name__ == "__main__":
    unittest.main()
