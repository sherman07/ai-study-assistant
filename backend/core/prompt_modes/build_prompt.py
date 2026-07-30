import logging
import os
from typing import Dict, List, Tuple

from .registry import (
    load_common_prompt_text,
    load_note_prompt_mode_text,
    normalise_note_prompt_mode,
    note_prompt_mode_label,
)


COMMON_PROMPT_FILES: Tuple[Tuple[str, str], ...] = (
    ("language.md", "Language"),
    ("source-context.md", "Source Context"),
    ("visual-markers.md", "Visual Markers"),
    ("math-formatting.md", "Math Formatting"),
    ("output-format.md", "Output Format"),
)

MODE_FORBIDDEN_PHRASES = {
    "quick_answer": ("Detailed Explanation", "Professional Mode", "Tutor Mode", "Source-Strict", "Assignment / APA"),
    "detailed_explanation": ("Quick Answer", "Professional Mode", "Tutor Mode", "Source-Strict", "Assignment / APA"),
    "professor_mode": ("Quick Answer", "Detailed Explanation", "Tutor Mode", "Source-Restricted", "Assignment / APA"),
    "tutor_mode": ("Quick Answer", "Detailed Explanation", "Professional Mode", "Source-Strict", "Assignment / APA"),
    "source_strict_research_mode": (
        "Quick Answer",
        "Detailed Explanation",
        "Professional Mode",
        "Background Knowledge Layer",
        "Application To New Situations",
        "The Exam Will Probably Test These Ideas",
        "Model High-Quality Answers",
        "Exam Question Bank",
        "high-quality student thinking",
        "Tutor Mode",
        "Assignment / APA",
    ),
    "assignment_apa_mode": ("Quick Answer", "Detailed Explanation", "Professional Mode", "Tutor Mode", "Source-Strict"),
}


def _common_prompt_blocks() -> List[str]:
    blocks: List[str] = []
    for filename, label in COMMON_PROMPT_FILES:
        blocks.append(f"## {label}\n{load_common_prompt_text(filename)}")
    return blocks


def prompt_mode_isolation_warnings(prompt: str, mode_key: str) -> List[str]:
    return [
        phrase
        for phrase in MODE_FORBIDDEN_PHRASES.get(mode_key, ())
        if phrase.lower() in (prompt or "").lower()
    ]


def validate_prompt_mode_isolation(prompt: str, mode_key: str) -> None:
    leaked_phrases = prompt_mode_isolation_warnings(prompt, mode_key)
    if not leaked_phrases:
        return
    message = f"Prompt for {mode_key} contains unselected mode phrase(s): {', '.join(leaked_phrases)}"
    if os.getenv("PROMPT_MODE_ISOLATION_STRICT", "").lower() in {"1", "true", "yes"}:
        raise ValueError(message)
    logging.getLogger(__name__).warning(message)


def build_note_prompt(context: Dict) -> str:
    mode_key = normalise_note_prompt_mode(context.get("prompt_mode"))
    mode_label = context.get("prompt_mode_label") or note_prompt_mode_label(mode_key)
    mode_text = load_note_prompt_mode_text(mode_key)
    common_text = "\n\n".join(_common_prompt_blocks())
    source_context = context.get("source_context") or "No readable source context was provided."
    visual_context = context.get("visual_context") or "No relevant source figures were selected. Do not invent visual-card content."
    source_list = context.get("source_list") or "Source list unavailable."
    language_rule = context.get("language_rule") or "Use the selected output language."
    recommended_structure = context.get("recommended_structure") or ""
    note_length_label = context.get("note_length_label") or "Standard Notes"
    note_length_min_words = context.get("note_length_min_words")
    note_length_max_words = context.get("note_length_max_words")
    is_expansion = bool(context.get("is_expansion"))
    current_summary = context.get("current_summary") or ""
    quality_gaps = context.get("quality_gaps") or []

    title = (
        f"You are expanding {mode_label} for Synapse."
        if is_expansion else
        f"You are Synapse, generating {mode_label} study notes."
    )
    length_line = ""
    if note_length_min_words and note_length_max_words:
        length_line = (
            f"- Selected AI study depth: {note_length_label}. "
            "Treat this as content depth guidance: choose how much source-specific reasoning, explanation, "
            "application, examples, and revision support to include. Do not pad to hit a word count; add depth "
            "only when it improves student understanding."
        )

    expansion_block = ""
    if is_expansion:
        gaps = ", ".join(str(gap) for gap in quality_gaps if gap) or "selected mode output is too thin"
        expansion_block = f"""
Expansion task:
- Improve only the parts that are too thin, unclear, generic, or missing selected-mode requirements.
- Keep the selected mode's structure, tone, length target, and evidence discipline.
- Preserve existing `[[VISUAL:n]]` markers. If a selected source figure is listed and directly supports the expanded explanation, place that marker near the paragraph it supports.
- Do not add generic visual-card captions to the main markdown notes; the rendered card already contains the figure explanation.
- Detected quality gaps: {gaps}

Current notes to expand:
{current_summary}
"""

    prompt = f"""
{title}

Common prompt files:
{common_text}

Selected prompt mode: {mode_label} ({mode_key})
Mode-specific prompt file:
{mode_text}

Dynamic source context:
- Language requirement: {language_rule}
{length_line}
- Never translate the product name Synapse.

Sources:
{source_list}

Extracted source context:
{source_context}

Relevant source figures selected from the uploaded files:
{visual_context}

Recommended structure:
{recommended_structure}

Output requirements:
- Return final markdown only.
- Use the common prompt files plus the selected mode file above.
- Do not import instructions, section names, badges, tone, or validation rules from unselected modes.
- Start with a specific topic title.
- Mention every usable source at least once when the source provides enough readable context.
- When selected source figures are listed, place `[[VISUAL:n]]` markers near the paragraph, worked example, comparison, formula, table discussion, or source evidence they support. For example, use `[[VISUAL:0]]` near the paragraph explaining Source figure 0.
- Use each figure's teaching intent from the selected source-figure context:
  - `clarity` figures belong beside the first clear explanation of that slide/page idea.
  - `deeper_analysis` figures belong beside interpretation, comparison, limitation, mechanism, or exam-use discussion.
- Use only marker IDs present in the selected source-figure context. Do not invent, renumber, or cluster markers at the end.
- Avoid generic filler. Every point must help the student understand, apply, verify, or revise the uploaded material.

{expansion_block}
""".strip()
    validate_prompt_mode_isolation(prompt, mode_key)
    return prompt
