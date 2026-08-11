import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Notes goldens for Tuesday QA: combined visual markers + hostile HTML/script payloads.
 * Behavioral markdown rendering only (pure unit / contract strength).
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readableMathPath = path.resolve(__dirname, "../src/legacy/readableMath.js");
const mathMarkdownPath = path.resolve(__dirname, "../src/legacy/mathMarkdown.js");
const rendererPath = path.resolve(__dirname, "../src/legacy/markdownRenderer.js");
const visualModalPath = path.resolve(__dirname, "../src/legacy/controller_sections/02_openvisualmodal.js");

const readableMathSource = fs
  .readFileSync(readableMathPath, "utf8")
  .replace(/\nexport\s+\{[\s\S]*?\};\s*$/, "");
const mathMarkdownSource = fs
  .readFileSync(mathMarkdownPath, "utf8")
  .replace(/^import\s+\{[\s\S]*?\}\s+from\s+\"\.\/readableMath\.js(?:\?[^"]*)?\";\s*/, "")
  .replace(/\nexport\s+\{[\s\S]*?\};\s*$/, "");
const rendererSource = fs
  .readFileSync(rendererPath, "utf8")
  .replace(/^import\s+\{[\s\S]*?\}\s+from\s+\"\.\/readableMath\.js(?:\?[^"]*)?\";\s*/, "")
  .replace(/^import\s+\{[\s\S]*?\}\s+from\s+\"\.\/mathMarkdown\.js(?:\?[^"]*)?\";\s*/, "")
  .replace(/\nexport\s+\{[\s\S]*?\};\s*$/, "");
const source = `${readableMathSource}\n\n${mathMarkdownSource}\n\n${rendererSource}`;

const makeRenderer = new Function(
  "window",
  "document",
  `
  ${source}
  const figureMap = new Map([
    [0, { index: 0, url: "http://127.0.0.1:8001/assets/visuals/table.png", title: "Result table" }],
    [2, { index: 2, url: "http://127.0.0.1:8001/assets/visuals/chart.png", title: "Trend chart" }],
  ]);
  configureMarkdownRenderer({
    getLearningFigureByMarker: index => figureMap.get(Number(index)) || null,
    renderInlineVisualCard: index => {
      const item = figureMap.get(Number(index));
      return '<figure data-visual-card="' + index + '" data-url="' + (item?.url || "") + '"></figure>';
    },
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

const { markdownToHTML } = makeRenderer({ addEventListener() {}, SYNAPSE_DESMOS_API_KEY: "" }, documentStub);

const combined = markdownToHTML([
  "Compare the table and the chart.",
  "",
  "[[VISUAL:0]]",
  "",
  "Then inspect the trend.",
  "",
  "[[VISUAL:2]]"
].join("\n"));

assert.equal((combined.match(/data-visual-card="0"/g) || []).length, 1, "VISUAL:0 card should render once");
assert.equal((combined.match(/data-visual-card="2"/g) || []).length, 1, "VISUAL:2 card should render once");
assert.ok(combined.includes('data-url="http://127.0.0.1:8001/assets/visuals/table.png"'));
assert.ok(combined.includes('data-url="http://127.0.0.1:8001/assets/visuals/chart.png"'));
assert.ok(!combined.includes("[[VISUAL:0]]"));
assert.ok(!combined.includes("[[VISUAL:2]]"));

const hostile = markdownToHTML([
  'Ignore <script>alert("xss")</script> and <img src=x onerror=alert(1)>.',
  "",
  "**Keep Synapse branding** even when notes include <b>raw</b> HTML."
].join("\n"));

assert.ok(!hostile.includes("<script>"), "raw script tags must not survive markdown rendering");
assert.ok(hostile.includes("&lt;script&gt;"), "script markup must be HTML-escaped");
assert.ok(hostile.includes("&lt;img"), "img markup must be HTML-escaped");
assert.ok(
  !/<img\b[^>]*onerror=/i.test(hostile),
  "escaped notes must not contain an executable img onerror attribute"
);
assert.ok(hostile.includes("Synapse"), "Synapse brand spelling must remain unchanged");
assert.ok(hostile.includes("<strong>") || hostile.includes("<b>"), "markdown emphasis should still render");

const visualModalSource = fs.readFileSync(visualModalPath, "utf8");
assert.match(visualModalSource, /addEventListener\("keydown", onKeyDown, true\)/, "visual modal must listen for Escape in capture phase");
assert.match(visualModalSource, /event\.key !== "Escape"/, "visual modal Escape handler must be present");
assert.match(visualModalSource, /role="dialog"/, "visual modal should expose a dialog role");

console.log("notes visual xss golden regression passed");
