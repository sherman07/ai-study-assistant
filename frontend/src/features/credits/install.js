/** Install window.SynapseCredits before the legacy controller loader runs. */
import {
  creditActionForNoteLength,
  creditActionForTool
} from "./creditActions.js";
import {
  closeCreditEstimateDialog,
  openCreditEstimateDialog,
  withCreditReservation
} from "./withCreditReservation.js";

export function installSynapseCredits(root = globalThis) {
  const windowObj = root.window || root;
  windowObj.SynapseCredits = {
    creditActionForNoteLength,
    creditActionForTool,
    withCreditReservation,
    openCreditEstimateDialog,
    closeCreditEstimateDialog
  };
  return windowObj.SynapseCredits;
}
