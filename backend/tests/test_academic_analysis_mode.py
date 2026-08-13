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
    def test_professor_mode_key_is_presented_as_professional_mode(self):
        options = {item["value"]: item["label"] for item in note_prompt_mode_options()}

        self.assertEqual(options["professor_mode"], "Professional Mode")
        self.assertEqual(note_prompt_mode_label("professor_mode"), "Professional Mode")
        self.assertEqual(normalise_note_prompt_mode("academic analysis"), "professor_mode")
        self.assertEqual(normalise_note_prompt_mode("professional mode"), "professor_mode")

    def test_each_prompt_mode_uses_dedicated_prompt_file(self):
        files = [config["file"] for config in NOTE_PROMPT_MODES.values()]

        self.assertEqual(len(files), len(set(files)))
        for key, config in NOTE_PROMPT_MODES.items():
            with self.subTest(prompt_mode=key):
                prompt_path = PROMPT_MODE_DIR / config["file"]
                self.assertTrue(prompt_path.exists(), f"Missing prompt file: {prompt_path}")
                self.assertIn("#", prompt_path.read_text(encoding="utf-8"))

    def test_builder_loads_common_prompt_and_only_selected_mode(self):
        prompt = build_note_prompt({
            "prompt_mode": "professor_mode",
            "prompt_mode_label": "Professional Mode",
            "language_rule": "Write in English.",
            "note_length_label": "Standard Notes",
            "note_length_min_words": 900,
            "note_length_max_words": 1400,
            "source_list": "Source 1: vectors.pdf",
            "source_context": "Vectors represent magnitude and direction.",
            "visual_context": "No relevant source figures were selected.",
            "recommended_structure": "# [specific topic title]\n## Big Picture",
        })

        self.assertIn("Common prompt files:", prompt)
        self.assertIn("Mode-specific prompt file:", prompt)
        self.assertIn("# Synapse Mode: Professional Mode", prompt)
        self.assertIn("Vectors represent magnitude and direction.", prompt)
        self.assertNotIn("# Quick Answer", prompt)
        self.assertNotIn("# Detailed Explanation", prompt)
        self.assertNotIn("# Tutor Mode", prompt)
        self.assertNotIn("# Source-Strict Research Mode", prompt)
        self.assertNotIn("# Assignment / APA Mode", prompt)

    def test_builder_places_selected_visual_markers_inline(self):
        prompt = build_note_prompt({
            "prompt_mode": "professor_mode",
            "prompt_mode_label": "Professional Mode",
            "language_rule": "Write in English.",
            "note_length_label": "Standard Notes",
            "note_length_min_words": 900,
            "note_length_max_words": 1400,
            "source_list": "Source 1: results.pdf",
            "source_context": "The source explains a result table and the data pattern it supports.",
            "visual_context": "Source figure 0: Source 1 PDF page 2 | Title: Result table | Shows: data and comparison groups",
            "recommended_structure": "# [specific topic title]\n## Big Picture",
        })

        self.assertIn("[[VISUAL:0]]", prompt)
        self.assertIn("near the paragraph", prompt)
        self.assertNotIn("Do not emit `[[VISUAL:n]]` markers", prompt)

    def test_builder_has_no_unselected_mode_names_for_every_mode(self):
        for mode_key, config in NOTE_PROMPT_MODES.items():
            with self.subTest(prompt_mode=mode_key):
                prompt = build_note_prompt({
                    "prompt_mode": mode_key,
                    "prompt_mode_label": config["label"],
                    "language_rule": "Write in English.",
                    "note_length_label": "Standard Notes",
                    "note_length_min_words": 900,
                    "note_length_max_words": 1400,
                    "source_list": "Source 1: neutral-source.pdf",
                    "source_context": "This uploaded source explains a neutral concept with examples.",
                    "visual_context": "No relevant source figures were selected.",
                    "recommended_structure": "# [specific topic title]",
                })

                self.assertIn(f"Selected prompt mode: {config['label']} ({mode_key})", prompt)
                self.assertIn(load_note_prompt_mode_text(mode_key), prompt)
                self.assertEqual(prompt_mode_isolation_warnings(prompt, mode_key), [])

    def test_common_prompt_files_do_not_name_specific_modes(self):
        forbidden_terms = (
            "Quick Answer",
            "Detailed Explanation",
            "Professional Mode",
            "professional",
            "Tutor Mode",
            "Source-Strict",
            "source-strict",
            "Assignment / APA",
            "assignment",
            "APA",
            "advanced study tutor",
            "exam",
            "evidence bank",
        )

        for prompt_path in sorted(COMMON_PROMPT_DIR.glob("*.md")):
            text = prompt_path.read_text(encoding="utf-8")
            for term in forbidden_terms:
                with self.subTest(prompt_file=prompt_path.name, term=term):
                    self.assertIsNone(
                        re.search(rf"(?<![a-z0-9]){re.escape(term.lower())}(?![a-z0-9])", text.lower())
                    )

    def test_study_depth_prompt_does_not_request_word_ranges(self):
        prompt = build_note_prompt({
            "prompt_mode": "professor_mode",
            "prompt_mode_label": "Professional Mode",
            "language_rule": "Write in English.",
            "note_length_label": "Deep Study",
            "note_length_min_words": 1800,
            "note_length_max_words": 2500,
            "source_list": "Source 1: aggression.pdf",
            "source_context": "The source explains aggression, cooperation, and fairness examples.",
            "visual_context": "No relevant source figures were selected.",
            "recommended_structure": "# [specific topic title]\n## Big Picture",
        })

        self.assertIn("Selected AI study depth: Deep Study", prompt)
        self.assertIn("content depth", prompt)
        self.assertIn("do not pad", prompt.lower())
        self.assertNotIn("Selected note-length mode", prompt)
        self.assertNotRegex(prompt, r"\b\d{3,4}-\d{3,4}\s+words\b")

    def test_study_depth_options_describe_depth_not_word_count(self):
        options = note_length_mode_options()
        descriptions = " ".join(option["description"] for option in options)

        self.assertIn("content depth", descriptions)
        self.assertIn("reasoning", descriptions)
        self.assertNotRegex(descriptions, r"\b\d{3,4}-\d{3,4}\s+words\b")

    def test_prompt_mode_leak_check_can_fail_strictly(self):
        leaked = prompt_mode_isolation_warnings("Use Tutor Mode sections here.", "professor_mode")

        self.assertIn("Tutor Mode", leaked)
        with patch.dict(os.environ, {"PROMPT_MODE_ISOLATION_STRICT": "1"}):
            with self.assertRaises(ValueError):
                validate_prompt_mode_isolation("Use Tutor Mode sections here.", "professor_mode")

    def test_prompt_mode_prompt_hash_depends_on_selected_mode_file(self):
        hashes = {
            mode_key: prompt_mode_prompt_hash(mode_key)
            for mode_key in NOTE_PROMPT_MODES
        }

        self.assertEqual(len(hashes), len(NOTE_PROMPT_MODES))
        self.assertGreater(len(set(hashes.values())), 1)

    def test_analysis_fingerprint_includes_prompt_hash(self):
        units = [{
            "source_identity": "file:vectors.pdf",
            "content_hash": "content-hash",
        }]

        with patch("backend.app.prompt_mode_prompt_hash", return_value="prompt-hash-a"):
            first = build_analysis_fingerprint("english", units, prompt_mode="professor_mode")
        with patch("backend.app.prompt_mode_prompt_hash", return_value="prompt-hash-b"):
            second = build_analysis_fingerprint("english", units, prompt_mode="professor_mode")

        self.assertNotEqual(first, second)

    def test_validate_note_output_calls_only_selected_mode_validator(self):
        calls = []
        original_validators = {
            key: config["validator"]
            for key, config in NOTE_PROMPT_MODES.items()
        }

        def selected_validator(summary, context):
            calls.append(("quick_answer", context.get("prompt_mode")))
            return f"{summary}\nquick validated"

        def other_validator(summary, context):
            calls.append(("detailed_explanation", context.get("prompt_mode")))
            return f"{summary}\ndetailed validated"

        try:
            NOTE_PROMPT_MODES["quick_answer"]["validator"] = selected_validator
            NOTE_PROMPT_MODES["detailed_explanation"]["validator"] = other_validator

            result = validate_note_output("quick_answer", "# Notes", {"prompt_mode": "quick_answer"})
        finally:
            for key, validator in original_validators.items():
                NOTE_PROMPT_MODES[key]["validator"] = validator

        self.assertEqual(result, "# Notes\nquick validated")
        self.assertEqual(calls, [("quick_answer", "quick_answer")])

    def test_professional_validator_removes_source_strict_artifacts(self):
        summary = "\n\n".join([
            "# Professional Study Guide",
            "## Big Picture",
            "[Direct from source]\n\nThe uploaded source introduces the core idea.",
            "## Evidence Bank",
            "[Inferred from source]\n\nThis leaked source-strict section should not remain.",
            "## Deep Explanation",
            "[Professional explanation] The concept matters because it can transfer to new problems.",
        ])

        result = validate_note_output("professor_mode", summary, {})

        self.assertIn("## Big Picture", result)
        self.assertIn("## Deep Explanation", result)
        self.assertNotIn("[Direct from source]", result)
        self.assertNotIn("[Inferred from source]", result)
        self.assertNotIn("## Evidence Bank", result)
        self.assertNotIn("leaked source-strict section", result)

    def test_latest_mode_prompt_copy_is_loaded(self):
        professional = load_note_prompt_mode_text("professor_mode")
        source_strict = load_note_prompt_mode_text("source_strict_research_mode")
        detailed = load_note_prompt_mode_text("detailed_explanation")
        quick = load_note_prompt_mode_text("quick_answer")
        tutor = load_note_prompt_mode_text("tutor_mode")

        self.assertIn("# Synapse Mode: Professional Mode", professional)
        self.assertIn("You are generating only Professional Mode.", professional)
        self.assertIn("Professional Mode is not a source summary mode.", professional)
        self.assertIn("Do not use Source-Strict badges.", professional)
        self.assertIn("The Exam Will Probably Test These Ideas", professional)
        self.assertIn("Model High-Quality Answers", professional)
        self.assertIn("Exam Question Bank", professional)
        self.assertIn("Do not write generic study advice.", professional)
        self.assertIn("Every major section must include concrete concepts", professional)

        self.assertIn("# Synapse Mode: Source-Strict Research Mode", source_strict)
        self.assertIn("You are generating only Source-Strict Research Mode.", source_strict)
        self.assertIn("Source Question", source_strict)
        self.assertIn("Not enough evidence from the uploaded source.", source_strict)
        self.assertNotIn("[Direct from source]", source_strict)
        self.assertNotIn("Evidence Bank", source_strict)

        self.assertIn("# Synapse Mode: Detailed Explanation", detailed)
        self.assertIn("step by step", detailed)
        self.assertIn("Practice / Revision Checklist", detailed)

        self.assertIn("# Synapse Mode: Quick Answer", quick)
        self.assertIn("under one minute", quick)
        self.assertIn("What To Do / Remember", quick)

        self.assertIn("# Synapse Mode: Tutor Mode", tutor)
        self.assertIn("friendly but not childish", tutor)
        self.assertIn("Check Your Understanding", tutor)

    def test_source_strict_validator_uses_compact_source_safe_structure(self):
        summary = "\n\n".join([
            "# Uploaded Lecture",
            "## Direct Source Claims",
            "- Vectors have magnitude and direction. (Slide 2)",
            "- Components depend on axes. (Slide 3)",
            "## Source Evidence",
            "- Slide 2 defines vector magnitude and direction.",
            "- Slide 3 shows component notation.",
            "## Direct Source Claims",
            "- Vectors have magnitude and direction. (Slide 2)",
        ])

        result = validate_note_output("source_strict_research_mode", summary, {
            "generation_language": "english",
            "note_length_mode": "quick_review",
        })

        for heading in [
            "## Source Question",
            "## Direct Source Claims",
            "## Source Evidence",
            "## Inferences Allowed By The Source",
            "## Gaps / Limits",
            "## Exam / Research Use",
            "## Compact Revision Summary",
        ]:
            self.assertIn(heading, result)
        self.assertIn("Not enough evidence from the uploaded source.", result)
        self.assertNotIn("[Direct from source]", result)
        self.assertNotIn("[Inferred from source]", result)
        self.assertNotIn("[Tutor explanation]", result)
        self.assertNotIn("[Not enough evidence]", result)
        self.assertNotIn("## Evidence Bank", result)
        self.assertEqual(result.count("Vectors have magnitude and direction"), 1)

    def test_professional_mode_prompt_requires_deep_student_understanding(self):
        prompt = load_note_prompt_mode_text("professor_mode")

        self.assertIn("# Synapse Mode: Professional Mode", prompt)
        self.assertIn("You are generating only Professional Mode.", prompt)
        self.assertIn("deep understanding, exam-preparation, and high-performance learning mode", prompt)
        self.assertIn("Big Picture", prompt)
        self.assertIn("The Exam Will Probably Test These Ideas", prompt)
        self.assertIn("What You Actually Need To Understand", prompt)
        self.assertIn("Concept Connections", prompt)
        self.assertIn("Deep Explanation of the Core Concepts", prompt)
        self.assertIn("Background Knowledge Needed To Understand This Properly", prompt)
        self.assertIn("How To Apply This To New Questions", prompt)
        self.assertIn("High-Quality Student Thinking", prompt)
        self.assertIn("Common Mistakes That Lose Marks", prompt)
        self.assertIn("Model High-Quality Answers", prompt)
        self.assertIn("Exam Question Bank", prompt)
        self.assertIn("Memory and Practice", prompt)
        self.assertIn("Professional explanation", prompt)
        self.assertIn("Background knowledge", prompt)
        self.assertIn("[Source anchor] = the specific uploaded concept", prompt)
        self.assertIn("[Exam intelligence] = what the exam", prompt)
        self.assertIn("[Application] = how to use the idea in a new question", prompt)
        self.assertIn("[Limitation] = what the source does not fully explain", prompt)
        self.assertIn("strong student needs before an exam", prompt)
        self.assertIn("Do not rewrite the PDF page by page.", prompt)
        self.assertNotIn("Source Evidence Table", prompt)
        self.assertNotIn("Source-Restricted Mode", prompt)
        self.assertNotIn("Source-Strict Research Mode", prompt)
        self.assertNotIn("Tutor Mode", prompt)
        self.assertNotIn("Assignment / APA Mode", prompt)
        self.assertNotIn("Academic Analysis Mode", prompt)
        self.assertNotIn("Essay-Ready Thesis Statements", prompt)

    def test_controlled_generator_delegates_prompt_assembly_to_builder(self):
        sections_dir = Path(__file__).resolve().parents[1] / "app_sections"
        generator_source = "\n".join(
            path.read_text(encoding="utf-8")
            for path in sorted(sections_dir.glob("09*_meaningful_card_text.py"))
        )

        self.assertIn("build_note_prompt", generator_source)
        self.assertIn("validate_note_output", generator_source)
        self.assertNotIn("You are Synapse, an advanced study tutor and source-grounded lecturer.", generator_source)
        self.assertNotIn("Professional Mode rules:", generator_source)
        self.assertNotIn("Do not use [Source-based] labels in Professional Mode", generator_source)
        self.assertNotIn("Label direct source-supported material as [Source-based]", generator_source)
        self.assertNotIn("Academic Analysis Mode rules:", generator_source)

    def test_professional_mode_generation_prompt_is_not_source_mode_wrapper(self):
        captured_prompts = []

        def fake_generate_chat(messages, **kwargs):
            captured_prompts.append(messages[-1]["content"])
            return "\n\n".join([
                "# Professional Mode Study Guide",
                "## Big Picture",
                "[Source-based] The source introduces the topic through core uploaded material.",
                "[Professional explanation] The important work is understanding the mental model and transfer logic.",
                "## What You Actually Need To Understand",
                "Students need the core concept, assumptions, mechanism, and common mistake. " * 80,
                "## Concept Connections",
                "The concepts connect through cause, dependency, and application. " * 80,
                "## Deep Explanation",
                "A strong explanation shows what the idea means, why it matters, how it works, when to use it, and what students misunderstand. " * 80,
                "## Background Knowledge Layer",
                "[Background knowledge] Add only prerequisite knowledge that makes the source make sense.",
                "## Application To New Situations",
                "[Application] Recognise the pattern, choose the method, apply it, and check limits.",
                "## High-Quality Student Thinking",
                "Basic: knows the definition. Strong: explains why it works. High-level: transfers it.",
                "## Common Mistakes",
                "Students often memorise wording without understanding the mechanism.",
                "## How To Use This In Assessment",
                "Use the concept, reasoning, source anchor, limitation, and transfer.",
                "## Model High-Quality Output",
                "A strong answer explains the concept and applies it beyond the original source.",
                "## Memory and Practice",
                "Memorise the core idea; practise transfer and limits.",
            ])

        source_units = [{
            "display_name": "vectors.pdf",
            "title_candidate": "Vectors",
            "text_excerpt": "Vectors represent magnitude and direction. Components depend on axes, angles, and sign conventions.",
            "visual_parts": [],
        }]

        with (
            patch("backend.app.generate_chat", side_effect=fake_generate_chat),
            patch("backend.app.expand_sparse_inline_summary", side_effect=lambda summary, *args, **kwargs: summary),
        ):
            generate_reference_style_multisource_notes(
                source_units,
                "english",
                {"depth": "detailed", "config": {}},
                "professor_mode",
            )

        prompt = captured_prompts[0]
        self.assertIn("Mode-specific prompt file:", prompt)
        self.assertIn("You are generating only Professional Mode.", prompt)
        self.assertIn("[Source anchor] = the specific uploaded concept", prompt)
        self.assertIn("The Exam Will Probably Test These Ideas", prompt)
        self.assertIn("Do not create a long evidence bank by default.", prompt)
        self.assertNotIn("Concepts Explained With Source Evidence", prompt)
        self.assertNotIn("Reading the Source Evidence", prompt)
        self.assertNotIn("How To Use Source Evidence", prompt)
        self.assertNotIn("evidence matrix", prompt.lower())
        self.assertNotIn("Source-Restricted Mode", prompt)
        self.assertNotIn("Source-Strict Research Mode", prompt)
        self.assertNotIn("Tutor Mode", prompt)
        self.assertNotIn("Assignment / APA Mode", prompt)
        self.assertNotIn("Do not use [Source-based] labels in Professional Mode", prompt)



if __name__ == "__main__":
    unittest.main()
