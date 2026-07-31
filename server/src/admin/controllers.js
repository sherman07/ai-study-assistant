import { config } from "../config.js";
import { resolveUserCredits } from "../billing/plans.js";
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
    currentPeriodEnd: user.currentPeriodEnd || user.current_period_end || null,
    credits: Number.isFinite(Number(user.credits))
      ? Math.max(0, Math.floor(Number(user.credits)))
      : resolveUserCredits(user),
    dailyCredits: Number.isFinite(Number(user.dailyCredits))
      ? Math.max(0, Math.floor(Number(user.dailyCredits)))
      : null,
    boostCredits: Number.isFinite(Number(user.boostCredits))
      ? Math.max(0, Math.floor(Number(user.boostCredits)))
      : null,
    dailyAllowance: Number.isFinite(Number(user.dailyAllowance))
      ? Math.max(0, Math.floor(Number(user.dailyAllowance)))
      : null,
    stripeCustomerId: user.stripeCustomerId || user.stripe_customer_id || "",
    authProvider: user.authProvider || user.auth_provider || "",
    createdAt: user.createdAt || user.created_at || null,
    updatedAt: user.updatedAt || user.updated_at || null,
    bootstrap: Boolean(user.bootstrap)
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
