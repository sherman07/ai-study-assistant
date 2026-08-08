/**
 * Client-side media upload model for audio/video study materials.
 * Mirrors backend domain limits for pre-analyze warnings.
 */

export const MEDIA_AUDIO_EXTENSIONS = [".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac", ".wma"];
export const MEDIA_VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv", ".mpeg", ".mpg"];

/** Keep aligned with backend MAX_AUDIO_BYTES default (24MB). */
export const CLIENT_MAX_AUDIO_BYTES = 24 * 1024 * 1024;
/** Keep aligned with backend MAX_UPLOAD_BYTES default (100MB). */
export const CLIENT_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export function mediaKindFromFile(file = {}) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("audio/") || MEDIA_AUDIO_EXTENSIONS.some(ext => name.endsWith(ext))) return "audio";
  if (type.startsWith("video/") || MEDIA_VIDEO_EXTENSIONS.some(ext => name.endsWith(ext))) return "video";
  return "";
}

export function isMediaFile(file) {
  return Boolean(mediaKindFromFile(file));
}

export function mediaFileIcon(kind) {
  if (kind === "audio") return "bi-file-earmark-music";
  if (kind === "video") return "bi-camera-video";
  return "bi-file-earmark-text";
}

export function mediaSizeWarning(file, maxAudioBytes = CLIENT_MAX_AUDIO_BYTES, maxUploadBytes = CLIENT_MAX_UPLOAD_BYTES) {
  const size = Number(file?.size || 0);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size > maxUploadBytes) {
    return `${file.name} is about ${(size / (1024 * 1024)).toFixed(1)}MB and exceeds the upload limit (${(maxUploadBytes / (1024 * 1024)).toFixed(0)}MB).`;
  }
  if (isMediaFile(file) && size > maxAudioBytes) {
    return `${file.name} is about ${(size / (1024 * 1024)).toFixed(1)}MB. Transcription works best under about ${(maxAudioBytes / (1024 * 1024)).toFixed(0)}MB — use a shorter clip or paste a transcript for fuller notes.`;
  }
  return "";
}

export function summarizeMediaUploads(files = []) {
  const list = Array.isArray(files) ? files.filter(Boolean) : [];
  const media = list.filter(isMediaFile);
  const warnings = media.map(file => mediaSizeWarning(file)).filter(Boolean);
  return {
    total: list.length,
    mediaCount: media.length,
    audioCount: media.filter(file => mediaKindFromFile(file) === "audio").length,
    videoCount: media.filter(file => mediaKindFromFile(file) === "video").length,
    warnings,
    hasBlockingUpload: media.some(file => Number(file.size || 0) > CLIENT_MAX_UPLOAD_BYTES)
  };
}
