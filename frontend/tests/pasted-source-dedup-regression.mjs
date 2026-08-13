import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { removeDetectedUrlsClient } from "../src/legacy/sourceUtils.js";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllerSource = readLegacyControllerSections("01_uploadedfiles.js");
const start = controllerSource.indexOf("const SOURCE_LINK_CANDIDATE_PATTERN");
const end = controllerSource.indexOf("async function analyzeMaterials");

assert.notEqual(start, -1, "source link parser should exist");
assert.notEqual(end, -1, "analyzeMaterials should exist after the parser helpers");

const parserSource = controllerSource.slice(start, end);
const makeParser = new Function(`
  function getYouTubeVideoIdClient(value) {
    const text = String(value || "");
    const match = text.match(/(?:youtu\\.be\\/|youtube(?:-nocookie)?\\.com\\/(?:watch\\?v=|embed\\/|shorts\\/))([A-Za-z0-9_-]{11})/);
    return match ? match[1] : "";
  }
  function removeDetectedUrlsClient(value) {
    return String(value || "")
      .replace(/(?:https?:\\/\\/|www\\.)[^\\s<>()]+/gi, " ")
      .replace(/\\s+/g, " ")
      .trim();
  }
  ${parserSource}
  return { parseMixedSources };
`);

const { parseMixedSources } = makeParser();
const parsed = parseMixedSources([
  "Read this article: https://example.com/topic?utm_source=notes.",
  "Also compare www.example.org/background.",
  "Watch https://youtu.be/abc12345678 for context.",
  "Keep this pasted explanation as source text."
].join("\\n"));

assert.equal(parsed.links.length, 3, "pasted URLs should still be submitted as links");
assert.match(parsed.freeText, /Keep this pasted explanation/);
assert.doesNotMatch(parsed.freeText, /https?:\/\//, "free_text should not duplicate extracted URLs");
assert.doesNotMatch(parsed.freeText, /youtu\.be|example\.(?:com|org)/, "free_text should not include URL host remnants");

assert.equal(
  removeDetectedUrlsClient("Use www.example.com and youtube.com/watch?v=abc12345678, then keep this sentence."),
  "Use and then keep this sentence.",
  "shared source text cleaner should remove bare web and YouTube links"
);

console.log("pasted source dedup regression passed");
