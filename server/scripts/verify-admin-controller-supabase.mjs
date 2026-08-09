#!/usr/bin/env node
/**
 * Prints (and optionally verifies) Supabase admin + user-control migrations.
 *
 * DDL cannot be applied through PostgREST. Run these in the Supabase SQL Editor:
 *   server/src/db/migrations/001_admin_controller_access.sql
 *   server/src/db/migrations/002_admin_user_controls_credits.sql
 *
 * With SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set, this script verifies tables,
 * metadata credit keys, and the billing overview view.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(serverRoot, ".env") });
dotenv.config();

const PRIMARY = "shermanzheng8@gmail.com";
const migrationPaths = [
  path.join(serverRoot, "src/db/migrations/001_admin_controller_access.sql"),
  path.join(serverRoot, "src/db/migrations/002_admin_user_controls_credits.sql")
];

function requiredEnv(name) {
  return String(process.env[name] || "").trim();
}

async function supabaseRest(method, table, { query = {}, body, prefer = "" } = {}) {
  const base = requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
  const key = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to verify against Supabase.");
  }
  const url = new URL(`${base}/rest/v1/${table}`);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "Accept-Profile": requiredEnv("SUPABASE_DB_SCHEMA") || "public"
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Content-Profile"] = requiredEnv("SUPABASE_DB_SCHEMA") || "public";
  }
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${table} failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  for (const migrationPath of migrationPaths) {
    const sql = fs.readFileSync(migrationPath, "utf8");
    console.log("Migration file:", migrationPath);
    console.log(`Apply this SQL in Supabase Dashboard → SQL Editor (${path.basename(migrationPath)}).\n`);
    if (!requiredEnv("SUPABASE_URL") || !requiredEnv("SUPABASE_SERVICE_ROLE_KEY")) {
      console.log("---");
      console.log(sql);
      console.log("---\n");
    }
  }

  if (!requiredEnv("SUPABASE_URL") || !requiredEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    console.log("Env not set — printed migrations only.");
    process.exit(0);
  }

  for (const table of ["platform_settings", "site_access_allowlist", "users"]) {
    await supabaseRest("GET", table, {
      query: { select: table === "users" ? "id,email,platform_role,plan,metadata_json" : "key", limit: 1 }
    });
    console.log(`OK: ${table} reachable`);
  }

  try {
    await supabaseRest("GET", "synapse_user_billing_overview", {
      query: { select: "id,email,daily_credits,boost_credits,account_status", limit: 1 }
    });
    console.log("OK: synapse_user_billing_overview reachable");
  } catch (error) {
    console.warn(`WARN: billing overview view missing — apply 002_admin_user_controls_credits.sql (${error.message})`);
  }

  await supabaseRest("POST", "site_access_allowlist", {
    query: { on_conflict: "email" },
    body: [{ email: PRIMARY, note: "Primary controller", granted_by_email: "system" }],
    prefer: "resolution=merge-duplicates,return=minimal"
  });
  console.log(`OK: ensure allowlist entry for ${PRIMARY}`);

  const users = await supabaseRest("GET", "users", {
    query: {
      select: "id,email,platform_role,plan,metadata_json",
      email: `eq.${PRIMARY}`,
      limit: 1
    }
  });
  if (Array.isArray(users) && users[0]) {
    await supabaseRest("PATCH", "users", {
      query: { id: `eq.${users[0].id}` },
      body: { platform_role: "controller" },
      prefer: "return=minimal"
    });
    console.log(`OK: platform_role=controller for ${PRIMARY}`);
    const meta = users[0].metadata_json || {};
    console.log(
      `NOTE: credit metadata keys present → daily=${meta.daily_credits ?? "n/a"} boost=${meta.boost_credits ?? "n/a"} admin_controls=${meta.admin_controls ? "yes" : "no"}`
    );
  } else {
    console.log(`NOTE: ${PRIMARY} has not signed up yet; bootstrap email still grants controller on first login.`);
  }

  console.log("Supabase admin + user-control wiring verified.");
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
