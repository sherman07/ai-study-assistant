import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { checkDatabase } from "./db/pool.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { billingRouter, billingWebhookRouter } from "./routes/billing.js";
import { broadcastJobsRouter } from "./routes/broadcastJobs.js";
import { cardsRouter, decksRouter } from "./routes/flashcards.js";
import { focusSessionsRouter } from "./routes/focusSessions.js";
import { generatedContentRouter, internalGeneratedContentRouter } from "./routes/generatedContent.js";
import { learningRouter } from "./routes/learning.js";
import { progressRouter } from "./routes/progress.js";
import { studyRoomsRouter } from "./routes/studyRooms.js";
import { usersRouter } from "./routes/users.js";
import { checkSupabaseStorage, missingSupabaseTables, supabaseStorageEnabled } from "./supabase/rest.js";

function createApp() {
  const app = express();
  const allowedOrigins = new Set(config.corsOrigins);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS origin is not allowed: ${origin}`));
    },
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "X-Synapse-Auth-Mode",
      "X-Synapse-Client-Id",
      "X-Synapse-Internal-Token",
      "X-Synapse-User-Email",
      "X-Synapse-User-Id",
      "X-Synapse-User-Name",
      "X-Synapse-User-Role"
    ],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
  }));

  app.use("/api/billing/webhook", express.raw({ type: "application/json" }), billingWebhookRouter);

  app.get("/health", async (_req, res) => {
    // Repositories select Supabase when it is configured; MySQL is a legacy
    // fallback, not a second write target. Keep the health response truthful
    // so operations can distinguish a working primary store from a mirror.
    const storageMode = supabaseStorageEnabled() ? "supabase" : "mysql";
    const supabase = {
      auth_configured: Boolean(config.supabaseUrl && config.supabaseAnonKey),
      storage_configured: supabaseStorageEnabled(),
      schema: config.supabaseDbSchema || "public",
      connected: false
    };
    let mysqlConnected = false;
    let supabaseConnected = false;

    try {
      await checkDatabase();
      mysqlConnected = true;
    } catch {
      mysqlConnected = false;
    }

    if (supabase.storage_configured) {
      try {
        supabaseConnected = await checkSupabaseStorage();
      } catch {
        supabaseConnected = false;
      }
    }

    supabase.connected = supabaseConnected;
    if (mysqlConnected || supabaseConnected) {
      res.json({
        ok: true,
        status: "ok",
        database: storageMode,
        mysql: { connected: mysqlConnected },
        supabase
      });
      return;
    }

    res.status(503).json({
      ok: false,
      status: "degraded",
      database: storageMode,
      mysql: { connected: false },
      supabase,
      error: "Database connection unavailable."
    });
  });

  app.get("/health/schema", async (_req, res) => {
    if (!supabaseStorageEnabled()) {
      return res.json({ ok: true, storage_configured: false, missing_tables: [] });
    }
    try {
      const { missing } = await missingSupabaseTables();
      return res.status(missing.length ? 503 : 200).json({
        ok: missing.length === 0,
        storage_configured: true,
        schema: config.supabaseDbSchema || "public",
        missing_tables: missing
      });
    } catch (error) {
      return res.status(503).json({ ok: false, storage_configured: true, error: "Schema check failed." });
    }
  });

  app.use("/api/generated-content", express.json({ limit: "12mb" }), generatedContentRouter);
  app.use("/api/internal/generated-content", express.json({ limit: "12mb" }), internalGeneratedContentRouter);
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/billing", billingRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/study-rooms", studyRoomsRouter);
  app.use("/api/focus-sessions", focusSessionsRouter);
  app.use("/api/broadcast-jobs", broadcastJobsRouter);
  app.use("/api/flashcard-decks", decksRouter);
  app.use("/api/flashcards", cardsRouter);
  app.use("/api/learning", learningRouter);
  app.use("/api/progress", progressRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export { createApp };
