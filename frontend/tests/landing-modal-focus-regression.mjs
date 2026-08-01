import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(repoRoot, "frontend/src/landing/LandingPage.jsx"), "utf8");

assert.match(source, /useEffect, useRef, useState/, "landing modal should use a focus ref");
assert.match(source, /const returnFocusRef = useRef\(null\)/, "landing should remember the CTA that opened the modal");
assert.match(source, /returnFocusRef\.current = trigger/, "the opening CTA should be stored for focus return");
assert.match(source, /returnFocusRef\.current\?\.focus\?\.\(\)/, "closing the modal should return focus to the opening CTA");
assert.match(source, /closeButtonRef\.current\?\.focus\?\.\(\)/, "opening the modal should move focus into the dialog");

console.log("landing modal focus regression passed");
