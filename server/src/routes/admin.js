import { Router } from "express";
import {
  bootstrapControllerEmails,
  isBootstrapControllerEmail,
  isControllerUser,
  normalizeEmail,
  normalizePlatformRole,
  publicAdminUser
} from "../admin/controllers.js";
import { requireController } from "../middleware/auth.js";
import { listPlatformSettings, patchPlatformSettings } from "../repositories/platformSettingsRepository.js";
import {
  addSiteAccessEntry,
  listSiteAccessAllowlist,
  removeSiteAccessEntry
} from "../repositories/siteAccessRepository.js";
import {
  getUserByEmail,
  listControllers,
  patchUser,
  searchUsersByEmail
} from "../repositories/usersRepository.js";
import { asyncRoute } from "./helpers.js";

const router = Router();

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

export { router as adminRouter };
