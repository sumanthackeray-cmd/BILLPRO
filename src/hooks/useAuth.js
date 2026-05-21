import { useAuth as useCtxAuth } from "@/lib/AuthContext";

export function useAuth() {
  const context = useCtxAuth();
  
  const companyId = context.user?.company_id || localStorage.getItem("company_id");
  const userCode = context.user?.user_code || localStorage.getItem("user_code");
  const role = context.user?.role || "cashier";
  const isActive = context.user?.is_active ?? false;
  
  return {
    ...context,
    companyId,
    userCode,
    role,
    isActive
  };
}
