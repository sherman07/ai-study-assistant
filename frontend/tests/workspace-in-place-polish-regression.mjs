import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../styles/04-section.css", import.meta.url), "utf8");
const marker = "Synapse in-place workspace polish";
const markerIndex = css.lastIndexOf(marker);
assert.ok(markerIndex >= 0, "Workspace should have an explicit in-place polish layer");
const polish = css.slice(markerIndex);

for (const contract of [
  ".tool-switch-btn:hover",
  ".tool-switch-btn:active",
  ".tool-switch-btn.active",
  ".history-item:focus-visible",
  ".history-item:active",
  "@media (prefers-reduced-motion: reduce)"
]) {
  assert.ok(polish.includes(contract), `Workspace polish should cover ${contract}`);
}

assert.ok(polish.includes("var(--color-accent"), "Workspace polish should consume the Synapse blue token");
for (const forbidden of ["#f0d7b1", "#f3d4a8", "#dfb36f", "#ffcc00"]) {
  assert.equal(polish.includes(forbidden), false, `Workspace polish must not introduce warm accent ${forbidden}`);
}

console.log("workspace in-place polish regression passed");
