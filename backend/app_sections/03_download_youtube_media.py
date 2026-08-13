def download_youtube_media(url: str) -> Optional[str]:
    if not ENABLE_YOUTUBE_YTDLP_FALLBACK or yt_dlp is None:
        return None
    temp_dir = tempfile.mkdtemp(prefix="synapse_yt_")
    output_template = os.path.join(temp_dir, "%(id)s.%(ext)s")
    ydl_opts = {
        "format": "best[height<=720][ext=mp4]/best[height<=720]/bestvideo[height<=720]+bestaudio/best",
        "outtmpl": output_template,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "max_filesize": MAX_VIDEO_BYTES,
        "merge_output_format": "mp4",
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            downloaded = ydl.prepare_filename(info)
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        return None
    candidates = [downloaded]
    candidates.extend(str(path) for path in Path(temp_dir).glob("*"))
    return next((path for path in candidates if os.path.exists(path) and os.path.getsize(path) > 0), None)


def analyse_youtube_url(url: str, captions_only: bool = False) -> Tuple[str, List[dict], dict]:
    canonical_url = canonicalize_youtube_watch_url(url)
    metadata = fetch_youtube_metadata(canonical_url)
    transcript = fetch_youtube_caption_transcript(canonical_url)
    frame_parts: List[dict] = []
    media_path = None
    video_id = get_youtube_video_id(canonical_url) or "unknown"
    detected_title = metadata.get("title") or f"YouTube video {video_id}"

    extract_frames = os.getenv("YOUTUBE_EXTRACT_FRAMES", "0").lower() in {"1", "true", "yes"}
    needs_audio_fallback = len(transcript.strip()) < 500
    # Multi-file requests already have PPTX/PDF evidence. Skip the expensive
    # yt-dlp download/transcribe path so analysis stays inside the request budget.
    allow_media_download = not captions_only
    if allow_media_download and yt_dlp is not None and (extract_frames or needs_audio_fallback):
        media_path = download_youtube_media(canonical_url)
    if media_path:
        try:
            if extract_frames:
                frame_parts = extract_video_frames_from_file(media_path, source_name=detected_title)
            if needs_audio_fallback and has_openai():
                try:
                    with open(media_path, "rb") as media_file:
                        media_bytes = media_file.read(MAX_AUDIO_BYTES + 1)
                    transcribed = transcribe_media_bytes(os.path.basename(media_path), media_bytes)
                    if transcribed and not transcribed.lower().startswith("the audio/video file is too large"):
                        transcript = transcribed
                except Exception:
                    pass
        finally:
            try:
                shutil.rmtree(Path(media_path).parent, ignore_errors=True)
            except Exception:
                pass
    # A video title or an embedded player is not enough evidence to create study
    # notes. Keep the source visible in the UI, but explicitly mark it as
    # unavailable to the generator unless we retrieved a meaningful transcript.
    transcript_body = transcript.strip()
    transcript_is_usable = (
        len(re.sub(r"\s+", " ", transcript_body)) >= 240
        and transcript_body != YOUTUBE_TRANSCRIPT_UNAVAILABLE_TEXT
    )
    if not transcript_is_usable:
        transcript = YOUTUBE_TRANSCRIPT_UNAVAILABLE_TEXT
    metadata_lines = []
    if metadata.get("title"):
        metadata_lines.append(f"Video title: {metadata['title']}")
    if metadata.get("channel"):
        metadata_lines.append(f"Channel: {metadata['channel']}")
    if metadata.get("duration"):
        metadata_lines.append(f"Duration: {metadata['duration']}")
    if metadata_lines:
        transcript = "[YouTube metadata]\n" + "\n".join(metadata_lines) + "\n\n[Transcript]\n" + transcript
    meta = {
        "url": canonical_url,
        "source_identity": f"youtube:{video_id}",
        "detected_title": detected_title,
        "content_hash": sha256_text(transcript),
        "metadata": metadata,
        "visual_parts": frame_parts,
        "transcript_status": "available" if transcript_is_usable else "unavailable",
        "transcript_characters": len(transcript_body) if transcript_is_usable else 0,
        "transcript_warning": "" if transcript_is_usable else (
            "Synapse could not access readable YouTube captions for this video. "
            "It will not generate notes from the title or player alone."
        ),
    }
    return transcript, frame_parts, meta


# -------------------------
# Parsing / title / mind map helpers
# -------------------------
def parse_sections(summary: str) -> Dict[str, str]:
    """
    Parse both # and ## headings so the first heading can be localised.
    This fixes the old issue where the first navigation item stayed as English "Overview"
    when the selected output language was not English.
    """
    sections: Dict[str, str] = {}
    current_heading = "Overview"
    current_content: List[str] = []
    heading_seen = False

    promoted_heading_pattern = re.compile(
        r"^\s*(?:"
        r"Learning question|Key takeaways?|Core concept map|Main notes by lecture section|Key terms table|Case study\s*/\s*example breakdown|"
        r"Evidence bank|Exam answer templates|Common mistakes|Revision checklist|Flashcard-ready summary|"
        r"Academic overview|Central argument|Conceptual framework|Key tensions\s*/\s*debates|Critical analysis|"
        r"Strengths and limits of the source|Essay-ready thesis statements|Model academic paragraph|"
        r"Professional vocabulary bank|High-grade discussion points|Essay\s*/\s*tutorial use|How to use this in an essay or tutorial|"
        r"Source and argument map|Core notes|Key terms(?: and mechanisms)?|Sources? \(|Sources?:|Core argument|Key ideas?|Concepts? explained|"
        r"Source evidence(?:\s*/\s*example matrix)?|Reading the source evidence|Worked examples?|Evidence matrix|Comparison table|"
        r"Exam strategy|Common mistakes|Revision(?: checklist)?|Conclusion|"
        r"学习问题|关键结论|核心概念图|分章节主笔记|关键术语表|案例\s*/\s*例子拆解|证据库|考试答题模板|常见错误|复习清单|闪卡速记总结|"
        r"學習問題|關鍵結論|核心概念圖|分章節主筆記|關鍵術語表|案例\s*/\s*例子拆解|證據庫|考試答題模板|常見錯誤|複習清單|閃卡速記總結|"
        r"来源与论点地图|來源與論點地圖|核心笔记|核心筆記|关键术语与机制|關鍵術語與機制|核心论点|关键概念|源内证据|源內證據|证据矩阵|例子与证据|概念比较表|"
        r"考试策略|考試策略|复习|復習|结论|結論"
        r")\b.*$",
        flags=re.I,
    )

    for raw_line in (summary or "").split("\n"):
        line = raw_line.rstrip()
        heading_match = re.match(r"^#{1,3}\s+(.+?)\s*$", line)
        promoted_heading_match = None if heading_match else promoted_heading_pattern.match(line)

        if heading_match or promoted_heading_match:
            heading = normalise_space(heading_match.group(1) if heading_match else line)
            heading = heading.strip("# ").strip()
            # Ignore empty headings and accidental markdown titles that are too long.
            if heading and len(heading) <= 140:
                if current_content:
                    sections[current_heading] = "\n".join(current_content).strip()
                elif heading_seen and current_heading not in sections:
                    sections[current_heading] = ""
                current_heading = heading
                current_content = []
                heading_seen = True
                continue

        current_content.append(line)

    if current_content:
        sections[current_heading] = "\n".join(current_content).strip()

    return {key: value for key, value in sections.items() if value.strip()}




_SUBSCRIPT_CHARS = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
    "a": "ₐ", "e": "ₑ", "h": "ₕ", "i": "ᵢ", "j": "ⱼ",
    "k": "ₖ", "l": "ₗ", "m": "ₘ", "n": "ₙ", "o": "ₒ",
    "p": "ₚ", "r": "ᵣ", "s": "ₛ", "t": "ₜ", "u": "ᵤ",
    "v": "ᵥ", "x": "ₓ",
}

_SUPERSCRIPT_CHARS = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
    "a": "ᵃ", "b": "ᵇ", "c": "ᶜ", "d": "ᵈ", "e": "ᵉ",
    "f": "ᶠ", "g": "ᵍ", "h": "ʰ", "i": "ⁱ", "j": "ʲ",
    "k": "ᵏ", "l": "ˡ", "m": "ᵐ", "n": "ⁿ", "o": "ᵒ",
    "p": "ᵖ", "r": "ʳ", "s": "ˢ", "t": "ᵗ", "u": "ᵘ",
    "v": "ᵛ", "w": "ʷ", "x": "ˣ", "y": "ʸ", "z": "ᶻ",
    "A": "ᴬ", "B": "ᴮ", "D": "ᴰ", "E": "ᴱ", "G": "ᴳ",
    "H": "ᴴ", "I": "ᴵ", "J": "ᴶ", "K": "ᴷ", "L": "ᴸ",
    "M": "ᴹ", "N": "ᴺ", "O": "ᴼ", "P": "ᴾ", "R": "ᴿ",
    "T": "ᵀ", "U": "ᵁ", "V": "ⱽ", "W": "ᵂ",
}


_BLACKBOARD_CHARS = {
    "A": "𝔸", "B": "𝔹", "C": "ℂ", "D": "𝔻", "E": "𝔼",
    "F": "𝔽", "G": "𝔾", "H": "ℍ", "I": "𝕀", "N": "ℕ",
    "P": "ℙ", "Q": "ℚ", "R": "ℝ", "Z": "ℤ",
}


_LATEX_READABLE_SYMBOLS = {
    r"\Alpha": "Α", r"\Beta": "Β", r"\Gamma": "Γ", r"\Delta": "Δ",
    r"\Epsilon": "Ε", r"\Zeta": "Ζ", r"\Eta": "Η", r"\Theta": "Θ",
    r"\Iota": "Ι", r"\Kappa": "Κ", r"\Lambda": "Λ", r"\Mu": "Μ",
    r"\Nu": "Ν", r"\Xi": "Ξ", r"\Omicron": "Ο", r"\Pi": "Π",
    r"\Rho": "Ρ", r"\Sigma": "Σ", r"\Tau": "Τ", r"\Upsilon": "Υ",
    r"\Phi": "Φ", r"\Chi": "Χ", r"\Psi": "Ψ", r"\Omega": "Ω",
    r"\alpha": "α", r"\beta": "β", r"\gamma": "γ", r"\delta": "δ",
    r"\epsilon": "ε", r"\varepsilon": "ε", r"\zeta": "ζ", r"\eta": "η",
    r"\theta": "θ", r"\vartheta": "ϑ", r"\iota": "ι", r"\kappa": "κ",
    r"\lambda": "λ", r"\mu": "μ", r"\nu": "ν", r"\xi": "ξ",
    r"\omicron": "ο", r"\pi": "π", r"\varpi": "ϖ", r"\rho": "ρ",
    r"\varrho": "ϱ", r"\sigma": "σ", r"\varsigma": "ς", r"\tau": "τ",
    r"\upsilon": "υ", r"\phi": "φ", r"\varphi": "ϕ", r"\chi": "χ",
    r"\psi": "ψ", r"\omega": "ω",
    r"\times": "×", r"\cdot": "·", r"\cdotp": "·", r"\div": "÷",
    r"\pm": "±", r"\mp": "∓", r"\ast": "*", r"\star": "⋆",
    r"\circ": "∘", r"\bullet": "•", r"\oplus": "⊕", r"\otimes": "⊗",
    r"\leq": "≤", r"\le": "≤", r"\leqslant": "≤",
    r"\geq": "≥", r"\ge": "≥", r"\geqslant": "≥",
    r"\neq": "≠", r"\ne": "≠", r"\equiv": "≡", r"\approx": "≈",
    r"\sim": "∼", r"\simeq": "≃", r"\cong": "≅", r"\propto": "∝",
    r"\lt": "<", r"\gt": ">", r"\ll": "≪", r"\gg": "≫",
    r"\infty": "∞", r"\partial": "∂", r"\nabla": "∇", r"\angle": "∠",
    r"\perp": "⊥", r"\parallel": "∥", r"\degree": "°",
    r"\lfloor": "⌊", r"\rfloor": "⌋", r"\lceil": "⌈", r"\rceil": "⌉",
    r"\langle": "<", r"\rangle": ">", r"\ldots": "…", r"\dots": "…", r"\cdots": "…",
    r"\in": "∈", r"\notin": "∉", r"\ni": "∋", r"\subseteq": "⊆",
    r"\supseteq": "⊇", r"\subset": "⊂", r"\supset": "⊃",
    r"\emptyset": "∅", r"\varnothing": "∅", r"\setminus": "∖",
    r"\cup": "∪", r"\cap": "∩",
    r"\forall": "∀", r"\exists": "∃", r"\nexists": "∄", r"\neg": "¬",
    r"\land": "∧", r"\wedge": "∧", r"\lor": "∨", r"\vee": "∨",
    r"\therefore": "∴", r"\because": "∵",
    r"\to": "→", r"\rightarrow": "→", r"\leftarrow": "←",
    r"\leftrightarrow": "↔", r"\mapsto": "↦", r"\Rightarrow": "⇒",
    r"\Leftarrow": "⇐", r"\Leftrightarrow": "⇔", r"\implies": "⇒",
    r"\iff": "⇔", r"\uparrow": "↑", r"\downarrow": "↓",
    r"\sum": "Σ", r"\prod": "Π", r"\int": "∫", r"\iint": "∬",
    r"\iiint": "∭", r"\oint": "∮",
}


_LATEX_FUNCTION_NAMES = (
    "sin", "cos", "tan", "sec", "csc", "cot",
    "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh",
    "log", "ln", "lim", "max", "min", "sup", "inf",
    "det", "rank", "tr", "dim", "ker", "span", "Pr",
)


def readable_accent(content: str, mark: str, name: str) -> str:
    text = (content or "").strip()
    if not text:
        return ""
    return f"{text}{mark}" if len(text) <= 2 else f"{name}({text})"


def normalise_escaped_latex_commands(value: str) -> str:
    """Collapse JSON-escaped LaTeX command slashes without touching row breaks."""
    output = str(value or "")
    previous = None
    while output != previous:
        previous = output
        output = re.sub(r"\\\\(?=[A-Za-z()[\],;:!])", r"\\", output)
    return output


def replace_latex_readable_symbols(value: str) -> str:
    """Convert common LaTeX commands into readable Unicode/plain text."""
    if not value:
        return ""

    output = normalise_escaped_latex_commands(value)
    output = re.sub(r"\\mathbb\{([A-Za-z])\}", lambda m: _BLACKBOARD_CHARS.get(m.group(1), m.group(1)), output)
    output = re.sub(r"\\mathbb\s+([A-Za-z])", lambda m: _BLACKBOARD_CHARS.get(m.group(1), m.group(1)), output)
    output = re.sub(r"\\(?:operatorname|text|mathrm|mathbf|mathit|textbf|textit)\{([^{}]*)\}", r"\1", output)
    output = re.sub(r"\\(?:left|right|big|Big|bigg|Bigg)\b", "", output)
    output = re.sub(r"\\(?:quad|qquad)\b", " ", output)
    output = re.sub(r"\\[,;:!]\s*", " ", output)
    output = re.sub(r"\\(?:widehat|hat)\{([^{}]+)\}", lambda m: readable_accent(m.group(1), "\u0302", "hat"), output)
    output = re.sub(r"\\(?:overline|bar)\{([^{}]+)\}", lambda m: readable_accent(m.group(1), "\u0304", "bar"), output)
    output = re.sub(r"\\(?:vec|overrightarrow)\{([^{}]+)\}", lambda m: readable_accent(m.group(1), "\u20d7", "vec"), output)
    output = re.sub(r"\\tilde\{([^{}]+)\}", lambda m: readable_accent(m.group(1), "\u0303", "tilde"), output)
    output = re.sub(r"\\dot\{([^{}]+)\}", lambda m: readable_accent(m.group(1), "\u0307", "dot"), output)
    output = re.sub(r"\\ddot\{([^{}]+)\}", lambda m: readable_accent(m.group(1), "\u0308", "ddot"), output)
    for command, symbol in sorted(_LATEX_READABLE_SYMBOLS.items(), key=lambda item: len(item[0]), reverse=True):
        output = re.sub(re.escape(command) + r"(?![A-Za-z])", symbol, output)
    for name in _LATEX_FUNCTION_NAMES:
        output = re.sub(rf"\\{name}(?![A-Za-z])", name, output)
    output = output.replace("<=>", "⇔")
    output = output.replace("=>", "⇒")
    output = output.replace("<=", "≤")
    output = output.replace(">=", "≥")
    output = output.replace("!=", "≠")
    output = re.sub(r"(?<!<)->", "→", output)
    output = output.replace("<-", "←")
    return output


def readable_script(chars: str, mapping: dict, fallback_prefix: str = "") -> str:
    value = (chars or "").strip()
    mapped = "".join(mapping.get(ch, mapping.get(ch.lower(), "")) for ch in value)
    return mapped if mapped and len(mapped) == len(value) else f"{fallback_prefix}{value}"


def readable_subscripts(value: str) -> str:
    """Turn v_1 / A_ij / v_{m} into compact Unicode subscript display."""
    if not value:
        return ""

    def repl_braced(match: re.Match) -> str:
        return readable_script(match.group(1), _SUBSCRIPT_CHARS, "_")

    def repl_simple(match: re.Match) -> str:
        return match.group(1) + readable_script(match.group(2), _SUBSCRIPT_CHARS, "_")

    value = re.sub(r"_\{([A-Za-z0-9+\-=()]+)\}", repl_braced, value)
    value = re.sub(r"([A-Za-z0-9\u0370-\u03ff\u1f00-\u1fff∫∬∭∮ΣΠ∂∇)\]])_([A-Za-z0-9]{1,4})(?![A-Za-z0-9])", repl_simple, value)
    value = re.sub(r"_([A-Za-z0-9]{1,4})(?![A-Za-z0-9])", lambda m: readable_script(m.group(1), _SUBSCRIPT_CHARS, "_"), value)
    return value


def readable_superscripts(value: str) -> str:
    """Turn A^T / A^{-1} into compact Unicode superscript display."""
    if not value:
        return ""

    def repl_braced(match: re.Match) -> str:
        return readable_script(match.group(1), _SUPERSCRIPT_CHARS, "^")

    def repl_simple(match: re.Match) -> str:
        return match.group(1) + readable_script(match.group(2), _SUPERSCRIPT_CHARS, "^")

    value = re.sub(r"\^\{\\?top\}", "ᵀ", value, flags=re.I)
    value = re.sub(r"\^\\?top\b", "ᵀ", value, flags=re.I)
    value = re.sub(r"\^\{([A-Za-z0-9+\-=()]+)\}", repl_braced, value)
    value = re.sub(r"([A-Za-z0-9\u0370-\u03ff\u1f00-\u1fff∫∬∭∮ΣΠ∂∇)\]])\^([A-Za-z0-9+\-=]{1,4})(?![A-Za-z0-9])", repl_simple, value)
    value = re.sub(r"\^([A-Za-z0-9+\-=]{1,4})(?![A-Za-z0-9])", lambda m: readable_script(m.group(1), _SUPERSCRIPT_CHARS, "^"), value)
    return value


def readable_math_symbols(value: str) -> str:
    return readable_subscripts(readable_superscripts(value or ""))


def matrix_latex_to_readable(raw: str) -> str:
    r"""Convert LaTeX matrices into compact readable forms for mind maps.

    Example:
    \begin{bmatrix} v_1 \\ v_2 \\ v_m \end{bmatrix}
    -> [v₁; v₂; vₘ]
    """
    if not raw:
        return ""

    def convert_body(body: str) -> str:
        body = body.strip()
        body = body.replace(r"\ldots", "…").replace(r"\dots", "…").replace(r"\cdots", "…")
        rows = re.split(r"\\\\|\\cr", body)
        cleaned_rows = []
        for row in rows:
            cells = [readable_subscripts(clean_mindmap_text(cell)) for cell in row.split("&")]
            cells = [cell for cell in cells if cell]
            if cells:
                cleaned_rows.append(", ".join(cells))
        if not cleaned_rows:
            return "[]"
        if len(cleaned_rows) == 1:
            return "[" + cleaned_rows[0] + "]"
        return "[" + "; ".join(cleaned_rows) + "]"

    pattern = re.compile(r"\\begin\{(?:bmatrix|pmatrix|matrix|vmatrix|Bmatrix|smallmatrix)\}([\s\S]*?)\\end\{(?:bmatrix|pmatrix|matrix|vmatrix|Bmatrix|smallmatrix)\}")
    return pattern.sub(lambda m: convert_body(m.group(1)), raw)


def plain_nested_matrices_to_readable(raw: str) -> str:
    """Convert raw nested arrays like [[1,2],[3,4]] for compact mind-map text."""
    if not raw:
        return ""

    def convert(match: re.Match) -> str:
        rows: List[str] = []
        for row_match in re.finditer(r"\[\s*([^\[\]\n]*?)\s*\]", match.group(0)):
            cells = [
                readable_subscripts(clean_mindmap_text(cell))
                for cell in re.split(r"\s*,\s*", row_match.group(1))
            ]
            cells = [cell for cell in cells if cell]
            if cells:
                rows.append(", ".join(cells))
        return "[" + "; ".join(rows) + "]" if rows else match.group(0)

    return re.sub(r"\[\s*(\[[^\[\]\n]*\]\s*(?:,\s*\[[^\[\]\n]*\]\s*)+)\]", convert, raw)


def plain_matrix_words_to_readable(value: str) -> str:
    """Clean model outputs such as 'bmatrix v_1 v_2 v_m bmatrix'."""
    if not value:
        return ""

    value = re.sub(r"\b(?:begin|end)?\s*bmatrix\b", " ", value, flags=re.I)
    value = re.sub(r"\b(?:begin|end)?\s*pmatrix\b", " ", value, flags=re.I)
    value = re.sub(r"\b(?:begin|end)?\s*matrix\b", " ", value, flags=re.I)
    value = value.replace("\\\\", "; ").replace("&", ", ")
    value = readable_subscripts(value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def clean_mindmap_text(text: str) -> str:
    """Clean markdown / LaTeX-ish text so the visual mind map stays readable."""
    if not text:
        return ""
    value = normalise_escaped_latex_commands(text)
    value = matrix_latex_to_readable(value)
    value = plain_nested_matrices_to_readable(value)

    # Remove markdown wrappers first.
    value = re.sub(r"```[\s\S]*?```", " ", value)
    value = re.sub(r"`([^`]*)`", r"\1", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"\1", value)
    value = re.sub(r"__([^_]+)__", r"\1", value)
    value = re.sub(r"\*([^*]+)\*", r"\1", value)

    # Remove common LaTeX math delimiters.
    value = re.sub(r"\$\$([\s\S]*?)\$\$", r"\1", value)
    value = re.sub(r"\$([^$]+)\$", r"\1", value)
    value = value.replace(r"\(", "").replace(r"\)", "")
    value = value.replace(r"\[", "").replace(r"\]", "")

    # Convert readable LaTeX constructs before stripping slashes.
    value = replace_latex_readable_symbols(value)
    value = re.sub(r"\\sqrt\{([^{}]+)\}", r"√(\1)", value)
    value = re.sub(r"sqrt\s*\(\s*([^()]+?)\s*\)", r"√(\1)", value, flags=re.I)
    value = re.sub(r"sqrt\s*([0-9A-Za-z]+)", r"√(\1)", value, flags=re.I)
    value = re.sub(r"\\frac\{([^{}]+)\}\{([^{}]+)\}", r"(\1)/(\2)", value)
    value = re.sub(r"([A-Za-z0-9\)])\^\{([^{}]+)\}", r"\1^\2", value)
    value = re.sub(r"([A-Za-z0-9\)])\^([A-Za-z0-9])", r"\1^\2", value)
    value = value.replace(r"\top", "T")
    value = replace_latex_readable_symbols(value)

    value = replace_latex_readable_symbols(value)
    value = re.sub(r"\blim_\{([^{}]+)\}", r"lim as \1", value, flags=re.I)
    value = readable_math_symbols(value)

    # Remove remaining LaTeX command words, but preserve the content around them.
    value = re.sub(r"\\[a-zA-Z]+", "", value)
    value = value.replace("{", "").replace("}", "")
    value = value.replace("\\", "")
    value = plain_matrix_words_to_readable(value)
    value = readable_math_symbols(value)

    value = re.sub(r"\s+", " ", value)
    value = value.strip(" •*\t\n")
    value = value.replace(" **", "").replace("**", "")
    return value.strip()


def short_mindmap_text(text: str, limit: int = 70) -> str:
    value = clean_mindmap_text(text)
    if len(value) <= limit:
        return value
    return value[: limit - 1].rstrip(" ,;:") + "…"


def first_good_sentence(text: str, limit: int = 190) -> str:
    value = clean_mindmap_text(text)
    sentences = re.split(r"(?<=[.!?。！？])\s+", value)
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) >= 12:
            return short_mindmap_text(sentence, limit)
    return short_mindmap_text(value, limit)
