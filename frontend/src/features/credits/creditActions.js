/** Map note-length / tool ids to billing credit action ids. */

export function creditActionForNoteLength(noteLength) {
  const value = String(noteLength || "").toLowerCase();
  if (value.includes("deep")) return "deep_study";
  if (value.includes("document") || value.includes("long")) return "document_analysis";
  return "standard_notes";
}

export function creditActionForTool(tool) {
  const value = String(tool || "").toLowerCase();
  if (value === "quiz" || value === "practice" || value === "flashcards") return "practice_generation";
  if (value === "timeline") return "practice_generation";
  if (value === "visual" || value === "visual_guide" || value === "mind_map") return "visual_generation";
  if (value === "broadcast" || value === "voice") return "voice_session";
  if (value === "tutor" || value === "companion") return "tutor_question";
  if (value === "deep_study") return "deep_study";
  if (value === "document_analysis") return "document_analysis";
  return "standard_notes";
}

export function formatCreditNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString();
}
