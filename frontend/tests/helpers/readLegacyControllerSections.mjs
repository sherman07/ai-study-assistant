import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sectionsDir = path.join(repoRoot, "frontend/src/legacy/controller_sections");

/**
 * Read one or more controller section families (e.g. "01", "08") or legacy filenames.
 * Split refactors keep content across sibling files; tests should search the whole family.
 */
export function readLegacyControllerSections(...keys) {
  const names = fs.readdirSync(sectionsDir).filter(name => name.endsWith(".js")).sort();
  const selected = new Set();

  for (const key of keys) {
    const base = String(key).replace(/^.*\//, "").replace(/\.js$/i, "");
    const family = base.includes("_") ? base.split("_")[0] : base;
    for (const name of names) {
      if (name === `${base}.js` || name.startsWith(`${family}_`)) selected.add(name);
    }
  }

  return [...selected]
    .sort()
    .map(name => fs.readFileSync(path.join(sectionsDir, name), "utf8"))
    .join("\n");
}

export function legacyControllerSectionPath(fileName) {
  return path.join(sectionsDir, fileName);
}
