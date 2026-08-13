import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildGeneratedNoteNavigation } from "../src/legacy/notesNavigation.js";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const layoutCss = fs.readFileSync(path.join(repoRoot, "frontend/styles/01-section.css"), "utf8");
const themeCss = fs.readFileSync(path.join(repoRoot, "frontend/styles/00-theme.css"), "utf8");
const responsiveCss = fs.readFileSync(path.join(repoRoot, "frontend/styles/04-section.css"), "utf8");
const navigationController = readLegacyControllerSections("02_openvisualmodal.js");
const analysisController = readLegacyControllerSections("01_uploadedfiles.js");
const resetController = readLegacyControllerSections("08_extractrealtimeresponsetranscript.js");

const generatedNotes = `# BUS115 Week 9

## 1. The money market: what it actually explains

Money demand and money supply determine the nominal interest rate.

### A useful distinction

Do not confuse this with the loanable-funds market.

## 2. Fractional-reserve banking in one chain

Banks retain reserves and lend the remainder.
`;

const entries = buildGeneratedNoteNavigation(generatedNotes, {
  "Big Picture": "A generic backend label that must not replace the generated heading.",
});

assert.deepEqual(
  entries.map(entry => entry.title),
  [
    "1. The money market: what it actually explains",
    "2. Fractional-reserve banking in one chain",
  ],
  "navigation should use the actual top-level generated note headings"
);

assert.match(
  layoutCss,
  /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(280px, clamp\(300px, 22vw, 380px\)\)/,
  "the desktop workspace should keep a readable main column with a single unified left rail"
);
assert.match(
  responsiveCss,
  /@media \(max-width: 1479px\) and \(min-width: 851px\)[\s\S]*?\.app-layout:not\(\.assistant-closed\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/,
  "at laptop widths, an open tutor should become a drawer instead of shrinking the generated notes"
);
assert.match(entries[0].markdown, /A useful distinction/, "each navigation item should retain its generated section content");
assert.equal(
  entries[0].anchor,
  "section-1-the-money-market-what-it-actually-explains",
  "top-level headings should receive stable anchors for in-page navigation"
);
assert.deepEqual(
  entries[0].children.map(child => child.title),
  ["A useful distinction"],
  "a section should expose its nested headings for the disclosure menu"
);

const continuationHeadingNote = `## 1. Big Picture\nOverview.\n\n## 2. The Exam Will Probably Test These Ideas\n### Likely exam questions in natural wording\n## Key Terms and Mechanisms\n### Question-level mechanisms\n\n## 3. What You Actually Need To Understand\nCore understanding.`;
const continuationEntries = buildGeneratedNoteNavigation(continuationHeadingNote);
assert.deepEqual(
  continuationEntries.map(entry => entry.title),
  [
    "1. Big Picture",
    "2. The Exam Will Probably Test These Ideas",
    "3. What You Actually Need To Understand",
  ],
  "unnumbered continuation headings must not become new top-level sections"
);
assert.deepEqual(
  continuationEntries[1].children.map(child => child.title),
  ["Likely exam questions in natural wording", "Key Terms and Mechanisms"],
  "continuation headings should remain under the numbered section they explain"
);
assert.deepEqual(
  continuationEntries[1].children[1].children.map(child => child.title),
  ["Question-level mechanisms"],
  "headings below a continuation heading should remain nested under that heading"
);
assert.match(
  themeCss,
  /html\[data-theme="dark"\] \.notes-card[\s\S]*?background: var\(--color-surface-primary\)/,
  "generated note cards must adopt a readable dark surface instead of the light renderer default"
);
assert.match(
  themeCss,
  /html\[data-theme="dark"\] \.summary-content h1[\s\S]*?color: var\(--color-text-primary\)/,
  "generated note headings must use the dark theme text token"
);
assert.match(
  navigationController,
  /mainButton\.addEventListener\("click", \(\) => \{[\s\S]*?navigateToGeneratedHeading\(entry, isMobile\)[\s\S]*?setExpanded\(!group\.classList\.contains\("expanded"\)\)/,
  "the parent section button should navigate and control its nested headings"
);
assert.doesNotMatch(
  navigationController,
  /section-nav-toggle/,
  "nested headings should not use a separate burger/list button"
);
assert.match(
  navigationController,
  /navigateToGeneratedHeading\(/,
  "the section label should navigate the full generated note instead of replacing it with a fragment"
);
assert.match(
  navigationController,
  /createSectionButton\(child, isMobile, depth \+ 1\)/,
  "nested headings should render as recursive navigation groups"
);
assert.match(
  analysisController,
  /appLayout\.classList\.add\([^;]*"generated-notes-state"\)/,
  "opening generated notes must set a dedicated navigation state"
);
assert.match(
  layoutCss,
  /\.app-layout\.generated-notes-state \.history-nav[\s\S]*?display: flex !important;/,
  "the existing history rail must remain available in a generated class"
);
assert.match(
  layoutCss,
  /\.app-layout\.generated-notes-state #summaryNav:not\(\[hidden\]\)[\s\S]*?display: flex !important;/,
  "the generated-note outline remains available inside the unified rail"
);
assert.match(
  resetController,
  /classList\.remove\([^;]*"generated-notes-state"\)/,
  "returning home must clear the generated-only navigation state"
);

const fallback = buildGeneratedNoteNavigation("", {
  "Source-only overview": "Fallback content",
});
assert.deepEqual(
  fallback,
  [{ title: "Source-only overview", markdown: "Fallback content", anchor: "section-source-only-overview", children: [] }],
  "structured section data should remain a safe fallback when a summary has no headings"
);

console.log("smart notes navigation regression passed");
