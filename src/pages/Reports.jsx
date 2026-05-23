import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
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

      <div className="bg-card/50 backdrop-blur border border-border/50 rounded-xl p-1 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-max">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isLocked = tab.perm === "export" && !hasReportsExport;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                disabled={isLocked}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all duration-200",
                  isLocked
                    ? "text-muted-foreground/40 cursor-not-allowed opacity-50"
                    : activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                )}
                title={isLocked ? "Upgrade your plan or request permission to access this feature" : ""}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Icon className="w-4 h-4" />}
                <span>{t(tab.tKey) || tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "builder" && <ReportBuilderTab />}
      {activeTab === "schedule" && <ScheduledReportsTab />}
      {activeTab === "shifts" && <ShiftReportsTab />}
      {activeTab === "cashiers" && <CashierBoardTab />}
      {activeTab === "hours" && <PeakHoursTab />}
      {activeTab === "forecast" && <ForecastTab />}
    </div>
  );
}