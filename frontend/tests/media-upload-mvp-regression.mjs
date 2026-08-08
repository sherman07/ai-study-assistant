import assert from "node:assert/strict";

const {
  CLIENT_MAX_AUDIO_BYTES,
  isMediaFile,
  mediaKindFromFile,
  mediaSizeWarning,
  summarizeMediaUploads
} = await import("../src/legacy/model/mediaUpload.js");
const { describeAddedFiles } = await import("../src/legacy/presenters/mediaUploadPresenter.js");

assert.equal(mediaKindFromFile({ name: "lecture.mp3", type: "audio/mpeg" }), "audio");
assert.equal(mediaKindFromFile({ name: "demo.mov", type: "" }), "video");
assert.equal(isMediaFile({ name: "notes.pdf", type: "application/pdf" }), false);

const warning = mediaSizeWarning({ name: "long.mp4", size: CLIENT_MAX_AUDIO_BYTES + 1 });
assert.match(warning, /Transcription works best/i);

const summary = summarizeMediaUploads([
  { name: "a.mp3", type: "audio/mpeg", size: 1000 },
  { name: "b.mp4", type: "video/mp4", size: 2000 },
  { name: "c.pdf", type: "application/pdf", size: 3000 }
]);
assert.equal(summary.mediaCount, 2);
assert.equal(summary.audioCount, 1);
assert.equal(summary.videoCount, 1);

const described = describeAddedFiles([{ name: "talk.wav", type: "audio/wav", size: 2048 }]);
assert.equal(described.type, "success");
assert.match(described.message, /transcribe media/i);

console.log("media-upload-mvp-regression: passed");
