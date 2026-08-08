import { Router } from "express";
import { config } from "../config.js";
import {
  addBoostCredits,
  creditActionList,
  creditMetadataFromState,
  ensureCreditState,
  estimateCredits,
  refundCredits,
  spendCredits
} from "../billing/credits.js";
import {
  billingPlanList,
  boostPack,
  boostPackByPrice,
  boostPackList,
  checkoutPlan,
  checkoutPlanByPrice,
  hasActivePro,
  subscriptionAccessPlan,
  userEntitlements
} from "../billing/plans.js";
import { missingStripeConfig, stripe, stripeConfigured, stripeWebhookConfigured } from "../billing/stripe.js";
import { requireUser } from "../middleware/auth.js";
import {
  applyCreditState,
  getUserById,
  getUserByStripeCustomerId,
  getUserByStripeSubscriptionId,
  updateUserStripeCustomer,
  updateUserSubscription
} from "../repositories/usersRepository.js";
import { cleanString } from "../utils/validators.js";
import { asyncRoute } from "./helpers.js";

const router = Router();
const webhookRouter = Router();

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

async function updateFromSubscription(subscription) {
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

async function updateBoostCheckoutCompleted(session, targetUser) {
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

async function updateCheckoutCompleted(session) {
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

async function markSubscriptionInactive(eventObject, status = "inactive") {
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

router.get("/plans", (_req, res) => {
  res.json({
    ok: true,
    plans: billingPlanList(),
    boostPacks: boostPackList(),
    creditActions: creditActionList(),
    stripeConfigured: stripeConfigured(),
    missing: missingStripeConfig()
  });
});

router.get("/entitlements", requireUser, (req, res) => {
  res.json({
    ok: true,
    entitlements: userEntitlements(req.user),
    credits: publicCreditBalance(req.user),
    user: req.user
  });
});

router.get("/credits", requireUser, (req, res) => {
  res.json({
    ok: true,
    credits: publicCreditBalance(req.user),
    actions: creditActionList(),
    user: req.user
  });
});

router.post("/credits/estimate", requireUser, asyncRoute(async (req, res) => {
  const actionId = req.body?.action_id || req.body?.actionId || req.body?.action;
  const entitlements = userEntitlements(req.user);
  if (entitlements.isSuspended) {
    return res.status(403).json({
      ok: false,
      error: "This account is suspended.",
      entitlements
    });
  }
  const estimate = estimateCredits(req.user, actionId, {
    isPro: entitlements.isPro || hasActivePro(req.user)
  });
  if (!estimate.ok) {
    return res.status(400).json(estimate);
  }
  res.json({
    ok: true,
    ...estimate,
    entitlements,
    credits: publicCreditBalance(req.user)
  });
}));

router.post("/credits/spend", requireUser, asyncRoute(async (req, res) => {
  const actionId = req.body?.action_id || req.body?.actionId || req.body?.action;
  const requestedAmount = req.body?.amount ?? req.body?.credits;
  const entitlements = userEntitlements(req.user);
  if (entitlements.isSuspended) {
    return res.status(403).json({
      ok: false,
      error: "This account is suspended.",
      entitlements
    });
  }
  let charge = Number(requestedAmount);

  if (actionId) {
    const estimate = estimateCredits(req.user, actionId, {
      isPro: entitlements.isPro || hasActivePro(req.user)
    });
    if (!estimate.ok) {
      return res.status(400).json(estimate);
    }
    if (estimate.blockedReason && estimate.action?.requiresPro) {
      return res.status(402).json({
        ok: false,
        error: estimate.blockedReason,
        estimate,
        entitlements
      });
    }
    if (!Number.isFinite(charge) || charge <= 0) {
      charge = estimate.estimate.maximumCharge;
    }
    charge = Math.min(Math.floor(charge), estimate.estimate.maximumCharge);
  }

  const result = spendCredits(req.user, charge);
  if (!result.ok) {
    return res.status(402).json(result);
  }

  const updated = await applyCreditState(req.user.id, result.balance);
  res.json({
    ok: true,
    charged: result.charged,
    dailyUsed: result.dailyUsed,
    boostUsed: result.boostUsed,
    actionId: actionId || null,
    credits: publicCreditBalance(updated || { ...req.user, creditState: result.balance }),
    user: updated
  });
}));

router.post("/credits/refund", requireUser, asyncRoute(async (req, res) => {
  const result = refundCredits(req.user, {
    dailyUsed: req.body?.daily_used ?? req.body?.dailyUsed,
    boostUsed: req.body?.boost_used ?? req.body?.boostUsed,
    amount: req.body?.amount ?? req.body?.credits
  });
  if (!result.ok) {
    return res.status(400).json(result);
  }
  const updated = await applyCreditState(req.user.id, result.balance);
  res.json({
    ok: true,
    refunded: result.refunded,
    dailyRestored: result.dailyRestored,
    boostRestored: result.boostRestored,
    credits: publicCreditBalance(updated || { ...req.user, creditState: result.balance }),
    user: updated
  });
}));

router.post("/create-checkout-session", requireUser, asyncRoute(async (req, res) => {
  const plan = checkoutPlan(req.body?.plan_id || req.body?.planId);
  if (!plan || plan.id === "free") {
    return res.status(400).json({ ok: false, error: "Choose a paid Pro plan to open Checkout." });
  }
  const required = ["STRIPE_SECRET_KEY"];
  if (!config.stripe.secretKey) return configError(res, required);
  if (!plan.priceId) return configError(res, [plan.id === "pro_monthly" ? "STRIPE_PRICE_PRO_MONTHLY" : "STRIPE_PRICE_PRO_YEARLY"]);

  const mode = checkoutMode(plan, req.body?.checkout_mode || req.body?.checkoutMode || req.body?.mode);
  const origin = requestOrigin(req);
  const successUrl = allowedReturnUrl(
    req.body?.success_url || req.body?.successUrl,
    origin,
    "/frontend/billing-success.html?session_id={CHECKOUT_SESSION_ID}"
  );
  const cancelUrl = allowedReturnUrl(
    req.body?.cancel_url || req.body?.cancelUrl,
    origin,
    "/frontend/billing-cancel.html"
  );
  const customerId = await ensureStripeCustomer(req.user);
  const session = await stripe().checkout.sessions.create({
    mode,
    customer: customerId,
    client_reference_id: req.user.id,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      user_id: req.user.id,
      plan: plan.plan,
      checkout_mode: mode,
      checkout_kind: "subscription_plan",
      daily_credits: String(plan.dailyCredits)
    },
    subscription_data: mode === "subscription"
      ? {
          metadata: {
            user_id: req.user.id,
            plan: plan.plan
          }
        }
      : undefined
  });

  res.status(201).json({
    ok: true,
    id: session.id,
    url: session.url,
    plan: plan.plan,
    mode
  });
}));

router.post("/create-boost-checkout-session", requireUser, asyncRoute(async (req, res) => {
  const pack = boostPack(req.body?.pack_id || req.body?.packId || req.body?.boost_pack_id);
  if (!pack) {
    return res.status(400).json({ ok: false, error: "Choose a valid Boost Credit pack." });
  }
  if (!config.stripe.secretKey) return configError(res, ["STRIPE_SECRET_KEY"]);
  if (!pack.priceId) return configError(res, [boostEnvKey(pack.id)]);

  const origin = requestOrigin(req);
  const successUrl = allowedReturnUrl(
    req.body?.success_url || req.body?.successUrl,
    origin,
    "/frontend/billing-success.html?session_id={CHECKOUT_SESSION_ID}&boost=1"
  );
  const cancelUrl = allowedReturnUrl(
    req.body?.cancel_url || req.body?.cancelUrl,
    origin,
    "/frontend/pricing.html#boost"
  );
  const customerId = await ensureStripeCustomer(req.user);
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: req.user.id,
    line_items: [{ price: pack.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      user_id: req.user.id,
      checkout_kind: "boost",
      boost_pack_id: pack.id,
      boost_credits: String(pack.credits),
      price_id: pack.priceId
    }
  });

  res.status(201).json({
    ok: true,
    id: session.id,
    url: session.url,
    pack: pack.id,
    credits: pack.credits,
    mode: "payment"
  });
}));

router.post("/create-portal-session", requireUser, asyncRoute(async (req, res) => {
  if (!config.stripe.secretKey) return configError(res, ["STRIPE_SECRET_KEY"]);
  const customerId = await ensureStripeCustomer(req.user);
  const origin = requestOrigin(req);
  const returnUrl = allowedReturnUrl(req.body?.return_url || req.body?.returnUrl, origin, "/frontend/index.html");
  const portal = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  });
  res.status(201).json({ ok: true, url: portal.url });
}));

webhookRouter.post("/", asyncRoute(async (req, res) => {
  if (!stripeConfigured() || !stripeWebhookConfigured()) {
    return configError(res, missingStripeConfig().filter(name => name === "STRIPE_SECRET_KEY" || name === "STRIPE_WEBHOOK_SECRET"));
  }
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe().webhooks.constructEvent(req.body, signature, config.stripe.webhookSecret);
  } catch (error) {
    return res.status(400).json({ ok: false, error: `Webhook signature verification failed: ${error.message}` });
  }

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

  res.json({ ok: true, received: true });
}));

export {
  allowedReturnUrl,
  router as billingRouter,
  webhookRouter as billingWebhookRouter
};
