import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const qualityGate = packageJson.scripts["test:all"] || "";

for (const requiredCommand of [
  "node scripts/validate_static_site.mjs",
  "npm run test:frontend",
  "npm run test:frontend:selenium",
  "npm --prefix server run check",
  ".venv/bin/python -m unittest discover -s backend/tests -v",
  "npm audit --omit=dev",
  "npm --prefix server audit --omit=dev",
  ".venv/bin/python -m pip check",
]) {
  assert.ok(qualityGate.includes(requiredCommand), `quality gate must run: ${requiredCommand}`);
}

console.log("quality gate command regression passed");
