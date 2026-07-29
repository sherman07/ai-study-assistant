import { config } from "../config.js";
import {
  isBootstrapControllerEmail,
  isControllerUser,
  normalizePlatformRole
} from "../admin/controllers.js";
import { getPlatformSetting } from "../repositories/platformSettingsRepository.js";
import { isEmailAllowlisted } from "../repositories/siteAccessRepository.js";
import { patchUser, upsertUser } from "../repositories/usersRepository.js";
import { cleanString } from "../utils/validators.js";

function bearerToken(req) {
  const header = String(req.headers.authorization || req.headers.Authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function internalTokenMatches(req) {
  const token = cleanString(req.headers["x-synapse-internal-token"], 500);
  return Boolean(config.internalApiToken && token && token === config.internalApiToken);
}

async function supabaseIdentity(req) {
  const token = bearerToken(req);
  if (!token || !config.supabaseUrl || !config.supabaseAnonKey) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  let user = null;
  try {
    const response = await fetch(`${config.supabaseUrl.replace(/\/+$/, "")}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.supabaseAnonKey
      },
      signal: controller.signal
    });
    if (!response.ok) return null;
    user = await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};
  const email = user.email || metadata.email || "";
  const displayName = metadata.full_name || metadata.name || [metadata.first_name, metadata.last_name].filter(Boolean).join(" ") || email;
  const subject = user.id || email;
  if (!subject) return null;
  return {
    auth_provider: "supabase",
    auth_subject: subject,
    email,
    display_name: displayName,
    auth_mode: "supabase",
    role: appMetadata.role || "student",
    metadata: {
      supabase_user_id: user.id,
      provider: appMetadata.provider || "",
      providers: Array.isArray(appMetadata.providers) ? appMetadata.providers : []
    }
  };
}

function localDemoIdentity(req) {
  if (!config.allowLocalDemoAuth) return null;
  const clientId = cleanString(req.headers["x-synapse-client-id"], 160);
  const userId = cleanString(req.headers["x-synapse-user-id"], 160);
  if (!clientId && !userId) return null;
  return {
    auth_provider: userId ? "local_demo" : "anonymous",
    auth_subject: userId || clientId,
    email: cleanString(req.headers["x-synapse-user-email"], 255).toLowerCase(),
    display_name: cleanString(req.headers["x-synapse-user-name"], 255),
    auth_mode: cleanString(req.headers["x-synapse-auth-mode"], 80) || (userId ? "local_demo" : "anonymous"),
    role: cleanString(req.headers["x-synapse-user-role"], 80) || "student",
    metadata: { client_id: clientId }
  };
}

async function identityFromRequest(req) {
  return (await supabaseIdentity(req)) || localDemoIdentity(req);
}

async function ensureBootstrapController(user) {
  if (!user?.id || !isBootstrapControllerEmail(user.email)) return user;
  if (normalizePlatformRole(user.platformRole) === "controller") return user;
  try {
    return (await patchUser(user.id, { platformRole: "controller" })) || {
      ...user,
      platformRole: "controller"
    };
  } catch (error) {
    console.warn("Could not persist bootstrap controller role:", error?.message || error);
    return { ...user, platformRole: "controller" };
  }
}

async function assertSiteAccess(user) {
  if (!user || isControllerUser(user)) return;
  let mode = "open";
  try {
    mode = String((await getPlatformSetting("site_access_mode")) || "open").toLowerCase();
  } catch (error) {
    console.warn("Could not read site_access_mode:", error?.message || error);
    return;
  }
  if (mode !== "allowlist") return;
  const allowed = await isEmailAllowlisted(user.email).catch(() => false);
  if (allowed) return;
  const error = new Error("This Synapse workspace is invite-only. Ask a controller to grant access.");
  error.status = 403;
  error.code = "site_access_denied";
  throw error;
}

async function loadAuthenticatedUser(req) {
  const identity = await identityFromRequest(req);
  if (!identity) return null;
  let user = await upsertUser(identity);
  user = await ensureBootstrapController(user);
  await assertSiteAccess(user);
  return { identity, user };
}

async function requireUser(req, res, next) {
  try {
    const loaded = await loadAuthenticatedUser(req);
    if (!loaded) {
      return res.status(401).json({ ok: false, error: "Authentication is required." });
    }
    req.user = loaded.user;
    req.identity = loaded.identity;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireController(req, res, next) {
  try {
    const loaded = await loadAuthenticatedUser(req);
    if (!loaded) {
      return res.status(401).json({ ok: false, error: "Authentication is required." });
    }
    if (!isControllerUser(loaded.user)) {
      return res.status(403).json({ ok: false, error: "Controller access is required." });
    }
    req.user = { ...loaded.user, platformRole: "controller" };
    req.identity = loaded.identity;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireInternal(req, res, next) {
  if (!internalTokenMatches(req)) {
    return res.status(401).json({ ok: false, error: "Internal API token is required." });
  }
  req.internal = true;
  return next();
}

async function requireUserOrInternal(req, res, next) {
  if (internalTokenMatches(req)) {
    req.internal = true;
    return next();
  }
  return requireUser(req, res, next);
}

export {
  assertSiteAccess,
  ensureBootstrapController,
  identityFromRequest,
  internalTokenMatches,
  requireController,
  requireInternal,
  requireUser,
  requireUserOrInternal
};
