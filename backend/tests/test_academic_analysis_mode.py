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
        self.assertIn("teaching intent", prompt.lower())
        self.assertIn("clarity", prompt.lower())
        self.assertIn("deeper_analysis", prompt)
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
        generator_source = (
            Path(__file__).resolve().parents[1]
            / "app_sections"
            / "09_v23_meaningful_card_text.py"
        ).read_text(encoding="utf-8")

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

    def test_professional_mode_fallback_is_not_source_evidence_table(self):
        source_units = [{
            "display_name": "vaccination-ethics.pdf",
            "title_candidate": "Vaccination Ethics",
            "text_excerpt": "Vaccination ethics involves autonomy, public health benefit, justice, proportionality, and trust.",
            "visual_parts": [],
        }]

        with patch("backend.app.generate_chat", side_effect=RuntimeError("forced model failure")):
            summary = generate_reference_style_multisource_notes(
                source_units,
                "english",
                {"depth": "detailed", "config": {}},
                "professor_mode",
            )

        self.assertIn("## 1. Big Picture: What This Material Is Really About", summary)
        self.assertIn("## 3. What You Actually Need To Understand", summary)
        self.assertIn("## 4. Deep Explanation of the Core Concepts", summary)
        self.assertNotIn("## Source Evidence Table", summary)
        self.assertNotIn("| Source | Topic | Useful evidence |", summary)

    def test_professional_mode_fallback_uses_specific_source_learning_targets(self):
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
            summary = generate_reference_style_multisource_notes(
                source_units,
                "english",
                {"depth": "detailed", "config": {}},
                "professor_mode",
            )

        self.assertIn("Human Nature and Aggression", summary)
        self.assertIn("hydraulic model of aggression", summary)
        self.assertIn("Six Tongan Castaways", summary)
        self.assertIn("Two Monkeys Were Paid Unequally", summary)
        self.assertIn("Frans de Waal", summary)
        self.assertNotIn("Add only the background knowledge that makes the source easier to understand", summary)
        self.assertNotIn("A high-quality response states the key judgement clearly", summary)

    def test_non_professional_fallbacks_keep_selected_mode_shape(self):
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
        expected_headings = {
            "quick_answer": "## Direct Answer",
            "detailed_explanation": "## Main Idea",
            "tutor_mode": "## Start From The Basic Idea",
        }

        with (
            patch("backend.app.generate_chat", side_effect=RuntimeError("forced model failure")),
            patch("backend.app.generate_visual_argument_cards", return_value=visual_cards),
            patch("backend.app._v23_renderable_visual_cards", side_effect=lambda cards, **kwargs: cards),
        ):
            for mode_key, expected_heading in expected_headings.items():
                with self.subTest(prompt_mode=mode_key):
                    summary = generate_reference_style_multisource_notes(
                        source_units,
                        "english",
                        {"depth": "detailed", "config": {}},
                        mode_key,
                    )

                    self.assertIn(expected_heading, summary)
                    self.assertIn("Lewontin", summary)
                    self.assertRegex(summary, r"within(?:-group)?\s+(?:vs|and)\s+between")
                    self.assertNotIn("## Source Evidence Table", summary)
                    self.assertNotIn("## Source Examples and Evidence", summary)
                    self.assertNotIn("This source figure belongs in the notes", summary)
                    self.assertLessEqual(summary.count("Figure focus:"), 1)

    def test_recommended_structure_uses_professional_sections(self):
        structure_source = (
            Path(__file__).resolve().parents[1]
            / "app_sections"
            / "04_file_to_source_unit.py"
        ).read_text(encoding="utf-8")

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


if __name__ == "__main__":
    unittest.main()
