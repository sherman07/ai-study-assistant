import { config } from "../../config.js";
import { boostPack, checkoutPlan } from "../../billing/plans.js";
import { stripe } from "../../billing/stripe.js";
import { requireUser } from "../../middleware/auth.js";
import { asyncRoute } from "../../routes/helpers.js";
import {
  allowedReturnUrl,
  boostEnvKey,
  checkoutMode,
  configError,
  ensureStripeCustomer,
  requestOrigin
} from "./helpers.js";

function mountCheckoutRoutes(router) {
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
}

export { mountCheckoutRoutes };
