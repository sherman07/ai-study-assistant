/* Thin shim — SynapseCredits is installed from features/credits via controller.js before the loader runs. */
(function ensureSynapseCreditsShim() {
  if (window.SynapseCredits?.withCreditReservation) return;
  console.warn("SynapseCredits missing; controller.js should call installSynapseCredits before loader.");
})();
