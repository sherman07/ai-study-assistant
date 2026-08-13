/** Install window.SynapseAuth from composed client modules. */
import { attach as attachConfig } from "./configAndUrls.js";
import { attach as attachStorage } from "./storageAndSession.js";
import { attach as attachSupabase } from "./supabaseAndAuthFlows.js";
import { attach as attachBilling } from "./apiBillingAccount.js";

export function installAuthClient(root = globalThis) {
  const windowObj = root.window || root;
  const documentObj = root.document || windowObj.document;
  // Ensure classic-script-style globals resolve inside helpers
  if (typeof globalThis.window === "undefined") globalThis.window = windowObj;
  if (typeof globalThis.document === "undefined") globalThis.document = documentObj;

  const api = {};
  attachConfig(api);
  attachStorage(api);
  attachSupabase(api);
  attachBilling(api);

  windowObj.SynapseAuth = {
    absoluteAppUrl: api.absoluteAppUrl,
    apiBase: api.apiBase,
    authHeaders: api.authHeaders,
    clearLastEmail: api.clearLastEmail,
    clearLocalSynapseData: api.clearLocalSynapseData,
    collectLocalData: api.collectLocalData,
    completeAuthRedirect: api.completeAuthRedirect,
    createCheckoutSession: api.createCheckoutSession,
    createBoostCheckoutSession: api.createBoostCheckoutSession,
    createPortalSession: api.createPortalSession,
    dataApiBase: api.dataApiBase,
    downloadJSON: api.downloadJSON,
    estimateCredits: api.estimateCredits,
    spendCredits: api.spendCredits,
    refundCredits: api.refundCredits,
    syncBillingSessionFromServer: api.syncBillingSessionFromServer,
    fetchBillingEntitlements: api.fetchBillingEntitlements,
    fetchBillingPlans: api.fetchBillingPlans,
    fetchCreditBalance: api.fetchCreditBalance,
    normalizeBillingPlanId: api.normalizeBillingPlanId,
    displayPlan: api.displayPlan,
    queueBillingSync: api.queueBillingSync,
    getBillingPlans: () => api.readConfig().billingPlans,
    getBoostPacks: () => (Array.isArray(windowObj.SYNAPSE_BOOST_PACKS) ? windowObj.SYNAPSE_BOOST_PACKS : []),
    getLastEmail: api.getLastEmail,
    getRememberMePreference: api.getRememberMePreference,
    getStoredSession: api.getStoredSession,
    hasRememberedSession: api.hasRememberedSession,
    isConfigured: api.isConfigured,
    loginUrl: api.loginUrl,
    preparePasswordRecovery: api.preparePasswordRecovery,
    requestAccountDeletion: api.requestAccountDeletion,
    requestServerExport: api.requestServerExport,
    requireApiSession: api.requireApiSession,
    accessToken: api.accessToken,
    resendSignupConfirmation: api.resendSignupConfirmation,
    safeReturnPath: api.safeReturnPath,
    setLastEmail: api.setLastEmail,
    setRememberMePreference: api.setRememberMePreference,
    resetPassword: api.resetPassword,
    saveSession: api.saveSession,
    signInEmail: api.signInEmail,
    signInWithGoogle: api.signInWithGoogle,
    signOut: api.signOut,
    signUpEmail: api.signUpEmail,
    syncSessionFromProvider: api.syncSessionFromProvider,
    updatePassword: api.updatePassword
  };

  if (documentObj?.documentElement?.dataset) {
    documentObj.documentElement.dataset.synapseAuthClient = "loaded";
  }

  const sync = () => {
    api.syncSessionFromProvider().catch(error => console.warn("Synapse auth sync failed:", error));
  };
  if (documentObj?.readyState === "loading") {
    documentObj.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }

  return windowObj.SynapseAuth;
}
