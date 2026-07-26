import { firstSupabaseRow, supabaseRequest } from "../supabase/rest.js";
import { randomId } from "../utils/ids.js";
import { allowedValue, cleanString, intValue, jsonValue, limitValue, nullableString } from "../utils/validators.js";

const LEARNING_INTENTIONS = ["hobby", "skill", "project", "assessment"];
const MESSAGE_ROLES = ["user", "assistant"];
const SUBJECT_STATUSES = ["active", "paused", "completed", "archived"];
const SESSION_STATUSES = ["active", "completed", "abandoned"];
const EVIDENCE_TYPES = ["self_check", "practice", "project", "assessment"];
const EVIDENCE_STATUSES = ["recorded", "verified"];

function requiredString(value, field, limit = 240) {
  const cleaned = cleanString(value, limit);
  if (!cleaned) throw new Error(`${field} is required.`);
  return cleaned;
}

function normalizeSubject(input = {}, userId) {
  const intention = allowedValue(input.intention, LEARNING_INTENTIONS, "");
  if (!intention) throw new Error("Learning intention is invalid.");

  return {
    id: cleanString(input.id, 120) || randomId("subject"),
    userId: requiredString(userId, "User id", 120),
    title: requiredString(input.title, "Subject title"),
    intention,
    goal: cleanString(input.goal, 2000),
    status: allowedValue(input.status, SUBJECT_STATUSES, "active"),
    summary: cleanString(input.summary, 8000),
    currentSessionId: nullableString(input.currentSessionId || input.current_session_id, 120),
    currentUnitId: nullableString(input.currentUnitId || input.current_unit_id, 120),
  };
}

function normalizeMessage(input = {}) {
  const role = allowedValue(input.role, MESSAGE_ROLES, "");
  if (!role) throw new Error("Message role must be user or assistant.");

  return {
    id: cleanString(input.id, 120) || randomId("learning_message"),
    role,
    content: requiredString(input.content, "Message content", 12000),
    idempotencyKey: cleanString(input.idempotencyKey || input.idempotency_key, 120) || null,
    turnStatus: allowedValue(input.turnStatus || input.turn_status, ["complete", "pending", "failed"], "complete"),
    decision: input.decision || input.decision_json || {},
  };
}

function normalizeSession(input = {}, userId, subjectId) {
  return {
    id: cleanString(input.id, 120) || randomId("learning_session"),
    userId: requiredString(userId, "User id", 120),
    subjectId: requiredString(subjectId, "Subject id", 120),
    availableTimeMinutes: Math.max(0, Math.min(intValue(input.availableTimeMinutes || input.available_time_minutes, 0), 480)),
    activeObjective: cleanString(input.activeObjective || input.active_objective, 1000),
    status: allowedValue(input.status, SESSION_STATUSES, "active"),
    summary: cleanString(input.summary, 8000),
  };
}

function normalizeEvidence(input = {}, userId) {
  const evidenceType = allowedValue(input.evidenceType || input.evidence_type, EVIDENCE_TYPES, "");
  if (!evidenceType) throw new Error("Learning evidence type is invalid.");
  const score = input.score === null || input.score === undefined || input.score === ""
    ? null
    : Math.max(0, Math.min(intValue(input.score, 0), 100));
  return {
    id: cleanString(input.id, 120) || randomId("learning_evidence"),
    userId: requiredString(userId, "User id", 120),
    subjectId: requiredString(input.subjectId || input.subject_id, "Subject id", 120),
    sessionId: nullableString(input.sessionId || input.session_id, 120),
    evidenceType,
    status: allowedValue(input.status, EVIDENCE_STATUSES, "recorded"),
    label: requiredString(input.label, "Evidence label", 1000),
    score,
    payload: input.payload || input.payload_json || {},
  };
}

function mapSubject(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || "",
    intention: row.intention || "skill",
    goal: row.goal || "",
    status: row.status || "active",
    summary: row.summary || "",
    currentSessionId: row.current_session_id || null,
    currentUnitId: row.current_unit_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    availableTimeMinutes: Number(row.available_time_minutes || 0),
    activeObjective: row.active_objective || "",
    status: row.status || "active",
    summary: row.summary || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row = {}) {
  return {
    id: row.id,
    sessionId: row.session_id,
    sequence: Number(row.sequence_number || 0),
    role: row.role,
    content: row.content || "",
    turnStatus: row.turn_status || "complete",
    idempotencyKey: row.idempotency_key || null,
    decision: jsonValue(row.decision_json, {}),
    createdAt: row.created_at,
  };
}

function mapEvidence(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    sessionId: row.session_id || null,
    evidenceType: row.evidence_type,
    status: row.status || "recorded",
    label: row.label || "",
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    payload: jsonValue(row.payload_json, {}),
    createdAt: row.created_at,
  };
}

function subjectRow(subject) {
  return {
    id: subject.id,
    user_id: subject.userId,
    title: subject.title,
    intention: subject.intention,
    goal: subject.goal || null,
    status: subject.status,
    summary: subject.summary || null,
    current_session_id: subject.currentSessionId,
    current_unit_id: subject.currentUnitId,
  };
}

function sessionRow(session) {
  return {
    id: session.id,
    user_id: session.userId,
    subject_id: session.subjectId,
    available_time_minutes: session.availableTimeMinutes,
    active_objective: session.activeObjective || null,
    status: session.status,
    summary: session.summary || null,
  };
}

function evidenceRow(evidence) {
  return {
    id: evidence.id,
    user_id: evidence.userId,
    subject_id: evidence.subjectId,
    session_id: evidence.sessionId,
    evidence_type: evidence.evidenceType,
    status: evidence.status,
    label: evidence.label,
    score: evidence.score,
    payload_json: evidence.payload,
  };
}











async function supabaseGetSubject(userId, subjectId) {
  const rows = await supabaseRequest("GET", "learning_subjects", { query: { select: "*", user_id: `eq.${cleanString(userId, 120)}`, id: `eq.${cleanString(subjectId, 120)}`, limit: 1 } });
  const row = firstSupabaseRow(rows);
  return row ? mapSubject(row) : null;
}

async function supabaseCreateSubject(userId, payload = {}) {
  const subject = normalizeSubject(payload, userId);
  const existingRows = await supabaseRequest("GET", "learning_subjects", { query: { select: "id,user_id", id: `eq.${subject.id}`, limit: 1 } });
  const existing = firstSupabaseRow(existingRows);
  if (existing && existing.user_id !== userId) {
    const error = new Error("Learning subject id is not available.");
    error.status = 403;
    throw error;
  }
  const saved = await supabaseRequest("POST", "learning_subjects", { query: { on_conflict: "id" }, body: [subjectRow(subject)], prefer: "resolution=merge-duplicates,return=representation" });
  return mapSubject(firstSupabaseRow(saved) || subjectRow(subject));
}

async function supabaseListSubjects(userId, limit = 50) {
  const rows = await supabaseRequest("GET", "learning_subjects", { query: { select: "*", user_id: `eq.${cleanString(userId, 120)}`, order: "updated_at.desc", limit: limitValue(limit, 50, 100) } });
  return Array.isArray(rows) ? rows.map(mapSubject) : [];
}

async function supabaseCreateSession(userId, subjectId, payload = {}) {
  if (!(await supabaseGetSubject(userId, subjectId))) return null;
  const session = normalizeSession(payload, userId, subjectId);
  const saved = await supabaseRequest("POST", "learning_sessions", { query: { on_conflict: "id" }, body: [sessionRow(session)], prefer: "resolution=merge-duplicates,return=representation" });
  await supabaseRequest("PATCH", "learning_subjects", { query: { id: `eq.${subjectId}`, user_id: `eq.${userId}` }, body: { current_session_id: session.id }, prefer: "return=representation" });
  return mapSession(firstSupabaseRow(saved) || sessionRow(session));
}

async function supabaseListSessions(userId, subjectId, limit = 50) {
  if (!(await supabaseGetSubject(userId, subjectId))) return [];
  const rows = await supabaseRequest("GET", "learning_sessions", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 120)}`,
      subject_id: `eq.${cleanString(subjectId, 120)}`,
      order: "updated_at.desc",
      limit: limitValue(limit, 50, 100),
    },
  });
  return Array.isArray(rows) ? rows.map(mapSession) : [];
}

async function supabaseListMessages(userId, sessionId, limit = 100) {
  const sessionRows = await supabaseRequest("GET", "learning_sessions", { query: { select: "id", id: `eq.${cleanString(sessionId, 120)}`, user_id: `eq.${cleanString(userId, 120)}`, limit: 1 } });
  if (!firstSupabaseRow(sessionRows)) return [];
  const rows = await supabaseRequest("GET", "learning_messages", { query: { select: "*", session_id: `eq.${cleanString(sessionId, 120)}`, order: "sequence_number.asc", limit: limitValue(limit, 100, 200) } });
  return Array.isArray(rows) ? rows.map(mapMessage) : [];
}

async function supabaseCreateEvidence(userId, payload = {}) {
  const evidence = normalizeEvidence(payload, userId);
  if (!(await supabaseGetSubject(userId, evidence.subjectId))) return null;
  const saved = await supabaseRequest("POST", "learning_evidence", {
    query: { on_conflict: "id" },
    body: [evidenceRow(evidence)],
    prefer: "resolution=merge-duplicates,return=representation",
  });
  return mapEvidence(firstSupabaseRow(saved) || evidenceRow(evidence));
}

async function supabaseListEvidence(userId, subjectId, limit = 50) {
  if (!(await supabaseGetSubject(userId, subjectId))) return [];
  const rows = await supabaseRequest("GET", "learning_evidence", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 120)}`,
      subject_id: `eq.${cleanString(subjectId, 120)}`,
      order: "created_at.desc",
      limit: limitValue(limit, 50, 100),
    },
  });
  return Array.isArray(rows) ? rows.map(mapEvidence) : [];
}

async function supabaseAppendMessage(userId, sessionId, payload = {}) {
  const sessionRows = await supabaseRequest("GET", "learning_sessions", { query: { select: "id", id: `eq.${cleanString(sessionId, 120)}`, user_id: `eq.${cleanString(userId, 120)}`, limit: 1 } });
  if (!firstSupabaseRow(sessionRows)) return null;
  const message = normalizeMessage(payload);
  if (message.idempotencyKey) {
    const existingRows = await supabaseRequest("GET", "learning_messages", { query: { select: "*", session_id: `eq.${sessionId}`, idempotency_key: `eq.${message.idempotencyKey}`, limit: 1 } });
    const existing = firstSupabaseRow(existingRows);
    if (existing) return mapMessage(existing);
  }
  const messages = await supabaseListMessages(userId, sessionId, 200);
  const saved = await supabaseRequest("POST", "learning_messages", {
    body: [{ id: message.id, session_id: sessionId, sequence_number: messages.length + 1, role: message.role, content: message.content, turn_status: message.turnStatus, idempotency_key: message.idempotencyKey, decision_json: message.decision }],
    prefer: "return=representation"
  });
  return mapMessage(firstSupabaseRow(saved));
}

async function createLearningSubject(userId, payload = {}) {
  return supabaseCreateSubject(userId, payload);
}
async function listLearningSubjects(userId, limit = 50) {
  return supabaseListSubjects(userId, limit);
}
async function createLearningSession(userId, subjectId, payload = {}) {
  return supabaseCreateSession(userId, subjectId, payload);
}
async function listLearningSessions(userId, subjectId, limit = 50) {
  return supabaseListSessions(userId, subjectId, limit);
}
async function listLearningMessages(userId, sessionId, limit = 100) {
  return supabaseListMessages(userId, sessionId, limit);
}
async function appendLearningMessage(userId, sessionId, payload = {}) {
  return supabaseAppendMessage(userId, sessionId, payload);
}
async function createLearningEvidence(userId, payload = {}) {
  return supabaseCreateEvidence(userId, payload);
}
async function listLearningEvidence(userId, subjectId, limit = 50) {
  return supabaseListEvidence(userId, subjectId, limit);
}
export {
  LEARNING_INTENTIONS,
  MESSAGE_ROLES,
  normalizeEvidence,
  appendLearningMessage,
  createLearningEvidence,
  createLearningSession,
  createLearningSubject,
  listLearningMessages,
  listLearningEvidence,
  listLearningSessions,
  listLearningSubjects,
  normalizeMessage,
  normalizeSubject,
};
