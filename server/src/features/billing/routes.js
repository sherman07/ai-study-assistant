import { Router } from "express";
import {
  creditActionList,
  estimateCredits,
  refundCredits,
  spendCredits
} from "../../billing/credits.js";
import {
  billingPlanList,
  boostPackList,
  hasActivePro,
  userEntitlements
} from "../../billing/plans.js";
import { missingStripeConfig, stripeConfigured } from "../../billing/stripe.js";
import { requireUser } from "../../middleware/auth.js";
import { applyCreditState } from "../../repositories/usersRepository.js";
import { asyncRoute } from "../../routes/helpers.js";
import { allowedReturnUrl, publicCreditBalance } from "./helpers.js";
import { mountPortalRoutes } from "./portal.js";
import { mountCheckoutRoutes } from "./stripeCheckout.js";
import { billingWebhookRouter } from "./stripeWebhook.js";

const router = Router();

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

mountCheckoutRoutes(router);
mountPortalRoutes(router);

export {
  allowedReturnUrl,
  router as billingRouter,
  billingWebhookRouter
};
