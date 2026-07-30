import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const sectionsDir = path.join(repoRoot, "frontend/src/legacy/controller_sections");

const legacyControllerSections = [
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

function buildCombinedControllerSource() {
  const body = [
    "window.__synapseCombinedEvalStarted = true;",
    ...legacyControllerSections.map((fileName) => {
      const source = fs.readFileSync(path.join(sectionsDir, fileName), "utf8");
      return `\n/* ${fileName} */\n${source}`;
    })
  ].join("\n");
  return [
    "window.__synapseRunCombinedController = function synapseRunCombinedController() {",
    body,
    "  window.__synapseCombinedControllerReady = true;",
    "};"
  ].join("\n");
}

test("combined legacy controller parses without syntax errors", () => {
  const source = buildCombinedControllerSource();
  const tmpPath = path.join(repoRoot, "frontend/tests/.tmp-legacy-controller-check.js");
  fs.writeFileSync(tmpPath, source);
  try {
    const result = spawnSync(process.execPath, ["--check", tmpPath], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout || "syntax check failed");
  } finally {
    fs.rmSync(tmpPath, { force: true });
  }
});

test("renderAccountMenu does not redeclare email", () => {
  const source = fs.readFileSync(
    path.join(sectionsDir, "08_extractrealtimeresponsetranscript.js"),
    "utf8"
  );
  const match = source.match(/function renderAccountMenu\(\) \{[\s\S]*?\n\}/);
  assert.ok(match, "renderAccountMenu should exist");
  const declarations = [...match[0].matchAll(/\b(?:const|let)\s+email\b/g)];
  assert.equal(declarations.length, 1, "renderAccountMenu should declare email only once");
});
