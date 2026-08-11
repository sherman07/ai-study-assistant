import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useStudyFeedbackStore } from "../hooks/useStudyFeedbackStore.js";

const TOAST_ICONS = {
  error: AlertCircle,
  info: Info,
  success: CheckCircle2
};

function feedbackPresence(reducedMotion, offset = 10) {
  if (reducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.12 }
    };
  }
  return {
    initial: { opacity: 0, y: offset, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: Math.max(4, offset / 2), filter: "blur(3px)" },
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
  };
}

function StudyToast({ toast, onDismiss }) {
  const reducedMotion = useReducedMotion();
  const Icon = TOAST_ICONS[toast.tone] || Info;
  const duration = toast.tone === "error" ? 7000 : 4200;
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef(duration);
  const pauseReasonsRef = useRef(new Set());

  const startDismissTimer = useCallback(() => {
    globalThis.clearTimeout(timerRef.current);
    if (pauseReasonsRef.current.size || remainingRef.current <= 0) return;
    startedAtRef.current = Date.now();
    timerRef.current = globalThis.setTimeout(() => {
      timerRef.current = null;
      onDismiss(toast.id);
    }, remainingRef.current);
  }, [onDismiss, toast.id]);

  const pauseDismissTimer = useCallback(reason => {
    pauseReasonsRef.current.add(reason);
    if (timerRef.current === null) return;
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
    globalThis.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const resumeDismissTimer = useCallback(reason => {
    pauseReasonsRef.current.delete(reason);
    if (!pauseReasonsRef.current.size) startDismissTimer();
  }, [startDismissTimer]);

  useEffect(() => {
    remainingRef.current = duration;
    pauseReasonsRef.current.clear();
    startDismissTimer();
    return () => globalThis.clearTimeout(timerRef.current);
  }, [duration, startDismissTimer]);

  return (
    <motion.li
      className={`study-toast is-${toast.tone}`}
      role={toast.tone === "error" ? "alert" : "status"}
      layout={!reducedMotion}
      onPointerEnter={() => pauseDismissTimer("pointer")}
      onPointerLeave={() => resumeDismissTimer("pointer")}
      onFocusCapture={() => pauseDismissTimer("focus")}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) resumeDismissTimer("focus");
      }}
      {...feedbackPresence(reducedMotion, 14)}
    >
      <Icon className="study-toast-icon" size={18} aria-hidden="true" />
      <div className="study-toast-copy">
        <strong>{toast.title}</strong>
        {toast.message ? <span>{toast.message}</span> : null}
      </div>
      <button type="button" onClick={() => onDismiss(toast.id)} aria-label={`Dismiss ${toast.title}`}>
        <X size={16} aria-hidden="true" />
      </button>
    </motion.li>
  );
}

export function StudyToastViewport() {
  const toasts = useStudyFeedbackStore(state => state.toasts);
  const dismissToast = useStudyFeedbackStore(state => state.dismissToast);
  return (
    <ol className="study-toast-viewport" aria-label="Study notifications">
      <AnimatePresence initial={false}>
        {toasts.map(toast => (
          <StudyToast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </AnimatePresence>
    </ol>
  );
}
