import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Guards history section hydration and study-tool memory flush when switching notes.
 * Source-structure + extracted-logic checks (not a browser E2E).
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const historyPath = path.resolve(__dirname, "../src/legacy/controller_sections/09_togglesourceviewer.js");
const memoryPath = path.resolve(__dirname, "../src/legacy/controller_sections/13_studytoolmemory.js");
const historySource = fs.readFileSync(historyPath, "utf8");
const memorySource = fs.readFileSync(memoryPath, "utf8");

assert.ok(
  historySource.includes("persistStudyToolMemory"),
  "loadHistoryEntry should flush study-tool memory before identity flips"
);

const loadHistoryFn = historySource.match(/async function loadHistoryEntry\(id, options = \{\}\) \{[\s\S]*?\n\}/);
assert.ok(loadHistoryFn, "loadHistoryEntry should be extractable");
assert.match(
  loadHistoryFn[0],
  /persistStudyToolMemory[\s\S]{0,240}currentHistoryId !== item\.id/,
  "tool memory must be persisted for the previous note before currentHistoryId changes"
);

const hydrateFn = historySource.match(
  /async function hydrateGeneratedContentSections\(entry, \{ preserveScroll = false \} = \{\}\) \{[\s\S]*?\n\}/
);
assert.ok(hydrateFn, "hydrateGeneratedContentSections should be extractable");
assert.match(
  hydrateFn[0],
  /await fetchGeneratedContentSectionsFromDataApi\(contentId, page, pageSize\);\s*if \(!pageData\) return null;\s*\/\/[^\n]*\s*if \(currentHistoryId !== entry\.id\) return null;/,
  "hydrate must abandon after the first page await when history identity changed"
);
assert.match(
  hydrateFn[0],
  /while \(pageData\.has_next\) \{[\s\S]*?await fetchGeneratedContentSectionsFromDataApi[\s\S]*?if \(currentHistoryId !== entry\.id\) return null;/,
  "hydrate must re-check identity after every subsequent page await"
);
assert.ok(
  !/while \(pageData\.has_next && currentHistoryId === entry\.id\)/.test(hydrateFn[0]),
  "hydrate must not rely only on a pre-await while condition (race after await)"
);

assert.match(
  loadHistoryFn[0],
  /await hydrateGeneratedContentSections[\s\S]*?if \(currentHistoryId !== item\.id\) return;/,
  "loadHistoryEntry must stop after hydrate if another note was selected"
);
assert.match(
  loadHistoryFn[0],
  /await loadVisualGalleryAssets[\s\S]*?if \(currentHistoryId !== item\.id\) return;/,
  "loadHistoryEntry must stop after visual restore if another note was selected"
);
assert.match(
  loadHistoryFn[0],
  /await loadSourceAssets[\s\S]*?if \(currentHistoryId !== item\.id\) return;/,
  "loadHistoryEntry must stop after source restore if another note was selected"
);

assert.ok(memorySource.includes("studyToolMemoryIdentity"), "study-tool memory identity helper must remain");

console.log("history hydrate race regression passed");
