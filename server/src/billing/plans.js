import { applyAdminControlsToEntitlements } from "../admin/userControls.js";
import { config } from "../config.js";
import { cleanString } from "../utils/validators.js";

const PRO_ACTIVE_STATUSES = new Set(["active", "trialing"]);
const PRO_INACTIVE_STATUSES = new Set([
  "canceled",
  "incomplete",
  "incomplete_expired",
  "inactive",
  "past_due",
  "unpaid"
]);

const checkoutPlans = {
  free: {
    id: "free",
    label: "Free",
    plan: "free",
    mode: null,
    priceId: "",
    priceDisplay: "$0",
    priceCents: 0,
    cadence: "forever",
    welcomeCredits: 500,
    dailyCredits: 50,
    // Backward-compatible aggregate used by admin defaults and older clients.
    credits: 500,
    description: "Explore Synapse with 500 welcome credits, then 50 fresh AI credits every day."
  },
  pro_monthly: {
    id: "pro_monthly",
    label: "Pro Monthly",
    plan: "pro_monthly",
    mode: "subscription",
    priceId: config.stripe.priceProMonthly,
    priceDisplay: "$9.99",
    priceCents: 999,
    cadence: "per month",
    welcomeCredits: 0,
    dailyCredits: 1000,
    credits: 1000,
    description: "Receive 1,000 fresh AI credits every day with the complete Synapse study experience."
  },
  pro_yearly: {
    id: "pro_yearly",
    label: "Pro Annual",
    plan: "pro_yearly",
    mode: "payment",
    priceId: config.stripe.priceProYearly,
    priceDisplay: "$99.99",
    priceCents: 9999,
    cadence: "per year",
    welcomeCredits: 0,
    dailyCredits: 1000,
    credits: 1000,
    annualSavingsCents: 1989,
    annualSavingsDisplay: "$19.89",
    annualSavingsPercent: 16.6,
    description: "Get the complete Pro experience with 1,000 fresh AI credits every day, while saving versus twelve monthly payments."
  }
};

const boostPacks = {
  boost_small: {
    id: "boost_small",
    label: "Small Boost",
    credits: 10000,
    priceId: config.stripe.priceBoostSmall,
    priceDisplay: "$4.99",
    priceCents: 499,
    description: "Add 10,000 Boost Credits for lighter top-ups."
  },
  boost_standard: {
    id: "boost_standard",
    label: "Standard Boost",
    credits: 25000,
    priceId: config.stripe.priceBoostStandard,
    priceDisplay: "$9.99",
    priceCents: 999,
    description: "Add 25,000 Boost Credits for flexible study days."
  },
  boost_plus: {
    id: "boost_plus",
    label: "Plus Boost",
    credits: 70000,
    priceId: config.stripe.priceBoostPlus,
    priceDisplay: "$24.99",
    priceCents: 2499,
    description: "Add 70,000 Boost Credits for heavier study weeks."
  },
  boost_max: {
    id: "boost_max",
    label: "Max Boost",
    credits: 150000,
    priceId: config.stripe.priceBoostMax,
    priceDisplay: "$49.99",
    priceCents: 4999,
    description: "Add 150,000 Boost Credits for intensive exam seasons."
  }
};

function publicPlan(plan) {
  return {
    id: plan.id,
    label: plan.label,
    plan: plan.plan,
    mode: plan.mode,
    configured: plan.id === "free" || Boolean(plan.priceId),
    priceDisplay: plan.priceDisplay,
    priceCents: plan.priceCents,
    cadence: plan.cadence,
    welcomeCredits: plan.welcomeCredits,
    dailyCredits: plan.dailyCredits,
    credits: plan.credits,
    annualSavingsCents: plan.annualSavingsCents || 0,
    annualSavingsDisplay: plan.annualSavingsDisplay || null,
    annualSavingsPercent: plan.annualSavingsPercent || null,
    description: plan.description
  };
}

function publicBoostPack(pack) {
  return {
    id: pack.id,
    label: pack.label,
    credits: pack.credits,
    priceDisplay: pack.priceDisplay,
    priceCents: pack.priceCents,
    configured: Boolean(pack.priceId),
    description: pack.description
  };
}

function billingPlanList() {
  return Object.values(checkoutPlans).map(publicPlan);
}

function boostPackList() {
  return Object.values(boostPacks).map(publicBoostPack);
}

function checkoutPlan(planId) {
  return checkoutPlans[cleanString(planId, 80)] || null;
}

function boostPack(packId) {
  return boostPacks[cleanString(packId, 80)] || null;
}

function checkoutPlanByPrice(priceId) {
  const cleanPrice = cleanString(priceId, 255);
  return Object.values(checkoutPlans).find(plan => plan.priceId && plan.priceId === cleanPrice) || null;
}

function boostPackByPrice(priceId) {
  const cleanPrice = cleanString(priceId, 255);
  return Object.values(boostPacks).find(pack => pack.priceId && pack.priceId === cleanPrice) || null;
}

function normalizePlan(plan) {
  const cleanPlan = cleanString(plan, 80);
  return checkoutPlans[cleanPlan]?.plan || "free";
}

function creditsForPlan(plan) {
  const normalized = normalizePlan(plan);
  return checkoutPlans[normalized]?.credits ?? 500;
}

function dailyCreditsForPlan(plan) {
  const normalized = normalizePlan(plan);
  return checkoutPlans[normalized]?.dailyCredits ?? 50;
}

function welcomeCreditsForPlan(plan) {
  const normalized = normalizePlan(plan);
  return checkoutPlans[normalized]?.welcomeCredits ?? 0;
}

function resolveUserCredits(user = {}) {
  const raw = user.credits ?? user.metadata?.credits;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.floor(parsed);
  }
  const dailyRaw = user.dailyCredits ?? user.metadata?.daily_credits;
  const boostRaw = user.boostCredits ?? user.metadata?.boost_credits;
  const daily = Number(dailyRaw);
  const boost = Number(boostRaw);
  if (Number.isFinite(daily) || Number.isFinite(boost)) {
    return Math.max(0, Math.floor(Number.isFinite(daily) ? daily : 0) + Math.floor(Number.isFinite(boost) ? boost : 0));
  }
  return creditsForPlan(user.plan || user.billingPlan || "free");
}

function normalizeSubscriptionStatus(status) {
  const cleanStatus = cleanString(status, 80).toLowerCase();
  return cleanStatus || "inactive";
}

function isActiveProStatus(status) {
  return PRO_ACTIVE_STATUSES.has(normalizeSubscriptionStatus(status));
}

function subscriptionAccessPlan(plan, status) {
  const normalizedStatus = normalizeSubscriptionStatus(status);
  if (PRO_INACTIVE_STATUSES.has(normalizedStatus)) return "free";
  return isActiveProStatus(normalizedStatus) ? normalizePlan(plan) : "free";
}

function hasActivePro(user = {}, now = new Date()) {
  const plan = normalizePlan(user.plan);
  if (!plan.startsWith("pro_")) return false;
  if (!isActiveProStatus(user.subscriptionStatus || user.subscription_status)) return false;
  if (!user.currentPeriodEnd && !user.current_period_end) return true;
  const periodEnd = new Date(user.currentPeriodEnd || user.current_period_end);
  return Number.isFinite(periodEnd.getTime()) && periodEnd > now;
}

function userEntitlements(user = {}) {
  const pro = hasActivePro(user);
  const base = {
    plan: normalizePlan(user.plan),
    subscriptionStatus: normalizeSubscriptionStatus(user.subscriptionStatus || user.subscription_status),
    currentPeriodEnd: user.currentPeriodEnd || user.current_period_end || null,
    isPro: pro,
    features: {
      basicStudy: true,
      proStudy: pro,
      deepStudy: pro,
      advancedAnalytics: pro,
      priorityProcessing: pro,
      unlimitedUploads: pro,
      boostCredits: true,
      learningCompanion: true,
      broadcastMode: true,
      focusRoom: true,
      mediaAnalysis: true,
      voiceTutor: true,
      // Plan default: Free → DeepSeek only; Pro → GPT + Gemini + DeepSeek.
      gptProvider: pro,
      geminiProvider: pro,
      deepseekProvider: true,
      multiAiProviders: pro,
      allowedAiProviders: pro ? ["openai", "gemini", "deepseek"] : ["deepseek"],
      defaultAiProvider: pro ? "" : "deepseek"
    }
  };
  return applyAdminControlsToEntitlements(base, user);
}

function userHasEntitlementFeature(user = {}, featureKey = "") {
  const entitlements = userEntitlements(user);
  if (entitlements.isSuspended) return false;
  return Boolean(entitlements.features?.[featureKey]);
}

export {
  billingPlanList,
  boostPack,
  boostPackByPrice,
  boostPackList,
  checkoutPlan,
  checkoutPlanByPrice,
  creditsForPlan,
  dailyCreditsForPlan,
  hasActivePro,
  isActiveProStatus,
  normalizePlan,
  normalizeSubscriptionStatus,
  resolveUserCredits,
  subscriptionAccessPlan,
  userEntitlements,
  userHasEntitlementFeature,
  welcomeCreditsForPlan
};
