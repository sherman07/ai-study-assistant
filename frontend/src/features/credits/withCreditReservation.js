/** Reserve max credit charge, run action, refund on failure. */
import { closeCreditEstimateDialog, openCreditEstimateDialog } from "./creditEstimateDialog.js";

function refreshAccountMenu() {
  const renderAccountMenu = globalThis.renderAccountMenu;
  if (typeof renderAccountMenu === "function") renderAccountMenu();
}

/**
 * Show estimate, reserve (spend) max charge, then run the action.
 * Refunds automatically if `actionFn` throws.
 */
export async function withCreditReservation(actionId, actionFn, { confirmLabel, skipDialog = false } = {}) {
  const auth = globalThis.SynapseAuth || globalThis.window?.SynapseAuth;
  if (!auth?.estimateCredits || !auth?.spendCredits) {
    return actionFn?.(null);
  }

  const session = auth.getStoredSession?.();
  if (!session?.email && !session?.accountId) {
    throw new Error("Sign in to use AI credits for generation.");
  }

  await auth.syncBillingSessionFromServer?.(session).catch(() => null);
  const estimate = await auth.estimateCredits(actionId);
  if (estimate.blockedReason && estimate.action?.requiresPro) {
    throw new Error(estimate.blockedReason);
  }
  if (!estimate.canAfford) {
    throw new Error("Not enough credits for this generation. Add Boost Credits or wait for your next daily refresh.");
  }

  const runSpendAndAction = async () => {
    const spend = await auth.spendCredits({
      actionId,
      amount: estimate.estimate.maximumCharge
    });
    refreshAccountMenu();
    try {
      return await actionFn?.(spend);
    } catch (error) {
      try {
        await auth.refundCredits({
          dailyUsed: spend.dailyUsed,
          boostUsed: spend.boostUsed,
          amount: spend.charged
        });
        refreshAccountMenu();
      } catch {}
      throw error;
    }
  };

  if (skipDialog) {
    return runSpendAndAction();
  }

  return new Promise((resolve, reject) => {
    openCreditEstimateDialog(estimate, {
      confirmLabel: confirmLabel || "Continue generation",
      onCancel: () => reject(new Error("Generation cancelled.")),
      onConfirm: async () => {
        try {
          resolve(await runSpendAndAction());
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

export { closeCreditEstimateDialog, openCreditEstimateDialog };
