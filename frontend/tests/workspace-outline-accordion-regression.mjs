import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildGeneratedNoteNavigation } from "../src/legacy/notesNavigation.js";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const uploaded = readLegacyControllerSections("01_uploadedfiles.js");
const sectionsController = readLegacyControllerSections("02_openvisualmodal.js");
const layoutCss = read("frontend/styles/01-section.css");

assert.match(
  uploaded,
  /notesReady && tab === "outline"/,
  "Outline tab should only activate while generated notes are open"
);
assert.match(
  uploaded,
  /tablist\.hidden = !notesReady/,
  "Library/Outline tab strip should hide outside generated notes"
);
assert.match(
  uploaded,
  /outlinePanel\.hidden = !\(notesReady && desired === "outline"\)/,
  "Outline panel should stay hidden until generated notes are ready"
);

assert.match(
  layoutCss,
  /\.app-layout:not\(\.generated-notes-state\) \.workspace-nav-tabs/,
  "CSS should hide Outline tabs outside generated-notes-state"
);
assert.match(
  layoutCss,
  /\.section-subnav\[hidden\]\s*\{[\s\S]*?display:\s*none !important;/,
  "collapsed subsection lists must stay hidden even when display:grid is set"
);
assert.match(
  layoutCss,
  /\.section-nav-group--branch/,
  "top-level expandable sections need branch styling"
);

assert.match(
  sectionsController,
  /section-nav-group--branch/,
  "big sections with children should be marked as branch groups"
);
assert.match(
  sectionsController,
  /bi-chevron-down section-nav-caret/,
  "expanded big sections should switch to a down caret"
);
assert.match(
  sectionsController,
  /setExpanded\(!group\.classList\.contains\("expanded"\)\)/,
  "big section clicks should toggle their nested subsection dropdown"
);
assert.match(
  sectionsController,
  /rootBtn === activeBtn\) return/,
  "selecting a parent should not force-open itself before the dropdown toggle runs"
);

const sampleNotes = `# Guide

## 1. Big Picture: What This Material Is Really About

Overview body.

### A useful distinction

Nested detail.

### Why markets move together

More nested detail.

## 2. The Exam Will Probably Test These Ideas

Exam body.

### Likely exam questions in natural wording

Question bank.

## 3. What You Actually Need To Understand

Core understanding.
`;

const tree = buildGeneratedNoteNavigation(sampleNotes);
assert.equal(tree.length, 3, "numbered h2 headings become the big outline sections");
assert.equal(tree[0].children.length, 2, "big section 1 should drop down into nested subsections");
assert.equal(tree[1].children.length, 1, "big section 2 should expose its nested subsection");
assert.deepEqual(
  tree[0].children.map(child => child.title),
  ["A useful distinction", "Why markets move together"],
  "nested subsections should keep their generated titles"
);

console.log("workspace-outline-accordion-regression: passed");
