import { firstSupabaseRow, supabaseRequest } from "../supabase/rest.js";
import { randomId, shortHash } from "../utils/ids.js";
import {
  boolValue,
  cleanString,
  firstValue,
  intValue,
  jsonString,
  jsonValue,
  limitValue,
  nullableString
} from "../utils/validators.js";

function generatedId(userId, sourceFingerprint) {
  return `content_${shortHash(`${userId}:${sourceFingerprint || randomId("source")}`)}`;
}

function resultFromPayload(payload = {}) {
  return payload.result && typeof payload.result === "object" ? payload.result : payload;
}

function mapGeneratedContent(row = {}, {
  includeFull = false,
  includeSections = true,
  includeRelated = true,
  includeSummary = true
} = {}) {
  const full = includeFull ? jsonValue(row.full_result_json, {}) : {};
  const item = includeFull && full && typeof full === "object" ? { ...full } : {};
  item.id = row.id;
  item.title = item.title || row.title || "Generated Study Notes";
  if (includeSummary) item.summary = item.summary || row.summary || "";
  item.language = item.language || row.language || "";
  item.output_language = item.output_language || row.language || "";
  item.detail_level = item.detail_level || row.detail_level || "";
  item.prompt_mode = item.prompt_mode || row.prompt_mode || "";
  item.source_count = item.source_count || row.source_count || 0;
  item.source_fingerprint = item.source_fingerprint || row.source_fingerprint || "";
  item.client_fingerprint = item.client_fingerprint || row.client_fingerprint || "";
  if (includeSections) item.sections = item.sections || jsonValue(row.sections_json, {});
  if (includeRelated) {
    item.connections = item.connections || jsonValue(row.connections_json, []);
    item.mind_map = item.mind_map || jsonValue(row.mind_map_json, {});
    item.visual_gallery = item.visual_gallery || jsonValue(row.visual_gallery_json, []);
    item.visuals = item.visuals || item.visual_gallery || [];
    item.sources = item.sources || jsonValue(row.sources_json, []);
  }
  item.cached = row.cached === undefined ? Boolean(item.cached) : Boolean(row.cached);
  item.created_at = row.created_at;
  item.updated_at = row.updated_at;
  item.database_record = {
    id: row.id,
    user_id: row.user_id,
    source_fingerprint: row.source_fingerprint,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
  return item;
}

function rowFromGeneratedResult(userId, payload = {}) {
  const result = resultFromPayload(payload);
  const sourceFingerprint = cleanString(
    firstValue(result, ["source_fingerprint", "sourceFingerprint"]) ||
    firstValue(payload, ["source_fingerprint", "sourceFingerprint", "client_fingerprint", "clientFingerprint"]),
    191
  ) || shortHash(jsonString({
    title: result.title,
    summary: result.summary,
    sources: result.sources
  }, {}), 64);
  const visualGallery = result.visual_gallery || result.visuals || result.visualGallery || [];
  return {
    id: cleanString(payload.id || result.id || generatedId(userId, sourceFingerprint), 96),
    user_id: userId,
    source_fingerprint: sourceFingerprint,
    client_fingerprint: nullableString(firstValue(result, ["client_fingerprint", "clientFingerprint"]) || firstValue(payload, ["client_fingerprint", "clientFingerprint"]), 191),
    title: nullableString(result.title || payload.title || "Generated Study Notes", 500),
    summary: String(result.summary || payload.summary || ""),
    language: nullableString(result.output_language || result.language || payload.language, 80),
    detail_level: nullableString(result.generation_depth || result.detail_level || result.detailLevel, 80),
    prompt_mode: nullableString(result.prompt_mode || result.promptMode, 120),
    source_count: intValue(result.source_count || result.sourceCount || (Array.isArray(result.sources) ? result.sources.length : 0), 0),
    cached: boolValue(result.cached),
    sections_json: result.sections || {},
    connections_json: result.connections || [],
    mind_map_json: result.mind_map || result.mindMap || {},
    visual_gallery_json: visualGallery,
    sources_json: result.sources || [],
    full_result_json: result
  };
}

function supabaseGeneratedContentRow(row = {}) {
  return {
    id: row.id,
    user_id: row.user_id,
    source_fingerprint: row.source_fingerprint,
    client_fingerprint: row.client_fingerprint,
    title: row.title,
    summary: row.summary,
    language: row.language,
    detail_level: row.detail_level,
    prompt_mode: row.prompt_mode,
    source_count: row.source_count,
    cached: Boolean(row.cached),
    sections_json: row.sections_json,
    connections_json: row.connections_json,
    mind_map_json: row.mind_map_json,
    visual_gallery_json: row.visual_gallery_json,
    sources_json: row.sources_json,
    full_result_json: row.full_result_json
  };
}








async function supabaseUpsertGeneratedContent(userId, payload = {}) {
  const row = rowFromGeneratedResult(userId, payload);
  const saved = await supabaseRequest("POST", "generated_contents", {
    query: { on_conflict: "user_id,source_fingerprint" },
    body: [supabaseGeneratedContentRow(row)],
    prefer: "resolution=merge-duplicates,return=representation"
  });
  const savedRow = firstSupabaseRow(saved);
  return savedRow ? mapGeneratedContent(savedRow, { includeFull: true }) : null;
}

async function supabaseListGeneratedContent(userId, limit = 50, options = {}) {
  const safeLimit = limitValue(limit);
  const select = options.includeSummary === false
    ? "id,user_id,source_fingerprint,client_fingerprint,title,language,detail_level,prompt_mode,source_count,cached,created_at,updated_at"
    : "*";
  const rows = await supabaseRequest("GET", "generated_contents", {
    query: {
      select,
      user_id: `eq.${cleanString(userId, 80)}`,
      order: "updated_at.desc",
      limit: safeLimit
    }
  });
  return Array.isArray(rows) ? rows.map(row => mapGeneratedContent(row, options)) : [];
}

function generatedContentSectionPage(item, page = 1, pageSize = 3) {
  const entries = Object.entries(item?.sections || {}).map(([title, markdown], index) => ({
    index,
    title,
    markdown: String(markdown || "")
  }));
  const safePage = Math.max(1, intValue(page, 1));
  const safePageSize = limitValue(pageSize, 3, 10);
  const totalSections = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalSections / safePageSize));
  const start = (safePage - 1) * safePageSize;

  return {
    content_id: item.id,
    title: item.title,
    language: item.language,
    output_language: item.output_language,
    detail_level: item.detail_level,
    prompt_mode: item.prompt_mode,
    source_count: item.source_count,
    source_fingerprint: item.source_fingerprint,
    page: safePage,
    page_size: safePageSize,
    total_sections: totalSections,
    total_pages: totalPages,
    has_next: safePage < totalPages,
    items: entries.slice(start, start + safePageSize),
    ...(safePage === 1 ? {
      connections: item.connections || [],
      mind_map: item.mind_map || {},
      visual_gallery: item.visual_gallery || [],
      visuals: item.visuals || item.visual_gallery || [],
      sources: item.sources || []
    } : {})
  };
}

async function getGeneratedContentSections(userId, contentId, page = 1, pageSize = 3) {
  const item = await getGeneratedContent(userId, contentId);
  return item ? generatedContentSectionPage(item, page, pageSize) : null;
}

async function supabaseGetGeneratedContent(userId, contentId) {
  const rows = await supabaseRequest("GET", "generated_contents", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 80)}`,
      id: `eq.${cleanString(contentId, 96)}`,
      limit: 1
    }
  });
  const row = firstSupabaseRow(rows);
  return row ? mapGeneratedContent(row, { includeFull: true }) : null;
}

async function supabasePatchGeneratedContent(userId, contentId, patch = {}) {
  const current = await supabaseGetGeneratedContent(userId, contentId);
  if (!current) return null;
  return supabaseUpsertGeneratedContent(userId, { ...current, ...patch, id: current.id });
}

async function supabaseDeleteGeneratedContent(userId, contentId) {
  const rows = await supabaseRequest("DELETE", "generated_contents", {
    query: {
      user_id: `eq.${cleanString(userId, 80)}`,
      id: `eq.${cleanString(contentId, 96)}`
    },
    prefer: "return=representation"
  });
  return Array.isArray(rows) ? rows.length > 0 : Boolean(rows);
}

async function supabaseExportGeneratedContent(userId) {
  const rows = await supabaseRequest("GET", "generated_contents", {
    query: {
      select: "*",
      user_id: `eq.${cleanString(userId, 80)}`,
      order: "updated_at.desc"
    }
  });
  return Array.isArray(rows) ? rows.map(row => mapGeneratedContent(row, { includeFull: true })) : [];
}

async function supabaseDeleteGeneratedContentForUser(userId) {
  const rows = await supabaseRequest("DELETE", "generated_contents", {
    query: {
      user_id: `eq.${cleanString(userId, 80)}`
    },
    prefer: "return=representation"
  });
  return Array.isArray(rows) ? rows.length : 0;
}


async function upsertGeneratedContent(userId, payload = {}) {
  return supabaseUpsertGeneratedContent(userId, payload);
}
async function listGeneratedContent(userId, limit = 50, options = {}) {
  return supabaseListGeneratedContent(userId, limit, options);
}
async function getGeneratedContent(userId, contentId) {
  return supabaseGetGeneratedContent(userId, contentId);
}
async function patchGeneratedContent(userId, contentId, patch = {}) {
  return supabasePatchGeneratedContent(userId, contentId, patch);
}
async function deleteGeneratedContent(userId, contentId) {
  return supabaseDeleteGeneratedContent(userId, contentId);
}
async function exportGeneratedContent(userId) {
  return supabaseExportGeneratedContent(userId);
}
async function deleteGeneratedContentForUser(userId) {
  return supabaseDeleteGeneratedContentForUser(userId);
}
export {
  deleteGeneratedContent,
  deleteGeneratedContentForUser,
  exportGeneratedContent,
  generatedContentSectionPage,
  getGeneratedContentSections,
  getGeneratedContent,
  listGeneratedContent,
  mapGeneratedContent,
  patchGeneratedContent,
  upsertGeneratedContent
};
