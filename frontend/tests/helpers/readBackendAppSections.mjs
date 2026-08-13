import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sectionsDir = path.join(repoRoot, "backend/app_sections");

/** Read a backend app_section family (e.g. "05" or "05_analyze.py"). */
export function readBackendAppSections(...keys) {
  const names = fs.readdirSync(sectionsDir).filter(name => name.endsWith(".py")).sort();
  const selected = new Set();
  for (const key of keys) {
    const base = String(key).replace(/^.*\//, "").replace(/\.py$/i, "");
    const familyMatch = base.match(/^(\d+)/);
    const family = familyMatch ? familyMatch[1] : base;
    for (const name of names) {
      if (name === `${base}.py` || name.match(new RegExp(`^${family}[a-z]?_`))) {
        selected.add(name);
      }
    }
  }
  return [...selected]
    .sort()
    .map(name => fs.readFileSync(path.join(sectionsDir, name), "utf8"))
    .join("\n");
}

/** Composition root + every app section (for content regressions after splits). */
export function readBackendAppSource() {
  const app = fs.readFileSync(path.join(repoRoot, "backend/app.py"), "utf8");
  const sections = fs
    .readdirSync(sectionsDir)
    .filter(name => name.endsWith(".py"))
    .sort()
    .map(name => fs.readFileSync(path.join(sectionsDir, name), "utf8"))
    .join("\n");
  return `${app}\n${sections}`;
}
