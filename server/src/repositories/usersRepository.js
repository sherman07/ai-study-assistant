import { createPool } from "../db/pool.js";
import { databaseUnavailableError, isDatabaseUnavailableError } from "../middleware/errors.js";
import { firstSupabaseRow, supabaseRequest, supabaseStorageEnabled } from "../supabase/rest.js";
import { stableUserId } from "../utils/ids.js";
import { cleanString, jsonString, jsonValue, nullableString } from "../utils/validators.js";

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

async function mysqlUpsertUser(identity = {}) {
  const user = normalizeIdentity(identity);
  await createPool().execute(
    `INSERT INTO users (
      id, auth_provider, auth_subject, email, display_name, auth_mode, role, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      email = VALUES(email),
      display_name = VALUES(display_name),
      auth_mode = VALUES(auth_mode),
      role = VALUES(role),
      metadata_json = VALUES(metadata_json)`,
    [
      user.id,
      user.auth_provider,
      user.auth_subject,
      user.email,
      user.display_name,
      user.auth_mode,
      user.role,
      jsonString(user.metadata_json, {})
    ]
  );
  return mysqlGetUserByProviderSubject(user.auth_provider, user.auth_subject);
}

async function mysqlGetUserByProviderSubject(provider, subject) {
  const [rows] = await createPool().execute(
    "SELECT * FROM users WHERE auth_provider = ? AND auth_subject = ? LIMIT 1",
    [provider, subject]
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

async function mysqlGetUserById(userId) {
  const [rows] = await createPool().execute("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
  return rows[0] ? mapUser(rows[0]) : null;
}

async function mysqlGetUserByStripeCustomerId(customerId) {
  const [rows] = await createPool().execute(
    "SELECT * FROM users WHERE stripe_customer_id = ? LIMIT 1",
    [cleanString(customerId, 255)]
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

async function mysqlGetUserByStripeSubscriptionId(subscriptionId) {
  const [rows] = await createPool().execute(
    "SELECT * FROM users WHERE stripe_subscription_id = ? LIMIT 1",
    [cleanString(subscriptionId, 255)]
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

async function mysqlPatchUser(userId, patch = {}) {
  const fields = [];
  const values = [];
  if (patch.email !== undefined) {
    fields.push("email = ?");
    values.push(nullableString(patch.email, 255));
  }
  if (patch.displayName !== undefined || patch.display_name !== undefined) {
    fields.push("display_name = ?");
    values.push(nullableString(patch.displayName || patch.display_name, 255));
  }
  if (patch.role !== undefined) {
    fields.push("role = ?");
    values.push(cleanString(patch.role, 80) || "student");
  }
  if (patch.metadata !== undefined) {
    fields.push("metadata_json = ?");
    values.push(jsonString(patch.metadata, {}));
  }
  if (!fields.length) return mysqlGetUserById(userId);
  values.push(userId);
  await createPool().execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  return mysqlGetUserById(userId);
}

async function mysqlUpdateUserStripeCustomer(userId, stripeCustomerId) {
  await createPool().execute(
    "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
    [nullableString(stripeCustomerId, 255), cleanString(userId, 80)]
  );
  return mysqlGetUserById(userId);
}

async function mysqlUpdateUserSubscription(userId, patch = {}) {
  const fields = [];
  const values = [];
  if (patch.stripeCustomerId !== undefined || patch.stripe_customer_id !== undefined) {
    fields.push("stripe_customer_id = ?");
    values.push(nullableString(patch.stripeCustomerId || patch.stripe_customer_id, 255));
  }
  if (patch.stripeSubscriptionId !== undefined || patch.stripe_subscription_id !== undefined) {
    fields.push("stripe_subscription_id = ?");
    values.push(nullableString(patch.stripeSubscriptionId || patch.stripe_subscription_id, 255));
  }
  if (patch.plan !== undefined) {
    fields.push("plan = ?");
    values.push(cleanString(patch.plan, 80) || "free");
  }
  if (patch.subscriptionStatus !== undefined || patch.subscription_status !== undefined) {
    fields.push("subscription_status = ?");
    values.push(cleanString(patch.subscriptionStatus || patch.subscription_status, 80) || "inactive");
  }
  if (patch.currentPeriodEnd !== undefined || patch.current_period_end !== undefined) {
    fields.push("current_period_end = ?");
    values.push(patch.currentPeriodEnd || patch.current_period_end || null);
  }
  if (!fields.length) return mysqlGetUserById(userId);
  values.push(cleanString(userId, 80));
  await createPool().execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  return mysqlGetUserById(userId);
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

async function mirrorMysql(operation, label) {
  try {
    return await operation();
  } catch (error) {
    console.warn(`[storage] MySQL ${label} mirror failed: ${error.message}`);
    return null;
  }
}

async function upsertUser(identity = {}) {
  if (!supabaseStorageEnabled()) {
    try {
      return await mysqlUpsertUser(identity);
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        throw databaseUnavailableError(error);
      }
      throw error;
    }
  }

  let supabaseUser = null;
  let supabaseError = null;
  try {
    supabaseUser = await supabaseUpsertUser(identity);
  } catch (error) {
    supabaseError = error;
    console.warn(`[storage] Supabase user upsert failed: ${error.message}`);
  }

  const mysqlUser = await mirrorMysql(() => mysqlUpsertUser(identity), "user upsert");
  if (supabaseUser) return supabaseUser;
  if (mysqlUser) return mysqlUser;
  if (supabaseError && isDatabaseUnavailableError(supabaseError)) {
    throw databaseUnavailableError(supabaseError);
  }
  throw supabaseError || databaseUnavailableError(new Error("Could not persist user."));
}

async function getUserById(userId) {
  if (supabaseStorageEnabled()) {
    try {
      const user = await supabaseGetUserById(userId);
      if (user) return user;
    } catch (error) {
      console.warn(`[storage] Supabase user lookup by id failed: ${error.message}`);
    }
  }
  return mysqlGetUserById(userId);
}

async function getUserByStripeCustomerId(customerId) {
  if (supabaseStorageEnabled()) {
    try {
      const user = await supabaseGetUserByStripeCustomerId(customerId);
      if (user) return user;
    } catch (error) {
      console.warn(`[storage] Supabase user lookup by Stripe customer failed: ${error.message}`);
    }
  }
  return mysqlGetUserByStripeCustomerId(customerId);
}

async function getUserByStripeSubscriptionId(subscriptionId) {
  if (supabaseStorageEnabled()) {
    try {
      const user = await supabaseGetUserByStripeSubscriptionId(subscriptionId);
      if (user) return user;
    } catch (error) {
      console.warn(`[storage] Supabase user lookup by Stripe subscription failed: ${error.message}`);
    }
  }
  return mysqlGetUserByStripeSubscriptionId(subscriptionId);
}

async function patchUser(userId, patch = {}) {
  if (!supabaseStorageEnabled()) {
    return mysqlPatchUser(userId, patch);
  }

  let supabaseUser = null;
  try {
    supabaseUser = await supabasePatchUser(userId, patch);
  } catch (error) {
    console.warn(`[storage] Supabase user patch failed: ${error.message}`);
  }

  const mysqlUser = await mirrorMysql(() => mysqlPatchUser(userId, patch), "user patch");
  return supabaseUser || mysqlUser || getUserById(userId);
}

async function updateUserStripeCustomer(userId, stripeCustomerId) {
  if (!supabaseStorageEnabled()) {
    return mysqlUpdateUserStripeCustomer(userId, stripeCustomerId);
  }

  let supabaseUser = null;
  try {
    supabaseUser = await supabasePatchUser(userId, { stripe_customer_id: stripeCustomerId });
  } catch (error) {
    console.warn(`[storage] Supabase Stripe customer update failed: ${error.message}`);
  }

  const mysqlUser = await mirrorMysql(
    () => mysqlUpdateUserStripeCustomer(userId, stripeCustomerId),
    "Stripe customer update"
  );
  return supabaseUser || mysqlUser || getUserById(userId);
}

async function updateUserSubscription(userId, patch = {}) {
  if (!supabaseStorageEnabled()) {
    return mysqlUpdateUserSubscription(userId, patch);
  }

  let supabaseUser = null;
  try {
    supabaseUser = await supabasePatchUser(userId, patch);
  } catch (error) {
    console.warn(`[storage] Supabase subscription update failed: ${error.message}`);
  }

  const mysqlUser = await mirrorMysql(
    () => mysqlUpdateUserSubscription(userId, patch),
    "subscription update"
  );
  return supabaseUser || mysqlUser || getUserById(userId);
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
