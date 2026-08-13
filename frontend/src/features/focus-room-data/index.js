/** Public API for Focus Room data helpers and catalogs. */
export {
  FOCUS_ROOM_SESSION_KEY,
  FOCUS_ROOM_DRAFT_KEY,
  FOCUS_ROOM_ACTIVE_SESSION_KEY,
  FOCUS_ROOM_SESSION_LIMIT,
  FOCUS_ROOM_TIMER_STATES,
  FOCUS_ROOM_TIMER_STATE_ALIASES
} from "./storageKeys.js";

export {
  FOCUS_ROOM_MUSIC_TRACKS,
  FOCUS_ROOM_AUDIO_PRESETS,
  FOCUS_ROOM_AMBIENT_SOUNDS,
  FOCUS_ROOM_SCENES,
  FOCUS_ROOM_GALLERY_SCENES,
  FOCUS_ROOM_DURATIONS,
  focusRoomAudioPreset,
  focusRoomAudioPresetForConfig,
  focusRoomMusicTrack,
  focusRoomAmbientSound,
  getFocusRoomAudioProfile
} from "./audioAndScenes.js";

export {
  normalizeFocusRoomSourceHighlights,
  normalizeFocusRoomMaterial,
  mergeFocusRoomMaterials,
  getFocusRoomMaterials,
  getFocusRoomMaterial,
  getFocusRoomMaterialsWithDataApi,
  buildFocusRoomStudyPlan
} from "./materials.js";

export {
  readFocusRoomDraft,
  writeFocusRoomDraft,
  normalizeFocusRoomTimerState,
  focusRoomLegacyTimerStatus,
  normalizeFocusRoomTimerSnapshot,
  readFocusRoomActiveSession,
  writeFocusRoomActiveSession,
  readFocusRoomActiveSessionForMaterial,
  saveFocusRoomActiveSession,
  clearFocusRoomActiveSession,
  readFocusRoomSessions,
  readFocusRoomSessionsWithDataApi,
  focusTrailIdentity,
  buildFocusTrail,
  saveFocusRoomSession,
  formatFocusRoomDuration
} from "./sessions.js";
