import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = fs.readFileSync(path.join(root, "frontend/theme-bootstrap.js"), "utf8");

function createHarness({ systemDark = false, focusRoomStandalone = false } = {}) {
  const store = new Map();
  const rootElement = { dataset: {}, style: {} };
  const bodyClasses = new Set(focusRoomStandalone ? ["focus-room-standalone"] : []);
  const body = {
    classList: {
      contains(name) {
        return bodyClasses.has(name);
      },
      toggle(name, force) {
        if (force === true) bodyClasses.add(name);
        else if (force === false) bodyClasses.delete(name);
        else if (bodyClasses.has(name)) bodyClasses.delete(name);
        else bodyClasses.add(name);
      },
      add(name) {
        bodyClasses.add(name);
      },
      remove(name) {
        bodyClasses.delete(name);
      }
    }
  };
  const meta = { content: "" };
  const listeners = {};
  const mediaListeners = new Set();
  const media = {
    matches: systemDark,
    addEventListener(type, listener) { if (type === "change") mediaListeners.add(listener); },
    addListener(listener) { mediaListeners.add(listener); }
  };
  const document = {
    documentElement: rootElement,
    body,
    querySelector(selector) { return selector === 'meta[name="theme-color"]' ? { setAttribute(_, value) { meta.content = value; } } : null; },
    dispatchEvent() {}
  };
  const window = {
    localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) },
    matchMedia: () => media,
    addEventListener(type, listener) { listeners[type] = listener; }
  };
  const context = { window, document, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, Set, JSON, Object };
  vm.runInNewContext(script, context);
  return { window, rootElement, media, mediaListeners, listeners, store, meta };
}

const harness = createHarness();
assert.equal(harness.window.SynapseTheme.getPreference(), "system", "System is the safe default preference");
assert.equal(harness.rootElement.dataset.theme, "light", "System resolves to light when the OS is light");
assert.equal(harness.rootElement.dataset.themePreference, "system", "Root stores the user preference separately from the resolved theme");

const focusRoomHarness = createHarness({ focusRoomStandalone: true });
assert.equal(
  focusRoomHarness.rootElement.dataset.theme,
  "dark",
  "Focus Room standalone documents stay dark even when the OS preference is light"
);
assert.equal(
  focusRoomHarness.rootElement.dataset.themePreference,
  "system",
  "Focus Room still records the account preference separately from the forced dark resolve"
);

harness.window.SynapseTheme.setPreference("dark");
assert.equal(harness.rootElement.dataset.theme, "dark", "Explicit dark applies to the root HTML element");
assert.equal(JSON.parse(harness.store.get("synapse.account.preferences.v1")).appearance, "dark", "Explicit theme persists in the shared preferences object");

harness.window.SynapseTheme.setPreference("system");
harness.media.matches = true;
for (const listener of harness.mediaListeners) listener({ matches: true });
assert.equal(harness.rootElement.dataset.theme, "dark", "System preference reacts to a live OS theme change");

harness.store.set("synapse.account.preferences.v1", JSON.stringify({ appearance: "light" }));
harness.listeners.storage({ key: "synapse.account.preferences.v1" });
assert.equal(harness.rootElement.dataset.theme, "light", "Storage synchronization updates another tab's theme without a refresh");

for (const page of ["index.html", "landing.html", "focus-room.html", "login.html", "pricing.html"]) {
  const html = fs.readFileSync(path.join(root, "frontend", page), "utf8");
  assert.match(html, /theme-bootstrap\.js/, `${page} loads the shared pre-paint theme bootstrap`);
  assert.match(html, /styles\/00-theme\.css\?v=(?:theme-type-scale-v1|ui-english-v1|notes-source-priority-v1)/, `${page} loads the current semantic theme stylesheet`);
  assert.match(html, /styles\/99-dark-mode\.css\?v=(?:dark-mode-v6|notes-source-priority-v1|notes-source-split-v1|source-preview-instant-v1|source-preview-pages-v1)/, `${page} loads the current dark-mode compatibility layer`);
  if (html.includes("config.js")) {
    assert.match(html, /config\.js\?v=public-auth-session-v4/, `${page} loads the current runtime config`);
  }
}

const tokens = fs.readFileSync(path.join(root, "frontend/styles/00-theme.css"), "utf8");
const darkLayer = fs.readFileSync(path.join(root, "frontend/styles/99-dark-mode.css"), "utf8");
for (const token of ["--color-page-background", "--color-surface-primary", "--color-text-primary", "--color-accent", "--color-overlay", "--shadow-modal"]) {
  assert.match(tokens, new RegExp(token), `${token} is part of the semantic theme contract`);
}
for (const selector of [".tool-switch-btn", ".memory-topic-row", ".mm-node-dot", "scrollbar-color"]) {
  assert.match(darkLayer, new RegExp(selector.replace(/[.]/g, "\\.")), `${selector} has a dark-mode override`);
}

console.log("theme-system-regression: passed");
