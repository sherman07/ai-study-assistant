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

const BROADCAST_SCRIPT_MODEL = process.env.BROADCAST_SCRIPT_MODEL || "gpt-5.4-mini";
const BROADCAST_TTS_PROVIDER = process.env.BROADCAST_TTS_PROVIDER || "openai";
const BROADCAST_TTS_MODEL = process.env.BROADCAST_TTS_MODEL || "gpt-4o-mini-tts";

const BROADCAST_STATUSES = new Set([
  "queued",
  "extracting_source",
  "planning",
  "scripting",
  "validating",
  "generating_audio",
  "building_audio",
  "completed",
  "failed",
  "cancelled"
]);

function normaliseStatus(value, fallback = "queued") {
  const status = cleanString(value, 80).toLowerCase();
  return BROADCAST_STATUSES.has(status) ? status : fallback;
}

function mapBroadcastJob(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    sourceId: row.source_id || "",
    noteId: row.note_id || "",
    sourceFingerprint: row.source_fingerprint || "",
    title: row.title || "AI Broadcast",
    status: normaliseStatus(row.status),
    style: row.style || "calm_study_narrator",
    lengthMinutes: row.length_minutes || 5,
    customLengthMinutes: row.custom_length_minutes || null,
    voiceFormat: row.voice_format || "two_ai_hosts",
    depth: row.depth || "standard",
    language: row.language || "auto",
    progressMessage: row.progress_message || "Queued",
    progressPercent: row.progress_percent || 0,
    scriptModel: row.script_model || BROADCAST_SCRIPT_MODEL,
    ttsProvider: row.tts_provider || BROADCAST_TTS_PROVIDER,
    ttsModel: row.tts_model || BROADCAST_TTS_MODEL,
    plan: jsonValue(row.plan_json, {}),
    script: jsonValue(row.script_json, {}),
    validation: jsonValue(row.validation_json, {}),
    transcript: jsonValue(row.transcript_json, []),
    chapters: jsonValue(row.chapters_json, []),
    keyIdeas: jsonValue(row.key_ideas_json, []),
    sourceReferences: jsonValue(row.source_references_json, []),
    audioUrl: row.audio_url || "",
    audioMetadata: jsonValue(row.audio_metadata_json, {}),
    errorMessage: row.error_message || "",
    cancelledAt: row.cancelled_at || "",
    completedAt: row.completed_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowFromPayload(userId, payload = {}, existing = {}) {
  const style = allowedValue(firstValue(payload, ["style", "broadcastStyle"]), [
    "study_podcast",
    "exam_revision",
    "deep_explanation",
    "quick_recap",
    "debate_two_perspectives",
    "interview_style",
    "calm_study_narrator",
    "exam_preparation_coach",
    "natural_podcast_style",
    "deep_explanation_mode",
    "quick_revision_mode"
  ], existing.style || "calm_study_narrator");
  const voiceFormat = allowedValue(firstValue(payload, ["voice_format", "voiceFormat"]), [
    "single_narrator",
    "two_ai_hosts",
    "host_student",
    "teacher_student"
  ], existing.voice_format || "two_ai_hosts");
  const depth = allowedValue(payload.depth, [
    "simple",
    "standard",
    "advanced",
    "exam_focused"
  ], existing.depth || "standard");
  const language = allowedValue(payload.language, [
    "auto",
    "english",
    "chinese",
    "bilingual"
  ], existing.language || "auto");
  const lengthMinutes = Math.max(1, Math.min(60, intValue(firstValue(payload, ["length_minutes", "lengthMinutes"]), existing.length_minutes || 5)));
  const progressPercent = Math.max(0, Math.min(100, intValue(firstValue(payload, ["progress_percent", "progressPercent"]), existing.progress_percent || 0)));

  return {
    id: cleanString(payload.id || existing.id, 96) || randomId("broadcast"),
    user_id: userId,
    source_id: nullableString(firstValue(payload, ["source_id", "sourceId"]), 96) || existing.source_id || null,
    note_id: nullableString(firstValue(payload, ["note_id", "noteId", "generatedContentId"]), 96) || existing.note_id || null,
    source_fingerprint: nullableString(firstValue(payload, ["source_fingerprint", "sourceFingerprint"]), 191) || existing.source_fingerprint || null,
    title: cleanString(payload.title || existing.title || "AI Broadcast", 500) || "AI Broadcast",
    status: normaliseStatus(payload.status, existing.status || "queued"),
    style,
    length_minutes: lengthMinutes,
    custom_length_minutes: firstValue(payload, ["custom_length_minutes", "customLengthMinutes"]) ? intValue(firstValue(payload, ["custom_length_minutes", "customLengthMinutes"]), lengthMinutes) : existing.custom_length_minutes || null,
    voice_format: voiceFormat,
    depth,
    language,
    progress_message: cleanString(firstValue(payload, ["progress_message", "progressMessage"], existing.progress_message || "Queued"), 500),
    progress_percent: progressPercent,
    script_model: cleanString(firstValue(payload, ["script_model", "scriptModel"], existing.script_model || BROADCAST_SCRIPT_MODEL), 120) || BROADCAST_SCRIPT_MODEL,
    tts_provider: cleanString(firstValue(payload, ["tts_provider", "ttsProvider"], existing.tts_provider || BROADCAST_TTS_PROVIDER), 80) || BROADCAST_TTS_PROVIDER,
    tts_model: cleanString(firstValue(payload, ["tts_model", "ttsModel"], existing.tts_model || BROADCAST_TTS_MODEL), 120) || BROADCAST_TTS_MODEL,
    plan_json: firstValue(payload, ["plan_json", "plan"], existing.plan_json || {}),
    script_json: firstValue(payload, ["script_json", "script"], existing.script_json || {}),
    validation_json: firstValue(payload, ["validation_json", "validation"], existing.validation_json || {}),
    transcript_json: firstValue(payload, ["transcript_json", "transcript"], existing.transcript_json || []),
    chapters_json: firstValue(payload, ["chapters_json", "chapters"], existing.chapters_json || []),
    key_ideas_json: firstValue(payload, ["key_ideas_json", "keyIdeas"], existing.key_ideas_json || []),
    source_references_json: firstValue(payload, ["source_references_json", "sourceReferences"], existing.source_references_json || []),
    audio_url: nullableString(firstValue(payload, ["audio_url", "audioUrl"]), 1000) || existing.audio_url || null,
    audio_metadata_json: firstValue(payload, ["audio_metadata_json", "audioMetadata"], existing.audio_metadata_json || {}),
    error_message: nullableString(firstValue(payload, ["error_message", "errorMessage"]), 2000) || existing.error_message || null,
    cancelled_at: payload.cancelled_at || payload.cancelledAt || existing.cancelled_at || null,
    completed_at: payload.completed_at || payload.completedAt || existing.completed_at || null
  };
}






async function supabaseUpsertBroadcastJob(userId, payload = {}, existing = {}) {
  const row = rowFromPayload(userId, payload, existing);
  const saved = await supabaseRequest("POST", "broadcast_jobs", {
    query: { on_conflict: "id" },
    body: [supabaseBroadcastRow(row)],
    prefer: "resolution=merge-duplicates,return=representation"
  });
  const savedRow = firstSupabaseRow(saved);
  return savedRow ? mapBroadcastJob(savedRow) : null;
}

async function supabaseListBroadcastJobs(userId, limit = 50) {
  const rows = await supabaseRequest("GET", "broadcast_jobs", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 80)}`,
      order: "updated_at.desc",
      limit: limitValue(limit, 50, 100)
    }
  });
  return Array.isArray(rows) ? rows.map(mapBroadcastJob) : [];
}

async function supabaseGetBroadcastJob(userId, jobId) {
  const rows = await supabaseRequest("GET", "broadcast_jobs", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 80)}`,
      id: `eq.${cleanString(jobId, 96)}`,
      limit: 1
    }
  });
  const row = firstSupabaseRow(rows);
  return row ? mapBroadcastJob(row) : null;
}

async function supabasePatchBroadcastJob(userId, jobId, patch = {}) {
  const current = await supabaseGetBroadcastJob(userId, jobId);
  if (!current) return null;
  return supabaseUpsertBroadcastJob(userId, { ...current, ...patch, id: current.id });
}

async function supabaseDeleteBroadcastJob(userId, jobId) {
  const rows = await supabaseRequest("DELETE", "broadcast_jobs", {
    query: {
      user_id: `eq.${cleanString(userId, 80)}`,
      id: `eq.${cleanString(jobId, 96)}`
    },
    prefer: "return=representation"
  });
  return Array.isArray(rows) ? rows.length > 0 : Boolean(rows);
}


async function createBroadcastJob(userId, payload = {}) {
  return supabaseUpsertBroadcastJob(userId, {
    status: "queued",
    progressMessage: "Queued for AI Broadcast studio generation",
    progressPercent: 4,
    ...payload
  });
}
async function listBroadcastJobs(userId, limit = 50) {
  return supabaseListBroadcastJobs(userId, limit);
}
async function getBroadcastJob(userId, jobId) {
  return supabaseGetBroadcastJob(userId, jobId);
}
async function patchBroadcastJob(userId, jobId, patch = {}) {
  return supabasePatchBroadcastJob(userId, jobId, patch);
}
async function cancelBroadcastJob(userId, jobId) {
  return patchBroadcastJob(userId, jobId, {
    status: "cancelled",
    progressMessage: "Broadcast generation cancelled",
    cancelledAt: new Date().toISOString()
  });
}

async function retryBroadcastJob(userId, jobId) {
  return patchBroadcastJob(userId, jobId, {
    status: "queued",
    progressMessage: "Queued for retry",
    progressPercent: 4,
    errorMessage: "",
    cancelledAt: null,
    completedAt: null
  });
}

async function deleteBroadcastJob(userId, jobId) {
  return supabaseDeleteBroadcastJob(userId, jobId);
}
export {
  BROADCAST_SCRIPT_MODEL,
  BROADCAST_STATUSES,
  BROADCAST_TTS_MODEL,
  BROADCAST_TTS_PROVIDER,
  cancelBroadcastJob,
  createBroadcastJob,
  deleteBroadcastJob,
  getBroadcastJob,
  listBroadcastJobs,
  mapBroadcastJob,
  patchBroadcastJob,
  retryBroadcastJob
};
