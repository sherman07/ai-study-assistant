import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function walkFiles(dir, predicate, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

const frontendFiles = walkFiles(path.join(repoRoot, "frontend"), file => {
  return /\.(js|jsx|mjs|html|css|json)$/.test(file)
    && !file.includes(`${path.sep}assets${path.sep}focus-room-app${path.sep}`);
});

const forbiddenPatterns = [
  { name: "OpenAI secret key assignment", re: /OPENAI_API_KEY\s*=\s*["']sk-/ },
  { name: "OpenAI secret key literal", re: /sk-proj-[A-Za-z0-9_-]{20,}/ },
  { name: "Supabase service role assignment", re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+["']/ },
  { name: "Internal API token literal", re: /SYNAPSE_INTERNAL_API_TOKEN\s*=\s*["'](?!replace_with)[^"']{12,}["']/ }
];

for (const file of frontendFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const rule of forbiddenPatterns) {
    assert.ok(
      !rule.re.test(text),
      `${path.relative(repoRoot, file)} must not contain ${rule.name}`
    );
  }
}

const health = fs.readFileSync(path.join(repoRoot, "backend/core/health.py"), "utf8");
assert.ok(
  health.includes('"openai_api_key_loaded": bool('),
  "health payload must expose only whether the OpenAI key is loaded"
);
assert.ok(
  !/openai_api_key"\s*:\s*self\._get\("OPENAI_API_KEY"\)/.test(health),
  "health payload must never return the raw OpenAI API key"
);

const renderYaml = fs.readFileSync(path.join(repoRoot, "render.yaml"), "utf8");
assert.match(
  renderYaml,
  /key: OPENAI_API_KEY\n\s+sync: false/,
  "Render must keep OPENAI_API_KEY as a secret sync:false env var"
);
assert.match(
  renderYaml,
  /key: SUPABASE_SERVICE_ROLE_KEY\n\s+sync: false/,
  "Render must keep SUPABASE_SERVICE_ROLE_KEY as a secret sync:false env var"
);
assert.match(
  renderYaml,
  /key: SYNAPSE_INTERNAL_API_TOKEN\n\s+sync: false/,
  "Render must keep SYNAPSE_INTERNAL_API_TOKEN as a secret sync:false env var"
);

const config = fs.readFileSync(path.join(repoRoot, "frontend/config.js"), "utf8");
assert.ok(
  config.includes("Do not put secret keys in this file"),
  "frontend config must warn operators not to embed secret keys"
);
assert.ok(
  !/SERVICE_ROLE|OPENAI_API_KEY|sk-proj-/.test(config),
  "frontend config must not include service-role or OpenAI secrets"
);

console.log("token protection regression passed");
