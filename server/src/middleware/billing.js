import { hasActivePro, userEntitlements, userHasEntitlementFeature } from "../billing/plans.js";

function requireActivePro(req, res, next) {
  const entitlements = userEntitlements(req.user || {});
  if (entitlements.isSuspended) {
    return res.status(403).json({
      ok: false,
      error: "This account is suspended.",
      entitlements
    });
  }
  if (entitlements.isPro || hasActivePro(req.user)) return next();
  // Controller grants for Pro study still unlock Pro-gated writes.
  if (userHasEntitlementFeature(req.user, "proStudy") || userHasEntitlementFeature(req.user, "deepStudy")) {
    return next();
  }
  return res.status(402).json({
    ok: false,
    error: "An active Pro subscription is required.",
    entitlements
  });
}

function requireEntitlementFeature(featureKey) {
  return function requireFeature(req, res, next) {
    const entitlements = userEntitlements(req.user || {});
    if (entitlements.isSuspended) {
      return res.status(403).json({
        ok: false,
        error: "This account is suspended.",
        entitlements
      });
    }
    if (userHasEntitlementFeature(req.user, featureKey)) return next();
    return res.status(402).json({
      ok: false,
      error: `This feature requires access that is not enabled for your account (${featureKey}).`,
      entitlements
    });
  };
}

export { requireActivePro, requireEntitlementFeature };
