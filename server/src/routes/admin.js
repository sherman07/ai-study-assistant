import { Router } from "express";
import {
  bootstrapControllerEmails,
  isBootstrapControllerEmail,
  isControllerUser,
  normalizeEmail,
  normalizePlatformRole,
  publicAdminUser
} from "../admin/controllers.js";
import { billingPlanList, creditsForPlan, normalizePlan, normalizeSubscriptionStatus } from "../billing/plans.js";
import { requireController } from "../middleware/auth.js";
import { listPlatformSettings, patchPlatformSettings } from "../repositories/platformSettingsRepository.js";
import {
  addSiteAccessEntry,
  listSiteAccessAllowlist,
  removeSiteAccessEntry
} from "../repositories/siteAccessRepository.js";
import {
  getUserByEmail,
  getUserById,
  listControllers,
  listUsers,
  patchUser,
  searchUsersByEmail
} from "../repositories/usersRepository.js";
import { asyncRoute } from "./helpers.js";

const router = Router();

const ALLOWED_ROLES = new Set(["student", "teacher", "tutor", "admin"]);

router.use(requireController);

router.get("/me", (req, res) => {
  res.json({
    ok: true,
    controller: true,
    user: publicAdminUser(req.user)
  });
});

router.get("/settings", asyncRoute(async (_req, res) => {
  const settings = await listPlatformSettings();
  res.json({ ok: true, settings });
}));

router.patch("/settings", asyncRoute(async (req, res) => {
  const settings = await patchPlatformSettings(req.body || {}, req.user.id);
  res.json({ ok: true, settings });
}));

router.get("/access", asyncRoute(async (_req, res) => {
  const [entries, settings] = await Promise.all([
    listSiteAccessAllowlist(),
    listPlatformSettings()
  ]);
  res.json({
    ok: true,
    siteAccessMode: settings.site_access_mode || "open",
    entries
  });
}));

router.post("/access", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const entry = await addSiteAccessEntry({
    email: body.email,
    note: body.note || "",
    grantedByUserId: req.user.id,
    grantedByEmail: req.user.email
  });
  res.status(201).json({ ok: true, entry });
}));

router.delete("/access/:email", asyncRoute(async (req, res) => {
  const email = normalizeEmail(decodeURIComponent(req.params.email || ""));
  if (isBootstrapControllerEmail(email)) {
    return res.status(400).json({
      ok: false,
      error: "The primary controller cannot be removed from site access."
    });
  }
  const result = await removeSiteAccessEntry(email);
  res.json({ ok: true, ...result });
}));

router.get("/controllers", asyncRoute(async (_req, res) => {
  const controllers = await listControllers(200);
  const byEmail = new Map();
  for (const user of controllers) {
    const email = normalizeEmail(user.email);
    if (email) byEmail.set(email, publicAdminUser(user));
  }
  // Ensure bootstrap controllers appear even before their first login.
  for (const email of bootstrapControllerEmails()) {
    if (!byEmail.has(email)) {
      byEmail.set(email, {
        id: "",
        email,
        displayName: email,
        role: "student",
        platformRole: "controller",
        plan: "free",
        subscriptionStatus: "inactive",
        currentPeriodEnd: null,
        credits: creditsForPlan("free"),
        stripeCustomerId: "",
        authProvider: "",
        createdAt: null,
        updatedAt: null,
        bootstrap: true
      });
    } else {
      byEmail.set(email, { ...byEmail.get(email), bootstrap: true });
    }
  }
  res.json({
    ok: true,
    controllers: [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email))
  });
}));

router.post("/controllers", asyncRoute(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email || !email.includes("@")) {
    return res.status(400).json({ ok: false, error: "A valid email is required." });
  }
  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(404).json({
      ok: false,
      error: "No Synapse user exists for that email yet. They must sign up first."
    });
  }
  const updated = await patchUser(user.id, { platformRole: "controller" });
  await addSiteAccessEntry({
    email,
    note: req.body?.note || "Controller",
    grantedByUserId: req.user.id,
    grantedByEmail: req.user.email
  }).catch(() => null);
  res.status(201).json({ ok: true, user: publicAdminUser(updated || user) });
}));

router.delete("/controllers/:email", asyncRoute(async (req, res) => {
  const email = normalizeEmail(decodeURIComponent(req.params.email || ""));
  if (isBootstrapControllerEmail(email)) {
    return res.status(400).json({
      ok: false,
      error: "The primary controller cannot be demoted."
    });
  }
  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ ok: false, error: "Controller user not found." });
  }
  if (!isControllerUser(user)) {
    return res.status(400).json({ ok: false, error: "That user is not a controller." });
  }
  const updated = await patchUser(user.id, { platformRole: "user" });
  res.json({ ok: true, user: publicAdminUser(updated || { ...user, platformRole: "user" }) });
}));

router.get("/users/search", asyncRoute(async (req, res) => {
  const query = String(req.query.q || req.query.email || "");
  const users = await searchUsersByEmail(query, 20);
  res.json({
    ok: true,
    users: users.map(user => ({
      ...publicAdminUser(user),
      platformRole: normalizePlatformRole(user.platformRole)
    }))
  });
}));

router.get("/users", asyncRoute(async (req, res) => {
  const query = String(req.query.q || req.query.query || "");
  const limit = Number(req.query.limit || 100);
  const offset = Number(req.query.offset || 0);
  const users = await listUsers({ query, limit, offset });
  const marked = users.map((user) => {
    const publicUser = publicAdminUser(user);
    if (isBootstrapControllerEmail(user.email)) {
      return { ...publicUser, bootstrap: true };
    }
    return publicUser;
  });
  res.json({
    ok: true,
    count: marked.length,
    plans: billingPlanList().map((plan) => ({
      id: plan.id,
      label: plan.label,
      credits: plan.credits
    })),
    users: marked
  });
}));

router.get("/users/:id", asyncRoute(async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ ok: false, error: "User not found." });
  }
  const publicUser = publicAdminUser(user);
  res.json({
    ok: true,
    user: isBootstrapControllerEmail(user.email)
      ? { ...publicUser, bootstrap: true }
      : publicUser
  });
}));

router.patch("/users/:id", asyncRoute(async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ ok: false, error: "User not found." });
  }

  const body = req.body || {};
  const patch = {};

  if (body.displayName !== undefined || body.display_name !== undefined) {
    patch.displayName = body.displayName ?? body.display_name;
  }

  if (body.role !== undefined) {
    const role = String(body.role || "").toLowerCase().trim();
    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({
        ok: false,
        error: `Role must be one of: ${[...ALLOWED_ROLES].join(", ")}.`
      });
    }
    patch.role = role;
  }

  if (body.platformRole !== undefined || body.platform_role !== undefined) {
    const platformRole = normalizePlatformRole(body.platformRole ?? body.platform_role);
    if (platformRole === "user" && isBootstrapControllerEmail(user.email)) {
      return res.status(400).json({
        ok: false,
        error: "The primary controller cannot be demoted."
      });
    }
    patch.platformRole = platformRole;
  }

  if (body.plan !== undefined) {
    patch.plan = normalizePlan(body.plan);
  }

  if (body.subscriptionStatus !== undefined || body.subscription_status !== undefined) {
    patch.subscriptionStatus = normalizeSubscriptionStatus(
      body.subscriptionStatus ?? body.subscription_status
    );
  }

  if (body.credits !== undefined) {
    const credits = Number(body.credits);
    if (!Number.isFinite(credits) || credits < 0) {
      return res.status(400).json({ ok: false, error: "Credits must be a non-negative number." });
    }
    patch.credits = Math.floor(credits);
  } else if (body.plan !== undefined && body.resetCredits === true) {
    patch.credits = creditsForPlan(patch.plan);
  }

  if (body.currentPeriodEnd !== undefined || body.current_period_end !== undefined) {
    const raw = body.currentPeriodEnd ?? body.current_period_end;
    if (raw === null || raw === "") {
      patch.currentPeriodEnd = null;
    } else {
      const date = new Date(raw);
      if (!Number.isFinite(date.getTime())) {
        return res.status(400).json({ ok: false, error: "currentPeriodEnd must be a valid date." });
      }
      patch.currentPeriodEnd = date.toISOString();
    }
  }

  if (!Object.keys(patch).length) {
    return res.status(400).json({ ok: false, error: "No supported fields to update." });
  }

  const updated = await patchUser(user.id, patch);
  if (patch.platformRole === "controller") {
    await addSiteAccessEntry({
      email: user.email,
      note: "Controller",
      grantedByUserId: req.user.id,
      grantedByEmail: req.user.email
    }).catch(() => null);
  }

  const publicUser = publicAdminUser(updated || { ...user, ...patch });
  res.json({
    ok: true,
    user: isBootstrapControllerEmail(user.email)
      ? { ...publicUser, bootstrap: true }
      : publicUser
  });
}));

export { router as adminRouter };
