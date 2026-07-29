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
    credits: 500,
    description: "Start studying with basic notes, mind maps, and practice."
  },
  pro_monthly: {
    id: "pro_monthly",
    label: "Pro Monthly",
    plan: "pro_monthly",
    mode: "subscription",
    priceId: config.stripe.priceProMonthly,
    credits: 4000,
    description: "Monthly Pro access for deeper study sessions."
  },
  pro_yearly: {
    id: "pro_yearly",
    label: "Pro Yearly",
    plan: "pro_yearly",
    mode: "payment",
    priceId: config.stripe.priceProYearly,
    credits: 4000,
    description: "One year of Pro access at the best long-term value."
  }
};

function billingPlanList() {
  return Object.values(checkoutPlans).map(plan => ({
    id: plan.id,
    label: plan.label,
    plan: plan.plan,
    mode: plan.mode,
    configured: plan.id === "free" || Boolean(plan.priceId),
    credits: plan.credits,
    description: plan.description
  }));
}

function checkoutPlan(planId) {
  return checkoutPlans[cleanString(planId, 80)] || null;
}

function checkoutPlanByPrice(priceId) {
  const cleanPrice = cleanString(priceId, 255);
  return Object.values(checkoutPlans).find(plan => plan.priceId && plan.priceId === cleanPrice) || null;
}

function normalizePlan(plan) {
  const cleanPlan = cleanString(plan, 80);
  return checkoutPlans[cleanPlan]?.plan || "free";
}

function creditsForPlan(plan) {
  const normalized = normalizePlan(plan);
  return checkoutPlans[normalized]?.credits ?? 500;
}

function resolveUserCredits(user = {}) {
  const raw = user.credits ?? user.metadata?.credits;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.floor(parsed);
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
  return {
    plan: normalizePlan(user.plan),
    subscriptionStatus: normalizeSubscriptionStatus(user.subscriptionStatus || user.subscription_status),
    currentPeriodEnd: user.currentPeriodEnd || user.current_period_end || null,
    isPro: pro,
    features: {
      basicStudy: true,
      proStudy: pro,
      advancedAnalytics: pro,
      priorityProcessing: pro,
      unlimitedUploads: pro
    }
  };
}

export {
  billingPlanList,
  checkoutPlan,
  checkoutPlanByPrice,
  creditsForPlan,
  hasActivePro,
  isActiveProStatus,
  normalizePlan,
  normalizeSubscriptionStatus,
  resolveUserCredits,
  subscriptionAccessPlan,
  userEntitlements
};
