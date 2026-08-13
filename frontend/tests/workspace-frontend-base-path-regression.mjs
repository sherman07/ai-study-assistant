import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authClientSource, landingAuthSource, focusRoomStoreSource, focusRoomDataSource, companionWorkspaceSource } from "./_sourceTrees.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const indexHtml = read("frontend/index.html");
const loader = read("frontend/src/legacy/loadLegacyController.js");
const authClient = authClientSource();
const assistant = read("frontend/src/react/components/AssistantPanel.js");

assert.match(
  indexHtml,
  /pathname \|\| ""\) === "\/frontend"/,
  "workspace entry must canonicalize bare /frontend to /frontend/"
);
assert.match(
  loader,
  /\/frontend\)\(\?:\\\/\|\$\)/,
  "legacy controller base URL must treat /frontend without trailing slash as the app root"
);
assert.match(
  authClient,
  /isFrontendAppPath/,
  "auth client must recognize /frontend without requiring a trailing slash"
);
assert.match(
  assistant,
  /id: "openAssistantFab"/,
  "Open Tutor FAB must not use id=openAssistant (shadows window.openAssistant)"
);
assert.doesNotMatch(
  assistant,
  /id: "openAssistant"/,
  "Open Tutor FAB must not collide with the openAssistant action export"
);

console.log("workspace frontend base path regression passed");
