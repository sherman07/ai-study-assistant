/**
 * Workspace keyboard accessibility: skip link + main landmark contract.
 * Source-structure regression (not a live browser interaction proof).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const appShell = read("frontend/src/react/components/AppShell.js");
const layoutCss = read("frontend/styles/01-section.css");
const themeCss = read("frontend/styles/00-theme.css");
const landing = read("frontend/src/landing/LandingPage.jsx");
const login = read("frontend/login.html");
const signup = read("frontend/signup.html");
const forgot = read("frontend/forgot-password.html");
const reset = read("frontend/reset-password.html");
const verify = read("frontend/verify.html");
const index = read("frontend/index.html");

assert.match(
  appShell,
  /className:\s*"skip-link"/,
  "workspace shell must expose a skip link for keyboard users"
);
assert.match(
  appShell,
  /href:\s*"#mainNotes"/,
  "workspace skip link must target the main study landmark"
);
assert.match(
  appShell,
  /Skip to study content/,
  "workspace skip link must have clear student-facing copy"
);
assert.match(
  appShell,
  /id:\s*"mainNotes"[\s\S]*tabIndex:\s*-1/,
  "mainNotes must be focusable so skip-link activation moves keyboard focus"
);

assert.match(layoutCss, /\.skip-link\s*\{/, "workspace CSS must style the skip link");
assert.match(
  layoutCss,
  /\.skip-link:focus(?:-visible)?[\s\S]*transform:\s*translateY\(0\)/,
  "skip link must become visible on keyboard focus"
);
assert.match(
  themeCss,
  /:focus-visible[\s\S]*outline:\s*3px solid var\(--color-focus-ring\)/,
  "shared theme must keep a visible focus ring contract"
);

assert.match(landing, /className="skip-link"/, "landing must keep its skip link");
assert.match(landing, /id="main-content"/, "landing must keep a main-content target");

const pricing = read("frontend/pricing.html");
assert.match(pricing, /class="skip-link"/, "pricing must expose a skip link");
assert.match(
  pricing,
  /id="main-content"[^>]*tabindex="-1"/i,
  "pricing must expose a focusable main-content landmark"
);

for (const [name, html] of [
  ["login", login],
  ["signup", signup],
  ["forgot-password", forgot],
  ["reset-password", reset],
  ["verify", verify],
]) {
  assert.match(html, /class="skip-link"/, `${name} must expose a skip link`);
  assert.match(
    html,
    /id="main-content"[^>]*tabindex="-1"/i,
    `${name} must expose a focusable main-content landmark`
  );
  assert.match(html, /Skip to content/, `${name} skip link copy must be clear`);
}

assert.match(
  index,
  /style\.css\?v=a11y-skip-v1/,
  "workspace styles must cache-bust after skip-link CSS"
);
assert.match(
  index,
  /main\.js\?v=a11y-skip-v1/,
  "workspace shell must cache-bust after skip-link markup"
);

console.log("workspace-a11y-skip-link-regression: passed");
