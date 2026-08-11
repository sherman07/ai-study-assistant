import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const style = await readFile(new URL("../styles/09-focus-room.css", import.meta.url), "utf8");
const theme = await readFile(new URL("../styles/00-theme.css", import.meta.url), "utf8");
assert.match(theme, /--color-accent:\s*#4a7cff/i, "The shared Synapse website accent should remain brand blue");
const marker = "Synapse blue palette lock";
const markerIndex = style.lastIndexOf(marker);
assert.ok(markerIndex >= 0, "Focus Room should end with an explicit Synapse blue palette lock");

const palette = style.slice(markerIndex);
const compactStyle = style.replace(/\s+/g, "");
for (const contract of [
  "--focus-accent: var(--color-accent",
  ".react-focus-room .glass-button-primary",
  ".react-focus-room .focus-session-dock",
  ".react-focus-room .innook-control-rail",
  ".react-focus-room .focus-topic-card.is-active",
  "accent-color: var(--focus-accent)"
]) {
  assert.ok(palette.includes(contract), `Blue palette lock should cover ${contract}`);
}

for (const setupSelector of [
  ".react-focus-room.is-innook-setup .focus-vignette",
  ".react-focus-room .innook-setup-brand",
  ".react-focus-room .innook-brand-mark",
  ".react-focus-room .scene-card-gallery-media",
  ".react-focus-room .scene-card.scene-card-gallery > .scene-card-gallery-copy strong",
  ".react-focus-room .innook-rail-divider",
  ".react-focus-room .innook-duration",
  ".react-focus-room .scene-card-gallery-media .scene-card-check"
]) {
  assert.ok(palette.includes(setupSelector), `Blue palette lock should explicitly override ${setupSelector}`);
}

for (const warmColor of ["244, 231, 211", "250, 245, 237", "#f0d7b1", "#f3d4a8", "#e8cda7", "#dfb36f"]) {
  assert.equal(palette.includes(warmColor), false, `Final Focus Room palette should not reintroduce warm cream accent ${warmColor}`);
}

for (const legacyWarmColor of [
  "244, 231, 211",
  "250, 245, 237",
  "255, 250, 240",
  "255, 248, 238",
  "255,238,205",
  "243,215,175",
  "243,212,168",
  "#f0d7b1",
  "#f3d4a8",
  "#e8cda7",
  "#dfb36f",
  "#fffaf0",
  "#fffaf3",
  "#f4e7d3",
  "#f7efe4",
  "#d7ae79",
  "#f6e2c2",
  "#f1d9b5",
  "42, 39, 35",
  "36, 31, 26",
  "30, 27, 24",
  "25, 22, 18",
  "20, 17, 15",
  "18, 16, 15",
  "22, 19, 17",
  "26, 22, 20",
  "#201f1b",
  "#30251e",
  "255, 226, 177",
  "244, 214, 172",
  "244, 214, 175",
  "240, 215, 177",
  "238, 205, 163",
  "235, 202, 147",
  "223, 179, 111",
  "144, 107, 44",
  "108, 86, 56",
  "86, 58, 23",
  "62, 52, 44",
  "61, 42, 21",
  "51, 42, 34",
  "45, 37, 31",
  "28, 18, 8",
  "27, 18, 8",
  "250, 229, 199",
  "252, 236, 212",
  "237, 214, 181",
  "#35271e",
  "#d0c19f",
  "#e2bd84",
  "#e7c493",
  "248, 223, 190",
  "247, 223, 188",
  "241, 217, 181",
  "37, 31, 27",
  "30, 26, 23",
  "30, 25, 21",
  "28, 23, 20",
  "25, 22, 19",
  "25, 21, 18",
  "24, 21, 18",
  "24, 20, 18",
  "15, 8, 2",
  "12, 10, 8",
  "12, 9, 7",
  "11, 10, 9",
  "10, 7, 5",
  "255, 250, 243",
  "255, 250, 244",
  "255, 245, 226",
  "255, 244, 224",
  "255, 244, 220",
  "255, 243, 224",
  "250, 241, 229",
  "247, 239, 228"
]) {
  assert.equal(compactStyle.includes(legacyWarmColor.replace(/\s+/g, "")), false, `Focus Room source should not retain legacy warm literal ${legacyWarmColor}`);
}

assert.ok(
  markerIndex > style.lastIndexOf("Unified glass system"),
  "The blue palette lock must follow the shared glass definitions"
);

console.log("focus room blue palette regression passed");
