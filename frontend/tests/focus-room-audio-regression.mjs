import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const data = await import("../src/focus-room/data.js");

assert.equal(data.FOCUS_ROOM_MUSIC_TRACKS.length, 4);
assert.deepEqual(
  data.FOCUS_ROOM_MUSIC_TRACKS.map(track => track.label),
  ["Deep Focus", "Lo-fi", "Piano", "Minimal"]
);
assert.ok(data.FOCUS_ROOM_MUSIC_TRACKS.every(track => track.streamUrl && track.pageUrl && track.attribution && track.license));

assert.deepEqual(
  data.FOCUS_ROOM_AMBIENT_SOUNDS.map(sound => sound.label),
  ["Nature", "Cafe Rain", "Rain", "White Noise", "Ocean", "Wind"]
);
assert.ok(data.FOCUS_ROOM_AMBIENT_SOUNDS.every(sound => sound.layers.length && sound.pageUrl && sound.license));

assert.deepEqual(
  data.FOCUS_ROOM_AUDIO_PRESETS.map(preset => preset.label),
  ["Soft Piano", "Lo-fi Café", "Nature Flow", "Warm Ambience", "Deep Focus"]
);
assert.deepEqual(
  data.FOCUS_ROOM_AUDIO_PRESETS.map(preset => [preset.musicType, preset.ambientSound]),
  [
    ["Piano", "Nature"],
    ["Lo-fi", "Cafe Rain"],
    ["Deep Focus", "Nature"],
    ["Minimal", "Rain"],
    ["Deep Focus", "White Noise"]
  ]
);
assert.ok(data.FOCUS_ROOM_AUDIO_PRESETS.every(preset => preset.id && preset.description));
assert.equal(data.focusRoomAudioPreset("lofi-cafe").label, "Lo-fi Café");
assert.equal(data.focusRoomAudioPreset("missing-preset").label, "Deep Focus");
assert.equal(data.focusRoomAudioPresetForConfig({ musicType: "Piano", ambientSound: "Nature" }).id, "soft-piano");
assert.equal(data.focusRoomAudioPresetForConfig({ musicType: "Minimal", ambientSound: "White Noise" }), null);

const storedValues = new Map();
globalThis.localStorage = {
  getItem(key) { return storedValues.has(key) ? storedValues.get(key) : null; },
  setItem(key, value) { storedValues.set(key, String(value)); },
  removeItem(key) { storedValues.delete(key); }
};
const { useFocusRoomStore } = await import(`../src/focus-room/hooks/useFocusRoomStore.js?audio-presets=${Date.now()}`);
useFocusRoomStore.getState().applyAudioPreset("lofi-cafe");
assert.equal(useFocusRoomStore.getState().musicType, "Lo-fi");
assert.equal(useFocusRoomStore.getState().ambientSound, "Cafe Rain");
useFocusRoomStore.getState().applyAudioPreset("missing-preset");
assert.equal(useFocusRoomStore.getState().musicType, "Deep Focus");
assert.equal(useFocusRoomStore.getState().ambientSound, "White Noise");

const rainyCafe = data.FOCUS_ROOM_SCENES.find(scene => scene.id === "rainy-cafe");
assert.equal(rainyCafe.ambientSound, "Cafe Rain");
const rainyCafeProfile = data.getFocusRoomAudioProfile(rainyCafe);
assert.equal(rainyCafeProfile.musicTrack.label, "Lo-fi");
assert.equal(rainyCafeProfile.ambientSound.label, "Cafe Rain");
assert.equal(rainyCafeProfile.ambientLayers.length, 2);
assert.ok(rainyCafeProfile.ambientLayers.some(layer => /Cafe/i.test(layer.title)));
assert.ok(rainyCafeProfile.ambientLayers.some(layer => /Rain/i.test(layer.title)));

const oceanProfile = data.getFocusRoomAudioProfile({ musicType: "Deep Focus", ambientSound: "Ocean" });
assert.equal(oceanProfile.musicTrack.title, "Chasing Daylight");
assert.ok(oceanProfile.ambientLayers[0].streamUrl.includes("Waves.ogg"));

const audioSource = read("frontend/src/focus-room/audio.js");
for (const token of [
  'import howler from "howler"',
  "new Howl",
  "loop: true",
  "html5: true",
  "fade(",
  "removeInactiveAmbientChannels",
  "setFocusRoomAudioPlaying",
  "toggleFocusRoomAudio",
  "stopFocusRoomAudio"
]) {
  assert.ok(audioSource.includes(token), `Howler audio module should include ${token}`);
}

const audioHook = read("frontend/src/focus-room/hooks/useAudioSettings.js");
for (const token of [
  "FOCUS_ROOM_AUDIO_PREFS_KEY",
  "syncFocusRoomAudio",
  "setFocusRoomAudioPlaying",
  "localStorage"
]) {
  assert.ok(audioHook.includes(token), `Audio settings hook should include ${token}`);
}

console.log("focus room audio regression passed");
