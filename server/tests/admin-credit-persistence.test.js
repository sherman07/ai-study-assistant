import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeIdentityMetadata,
  supabaseUserPatch,
  upsertUser
} from "../src/repositories/usersRepository.js";
import { config } from "../src/config.js";
import { ensureCreditState } from "../src/billing/credits.js";
import { userEntitlements } from "../src/billing/plans.js";
import { stableUserId } from "../src/utils/ids.js";

test("mergeIdentityMetadata preserves credits and admin_controls", () => {
  const merged = mergeIdentityMetadata(
    {
      daily_credits: 40,
      boost_credits: 900,
      credits: 940,
      daily_refreshed_on: "2026-08-09",
      welcome_granted: true,
      admin_controls: {
        accountStatus: "active",
        features: { gptProvider: "allow" }
      },
      admin_daily_allowance: 40,
      supabase_user_id: "old"
    },
    {
      supabase_user_id: "new-auth",
      provider: "email",
      providers: ["email"],
      daily_credits: 0,
      boost_credits: 0,
      admin_controls: { accountStatus: "suspended" }
    }
  );

  assert.equal(merged.daily_credits, 40);
  assert.equal(merged.boost_credits, 900);
  assert.equal(merged.admin_daily_allowance, 40);
  assert.equal(merged.admin_controls.features.gptProvider, "allow");
  assert.equal(merged.supabase_user_id, "new-auth");
  assert.equal(merged.provider, "email");
});

test("supabaseUserPatch writes independent daily and boost credits", () => {
  const existing = {
    plan: "free",
    dailyCredits: 10,
    boostCredits: 100,
    metadata: {
      daily_credits: 10,
      boost_credits: 100,
      credits: 110,
      welcome_granted: true,
      daily_refreshed_on: "2026-08-09",
      admin_controls: { accountStatus: "active", features: {} }
    }
  };
  const patch = supabaseUserPatch(
    {
      dailyCredits: 25,
      boostCredits: 750,
      adminControls: {
        accountStatus: "active",
        features: { mediaAnalysis: "allow", gptProvider: "allow" }
      }
    },
    existing
  );

  assert.equal(patch.metadata_json.daily_credits, 25);
  assert.equal(patch.metadata_json.boost_credits, 750);
  assert.equal(patch.metadata_json.credits, 775);
  assert.equal(patch.metadata_json.admin_daily_allowance, 25);
  assert.equal(patch.metadata_json.admin_controls.features.mediaAnalysis, "allow");
  assert.equal(patch.metadata_json.admin_controls.features.gptProvider, "allow");
});

test("ensureCreditState keeps boost and honors admin daily allowance on refresh", () => {
  const yesterday = "2020-01-01";
  const state = ensureCreditState(
    {
      plan: "free",
      metadata: {
        daily_credits: 5,
        boost_credits: 777,
        credits: 782,
        welcome_granted: true,
        daily_refreshed_on: yesterday,
        admin_daily_allowance: 33
      }
    },
    { now: new Date("2026-08-09T12:00:00Z") }
  );
  assert.equal(state.boostCredits, 777);
  assert.equal(state.dailyCredits, 33);
  assert.equal(state.dailyAllowance, 33);
});

test("controller grants survive entitlements merge after metadata preserve", () => {
  const entitlements = userEntitlements({
    plan: "free",
    subscriptionStatus: "inactive",
    metadata: {
      daily_credits: 50,
      boost_credits: 500,
      admin_controls: {
        accountStatus: "active",
        features: {
          deepStudy: "allow",
          gptProvider: "allow",
          geminiProvider: "deny"
        }
      }
    }
  });
  assert.equal(entitlements.features.deepStudy, true);
  assert.equal(entitlements.features.gptProvider, true);
  assert.equal(entitlements.features.geminiProvider, false);
  assert.ok(entitlements.features.allowedAiProviders.includes("openai"));
  assert.ok(!entitlements.features.allowedAiProviders.includes("gemini"));
});

test("user upsert recovers a concurrent duplicate insert for the same identity", async () => {
  const originalFetch = globalThis.fetch;
  const originalConfig = {
    supabaseUrl: config.supabaseUrl,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey,
    supabaseDbSchema: config.supabaseDbSchema
  };
  const userId = stableUserId("supabase", "race-subject");
  const existingRow = {
    id: userId,
    auth_provider: "supabase",
    auth_subject: "race-subject",
    email: "student@example.com",
    display_name: "Student",
    auth_mode: "supabase",
    role: "student",
    plan: "free",
    metadata_json: {
      daily_credits: 50,
      boost_credits: 500,
      credits: 550,
      daily_refreshed_on: "2026-08-11",
      welcome_granted: true
    }
  };
  const responses = [
    new Response("[]", { status: 200 }),
    new Response(JSON.stringify({ message: "duplicate key value violates unique constraint \\\"users_pkey\\\"" }), {
      status: 409,
      headers: { "content-type": "application/json" }
    }),
    new Response(JSON.stringify([existingRow]), {
      status: 200,
      headers: { "content-type": "application/json" }
    }),
    new Response(JSON.stringify([existingRow]), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  ];

  config.supabaseUrl = "https://supabase.test";
  config.supabaseServiceRoleKey = "test-service-role-key";
  config.supabaseDbSchema = "public";
  globalThis.fetch = async () => responses.shift();
  try {
    const user = await upsertUser({
      auth_provider: "supabase",
      auth_subject: "race-subject",
      email: "student@example.com",
      display_name: "Student",
      auth_mode: "supabase"
    });

    assert.equal(user.id, userId);
    assert.equal(user.authSubject, "race-subject");
    assert.equal(responses.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    config.supabaseUrl = originalConfig.supabaseUrl;
    config.supabaseServiceRoleKey = originalConfig.supabaseServiceRoleKey;
    config.supabaseDbSchema = originalConfig.supabaseDbSchema;
  }
});

test("user upsert does not recover a duplicate belonging to another identity", async () => {
  const originalFetch = globalThis.fetch;
  const originalConfig = {
    supabaseUrl: config.supabaseUrl,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey,
    supabaseDbSchema: config.supabaseDbSchema
  };
  const responses = [
    new Response("[]", { status: 200 }),
    new Response(JSON.stringify({ message: "duplicate key value violates unique constraint \\\"users_pkey\\\"" }), {
      status: 409,
      headers: { "content-type": "application/json" }
    }),
    new Response("[]", { status: 200 })
  ];

  config.supabaseUrl = "https://supabase.test";
  config.supabaseServiceRoleKey = "test-service-role-key";
  config.supabaseDbSchema = "public";
  globalThis.fetch = async () => responses.shift();
  try {
    await assert.rejects(
      upsertUser({ auth_provider: "supabase", auth_subject: "different-subject" }),
      /HTTP 409.*duplicate key/
    );
    assert.equal(responses.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    config.supabaseUrl = originalConfig.supabaseUrl;
    config.supabaseServiceRoleKey = originalConfig.supabaseServiceRoleKey;
    config.supabaseDbSchema = originalConfig.supabaseDbSchema;
  }
});
