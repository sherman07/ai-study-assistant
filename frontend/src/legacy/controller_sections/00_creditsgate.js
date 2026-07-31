/* Credit estimate + spend gate for study generation actions. */

function creditActionForNoteLength(noteLength) {
  const value = String(noteLength || "").toLowerCase();
  if (value.includes("deep")) return "deep_study";
  if (value.includes("document") || value.includes("long")) return "document_analysis";
  return "standard_notes";
}

function creditActionForTool(tool) {
  const value = String(tool || "").toLowerCase();
  if (value === "quiz" || value === "practice" || value === "flashcards") return "practice_generation";
  if (value === "timeline") return "practice_generation";
  if (value === "visual" || value === "visual_guide" || value === "mind_map") return "visual_generation";
  if (value === "broadcast" || value === "voice") return "voice_session";
  if (value === "tutor" || value === "companion") return "tutor_question";
  if (value === "deep_study") return "deep_study";
  if (value === "document_analysis") return "document_analysis";
  return "standard_notes";
}

function formatCreditNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString();
}

function closeCreditEstimateDialog() {
  document.querySelector(".synapse-credit-estimate-overlay")?.remove();
}

function openCreditEstimateDialog(estimate, { confirmLabel = "Continue generation", onConfirm, onCancel } = {}) {
  closeCreditEstimateDialog();
  const action = estimate?.action || {};
  const range = estimate?.estimate?.expectedRange || {};
  const maxCharge = estimate?.estimate?.maximumCharge || 0;
  const balance = estimate?.credits || estimate?.balance || {};
  const willUse = estimate?.willUse || {};
  const lower = estimate?.lowerCostOption || null;
  const canAfford = estimate?.canAfford !== false && !estimate?.blockedReason;

  const overlay = document.createElement("div");
  overlay.className = "synapse-confirmation-overlay synapse-credit-estimate-overlay";
  overlay.innerHTML = `
    <section class="synapse-confirmation-card synapse-credit-estimate-card" role="dialog" aria-modal="true" aria-labelledby="synapseCreditEstimateTitle">
      <p class="account-settings-kicker">Credit estimate</p>
      <h3 id="synapseCreditEstimateTitle">${escapeHTML(action.label || "AI generation")}</h3>
      <p>${escapeHTML(action.description || "Review the credit estimate before generation begins.")}</p>
      <ul class="synapse-credit-estimate-list">
        <li><strong>Expected range:</strong> ${escapeHTML(formatCreditNumber(range.min))}–${escapeHTML(formatCreditNumber(range.max))} credits</li>
        <li><strong>Maximum charge:</strong> ${escapeHTML(formatCreditNumber(maxCharge))} credits</li>
        <li><strong>Balance used:</strong> ${escapeHTML(willUse.label || "Fresh daily credits first")}</li>
        <li><strong>Your balance:</strong> ${escapeHTML(formatCreditNumber(balance.totalCredits ?? balance.total))} total
          (${escapeHTML(formatCreditNumber(balance.dailyCredits))} daily · ${escapeHTML(formatCreditNumber(balance.boostCredits))} boost)</li>
      </ul>
      ${lower ? `<p class="account-panel-help">Lower-cost option: ${escapeHTML(lower.label)} (max ${escapeHTML(formatCreditNumber(lower.maximumCharge))} credits).</p>` : ""}
      ${estimate?.blockedReason ? `<p class="synapse-confirmation-error" role="alert">${escapeHTML(estimate.blockedReason)}</p>` : ""}
      ${!canAfford && !estimate?.blockedReason ? `<p class="synapse-confirmation-error" role="alert">Not enough credits for this generation. Add Boost Credits or wait for tomorrow’s daily refresh.</p>` : ""}
      <div class="synapse-confirmation-actions">
        <button type="button" class="account-secondary-action" data-credit-cancel>Cancel</button>
        <button type="button" class="account-secondary-action ${canAfford ? "account-plan-action current" : ""}" data-credit-confirm ${canAfford ? "" : "disabled"} style="${canAfford ? "background:linear-gradient(135deg,#4a7cff,#6b8cff);color:#fff;border:0;justify-content:center;" : "justify-content:center;"}">${escapeHTML(confirmLabel)}</button>
      </div>
    </section>
  `;

  const finishCancel = () => {
    closeCreditEstimateDialog();
    onCancel?.();
  };
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) finishCancel();
  });
  overlay.querySelector("[data-credit-cancel]")?.addEventListener("click", finishCancel);
  const submit = overlay.querySelector("[data-credit-confirm]");
  submit?.addEventListener("click", async () => {
    if (!canAfford) return;
    submit.disabled = true;
    submit.textContent = "Reserving credits…";
    try {
      await onConfirm?.(estimate);
      closeCreditEstimateDialog();
    } catch (error) {
      submit.disabled = false;
      submit.textContent = confirmLabel;
      const message = error?.message || "Could not reserve credits.";
      overlay.querySelector(".synapse-confirmation-error")?.remove();
      overlay.querySelector(".synapse-confirmation-card")?.insertAdjacentHTML(
        "beforeend",
        `<p class="synapse-confirmation-error" role="alert">${escapeHTML(message)}</p>`
      );
    }
  });
  document.body.appendChild(overlay);
  window.setTimeout(() => (canAfford ? submit : overlay.querySelector("[data-credit-cancel]"))?.focus(), 0);
}

/**
 * Show estimate, reserve (spend) max charge, then run the action.
 * Refunds automatically if `actionFn` throws.
 */
async function withCreditReservation(actionId, actionFn, { confirmLabel, skipDialog = false } = {}) {
  const auth = window.SynapseAuth;
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
    if (typeof renderAccountMenu === "function") renderAccountMenu();
    try {
      return await actionFn?.(spend);
    } catch (error) {
      try {
        await auth.refundCredits({
          dailyUsed: spend.dailyUsed,
          boostUsed: spend.boostUsed,
          amount: spend.charged
        });
        if (typeof renderAccountMenu === "function") renderAccountMenu();
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

window.SynapseCredits = {
  creditActionForNoteLength,
  creditActionForTool,
  withCreditReservation,
  openCreditEstimateDialog,
  closeCreditEstimateDialog
};
