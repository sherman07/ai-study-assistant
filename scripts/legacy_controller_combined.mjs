import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = path.join(repoRoot, "frontend");

export const legacyControllerSections = [
  "01_uploadedfiles.js",
  "02_openvisualmodal.js",
  "03_rendertimeline.js",
  "04_rendervisualguidelaunch.js",
  "04_masterygraph.js",
  "05_persistcurrentquiztohistory.js",
  "06_deleteflashcarddeck.js",
  "07_focusmindmappoint.js",
  "08_extractrealtimeresponsetranscript.js",
  "09_togglesourceviewer.js",
  "10_focusroombridge.js",
  "11_generationjobs.js",
  "12_broadcastjobs.js",
  "13_studytoolmemory.js",
  "14_learningcompanion.js",
  "99_boot.js"
];

export function buildLegacyControllerCombinedSource(frontendDir = frontendRoot) {
  const legacyControllerBody = [
    "window.__synapseCombinedEvalStarted = true;",
    ...legacyControllerSections.map(fileName => {
      const source = fs.readFileSync(
        path.join(frontendDir, "src/legacy/controller_sections", fileName),
        "utf8"
      );
      return `\n/* ${fileName} */\n${source}`;
    })
  ].join("\n");

  return [
    "window.__synapseRunCombinedController = function synapseRunCombinedController() {",
    legacyControllerBody,
    "  window.__synapseCombinedControllerReady = true;",
    "  window.dispatchEvent(new Event('synapse-combined-controller-ready'));",
    "};",
    "if (window.__synapseRuntimeUtilitiesReady) {",
    "  window.__synapseRunCombinedController();",
    "} else {",
    "  window.addEventListener('synapse-runtime-utilities-ready', window.__synapseRunCombinedController, { once: true });",
    "}"
  ].join("\n");
}

export function writeLegacyControllerCombined(targetPath, frontendDir = frontendRoot) {
  const source = buildLegacyControllerCombinedSource(frontendDir);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, source);
  return targetPath;
}
