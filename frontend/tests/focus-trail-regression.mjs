import assert from "node:assert/strict";
import fs from "node:fs";

const setup = fs.readFileSync("frontend/src/focus-room/components/FocusRoomSetup.jsx", "utf8");
const store = fs.readFileSync("frontend/src/focus-room/hooks/useFocusRoomStore.js", "utf8");
const page = fs.readFileSync("frontend/src/focus-room/components/FocusRoomPage.jsx", "utf8");
const drawers = fs.readFileSync("frontend/src/focus-room/components/FocusRoomDrawers.jsx", "utf8");

assert.ok(setup.includes("onOpenTrail"), "the existing setup Focus Trail button should open the in-room trail");
assert.ok(store.includes("focusTrailDate"), "entering Focus Room should capture a local Focus Trail day");
assert.ok(store.includes("saveFocusRoomSession"), "entering Focus Room should persist the trail entry immediately");
assert.ok(page.includes("onOpenTrail={() => setUtilityPanel(\"trail\")}"), "setup and session views should share the existing Focus Trail drawer");
assert.ok(drawers.includes("useSessionHistory"), "Focus Trail should render Supabase-backed session history");
assert.ok(drawers.includes("30-day trail"), "Focus Trail should retain its 30-day visual rhythm");

console.log("focus trail regression passed");
