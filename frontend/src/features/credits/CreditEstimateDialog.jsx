/**
 * React credit estimate dialog host.
 * Keeps the legacy dialog markup via openCreditEstimateDialog for identical UI.
 */
import { useEffect } from "react";
import { closeCreditEstimateDialog, openCreditEstimateDialog } from "./withCreditReservation.js";

export function CreditEstimateDialog({ estimate, confirmLabel, onConfirm, onCancel, open }) {
  useEffect(() => {
    if (!open || !estimate) {
      closeCreditEstimateDialog();
      return undefined;
    }
    openCreditEstimateDialog(estimate, { confirmLabel, onConfirm, onCancel });
    return () => closeCreditEstimateDialog();
  }, [open, estimate, confirmLabel, onConfirm, onCancel]);

  return null;
}

export default CreditEstimateDialog;
