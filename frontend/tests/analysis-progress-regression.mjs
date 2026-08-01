import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const jobs = read("frontend/src/legacy/controller_sections/11_generationjobs.js");
const upload = read("frontend/src/legacy/controller_sections/01_uploadedfiles.js");
const boot = read("frontend/src/legacy/controller_sections/99_boot.js");
const styles = read("frontend/styles/04-section.css");
const main = read("frontend/src/main.js");
const controller = read("frontend/src/legacy/controller.js");
const loader = read("frontend/src/legacy/loadLegacyController.js");
const index = read("frontend/index.html");

for (const token of [
  "analysisRequestId",
  "startGenerationJobProgressPolling",
  "stopGenerationJobProgressPolling",
  "/analyze/progress/",
  "elapsedSeconds",
  "generation-progress-elapsed",
  'role="progressbar"',
  "aria-valuenow"
]) {
  assert.ok(jobs.includes(token), `generation progress should include ${token}`);
}

assert.ok(
  upload.includes('formData.append("analysis_request_id", analysisRequestId)'),
  "analysis POST should include its opaque progress request ID"
);
assert.ok(
  upload.includes("startGenerationJobProgressPolling(jobId, analysisRequestId)"),
  "analysis should start polling once the request ID exists"
);
assert.ok(
  upload.includes("stopGenerationJobProgressPolling(jobId)"),
  "analysis should stop progress work in its cleanup path"
);
assert.ok(
  boot.includes("prewarmSynapseServices()"),
  "workspace boot should start best-effort service prewarming"
);
assert.ok(
  jobs.includes("function prewarmSynapseServices"),
  "generation jobs should own non-blocking service prewarming"
);

for (const token of [".generation-progress-meta", ".generation-progress-stage", ".generation-progress-elapsed"]) {
  assert.ok(styles.includes(token), `progress UI should style ${token}`);
}

const progressAssetVersion = "study-tools-20260730-01";
for (const [label, source] of Object.entries({ main, controller, loader, index })) {
  assert.ok(
    source.includes(progressAssetVersion),
    `${label} should invalidate cached controller assets for the progress release`
  );
}

console.log("analysis progress regression passed");
