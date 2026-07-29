import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");

const settings = read("frontend/src/legacy/controller_sections/02_openvisualmodal.js");
const mind = read("frontend/src/legacy/controller_sections/06_deleteflashcarddeck.js");
const css = read("frontend/styles/07-section.css");
const index = read("frontend/index.html");

assert.ok(
  settings.includes("Object.entries(STUDY_TOOL_SETTINGS_DEFAULTS).map(([tool, defaults]) => ["),
  "study tool settings must use [key, value] pairs for Object.fromEntries"
);
assert.ok(settings.includes('key: "labels"'), "mind map settings should include label length control");
assert.ok(settings.includes("Mind map settings applied"), "saving mind map settings should confirm to the user");
assert.ok(mind.includes("function mindMapElbowPath"), "clean spine/elbow connectors required");
assert.ok(mind.includes("shared trunk + vertical spine"), "connectors should use a shared spine instead of rainbow fan");
assert.ok(mind.includes("mm-link--trunk"), "trunk link class required");
assert.ok(mind.includes("function mindMapLabelText"), "label helper required for full/compact titles");
assert.ok(mind.includes('dataset.mindmapLabels'), "label setting must be applied to the canvas");
assert.ok(mind.includes("is-dimmed"), "compact layout should dim inactive branches");
assert.ok(mind.includes("return `${clipped || sliced}…`") || mind.includes("…`"), "truncated labels must end with an ellipsis");
assert.ok(css.includes(".mm-tree-branch.is-dimmed"), "dimmed branch styles required");
assert.ok(css.includes(".mm-link--trunk"), "trunk connector styles required");
assert.ok(css.includes('data-mindmap-labels="full"'), "full-label layout styles required");
assert.ok(index.includes("mindmap-clean-v1"), "cache-bust after mind map polish");

console.log("mindmap-clean-polish-regression: passed");
