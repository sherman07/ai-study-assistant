/**
 * Per-user controller overrides stored in users.metadata_json.admin_controls.
 * Tri-state feature values: "inherit" | "allow" | "deny".
 */

import { cleanString } from "../utils/validators.js";

const FEATURE_INHERIT = "inherit";
const FEATURE_ALLOW = "allow";
const FEATURE_DENY = "deny";
const FEATURE_MODES = new Set([FEATURE_INHERIT, FEATURE_ALLOW, FEATURE_DENY]);

/** Controllable product capabilities (beyond plan defaults). */
const ADMIN_FEATURE_DEFS = Object.freeze([
  {
    key: "deepStudy",
    label: "Deep Study",
    description: "High-depth note generation and Pro study actions."
  },
  {
    key: "proStudy",
    label: "Pro study tools",
    description: "Pro workspace study features and related content saves."
  },
  {
    key: "advancedAnalytics",
    label: "Advanced analytics",
    description: "Mastery / analytics surfaces marked as Pro."
  },
  {
    key: "priorityProcessing",
    label: "Priority processing",
    description: "Priority generation path when the product requests it."
  },
  {
    key: "unlimitedUploads",
    label: "Unlimited uploads",
    description: "Relax Pro upload entitlement checks."
  },
  {
    key: "learningCompanion",
    label: "Learning Companion",
    description: "AI learning companion chat."
  },
  {
    key: "broadcastMode",
    label: "Broadcast Mode",
    description: "AI broadcast script and audio jobs."
  },
  {
    key: "focusRoom",
    label: "Focus Room",
    description: "Focus Room study workspace."
  },
  {
    key: "mediaAnalysis",
    label: "Audio / video analysis",
    description: "Transcribe and analyze audio or video uploads."
  },
  {
    key: "voiceTutor",
    label: "Voice tutor",
    description: "Live voice tutoring sessions."
  },
  {
    key: "gptProvider",
    label: "GPT models",
    description: "Allow OpenAI / GPT as a text provider."
  },
  {
    key: "geminiProvider",
    label: "Gemini models",
    description: "Allow Gemini as a text provider."
  },
  {
    key: "deepseekProvider",
    label: "DeepSeek models",
    description: "Allow DeepSeek as a text provider."
  }
]);

const ADMIN_FEATURE_KEYS = Object.freeze(ADMIN_FEATURE_DEFS.map((entry) => entry.key));

function normalizeFeatureMode(value, fallback = FEATURE_INHERIT) {
  const mode = cleanString(value, 20).toLowerCase();
  if (FEATURE_MODES.has(mode)) return mode;
  if (value === true || value === 1 || value === "1" || mode === "on" || mode === "true" || mode === "enabled") {
    return FEATURE_ALLOW;
  }
  if (value === false || value === 0 || value === "0" || mode === "off" || mode === "false" || mode === "disabled") {
    return FEATURE_DENY;
  }
  return fallback;
}

function emptyFeatureMap(fallback = FEATURE_INHERIT) {
  return Object.fromEntries(ADMIN_FEATURE_KEYS.map((key) => [key, fallback]));
}

function normalizeAdminControls(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const featuresIn = source.features && typeof source.features === "object"
    ? source.features
    : source;
  const features = emptyFeatureMap(FEATURE_INHERIT);
  for (const key of ADMIN_FEATURE_KEYS) {
    if (featuresIn[key] !== undefined) {
      features[key] = normalizeFeatureMode(featuresIn[key]);
    }
  }

  const accountStatusRaw = cleanString(
    source.accountStatus || source.account_status || "active",
    40
  ).toLowerCase();
  const accountStatus = accountStatusRaw === "suspended" ? "suspended" : "active";

  return {
    accountStatus,
    notes: cleanString(source.notes || source.adminNotes || source.admin_notes, 2000),
    features,
    updatedAt: source.updatedAt || source.updated_at || null
  };
}

function readAdminControls(user = {}) {
  const metadata = user.metadata || user.metadata_json || {};
  return normalizeAdminControls(metadata.admin_controls || metadata.adminControls || {});
}

function resolveFeatureFlag(planDefault, mode) {
  if (mode === FEATURE_ALLOW) return true;
  if (mode === FEATURE_DENY) return false;
  return Boolean(planDefault);
}

function applyAdminControlsToEntitlements(baseEntitlements = {}, user = {}) {
  const controls = readAdminControls(user);
  const baseFeatures = baseEntitlements.features && typeof baseEntitlements.features === "object"
    ? { ...baseEntitlements.features }
    : {};

  const features = { ...baseFeatures };
  for (const key of ADMIN_FEATURE_KEYS) {
    features[key] = resolveFeatureFlag(baseFeatures[key], controls.features[key]);
  }

  // DeepSeek stays available unless explicitly denied.
  if (controls.features.deepseekProvider === FEATURE_DENY) {
    features.deepseekProvider = false;
  } else if (controls.features.deepseekProvider === FEATURE_ALLOW || features.deepseekProvider !== false) {
    features.deepseekProvider = true;
  }

  const allowedAiProviders = [];
  if (features.gptProvider) allowedAiProviders.push("openai");
  if (features.geminiProvider) allowedAiProviders.push("gemini");
  if (features.deepseekProvider) allowedAiProviders.push("deepseek");

  features.allowedAiProviders = allowedAiProviders;
  features.multiAiProviders = allowedAiProviders.length > 1;
  features.defaultAiProvider = features.deepseekProvider && !features.gptProvider && !features.geminiProvider
    ? "deepseek"
    : "";

  const isSuspended = controls.accountStatus === "suspended";
  return {
    ...baseEntitlements,
    isSuspended,
    accountStatus: controls.accountStatus,
    adminControls: controls,
    features,
    isPro: isSuspended ? false : Boolean(baseEntitlements.isPro)
  };
}

function publicAdminControls(user = {}) {
  return readAdminControls(user);
}

function adminFeatureCatalog() {
  return ADMIN_FEATURE_DEFS.map((entry) => ({ ...entry }));
}

function userHasFeature(user = {}, featureKey = "") {
  const entitlements = applyAdminControlsToEntitlements(
    {
      isPro: false,
      features: {}
    },
    user
  );
  // Prefer full entitlements from plans when available — callers should pass resolved features.
  return Boolean(entitlements.features?.[featureKey]);
}

export {
  ADMIN_FEATURE_DEFS,
  ADMIN_FEATURE_KEYS,
  FEATURE_ALLOW,
  FEATURE_DENY,
  FEATURE_INHERIT,
  adminFeatureCatalog,
  applyAdminControlsToEntitlements,
  normalizeAdminControls,
  publicAdminControls,
  readAdminControls,
  resolveFeatureFlag,
  userHasFeature
};
