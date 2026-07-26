import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(serverRoot, ".env") });
dotenv.config();

function envString(name, fallback = "") {
  const value = String(process.env[name] || "").trim();
  return value || fallback;
}

function envInt(name, fallback) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) ? value : fallback;
}

function envBool(name, fallback = false) {
  const raw = String(process.env[name] || "").trim().toLowerCase();
  if (!raw) return fallback;
  return !["0", "false", "no", "off"].includes(raw);
}

function envList(name, fallback = "") {
  return envString(name, fallback)
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

const config = {
  port: envInt("SYNAPSE_DATA_API_PORT", envInt("PORT", 3001)),
  corsOrigins: envList(
    "SYNAPSE_DATA_CORS_ORIGINS",
    "http://127.0.0.1:5175,http://localhost:5175"
  ),
  allowLocalDemoAuth: envBool("ALLOW_LOCAL_DEMO_AUTH", true),
  internalApiToken: envString("SYNAPSE_INTERNAL_API_TOKEN"),
  supabaseUrl: envString("SUPABASE_URL"),
  supabaseAnonKey: envString("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: envString("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseDbSchema: envString("SUPABASE_DB_SCHEMA", "public"),
  stripe: {
    secretKey: envString("STRIPE_SECRET_KEY"),
    webhookSecret: envString("STRIPE_WEBHOOK_SECRET"),
    priceProMonthly: envString("STRIPE_PRICE_PRO_MONTHLY"),
    priceProYearly: envString("STRIPE_PRICE_PRO_YEARLY")
  }
};

export { config, envBool, envInt, envList, envString, serverRoot };
