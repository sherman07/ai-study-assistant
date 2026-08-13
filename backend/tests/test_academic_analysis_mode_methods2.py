import os
from pathlib import Path
import re
import unittest
from unittest.mock import patch

from backend.core.note_prompt_modes import (
    COMMON_PROMPT_DIR,
    NOTE_PROMPT_MODES,
    PROMPT_MODE_DIR,
    load_note_prompt_mode_text,
    normalise_note_prompt_mode,
    note_length_mode_options,
    note_prompt_mode_label,
    note_prompt_mode_options,
    prompt_mode_prompt_hash,
)
from backend.core.prompt_modes.build_prompt import (
    build_note_prompt,
    prompt_mode_isolation_warnings,
    validate_prompt_mode_isolation,
)
from backend.core.prompt_modes.registry import validate_note_output
from backend.app import (
    advanced_notes_quality_flags,
    build_analysis_fingerprint,
    expand_sparse_inline_summary,
    finalize_generated_summary,
    generate_reference_style_multisource_notes,
)


class ProfessionalModeTests(unittest.TestCase):
    def test_non_professional_expansion_prompt_stays_mode_specific(self):
        captured_prompts = []

        def fake_generate_chat(messages, **kwargs):
            captured_prompts.append(messages[-1]["content"])
            return "# Detailed Explanation\n\n" + ("This expanded explanation stays in the selected mode. " * 120)

        with patch("backend.app.generate_chat", side_effect=fake_generate_chat):
            expand_sparse_inline_summary(
                "# Short\n\nToo thin.",
                "Vectors represent magnitude and direction.",
                "",
                "english",
                100,
                force=True,
                prompt_mode="detailed_explanation",
            )

        prompt = captured_prompts[0]
        self.assertIn("Selected prompt mode: Detailed Explanation", prompt)
        self.assertIn("# Synapse Mode: Detailed Explanation", prompt)
        self.assertNotIn("professional, detailed tutor-style study guide", prompt.lower())
        self.assertNotIn("not enough advanced tutor detail", prompt.lower())

    def test_finalization_dispatches_through_selected_mode_validator(self):
        calls = []

        def fake_validate(mode_key, summary, context):
            calls.append((mode_key, context.get("note_length_mode")))
            return f"{summary}\n\nvalidated:{mode_key}"

        with patch("backend.app.validate_note_output", side_effect=fake_validate):
            final = finalize_generated_summary(
                "# Quick\n\nAnswer.",
                requested_language="english",
                generation_language="english",
                prompt_mode="quick_answer",
                note_length_mode="quick_review",
                attach_visuals=False,
            )

        self.assertIn("validated:quick_answer", final)
        self.assertEqual(calls, [("quick_answer", "quick_review")])

    def test_professional_mode_propagates_model_failure(self):
        source_units = [{
            "display_name": "vaccination-ethics.pdf",
            "title_candidate": "Vaccination Ethics",
            "text_excerpt": "Vaccination ethics involves autonomy, public health benefit, justice, proportionality, and trust.",
            "visual_parts": [],
        }]

        with patch("backend.app.generate_chat", side_effect=RuntimeError("forced model failure")):
            with self.assertRaisesRegex(RuntimeError, "forced model failure"):
                generate_reference_style_multisource_notes(
                    source_units,
                    "english",
                    {"depth": "detailed", "config": {}},
                    "professor_mode",
                )

    def test_professional_mode_never_replaces_failed_model_output_with_local_notes(self):
        source_units = [
            {
                "display_name": "human-nature.pdf",
                "title_candidate": "Human Nature and Aggression",
                "text_excerpt": "Are humans selfish or cooperative? The source contrasts violent human nature claims with aggression, one thing one cause, and the hydraulic model of aggression.",
                "visual_parts": [],
            },
            {
                "display_name": "ata-castaways",
                "title_candidate": "Six Tongan Castaways in Ata Island",
                "text_excerpt": "Six classmates from St Andrews College in Tonga were shipwrecked on Ata in June 1965 and survived through cooperation.",
                "visual_parts": [],
            },
            {
                "display_name": "two-monkeys",
                "title_candidate": "Two Monkeys Were Paid Unequally",
                "text_excerpt": "Frans de Waal's fairness study with capuchin monkeys shows reactions when monkeys are paid unequally.",
                "visual_parts": [],
            },
        ]

        with patch("backend.app.generate_chat", side_effect=RuntimeError("forced model failure")):
            with self.assertRaisesRegex(RuntimeError, "forced model failure"):
                generate_reference_style_multisource_notes(
                    source_units,
                    "english",
                    {"depth": "detailed", "config": {}},
                    "professor_mode",
                )

    def test_non_professional_modes_propagate_model_failures(self):
        source_units = [{
            "display_name": "psych109-development.pdf",
            "title_candidate": "Developmental Psychology",
            "text_excerpt": (
                "The lecture introduces lifespan development, Piaget's movement from reflexes to reason, "
                "attention and distraction, causal reasoning, and genome-wide complex trait analysis."
            ),
            "visual_parts": [],
        }]
        visual_cards = [{
            "title": "Lewontin's argument - different causes of within vs between group differences",
            "caption": "A diagram showing that within-group and between-group differences can have different causes.",
            "what_shows": "Lewontin's plant diagram separates genetic variation from environmental causes.",
            "argument_supported": "Students must not assume a correlation inside one group explains a difference between groups.",
            "url": "/assets/visuals/lewontin.png",
            "visual_kind": "diagram/model",
            "is_likely_decorative": False,
            "score": 0.95,
        }]
        modes = ("quick_answer", "detailed_explanation", "tutor_mode")

        with (
            patch("backend.app.generate_chat", side_effect=RuntimeError("forced model failure")),
            patch("backend.app.generate_visual_argument_cards", return_value=visual_cards),
            patch("backend.app._v23_renderable_visual_cards", side_effect=lambda cards, **kwargs: cards),
        ):
            for mode_key in modes:
                with self.subTest(prompt_mode=mode_key):
                    with self.assertRaisesRegex(RuntimeError, "forced model failure"):
                        generate_reference_style_multisource_notes(
                            source_units,
                            "english",
                            {"depth": "detailed", "config": {}},
                            mode_key,
                        )

    def test_recommended_structure_uses_professional_sections(self):
        sections_dir = Path(__file__).resolve().parents[1] / "app_sections"
        structure_source = "\n".join(
            path.read_text(encoding="utf-8")
            for path in sorted(sections_dir.glob("04*_file_to_source_unit.py"))
        )

        self.assertIn('prompt_mode_key == "professor_mode"', structure_source)
        for heading in [
            "## 1. Big Picture: What This Material Is Really About",
            "## 2. The Exam Will Probably Test These Ideas",
            "## 3. What You Actually Need To Understand",
            "## 4. Deep Explanation of the Core Concepts",
            "## 5. Concept Connections: How The Ideas Work Together",
            "## 6. Background Knowledge Needed To Understand This Properly",
            "## 7. How To Apply This To New Questions",
            "## 8. Common Mistakes That Lose Marks",
            "## 9. High-Quality Student Thinking",
            "## 10. Model High-Quality Answers",
            "## 11. Exam Question Bank",
            "## 12. Memory and Practice",
        ]:
            self.assertIn(heading, structure_source)
    def test_professional_quality_flags_reject_template_like_generic_output(self):
        source_context = "\n".join([
            "Source 1: Human nature material discusses aggression, hydraulic model of aggression, selfishness, cooperation, and whether human nature is violent.",
            "Source 2: Six Tongan Castaways describes shipwrecked classmates on Ata Island cooperating after June 1965.",
            "Source 3: Two Monkeys Were Paid Unequally describes Frans de Waal's fairness study with capuchin monkeys.",
        ])
        generic_summary = "\n\n".join([
            "# Professional Mode Study Guide",
            "## Background Knowledge Layer",
            "Add only the background knowledge that makes the source easier to understand: definitions, discipline logic, assumptions, methods, ethical principles, formulas, or vocabulary that the source appears to expect.",
            "## Application To New Situations",
            "To transfer the idea, identify the concept, explain the mechanism or judgement behind it, then test whether the same conditions and limits apply in the new situation.",
            "## High-Quality Student Thinking",
            "A strong answer does more than repeat the source. It explains why the idea matters, what evidence can and cannot show, how concepts connect, and how the reasoning changes in a new context.",
            "## Model High-Quality Output",
            "A high-quality response states the key judgement clearly, explains the concept behind it, uses the source as an anchor, and shows what follows when the idea is applied beyond the original material.",
        ])

        flags = advanced_notes_quality_flags(generic_summary, source_context)

        self.assertIn("professional output is template-like", flags)
        self.assertIn("too few source-specific concepts", flags)

    def test_professional_mode_expansion_prompt_stays_professional(self):
        captured_prompts = []

        def fake_generate_chat(messages, **kwargs):
            captured_prompts.append(messages[-1]["content"])
            return "\n\n".join([
                "# Professional Mode Study Guide",
                "## Big Picture",
                "[Professional explanation] Expanded professional explanation.",
                "## What You Actually Need To Understand",
                "The key idea, mechanism, assumption, and transfer condition matter. " * 120,
                "## Concept Connections",
                "Ideas connect through dependency, cause, representation, and application. " * 120,
                "## Deep Explanation",
                "The explanation teaches meaning, purpose, mechanism, mistakes, difficulty, and wider connection. " * 120,
                "## Background Knowledge Layer",
                "[Background knowledge] Useful prerequisite knowledge.",
                "## Application To New Situations",
                "[Application] Transfer method.",
                "## High-Quality Student Thinking",
                "Basic, strong, and high-level reasoning.",
                "## Common Mistakes",
                "Misunderstandings.",
                "## How To Use This In Assessment",
                "Assessment use.",
                "## Model High-Quality Output",
                "Model reasoning.",
                "## Memory and Practice",
                "Practice.",
            ])

        with patch("backend.app.generate_chat", side_effect=fake_generate_chat):
            expand_sparse_inline_summary(
                "# Short\n\nToo thin.",
                "Vectors represent magnitude and direction.",
                "",
                "english",
                100,
                force=True,
                prompt_mode="professor_mode",
            )

        prompt = captured_prompts[0]
        self.assertIn("You are expanding Professional Mode", prompt)
        self.assertIn("[Source anchor] = the specific uploaded concept", prompt)
        self.assertNotIn("comparison/evidence table", prompt.lower())
        self.assertNotIn("concept -> source evidence", prompt.lower())
        self.assertNotIn("Source-Strict Research Mode", prompt)
        self.assertNotIn("Tutor Mode", prompt)
        self.assertNotIn("Assignment / APA Mode", prompt)
        self.assertNotIn("professional, detailed tutor-style study guide", prompt.lower())






if __name__ == "__main__":
    unittest.main()
