import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import test from "node:test";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configUrl = pathToFileURL(path.join(serverRoot, "src/config.js")).href;

function loadAllowLocalDemoAuth(value) {
  const script = `import { config } from ${JSON.stringify(configUrl)}; console.log(String(config.allowLocalDemoAuth));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: serverRoot,
    env: { ...process.env, ALLOW_LOCAL_DEMO_AUTH: value },
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("local demo auth defaults to disabled when the environment is blank", () => {
  assert.equal(loadAllowLocalDemoAuth(""), "false");
});

test("local demo auth remains opt-in for local development", () => {
  assert.equal(loadAllowLocalDemoAuth("true"), "true");
});
