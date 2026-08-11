import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "frontend/theme-bootstrap.js"), "utf8");
const focusStyles = fs.readFileSync(path.join(root, "frontend/styles/09-focus-room.css"), "utf8");
const classes = new Set();
const storage = new Map([["synapse.account.preferences.v1", JSON.stringify({ appearance: "light" })]]);
const documentRef = {
  readyState: "complete",
  documentElement: { dataset: {}, style: {} },
  body: {
    classList: {
      add(name) { classes.add(name); },
      contains(name) { return classes.has(name); },
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }
    }
  },
  addEventListener() {},
  dispatchEvent() {},
  querySelector() { return { setAttribute() {} }; }
};
const windowRef = {
  location: { pathname: "/frontend/focus-room.html" },
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener() {},
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
};

vm.runInNewContext(source, { window: windowRef, document: documentRef, CustomEvent: windowRef.CustomEvent });

assert.equal(
  documentRef.documentElement.dataset.theme,
  "light",
  "A light account preference must remain light in the standalone Focus Room."
);
assert.equal(
  classes.has("synapse-theme-dark"),
  false,
  "Focus Room must not add the dark-theme body class when the account selects light mode."
);
assert.match(
  focusStyles,
  /html\[data-theme="light"\] \.react-focus-room \{[\s\S]*?--focus-control-glass: linear-gradient\(135deg, rgba\(255, 255, 255, \.36\)/,
  "Light-mode Focus controls must use transparent white liquid glass rather than a blue-tinted fill."
);
assert.match(
  focusStyles,
  /html\[data-theme="light"\] \.react-focus-room \.focus-session-dock \{[\s\S]*?rgba\(255, 255, 255, \.28\)/,
  "The light-mode dock must remain a transparent white-glass surface over the scene."
);
assert.match(
  focusStyles,
  /html\[data-theme="light"\] \.react-focus-room \{[\s\S]*?--fr-glass: linear-gradient\(150deg, rgba\(255, 255, 255, \.26\)/,
  "The unified Focus Room panel material must resolve to transparent white glass in light mode."
);

console.log("focus-room-light-theme-regression: passed");
