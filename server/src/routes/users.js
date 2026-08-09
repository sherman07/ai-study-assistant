import { Router } from "express";
import { isControllerUser } from "../admin/controllers.js";
import { publicAdminControls } from "../admin/userControls.js";
import { userEntitlements } from "../billing/plans.js";
import { requireUser } from "../middleware/auth.js";
import { patchUser } from "../repositories/usersRepository.js";
import { asyncRoute } from "./helpers.js";

const router = Router();

function publicMeUser(user = {}) {
  const entitlements = userEntitlements(user);
  return {
    ...user,
    platformRole: isControllerUser(user) ? "controller" : "user",
    isController: isControllerUser(user),
    isPro: Boolean(entitlements.isPro),
    isSuspended: Boolean(entitlements.isSuspended),
    adminControls: publicAdminControls(user),
    entitlements
  };
}

router.get("/me", requireUser, (req, res) => {
  const user = publicMeUser(req.user);
  res.json({
    ok: true,
    user,
    entitlements: user.entitlements,
    credits: {
      totalCredits: user.credits,
      dailyCredits: user.dailyCredits,
      boostCredits: user.boostCredits,
      dailyAllowance: user.dailyAllowance
    }
  });
});

router.patch("/me", requireUser, asyncRoute(async (req, res) => {
  // Only allow the user to change their own display name. Identity-critical
  // fields (role, email, plan, subscription, stripe ids) are derived from the
  // verified token or Stripe webhooks and must never be client-settable.
  const body = req.body || {};
  const patch = {};
  if (body.displayName !== undefined || body.display_name !== undefined) {
    patch.displayName = body.displayName ?? body.display_name;
  }
  const updated = await patchUser(req.user.id, patch);
  const user = publicMeUser(updated || req.user);
  res.json({ ok: true, user, entitlements: user.entitlements });
}));

export { router as usersRouter };
