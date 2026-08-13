/**
 * Study tool launch HTML — same markup/classes as the legacy controller helper.
 * Returns an HTML string so existing `panel.innerHTML = renderStudyToolLaunch(...)` callers stay unchanged.
 */
import { escapeAttr, escapeHTML } from "../../shared/lib/html.js";

const DEFAULT_POINTS = {
  flashcards: ["Atomic prompts from the current notes", "Reveal, then grade Again / Hard / Good / Easy", "Match mode for quick recognition drills"],
  quiz: ["Exam-style and practice question mixes", "Save history against this note", "Review explanations after each attempt"],
  timeline: ["Warm-up → learn → practise → check", "Mark tasks complete as you go", "Pace settings for quick or deep revision"],
  masterygraph: ["Due and missed review queues", "Weak-topic map from your activity", "Self-grade what still feels shaky"],
  visualguide: ["One finished revision poster", "Grounded in the current notes", "Export as PNG when ready"],
  broadcast: ["Natural spoken episode from these notes", "Chapter markers while you listen", "Jump into quiz or flashcards after"]
};

export function renderStudyToolLaunch({
  tool,
  iconClass,
  title,
  description,
  action,
  actionLabel,
  hasNotes = true,
  kicker = "Ready when you are",
  points = [],
  estimate = "",
  secondaryHint = ""
} = {}) {
  const disabled = hasNotes ? "" : "disabled";
  const helper = hasNotes
    ? (estimate ? `No tokens used for this first generation · ${estimate}` : "No tokens used for this first generation")
    : "Generate your study notes first to unlock this tool";
  const bullets = (Array.isArray(points) && points.length ? points : DEFAULT_POINTS[tool] || [])
    .slice(0, 4)
    .map(item => `<li>${escapeHTML(item)}</li>`)
    .join("");
  return `
    <div class="study-tool-launch study-tool-launch--v2" data-study-tool-launch="${escapeAttr(tool)}" data-generation-cost="0">
      <div class="study-tool-launch-icon" aria-hidden="true"><i class="bi ${escapeAttr(iconClass)}"></i></div>
      <div class="study-tool-launch-copy">
        <span class="study-tool-launch-kicker">${escapeHTML(kicker)}</span>
        <h4>${escapeHTML(title)}</h4>
        <p>${escapeHTML(description)}</p>
        ${bullets ? `<ul class="study-tool-launch-points">${bullets}</ul>` : ""}
        ${secondaryHint ? `<p class="study-tool-launch-hint">${escapeHTML(secondaryHint)}</p>` : ""}
      </div>
      <div class="study-tool-launch-meta"><i class="bi bi-lightning-charge-fill" aria-hidden="true"></i>${escapeHTML(helper)}</div>
      <button class="btn btn-primary study-tool-generate-btn" type="button" data-study-tool-generate="${escapeAttr(tool)}" data-token-cost="0" onclick="${escapeAttr(action)}" ${disabled}>
        <i class="bi bi-stars me-2" aria-hidden="true"></i>${escapeHTML(actionLabel)}
      </button>
    </div>
  `;
}

export default renderStudyToolLaunch;
