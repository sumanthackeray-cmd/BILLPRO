// This file is now a compatibility shim.
// The actual toast system is in @/lib/toast and @/components/ui/ToastContainer.
// Kept here so any stale imports don't break builds.
import { ToastContainer } from "@/components/ui/ToastContainer";

const Toaster = () => null; // No-op – ToastContainer is mounted in App.jsx

export { Toaster };
