import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const authScript = fs.readFileSync(path.join(repoRoot, "frontend/landing-auth.js"), "utf8");
const authCss = fs.readFileSync(path.join(repoRoot, "frontend/landing-auth.css"), "utf8");
const authClientScript = fs.readFileSync(path.join(repoRoot, "frontend/auth-client.js"), "utf8");
const backendAppScript = fs.readFileSync(path.join(repoRoot, "backend/app.py"), "utf8");
const loginPage = fs.readFileSync(path.join(repoRoot, "frontend/login.html"), "utf8");
const signupPage = fs.readFileSync(path.join(repoRoot, "frontend/signup.html"), "utf8");
const workspacePage = fs.readFileSync(path.join(repoRoot, "frontend/index.html"), "utf8");
const accountsKey = "synapse.auth.accounts.v1";
const sessionKey = "synapse.auth.session.v1";

assert.ok(authScript.includes("function appEntryUrl()"));
assert.ok(authScript.includes(accountsKey));
assert.ok(authScript.includes(sessionKey));
assert.ok(!authScript.includes("window.location.href = '/index.html'"));
assert.ok(!authScript.includes("window.prompt"), "Google auth must not use a fake prompt-based login fallback");
assert.ok(authScript.includes("signInWithGoogle"), "Google auth should delegate to the real auth provider");
assert.ok(!authScript.includes("Check your email to confirm your Synapse account, then login."), "Signup UI must not claim an email was sent when Supabase only returned no session");
assert.ok(authScript.includes("Account created. Check your email to confirm your Synapse account, then log in."), "Signup UI should only show the confirmation message returned by the signup flow");
assert.ok(authScript.includes("showSignupConfirmationStatus"), "Signup UI should provide the confirmation-pending state");
assert.ok(authScript.includes("showPendingAccountStatus"), "Signup UI should provide an unconfirmed-account state");
assert.ok(authScript.includes("Resend Confirmation Email"), "Signup UI should let users retry a missing confirmation email");
assert.ok(authScript.includes("showExistingAccountStatus"), "Signup UI should handle Supabase repeated-signup responses");
assert.ok(authScript.includes("Go to Login"), "Repeated signup should offer a direct login path");
assert.ok(authScript.includes("Forgot Password"), "Repeated signup should offer recovery instead of waiting for another signup email");
assert.ok(authScript.includes("prefillEmail"), "Password recovery should prefill the email from repeated-signup actions");
assert.ok(authClientScript.includes('publicApiFetch("/api/auth/signup"'), "Supabase signup should go through the backend auth endpoint");
assert.ok(authClientScript.includes('publicApiFetch("/api/auth/resend-confirmation"'), "Confirmation resend should go through the backend auth endpoint");
assert.ok(authClientScript.includes("absoluteVerificationUrl"), "Signup confirmation should redirect to a dedicated verification page");
assert.ok(authClientScript.includes("readAuthApiResponse"), "Auth client should parse structured backend auth responses");
assert.ok(authClientScript.includes("timeoutMs = 75000"), "Auth requests should tolerate a Render free-tier cold start instead of failing after 20 seconds");
assert.ok(authScript.includes("existing_confirmed"), "Signup UI should handle confirmed duplicate accounts");
assert.ok(authScript.includes("existing_unconfirmed"), "Signup UI should handle unconfirmed duplicate accounts");
assert.ok(authClientScript.includes("completeAuthRedirect"), "Auth client should complete Supabase redirect sessions on the verify page");
assert.ok(authClientScript.includes('event === "SIGNED_OUT"'), "Auth client should clear the app session only on explicit Supabase sign-out events");
assert.ok(authClientScript.includes('session?.authMode === "supabase"'), "Auth sync should clear stale Supabase app sessions when no provider session exists");
assert.ok(backendAppScript.includes('"plan": "free"'), "New Supabase signups should use the Free plan id, not the old Starter label");
assert.ok(authClientScript.includes("resendSignupConfirmation"), "Auth client should expose a resend confirmation helper");
assert.ok(authCss.includes(".auth-status-button"), "Confirmation retry should have visible button styling");
assert.ok(authCss.includes(".auth-form-status.warning"), "Existing account status should have warning styling");
assert.ok(authCss.includes(".auth-form-status.info"), "Pending account status should have info styling");
for (const frontendFile of ["frontend/auth-client.js", "frontend/landing-auth.js", "frontend/signup.html"]) {
  const source = fs.readFileSync(path.join(repoRoot, frontendFile), "utf8");
  assert.ok(!/service_role|SERVICE_ROLE|admin\/users/.test(source), `${frontendFile} must not expose Supabase admin credentials or admin auth routes`);
}
assert.ok(fs.existsSync(path.join(repoRoot, "index.html")));

const rootIndex = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
assert.ok(rootIndex.includes("frontend/landing.html"));
const rootApp = fs.readFileSync(path.join(repoRoot, "app.html"), "utf8");
assert.ok(rootApp.includes("frontend/index.html"));

for (const page of ["landing", "login", "signup", "forgot-password", "verify", "reset-password"]) {
  const shim = fs.readFileSync(path.join(repoRoot, `${page}.html`), "utf8");
  assert.ok(shim.includes(`frontend/${page}.html`), `${page}.html should redirect to frontend/${page}.html`);
}

const verifyPage = fs.readFileSync(path.join(repoRoot, "frontend/verify.html"), "utf8");
const verifyScript = fs.readFileSync(path.join(repoRoot, "frontend/verify-auth.js"), "utf8");
const forgotPage = fs.readFileSync(path.join(repoRoot, "frontend/forgot-password.html"), "utf8");
const resetPage = fs.readFileSync(path.join(repoRoot, "frontend/reset-password.html"), "utf8");
const resetScript = fs.readFileSync(path.join(repoRoot, "frontend/reset-password.js"), "utf8");
const renderBlueprint = fs.readFileSync(path.join(repoRoot, "render.yaml"), "utf8");
assert.ok(verifyPage.includes("verify-auth.js"), "Verify page should run the Supabase auth callback controller");
assert.ok(verifyPage.includes("data-testid=\"verify-status\""), "Verify page should expose a testable status region");
assert.ok(verifyScript.includes("completeAuthRedirect"), "Verify page should complete Supabase redirect sessions");
assert.ok(!verifyScript.includes("innerHTML"), "Verify page should render URL-derived auth errors with text nodes");
assert.ok(forgotPage.includes("Send Reset Link"), "Password recovery page should present a production reset flow");
assert.ok(signupPage.includes("password-strength"), "Sign-up should expose a password strength indicator");
assert.ok(signupPage.includes("password-requirements"), "Sign-up should expose live password requirements");
assert.ok(loginPage.includes("data-testid=\"login-status\""), "Login should expose a status region");
for (const page of [loginPage, signupPage, forgotPage, resetPage, verifyPage, workspacePage]) {
  assert.ok(page.includes("config.js?v=public-auth-session-v4"), "Public pages must bypass cached pre-fix runtime config");
  assert.ok(page.includes("auth-client.js?v=public-auth-session-v3"), "Public pages must bypass cached pre-fix auth client code");
}
assert.ok(workspacePage.includes("style.css?v=companion-practice-v1"), "Workspace should bypass cached pre-fix contrast styles");
assert.ok(forgotPage.includes("data-testid=\"reset-success\""), "Forgot password should expose a success state");
assert.ok(resetPage.includes("data-testid=\"reset-password-success\""), "Reset password should expose a success state");
assert.ok(authClientScript.includes("/api/auth/request-password-reset"), "Password recovery should use the Synapse backend email endpoint");
assert.ok(!authClientScript.includes("client.auth.resetPasswordForEmail"), "Password recovery email must not be sent directly by the browser through Supabase");
assert.ok(authClientScript.includes("absolutePasswordResetUrl"), "Password reset emails should redirect to the dedicated password reset page");
assert.ok(authClientScript.includes("reset-password.html"), "Auth client should know the dedicated password reset page");
assert.ok(!authClientScript.includes("resetPasswordForEmail(normalizeEmail(email), {\n      redirectTo: absoluteAppUrl()"), "Password reset must not redirect recovery links to the app homepage");
assert.ok(authClientScript.includes("preparePasswordRecovery"), "Auth client should prepare Supabase recovery sessions before password update");
assert.ok(authClientScript.includes("client.auth.verifyOtp"), "Password recovery should exchange Synapse token-hash links for a Supabase session");
assert.ok(authClientScript.includes("token_hash: tokenHash"), "Password recovery should verify the one-time token hash without relying on Supabase redirects");
assert.ok(authClientScript.includes("updateUser({ password })"), "Auth client should update the Supabase password from the recovery page");
assert.ok(resetPage.includes("reset-password.js"), "Reset password page should run its dedicated controller");
assert.ok(resetPage.includes("data-testid=\"reset-password-status\""), "Reset password page should expose a testable status region");
assert.ok(resetScript.includes("preparePasswordRecovery"), "Reset password page should verify the recovery session");
assert.ok(resetScript.includes("updatePassword"), "Reset password page should call the auth client's password update helper");
assert.ok(!resetScript.includes("innerHTML"), "Reset password page should render URL-derived auth errors with text nodes");
assert.match(renderBlueprint, /key: SYNAPSE_SMTP_PORT\s+value: "2525"/, "Free Render services should use Brevo's unblocked SMTP submission port");

function makeClassList() {
  const values = new Set();
  return {
    add(name) {
      values.add(name);
    },
    remove(name) {
      values.delete(name);
    },
    toggle(name, force) {
      const shouldAdd = force === undefined ? !values.has(name) : Boolean(force);
      if (shouldAdd) values.add(name);
      else values.delete(name);
      return shouldAdd;
    },
    contains(name) {
      return values.has(name);
    }
  };
}

function makeElement(value = "") {
  const attributes = new Map();
  return {
    value,
    checked: false,
    disabled: false,
    textContent: "",
    type: "password",
    dataset: {},
    style: {
      setProperty() {}
    },
    classList: makeClassList(),
    addEventListener() {},
    setAttribute(name, nextValue) {
      attributes.set(name, String(nextValue));
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 100 };
    },
    querySelector() {
      return null;
    },
    scrollIntoView() {}
  };
}

function makeLocalStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    }
  };
}

function simulateAuthSubmit({ pathname, page, store, values = {} }) {
  let submitHandler = null;
  const submitButton = makeElement();
  const errors = {
    emailError: makeElement(),
    passwordError: makeElement(),
    firstNameError: makeElement(),
    lastNameError: makeElement(),
    signupEmailError: makeElement(),
    signupPasswordError: makeElement(),
    confirmPasswordError: makeElement(),
    termsError: makeElement(),
    resetEmailError: makeElement()
  };
  const termsCheckbox = makeElement();
  termsCheckbox.checked = values.termsChecked ?? true;
  const loginForm = {
    addEventListener(type, handler) {
      if (type === "submit") submitHandler = handler;
    },
    querySelector(selector) {
      return selector === 'button[type="submit"]' ? submitButton : null;
    }
  };
  const signupForm = {
    addEventListener(type, handler) {
      if (type === "submit") submitHandler = handler;
    },
    querySelector(selector) {
      if (selector === 'button[type="submit"]') return submitButton;
      if (selector === 'input[name="terms"]') return termsCheckbox;
      return null;
    }
  };
  const forgotPasswordForm = {
    addEventListener(type, handler) {
      if (type === "submit") submitHandler = handler;
    },
    querySelector(selector) {
      return selector === 'button[type="submit"]' ? submitButton : null;
    }
  };
  const elements = {
    ...errors,
    loginForm: page === "login" ? loginForm : null,
    loginEmail: makeElement(values.email || "student@example.com"),
    loginPassword: makeElement(values.password || "password123"),
    loginSpinner: makeElement(),
    togglePassword: null,
    signupForm: page === "signup" ? signupForm : null,
    firstName: makeElement(values.firstName || "Sherman"),
    lastName: makeElement(values.lastName || "Zheng"),
    signupEmail: makeElement(values.email || "student@example.com"),
    role: makeElement(values.role || "student"),
    signupPassword: makeElement(values.password || "password123"),
    confirmPassword: makeElement(values.confirmPassword || values.password || "password123"),
    signupSpinner: makeElement(),
    toggleSignupPassword: null,
    toggleConfirmPassword: null,
    forgotPasswordForm: page === "forgot" ? forgotPasswordForm : null,
    resetEmail: makeElement(values.email || "student@example.com"),
    resetSpinner: makeElement(),
    resetSuccess: makeElement(),
    mobileToggle: null
  };
  const windowStub = {
    location: { pathname, href: "" },
    localStorage: store,
    prompt() {
      return values.promptValue || "";
    }
  };
  const documentStub = {
    body: { style: {} },
    addEventListener() {},
    getElementById(id) {
      return elements[id] || null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector === ".auth-error") return Object.values(errors);
      return [];
    }
  };
  const context = vm.createContext({
    Date,
    JSON,
    Math,
    window: windowStub,
    document: documentStub,
    console: { log() {}, warn() {} },
    alert() {},
    setTimeout(callback) {
      callback();
    },
    IntersectionObserver: function IntersectionObserver() {
      this.observe = () => {};
    }
  });
  vm.runInContext(authScript, context);
  assert.equal(typeof submitHandler, "function");
  submitHandler({ preventDefault() {} });
  return { href: windowStub.location.href, elements, store };
}

const store = makeLocalStorage();
const signup = simulateAuthSubmit({ pathname: "/frontend/signup.html", page: "signup", store });
assert.equal(signup.href, "index.html");

const accounts = JSON.parse(store.getItem(accountsKey));
assert.equal(accounts.length, 1);
assert.equal(accounts[0].email, "student@example.com");
assert.equal(accounts[0].firstName, "Sherman");
assert.equal(accounts[0].plan, "Starter");
assert.equal(accounts[0].credits, 500);
assert.ok(!("passwordHash" in accounts[0]));
assert.ok(!("password" in accounts[0]));
assert.equal(accounts[0].authMode, "local_demo");
assert.ok(store.getItem(sessionKey));

store.removeItem(sessionKey);
const loginFromFrontend = simulateAuthSubmit({ pathname: "/frontend/login.html", page: "login", store });
assert.equal(loginFromFrontend.href, "index.html");
assert.ok(JSON.parse(store.getItem(sessionKey)).email);

store.removeItem(sessionKey);
const loginFromRoot = simulateAuthSubmit({ pathname: "/login.html", page: "login", store });
assert.equal(loginFromRoot.href, "frontend/index.html");

const missingAccountStore = makeLocalStorage();
const missingAccount = simulateAuthSubmit({ pathname: "/frontend/login.html", page: "login", store: missingAccountStore });
assert.equal(missingAccount.href, "");
assert.ok(missingAccount.elements.emailError.classList.contains("show"));

const legacyStore = makeLocalStorage({
  [accountsKey]: JSON.stringify([{
    id: "legacy",
    email: "legacy@example.com",
    firstName: "Legacy",
    lastName: "Student",
    authProvider: "email",
    passwordHash: "old-local-verifier",
    plan: "Starter",
    credits: 500
  }])
});
const legacyLogin = simulateAuthSubmit({
  pathname: "/frontend/login.html",
  page: "login",
  store: legacyStore,
  values: { email: "legacy@example.com", password: "anything-non-empty" }
});
assert.equal(legacyLogin.href, "index.html");
const migratedAccounts = JSON.parse(legacyStore.getItem(accountsKey));
assert.ok(!("passwordHash" in migratedAccounts[0]));
assert.equal(migratedAccounts[0].authMode, "local_demo");

console.log("auth routing regression passed");
