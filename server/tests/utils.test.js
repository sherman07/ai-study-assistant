import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { billingPlanList, hasActivePro, subscriptionAccessPlan, userEntitlements } from "../src/billing/plans.js";
import { allowedReturnUrl } from "../src/routes/billing.js";
import { stableUserId } from "../src/utils/ids.js";
import { allowedValue, cleanString, limitValue, validateProgressPayload } from "../src/utils/validators.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repositoryDir = path.resolve(__dirname, "../src/repositories");
const serverRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(serverRoot, "..");

test("stableUserId is deterministic and scoped by provider", () => {
  assert.equal(stableUserId("local_demo", "abc"), stableUserId("local_demo", "abc"));
  assert.notEqual(stableUserId("local_demo", "abc"), stableUserId("supabase", "abc"));
});

test("health reports Supabase as the active store instead of an implied MySQL mirror", () => {
  const appSource = fs.readFileSync(path.join(serverRoot, "src/app.js"), "utf8");
  assert.ok(appSource.includes('supabaseStorageEnabled() ? "supabase" : "mysql"'));
  assert.doesNotMatch(appSource, /supabase\+mysql-mirror/);
});

test("validators clamp and sanitize public input", () => {
  assert.equal(cleanString(" hello\nworld ", 20), "hello world");
  assert.equal(allowedValue("PUBLIC", ["private", "shared", "public"], "private"), "public");
  assert.equal(allowedValue("owner", ["private", "shared", "public"], "private"), "private");
  assert.equal(limitValue(999, 50, 200), 200);
});

test("progress payload validation rejects malformed input", () => {
  assert.equal(validateProgressPayload({ score: "90" }).ok, true);
  assert.equal(validateProgressPayload(null).ok, true);
  assert.equal(validateProgressPayload([]).ok, false);
  assert.equal(validateProgressPayload({ score: "not-a-number" }).error, "Progress score must be a number.");
});

test("repository list queries inline sanitized LIMIT values", () => {
  const files = [
    "flashcardsRepository.js",
    "focusSessionsRepository.js",
    "generatedContentRepository.js",
    "progressRepository.js",
    "studyRoomsRepository.js"
  ];

  for (const file of files) {
    const source = fs.readFileSync(path.join(repositoryDir, file), "utf8");
    assert.match(source, /const safeLimit = limitValue\(/, `${file} should clamp the requested limit`);
    assert.doesNotMatch(source, /LIMIT\s+\?/i, `${file} should not bind LIMIT as a placeholder`);
    assert.match(source, /LIMIT \$\{safeLimit\}/, `${file} should inline only the sanitized integer limit`);
  }
});

test("billing plan metadata separates subscription and one-time Checkout modes", () => {
  const plans = billingPlanList();
  assert.equal(plans.find(plan => plan.id === "free")?.mode, null);
  assert.equal(plans.find(plan => plan.id === "pro_monthly")?.mode, "subscription");
  assert.equal(plans.find(plan => plan.id === "pro_yearly")?.mode, "payment");
});

test("billing entitlements only grant Pro for active unexpired statuses", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();

  assert.equal(hasActivePro({ plan: "pro_monthly", subscriptionStatus: "active", currentPeriodEnd: future }), true);
  assert.equal(hasActivePro({ plan: "pro_yearly", subscriptionStatus: "active", currentPeriodEnd: future }), true);
  assert.equal(hasActivePro({ plan: "free", subscriptionStatus: "active", currentPeriodEnd: future }), false);
  assert.equal(hasActivePro({ plan: "pro_monthly", subscriptionStatus: "past_due", currentPeriodEnd: future }), false);
  assert.equal(hasActivePro({ plan: "pro_monthly", subscriptionStatus: "active", currentPeriodEnd: past }), false);
  assert.equal(subscriptionAccessPlan("pro_monthly", "canceled"), "free");
  assert.equal(userEntitlements({ plan: "pro_monthly", subscriptionStatus: "active", currentPeriodEnd: future }).features.proStudy, true);
});

test("billing return URLs stay on allowed origins", () => {
  const fallbackOrigin = "http://127.0.0.1:3001";
  const fallback = "http://127.0.0.1:3001/frontend/index.html";
  assert.equal(allowedReturnUrl("", fallbackOrigin, "/frontend/index.html"), fallback);
  assert.equal(allowedReturnUrl("https://evil.example/checkout", fallbackOrigin, "/frontend/index.html"), fallback);
  assert.equal(
    allowedReturnUrl("http://127.0.0.1:5175/frontend/billing-success.html?session_id={CHECKOUT_SESSION_ID}", fallbackOrigin),
    "http://127.0.0.1:5175/frontend/billing-success.html?session_id={CHECKOUT_SESSION_ID}"
  );
});

test("data API port falls back to Render PORT", async () => {
  const previousPort = process.env.PORT;
  const previousSynapsePort = process.env.SYNAPSE_DATA_API_PORT;

  try {
    process.env.SYNAPSE_DATA_API_PORT = "";
    process.env.PORT = "4488";

    const configUrl = `${pathToFileURL(path.join(serverRoot, "src/config.js")).href}?render-port=${Date.now()}`;
    const { config } = await import(configUrl);
    assert.equal(config.port, 4488);
  } finally {
    if (previousPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = previousPort;
    }

    if (previousSynapsePort === undefined) {
      delete process.env.SYNAPSE_DATA_API_PORT;
    } else {
      process.env.SYNAPSE_DATA_API_PORT = previousSynapsePort;
    }
  }
});

test("Render blueprint deploys Python AI backend and Node data API separately", () => {
  const renderYamlSource = fs.readFileSync(path.join(repoRoot, "render.yaml"), "utf8");

  assert.ok(renderYamlSource.includes("name: synapse-ai-backend"), "Render blueprint should define the Python AI backend");
  assert.ok(renderYamlSource.includes("runtime: python"), "AI backend should use the Python runtime");
  assert.ok(
    renderYamlSource.includes("python -m pip install --upgrade pip && python -m pip install -r backend/requirements.txt"),
    "AI backend should install Python dependencies from backend/requirements.txt"
  );
  assert.ok(
    renderYamlSource.includes("python -m uvicorn backend.app:app --host 0.0.0.0 --port $PORT"),
    "AI backend should start uvicorn through the Python module path on Render's PORT"
  );
  assert.ok(renderYamlSource.includes("SUPABASE_URL"), "AI backend should receive Supabase URL for signup");
  assert.ok(renderYamlSource.includes("SUPABASE_ANON_KEY"), "AI backend should receive Supabase anon key for signup");
  assert.ok(renderYamlSource.includes("SUPABASE_SERVICE_ROLE_KEY"), "AI backend should receive Supabase service-role key for signup");
  assert.ok(renderYamlSource.includes("name: synapse-data-api"), "Render blueprint should define the Node data API");
  assert.ok(renderYamlSource.includes("rootDir: server"), "Node data API should build from the server directory");
  assert.ok(renderYamlSource.includes("buildCommand: npm ci --omit=dev"), "Node data API should install production npm dependencies");
  assert.ok(renderYamlSource.includes("startCommand: npm start"), "Node data API should use its package start script");
});

test("Render blueprint keeps optional MySQL connection values server-side", () => {
  const renderBlueprint = fs.readFileSync(path.join(repoRoot, "render.yaml"), "utf8");
  for (const key of ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"]) {
    assert.match(renderBlueprint, new RegExp(`- key: ${key}\\n\\s+sync: false`));
  }
});

test("Render AI backend keeps analysis within a safe request budget", () => {
  const renderYamlSource = fs.readFileSync(path.join(repoRoot, "render.yaml"), "utf8");

  assert.match(
    renderYamlSource,
    /^      - key: ANALYSIS_MAX_SECONDS\n        value: "55"/m,
    "Render analysis should leave headroom before the platform can terminate a long request"
  );
  assert.match(
    renderYamlSource,
    /^      - key: OPENAI_TIMEOUT_SECONDS\n        value: "45"/m,
    "OpenAI calls should time out before the Render analysis budget"
  );
  assert.match(
    renderYamlSource,
    /^      - key: CONTROLLED_OUTPUT_TOKENS\n        value: "8000"/m,
    "Render should cap generated output so analysis does not exhaust the instance"
  );
  assert.match(
    renderYamlSource,
    /^      - key: ENABLE_CONDITIONAL_NOTE_EXPANSION\n        value: "false"/m,
    "Render should skip the optional second expansion call"
  );
});

test("Render AI backend uses a lightweight PPTX path on the free instance", () => {
  const renderYamlSource = fs.readFileSync(path.join(repoRoot, "render.yaml"), "utf8");

  assert.match(
    renderYamlSource,
    /^      - key: ENABLE_PPTX_SLIDE_RENDER\n        value: "false"/m,
    "Render should skip expensive PPTX slide rendering"
  );
  assert.match(
    renderYamlSource,
    /^      - key: ENABLE_PPTX_SVG_FALLBACK_RENDER\n        value: "false"/m,
    "Render should skip the SVG slide fallback"
  );
  assert.match(
    renderYamlSource,
    /^      - key: ENABLE_SOURCE_PPTX_PREVIEW_RENDER\n        value: "false"/m,
    "Render should skip on-demand PPTX preview conversion"
  );
  assert.match(
    renderYamlSource,
    /^      - key: ENABLE_PPTX_EMBEDDED_IMAGE_EXTRACTION\n        value: "false"/m,
    "Render should avoid embedding every PPTX image in the analysis request"
  );
});

test("Render AI backend skips PDF page rendering on the free instance", () => {
  const renderYamlSource = fs.readFileSync(path.join(repoRoot, "render.yaml"), "utf8");

  assert.match(
    renderYamlSource,
    /^      - key: ENABLE_PDF_VISUAL_EXTRACTION\n        value: "false"/m,
    "Render should keep PDF generation text-first instead of allocating page images in one request"
  );
});

test("stripe billing routes verify webhooks and keep secrets server-side", () => {
  const routeSource = fs.readFileSync(path.join(serverRoot, "src/routes/billing.js"), "utf8");
  const schemaSource = fs.readFileSync(path.join(serverRoot, "src/db/schema.sql"), "utf8");
  const configSource = fs.readFileSync(path.join(serverRoot, "src/config.js"), "utf8");
  const generatedContentRoute = fs.readFileSync(path.join(serverRoot, "src/routes/generatedContent.js"), "utf8");

  for (const envName of [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_PRO_MONTHLY",
    "STRIPE_PRICE_PRO_YEARLY"
  ]) {
    assert.ok(configSource.includes(envName), `${envName} should be read from server environment`);
  }

  for (const field of [
    "stripe_customer_id",
    "stripe_subscription_id",
    "plan VARCHAR(80)",
    "subscription_status VARCHAR(80)",
    "current_period_end DATETIME"
  ]) {
    assert.ok(schemaSource.includes(field), `users schema should include ${field}`);
  }

  assert.ok(routeSource.includes("checkout.sessions.create"), "billing route should create Stripe Checkout Sessions");
  assert.ok(routeSource.includes("billingPortal.sessions.create"), "billing route should create Stripe Customer Portal sessions");
  assert.ok(routeSource.includes("webhooks.constructEvent"), "webhook route must verify Stripe signatures");
  assert.ok(routeSource.includes("checkout.session.completed"), "webhook route should handle completed Checkout");
  assert.ok(routeSource.includes("customer.subscription.updated"), "webhook route should handle subscription updates");
  assert.ok(routeSource.includes("customer.subscription.deleted"), "webhook route should handle subscription cancellation");
  assert.ok(routeSource.includes("invoice.payment_failed"), "webhook route should handle failed invoice payments");
  assert.ok(generatedContentRoute.includes("requireProWhenRequested"), "Pro-marked generated content writes should be gated server-side");
});

test("Supabase storage wiring is present for users and study histories", () => {
  const configSource = fs.readFileSync(path.join(serverRoot, "src/config.js"), "utf8");
  const usersRepositorySource = fs.readFileSync(path.join(repositoryDir, "usersRepository.js"), "utf8");
  const generatedRepositorySource = fs.readFileSync(path.join(repositoryDir, "generatedContentRepository.js"), "utf8");
  const focusRepositorySource = fs.readFileSync(path.join(repositoryDir, "focusSessionsRepository.js"), "utf8");
  const flashcardsRepositorySource = fs.readFileSync(path.join(repositoryDir, "flashcardsRepository.js"), "utf8");
  const progressRepositorySource = fs.readFileSync(path.join(repositoryDir, "progressRepository.js"), "utf8");
  const studyRoomsRepositorySource = fs.readFileSync(path.join(repositoryDir, "studyRoomsRepository.js"), "utf8");
  const supabaseSchemaSource = fs.readFileSync(path.join(serverRoot, "src/db/supabase-schema.sql"), "utf8");
  const readmeSource = fs.readFileSync(path.join(serverRoot, "README.md"), "utf8");
  const authSource = fs.readFileSync(path.join(serverRoot, "src/middleware/auth.js"), "utf8");

  assert.ok(configSource.includes("SUPABASE_SERVICE_ROLE_KEY"), "server config should read the Supabase service-role key");
  assert.ok(configSource.includes("SUPABASE_DB_SCHEMA"), "server config should allow a Supabase schema override");
  assert.ok(usersRepositorySource.includes("supabaseStorageEnabled"), "users repository should support Supabase-backed storage");
  assert.ok(generatedRepositorySource.includes("supabaseStorageEnabled"), "generated-content repository should support Supabase-backed storage");
  assert.ok(focusRepositorySource.includes("supabaseStorageEnabled"), "focus sessions repository should support Supabase-backed storage");
  assert.ok(flashcardsRepositorySource.includes("supabaseStorageEnabled"), "flashcards repository should support Supabase-backed storage");
  assert.ok(progressRepositorySource.includes("supabaseStorageEnabled"), "progress repository should support Supabase-backed storage");
  assert.ok(studyRoomsRepositorySource.includes("supabaseStorageEnabled"), "study rooms repository should support Supabase-backed storage");
  for (const table of [
    "users",
    "generated_contents",
    "study_rooms",
    "study_room_members",
    "focus_sessions",
    "flashcard_decks",
    "flashcards",
    "progress_records"
  ]) {
    assert.ok(supabaseSchemaSource.includes(`create table if not exists public.${table}`), `Supabase schema should create ${table}`);
    assert.ok(supabaseSchemaSource.includes(`alter table public.${table} enable row level security`), `Supabase schema should enable RLS on ${table}`);
  }
  assert.ok(supabaseSchemaSource.includes("grant select, insert, update, delete on table"), "Supabase schema should grant Data API table access explicitly");
  assert.doesNotMatch(authSource, /role:\s*metadata\.role/, "Supabase roles must not come from user-editable metadata");
  assert.ok(readmeSource.includes("SUPABASE_SERVICE_ROLE_KEY"), "server README should document Supabase server setup");
});

test("Learning Companion schema grants authenticated and service roles explicit access", () => {
  const schemaSource = fs.readFileSync(path.join(serverRoot, "src/db/supabase-schema.sql"), "utf8");
  const learningTables = [
    "public.learner_profiles",
    "public.learning_subjects",
    "public.learning_sessions",
    "public.learning_messages",
    "public.learning_evidence"
  ];

  for (const table of learningTables) {
    assert.ok(schemaSource.includes(`alter table ${table} enable row level security;`), `${table} should enable RLS`);
  }
  assert.match(
    schemaSource,
    /revoke all privileges on table\s+public\.learner_profiles,\s+public\.learning_subjects,\s+public\.learning_sessions,\s+public\.learning_messages,\s+public\.learning_evidence\s+from anon, authenticated, service_role;/s
  );
  assert.match(
    schemaSource,
    /grant select, insert, update, delete on table\s+public\.learner_profiles,\s+public\.learning_subjects,\s+public\.learning_sessions,\s+public\.learning_messages,\s+public\.learning_evidence\s+to authenticated, service_role;/s
  );
});

test("Supabase trigger function pins an empty search path", () => {
  const schemaSource = fs.readFileSync(path.join(serverRoot, "src/db/supabase-schema.sql"), "utf8");
  assert.match(
    schemaSource,
    /create or replace function public\.synapse_set_updated_at\(\)[\s\S]+set search_path = ''[\s\S]+pg_catalog\.timezone\('utc', pg_catalog\.now\(\)\)/
  );
});
