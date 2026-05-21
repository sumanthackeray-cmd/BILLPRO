const useLocalOverride = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("ENABLE_ACCOUNTING") === "true";
  } catch {
    return false;
  }
};

export const featureFlags = {
  ENABLE_ACCOUNTING: import.meta.env.VITE_ENABLE_ACCOUNTING === "true" || useLocalOverride(),
};
