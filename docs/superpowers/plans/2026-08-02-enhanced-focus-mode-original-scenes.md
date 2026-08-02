# Enhanced Focus Mode and Original Scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional, progressively disclosed Focus Mode first, then improve the five audio presets, then integrate eight separately generated original wallpapers with smooth code-driven motion.

**Architecture:** Keep Zustand as the source of truth for timer, topic, goal, notes, tasks, scene, and audio. Add pure shortcut/reveal helpers, a focused HUD component family, declarative audio presets, and declarative scene motion profiles. A separate asset agent writes only original images and a manifest; the main implementation integrates those assets after functionality and audio pass.

**Tech Stack:** React 18, Zustand, Motion, Howler, Lucide React, CSS compositor animations, Node `assert` regression tests, Vite, in-app browser verification.

## Global Constraints

- Complete Focus Mode functionality before changing music behavior.
- Generate wallpaper assets in a separate agent that may write only `frontend/assets/focus-room/original/`.
- Do not ship reference-site images or animations as selectable scenes.
- Keep the current topic, study intention, timer, progress, and Pomodoro number permanently visible in Focus Mode.
- Reveal secondary controls on pointer, touch, focus, or shortcut; allow pinning; never hide while a popover or focused control is active.
- Global shortcuts must not fire from editable elements.
- Respect `prefers-reduced-motion: reduce` and pause decorative motion while the document is hidden.
- Keep existing unrelated changes in `server/src/config.js` and `server/tests/auth-config.test.js` untouched.

---

### Task 1: Pure Focus Mode interaction contract

**Files:**
- Create: `frontend/src/focus-room/focusMode.js`
- Create: `frontend/tests/focus-room-enhanced-mode-regression.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `isEditableFocusTarget(target): boolean`
- Produces: `focusShortcutAction(event): "toggle-timer" | "toggle-audio" | "note" | "tasks" | "scene" | "shortcuts" | "escape" | ""`
- Produces: `focusModeTopic(material): string`
- Produces: `FOCUS_MODE_REVEAL_MS: number`

- [ ] **Step 1: Write the failing pure regression test**

Create assertions that import `focusMode.js` and verify:

```js
assert.equal(focusModeTopic({ materialTitle: "Vector Calculus" }), "Vector Calculus");
assert.equal(focusModeTopic(null), "Focus Room");
assert.equal(isEditableFocusTarget({ tagName: "TEXTAREA" }), true);
assert.equal(isEditableFocusTarget({ tagName: "BUTTON" }), false);
assert.equal(focusShortcutAction({ key: " ", target: { tagName: "BODY" } }), "toggle-timer");
assert.equal(focusShortcutAction({ key: "m", target: { tagName: "BODY" } }), "toggle-audio");
assert.equal(focusShortcutAction({ key: "n", target: { tagName: "TEXTAREA" } }), "");
assert.equal(focusShortcutAction({ key: "Escape", target: { tagName: "BODY" } }), "escape");
assert.equal(FOCUS_MODE_REVEAL_MS, 2800);
```

Also assert that `package.json` includes the new regression in `test:focus-room`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node frontend/tests/focus-room-enhanced-mode-regression.mjs`

Expected: FAIL because `frontend/src/focus-room/focusMode.js` does not exist.

- [ ] **Step 3: Implement the helpers**

Implement the exact shortcut table and editable-target guard:

```js
export const FOCUS_MODE_REVEAL_MS = 2800;

export function isEditableFocusTarget(target) {
  const tag = String(target?.tagName || "").toLowerCase();
  return Boolean(target?.isContentEditable || ["input", "textarea", "select"].includes(tag));
}

export function focusShortcutAction(event = {}) {
  if (isEditableFocusTarget(event.target)) return "";
  const key = String(event.key || "").toLowerCase();
  if (key === " " || key === "spacebar") return "toggle-timer";
  if (key === "m") return "toggle-audio";
  if (key === "n") return "note";
  if (key === "t") return "tasks";
  if (key === "s") return "scene";
  if (key === "?") return "shortcuts";
  if (key === "escape") return "escape";
  return "";
}

export function focusModeTopic(material) {
  return String(material?.materialTitle || "").trim() || "Focus Room";
}
```

- [ ] **Step 4: Run the focused test**

Run: `node frontend/tests/focus-room-enhanced-mode-regression.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the contract**

```bash
git add frontend/src/focus-room/focusMode.js frontend/tests/focus-room-enhanced-mode-regression.mjs package.json
git commit -m "test: define enhanced focus mode interactions"
```

### Task 2: Functional Focus Mode HUD and controls

**Files:**
- Create: `frontend/src/focus-room/components/FocusModeHUD.jsx`
- Create: `frontend/src/focus-room/components/FocusModeControls.jsx`
- Create: `frontend/src/focus-room/components/FocusModePopover.jsx`
- Replace: `frontend/src/focus-room/components/CompactFocusTimer.jsx`
- Modify: `frontend/src/focus-room/components/FocusRoomPage.jsx`
- Modify: `frontend/styles/09-focus-room.css`
- Modify: `frontend/tests/focus-room-enhanced-mode-regression.mjs`

**Interfaces:**
- Consumes: `focusShortcutAction`, `focusModeTopic`, and `FOCUS_MODE_REVEAL_MS` from Task 1.
- Consumes: store actions `startTimer`, `pauseTimer`, `skipTimer`, `setSessionDuration`, `toggleAudio`, `setWorkspaceNotes`, `toggleTask`, `openDrawer`.
- Produces: `<FocusModeHUD audioState onExit />`.
- Produces: popover identifiers `"note" | "tasks" | "scene" | "audio" | "shortcuts" | ""`.

- [ ] **Step 1: Extend the regression with failing source and state assertions**

Assert the new HUD source contains:

```js
for (const token of [
  "focusModeTopic(selectedMaterial)",
  "studyGoal",
  "Add five minutes",
  "Quick Note",
  "Session tasks",
  "Pin controls",
  "focusShortcutAction",
  "FOCUS_MODE_REVEAL_MS",
  "setWorkspaceNotes",
  "toggleTask"
]) assert.ok(hudSource.includes(token), `HUD should include ${token}`);
```

Assert `FocusRoomPage.jsx` renders `<FocusModeHUD audioState={audioState} onExit=` while `focusMode` is active and no longer renders `focus-mode-exit-hit-area`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node frontend/tests/focus-room-enhanced-mode-regression.mjs`

Expected: FAIL because the HUD files do not exist.

- [ ] **Step 3: Implement FocusModePopover**

Build an accessible dialog-like surface that accepts `{ id, title, onClose, children }`, uses `role="dialog"`, `aria-modal="false"`, a labelled heading, and a close button. It must not own application state.

- [ ] **Step 4: Implement FocusModeControls**

Render real buttons with Lucide icons and visible tooltips for:

```jsx
<button aria-label={isRunning ? "Pause timer" : "Start timer"} onClick={onToggleTimer} />
<button aria-label="Add five minutes" onClick={onAddFiveMinutes} />
<button aria-label="Skip to next phase" onClick={onSkip} />
<button aria-label={audioPlaying ? "Mute room audio" : "Resume room audio"} onClick={onToggleAudio} />
<button aria-label="Quick Note" onClick={() => onOpen("note")} />
<button aria-label="Session tasks" onClick={() => onOpen("tasks")} />
<button aria-label="Change scene" onClick={() => onOpen("scene")} />
<button aria-label="Sound settings" onClick={() => onOpen("audio")} />
<button aria-label={pinned ? "Unpin controls" : "Pin controls"} onClick={onTogglePinned} />
<button aria-label="Exit Focus Mode" onClick={onExit} />
```

- [ ] **Step 5: Implement FocusModeHUD state and actions**

The HUD must:

- Read material, goal, timer, note, plan, completed tasks, audio, and scene state from Zustand selectors.
- Maintain local `controlsVisible`, `controlsPinned`, and `activePopover` state.
- Keep one reveal timeout in `useRef`; clear it before scheduling and on unmount.
- Reveal on `pointermove`, `pointerdown`, `focusin`, and valid shortcuts.
- Hide only when not pinned, no popover is open, and focus is outside the HUD.
- Add five minutes through `setSessionDuration(Math.floor((totalDurationSeconds + 300) / 60), (totalDurationSeconds + 300) % 60)`.
- Update Quick Note through the existing `setWorkspaceNotes` action and display `workspaceUpdatedAt` as autosave confirmation.
- Render `studyPlan` checkboxes wired to `toggleTask(index)`.
- Render `SceneSelector` inside the scene popover and `SoundControlPanel` inside the audio popover.
- Close the active popover before exiting Focus Mode when Escape is pressed.

- [ ] **Step 6: Replace CompactFocusTimer with a compatibility re-export**

Keep old imports safe during the transition:

```jsx
export { FocusModeHUD as CompactFocusTimer } from "./FocusModeHUD.jsx";
```

Then update `FocusRoomPage.jsx` to import and render `FocusModeHUD` directly.

- [ ] **Step 7: Add responsive and idle-state styles**

Create `.focus-mode-hud`, `.focus-mode-primary`, `.focus-mode-controls`, `.focus-mode-popover`, `.focus-mode-topic`, and `.focus-mode-shortcut` styles. Controls use `opacity` and `transform` transitions; hidden controls set `visibility: hidden` and `pointer-events: none`. At `max-width: 640px`, place the HUD across the safe-area-aware bottom edge and make the controls a horizontally scroll-free wrapping row or bottom sheet. Under reduced motion, disable HUD transitions.

- [ ] **Step 8: Run functionality regressions**

Run:

```bash
node frontend/tests/focus-room-enhanced-mode-regression.mjs
npm run test:focus-room
```

Expected: both commands PASS.

- [ ] **Step 9: Commit the functional Focus Mode**

```bash
git add frontend/src/focus-room/components/FocusModeHUD.jsx frontend/src/focus-room/components/FocusModeControls.jsx frontend/src/focus-room/components/FocusModePopover.jsx frontend/src/focus-room/components/CompactFocusTimer.jsx frontend/src/focus-room/components/FocusRoomPage.jsx frontend/styles/09-focus-room.css frontend/tests/focus-room-enhanced-mode-regression.mjs
git commit -m "feat: build enhanced distraction-free focus mode"
```

### Task 3: Five explicit audio presets

**Files:**
- Modify: `frontend/src/focus-room/data.js`
- Modify: `frontend/src/focus-room/components/FocusRoomSetup.jsx`
- Modify: `frontend/src/focus-room/components/SoundControlPanel.jsx`
- Modify: `frontend/src/focus-room/audio.js`
- Modify: `frontend/styles/09-focus-room.css`
- Modify: `frontend/tests/focus-room-audio-regression.mjs`

**Interfaces:**
- Produces: `FOCUS_ROOM_AUDIO_PRESETS: readonly AudioPreset[]` where each preset is `{ id, label, musicType, ambientSound, description }`.
- Produces: `focusRoomAudioPreset(id): AudioPreset`.
- Consumes: existing `setSound`, `syncFocusRoomAudio`, Howler channels, and license attribution fields.

- [ ] **Step 1: Write failing preset assertions**

Add assertions:

```js
assert.deepEqual(data.FOCUS_ROOM_AUDIO_PRESETS.map(item => item.label), [
  "Soft Piano", "Lo-fi Café", "Nature Flow", "Warm Ambience", "Deep Focus"
]);
assert.deepEqual(
  data.FOCUS_ROOM_AUDIO_PRESETS.map(item => [item.musicType, item.ambientSound]),
  [["Piano", "Nature"], ["Lo-fi", "Cafe Rain"], ["Deep Focus", "Nature"], ["Minimal", "Rain"], ["Deep Focus", "White Noise"]]
);
```

Assert the setup source uses `aria-pressed`, the preset `description`, and a visible active-label element.

- [ ] **Step 2: Run the audio test to verify it fails**

Run: `node frontend/tests/focus-room-audio-regression.mjs`

Expected: FAIL because `FOCUS_ROOM_AUDIO_PRESETS` is undefined.

- [ ] **Step 3: Add preset data and lookup**

Define the five preset records in `data.js`, export them, and implement a safe lookup that falls back to `deep-focus`.

- [ ] **Step 4: Replace the setup-local mood array**

Map preset IDs to the existing five Lucide icon components, read current `musicType` and `ambientSound`, and calculate the active preset by matching both values. Each button must set both values, include `aria-pressed`, and render the selected preset label in a short live status region.

- [ ] **Step 5: Make audio switching idempotent**

Preserve the existing channel source comparison in `ensureMusicChannel` and `ensureAmbientChannel`. Add a regression assertion that repeated sync of the same preset retains one music channel and one channel per ambient layer. Keep the existing 500 ms fade and attribution links.

- [ ] **Step 6: Run audio and full Focus Room tests**

Run:

```bash
node frontend/tests/focus-room-audio-regression.mjs
npm run test:focus-room
```

Expected: PASS.

- [ ] **Step 7: Commit the audio sprint**

```bash
git add frontend/src/focus-room/data.js frontend/src/focus-room/components/FocusRoomSetup.jsx frontend/src/focus-room/components/SoundControlPanel.jsx frontend/src/focus-room/audio.js frontend/styles/09-focus-room.css frontend/tests/focus-room-audio-regression.mjs
git commit -m "feat: clarify focus room audio presets"
```

### Task 4: Integrate separate original wallpaper deliverables

**Files:**
- Consume without regenerating: `frontend/assets/focus-room/original/*.png` or `*.webp`
- Consume: `frontend/assets/focus-room/original/asset-manifest.md`
- Create: `frontend/src/focus-room/sceneMotion.js`
- Create: `frontend/src/focus-room/components/SceneMotionLayer.jsx`
- Modify: `frontend/src/focus-room/data.js`
- Modify: `frontend/src/focus-room/components/FocusBackground.jsx`
- Modify: `frontend/styles/09-focus-room.css`
- Modify: `frontend/tests/focus-room-data-regression.mjs`
- Modify: `frontend/tests/focus-room-enhanced-mode-regression.mjs`

**Interfaces:**
- Produces: `SCENE_MOTION_PROFILES: Record<string, SceneMotionProfile>`.
- Produces: `sceneMotionProfile(sceneId): SceneMotionProfile`.
- Produces: `<SceneMotionLayer profile reducedMotion hidden />`.

- [ ] **Step 1: Audit the wallpaper agent output**

Confirm exactly eight final paths exist, every manifest entry contains an exact prompt and QA note, dimensions are suitable for full-bleed 16:9 use, and `view_image` shows no brands, watermarks, embedded UI, distorted architecture, or severe generation artifacts. Reject flawed assets before code integration.

- [ ] **Step 2: Write failing ownership and motion assertions**

Assert:

```js
assert.equal(data.FOCUS_ROOM_GALLERY_SCENES.length, 8);
assert.ok(data.FOCUS_ROOM_GALLERY_SCENES.every(scene => scene.image.includes("/original/")));
assert.ok(data.FOCUS_ROOM_GALLERY_SCENES.every(scene => scene.motionProfile));
```

Assert the background source includes `SceneMotionLayer`, `document.visibilityState`, `prefers-reduced-motion`, and transition cleanup.

- [ ] **Step 3: Define motion profiles**

Create profiles using only these layer kinds: `camera`, `light`, `rain`, `snow`, `mist`, `foliage`, and `water`. Every profile includes stable `duration`, `intensity`, and `density` numbers. Use five priority profiles first, run tests, then add the remaining three.

- [ ] **Step 4: Replace all eight gallery image paths**

Update the scene records to use the audited original asset paths and English display names from the approved design. Add `motionProfile` IDs that exactly match `SCENE_MOTION_PROFILES` keys.

- [ ] **Step 5: Implement motion rendering and lifecycle**

`SceneMotionLayer` renders decorative spans only; the scene image remains an `<img>`. `FocusBackground` keeps the old image until the new image fires `onLoad`, crossfades the ready image, and removes the exited layer after Motion completes. Listen for `visibilitychange`, pause layers while hidden, and use `matchMedia("(prefers-reduced-motion: reduce)")` to return a static scene.

- [ ] **Step 6: Add compositor-safe scene CSS**

Animate only `transform` and `opacity`. Use CSS custom properties for duration, intensity, and density. Do not use continuous full-screen blur or layout-changing properties. Make every keyframe end at the same visual state as its beginning. Reduce particle density below 640 px.

- [ ] **Step 7: Run scene and full regressions**

Run:

```bash
node frontend/tests/focus-room-data-regression.mjs
node frontend/tests/focus-room-enhanced-mode-regression.mjs
npm run test:focus-room
npm run build
```

Expected: PASS and all eight original assets copied into both Vite outputs.

- [ ] **Step 8: Commit the wallpaper integration**

```bash
git add frontend/assets/focus-room/original frontend/src/focus-room/sceneMotion.js frontend/src/focus-room/components/SceneMotionLayer.jsx frontend/src/focus-room/data.js frontend/src/focus-room/components/FocusBackground.jsx frontend/styles/09-focus-room.css frontend/tests/focus-room-data-regression.mjs frontend/tests/focus-room-enhanced-mode-regression.mjs
git commit -m "feat: add original animated focus wallpapers"
```

### Task 5: Browser functionality, usability, and sprint proof

**Files:**
- Create: `docs/qa/2026-08-02-enhanced-focus-mode-sprint-report.md`
- Modify only if bugs are found: Focus Room source/test files from Tasks 1–4

**Interfaces:**
- Consumes: the complete built Focus Room.
- Produces: evidence-backed sprint report and final implementation screenshot.

- [ ] **Step 1: Run the complete automated gate**

Run:

```bash
npm run test:focus-room
npm run build
```

Expected: PASS with no unhandled rejection or missing asset error.

- [ ] **Step 2: Start the app and verify the primary desktop path**

Use the in-app browser first. Open Focus Room, select each of the five priority scenes and audio presets, start a timer, enter Focus Mode, and click every revealed control. Verify topic/goal/timer persistence, add-five-minutes behavior, phase skip, mute/resume, Quick Note autosave, task toggles, scene switching, pinning, popover close order, and Focus Mode exit.

- [ ] **Step 3: Verify keyboard and editable-control safety**

Exercise Space, M, N, T, S, `?`, and Escape. Type those keys into Quick Note and verify no global action fires. Tab through every revealed control and confirm the HUD does not hide while focus remains inside.

- [ ] **Step 4: Verify mobile and accessibility behavior**

Test a 390 × 844 viewport. Confirm no horizontal overflow, controls are reachable, touch reveal and pin work, popovers fit above safe areas, and every icon button has an accessible name. Emulate reduced motion and confirm the wallpaper becomes static and HUD transitions are disabled.

- [ ] **Step 5: Verify repeated-use stability**

Switch scenes at least 25 times, enter and exit Focus Mode at least 20 times, and keep one priority scene active across multiple full motion cycles. Confirm there are no black frames, duplicate audio layers, stuck popovers, runaway timers, console errors, or visible loop jumps.

- [ ] **Step 6: Compare the visual result**

Capture the implementation at the supplied screenshot's approximate desktop proportions. Use `view_image` on the approved visual reference and on the latest implementation screenshot. Record at least five comparison points covering hierarchy, readability, icon treatment, scene treatment, control density, and responsive behavior.

- [ ] **Step 7: Write the sprint report**

Record Sprint 1 functionality results, Sprint 2 audio results, wallpaper-agent asset audit, integration results, issues discovered, fixes made, automated command output, desktop/mobile/browser checks, stability counts, accessibility checks, visual comparison, and intentional limitations. Do not mark an item passed without evidence.

- [ ] **Step 8: Commit QA evidence and any final fixes**

```bash
git add docs/qa/2026-08-02-enhanced-focus-mode-sprint-report.md frontend/src/focus-room frontend/styles/09-focus-room.css frontend/tests package.json
git commit -m "test: verify enhanced focus room experience"
```

