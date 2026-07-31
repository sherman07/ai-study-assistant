/**
 * Workspace keyboard accessibility: skip link + main landmark contract.
 * Source-structure regression (not a live browser interaction proof).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const appShell = read("frontend/src/react/components/AppShell.js");
const layoutCss = read("frontend/styles/01-section.css");
const themeCss = read("frontend/styles/00-theme.css");
const landing = read("frontend/src/landing/LandingPage.jsx");
const login = read("frontend/login.html");
const signup = read("frontend/signup.html");
const forgotPassword = read("frontend/forgot-password.html");
const resetPassword = read("frontend/reset-password.html");
const verify = read("frontend/verify.html");

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

for (const [name, html] of [
  ["login", login],
  ["signup", signup],
  ["forgot-password", forgotPassword],
  ["reset-password", resetPassword],
  ["verify", verify],
]) {
  assert.match(html, /skip-link/, `${name} page must include a skip link`);
  assert.match(html, /id="main-content"|id='main-content'/, `${name} page must expose a main landmark target`);
  assert.match(html, /<main[^>]*id="main-content"/, `${name} page main landmark must be a <main> element`);
}

console.log("workspace-a11y-skip-link-regression: passed");
