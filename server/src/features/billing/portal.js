import { config } from "../../config.js";
import { stripe } from "../../billing/stripe.js";
import { requireUser } from "../../middleware/auth.js";
import { asyncRoute } from "../../routes/helpers.js";
import {
  allowedReturnUrl,
  configError,
  ensureStripeCustomer,
  requestOrigin
} from "./helpers.js";

function mountPortalRoutes(router) {
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
}

export { mountPortalRoutes };
