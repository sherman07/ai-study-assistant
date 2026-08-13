/** Credit estimate confirmation dialog (same markup as legacy credits gate). */
import { escapeHTML } from "../../shared/lib/html.js";
import { formatCreditNumber } from "./creditActions.js";

export function closeCreditEstimateDialog(root = globalThis.document) {
  root.querySelector?.(".synapse-credit-estimate-overlay")?.remove();
}

export function openCreditEstimateDialog(estimate, { confirmLabel = "Continue generation", onConfirm, onCancel } = {}, root = globalThis.document) {
  closeCreditEstimateDialog(root);
  const action = estimate?.action || {};
  const range = estimate?.estimate?.expectedRange || {};
  const maxCharge = estimate?.estimate?.maximumCharge || 0;
  const balance = estimate?.credits || estimate?.balance || {};
  const willUse = estimate?.willUse || {};
  const lower = estimate?.lowerCostOption || null;
  const canAfford = estimate?.canAfford !== false && !estimate?.blockedReason;

  const overlay = root.createElement("div");
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
    closeCreditEstimateDialog(root);
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
      closeCreditEstimateDialog(root);
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
  root.body.appendChild(overlay);
  globalThis.setTimeout?.(() => (canAfford ? submit : overlay.querySelector("[data-credit-cancel]"))?.focus(), 0);
}
