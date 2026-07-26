import { firstSupabaseRow, supabaseRequest } from "../supabase/rest.js";
import { randomId } from "../utils/ids.js";
import { allowedValue, cleanString, jsonValue, limitValue, nullableString } from "../utils/validators.js";

function mapStudyRoom(row = {}) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    description: row.description || "",
    visibility: row.visibility || "private",
    settings: jsonValue(row.settings_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}






async function supabaseGetRoomRow(roomId) {
  const payload = await supabaseRequest("GET", "study_rooms", {
    query: {
      select: "*",
      id: `eq.${cleanString(roomId, 96)}`,
      limit: 1
    }
  });
  return firstSupabaseRow(payload);
}

async function supabaseUserIsRoomMember(userId, roomId) {
  const rows = await supabaseRequest("GET", "study_room_members", {
    query: {
      select: "study_room_id",
      user_id: `eq.${cleanString(userId, 80)}`,
      study_room_id: `eq.${cleanString(roomId, 96)}`,
      limit: 1
    }
  });
  return Boolean(firstSupabaseRow(rows));
}

async function supabaseCanAccessStudyRoom(userId, roomId) {
  const row = await supabaseGetRoomRow(roomId);
  if (!row) return null;
  if (row.owner_user_id === userId) return row;
  return (await supabaseUserIsRoomMember(userId, roomId)) ? row : null;
}

async function supabaseListStudyRooms(userId, limit = 50) {
  const safeLimit = limitValue(limit);
  const ownedRows = await supabaseRequest("GET", "study_rooms", {
    query: {
      select: "*",
      owner_user_id: `eq.${cleanString(userId, 80)}`,
      order: "updated_at.desc",
      limit: safeLimit
    }
  });
  const memberRows = await supabaseRequest("GET", "study_room_members", {
    query: {
      select: "study_room_id",
      user_id: `eq.${cleanString(userId, 80)}`,
      limit: safeLimit
    }
  });
  const ownedIds = new Set((Array.isArray(ownedRows) ? ownedRows : []).map(row => row.id));
  const memberIds = (Array.isArray(memberRows) ? memberRows : [])
    .map(row => cleanString(row.study_room_id, 96))
    .filter(id => id && !ownedIds.has(id));
  let sharedRows = [];
  if (memberIds.length) {
    sharedRows = await supabaseRequest("GET", "study_rooms", {
      query: {
        select: "*",
        id: `in.(${memberIds.join(",")})`,
        limit: safeLimit
      }
    });
  }
  return [...(Array.isArray(ownedRows) ? ownedRows : []), ...(Array.isArray(sharedRows) ? sharedRows : [])]
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
    .slice(0, safeLimit)
    .map(mapStudyRoom);
}

async function supabaseCreateStudyRoom(userId, payload = {}) {
  const id = cleanString(payload.id, 96) || randomId("room");
  const existing = payload.id ? await supabaseGetRoomRow(id) : null;
  if (existing) {
    if (existing.owner_user_id !== userId) {
      const error = new Error("Study room id is not available.");
      error.status = 403;
      throw error;
    }
    return supabasePatchStudyRoom(userId, id, payload);
  }
  const saved = await supabaseRequest("POST", "study_rooms", {
    body: [supabaseStudyRoomRow(userId, payload, id)],
    prefer: "return=representation"
  });
  await supabaseRequest("POST", "study_room_members", {
    query: { on_conflict: "study_room_id,user_id" },
    body: [{ study_room_id: id, user_id: userId, role: "owner" }],
    prefer: "resolution=merge-duplicates,return=minimal",
    allowEmpty: true
  });
  const savedRow = firstSupabaseRow(saved);
  return savedRow ? mapStudyRoom(savedRow) : supabaseGetStudyRoom(userId, id);
}

async function supabaseGetStudyRoom(userId, roomId) {
  const row = await supabaseCanAccessStudyRoom(userId, roomId);
  return row ? mapStudyRoom(row) : null;
}

async function supabasePatchStudyRoom(userId, roomId, patch = {}) {
  const current = await supabaseGetRoomRow(roomId);
  if (!current || current.owner_user_id !== userId) return null;
  const next = {};
  if (patch.title !== undefined) next.title = cleanString(patch.title, 255) || "Study Room";
  if (patch.description !== undefined) next.description = nullableString(patch.description, 4000);
  if (patch.visibility !== undefined) next.visibility = allowedValue(patch.visibility, ["private", "shared", "public"], "private");
  if (patch.settings !== undefined || patch.settings_json !== undefined) {
    next.settings_json = patch.settings || patch.settings_json || {};
  }
  if (!Object.keys(next).length) return mapStudyRoom(current);
  const rows = await supabaseRequest("PATCH", "study_rooms", {
    query: {
      id: `eq.${cleanString(roomId, 96)}`,
      owner_user_id: `eq.${cleanString(userId, 80)}`
    },
    body: next,
    prefer: "return=representation"
  });
  const row = firstSupabaseRow(rows);
  return row ? mapStudyRoom(row) : null;
}

async function supabaseDeleteStudyRoom(userId, roomId) {
  const rows = await supabaseRequest("DELETE", "study_rooms", {
    query: {
      id: `eq.${cleanString(roomId, 96)}`,
      owner_user_id: `eq.${cleanString(userId, 80)}`
    },
    prefer: "return=representation"
  });
  return Array.isArray(rows) ? rows.length > 0 : Boolean(rows);
}


async function listStudyRooms(userId, limit = 50) {
  return supabaseListStudyRooms(userId, limit);
}
async function createStudyRoom(userId, payload = {}) {
  return supabaseCreateStudyRoom(userId, payload);
}
async function getStudyRoom(userId, roomId) {
  return supabaseGetStudyRoom(userId, roomId);
}
async function patchStudyRoom(userId, roomId, patch = {}) {
  return supabasePatchStudyRoom(userId, roomId, patch);
}
async function deleteStudyRoom(userId, roomId) {
  return supabaseDeleteStudyRoom(userId, roomId);
}
export { createStudyRoom, deleteStudyRoom, getStudyRoom, listStudyRooms, patchStudyRoom };
