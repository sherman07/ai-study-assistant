import { Router } from "express";
import { config } from "../config.js";
import {
  creditActionList,
  estimateCredits,
  refundCredits,
  spendCredits
} from "../billing/credits.js";
import {
  billingPlanList,
  boostPack,
  boostPackList,
  checkoutPlan,
  hasActivePro,
  userEntitlements
} from "../billing/plans.js";
import { missingStripeConfig, stripe, stripeConfigured, stripeWebhookConfigured } from "../billing/stripe.js";
import { requireUser } from "../middleware/auth.js";
import { applyCreditState } from "../repositories/usersRepository.js";
import { cleanString } from "../utils/validators.js";
import { asyncRoute } from "./helpers.js";
import {
  allowedReturnUrl,
  boostEnvKey,
  checkoutMode,
  ensureStripeCustomer,
  handleStripeWebhookEvent,
  publicCreditBalance,
  requestOrigin
} from "../services/billingService.js";

const router = Router();
const webhookRouter = Router();

function configError(res, required = missingStripeConfig()) {
  return res.status(503).json({
    ok: false,
    error: "Stripe billing is not configured.",
    missing: required
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
  const estimate = estimateCredits(req.user, actionId, {
    isPro: hasActivePro(req.user)
  });
  if (!estimate.ok) {
    return res.status(400).json(estimate);
  }
  res.json({
    ok: true,
    ...estimate,
    credits: publicCreditBalance(req.user)
  });
}));

router.post("/credits/spend", requireUser, asyncRoute(async (req, res) => {
  const actionId = req.body?.action_id || req.body?.actionId || req.body?.action;
  const requestedAmount = req.body?.amount ?? req.body?.credits;
  let charge = Number(requestedAmount);

  if (actionId) {
    const estimate = estimateCredits(req.user, actionId, { isPro: hasActivePro(req.user) });
    if (!estimate.ok) {
      return res.status(400).json(estimate);
    }
    if (estimate.blockedReason && estimate.action?.requiresPro) {
      return res.status(402).json({
        ok: false,
        error: estimate.blockedReason,
        estimate
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

  await handleStripeWebhookEvent(event);

  res.json({ ok: true, received: true });
}));

export {
  allowedReturnUrl,
  router as billingRouter,
  webhookRouter as billingWebhookRouter
};
