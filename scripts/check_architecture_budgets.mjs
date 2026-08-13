#!/usr/bin/env node
/** Hard architecture budget: every scanned source file must be ≤ 500 lines. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_LINES = 500;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = ["frontend/src", "frontend/auth-client.js", "frontend/landing-auth.js", "server/src", "backend"];
const IGNORE_DIRS = new Set(["node_modules", "dist", "vendor", "__pycache__", ".venv", "assets"]);
const CODE_EXT = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".py"]);

function walk(rel, out = []) {
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) return out;
  const st = fs.statSync(abs);
  if (st.isFile()) {
    out.push(rel.split(path.sep).join("/"));
    return out;
  }
  for (const name of fs.readdirSync(abs)) {
    if (IGNORE_DIRS.has(name)) continue;
    const child = path.join(rel, name);
    const childAbs = path.join(repoRoot, child);
    const cst = fs.statSync(childAbs);
    if (cst.isDirectory()) walk(child, out);
    else if (CODE_EXT.has(path.extname(name))) out.push(child.split(path.sep).join("/"));
  }
  return out;
}

const files = SCAN_ROOTS.flatMap(r => walk(r));
const violations = [];
for (const rel of files.sort()) {
  const text = fs.readFileSync(path.join(repoRoot, rel), "utf8");
  const lines = text.length ? text.split(/\r?\n/).length : 0;
  if (lines > MAX_LINES) violations.push(`${rel}: ${lines} lines (max ${MAX_LINES})`);
}

if (violations.length) {
  console.error(`Architecture budget failed (${violations.length} files over ${MAX_LINES} lines):`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`Architecture budget OK: ${files.length} files, max ${MAX_LINES} lines each.`);
