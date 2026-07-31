import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const historyNavigation = fs.readFileSync(path.join(repoRoot, "frontend/src/react/components/HistoryNavigation.js"), "utf8");
const mobileNavigation = fs.readFileSync(path.join(repoRoot, "frontend/src/react/components/MobileNavigation.js"), "utf8");
const boot = fs.readFileSync(path.join(repoRoot, "frontend/src/legacy/controller_sections/99_boot.js"), "utf8");
const accountController = fs.readFileSync(path.join(repoRoot, "frontend/src/legacy/controller_sections/08_extractrealtimeresponsetranscript.js"), "utf8");
const accountCss = fs.readFileSync(path.join(repoRoot, "frontend/styles/04-section.css"), "utf8");
const railCss = fs.readFileSync(path.join(repoRoot, "frontend/styles/01-section.css"), "utf8");

assert.ok(historyNavigation.includes("history-account-btn"));
assert.ok(historyNavigation.includes("history-account-plan account-menu-plan"));
assert.ok(historyNavigation.includes("Guest Student"), "account menu should default to a truthful signed-out name before auth hydration");
assert.ok(historyNavigation.includes('"Free"'), "account menu should default to Free, not legacy Starter, before auth hydration");
assert.ok(
  /signedIn \? Number\(session\.credits \|\| 0\) : 0/.test(historyNavigation),
  "account menu should default to zero credits before auth hydration"
);
assert.ok(!historyNavigation.includes(">Starter<"), "account menu should not hardcode the old Starter label");
assert.ok(!historyNavigation.includes(">500<"), "account menu should not hardcode signed-in credits before auth hydration");
assert.ok(!historyNavigation.includes(">Account<"));
assert.ok(historyNavigation.includes("account-popover"));
assert.ok(historyNavigation.includes('legacyAction("openAccountPanel", "profile")'));
assert.ok(historyNavigation.includes('legacyAction("signOutAccount")'));
assert.ok(
  historyNavigation.includes('const signedInStyle = signedIn ? undefined : { display: "none" }')
    && historyNavigation.includes("style: signedInStyle"),
  "signed-in only menu actions should be hidden until auth hydration confirms a session"
);
assert.ok(!historyNavigation.includes('class="history-new-btn" type="button" onclick="resetWorkspace()"'));
assert.ok(!historyNavigation.includes("onclick="));

assert.ok(mobileNavigation.includes("mobile-account-summary"));
assert.ok(mobileNavigation.includes("New workspace"));
assert.ok(mobileNavigation.includes('legacyAction("openAccountPanel", "profile")'));

for (const exportedName of [
  "renderAccountMenu",
  "openAccountPanel",
  "closeAccountPanel",
  "goToAuthPage",
  "signOutAccount"
]) {
  assert.ok(boot.includes(exportedName), `${exportedName} should be exported on window`);
}

assert.ok(accountController.includes('AUTH_SESSION_STORAGE_KEY = "synapse.auth.session.v1"'));
assert.ok(accountController.includes("function renderAccountMenu()"));
assert.ok(accountController.includes("function openAccountPanel"));
assert.ok(accountController.includes("function refreshAccountSessionFromProvider()"), "workspace boot should resync Supabase auth before trusting account UI");
assert.ok(boot.includes("refreshAccountSessionFromProvider()"), "boot should refresh the account menu after Supabase session sync");
assert.ok(accountController.includes('ACCOUNT_PREFERENCES_STORAGE_KEY = "synapse.account.preferences.v1"'), "account preferences should use a namespaced persistent key");
assert.ok(accountController.includes("window.SynapseTheme?.setPreference"), "account settings should delegate root appearance updates to the shared theme manager");
assert.ok(accountController.includes("function applyAccountTheme"), "settings should apply a saved appearance preference");
assert.ok(accountController.includes("account-settings-nav"), "settings should have clear section navigation instead of a read-only status list");
assert.ok(accountController.includes("openHistoryDeletionDialog"), "history deletion should use the Synapse confirmation dialog");
assert.ok(accountController.includes("openAccountDeletionDialog"), "account deletion should require an explicit Synapse confirmation dialog");
assert.ok(!accountController.includes("window.confirm("), "account and history deletion should not use browser confirmation prompts");

for (const selector of [
  ".account-menu",
  ".history-account-btn",
  ".history-account-plan",
  ".account-popover",
  ".account-panel-overlay",
  ".account-settings-nav",
  ".synapse-confirmation-card",
  ".mobile-account-summary"
]) {
  assert.ok(accountCss.includes(selector), `${selector} should have CSS`);
}

assert.ok(railCss.includes("flex: 1 1 auto"), "the recent-learning list should own the remaining rail height");
assert.ok(railCss.includes("min-height: 0"), "the recent-learning list should be allowed to scroll inside the rail");
assert.ok(accountCss.includes('html[data-theme="dark"] .summary-nav'), "dark theme should style the generated-section navigation shell");
assert.ok(accountCss.includes('html[data-theme="dark"] .section-btn'), "dark theme should keep generated-section buttons legible");
assert.ok(accountCss.includes('html[data-theme="dark"] .premium-upload-card'), "dark theme should not leave the upload workspace on a light card");
assert.ok(accountCss.includes('html[data-theme="dark"] .drop-zone h2'), "dark theme should keep the upload call-to-action readable");
assert.ok(accountCss.includes('html[data-theme="dark"] .mobile-topbar'), "dark theme should keep the mobile header coherent");
assert.ok(accountCss.includes('html[data-theme="dark"] .source-input-wrap'), "dark theme should not place light source input text on a light-only surface");
assert.ok(accountCss.includes('html[data-theme="dark"] .prompt-mode-box'), "dark theme should keep AI configuration cards readable");
assert.ok(accountCss.includes('html[data-theme="dark"] .language-box label'), "dark theme should keep upload configuration labels legible");

console.log("account menu regression passed");
