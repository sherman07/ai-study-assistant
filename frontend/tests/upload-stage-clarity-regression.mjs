import assert from "node:assert/strict";
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

console.log("upload stage clarity regression passed");
