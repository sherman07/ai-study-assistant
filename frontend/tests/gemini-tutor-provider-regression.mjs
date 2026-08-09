import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const config = read("backend/core/config.py");
const ask = read("backend/app_sections/06_source_preview.py");
const companion = read("backend/app_sections/14_learning_companion.py");
const analyze = read("backend/app_sections/05_analyze.py");
const health = read("backend/core/health.py");
const render = read("render.yaml");
const askFrontend = read("frontend/src/legacy/controller_sections/07_focusmindmappoint.js");
const uploadFrontend = read("frontend/src/legacy/controller_sections/01_uploadedfiles.js");
const companionClient = read("frontend/src/legacy/learningCompanionClient.js");
const app = read("backend/app.py");
const index = read("frontend/index.html");

assert.ok(config.includes("def chat_model_for_active_provider"), "active chat model helper required for Gemini tutor");
assert.ok(config.includes("without cross-provider fallback"), "provider switch must keep Gemini and GPT requests separate");
assert.ok(ask.includes('get("ai_provider")'), "Open Tutor /ask must accept ai_provider");
assert.ok(ask.includes("chat_model_for_active_provider"), "/ask must use provider-aware chat model");
assert.ok(!ask.includes("reply used GPT"), "/ask must not substitute GPT when Gemini was requested");
assert.ok(uploadFrontend.includes("Synapse will not substitute GPT"), "Gemini UI must explain that it fails instead of switching providers");
assert.ok(ask.includes("research_status"), "/ask should report web research availability");
assert.ok(companion.includes('get("ai_provider")'), "learning companion must accept ai_provider");
assert.ok(analyze.includes("ai_provider: str = Form"), "voice tutor respond must accept ai_provider");
assert.ok(analyze.includes("search_web_duckduckgo_instant"), "tutor web research needs Instant Answer fallback");
assert.ok(analyze.includes("search_web_wikipedia"), "tutor web research needs Wikipedia fallback when DuckDuckGo is blocked");
assert.ok(analyze.includes("/health/tutor-web"), "health probe should expose tutor web research diagnostics");
assert.ok(analyze.includes("Prefer Wikipedia first"), "gather should prefer Wikipedia on cloud hosts");
assert.ok(ask.includes("research_provider"), "/ask should report which research provider supplied sources");
assert.ok(health.includes("gemini_configured"), "health should expose whether Gemini can serve requests");
assert.ok(render.includes("GEMINI_API_KEY"), "Render blueprint should declare Gemini secret");
assert.ok(render.includes("GEMINI_AUTH_MODE"), "Render blueprint should force api_key mode for Gemini");
assert.ok(askFrontend.includes("ai_provider"), "frontend tutor chat must send ai_provider");
assert.ok(askFrontend.includes("research_provider"), "frontend tutor should surface research provider when used");
assert.ok(companionClient.includes("ai_provider"), "frontend companion client must send ai_provider");
assert.ok(uploadFrontend.includes("refreshBackendAiStatus"), "frontend should probe /health for Gemini availability");
assert.ok(uploadFrontend.includes("geminiConfigured"), "frontend should track whether Gemini is configured");
assert.ok(app.includes("chat_model_for_active_provider"), "app must export chat model helper into runtime globals");
assert.ok(app.includes("gemini_request_is_configured"), "app must export Gemini readiness helper");
assert.ok(/mindmap-revert-v1|notes-taller-v2|notes-responsive-v2|credits-live-v2|history-degraded-v1/.test(index), "workspace assets should cache-bust after Gemini/web research fix");

console.log("gemini-tutor-provider-regression: passed");
