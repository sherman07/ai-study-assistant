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
const copyScript = read("scripts/copy_frontend_runtime_assets.mjs");

assert.ok(sourceViewer.includes("canUseNativePdfPreview"), "PDF blobs should use a local page preview");
assert.ok(sourceViewer.includes("renderNativePdfPreview"), "native PDF renderer should exist");
assert.ok(sourceViewer.includes("isStaleSourcePdfRender"), "PDF render should cancel only when the stage is replaced");
assert.ok(sourceViewer.includes("arrayBuffer"), "PDF bytes should load via blob.arrayBuffer for exact pages");
assert.ok(sourceViewer.includes("ensurePdfJsLib"), "PDF pages should render through local PDF.js");
assert.ok(sourceViewer.includes("source-pdf-page-canvas"), "PDF pages should render to canvas, not the browser PDF chrome");
assert.ok(!sourceViewer.includes("toolbar=0"), "browser PDF iframe hash hacks should be removed");
assert.ok(!sourceViewer.includes("source-native-pdf-frame"), "browser PDF iframe should be removed");
assert.ok(sourceViewer.includes("is-native-pdf"), "PDF review mode should mark the panel");
assert.ok(sourceViewer.includes("resetSourceZoom"), "fit-width reset should exist");
assert.ok(sourceViewer.includes("applySourceZoomStyles"), "zoom should update pages without full remount when possible");
assert.ok(sourceViewer.includes('["presentation", "document"]'), "backend preview should no longer gate PDFs");
assert.ok(sourceViewer.includes("ensureSourcePreviewWarmup"), "non-PDF previews should warm the hosted service");
assert.ok(sourceViewer.includes("attempts: 3"), "source preview fetch should retry");
assert.ok(sourceViewer.includes("bindSourceViewerShortcuts"), "source viewer should support keyboard shortcuts");
assert.ok(sourceViewer.includes('key === "["') || sourceViewer.includes('key === "["'), "shortcuts should switch sources");
assert.ok(sourceViewer.includes('lower === "s"'), "S should toggle sources");
assert.ok(sourceViewer.includes('lower === "f"'), "F should fit page width");
assert.ok(sourceViewer.includes("openActiveSourceExternally"), "O should open the active source");

assert.ok(panel.includes("source-viewer-chrome"), "source chrome should be a single compact strip");
assert.ok(!panel.includes("Open a source beside your notes."), "bulky toolbar copy should be removed");
assert.ok(panel.includes("sourceOpenExternalBtn"), "compact open-external control should exist");
assert.ok(panel.includes("sourceFitWidthBtn"), "fit-width control should exist");
assert.ok(panel.includes("changeSourceZoom"), "Synapse zoom controls should remain");

assert.ok(css.includes("source-viewer-chrome"), "compact chrome styles should exist");
assert.ok(css.includes("source-pdf-page-renderer"), "PDF page renderer styles should exist");
assert.ok(css.includes("is-native-pdf"), "PDF review mode styles should exist");
assert.ok(!css.includes("top: -56px") && !css.includes("top:-56px"), "Chromium toolbar clip hack should be removed");
assert.ok(!css.includes("source-viewer-panel.is-native-pdf #sourceOpenExternalBtn"), "Synapse open/zoom chrome must stay visible for PDFs");
assert.ok(css.includes("source-viewer-toolbar {\n  display: none") || css.includes("display: none !important"), "legacy toolbar should be hidden");

assert.ok(fs.existsSync(path.join(repoRoot, "frontend/vendor/pdfjs/pdf.min.js")), "PDF.js should be vendored");
assert.ok(fs.existsSync(path.join(repoRoot, "frontend/vendor/pdfjs/pdf.worker.min.js")), "PDF.js worker should be vendored");
assert.ok(copyScript.includes('"vendor"'), "runtime copy should ship vendor/pdfjs");

assert.ok(transcript.includes("ensureSourcePreviewWarmup"), "building sources should warm the preview service");
assert.ok(boot.includes("bindSourceViewerShortcuts"), "boot should bind source shortcuts");
assert.ok(boot.includes("openActiveSourceExternally"), "boot should expose open-external helper");
assert.ok(boot.includes("resetSourceZoom"), "boot should expose fit-width helper");
assert.ok(boot.includes("retryActiveSourcePreview"), "boot should expose retry helper");

assert.ok(index.includes("style.css?v=gemini-tutor-v2"), "styles should cache-bust");
assert.ok(index.includes("synapse-legacy-controller-combined.js?v=gemini-tutor-v2"), "controller should cache-bust");

console.log("source-preview-instant-ui-regression: passed");
