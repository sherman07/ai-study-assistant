import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const client = read("frontend/src/legacy/learningCompanionClient.js");
const workspace = read("frontend/src/react/components/CompanionWorkspace.js");
const backend = read("backend/app_sections/14_learning_companion.py");

assert.match(client, /learning_context:\s*learningContext/, "companion client should send learning_context");
assert.match(client, /source_bundle:\s*sourceBundle/, "companion client should send source_bundle");
assert.match(
  workspace,
  /learningContext:\s*activeThread\.learningContext/,
  "CompanionWorkspace must pass persisted learning context into the requester"
);
assert.match(backend, /learning_context/, "backend companion route must read learning_context");
assert.match(backend, /Persisted learning context from Synapse/, "backend prompt must include persisted context");
assert.match(
  backend,
  /learning_context\.get\("topic"\)/,
  "backend should prefer persisted topic when subject title is absent"
);

console.log("companion-learning-context-regression: passed");
