import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIMARY_CONTROLLER_EMAIL,
  bootstrapControllerEmails,
  isBootstrapControllerEmail,
  isControllerUser,
  normalizePlatformRole,
  publicAdminUser
} from "../src/admin/controllers.js";

test("primary controller email is bootstrapped", () => {
  assert.equal(PRIMARY_CONTROLLER_EMAIL, "shermanzheng8@gmail.com");
  assert.ok(bootstrapControllerEmails().includes("shermanzheng8@gmail.com"));
  assert.equal(isBootstrapControllerEmail("ShermanZheng8@gmail.com"), true);
});

test("controller detection uses platform role or bootstrap email", () => {
  assert.equal(isControllerUser({ email: "student@example.com", platformRole: "user" }), false);
  assert.equal(isControllerUser({ email: "student@example.com", platformRole: "controller" }), true);
  assert.equal(isControllerUser({ email: "shermanzheng8@gmail.com", platformRole: "user" }), true);
});

test("publicAdminUser normalizes controller flag", () => {
  const user = publicAdminUser({
    id: "u1",
    email: "shermanzheng8@gmail.com",
    displayName: "Sherman",
    platformRole: "user",
    plan: "pro_monthly"
  });
  assert.equal(user.platformRole, "controller");
  assert.equal(user.credits, 1000);
  assert.equal(normalizePlatformRole("CONTROLLER"), "controller");
  assert.equal(normalizePlatformRole("admin"), "user");
});

test("publicAdminUser keeps explicit credit overrides", () => {
  const user = publicAdminUser({
    id: "u2",
    email: "learner@school.edu",
    plan: "free",
    credits: 120
  });
  assert.equal(user.platformRole, "user");
  assert.equal(user.credits, 120);
  assert.equal(user.plan, "free");
});
