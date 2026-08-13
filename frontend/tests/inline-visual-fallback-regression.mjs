import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectionSource = readLegacyControllerSections("02_openvisualmodal.js");

const makeVisualRenderer = new Function(
  "window",
  `
  function getLearningFigureByMarker(index) {
    if (Number(index) === 2) {
      return { index: 2, title: "Filtered results table" };
    }
    return null;
  }
  function cleanSourceFigureDisplayText(value) { return String(value || "").trim(); }
  function getVisualDetailText() { return ""; }
  function renderVisualExplanationSections() { return ""; }
  function escapeHTML(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
  function escapeAttr(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "\\\\'");
  }
  function shorten(value, limit) {
    const text = String(value || "");
    return text.length > limit ? text.slice(0, limit) + "..." : text;
  }
  const document = {
    createElement: () => ({ className: "", innerHTML: "", addEventListener() {} }),
    body: { appendChild() {} },
    getElementById: () => null
  };
  ${sectionSource}
  return { renderInlineVisualCard };
  `
);

const { renderInlineVisualCard } = makeVisualRenderer({});

const missingUrlHtml = renderInlineVisualCard(2);
assert.ok(missingUrlHtml.includes("inline-visual-card missing"));
assert.ok(missingUrlHtml.includes('id="inline-visual-2"'));
assert.ok(missingUrlHtml.includes("Filtered results table"));
assert.ok(missingUrlHtml.includes("Figure unavailable"));
assert.ok(!missingUrlHtml.includes("<img"));
assert.ok(missingUrlHtml.includes("This image could not be extracted from the uploaded source"));

const missingItemHtml = renderInlineVisualCard(4);
assert.ok(missingItemHtml.includes("Figure unavailable"));
assert.ok(missingItemHtml.includes("Regenerate notes or view the original PDF"));

console.log("inline visual fallback regression passed");
