import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { usePermission } from "@/hooks/usePermission";
import { 
  BarChart2, 
  Sliders, 
  Calendar, 
  Clock, 
  Award, 
  Zap, 
  Target,
  Lock
} from "lucide-react";
import Unauthorized from "@/pages/Unauthorized";
import ResponsiveTabs from "@/components/ui/ResponsiveTabs";

// Import Refactored Components
import OverviewTab from "@/components/reports/OverviewTab";
import ReportBuilderTab from "@/components/reports/ReportBuilderTab";
import ScheduledReportsTab from "@/components/reports/ScheduledReportsTab";
import ShiftReportsTab from "@/components/reports/ShiftReportsTab";
import CashierBoardTab from "@/components/reports/CashierBoardTab";
import PeakHoursTab from "@/components/reports/PeakHoursTab";
import ForecastTab from "@/components/reports/ForecastTab";

const TABS = [
  { id: "overview", label: "📊 Overview", icon: BarChart2, tKey: "reports.overview", perm: null },
  { id: "builder", label: "🛠️ BI Report Builder", icon: Sliders, tKey: "reports.bi_builder", perm: "export" },
  { id: "schedule", label: "📅 Scheduled Reports", icon: Calendar, tKey: "reports.schedule", perm: "export" },
  { id: "shifts", label: "🕐 Shift Reports", icon: Clock, tKey: "reports.shift_reports", perm: null },
  { id: "cashiers", label: "🏆 Cashier Board", icon: Award, tKey: "reports.cashier_board", perm: null },
  { id: "hours", label: "⏰ Peak Hours", icon: Zap, tKey: "reports.peak_hours", perm: null },
  { id: "forecast", label: "🤖 AI Forecast", icon: Target, tKey: "reports.ai_forecast", perm: "export" },
];

export default function Reports() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Permission Guards
  const hasReportsView = usePermission("reports", "view");
  const hasReportsExport = usePermission("reports", "export");

  // Block entire page if user has no reports:view
  if (!hasReportsView) {
    return <Unauthorized requiredRole="Reports Access" />;
  }

  const handleTabClick = (tab) => {
    if (tab.perm === "export" && !hasReportsExport) {
      return; // Don't switch to locked tabs
    }
    setActiveTab(tab.id);
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-xl font-black">{t("reports.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
      </div>

      <ResponsiveTabs 
        activeTab={activeTab} 
        setActiveTab={(tabId) => {
          const tab = TABS.find(t => t.id === tabId);
          if (tab) handleTabClick(tab);
        }} 
        containerClassName="bg-card/50"
        tabs={TABS.map(tab => {
          const Icon = tab.icon;
          const isLocked = tab.perm === "export" && !hasReportsExport;
          return {
            id: tab.id,
            label: t(tab.tKey) || tab.label,
            icon: isLocked ? <Lock className="w-3.5 h-3.5" /> : <Icon className="w-4 h-4" />,
            disabled: isLocked,
            title: isLocked ? "Upgrade your plan or request permission to access this feature" : ""
          };
        })}
      />

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "builder" && hasReportsExport && <ReportBuilderTab />}
      {activeTab === "schedule" && hasReportsExport && <ScheduledReportsTab />}
      {activeTab === "shifts" && <ShiftReportsTab />}
      {activeTab === "cashiers" && <CashierBoardTab />}
      {activeTab === "hours" && <PeakHoursTab />}
      {activeTab === "forecast" && hasReportsExport && <ForecastTab />}
    </div>
  );
}