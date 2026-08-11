import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const [borderGlow, glassSurface, magicBento, spotlight, css] = await Promise.all([
  read("../src/landing/components/react-bits/BorderGlow.jsx"),
  read("../src/landing/components/react-bits/GlassSurface.jsx"),
  read("../src/landing/components/react-bits/MagicBento.jsx"),
  read("../src/landing/components/react-bits/SpotlightCard.jsx"),
  read("../src/landing/landing.css")
]);

for (const [name, source, variable] of [
  ["BorderGlow", borderGlow, "--border-glow-x"],
  ["GlassSurface", glassSurface, "--glass-surface-x"],
  ["MagicBentoCard", magicBento, "--bento-x"],
  ["SpotlightCard", spotlight, "--spotlight-x"]
]) {
  assert.ok(source.includes("onPointerMove"), `${name} should track a pointer on its existing root`);
  assert.ok(source.includes("onPointerLeave"), `${name} should reset its light without adding layout nodes`);
  assert.ok(source.includes(variable), `${name} should expose ${variable} to CSS`);
}

assert.ok(borderGlow.includes("className={`border-glow ${className}`}"), "BorderGlow must retain its existing root");
assert.ok(borderGlow.includes('<div className="border-glow-inner">{children}</div>'), "BorderGlow must retain its existing inner node");
assert.match(magicBento, /return <div className={`magic-bento-grid/, "MagicBento must retain its grid root");
assert.ok(magicBento.includes("className={`magic-bento-card ${className}`}"), "MagicBentoCard must retain its card root");

for (const contract of [
  "--border-glow-x",
  "--glass-surface-x",
  "--bento-x",
  ".magic-bento-card::before",
  ".border-glow::before",
  "@media (prefers-reduced-motion: reduce)"
]) {
  assert.ok(css.includes(contract), `Landing interaction CSS should include ${contract}`);
}

for (const forbidden of ["#f0d7b1", "#f3d4a8", "#dfb36f", "#ffcc00"]) {
  assert.equal(css.includes(forbidden), false, `Landing interaction system must not introduce warm accent ${forbidden}`);
}

console.log("landing React Bits interaction regression passed");
