import assert from "node:assert/strict";
import test from "node:test";

import {
  databaseUnavailableError,
  errorHandler,
  isDatabaseUnavailableError
} from "../src/middleware/errors.js";
import { upsertUser } from "../src/repositories/usersRepository.js";

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test("connection refused is treated as database unavailable", () => {
  assert.equal(isDatabaseUnavailableError({ code: "ECONNREFUSED", message: "connect ECONNREFUSED" }), true);
  assert.equal(isDatabaseUnavailableError({ message: "Supabase storage is not configured." }), true);
  assert.equal(isDatabaseUnavailableError({ message: "Supabase users GET timed out after 8 seconds." }), true);
  assert.equal(isDatabaseUnavailableError({ code: "ER_DUP_ENTRY", message: "duplicate" }), false);
});

test("error handler maps database outages to explicit 503 degraded payloads", () => {
  const res = mockRes();
  const error = databaseUnavailableError({ code: "ECONNREFUSED", message: "connect ECONNREFUSED" });
  errorHandler(error, {}, res, () => {});
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.status, "degraded");
  assert.match(res.body.error, /temporarily unavailable/i);
  assert.match(res.body.error, /Supabase/i);
});

test("error handler also upgrades raw connection errors to 503", () => {
  const res = mockRes();
  errorHandler({ code: "ECONNREFUSED", message: "connect ECONNREFUSED 127.0.0.1:5432" }, {}, res, () => {});
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.status, "degraded");
});

test("user upsert without Supabase config raises an explicit 503 degraded error", async () => {
  await assert.rejects(
    () => upsertUser({ auth_provider: "demo", auth_subject: "qa-sunday", email: "qa@example.com" }),
    (error) => {
      assert.equal(error.status, 503);
      assert.equal(error.code, "DATABASE_UNAVAILABLE");
      assert.match(String(error.message), /temporarily unavailable/i);
      return true;
    }
  );
});
