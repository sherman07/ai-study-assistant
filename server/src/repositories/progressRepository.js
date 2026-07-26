import { firstSupabaseRow, supabaseRequest } from "../supabase/rest.js";
import { randomId } from "../utils/ids.js";
import { cleanString, firstValue, jsonValue, limitValue, nullableString, numberValue } from "../utils/validators.js";

function mapProgress(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    studyRoomId: row.study_room_id || "",
    entityType: row.entity_type,
    entityId: row.entity_id,
    metricType: row.metric_type,
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    status: row.status || "",
    payload: jsonValue(row.payload_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowFromPayload(userId, payload = {}) {
  return {
    id: cleanString(payload.id, 96) || randomId("progress"),
    user_id: userId,
    study_room_id: nullableString(firstValue(payload, ["study_room_id", "studyRoomId"]), 96),
    entity_type: cleanString(firstValue(payload, ["entity_type", "entityType"]), 80) || "custom",
    entity_id: cleanString(firstValue(payload, ["entity_id", "entityId"]), 120) || "current",
    metric_type: cleanString(firstValue(payload, ["metric_type", "metricType"]), 120) || "progress",
    score: numberValue(payload.score, null),
    status: nullableString(payload.status, 80),
    payload_json: payload.payload || payload.payload_json || payload
  };
}






async function supabaseExistingProgress(progressId) {
  const payload = await supabaseRequest("GET", "progress_records", {
    query: {
      select: "id,user_id",
      id: `eq.${cleanString(progressId, 96)}`,
      limit: 1
    }
  });
  return firstSupabaseRow(payload);
}

async function supabaseCreateProgress(userId, payload = {}) {
  const row = rowFromPayload(userId, payload);
  const existing = await supabaseExistingProgress(row.id);
  if (existing && existing.user_id !== userId) {
    const error = new Error("Progress record id is not available.");
    error.status = 403;
    throw error;
  }
  const saved = await supabaseRequest("POST", "progress_records", {
    query: { on_conflict: "id" },
    body: [supabaseProgressRow(row)],
    prefer: "resolution=merge-duplicates,return=representation"
  });
  const savedRow = firstSupabaseRow(saved);
  return savedRow ? mapProgress(savedRow) : supabaseGetProgress(userId, row.id);
}

async function supabaseListProgress(userId, limit = 50) {
  const safeLimit = limitValue(limit);
  const rows = await supabaseRequest("GET", "progress_records", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 80)}`,
      order: "updated_at.desc",
      limit: safeLimit
    }
  });
  return Array.isArray(rows) ? rows.map(mapProgress) : [];
}

async function supabaseGetProgress(userId, progressId) {
  const rows = await supabaseRequest("GET", "progress_records", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 80)}`,
      id: `eq.${cleanString(progressId, 96)}`,
      limit: 1
    }
  });
  const row = firstSupabaseRow(rows);
  return row ? mapProgress(row) : null;
}

async function supabasePatchProgress(userId, progressId, patch = {}) {
  const current = await supabaseGetProgress(userId, progressId);
  if (!current) return null;
  return supabaseCreateProgress(userId, { ...current.payload, ...current, ...patch, id: current.id });
}

async function supabaseDeleteProgress(userId, progressId) {
  const rows = await supabaseRequest("DELETE", "progress_records", {
    query: {
      user_id: `eq.${cleanString(userId, 80)}`,
      id: `eq.${cleanString(progressId, 96)}`
    },
    prefer: "return=representation"
  });
  return Array.isArray(rows) ? rows.length > 0 : Boolean(rows);
}


async function createProgress(userId, payload = {}) {
  return supabaseCreateProgress(userId, payload);
}
async function listProgress(userId, limit = 50) {
  return supabaseListProgress(userId, limit);
}
async function getProgress(userId, progressId) {
  return supabaseGetProgress(userId, progressId);
}
async function patchProgress(userId, progressId, patch = {}) {
  return supabasePatchProgress(userId, progressId, patch);
}
async function deleteProgress(userId, progressId) {
  return supabaseDeleteProgress(userId, progressId);
}
export { createProgress, deleteProgress, getProgress, listProgress, patchProgress };
