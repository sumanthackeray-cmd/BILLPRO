import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, FileText, ShoppingCart, Truck, Package,
  Users, BarChart3, Settings, Sparkles, ScanBarcode, LogOut, Crown,
  Receipt, BookOpen, Landmark, Building2, Zap, GitBranch, RefreshCw, Warehouse, TrendingUp, Shield, Scissors,
  Monitor, Tag, Award, Calendar, Search
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useFashionMode } from "@/hooks/useFashionMode";
import { useSupermarketMode } from "@/hooks/useSupermarketMode";
import { useShopSettings } from "@/hooks/useShopSettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/lib/LanguageContext";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllBranches, getCachedBranches, createBranch } from "@/api/branchService";

const NAV_ITEMS = [
  // 🏠 Core
  { path: "/", icon: LayoutDashboard, label: "Dashboard", tKey: "nav.dashboard" },
  { path: "/pos", icon: Zap, label: "Quick POS", badge: "FAST", tKey: "nav.pos" },
  
  // 🛒 Sales & Customers
  { path: "/customers", icon: Users, label: "Customers", tKey: "nav.customers" },
  { path: "/invoices", icon: FileText, label: "Invoices", tKey: "nav.invoices" },
  { path: "/waybills", icon: Truck, label: "E-Waybills", tKey: "nav.waybills" },
  
  // 🏭 Purchase & Inventory
  { path: "/purchases", icon: ShoppingCart, label: "Purchases", tKey: "nav.purchases" },
  { path: "/inventory", icon: Package, label: "Inventory", tKey: "nav.inventory" },
  { path: "/stock-transfer", icon: Truck, label: "Stock Transfer", tKey: "nav.stocktransfer" },
  { path: "/warehouse", icon: Warehouse, label: "Warehouse Hub", badge: "SAP", tKey: "nav.warehouse" },
  { path: "/inventory-sync", icon: RefreshCw, label: "Inventory Sync", badge: "LIVE", tKey: "nav.invsync" },
  { path: "/barcode", icon: ScanBarcode, label: "Barcode", tKey: "nav.barcode" },
  
  // 💰 Finance & Accounting
  { path: "/accounting", icon: BookOpen, label: "Accounting", tKey: "nav.accounting" },
  { path: "/expenses", icon: Receipt, label: "Expenses", tKey: "nav.expenses" },
  { path: "/loans", icon: Landmark, label: "Loans", tKey: "nav.loans" },
  { path: "/finance", icon: Landmark, label: "Finance Hub", badge: "ERP", tKey: "nav.finance" },
  { path: "/gst-filing", icon: Building2, label: "GST Filing", badge: "NEW", tKey: "nav.gstfiling" },
  
  // 👥 HR & Workforce
  { path: "/hrms", icon: Users, label: "HRMS & Payroll", badge: "SAP", tKey: "nav.hrms" },
  
  // 📊 Analytics & Admin
  { path: "/reports", icon: BarChart3, label: "Reports", tKey: "nav.reports" },
  { path: "/branches", icon: GitBranch, label: "Branches", tKey: "nav.branches" },
  { path: "/enterprise-intel", icon: TrendingUp, label: "Enterprise Intel", badge: "AI", tKey: "nav.enterprise_intel" },
  { path: "/ai-insights", icon: Sparkles, label: "AI Insights", badge: "AI", tKey: "nav.aiinsights" },
  { path: "/audit-logs", icon: Shield, label: "Audit Logs", tKey: "nav.auditLogs" },
  
  // ⚙️ System
  { path: "/settings", icon: Settings, label: "Settings", tKey: "nav.settings" },
  { path: "/subscription", icon: Crown, label: "Upgrade", badge: "PRO", isPro: true, tKey: "nav.upgrade" },
];

export default function Sidebar({ mobile = false, onClose }) {
  const location = useLocation();
  const { user } = useAuth();
  const { language, setLanguage, voiceEnabled, setVoiceEnabled, t, speak } = useLanguage();

  // Load branches from cache instantly, refresh from Firestore in background
  const [branches, setBranches] = useState(() => getCachedBranches());
  const [activeBranchId, setActiveBranchId] = useState(localStorage.getItem('selectedBranch') || '');
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch shop settings
  const { shopSettings } = useShopSettings();

  const { isFashion } = useFashionMode();
  const { isSupermarket } = useSupermarketMode();

  const activeNavItems = useMemo(() => {
    if (isFashion) {
      return [
        { path: "/", icon: LayoutDashboard, label: "Dashboard", tKey: "nav.dashboard" },
        { path: "/pos", icon: Zap, label: "Fashion POS", badge: "FAST", tKey: "nav.pos" },
        { path: "/invoices", icon: FileText, label: "Invoices", tKey: "nav.invoices" },
        { path: "/profiles", icon: Users, label: "Style Profiles", badge: "CRM", tKey: "nav.profiles" },
        { path: "/alterations", icon: Scissors, label: "Alterations", badge: "LIVE", tKey: "nav.alterations" },
        { path: "/inventory", icon: Package, label: "Inventory", tKey: "nav.inventory" },
        { path: "/purchases", icon: ShoppingCart, label: "Purchases", tKey: "nav.purchases" },
        { path: "/reports", icon: BarChart3, label: "Reports", tKey: "nav.reports" },
        { path: "/settings", icon: Settings, label: "Settings", tKey: "nav.settings" },
        { path: "/subscription", icon: Crown, label: "Upgrade", badge: "PRO", isPro: true, tKey: "nav.upgrade" },
      ];
    }
    if (isSupermarket) {
      return [
        { path: "/", icon: LayoutDashboard, label: "Dashboard", tKey: "nav.dashboard" },
        { path: "/pos", icon: Zap, label: "Supermarket POS", badge: "FAST", tKey: "nav.pos" },
        { path: "/supermarket/counters", icon: Monitor, label: "Counter Mgmt", badge: "LIVE", tKey: "nav.supermarket_counters" },
        { path: "/supermarket/offers", icon: Tag, label: "Offers Engine", badge: "PROMO", tKey: "nav.supermarket_offers" },
        { path: "/supermarket/loyalty", icon: Award, label: "Loyalty Program", badge: "CRM", tKey: "nav.supermarket_loyalty" },
        { path: "/supermarket/expiry", icon: Calendar, label: "Expiry Mgmt", badge: "FEFO", tKey: "nav.supermarket_expiry" },
        { path: "/supermarket/reports", icon: BarChart3, label: "Dept Reports", badge: "P&L", tKey: "nav.supermarket_reports" },
        { path: "/inventory", icon: Package, label: "Inventory", tKey: "nav.inventory" },
        { path: "/settings", icon: Settings, label: "Settings", tKey: "nav.settings" },
        { path: "/subscription", icon: Crown, label: "Upgrade", badge: "PRO", isPro: true, tKey: "nav.upgrade" },
      ];
    }
    return NAV_ITEMS;
  }, [isFashion, isSupermarket]);

  // Refresh branches from Firestore after login
  useEffect(() => {
    if (!user) return;
    getAllBranches().then(async (list) => {
      let activeList = list;
      if (list.length === 0) {
        try {
          const defaultBranch = {
            name: 'Main Outlet',
            code: 'MAIN',
            type: 'Store',
            address: { street: 'Main Street', city: '', state: '', zipcode: '', country: 'India' },
            contact: { phone: '', email: '', manager: 'Owner' },
            gst: { gstNumber: '', registrationType: 'Regular' },
            settings: { currency: 'INR', timezone: 'Asia/Kolkata', billPrefix: 'VR-', enableOfflineBilling: true, enableLoyalty: true },
          };
          const newId = await createBranch(defaultBranch);
          activeList = [{ id: newId, ...defaultBranch }];
        } catch (err) {
          console.error("Failed to seed default branch:", err);
        }
      }
      
      setBranches(activeList);
      
      if (activeList.length > 0) {
        const currentSelected = localStorage.getItem('selectedBranch');
        const exists = activeList.some(b => b.id === currentSelected);
        if (!currentSelected || !exists) {
          localStorage.setItem('selectedBranch', activeList[0].id);
          setActiveBranchId(activeList[0].id);
          window.dispatchEvent(new Event('branchChanged'));
        }
      }
    }).catch(err => console.error("Error loading branches:", err));
  }, [user]);

  // Listen for branch list changes (after create/delete in BranchManagement)
  useEffect(() => {
    const handleRefresh = () => {
      getAllBranches().then(list => {
        setBranches(list);
        if (list.length > 0) {
          const currentSelected = localStorage.getItem('selectedBranch');
          const exists = list.some(b => b.id === currentSelected);
          if (!currentSelected || !exists) {
            localStorage.setItem('selectedBranch', list[0].id);
            setActiveBranchId(list[0].id);
            window.dispatchEvent(new Event('branchChanged'));
          }
        } else {
          localStorage.removeItem('selectedBranch');
          setActiveBranchId('');
          window.dispatchEvent(new Event('branchChanged'));
        }
      }).catch(() => {});
    };
    window.addEventListener('branchListChanged', handleRefresh);
    return () => window.removeEventListener('branchListChanged', handleRefresh);
  }, []);

  const handleBranchChange = (e) => {
    const id = e.target.value;
    localStorage.setItem('selectedBranch', id);
    setActiveBranchId(id);
    window.dispatchEvent(new Event('branchChanged'));
  };

  const handleNavClick = () => {
    if (mobile && onClose) onClose();
  };

  // Dynamically filter navigation items based on user's SAP permissions
  const filteredNavItems = activeNavItems.filter((item) => {
    if (searchQuery && !t(item.tKey).toLowerCase().includes(searchQuery.toLowerCase()) && !item.label.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (!user) return true;
    

    
    // Essential core pages
    if (item.path === "/" || item.path === "/subscription" || item.path === "/settings") {
      return true;
    }
    
    // Limit audit log access to owner, ceo, and ca roles
    if (item.path === "/audit-logs") {
      return user.role === 'owner' || user.role === 'ceo' || user.role === 'ca';
    }
    
    // Owner role has complete clearance
    if (user.role === 'owner') return true;
    
    // Match paths to module permissions keys
    let moduleKey = "";
    if (item.path === "/pos" || item.path === "/invoices" || item.path === "/customers") {
      moduleKey = "pos";
    } else if (item.path === "/inventory" || item.path === "/barcode" || item.path === "/inventory-sync" || item.path === "/stock-transfer") {
      moduleKey = "inventory";
    } else if (item.path === "/purchases" || item.path === "/waybills" || item.path === "/warehouse") {
      moduleKey = "warehouse";
    } else if (item.path === "/expenses" || item.path === "/accounting" || item.path === "/loans" || item.path === "/gst-filing" || item.path === "/finance") {
      moduleKey = "accounting";
    } else if (item.path === "/branches" || item.path === "/hrms") {
      moduleKey = "hr";
    } else if (item.path === "/reports" || item.path === "/ai-insights" || item.path === "/enterprise-intel") {
      moduleKey = "reports";
    }
    
    if (moduleKey) {
      return !!user.permissions?.[moduleKey]?.view;
    }
    
    return true;
  });

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar border-r border-sidebar-border shrink-0 overflow-hidden",
      mobile ? "w-full h-full" : "hidden lg:flex w-[220px] h-full"
    )}>
      {/* Logo & Brand */}
      <div className="px-5 pt-5 pb-[1px] border-b border-sidebar-border/30 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl font-black gold-text">EasyBMT</span>
        </div>
        <div className="flex flex-col gap-0.5 mb-2">
          <p className="text-[12px] text-foreground font-extrabold uppercase tracking-wider truncate">
            🏢 {shopSettings.shop_name || user?.business_name || "EasyBMT Retail"}
          </p>
          <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 truncate">
            <span className="truncate">{user?.name || "Kamlesh Kkumar"}</span>
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground text-[8px] font-bold border border-border/50">
              ID: {(user?.user_code === 'ADMIN-001' || localStorage.getItem('user_code') === 'ADMIN-001' ? `${(localStorage.getItem('company_id') || 'COMP').split('-')[0].substring(0, 6).toUpperCase()}-ADMIN-001` : user?.user_code || user?.id?.substring(0, 6) || "STF-01")}
            </span>
          </div>
        </div>

        {/* Dynamic Branch Dropdown Switcher */}
        {branches.length > 0 && (
          <div className="mt-2 space-y-1">
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-extrabold flex items-center gap-1">
              <GitBranch className="w-2.5 h-2.5 text-amber-500" /> {t("branches.active_outlet")}
            </label>
            <select
              value={activeBranchId}
              onChange={handleBranchChange}
              className="w-full bg-secondary/40 border border-border/40 rounded-md py-1 px-2 text-[11px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-background text-foreground font-bold">
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-3 relative flex items-center">
          <Search className="absolute left-2 w-3 h-3 text-muted-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Smart Search..." 
            className="w-full h-[30px] bg-secondary/50 border border-border/50 rounded text-[10px] pl-6 pr-2 focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 pt-0 pb-2 overflow-y-auto space-y-0.5">
        {filteredNavItems.map((item) => {
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
      <div className="p-3 border-t border-sidebar-border shrink-0">
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