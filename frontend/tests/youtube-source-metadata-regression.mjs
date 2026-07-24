import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(__dirname, "../src/legacy/controller_sections/08_extractrealtimeresponsetranscript.js");
const source = fs.readFileSync(sourcePath, "utf8");

assert.match(source, /const backendByUrl = new Map\(\)/, "linked sources must match backend metadata by canonical URL");
assert.match(source, /sourceIdentity: backend\.source_identity \|\| ""/, "linked sources must retain their backend identity");
assert.match(source, /content: backend\.text_excerpt \|\| ""/, "linked sources must retain the extracted transcript");
assert.match(source, /name: sourceTitle/, "linked sources should show the video title instead of a generic tab name");

console.log("youtube source metadata regression passed");
