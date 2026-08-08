import { Router } from "express";
import {
  bootstrapControllerEmails,
  isBootstrapControllerEmail,
  isControllerUser,
  normalizeEmail,
  normalizePlatformRole,
  publicAdminUser
} from "../admin/controllers.js";
import { syncAuthUsersIntoPublicUsers } from "../admin/authUsers.js";
import {
  adminFeatureCatalog,
  normalizeAdminControls
} from "../admin/userControls.js";
import {
  billingPlanList,
  creditsForPlan,
  dailyCreditsForPlan,
  normalizePlan,
  normalizeSubscriptionStatus
} from "../billing/plans.js";
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

function parseNonNegativeInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    const error = new Error(`${fieldName} must be a non-negative number.`);
    error.status = 400;
    throw error;
  }
  return Math.floor(parsed);
}

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
  const skipSync = String(req.query.sync || "1") === "0";

  let sync = { synced: 0, authTotal: 0, skipped: true, reason: "not_requested" };
  if (!skipSync && !query) {
    try {
      sync = await syncAuthUsersIntoPublicUsers({ maxPages: 5 });
    } catch (error) {
      sync = {
        synced: 0,
        authTotal: 0,
        skipped: true,
        reason: error?.message || "auth_sync_failed"
      };
    }
  }

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
    sync,
    plans: billingPlanList().map((plan) => ({
      id: plan.id,
      label: plan.label,
      credits: plan.credits,
      dailyCredits: plan.dailyCredits,
      welcomeCredits: plan.welcomeCredits
    })),
    featureCatalog: adminFeatureCatalog(),
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
    const nextPlan = patch.plan;
    const statusProvided = body.subscriptionStatus !== undefined || body.subscription_status !== undefined;
    const periodProvided = body.currentPeriodEnd !== undefined || body.current_period_end !== undefined;

    if (nextPlan.startsWith("pro_")) {
      if (!statusProvided) {
        patch.subscriptionStatus = "active";
      }
      if (!periodProvided) {
        const end = new Date();
        if (nextPlan === "pro_yearly") end.setFullYear(end.getFullYear() + 1);
        else end.setMonth(end.getMonth() + 1);
        patch.currentPeriodEnd = end.toISOString();
      }
    } else if (nextPlan === "free" && !statusProvided) {
      patch.subscriptionStatus = "inactive";
      if (!periodProvided) patch.currentPeriodEnd = null;
    }
  }

  if (body.subscriptionStatus !== undefined || body.subscription_status !== undefined) {
    patch.subscriptionStatus = normalizeSubscriptionStatus(
      body.subscriptionStatus ?? body.subscription_status
    );
  }

  if (body.credits !== undefined) {
    try {
      patch.credits = parseNonNegativeInt(body.credits, "Credits");
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  }

  if (body.dailyCredits !== undefined || body.daily_credits !== undefined) {
    try {
      patch.dailyCredits = parseNonNegativeInt(
        body.dailyCredits ?? body.daily_credits,
        "Daily credits"
      );
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  }

  if (body.boostCredits !== undefined || body.boost_credits !== undefined) {
    try {
      patch.boostCredits = parseNonNegativeInt(
        body.boostCredits ?? body.boost_credits,
        "Boost credits"
      );
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  }

  if (
    body.credits === undefined
    && body.dailyCredits === undefined
    && body.daily_credits === undefined
    && body.boostCredits === undefined
    && body.boost_credits === undefined
    && body.plan !== undefined
    && body.resetCredits === true
  ) {
    patch.resetCredits = true;
    patch.preserveBoostCredits = body.preserveBoostCredits !== false;
    // Prefer splitting plan daily + keep boost rather than a single total blob.
    patch.dailyCredits = dailyCreditsForPlan(patch.plan);
  }

  if (body.adminControls !== undefined || body.admin_controls !== undefined) {
    patch.adminControls = normalizeAdminControls(body.adminControls ?? body.admin_controls);
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

  const effectivePlan = patch.plan || user.plan || "free";
  const effectiveStatus = patch.subscriptionStatus || user.subscriptionStatus || "inactive";
  if (String(effectivePlan).startsWith("pro_") && effectiveStatus === "inactive") {
    // Controllers assigning a Pro plan must grant usable Pro access.
    patch.subscriptionStatus = "active";
    if (patch.currentPeriodEnd === undefined && !user.currentPeriodEnd) {
      const end = new Date();
      if (effectivePlan === "pro_yearly") end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);
      patch.currentPeriodEnd = end.toISOString();
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
