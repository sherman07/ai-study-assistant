import { Router } from "express";
import { requireEntitlementFeature } from "../middleware/billing.js";
import { requireUser } from "../middleware/auth.js";
import { limitValue } from "../utils/validators.js";
import { asyncRoute, sendNotFound } from "./helpers.js";
import {
  cancelBroadcastJob,
  createBroadcastJob,
  deleteBroadcastJob,
  getBroadcastJob,
  listBroadcastJobs,
  patchBroadcastJob,
  retryBroadcastJob
} from "../repositories/broadcastJobsRepository.js";

const router = Router();
const requireBroadcast = requireEntitlementFeature("broadcastMode");

router.post("/", requireUser, requireBroadcast, asyncRoute(async (req, res) => {
  const item = await createBroadcastJob(req.user.id, req.body || {});
  res.status(201).json({ ok: true, item });
}));

router.get("/", requireUser, asyncRoute(async (req, res) => {
  const items = await listBroadcastJobs(req.user.id, limitValue(req.query.limit, 50, 100));
  res.json({ ok: true, items });
}));

router.get("/:id", requireUser, asyncRoute(async (req, res) => {
  const item = await getBroadcastJob(req.user.id, req.params.id);
  if (!item) return sendNotFound(res, "Broadcast job not found.");
  res.json({ ok: true, item });
}));

router.patch("/:id", requireUser, requireBroadcast, asyncRoute(async (req, res) => {
  const item = await patchBroadcastJob(req.user.id, req.params.id, req.body || {});
  if (!item) return sendNotFound(res, "Broadcast job not found.");
  res.json({ ok: true, item });
}));

router.post("/:id/cancel", requireUser, asyncRoute(async (req, res) => {
  const item = await cancelBroadcastJob(req.user.id, req.params.id);
  if (!item) return sendNotFound(res, "Broadcast job not found.");
  res.json({ ok: true, item });
}));

router.post("/:id/retry", requireUser, requireBroadcast, asyncRoute(async (req, res) => {
  const item = await retryBroadcastJob(req.user.id, req.params.id);
  if (!item) return sendNotFound(res, "Broadcast job not found.");
  res.json({ ok: true, item });
}));

router.delete("/:id", requireUser, asyncRoute(async (req, res) => {
  const deleted = await deleteBroadcastJob(req.user.id, req.params.id);
  if (!deleted) return sendNotFound(res, "Broadcast job not found.");
  res.json({ ok: true, deleted: true, id: req.params.id });
}));

export { router as broadcastJobsRouter };
