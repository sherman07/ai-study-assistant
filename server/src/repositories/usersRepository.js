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
    email: nullableString(identity.email, 255),
    display_name: nullableString(identity.display_name || identity.displayName, 255),
    auth_mode: nullableString(identity.auth_mode || identity.authMode || provider, 80),
    role: cleanString(identity.role || "student", 80) || "student",
    metadata_json: identity.metadata || {}
  };
}

function mapUser(row = {}) {
  return {
    id: row.id,
    authProvider: row.auth_provider,
    authSubject: row.auth_subject,
    email: row.email || "",
    displayName: row.display_name || "",
    authMode: row.auth_mode || row.auth_provider || "",
    role: row.role || "student",
    stripeCustomerId: row.stripe_customer_id || "",
    stripeSubscriptionId: row.stripe_subscription_id || "",
    plan: row.plan || "free",
    subscriptionStatus: row.subscription_status || "inactive",
    currentPeriodEnd: row.current_period_end || null,
    metadata: jsonValue(row.metadata_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
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

function supabaseUserPatch(patch = {}) {
  const next = {};
  if (patch.email !== undefined) next.email = nullableString(patch.email, 255);
  if (patch.displayName !== undefined || patch.display_name !== undefined) {
    next.display_name = nullableString(patch.displayName || patch.display_name, 255);
  }
  if (patch.role !== undefined) {
    next.role = cleanString(patch.role, 80) || "student";
  }
  if (patch.metadata !== undefined) {
    next.metadata_json = patch.metadata || {};
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
    next.current_period_end = patch.currentPeriodEnd || patch.current_period_end || null;
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

async function supabaseUpsertUser(identity = {}) {
  const payload = await supabaseRequest("POST", "users", {
    query: { on_conflict: "auth_provider,auth_subject" },
    body: [supabaseUserRow(identity)],
    prefer: "resolution=merge-duplicates,return=representation"
  });
  const row = firstSupabaseRow(payload);
  return row ? mapUser(row) : null;
}

async function supabasePatchUser(userId, patch = {}) {
  const next = supabaseUserPatch(patch);
  if (!Object.keys(next).length) return supabaseGetUserById(userId);
  const payload = await supabaseRequest("PATCH", "users", {
    query: { id: `eq.${cleanString(userId, 80)}` },
    body: next,
    prefer: "return=representation"
  });
  const row = firstSupabaseRow(payload);
  return row ? mapUser(row) : null;
}

async function supabaseGetUserById(userId) {
  return supabaseSelectSingle({ id: `eq.${cleanString(userId, 80)}` });
}

async function supabaseGetUserByStripeCustomerId(customerId) {
  return supabaseSelectSingle({ stripe_customer_id: `eq.${cleanString(customerId, 255)}` });
}

async function supabaseGetUserByStripeSubscriptionId(subscriptionId) {
  return supabaseSelectSingle({ stripe_subscription_id: `eq.${cleanString(subscriptionId, 255)}` });
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

async function getUserByStripeCustomerId(customerId) {
  return supabaseGetUserByStripeCustomerId(customerId);
}

async function getUserByStripeSubscriptionId(subscriptionId) {
  return supabaseGetUserByStripeSubscriptionId(subscriptionId);
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

export {
  getUserById,
  getUserByStripeCustomerId,
  getUserByStripeSubscriptionId,
  mapUser,
  normalizeIdentity,
  patchUser,
  updateUserStripeCustomer,
  updateUserSubscription,
  upsertUser
};
