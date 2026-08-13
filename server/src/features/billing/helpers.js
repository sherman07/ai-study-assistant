import { config } from "../../config.js";
import {
  addBoostCredits,
  creditMetadataFromState,
  ensureCreditState
} from "../../billing/credits.js";
import { checkoutPlanByPrice } from "../../billing/plans.js";
import { missingStripeConfig, stripe } from "../../billing/stripe.js";
import { applyCreditState, updateUserStripeCustomer } from "../../repositories/usersRepository.js";
import { cleanString } from "../../utils/validators.js";

function configError(res, required = missingStripeConfig()) {
  return res.status(503).json({
    ok: false,
    error: "Stripe billing is not configured.",
    missing: required
  });
}

function requestOrigin(req) {
  const origin = cleanString(req.headers.origin, 500);
  if (origin) return origin.replace(/\/+$/, "");
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || `127.0.0.1:${config.port}`;
  return `${protocol}://${host}`.replace(/\/+$/, "");
}

function allowedReturnUrl(input, fallbackOrigin, fallbackPath = "/frontend/index.html") {
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

function stripeId(value) {
  if (!value) return "";
  if (typeof value === "string") return cleanString(value, 255);
  return cleanString(value.id, 255);
}

function dateFromStripeSeconds(value) {
  const seconds = Number(value || 0);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : null;
}

function subscriptionPriceId(subscription = {}) {
  return cleanString(subscription.items?.data?.[0]?.price?.id, 255);
}

function planFromSubscription(subscription = {}) {
  const metadataPlan = cleanString(subscription.metadata?.plan, 80);
  if (metadataPlan) return metadataPlan;
  return checkoutPlanByPrice(subscriptionPriceId(subscription))?.plan || "free";
}

function boostEnvKey(packId) {
  const map = {
    boost_small: "STRIPE_PRICE_BOOST_SMALL",
    boost_standard: "STRIPE_PRICE_BOOST_STANDARD",
    boost_plus: "STRIPE_PRICE_BOOST_PLUS",
    boost_max: "STRIPE_PRICE_BOOST_MAX"
  };
  return map[packId] || "STRIPE_PRICE_BOOST_STANDARD";
}

async function ensureStripeCustomer(user) {
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

function checkoutMode(plan, requestedMode) {
  const requested = cleanString(requestedMode, 40);
  if (plan.id === "pro_yearly" && requested === "payment") return "payment";
  return plan.mode;
}

function subscriptionIdFromBillingObject(eventObject = {}) {
  if (eventObject.object === "subscription") return stripeId(eventObject.id);
  return stripeId(eventObject.subscription);
}

function publicCreditBalance(user) {
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

async function grantBoostCredits(user, credits, source = {}) {
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

export {
  allowedReturnUrl,
  boostEnvKey,
  checkoutMode,
  configError,
  dateFromStripeSeconds,
  ensureStripeCustomer,
  grantBoostCredits,
  planFromSubscription,
  publicCreditBalance,
  requestOrigin,
  stripeId,
  subscriptionIdFromBillingObject
};
