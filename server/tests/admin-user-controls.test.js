import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAdminControlsToEntitlements,
  normalizeAdminControls,
  readAdminControls
} from "../src/admin/userControls.js";
import { publicAdminUser } from "../src/admin/controllers.js";
import { userEntitlements } from "../src/billing/plans.js";

test("normalizeAdminControls defaults to inherit and active", () => {
  const controls = normalizeAdminControls({});
  assert.equal(controls.accountStatus, "active");
  assert.equal(controls.features.deepStudy, "inherit");
  assert.equal(controls.features.gptProvider, "inherit");
});

test("admin allow grants Deep Study on Free plan", () => {
  const user = {
    plan: "free",
    subscriptionStatus: "inactive",
    metadata: {
      admin_controls: {
        accountStatus: "active",
        features: { deepStudy: "allow", gptProvider: "allow" }
      }
    }
  };
  const entitlements = userEntitlements(user);
  assert.equal(entitlements.isPro, false);
  assert.equal(entitlements.features.deepStudy, true);
  assert.equal(entitlements.features.gptProvider, true);
  assert.ok(entitlements.features.allowedAiProviders.includes("openai"));
});

test("admin deny removes Pro model access", () => {
  const user = {
    plan: "pro_monthly",
    subscriptionStatus: "active",
    currentPeriodEnd: new Date(Date.now() + 86400000).toISOString(),
    metadata: {
      admin_controls: {
        features: { geminiProvider: "deny", deepseekProvider: "deny" }
      }
    }
  };
  const entitlements = userEntitlements(user);
  assert.equal(entitlements.isPro, true);
  assert.equal(entitlements.features.geminiProvider, false);
  assert.equal(entitlements.features.deepseekProvider, false);
  assert.deepEqual(entitlements.features.allowedAiProviders, ["openai"]);
});

test("suspended accounts lose Pro entitlements", () => {
  const user = {
    plan: "pro_yearly",
    subscriptionStatus: "active",
    currentPeriodEnd: new Date(Date.now() + 86400000).toISOString(),
    metadata: {
      admin_controls: { accountStatus: "suspended" }
    }
  };
  const entitlements = userEntitlements(user);
  assert.equal(entitlements.isSuspended, true);
  assert.equal(entitlements.isPro, false);
});

test("publicAdminUser exposes adminControls", () => {
  const user = publicAdminUser({
    id: "u3",
    email: "learner@school.edu",
    plan: "free",
    credits: 120,
    dailyCredits: 20,
    boostCredits: 100,
    metadata: {
      admin_controls: {
        accountStatus: "active",
        notes: "Granted media analysis",
        features: { mediaAnalysis: "allow" }
      }
    }
  });
  assert.equal(user.dailyCredits, 20);
  assert.equal(user.boostCredits, 100);
  assert.equal(user.adminControls.features.mediaAnalysis, "allow");
  assert.equal(user.adminControls.notes, "Granted media analysis");
});

test("applyAdminControlsToEntitlements preserves unrelated base features", () => {
  const next = applyAdminControlsToEntitlements(
    {
      isPro: false,
      features: { basicStudy: true, deepStudy: false, customFlag: true }
    },
    {
      metadata: {
        admin_controls: { features: { deepStudy: "allow" } }
      }
    }
  );
  assert.equal(next.features.basicStudy, true);
  assert.equal(next.features.deepStudy, true);
  assert.equal(next.features.customFlag, true);
  assert.equal(readAdminControls({ metadata: { admin_controls: { features: { deepStudy: "allow" } } } }).features.deepStudy, "allow");
});
