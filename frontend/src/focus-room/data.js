import {
  fetchGeneratedContentFromDataApi,
  fetchFocusSessionsFromDataApi,
  saveFocusSessionToDataApi
} from "../legacy/dataApiClient.js";
import {
  safeReadJSONStorage,
  safeWriteJSONStorage
} from "../legacy/storage.js";

const FOCUS_ROOM_SESSION_KEY = "synapse.focusRoom.sessions.v1";
const FOCUS_ROOM_DRAFT_KEY = "synapse.focusRoom.draft.v1";
const FOCUS_ROOM_ACTIVE_SESSION_KEY = "synapse.focusRoom.active-session.v1";
const FOCUS_ROOM_SESSION_LIMIT = 40;

const FOCUS_ROOM_TIMER_STATES = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]);

const FOCUS_ROOM_TIMER_STATE_ALIASES = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});

let memoryFocusRoomSessions = [];

const commonsAudio = fileName => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURI(fileName)}`;

const FOCUS_ROOM_MUSIC_TRACKS = [
  {
    label: "Deep Focus",
    title: "Chasing Daylight",
    artist: "Scott Buckley",
    streamUrl: "https://www.scottbuckley.com.au/library/wp-content/uploads/2021/03/sb_chasingdaylight.mp3",
    pageUrl: "https://www.scottbuckley.com.au/library/chasing-daylight/",
    license: "CC BY 4.0",
    attribution: "'Chasing Daylight' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au"
  },
  {
    label: "Lo-fi",
    title: "Lofi Hip Hop Upbeat",
    artist: "raspberrymusic",
    streamUrl: commonsAudio("Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg",
    license: "CC BY 4.0",
    attribution: "Raspberrymusic - Lofi Hip Hop Upbeat by raspberrymusic"
  },
  {
    label: "Piano",
    title: "The Long Dark",
    artist: "Scott Buckley",
    streamUrl: "https://www.scottbuckley.com.au/library/wp-content/uploads/2023/01/TheLongDark.mp3",
    pageUrl: "https://www.scottbuckley.com.au/library/the-long-dark/",
    license: "CC BY 4.0",
    attribution: "'The Long Dark' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au"
  },
  {
    label: "Minimal",
    title: "Computations in a Snowstorm",
    artist: "Scott Buckley",
    streamUrl: "https://www.scottbuckley.com.au/library/wp-content/uploads/2019/01/sb_computations_altmix.mp3",
    pageUrl: "https://www.scottbuckley.com.au/library/computations/",
    license: "CC BY 4.0",
    attribution: "'Computations in a Snowstorm' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au"
  }
];

const AMBIENT_LAYERS = {
  nature: {
    id: "nature-forest",
    title: "Forest ambience",
    artist: "nille",
    streamUrl: commonsAudio("20090610_0_ambience.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:20090610_0_ambience.ogg",
    license: "Public domain",
    attribution: "Forest ambience by nille",
    volumeBias: 1
  },
  cafe: {
    id: "cafe-ambiance",
    title: "Cafe ambiance",
    artist: "Marble Toast",
    streamUrl: commonsAudio("Cafe_ambiance.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Cafe_ambiance.ogg",
    license: "CC0",
    attribution: "Cafe ambiance by Marble Toast",
    volumeBias: 0.72
  },
  rain: {
    id: "rain",
    title: "Rain",
    artist: "ezwa",
    streamUrl: commonsAudio("Rain_(1).ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Rain_(1).ogg",
    license: "Public domain",
    attribution: "Rain by ezwa",
    volumeBias: 0.48
  },
  whiteNoise: {
    id: "white-noise",
    title: "White noise",
    artist: "Bautsch",
    streamUrl: commonsAudio("White.Noise.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:White.Noise.ogg",
    license: "Public domain",
    attribution: "White noise by Bautsch",
    volumeBias: 1
  },
  ocean: {
    id: "ocean-waves",
    title: "Waves",
    artist: "Dsw4",
    streamUrl: commonsAudio("Waves.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Waves.ogg",
    license: "CC BY 3.0",
    attribution: "Waves by Dsw4",
    volumeBias: 1
  },
  wind: {
    id: "howling-wind",
    title: "Howling wind",
    artist: "Tvabutzku1234",
    streamUrl: commonsAudio("Howling_wind.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Howling_wind.ogg",
    license: "CC0",
    attribution: "Howling wind by Tvabutzku1234",
    volumeBias: 0.78
  }
};

const FOCUS_ROOM_AMBIENT_SOUNDS = [
  {
    label: "Nature",
    layers: [AMBIENT_LAYERS.nature],
    pageUrl: AMBIENT_LAYERS.nature.pageUrl,
    license: AMBIENT_LAYERS.nature.license
  },
  {
    label: "Cafe Rain",
    layers: [AMBIENT_LAYERS.cafe, AMBIENT_LAYERS.rain],
    pageUrl: AMBIENT_LAYERS.cafe.pageUrl,
    license: "CC0 / Public domain"
  },
  {
    label: "Rain",
    layers: [AMBIENT_LAYERS.rain],
    pageUrl: AMBIENT_LAYERS.rain.pageUrl,
    license: AMBIENT_LAYERS.rain.license
  },
  {
    label: "White Noise",
    layers: [AMBIENT_LAYERS.whiteNoise],
    pageUrl: AMBIENT_LAYERS.whiteNoise.pageUrl,
    license: AMBIENT_LAYERS.whiteNoise.license
  },
  {
    label: "Ocean",
    layers: [AMBIENT_LAYERS.ocean],
    pageUrl: AMBIENT_LAYERS.ocean.pageUrl,
    license: AMBIENT_LAYERS.ocean.license
  },
  {
    label: "Wind",
    layers: [AMBIENT_LAYERS.wind],
    pageUrl: AMBIENT_LAYERS.wind.pageUrl,
    license: AMBIENT_LAYERS.wind.license
  }
];

const FOCUS_ROOM_SCENES = [
  {
    id: "morning-window",
    name: "Morning Window",
    kicker: "Bright focus",
    description: "Soft daylight, quiet desk, gentle outdoor calm.",
    image: "./assets/focus-room/innook/morning-window.jpg",
    video: "./assets/focus-room/innook/morning-window.mp4",
    ambientSound: "Nature",
    musicType: "Piano"
  },
  {
    id: "rainy-cafe",
    name: "Rainy Cafe",
    kicker: "Low hum",
    description: "Window rain, warm lights, steady cafe ambience.",
    image: "./assets/focus-room/rainy-cafe.webp",
    ambientSound: "Cafe Rain",
    musicType: "Lo-fi"
  },
  {
    id: "library-night",
    name: "Library Night",
    kicker: "Quiet review",
    description: "Desk lamp, bookshelves, late-night concentration.",
    image: "./assets/focus-room/library-night.webp",
    ambientSound: "White Noise",
    musicType: "Minimal"
  },
  {
    id: "ocean-study-room",
    name: "Ocean Study Room",
    kicker: "Open air",
    description: "Blue horizon, slow waves, clean study energy.",
    image: "./assets/focus-room/ocean-study-room.webp",
    ambientSound: "Cafe Rain",
    musicType: "Lo-fi"
  },
  {
    id: "mountain-cabin",
    name: "Mountain Cabin",
    kicker: "Warm retreat",
    description: "Timber, mountain air, and an unhurried study block.",
    image: "./assets/focus-room/mountain-cabin.webp",
    ambientSound: "Wind",
    musicType: "Piano"
  },
  {
    id: "minimal-desk",
    name: "Minimal Desk",
    kicker: "Clean reset",
    description: "A clear desk, soft light, and room to think.",
    image: "./assets/focus-room/minimal-desk.webp",
    ambientSound: "White Noise",
    musicType: "Deep Focus"
  },
  {
    id: "innook-cabin-twilight",
    name: "Cabin Twilight",
    kicker: "Warm light · Ease",
    description: "Warm cabin light and an unhurried focus block.",
    image: "./assets/focus-room/innook/cabin-twilight.jpg",
    ambientSound: "Nature",
    musicType: "Piano",
    galleryOnly: true
  },
  {
    id: "innook-last-room",
    name: "Last Light Lounge",
    kicker: "Wasteland · Glow",
    description: "A quiet room with distant, low-lit calm.",
    image: "./assets/focus-room/innook/last-room.jpg",
    ambientSound: "White Noise",
    musicType: "Minimal",
    galleryOnly: true
  },
  {
    id: "innook-garden-cafe",
    name: "Garden Cafe",
    kicker: "Greenery · Coffee",
    description: "Soft café ambience among abundant greenery.",
    image: "./assets/focus-room/innook/garden-cafe.jpg",
    ambientSound: "Cafe Rain",
    musicType: "Lo-fi",
    galleryOnly: true
  },
  {
    id: "innook-sunset-classroom",
    name: "Sunset Classroom",
    kicker: "Classroom · Dusk",
    description: "An empty classroom in the fading evening light.",
    image: "./assets/focus-room/innook/sunset-classroom.jpg",
    ambientSound: "Nature",
    musicType: "Piano",
    galleryOnly: true
  },
  {
    id: "innook-tokyo-night",
    name: "Tokyo Night",
    kicker: "City · Night",
    description: "A city-night view for steady late study.",
    image: "./assets/focus-room/innook/tokyo-night-view.jpg",
    ambientSound: "White Noise",
    musicType: "Deep Focus",
    galleryOnly: true
  },
  {
    id: "innook-snow-window-cabin",
    name: "Snow Window Cabin",
    kicker: "Snow · Cabin",
    description: "Snow beyond the window, warmth at the desk.",
    image: "./assets/focus-room/innook/snow-window-cabin.jpg",
    ambientSound: "Wind",
    musicType: "Minimal",
    galleryOnly: true
  },
  {
    id: "innook-bamboo-cabin",
    name: "Bamboo Cabin",
    kicker: "Bamboo · Quiet",
    description: "A bamboo retreat made for quiet concentration.",
    image: "./assets/focus-room/innook/bamboo-cabin.jpg",
    ambientSound: "Nature",
    musicType: "Deep Focus",
    galleryOnly: true
  },
  {
    id: "innook-snow-peak-window",
    name: "Alpine Window",
    kicker: "Peaks · Calm",
    description: "Cool alpine light through a quiet study window.",
    image: "./assets/focus-room/innook/snow-peak-window.jpg",
    ambientSound: "Wind",
    musicType: "Piano",
    galleryOnly: true
  },
  {
    id: "innook-herbal-apothecary",
    name: "Herbal Desk",
    kicker: "Herbs · Wood",
    description: "Warm wood shelves and a grounded herbal desk.",
    image: "./assets/focus-room/innook/herbal-apothecary.jpg",
    ambientSound: "Nature",
    musicType: "Minimal",
    galleryOnly: true
  },
  {
    id: "innook-garden-study",
    name: "Garden Study",
    kicker: "Garden · Window",
    description: "Garden light and a calm reading desk.",
    image: "./assets/focus-room/innook/garden-study-window.jpg",
    ambientSound: "Nature",
    musicType: "Piano",
    galleryOnly: true
  },
  {
    id: "innook-summer-green",
    name: "Summer Green Window",
    kicker: "Shade · Bright",
    description: "Bright summer greens for a fresh focus block.",
    image: "./assets/focus-room/innook/summer-green-window.jpg",
    ambientSound: "Nature",
    musicType: "Lo-fi",
    galleryOnly: true
  },
  {
    id: "innook-forest-chimes",
    name: "Forest Chimes",
    kicker: "Forest · Breeze",
    description: "Forest light and soft outdoor calm.",
    image: "./assets/focus-room/innook/forest-window-chimes.jpg",
    ambientSound: "Nature",
    musicType: "Deep Focus",
    galleryOnly: true
  },
];

const FOCUS_ROOM_GALLERY_SCENES = [
  {
    ...FOCUS_ROOM_SCENES[0],
    name: "Morning Window",
    kicker: "Morning · Plants",
    description: "A bright morning desk beside a leafy window."
  },
  ...FOCUS_ROOM_SCENES.filter(scene => scene.galleryOnly)
];

const FOCUS_ROOM_DURATIONS = [25, 45, 50, 90];

function focusRoomMusicTrack(label = "") {
  const value = String(label || "");
  return FOCUS_ROOM_MUSIC_TRACKS.find(track => track.label === value) || FOCUS_ROOM_MUSIC_TRACKS[0];
}

function focusRoomAmbientSound(label = "") {
  const value = String(label || "");
  return FOCUS_ROOM_AMBIENT_SOUNDS.find(sound => sound.label === value) || FOCUS_ROOM_AMBIENT_SOUNDS[0];
}

function getFocusRoomAudioProfile(source = {}) {
  const musicTrack = focusRoomMusicTrack(source?.musicType);
  const ambientSound = focusRoomAmbientSound(source?.ambientSound);
  return {
    musicTrack,
    ambientSound,
    ambientLayers: ambientSound.layers.map(layer => ({
      ...layer,
      volumeBias: finiteNumber(layer.volumeBias, 1)
    }))
  };
}

function stripHTML(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromSummary(summary) {
  const line = String(summary || "")
    .split(/\n+/)
    .map(item => item.replace(/^#+\s*/, "").trim())
    .find(item => item.length > 4);
  return line ? line.slice(0, 72) : "Generated Study Notes";
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function compactString(value) {
  return String(value || "").trim();
}

function sourceSafeId(value, fallback) {
  const raw = compactString(value || fallback);
  return raw
    .replace(/[^A-Za-z0-9:_%-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 180) || compactString(fallback);
}

function clippedText(value, limit = 420) {
  const text = stripHTML(value);
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function normalizeFocusRoomSourceItems(source = {}) {
  return [...arrayValue(source.sourceItems), ...arrayValue(source.sources)]
    .map((item, index) => {
      const object = typeof item === "string" ? { title: item, name: item } : plainObject(item);
      const label = compactString(
        object.title ||
        object.name ||
        object.displayName ||
        object.display_name ||
        object.label ||
        object.url ||
        object.originalUrl ||
        `Source ${index + 1}`
      );
      const id = sourceSafeId(
        object.id ||
        object.sourceId ||
        object.source_id ||
        object.sourceIdentity ||
        object.source_identity ||
        label,
        `source:${index + 1}`
      );
      return {
        ...object,
        id,
        index: Number(object.index || index + 1) || index + 1,
        label,
        title: label,
        kind: compactString(object.kind || object.type || "source") || "source",
        excerpt: clippedText(object.content || object.text || object.excerpt || object.summary || label, 520)
      };
    })
    .filter(item => item.id || item.label || item.excerpt);
}

function sourceItemForHighlight(sourceItems, highlight = {}) {
  const sourceId = compactString(highlight.sourceId || highlight.source_id || highlight.sourceIdentity || highlight.source_identity);
  if (sourceId) {
    const exact = sourceItems.find(item => item.id === sourceId || item.sourceIdentity === sourceId || item.source_identity === sourceId);
    if (exact) return exact;
  }

  const sourceIndex = Number(highlight.sourceIndex || highlight.source_index || highlight.index);
  if (Number.isFinite(sourceIndex) && sourceIndex > 0) {
    return sourceItems[sourceIndex - 1] || null;
  }

  const label = compactString(highlight.source || highlight.sourceLabel || highlight.source_label || highlight.reference);
  if (label) {
    return sourceItems.find(item => item.label === label || item.title === label || item.name === label) || null;
  }

  return sourceItems[0] || null;
}

function normalizeFocusRoomSourceHighlights(source = {}) {
  const sourceItems = normalizeFocusRoomSourceItems(source);
  const explicitHighlights = [
    ...arrayValue(source.sourceHighlights),
    ...arrayValue(source.source_highlights),
    ...arrayValue(source.evidenceHighlights),
    ...arrayValue(source.evidence_highlights),
    ...arrayValue(source.sourceMap),
    ...arrayValue(source.source_map),
    ...arrayValue(source.citations)
  ];

  const normalizedExplicit = explicitHighlights
    .map((item, index) => {
      const object = typeof item === "string" ? { excerpt: item, title: item } : plainObject(item);
      const sourceItem = sourceItemForHighlight(sourceItems, object);
      const sourceId = compactString(
        object.sourceId ||
        object.source_id ||
        object.sourceIdentity ||
        object.source_identity ||
        sourceItem?.id
      );
      const sectionTitle = compactString(
        object.sectionTitle ||
        object.section_title ||
        object.noteSection ||
        object.note_section ||
        object.section ||
        object.heading
      );
      const excerpt = clippedText(
        object.excerpt ||
        object.quote ||
        object.evidence ||
        object.sourceEvidence ||
        object.source_evidence ||
        object.text ||
        object.content ||
        object.summary,
        520
      );
      const title = compactString(
        object.title ||
        object.claim ||
        object.label ||
        sectionTitle ||
        sourceItem?.label ||
        `Source highlight ${index + 1}`
      );
      if (!title && !excerpt && !sourceId) return null;
      return {
        id: sourceSafeId(object.id || `${sourceId || title}:${index}`, `highlight:${index + 1}`),
        title,
        excerpt,
        sourceId,
        sourceIndex: Number(object.sourceIndex || object.source_index || sourceItem?.index || index + 1) || index + 1,
        sourceLabel: compactString(object.sourceLabel || object.source_label || object.source || sourceItem?.label || `Source ${index + 1}`),
        sourceKind: compactString(object.sourceKind || object.source_kind || sourceItem?.kind || "source") || "source",
        sectionTitle,
        kind: compactString(object.kind || "evidence") || "evidence"
      };
    })
    .filter(Boolean);

  if (normalizedExplicit.length) return normalizedExplicit.slice(0, 24);

  const sectionHighlights = Object.entries(plainObject(source.sections))
    .filter(([title, body]) => /(source|evidence|citation|reference|example|case|data)/i.test(title) && clippedText(body, 520))
    .slice(0, 8)
    .map(([title, body], index) => {
      const sourceItem = sourceItems[index] || sourceItems[0] || null;
      return {
        id: sourceSafeId(`${sourceItem?.id || "section"}:${title}:${index}`, `section-highlight:${index + 1}`),
        title,
        excerpt: clippedText(body, 520),
        sourceId: sourceItem?.id || "",
        sourceIndex: sourceItem?.index || index + 1,
        sourceLabel: sourceItem?.label || "Generated notes",
        sourceKind: sourceItem?.kind || "notes",
        sectionTitle: title,
        kind: "section"
      };
    });

  if (sectionHighlights.length) return sectionHighlights;

  return sourceItems
    .filter(item => item.excerpt || item.label)
    .slice(0, 12)
    .map((item, index) => ({
      id: sourceSafeId(`${item.id}:fallback:${index}`, `source-highlight:${index + 1}`),
      title: item.label || `Source ${index + 1}`,
      excerpt: item.excerpt || item.label,
      sourceId: item.id,
      sourceIndex: item.index || index + 1,
      sourceLabel: item.label || `Source ${index + 1}`,
      sourceKind: item.kind || "source",
      sectionTitle: "",
      kind: "source"
    }));
}

function materialTimestamp(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function headingsFromMaterial(source) {
  const sectionKeys = source?.sections && typeof source.sections === "object"
    ? Object.keys(source.sections).filter(Boolean)
    : [];
  if (sectionKeys.length) return sectionKeys.slice(0, 8);

  return String(source?.summary || source?.aiSummary || "")
    .split("\n")
    .map(line => line.match(/^#{1,4}\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function materialDatabaseRecord(source = {}) {
  const direct = source.databaseRecord || source.database_record;
  if (direct && typeof direct === "object") return direct;

  const id = compactString(source.generatedContentId || source.generated_content_id || source.id);
  if (!id) return null;
  return {
    id,
    source_fingerprint: source.source_fingerprint || source.sourceFingerprint || "",
    created_at: source.created_at || source.createdAt || "",
    updated_at: source.updated_at || source.updatedAt || ""
  };
}

function normalizeFocusRoomMaterial(source = {}) {
  if (!source || typeof source !== "object") {
    source = {};
  }

  const databaseRecord = materialDatabaseRecord(source);
  const materialId = compactString(
    source.materialId ||
    source.id ||
    source.historyId ||
    source.generatedContentId ||
    source.generated_content_id ||
    databaseRecord?.id ||
    source.sourceFingerprint ||
    source.source_fingerprint ||
    "current-material"
  );
  const aiSummary = String(source.aiSummary || source.summary || source.fullSummary || "");
  const materialTitle = String(source.materialTitle || source.title || titleFromSummary(aiSummary));
  const sourceFingerprint = compactString(source.sourceFingerprint || source.source_fingerprint || source.clientFingerprint || source.client_fingerprint);
  const clientFingerprint = compactString(source.clientFingerprint || source.client_fingerprint || sourceFingerprint);
  const sections = plainObject(source.sections);
  const promptMode = compactString(source.promptMode || source.prompt_mode) || "professor_mode";
  const detailLevel = compactString(source.detailLevel || source.detail_level);
  const flashcards = arrayValue(source.flashcards || source.cards);
  const quizzes = arrayValue(source.quizzes || source.quizHistory);
  const studyPlan = arrayValue(source.studyPlan || source.timeline?.events || source.study_path);
  const progressHistory = arrayValue(source.progressHistory);
  const visualGallery = arrayValue(source.visualGallery || source.visual_gallery || source.visuals);
  const sources = arrayValue(source.sources);
  const sourceItems = arrayValue(source.sourceItems);
  const sourceHighlights = normalizeFocusRoomSourceHighlights({ ...source, sources, sourceItems, sections });
  const mindMap = source.mindMap || source.mind_map || source.brainstorm || null;
  const uploadedContent = source.uploadedContent || source.sourceText || source.source_text || "";
  const connections = arrayValue(source.connections);
  const createdAt = source.createdAt || source.created_at || "";
  const updatedAt = source.updatedAt || source.updated_at || createdAt;
  const summaryText = stripHTML(aiSummary);

  return {
    materialId,
    materialTitle,
    materialType: source.materialType || source.type || "Generated notes",
    uploadedContent,
    aiSummary,
    summaryText,
    sections,
    studyHeadings: headingsFromMaterial(source),
    flashcards,
    quizzes,
    mindMap,
    studyPlan,
    progressHistory,
    connections,
    visualGallery,
    visualGalleryCount: Number(source.visualGalleryCount || visualGallery.length || 0),
    sources,
    sourceItems,
    sourceHighlights,
    promptMode,
    detailLevel,
    isSourceRestricted: promptMode === "source_strict_research_mode",
    sourceFingerprint,
    clientFingerprint,
    databaseRecord,
    cached: Boolean(source.cached),
    createdAt,
    updatedAt
  };
}

function materialIdentityKeys(material = {}) {
  const keys = [];
  const materialId = compactString(material.materialId);
  const sourceFingerprint = compactString(material.sourceFingerprint);
  const clientFingerprint = compactString(material.clientFingerprint);
  const databaseId = compactString(material.databaseRecord?.id || material.generatedContentId || material.generated_content_id);

  if (materialId) keys.push(`id:${materialId}`);
  if (databaseId) keys.push(`db:${databaseId}`);
  if (sourceFingerprint) keys.push(`fp:${sourceFingerprint}`);
  if (clientFingerprint) keys.push(`cf:${clientFingerprint}`);
  return [...new Set(keys)];
}

function mergeFocusRoomMaterial(baseMaterial = {}, incomingMaterial = {}) {
  const base = normalizeFocusRoomMaterial(baseMaterial);
  const incoming = normalizeFocusRoomMaterial(incomingMaterial);
  const incomingSections = plainObject(incoming.sections);
  const baseSections = plainObject(base.sections);
  const incomingSummary = compactString(incoming.aiSummary);
  const baseSummary = compactString(base.aiSummary);
  const mergedSummary = incomingSummary || baseSummary;

  return {
    ...base,
    ...incoming,
    materialId: base.materialId || incoming.materialId,
    materialTitle: incoming.materialTitle || base.materialTitle || "Generated Study Notes",
    materialType: incoming.materialType || base.materialType || "Generated notes",
    uploadedContent: incoming.uploadedContent || base.uploadedContent || "",
    aiSummary: mergedSummary,
    summaryText: stripHTML(mergedSummary),
    sections: Object.keys(incomingSections).length ? incomingSections : baseSections,
    studyHeadings: incoming.studyHeadings.length ? incoming.studyHeadings : base.studyHeadings,
    flashcards: incoming.flashcards.length ? incoming.flashcards : base.flashcards,
    quizzes: incoming.quizzes.length ? incoming.quizzes : base.quizzes,
    mindMap: incoming.mindMap || base.mindMap || null,
    studyPlan: incoming.studyPlan.length ? incoming.studyPlan : base.studyPlan,
    progressHistory: incoming.progressHistory.length ? incoming.progressHistory : base.progressHistory,
    connections: incoming.connections.length ? incoming.connections : base.connections,
    visualGallery: incoming.visualGallery.length ? incoming.visualGallery : base.visualGallery,
    visualGalleryCount: incoming.visualGallery.length
      ? incoming.visualGallery.length
      : Number(base.visualGalleryCount || base.visualGallery.length || 0),
    sources: incoming.sources.length ? incoming.sources : base.sources,
    sourceItems: incoming.sourceItems.length ? incoming.sourceItems : base.sourceItems,
    sourceHighlights: incoming.sourceHighlights.length ? incoming.sourceHighlights : base.sourceHighlights,
    promptMode: incoming.promptMode || base.promptMode || "professor_mode",
    detailLevel: incoming.detailLevel || base.detailLevel || "",
    isSourceRestricted: incoming.isSourceRestricted || base.isSourceRestricted,
    sourceFingerprint: incoming.sourceFingerprint || base.sourceFingerprint || "",
    clientFingerprint: incoming.clientFingerprint || base.clientFingerprint || incoming.sourceFingerprint || base.sourceFingerprint || "",
    databaseRecord: incoming.databaseRecord || base.databaseRecord || null,
    cached: incoming.cached || base.cached,
    createdAt: base.createdAt || incoming.createdAt || "",
    updatedAt: materialTimestamp(incoming.updatedAt) >= materialTimestamp(base.updatedAt)
      ? incoming.updatedAt
      : base.updatedAt
  };
}

function mergeFocusRoomMaterials(...lists) {
  const items = lists.flatMap(list => arrayValue(list));
  const merged = [];
  const indexByKey = new Map();

  items
    .map(normalizeFocusRoomMaterial)
    .filter(item => item.materialId || item.aiSummary)
    .forEach(item => {
      const keys = materialIdentityKeys(item);
      const existingIndex = keys.reduce((match, key) => (
        match >= 0 ? match : (indexByKey.has(key) ? indexByKey.get(key) : -1)
      ), -1);

      if (existingIndex >= 0) {
        const next = mergeFocusRoomMaterial(merged[existingIndex], item);
        merged[existingIndex] = next;
        materialIdentityKeys(next).forEach(key => indexByKey.set(key, existingIndex));
        return;
      }

      const nextIndex = merged.push(item) - 1;
      keys.forEach(key => indexByKey.set(key, nextIndex));
    });

  return merged.sort((left, right) => (
    materialTimestamp(right.updatedAt || right.createdAt) - materialTimestamp(left.updatedAt || left.createdAt)
  ));
}

function getLegacyMaterials() {
  if (typeof globalThis.getSynapseFocusRoomMaterials === "function") {
    const materials = globalThis.getSynapseFocusRoomMaterials();
    return Array.isArray(materials) ? materials.map(normalizeFocusRoomMaterial) : [];
  }
  return [];
}

function getLegacyCurrentMaterial() {
  if (typeof globalThis.getSynapseFocusRoomCurrentMaterial === "function") {
    const material = globalThis.getSynapseFocusRoomCurrentMaterial();
    return material ? normalizeFocusRoomMaterial(material) : null;
  }
  return null;
}

function getFocusRoomMaterials() {
  const materials = getLegacyMaterials();
  const current = getLegacyCurrentMaterial();
  if (current && current.aiSummary && !materials.some(item => item.materialId === current.materialId)) {
    return mergeFocusRoomMaterials([current], materials);
  }
  return mergeFocusRoomMaterials(materials);
}

function getFocusRoomMaterial(materialId) {
  const id = String(materialId || "");
  const materials = getFocusRoomMaterials();
  return materials.find(item => item.materialId === id) || materials[0] || null;
}

async function getFocusRoomMaterialsWithDataApi(limit = 50) {
  const localMaterials = getFocusRoomMaterials();
  try {
    const remoteItems = await fetchGeneratedContentFromDataApi(limit);
    const remoteMaterials = arrayValue(remoteItems).map(normalizeFocusRoomMaterial);
    return mergeFocusRoomMaterials(localMaterials, remoteMaterials);
  } catch (error) {
    if (typeof window !== "undefined") {
      console.warn("Synapse data API Focus Room materials sync skipped:", error);
    }
    return localMaterials;
  }
}

function buildFocusRoomStudyPlan({ material, goal, durationMinutes }) {
  const minutes = Math.max(10, Number(durationMinutes) || 25);
  const headings = material?.studyHeadings?.length
    ? material.studyHeadings
    : ["Key ideas", "Examples", "Practice", "Review"];
  const goalText = String(goal || "").trim() || `Study ${material?.materialTitle || "this material"}`;
  const firstBlock = Math.max(1, Math.floor(minutes * 0.2));
  const secondBlock = Math.max(1, Math.floor(minutes * 0.4));
  const thirdBlock = Math.max(1, Math.floor(minutes * 0.2));
  const finalBlock = Math.max(1, minutes - firstBlock - secondBlock - thirdBlock);

  return [
    { minutes: firstBlock, task: `Set the goal: ${goalText}` },
    { minutes: secondBlock, task: `Review ${headings[0] || "the core ideas"}` },
    { minutes: thirdBlock, task: `Practice with ${headings[1] || headings[0] || "the generated examples"}` },
    { minutes: finalBlock, task: "Summarize mistakes and choose the next study step" }
  ];
}

function readFocusRoomDraft() {
  return safeReadJSONStorage(FOCUS_ROOM_DRAFT_KEY, null);
}

function writeFocusRoomDraft(draft) {
  return safeWriteJSONStorage(FOCUS_ROOM_DRAFT_KEY, draft || null);
}

function normalizeActiveSessionRoot(rawValue) {
  if (!rawValue || typeof rawValue !== "object") {
    return { materials: {} };
  }
  const materials = plainObject(rawValue.materials);
  return {
    ...rawValue,
    materials: { ...materials }
  };
}

function normalizeFocusRoomTimerState(value, fallback = "idle") {
  const normalized = FOCUS_ROOM_TIMER_STATE_ALIASES[String(value || "").trim().toLowerCase()];
  if (normalized && FOCUS_ROOM_TIMER_STATES.includes(normalized)) return normalized;
  return FOCUS_ROOM_TIMER_STATES.includes(fallback) ? fallback : "idle";
}

function focusRoomLegacyTimerStatus(value) {
  return normalizeFocusRoomTimerState(value) === "running" ? "studying" : normalizeFocusRoomTimerState(value);
}

function normalizeFocusRoomTimerSnapshot(snapshot = {}, previous = {}) {
  const source = snapshot && typeof snapshot === "object" ? snapshot : {};
  const prior = previous && typeof previous === "object" ? previous : {};
  const hasTimerStatus = Object.prototype.hasOwnProperty.call(source, "timerStatus");
  const hasTimerState = Object.prototype.hasOwnProperty.call(source, "timerState")
    || Object.prototype.hasOwnProperty.call(source, "timerPhase");
  const timerState = normalizeFocusRoomTimerState(
    hasTimerState
      ? (source.timerState || source.timerPhase)
      : (hasTimerStatus ? source.timerStatus : (source.status || prior.timerState)),
    normalizeFocusRoomTimerState(prior.timerState || prior.timerPhase || prior.timerStatus)
  );
  const timerMode = source.timerMode === "countup" || prior.timerMode === "countup" && !Object.prototype.hasOwnProperty.call(source, "timerMode")
    ? "countup"
    : "countdown";
  const timestampKeys = ["timerAnchorAtMs", "timerPausedAtMs", "timerUpdatedAtMs", "timerRestoredAtMs"];
  const timestamps = Object.fromEntries(timestampKeys.map(key => {
    const value = Object.prototype.hasOwnProperty.call(source, key) ? source[key] : prior[key];
    const number = Number(value);
    return [key, Number.isFinite(number) && number > 0 ? number : null];
  }));
  const elapsedSeconds = Math.max(0, finiteNumber(
    Object.prototype.hasOwnProperty.call(source, "elapsedSeconds") ? source.elapsedSeconds : prior.elapsedSeconds,
    0
  ));

  return {
    ...prior,
    ...source,
    timerState,
    timerPhase: timerState,
    status: timerState,
    timerStatus: focusRoomLegacyTimerStatus(timerState),
    timerMode,
    elapsedSeconds,
    ...timestamps
  };
}

function readFocusRoomActiveSession() {
  return normalizeActiveSessionRoot(safeReadJSONStorage(FOCUS_ROOM_ACTIVE_SESSION_KEY, null));
}

function writeFocusRoomActiveSession(root) {
  return safeWriteJSONStorage(FOCUS_ROOM_ACTIVE_SESSION_KEY, normalizeActiveSessionRoot(root));
}

function readFocusRoomActiveSessionForMaterial(materialId) {
  const id = compactString(materialId);
  if (!id) return null;
  const root = readFocusRoomActiveSession();
  const snapshot = root.materials[id];
  return snapshot && typeof snapshot === "object"
    ? normalizeFocusRoomTimerSnapshot(snapshot)
    : null;
}

function saveFocusRoomActiveSession(materialId, snapshot) {
  const id = compactString(materialId);
  if (!id) return false;
  const root = readFocusRoomActiveSession();
  if (snapshot && typeof snapshot === "object") {
    root.materials[id] = {
      ...normalizeFocusRoomTimerSnapshot(snapshot, root.materials[id]),
      materialId: id,
      updatedAt: new Date().toISOString()
    };
  } else {
    delete root.materials[id];
  }
  return writeFocusRoomActiveSession(root);
}

function clearFocusRoomActiveSession(materialId) {
  return saveFocusRoomActiveSession(materialId, null);
}

function readFocusRoomSessions() {
  const parsed = safeReadJSONStorage(FOCUS_ROOM_SESSION_KEY, []);
  const persisted = Array.isArray(parsed) ? parsed : [];
  const seen = new Set();
  return [...memoryFocusRoomSessions, ...persisted]
    .filter(item => {
      const id = String(item?.sessionId || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, FOCUS_ROOM_SESSION_LIMIT);
}

async function readFocusRoomSessionsWithDataApi() {
  try {
    const remoteSessions = await fetchFocusSessionsFromDataApi(FOCUS_ROOM_SESSION_LIMIT);
    if (remoteSessions.length) {
      return remoteSessions.map(session => ({
        ...session.metrics,
        ...session,
        sessionId: session.sessionId || session.id,
        persisted: true
      }));
    }
  } catch (error) {
    console.warn("Synapse data API focus-session read skipped:", error);
  }
  return readFocusRoomSessions();
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function saveFocusRoomSession(session = {}) {
  const now = new Date().toISOString();
  const record = {
    sessionId: session.sessionId || `focus-${Date.now()}`,
    materialId: String(session.materialId || ""),
    materialTitle: session.materialTitle || "Study material",
    studyGoal: session.studyGoal || "",
    selectedScene: session.selectedScene || "morning-window",
    musicType: session.musicType || "Deep Focus",
    ambientSound: session.ambientSound || "Nature",
    musicVolume: finiteNumber(session.musicVolume ?? 60, 60),
    ambientVolume: finiteNumber(session.ambientVolume ?? 50, 50),
    pomodoroDuration: finiteNumber(session.pomodoroDuration || 25, 25),
    startedAt: session.startedAt || now,
    endedAt: session.endedAt || now,
    totalFocusTime: Math.max(0, finiteNumber(session.totalFocusTime || 0, 0)),
    flashcardsCompleted: Math.max(0, finiteNumber(session.flashcardsCompleted || 0, 0)),
    quizScore: session.quizScore === null || session.quizScore === undefined || session.quizScore === ""
      ? null
      : (Number.isFinite(Number(session.quizScore)) ? Number(session.quizScore) : null),
    mistakesMade: Array.isArray(session.mistakesMade) ? session.mistakesMade : [],
    completedTasks: Array.isArray(session.completedTasks) ? session.completedTasks : [],
    aiReflection: session.aiReflection || "You protected a focused study block and created momentum for the next session.",
    recommendedNextStep: session.recommendedNextStep || "Review the hardest item, then start another short focus block.",
    sessionDate: session.sessionDate || now
  };
  const candidate = { ...record, persisted: true };
  const existing = readFocusRoomSessions().filter(item => item.sessionId !== candidate.sessionId);
  const next = [candidate, ...existing.map(item => ({ ...item, persisted: true }))].slice(0, FOCUS_ROOM_SESSION_LIMIT);
  const persisted = safeWriteJSONStorage(FOCUS_ROOM_SESSION_KEY, next);
  const finalRecord = { ...candidate, persisted };
  saveFocusSessionToDataApi(finalRecord).catch(error => {
    console.warn("Synapse data API focus-session background save failed:", error);
  });
  if (persisted) {
    memoryFocusRoomSessions = [];
  } else {
    memoryFocusRoomSessions = [finalRecord, ...existing].slice(0, FOCUS_ROOM_SESSION_LIMIT);
  }
  return finalRecord;
}

function formatFocusRoomDuration(seconds) {
  const total = Math.max(0, finiteNumber(seconds || 0, 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export {
  FOCUS_ROOM_ACTIVE_SESSION_KEY,
  FOCUS_ROOM_DRAFT_KEY,
  FOCUS_ROOM_AMBIENT_SOUNDS,
  FOCUS_ROOM_DURATIONS,
  FOCUS_ROOM_GALLERY_SCENES,
  FOCUS_ROOM_MUSIC_TRACKS,
  FOCUS_ROOM_SCENES,
  FOCUS_ROOM_SESSION_KEY,
  FOCUS_ROOM_TIMER_STATES,
  buildFocusRoomStudyPlan,
  clearFocusRoomActiveSession,
  formatFocusRoomDuration,
  getFocusRoomAudioProfile,
  getFocusRoomMaterial,
  getFocusRoomMaterials,
  getFocusRoomMaterialsWithDataApi,
  mergeFocusRoomMaterials,
  normalizeFocusRoomMaterial,
  normalizeFocusRoomSourceHighlights,
  readFocusRoomActiveSession,
  readFocusRoomActiveSessionForMaterial,
  readFocusRoomDraft,
  readFocusRoomSessions,
  readFocusRoomSessionsWithDataApi,
  saveFocusRoomActiveSession,
  saveFocusRoomSession,
  focusRoomLegacyTimerStatus,
  normalizeFocusRoomTimerSnapshot,
  normalizeFocusRoomTimerState,
  writeFocusRoomActiveSession,
  writeFocusRoomDraft
};
