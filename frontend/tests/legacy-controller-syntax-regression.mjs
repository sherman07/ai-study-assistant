import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const sectionsDir = path.join(repoRoot, "frontend/src/legacy/controller_sections");
const controllerSource = fs.readFileSync(path.join(repoRoot, "frontend/src/legacy/controller.js"), "utf8");

const match = controllerSource.match(/const CONTROLLER_DEFINITION_FILES = \[([\s\S]*?)\];/);
assert.ok(match, "controller definition list should exist");
const legacyControllerSections = [...match[1].matchAll(/"([^"]+\.js)"/g)].map(item => item[1]);
legacyControllerSections.push("99_boot.js");

function buildCombinedControllerSource() {
  const body = [
    "window.__synapseCombinedEvalStarted = true;",
    ...legacyControllerSections.map(fileName => {
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
  const source = readLegacyControllerSections("08_workspaceandaccount.js");
  const matched = source.match(/function renderAccountMenu\(\) \{[\s\S]*?\n\}/);
  assert.ok(matched, "renderAccountMenu should exist");
  const declarations = [...matched[0].matchAll(/\b(?:const|let)\s+email\b/g)];
  assert.equal(declarations.length, 1, "renderAccountMenu should declare email only once");
});
