import { useState } from "react";
import { registerTenant } from "@/firebase/functions";

export function useTenant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentTenantId = localStorage.getItem("company_id");

  const switchTenant = (companyId) => {
    if (companyId) {
      localStorage.setItem("company_id", companyId.trim().toUpperCase());
      window.location.reload();
    } else {
      localStorage.removeItem("company_id");
      window.location.reload();
    }
  };

  const registerNewCompany = async (companyData) => {
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
