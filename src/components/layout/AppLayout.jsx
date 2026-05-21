import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import SubscriptionBanner from "@/components/subscription/SubscriptionBanner";
import GSTDeadlineBanner from "@/components/gst/GSTDeadlineBanner";
import OnboardingModal from "./OnboardingModal";
import InternalStaffChat from "./InternalStaffChat";

export default function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile top nav */}
      <MobileNav />

      {/* Main content */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden pt-[calc(64px+env(safe-area-inset-top,0px))] pb-[calc(80px+env(safe-area-inset-bottom,0px))] pl-[max(12px,env(safe-area-inset-left,12px))] pr-[max(12px,env(safe-area-inset-right,12px))] lg:p-6">
        <div className="max-w-7xl mx-auto space-y-3">
          <SubscriptionBanner />
          <GSTDeadlineBanner />
          <Outlet />
        </div>
      </main>
      <OnboardingModal />
      <InternalStaffChat />
    </div>
  );
}