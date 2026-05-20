import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import SubscriptionBanner from "@/components/subscription/SubscriptionBanner";
import GSTDeadlineBanner from "@/components/gst/GSTDeadlineBanner";
import OnboardingModal from "./OnboardingModal";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background flex-col">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <MobileNav />
        <main className="flex-1 min-w-0 lg:p-6 p-3 pt-[72px] pb-24 lg:pt-6 lg:pb-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-4">
            <SubscriptionBanner />
            <GSTDeadlineBanner />
            <Outlet />
          </div>
        </main>
      </div>
      <OnboardingModal />
    </div>
  );
}