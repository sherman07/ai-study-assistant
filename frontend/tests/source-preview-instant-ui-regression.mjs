import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const sourceViewer = read("frontend/src/legacy/controller_sections/09_togglesourceviewer.js");
const panel = read("frontend/src/react/components/SourceViewerPanel.js");
const transcript = read("frontend/src/legacy/controller_sections/08_extractrealtimeresponsetranscript.js");
const boot = read("frontend/src/legacy/controller_sections/99_boot.js");
const css = read("frontend/styles/02-section.css");
const index = read("frontend/index.html");

assert.ok(sourceViewer.includes("canUseNativePdfPreview"), "PDF blobs should use a native local preview");
assert.ok(sourceViewer.includes("renderNativePdfPreview"), "native PDF renderer should exist");
assert.ok(sourceViewer.includes('["presentation", "document"]'), "backend preview should no longer gate PDFs");
assert.ok(sourceViewer.includes("ensureSourcePreviewWarmup"), "non-PDF previews should warm the hosted service");
assert.ok(sourceViewer.includes("attempts: 3"), "source preview fetch should retry");
assert.ok(sourceViewer.includes("bindSourceViewerShortcuts"), "source viewer should support keyboard shortcuts");
assert.ok(sourceViewer.includes('key === "["') || sourceViewer.includes('key === "["'), "shortcuts should switch sources");
assert.ok(sourceViewer.includes('lower === "s"'), "S should toggle sources");
assert.ok(sourceViewer.includes("openActiveSourceExternally"), "O should open the active source");

assert.ok(panel.includes("source-viewer-chrome"), "source chrome should be a single compact strip");
assert.ok(!panel.includes("Open a source beside your notes."), "bulky toolbar copy should be removed");
assert.ok(panel.includes("sourceOpenExternalBtn"), "compact open-external control should exist");

assert.ok(css.includes("source-viewer-chrome"), "compact chrome styles should exist");
assert.ok(css.includes("source-native-pdf-stage"), "native PDF stage styles should exist");
assert.ok(css.includes("source-viewer-toolbar {\n  display: none") || css.includes("display: none !important"), "legacy toolbar should be hidden");

assert.ok(transcript.includes("ensureSourcePreviewWarmup"), "building sources should warm the preview service");
assert.ok(boot.includes("bindSourceViewerShortcuts"), "boot should bind source shortcuts");
assert.ok(boot.includes("openActiveSourceExternally"), "boot should expose open-external helper");
assert.ok(boot.includes("retryActiveSourcePreview"), "boot should expose retry helper");

assert.ok(index.includes("style.css?v=source-preview-instant-v1"), "styles should cache-bust");
assert.ok(index.includes("synapse-legacy-controller-combined.js?v=source-preview-instant-v1"), "controller should cache-bust");

console.log("source-preview-instant-ui-regression: passed");
