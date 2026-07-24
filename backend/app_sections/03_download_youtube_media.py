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


def analyse_youtube_url(url: str) -> Tuple[str, List[dict], dict]:
    canonical_url = canonicalize_youtube_watch_url(url)
    metadata = fetch_youtube_metadata(canonical_url)
    transcript = fetch_youtube_caption_transcript(canonical_url)
    frame_parts: List[dict] = []
    media_path = None
    video_id = get_youtube_video_id(canonical_url) or "unknown"
    detected_title = metadata.get("title") or f"YouTube video {video_id}"

    extract_frames = os.getenv("YOUTUBE_EXTRACT_FRAMES", "0").lower() in {"1", "true", "yes"}
    needs_audio_fallback = len(transcript.strip()) < 500
    if yt_dlp is not None and (extract_frames or needs_audio_fallback):
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
        ], model=MINDMAP_MODEL, temperature=0, max_tokens=5600, request_timeout=request_timeout)
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
        ], model=TITLE_MODEL, temperature=0, max_tokens=80, request_timeout=request_timeout)
        candidate = normalise_space(raw).strip(" #`'\".:;-")
        if len(candidate) >= 8:
            return candidate[:72]
    except Exception:
        pass

    first_sentence = next((part.strip() for part in re.split(r"[.!?。！？]", text) if len(part.strip()) > 8), "")
    return first_sentence[:72] if first_sentence else "Generated Study Notes"
