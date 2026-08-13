/** Focus Room draft, active-session, history, and Focus Trail persistence. */
import {
  fetchFocusSessionsFromDataApi,
  saveFocusSessionToDataApi
} from "../../legacy/dataApiClient.js";
import {
  safeReadJSONStorage,
  safeWriteJSONStorage
} from "../../legacy/storage.js";
import {
  FOCUS_ROOM_SESSION_KEY,
  FOCUS_ROOM_DRAFT_KEY,
  FOCUS_ROOM_ACTIVE_SESSION_KEY,
  FOCUS_ROOM_SESSION_LIMIT,
  FOCUS_ROOM_TIMER_STATES,
  FOCUS_ROOM_TIMER_STATE_ALIASES,
  focusRoomSessionMemory
} from "./storageKeys.js";
import {
  compactString,
  finiteNumber,
  plainObject
} from "./valueHelpers.js";

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
  return [...focusRoomSessionMemory.sessions, ...persisted]
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

function focusTrailIdentity(value = new Date(), timezone = "") {
  const date = value instanceof Date ? value : new Date(value);
  let focusTimezone = String(timezone || "").trim() || (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  })();
  let parts = [];
  if (!Number.isNaN(date.getTime())) {
    try {
      parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: focusTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(date);
    } catch {
      focusTimezone = "UTC";
      parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: focusTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(date);
    }
  }
  const valueFor = type => parts.find(part => part.type === type)?.value || "";
  const focusTrailDate = `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`;
  return {
    focusTrailDate: /^\d{4}-\d{2}-\d{2}$/.test(focusTrailDate)
      ? focusTrailDate
      : date.toISOString().slice(0, 10),
    focusTimezone
  };
}

function focusTrailDay(value) {
  const day = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

function previousFocusTrailDay(day) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function buildFocusTrail(sessions = [], today = focusTrailIdentity().focusTrailDate) {
  const byDay = new Map();
  for (const session of Array.isArray(sessions) ? sessions : []) {
    const day = focusTrailDay(session?.focusTrailDate || session?.focus_trail_date);
    if (!day) continue;
    const prior = byDay.get(day) || { date: day, sessions: 0, seconds: 0 };
    prior.sessions += 1;
    prior.seconds += Math.max(0, finiteNumber(session?.totalFocusTime ?? session?.total_focus_seconds, 0));
    byDay.set(day, prior);
  }
  const safeToday = focusTrailDay(today) || focusTrailIdentity().focusTrailDate;
  let currentStreak = 0;
  let cursor = safeToday;
  while (byDay.has(cursor)) {
    currentStreak += 1;
    cursor = previousFocusTrailDay(cursor);
  }
  return {
    activeDays: byDay.size,
    currentStreak,
    today: byDay.get(safeToday) || { date: safeToday, sessions: 0, seconds: 0 },
    days: [...byDay.values()].sort((left, right) => right.date.localeCompare(left.date))
  };
}

function saveFocusRoomSession(session = {}) {
  const now = new Date().toISOString();
  const trailIdentity = focusTrailIdentity(session.startedAt || now, session.focusTimezone);
  const record = {
    sessionId: session.sessionId || `focus-${Date.now()}`,
    materialId: String(session.materialId || ""),
    materialTitle: session.materialTitle || "Study material",
    studyGoal: session.studyGoal || "",
    status: ["planned", "active", "completed", "cancelled"].includes(session.status) ? session.status : "completed",
    focusTrailDate: focusTrailDay(session.focusTrailDate) || trailIdentity.focusTrailDate,
    focusTimezone: String(session.focusTimezone || trailIdentity.focusTimezone).trim().slice(0, 120),
    selectedScene: session.selectedScene || "morning-window",
    musicType: session.musicType || "Deep Focus",
    ambientSound: session.ambientSound || "Nature",
    musicVolume: finiteNumber(session.musicVolume ?? 60, 60),
    ambientVolume: finiteNumber(session.ambientVolume ?? 50, 50),
    pomodoroDuration: finiteNumber(session.pomodoroDuration || 25, 25),
    startedAt: session.startedAt || now,
    endedAt: Object.prototype.hasOwnProperty.call(session, "endedAt") ? session.endedAt : now,
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
    focusRoomSessionMemory.sessions = [];
  } else {
    focusRoomSessionMemory.sessions = [finalRecord, ...existing].slice(0, FOCUS_ROOM_SESSION_LIMIT);
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
};
