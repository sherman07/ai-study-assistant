/**
 * Frontend model for plan-gated AI providers.
 * Free → DeepSeek only; Pro → GPT + Gemini + DeepSeek.
 */

export const PROVIDER_OPENAI = "openai";
export const PROVIDER_GEMINI = "gemini";
export const PROVIDER_DEEPSEEK = "deepseek";
export const FREE_DEFAULT_PROVIDER = PROVIDER_DEEPSEEK;

export function normaliseProviderId(provider = "") {
  const value = String(provider || "").trim().toLowerCase();
  if (value === "gpt" || value === "openai" || value === "chatgpt") return PROVIDER_OPENAI;
  if (value === "gemini" || value === "google" || value === "vertex") return PROVIDER_GEMINI;
  if (value === "deepseek" || value === "deepsea") return PROVIDER_DEEPSEEK;
  if (!value || value === "backend" || value === "default" || value === "auto") return "";
  return value;
}

export function sessionIsPro(session = null) {
  if (!session || typeof session !== "object") return false;
  if (session.isPro === true || session.entitlements?.isPro === true) return true;
  const plan = String(session.billingPlan || session.planId || session.plan || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (!plan.startsWith("pro")) return false;
  const status = String(session.subscriptionStatus || session.subscription_status || "").toLowerCase();
  if (!status) return plan.startsWith("pro_");
  return status === "active" || status === "trialing";
}

export function allowedProvidersForSession(session = null) {
  return sessionIsPro(session) ? [PROVIDER_OPENAI, PROVIDER_GEMINI, PROVIDER_DEEPSEEK] : [PROVIDER_DEEPSEEK];
}

export function resolveProviderForSession(requested = "", session = null) {
  const isPro = sessionIsPro(session);
  const requestedNorm = normaliseProviderId(requested);
  if (isPro) {
    return {
      requested: requestedNorm,
      provider: requestedNorm,
      allowed: allowedProvidersForSession(session),
      clamped: false,
      isPro: true,
      reason: ""
    };
  }
  const clamped = requestedNorm !== PROVIDER_DEEPSEEK;
  return {
    requested: requestedNorm,
    provider: FREE_DEFAULT_PROVIDER,
    allowed: [PROVIDER_DEEPSEEK],
    clamped,
    isPro: false,
    reason: clamped
      ? "Free plan can only use DeepSeek. Upgrade to Pro to unlock GPT and Gemini."
      : ""
  };
}

export function providerSelectOptions(session = null) {
  if (sessionIsPro(session)) {
    return [
      { value: "", label: "Backend default", disabled: false },
      { value: "openai", label: "GPT", disabled: false },
      { value: "gemini", label: "Gemini", disabled: false },
      { value: "deepseek", label: "DeepSeek", disabled: false }
    ];
  }
  return [
    { value: "deepseek", label: "DeepSeek (Free)", disabled: false },
    { value: "openai", label: "GPT (Pro)", disabled: true },
    { value: "gemini", label: "Gemini (Pro)", disabled: true }
  ];
}

export function providerUpgradeCopy(session = null) {
  if (sessionIsPro(session)) {
    return "Choose Backend default, GPT, Gemini, or DeepSeek for note generation.";
  }
  return "Free plan includes DeepSeek. Upgrade to Pro to unlock GPT and Gemini.";
}
