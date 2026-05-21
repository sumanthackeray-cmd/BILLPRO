import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function DashboardShell({ children, startDate, endDate, onDateChange }) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const firstName = (user?.full_name || "User").split(" ")[0];

  return (
    <div className="animate-fade-up space-y-4">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-foreground">
            {t("greeting.namaste") || "Namaste"}, <span className="text-amber-600 dark:text-primary">{firstName}</span> 🙏
          </h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={onDateChange}
          />
          <Link to="/invoices">
            <Button className="gold-gradient text-black font-bold gap-2 text-sm h-9">
              <Plus className="w-4 h-4" /> {language === "hi" ? "नया बिल बनाएँ" : "New Invoice"}
            </Button>
          </Link>
        </div>
      </div>
      
      {children}
    </div>
  );
}
