/**
 * Source entity — public helpers for uploaded / linked study sources.
 * Re-exports legacy sourceUtils during migration; prefer this path in new code.
 */
export {
  formatBytes,
  getYouTubeVideoIdClient,
  getYoutubeTranscriptState,
  removeDetectedUrlsClient,
  sourceIcon,
  sourceItemLooksLikeYouTube,
  sourceKindFromFile,
  youtubeEmbedUrlFromItem,
  youtubeWatchUrlFromItem
} from "../../legacy/sourceUtils.js";
