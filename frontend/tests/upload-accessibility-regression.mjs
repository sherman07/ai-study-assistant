import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const uploadStage = fs.readFileSync(path.join(testDir, "../src/react/components/UploadStage.js"), "utf8");
const dropZone = uploadStage.match(/id: "dropZone",[\s\S]*?\n        },\n        h\("input"/);

assert.ok(dropZone, "Upload drop zone should remain a focused interactive region");
assert.match(dropZone[0], /onKeyDown:/, "Focused upload drop zone should expose a keyboard handler");
assert.match(dropZone[0], /event\.key !== "Enter"/, "Enter should activate the upload drop zone");
assert.match(dropZone[0], /event\.key !== " "/, "Space should activate the upload drop zone");
assert.match(dropZone[0], /event\.preventDefault\(\)/, "Keyboard activation should prevent page scrolling or form side effects");
assert.match(dropZone[0], /legacyAction\("openFilePicker"\)/, "Keyboard activation should reuse the existing file-picker bridge");

console.log("upload accessibility regression passed");
