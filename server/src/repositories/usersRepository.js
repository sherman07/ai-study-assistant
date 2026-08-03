import {
  creditMetadataFromState,
  ensureCreditState,
  resetCreditsForPlan
} from "../billing/credits.js";
import { dailyCreditsForPlan } from "../billing/plans.js";
import { databaseUnavailableError, isDatabaseUnavailableError } from "../middleware/errors.js";
import { firstSupabaseRow, supabaseRequest, supabaseStorageEnabled } from "../supabase/rest.js";
import { stableUserId } from "../utils/ids.js";
import { cleanString, jsonValue, nullableString } from "../utils/validators.js";

function normalizeIdentity(identity = {}) {
  const provider = cleanString(identity.auth_provider || identity.authProvider || "anonymous", 60) || "anonymous";
  const subject = cleanString(
    identity.auth_subject || identity.authSubject || identity.accountId || identity.id || "anonymous",
    191
  ) || "anonymous";
  return {
    id: cleanString(identity.id || stableUserId(provider, subject), 80),
    auth_provider: provider,
    auth_subject: subject,
    email: nullableString(identity.email, 255)?.toLowerCase() || null,
    display_name: nullableString(identity.display_name || identity.displayName, 255),
    auth_mode: nullableString(identity.auth_mode || identity.authMode || provider, 80),
    role: cleanString(identity.role || "student", 80) || "student",
    metadata_json: identity.metadata || {}
  };
}

function attachCreditFields(user, creditState) {
  return {
    ...user,
    credits: creditState.totalCredits,
    dailyCredits: creditState.dailyCredits,
    boostCredits: creditState.boostCredits,
    dailyAllowance: creditState.dailyAllowance,
    dailyRefreshedOn: creditState.dailyRefreshedOn,
    welcomeGranted: creditState.welcomeGranted,
    creditState
  };
}

function metadataNeedsCreditSync(metadata = {}, creditState) {
  return metadata.daily_refreshed_on !== creditState.dailyRefreshedOn
    || Number(metadata.daily_credits) !== creditState.dailyCredits
    || Number(metadata.boost_credits) !== creditState.boostCredits
    || Boolean(metadata.welcome_granted) !== creditState.welcomeGranted
    || Number(metadata.credits) !== creditState.totalCredits;
}

function mapUser(row = {}) {
  const metadata = jsonValue(row.metadata_json, {});
  const plan = row.plan || "free";
  const baseUser = {
    id: row.id,
    authProvider: row.auth_provider,
    authSubject: row.auth_subject,
    email: row.email || "",
    displayName: row.display_name || "",
    authMode: row.auth_mode || row.auth_provider || "",
    role: row.role || "student",
    platformRole: row.platform_role || "user",
    stripeCustomerId: row.stripe_customer_id || "",
    stripeSubscriptionId: row.stripe_subscription_id || "",
    plan,
    subscriptionStatus: row.subscription_status || "inactive",
    currentPeriodEnd: row.current_period_end || null,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  return attachCreditFields(baseUser, ensureCreditState(baseUser));
}

function supabaseUserRow(identity = {}) {
  const user = normalizeIdentity(identity);
  return {
    id: user.id,
    auth_provider: user.auth_provider,
    auth_subject: user.auth_subject,
    email: user.email,
    display_name: user.display_name,
    auth_mode: user.auth_mode,
    role: user.role,
    metadata_json: user.metadata_json
  };
}

function adminCreditsState(existingUser, desiredTotal, plan) {
  const desired = Math.max(0, Math.floor(Number(desiredTotal) || 0));
  const base = ensureCreditState({
    plan,
    metadata: existingUser?.metadata || {}
  });
  const allowance = dailyCreditsForPlan(plan);
  const dailyCredits = Math.min(desired, allowance);
  const boostCredits = Math.max(0, desired - dailyCredits);
  return {
    ...base,
    plan,
    dailyCredits,
    boostCredits,
    totalCredits: dailyCredits + boostCredits,
    dailyAllowance: allowance,
    welcomeGranted: true
  };
}

function supabaseUserPatch(patch = {}, existingUser = null) {
  const next = {};
  const existingMetadata = existingUser?.metadata || {};

  if (patch.email !== undefined) next.email = nullableString(patch.email, 255);
  if (patch.displayName !== undefined || patch.display_name !== undefined) {
    next.display_name = nullableString(patch.displayName || patch.display_name, 255);
  }
  if (patch.role !== undefined) {
    next.role = cleanString(patch.role, 80) || "student";
  }
  if (patch.platformRole !== undefined || patch.platform_role !== undefined) {
    const role = cleanString(patch.platformRole || patch.platform_role, 40).toLowerCase();
    next.platform_role = role === "controller" ? "controller" : "user";
  }

  let metadata = patch.metadata !== undefined
    ? (patch.metadata || {})
    : null;

  if (patch.creditState) {
    metadata = {
      ...(metadata || existingMetadata || {}),
      ...creditMetadataFromState(patch.creditState)
    };
  } else if (patch.credits !== undefined) {
    const plan = patch.plan || existingUser?.plan || "free";
    const nextState = adminCreditsState(existingUser, patch.credits, plan);
    metadata = {
      ...(metadata || existingMetadata || {}),
      ...creditMetadataFromState(nextState)
    };
  } else if (patch.resetCredits === true) {
    const plan = patch.plan || existingUser?.plan || "free";
    const nextState = resetCreditsForPlan(plan, {
      preserveBoost: patch.preserveBoostCredits ? Number(existingUser?.boostCredits || 0) : 0
    });
    metadata = {
      ...(metadata || existingMetadata || {}),
      ...creditMetadataFromState(nextState)
    };
  }

  if (metadata !== null) {
    next.metadata_json = metadata;
  }
  if (patch.stripeCustomerId !== undefined || patch.stripe_customer_id !== undefined) {
    next.stripe_customer_id = nullableString(patch.stripeCustomerId || patch.stripe_customer_id, 255);
  }
  if (patch.stripeSubscriptionId !== undefined || patch.stripe_subscription_id !== undefined) {
    next.stripe_subscription_id = nullableString(patch.stripeSubscriptionId || patch.stripe_subscription_id, 255);
  }
  if (patch.plan !== undefined) {
    next.plan = cleanString(patch.plan, 80) || "free";
  }
  if (patch.subscriptionStatus !== undefined || patch.subscription_status !== undefined) {
    next.subscription_status = cleanString(patch.subscriptionStatus || patch.subscription_status, 80) || "inactive";
  }
  if (patch.currentPeriodEnd !== undefined || patch.current_period_end !== undefined) {
    const value = patch.currentPeriodEnd ?? patch.current_period_end;
    next.current_period_end = value ? value : null;
  }
  return next;
}

async function supabaseSelectSingle(query = {}) {
  const payload = await supabaseRequest("GET", "users", {
    query: {
      select: "*",
      limit: 1,
      ...query
    }
  });
  const row = firstSupabaseRow(payload);
  return row ? mapUser(row) : null;
}

async function writeCreditState(userId, creditState, existingMetadata = {}) {
  const payload = await supabaseRequest("PATCH", "users", {
    query: { id: `eq.${cleanString(userId, 80)}` },
    body: {
      metadata_json: {
        ...existingMetadata,
        ...creditMetadataFromState(creditState)
      }
    },
    prefer: "return=representation"
  });
  const row = firstSupabaseRow(payload);
  return row ? mapUser(row) : null;
}

async function persistRefreshedCredits(user) {
  if (!user?.id || !user.creditState) return user;
  if (!metadataNeedsCreditSync(user.metadata || {}, user.creditState)) return user;
  return writeCreditState(user.id, user.creditState, user.metadata || {}) || user;
}

async function supabaseUpsertUser(identity = {}) {
  const payload = await supabaseRequest("POST", "users", {
    query: { on_conflict: "auth_provider,auth_subject" },
    body: [supabaseUserRow(identity)],
    prefer: "resolution=merge-duplicates,return=representation"
  });
  const row = firstSupabaseRow(payload);
  if (!row) return null;
  return persistRefreshedCredits(mapUser(row));
}

async function supabasePatchUser(userId, patch = {}) {
  const needsExisting = patch.credits !== undefined
    || patch.creditState !== undefined
    || patch.resetCredits === true;

  const existing = needsExisting ? await supabaseGetUserById(userId) : null;
  const next = supabaseUserPatch(patch, existing);
  if (!Object.keys(next).length) return existing || supabaseGetUserById(userId);
  const payload = await supabaseRequest("PATCH", "users", {
    query: { id: `eq.${cleanString(userId, 80)}` },
    body: next,
    prefer: "return=representation"
  });
  const row = firstSupabaseRow(payload);
  return row ? mapUser(row) : null;
}

async function supabaseGetUserById(userId) {
  const user = await supabaseSelectSingle({ id: `eq.${cleanString(userId, 80)}` });
  return user ? persistRefreshedCredits(user) : null;
}

async function supabaseGetUserByStripeCustomerId(customerId) {
  const user = await supabaseSelectSingle({ stripe_customer_id: `eq.${cleanString(customerId, 255)}` });
  return user ? persistRefreshedCredits(user) : null;
}

async function supabaseGetUserByStripeSubscriptionId(subscriptionId) {
  const user = await supabaseSelectSingle({ stripe_subscription_id: `eq.${cleanString(subscriptionId, 255)}` });
  return user ? persistRefreshedCredits(user) : null;
}

async function supabaseGetUserByEmail(email) {
  const normalized = nullableString(email, 255)?.toLowerCase();
  if (!normalized) return null;
  const user = await supabaseSelectSingle({ email: `eq.${normalized}` });
  return user ? persistRefreshedCredits(user) : null;
}

async function supabaseListControllers(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const payload = await supabaseRequest("GET", "users", {
    query: {
      select: "*",
      platform_role: "eq.controller",
      order: "updated_at.desc",
      limit: safeLimit
    }
  });
  return (Array.isArray(payload) ? payload : []).map(row => mapUser(row));
}

async function supabaseSearchUsersByEmail(query, limit = 20) {
  const needle = cleanString(query, 255).toLowerCase().replace(/[*%,]/g, "");
  if (!needle) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const payload = await supabaseRequest("GET", "users", {
    query: {
      select: "*",
      email: `ilike.*${needle}*`,
      order: "updated_at.desc",
      limit: safeLimit
    }
  });
  return (Array.isArray(payload) ? payload : []).map(row => mapUser(row));
}

async function supabaseListUsers({ query = "", limit = 100, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const needle = cleanString(query, 255).toLowerCase().replace(/[*%,]/g, "");
  const requestQuery = {
    select: "*",
    order: "created_at.desc",
    limit: safeLimit,
    offset: safeOffset
  };
  if (needle) {
    requestQuery.or = `(email.ilike.*${needle}*,display_name.ilike.*${needle}*)`;
  }
  const payload = await supabaseRequest("GET", "users", { query: requestQuery });
  return (Array.isArray(payload) ? payload : []).map(row => mapUser(row));
}

async function upsertUser(identity = {}) {
  if (!supabaseStorageEnabled()) {
    throw databaseUnavailableError(new Error("Supabase storage is not configured."));
  }

  try {
    return await supabaseUpsertUser(identity);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      throw databaseUnavailableError(error);
    }
    throw error;
  }
}
async function getUserById(userId) {
  return supabaseGetUserById(userId);
}
async function getUserByEmail(email) {
  return supabaseGetUserByEmail(email);
}
async function getUserByStripeCustomerId(customerId) {
  return supabaseGetUserByStripeCustomerId(customerId);
}
async function getUserByStripeSubscriptionId(subscriptionId) {
  return supabaseGetUserByStripeSubscriptionId(subscriptionId);
}
async function listControllers(limit = 100) {
  return supabaseListControllers(limit);
}
async function searchUsersByEmail(query, limit = 20) {
  return supabaseSearchUsersByEmail(query, limit);
}
async function listUsers(options = {}) {
  return supabaseListUsers(options);
}
async function patchUser(userId, patch = {}) {
  return supabasePatchUser(userId, patch);
}
async function updateUserStripeCustomer(userId, stripeCustomerId) {
  return supabasePatchUser(userId, { stripe_customer_id: stripeCustomerId });
}
async function updateUserSubscription(userId, patch = {}) {
  return supabasePatchUser(userId, patch);
}
async function applyCreditState(userId, creditState) {
  return supabasePatchUser(userId, { creditState });
}

export {
  applyCreditState,
  getUserByEmail,
  getUserById,
  getUserByStripeCustomerId,
  getUserByStripeSubscriptionId,
  listControllers,
  listUsers,
  mapUser,
  normalizeIdentity,
  patchUser,
  searchUsersByEmail,
  updateUserStripeCustomer,
  updateUserSubscription,
  upsertUser
};
