import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(repoRoot, file), "utf8");

const backend = read("backend/app.py");
const authClient = read("frontend/auth-client.js");
const render = read("render.yaml");
const signupPage = read("frontend/signup.html");

assert.ok(backend.includes("auth_email_frontend_base_url"), "production email base helper required");
assert.ok(backend.includes("SYNAPSE_CANONICAL_FRONTEND_BASE_URL"), "canonical frontend env required");
assert.ok(backend.includes("queue_synapse_auth_email"), "signup should queue confirmation emails");
assert.ok(backend.includes("BackgroundTasks"), "FastAPI background tasks required for fast signup response");
assert.ok(backend.includes("synapse_link_from_generate_payload"), "confirmation links must open the Synapse verify page");
assert.ok(backend.includes('params={"page": 1, "per_page": 200, "filter": target}'), "filtered user lookup required");
assert.ok(authClient.includes("token_hash: tokenHash"), "verify page must exchange token_hash links");
assert.ok(render.includes("SYNAPSE_CANONICAL_FRONTEND_BASE_URL"), "Render must ship canonical frontend URL");
assert.ok(signupPage.includes("auth-client.js?v=auth-singleton-v1"), "signup page must cache-bust auth client");

console.log("signup-email-production-regression: passed");
