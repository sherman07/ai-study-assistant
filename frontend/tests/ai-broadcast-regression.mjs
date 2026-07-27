import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");
const exists = file => fs.existsSync(path.join(repoRoot, file));

const requiredFiles = [
  "server/src/repositories/broadcastJobsRepository.js",
  "server/src/routes/broadcastJobs.js",
  "frontend/src/legacy/controller_sections/12_broadcastjobs.js"
];

for (const file of requiredFiles) {
  assert.ok(exists(file), `${file} should exist`);
}

const app = read("server/src/app.js");
const index = read("frontend/index.html");
const rootIndex = read("index.html");
const appShim = read("app.html");
const main = read("frontend/src/main.js");
const appShellEntry = read("frontend/src/react/App.js");
const appShell = read("frontend/src/react/components/AppShell.js");
const analysisStage = read("frontend/src/react/components/AnalysisStage.js");
const styleRoot = read("frontend/style.css");
const loader = read("frontend/src/legacy/loadLegacyController.js");
const supabaseSchema = read("server/src/db/supabase-schema.sql");
const repository = read("server/src/repositories/broadcastJobsRepository.js");
const routes = read("server/src/routes/broadcastJobs.js");
const dataClient = read("frontend/src/legacy/dataApiClient.js");
const legacyController = read("frontend/src/legacy/controller.js");
const boot = read("frontend/src/legacy/controller_sections/99_boot.js");
const reset = read("frontend/src/legacy/controller_sections/08_extractrealtimeresponsetranscript.js");
const history = read("frontend/src/legacy/controller_sections/09_togglesourceviewer.js");
const broadcastController = read("frontend/src/legacy/controller_sections/12_broadcastjobs.js");
const backendApp = read("backend/app.py");
const backendBroadcastMode = read("backend/app_sections/13_broadcast_mode.py");
const studyTools = read("frontend/src/react/components/StudyTools.js");
const styles = read("frontend/styles/04-section.css");
const serverEnvExample = read("server/.env.example");
const backendEnvExample = read("backend/.env.example");
const geminiEnvExample = read("backend/.env.gemini.example");
const broadcastAssetVersion = "ai-broadcast-v19";
const legacyControllerAssetVersion = "upload-job-retry-v1";

assert.ok(rootIndex.includes("frontend/landing.html"), "root index should keep the landing page as the public entry");
assert.ok(appShim.includes("frontend/index.html"), "app shim should open the study workspace frontend");
assert.ok(index.includes(broadcastAssetVersion), "workspace HTML should bust cached React shell assets");
assert.ok(styleRoot.includes('@import url("./styles/04-section.css");'), "root CSS should import broadcast styles");
assert.ok(main.includes(broadcastAssetVersion), "main module should bust cached React and controller loader imports");
assert.ok(appShellEntry.includes(broadcastAssetVersion), "React app entry should bust cached AppShell imports");
assert.ok(appShell.includes(broadcastAssetVersion), "AppShell should bust cached child component imports");
assert.ok(analysisStage.includes(`StudyTools.js?v=${broadcastAssetVersion}`), "AnalysisStage should bust cached StudyTools imports");
assert.ok(loader.includes(legacyControllerAssetVersion), "controller script URL should bust cached controller");
assert.ok(legacyController.includes(`CONTROLLER_VERSION = "${legacyControllerAssetVersion}"`), "legacy controller sections should use the settings cache key");
assert.ok(app.includes('"/api/broadcast-jobs"'), "Express app should mount broadcast job routes");

assert.ok(supabaseSchema.includes("broadcast_jobs"), "Supabase schema should create broadcast_jobs");

for (const token of [
  "script_model",
  "tts_provider",
  "tts_model",
  "transcript_json",
  "chapters_json",
  "source_references_json",
  "audio_metadata_json"
]) {
  assert.ok(supabaseSchema.includes(token), `Supabase schema should include ${token}`);
}

for (const token of [
  "BROADCAST_SCRIPT_MODEL",
  "gpt-5.4-mini",
  "BROADCAST_TTS_MODEL",
  "gpt-4o-mini-tts",
  "BROADCAST_TTS_PROVIDER",
  "openai",
  "queued",
  "planning",
  "scripting",
  "validating",
  "generating_audio",
  "completed",
  "failed",
  "cancelled",
  "createBroadcastJob",
  "listBroadcastJobs",
  "getBroadcastJob",
  "cancelBroadcastJob",
  "retryBroadcastJob",
  "deleteBroadcastJob"
]) {
  assert.ok(repository.includes(token), `broadcast repository should include ${token}`);
}

for (const token of [
  'router.post("/",',
  'router.get("/",',
  'router.get("/:id",',
  'router.patch("/:id",',
  'router.post("/:id/cancel",',
  'router.post("/:id/retry",',
  'router.delete("/:id",'
]) {
  assert.ok(routes.includes(token), `broadcast routes should include ${token}`);
}

for (const token of [
  "createBroadcastJobInDataApi",
  "fetchBroadcastJobsFromDataApi",
  "fetchBroadcastJobFromDataApi",
  "cancelBroadcastJobInDataApi",
  "retryBroadcastJobInDataApi",
  "deleteBroadcastJobFromDataApi",
  "patchBroadcastJobInDataApi"
]) {
  assert.ok(dataClient.includes(token), `data API client should export ${token}`);
}

assert.ok(legacyController.includes('"12_broadcastjobs.js"'), "legacy controller should load broadcast jobs module");
assert.ok(history.includes("getVisibleBroadcastJobs"), "history sidebar should merge broadcast jobs");
assert.ok(history.includes("renderBroadcastJobHistoryItemHTML"), "history sidebar should render broadcast cards");

for (const token of [
  "openAiBroadcastSetup",
  "generateBroadcastFromSetup",
  "openBroadcastJob",
  "cancelBroadcastJob",
  "retryBroadcastJob",
  "deleteBroadcastJob",
  "recoverBroadcastJobsOnBoot",
  "setupBroadcastTool",
  "restartBroadcastPlayback",
  "seekBroadcastSection",
  "syncBroadcastJobsWithDataApi"
]) {
  assert.ok(boot.includes(token), `boot should expose ${token}`);
}

assert.ok(boot.includes("setupBroadcastTool();"), "boot should install the AI Broadcast tool dynamically");
assert.ok(reset.includes("setupBroadcastTool();"), "workspace reset should restore the AI Broadcast tool");

for (const token of [
  "BROADCAST_JOBS_STORAGE_KEY",
  "BROADCAST_HISTORY_LIMIT",
  "AI Broadcast",
  "function setupBroadcastTool()",
  "toolBtnBroadcast",
  "toolPanelBroadcast",
  "Calm study narrator",
  "Exam preparation coach",
  "Natural podcast style",
  "Deep explanation mode",
  "Quick revision mode",
  "gpt-5.4-mini",
  "gpt-4o-mini-tts",
  "collectBroadcastModeContext",
  "requestBroadcastModePackage",
  "replaceBroadcastJob",
  ".slice(0, BROADCAST_HISTORY_LIMIT)",
  'apiClient.fetch("/broadcast/generate"',
  'apiClient.fetch("/broadcast/realtime-call"',
  "speakerInstructions",
  "qualityChecks",
  "renderBroadcastSetupPanel",
  "renderBroadcastJobProgress",
  "renderBroadcastPlayer",
  "toggleBroadcastPlayback",
  "playBroadcastRealtime",
  "buildBroadcastRealtimeFormData",
  "broadcastPlaybackTimelineStarts",
  "getBroadcastPlaybackElapsedSeconds",
  "lastRenderedSeconds",
  "requestBroadcastRealtimeSpeech",
  "buildBroadcastRealtimeSegmentInstruction",
  "sectionIndex",
  "output_modalities: [\"audio\"]",
  "handleBroadcastRealtimeEvent",
  "response.done",
  "response.audio.done",
  "Script generation recipe",
  "scriptMetadata",
  "syncBroadcastJobsWithDataApi",
  "RTCPeerConnection",
  "openai-realtime",
  "restartBroadcastPlayback",
  "seekBroadcastSection",
  "seekBroadcastChapter",
  "Regenerate Broadcast",
  "Open Current Broadcast",
  "GPT Realtime speaker ready",
  "Play streams the broadcast through the same OpenAI Realtime voice stack as Voice Tutor.",
  "This source may not have enough content for a high-quality broadcast.",
  "Generate quiz from this broadcast",
  "Generate flashcards from this broadcast",
  "Open as Study Material"
]) {
  assert.ok(broadcastController.includes(token), `broadcast controller should include ${token}`);
}
assert.ok(!/response:\s*\{[\s\S]*?\n\s*modalities:\s*\["audio"\]/.test(broadcastController), "broadcast response events must use the current Realtime output_modalities field");
assert.ok(broadcastController.includes("broadcastScript"), "Realtime playback should carry the generated broadcast script");
assert.ok(!broadcastController.includes('event.type === "response.done" || event.type === "response.audio.done"'), "audio.done must not end the whole broadcast");
assert.ok(broadcastController.includes('event.type === "response.done"'), "the full response completion event should advance or end playback");
assert.ok(broadcastController.includes("function weightedBroadcastTimelineStarts(job)"), "chapter timing should be derived from the generated chapter scripts");
assert.ok(!broadcastController.includes("sectionDurations"), "response completion timing must not rewrite chapter positions before buffered audio is heard");
assert.ok(broadcastController.includes('formData.append("start_seconds", String(Math.round('), "the frontend should send integer WebRTC seek positions");
assert.ok(broadcastController.includes('audio.addEventListener("playing"'), "the visible playback clock must begin only when remote audio is actually audible");
assert.ok(broadcastController.includes('activeBroadcastPlayback.connecting'), "the player should distinguish connecting from audible playback");
assert.ok(broadcastController.includes("data-broadcast-chapter-index"), "chapter buttons should expose synchronized runtime state");
assert.ok(broadcastController.includes("data-broadcast-line-index"), "transcript lines should expose synchronized runtime state");
assert.ok(broadcastController.includes("activeBroadcastPlayback.lastRenderedSeconds"), "the visible playback clock should remain monotonic");
assert.ok(broadcastController.includes("const seconds = getBroadcastPlaybackElapsedSeconds(job)"), "pause and rate changes should capture the current runtime position");
assert.ok(broadcastController.includes("const sectionIndex = broadcastPlaybackSectionIndex(job, seconds)"), "resume should resolve the chapter before transport teardown");
assert.ok(broadcastController.includes("const endedSeconds = ended ? getBroadcastPlaybackElapsedSeconds(job) : 0"), "completion should render the measured final position");
assert.ok(broadcastController.includes("updateBroadcastPlaybackUI(job, ended ? endedSeconds : 0"), "completion must not jump back to the static estimate");
assert.ok(broadcastController.includes("peer.__synapseDisconnectTimer"), "transient WebRTC disconnects should have a recovery window");
assert.ok(!broadcastController.includes('["failed", "closed", "disconnected"].includes(state)'), "transient disconnects must not immediately stop playback");
assert.ok(!broadcastController.includes("setBroadcastJobs([nextJob]);"), "creating a new broadcast must preserve prior broadcast history");
assert.ok(!broadcastController.includes("nextJobs.slice(0, 1)"), "boot recovery must preserve the broadcast history limit");

assert.ok(studyTools.includes("toolBtnBroadcast"), "Study tools should include AI Broadcast tab button");
assert.ok(studyTools.includes("toolPanelBroadcast"), "Study tools should include AI Broadcast panel");

for (const source of [serverEnvExample, backendEnvExample, geminiEnvExample]) {
  assert.ok(source.includes("BROADCAST_TTS_MODEL=gpt-4o-mini-tts"), "env examples should document OpenAI Broadcast TTS");
}
assert.ok(serverEnvExample.includes("BROADCAST_SCRIPT_MODEL=gpt-5.4-mini"), "server env should document the broadcast script model");
assert.ok(backendEnvExample.includes("BROADCAST_SCRIPT_MODEL=gpt-5.4-mini"), "backend env should document the broadcast script model");
assert.ok(backendEnvExample.includes("BROADCAST_TTS_PROVIDER=openai"), "backend env should document OpenAI TTS provider");
assert.ok(backendEnvExample.includes("OPENAI_REALTIME_MODEL=gpt-realtime-2"), "backend env should document the realtime speaker model");
assert.ok(backendEnvExample.includes("OPENAI_REALTIME_VOICE=marin"), "backend env should document the realtime speaker voice");

assert.ok(backendApp.includes('"13_broadcast_mode.py"'), "FastAPI app should load Broadcast Mode section");
for (const token of [
  '@app.post("/broadcast/generate")',
  '@app.post("/broadcast/tts")',
  '@app.post("/broadcast/realtime-call")',
  "BROADCAST_SPEAKER_INSTRUCTIONS",
  "gpt-4o-mini-tts",
  "REALTIME_MODEL",
  "REALTIME_VOICE",
  "https://api.openai.com/v1/realtime/calls",
  "Generated Synapse content package",
  "Do not create a generic podcast",
  "split_broadcast_script_for_tts",
  "client.audio.speech.create",
  "qualityChecks"
]) {
  assert.ok(backendBroadcastMode.includes(token), `backend Broadcast Mode should include ${token}`);
}

for (const token of [
  ".broadcast-setup-card",
  ".broadcast-player-card",
  ".history-broadcast-status",
  ".broadcast-chapter-list",
  ".broadcast-transcript",
  ".broadcast-voice-direction"
]) {
  assert.ok(styles.includes(token), `broadcast styles should include ${token}`);
}
assert.ok(styles.includes(".broadcast-transcript article.is-playing"), "broadcast styles should highlight the active transcript line");
assert.ok(styles.includes(".broadcast-chapter-list li.is-playing button"), "broadcast styles should highlight the active chapter");

console.log("ai broadcast regression passed");
