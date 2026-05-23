import { lazy, Suspense, useEffect } from "react";
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
import AppInstallPrompt from "@/components/AppInstallPrompt";

// Critical / Initial Routes
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";
import AppLayout from "@/components/layout/AppLayout";
import OnboardingWizard from "@/modules/registration/OnboardingWizard";

// Lazy Loaded Routes (Code Split for sub-100ms loading)
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const Purchases = lazy(() => import("@/pages/Purchases"));
const Waybills = lazy(() => import("@/pages/Waybills"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Customers = lazy(() => import("@/pages/Customers"));
const Barcode = lazy(() => import("@/pages/Barcode"));
const Reports = lazy(() => import("@/pages/Reports"));
const AIInsights = lazy(() => import("@/pages/AllInsights"));
const Settings = lazy(() => import("@/pages/Settings"));
const UsersSettings = lazy(() => import("@/pages/settings/Users"));
const PermissionsSettings = lazy(() => import("@/pages/settings/Permissions"));
const Subscription = lazy(() => import("@/pages/Subscription"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Accounting = lazy(() => import("@/pages/Accounting"));
const Loans = lazy(() => import("@/pages/Loans"));
const GSTFiling = lazy(() => import("@/pages/GSTFiling"));
const POS = lazy(() => import("@/pages/POS"));
const BranchManagement = lazy(() => import("@/pages/BranchManagement"));
const Alterations = lazy(() => import("@/pages/Alterations"));
const CustomerStyleProfiles = lazy(() => import("@/pages/CustomerStyleProfiles"));
const InventorySync = lazy(() => import("@/pages/InventorySync"));
const StockTransfer = lazy(() => import("@/pages/StockTransfer"));
const WarehouseManagement = lazy(() => import("@/pages/WarehouseManagement"));
const HRMS = lazy(() => import("@/pages/HRMS"));
const EnterpriseIntelligence = lazy(() => import("@/pages/EnterpriseIntelligence"));
const FinanceModule = lazy(() => import("@/modules/accounting/FinanceModule"));
const AuditLogPage = lazy(() => import("@/modules/audit/AuditLogPage"));
const CounterManagement = lazy(() => import("@/modules/supermarket/CounterManagement"));
const PriceEngineDashboard = lazy(() => import("@/modules/supermarket/PriceEngine.jsx"));
const LoyaltyProgram = lazy(() => import("@/modules/supermarket/LoyaltyProgram"));
const ExpiryManager = lazy(() => import("@/modules/supermarket/ExpiryManager"));
const DepartmentReports = lazy(() => import("@/modules/supermarket/reports/DepartmentReports"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

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
          <span className="text-xl font-black gold-text">EasyBMT</span>
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
    <Suspense fallback={<LoadingFallback />}>
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
            <Route path="/hrms" element={<HRMS />} />
            <Route path="/alterations" element={<Alterations />} />
            <Route path="/profiles" element={<CustomerStyleProfiles />} />

            {/* Supermarket Module Routes */}
            <Route path="/supermarket/counters" element={<CounterManagement />} />
            <Route path="/supermarket/offers" element={<PriceEngineDashboard />} />
            <Route path="/supermarket/loyalty" element={<LoyaltyProgram />} />
            <Route path="/supermarket/expiry" element={<ExpiryManager />} />
            <Route path="/supermarket/reports" element={<DepartmentReports />} />

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
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthenticatedApp />
        </Router>
        <AppInstallPrompt />
        <ToastContainer />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;