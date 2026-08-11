# Synapse Study Feedback Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase Synapse aesthetics and interaction quality in place through animated flashcard content, semantic quiz feedback, honest AI waiting, in-place loading/empty feedback, and a cohesive confirmation layer.

**Architecture:** Keep the existing component hierarchy, dimensions, placement, Zustand study state, Radix controls, native buttons, legacy controller actions, and product logic intact. Add one small pure feedback model for deterministic state labels, a shared toast layer, and focused CSS/Motion/WAAPI choreography on the existing elements. Motion communicates state in 150–250 ms; reduced motion uses instant state changes or a short opacity crossfade.

**Tech Stack:** React 18, Motion 12, Zustand 5, Lucide React, CSS, Web Animations API, Node ESM regression tests, Vite.

**Completion status (2026-08-11):** Implemented and verified across study feedback, Focus controls, landing ports, and legacy workspace polish. The user's later structure lock superseded early draft ideas that proposed new skeleton/card-face/empty-state layouts; those effects were implemented on the existing nodes instead. No component hierarchy, control order, footprint, or placement was redesigned.

## Global Constraints

- Lock each existing component's structure, footprint, control order, and placement; this is a skin-and-motion upgrade, not a redesign.
- Use the Synapse blue palette throughout. Focus Room retains its glass design pattern but replaces the legacy cream/yellow accent pass with blue-tinted glass and blue controls.
- Preserve Synapse's cinematic, intelligent, calm identity.
- Preserve all routing, authentication, billing, API, database, timer, quiz, and flashcard logic.
- Use existing semantic tokens and dependencies; add no Chakra UI, `react-icons`, `ogl`, `maath`, or new animation library.
- Keep native button, textarea, Radix, keyboard, focus-ring, and ARIA semantics.
- Every new animation must have a `prefers-reduced-motion` or `useReducedMotion` alternative.
- Do not touch the already-modified auth, billing, pricing, or HTML files.
- Do not add continuous shaders, custom cursors, full-screen particles, bounce, or elastic easing.

---

### Task 1: Deterministic study-feedback model

**Files:**
- Create: `frontend/src/focus-room/studyFeedback.js`
- Create: `frontend/tests/focus-room-study-feedback-regression.mjs`

**Interfaces:**
- Produces: `quizChoiceState(question, answer, checked, choiceIndex) -> "idle" | "selected" | "correct" | "incorrect" | "muted"`
- Produces: `quizResultCopy(checked) -> { tone, title, detail }`
- Produces: `normalizeStudyToast(input, now) -> { id, tone, title, message } | null`
- Produces: `reduceStudyToasts(queue, action) -> toast[]`, deduplicated and capped at three.

- [ ] **Step 1: Write the failing model test**

  Cover unchecked selection, known correct answer, selected wrong answer, unknown-answer review state, invalid toast input, duplicate toast replacement, explicit dismissal, and the three-toast cap using hand-derived literal expectations.

- [ ] **Step 2: Run the test and verify RED**

  Run: `node frontend/tests/focus-room-study-feedback-regression.mjs`

  Expected: failure because `studyFeedback.js` does not exist.

- [ ] **Step 3: Implement the pure model**

  Reuse `correctOptionIndexes` and `quizAnswerMatchesChoice` from `utils.js`. Keep the module DOM-free so Node can test real behavior.

- [ ] **Step 4: Run the test and verify GREEN**

  Run: `node frontend/tests/focus-room-study-feedback-regression.mjs`

  Expected: `focus room study feedback regression passed`.

### Task 2: Shared React feedback primitives

**Files:**
- Create: `frontend/src/focus-room/hooks/useStudyFeedbackStore.js`
- Create: `frontend/src/focus-room/components/StudyFeedback.jsx`
- Modify: `frontend/styles/09-focus-room.css`
- Modify: `frontend/tests/focus-room-study-tools-regression.mjs`

**Interfaces:**
- Produces: `useStudyFeedbackStore`, with `pushToast(input)` and `dismissToast(id)`.
- Produces: `StudySkeleton({ variant, label })` for text, card, and material layouts.
- Produces: `StudyEmptyState({ icon, title, description, action })`.
- Produces: `PendingStudyStatus({ label })` with stable status text and decorative dots.
- Produces: `StudyToastViewport()` with polite status semantics, dismissal, and timeout cleanup.

- [ ] **Step 1: Extend the regression test before component code**

  Assert the Focus Room study suite imports and mounts the new feedback primitives and that the stylesheet contains reduced-motion handling for their named animation classes.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `node frontend/tests/focus-room-study-tools-regression.mjs`

  Expected: failure because the feedback component and stylesheet hooks are absent.

- [ ] **Step 3: Implement primitives and their visual system**

  Use Motion only for bounded enter/exit transitions. Skeletons keep visible static shapes before animation, empty-state icons use Lucide, toasts cap at three, errors remain until dismissal or seven seconds, and other notices dismiss after 4.2 seconds.

- [ ] **Step 4: Run the focused test and verify GREEN**

  Run: `node frontend/tests/focus-room-study-tools-regression.mjs`

### Task 3: Signature physical flashcard interaction

**Files:**
- Modify: `frontend/src/focus-room/components/FlashcardStudyMode.jsx`
- Modify: `frontend/styles/09-focus-room.css`
- Modify: `frontend/src/legacy/controller_sections/06_deleteflashcarddeck.js`
- Modify: `frontend/styles/07-section.css`
- Modify: `frontend/tests/focus-room-study-tools-regression.mjs`

**Interfaces:**
- Consumes: `useStudyFeedbackStore.pushToast` for the deck-complete milestone.
- Produces: a native-button two-face reveal with visible-face-only accessibility.
- Produces: a legacy WAAPI half-turn that swaps content at the midpoint and falls back instantly under reduced motion.

- [ ] **Step 1: Add failing assertions for the required contracts**

  Assert the Focus implementation has a button-accessible reveal, `aria-live` status, `useReducedMotion`, and front/back faces; assert legacy animation is guarded by `prefers-reduced-motion` and preserves `flipFlashcard` activity recording.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `node frontend/tests/focus-room-study-tools-regression.mjs`

- [ ] **Step 3: Implement Focus Room flip choreography**

  Animate the card shell from `rotateY(0deg)` to `rotateY(180deg)` over 360 ms with quint/expo deceleration, expose only the active face, reveal grading only on the answer side, preserve Previous/Next/rating logic, and announce `Answer shown` or `Prompt shown` once.

- [ ] **Step 4: Implement legacy half-turn choreography**

  Animate the current `.flashcard-stage` to 90 degrees, toggle and rerender, then animate the replacement from -90 degrees to zero. Preserve focus on the replacement stage and use instant rerender under reduced motion.

- [ ] **Step 5: Run the focused test and verify GREEN**

  Run: `node frontend/tests/focus-room-study-tools-regression.mjs`

### Task 4: Semantic quiz-result choreography

**Files:**
- Modify: `frontend/src/focus-room/components/QuizStudyMode.jsx`
- Modify: `frontend/styles/09-focus-room.css`
- Modify: `frontend/src/legacy/controller_sections/05_persistcurrentquiztohistory.js`
- Modify: `frontend/styles/06-section.css`
- Modify: `frontend/tests/focus-room-study-tools-regression.mjs`

**Interfaces:**
- Consumes: `quizChoiceState` and `quizResultCopy`.
- Produces: visible selected/correct/incorrect/muted option states, final-value score motion, and a polite inline result status.
- Produces: matching legacy option-state classes on reveal/report without changing grading.

- [ ] **Step 1: Add failing component and legacy contract assertions**

  Assert status semantics, icon-plus-copy feedback, quiz state class hooks, and reduced-motion support.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `node frontend/tests/focus-room-study-tools-regression.mjs`

- [ ] **Step 3: Implement Focus Room result states**

  Use 180–220 ms color/border transitions, a restrained check scale for correct answers, and a single 2 px horizontal correction for wrong selected answers. Disable answer changes after checking only where existing product logic already treats the result as final; otherwise keep the current behavior.

- [ ] **Step 4: Implement legacy result states**

  Derive option classes from `gradeQuestion`, selected answers, and `quizRevealedAnswers`; animate only newly revealed feedback and reports. Preserve Bootstrap inputs, labels, report content, and all grading functions.

- [ ] **Step 5: Run the focused test and verify GREEN**

  Run: `node frontend/tests/focus-room-study-tools-regression.mjs`

### Task 5: Honest AI presence, skeletons, actionable empty states, and toasts

**Files:**
- Modify: `frontend/src/focus-room/components/AIStudyChat.jsx`
- Modify: `frontend/src/focus-room/components/FocusMaterialContent.jsx`
- Modify: `frontend/src/focus-room/components/FocusRoomToolPanel.jsx`
- Modify: `frontend/src/focus-room/components/StudyHistoryPanel.jsx`
- Modify: `frontend/src/legacy/controller.js`
- Modify: `frontend/styles/04-section.css`
- Modify: `frontend/styles/09-focus-room.css`
- Modify: `frontend/tests/focus-room-study-tools-regression.mjs`

**Interfaces:**
- Consumes: all Task 2 primitives.
- Produces: stable `Synapse is thinking` status with `aria-busy` on chat history.
- Produces: one-time entrance motion for newly inserted chat messages.
- Produces: material skeletons and recovery-oriented empty states.
- Produces: a polished, deduplicated legacy notice layer with the same timing/tone vocabulary.

- [ ] **Step 1: Add failing assertions for pending, loading, empty, and notice contracts**

  Assert `aria-busy`, stable status copy, shared skeleton/empty-state usage, toast viewport mounting, notice deduplication, and reduced-motion CSS.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `node frontend/tests/focus-room-study-tools-regression.mjs`

- [ ] **Step 3: Implement AI and material state feedback**

  Replace `Thinking...`; animate only the new message node; render material skeletons during loading; add descriptive empty-state title, explanation, and workspace CTA where an action exists.

- [ ] **Step 4: Upgrade and align the legacy notice layer**

  Deduplicate identical live notices, cap the host at three, use semantic close text/icon treatment, animate entry and exit with transform/opacity, and retain the current success/error durations.

- [ ] **Step 5: Run the focused test and verify GREEN**

  Run: `node frontend/tests/focus-room-study-tools-regression.mjs`

### Task 6: Full verification and rendered QA

**Files:**
- Modify only files required by fixes discovered during verification.
- Save temporary screenshots outside the repository.

**Interfaces:**
- Produces: passing focused regressions, Focus Room suite regressions, frontend suite, production build, and rendered evidence.

- [ ] **Step 1: Run focused and Focus Room regression suites**

  Run:

  ```bash
  node frontend/tests/focus-room-study-feedback-regression.mjs
  node frontend/tests/focus-room-study-tools-regression.mjs
  npm run test:focus-room
  ```

- [ ] **Step 2: Run the frontend regression suite**

  Run: `npm run test:frontend`

- [ ] **Step 3: Run the production build**

  Run: `npm run build`

- [ ] **Step 4: Validate rendered interactions in the Browser plugin**

  Flow: Focus study suite opens -> flashcard reveals and grades -> quiz answer shows semantic result -> AI request shows accessible pending state -> loading/empty states render -> toast appears and dismisses.

  Check desktop and mobile, page identity, meaningful DOM, no framework overlay, relevant console errors/warnings, screenshots, keyboard focus, and reduced motion.

- [ ] **Step 5: Review the final diff against the approved audit**

  Confirm there are no dependency additions, no changed product logic, no unrelated auth/billing edits, and no unbounded or continuous animation.

### Task 7: Upgrade the existing landing React Bits ports in place

**Files:**
- Modify: `frontend/src/landing/components/react-bits/BorderGlow.jsx`
- Modify: `frontend/src/landing/components/react-bits/GlassSurface.jsx`
- Modify: `frontend/src/landing/components/react-bits/MagicBento.jsx`
- Modify: `frontend/src/landing/components/react-bits/SpotlightCard.jsx`
- Modify: `frontend/src/landing/landing.css`
- Create: `frontend/tests/landing-react-bits-interaction-regression.mjs`

- [ ] Add pointer-aware blue specular lighting to the existing nodes only.
- [ ] Preserve every component tag, child wrapper, grid rule, radius, padding, and footprint.
- [ ] Forward consumer event handlers and reset visual variables on pointer exit.
- [ ] Disable transforms and moving highlights under reduced motion.

### Task 8: Make existing Focus Room controls tactile without re-layout

**Files:**
- Modify: `frontend/src/focus-room/components/SceneCard.jsx`
- Modify: `frontend/src/focus-room/components/BottomControlDock.jsx`
- Modify: `frontend/src/focus-room/components/SoundControlPanel.jsx`
- Modify: `frontend/styles/09-focus-room.css`
- Create: `frontend/tests/focus-room-control-motion-regression.mjs`

- [ ] Add bounded pointer light/tilt to the existing SceneCard button.
- [ ] Add cursor-aware blue refraction to the existing dock node without proximity resizing.
- [ ] Skin the existing Radix slider with blue range, spring-like press feedback, and the existing value.
- [ ] Preserve exact control structure, order, dimensions, and placement.

### Task 9: Cohere the legacy workspace through CSS-only tactile polish

**Files:**
- Modify: `frontend/styles/04-section.css`
- Create: `frontend/tests/workspace-in-place-polish-regression.mjs`

- [ ] Upgrade existing tool pills and history rows with blue focus, hover, press, and presence feedback.
- [ ] Keep Bootstrap/legacy DOM, panel display logic, spacing, sizes, and placement unchanged.
- [ ] Retain the existing active blue gradient and semantic focus behavior.
- [ ] Add reduced-motion fallbacks and verify no new accent family appears.
