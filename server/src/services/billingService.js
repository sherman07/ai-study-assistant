/**
 * Billing application service: Stripe/customer/credit orchestration.
 * Routes stay responsible for HTTP status codes and request parsing.
 */

import { config } from "../config.js";
import {
  addBoostCredits,
  creditMetadataFromState,
  ensureCreditState
} from "../billing/credits.js";
import {
  boostPack,
  boostPackByPrice,
  checkoutPlanByPrice,
  subscriptionAccessPlan
} from "../billing/plans.js";
import { stripe } from "../billing/stripe.js";
import {
  applyCreditState,
  getUserById,
  getUserByStripeCustomerId,
  getUserByStripeSubscriptionId,
  updateUserStripeCustomer,
  updateUserSubscription
} from "../repositories/usersRepository.js";
import { cleanString } from "../utils/validators.js";

export function requestOrigin(req) {
  const origin = cleanString(req.headers.origin, 500);
  if (origin) return origin.replace(/\/+$/, "");
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || `127.0.0.1:${config.port}`;
  return `${protocol}://${host}`.replace(/\/+$/, "");
}

export function allowedReturnUrl(input, fallbackOrigin, fallbackPath = "/frontend/index.html") {
  const fallback = new URL(fallbackPath, fallbackOrigin).toString();
  const raw = cleanString(input, 1000);
  if (!raw) return fallback;
  let parsed;
  try {
    parsed = new URL(raw, fallbackOrigin);
  } catch {
    return fallback;
  }
  const allowedOrigins = new Set([...config.corsOrigins, fallbackOrigin].map(origin => origin.replace(/\/+$/, "")));
  if (!["http:", "https:"].includes(parsed.protocol)) return fallback;
  if (!allowedOrigins.has(parsed.origin)) return fallback;
  return parsed.toString();
}

export function stripeId(value) {
  if (!value) return "";
  if (typeof value === "string") return cleanString(value, 255);
  return cleanString(value.id, 255);
}

export function dateFromStripeSeconds(value) {
  const seconds = Number(value || 0);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : null;
}

export function subscriptionPriceId(subscription = {}) {
  return cleanString(subscription.items?.data?.[0]?.price?.id, 255);
}

export function planFromSubscription(subscription = {}) {
  const metadataPlan = cleanString(subscription.metadata?.plan, 80);
  if (metadataPlan) return metadataPlan;
  return checkoutPlanByPrice(subscriptionPriceId(subscription))?.plan || "free";
}

export function boostEnvKey(packId) {
  const map = {
    boost_small: "STRIPE_PRICE_BOOST_SMALL",
    boost_standard: "STRIPE_PRICE_BOOST_STANDARD",
    boost_plus: "STRIPE_PRICE_BOOST_PLUS",
    boost_max: "STRIPE_PRICE_BOOST_MAX"
  };
  return map[packId] || "STRIPE_PRICE_BOOST_STANDARD";
}

export function checkoutMode(plan, requestedMode) {
  const requested = cleanString(requestedMode, 40);
  if (plan.id === "pro_yearly" && requested === "payment") return "payment";
  return plan.mode;
}

export function subscriptionIdFromBillingObject(eventObject = {}) {
  if (eventObject.object === "subscription") return stripeId(eventObject.id);
  return stripeId(eventObject.subscription);
}

export function publicCreditBalance(user) {
  const state = user.creditState || ensureCreditState(user);
  return {
    totalCredits: state.totalCredits,
    dailyCredits: state.dailyCredits,
    boostCredits: state.boostCredits,
    dailyAllowance: state.dailyAllowance,
    dailyRefreshedOn: state.dailyRefreshedOn,
    spendOrder: state.spendOrder,
    plan: state.plan
  };
}

export async function ensureStripeCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const client = stripe();
  const customer = await client.customers.create({
    email: user.email || undefined,
    name: user.displayName || undefined,
    metadata: {
      user_id: user.id
    }
  });
  await updateUserStripeCustomer(user.id, customer.id);
  return customer.id;
}

export async function grantBoostCredits(user, credits, source = {}) {
  const current = ensureCreditState(user);
  const next = addBoostCredits(current, credits);
  const updated = await applyCreditState(user.id, next);
  return {
    user: updated,
    granted: Math.max(0, Math.floor(Number(credits) || 0)),
    balance: publicCreditBalance(updated || { ...user, creditState: next, metadata: creditMetadataFromState(next) }),
    source
  };
}

export async function updateFromSubscription(subscription) {
  const subscriptionId = stripeId(subscription.id);
  const customerId = stripeId(subscription.customer);
  const user = subscriptionId
    ? await getUserByStripeSubscriptionId(subscriptionId)
    : null;
  const customerUser = !user && customerId ? await getUserByStripeCustomerId(customerId) : null;
  const targetUser = user || customerUser;
  if (!targetUser) return null;

  const status = cleanString(subscription.status, 80) || "inactive";
  const metadataPlan = planFromSubscription(subscription);
  const accessPlan = subscriptionAccessPlan(metadataPlan, status);
  return updateUserSubscription(targetUser.id, {
    stripeCustomerId: customerId || targetUser.stripeCustomerId,
    stripeSubscriptionId: subscriptionId || targetUser.stripeSubscriptionId,
    plan: accessPlan,
    subscriptionStatus: status,
    currentPeriodEnd: dateFromStripeSeconds(subscription.current_period_end)
  });
}

export async function updateBoostCheckoutCompleted(session, targetUser) {
  const packId = cleanString(session.metadata?.boost_pack_id || session.metadata?.pack_id, 80);
  const pack = boostPack(packId) || boostPackByPrice(cleanString(session.metadata?.price_id, 255));
  const credits = Number(session.metadata?.boost_credits || pack?.credits || 0);
  if (!Number.isFinite(credits) || credits <= 0) {
    return updateUserStripeCustomer(targetUser.id, stripeId(session.customer) || targetUser.stripeCustomerId);
  }
  if (targetUser.stripeCustomerId !== stripeId(session.customer) && stripeId(session.customer)) {
    await updateUserStripeCustomer(targetUser.id, stripeId(session.customer));
  }
  return grantBoostCredits(targetUser, credits, {
    type: "boost_pack",
    packId: pack?.id || packId,
    sessionId: session.id
  });
}

export async function updateCheckoutCompleted(session) {
  const userId = cleanString(session.metadata?.user_id, 80);
  const targetUser = userId ? await getUserById(userId) : null;
  if (!targetUser) return null;

  const customerId = stripeId(session.customer);
  const subscriptionId = stripeId(session.subscription);
  const checkoutKind = cleanString(session.metadata?.checkout_kind || session.metadata?.type, 40);

  if (checkoutKind === "boost" || session.metadata?.boost_pack_id) {
    if (session.payment_status && session.payment_status !== "paid") {
      return updateUserStripeCustomer(targetUser.id, customerId);
    }
    return updateBoostCheckoutCompleted(session, targetUser);
  }

  if (session.mode === "subscription" && subscriptionId) {
    const subscription = await stripe().subscriptions.retrieve(subscriptionId);
    return updateFromSubscription(subscription);
  }

  if (session.mode === "payment") {
    if (session.payment_status && session.payment_status !== "paid") {
      return updateUserStripeCustomer(targetUser.id, customerId);
    }
    const plan = cleanString(session.metadata?.plan, 80) || "pro_yearly";
    if (plan.startsWith("boost") || checkoutKind === "boost") {
      return updateBoostCheckoutCompleted(session, targetUser);
    }
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    return updateUserSubscription(targetUser.id, {
      stripeCustomerId: customerId || targetUser.stripeCustomerId,
      stripeSubscriptionId: null,
      plan,
      subscriptionStatus: "active",
      currentPeriodEnd: periodEnd
    });
  }

  return updateUserStripeCustomer(targetUser.id, customerId);
}

export async function markSubscriptionInactive(eventObject, status = "inactive") {
  const subscriptionId = subscriptionIdFromBillingObject(eventObject);
  const customerId = stripeId(eventObject.customer);
  const user = subscriptionId
    ? await getUserByStripeSubscriptionId(subscriptionId)
    : null;
  const customerUser = !user && customerId ? await getUserByStripeCustomerId(customerId) : null;
  const targetUser = user || customerUser;
  if (!targetUser) return null;
  return updateUserSubscription(targetUser.id, {
    stripeCustomerId: customerId || targetUser.stripeCustomerId,
    stripeSubscriptionId: subscriptionId || targetUser.stripeSubscriptionId,
    plan: "free",
    subscriptionStatus: status,
    currentPeriodEnd: null
  });
}

export async function handleStripeWebhookEvent(event) {
  switch (event.type) {
    case "checkout.session.completed":
      await updateCheckoutCompleted(event.data.object);
      break;
    case "checkout.session.async_payment_succeeded":
      await updateCheckoutCompleted(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await updateFromSubscription(event.data.object);
      break;
    case "customer.subscription.deleted":
      await markSubscriptionInactive(event.data.object, "canceled");
      break;
    case "invoice.payment_failed":
      await markSubscriptionInactive(event.data.object, "past_due");
      break;
    default:
      break;
  }
}
