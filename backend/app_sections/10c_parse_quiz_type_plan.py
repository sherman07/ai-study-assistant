

def visual_image_prefers_chinese(preferred_language: str, blueprint: dict) -> bool:
    raw_language = str(preferred_language or "").strip().lower().replace("-", "_").replace(" ", "_")
    language = normalise_language_key(preferred_language)
    if language in {"simplified_chinese", "traditional_chinese", "mixed_chinese_english"} or raw_language in {
        "zh",
        "zh_cn",
        "zh_hans",
        "chinese",
        "中文",
        "简体",
        "简体中文",
        "繁體",
        "繁體中文",
    }:
        return True
    if raw_language and raw_language not in {"auto", "multi", "multilingual", "multi_language", "multi_language"}:
        return False
    sample = " ".join([
        str(blueprint.get("title") or ""),
        str(blueprint.get("subtitle") or ""),
        " ".join(str((panel or {}).get("title") or "") for panel in (blueprint.get("panels") or []) if isinstance(panel, dict)),
    ])
    return visual_image_contains_cjk(sample)


def visual_image_font(size: int, bold: bool = False):
    from PIL import ImageFont

    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc" if bold else "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc" if bold else "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ]
    for candidate in candidates:
        if not candidate:
            continue
        try:
            path = Path(candidate)
            if path.exists():
                return ImageFont.truetype(str(path), size=size)
        except Exception:
            continue
    return ImageFont.load_default()


def visual_image_text_size(draw, text: str, font) -> Tuple[int, int]:
    bbox = draw.textbbox((0, 0), str(text or ""), font=font)
    return max(0, bbox[2] - bbox[0]), max(0, bbox[3] - bbox[1])


def visual_image_fit_text(draw, text: str, max_width: int, start_size: int, min_size: int = 18, bold: bool = False):
    text = normalise_space(str(text or ""))
    size = start_size
    font = visual_image_font(size, bold=bold)
    while size > min_size and visual_image_text_size(draw, text, font)[0] > max_width:
        size -= 2
        font = visual_image_font(size, bold=bold)
    return font


def visual_image_wrap_text(draw, text: str, font, max_width: int, max_lines: int = 3) -> List[str]:
    text = normalise_space(str(text or ""))
    if not text or max_width <= 0 or max_lines <= 0:
        return []
    if visual_image_contains_cjk(text):
        tokens = list(text)
        separator = ""
    else:
        tokens = text.split()
        separator = " "
    lines: List[str] = []
    current = ""
    for token in tokens:
        candidate = f"{current}{separator if current and separator else ''}{token}"
        if not current or visual_image_text_size(draw, candidate, font)[0] <= max_width:
            current = candidate
            continue
        lines.append(current)
        current = token
        if len(lines) >= max_lines:
            break
    if current and len(lines) < max_lines:
        lines.append(current)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
    if lines and len(lines) == max_lines:
        while lines[-1] and visual_image_text_size(draw, f"{lines[-1]}...", font)[0] > max_width:
            lines[-1] = lines[-1][:-1].rstrip()
        if lines[-1] and lines[-1] != text:
            lines[-1] = f"{lines[-1]}..."
    return lines


def visual_image_draw_wrapped(draw, xy: Tuple[int, int], text: str, font, fill: str, max_width: int, max_lines: int = 3, line_gap: int = 8) -> int:
    x, y = xy
    lines = visual_image_wrap_text(draw, text, font, max_width, max_lines=max_lines)
    line_height = visual_image_text_size(draw, "Ag", font)[1] + line_gap
    for index, line in enumerate(lines):
        draw.text((x, y + index * line_height), line, font=font, fill=fill)
    return y + len(lines) * line_height


def visual_image_draw_arrow(draw, start: Tuple[int, int], end: Tuple[int, int], fill: str = "#294563", width: int = 4) -> None:
    draw.line([start, end], fill=fill, width=width)
    x1, y1 = start
    x2, y2 = end
    dx = x2 - x1
    dy = y2 - y1
    length = max(1, (dx * dx + dy * dy) ** 0.5)
    ux = dx / length
    uy = dy / length
    size = 13 + width
    left = (x2 - ux * size - uy * size * 0.55, y2 - uy * size + ux * size * 0.55)
    right = (x2 - ux * size + uy * size * 0.55, y2 - uy * size - ux * size * 0.55)
    draw.polygon([end, left, right], fill=fill)


def visual_image_draw_icon(draw, box: Tuple[int, int, int, int], kind: str, accent: str) -> None:
    x1, y1, x2, y2 = box
    w = x2 - x1
    h = y2 - y1
    cx = x1 + w // 2
    cy = y1 + h // 2
    navy = "#12213a"
    soft = "#f4f8fb"
    kind = (kind or "").lower()
    if any(term in kind for term in ("loanable", "foreign-exchange", "fx", "exchange rate", "supply curve", "demand curve", "interest rate")):
        draw.line((x1 + 18, y2 - 18, x2 - 14, y2 - 18), fill=navy, width=3)
        draw.line((x1 + 18, y2 - 18, x1 + 18, y1 + 16), fill=navy, width=3)
        if "fx" in kind or "exchange" in kind:
            sx = x1 + 52
            draw.line((sx, y2 - 22, sx, y1 + 22), fill=accent, width=5)
            draw.arc((x1 + 38, y1 + 34, x2 - 20, y2 - 22), start=195, end=342, fill="#7f9bb5", width=4)
        else:
            draw.line((x1 + 28, y2 - 30, x2 - 20, y1 + 28), fill=accent, width=5)
            draw.line((x1 + 28, y1 + 32, x2 - 20, y2 - 30), fill="#7f9bb5", width=5)
        visual_image_draw_arrow(draw, (x1 + 52, cy), (x2 - 28, cy - 18), fill=accent, width=3)
    elif any(term in kind for term in ("nco", "capital flow", "net exports", "trade balance", "saving", "investment")):
        draw.rounded_rectangle((x1 + 18, y1 + 20, x2 - 18, y2 - 20), radius=14, fill=soft, outline=navy, width=3)
        draw.line((cx, y1 + 24, cx, y2 - 24), fill="#b7c6d5", width=3)
        visual_image_draw_arrow(draw, (x1 + 34, cy - 18), (x2 - 34, cy - 18), fill=accent, width=5)
        visual_image_draw_arrow(draw, (x2 - 34, cy + 20), (x1 + 34, cy + 20), fill="#7f9bb5", width=5)
    elif "formula" in kind or "=" in kind or "identity" in kind:
        draw.rounded_rectangle((x1 + 16, y1 + 24, x2 - 16, y2 - 24), radius=16, fill=soft, outline=navy, width=3)
        for idx, y in enumerate((cy - 22, cy + 2, cy + 26)):
            draw.line((x1 + 32, y, x2 - 32, y), fill=accent if idx == 1 else "#9fb2c5", width=4)
    elif "chart" in kind or "evaluation" in kind or "accuracy" in kind:
        for idx, height in enumerate((34, 52, 42, 65)):
            bx = x1 + 14 + idx * 26
            draw.rounded_rectangle((bx, y2 - 14 - height, bx + 16, y2 - 14), radius=4, fill=accent)
        draw.line((x1 + 10, y2 - 14, x2 - 10, y2 - 14), fill=navy, width=3)
    elif "network" in kind or "model" in kind or "neural" in kind:
        points = [(x1 + 20, cy), (cx, y1 + 20), (cx, y2 - 20), (x2 - 20, cy)]
        for p1 in points[:3]:
            draw.line((p1, points[-1]), fill="#87a3bc", width=3)
        for point in points:
            draw.ellipse((point[0] - 10, point[1] - 10, point[0] + 10, point[1] + 10), fill=soft, outline=accent, width=4)
    elif "venn" in kind or "union" in kind or "intersection" in kind:
        draw.ellipse((x1 + 18, y1 + 16, cx + 14, y2 - 14), fill="#bde8ef", outline=navy, width=3)
        draw.ellipse((cx - 14, y1 + 16, x2 - 18, y2 - 14), fill="#d9ecc7", outline=navy, width=3)
    elif "warning" in kind or "risk" in kind or "ethic" in kind or "limit" in kind:
        draw.polygon([(cx, y1 + 14), (x2 - 18, y2 - 16), (x1 + 18, y2 - 16)], fill="#fee7a9", outline=navy)
        draw.line((cx, cy - 12, cx, cy + 16), fill=navy, width=5)
        draw.ellipse((cx - 3, cy + 24, cx + 3, cy + 30), fill=navy)
    elif "data" in kind or "table" in kind:
        draw.rounded_rectangle((x1 + 14, y1 + 16, x2 - 14, y2 - 16), radius=12, fill=soft, outline=navy, width=3)
        for row in range(3):
            y = y1 + 30 + row * 22
            draw.line((x1 + 22, y, x2 - 22, y), fill="#b7c6d5", width=2)
        for col in range(3):
            x = x1 + 34 + col * 34
            draw.rounded_rectangle((x, y1 + 42, x + 18, y1 + 58), radius=4, fill=accent)
    else:
        draw.rounded_rectangle((x1 + 20, y1 + 18, x2 - 20, y2 - 18), radius=16, fill=soft, outline=navy, width=3)
        draw.arc((x1 + 38, y1 + 32, x2 - 38, y2 - 32), start=25, end=325, fill=accent, width=6)
        visual_image_draw_arrow(draw, (cx - 30, cy + 16), (cx + 30, cy - 16), fill=accent, width=4)


def visual_image_draw_panel(draw, box: Tuple[int, int, int, int], title: str, detail: str, visual: str, accent: str) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=18, fill="#ffffff", outline="#cad7e6", width=2)
    draw.rounded_rectangle((x1, y1, x2, y1 + 48), radius=18, fill=accent)
    draw.rectangle((x1, y1 + 30, x2, y1 + 48), fill=accent)
    title_font = visual_image_fit_text(draw, title, x2 - x1 - 34, 24, min_size=16, bold=True)
    draw.text((x1 + 16, y1 + 12), title, font=title_font, fill="#ffffff")
    icon_box = (x1 + 14, y1 + 65, x1 + 126, y1 + 158)
    visual_image_draw_icon(draw, icon_box, f"{title} {visual}", accent)
    body_font = visual_image_font(18)
    body = detail or visual or title
    visual_image_draw_wrapped(draw, (x1 + 140, y1 + 68), body, body_font, "#31425a", x2 - x1 - 156, max_lines=3, line_gap=6)


def visual_image_is_open_economy_blueprint(blueprint: dict) -> bool:
    return bool(VISUAL_IMAGE_OPEN_ECONOMY_RE.search(visual_image_blueprint_domain_text(blueprint)))


def visual_image_open_economy_copy(preferred_language: str, blueprint: dict) -> dict:
    chinese = visual_image_prefers_chinese(preferred_language, blueprint)
    if chinese:
        return {
            "title": "可贷资金市场、储蓄与开放经济分析",
            "subtitle": "储蓄、投资、资本流动与汇率如何连成一个考试模型",
            "concepts": "可贷资金市场与储蓄",
            "case": "政府预算与公共储蓄",
            "trade": "开放经济与资本流动",
            "model": "投资税收抵免的三面板分析",
            "case_analysis": "典型案例分析",
            "exchange": "实际汇率与名义汇率换算",
            "definition": "定义",
            "national_saving": "国民储蓄 (S)",
            "private_saving": "私人储蓄",
            "public_saving": "公共储蓄",
            "capital_flow": "净资本流出 (NCO)",
            "income": "收入",
            "consumption": "消费",
            "investment": "投资",
            "government": "政府",
            "budget_deficit": "预算赤字",
            "capital_flight": "资本外逃",
            "loanable": "可贷资金市场",
            "fx": "外汇市场",
            "rer": "实际汇率",
            "nx": "净出口 (NX)",
            "exam_chain": "考试链条",
            "mistake": "常见错误",
            "revision": "复习任务",
            "trade_goods": "商品与服务贸易",
            "finance_trade": "金融交易",
            "imports": "进口",
            "exports": "出口",
            "asset_purchase": "资产购买",
            "supply": "供给",
            "demand": "需求",
            "real_interest": "实际利率",
            "quantity": "数量",
            "currency": "本币升值",
            "policy_note": "按 S → r → NCO → e → NX 写完整因果链。",
            "trap_note": "S、I、NCO、NX 含义不同，不能混用。",
            "review_note": "画三图 · 写公式 · 解释曲线移动",
        }
    return {
        "title": blueprint.get("title") or "Open-Economy Macroeconomics Overview",
        "subtitle": "How saving, investment, capital flows, and exchange rates connect in one exam model",
        "concepts": "1. Key Concepts and Formulas",
        "case": "2. Policy Cases and Saving",
        "trade": "3. Capital Flows and FX Market",
        "model": "4. Linked Market Model and Policy Analysis",
        "definition": "Definition",
        "national_saving": "National saving (S)",
        "private_saving": "Private saving",
        "public_saving": "Public saving",
        "capital_flow": "Net capital outflow (NCO)",
        "income": "Income",
        "consumption": "Consumption",
        "investment": "Investment",
        "government": "Government",
        "budget_deficit": "Budget deficit",
        "capital_flight": "Capital flight",
        "loanable": "Loanable funds",
        "fx": "FX market",
        "rer": "Real exchange rate",
        "nx": "Net exports (NX)",
        "exam_chain": "Exam chain",
        "mistake": "Common mistake",
        "revision": "Revision task",
        "trade_goods": "Goods and services trade",
        "finance_trade": "Financial transactions",
        "imports": "Imports",
        "exports": "Exports",
        "asset_purchase": "Asset purchases",
        "supply": "Supply",
        "demand": "Demand",
        "real_interest": "Real interest rate",
        "quantity": "Quantity",
        "currency": "Currency appreciation",
        "policy_note": "Explain the full S → r → NCO → e → NX causal chain.",
        "trap_note": "S, I, NCO, and NX are connected but not the same variable.",
        "review_note": "Draw three graphs · write identities · explain shifts",
    }
