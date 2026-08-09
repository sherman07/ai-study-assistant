@app.post("/flashcards/generate")
async def generate_flashcards(data: dict):
    try:
        data = data or {}
        title = clean_quiz_string(data.get("title"), "Study Flashcards")
        preferred_language = normalise_quiz_language(data.get("preferred_language", "english"))
        context = quiz_summary_context(data)
        if not context:
            return analysis_error_response("No generated notes are available for flashcard generation yet.", 400)
        require_text_ai()

        count_mode, card_count = resolve_flashcard_count(data, context)
        language_rule = quiz_language_instruction(preferred_language)
        schema = """
Return JSON only with this exact shape. Keep JSON keys in English. Every user-facing value must follow the language requirement:
{
  "title": "short deck title",
  "cards": [
    {
      "front": "compact recall prompt, term, contrast, or question; 12 words or fewer",
      "back": "concise answer branch grounded in the notes; one short sentence",
      "hint": "small clue before revealing the answer",
      "source_reference": "nearby concept, example, source figure, or evidence",
      "difficulty": "easy | medium | hard",
      "tags": ["concept", "evidence"]
    }
  ]
}
"""
        prompt = f"""
Create a high-quality flashcard deck from the generated notes below.

Language requirement: {language_rule}
Deck title/topic: {title}
Card count mode: {count_mode}
Return exactly {card_count} cards.

Card-writing rules:
- Do not copy long paragraphs. Make each front side compact enough for active recall.
- Make each back side a short answer branch for a matching activity, ideally 10-18 words and never a paragraph.
- Do not end answers with ellipses or visibly incomplete trailing fragments.
- Cover definitions, contrasts, mechanisms, processes, examples, important studies/data, source images/figures, formulas, and common confusions when present.
- Prefer source-grounded cards over generic textbook cards.
- Do not make cards whose answer is only a page number or slide number.
- Include useful bilingual academic terms when the language requirement asks for mixed or multi-language output.
- Keep the deck varied: not every card should be a definition.

{schema}

Generated notes context:
{context}
"""
        raw = generate_chat(
            [
                {"role": "system", "content": "You generate concise, source-grounded flashcards as strict JSON. Never include markdown fences or prose outside JSON."},
                {"role": "user", "content": prompt},
            ],
            model=model_for_depth("detailed"),
            temperature=0,
            max_tokens=env_int("FLASHCARD_GENERATION_TOKENS", 8500),
        )
        parsed = extract_json_object(raw)
        cards = normalise_flashcard_cards(parsed or {}, title, context, card_count)
        return {
            "title": clean_quiz_string(parsed.get("title") if isinstance(parsed, dict) else "", f"{title} Flashcards"),
            "preferred_language": preferred_language,
            "count_mode": count_mode,
            "total_cards": len(cards),
            "cards": cards,
        }
    except Exception as error:
        return analysis_error_response(str(error), analysis_exception_status(error))
