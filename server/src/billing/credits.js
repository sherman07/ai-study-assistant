import {
  dailyCreditsForPlan,
  normalizePlan,
  resolveUserCredits,
  welcomeCreditsForPlan
} from "./plans.js";
import { cleanString } from "../utils/validators.js";

/**
 * Typical credit ranges shown before generation begins.
 * Quick questions cost less; documents, Deep Study, visuals, and voice cost more.
 */
const CREDIT_ACTIONS = {
  tutor_question: {
    id: "tutor_question",
    label: "Focused study question",
    min: 8,
    max: 25,
    requiresPro: false,
    lowerCostOption: null,
    description: "A quick tutor question uses a small number of credits."
  },
  standard_notes: {
    id: "standard_notes",
    label: "Standard Notes",
    min: 80,
    max: 220,
    requiresPro: false,
    lowerCostOption: "tutor_question",
    description: "Generate essential study notes from your materials."
  },
  deep_study: {
    id: "deep_study",
    label: "Deep Study",
    min: 280,
    max: 650,
    requiresPro: true,
    lowerCostOption: "standard_notes",
    description: "Deeper analysis with richer explanations and practice."
  },
  document_analysis: {
    id: "document_analysis",
    label: "Document analysis",
    min: 120,
    max: 420,
    requiresPro: false,
    lowerCostOption: "standard_notes",
    description: "Analyze a longer document or multi-page learning source."
  },
  visual_generation: {
    id: "visual_generation",
    label: "Visual generation",
    min: 140,
    max: 360,
    requiresPro: false,
    lowerCostOption: "mind_map",
    description: "Generate diagrams, mind maps, or other study visuals."
  },
  mind_map: {
    id: "mind_map",
    label: "Mind map",
    min: 60,
    max: 160,
    requiresPro: false,
    lowerCostOption: "tutor_question",
    description: "Build a connected concept map from your material."
  },
  practice_generation: {
    id: "practice_generation",
    label: "Practice generation",
    min: 45,
    max: 140,
    requiresPro: false,
    lowerCostOption: "tutor_question",
    description: "Create quizzes, flashcards, or revision drills."
  },
  voice_session: {
    id: "voice_session",
    label: "Voice session",
    min: 180,
    max: 520,
    requiresPro: false,
    lowerCostOption: "tutor_question",
    description: "Run a live voice tutoring or teach-back session."
  }
};

function utcDateKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function floorCredits(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return Math.max(0, Math.floor(fallback));
  return Math.floor(parsed);
}

function readCreditMetadata(user = {}) {
  const metadata = user.metadata || {};
  return {
    dailyCredits: metadata.daily_credits,
    boostCredits: metadata.boost_credits,
    dailyRefreshedOn: metadata.daily_refreshed_on,
    welcomeGranted: metadata.welcome_granted,
    legacyCredits: metadata.credits
  };
}

function buildCreditState({
  plan = "free",
  dailyCredits = 0,
  boostCredits = 0,
  dailyRefreshedOn = null,
  welcomeGranted = false,
  now = new Date()
} = {}) {
  const normalizedPlan = normalizePlan(plan);
  const daily = floorCredits(dailyCredits);
  const boost = floorCredits(boostCredits);
  return {
    plan: normalizedPlan,
    dailyCredits: daily,
    boostCredits: boost,
    totalCredits: daily + boost,
    dailyAllowance: dailyCreditsForPlan(normalizedPlan),
    dailyRefreshedOn: dailyRefreshedOn || utcDateKey(now),
    welcomeGranted: Boolean(welcomeGranted),
    spendOrder: ["daily", "boost"]
  };
}

function creditMetadataFromState(state) {
  return {
    credits: state.totalCredits,
    daily_credits: state.dailyCredits,
    boost_credits: state.boostCredits,
    daily_refreshed_on: state.dailyRefreshedOn,
    welcome_granted: state.welcomeGranted
  };
}

/**
 * Initialize or refresh a user's credit balances.
 * Daily credits reset each UTC day to the plan allowance and do not roll over.
 * Boost credits (including remaining welcome credits) persist until spent.
 */
function ensureCreditState(user = {}, { now = new Date(), forceDailyRefresh = false } = {}) {
  const plan = normalizePlan(user.plan || user.billingPlan || "free");
  const meta = readCreditMetadata(user);
  const today = utcDateKey(now);
  const hasStructured =
    meta.dailyCredits !== undefined
    || meta.boostCredits !== undefined
    || meta.dailyRefreshedOn
    || meta.welcomeGranted === true
    || meta.welcomeGranted === false;

  let dailyCredits;
  let boostCredits;
  let welcomeGranted = Boolean(meta.welcomeGranted);
  let dailyRefreshedOn = cleanString(meta.dailyRefreshedOn, 20) || null;

  if (!hasStructured) {
    const legacyTotal = resolveUserCredits({ ...user, plan, metadata: user.metadata || {} });
    const welcome = welcomeCreditsForPlan(plan);
    const dailyAllowance = dailyCreditsForPlan(plan);
    if (legacyTotal <= 0) {
      dailyCredits = dailyAllowance;
      boostCredits = welcome;
      welcomeGranted = welcome > 0;
    } else if (plan.startsWith("pro_")) {
      dailyCredits = Math.min(legacyTotal, dailyAllowance);
      boostCredits = Math.max(0, legacyTotal - dailyCredits);
      welcomeGranted = true;
    } else {
      // Preserve existing free-tier balance, preferring welcome/boost persistence.
      dailyCredits = Math.min(legacyTotal, dailyAllowance);
      boostCredits = Math.max(welcome, legacyTotal - dailyCredits);
      welcomeGranted = true;
    }
    dailyRefreshedOn = today;
  } else {
    dailyCredits = floorCredits(meta.dailyCredits, dailyCreditsForPlan(plan));
    boostCredits = floorCredits(meta.boostCredits, 0);
    if (!welcomeGranted && welcomeCreditsForPlan(plan) > 0) {
      boostCredits += welcomeCreditsForPlan(plan);
      welcomeGranted = true;
    }
  }

  const needsRefresh = forceDailyRefresh || dailyRefreshedOn !== today;
  if (needsRefresh) {
    dailyCredits = dailyCreditsForPlan(plan);
    dailyRefreshedOn = today;
  }

  return buildCreditState({
    plan,
    dailyCredits,
    boostCredits,
    dailyRefreshedOn,
    welcomeGranted,
    now
  });
}

function creditStateChanged(before, after) {
  return before.dailyCredits !== after.dailyCredits
    || before.boostCredits !== after.boostCredits
    || before.dailyRefreshedOn !== after.dailyRefreshedOn
    || before.welcomeGranted !== after.welcomeGranted
    || before.totalCredits !== after.totalCredits;
}

function addBoostCredits(state, amount) {
  const credits = floorCredits(amount);
  return buildCreditState({
    ...state,
    boostCredits: state.boostCredits + credits
  });
}

function setBoostCredits(state, amount) {
  return buildCreditState({
    ...state,
    boostCredits: floorCredits(amount)
  });
}

function resetCreditsForPlan(plan, { now = new Date(), preserveBoost = 0 } = {}) {
  const normalized = normalizePlan(plan);
  const welcome = welcomeCreditsForPlan(normalized);
  return buildCreditState({
    plan: normalized,
    dailyCredits: dailyCreditsForPlan(normalized),
    boostCredits: floorCredits(preserveBoost) + welcome,
    dailyRefreshedOn: utcDateKey(now),
    welcomeGranted: true,
    now
  });
}

function creditActionList() {
  return Object.values(CREDIT_ACTIONS).map(action => ({
    id: action.id,
    label: action.label,
    min: action.min,
    max: action.max,
    requiresPro: action.requiresPro,
    lowerCostOption: action.lowerCostOption,
    description: action.description
  }));
}

function creditAction(actionId) {
  return CREDIT_ACTIONS[cleanString(actionId, 80)] || null;
}

function balanceSourceLabel(state, amount) {
  if (amount <= state.dailyCredits) {
    return {
      primary: "daily",
      dailyUsed: amount,
      boostUsed: 0,
      label: "Fresh daily credits"
    };
  }
  if (state.dailyCredits <= 0) {
    return {
      primary: "boost",
      dailyUsed: 0,
      boostUsed: amount,
      label: "Boost Credits"
    };
  }
  return {
    primary: "daily_then_boost",
    dailyUsed: state.dailyCredits,
    boostUsed: amount - state.dailyCredits,
    label: "Fresh daily credits, then Boost Credits"
  };
}

function estimateCredits(user = {}, actionId, { now = new Date(), isPro = null } = {}) {
  const action = creditAction(actionId);
  if (!action) {
    return {
      ok: false,
      error: "Unknown credit action."
    };
  }
  const state = ensureCreditState(user, { now });
  const pro = typeof isPro === "boolean" ? isPro : Boolean(user.isPro);
  const maxCharge = action.max;
  const canAfford = state.totalCredits >= maxCharge;
  const source = balanceSourceLabel(state, Math.min(maxCharge, state.totalCredits || maxCharge));
  const lowerCost = action.lowerCostOption ? creditAction(action.lowerCostOption) : null;

  return {
    ok: true,
    action: {
      id: action.id,
      label: action.label,
      description: action.description,
      requiresPro: action.requiresPro
    },
    estimate: {
      expectedRange: { min: action.min, max: action.max },
      maximumCharge: maxCharge,
      currency: "credits"
    },
    balance: state,
    willUse: source,
    canAfford,
    blockedReason: action.requiresPro && !pro
      ? "Deep Study and other Pro learning features require an active Pro plan."
      : (!canAfford ? "Not enough credits for the maximum estimated charge." : null),
    lowerCostOption: lowerCost
      ? {
          id: lowerCost.id,
          label: lowerCost.label,
          expectedRange: { min: lowerCost.min, max: lowerCost.max },
          maximumCharge: lowerCost.max
        }
      : null
  };
}

function spendCredits(user = {}, amount, { now = new Date() } = {}) {
  const charge = floorCredits(amount);
  if (charge <= 0) {
    return {
      ok: false,
      error: "Credit charge must be a positive number."
    };
  }
  const before = ensureCreditState(user, { now });
  if (before.totalCredits < charge) {
    return {
      ok: false,
      error: "Not enough credits.",
      balance: before,
      required: charge,
      shortfall: charge - before.totalCredits
    };
  }

  let remaining = charge;
  const dailyUsed = Math.min(before.dailyCredits, remaining);
  remaining -= dailyUsed;
  const boostUsed = remaining;
  const after = buildCreditState({
    ...before,
    dailyCredits: before.dailyCredits - dailyUsed,
    boostCredits: before.boostCredits - boostUsed,
    now
  });

  return {
    ok: true,
    charged: charge,
    dailyUsed,
    boostUsed,
    before,
    balance: after,
    metadata: creditMetadataFromState(after)
  };
}

export {
  CREDIT_ACTIONS,
  addBoostCredits,
  balanceSourceLabel,
  buildCreditState,
  creditAction,
  creditActionList,
  creditMetadataFromState,
  creditStateChanged,
  ensureCreditState,
  estimateCredits,
  resetCreditsForPlan,
  setBoostCredits,
  spendCredits,
  utcDateKey
};
