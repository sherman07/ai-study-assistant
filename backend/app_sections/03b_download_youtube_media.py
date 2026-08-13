

def split_mindmap_subpoints(text: str, max_children: int = 4) -> List[dict]:
    """Create compact child leaves from a point's detail text when no explicit children exist."""
    value = clean_mindmap_text(text)
    if not value:
        return []

    raw_parts = re.split(
        r"(?:\s*[;；]\s*|\s+→\s+|\s+--\s+|\s+—\s+|(?<=[.!?。！？])\s+|\s+\b(?:because|therefore|however|for example|e\.g\.)\b\s+)",
        value,
        flags=re.I,
    )
    seen = set()
    children: List[dict] = []
    for part in raw_parts:
        clean = clean_mindmap_text(part)
        if len(clean) < 14 or len(clean) > 260:
            continue
        key = re.sub(r"\W+", "", clean.lower())[:80]
        if not key or key in seen:
            continue
        seen.add(key)
        label_source = re.split(r"[:：,，]", clean, maxsplit=1)[0].strip()
        if len(label_source) < 5 or len(label_source) > 64:
            label_source = clean
        label = short_mindmap_text(label_source, 46)
        detail = short_mindmap_text(clean, 240)
        if label:
            children.append({
                "id": sha256_text(label + detail)[:10],
                "label": label,
                "detail": detail,
            })
        if len(children) >= max_children:
            break
    return children


def normalise_mindmap_children(raw_children: Any, parent_text: str, max_children: int = 4) -> List[dict]:
    children: List[dict] = []
    if isinstance(raw_children, list):
        for child in raw_children[:max_children]:
            if isinstance(child, str):
                label_text = child
                detail_text = child
            elif isinstance(child, dict):
                label_text = child.get("label") or child.get("title") or child.get("text") or child.get("detail") or ""
                detail_text = child.get("detail") or child.get("explanation") or child.get("text") or label_text
            else:
                continue
            label = short_mindmap_text(label_text, 46)
            detail = short_mindmap_text(detail_text, 260)
            if label:
                children.append({
                    "id": sha256_text(label + detail)[:10],
                    "label": label,
                    "detail": detail or label,
                })

    if not children:
        children = split_mindmap_subpoints(parent_text, max_children=max_children)
    return children[:max_children]


def extract_branch_items(section_text: str, max_points: int = 5, max_children: int = 4) -> List[dict]:
    """
    Fallback structured mind-map point extractor.
    Returns point objects instead of raw strings so the frontend can display clean labels + details.
    """
    if not section_text:
        return []

    lines = [line.rstrip() for line in str(section_text).splitlines() if line.strip()]
    items: List[dict] = []
    current: Optional[dict] = None

    def push_current() -> None:
        nonlocal current
        if not current:
            return
        label = short_mindmap_text(current.get("label") or current.get("detail") or "", 58)
        detail = short_mindmap_text(current.get("detail") or current.get("label") or "", 260)
        if label:
            explicit_children = current.get("children") if isinstance(current.get("children"), list) else []
            children = normalise_mindmap_children(explicit_children, detail, max_children=max_children)
            item = {
                "id": sha256_text(label + detail)[:10],
                "label": label,
                "detail": detail,
            }
            if children:
                item["children"] = children
            items.append(item)
        current = None

    for raw in lines:
        raw_indent = len(raw) - len(raw.lstrip(" \t"))
        line = clean_mindmap_text(raw)
        if not line or line.startswith("#"):
            continue

        nested_bullet = bool(current and raw_indent >= 2 and re.match(r"^\s*(?:[\-•*]|\d+[.)])\s+", raw))
        line = re.sub(r"^[\-•*]\s*", "", line).strip()
        numbered = re.match(r"^\d+[.)]\s*(.+)$", line)
        heading_like = line.endswith((":", "：")) and len(line) < 95
        formula_like = any(token in raw for token in ["\\", "=", "^", "_", "sqrt", "frac", "√"])

        if nested_bullet:
            child_text = numbered.group(1).strip() if numbered else line
            if child_text:
                current.setdefault("children", []).append({
                    "label": child_text,
                    "detail": child_text,
                })
            continue

        if numbered:
            push_current()
            content = numbered.group(1).strip()
            current = {"label": content, "detail": content}
            continue

        if heading_like:
            push_current()
            content = line[:-1].strip()
            current = {"label": content, "detail": content}
            continue

        if current:
            if formula_like or len(line) < 130:
                current["detail"] = (current.get("detail", "") + " " + line).strip()
            else:
                push_current()
                current = {"label": line, "detail": line}
        else:
            current = {"label": line, "detail": line}

        if len(items) >= max_points:
            break

    push_current()

    if not items:
        value = clean_mindmap_text(section_text)
        for sentence in re.split(r"(?<=[.!?。！？])\s+", value):
            sentence = sentence.strip()
            if len(sentence) < 10:
                continue
            items.append({
                "id": sha256_text(sentence)[:10],
                "label": short_mindmap_text(sentence, 58),
                "detail": short_mindmap_text(sentence, 260),
                "children": split_mindmap_subpoints(sentence, max_children=max_children),
            })
            if len(items) >= max_points:
                break

    return items[:max_points]


def generate_connections_from_sections(sections: Dict[str, str]) -> List[dict]:
    order = [
        ("Overview", "Core Argument", "frames"),
        ("Core Argument", "Key Ideas", "introduces concepts for"),
        ("Key Ideas", "Step-by-step Breakdown", "becomes the process in"),
        ("Step-by-step Breakdown", "Worked Example / Evidence From Source", "is applied in"),
        ("Worked Example / Evidence From Source", "Common Mistakes", "highlights errors checked in"),
        ("Common Mistakes", "Critical Thinking", "prepares the student for"),
    ]
    results = []
    for source, target, label in order:
        if source in sections and target in sections:
            results.append({
                "from": source,
                "to": target,
                "label": label,
                "description": f"{source} naturally leads into {target} in the study flow.",
            })
    if results:
        return results

    keys = list(sections.keys())
    for i in range(min(len(keys) - 1, 5)):
        results.append({
            "from": keys[i],
            "to": keys[i + 1],
            "label": "connects to",
            "description": f"{keys[i]} connects to {keys[i + 1]} in the notes.",
        })
    return results


def generate_mind_map(title: str, sections: Dict[str, str], depth: str = "detailed") -> dict:
    """Rule-based fallback mind map; AI map generator can refine this."""
    preferred_order = [
        "Overview",
        "Core Argument",
        "Key Ideas",
        "Step-by-step Breakdown",
        "Worked Example / Evidence From Source",
        "Common Mistakes",
        "Critical Thinking",
    ]
    ordered_names = [name for name in preferred_order if name in sections]
    ordered_names += [name for name in sections.keys() if name not in ordered_names]

    limits = DEPTH_CONFIG.get(depth, DEPTH_CONFIG["detailed"])
    max_branches = int(limits.get("mindmap_branches", 6))
    max_points = int(limits.get("mindmap_points", 5))
    max_children = int(limits.get("mindmap_children", 4))

    branches = []
    for section_name in ordered_names[:max_branches]:
        section_text = sections.get(section_name, "")
        label = "Summary" if section_name == "Overview" else section_name
        branches.append({
            "id": sha256_text(section_name)[:10],
            "label": short_mindmap_text(label, 48),
            "section": section_name,
            "summary": first_good_sentence(section_text, 190),
            "points": extract_branch_items(section_text, max_points=max_points, max_children=max_children),
        })

    center_title = short_mindmap_text(title or "Study Notes", 80) or "Study Notes"
    return {"center": center_title, "branches": branches}
def normalise_ai_mind_map(raw_map: dict, fallback_map: dict, depth: str = "detailed") -> dict:
    if not isinstance(raw_map, dict):
        return fallback_map

    center = short_mindmap_text(raw_map.get("center") or fallback_map.get("center") or "Study Notes", 80)
    raw_branches = raw_map.get("branches") if isinstance(raw_map.get("branches"), list) else []
    fallback_branches = fallback_map.get("branches", []) or []
    fallback_by_section = {b.get("section"): b for b in fallback_branches}

    limits = DEPTH_CONFIG.get(depth, DEPTH_CONFIG["detailed"])
    max_branches = int(limits.get("mindmap_branches", 6))
    max_points = int(limits.get("mindmap_points", 5))
    max_children = int(limits.get("mindmap_children", 4))

    branches: List[dict] = []
    for index, branch in enumerate(raw_branches[:max_branches]):
        if not isinstance(branch, dict):
            continue
        section = clean_mindmap_text(branch.get("section") or branch.get("label") or "")
        fallback_branch = fallback_by_section.get(section) or (fallback_branches[min(index, len(fallback_branches) - 1)] if fallback_branches else {})
        label = short_mindmap_text(branch.get("label") or fallback_branch.get("label") or section or f"Branch {index + 1}", 48)
        summary = short_mindmap_text(branch.get("summary") or fallback_branch.get("summary") or "", 280)

        raw_points = branch.get("points") if isinstance(branch.get("points"), list) else []
        points: List[dict] = []
        for point in raw_points[:max_points]:
            if isinstance(point, str):
                label_text = point
                detail_text = point
            elif isinstance(point, dict):
                label_text = point.get("label") or point.get("title") or point.get("text") or point.get("detail") or ""
                detail_text = point.get("detail") or point.get("explanation") or point.get("text") or label_text
                raw_children = (
                    point.get("children")
                    or point.get("subpoints")
                    or point.get("leaves")
                    or point.get("items")
                    or []
                )
            else:
                continue
            if isinstance(point, str):
                raw_children = []
            label_clean = short_mindmap_text(label_text, 58)
            detail_clean = short_mindmap_text(detail_text, 420)
            if label_clean:
                children = normalise_mindmap_children(raw_children, detail_clean, max_children=max_children)
                normalized_point = {
                    "id": sha256_text(section + label_clean + detail_clean)[:10],
                    "label": label_clean,
                    "detail": detail_clean or label_clean,
                }
                if children:
                    normalized_point["children"] = children
                points.append(normalized_point)
        if not points:
            points = fallback_branch.get("points", [])[:max_points]

        branches.append({
            "id": sha256_text(section or label)[:10],
            "label": label,
            "section": section or fallback_branch.get("section") or label,
            "summary": summary,
            "points": points,
        })

    if not branches:
        return fallback_map
    return {"center": center, "branches": branches}


def generate_ai_mind_map(
    title: str,
    sections: Dict[str, str],
    preferred_language: str = "auto",
    depth: str = "detailed",
    prompt_mode: str = DEFAULT_NOTE_PROMPT_MODE,
    request_timeout: Optional[float] = None,
) -> dict:
    """
    Ask the model to design a visual mind map specifically.
    Falls back to a deterministic rule-based map if the model output is invalid.
    """
    fallback = generate_mind_map(title, sections, depth)
    if not sections:
        return fallback

    # Match mind-map size to the selected/adaptive depth.
    # This fixes the yellow underline / runtime NameError for {max_branches} and {max_points}.
    limits = DEPTH_CONFIG.get(depth, DEPTH_CONFIG["detailed"])
    max_branches = int(limits.get("mindmap_branches", 6))
    max_points = int(limits.get("mindmap_points", 5))
    max_children = int(limits.get("mindmap_children", 4))
    section_limit = max(7, min(max_branches + 2, 12))

    compact_sections = []
    for name, content in list(sections.items())[:section_limit]:
        compact_sections.append(f"SECTION: {name}\n{truncate_text(content, 3200)}")

    language_instruction = language_instruction_for(preferred_language)
    is_source_strict = normalise_note_prompt_mode(prompt_mode) == "source_strict_research_mode"
    source_strict_mindmap_rules = ""
    if is_source_strict:
        source_strict_mindmap_rules = """
- Build the map around the lecture's logic rather than listing many flat labels.
- In each point detail, include the matching note section and the most specific visible source pointer available from the notes, such as Slide 15 or Page 23.
- Prefer branches such as public-health authority, ethical reasoning, legal example, evidence limits, and exam framing when those ideas appear in the notes.
"""

    prompt = f"""
Create a visual mind map JSON for a study app.
{language_instruction}

Important design rules:
- Do NOT copy long paragraphs directly.
- Make the center title readable and specific.
- Use no more than {max_branches} main branches.
- Use more branches when the notes contain distinct concepts, methods, evidence, examples, or exam themes.
- Each branch should have no more than {max_points} points. Use fewer points only if the source truly has less material.
- Each point may include up to {max_children} children/subpoints. Use children for small teachable pieces under a main idea: definition parts, evidence details, example steps, limitation checks, exam-use reminders, or source figure details.
- Design it as a real knowledge tree: center topic -> first-level concept branches -> point nodes -> child/subpoint leaves.
- Prefer concept-level branches over copied section labels when that is clearer.
- Treat overview/framework ideas as first-level branches, not hidden bullet points. For example, if the notes contain "Developmental approach", "Developmental approach overview", "Big picture", "Framework", or "Source and argument map", make that a branch with its own leaves.
- A branch should represent a learnable cluster such as an approach, theory, method, evidence type, worked example, misconception, or exam strategy.
- Each point needs a short label and 1-2 concrete detail sentences with source substance: definition, mechanism, evidence, example, common confusion, or exam use.
- Children must be smaller than the parent point and must not repeat the parent wording. They should make the branch useful to open and explore.
- For math/technical content, point labels must be phrase titles, not raw formulas. Details may contain compact formulas when they clarify the point.
- Convert every math symbol into readable text/Unicode whenever possible: α, β, θ, ≤, ≥, ≠, ∈, ∉, ∅, ∀, ∃, →, ⇒, ∞, ∂, ∇, ∫, Σ, ℝ, Aᵀ, A⁻¹, xᵢ, (Aᵀ)ᵢⱼ = Aⱼᵢ. For matrices, use compact readable notation like v=[v₁; v₂; …; vₘ] or v+w=[v₁+w₁; v₂+w₂; …; vₘ+wₘ]. Never output raw nested arrays like [[1,2],[3,4]], raw LaTeX commands, bmatrix, pmatrix, begin/end matrix text, caret/underscore syntax, or plain sqrt(180).
- Point labels must be human-readable phrase titles in the selected language, not raw formulas. Put formulas in detail only when needed.
- Branch labels, point labels, summaries, and details must follow the selected language.
- Never translate the brand name Synapse. If you need a summary branch, use the selected-language equivalent of Overview/Summary, not a translation of Synapse.
- The map should be simple first, then expandable by clicking points.
- Keep enough detail in the leaves that clicking a branch teaches something, not just navigation.
- When the notes include visible source pointers, carry them into branch summaries or point details instead of dropping them.
{source_strict_mindmap_rules}
- Return JSON only. No markdown.

JSON schema:
{{
  "center": "specific readable topic title",
  "branches": [
    {{
      "label": "short branch title",
      "section": "matching section name from notes",
      "summary": "one sentence branch summary",
      "points": [
        {{
          "label": "short point",
          "detail": "more detail shown after clicking",
          "children": [
            {{"label": "small subpoint", "detail": "specific source-grounded detail"}}
          ]
        }}
      ]
    }}
  ]
}}

Current note title: {title}

Notes:
{chr(10).join(compact_sections)}
"""
    try:
        raw = generate_chat([
            {"role": "system", "content": "You create accurate, compact, visual study mind maps as strict JSON. Never use markdown bold or raw LaTeX in mind map labels. Never translate the brand name Synapse."},
            {"role": "user", "content": prompt},
        ], model=mindmap_model_for_active_provider(), temperature=0, max_tokens=5600, request_timeout=request_timeout)
        parsed = extract_json_object(raw)
        return normalise_ai_mind_map(parsed or {}, fallback, depth)
    except Exception:
        return fallback


def make_notes_title(summary: str, source_title_candidates: List[str], request_timeout: Optional[float] = None) -> str:
    picked = choose_best_source_title(source_title_candidates)
    if picked != "Generated Study Notes":
        return picked

    text = normalise_space(summary)
    for pattern in [
        r"(?:source material|material|document|lesson|video|workshop|case study)\s+(?:is|was|appears to be|focuses on|examines|explores|discusses|covers|teaches|is related to)\s+(?:a|an|the)?\s*([^.;\n]{10,110})",
        r"(?:focuses on|examines|explores|discusses|covers|teaches|demonstrates|shows)\s+(?:how to\s+)?(?:a|an|the)?\s*([^.;\n]{10,110})",
    ]:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return match.group(1).strip()[:72]

    try:
        title_candidate_text = ", ".join(str(item) for item in source_title_candidates[:6] if str(item).strip()) or "none"
        raw = generate_chat([
            {
                "role": "system",
                "content": (
                    "Create concise, source-faithful study-note titles. "
                    "Return only the title, with no markdown, quotes, or trailing punctuation."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Write a specific title for these generated study notes. "
                    "Use explicit source evidence from the summary; do not invent a course name. "
                    "Keep it under 72 characters and never translate the product name Synapse.\n\n"
                    f"Source title candidates: {title_candidate_text}\n\n"
                    f"Summary excerpt:\n{truncate_text(summary, 6000)}"
                ),
            },
        ], model=title_model_for_active_provider(), temperature=0, max_tokens=80, request_timeout=request_timeout)
        candidate = normalise_space(raw).strip(" #`'\".:;-")
        if len(candidate) >= 8:
            return candidate[:72]
    except Exception:
        pass

    first_sentence = next((part.strip() for part in re.split(r"[.!?。！？]", text) if len(part.strip()) > 8), "")
    return first_sentence[:72] if first_sentence else "Generated Study Notes"
