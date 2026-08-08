import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDirectory = path.join(root, "frontend", "tests");
const probeFiles = fs.readdirSync(testDirectory)
  .filter((name) => name.endsWith(".mjs") && name !== "chrome-probe-guard.mjs")
  .filter((name) => fs.readFileSync(path.join(testDirectory, name), "utf8").includes("prepareChromeProbe"))
  .sort();

if (!probeFiles.length) {
  throw new Error("No guarded browser probes were found.");
}

for (const name of probeFiles) {
  const result = spawnSync(process.execPath, [path.join(testDirectory, name)], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
