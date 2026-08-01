import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(repoRoot, "frontend/src/legacy/controller_sections/01_uploadedfiles.js"), "utf8");

assert.match(source, /const SUPPORTED_UPLOAD_EXTENSIONS = new Set\(\[/, "upload handling should define an explicit allow-list");
assert.match(source, /function isSupportedUpload\(file\)/, "upload handling should validate file types before queuing");
assert.match(source, /const rejectedFiles = nextFiles\.filter\(file => !isSupportedUpload\(file\)\)/, "unsupported files should be rejected separately from accepted files");
assert.match(source, /Unsupported file type/, "unsupported upload feedback should explain the problem");

console.log("upload type regression passed");
