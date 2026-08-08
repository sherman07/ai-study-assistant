/**
 * Presenter helpers for media upload status messaging.
 */
import {
  isMediaFile,
  mediaKindFromFile,
  summarizeMediaUploads
} from "../model/mediaUpload.js";

export function describeAddedFiles(files = []) {
  const nextFiles = Array.isArray(files) ? files.filter(file => file && file.name) : [];
  if (!nextFiles.length) {
    return {
      type: "error",
      message: "We could not read that upload. Choose a file and try again."
    };
  }
  const summary = summarizeMediaUploads(nextFiles);
  if (summary.hasBlockingUpload) {
    return {
      type: "error",
      message: summary.warnings[0] || "One or more files exceed the upload size limit."
    };
  }
  if (summary.mediaCount) {
    const kinds = [];
    if (summary.audioCount) kinds.push(`${summary.audioCount} audio`);
    if (summary.videoCount) kinds.push(`${summary.videoCount} video`);
    const base = `${nextFiles.length} file${nextFiles.length === 1 ? "" : "s"} ready (${kinds.join(", ")}). Synapse will transcribe media, then generate tutor-style study notes.`;
    if (summary.warnings.length) {
      return { type: "error", message: `${base} ${summary.warnings[0]}` };
    }
    return { type: "success", message: `${base} Review the list, then click Analyze materials.` };
  }
  return {
    type: "success",
    message: `${nextFiles.length} file${nextFiles.length === 1 ? "" : "s"} ready. Review the list below, then click Analyze materials.`
  };
}

export function mediaReadyLabel(file) {
  const kind = mediaKindFromFile(file);
  if (!kind) return "";
  return kind === "audio" ? "Audio — will be transcribed" : "Video — transcript + key frames";
}

export { isMediaFile, mediaKindFromFile, summarizeMediaUploads };
