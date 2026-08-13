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

const renderedMessages = [];
const context = vm.createContext({
  console,
  globalThis: {},
  Date,
  JSON,
  window: {
    setTimeout(callback) {
      return setTimeout(callback, 0);
    },
  },
  voiceRealtimeAssistantDraft: "",
  voiceRealtimeResponseActive: false,
  voiceRealtimeTranscriptCommitted: false,
  voiceTutorLastState: { mastery: 0 },
  voiceRealtimeConnected: true,
  setVoiceTutorBusy() {},
  clearVoiceNoTranscriptTimer() {},
  scheduleVoiceNoTranscriptNotice() {},
  updateVoiceTutorStatus() {},
  updateVoiceTutorControls() {},
  normaliseVoiceTutorHistory(items) {
    return items;
  },
  normaliseStreamingVoiceTutorText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  },
  addVoiceTutorMessage(role, text, extras = {}) {
    renderedMessages.push({ role, text, extras });
  },
  updateVoiceTutorStreamingAssistantMessage(text, extras = {}) {
    const existing = renderedMessages.find(item => item.role === "assistant" && item.streaming);
    if (existing) {
      existing.text = text;
      existing.extras = extras;
    } else {
      renderedMessages.push({ role: "assistant", text, extras, streaming: true });
    }
  },
  resetVoiceTutorStreamingAssistantMessage() {},
});

vm.runInContext(controllerSource.slice(start, end), context);

context.handleRealtimeTutorEvent({
  data: JSON.stringify({ type: "response.created" }),
});
context.handleRealtimeTutorEvent({
  data: JSON.stringify({ type: "response.audio_transcript.delta", delta: "The open-economy " }),
});
context.handleRealtimeTutorEvent({
  data: JSON.stringify({ type: "response.audio_transcript.delta", delta: "model links saving to capital flows." }),
});

assert.equal(renderedMessages.length, 1, "assistant transcript deltas should update one live message card");
assert.equal(renderedMessages[0].role, "assistant");
assert.equal(
  renderedMessages[0].text,
  "The open-economy model links saving to capital flows.",
);
assert.equal(context.voiceRealtimeTranscriptCommitted, false, "delta text should not be treated as a final committed message");

console.log("voice tutor streaming transcript regression passed");
