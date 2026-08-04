# Upload Page Clarity Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cluttered Materials upload hero with a calm, task-first source workspace while preserving every existing upload and analysis contract.

**Architecture:** Keep `UploadStage` as the single React owner of the upload form and change only its presentation hierarchy. Use narrowly scoped CSS in the existing upload section and semantic theme tokens; do not add state, dependencies, backend changes, or new controller actions.

**Tech Stack:** React rendered through the project's `h()` runtime, native CSS, Bootstrap Icons, Node source-regression tests, Vite production build, Chrome UI verification.

## Global Constraints

- Preserve all existing form field IDs, control order, `legacyAction` calls, live regions, keyboard behavior, and analytics-sensitive labels.
- Keep the Synapse logo, side navigation, Materials destination, established blue accent, typography, and Bootstrap icon family.
- Remove `AI Academic Tutor`, the duplicate `Materials` badge, `Study Smarter`, `Start with AI tutor`, and `Choose / Confirm / Analyze` from page content.
- Use heading `Add study materials` and supporting copy `Upload files, add links, or paste notes. Synapse will turn them into a connected study workspace.`
- Keep light and dark themes, WCAG AA contrast, visible keyboard focus, mobile single-column behavior, and reduced-motion-safe interactions.
- Add no third-party dependency and change no backend endpoint, upload parser, navigation label, form field name, or form field order.
- Use no em dash or en dash in visible page copy.

---

### Task 1: Replace the marketing hero with a task-first hierarchy

**Files:**
- Create: `frontend/tests/upload-stage-clarity-regression.mjs`
- Modify: `frontend/src/react/components/UploadStage.js:21-101`

**Interfaces:**
- Consumes: existing `h`, `icon`, and `legacyAction` imports; existing DOM IDs `uploadStage`, `dropZone`, `assetUpload`, `uploadStatus`, `filePreview`, `linkInput`, `sourceInput`, `preferredLanguage`, `promptMode`, `noteLength`, and `generateBtn`.
- Produces: the classes `upload-page-header`, `upload-page-copy`, `upload-source-workspace`, and `upload-source-section`; all existing controller-facing IDs and actions remain unchanged.

- [ ] **Step 1: Write the failing hierarchy regression**

Create `frontend/tests/upload-stage-clarity-regression.mjs`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "frontend/src/react/components/UploadStage.js"), "utf8");

assert.ok(source.includes('className: "upload-page-header"'));
assert.ok(source.includes('className: "upload-page-copy"'));
assert.ok(source.includes('"Add study materials"'));
assert.ok(source.includes('"Upload files, add links, or paste notes. Synapse will turn them into a connected study workspace."'));
assert.ok(source.includes('"Drop files here"'));
assert.ok(source.includes('"Select files"'));

for (const retired of ["AI Academic Tutor", "Study Smarter", "Start with AI tutor", "Choose", "Confirm"]) {
  assert.equal(source.includes(`"${retired}"`), false, `${retired} should not compete with upload`);
}

for (const contract of [
  'id: "dropZone"',
  'id: "assetUpload"',
  'id: "uploadStatus"',
  'id: "filePreview"',
  'id: "linkInput"',
  'id: "sourceInput"',
  'id: "preferredLanguage"',
  'id: "promptMode"',
  'id: "noteLength"',
  'id: "generateBtn"',
  'legacyAction("openFilePicker")',
  'legacyAction("addLinksFromInput")',
  'legacyAction("analyzeMaterials")',
  'role: "status"',
  '"aria-live": "polite"',
]) assert.ok(source.includes(contract), `missing preserved contract: ${contract}`);

console.log("upload stage clarity regression passed");
```

- [ ] **Step 2: Run the new regression and verify it fails**

Run:

```bash
node frontend/tests/upload-stage-clarity-regression.mjs
```

Expected: FAIL because `upload-page-header` and `Add study materials` do not exist yet.

- [ ] **Step 3: Replace only the top hierarchy and drop-zone copy**

In `UploadStage.js`, replace the current `hero-copy`, `workspace-surface-badge`, and `companion-launch-row` blocks with:

```js
h(
  "header",
  { className: "upload-page-header" },
  h(
    "div",
    { className: "upload-page-copy" },
    h("h1", null, "Add study materials"),
    h("p", null, "Upload files, add links, or paste notes. Synapse will turn them into a connected study workspace.")
  )
),
```

Change the outer card class from `premium-upload-card` to `premium-upload-card upload-source-workspace`. Inside `dropZone`:

- keep `assetUpload`, accepted MIME types, role, tab index, aria-label, picker action, and button label unchanged;
- retain `upload-icon-wrap` and `bi-cloud-arrow-up`;
- change the heading to `Drop files here`;
- change the paragraph to `PDFs, slides, documents, images, audio, and video are supported.`;
- remove the entire `upload-guidance` element.

Add `upload-source-section` to the existing `source-box`, `language-box`, prompt-mode, and note-length section class lists without reordering them.

- [ ] **Step 4: Run hierarchy and existing form regressions**

Run:

```bash
node frontend/tests/upload-stage-clarity-regression.mjs
node frontend/tests/upload-stage-form-regression.mjs
node frontend/tests/user-feedback-regression.mjs
node frontend/tests/companion-history-regression.mjs
```

Expected: all four PASS.

- [ ] **Step 5: Commit the hierarchy change**

```bash
git add frontend/src/react/components/UploadStage.js frontend/tests/upload-stage-clarity-regression.mjs
git commit -m "refactor: simplify upload page hierarchy"
```

### Task 2: Build the clear responsive source workspace styling

**Files:**
- Modify: `frontend/tests/upload-stage-clarity-regression.mjs`
- Modify: `frontend/styles/01-section.css:740-760, 1447-1605, 2820-2882`
- Modify only if semantic tokens do not cover the state: `frontend/styles/04-section.css:1033-1054`

**Interfaces:**
- Consumes: Task 1 classes `upload-page-header`, `upload-page-copy`, `upload-source-workspace`, and `upload-source-section`.
- Produces: compact desktop and mobile hierarchy using existing tokens `--color-page-background`, `--color-surface-primary`, `--color-surface-secondary`, `--color-text-primary`, `--color-text-secondary`, `--color-border-default`, and `--primary`.

- [ ] **Step 1: Extend the regression with required style contracts**

Append to `upload-stage-clarity-regression.mjs`:

```js
const css = fs.readFileSync(path.join(root, "frontend/styles/01-section.css"), "utf8");

for (const selector of [
  ".upload-page-header",
  ".upload-page-copy h1",
  ".upload-source-workspace",
  ".upload-source-section",
  ".drop-zone:focus-visible",
  "@media (max-width: 850px)",
]) assert.ok(css.includes(selector), `missing upload style: ${selector}`);

assert.ok(css.includes("min-height: 220px"), "desktop drop zone should be compact");
assert.equal(css.includes(".upload-guidance {"), false, "retired step styling should be removed");
```

- [ ] **Step 2: Run the regression and verify the style assertions fail**

Run:

```bash
node frontend/tests/upload-stage-clarity-regression.mjs
```

Expected: FAIL because the new selectors and compact drop-zone height are not defined.

- [ ] **Step 3: Implement the task-first styling**

In `frontend/styles/01-section.css`:

```css
.upload-stage {
  width: min(960px, 100%);
  display: grid;
  gap: 20px;
}

.upload-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 2px;
}

.upload-page-copy {
  max-width: 680px;
}

.upload-page-copy h1 {
  margin: 0;
  color: var(--color-text-primary, var(--text));
  font-size: clamp(2rem, 4vw, 3.25rem);
  font-weight: 950;
  letter-spacing: -0.055em;
  line-height: 1;
}

.upload-page-copy p {
  max-width: 620px;
  margin: 10px 0 0;
  color: var(--color-text-secondary, var(--text-soft));
  font-size: 0.98rem;
  line-height: 1.55;
}

.upload-source-workspace {
  padding: 20px;
  border-radius: 18px;
  background: var(--color-surface-primary, #fff);
  border: 1px solid var(--color-border-default, var(--border-blue));
  box-shadow: 0 18px 48px color-mix(in srgb, var(--primary) 8%, transparent);
}

.drop-zone {
  min-height: 220px;
  padding: 30px 24px;
  border-radius: 16px;
  background: var(--color-surface-secondary, #f7f9fd);
  border-color: color-mix(in srgb, var(--primary) 28%, var(--color-border-default, #d8e6ff));
}

.upload-icon-wrap {
  width: 52px;
  height: 52px;
  margin-bottom: 14px;
  border-radius: 14px;
  font-size: 1.45rem;
  box-shadow: none;
}

.drop-zone h2 {
  margin-bottom: 6px;
  font-size: 1.18rem;
}

.drop-zone p {
  max-width: 500px;
  margin-bottom: 18px;
}

.upload-source-section {
  border-top: 1px solid var(--color-border-default, var(--border-blue));
  border-radius: 0;
  box-shadow: none;
}

@media (max-width: 850px) {
  .upload-stage { gap: 16px; }
  .upload-page-header { align-items: flex-start; }
  .upload-page-copy h1 { font-size: clamp(1.8rem, 8vw, 2.5rem); }
  .upload-source-workspace { padding: 14px; border-radius: 16px; }
  .drop-zone { min-height: 210px; padding: 26px 18px; }
  .multi-link-adder { grid-template-columns: 1fr; }
  .multi-link-add-btn { width: 100%; }
}
```

Remove the obsolete `.companion-launch-row`, `.companion-launch-btn`, upload-specific `.brand-pill`, `.upload-guidance`, and old hero upload overrides when no other component consumes them. Keep shared `.hero-copy` and `.brand-pill` rules if repository search shows other consumers.

Use semantic tokens for dark mode. Add a narrow dark override only if Chrome inspection shows a hard-coded surface winning specificity.

- [ ] **Step 4: Run the focused visual and theme regressions**

Run:

```bash
node frontend/tests/upload-stage-clarity-regression.mjs
node frontend/tests/ai-learning-companion-shell-regression.mjs
node frontend/tests/account-menu-regression.mjs
node frontend/tests/theme-system-regression.mjs
node frontend/tests/workspace-nav-responsive-regression.mjs
```

Expected: all five suites PASS.

- [ ] **Step 5: Commit the responsive styling**

```bash
git add frontend/styles/01-section.css frontend/styles/04-section.css frontend/tests/upload-stage-clarity-regression.mjs
git commit -m "style: clarify upload source workspace"
```

### Task 3: Verify production behavior and usability in Chrome

**Files:**
- Create: `docs/qa/2026-08-04-upload-page-clarity-chrome-qa.md`
- Modify only for defects found during QA: `frontend/src/react/components/UploadStage.js`, `frontend/styles/01-section.css`, `frontend/styles/04-section.css`, `frontend/tests/upload-stage-clarity-regression.mjs`

**Interfaces:**
- Consumes: complete upload page from Tasks 1 and 2.
- Produces: production build evidence and a Chrome QA record covering empty, interactive, responsive, and theme states.

- [ ] **Step 1: Run the complete focused verification set**

Run:

```bash
node frontend/tests/upload-stage-clarity-regression.mjs
node frontend/tests/upload-stage-form-regression.mjs
node frontend/tests/user-feedback-regression.mjs
node frontend/tests/companion-history-regression.mjs
node frontend/tests/ai-learning-companion-shell-regression.mjs
node frontend/tests/account-menu-regression.mjs
node frontend/tests/theme-system-regression.mjs
npm run build
git diff --check
```

Expected: all focused suites and production build PASS, with no diff whitespace errors.

- [ ] **Step 2: Start the production preview and inspect the initial desktop state in Chrome**

Run the backend only if the page requires it for initialization, then run the production preview on an available local port. In Chrome at approximately 1440x900:

- confirm the first visible heading is `Add study materials`;
- confirm no page-content `AI Academic Tutor`, duplicate `Materials`, `Study Smarter`, or tutor CTA exists;
- confirm the drop zone and `Select files` are visible without scrolling;
- confirm only `Select files` reads as the primary action above the fold;
- confirm spacing is left aligned and visually connected to the upload workspace;
- capture a screenshot.

- [ ] **Step 3: Exercise functionality and accessibility**

In Chrome:

- click the drop zone and confirm the native picker is requested, then cancel it;
- click `Select files` and confirm the same picker behavior, then cancel it;
- keyboard-tab to the drop zone and verify the focus ring;
- enter a representative URL in `linkInput`, click Add, and confirm the link preview or validation feedback;
- type representative notes into `sourceInput` and confirm input contrast and resizing remain usable;
- inspect language, prompt mode, study depth, and the final `Analyze with Synapse` action;
- confirm no newly introduced console error uses `UploadStage`, the new class names, or the current production bundle.

- [ ] **Step 4: Exercise mobile and dark-mode layouts**

At approximately 390x844:

- confirm the page is one column with no horizontal overflow;
- confirm heading and buttons do not wrap awkwardly;
- confirm link controls stack and remain fully operable;
- confirm settings and final action remain readable.

In dark mode at desktop and mobile widths:

- confirm surfaces remain within one dark theme family;
- confirm headings, helper text, placeholders, borders, focus rings, and buttons maintain clear contrast;
- capture the final dark-mode screenshot.

- [ ] **Step 5: Record QA feedback and fixes**

Create `docs/qa/2026-08-04-upload-page-clarity-chrome-qa.md`. Include the fixed title `Upload Page Clarity Chrome QA`, the date and local production-preview environment, and four evidence sections: desktop empty state, interaction and keyboard pass, mobile and dark-mode pass, and automated verification. For every Chrome finding, record the visible symptom, the exact code fix, and the observed retest outcome. List each executed command and its exit result. Do not use empty bullets or generic pass statements.

- [ ] **Step 6: Rebuild and rerun changed tests after any Chrome fix**

Run the Step 1 command set again after the last UI change. Expected: all focused tests and build PASS.

- [ ] **Step 7: Commit verified implementation and QA evidence**

```bash
git add frontend/src/react/components/UploadStage.js frontend/styles/01-section.css frontend/styles/04-section.css frontend/tests/upload-stage-clarity-regression.mjs docs/qa/2026-08-04-upload-page-clarity-chrome-qa.md
git commit -m "test: verify clearer upload workspace"
```
