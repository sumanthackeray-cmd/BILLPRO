import React, { Suspense, useState, useEffect } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useDashboardData } from "@/hooks/useDashboardData";
import ProfileCompletionBanner from '../modules/registration/ProfileCompletionBanner';

import { useSupermarketMode } from "@/hooks/useSupermarketMode";
import SupermarketDashboard from "@/pages/SupermarketDashboard";

const GeneralDashboard = React.lazy(() => import("@/components/dashboards/GeneralDashboard"));
const GroceryDashboard = React.lazy(() => import("@/components/dashboards/GroceryDashboard"));
const MedicalDashboard = React.lazy(() => import("@/components/dashboards/MedicalDashboard"));
const RestaurantDashboard = React.lazy(() => import("@/components/dashboards/RestaurantDashboard"));
const FashionDashboard = React.lazy(() => import("@/components/dashboards/FashionDashboard"));
const ElectronicsDashboard = React.lazy(() => import("@/components/dashboards/ElectronicsDashboard"));
const HardwareDashboard = React.lazy(() => import("@/components/dashboards/HardwareDashboard"));
const JewelleryDashboard = React.lazy(() => import("@/components/dashboards/JewelleryDashboard"));
const BakeryDashboard = React.lazy(() => import("@/components/dashboards/BakeryDashboard"));
const WholesalerDashboard = React.lazy(() => import("@/components/dashboards/WholesalerDashboard"));

export default function DashboardRouter() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const dashboardData = useDashboardData(startDate, endDate);
  const { businessType, refetchAll } = dashboardData;
  const { isSupermarket } = useSupermarketMode();

  useEffect(() => {
    refetchAll();
  }, [startDate, endDate]);

  const renderDashboard = () => {
    if (isSupermarket) {
      return <SupermarketDashboard data={dashboardData} />;
    }
    switch (businessType) {
      case "grocery": return <GroceryDashboard data={dashboardData} />;
      case "medical": return <MedicalDashboard data={dashboardData} />;
      case "restaurant": return <RestaurantDashboard data={dashboardData} />;
      case "fashion": return <FashionDashboard data={dashboardData} />;
      case "electronics": return <ElectronicsDashboard data={dashboardData} />;
      case "hardware": return <HardwareDashboard data={dashboardData} />;
      case "jewellery": return <JewelleryDashboard data={dashboardData} />;
      case "bakery": return <BakeryDashboard data={dashboardData} />;
      case "wholesaler":
      case "manufacturer":
      case "supermarket":
      case "importer_exporter": return <WholesalerDashboard data={dashboardData} />;
      default: return <GeneralDashboard data={dashboardData} />;
    }
  };

  return (
    <DashboardShell startDate={startDate} endDate={endDate} onDateChange={(s, e) => { setStartDate(s); setEndDate(e); }}>
      <div className="space-y-6">
        <ProfileCompletionBanner />
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse font-semibold">Loading Smart Dashboard Experience...</div>}>
          {renderDashboard()}
        </Suspense>
      </div>
    </DashboardShell>
  );
}