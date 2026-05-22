import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Package, BarChart3, Receipt, Settings, Menu, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "./Sidebar";
import { useLanguage } from "@/lib/LanguageContext";
import { useBackButton } from "@/hooks/useBackButton";

const BOTTOM_NAV = [
  { path: "/", icon: LayoutDashboard, label: "Home", tKey: "nav.dashboard" },
  { path: "/pos", icon: Zap, label: "POS", tKey: "nav.pos" },
  { path: "/invoices", icon: FileText, label: "Invoices", tKey: "nav.invoices" },
  { path: "/expenses", icon: Receipt, label: "Expenses", tKey: "nav.expenses" },
  { path: "/settings", icon: Settings, label: "Settings", tKey: "nav.settings" },
];

export default function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  useBackButton(() => setOpen(false), open);

  return (
    <>
      {/* Top bar for mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black gold-text">EasyBMT</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-accent transition-colors active:scale-95">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[260px] bg-sidebar border-r border-sidebar-border">
            <div className="h-full overflow-y-auto">
              <Sidebar mobile onClose={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Bottom navigation bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/97 backdrop-blur-xl border-t border-border safe-area-pb">
        <div className="flex items-stretch" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {BOTTOM_NAV.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[9px] font-bold transition-all duration-200 relative select-none",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full gold-gradient" />
                )}
                <div
                  className={cn(
                    "flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200",
                    isActive ? "bg-primary/15 scale-110" : "hover:bg-accent/50"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "")} />
                </div>
                <span className={cn("leading-none", isActive ? "text-primary" : "")}>{t(item.tKey)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}