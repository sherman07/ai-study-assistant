# Adaptive Companion Tool Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a teaching-first Learning Companion that independently evaluates readiness for every study function, directly launches real in-chat activities without setup screens, and uses activity results to adapt later teaching and tool availability.

**Architecture:** A shared registry defines each function's evidence, source, launch, renderer, and feedback contract. The tutor model proposes evidence and candidate actions, deterministic backend and frontend policy validators enforce prerequisites, and a versioned local thread stores readiness, pending intent, launch transactions, artifacts, and progress. Existing Materials endpoints and domain behavior power quiz, flashcards, broadcast, timeline, and visual generation; structured Companion endpoints and renderers provide first-class teach-back, revision-note, mind-map, and exam-readiness artifacts.

**Tech Stack:** React 18 using the repository's `h()` runtime, browser ES modules, versioned localStorage, FastAPI/Python, existing Synapse generation endpoints, Node regression scripts, Python `unittest`, Vite, and the in-app Browser plugin.

## Global Constraints

- No study-function buttons, function-labelled starter cards, disabled tool teasers, or permanent tool dock may appear in a fresh Companion.
- Readiness is per function; no global mastery threshold, conversation-exists shortcut, or keyword-only unlock is allowed.
- Locked functions are absent. Eligible functions are limited to the smallest useful set, normally one and never more than three.
- An explicit function request auto-launches only after deterministic prerequisites pass; otherwise Synapse teaches or asks one diagnostic question and preserves the pending intent.
- Quiz and Flashcards are each one learner-facing action; Materials source selection is an internal, honest launch strategy rather than a duplicate button.
- Companion must bypass all generation/settings landing screens and render the real activity itself.
- Conversation, Materials, and hybrid source strategies must remain explicit and may never silently substitute for one another.
- Activity results must update bounded learning evidence and later readiness.
- Retry must be function-specific, idempotent, non-destructive, and safe against late responses after New chat.
- Existing user changes in `frontend/src/focus-room/data.js`, `frontend/tests/focus-room-audio-regression.mjs`, `server/src/config.js`, and `server/tests/auth-config.test.js` are out of scope and must remain untouched.
- Do not merge the full `origin/cursor/companion-ai-study-tools-8ad9` branch. It contains unrelated security, Focus Room, and workspace commits. Port only the relevant behavior from `fabd325`, `96dfae6`, `020364b`, and `a89bfda`, and correct the rejected behavior while doing so.
- No new runtime dependency is permitted.

---

## File map

### New production files

- `frontend/src/legacy/companionToolRegistry.js` — canonical frontend tool catalog, readiness prerequisites, source capabilities, default configurations, and explicit-intent aliases.
- `frontend/src/legacy/companionReadiness.js` — pure evidence normalization, readiness reduction, visible-action selection, pending-intent resolution, and launch-plan creation.
- `frontend/src/legacy/companionPracticeClient.js` — request adapters for quiz, flashcards, broadcast, timeline, visual guide, and structured Companion artifacts.
- `frontend/src/legacy/companionArtifactState.js` — pure artifact/progress normalization and event-to-evidence reduction.
- `frontend/src/react/components/companion/CompanionArtifacts.js` — artifact dispatcher and shared status/source/error chrome.
- `frontend/src/react/components/companion/CompanionQuiz.js` — one-question-at-a-time quiz with Materials-compatible grading behavior.
- `frontend/src/react/components/companion/CompanionFlashcards.js` — persistent deck with flip/navigation and Again/Hard/Good/Easy ratings.
- `frontend/src/react/components/companion/CompanionLearningArtifacts.js` — teach-back, revision-note, path/timeline, mind-map, visual-guide, readiness-report, broadcast, and focus-session renderers.

### Existing production files to modify

- `backend/core/learning_companion.py` — server-owned evidence/readiness registry, normalizers, candidate validation, and prompt contract.
- `backend/app_sections/14_learning_companion.py` — return validated readiness/launch output and expose structured artifact generation/grading.
- `frontend/src/legacy/learningCompanionChatStore.js` — schema v3 persistence for evidence, readiness, pending intent, launch transaction, artifacts, and progress.
- `frontend/src/legacy/learningCompanionClient.js` — send learning/activity state and normalize the expanded tutor contract.
- `frontend/src/react/components/CompanionWorkspace.js` — orchestration only: teaching chat, contextual actions, direct launch, persistence, retry, and New chat race protection.
- `frontend/src/react/components/AppShell.js` — update Companion module cache version only if required by the build.
- `frontend/src/legacy/controller_sections/14_learningcompanion.js` — keep mode activation/history wiring compatible with restored Companion threads.
- `frontend/index.html` — update cache-bust values only for changed browser modules/styles.
- `frontend/styles/01-section.css` — Companion layout and artifact styles, with no empty dock or first-screen tool cards.

### Tests to create or expand

- `backend/tests/test_learning_companion.py`
- `backend/tests/test_learning_companion_contract.py`
- `frontend/tests/learning-companion-chat-store.mjs`
- `frontend/tests/companion-readiness-regression.mjs`
- `frontend/tests/companion-artifact-state-regression.mjs`
- `frontend/tests/companion-practice-client-regression.mjs`
- `frontend/tests/companion-workspace-policy-regression.mjs`
- `frontend/tests/companion-practice-chrome.mjs`
- Existing `frontend/tests/ai-learning-companion-shell-regression.mjs` and `frontend/tests/companion-chat-ux-regression.mjs`

---

### Task 1: Establish the rich chat baseline without premature tools

**Files:**
- Modify: `frontend/src/react/components/CompanionWorkspace.js`
- Modify: `frontend/styles/01-section.css`
- Modify: `frontend/tests/ai-learning-companion-shell-regression.mjs`
- Test: `frontend/tests/companion-chat-ux-regression.mjs`

**Interfaces:**
- Consumes: current `loadLearningCompanionThread`, `saveLearningCompanionThread`, and `requestLearningCompanionDecision` exports.
- Produces: a full-height conversation surface with `data-learning-companion-send`, `data-learning-companion-new-chat`, `data-learning-companion-retry`, and no study-function entry controls.

- [ ] **Step 1: Write the failing shell regression**

Add assertions that ban both current and remote-branch premature controls:

```js
assert.ok(!companionWorkspace.includes("CONVERSATION_STARTERS"));
assert.ok(!companionWorkspace.includes('label: "Quiz me"'));
assert.ok(!companionWorkspace.includes('label: "Make flashcards"'));
assert.ok(!companionWorkspace.includes("data-learning-companion-starter"));
assert.ok(!companionWorkspace.includes("data-learning-companion-dock-state"));
assert.ok(!companionWorkspace.includes("Practice tools stay one tap away"));
assert.ok(companionWorkspace.includes("data-learning-companion-send"));
assert.ok(companionWorkspace.includes("data-learning-companion-new-chat"));
```

- [ ] **Step 2: Run the regression and verify RED**

Run: `node frontend/tests/ai-learning-companion-shell-regression.mjs`

Expected: FAIL if the richer remote shell has been ported with starters/dock, or FAIL because required rich-chat structure assertions are not yet present.

- [ ] **Step 3: Port only the accepted rich-chat shell behavior**

Use `git show 96dfae6:frontend/src/react/components/CompanionWorkspace.js` and `git show 020364b:frontend/src/react/components/CompanionWorkspace.js` as references. Bring over readable thread title, auto-scroll, busy indicator, history activation, and responsive compose shell. Do not port `CONVERSATION_STARTERS`, a study dock, tool labels, or prompt-producing practice actions. The empty state must be equivalent to:

```js
const WELCOME_MESSAGE = {
  id: "assistant-welcome",
  role: "assistant",
  content: "Tell me what you want to understand, what is confusing, or what you are working toward. I’ll teach the next useful step and adapt from your attempts.",
};

const visibleMessages = thread.messages.length ? thread.messages : [WELCOME_MESSAGE];
```

- [ ] **Step 4: Remove obsolete first-screen styles**

Port only conversation/thread/composer styles. Ensure these selectors do not exist after the edit:

```css
.companion-starter-grid
.companion-starter-card
.companion-study-dock--empty
```

Add a stable first viewport layout:

```css
.companion-chat--adaptive {
  min-height: min(78vh, 900px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
node frontend/tests/ai-learning-companion-shell-regression.mjs
node frontend/tests/companion-chat-ux-regression.mjs
```

Expected: both print their pass messages and exit 0.

- [ ] **Step 6: Commit the isolated baseline**

```bash
git add frontend/src/react/components/CompanionWorkspace.js frontend/styles/01-section.css frontend/tests/ai-learning-companion-shell-regression.mjs frontend/tests/companion-chat-ux-regression.mjs
git commit -m "refactor(companion): establish teaching-first chat shell"
```

---

### Task 2: Add versioned evidence, readiness, transaction, and artifact persistence

**Files:**
- Modify: `frontend/src/legacy/learningCompanionChatStore.js`
- Modify: `frontend/tests/learning-companion-chat-store.mjs`

**Interfaces:**
- Consumes: v1/v2 stored threads.
- Produces: `THREAD_VERSION = 3`; `updateLearningCompanionThreadState(thread, patch, options)`; normalized `learningEvidence`, `toolReadiness`, `pendingToolIntent`, `launchTransaction`, and `artifacts` fields.

- [ ] **Step 1: Write migration and bounding tests**

Add tests with deterministic clocks and IDs:

```js
const v2 = { version: 2, id: "old", updatedAt: now, messages: [], learningContext: { topic: "Optics" } };
storage.setItem(CHAT_KEY, JSON.stringify(v2));
const migrated = loadLearningCompanionThread(storage);
assert.equal(migrated.version, 3);
assert.deepEqual(migrated.learningEvidence, []);
assert.deepEqual(migrated.toolReadiness, {});
assert.equal(migrated.pendingToolIntent, null);
assert.equal(migrated.launchTransaction, null);
assert.deepEqual(migrated.artifacts, []);

const updated = updateLearningCompanionThreadState(migrated, {
  learningEvidence: [{ type: "topic-identified", topic: "Optics", origin: "conversation", sourceId: "m1" }],
  toolReadiness: { quiz: { toolId: "quiz", status: "eligible", evidence: ["topic-identified"] } },
  pendingToolIntent: { toolId: "quiz", requestedAt: now },
  launchTransaction: { id: "launch-1", threadId: "old", toolId: "quiz", status: "pending" },
  artifacts: [{ id: "artifact-1", kind: "quiz", status: "active", progress: {} }],
}, { now: () => now });
assert.equal(updated.launchTransaction.id, "launch-1");
```

Also assert bounds: at most 48 evidence records, 24 artifacts, known readiness keys only, 4 KB total progress per artifact, and no raw source excerpts.

- [ ] **Step 2: Run storage tests and verify RED**

Run: `node frontend/tests/learning-companion-chat-store.mjs`

Expected: FAIL because schema v3 fields and `updateLearningCompanionThreadState` do not exist.

- [ ] **Step 3: Implement v3 normalizers**

Add focused pure normalizers with these signatures:

```js
const THREAD_VERSION = 3;
const MAX_EVIDENCE = 48;
const MAX_ARTIFACTS = 24;

function normalizeLearningEvidence(value = []) {
  return (Array.isArray(value) ? value : [])
    .filter(item => item && KNOWN_EVIDENCE_TYPES.has(item.type) && KNOWN_EVIDENCE_ORIGINS.has(item.origin))
    .map(item => ({
      type: item.type,
      origin: item.origin,
      topic: normalizeContextText(item.topic, 120) || "",
      sourceId: normalizeContextText(item.sourceId, 120) || "",
      createdAt: normalizeContextText(item.createdAt, 40) || "",
    }))
    .slice(-MAX_EVIDENCE);
}

function normalizeToolReadiness(value = {}) {
  return Object.fromEntries(Object.entries(value || {})
    .filter(([toolId, item]) => KNOWN_TOOL_IDS.has(toolId) && KNOWN_READINESS_STATUSES.has(item?.status))
    .map(([toolId, item]) => [toolId, { toolId, status: item.status, reason: normalizeContextText(item.reason, 160) || "", evidence: normalizeContextArray(item.evidence) || [] }]));
}

function normalizePendingToolIntent(value) {
  return value && KNOWN_TOOL_IDS.has(value.toolId)
    ? { toolId: value.toolId, scope: normalizeContextText(value.scope, 160) || "", requestedAt: normalizeContextText(value.requestedAt, 40) || "" }
    : null;
}

function normalizeLaunchTransaction(value) {
  return value && isNonEmptyString(value.id) && KNOWN_TOOL_IDS.has(value.toolId)
    ? { id: value.id, threadId: String(value.threadId || ""), toolId: value.toolId, status: KNOWN_LAUNCH_STATUSES.has(value.status) ? value.status : "pending", sourceStrategy: value.sourceStrategy || "none", sourceFingerprint: String(value.sourceFingerprint || ""), sourceIds: normalizeContextArray(value.sourceIds) || [], config: normalizeBoundedObject(value.config), attempt: Math.max(1, Number(value.attempt) || 1) }
    : null;
}

function normalizeArtifacts(value = []) {
  return (Array.isArray(value) ? value : []).filter(item => item && isNonEmptyString(item.id) && KNOWN_ARTIFACT_KINDS.has(item.kind)).slice(-MAX_ARTIFACTS).map(item => ({ id: item.id, launchId: String(item.launchId || ""), kind: item.kind, title: String(item.title || "").slice(0, 160), status: KNOWN_ARTIFACT_STATUSES.has(item.status) ? item.status : "active", source: normalizeBoundedObject(item.source), payload: normalizeBoundedObject(item.payload, 24_000), progress: normalizeBoundedObject(item.progress, 4_000) }));
}

export function updateLearningCompanionThreadState(thread, patch = {}, { now = getDefaultNow } = {}) {
  const base = normalizeThread(thread, now);
  return normalizeThread({ ...base, ...patch, updatedAt: now() }, now);
}
```

Migrate v1/v2 by preserving valid messages/context and initializing all v3 fields. New chat initializes clean fields and does not copy readiness or an in-flight transaction.

- [ ] **Step 4: Run storage tests and verify GREEN**

Run: `node frontend/tests/learning-companion-chat-store.mjs`

Expected: all existing and v3 assertions pass.

- [ ] **Step 5: Commit persistence**

```bash
git add frontend/src/legacy/learningCompanionChatStore.js frontend/tests/learning-companion-chat-store.mjs
git commit -m "feat(companion): persist readiness and activity state"
```

---

### Task 3: Build the server-owned evidence and per-function readiness contract

**Files:**
- Modify: `backend/core/learning_companion.py`
- Modify: `backend/app_sections/14_learning_companion.py`
- Modify: `backend/tests/test_learning_companion.py`
- Modify: `backend/tests/test_learning_companion_contract.py`

**Interfaces:**
- Consumes: learner message/history, prior `learning_context`, selected source bundle, and normalized activity evidence.
- Produces: `evidence_updates`, `tool_readiness_updates`, `launch_tool`, `suggested_tools`, and preserved grounding fields from `/learning-companion/respond`.

- [ ] **Step 1: Write failing readiness-policy unit tests**

Cover every registry entry and keyword-only rejection:

```python
def test_keyword_request_does_not_unlock_without_evidence(self):
    result = evaluate_companion_tool_policy(
        proposals=[{"tool_id": "quiz", "status": "eligible", "launch": "auto"}],
        evidence=[], source_bundle={}, pending_intent={"tool_id": "quiz"},
    )
    self.assertEqual(result["tool_readiness"]["quiz"]["status"], "locked")
    self.assertIsNone(result["launch_tool"])

def test_selected_material_can_make_flashcards_eligible(self):
    evidence = [
        {"type": "topic-identified", "origin": "conversation", "source_id": "m1"},
        {"type": "material-context-selected", "origin": "system", "source_id": "notes-1"},
        {"type": "sufficient-content-volume", "origin": "system", "source_id": "notes-1"},
    ]
    result = evaluate_companion_tool_policy(
        proposals=[{"tool_id": "flashcards", "status": "eligible", "source_strategy": "materials"}],
        evidence=evidence,
        source_bundle={"fingerprint": "fp", "sources": [{"id": "notes-1", "title": "Optics", "excerpt": "Refraction changes a ray's direction at a boundary."}]},
        pending_intent=None,
    )
    self.assertEqual(result["suggested_tools"][0]["tool_id"], "flashcards")
```

Add a table-driven test for `quiz`, `flashcards`, `teachback`, `keypoints`, `broadcast`, `mindmap`, `visual_guide`, `study_path`, `exam_readiness`, and `focus_session`, testing one passing and one missing-prerequisite case each. Assert at most three suggestions and one auto-launch.

- [ ] **Step 2: Run backend tests and verify RED**

Run:

```bash
.venv/bin/python -m unittest backend.tests.test_learning_companion backend.tests.test_learning_companion_contract
```

Expected: FAIL because policy functions and expanded contract fields are missing.

- [ ] **Step 3: Implement the server registry and normalizers**

Define exact IDs and policies in `backend/core/learning_companion.py`:

```python
COMPANION_TOOL_POLICIES = {
    "quiz": {"any_sets": (("material-context-selected", "sufficient-content-volume"), ("topic-identified", "content-taught", "learner-attempted")), "sources": {"conversation", "materials", "hybrid"}},
    "flashcards": {"any_sets": (("material-context-selected", "sufficient-content-volume"), ("topic-identified", "content-taught", "sufficient-content-volume")), "sources": {"conversation", "materials", "hybrid"}},
    "teachback": {"any_sets": (("topic-identified", "content-taught"), ("material-context-selected",)), "sources": {"conversation", "materials"}},
    "keypoints": {"any_sets": (("topic-identified", "content-taught"), ("material-context-selected",)), "sources": {"conversation", "materials", "hybrid"}},
    "broadcast": {"any_sets": (("topic-identified", "sufficient-content-volume"), ("material-context-selected", "sufficient-content-volume")), "sources": {"conversation", "materials", "hybrid"}},
    "mindmap": {"any_sets": (("topic-identified", "multi-concept-structure"), ("material-context-selected", "multi-concept-structure")), "sources": {"conversation", "materials", "hybrid"}},
    "visual_guide": {"any_sets": (("material-context-selected", "visual-content-suitable"), ("topic-identified", "visual-content-suitable", "sufficient-content-volume")), "sources": {"conversation", "materials", "hybrid"}},
    "study_path": {"all": ("goal-identified", "multi-concept-structure"), "sources": {"conversation", "materials", "hybrid"}},
    "exam_readiness": {"all": ("assessment-goal", "multi-attempt-evidence"), "sources": {"conversation", "materials", "hybrid", "none"}},
    "focus_session": {"all": ("next-task-identified", "time-constraint-known"), "sources": {"conversation", "materials", "hybrid", "none"}},
}
```

Implement the exported signatures `normalise_companion_evidence(value: object) -> list[dict]`, `normalise_tool_proposals(value: object) -> list[dict]`, and `evaluate_companion_tool_policy(proposals, evidence, source_bundle, pending_intent) -> dict`. The first accepts only the named evidence vocabulary and `conversation | activity | system` origins, bounds text, de-duplicates `(type, source_id)`, and keeps the last 48 records. The second accepts only registry tool IDs, readiness statuses, source strategies, and `suggest | auto` launch modes. The evaluator computes prerequisite satisfaction from normalized evidence, forces invalid entries to `locked`, filters unavailable source strategies, resolves at most one matching pending intent into `launch_tool`, and returns at most three non-auto suggestions.

System-verifiable evidence (`material-context-selected`, content volume, multi-attempt counts) must be derived from actual request data/activity summaries. Model-origin evidence may identify topic/goal/content taught but may not invent activity completion or selected source IDs.

- [ ] **Step 4: Expand the tutor JSON prompt and response normalizer**

Replace the old coarse `suggested_tools` instruction with:

```json
{
  "evidence_updates": [{"type":"content-taught","topic":"Refraction","source_id":"assistant-turn-id","reason":"The response taught Snell's law with a worked example."}],
  "tool_proposals": [{"tool_id":"teachback","status":"eligible","reason":"One concept has been taught","source_strategy":"conversation","launch":"suggest"}]
}
```

The endpoint combines prior evidence, trusted activity evidence, and normalized model evidence, then returns only policy-approved updates. Remove keyword-based soft recovery from `normalise_companion_suggested_tools`.

- [ ] **Step 5: Run backend tests and verify GREEN**

Run:

```bash
.venv/bin/python -m unittest backend.tests.test_learning_companion backend.tests.test_learning_companion_contract
```

Expected: all tests pass with no traceback.

- [ ] **Step 6: Commit backend policy**

```bash
git add backend/core/learning_companion.py backend/app_sections/14_learning_companion.py backend/tests/test_learning_companion.py backend/tests/test_learning_companion_contract.py
git commit -m "feat(companion): validate per-tool learning readiness"
```

---

### Task 4: Implement the frontend registry and deterministic readiness reducer

**Files:**
- Create: `frontend/src/legacy/companionToolRegistry.js`
- Create: `frontend/src/legacy/companionReadiness.js`
- Create: `frontend/tests/companion-readiness-regression.mjs`

**Interfaces:**
- Consumes: normalized thread evidence/readiness, source context, backend proposals, and pending intent.
- Produces: `COMPANION_TOOL_REGISTRY`, `detectCompanionToolIntent(text)`, `reduceCompanionReadiness(input)`, `selectVisibleCompanionTools(readiness)`, and `createCompanionLaunchPlan(input)`.

- [ ] **Step 1: Write failing frontend policy tests**

```js
assert.equal(detectCompanionToolIntent("quiz me on optics")?.toolId, "quiz");
assert.deepEqual(selectVisibleCompanionTools({}), []);

const keywordOnly = reduceCompanionReadiness({
  evidence: [], proposals: [{ toolId: "quiz", status: "eligible" }], pendingIntent: { toolId: "quiz" }, sourceContext: null,
});
assert.equal(keywordOnly.quiz.status, "locked");

const ready = reduceCompanionReadiness({
  evidence: [
    { type: "topic-identified", origin: "conversation", sourceId: "u1" },
    { type: "content-taught", origin: "conversation", sourceId: "a1" },
    { type: "learner-attempted", origin: "conversation", sourceId: "u2" },
  ],
  proposals: [{ toolId: "quiz", status: "eligible", sourceStrategy: "conversation", launch: "auto" }],
  pendingIntent: { toolId: "quiz" }, sourceContext: null,
});
assert.equal(createCompanionLaunchPlan({ readiness: ready, pendingIntent: { toolId: "quiz" }, threadId: "t1" }).toolId, "quiz");
```

Assert the catalog has exactly the ten approved IDs, aliases never create readiness, duplicate suggestions collapse, notes variants are absent, stale eligible records are hidden, and visible tools cap at three.

- [ ] **Step 2: Run test and verify RED**

Run: `node frontend/tests/companion-readiness-regression.mjs`

Expected: module-not-found or missing-export failure.

- [ ] **Step 3: Create the registry**

Each entry must expose the same fields:

```js
export const COMPANION_TOOL_REGISTRY = Object.freeze({
  quiz: Object.freeze({
    id: "quiz", label: "Quiz me", icon: "bi-ui-checks-grid", renderer: "quiz",
    sourceStrategies: ["conversation", "materials", "hybrid"],
    defaultConfig: { totalQuestions: 5, examMode: false },
  }),
  flashcards: Object.freeze({ id: "flashcards", label: "Flashcards", icon: "bi-layers", renderer: "flashcards", sourceStrategies: ["conversation", "materials", "hybrid"], defaultConfig: { cardCount: 6 } }),
  teachback: Object.freeze({ id: "teachback", label: "Teach-back", icon: "bi-chat-square-quote", renderer: "teachback", sourceStrategies: ["conversation", "materials"], defaultConfig: { followUpLimit: 1 } }),
  keypoints: Object.freeze({ id: "keypoints", label: "Key points", icon: "bi-journal-text", renderer: "keypoints", sourceStrategies: ["conversation", "materials", "hybrid"], defaultConfig: { maxPoints: 10 } }),
  broadcast: Object.freeze({ id: "broadcast", label: "AI Broadcast", icon: "bi-broadcast", renderer: "broadcast", sourceStrategies: ["conversation", "materials", "hybrid"], defaultConfig: { lengthMinutes: 8, voiceFormat: "single" } }),
  mindmap: Object.freeze({ id: "mindmap", label: "Mind map", icon: "bi-diagram-3", renderer: "mindmap", sourceStrategies: ["conversation", "materials", "hybrid"], defaultConfig: { maxNodes: 24 } }),
  visual_guide: Object.freeze({ id: "visual_guide", label: "Visual guide", icon: "bi-images", renderer: "visual_guide", sourceStrategies: ["conversation", "materials", "hybrid"], defaultConfig: { maxPanels: 8 } }),
  study_path: Object.freeze({ id: "study_path", label: "Study path", icon: "bi-signpost-split", renderer: "study_path", sourceStrategies: ["conversation", "materials", "hybrid"], defaultConfig: { pace: "balanced" } }),
  exam_readiness: Object.freeze({ id: "exam_readiness", label: "Exam readiness", icon: "bi-repeat", renderer: "exam_readiness", sourceStrategies: ["conversation", "materials", "hybrid", "none"], defaultConfig: { includeLimitations: true } }),
  focus_session: Object.freeze({ id: "focus_session", label: "Focus session", icon: "bi-bullseye", renderer: "focus_session", sourceStrategies: ["conversation", "materials", "hybrid", "none"], defaultConfig: { durationMinutes: 25 } }),
});
```

Use explicit complete objects for all ten tools in the actual file. `quiz_from_notes` and `cards_from_notes` must not be aliases or catalog keys.

- [ ] **Step 4: Implement readiness and launch reduction**

`reduceCompanionReadiness` rechecks all backend-approved records against frontend capabilities and actual source availability. `createCompanionLaunchPlan` returns:

```js
{
  id: crypto.randomUUID(),
  threadId,
  toolId,
  status: "pending",
  sourceStrategy,
  sourceFingerprint,
  sourceIds,
  conversationMessageIds,
  config,
  requestedAt: new Date().toISOString(),
}
```

Return `null` for locked, stale, unsupported, or source-invalid tools.

- [ ] **Step 5: Run policy test and verify GREEN**

Run: `node frontend/tests/companion-readiness-regression.mjs`

Expected: prints `companion readiness regression passed`.

- [ ] **Step 6: Commit registry and reducer**

```bash
git add frontend/src/legacy/companionToolRegistry.js frontend/src/legacy/companionReadiness.js frontend/tests/companion-readiness-regression.mjs
git commit -m "feat(companion): add deterministic tool readiness reducer"
```

---

### Task 5: Add source-frozen, idempotent generation adapters for every function

**Files:**
- Create: `frontend/src/legacy/companionPracticeClient.js`
- Create: `frontend/tests/companion-practice-client-regression.mjs`
- Modify: `backend/app_sections/14_learning_companion.py`
- Modify: `backend/tests/test_learning_companion_contract.py`

**Interfaces:**
- Consumes: a frozen `CompanionLaunchPlan` and context resolver output.
- Produces: `createCompanionPracticeRequester(apiClient).generate(plan, context)` returning `{ kind, title, source, payload }`; `POST /learning-companion/artifact` for teach-back prompt/grading, key points, mind map, and evidence-based readiness reports.

- [ ] **Step 1: Write failing request-shape tests**

Use a fake API client and assert exact routes:

```js
const cases = {
  quiz: "/quiz/generate",
  flashcards: "/flashcards/generate",
  broadcast: "/broadcast/generate",
  study_path: "/timeline/generate",
  visual_guide: "/visual-image-guide/generate",
  teachback: "/learning-companion/artifact",
  keypoints: "/learning-companion/artifact",
  mindmap: "/learning-companion/artifact",
  exam_readiness: "/learning-companion/artifact",
};
for (const [toolId, route] of Object.entries(cases)) {
  calls.length = 0;
  await requester.generate({ ...basePlan, toolId, id: `launch-${toolId}` }, context);
  assert.equal(calls[0].path, route);
  assert.equal(calls[0].body.request_id, `launch-${toolId}`);
  assert.equal(calls[0].body.source_fingerprint, "frozen-fp");
}
```

Assert a Materials plan with a missing fingerprint rejects locally and never calls the API. Assert conversation source never includes raw binary/data URLs.

- [ ] **Step 2: Run client test and verify RED**

Run: `node frontend/tests/companion-practice-client-regression.mjs`

Expected: missing module/export failure.

- [ ] **Step 3: Implement context builders and route adapters**

Create the exact exports `buildCompanionConversationContext(messages, learningContext, messageIds)`, `buildCompanionMaterialsContext(historyItem, sourceIds)`, `buildCompanionHybridContext(conversation, materials)`, and `createCompanionPracticeRequester(apiClient = practiceApiClient)`. The conversation builder selects only the frozen message IDs and returns `{ title, summary, sections, sourceFingerprint, sourceIds: [] }`. The Materials builder requires the frozen history ID/fingerprint and returns only selected bounded text/section data. The hybrid builder preserves both fingerprints and labels both inputs. The requester maps `quiz`, `flashcards`, `broadcast`, `study_path`, and `visual_guide` to their existing routes, maps `teachback`, `keypoints`, `mindmap`, and `exam_readiness` to `/learning-companion/artifact`, maps `focus_session` to a validated local bridge result, and rejects every other ID before making a request.

Quiz/flashcard sizes come from `plan.config`; do not hard-code six cards. Pass `request_id` to every supported endpoint even when the existing backend currently ignores it.

- [ ] **Step 4: Add structured artifact backend tests**

Test `normalise_companion_artifact` for exact schemas:

```python
self.assertEqual(normalise_companion_artifact({"kind": "keypoints", "title": "Optics", "points": ["Refraction"]})["kind"], "keypoints")
self.assertEqual(normalise_companion_artifact({"kind": "mindmap", "nodes": [{"id": "n1", "label": "Optics"}], "edges": []})["nodes"][0]["id"], "n1")
self.assertEqual(normalise_companion_artifact({"kind": "exam_readiness", "evidence_used": [], "limitations": ["No graded quiz"]})["kind"], "exam_readiness")
```

The route must reject an unsupported kind, missing frozen context, and reused request ID with a different source fingerprint.

- [ ] **Step 5: Implement `/learning-companion/artifact`**

Generate compact JSON for `teachback`, `teachback_grade`, `keypoints`, `mindmap`, and `exam_readiness`. Exam readiness must compute the evidence summary deterministically before asking the model for explanatory wording; it cannot invent a readiness percentage when no graded evidence exists.

- [ ] **Step 6: Run client and backend tests and verify GREEN**

Run:

```bash
node frontend/tests/companion-practice-client-regression.mjs
.venv/bin/python -m unittest backend.tests.test_learning_companion_contract
```

Expected: both pass.

- [ ] **Step 7: Commit adapters**

```bash
git add frontend/src/legacy/companionPracticeClient.js frontend/tests/companion-practice-client-regression.mjs backend/app_sections/14_learning_companion.py backend/tests/test_learning_companion_contract.py
git commit -m "feat(companion): add direct artifact generation adapters"
```

---

### Task 6: Implement artifact progress and feedback-to-evidence reduction

**Files:**
- Create: `frontend/src/legacy/companionArtifactState.js`
- Create: `frontend/tests/companion-artifact-state-regression.mjs`

**Interfaces:**
- Consumes: normalized artifact descriptors and events.
- Produces: `normalizeCompanionArtifact`, `reduceCompanionArtifactEvent(threadState, event)`, and `activityEvidenceSummary(thread)`.

- [ ] **Step 1: Write failing event reduction tests**

```js
const first = reduceCompanionArtifactEvent(state, {
  id: "event-1", type: "answer_checked", artifactId: "quiz-1", toolId: "quiz",
  questionId: "q1", correct: false, misconception: "confuses aperture and shutter speed",
});
assert.ok(first.learningEvidence.some(item => item.type === "learner-attempted"));
assert.ok(first.learningEvidence.some(item => item.type === "misconception-identified"));

const rated = reduceCompanionArtifactEvent(first, {
  id: "event-2", type: "card_rated", artifactId: "cards-1", toolId: "flashcards", cardId: "c1", rating: "hard",
});
assert.ok(rated.learningContext.review_candidates.includes("c1"));
assert.ok(!rated.learningEvidence.some(item => item.type === "successful-recall" && item.sourceId === "c1"));
```

Also assert duplicate event IDs are idempotent, a mere card flip adds no mastery evidence, three checked attempts create `multi-attempt-evidence`, and completion changes tool readiness from active to completed/cooldown.

- [ ] **Step 2: Run event tests and verify RED**

Run: `node frontend/tests/companion-artifact-state-regression.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement artifact/event schemas**

Accept exactly:

```js
const EVENT_TYPES = new Set([
  "artifact_started", "question_answered", "answer_checked", "card_flipped", "card_rated",
  "teachback_submitted", "artifact_completed", "artifact_abandoned", "generation_failed", "retry_requested",
]);
```

The reducer returns a complete next state and stores only bounded event IDs/progress. Map correct checked answers and `good/easy` ratings to recall evidence; map wrong/partial answers and `again/hard` ratings to review candidates. Do not infer mastery from opening, flipping, playing, or viewing.

- [ ] **Step 4: Run event tests and verify GREEN**

Run: `node frontend/tests/companion-artifact-state-regression.mjs`

Expected: pass.

- [ ] **Step 5: Commit event reducer**

```bash
git add frontend/src/legacy/companionArtifactState.js frontend/tests/companion-artifact-state-regression.mjs
git commit -m "feat(companion): feed activity evidence back into learning state"
```

---

### Task 7: Build real Quiz and Flashcard activities

**Files:**
- Create: `frontend/src/react/components/companion/CompanionQuiz.js`
- Create: `frontend/src/react/components/companion/CompanionFlashcards.js`
- Create: `frontend/src/react/components/companion/CompanionArtifacts.js`
- Modify: `frontend/styles/01-section.css`
- Modify: `frontend/tests/companion-practice-chrome.mjs`

**Interfaces:**
- Consumes: normalized quiz/deck artifacts plus `onEvent(event)`.
- Produces: interactive renderers with stable selectors `data-companion-artifact`, `data-companion-quiz-*`, `data-companion-flashcard-*`, and normalized events from Task 6.

- [ ] **Step 1: Write failing browser assertions for the complete interactions**

Extend the Chrome test to verify:

```js
await page.click('[data-companion-quiz-option="1"]');
await page.click('[data-companion-quiz-check="true"]');
await page.waitForSelector('[data-companion-quiz-feedback="correct"]');
await page.click('[data-companion-quiz-next="true"]');

await page.click('[data-companion-flashcard-flip="true"]');
await page.click('[data-companion-flashcard-rating="hard"]');
await page.waitForFunction(() => document.querySelector('[data-companion-flashcard-index]')?.textContent.includes('2'));
```

Assert one quiz question is rendered at a time, Check is disabled without an answer, feedback appears before Next, progress survives remount, and the deck exposes Again/Hard/Good/Easy.

- [ ] **Step 2: Run the browser test and verify RED**

Run after a build: `node frontend/tests/companion-practice-chrome.mjs`

Expected: missing selector or missing artifact renderer failure.

- [ ] **Step 3: Implement `CompanionQuiz`**

Reuse the Materials question normalization semantics for single choice, multiple choice, true/false, short answer, expected answer, explanation, and source reference. Keep local interaction state derived from persisted `artifact.progress` and emit:

```js
onEvent({ id: eventId, type: "answer_checked", artifactId, toolId: "quiz", questionId, answer, correct, misconception, difficulty });
```

Show one question, immediate direct grading, the exact gap/explanation, then Next. Do not batch all questions or reveal later questions early.

- [ ] **Step 4: Implement `CompanionFlashcards`**

Render prompt/back, source/hint, progress, navigation, and confidence actions. `card_flipped` records viewing only. A rating emits:

```js
onEvent({ id: eventId, type: "card_rated", artifactId, toolId: "flashcards", cardId, rating: "again" | "hard" | "good" | "easy" });
```

Rating advances to the next card and resets the face. Completion occurs only when each card has at least one rating.

- [ ] **Step 5: Implement the artifact dispatcher and styles**

`CompanionArtifacts` chooses a renderer by `artifact.kind`, includes source wording (`Conversation`, named Materials, or `Conversation + Materials`), and renders generation/error/retry chrome without a settings card.

- [ ] **Step 6: Build and rerun the browser test for GREEN**

Run:

```bash
npm run build
node frontend/tests/companion-practice-chrome.mjs
```

Expected: build exits 0; quiz and flashcard journeys pass.

- [ ] **Step 7: Commit Quiz and Flashcards**

```bash
git add frontend/src/react/components/companion/CompanionQuiz.js frontend/src/react/components/companion/CompanionFlashcards.js frontend/src/react/components/companion/CompanionArtifacts.js frontend/styles/01-section.css frontend/tests/companion-practice-chrome.mjs
git commit -m "feat(companion): add adaptive quiz and flashcard activities"
```

---

### Task 8: Build the remaining first-class learning functions

**Files:**
- Create: `frontend/src/react/components/companion/CompanionLearningArtifacts.js`
- Modify: `frontend/src/react/components/companion/CompanionArtifacts.js`
- Modify: `frontend/src/legacy/companionPracticeClient.js`
- Modify: `frontend/styles/01-section.css`
- Modify: `frontend/tests/companion-practice-chrome.mjs`
- Modify: `frontend/tests/companion-practice-client-regression.mjs`

**Interfaces:**
- Consumes: normalized teach-back, key-points, broadcast, mind-map, visual-guide, study-path, exam-readiness, and focus-session payloads.
- Produces: real renderers/actions with `onEvent`; no function may fall back to a canned learner message.

- [ ] **Step 1: Add failing static and browser coverage for every function**

Static assertions:

```js
assert.ok(!practiceClient.includes('mode: "prompt"'));
assert.ok(!practiceClient.includes("Run a teach-back: ask me"));
assert.ok(!practiceClient.includes("Summarize the most important points from our chat"));
```

Browser assertions exercise these selectors:

```text
[data-companion-artifact="teachback"]
[data-companion-artifact="keypoints"]
[data-companion-artifact="broadcast"]
[data-companion-artifact="mindmap"]
[data-companion-artifact="visual_guide"]
[data-companion-artifact="study_path"]
[data-companion-artifact="exam_readiness"]
[data-companion-artifact="focus_session"]
```

Assert the broadcast Play action calls the existing `/broadcast/realtime-call` path (or plays returned audio), mind-map nodes respond, path items persist completion, teach-back returns graded gaps, key points can be saved/reopened, and readiness names evidence plus limitations.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node frontend/tests/companion-practice-client-regression.mjs
npm run build
node frontend/tests/companion-practice-chrome.mjs
```

Expected: missing renderer/selectors or prompt-mode assertion failure.

- [ ] **Step 3: Implement Teach-back and Key Points**

Teach-back renders one explanation textarea and submits to `kind: "teachback_grade"`; it shows `correct`, `missing`, `jargon_only`, and `enriched_explanation`, then at most one follow-up. Key Points renders a titled, source-labelled revision artifact with bounded sections/points and a persisted `saved` state. Neither sends a fake learner chat prompt.

- [ ] **Step 4: Implement Study Path, Mind Map, and Visual Guide**

Study Path consumes the existing normalized `/timeline/generate` events and emits completion events. Mind Map renders normalized nodes/edges and makes node selection emit a clarification target without showing a generic generation screen. Visual Guide consumes `/visual-image-guide/generate` panels/images and renders the generated guide directly; absent visual data is an honest tool-specific error.

- [ ] **Step 5: Implement Exam Readiness and Focus Session**

Exam Readiness renders evidence used, limitations, demonstrated strengths, weak areas, and one recommended next action; omit numeric readiness when graded evidence is insufficient. Focus Session directly calls `openSynapseFocusRoom(materialId)` only when a concrete material/task and duration exist; otherwise the validator keeps it locked. Record focus start/completion via the existing Focus Room bridge without modifying the user's active Focus Room files.

- [ ] **Step 6: Implement the real Broadcast experience**

Normalize the full broadcast response (`broadcastTitle`, script, chapters/transcript, duration, key ideas, source references). Render Play/Pause, playback error, chapters, and transcript in-chat. Reuse `/broadcast/realtime-call` for live playback and `/broadcast/tts` or returned audio when configured. Do not claim playback completion from generation or opening.

- [ ] **Step 7: Build and run focused tests for GREEN**

Run:

```bash
node frontend/tests/companion-practice-client-regression.mjs
npm run build
node frontend/tests/companion-practice-chrome.mjs
```

Expected: all eight non-quiz/flashcard function selectors and interactions pass with no prompt fallback.

- [ ] **Step 8: Commit remaining functions**

```bash
git add frontend/src/react/components/companion/CompanionLearningArtifacts.js frontend/src/react/components/companion/CompanionArtifacts.js frontend/src/legacy/companionPracticeClient.js frontend/styles/01-section.css frontend/tests/companion-practice-chrome.mjs frontend/tests/companion-practice-client-regression.mjs
git commit -m "feat(companion): integrate the complete learning function registry"
```

---

### Task 9: Wire teaching, readiness, direct launch, and feedback in the workspace

**Files:**
- Modify: `frontend/src/legacy/learningCompanionClient.js`
- Modify: `frontend/src/react/components/CompanionWorkspace.js`
- Modify: `frontend/src/legacy/controller_sections/14_learningcompanion.js`
- Modify: `frontend/index.html`
- Modify: `frontend/tests/companion-workspace-policy-regression.mjs`
- Modify: `frontend/tests/companion-chat-ux-regression.mjs`

**Interfaces:**
- Consumes: Tasks 2–8 exports.
- Produces: end-to-end Companion orchestration and contextual eligible actions.

- [ ] **Step 1: Write failing workspace policy regression**

Assert the component imports and uses:

```js
assert.ok(workspace.includes("detectCompanionToolIntent"));
assert.ok(workspace.includes("reduceCompanionReadiness"));
assert.ok(workspace.includes("createCompanionLaunchPlan"));
assert.ok(workspace.includes("reduceCompanionArtifactEvent"));
assert.ok(workspace.includes("CompanionArtifacts"));
assert.ok(!workspace.includes("CONVERSATION_STARTERS"));
assert.ok(!workspace.includes("quiz_from_notes"));
assert.ok(!workspace.includes("cards_from_notes"));
```

Use a mocked decision sequence to prove: first request stores pending intent without showing the tool; a later evidence-bearing response auto-launches it; a non-requested eligible action renders contextually; activity feedback is included in the next tutor payload.

- [ ] **Step 2: Run regression and verify RED**

Run: `node frontend/tests/companion-workspace-policy-regression.mjs`

Expected: missing integration imports/behavior failure.

- [ ] **Step 3: Expand the tutor request**

`requestLearningCompanionDecision` sends:

```js
{
  message,
  messages,
  learning_context: thread.learningContext,
  learning_evidence: thread.learningEvidence,
  tool_readiness: thread.toolReadiness,
  pending_tool_intent: thread.pendingToolIntent,
  activity_summary: activityEvidenceSummary(thread),
  source_bundle: frozenSourceBundle,
}
```

Normalize the expanded response before it reaches React.

- [ ] **Step 4: Wire explicit intent and tutor turns**

Before saving a learner message, detect and store intent without exposing a button. After the assistant response, merge evidence, reduce readiness, persist it, and either:

- auto-launch the pending eligible function;
- render at most three validated contextual actions; or
- continue teaching with no function controls.

The pending intent clears only after launch, explicit cancellation/change of direction, or New chat.

- [ ] **Step 5: Wire launch transactions and artifacts**

Persist `launchTransaction` before the network call. Resolve the frozen source context, generate once, append/persist the normalized artifact, mark the transaction complete, and render it through `CompanionArtifacts`. Do not append an artificial user message for a tool action.

- [ ] **Step 6: Wire activity events back to teaching**

`onEvent` calls the pure reducer, persists the new thread, and schedules reassessment on the next learner/tutor turn. Tool completion can make another tool eligible, but it must still pass the registry.

- [ ] **Step 7: Update cache versions and run focused tests**

Run:

```bash
node frontend/tests/companion-workspace-policy-regression.mjs
node frontend/tests/companion-chat-ux-regression.mjs
node frontend/tests/ai-learning-companion-shell-regression.mjs
```

Expected: all pass.

- [ ] **Step 8: Commit orchestration**

```bash
git add frontend/src/legacy/learningCompanionClient.js frontend/src/react/components/CompanionWorkspace.js frontend/src/legacy/controller_sections/14_learningcompanion.js frontend/index.html frontend/tests/companion-workspace-policy-regression.mjs frontend/tests/companion-chat-ux-regression.mjs
git commit -m "feat(companion): orchestrate readiness and direct tool launch"
```

---

### Task 10: Make retries idempotent and safe across thread changes

**Files:**
- Modify: `frontend/src/react/components/CompanionWorkspace.js`
- Modify: `frontend/src/legacy/companionArtifactState.js`
- Modify: `frontend/src/legacy/companionPracticeClient.js`
- Modify: `frontend/tests/companion-workspace-policy-regression.mjs`
- Modify: `frontend/tests/companion-practice-client-regression.mjs`

**Interfaces:**
- Consumes: persisted launch transactions and request IDs.
- Produces: `retryCompanionLaunch(transactionId)`, stale-response rejection, and tool-specific recovery UI.

- [ ] **Step 1: Write failing race/retry tests**

Cover:

```js
// Double click results in one generate call.
assert.equal(calls.filter(call => call.body.request_id === "launch-1").length, 1);

// Retry reuses the same frozen source/config but uses an incremented attempt.
assert.equal(retry.body.source_fingerprint, first.body.source_fingerprint);
assert.equal(retry.body.attempt, 2);

// A response for oldThreadId is not appended after New chat.
assert.equal(activeThread.artifacts.some(item => item.launchId === "old-launch"), false);
```

Also test tutor retry separately from tool retry, missing Materials without fallback, malformed artifact, storage failure, and network timeout.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node frontend/tests/companion-workspace-policy-regression.mjs
node frontend/tests/companion-practice-client-regression.mjs
```

Expected: duplicate/stale/retry assertions fail.

- [ ] **Step 3: Implement idempotent launch guards**

Keep an in-memory promise map by request ID and persisted transaction status. Retry retains source IDs/fingerprint/config and increments `attempt`. Before appending a response, require both `response.threadId === activeThread.id` and `response.requestId === activeTransaction.id`.

- [ ] **Step 4: Implement tool-specific recovery**

The failure card names the function and source, offers Retry for the same transaction, and lets chat continue. It never reveals default tools or adds another learner message. Missing Materials says which source is unavailable and clears only the impossible transaction, not learning evidence.

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
node frontend/tests/companion-workspace-policy-regression.mjs
node frontend/tests/companion-practice-client-regression.mjs
```

Expected: all retry and race cases pass.

- [ ] **Step 6: Commit recovery**

```bash
git add frontend/src/react/components/CompanionWorkspace.js frontend/src/legacy/companionArtifactState.js frontend/src/legacy/companionPracticeClient.js frontend/tests/companion-workspace-policy-regression.mjs frontend/tests/companion-practice-client-regression.mjs
git commit -m "fix(companion): make activity launches recoverable and idempotent"
```

---

### Task 11: Run four usability rounds and close every high-severity finding

**Files:**
- Possible production fixes: `backend/core/learning_companion.py`, `backend/app_sections/14_learning_companion.py`, `frontend/src/legacy/learningCompanionChatStore.js`, `frontend/src/legacy/learningCompanionClient.js`, `frontend/src/legacy/companionToolRegistry.js`, `frontend/src/legacy/companionReadiness.js`, `frontend/src/legacy/companionPracticeClient.js`, `frontend/src/legacy/companionArtifactState.js`, `frontend/src/react/components/CompanionWorkspace.js`, `frontend/src/react/components/companion/CompanionArtifacts.js`, `frontend/src/react/components/companion/CompanionQuiz.js`, `frontend/src/react/components/companion/CompanionFlashcards.js`, `frontend/src/react/components/companion/CompanionLearningArtifacts.js`, and `frontend/styles/01-section.css`.
- Possible regression fixes: the Companion test files enumerated in the File map only.
- Do not create a committed QA report unless the user requests one.

**Interfaces:**
- Consumes: complete adaptive Companion implementation.
- Produces: fresh automated and rendered evidence for every acceptance criterion.

- [ ] **Step 1: Read and follow the Browser skill**

Read `/Users/zhenghui/.codex/plugins/cache/openai-bundled/browser/26.727.51351/skills/control-in-app-browser/SKILL.md` completely. Define the flow under test as:

`open Companion -> teach or establish evidence -> appropriate function remains hidden, appears, or auto-launches -> use the real activity -> receive feedback -> observe adapted teaching/readiness`.

- [ ] **Step 2: Start the local stack and bind one Browser session**

Run `bash scripts/start_local_stack.sh`. In the Browser runtime, name one session, open `http://127.0.0.1:5175/frontend/index.html`, switch to Companion, and reuse the same bound tab except for explicit mobile checks.

- [ ] **Step 3: Round 1 — visibility and comprehension**

Test these personas separately with cleared thread state:

1. no topic;
2. immediate request for each of the ten functions;
3. beginner who needs teaching;
4. advanced learner supplying topic, level, and adequate evidence/context;
5. learner changing direction before pending intent unlocks.

For each, capture URL/title, DOM snapshot, console errors/warnings, screenshot, visible actions, backend request/response, and persisted readiness. Record findings outside the repo with severity and reproduction steps. Write a failing automated regression for every reproducible logic defect before fixing it, rerun RED, implement, then rerun GREEN.

- [ ] **Step 4: Round 2 — every function and feedback path**

Exercise all ten functions with conversation, Materials, and supported hybrid contexts. For quiz, cover correct/partial/incorrect/skipped and one-question ordering. For flashcards, cover all four ratings. For teach-back, cover strong, partial, and jargon-only explanations. Verify broadcast playback/error, map node selection, visual rendering, path completion, evidence-based readiness, and focus handoff. Confirm each interaction changes or deliberately does not change evidence according to Task 6.

- [ ] **Step 5: Round 3 — recovery, persistence, and accessibility**

Inject tutor timeout, generator timeout, malformed payload, missing/stale Materials, storage failure, duplicate click, retry, and New chat during an in-flight request. Reload partially completed quiz/deck/path artifacts. Test keyboard-only send/check/next/rating/retry, focus return, accessible names/live regions, reduced motion, desktop `1440x1100`, and mobile `390x844`. Fix through a fresh failing regression for each defect.

- [ ] **Step 6: Round 4 — rerun and mismatch ledger**

Rerun every corrected journey. Maintain a temporary ledger with: requirement, rendered evidence, mismatch, fix, rerun result. No high-severity readiness, source-integrity, duplicate-request, lost-progress, inaccessible-primary-control, or activity-blocking finding may remain open.

- [ ] **Step 7: Run the full verification gate**

Run fresh:

```bash
npm run test:frontend
.venv/bin/python -m unittest backend.tests.test_learning_companion backend.tests.test_learning_companion_contract
npm run build
node scripts/validate_static_site.mjs
git diff --check
git status --short
```

Expected: all commands exit 0; `git status --short` shows only intentionally modified Companion files plus the preserved unrelated user changes listed in Global Constraints.

- [ ] **Step 8: Perform final Browser required checks**

Verify page identity, nonblank DOM, no framework overlay, relevant console health, desktop and mobile screenshots, and at least one complete readiness-to-activity-to-feedback interaction. Put screenshots outside the repository and include them consecutively at the end of the final QA report.

- [ ] **Step 9: Final focused commit if usability fixes changed code**

Stage only Companion-owned fixes and tests, then commit:

```bash
git commit -m "fix(companion): resolve adaptive learning usability findings"
```

Do not include the four preserved unrelated user files in this commit.

---

## Completion checklist

- [ ] Fresh Companion has no study-function controls or tool-labelled starters.
- [ ] All ten functions use the centralized, independent readiness policy.
- [ ] Explicit requests wait for evidence or launch the real activity directly.
- [ ] Quiz/Flashcards have unified actions and honest source strategies.
- [ ] Teach-back and Key Points are first-class artifacts, not prompts.
- [ ] Broadcast, Mind Map, Visual Guide, Study Path, Exam Readiness, and Focus Session use real interactions.
- [ ] No generation/settings front page appears in Companion.
- [ ] Activity evidence changes subsequent teaching and readiness correctly.
- [ ] Saved artifacts/progress restore and New chat starts clean.
- [ ] Retry is tool-specific, idempotent, and safe against stale responses.
- [ ] Four usability rounds are complete and all high-severity findings are closed.
- [ ] Full frontend tests, relevant backend tests, build, static validation, console checks, and rendered interaction checks pass with fresh evidence.
