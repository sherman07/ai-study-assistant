import assert from "node:assert/strict";
import test from "node:test";
import {
  hasActivePro,
  reconcileBillingState,
  userEntitlements
} from "../src/billing/plans.js";
import {
  CREDIT_METADATA_KEYS,
  mapUser,
  mergeUserMetadata
} from "../src/repositories/usersRepository.js";

test("reconcileBillingState activates Pro stuck on schema default inactive", () => {
  const repaired = reconcileBillingState({
    plan: "pro_yearly",
    subscriptionStatus: "inactive",
    currentPeriodEnd: null
  }, new Date("2026-07-30T00:00:00Z"));

  assert.equal(repaired.plan, "pro_yearly");
  assert.equal(repaired.subscriptionStatus, "active");
  assert.equal(repaired.repaired, true);
  assert.ok(repaired.repairs.includes("pro_inactive_status"));
  assert.ok(repaired.repairs.includes("pro_missing_period_end"));
  assert.ok(repaired.currentPeriodEnd);
});

test("reconcileBillingState leaves past_due Pro alone", () => {
  const result = reconcileBillingState({
    plan: "pro_monthly",
    subscriptionStatus: "past_due",
    currentPeriodEnd: "2026-08-01T00:00:00Z"
  });
  assert.equal(result.subscriptionStatus, "past_due");
  assert.equal(result.repaired, false);
});

test("reconcileBillingState normalizes free+active to inactive", () => {
  const result = reconcileBillingState({
    plan: "free",
    subscriptionStatus: "active"
  });
  assert.equal(result.subscriptionStatus, "inactive");
  assert.equal(result.repaired, true);
});

test("hasActivePro and entitlements honor reconciled Pro yearly", () => {
  const user = {
    plan: "pro_yearly",
    subscription_status: "inactive",
    current_period_end: "2027-07-30T00:00:00Z"
  };
  assert.equal(hasActivePro(user, new Date("2026-07-30T00:00:00Z")), true);
  const entitlements = userEntitlements(user);
  assert.equal(entitlements.isPro, true);
  assert.equal(entitlements.subscriptionStatus, "active");
  assert.equal(entitlements.features.deepStudy, true);
});

test("mergeUserMetadata preserves credit balances across Auth sync payloads", () => {
  const existing = {
    credits: 1000,
    daily_credits: 800,
    boost_credits: 200,
    daily_refreshed_on: "2026-07-30",
    welcome_granted: true,
    supabase_user_id: "old"
  };
  const incoming = {
    supabase_user_id: "auth-1",
    provider: "email",
    last_sign_in_at: "2026-07-30T12:00:00Z"
  };
  const merged = mergeUserMetadata(existing, incoming);
  assert.equal(merged.credits, 1000);
  assert.equal(merged.daily_credits, 800);
  assert.equal(merged.boost_credits, 200);
  assert.equal(merged.daily_refreshed_on, "2026-07-30");
  assert.equal(merged.welcome_granted, true);
  assert.equal(merged.supabase_user_id, "auth-1");
  assert.equal(merged.provider, "email");
  for (const key of CREDIT_METADATA_KEYS) {
    assert.ok(Object.prototype.hasOwnProperty.call(merged, key));
  }
});

test("mapUser surfaces reconciled Pro status for admin/API reads", () => {
  const user = mapUser({
    id: "u-pro",
    auth_provider: "supabase",
    auth_subject: "auth-pro",
    email: "shermanzheng8@gmail.com",
    display_name: "Sherman",
    role: "student",
    platform_role: "controller",
    plan: "pro_yearly",
    subscription_status: "inactive",
    current_period_end: null,
    metadata_json: {
      credits: 1000,
      daily_credits: 1000,
      boost_credits: 0,
      daily_refreshed_on: "2026-07-30",
      welcome_granted: true
    }
  });
  assert.equal(user.subscriptionStatus, "active");
  assert.equal(user.plan, "pro_yearly");
  assert.equal(user.billingRepaired, true);
  assert.equal(user.credits, 1000);
  assert.ok(user.currentPeriodEnd);
});
