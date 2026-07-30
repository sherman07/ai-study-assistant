import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const copySource = fs.readFileSync(
  path.join(repoRoot, "scripts/copy_frontend_runtime_assets.mjs"),
  "utf8"
);

for (const asset of ["admin-access.js", "admin-settings.js", "admin-pages.css"]) {
  assert.match(
    copySource,
    new RegExp(`"${asset}"`),
    `production copy step must publish ${asset} so Vercel does not 404 the Users admin page`
  );
  assert.ok(
    fs.existsSync(path.join(repoRoot, "frontend", asset)),
    `${asset} must exist in frontend/`
  );
}

console.log("admin runtime assets regression checks passed");
