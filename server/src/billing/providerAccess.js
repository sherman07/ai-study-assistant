/**
 * Plan → AI provider access rules (mirrors backend/domain/provider_access.py).
 * Free → DeepSeek only. Pro → GPT, Gemini, DeepSeek.
 */

export const PROVIDER_OPENAI = "openai";
export const PROVIDER_GEMINI = "gemini";
export const PROVIDER_DEEPSEEK = "deepseek";

export const ALL_TEXT_PROVIDERS = Object.freeze([PROVIDER_OPENAI, PROVIDER_GEMINI, PROVIDER_DEEPSEEK]);
export const FREE_TEXT_PROVIDERS = Object.freeze([PROVIDER_DEEPSEEK]);
export const PRO_TEXT_PROVIDERS = ALL_TEXT_PROVIDERS;
export const FREE_DEFAULT_PROVIDER = PROVIDER_DEEPSEEK;

export function normaliseProviderId(provider = "") {
  const value = String(provider || "").trim().toLowerCase();
  if (value === "gpt" || value === "openai" || value === "chatgpt") return PROVIDER_OPENAI;
  if (value === "gemini" || value === "google" || value === "vertex") return PROVIDER_GEMINI;
  if (value === "deepseek" || value === "deepsea") return PROVIDER_DEEPSEEK;
  if (!value || value === "backend" || value === "default" || value === "auto") return "";
  return value;
}

export function allowedProvidersForPlan({ isPro = false } = {}) {
  return isPro ? [...PRO_TEXT_PROVIDERS] : [...FREE_TEXT_PROVIDERS];
}

export function resolveProviderForPlan(requested = "", { isPro = false, backendDefault = PROVIDER_OPENAI } = {}) {
  const requestedNorm = normaliseProviderId(requested);
  let backend = normaliseProviderId(backendDefault) || PROVIDER_OPENAI;
  if (!ALL_TEXT_PROVIDERS.includes(backend)) backend = PROVIDER_OPENAI;

  if (isPro) {
    const effective = requestedNorm || backend;
    return {
      requested: requestedNorm,
      provider: ALL_TEXT_PROVIDERS.includes(effective) ? effective : backend,
      allowed: [...PRO_TEXT_PROVIDERS],
      clamped: false,
      isPro: true,
      reason: ""
    };
  }

  if (requestedNorm === PROVIDER_DEEPSEEK) {
    return {
      requested: requestedNorm,
      provider: PROVIDER_DEEPSEEK,
      allowed: [...FREE_TEXT_PROVIDERS],
      clamped: false,
      isPro: false,
      reason: ""
    };
  }

  return {
    requested: requestedNorm,
    provider: FREE_DEFAULT_PROVIDER,
    allowed: [...FREE_TEXT_PROVIDERS],
    clamped: true,
    isPro: false,
    reason: "Free plan can only use DeepSeek. Upgrade to Pro to unlock GPT and Gemini."
  };
}

export function providerDeniedMessage(provider = "") {
  const selected = normaliseProviderId(provider) || "that provider";
  const label = {
    [PROVIDER_OPENAI]: "GPT",
    [PROVIDER_GEMINI]: "Gemini",
    [PROVIDER_DEEPSEEK]: "DeepSeek"
  }[selected] || selected;
  return `${label} is available on Pro. Free plan can only use DeepSeek. Upgrade to Pro to unlock GPT and Gemini.`;
}

export function providerOptionList({ isPro = false } = {}) {
  if (isPro) {
    return [
      ["", "Backend default"],
      ["openai", "GPT"],
      ["gemini", "Gemini"],
      ["deepseek", "DeepSeek"]
    ];
  }
  return [
    ["deepseek", "DeepSeek (Free)"],
    ["openai", "GPT (Pro)"],
    ["gemini", "Gemini (Pro)"]
  ];
}
