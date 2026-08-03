/**
 * History empty state must explain browser-local mode when Data API is degraded.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const historySection = fs.readFileSync(
  path.join(root, "frontend/src/legacy/controller_sections/09_togglesourceviewer.js"),
  "utf8",
);
const dataApiClient = fs.readFileSync(path.join(root, "frontend/src/legacy/dataApiClient.js"), "utf8");
const themeCss = fs.readFileSync(path.join(root, "frontend/styles/01-section.css"), "utf8");

assert.match(dataApiClient, /error\.degraded\s*=/);
assert.match(dataApiClient, /payload\?\.status === "degraded"/);
assert.match(dataApiClient, /Number\(response\.status\) === 503/);

assert.match(historySection, /setHistorySyncDegraded/);
assert.match(historySection, /history-empty-degraded/);
assert.match(historySection, /Cloud history is temporarily unavailable/);
assert.match(historySection, /role="status"/);

assert.match(themeCss, /\.history-empty-degraded/);

console.log("history-degraded-empty-state-regression: passed");
