from core.health import HealthReporter
from fastapi.responses import JSONResponse


health_reporter = HealthReporter(globals())


@app.get("/healthz")
def healthz():
    """Minimal liveness response for Render's five-second health check."""
    return Response(content="ok", media_type="text/plain")


@app.get("/health")
def health():
    return health_reporter.backend_status()


@app.get("/health/openai")
def health_openai(probe: bool = False):
    payload = health_reporter.openai_status(probe=probe)
    if payload.get("status") == "error":
        return JSONResponse(status_code=503, content=payload)
    return payload


@app.get("/health/deepseek")
def health_deepseek(probe: bool = False):
    """Check DeepSeek configuration, or make an explicit low-cost live probe."""
    provider_token = None
    try:
        provider_token = set_request_text_provider("deepseek")
        require_text_ai()
        model = chat_model_for_active_provider()
        payload = {
            "status": "ok",
            "provider": "deepseek",
            "model": model,
            "probe": bool(probe),
        }
        if probe:
            reply = generate_chat(
                [{"role": "user", "content": "Reply with OK only."}],
                model=model,
                temperature=0,
                max_tokens=16,
                provider_options={"thinking": {"type": "disabled"}},
            ).strip()
            if not reply:
                raise RuntimeError("DeepSeek health probe returned an empty reply.")
            payload["reply"] = reply
        else:
            payload["reply"] = None
            payload["message"] = "DeepSeek credentials are configured. Add ?probe=true to run a live model check."
        return payload
    except Exception:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "provider": "deepseek",
                "probe": bool(probe),
                "message": "DeepSeek health check failed. Check DEEPSEEK_API_KEY, available balance, model configuration, and server logs.",
            },
        )
    finally:
        if provider_token is not None:
            reset_request_text_provider(provider_token)

stored_summary = ""
stored_sections: Dict[str, str] = {}
stored_connections: List[dict] = []
stored_mind_map: dict = {}
stored_title = "Generated Study Notes"
stored_source_identity = ""

# -------------------------
# Core prompts
# -------------------------
SYSTEM_PROMPT = """
You are Synapse, a source-faithful academic tutor.

Brand rule: Synapse is a product name. Never translate Synapse into another language, including Chinese. Do not write 突触, 突觸, synapse-as-a-body-part, or any translated version when referring to the product name.

You must reconstruct what the provided material ACTUALLY contains.
You are not allowed to guess a different document, lesson, law, or topic.

Strict source identity rules:
- First identify the source from explicit evidence only: title, heading, URL metadata, file name, visible text, transcript, or extracted content.
- If the source is a webpage and metadata says a specific title, use that exact title.
- If the source is a New Zealand legislation page, never substitute a different Act just because the year or act number looks familiar.
- If the source identity is uncertain, say it is uncertain. Do not hallucinate.
- If the same source appears again, keep the same identity and overall interpretation.

Teaching rules:
- Be clear, concrete, detailed, and faithful to the source.
- Do not produce a minimal answer when the source contains rich detail.
- For multi-source uploads, your main task is synthesis: identify shared ideas, recurring theories, repeated evidence, differences, and how the sources build one larger learning picture.
- For lecture slides and PDFs, explicitly explain important visuals, diagrams, tables, slide images, page/slide titles, and image-text relationships when they are provided.
- For laws, policies, reports, articles, slides, videos, and textbook material, preserve the actual structure and important subpoints.
- For maths or technical material, explain formulas, definitions, worked steps, and likely mistakes.
- If material is inaccessible or partial, say exactly what is missing.
- Use the source's main language unless the user requested otherwise.
"""

ANALYSIS_PROMPT = """
Analyse the material as a private university tutor and return markdown using this high-detail study-guide style.

Your output must feel like a careful professor-style learning guide, not a minimal AI summary. The best output should help a student understand, revise, and connect the material without needing to re-open every file.

Base structure for one source:

# Overview
Identify the exact source/topic and explain what the material is trying to teach. Include the learning focus, the main problem/question, and why the topic matters.

## Core Argument
Explain the central purpose, logic, or learning objective in depth. Use substantial explanation when needed. Include the source's actual scope, key mechanism, and why it matters.

## Key Ideas
Create a detailed concept-by-concept explanation. For each major idea:
- name the concept clearly
- define it in student-friendly language
- connect it to the actual source wording, page/slide title, section, example, formula, image, diagram, or table when available
- explain why it matters

## Step-by-step Breakdown
Reconstruct the source in a logical learning order. This must be detailed enough for a student who has not read the source.
For lecture slides: follow the lecture flow and explain why each section comes next.
For laws/documents: break down the legal structure by part, subpart, section, definition, exception, duty, consequence, and transition rule when present.
For maths/problems: show every calculation step, why each formula is used, what each line means, and how to check the result.
For videos/transcripts: reconstruct the teaching sequence, including corrections, repeated calculations, or unclear moments.

## Worked Example / Evidence From Source
Use actual examples, studies, page/slide references, section numbers, calculations, table values, scenarios, or evidence from the uploaded/source material whenever available.
If the source contains both source examples and external examples, include both under clear subheadings.
If the source contains no explicit worked example, create a clearly labelled external real-world example that applies the source concept, and explain the connection step by step.

## Tutor Explanation
Teach it like a strong tutor. Explain the difficult parts slowly, including why the rule/formula/process works, how the ideas connect, and how to remember them. Use analogies only when they help accuracy.

## Common Mistakes
List realistic mistakes a learner could make. For each mistake:
- explain the wrong assumption
- explain the correct understanding
- show how to avoid it
Use source-specific mistakes, not generic filler.

## Critical Thinking
Provide conceptual, application, comparison, and verification questions. Add brief guidance on what a strong answer should consider.

Quality rules:
- Do not invent a different source.
- If source evidence is insufficient, say exactly what is missing, but still explain what can be reliably learned from the available evidence.
- Follow the requested output language for the ENTIRE response, including headings, explanations, examples, mistakes, questions, tables, and visual explanation.
- Never translate the brand/product name Synapse. Use Synapse exactly.
- If Simplified Chinese is requested, write the whole response in Simplified Chinese, while keeping short key English academic terms in brackets only when useful.
- If Traditional Chinese is requested, write the whole response in Traditional Chinese, while keeping short key English terms in brackets only when useful.
- Use concrete source details whenever available.
- Do not replace the actual source with a generic textbook topic.
- Prefer detailed teaching over polished vagueness.
- For complex or multi-source uploads, do not compress important ideas just to be short.
"""



REFERENCE_STYLE_PROFILE = """
Reference-style target for high-quality multi-source notes:
- Write like a detailed university tutor preparing lecture revision notes, not like a generic summary.
- The output should feel like the user paid for a complete study pack: detailed, organized, source-faithful, and useful for exam revision.
- Imitate the supplied reference style at the STRUCTURAL level: title + framing idea, lecture blocks, concept definitions, comparison tables, study/case breakdowns, visual explanations, and final revision focus.
- Do not imitate by using generic filler. The value must come from the uploaded sources.
- For each lecture/source, use a deep teaching pattern: what the source is about -> what problem/question it answers -> key concepts -> examples/studies/cases/calculations with any relevant source screenshots embedded in the same flow -> what students often misunderstand -> how it connects to the wider course.
- When a study/case/experiment appears, explain it using: research question, method/procedure, result/finding, interpretation, limitation, exam use.
- When a formula/calculation appears, reconstruct the teaching sequence: given information, formula, substitution, working, answer, verification, common error.
- When a law/policy source appears, reconstruct the legal logic: purpose, definitions, sections/parts, duties/powers, exceptions, tests, consequences, practical example.
- When a design/art/literature/history source appears, explain context, formal features, evidence/examples, interpretation, tensions, and assessment use.
- Use structured comparison tables whenever the source compares theories, methods, groups, technologies, experiments, cases, time periods, artists, or concepts.
- When the uploaded source contains a useful picture/table/diagram, integrate it directly beside the concept it teaches rather than creating a separate visual section.
- For multiple resources, first preserve detailed source-by-source learning, then build a course-level synthesis: shared concepts, repeated tensions, methodological patterns, cross-source evidence, differences, and revision priorities.
- Maintain the selected output language throughout. Keep short English academic terms in brackets when useful.
- The final answer should be long enough that a student can revise from it without reopening every file.
- For multi-source packs, do not end with only a learning scaffold. Actually write the detailed common ideas, evidence matrix, visual explanations, and high-scoring answer frameworks.
- Avoid shallow headings like “important” without substance. Every paragraph must teach something specific.
"""

MULTISOURCE_REFERENCE_STRUCTURE = """
For multi-source uploads, imitate this learning-note architecture. This is a DEEP professor-style pack, not a summary:

# 🧠 Integrated Study Guide: specific course/topic title
A short framing paragraph explaining the whole source pack and the larger learning problem it helps solve.

## 1. Course-Level Big Picture
Explain the central question of the uploaded set, the main subject area, and how the sources fit together.

## 2. Source-by-Source Guided Notes
For EACH source, create a rich lecture/source card:
- Source title and learning focus
- Lecture/source outline in order
- Key concepts with definitions and plain-language explanation
- Important named researchers/studies/cases/examples/calculations
- Method/result/meaning where research or worked examples are discussed
- Important visuals/diagrams/tables and what they teach
- What the student should remember from this source
- How this source connects to the rest of the set

## 3. Common Ideas Across Sources
Do not be generic. Identify recurring conceptual threads that actually appear across the files.
For each shared idea:
- explain the idea clearly
- identify which sources support it
- compare how each source treats it
- explain why it matters for the course

## 4. Cross-Source Connections
Explain how the lectures/sources build on each other. Use progressions such as biological mechanism -> behaviour -> cognition -> social context -> measurement -> application, or the equivalent for the subject.

## 5. Differences, Tensions, and Debates
Show where sources disagree or emphasise different sides, such as nature vs nurture, mechanism vs application, theory vs evidence, qualitative vs quantitative change, biological vs social explanation, structure vs function, source text vs external example.

## 6. Cross-Source Evidence Table
Use markdown tables. Include columns such as Theme, Sources, Evidence/Example, What it proves, Exam/Application use.

## 7. Deep Revision Guide
Give likely exam questions, what a strong answer should include, and common traps. Include “how to compare sources” prompts.

## 8. Memory Hooks / Learning Strategy
Provide compact memory aids, concept clusters, and revision priorities.
"""


# -------------------------
# Adaptive learning-depth system
# -------------------------
# The goal is learning clarity, not saving tokens for its own sake.
# Short/simple inputs receive focused notes so the result is easier to read.
# Long/complex sources still receive detailed or comprehensive notes.
DEPTH_CONFIG = {
    "focused": {
        "label": "Focused",
        "max_output_tokens": int(os.getenv("FOCUSED_MAX_OUTPUT_TOKENS", "1800")),
        "source_chars": int(os.getenv("FOCUSED_SOURCE_CHARS", "9000")),
        "mindmap_branches": 5,
        "mindmap_points": 5,
        "mindmap_children": 3,
        "instruction": (
            "Create a focused, easy-to-understand study note. Do not pad the answer. "
            "Cover the actual idea, the essential steps, one useful example if needed, and common mistakes. "
            "This is concise because the source is simple or short, not because detail is being sacrificed."
        ),
        "sections": ["Overview", "Key Ideas", "Step-by-step Breakdown", "Worked Example / Evidence From Source", "Common Mistakes"],
    },
    "standard": {
        "label": "Standard",
        "max_output_tokens": int(os.getenv("STANDARD_MAX_OUTPUT_TOKENS", "4200")),
        "source_chars": int(os.getenv("STANDARD_SOURCE_CHARS", "24000")),
        "mindmap_branches": 8,
        "mindmap_points": 6,
        "mindmap_children": 4,
        "instruction": (
            "Create professional study notes with solid detail. Explain the key concepts, source structure, examples, "
            "step-by-step logic, evidence, and likely misunderstandings. Avoid generic padding, but include all important source-supported points."
        ),
        "sections": ["Overview", "Core Argument", "Key Ideas", "Step-by-step Breakdown", "Worked Example / Evidence From Source", "Tutor Explanation", "Common Mistakes", "Critical Thinking"],
    },
    "detailed": {
        "label": "Detailed",
        "max_output_tokens": int(os.getenv("DETAILED_MAX_OUTPUT_TOKENS", "8000")),
        "source_chars": int(os.getenv("DETAILED_SOURCE_CHARS", "65000")),
        "mindmap_branches": 11,
        "mindmap_points": 8,
        "mindmap_children": 5,
        "instruction": (
            "Create a detailed, professional, source-faithful study guide. Preserve important subpoints, examples, definitions, formulas, evidence, "
            "and reasoning. Explain not only what the source says, but how a student should understand, verify, apply, and critique it."
        ),
        "sections": ["Overview", "Core Argument", "Key Ideas", "Step-by-step Breakdown", "Worked Example / Evidence From Source", "External Real-World Example", "Tutor Explanation", "Common Mistakes", "Critical Thinking"],
    },
    "comprehensive": {
        "label": "Comprehensive",
        "max_output_tokens": int(os.getenv("COMPREHENSIVE_MAX_OUTPUT_TOKENS", "20000")),
        "source_chars": int(os.getenv("COMPREHENSIVE_SOURCE_CHARS", "500000")),
        "mindmap_branches": 14,
        "mindmap_points": 10,
        "mindmap_children": 6,
        "instruction": (
            "Create a comprehensive high-detail professional study guide. Use this only when the source is long, dense, technical, legal, academic, "
            "or multi-section. Cover structure, definitions, mechanisms, assumptions, exceptions, procedures, implications, examples, evidence, "
            "verification checks, limitations, common mistakes, and learning strategy."
        ),
        "sections": ["Overview", "Core Argument", "Detailed Content Breakdown", "Definitions and Key Terms", "Step-by-step Breakdown", "Evidence From Source", "External Real-World Example", "Tutor Explanation", "Common Mistakes", "Critical Thinking", "Revision Checklist"],
    },
}

DEPTH_ALIASES = {
    "auto": "auto",
    "brief": "focused",
    "short": "focused",
    "focused": "focused",
    "standard": "standard",
    "normal": "standard",
    "detailed": "detailed",
    "detail": "detailed",
    "deep": "comprehensive",
    "comprehensive": "comprehensive",
}



def normalise_detail_level(detail_level: str) -> str:
    key = (detail_level or "auto").strip().lower().replace("-", "_").replace(" ", "_")
    return DEPTH_ALIASES.get(key, "auto")


def estimate_learning_depth(source_text: str, source_units: Optional[List[dict]] = None) -> dict:
    """Estimate how much detail helps learning. This is not a pure token-saving rule."""
    text = source_text or ""
    lower = text.lower()
    char_count = len(text)
    word_count = len(re.findall(r"\w+", text))
    section_markers = len(re.findall(r"\b(part|subpart|section|clause|chapter|article|schedule|definition|rule|regulation)\b|\n\s*\d+[.)]", lower, re.I))
    formula_markers = len(re.findall(r"\\frac|\\sqrt|\\langle|\b(sqrt|sin|cos|tan|derivative|integral|matrix|vector|curvature)\b|[=^√]", text, re.I))
    legal_markers = len(re.findall(r"\b(act|law|section|liability|partner|partnership|duty|shall|must|offence|rights|obligation|regulation|legislation|court)\b", lower))
    academic_markers = len(re.findall(r"\b(theory|evidence|methodology|analysis|argument|concept|framework|case study|source|artist|historical)\b", lower))
    table_like = len(re.findall(r"\|.*\||\t|\btable\b|\bfigure\b", text, re.I))
    source_count = len(source_units or [])
    visual_count = sum(
        1
        for unit in (source_units or [])
        for part in (unit.get("visual_parts") or [])
        if isinstance(part, dict) and part.get("type") == "image_url"
    )

    score = 0
    if char_count >= 1200:
        score += 1
    if char_count >= 7000:
        score += 1
    if char_count >= 22000:
        score += 1
    if char_count >= 55000:
        score += 1
    if section_markers >= 4:
        score += 1
    if section_markers >= 12:
        score += 1
    if formula_markers >= 3:
        score += 1
    if legal_markers >= 8 or academic_markers >= 8:
        score += 1
    if table_like >= 2:
        score += 1
    if visual_count >= 1:
        score += 1
    if visual_count >= 3:
        score += 2
    if source_count >= 2:
        score += 2
    if source_count >= 4:
        score += 2

    if char_count < 900 and score <= 1:
        depth = "focused"
    elif score <= 2:
        depth = "standard"
    elif score <= 5:
        depth = "detailed"
    else:
        depth = "comprehensive"

    if (legal_markers >= 12 or section_markers >= 10) and depth in {"focused", "standard"}:
        depth = "detailed"
    if visual_count >= 1 and depth in {"focused", "standard"}:
        depth = "detailed"
    if visual_count >= 4 and (academic_markers >= 6 or section_markers >= 6 or table_like >= 2):
        depth = "comprehensive"
    if source_count >= 2:
        # Multi-source analysis is the core product feature. For this mode, quality and
        # cross-source synthesis are prioritised over token saving.
        depth = "comprehensive"
    if char_count >= 45000 and (legal_markers >= 15 or section_markers >= 15):
        depth = "comprehensive"

    reason_bits = []
    if char_count < 900:
        reason_bits.append("short source")
    if char_count >= 7000:
        reason_bits.append("long source")
    if char_count >= 22000:
        reason_bits.append("very long source")
    if section_markers >= 4:
        reason_bits.append("structured sections")
    if formula_markers >= 3:
        reason_bits.append("mathematical or technical notation")
    if legal_markers >= 8:
        reason_bits.append("legal concepts")
    if academic_markers >= 8:
        reason_bits.append("advanced study analysis")
    if table_like >= 2:
        reason_bits.append("table or figure content")
    if visual_count >= 1:
        reason_bits.append(f"{visual_count} extracted source visual(s)")
    if source_count >= 2:
        reason_bits.append("multiple sources requiring cross-source synthesis")
    if source_count >= 4:
        reason_bits.append("large source set")

    return {
        "depth": depth,
        "char_count": char_count,
        "word_count": word_count,
        "score": score,
        "section_markers": section_markers,
        "formula_markers": formula_markers,
        "legal_markers": legal_markers,
        "academic_markers": academic_markers,
        "visual_count": visual_count,
        "source_count": source_count,
        "reason": ", ".join(reason_bits) if reason_bits else "general study material",
        "auto_selected": True,
    }


def choose_learning_depth(source_text: str, source_units: List[dict], requested_detail_level: str = "auto") -> dict:
    """
    Automatically choose the clearest learning depth.

    The default UI sends "auto", so the system decides from source complexity.
    Explicit API values are still honored for callers that need a controlled
    output depth.
    """
    estimate = estimate_learning_depth(source_text, source_units)
    requested = normalise_detail_level(requested_detail_level)
    if requested != "auto":
        auto_depth = estimate["depth"]
        auto_reason = estimate.get("reason", "general study material")
        estimate["depth"] = requested
        estimate["override"] = True
        estimate["auto_selected"] = False
        estimate["auto_selected_depth"] = auto_depth
        estimate["reason"] = (
            f"user requested {DEPTH_CONFIG[requested]['label']} detail; "
            f"auto estimate was {DEPTH_CONFIG[auto_depth]['label']} ({auto_reason})"
        )
    else:
        estimate["override"] = False
    estimate["requested_detail_level"] = requested
    estimate["config"] = DEPTH_CONFIG[estimate["depth"]]
    return estimate
