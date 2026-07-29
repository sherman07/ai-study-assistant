import { firstSupabaseRow, supabaseRequest } from "../supabase/rest.js";
import { jsonValue, nullableString } from "../utils/validators.js";

const DEFAULT_SETTINGS = {
  site_access_mode: "open",
  signup_open: true
};

function mapSetting(row = {}) {
  return {
    key: row.key,
    value: jsonValue(row.value_json, null),
    updatedBy: row.updated_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

async function listPlatformSettings() {
  const payload = await supabaseRequest("GET", "platform_settings", {
    query: {
      select: "*",
      order: "key.asc"
    }
  });
  const rows = Array.isArray(payload) ? payload : [];
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    const mapped = mapSetting(row);
    if (mapped.key) settings[mapped.key] = mapped.value;
  }
  return settings;
}

async function getPlatformSetting(key) {
  const settings = await listPlatformSettings();
  return settings[key];
}

async function upsertPlatformSetting(key, value, updatedBy = null) {
  const payload = await supabaseRequest("POST", "platform_settings", {
    query: { on_conflict: "key" },
    body: [{
      key,
      value_json: value,
      updated_by: nullableString(updatedBy, 80)
    }],
    prefer: "resolution=merge-duplicates,return=representation"
  });
  return mapSetting(firstSupabaseRow(payload) || { key, value_json: value, updated_by: updatedBy });
}

async function patchPlatformSettings(patch = {}, updatedBy = null) {
  const next = {};
  if (patch.site_access_mode !== undefined || patch.siteAccessMode !== undefined) {
    const mode = String(patch.site_access_mode || patch.siteAccessMode || "").toLowerCase();
    if (!["open", "allowlist"].includes(mode)) {
      const error = new Error("site_access_mode must be open or allowlist.");
      error.status = 400;
      throw error;
    }
    next.site_access_mode = mode;
  }
  if (patch.signup_open !== undefined || patch.signupOpen !== undefined) {
    const raw = patch.signup_open ?? patch.signupOpen;
    next.signup_open = raw === true || raw === "true" || raw === 1 || raw === "1";
  }

  const keys = Object.keys(next);
  if (!keys.length) return listPlatformSettings();

  for (const key of keys) {
    await upsertPlatformSetting(key, next[key], updatedBy);
  }
  return listPlatformSettings();
}

export {
  DEFAULT_SETTINGS,
  getPlatformSetting,
  listPlatformSettings,
  patchPlatformSettings,
  upsertPlatformSetting
};
