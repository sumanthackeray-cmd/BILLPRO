import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { ToastContainer } from "@/components/ui/ToastContainer";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProtectedRoute from "@/components/ProtectedRoute";
import { base44 } from "@/api/base44Client";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";

import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Invoices from "@/pages/Invoices";
import Purchases from "@/pages/Purchases";
import Waybills from "@/pages/Waybills";
import Inventory from "@/pages/Inventory";
import Customers from "@/pages/Customers";
import Barcode from "@/pages/Barcode";
import Reports from "@/pages/Reports";
import AIInsights from "@/pages/AllInsights";
import Settings from "@/pages/Settings";
import UsersSettings from "@/pages/settings/Users";
import PermissionsSettings from "@/pages/settings/Permissions";
import Subscription from "@/pages/Subscription";
import Expenses from "@/pages/Expenses";
import Accounting from "@/pages/Accounting";
import Loans from "@/pages/Loans";
import GSTFiling from "@/pages/GSTFiling";
import POS from "@/pages/POS";
import BranchManagement from "@/pages/BranchManagement";
import InventorySync from "@/pages/InventorySync";
import StockTransfer from "@/pages/StockTransfer";
import WarehouseManagement from "@/pages/WarehouseManagement";

import EnterpriseIntelligence from "@/pages/EnterpriseIntelligence";
import FinanceModule from "@/modules/accounting/FinanceModule";
import AuditLogPage from "@/modules/audit/AuditLogPage";
import OnboardingWizard from "@/modules/registration/OnboardingWizard";

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  useEffect(() => {
    if (user) {
      // Warm up the React Query cache immediately on login for sub-second rendering
      const queries = [
        { key: ["shopSettings"], fn: () => base44.entities.ShopSettings.list() },
        { key: ["invoices"], fn: () => base44.entities.Invoice.list("-created_date", 500) },
        { key: ["customers"], fn: () => base44.entities.Customer.list() },
        { key: ["products"], fn: () => base44.entities.Product.list() },
        { key: ["purchases"], fn: () => base44.entities.Purchase.list("-created_date", 200) },
        { key: ["expenses"], fn: () => base44.entities.Expense.list("-created_date", 200) },
        { key: ["loans"], fn: () => base44.entities.Loan.list() }
      ];
      
      queries.forEach(q => {
        queryClientInstance.prefetchQuery({
          queryKey: q.key,
          queryFn: q.fn,
          staleTime: 5 * 60 * 1000 // Cache is fresh for 5 mins
        });
      });
    }
  }, [user]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xl font-black gold-text">GSTBill Pro</span>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/onboarding" element={<OnboardingWizard />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/pos" element={<POS />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/waybills" element={<Waybills />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/barcode" element={<Barcode />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/users" element={<UsersSettings />} />
          <Route path="/settings/permissions" element={<PermissionsSettings />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/gst-filing" element={<GSTFiling />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/branches" element={<BranchManagement />} />
          <Route path="/inventory-sync" element={<InventorySync />} />
          <Route path="/stock-transfer" element={<StockTransfer />} />
          <Route path="/warehouse" element={<WarehouseManagement />} />

          <Route path="/enterprise-intel" element={<EnterpriseIntelligence />} />
          <Route path="/finance" element={<FinanceModule />} />
          <Route path="/audit-logs" element={
            user?.role === "owner" || user?.role === "ceo" || user?.role === "ca" 
              ? <AuditLogPage /> 
              : <Navigate to="/unauthorized" replace />
          } />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <ToastContainer />

      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;