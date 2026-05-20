import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProtectedRoute from "@/components/ProtectedRoute";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

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
import Subscription from "@/pages/Subscription";
import Expenses from "@/pages/Expenses";
import Accounting from "@/pages/Accounting";
import Loans from "@/pages/Loans";
import GSTFiling from "@/pages/GSTFiling";
import POS from "@/pages/POS";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/gst-filing" element={<GSTFiling />} />
          <Route path="/subscription" element={<Subscription />} />
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
        <Toaster />
        <SonnerToaster
          position="bottom-center"
          duration={5000}
          toastOptions={{
            style: {
              background: "hsl(222, 40%, 7%)",
              border: "1px solid hsl(222, 25%, 18%)",
              color: "hsl(220, 30%, 93%)",
            },
          }}
        />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;