import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const legacyDir = path.resolve(__dirname, "../src/legacy");
const sharedHtmlPath = path.resolve(__dirname, "../src/shared/lib/html.js");

function loadModuleSource(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .replace(/^import\s+[\s\S]*?;\s*$/gm, "")
    .replace(/\nexport\s+\{[\s\S]*?\};\s*$/g, "")
    .replace(/^export\s+(async\s+)?function\s+/gm, "function ")
    .replace(/^export\s+const\s+/gm, "const ")
    .replace(/^export\s+\{[\s\S]*?\};\s*$/gm, "");
}

const source = [
  loadModuleSource(path.join(legacyDir, "readableMath.js")),
  loadModuleSource(path.join(legacyDir, "mathMarkdownNormalize.js")),
  loadModuleSource(path.join(legacyDir, "mathMarkdown.js")),
  loadModuleSource(sharedHtmlPath),
  loadModuleSource(path.join(legacyDir, "markdownRendererSupport.js")),
  loadModuleSource(path.join(legacyDir, "markdownRenderer.js"))
].join("\n\n");

const makeRenderer = new Function(
  "window",
  "document",
  `
  ${source}
  configureMarkdownRenderer({
    getLearningFigureByMarker: index => index === 0 ? { index: 0, url: "http://127.0.0.1:8001/assets/visuals/result-table.png", title: "Result table" } : null,
    renderInlineVisualCard: index => '<figure data-visual-card="' + index + '"></figure>',
    renderInlineVisualReference: (index, shownIndex) => '<p data-visual-ref="' + index + ':' + shownIndex + '"></p>'
  });
  return { markdownToHTML };
  `
);

const documentStub = {
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => ({ dataset: {}, addEventListener() {} }),
  head: { appendChild() {} }
};

const { markdownToHTML } = makeRenderer(
  { addEventListener() {}, SYNAPSE_DESMOS_API_KEY: "" },
  documentStub
);

const html = markdownToHTML([
  "The source table gives the evidence.",
  "",
  "[[VISUAL:0]]",
  "",
  "The same table matters again.",
  "",
  "[[VISUAL:0]]"
].join("\n"));

assert.equal((html.match(/data-visual-card=/g) || []).length, 1);
assert.equal((html.match(/data-visual-ref=/g) || []).length, 1);
assert.ok(!html.includes("[[VISUAL:0]]"));

const inlineHtml = markdownToHTML("Read the source table before [[VISUAL:0]] then interpret the pattern.");
assert.equal((inlineHtml.match(/data-visual-card=/g) || []).length, 1);
assert.ok(!inlineHtml.includes("[[VISUAL:0]]"));
assert.ok(inlineHtml.includes("Read the source table"));
assert.ok(inlineHtml.includes("then interpret the pattern"));

console.log("visual marker regression passed");
