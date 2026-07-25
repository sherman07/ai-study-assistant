import assert from "node:assert/strict";
import test from "node:test";

import {
  databaseUnavailableError,
  errorHandler,
  isDatabaseUnavailableError
} from "../src/middleware/errors.js";

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

test("MySQL connection refused is treated as database unavailable", () => {
  assert.equal(isDatabaseUnavailableError({ code: "ECONNREFUSED", message: "connect ECONNREFUSED" }), true);
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
});

test("error handler also upgrades raw connection errors to 503", () => {
  const res = mockRes();
  errorHandler({ code: "ECONNREFUSED", message: "connect ECONNREFUSED 127.0.0.1:3306" }, {}, res, () => {});
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.status, "degraded");
});
