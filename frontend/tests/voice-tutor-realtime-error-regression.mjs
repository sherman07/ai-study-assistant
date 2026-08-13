import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllerSource = readLegacyControllerSections("08_extractrealtimeresponsetranscript.js");
const start = controllerSource.indexOf("function extractRealtimeResponseTranscript");
const end = controllerSource.indexOf("async function startRealtimeVoiceTutor");

assert.notEqual(start, -1, "voice tutor realtime helpers should exist");
assert.notEqual(end, -1, "startRealtimeVoiceTutor should follow helper functions");

const helperSource = controllerSource.slice(start, end);
const context = vm.createContext({ console, globalThis: {} });
vm.runInContext(`
  ${helperSource}
  globalThis.normaliseVoiceTutorErrorMessage = normaliseVoiceTutorErrorMessage;
  globalThis.voiceTutorRealtimeResponseErrorMessage = voiceTutorRealtimeResponseErrorMessage;
  globalThis.getVoiceTutorConnectionErrorMessage = getVoiceTutorConnectionErrorMessage;
`, context);

const providerError = {
  error: {
    message: "The model `gpt-realtime-mini` does not exist or you do not have access to it.",
    code: "model_not_found",
    type: "invalid_request_error"
  }
};

const message = context.globalThis.normaliseVoiceTutorErrorMessage(providerError);
assert.ok(message.includes("gpt-realtime-mini"));
assert.ok(message.includes("model_not_found"));
assert.ok(!message.includes("[object Object]"));

const httpMessage = context.globalThis.voiceTutorRealtimeResponseErrorMessage(
  JSON.stringify(providerError),
  { status: 400, statusText: "Bad Request" }
);
assert.ok(httpMessage.includes("gpt-realtime-mini"));
assert.ok(httpMessage.includes("HTTP 400 Bad Request"));
assert.ok(!httpMessage.includes("[object Object]"));

const permissionMessage = context.globalThis.getVoiceTutorConnectionErrorMessage({
  name: "NotAllowedError",
  message: providerError
});
assert.ok(permissionMessage.includes("Microphone permission is off"));

const nestedCauseMessage = context.globalThis.getVoiceTutorConnectionErrorMessage({
  message: "[object Object]",
  cause: providerError
});
assert.ok(nestedCauseMessage.includes("gpt-realtime-mini"));
assert.ok(!nestedCauseMessage.includes("[object Object]"));

console.log("voice tutor realtime error regression passed");
