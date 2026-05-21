import { useEffect, useReducer, useRef, useCallback } from "react";
import { _registerToastDispatch } from "@/lib/toast";
import { cn } from "@/lib/utils";

/* ── Variant config ────────────────────────────────────────────────────── */
const VARIANTS = {
  success: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    progressBar: "bg-emerald-500",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    border: "border-l-red-500",
    iconBg: "bg-red-100 dark:bg-red-500/15",
    iconColor: "text-red-600 dark:text-red-400",
    progressBar: "bg-red-500",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-100 dark:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    progressBar: "bg-amber-500",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    border: "border-l-blue-500",
    iconBg: "bg-blue-100 dark:bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
    progressBar: "bg-blue-500",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
      </svg>
    ),
  },
  loading: {
    border: "border-l-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-500 dark:text-blue-400",
    progressBar: "bg-blue-500",
    icon: (
      <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ),
  },
};

/* ── Reducer ───────────────────────────────────────────────────────────── */
function reducer(state, { action, toast, id }) {
  switch (action) {
    case "add": {
      const exists = state.some((t) => t.id === toast.id);
      if (exists) {
        return state.map((t) => (t.id === toast.id ? { ...t, ...toast, visible: true } : t));
      }
      return [{ ...toast, visible: true }, ...state].slice(0, 5); // max 5 stacked
    }
    case "dismiss":
      return state.map((t) => (t.id === id ? { ...t, visible: false } : t));
    case "remove":
      return state.filter((t) => t.id !== id);
    default:
      return state;
  }
}

/* ── Single Toast item ─────────────────────────────────────────────────── */
function ToastItem({ toast: t, onDismiss }) {
  const v = VARIANTS[t.type] || VARIANTS.info;
  const progressRef = useRef(null);
  const timerRef = useRef(null);
  const startRef = useRef(null);

  // Animate progress bar and auto-dismiss
  useEffect(() => {
    if (!t.visible || t.duration >= 99999) return;
    startRef.current = performance.now();

    const tick = () => {
      if (!progressRef.current) return;
      const elapsed = performance.now() - startRef.current;
      const pct = Math.min(100, (elapsed / t.duration) * 100);
      progressRef.current.style.transform = `scaleX(${1 - pct / 100})`;

      if (pct < 100) {
        timerRef.current = requestAnimationFrame(tick);
      } else {
        onDismiss(t.id);
      }
    };

    timerRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timerRef.current);
  }, [t.id, t.duration, t.visible, t.type, t.message, onDismiss]);


  if (!t.visible) return null;

  return (
    <div
      className={cn(
        // Layout
        "relative flex items-start gap-3 w-full max-w-sm min-w-[300px] p-4 pr-8 rounded-xl shadow-lg",
        // Background
        "bg-white dark:bg-slate-900",
        // Border
        "border border-slate-100 dark:border-slate-800 border-l-4",
        v.border,
        // Entry animation
        "animate-toast-in",
        // Hover stops the progress
        "group"
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className={cn("flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center", v.iconBg, v.iconColor)}>
        {v.icon}
      </div>

      {/* Message */}
      <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug break-words pr-1">
        {t.message}
      </p>

      {/* Close button */}
      <button
        onClick={() => onDismiss(t.id)}
        aria-label="Dismiss notification"
        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>

      {/* Progress bar */}
      {t.duration < 99999 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden rounded-b-xl">
          <div
            ref={progressRef}
            className={cn("h-full w-full origin-left transition-none", v.progressBar)}
            style={{ transform: "scaleX(1)" }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Toast Container (mount once in App.jsx) ───────────────────────────── */
export function ToastContainer() {
  const [toasts, dispatch] = useReducer(reducer, []);

  const handleDispatch = useCallback(({ action, toast, id }) => {
    dispatch({ action, toast, id });
  }, []);

  useEffect(() => {
    _registerToastDispatch(handleDispatch);
    return () => _registerToastDispatch(null);
  }, [handleDispatch]);

  const dismiss = useCallback((id) => {
    // Animate out then remove
    dispatch({ action: "dismiss", id });
    setTimeout(() => dispatch({ action: "remove", id }), 350);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full">
          <ToastItem toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
