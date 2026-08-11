import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const [sceneCard, dock, sound, css] = await Promise.all([
  read("../src/focus-room/components/SceneCard.jsx"),
  read("../src/focus-room/components/BottomControlDock.jsx"),
  read("../src/focus-room/components/SoundControlPanel.jsx"),
  read("../styles/09-focus-room.css")
]);

assert.ok(sceneCard.includes("useReducedMotion"), "Scene cards should disable tilt for reduced motion");
assert.ok(sceneCard.includes("--scene-glare-x"), "Scene cards should expose an in-place glare position");
assert.ok(sceneCard.includes("onPointerLeave"), "Scene cards should reset their in-place glare");
assert.ok(dock.includes("--dock-light-x"), "The existing dock root should expose a cursor light position");
assert.ok(dock.includes("onPointerMove"), "The existing dock should track pointer light without a wrapper");
assert.ok(sound.includes("--slider-progress"), "The existing Radix slider should expose its current blue range");

const markerIndex = css.lastIndexOf("Synapse blue palette lock");
const palette = css.slice(markerIndex);
for (const contract of [
  "--scene-glare-x",
  "--dock-light-x",
  ".react-focus-room .radix-slider-range",
  ".react-focus-room .radix-slider-thumb:active",
  ".react-focus-room .scene-card-gallery.active",
  "@media (prefers-reduced-motion: reduce)"
]) {
  assert.ok(palette.includes(contract), `Final blue Focus interaction system should include ${contract}`);
}

const dockClarityMarker = palette.lastIndexOf("Bottom dock clarity pass");
assert.notEqual(dockClarityMarker, -1, "The final palette layer should include a dedicated translucent dock material");
const dockClarity = palette.slice(dockClarityMarker);
assert.match(
  dockClarity,
  /\.react-focus-room \.focus-session-dock\s*\{[\s\S]*?background:\s*linear-gradient\(115deg,\s*rgba\(126, 161, 255, \.18\),\s*rgba\(40, 82, 166, \.16\) 52%,\s*rgba\(6, 19, 43, \.24\)\);/,
  "The existing dock should use a light, low-opacity blue glass fill so the scene remains visible"
);
assert.match(
  dockClarity,
  /backdrop-filter:\s*blur\(14px\) saturate\(128%\) brightness\(1\.08\);/,
  "The dock should preserve scene detail with a restrained blur"
);
assert.match(
  dockClarity,
  /\.react-focus-room \.focus-session-dock::before\s*\{[\s\S]*?opacity:\s*\.46;/,
  "The pointer-light layer should not make the dock opaque"
);
assert.doesNotMatch(
  dockClarity,
  /\b(?:width|height|padding|margin|position|inset|top|right|bottom|left|grid-template-columns)\s*:/,
  "The clarity pass must not change the dock's structure, size, or placement"
);

const controlClarityMarker = palette.lastIndexOf("Focus control transparency pass");
assert.notEqual(controlClarityMarker, -1, "The final palette layer should unify all Focus Room buttons with the dock glass");
const controlClarity = palette.slice(controlClarityMarker);
for (const selector of [
  ".react-focus-room .glass-button",
  ".react-focus-room .header-icon-button",
  ".react-focus-room .dock-action-button",
  ".react-focus-room .dock-focus-mode",
  ".react-focus-room .innook-header-action",
  ".react-focus-room .innook-rail-icon",
  ".react-focus-room .focus-selection-icon",
  ".react-focus-room .setup-quiet-action"
]) {
  assert.ok(controlClarity.includes(selector), `The light glass material should cover ${selector}`);
}
assert.match(
  controlClarity,
  /--focus-control-glass:\s*linear-gradient\(135deg,\s*rgba\(126, 161, 255, \.18\),\s*rgba\(40, 82, 166, \.16\) 55%,\s*rgba\(6, 19, 43, \.24\)\);/,
  "Focus Room buttons should use the same low-opacity blue glass family as the dock"
);
assert.match(
  controlClarity,
  /background:\s*var\(--focus-control-glass\) !important;/,
  "Default Focus Room buttons should inherit the transparent glass fill"
);
assert.match(
  controlClarity,
  /border-color:\s*rgba\(176, 201, 255, \.38\) !important;/,
  "The final control layer should prevent older warm button borders from returning"
);
assert.match(
  controlClarity,
  /\.react-focus-room \.glass-button-primary,[\s\S]*?background:\s*var\(--focus-control-glass-primary\) !important;/,
  "Primary buttons should remain recognisable while still using translucent blue glass"
);
assert.doesNotMatch(
  controlClarity,
  /\b(?:width|height|padding|margin|position|inset|top|right|bottom|left|grid-template-columns)\s*:/,
  "The transparent-control pass must not change button or dock geometry"
);

console.log("focus room control motion regression passed");
