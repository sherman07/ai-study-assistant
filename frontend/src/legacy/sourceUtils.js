import { formatBytes as formatBytesShared } from "../shared/lib/bytes.js";

const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_URL_VIDEO_ID_REGEX = new RegExp(
  "(?:https?:\\/\\/)?(?:www\\.)?(?:youtube(?:-nocookie)?\\.com\\/" +
    "(?:watch\\?[^<>\"'\\s]*?v=|embed\\/|shorts\\/|live\\/)|youtu\\.be\\/)" +
    "([A-Za-z0-9_-]{11})",
  "i"
);
const YOUTUBE_TRANSCRIPT_UNAVAILABLE_TEXT = "No readable YouTube transcript could be accessed.";

class FileSourceClassifier {
  constructor() {
    this.icons = {
      pdf: "bi-file-earmark-pdf",
      image: "bi-image",
      text: "bi-file-text",
      presentation: "bi-file-earmark-slides",
      document: "bi-file-earmark-word",
      youtube: "bi-youtube",
      link: "bi-link-45deg",
      note: "bi-card-text",
      file: "bi-file-earmark"
    };
  }

  kindFromFile(file) {
    const name = String(file?.name || "").toLowerCase();
    const type = String(file?.type || "").toLowerCase();
    if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
    if (type.includes("image") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)) return "image";
    if (type.startsWith("text/") || /\.(txt|md|csv|json|rtf)$/i.test(name)) return "text";
    if (name.endsWith(".ppt") || name.endsWith(".pptx")) return "presentation";
    if (name.endsWith(".doc") || name.endsWith(".docx")) return "document";
    return "file";
  }

  icon(kind) {
    return this.icons[kind] || this.icons.file;
  }
}

class ByteFormatter {
  format(bytes) {
    return formatBytesShared(bytes);
  }
}

class SourceTextCleaner {
  removeDetectedUrls(text) {
    return String(text || "")
      .replace(/(?:https?:\/\/|www\.|youtube(?:-nocookie)?\.com\/|youtu\.be\/|[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s<>()]*)?)[^\s<>()]*/gi, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}

class YouTubeTranscriptInspector {
  getState(content) {
    const raw = String(content || "").trim();
    if (!raw) {
      return {
        raw: "",
        transcript: "",
        hasReadableTranscript: false,
        hasUnavailableMarker: false
      };
    }

    const transcriptMatch = raw.match(/\[Transcript\]\s*([\s\S]*)$/i);
    const transcriptOnly = (transcriptMatch ? transcriptMatch[1] : raw).trim();
    const hasUnavailableMarker = transcriptOnly.includes(YOUTUBE_TRANSCRIPT_UNAVAILABLE_TEXT);
    const hasReadableTranscript = Boolean(transcriptOnly && !hasUnavailableMarker);

    return {
      raw,
      transcript: hasReadableTranscript ? raw : "",
      hasReadableTranscript,
      hasUnavailableMarker
    };
  }
}

class YouTubeSourceParser {
  constructor(globalScope = globalThis) {
    this.globalScope = globalScope;
  }

  normaliseVideoId(value) {
    const text = String(value || "").trim();
    if (YOUTUBE_VIDEO_ID_REGEX.test(text)) return text;
    const match = text.match(/^([A-Za-z0-9_-]{11})/);
    return match ? match[1] : "";
  }

  getVideoId(value) {
    const text = String(value || "").trim();
    if (!text) return "";

    const identityMatch = text.match(/^youtube:([A-Za-z0-9_-]{11})$/i);
    if (identityMatch) return identityMatch[1];

    const directMatch = text.match(YOUTUBE_URL_VIDEO_ID_REGEX);
    if (directMatch) return this.normaliseVideoId(directMatch[1]);

    try {
      const parsed = new URL(text);
      const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      if (host === "youtu.be") {
        return this.normaliseVideoId(parsed.pathname.replace(/^\/+/, "").split(/[/?#]/)[0]);
      }
      if (host.endsWith("youtube.com")) {
        if (parsed.pathname.startsWith("/watch")) {
          return this.normaliseVideoId(parsed.searchParams.get("v"));
        }
        const pathMatch = parsed.pathname.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
        if (pathMatch) return this.normaliseVideoId(pathMatch[1]);
      }
    } catch {
      // Fall back to regex parsing below.
    }

    const urlMatch = text.match(YOUTUBE_URL_VIDEO_ID_REGEX);
    return urlMatch ? this.normaliseVideoId(urlMatch[1]) : "";
  }

  watchUrlFromItem(item) {
    const raw = item?.originalUrl ||
      item?.url ||
      item?.sourceIdentity ||
      item?.displayName ||
      item?.title ||
      "";
    const videoId = this.getVideoId(raw) || this.getVideoId(item?.sourceIdentity);
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : "";
  }

  embedUrlFromItem(item) {
    const videoId = this.getVideoId(
      item?.originalUrl ||
        item?.url ||
        item?.sourceIdentity ||
        item?.displayName ||
        item?.title
    );
    const origin = this.globalScope.location?.origin && this.globalScope.location.origin !== "null"
      ? `&origin=${encodeURIComponent(this.globalScope.location.origin)}`
      : "";
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1${origin}` : "";
  }

  itemLooksLikeYouTube(item = {}) {
    return Boolean(
      this.getVideoId(item.sourceIdentity || item.source_identity) ||
      this.getVideoId(
        item.originalUrl ||
          item.url ||
          item.displayName ||
          item.display_name ||
          item.title ||
          item.name
      )
    );
  }
}

const fileSourceClassifier = new FileSourceClassifier();
const byteFormatter = new ByteFormatter();
const sourceTextCleaner = new SourceTextCleaner();
const youtubeTranscriptInspector = new YouTubeTranscriptInspector();
const youtubeSourceParser = new YouTubeSourceParser();

function sourceKindFromFile(file) {
  return fileSourceClassifier.kindFromFile(file);
}

function sourceIcon(kind) {
  return fileSourceClassifier.icon(kind);
}

function formatBytes(bytes) {
  return formatBytesShared(bytes);
}

function removeDetectedUrlsClient(text) {
  return sourceTextCleaner.removeDetectedUrls(text);
}

function getYoutubeTranscriptState(content) {
  return youtubeTranscriptInspector.getState(content);
}

function getYouTubeVideoIdClient(value) {
  return youtubeSourceParser.getVideoId(value);
}

function youtubeWatchUrlFromItem(item) {
  return youtubeSourceParser.watchUrlFromItem(item);
}

function youtubeEmbedUrlFromItem(item) {
  return youtubeSourceParser.embedUrlFromItem(item);
}

function sourceItemLooksLikeYouTube(item = {}) {
  return youtubeSourceParser.itemLooksLikeYouTube(item);
}

export {
  ByteFormatter,
  FileSourceClassifier,
  SourceTextCleaner,
  YouTubeSourceParser,
  YouTubeTranscriptInspector,
  byteFormatter,
  fileSourceClassifier,
  formatBytes,
  getYouTubeVideoIdClient,
  getYoutubeTranscriptState,
  removeDetectedUrlsClient,
  sourceIcon,
  sourceItemLooksLikeYouTube,
  sourceKindFromFile,
  sourceTextCleaner,
  youtubeEmbedUrlFromItem,
  youtubeSourceParser,
  youtubeTranscriptInspector,
  youtubeWatchUrlFromItem
};
