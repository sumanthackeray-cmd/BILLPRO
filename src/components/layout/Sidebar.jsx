import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, FileText, ShoppingCart, Truck, Package,
  Users, BarChart3, Settings, Sparkles, ScanBarcode, LogOut, Crown,
  Receipt, BookOpen, Landmark, Building2, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/lib/LanguageContext";

const NAV_ITEMS = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard", tKey: "nav.dashboard" },
  { path: "/pos", icon: Zap, label: "Quick POS", badge: "FAST", tKey: "nav.pos" },
  { path: "/invoices", icon: FileText, label: "Invoices", tKey: "nav.invoices" },
  { path: "/purchases", icon: ShoppingCart, label: "Purchases", tKey: "nav.purchases" },
  { path: "/waybills", icon: Truck, label: "E-Waybills", tKey: "nav.waybills" },
  { path: "/inventory", icon: Package, label: "Inventory", tKey: "nav.inventory" },
  { path: "/customers", icon: Users, label: "Customers", tKey: "nav.customers" },
  { path: "/expenses", icon: Receipt, label: "Expenses", tKey: "nav.expenses" },
  { path: "/accounting", icon: BookOpen, label: "Accounting", tKey: "nav.accounting" },
  { path: "/loans", icon: Landmark, label: "Loans", tKey: "nav.loans" },
  { path: "/barcode", icon: ScanBarcode, label: "Barcode", tKey: "nav.barcode" },
  { path: "/gst-filing", icon: Building2, label: "GST Filing", badge: "NEW", tKey: "nav.gstfiling" },
  { path: "/reports", icon: BarChart3, label: "Reports", tKey: "nav.reports" },
  { path: "/ai-insights", icon: Sparkles, label: "AI Insights", badge: "AI", tKey: "nav.aiinsights" },
  { path: "/settings", icon: Settings, label: "Settings", tKey: "nav.settings" },
  { path: "/subscription", icon: Crown, label: "Upgrade", badge: "PRO", isPro: true, tKey: "nav.upgrade" },
];

export default function Sidebar({ mobile = false, onClose }) {
  const location = useLocation();
  const { user } = useAuth();
  const { language, setLanguage, voiceEnabled, setVoiceEnabled, t, speak } = useLanguage();

  const handleNavClick = () => {
    if (mobile && onClose) onClose();
  };

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar border-r border-sidebar-border shrink-0",
      mobile ? "w-full h-full" : "hidden lg:flex w-[220px] h-screen sticky top-0"
    )}>
      {/* Logo */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl font-black gold-text">GSTBill</span>
          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">PRO</span>
        </div>
        <p className="text-[11px] text-muted-foreground font-medium truncate">
          {user?.full_name || "My Business"}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                item.isPro
                  ? "bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 mt-1"
                  : isActive
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", isActive || item.isPro ? "text-primary" : item.badge && !item.isPro ? "text-purple" : "")} />
              <span>{t(item.tKey)}</span>
              {item.badge && (
                <span className={cn("ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded-full",
                  item.isPro ? "gold-gradient text-black" :
                    item.badge === "NEW" ? "bg-emerald-500 text-white" :
                      "bg-purple text-white"
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Language & Voice Assistant Controls */}
      <div className="px-3 py-2 border-t border-sidebar-border flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-secondary/35 rounded-lg p-0.5 border border-border/40">
          <button
            onClick={() => {
              setLanguage("en");
              setTimeout(() => speak("voice.welcome"), 50);
            }}
            className={cn(
              "px-2 py-1 text-[10px] font-bold rounded-md transition-colors",
              language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            EN
          </button>
          <button
            onClick={() => {
              setLanguage("hi");
              setTimeout(() => speak("voice.welcome"), 50);
            }}
            className={cn(
              "px-2 py-1 text-[10px] font-bold rounded-md transition-colors",
              language === "hi" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            हिंदी
          </button>
        </div>
        <button
          onClick={() => {
            const nextVoice = !voiceEnabled;
            setVoiceEnabled(nextVoice);
            if (nextVoice) {
              setTimeout(() => speak(language === "hi" ? "आवाज़ गाइडेंस चालू है।" : "Voice assistant enabled.", true), 50);
            }
          }}
          className={cn(
            "p-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-center transition-all duration-200 shrink-0",
            voiceEnabled 
              ? "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20" 
              : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
          )}
          title={voiceEnabled ? "Mute Voice Guidance" : "Unmute Voice Guidance"}
        >
          {voiceEnabled ? "🔈 Voice ON" : "🔇 Voice OFF"}
        </button>
      </div>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50">
          <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-[13px] font-bold text-black shrink-0">
            {(user?.full_name || "U")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold truncate">{user?.full_name || "User"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <ThemeToggle />
          <button
            onClick={() => base44.auth.logout()}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title={t("nav.logout")}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}