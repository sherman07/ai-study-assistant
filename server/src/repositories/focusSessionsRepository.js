import { firstSupabaseRow, supabaseRequest } from "../supabase/rest.js";
import { randomId } from "../utils/ids.js";
import {
  allowedValue,
  cleanString,
  firstValue,
  intValue,
  jsonValue,
  limitValue,
  nullableString
} from "../utils/validators.js";

function normalizeDate(value) {
  const raw = cleanString(value, 80);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 23).replace("T", " ");
}

function focusTrailDate(value) {
  const raw = cleanString(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw
    ? null
    : raw;
}

function focusTimezone(value) {
  if (typeof value !== "string") return null;
  const timezone = value.trim();
  return timezone && timezone.length <= 120 ? timezone : null;
}

function mapFocusSession(row = {}) {
  const metrics = jsonValue(row.metrics_json, {});
  return {
    id: row.id,
    sessionId: row.id,
    userId: row.user_id,
    studyRoomId: row.study_room_id || "",
    generatedContentId: row.generated_content_id || "",
    materialId: row.material_id || "",
    materialTitle: row.material_title || "",
    studyGoal: row.study_goal || "",
    status: row.status || "completed",
    focusTrailDate: row.focus_trail_date || metrics?.focusTrailDate || "",
    focusTimezone: row.focus_timezone || metrics?.focusTimezone || "",
    selectedScene: row.selected_scene || metrics?.selectedScene || "",
    musicType: row.music_type || metrics?.musicType || "",
    ambientSound: row.ambient_sound || metrics?.ambientSound || "",
    pomodoroDuration: row.pomodoro_minutes || metrics?.pomodoroDuration || null,
    startedAt: row.started_at || metrics?.startedAt || "",
    endedAt: row.ended_at || metrics?.endedAt || "",
    totalFocusTime: row.total_focus_seconds || metrics?.totalFocusTime || 0,
    metrics,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowFromPayload(userId, payload = {}) {
  const metrics = {
    flashcardsCompleted: payload.flashcardsCompleted ?? null,
    quizScore: payload.quizScore ?? null,
    mistakesMade: Array.isArray(payload.mistakesMade) ? payload.mistakesMade : [],
    completedTasks: Array.isArray(payload.completedTasks) ? payload.completedTasks : [],
    aiReflection: payload.aiReflection || "",
    recommendedNextStep: payload.recommendedNextStep || "",
    sessionDate: payload.sessionDate || ""
  };
  return {
    id: cleanString(payload.id || payload.sessionId, 96) || randomId("focus"),
    user_id: userId,
    study_room_id: nullableString(firstValue(payload, ["study_room_id", "studyRoomId"]), 96),
    generated_content_id: nullableString(firstValue(payload, ["generated_content_id", "generatedContentId"]), 96),
    material_id: nullableString(firstValue(payload, ["material_id", "materialId"]), 191),
    material_title: nullableString(firstValue(payload, ["material_title", "materialTitle"]), 500),
    study_goal: nullableString(firstValue(payload, ["study_goal", "studyGoal"]), 8000),
    status: allowedValue(payload.status, ["planned", "active", "completed", "cancelled"], "completed"),
    focus_trail_date: focusTrailDate(firstValue(payload, ["focus_trail_date", "focusTrailDate"])),
    focus_timezone: focusTimezone(firstValue(payload, ["focus_timezone", "focusTimezone"])),
    selected_scene: nullableString(firstValue(payload, ["selected_scene", "selectedScene"]), 120),
    music_type: nullableString(firstValue(payload, ["music_type", "musicType"]), 120),
    ambient_sound: nullableString(firstValue(payload, ["ambient_sound", "ambientSound"]), 120),
    pomodoro_minutes: intValue(firstValue(payload, ["pomodoro_minutes", "pomodoroDuration"]), 0) || null,
    started_at: normalizeDate(firstValue(payload, ["started_at", "startedAt"])),
    ended_at: normalizeDate(firstValue(payload, ["ended_at", "endedAt"])),
    total_focus_seconds: Math.max(0, intValue(firstValue(payload, ["total_focus_seconds", "totalFocusTime"]), 0)),
    metrics_json: payload.metrics || payload.metrics_json || metrics
  };
}






async function supabaseExistingFocusSession(sessionId) {
  const payload = await supabaseRequest("GET", "focus_sessions", {
    query: {
      select: "id,user_id",
      id: `eq.${cleanString(sessionId, 96)}`,
      limit: 1
    }
  });
  return firstSupabaseRow(payload);
}

function supabaseFocusSessionRow(row = {}) {
  return {
    id: row.id,
    user_id: row.user_id,
    study_room_id: row.study_room_id,
    generated_content_id: row.generated_content_id,
    material_id: row.material_id,
    material_title: row.material_title,
    study_goal: row.study_goal,
    status: row.status,
    focus_trail_date: row.focus_trail_date,
    focus_timezone: row.focus_timezone,
    selected_scene: row.selected_scene,
    music_type: row.music_type,
    ambient_sound: row.ambient_sound,
    pomodoro_minutes: row.pomodoro_minutes,
    started_at: row.started_at,
    ended_at: row.ended_at,
    total_focus_seconds: row.total_focus_seconds,
    metrics_json: row.metrics_json
  };
}

async function supabaseCreateFocusSession(userId, payload = {}) {
  const row = rowFromPayload(userId, payload);
  const existing = await supabaseExistingFocusSession(row.id);
  if (existing && existing.user_id !== userId) {
    const error = new Error("Focus session id is not available.");
    error.status = 403;
    throw error;
  }
  const saved = await supabaseRequest("POST", "focus_sessions", {
    query: { on_conflict: "id" },
    body: [supabaseFocusSessionRow(row)],
    prefer: "resolution=merge-duplicates,return=representation"
  });
  const savedRow = firstSupabaseRow(saved);
  return savedRow ? mapFocusSession(savedRow) : supabaseGetFocusSession(userId, row.id);
}

async function supabaseListFocusSessions(userId, limit = 50) {
  const safeLimit = limitValue(limit);
  const rows = await supabaseRequest("GET", "focus_sessions", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 80)}`,
      order: "updated_at.desc",
      limit: safeLimit
    }
  });
  return Array.isArray(rows) ? rows.map(mapFocusSession) : [];
}

async function supabaseGetFocusSession(userId, sessionId) {
  const rows = await supabaseRequest("GET", "focus_sessions", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 80)}`,
      id: `eq.${cleanString(sessionId, 96)}`,
      limit: 1
    }
  });
  const row = firstSupabaseRow(rows);
  return row ? mapFocusSession(row) : null;
}

async function supabasePatchFocusSession(userId, sessionId, patch = {}) {
  const current = await supabaseGetFocusSession(userId, sessionId);
  if (!current) return null;
  return supabaseCreateFocusSession(userId, { ...current.metrics, ...current, ...patch, id: current.id });
}

async function supabaseDeleteFocusSession(userId, sessionId) {
  const rows = await supabaseRequest("DELETE", "focus_sessions", {
    query: {
      user_id: `eq.${cleanString(userId, 80)}`,
      id: `eq.${cleanString(sessionId, 96)}`
    },
    prefer: "return=representation"
  });
  return Array.isArray(rows) ? rows.length > 0 : Boolean(rows);
}


async function createFocusSession(userId, payload = {}) {
  return supabaseCreateFocusSession(userId, payload);
}
async function listFocusSessions(userId, limit = 50) {
  return supabaseListFocusSessions(userId, limit);
}
async function getFocusSession(userId, sessionId) {
  return supabaseGetFocusSession(userId, sessionId);
}
async function patchFocusSession(userId, sessionId, patch = {}) {
  return supabasePatchFocusSession(userId, sessionId, patch);
}
async function deleteFocusSession(userId, sessionId) {
  return supabaseDeleteFocusSession(userId, sessionId);
}
export {
  createFocusSession,
  deleteFocusSession,
  getFocusSession,
  listFocusSessions,
  mapFocusSession,
  patchFocusSession,
  rowFromPayload
};
