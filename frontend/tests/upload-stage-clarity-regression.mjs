import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

globalThis.React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { UploadStage } = await import(pathToFileURL(path.join(root, "frontend/src/react/components/UploadStage.js")));
const html = renderToStaticMarkup(React.createElement(UploadStage));

assert.match(html, /<header class="upload-page-header">/);
assert.match(html, /<div class="upload-page-copy"><h1>Add study materials<\/h1>/);
assert.ok(html.includes("Upload files, add links, or paste notes. Synapse will turn them into a connected study workspace."));
assert.ok(html.includes("Drop files here"));
assert.ok(html.includes("Select files"));

for (const retired of ["AI Academic Tutor", "Study Smarter", "Start with AI tutor", "Confirm"]) {
  assert.equal(html.includes(retired), false, `${retired} should not compete with upload`);
}
assert.equal(html.includes('aria-label="Upload steps"'), false, "decorative upload steps should be removed");
assert.equal(/[—–]/.test(html), false, "visible upload copy should use plain punctuation");

for (const contract of [
  'id="dropZone"',
  'id="assetUpload"',
  'id="uploadStatus"',
  'id="filePreview"',
  'id="linkInput"',
  'id="sourceInput"',
  'id="preferredLanguage"',
  'id="promptMode"',
  'id="noteLength"',
  'id="generateBtn"',
  'role="status"',
  'aria-live="polite"',
]) assert.ok(html.includes(contract), `missing rendered contract: ${contract}`);

const css = fs.readFileSync(path.join(root, "frontend/styles/01-section.css"), "utf8");

for (const selector of [
  ".upload-page-header",
  ".upload-page-copy h1",
  ".upload-source-workspace",
  ".upload-source-section",
  ".drop-zone:focus-visible",
  "@media (max-width: 850px)",
]) assert.ok(css.includes(selector), `missing upload style: ${selector}`);

assert.ok(css.includes("min-height: 220px"), "desktop drop zone should be compact");
assert.equal(css.includes(".upload-guidance {"), false, "retired step styling should be removed");
assert.match(
  css,
  /@media \(max-width: 850px\)[\s\S]*?\.upload-stage\s*\{[\s\S]*?gap: 16px;/,
  "upload workspace should tighten into the mobile layout"
);
assert.match(
  css,
  /\.history-empty-state\s*\{[\s\S]*?align-self: start;[\s\S]*?align-content: start;/,
  "the empty history action should keep its intrinsic height"
);

console.log("upload stage clarity regression passed");
