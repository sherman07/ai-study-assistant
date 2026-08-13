import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const uploaded = readLegacyControllerSections("01_uploadedfiles.js");
const sourceBuilder = readLegacyControllerSections("08_extractrealtimeresponsetranscript.js");
const index = read("frontend/index.html");
const controllerLoader = read("frontend/src/legacy/controllerLoader.js");

assert.ok(uploaded.includes("function isPrimarySourceReviewItem"), "primary source review filter should exist");
assert.ok(uploaded.includes("function youtubeSourceLinks"), "YouTube-only link helper should exist");
assert.ok(uploaded.includes("function primaryAnalysisSourceLinks"), "analysis should prefer primary links");
assert.ok(uploaded.includes("primaryAnalysisSourceLinks(uploadedLinks, parsedSources.links)"), "generation should use primary analysis links");
assert.ok(sourceBuilder.includes("youtubeSourceLinks"), "source review builder should keep YouTube links only");
assert.ok(sourceBuilder.includes("isPrimarySourceReviewItem"), "source review builder should drop secondary web sources");
assert.ok(sourceBuilder.includes('kind: "youtube"'), "link tabs in review should be YouTube-only");
assert.ok(!sourceBuilder.includes("`Web source ${index + 1}`"), "generic Web source review tabs should be removed");
assert.ok(
  controllerLoader.includes('synapse-legacy-controller-combined.js') && controllerLoader.includes('?v=${this.version}'),
  "controller loader should cache-bust"
);

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} should exist`);
  let depth = 0;
  let started = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
      started = true;
    } else if (ch === "}") {
      depth -= 1;
      if (started && depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

const context = {
  uploadedLinks: [],
  getYouTubeVideoIdClient(url) {
    const match = String(url || "").match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : "";
  },
  normalizeSourceLink(link) {
    return String(link || "").trim();
  }
};
vm.createContext(context);
vm.runInContext(
  [
    extractFunction(uploaded, "uniqueSourceLinks"),
    extractFunction(uploaded, "isYouTubeSourceUrl"),
    extractFunction(uploaded, "youtubeSourceLinks"),
    extractFunction(uploaded, "primaryAnalysisSourceLinks"),
    extractFunction(uploaded, "isPrimarySourceReviewItem")
  ].join("\n"),
  context
);

context.uploadedLinks = ["https://example.com/article", "https://www.youtube.com/watch?v=Q_5lAbCdEfG"];
const primaryLinks = context.primaryAnalysisSourceLinks(
  context.uploadedLinks,
  ["https://superego.structure/", "https://youtu.be/Q_5lAbCdEfG", "https://random.site/path"]
);
assert.equal(primaryLinks.length, 2, "primary analysis links should keep explicit chips + one YouTube");
assert.ok(primaryLinks.includes("https://example.com/article"), "explicit chip websites remain analysis inputs");
assert.ok(primaryLinks.includes("https://www.youtube.com/watch?v=Q_5lAbCdEfG"), "YouTube links remain");
assert.ok(!primaryLinks.includes("https://superego.structure/"), "free-text websites must not become sources");
assert.ok(!primaryLinks.includes("https://random.site/path"), "secondary free-text websites must not become sources");

const reviewLinks = context.youtubeSourceLinks([
  "https://example.com/article",
  "https://superego.structure/",
  "https://www.youtube.com/watch?v=Q_5lAbCdEfG"
]);
assert.equal(
  JSON.stringify(reviewLinks),
  JSON.stringify(["https://www.youtube.com/watch?v=Q_5lAbCdEfG"]),
  "source review should only keep YouTube links"
);

assert.equal(context.isPrimarySourceReviewItem({ kind: "pdf", blob: {} }), true);
assert.equal(context.isPrimarySourceReviewItem({ kind: "note", content: "hello" }), true);
assert.equal(context.isPrimarySourceReviewItem({ kind: "youtube", originalUrl: "https://youtu.be/Q_5lAbCdEfG" }), true);
assert.equal(context.isPrimarySourceReviewItem({ kind: "link", originalUrl: "https://superego.structure/" }), false);
assert.equal(context.isPrimarySourceReviewItem({ kind: "file", originalUrl: "https://example.com" }), false);

console.log("source-review-primary-only-regression: passed");
