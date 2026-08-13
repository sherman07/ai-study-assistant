import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const backendSource = read("backend/app_sections/10_parse_quiz_type_plan.py");
const uploadSource = readLegacyControllerSections("01_uploadedfiles.js");
const timelineSource = readLegacyControllerSections("03_rendertimeline.js");
const renderSource = readLegacyControllerSections("04_rendervisualguidelaunch.js");

const backendVersion = backendSource.match(/VISUAL_IMAGE_GUIDE_STYLE_VERSION\s*=\s*"([^"]+)"/)?.[1];
const frontendVersion = uploadSource.match(/const VISUAL_IMAGE_GUIDE_STYLE_VERSION\s*=\s*"([^"]+)"/)?.[1];

assert.equal(frontendVersion, backendVersion, "frontend should accept the current backend visual image guide style version");

assert.ok(
  timelineSource.includes("normalized?.styleVersion === VISUAL_IMAGE_GUIDE_STYLE_VERSION"),
  "saved visual image guides should be version-gated before restore"
);

assert.ok(
  renderSource.includes("guide.imageProcessing?.layout") || renderSource.includes("guide.imageProcessing && guide.imageProcessing.layout"),
  "rendered visual image guides should expose renderer layout metadata for QA/debugging"
);

assert.ok(
  timelineSource.includes("requestedModel: cleanVisualGuideGeneratedText(source.requested_model || source.requestedModel || \"\")"),
  "normalized visual image guides should preserve requested OpenAI model metadata"
);

assert.ok(
  timelineSource.includes("renderingNote: cleanVisualGuideGeneratedText(source.rendering_note || source.renderingNote || \"\")"),
  "normalized visual image guides should preserve backend rendering notes"
);

assert.ok(
  renderSource.includes("guide.renderingNote"),
  "rendered visual image guides should show strict-renderer notes near the image"
);

console.log("visual image guide regression passed");
