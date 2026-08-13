import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = readLegacyControllerSections("09_togglesourceviewer.js");

assert.ok(
  source.includes("SOURCE_PREVIEW_TIMEOUT_MS"),
  "source preview should have a bounded request timeout"
);
assert.ok(
  source.includes("timeoutMs: SOURCE_PREVIEW_TIMEOUT_MS"),
  "source preview fetch should pass the timeout to the API client"
);
assert.ok(
  source.includes("readSourcePreviewJson"),
  "source preview should parse JSON through a guarded helper"
);
assert.ok(
  source.includes("Source preview returned"),
  "source preview should explain non-JSON backend responses"
);
assert.ok(
  source.includes("scheduleSourcePreviewPrefetch"),
  "source previews should be prepared in the background before the user opens a file"
);
assert.ok(
  source.includes("processSourcePreviewPrefetchQueue"),
  "background source preview conversion should run through a queue"
);
assert.ok(
  source.includes("sourcePreviewInflight"),
  "open + prefetch should share one in-flight /source-preview request"
);

const transcript = readLegacyControllerSections("08_extractrealtimeresponsetranscript.js");
assert.ok(
  transcript.includes("scheduleSourcePreviewPrefetch(sourceViewerItems)"),
  "building or restoring source items should kick off background preview prep"
);
assert.ok(
  transcript.includes('classList.toggle("source-viewer-open"'),
  "open sources should mark the app layout for shared panel leveling"
);

console.log("source preview timeout regression passed");
