import { create } from "zustand";
import { normalizeStudyToast, reduceStudyToasts } from "../studyFeedback.js";

export const useStudyFeedbackStore = create(set => ({
  toasts: [],
  pushToast(input) {
    const toast = normalizeStudyToast(input);
    if (!toast) return;
    set(state => ({
      toasts: reduceStudyToasts(state.toasts, { type: "push", toast })
    }));
  },
  dismissToast(id) {
    set(state => ({
      toasts: reduceStudyToasts(state.toasts, { type: "dismiss", id })
    }));
  }
}));
