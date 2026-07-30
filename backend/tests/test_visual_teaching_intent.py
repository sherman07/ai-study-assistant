import unittest

from backend.app import (
    TEACHING_INTENT_CLARITY,
    TEACHING_INTENT_DEEPER,
    _v22_visual_context_for_prompt,
    _v23_enrich_visual_card_details,
    _v23_fallback_visual_cards,
    _v23_parse_relevant_visual_cards,
    default_teaching_goal,
    infer_teaching_intent,
    normalise_teaching_intent,
    normalise_visual_image_blueprint,
    source_figure_labels,
    teaching_intent_label,
    visual_image_build_panel,
    visual_image_blueprint_text,
)
from backend.core.prompt_modes.build_prompt import build_note_prompt
from backend.core.prompt_modes.registry import load_common_prompt_text


class TeachingIntentHelpersTest(unittest.TestCase):
    def test_normalise_teaching_intent_aliases(self):
        self.assertEqual(normalise_teaching_intent("clarity"), TEACHING_INTENT_CLARITY)
        self.assertEqual(normalise_teaching_intent("Clarity Focus"), TEACHING_INTENT_CLARITY)
        self.assertEqual(normalise_teaching_intent("deeper-analysis"), TEACHING_INTENT_DEEPER)
        self.assertEqual(normalise_teaching_intent("deep dive"), TEACHING_INTENT_DEEPER)
        self.assertEqual(normalise_teaching_intent("unknown"), "")

    def test_infer_teaching_intent_prefers_deeper_for_evidence_figures(self):
        intent = infer_teaching_intent({
            "title": "Result correlation table",
            "visual_kind": "data/table",
            "what_shows": "Correlation results across conditions",
            "exam_use": "Use the evidence in an evaluation answer",
        })
        self.assertEqual(intent, TEACHING_INTENT_DEEPER)

    def test_infer_teaching_intent_defaults_to_clarity_for_simple_diagrams(self):
        intent = infer_teaching_intent({
            "title": "Process overview",
            "visual_kind": "diagram/model",
            "what_shows": "Labeled boxes and arrows for the process",
        })
        self.assertEqual(intent, TEACHING_INTENT_CLARITY)

    def test_enrich_adds_teaching_intent_and_goal(self):
        labels = source_figure_labels("english")
        card = _v23_enrich_visual_card_details({
            "title": "Supply and demand shift",
            "visual_kind": "graph/chart",
            "caption": "Demand curve shifts right after income rises",
            "what_shows": "Demand curve shifts right after income rises",
            "why_relevant": "Shows how income changes market equilibrium price and quantity.",
            "argument_supported": "Supports the claim that demand shocks move equilibrium.",
            "how_to_read": "Read axes first, then compare the original and shifted curves.",
            "exam_use": "Describe the shift, then explain the equilibrium effect.",
        }, labels)

        self.assertEqual(card["teaching_intent"], TEACHING_INTENT_DEEPER)
        self.assertTrue(card["teaching_goal"])
        self.assertEqual(card["teaching_intent_label"], teaching_intent_label(TEACHING_INTENT_DEEPER, labels))

    def test_parse_relevant_cards_keeps_teaching_intent(self):
        candidates = [{
            "source_index": 1,
            "source_title": "Lecture 3",
            "location": "PPT slide 4",
            "caption": "Labeled synapse diagram with receptors and neurotransmitters",
            "url": "https://example.test/visual.png",
            "visual_kind": "diagram/model",
            "is_likely_decorative": False,
        }]
        raw = """
        {
          "cards": [
            {
              "visual_index": 0,
              "is_useful": true,
              "teaching_intent": "clarity",
              "teaching_goal": "Make the synapse parts easier to decode before memorising names.",
              "title": "Synapse structure",
              "why_relevant": "This slide is dense with labels, so clarity comes first.",
              "what_shows": "Pre-synaptic terminal, synaptic cleft, receptors, and neurotransmitter vesicles.",
              "argument_supported": "Helps students map each labeled part to the transmission sequence.",
              "cross_source_connection": "Connects to the later action-potential discussion.",
              "how_to_read": "Start at the vesicle, follow the arrow across the cleft to the receptor.",
              "exam_use": "Name the parts in order, then explain one step of transmission."
            }
          ]
        }
        """
        cards = _v23_parse_relevant_visual_cards(raw, candidates, source_figure_labels("english"))
        self.assertEqual(len(cards), 1)
        self.assertEqual(cards[0]["teaching_intent"], TEACHING_INTENT_CLARITY)
        self.assertIn("decode", cards[0]["teaching_goal"].lower())

    def test_fallback_cards_include_teaching_intent(self):
        candidates = [{
            "source_index": 1,
            "source_title": "Week 2",
            "location": "PDF page 3",
            "caption": "Table of mean scores across experimental conditions",
            "url": "https://example.test/table.png",
            "visual_kind": "data/table",
            "score": 20,
            "is_likely_decorative": False,
        }]
        cards = _v23_fallback_visual_cards(candidates, source_figure_labels("english"), "english")
        self.assertGreaterEqual(len(cards), 1)
        self.assertEqual(cards[0]["teaching_intent"], TEACHING_INTENT_DEEPER)
        self.assertTrue(cards[0]["teaching_goal"])

    def test_visual_context_includes_teaching_intent(self):
        context = _v22_visual_context_for_prompt([{
            "source_index": 1,
            "location": "PDF page 2",
            "title": "Result table",
            "teaching_intent": "deeper_analysis",
            "teaching_goal": "Interpret what the result table supports and limits.",
            "what_shows": "Group means and confidence intervals",
            "argument_supported": "Supports the treatment effect claim",
            "cross_source_connection": "Links to method section",
        }])
        self.assertIn("Teaching intent: deeper_analysis", context)
        self.assertIn("Learning goal:", context)

    def test_note_prompt_mentions_clarity_and_deeper_analysis(self):
        prompt = build_note_prompt({
            "prompt_mode": "professor_mode",
            "prompt_mode_label": "Professional Mode",
            "language_rule": "Write in English.",
            "note_length_label": "Standard Notes",
            "note_length_min_words": 900,
            "note_length_max_words": 1400,
            "source_list": "Source 1: results.pdf",
            "source_context": "The source explains a result table.",
            "visual_context": (
                "Source figure 0: Source 1 PDF page 2 | Title: Result table | "
                "Teaching intent: deeper_analysis | Learning goal: Interpret the evidence | "
                "Shows: group means"
            ),
            "recommended_structure": "# Topic\n## Big Picture",
        })
        markers = load_common_prompt_text("visual-markers.md")
        self.assertIn("clarity", markers.lower())
        self.assertIn("deeper_analysis", markers)
        self.assertIn("teaching intent", prompt.lower())
        self.assertIn("deeper_analysis", prompt)

    def test_image_guide_blueprint_preserves_panel_teaching_intent(self):
        blueprint = normalise_visual_image_blueprint({
            "title": "Open economy overview",
            "subtitle": "From saving to NX",
            "central_visual": "Flow from saving to NCO to exchange rate to NX",
            "middle_focus": "Identity link NX = NCO",
            "panels": [
                {
                    "title": "Loanable funds",
                    "teaching_intent": "clarity",
                    "visual": "supply-demand graph with labeled axes",
                    "labels": ["r", "S", "I"],
                    "detail": "Decode the axes and curves first",
                },
                {
                    "title": "Policy shock",
                    "teaching_intent": "deeper_analysis",
                    "visual": "curve shift with before/after equilibrium",
                    "labels": ["deficit", "NCO"],
                    "detail": "Analyse how a budget deficit changes NCO and NX",
                },
            ],
        }, "Open economy", "Saving, investment, NCO, NX identities and curve shifts")
        intents = [panel.get("teaching_intent") for panel in blueprint["panels"][:2]]
        self.assertEqual(intents[0], TEACHING_INTENT_CLARITY)
        self.assertEqual(intents[1], TEACHING_INTENT_DEEPER)
        text = visual_image_blueprint_text(blueprint)
        self.assertIn("Teaching intent: clarity", text)
        self.assertIn("Teaching intent: deeper_analysis", text)

    def test_fallback_panel_assigns_teaching_intent(self):
        panel = visual_image_build_panel("Worked exam example", "Use the formula and interpret the limit of the result.", 1)
        self.assertIn(panel["teaching_intent"], {TEACHING_INTENT_CLARITY, TEACHING_INTENT_DEEPER})
        self.assertTrue(default_teaching_goal({"title": panel["title"], "teaching_intent": panel["teaching_intent"]}))


if __name__ == "__main__":
    unittest.main()
