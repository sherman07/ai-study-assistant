

def limit_text_parts_for_depth(content_parts: List[dict], max_chars: int) -> List[dict]:
    """Balanced source limiting for multi-file analysis.

    The previous version spent the whole source budget from the beginning of the
    combined text. With multiple files that can silently exclude later files,
    making the model unable to find common ideas across sources. This version
    gives every text source a fair base allocation first, then uses remaining
    budget for extra detail.
    """
    text_indices: List[int] = []
    text_values: List[str] = []
    for idx, part in enumerate(content_parts or []):
        if isinstance(part, dict) and part.get("type") == "text":
            text_indices.append(idx)
            text_values.append(part.get("text") or "")

    if not text_values:
        return list(content_parts or [])

    max_chars = max(1200, int(max_chars or MAX_SOURCE_CHARS))
    n = len(text_values)

    # Guarantee each uploaded/linked source has a visible sample. This is the key
    # to cross-source comparison quality.
    base_each = min(22000, max(6000, max_chars // max(n * 2, 1)))
    selected = [""] * n
    used = 0

    for i, text in enumerate(text_values):
        take = min(len(text), base_each, max_chars - used)
        if take <= 0:
            break
        selected[i] = text[:take]
        used += take

    # Distribute remaining capacity round-robin so no single long file dominates.
    cursor = [len(x) for x in selected]
    while used < max_chars:
        progressed = False
        for i, text in enumerate(text_values):
            if used >= max_chars:
                break
            if cursor[i] >= len(text):
                continue
            chunk = min(3500, len(text) - cursor[i], max_chars - used)
            selected[i] += text[cursor[i]:cursor[i] + chunk]
            cursor[i] += chunk
            used += chunk
            progressed = True
        if not progressed:
            break

    output: List[dict] = []
    text_counter = 0
    for part in content_parts or []:
        if not isinstance(part, dict) or part.get("type") != "text":
            output.append(part)
            continue
        limited_text = selected[text_counter]
        original_len = len(text_values[text_counter])
        text_counter += 1
        if original_len > len(limited_text):
            limited_text += f"\n\n[System note: this source was truncated from {original_len} to {len(limited_text)} characters for model context. Other sources were also preserved for comparison.]"
        output.append({**part, "text": limited_text})
    return output



def cap_image_parts(parts: List[dict], max_images: int) -> List[dict]:
    """Keep text parts but cap image_url parts for very large multi-file uploads."""
    output: List[dict] = []
    image_count = 0
    skip_next_visual_label = False
    for part in parts or []:
        if isinstance(part, dict) and part.get("type") == "image_url":
            if image_count < max_images:
                output.append(part)
                image_count += 1
            else:
                skip_next_visual_label = False
            continue
        output.append(part)
    return output

def build_multisource_instruction(source_units: List[dict], preferred_language: str) -> str:
    """Prompt block that turns multiple uploads into a true comparative analysis."""
    if len(source_units or []) < 2:
        return ""

    source_list = []
    for i, unit in enumerate(source_units, start=1):
        source_list.append(f"Source {i}: {unit.get('display_name')} | title/topic: {unit.get('title_candidate')}")

    return f"""
MULTI-SOURCE PROFESSOR SYNTHESIS MODE IS ACTIVE.
The user provided {len(source_units)} sources. This is the core product feature. Quality is more important than token saving in this mode.

Sources provided:
{chr(10).join(source_list)}

Reference style to imitate:
{REFERENCE_STYLE_PROFILE}

Required architecture:
{MULTISOURCE_REFERENCE_STRUCTURE}

Non-negotiable quality requirements:
- Do NOT produce a short overview. Produce a full professor-style learning guide.
- Do NOT write generic sentences such as “these sources discuss psychology”. Name exact concepts, named researchers, studies, methods, evidence, examples, and visuals.
- Each uploaded file/source must appear in the Source-by-Source Guided Notes section unless it has no readable content.
- For lecture slides, explain the lecture flow: why the lecture starts with the opening question, how the examples build the concept, and what students should take from each section.
- For studies/experiments, use the mini-format: Question → Method → Result → Meaning.
- For comparisons, use markdown tables.
- For visuals, describe what is visible and explain its teaching purpose.
- For cross-source synthesis, identify shared ideas, not just shared topics.
- Keep the whole answer in the selected output language.
- Keep Synapse as Synapse. Never translate the brand.
"""

def content_text_length(content_parts: List[dict]) -> int:
    total = 0
    for part in content_parts or []:
        if isinstance(part, dict) and part.get("type") == "text":
            total += len(part.get("text") or "")
    return total


def source_unit_text_excerpt(unit: dict, limit: int = 42000) -> str:
    return (unit.get("text_excerpt") or "")[:limit]


def generate_source_digests_for_multisource(source_units: List[dict], language_rule: str) -> str:
    if not ENABLE_MULTI_SOURCE_DIGESTS:
        return ""
    digests = []
    for index, unit in enumerate(source_units, start=1):
        digests.append(generate_individual_source_digest(index, unit, language_rule))
    return "\n\n".join(digests).strip()



def is_weak_multisource_response(text: str, source_count: int) -> bool:
    """Reject shallow multi-source outputs before they pollute cache/history."""
    if source_count < 2:
        return False
    value = text or ""
    lowered = value.lower()
    cjk_count = len(re.findall(r"[\u4e00-\u9fff]", value))
    word_count = len(re.findall(r"\w+", value))
    effective_length = cjk_count + word_count
    required_markers = [
        "source-by-source", "common ideas", "connections", "evidence table", "exam",
        "逐项", "来源", "共同", "连接", "差异", "表", "考试", "复习", "证据",
        "來源", "共同點", "連接", "差異", "證據",
    ]
    marker_count = sum(1 for marker in required_markers if marker in lowered or marker in value)
    # The threshold is intentionally high because multi-file analysis is the main product feature.
    if effective_length < int(os.getenv("MULTISOURCE_MIN_EFFECTIVE_LENGTH", "5200")):
        return True
    if marker_count < 4:
        return True
    return False


def assemble_reference_style_multisource_output(source_digest_block: str, synthesis: str, preferred_language: str) -> str:
    """Preserve detailed per-source cards instead of letting the final model compress them.

    The competing product's strength is that it keeps detailed lecture-by-lecture
    notes and then adds synthesis. This helper guarantees that structure.
    """
    if not source_digest_block:
        return synthesis
    key = normalise_language_key(preferred_language)
    if key in {"simplified_chinese", "mixed_chinese_english"}:
        title = "# 🧠 综合学习指南"
        source_heading = "## 1. 逐项资源精讲"
        synthesis_heading = "## 2. 跨资源综合分析"
        note = "以下内容先保留每份资源的详细讲解，再进行共同主题、差异、连接关系、图文证据和复习重点的综合。"
    elif key == "traditional_chinese":
        title = "# 🧠 綜合學習指南"
        source_heading = "## 1. 逐項資源精講"
        synthesis_heading = "## 2. 跨資源綜合分析"
        note = "以下內容先保留每份資源的詳細講解，再進行共同主題、差異、連接關係、圖文證據和複習重點的綜合。"
    else:
        title = "# 🧠 Integrated Study Guide"
        source_heading = "## 1. Source-by-Source Guided Notes"
        synthesis_heading = "## 2. Cross-Source Professor Synthesis"
        note = "The guide first preserves detailed notes for each source, then synthesises shared ideas, differences, connections, visual evidence, and revision priorities."

    clean_synthesis = synthesis.strip()
    # Avoid two competing top-level titles from the model.
    clean_synthesis = re.sub(r"(?m)^#\s+Integrated Study Guide\s*$", "", clean_synthesis).strip()
    clean_synthesis = re.sub(r"(?m)^#\s*🧠\s*Integrated Study Guide[:：]?.*$", "", clean_synthesis).strip()
    clean_synthesis = re.sub(r"(?m)^#\s*🧠\s*综合学习指南[:：]?.*$", "", clean_synthesis).strip()
    clean_synthesis = re.sub(r"(?m)^#\s*综合学习指南[:：]?.*$", "", clean_synthesis).strip()

    return f"{title}\n\n{note}\n\n{source_heading}\n\n{source_digest_block.strip()}\n\n{synthesis_heading}\n\n{clean_synthesis}"



def count_readable_units(text: str) -> int:
    """Approximate content richness without being tied to one language or heading style."""
    text = text or ""
    cjk = len(re.findall(r"[\u4e00-\u9fff]", text))
    words = len(re.findall(r"\b[\w'-]+\b", text))
    headings = len(re.findall(r"(?m)^#{1,4}\s+", text))
    bullets = len(re.findall(r"(?m)^\s*[-*•]\s+|^\s*\d+[.)]\s+", text))
    tables = text.count("|---") + text.count("| ---")
    return cjk + words + headings * 25 + bullets * 8 + tables * 80


def is_usable_multisource_text(text: str, source_count: int) -> bool:
    """Quality gate for multi-source outputs across languages and subjects."""
    if source_count < 2:
        return bool(text and not is_refusal_or_useless_response(text))
    if not text or is_refusal_or_useless_response(text):
        return False
    units = count_readable_units(text)
    has_table = "|" in text and ("---" in text or text.count("|") >= 12)
    has_many_sections = len(re.findall(r"(?m)^#{1,4}\s+", text or "")) >= 4
    has_source_mentions = len(re.findall(r"\bSource\s*\d+\b|来源\s*\d+|資源\s*\d+|第\s*\d+\s*(份|个|個)", text or "", flags=re.I)) >= min(2, source_count)
    has_synthesis_terms = bool(re.search(r"common|connection|difference|synthesis|evidence|exam|theme|shared|共同|连接|連接|差异|差異|综合|綜合|证据|證據|考试|考試|复习|複習", text or "", flags=re.I))
    return units >= int(os.getenv("MULTISOURCE_SYNTHESIS_MIN_UNITS", "3600")) and (has_many_sections or has_table) and (has_source_mentions or has_synthesis_terms)


def fallback_multisource_synthesis_from_digests(source_digest_block: str, source_units: List[dict], preferred_language: str) -> str:
    """Deterministic safety net so multi-source uploads never collapse into an error."""
    key = normalise_language_key(preferred_language)
    titles = []
    for i, unit in enumerate(source_units or [], start=1):
        titles.append(unit.get("title_candidate") or unit.get("display_name") or f"Source {i}")

    if key in {"simplified_chinese", "mixed_chinese_english"}:
        title = "## 跨资源综合分析"
        intro = "Synapse 已保留每份资源的详细讲解，并生成以下跨资源学习框架。你可以从上方逐项资源精讲中复习具体内容，再用下方框架建立共同主题和差异。"
        source_list_heading = "### 资源范围"
        common_heading = "### 共同 idea 的寻找方式"
        connection_heading = "### 如何建立跨资源连接"
        table_heading = "### 跨资源复习表"
        exam_heading = "### 复习与考试使用方式"
        rows = ["| 复习任务 | 你应该做什么 |", "|---|---|",
                "| 找共同点 | 比较每份资源反复出现的核心概念、方法、理论争论或案例。 |",
                "| 找差异 | 注意不同资源是否从不同层次解释同一问题，例如生物、行为、社会、历史、法律或技术层次。 |",
                "| 找证据 | 把每份资源中的例子、研究、数据、图表或步骤放到共同主题下面。 |",
                "| 准备考试 | 用“概念定义 → 来源证据 → 比较 → 应用”的结构回答。 |"]
    elif key == "traditional_chinese":
        title = "## 跨資源綜合分析"
        intro = "模型綜合部分未能穩定生成，因此 Synapse 保留了每份資源的詳細講解，並自動生成以下跨資源學習框架。你仍然可以從上方逐項資源精講中複習具體內容。"
        source_list_heading = "### 資源範圍"
        common_heading = "### 共同 idea 的尋找方式"
        connection_heading = "### 如何建立跨資源連接"
        table_heading = "### 跨資源複習表"
        exam_heading = "### 複習與考試使用方式"
        rows = ["| 複習任務 | 你應該做什麼 |", "|---|---|",
                "| 找共同點 | 比較每份資源反覆出現的核心概念、方法、理論爭論或案例。 |",
                "| 找差異 | 注意不同資源是否從不同層次解釋同一問題，例如生物、行為、社會、歷史、法律或技術層次。 |",
                "| 找證據 | 把每份資源中的例子、研究、數據、圖表或步驟放到共同主題下面。 |",
                "| 準備考試 | 用「概念定義 → 來源證據 → 比較 → 應用」的結構回答。 |"]
    else:
        title = "## Cross-Source Professor Synthesis"
        intro = "Synapse preserved the detailed source cards and generated this cross-source learning scaffold. Use the source-by-source notes above for specific content, then use this section to build shared themes and differences."
        source_list_heading = "### Source scope"
        common_heading = "### How to identify shared ideas"
        connection_heading = "### How to build cross-source connections"
        table_heading = "### Cross-source revision table"
        exam_heading = "### Exam and revision use"
        rows = ["| Revision task | What to do |", "|---|---|",
                "| Find common ideas | Compare repeated concepts, methods, debates, cases, or mechanisms across sources. |",
                "| Find differences | Notice whether each source explains the topic at a different level, such as biological, behavioural, social, historical, legal, or technical. |",
                "| Find evidence | Place each study, example, table, diagram, calculation, or section under a shared theme. |",
                "| Prepare for exams | Answer using the structure: concept definition → source evidence → comparison → application. |"]

    source_lines = "\n".join(f"- Source {i}: {t}" for i, t in enumerate(titles, start=1))
    return f"{title}\n\n{intro}\n\n{source_list_heading}\n{source_lines}\n\n{common_heading}\n- Look for repeated terms, repeated theories, repeated methods, and repeated examples.\n- Treat differences as learning value, not as a problem: different files often explain the same larger topic from different angles.\n\n{connection_heading}\n- Start from the most basic mechanism or definition.\n- Then connect it to examples, applications, debates, and evidence across the other sources.\n- Finish by explaining what the whole source set teaches that one file alone would not show.\n\n{table_heading}\n" + "\n".join(rows) + f"\n\n{exam_heading}\n- Build revision answers that explicitly name at least two sources.\n- Use specific examples from the source cards above rather than generic wording.\n- When a question asks for evaluation, include both shared ideas and tensions between sources."


def generate_multisource_synthesis_section(
    heading: str,
    instruction: str,
    source_digest_block: str,
    source_units: List[dict],
    preferred_language: str,
) -> str:
    """Generate one deep synthesis section at a time.

    v17 asked the model to create the entire cross-source professor synthesis in
    one huge call. When the source pack was large, the model often returned a
    safe but useless scaffold. v18 generates independent, concrete sections and
    then assembles them, which is more stable and much more detailed.
    """
    language_rule = language_instruction_for(preferred_language)
    source_list = "\n".join(
        f"Source {i}: {u.get('title_candidate') or u.get('display_name')}"
        for i, u in enumerate(source_units or [], start=1)
    )
    prompt = f"""
You are writing ONE section of a world-class multi-source study guide.

Language requirement: {language_rule}
Never translate the product name Synapse.

Section to write: {heading}

Sources in this pack:
{source_list}

Your task:
{instruction}

Non-negotiable quality rules:
- Be concrete. Name exact concepts, researchers, studies, cases, formulas, tables, diagrams, images, examples, page/slide cues, and source numbers when available.
- Do not write generic scaffold instructions such as “look for repeated terms”. Actually perform the comparison using the source cards.
- Write like a professor/tutor explaining the material to a student who wants to revise deeply.
- Use markdown tables when they improve clarity.
- Include enough detail that this section is useful on its own.
- For visual material, explain what the image/table/diagram shows, what the student should notice, and how it supports the concept.
- For every cross-source claim, mention which source(s) support it.
- If the source pack is psychology, use research-question → method → result → meaning → exam-use where appropriate. For other subjects, use the equivalent discipline-specific reasoning.

Detailed source cards:
{truncate_text(source_digest_block, int(os.getenv('MULTISOURCE_DIGEST_CONTEXT_CHARS', '220000')))}
"""
    try:
        result = generate_chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ], model=model_for_depth("comprehensive"), temperature=0, max_tokens=MULTISOURCE_SYNTHESIS_PART_TOKENS).strip()
        if result and not is_refusal_or_useless_response(result) and count_readable_units(result) >= int(os.getenv("MULTISOURCE_SECTION_MIN_UNITS", "900")):
            # Remove duplicate heading if the model already wrote it with a different level.
            result = re.sub(r"(?m)^#{1,4}\s*" + re.escape(heading).strip("# ") + r"\s*$", "", result).strip()
            return f"## {heading.strip('# ')}\n\n{result}"
    except Exception:
        pass
    return "".strip()


def generate_multisource_synthesis_from_digests(source_digest_block: str, source_units: List[dict], preferred_language: str, depth_plan: dict) -> str:
    """Generate a deep, all-subject cross-source synthesis from source cards.

    This is intentionally multi-pass. The product requirement is depth, not low
    token usage. Each section is generated separately so the model cannot escape
    with a generic scaffold.
    """
    key = normalise_language_key(preferred_language)
    if key in {"simplified_chinese", "mixed_chinese_english"}:
        sections = [
            ("课程级大图景", "说明这组资料共同在教什么。不要只说主题名称，要解释它们如何从基础机制、理论争论、研究方法、证据、应用或考试要求共同组成一个学习单元。"),
            ("逐项来源之间的共同 idea", "找出至少 5 个真正重复或互相支持的共同 idea。每个 idea 都要解释含义、出现在哪些 source、每个 source 如何处理它、为什么重要。"),
            ("概念群组与知识地图", "把资料整理成 4–7 个 concept clusters。每个 cluster 要包含核心概念、对应来源、内部关系、容易混淆点。"),
            ("研究、案例、实验与证据对照", "用表格和解释整理所有重要研究/案例/实验/计算/法律条文。相关源文件截图必须穿插在对应概念或例子旁边，不要做单独图片区。每项都要写 Question/Method/Result/Meaning/Exam use 或该学科等价结构。"),
            ("图像、幻灯片、表格与 diagram 讲解", "集中解释 source cards 中出现的视觉材料：图片、表格、流程图、坐标图、实验图、slide layout。说明图上有什么、为什么放在这里、学生应该从图中学到什么。"),
            ("差异、张力与争论", "比较来源之间的不同强调：理论 vs 证据、机制 vs 行为、天性 vs 教养、方法差异、层次差异、限制与批判。不要编造冲突，要解释 nuance。"),
            ("如何写出高分答案", "给出可直接用于考试/作业的答题模板。包括定义型、比较型、评价型、应用型、图表解释型问题。每个模板都要说明应该引用哪些 source evidence。"),
            ("深度复习清单与记忆策略", "生成详细复习优先级、易错点、记忆 hook、考前检查问题。必须具体到这组资料的概念和研究。"),
        ]
    elif key == "traditional_chinese":
        sections = [
            ("課程級大圖景", "說明這組資料共同在教什麼。不要只說主題名稱，要解釋它們如何共同組成一個學習單元。"),
            ("逐項來源之間的共同 idea", "找出至少 5 個真正重複或互相支持的共同 idea。每個 idea 都要解釋含義、出現在哪些 source、每個 source 如何處理它、為什麼重要。"),
            ("概念群組與知識地圖", "把資料整理成 4–7 個 concept clusters。每個 cluster 要包含核心概念、對應來源、內部關係、容易混淆點。"),
            ("研究、案例、實驗與證據對照", "用表格和解釋整理所有重要研究/案例/實驗/計算/法律條文/圖像證據。"),
            ("圖像、投影片、表格與 diagram 講解", "集中解釋 source cards 中出現的視覺材料：圖片、表格、流程圖、座標圖、實驗圖、slide layout。"),
            ("差異、張力與爭論", "比較來源之間的不同強調、限制與批判。不要編造衝突，要解釋 nuance。"),
            ("如何寫出高分答案", "給出可直接用於考試/作業的答題模板，並說明應引用哪些 source evidence。"),
            ("深度複習清單與記憶策略", "生成詳細複習優先級、易錯點、記憶 hook、考前檢查問題。"),
        ]
    else:
        sections = [
            ("Course-Level Big Picture", "Explain what this source pack teaches as a whole. Go beyond topic naming: show how the sources combine mechanisms, theories, methods, evidence, applications, visuals, and exam priorities into one learning unit."),
            ("Common Ideas Across Sources", "Identify at least five real shared ideas. For each: define it, name the sources that support it, compare how each source treats it, and explain why it matters."),
            ("Concept Clusters / Knowledge Map", "Organise the materials into 4–7 concept clusters. Each cluster needs core concepts, supporting sources, internal relationships, and likely confusion points."),
            ("Studies, Cases, Experiments, and Evidence Matrix", "Use tables and explanation to organise important studies/cases/experiments/calculations/legal clauses/visual evidence. Use Question/Method/Result/Meaning/Exam use or the equivalent structure for the subject."),
            ("Visual, Slide, Table, and Diagram Explanation", "Explain visual material from the source cards: images, tables, process diagrams, graphs, experimental figures, slide layouts. State what is visible, why it is included, and what the student should learn from it."),
            ("Differences, Tensions, and Debates", "Compare differences in emphasis: theory vs evidence, mechanism vs behaviour, nature vs nurture, methodological differences, levels of analysis, limitations, and critiques. Explain nuance; do not invent conflict."),
            ("How to Write High-Scoring Answers", "Give exam/assignment answer frameworks: define/explain, compare/contrast, evaluate, apply-to-example, and visual/table interpretation. Say which source evidence to use."),
            ("Deep Revision Checklist and Memory Strategy", "Create detailed revision priorities, traps, memory hooks, and pre-exam checking questions specific to this source pack."),
        ]

    generated_sections = []
    for heading, instruction in sections:
        part = generate_multisource_synthesis_section(heading, instruction, source_digest_block, source_units, preferred_language)
        if part:
            generated_sections.append(part)

    result = "\n\n".join(generated_sections).strip()
    if result and count_readable_units(result) >= int(os.getenv("MULTISOURCE_SYNTHESIS_MIN_UNITS", "5200")):
        return result

    # Last resort: do not return a generic scaffold. Preserve concrete cards and add a warning.
    warning = "## Cross-Source Synthesis Notice\n\nThe model could not complete every synthesis section, so Synapse preserved the detailed source cards above. Use them as the primary study notes and regenerate with a stronger model or higher token limits for a fuller cross-source synthesis."
    if key in {"simplified_chinese", "mixed_chinese_english"}:
        warning = "## 跨资源综合提示\n\n模型没有稳定完成每一个综合部分，因此 Synapse 已保留上方逐项资源精讲。请优先使用这些 source cards 复习；如果需要更完整的跨资源综合，请使用更强模型或更高 token 上限重新生成。"
    elif key == "traditional_chinese":
        warning = "## 跨資源綜合提示\n\n模型沒有穩定完成每一個綜合部分，因此 Synapse 已保留上方逐項資源精講。請優先使用這些 source cards 複習；若需要更完整的跨資源綜合，請使用更強模型或更高 token 上限重新生成。"
    return (result + "\n\n" + warning).strip() if result else warning
def is_refusal_or_useless_response(text: str) -> bool:
    value = normalise_space(text or "").lower()
    if not value:
        return True

    refusal_patterns = [
        "i can’t assist", "i can't assist", "i cannot assist", "i’m sorry", "i'm sorry",
        "cannot help with that", "can't help with that", "unable to assist",
        "抱歉，我无法", "抱歉，无法", "我无法协助", "无法协助处理", "不能协助",
        "對不起，我無法", "無法協助", "申し訳ありません", "도와드릴 수 없습니다",
    ]
    if any(pattern in value for pattern in refusal_patterns):
        return True

    # A high-quality study guide should contain multiple required sections.
    required_markers = ["overview", "core", "key", "step", "example", "tutor", "mistake", "critical",
                        "概述", "核心", "关键", "關鍵", "分步", "步驟", "实例", "例子", "教师", "導師", "常见", "常見", "批判"]
    marker_count = sum(1 for marker in required_markers if marker.lower() in value)
    if len(value) < 450 and marker_count < 3:
        return True

    return False
