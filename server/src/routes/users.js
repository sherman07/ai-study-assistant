import { Router } from "express";
import { isControllerUser } from "../admin/controllers.js";
import { requireUser } from "../middleware/auth.js";
import { patchUser } from "../repositories/usersRepository.js";
import { asyncRoute } from "./helpers.js";

const router = Router();

router.get("/me", requireUser, (req, res) => {
  const user = {
    ...req.user,
    platformRole: isControllerUser(req.user) ? "controller" : "user",
    isController: isControllerUser(req.user)
  };
  res.json({ ok: true, user });
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
  const user = await patchUser(req.user.id, patch);
  res.json({ ok: true, user });
}));

export { router as usersRouter };
