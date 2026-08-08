import { Router } from "express";
import { requireInternal, requireUser, requireUserOrInternal } from "../middleware/auth.js";
import { requireEntitlementFeature } from "../middleware/billing.js";
import { upsertUser } from "../repositories/usersRepository.js";
import { cleanString, limitValue } from "../utils/validators.js";
import { asyncRoute, sendNotFound } from "./helpers.js";
import {
  deleteGeneratedContent,
  deleteGeneratedContentForUser,
  exportGeneratedContent,
  getGeneratedContentSections,
  getGeneratedContent,
  listGeneratedContent,
  patchGeneratedContent,
  upsertGeneratedContent
} from "../repositories/generatedContentRepository.js";

const router = Router();
const internalRouter = Router();
const PRO_FEATURES = new Set(["advanced_analytics", "priority_processing", "pro_study", "unlimited_uploads"]);
const PRO_FEATURE_TO_ENTITLEMENT = {
  advanced_analytics: "advancedAnalytics",
  priority_processing: "priorityProcessing",
  pro_study: "proStudy",
  unlimited_uploads: "unlimitedUploads"
};

async function actorFromRequest(req) {
  if (req.user) return req.user;
  if (req.internal && req.body?.identity) return upsertUser(req.body.identity);
  return null;
}

function requestRequiresPro(body = {}) {
  const result = body?.result || {};
  const feature = cleanString(body?.feature || result.feature, 80);
  return Boolean(
    body?.requires_pro ||
    body?.requiresPro ||
    result.requires_pro ||
    result.requiresPro ||
    PRO_FEATURES.has(feature)
  );
}

function entitlementKeyForRequest(body = {}) {
  const result = body?.result || {};
  const feature = cleanString(body?.feature || result.feature, 80);
  return PRO_FEATURE_TO_ENTITLEMENT[feature] || "proStudy";
}

function requireProWhenRequested(req, res, next) {
  if (req.internal || !requestRequiresPro(req.body)) return next();
  return requireEntitlementFeature(entitlementKeyForRequest(req.body))(req, res, next);
}

router.get("/", requireUser, asyncRoute(async (req, res) => {
  const metadataOnly = String(req.query.include || "").toLowerCase() === "metadata";
  const items = await listGeneratedContent(
    req.user.id,
    limitValue(req.query.limit, 50, 100),
    metadataOnly
      ? { includeSummary: false, includeSections: false, includeRelated: false }
      : {}
  );
  res.json({ ok: true, items });
}));

router.post("/", requireUserOrInternal, requireProWhenRequested, asyncRoute(async (req, res) => {
  const actor = await actorFromRequest(req);
  if (!actor) return res.status(401).json({ ok: false, error: "User identity is required." });
  const clientFingerprint = cleanString(req.body?.client_fingerprint || req.body?.clientFingerprint, 191);
  const item = await upsertGeneratedContent(
    actor.id,
    req.body?.result
      ? { ...req.body.result, client_fingerprint: clientFingerprint }
      : (req.body || {})
  );
  res.status(201).json({ ok: true, item, database_record: item.database_record });
}));

router.get("/:id", requireUser, asyncRoute(async (req, res) => {
  const item = await getGeneratedContent(req.user.id, req.params.id);
  if (!item) return sendNotFound(res, "Generated content not found.");
  res.json({ ok: true, item });
}));

router.get("/:id/sections", requireUser, asyncRoute(async (req, res) => {
  const page = limitValue(req.query.page, 1, 1000000);
  const pageSize = limitValue(req.query.page_size || req.query.pageSize, 3, 10);
  const result = await getGeneratedContentSections(req.user.id, req.params.id, page, pageSize);
  if (!result) return sendNotFound(res, "Generated content not found.");
  res.json({ ok: true, ...result });
}));

router.patch("/:id", requireUser, asyncRoute(async (req, res) => {
  const item = await patchGeneratedContent(req.user.id, req.params.id, req.body || {});
  if (!item) return sendNotFound(res, "Generated content not found.");
  res.json({ ok: true, item });
}));

router.delete("/:id", requireUser, asyncRoute(async (req, res) => {
  const deleted = await deleteGeneratedContent(req.user.id, req.params.id);
  if (!deleted) return sendNotFound(res, "Generated content not found.");
  res.json({ ok: true, deleted: true, id: req.params.id });
}));

internalRouter.use(requireInternal);

internalRouter.post("/list", asyncRoute(async (req, res) => {
  const actor = await upsertUser(req.body?.identity || {});
  const items = await listGeneratedContent(actor.id, limitValue(req.body?.limit, 50, 100));
  res.json({ ok: true, items });
}));

internalRouter.post("/get", asyncRoute(async (req, res) => {
  const actor = await upsertUser(req.body?.identity || {});
  const item = await getGeneratedContent(actor.id, req.body?.id || req.body?.content_id);
  if (!item) return sendNotFound(res, "Generated content not found.");
  res.json({ ok: true, item });
}));

internalRouter.post("/delete", asyncRoute(async (req, res) => {
  const actor = await upsertUser(req.body?.identity || {});
  const deleted = await deleteGeneratedContent(actor.id, req.body?.id || req.body?.content_id);
  res.json({ ok: true, deleted });
}));

internalRouter.post("/export", asyncRoute(async (req, res) => {
  const actor = await upsertUser(req.body?.identity || {});
  const items = await exportGeneratedContent(actor.id);
  res.json({ ok: true, items });
}));

internalRouter.post("/delete-user", asyncRoute(async (req, res) => {
  const actor = await upsertUser(req.body?.identity || {});
  const deletedCount = await deleteGeneratedContentForUser(actor.id);
  res.json({ ok: true, deleted_count: deletedCount });
}));

export { internalRouter as internalGeneratedContentRouter, router as generatedContentRouter };
