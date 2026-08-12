# Controller Live QA and Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the full authenticated Synapse learning journey in production, repair proven defects without visual-structure drift, and harden validated security weaknesses.

**Architecture:** Use a controller-authenticated browser session as the primary evidence source, with public health endpoints and Supabase as integration checks. Treat each product surface as a separate test boundary; after any failure, add a targeted regression first, apply the smallest repair, then replay the exact live interaction. Keep test data in the controller account and preserve all existing layout, blue palette, and liquid-glass patterns.

**Tech Stack:** Static/Vite frontend, React Focus Room, legacy workspace JavaScript, FastAPI backend on Render, Express data API, Supabase Auth/Postgres, browser automation, Node/Python test suites, jCodeMunch, CodeRabbit, Codex Security.

## Global Constraints

- Use `jcodemunch-mcp` for code discovery; read a source file only immediately before editing it.
- Never persist, print, commit, screenshot, or log the supplied controller password or access token.
- Test records stay in the controller account; never delete existing production data.
- Never invoke payment checkout, password reset, account deletion, or other destructive administrator controls.
- Preserve page structure, positions, sizes, blue palette, and Focus Room liquid-glass design.
- Fix only defects reproduced during this campaign or security findings supported by source evidence.
- Retest desktop and mobile rendering after every UI repair; respect keyboard focus and reduced-motion behavior.

---

### Task 1: Establish a secure, reproducible baseline

**Files:**
- Inspect: `render.yaml`, `frontend/config.js`, `backend/app_sections/01_health.py`, `server/src/app.js`
- Evidence: temporary files under `/tmp/synapse-live-qa/` only

**Interfaces:**
- Consumes: public Render URLs declared in `frontend/config.js`.
- Produces: a baseline health table and browser-test session configuration.

- [ ] **Step 1: Probe public liveness and health endpoints without credentials**

Run:

```bash
curl --fail --silent --show-error https://synapse-ai-backend-idnc.onrender.com/healthz
curl --fail --silent --show-error https://synapse-ai-backend-idnc.onrender.com/health
curl --fail --silent --show-error https://synapse-data-api.onrender.com/health
curl --fail --silent --show-error https://synapse-data-api.onrender.com/health/schema
```

Expected: HTTP 200 responses; provider/configuration status is recorded without secret values.

- [ ] **Step 2: Start the local frontend only if live-site inspection cannot exercise the current branch**

Run:

```bash
PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run dev
```

Expected: Vite listens on `http://127.0.0.1:5175`; do not alter production configuration.

- [ ] **Step 3: Capture baseline browser evidence**

Test flow: login page → meaningful content renders → no framework overlay → browser error/warning log collected → desktop and mobile screenshots recorded outside the repository.

- [ ] **Step 4: Commit only a regression test if Task 1 exposes a code defect**

```bash
git add <targeted-test> <minimal-source-fix>
git commit -m "fix: restore <verified health or startup behavior>"
```

### Task 2: Verify controller authentication, navigation, and account boundaries

**Files:**
- Inspect: `frontend/auth-client.js`, `frontend/login.html`, `frontend/landing-auth.js`, `server/src/middleware/*`, `server/src/routes/admin.js`
- Test: existing authentication and admin regression tests in `frontend/tests/` and `server/tests/`

**Interfaces:**
- Consumes: controller credentials through the rendered login form.
- Produces: authenticated browser session and account-bound data API requests.

- [ ] **Step 1: Authenticate through the rendered email/password form**

Test flow: `login.html` → enter controller email/password in browser fields → submit → authenticated workspace or expected return URL.

Expected: session is held by the product, no password appears in DOM snapshots/console output, and controller-only navigation is available only after sign-in.

- [ ] **Step 2: Exercise visible top-level navigation and account controls**

Verify each visible non-destructive control changes route/panel/state once, then returns to a usable state with Escape/back navigation where offered.

- [ ] **Step 3: Capture an authentication failure regression before repairing any failure**

Create a test in the existing closest suite asserting the observed error contract. Run it before changing source:

```bash
PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  node frontend/tests/<closest-auth-regression>.mjs
```

Expected: FAIL because the verified behavior is missing or incorrect.

- [ ] **Step 4: Make the smallest repair and replay sign-in in browser**

Expected: targeted regression and live sign-in pass; existing visual arrangement is unchanged.

- [ ] **Step 5: Commit each independently verified auth repair**

```bash
git add frontend/tests/<closest-auth-regression>.mjs frontend/<changed-source>
git commit -m "fix: restore controller authentication flow"
```

### Task 3: Test content generation, Tutor AI, and internet research

**Files:**
- Inspect: `frontend/src/legacy/controller_sections/01_uploadedfiles.js`, `frontend/src/legacy/controller_sections/08_extractrealtimeresponsetranscript.js`, `backend/app_sections/05_analyze.py`, `backend/app_sections/14_learning_companion.py`
- Test: `frontend/tests/ai-generation-diagnostics-regression.mjs`, `frontend/tests/gemini-tutor-provider-regression.mjs`, relevant `backend/tests/test_*analysis*.py`

**Interfaces:**
- Consumes: a clearly labelled, non-sensitive test source entered via visible UI.
- Produces: generated study content, Tutor exchange, research output, and persisted history.

- [ ] **Step 1: Create one labelled test material through the UI**

Use a short, public-domain factual source such as a paragraph about photosynthesis. Label the material `QA — controller live test — <date>`.

Expected: upload/paste state progresses from idle to ready without clipping, unexplained wait, or console error.

- [ ] **Step 2: Generate study content from that material**

Test flow: ready material → generate → progress/skeleton → completed notes with source-grounded content and available study actions.

Expected: only one generation is submitted for one click; retry feedback is usable if a provider fails.

- [ ] **Step 3: Send one grounded Tutor AI question through the right-side panel**

Question: `Using this material, explain the central mechanism in two sentences and name the source detail you used.`

Expected: user message, pending state, assistant response, and conversation persistence are visible; a provider failure presents actionable status rather than a silent/blank panel.

- [ ] **Step 4: Run visible internet-research action with a bounded query**

Query: `photosynthesis light-dependent reactions primary source`.

Expected: research request stays scoped to the user action, result/loading state is clear, and any source attribution/links remain usable.

- [ ] **Step 5: Test-fix any reproduced generation/Tutor/research defect**

Create the closest focused regression, verify red, repair minimally, rerun the regression plus the live flow, and commit:

```bash
git add <targeted-regression> <minimal-source-fix>
git commit -m "fix: restore <generation-or-tutor-behavior>"
```

### Task 4: Test study tools, quiz feedback, and adaptive companion

**Files:**
- Inspect: `frontend/src/focus-room/components/FlashcardStudyMode.jsx`, `frontend/src/focus-room/components/QuizStudyMode.jsx`, `frontend/src/focus-room/components/AIStudyChat.jsx`, `backend/app_sections/14_learning_companion.py`
- Test: `frontend/tests/focus-room-study-tools-regression.mjs`, `frontend/tests/focus-room-study-feedback-regression.mjs`, `frontend/tests/ai-learning-companion-shell-regression.mjs`

**Interfaces:**
- Consumes: generated test material from Task 3.
- Produces: flashcard progression, quiz grading/review, companion response, and persisted learning evidence.

- [ ] **Step 1: Exercise flashcard controls and progress**

Test flow: open flashcards → reveal answer → rate/advance → return/back where available.

Expected: prompt and answer remain readable on desktop/mobile, progress changes once per action, keyboard focus is visible, and reduced motion has a stable fallback.

- [ ] **Step 2: Exercise quiz answer, grading, review, and answer change paths**

Test one correct, one incorrect, and one unanswered/review-only case. Change an answer after review if UI permits.

Expected: correct/incorrect/neutral states are visually distinct, score/review state never contradicts selected answer, and completion feedback is clear.

- [ ] **Step 3: Exercise Study Companion guidance**

Ask the companion for the next best recall exercise based on the generated material.

Expected: response appears in the appropriate panel, remains material-aware, and does not block unrelated study controls.

- [ ] **Step 4: Repair verified tool or companion defects test-first**

Run the closest existing tool regression as the red/green loop, add a focused assertion only for the reproduced behavior, replay browser interaction, and commit each independently valid repair.

### Task 5: Test Focus Room and cross-device Focus Trail persistence

**Files:**
- Inspect: `frontend/src/focus-room/components/FocusRoomPage.jsx`, `frontend/src/focus-room/components/FocusRoomDrawers.jsx`, `frontend/src/focus-room/hooks/useFocusRoomStore.js`, `frontend/src/focus-room/data.js`, `server/src/repositories/focusSessionsRepository.js`
- Test: `frontend/tests/focus-trail-regression.mjs`, `frontend/tests/focus-room-*.mjs`, `server/tests/focus-trail-persistence.test.js`

**Interfaces:**
- Consumes: authenticated controller session and current Focus Room scene selection.
- Produces: active/completed `focus_sessions` records with `focus_trail_date` and `focus_timezone`.

- [ ] **Step 1: Enter Focus Room and test its visible controls**

Test setup scene selection, duration, sound/mix controls, Focus Trail drawer, Companion drawer, settings, entry button, timer start/pause/reset/end, and Escape behavior.

Expected: each action has visible feedback, buttons preserve blue transparent glass treatment, no component moves or resizes unexpectedly, and background remains visible through the dock.

- [ ] **Step 2: Verify Focus Trail after entry and after session end**

Expected: the 30-day trail records today when entering the room, shows status/streak/time correctly, and the final session updates rather than duplicates its entry.

- [ ] **Step 3: Verify light, dark, mobile, and reduced-motion presentation**

Expected: dark mode remains blue glass; light mode becomes transparent white liquid glass with blue active accents; reduced motion removes nonessential movement without losing state feedback.

- [ ] **Step 4: Validate persisted record with authenticated service path**

Expected: a session returned from `/api/focus-sessions` contains `focusTrailDate` and `focusTimezone`; do not query or alter other users’ rows.

- [ ] **Step 5: Repair any Focus Room defect with focused tests and live replay**

```bash
PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run test:focus-room
```

Expected: focused suite passes before and after the browser replay; commit each repair separately.

### Task 6: Conduct source-backed security audit and harden verified issues

**Files:**
- Inspect: repository-wide product source, `render.yaml`, `.gitignore`, `frontend/auth-client.js`, `server/src/`, `backend/`, `server/src/db/`
- Test: security scan artifacts, targeted regression suites, dependency audits

**Interfaces:**
- Consumes: source code and deployed configuration evidence.
- Produces: validated security findings, minimal remediations, and verification evidence.

- [ ] **Step 1: Run the repository-wide Codex Security standard scan**

Expected: source-backed findings with severity, attacker path, impacted files, counterevidence, and remediation. Do not treat a static suspicion as a vulnerability without a reachable path.

- [ ] **Step 2: Triage findings by user impact and fix only validated vulnerabilities**

Prioritize authentication/session leakage, controller authorization, Supabase RLS/data exposure, uploads, CORS/headers, open redirects, secrets, and denial-of-service controls. Do not weaken auth or RLS to make a test pass.

- [ ] **Step 3: Write a failing security regression for each repairable finding**

Use the closest existing Node/Python suite, such as `server/tests/app-security.test.js` or a targeted `backend/tests/test_*.py`, and assert the unsafe path is rejected before implementation.

- [ ] **Step 4: Apply narrow remediation and validate the original live flow**

Expected: security regression passes, affected functional flow still passes, no secrets appear in health responses/logs, and no layout/style changes are introduced.

- [ ] **Step 5: Run dependency and deployment checks**

```bash
PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm audit --omit=dev
PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm --dir server audit --omit=dev
.venv/bin/python -m pip check
```

- [ ] **Step 6: Commit each security repair separately**

```bash
git add <security-test> <minimal-security-fix>
git commit -m "fix: harden <validated-boundary>"
```

### Task 7: Final regression, review, and delivery

**Files:**
- Inspect: all changed source and test files
- Evidence: temporary screenshots and browser logs under `/tmp/synapse-live-qa/`

**Interfaces:**
- Consumes: all task evidence and targeted repairs.
- Produces: a final QA result, security report, and merge-ready change set.

- [ ] **Step 1: Run complete automated regression suites**

```bash
PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run test:frontend
ln -s /Users/zhenghui/Desktop/Synapse-ai-study-assistant/server/node_modules server/node_modules
PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test server/tests/*.test.js
rm server/node_modules
.venv/bin/python -m unittest discover -s backend/tests -v
```

Expected: all suites pass, or each external/provider-related exception is explicitly identified and reproduced.

- [ ] **Step 2: Build production assets and replay repaired browser flows**

```bash
PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run build
```

Expected: build succeeds; repaired UI behavior is verified in desktop and mobile browser sessions with no relevant console errors.

- [ ] **Step 3: Request CodeRabbit review of the final diff**

```bash
coderabbit review --agent -t uncommitted
```

Expected: resolve every Critical or Important issue before completion; report exact service failure if CodeRabbit itself is unavailable.

- [ ] **Step 4: Produce a concise QA handoff**

Include coverage table, live-pass/fail results, screenshots, retained test-data identifiers, fixes/commits, Render/Supabase health, security scan/remediations, and clearly scoped residual risks.
