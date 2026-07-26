import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const css = fs.readFileSync(path.join(repoRoot, "frontend/styles/04-section.css"), "utf8");
const index = fs.readFileSync(path.join(repoRoot, "frontend/index.html"), "utf8");
const style = fs.readFileSync(path.join(repoRoot, "frontend/style.css"), "utf8");
const historyController = fs.readFileSync(path.join(repoRoot, "frontend/src/legacy/controller_sections/09_togglesourceviewer.js"), "utf8");
const generationJobs = fs.readFileSync(path.join(repoRoot, "frontend/src/legacy/controller_sections/11_generationjobs.js"), "utf8");
const broadcastJobs = fs.readFileSync(path.join(repoRoot, "frontend/src/legacy/controller_sections/12_broadcastjobs.js"), "utf8");

assert.ok(css.includes(".app-layout.loading-state .history-nav"));
assert.ok(
  css.includes(".workspace-shell:has(.app-layout.loading-state) .history-nav") ||
    /\.app-layout\.loading-state \.history-nav[\s\S]{0,120}?display:\s*block/.test(css),
  "loading state should keep the learning rail visible whether it is nested or a workspace sibling"
);

const loadingNotesBlock = css.match(/\.app-layout\.loading-state \.notes-area\s*\{[^}]+\}/)?.[0] || "";
assert.ok(loadingNotesBlock.includes("margin-left: 300px"));
assert.ok(loadingNotesBlock.includes("width: calc(100% - 300px)"));
assert.ok(
  css.includes(".app-layout.loading-state.has-learning-rail .notes-area"),
  "loading notes should not double-offset when the learning rail already reserves padding"
);

assert.ok(index.includes("style.css?v=companion-practice-v1"));
assert.ok(style.includes('@import url("./styles/04-section.css");'));
assert.ok(style.includes('@import url("./styles/07-section.css");'));
assert.ok(historyController.includes('onclick="loadHistoryEntry'));
assert.ok(generationJobs.includes("function deleteGenerationJob(jobId)"));
assert.ok(generationJobs.includes("deleteGenerationJob('"));
assert.ok(broadcastJobs.includes("deleteBroadcastJob('"));
assert.ok(css.includes(".history-delete-btn {"));
assert.ok(css.includes("opacity: 1"));

console.log("loading history navigation regression passed");
