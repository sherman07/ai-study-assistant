import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const styles = fs.readFileSync(path.join(root, "frontend/styles/09-focus-room.css"), "utf8");

// Focus Room now uses ONE unified translucent glass material so every console
// surface and control reads as the same piece of glass over the scene.
assert.match(styles, /Unified glass system/, "Focus Room should document the unified glass system");
assert.match(styles, /--fr-glass:\s*linear-gradient/, "the shared glass fill token must be defined");
assert.match(styles, /--fr-glass-soft:\s*rgba\(224, 233, 255, 0\.1\)/, "the shared blue control fill token must be defined");
assert.match(styles, /--fr-border:\s*rgba\(224, 233, 255, 0\.22\)/, "the shared blue glass border token must be defined");

// The same material must cover panels, dock, timer, and control surfaces.
assert.match(
  styles,
  /\.react-focus-room \.liquid-glass,[\s\S]*?\.react-focus-room \.focus-session-dock,[\s\S]*?\.react-focus-room \.timer-card,[\s\S]*?background: var\(--fr-glass\);/,
  "core console surfaces should all share the unified glass fill"
);

// Buttons and inputs share the same translucency so nothing looks more opaque.
assert.match(
  styles,
  /\.react-focus-room \.glass-button,[\s\S]*?background: var\(--fr-glass-soft\);/,
  "buttons and inputs should share the unified control fill"
);

// Readability floor: solid fallbacks when transparency/blur is unavailable.
assert.match(styles, /@supports not \(backdrop-filter: blur\(1px\)\)[\s\S]*?rgba\(8, 25, 58, 0\.82\)/, "a blue no-backdrop-filter fallback must keep contrast");
assert.match(styles, /@media \(prefers-reduced-transparency: reduce\)[\s\S]*?rgba\(8, 25, 58, 0\.9\)/, "reduced-transparency users must get a near-solid blue surface");

// The settings panel is the wide two-column CONTROL layout.
assert.match(styles, /\.react-focus-room \.focus-utility-panel\.room-control-panel/, "the room control panel should have a dedicated wide layout");
assert.match(styles, /\.room-control-grid\s*\{[\s\S]*?grid-template-columns: minmax\(0, 0\.92fr\) minmax\(0, 1\.08fr\)/, "the control panel should use a two-column scenes/audio grid");
assert.match(styles, /\.room-control-masters\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, "music and scene sound should sit side by side");
assert.match(styles, /\.room-channel-card\.is-active/, "active ambient cards should light up against the glass");
assert.match(styles, /\.timer-editor-dock/, "the dock timer should support segmented editing");
assert.match(
  styles,
  /\.react-focus-room \.dock-time[\s\S]*?color: #fff;[\s\S]*?font-weight: 560;/,
  "dock timer digits should use high-contrast white type"
);
assert.doesNotMatch(
  styles,
  /\.react-focus-room \.focus-session-grid\s*\{[\s\S]*?opacity: 1;[\s\S]*?pointer-events: auto;/,
  "the center floating pomodoro hero must stay removed"
);

const drawers = fs.readFileSync(path.join(root, "frontend/src/focus-room/components/FocusRoomDrawers.jsx"), "utf8");
assert.match(drawers, /function RoomControlPanel/, "settings should render the wide RoomControlPanel");
assert.match(drawers, /Ambient atmosphere/, "settings should expose ambient atmosphere channels");
assert.match(drawers, /Focus noise/, "settings should expose focus noise channels");
assert.match(drawers, /room-control-masters/, "music and scene sound should share a masters row");

const page = fs.readFileSync(path.join(root, "frontend/src/focus-room/components/FocusRoomPage.jsx"), "utf8");
const dock = fs.readFileSync(path.join(root, "frontend/src/focus-room/components/BottomControlDock.jsx"), "utf8");
const editor = fs.readFileSync(path.join(root, "frontend/src/focus-room/components/EditableTimer.jsx"), "utf8");
assert.doesNotMatch(page, /<PomodoroTimer|from "\.\/PomodoroTimer/, "session page should not mount the center timer");
assert.match(dock, /EditableTimer/, "dock timer should use the segmented editor when idle");
assert.match(dock, /size="dock"/, "dock editor should use the compact dock size");
assert.doesNotMatch(editor, /ChevronUp|ChevronDown|timer-editor-step/, "timer editing should be digit input only");
assert.doesNotMatch(editor, /addEventListener\("wheel"|ArrowUp|PageUp|stepSegment/, "timer editing should not use steppers or scroll nudges");

console.log("focus-room-glass-opacity-regression: passed");
