import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadSectionPath = readLegacyControllerSections("01_uploadedfiles.js");
const visualSectionPath = readLegacyControllerSections("02_openvisualmodal.js");
const cacheSectionPath = readLegacyControllerSections("08_extractrealtimeresponsetranscript.js");
const uploadSource = uploadSectionPath;
const visualSource = visualSectionPath;
const cacheSource = cacheSectionPath;

assert.ok(
  uploadSource.includes("data.visual_gallery || data.source_evidence_cards || data.figure_cards || data.visuals || []"),
  "analyzeMaterials should accept visual_gallery, source_evidence_cards, figure_cards, and visuals response aliases"
);
assert.ok(
  uploadSource.includes("visualGallery: compactVisualGalleryForStorage(visualGalleryData)"),
  "generated history entries should persist compact visual metadata"
);
assert.ok(
  visualSource.includes("visualGallery: compactVisualGalleryForStorage(visualGalleryData)"),
  "translated history entries should preserve compact visual metadata"
);
assert.ok(
  !uploadSource.includes("visualGallery: [],"),
  "generated history entries should not discard visual metadata"
);
assert.ok(
  cacheSource.includes("function pruneUnavailableVisualMarkers(summary, items)"),
  "visual history restore should remove visual markers whose images are unavailable"
);
assert.ok(
  cacheSource.includes("why_relevant: item.why_relevant || \"\""),
  "visual history compaction should preserve why_relevant explanations for refreshed inline cards"
);

const visualPersistenceFunctions = cacheSource.match(
  /function compactVisualGalleryForStorage\(items\) \{[\s\S]*?function isCompactVisualUrl\(value\) \{[\s\S]*?\n\}[\s\S]*?function pruneUnavailableVisualMarkers\(summary, items\) \{[\s\S]*?\n\}/
);
assert.ok(visualPersistenceFunctions, "visual persistence helpers should remain extractable for regression coverage");

const { compactVisualGalleryForStorage, pruneUnavailableVisualMarkers } = new Function(
  "normalizeLearningFigures",
  `${visualPersistenceFunctions[0]}\nreturn { compactVisualGalleryForStorage, pruneUnavailableVisualMarkers };`
)(items => items);

const persistedVisuals = compactVisualGalleryForStorage([
  { index: 1, title: "Unavailable image", caption: "Old metadata only", url: "" },
  { index: 2, title: "Available chart", caption: "A usable source chart", url: "https://example.test/chart.png" }
]);

assert.deepEqual(
  persistedVisuals.map(item => item.index),
  [2],
  "history storage must not keep visual metadata when it has no renderable URL"
);
assert.equal(
  pruneUnavailableVisualMarkers("Use [[VISUAL:1]] then [[VISUAL:2]].", persistedVisuals),
  "Use then [[VISUAL:2]].",
  "restored notes must drop stale inline image markers instead of rendering an error card"
);

console.log("history visual persistence regression passed");
