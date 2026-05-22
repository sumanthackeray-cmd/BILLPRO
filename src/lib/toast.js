/**
 * EasyBMT — Custom Toast Notification System
 * Drop-in replacement for sonner's toast API.
 * Renders via ToastContainer (place in App.jsx).
 * 
 * Usage:
 *   import { toast } from "@/lib/toast"
 *   toast.success("Saved!")
 *   toast.error("Failed!")
 *   toast.info("Note")
 *   toast.warning("Watch out")
 *   showToast("message", "success")
 */

let _dispatch = null;

/** Called internally by ToastContainer to register itself */
export function _registerToastDispatch(fn) {
  _dispatch = fn;
}

let _idCounter = 0;

function addToast(message, type = "info", options = {}) {
  if (!_dispatch) {
    // Fallback — console only
    console.warn(`[Toast] ${type}: ${message}`);
    return;
  }
  const id = options.id ?? ++_idCounter;
  _dispatch({ 
    action: "add", 
    toast: { 
      id, 
      message: String(message), 
      type, 
      duration: options.duration ?? (type === "loading" ? 99999 : 4000) 
    } 
  });
  return id;
}

function dismissToast(id) {
  if (_dispatch) _dispatch({ action: "dismiss", id });
}

// ── Main API ──────────────────────────────────────────────────────────────────

/** Global showToast(message, type) utility as requested */
export function showToast(message, type = "info") {
  return addToast(message, type);
}

/** Sonner-compatible toast object */
export const toast = {
  success: (msg, opts) => addToast(msg, "success", opts || {}),
  error:   (msg, opts) => addToast(msg, "error",   opts || {}),
  info:    (msg, opts) => addToast(msg, "info",     opts || {}),
  warning: (msg, opts) => addToast(msg, "warning",  opts || {}),
  warn:    (msg, opts) => addToast(msg, "warning",  opts || {}),
  loading: (msg, opts) => addToast(msg, "loading",  opts || {}),
  dismiss: (id) => dismissToast(id),

  /** Minimal promise helper — shows loading → success/error */
  promise: (promise, messages = {}) => {
    const id = addToast(messages.loading || "Loading...", "loading", { duration: 99999 });
    promise
      .then((result) => {
        const msg = typeof messages.success === "function" ? messages.success(result) : (messages.success || "Done!");
        addToast(msg, "success", { id });
      })
      .catch((err) => {
        const msg = typeof messages.error === "function" ? messages.error(err) : (messages.error || "Error!");
        addToast(msg, "error", { id });
      });
    return promise;
  },
};

export default toast;

