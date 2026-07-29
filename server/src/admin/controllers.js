import { config } from "../config.js";
import { cleanString } from "../utils/validators.js";

const PRIMARY_CONTROLLER_EMAIL = "shermanzheng8@gmail.com";

function normalizeEmail(email) {
  return cleanString(email, 255).toLowerCase();
}

function bootstrapControllerEmails() {
  const configured = Array.isArray(config.bootstrapControllerEmails)
    ? config.bootstrapControllerEmails
    : [];
  const emails = new Set(
    [PRIMARY_CONTROLLER_EMAIL, ...configured]
      .map(normalizeEmail)
      .filter(Boolean)
  );
  return [...emails];
}

function isBootstrapControllerEmail(email) {
  const normalized = normalizeEmail(email);
  return Boolean(normalized) && bootstrapControllerEmails().includes(normalized);
}

function normalizePlatformRole(role) {
  const value = cleanString(role, 40).toLowerCase();
  return value === "controller" ? "controller" : "user";
}

function isControllerUser(user = {}) {
  if (normalizePlatformRole(user.platformRole || user.platform_role) === "controller") {
    return true;
  }
  return isBootstrapControllerEmail(user.email);
}

function publicAdminUser(user = {}) {
  return {
    id: user.id || "",
    email: user.email || "",
    displayName: user.displayName || user.display_name || "",
    role: user.role || "student",
    platformRole: isControllerUser(user) ? "controller" : "user",
    plan: user.plan || "free",
    subscriptionStatus: user.subscriptionStatus || user.subscription_status || "inactive",
    createdAt: user.createdAt || user.created_at || null,
    updatedAt: user.updatedAt || user.updated_at || null
  };
}

export {
  PRIMARY_CONTROLLER_EMAIL,
  bootstrapControllerEmails,
  isBootstrapControllerEmail,
  isControllerUser,
  normalizeEmail,
  normalizePlatformRole,
  publicAdminUser
};
