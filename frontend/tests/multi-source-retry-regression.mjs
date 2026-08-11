import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const upload = read("frontend/src/legacy/controller_sections/01_uploadedfiles.js");
const jobs = read("frontend/src/legacy/controller_sections/11_generationjobs.js");
const analyze = read("backend/app_sections/05_analyze.py");
const youtube = read("backend/app_sections/03_download_youtube_media.py");
const linkUnit = read("backend/app_sections/04_file_to_source_unit.py");
const renderYaml = read("render.yaml");

assert.ok(
  upload.includes("async function retryGenerationJobFromUpload"),
  "Retry helper should be async so it can restore persisted upload files"
);
assert.ok(
  upload.includes("resolveUploadedFilesForRetry"),
  "Retry should reuse in-memory uploaded files by original names"
);
assert.ok(
  upload.includes("saveUploadRetryPayload") && upload.includes("loadUploadRetryPayload"),
  "Retry should persist uploaded files for the job so Retry does not require a fresh upload"
);
assert.ok(
  !/if \(request\.hasFiles\) return false;/.test(upload),
  "File-backed jobs must no longer hard-fail Retry"
);
assert.ok(
  jobs.includes("runtimeGenerationJobRetryPayloads"),
  "Failed jobs should retain a retry payload with the original files"
);
assert.ok(
  jobs.includes("async function retryGenerationJob"),
  "Retry entry point should await the upload retry helper"
);
assert.ok(
  !jobs.includes("Re-upload the source files, then click Generate AI again."),
  "Failed Retry messaging should not force a re-upload as the only path"
);
const cancelFn = jobs.match(/function cancelGenerationJob\([^)]*\)\s*\{[\s\S]*?\n\}/);
assert.ok(cancelFn, "cancelGenerationJob helper should exist");
assert.ok(
  !cancelFn[0].includes("runtimeGenerationJobRetryPayloads.delete"),
  "Cancel must keep retry payloads so Retry can restart without re-upload"
);
assert.ok(
  !cancelFn[0].includes("clearUploadRetryPayload"),
  "Cancel must not clear IndexedDB upload retry payloads"
);
assert.ok(
  cancelFn[0].includes("processGenerationJobQueue"),
  "Cancel helper should still advance the generation queue"
);
assert.ok(
  cancelFn[0].includes("You can retry with the same files"),
  "Cancel messaging should invite Retry with the same files"
);

assert.ok(
  youtube.includes("captions_only: bool = False"),
  "YouTube analysis should support a captions-only fast path"
);
assert.ok(
  linkUnit.includes("captions_only: bool = False"),
  "Link source builder should pass captions-only through to YouTube analysis"
);
assert.ok(
  analyze.includes("youtube_captions_only = has_file_sources"),
  "Multi-file + YouTube requests should skip expensive media downloads when files already exist"
);
assert.match(
  renderYaml,
  /^      - key: ANALYSIS_MAX_SECONDS\n        value: "95"/m,
  "Render analysis budget should allow multi-source generation"
);
assert.match(
  renderYaml,
  /^      - key: ENABLE_YOUTUBE_YTDLP_FALLBACK\n        value: "false"/m,
  "Render free tier should avoid yt-dlp downloads during multi-source generation"
);

console.log("multi-source retry regression passed");
