import assert from "node:assert/strict";
import test from "node:test";
import { identityFromAuthUser } from "../src/admin/authUsers.js";

test("identityFromAuthUser maps Supabase Auth accounts into public.users identities", () => {
  const identity = identityFromAuthUser({
    id: "auth-user-1",
    email: "Learner@School.edu",
    email_confirmed_at: "2026-07-01T00:00:00Z",
    last_sign_in_at: "2026-07-29T00:00:00Z",
    created_at: "2026-06-01T00:00:00Z",
    user_metadata: {
      first_name: "Ada",
      last_name: "Lovelace",
      role: "student"
    },
    app_metadata: {
      provider: "email",
      providers: ["email"]
    }
  });

  assert.equal(identity.auth_provider, "supabase");
  assert.equal(identity.auth_subject, "auth-user-1");
  assert.equal(identity.email, "learner@school.edu");
  assert.equal(identity.display_name, "Ada Lovelace");
  assert.equal(identity.role, "student");
  assert.equal(identity.metadata.supabase_user_id, "auth-user-1");
});

test("identityFromAuthUser returns null without a subject", () => {
  assert.equal(identityFromAuthUser({}), null);
});
