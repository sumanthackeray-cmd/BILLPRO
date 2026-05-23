import { useState, useEffect } from "react";

import { registerTenant } from "@/firebase/functions";

export function useTenant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTenantId, setCurrentTenantId] = useState(() => localStorage.getItem("company_id"));

  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentTenantId(localStorage.getItem("company_id"));
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("tenantChanged", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("tenantChanged", handleStorageChange);
    };
  }, []);

  const switchTenant = (companyId) => {
    if (companyId) {
      const formatted = companyId.trim().toUpperCase();
      localStorage.setItem("company_id", formatted);
      setCurrentTenantId(formatted);
      window.dispatchEvent(new CustomEvent("tenantChanged", { detail: formatted }));
      // Optional: keep reload as a fallback to clear cache safely, but allow reactive updates first
      setTimeout(() => window.location.reload(), 100);
    } else {
      localStorage.removeItem("company_id");
      setCurrentTenantId(null);
      window.dispatchEvent(new CustomEvent("tenantChanged", { detail: null }));
      setTimeout(() => window.location.reload(), 100);
    }
  };

  const registerNewCompany = async (companyData) => {
    // @ts-ignore - JS hook used in TS-checked project

    setLoading(true);
    setError(null);
    try {
      const response = await registerTenant(companyData);
      return response;
    } catch (err) {
      setError(err.message || "Failed to register company.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    currentTenantId,
    switchTenant,
    registerNewCompany,
    loading,
    error
  };
}
