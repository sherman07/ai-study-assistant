import { firstSupabaseRow, supabaseRequest } from "../supabase/rest.js";
import { normalizeEmail } from "../admin/controllers.js";
import { nullableString } from "../utils/validators.js";

function mapAllowlistEntry(row = {}) {
  return {
    email: row.email || "",
    note: row.note || "",
    grantedByUserId: row.granted_by_user_id || "",
    grantedByEmail: row.granted_by_email || "",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

async function listSiteAccessAllowlist() {
  const payload = await supabaseRequest("GET", "site_access_allowlist", {
    query: {
      select: "*",
      order: "created_at.desc"
    }
  });
  return (Array.isArray(payload) ? payload : []).map(mapAllowlistEntry);
}

async function getSiteAccessEntry(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const payload = await supabaseRequest("GET", "site_access_allowlist", {
    query: {
      select: "*",
      email: `eq.${normalized}`,
      limit: 1
    }
  });
  const row = firstSupabaseRow(payload);
  return row ? mapAllowlistEntry(row) : null;
}

async function isEmailAllowlisted(email) {
  const entry = await getSiteAccessEntry(email);
  return Boolean(entry);
}

async function addSiteAccessEntry({ email, note = "", grantedByUserId = "", grantedByEmail = "" } = {}) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    const error = new Error("A valid email is required.");
    error.status = 400;
    throw error;
  }
  const payload = await supabaseRequest("POST", "site_access_allowlist", {
    query: { on_conflict: "email" },
    body: [{
      email: normalized,
      note: nullableString(note, 255) || "",
      granted_by_user_id: nullableString(grantedByUserId, 80),
      granted_by_email: nullableString(grantedByEmail, 255)
    }],
    prefer: "resolution=merge-duplicates,return=representation"
  });
  return mapAllowlistEntry(firstSupabaseRow(payload) || { email: normalized, note });
}

async function removeSiteAccessEntry(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    const error = new Error("A valid email is required.");
    error.status = 400;
    throw error;
  }
  await supabaseRequest("DELETE", "site_access_allowlist", {
    query: { email: `eq.${normalized}` },
    allowEmpty: true
  });
  return { deleted: true, email: normalized };
}

export {
  addSiteAccessEntry,
  getSiteAccessEntry,
  isEmailAllowlisted,
  listSiteAccessAllowlist,
  mapAllowlistEntry,
  removeSiteAccessEntry
};
