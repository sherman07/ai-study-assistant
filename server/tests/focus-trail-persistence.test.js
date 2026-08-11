import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  mapFocusSession,
  rowFromPayload
} from "../src/repositories/focusSessionsRepository.js";

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(thisDir, "../src/db/supabase-schema.sql");

test("focus sessions preserve the user's local focus-trail day and timezone", () => {
  const row = rowFromPayload("user-42", {
    sessionId: "focus-42",
    focusTrailDate: "2026-08-11",
    focusTimezone: "Pacific/Auckland"
  });

  assert.equal(row.focus_trail_date, "2026-08-11");
  assert.equal(row.focus_timezone, "Pacific/Auckland");
  const session = mapFocusSession({ ...row, metrics_json: {} });
  assert.equal(session.focusTrailDate, "2026-08-11");
  assert.equal(session.focusTimezone, "Pacific/Auckland");
});

test("focus sessions reject malformed focus-trail fields before they reach Supabase", () => {
  const row = rowFromPayload("user-42", {
    sessionId: "focus-42",
    focusTrailDate: "2026-02-30",
    focusTimezone: "x".repeat(121)
  });

  assert.equal(row.focus_trail_date, null);
  assert.equal(row.focus_timezone, null);
});

test("the canonical Supabase schema indexes focus-trail days per user", () => {
  const schema = fs.readFileSync(schemaPath, "utf8");

  assert.match(schema, /focus_trail_date date/);
  assert.match(schema, /focus_timezone text/);
  assert.match(schema, /focus_sessions_user_trail_date_idx[\s\S]*user_id, focus_trail_date desc/);
});
