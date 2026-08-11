import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const setup = fs.readFileSync(path.join(root, "frontend/src/focus-room/components/FocusRoomSetup.jsx"), "utf8");
const page = fs.readFileSync(path.join(root, "frontend/src/focus-room/components/FocusRoomPage.jsx"), "utf8");
const store = fs.readFileSync(path.join(root, "frontend/src/focus-room/hooks/useFocusRoomStore.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "frontend/styles/09-focus-room.css"), "utf8");
const html = fs.readFileSync(path.join(root, "frontend/focus-room.html"), "utf8");
const data = fs.readFileSync(path.join(root, "frontend/src/focus-room/data.js"), "utf8");

assert.match(setup, /Choose a study scene/, "Focus Room setup shows the Innook-style scene chooser");
assert.match(setup, /SceneSelector/, "Focus Room setup renders all available scenes");
assert.match(setup, /Enter Focus Room/, "Focus Room setup exposes the session entry action");
assert.match(setup, /data-focus-enter/, "Enter Focus Room action is tagged for automation");
assert.match(setup, /FocusTopicsPanel/, "Setup exposes the multi-topic editor");
assert.match(setup, /data-focus-topics-toggle/, "Setup target control opens topics queue");
assert.match(setup, /∞/, "Setup exposes count-up infinity duration");
assert.match(page, /FocusRoomSetup/, "Focus Room page must render setup before the session scene");
assert.match(page, /view === "setup"/, "Focus Room page must branch on setup view");
assert.match(page, /is-innook-setup/, "Setup view applies the Innook sitting-page surface class");
assert.match(store, /view: "setup"/, "Focus Room store must initialize in setup");
assert.match(store, /returnToSetup/, "Focus Room must support returning to setup from the session");
assert.match(store, /timerMode === "countup"/, "Entering a session must preserve count-up when ∞ is selected");
assert.match(styles, /\.innook-scene-setup/, "Innook sitting page setup is styled");
assert.match(styles, /\.innook-control-rail/, "Innook vertical control rail is styled");
assert.match(styles, /\.scene-card-gallery/, "Gallery scene cards are styled");
assert.match(data, /FOCUS_ROOM_GALLERY_SCENES/, "Gallery scene set is exported for the sitting page");
assert.match(html, /auth-client\.js/, "Standalone Focus Room loads the shared Synapse auth client");
assert.match(html, /theme-bootstrap\.js\?v=theme-system-v3/, "Standalone Focus Room loads the theme-aware bootstrap runtime");
assert.match(html, /focus-room-loader-v20/, "Standalone Focus Room loads the cache-busted light-glass runtime");

console.log("focus-room-navigation-regression: passed");
