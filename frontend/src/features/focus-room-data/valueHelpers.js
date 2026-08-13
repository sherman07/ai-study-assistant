/** Shared Focus Room value helpers. */

export function stripHTML(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

export function compactString(value) {
  return String(value || "").trim();
}

export function clippedText(value, limit = 420) {
  const text = stripHTML(value);
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

export function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
