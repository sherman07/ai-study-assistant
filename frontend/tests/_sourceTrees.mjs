/** Shared helpers for frontend architecture/content regression tests. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

/** Concatenate all .js/.jsx files under a directory (sorted). */
export function readTree(rel) {
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) return "";
  const st = fs.statSync(abs);
  if (st.isFile()) return fs.readFileSync(abs, "utf8");
  const files = [];
  const walk = dir => {
    for (const name of fs.readdirSync(dir).sort()) {
      const child = path.join(dir, name);
      const cst = fs.statSync(child);
      if (cst.isDirectory()) walk(child);
      else if (/\.(js|jsx|mjs|cjs)$/.test(name)) files.push(child);
    }
  };
  walk(abs);
  return files.map(f => fs.readFileSync(f, "utf8")).join("\n");
}

export const authClientSource = () =>
  read("frontend/auth-client.js") + "\n" + readTree("frontend/src/features/auth/client");

export const landingAuthSource = () =>
  read("frontend/landing-auth.js") + "\n" + readTree("frontend/src/features/auth/landing");

export const focusRoomStoreSource = () =>
  read("frontend/src/focus-room/hooks/useFocusRoomStore.js") + "\n" +
  readTree("frontend/src/features/focus-room-store");

export const focusRoomDataSource = () =>
  read("frontend/src/focus-room/data.js") + "\n" +
  readTree("frontend/src/features/focus-room-data");

export const companionWorkspaceSource = () =>
  read("frontend/src/react/components/CompanionWorkspace.js") + "\n" +
  readTree("frontend/src/features/companion");
