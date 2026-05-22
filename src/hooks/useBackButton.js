import { useEffect, useRef } from "react";

// Global stack of active back-button interceptors
const backStack = [];
let isPopStateRegistered = false;
let programmaticPops = 0;

const handlePopState = (e) => {
  // If the pop was programmatic (triggered by manual overlay close), ignore it
  if (programmaticPops > 0) {
    programmaticPops--;
    return;
  }

  // Pop the top callback and execute it
  if (backStack.length > 0) {
    const item = backStack.pop();
    if (item && typeof item.callback === "function") {
      item.callback();
    }
  }
};

const registerPopState = () => {
  if (typeof window !== "undefined" && !isPopStateRegistered) {
    window.addEventListener("popstate", handlePopState);
    isPopStateRegistered = true;
  }
};

/**
 * Custom hook to bind an active state (like a modal open or tab change) to the browser back button.
 * @param {Function} callback - Function to run when the back button is clicked.
 * @param {boolean} active - Whether the interceptor is currently active.
 */
export function useBackButton(callback, active = false) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const initialPathnameRef = useRef(typeof window !== "undefined" ? window.location.pathname : "");

  useEffect(() => {
    if (!active) return;

    registerPopState();

    const item = { callback: () => callbackRef.current() };
    
    // Push dummy state to capture back button clicks
    window.history.pushState({ overlayOpen: true }, "");
    backStack.push(item);

    return () => {
      // Clean up when active becomes false or component unmounts
      const index = backStack.indexOf(item);
      if (index !== -1) {
        backStack.splice(index, 1);
        
        // Only trigger history back if we are still on the same route/pathname
        // (avoids history mismatch when unmounting due to route change)
        if (typeof window !== "undefined" && window.location.pathname === initialPathnameRef.current) {
          programmaticPops++;
          window.history.back();
        }
      }
    };
  }, [active]);
}
export default useBackButton;
