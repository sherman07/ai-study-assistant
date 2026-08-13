# Focus Trail Supabase Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record each signed-in user’s Focus Room entries in Supabase and show a cross-device 30-day Focus Trail from the existing Focus Trail controls.

**Architecture:** An `active` `focus_sessions` row is upserted when the user presses **Enter Focus Room**, carrying an immutable local calendar date and IANA timezone. The existing session row is upserted again as `completed` when focus ends. A pure frontend derivation layer reduces remote and pending local sessions into active days, streaks, a 30-day grid, today’s totals, and recent records; the existing Focus Trail drawer renders that model.

**Tech Stack:** React 18, Zustand, Motion, existing Focus Room data API, Express, Supabase REST API, PostgreSQL/Supabase SQL, Node `assert` regressions.

## Global Constraints

- Preserve existing Focus Room component placement, hierarchy, navigation, routing, controls, and dimensions.
- Count a trail day only when the user presses **Enter Focus Room**; never count setup visits or session completion separately.
- A local `YYYY-MM-DD` date and IANA timezone must be persisted in Supabase, not only browser storage or JSON metrics.
- Reuse `focus_sessions`; do not create a second trail table.
- Signed-in users read the same trail across devices. Local data is only an offline/pending fallback.
- Light mode is transparent white liquid glass; dark mode retains the existing blue glass language. Blue signals active days and selected actions.
- Respect `prefers-reduced-motion` and retain keyboard and screen-reader semantics.

---

## File structure

- `server/src/db/migrations/003_focus_trail_tracking.sql`: additive production migration for persistent Supabase trail fields and the lookup index.
- `server/src/db/supabase-schema.sql`: canonical schema parity for new installations.
- `server/src/repositories/focusSessionsRepository.js`: maps, validates, writes, and reads `focusTrailDate` and `focusTimezone`.
- `server/tests/focus-trail-persistence.test.js`: repository-level Supabase payload and mapping tests.
- `frontend/src/focus-room/focusTrail.js`: pure local-date, normalisation, and aggregate helpers with no React dependency.
- `frontend/src/focus-room/data.js`: Focus session persistence, durable pending-sync queue, and authenticated retry bridge.
- `frontend/src/focus-room/hooks/useFocusRoomStore.js`: creates the active row at room entry and completes that exact row on session end.
- `frontend/src/focus-room/hooks/useFocusTrail.js`: reads remote sessions through the existing query client and derives the UI model.
- `frontend/src/focus-room/components/FocusTrailPanel.jsx`: rendered trail content inside the existing drawer shell.
- `frontend/src/focus-room/components/FocusRoomSetup.jsx`, `FocusRoomPage.jsx`, `FocusRoomDrawers.jsx`: connect existing Focus Trail buttons to the same drawer without moving them.
- `frontend/styles/09-focus-room.css`: in-place Focus Trail visual treatment and reduced-motion fallback.
- `frontend/tests/focus-trail-regression.mjs`: pure frontend behaviour and panel wiring regression coverage.

### Task 1: Persist the local trail date in Supabase

**Files:**
- Create: `server/src/db/migrations/003_focus_trail_tracking.sql`
- Modify: `server/src/db/supabase-schema.sql:241-271`
- Modify: `server/src/repositories/focusSessionsRepository.js:21-111`
- Test: `server/tests/focus-trail-persistence.test.js`

**Interfaces:**
- Consumes: `POST /api/focus-sessions` payload fields `focusTrailDate` and `focusTimezone`.
- Produces: `mapFocusSession(row)` values `{ focusTrailDate: string, focusTimezone: string }` for all clients.

- [ ] **Step 1: Write the failing repository test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { mapFocusSession, rowFromPayload } from "../src/repositories/focusSessionsRepository.js";

test("focus session maps Supabase trail date and timezone", () => {
  const row = rowFromPayload("user-1", {
    sessionId: "focus-1",
    focusTrailDate: "2026-08-11",
    focusTimezone: "Pacific/Auckland"
  });
  assert.equal(row.focus_trail_date, "2026-08-11");
  assert.equal(row.focus_timezone, "Pacific/Auckland");
  const mapped = mapFocusSession({ ...row, metrics_json: {} });
  assert.equal(mapped.focusTrailDate, "2026-08-11");
  assert.equal(mapped.focusTimezone, "Pacific/Auckland");
});
```

Add a second test rejecting malformed dates (`"2026-2-1"`) and oversized timezones by mapping them to `null`.

- [ ] **Step 2: Run the server test to verify it fails**

Run: `PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm --prefix server test -- focus-trail-persistence.test.js`

Expected: FAIL because the repository does not expose or persist the trail fields.

- [ ] **Step 3: Add the Supabase fields and repository mapping**

```sql
alter table public.focus_sessions
  add column if not exists focus_trail_date date,
  add column if not exists focus_timezone text;

create index if not exists focus_sessions_user_trail_date_idx
  on public.focus_sessions (user_id, focus_trail_date desc);
```

In the repository, add a strict `YYYY-MM-DD` validator, allow a timezone only when it is a non-empty string of at most 120 characters, and add the two fields to `rowFromPayload`, `supabaseFocusSessionRow`, and `mapFocusSession`. Export `mapFocusSession` and `rowFromPayload` with the existing repository exports so their payload contract can be tested without an HTTP mock.

- [ ] **Step 4: Run the server test to verify it passes**

Run: `PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm --prefix server test -- focus-trail-persistence.test.js`

Expected: PASS; the SQL migration and canonical schema both contain the two columns and the repository round-trips valid values.

- [ ] **Step 5: Commit**

```bash
git add server/src/db/migrations/003_focus_trail_tracking.sql server/src/db/supabase-schema.sql server/src/repositories/focusSessionsRepository.js server/tests/focus-trail-persistence.test.js
git commit -m "feat: persist Focus Trail dates in Supabase"
```

### Task 2: Build the pure Focus Trail domain model

**Files:**
- Create: `frontend/src/focus-room/focusTrail.js`
- Test: `frontend/tests/focus-trail-regression.mjs`

**Interfaces:**
- Consumes: session objects with `{ sessionId, status, startedAt, endedAt, totalFocusTime, focusTrailDate, focusTimezone }`.
- Produces: `buildFocusTrail(sessions, { today, timezone })` returning `{ activeDays, currentStreak, days, todayEntries, todayFocusSeconds, recentSessions }`.

- [ ] **Step 1: Write the failing pure-domain tests**

```js
const trail = buildFocusTrail([
  { sessionId: "a", focusTrailDate: "2026-08-11", status: "active", totalFocusTime: 0 },
  { sessionId: "b", focusTrailDate: "2026-08-11", status: "completed", totalFocusTime: 1500 },
  { sessionId: "c", focusTrailDate: "2026-08-10", status: "completed", totalFocusTime: 900 }
], { today: "2026-08-11", timezone: "Pacific/Auckland" });

assert.equal(trail.activeDays, 2);
assert.equal(trail.currentStreak, 2);
assert.equal(trail.todayEntries, 2);
assert.equal(trail.todayFocusSeconds, 1500);
assert.equal(trail.days.length, 30);
assert.equal(trail.days.at(-1).active, true);
```

Add tests that a setup visit creates no input record, an invalid/missing persisted trail date falls back to `startedAt` using the supplied timezone, and a gap breaks the streak.

- [ ] **Step 2: Run the test to verify it fails**

Run: `/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node frontend/tests/focus-trail-regression.mjs`

Expected: FAIL because `buildFocusTrail` does not exist.

- [ ] **Step 3: Implement pure date and aggregate helpers**

```js
export function localTrailDate(value = new Date(), timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(value);
  const pick = type => parts.find(part => part.type === type)?.value;
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export function buildFocusTrail(sessions, { today, timezone } = {}) {
  // Normalise, dedupe by sessionId, derive 30 chronological days, then count
  // unique local dates independently from session-entry and focus-time totals.
}
```

Return only serialisable values, sort recent sessions newest-first with session ID as the tie-breaker, and keep this file free of browser storage or React imports.

- [ ] **Step 4: Run the test to verify it passes**

Run: `/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node frontend/tests/focus-trail-regression.mjs`

Expected: PASS; duplicate daily entries count as one active day while today’s entry count remains two.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/focus-room/focusTrail.js frontend/tests/focus-trail-regression.mjs
git commit -m "feat: derive Focus Trail activity"
```

### Task 3: Persist entry immediately and retry pending Supabase sync

**Files:**
- Modify: `frontend/src/focus-room/data.js:1-15,908-981`
- Modify: `frontend/src/focus-room/hooks/useFocusRoomStore.js:866-910,1040-1090`
- Modify: `frontend/src/legacy/dataApiClient.js:124-153`
- Modify: `frontend/tests/focus-room-data-regression.mjs:145-235`
- Test: `frontend/tests/focus-trail-regression.mjs`

**Interfaces:**
- Consumes: `createFocusTrailEntry(state, now)` from the store and `saveFocusSessionToDataApi(session)`.
- Produces: a local session with `status: "active"`, `focusTrailDate`, `focusTimezone`, `syncState`, and a background upsert to Supabase.

- [ ] **Step 1: Add failing lifecycle tests**

```js
const entry = data.saveFocusRoomSession({
  sessionId: "entry-1",
  status: "active",
  focusTrailDate: "2026-08-11",
  focusTimezone: "Pacific/Auckland",
  startedAt: "2026-08-10T12:00:00.000Z"
});
assert.equal(entry.status, "active");
assert.equal(entry.focusTrailDate, "2026-08-11");
assert.equal(entry.focusTimezone, "Pacific/Auckland");
assert.equal(entry.totalFocusTime, 0);
```

Mock only `saveFocusSessionToDataApi` at its network boundary to return `null`, then assert the stable session ID remains in the durable pending queue. Add a completion case with the same ID and `status: "completed"` asserting there is one local session, not two.

- [ ] **Step 2: Run focused frontend tests to verify failure**

Run: `/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node frontend/tests/focus-room-data-regression.mjs && /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node frontend/tests/focus-trail-regression.mjs`

Expected: FAIL because active entries discard status/date/timezone and no pending retry exists.

- [ ] **Step 3: Implement entry upsert and retry**

```js
const FOCUS_ROOM_PENDING_SYNC_KEY = "synapse.focusRoom.pending-sync.v1";

function focusEntryMetadata(now = new Date()) {
  const focusTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return { focusTimezone, focusTrailDate: localTrailDate(now, focusTimezone) };
}

// In startSession(), create the stable session object, save it as status:
// "active" with focusEntryMetadata(), then set it as currentSession.
// In endSession(), resave the same sessionId as status: "completed".
```

Keep local persistence synchronous; queue only failed authenticated writes. Drain the queue after `initializeFocusRoom()` and before a remote history read. Use existing POST upsert semantics and remove a queued entry only after its matching session ID is returned by the API.

- [ ] **Step 4: Run focused frontend tests to verify pass**

Run: `/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node frontend/tests/focus-room-data-regression.mjs && /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node frontend/tests/focus-trail-regression.mjs`

Expected: PASS; entry survives offline, retry uses the same ID, and completion updates the existing Supabase record.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/focus-room/data.js frontend/src/focus-room/hooks/useFocusRoomStore.js frontend/src/legacy/dataApiClient.js frontend/tests/focus-room-data-regression.mjs frontend/tests/focus-trail-regression.mjs
git commit -m "feat: track Focus Room entry sessions"
```

### Task 4: Render the existing Focus Trail drawer

**Files:**
- Create: `frontend/src/focus-room/hooks/useFocusTrail.js`
- Create: `frontend/src/focus-room/components/FocusTrailPanel.jsx`
- Modify: `frontend/src/focus-room/components/FocusRoomDrawers.jsx:1-285`
- Modify: `frontend/src/focus-room/components/FocusRoomSetup.jsx:20-95`
- Modify: `frontend/src/focus-room/components/FocusRoomPage.jsx:118-150`
- Modify: `frontend/styles/09-focus-room.css`
- Test: `frontend/tests/focus-trail-regression.mjs`

**Interfaces:**
- Consumes: `useSessionHistory()`, `buildFocusTrail()`, authenticated Synapse session, and `currentSession` from Zustand.
- Produces: `FocusTrailPanel`, rendered only inside the pre-existing `UtilityShell` opened by existing Focus Trail controls.

- [ ] **Step 1: Add failing panel/wiring tests**

```js
assert.match(drawers, /<FocusTrailPanel/, "the existing Focus Trail drawer must render trail content");
assert.match(setup, /onOpenTrail/, "the setup Focus Trail icon must open the same trail drawer");
assert.match(page, /utilityPanel === "trail"/, "Focus Trail state remains owned by the page");
assert.match(styles, /\.focus-trail-grid/, "the trail keeps a dedicated visual grid without changing drawer geometry");
```

Add an accessibility assertion for `role="grid"`, cells labelled with their local date and entry count, and static styling under `prefers-reduced-motion`.

- [ ] **Step 2: Run the frontend trail test to verify failure**

Run: `/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node frontend/tests/focus-trail-regression.mjs`

Expected: FAIL because the authenticated panel is still placeholder copy and setup redirects to workspace history.

- [ ] **Step 3: Implement hook, panel, and non-disruptive wiring**

```jsx
export function FocusTrailPanel({ session }) {
  const { trail, isPending, isOffline } = useFocusTrail(session);
  return <section className="focus-trail" aria-label="Focus progress">{/* existing drawer only */}</section>;
}
```

Render a 30-cell chronological grid, all-time active days, current streak, today’s entries/minutes, and up to three recent sessions. Pass `onOpenTrail={() => setUtilityPanel("trail")}` to setup. Render the existing drawer host for setup as well as session view, without changing the setup header or session dock. Keep the signed-out CTA unchanged.

CSS must use `var(--fr-glass)`/`var(--room-*)` variables, `background`/`border` only within the current drawer content, and a one-shot cell fade/scale guarded by `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 4: Run focused tests and browser verification**

Run: `/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node frontend/tests/focus-trail-regression.mjs && PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run test:focus-room`

Expected: PASS; the same existing Focus Trail controls open the populated panel without shifting header, setup rail, or dock controls.

Browser check: signed-in light and dark Focus Room show the same 30-day grid and current streak after reload; reduced motion shows no scale or fade animation.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/focus-room/hooks/useFocusTrail.js frontend/src/focus-room/components/FocusTrailPanel.jsx frontend/src/focus-room/components/FocusRoomDrawers.jsx frontend/src/focus-room/components/FocusRoomSetup.jsx frontend/src/focus-room/components/FocusRoomPage.jsx frontend/styles/09-focus-room.css frontend/tests/focus-trail-regression.mjs
git commit -m "feat: show cross-device Focus Trail"
```

### Task 5: Final integration verification

**Files:**
- Test: `frontend/tests/focus-trail-regression.mjs`, `server/tests/focus-trail-persistence.test.js`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a verified Supabase-backed Focus Trail with no pending schema or UI mismatch.

- [ ] **Step 1: Add an API-to-Supabase contract assertion**

```js
const row = rowFromPayload("user-1", {
  sessionId: "remote-entry-1",
  focusTrailDate: "2026-08-11",
  focusTimezone: "Pacific/Auckland",
  status: "active"
});
const remoteSession = mapFocusSession({ ...row, metrics_json: {} });
assert.equal(remoteSession.focusTrailDate, "2026-08-11");
assert.equal(remoteSession.focusTimezone, "Pacific/Auckland");
```

In `frontend/tests/focus-trail-regression.mjs`, pass the equivalent remote API
fixture to `buildFocusTrail` and assert `activeDays === 1`.

- [ ] **Step 2: Run the focused contract tests**

Run: `PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm --prefix server test -- focus-trail-persistence.test.js && /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node frontend/tests/focus-trail-regression.mjs`

Expected: PASS; the session payload contains persisted date/timezone fields and the frontend trail accepts the remote response.

- [ ] **Step 3: Run complete validation**

Run: `PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run test:frontend && PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm --prefix server test && PATH=/Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH /Users/zhenghui/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run build && git diff --check`

Expected: all commands succeed; only existing Vite non-module-script and large-chunk warnings may remain.

- [ ] **Step 4: Commit**

```bash
git add frontend/tests/focus-trail-regression.mjs server/tests/focus-trail-persistence.test.js
git commit -m "test: verify Focus Trail Supabase sync"
```
