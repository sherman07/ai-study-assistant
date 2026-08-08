import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const uploadControllerSource = read("frontend/src/legacy/controller_sections/01_uploadedfiles.js");
const notesRendererSource = read("frontend/src/legacy/controller_sections/02_openvisualmodal.js");
const historySource = read("frontend/src/legacy/controller_sections/09_togglesourceviewer.js");

assert.ok(
  uploadControllerSource.includes("normaliseAiGenerationDiagnostics(data.ai_generation"),
  "analyze response should preserve backend AI generation diagnostics"
);

assert.ok(
  uploadControllerSource.includes("aiGeneration: currentAiGeneration"),
  "history entries should store AI generation diagnostics"
);

assert.ok(
  uploadControllerSource.includes("Synapse rejected local fallback notes; fix the selected provider and retry"),
  "the client must reject legacy local fallback notes instead of rendering them as generated output"
);

assert.ok(
  notesRendererSource.includes("renderAiGenerationNotice()"),
  "notes renderer should prepend the AI generation warning when needed"
);

assert.ok(
  historySource.includes("normaliseAiGenerationDiagnostics(item.aiGeneration"),
  "saved history should restore AI generation diagnostics"
);

console.log("ai generation diagnostics regression passed");
