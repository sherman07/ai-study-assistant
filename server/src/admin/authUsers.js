import { config } from "../config.js";
import { upsertUser } from "../repositories/usersRepository.js";
import { cleanString } from "../utils/validators.js";

const DEFAULT_TIMEOUT_MS = 12000;

function normalizedSupabaseUrl() {
  return String(config.supabaseUrl || "").replace(/\/+$/, "");
}

function authAdminEnabled() {
  return Boolean(normalizedSupabaseUrl() && config.supabaseServiceRoleKey);
}

async function listSupabaseAuthUsers({ page = 1, perPage = 200 } = {}) {
  if (!authAdminEnabled()) return { users: [], total: 0 };
  const safePage = Math.max(Number(page) || 1, 1);
  const safePerPage = Math.min(Math.max(Number(perPage) || 200, 1), 200);
  const url = new URL(`${normalizedSupabaseUrl()}/auth/v1/admin/users`);
  url.searchParams.set("page", String(safePage));
  url.searchParams.set("per_page", String(safePerPage));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        Accept: "application/json"
      },
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload?.msg || payload?.message || payload?.error_description || "";
      throw new Error(`Supabase Auth admin users failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }
    const users = Array.isArray(payload?.users) ? payload.users : (Array.isArray(payload) ? payload : []);
    const total = Number(payload?.total ?? users.length) || users.length;
    return { users, total };
  } finally {
    clearTimeout(timeoutId);
  }
}

function identityFromAuthUser(authUser = {}) {
  const metadata = authUser.user_metadata || {};
  const appMetadata = authUser.app_metadata || {};
  const email = cleanString(authUser.email || metadata.email || "", 255).toLowerCase();
  const displayName = cleanString(
    metadata.full_name
      || metadata.name
      || [metadata.first_name, metadata.last_name].filter(Boolean).join(" ")
      || email,
    255
  );
  const subject = cleanString(authUser.id || email, 191);
  if (!subject) return null;
  return {
    auth_provider: "supabase",
    auth_subject: subject,
    email: email || null,
    display_name: displayName || null,
    auth_mode: "supabase",
    role: cleanString(appMetadata.role || metadata.role || "student", 80) || "student",
    metadata: {
      supabase_user_id: authUser.id || "",
      provider: appMetadata.provider || "",
      providers: Array.isArray(appMetadata.providers) ? appMetadata.providers : [],
      email_confirmed_at: authUser.email_confirmed_at || null,
      last_sign_in_at: authUser.last_sign_in_at || null,
      created_at: authUser.created_at || null
    }
  };
}

/**
 * Ensure every Supabase Auth account also has a public.users row so the
 * controller Users page can list people who signed up but have not hit the
 * data API yet.
 */
async function syncAuthUsersIntoPublicUsers({ maxPages = 5 } = {}) {
  if (!authAdminEnabled()) {
    return { synced: 0, authTotal: 0, skipped: true, reason: "auth_admin_unavailable" };
  }

  let page = 1;
  let synced = 0;
  let authTotal = 0;
  const seen = new Set();

  while (page <= maxPages) {
    const { users, total } = await listSupabaseAuthUsers({ page, perPage: 200 });
    authTotal = total || authTotal;
    if (!users.length) break;

    for (const authUser of users) {
      const identity = identityFromAuthUser(authUser);
      if (!identity?.auth_subject || seen.has(identity.auth_subject)) continue;
      seen.add(identity.auth_subject);
      await upsertUser(identity);
      synced += 1;
    }

    if (users.length < 200 || (authTotal && seen.size >= authTotal)) break;
    page += 1;
  }

  return { synced, authTotal: authTotal || seen.size, skipped: false };
}

export {
  authAdminEnabled,
  identityFromAuthUser,
  listSupabaseAuthUsers,
  syncAuthUsersIntoPublicUsers
};
