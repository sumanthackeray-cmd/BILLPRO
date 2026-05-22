import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Eye,
  User,
  ShieldCheck,
  Activity,
  ShieldAlert
} from "lucide-react";

export default function AuditLogPage() {
  const { companyId } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);
  const [showRawPayload, setShowRawPayload] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [list, userList] = await Promise.all([
        base44.entities.AuditLog.list("-created_date"),
        base44.entities.User.list().catch(() => [])
      ]);
      setLogs(list || []);
      setFilteredLogs(list || []);
      setUsers(userList || []);
    } catch (e) {
      console.error("Failed to fetch audit logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let result = logs;

    if (search.trim() !== "") {
      const query = search.toLowerCase();
      result = result.filter(
        (log) =>
          log.description?.toLowerCase().includes(query) ||
          log.action?.toLowerCase().includes(query) ||
          log.userId?.toLowerCase().includes(query) ||
          log.entityId?.toLowerCase().includes(query) ||
          log.entityType?.toLowerCase().includes(query) ||
          // Add timestamp search
          (log.created_date && new Date(log.created_date).toISOString().toLowerCase().includes(query)) ||
          (log.createdAt && new Date(log.createdAt).toISOString().toLowerCase().includes(query)) ||
          (log.timestamp && new Date(log.timestamp).toISOString().toLowerCase().includes(query))
      );
    }

    if (userFilter !== "all") {
      result = result.filter((log) => log.userCode === userFilter || log.userId === userFilter);
    }

    if (actionFilter !== "all") {
      result = result.filter((log) => log.action === actionFilter);
    }

    if (moduleFilter !== "all") {
      result = result.filter((log) => log.entityType === moduleFilter);
    }

    setFilteredLogs(result);
  }, [search, userFilter, actionFilter, moduleFilter, logs]);

  const handleCloseModal = () => {
    setSelectedLog(null);
    setShowRawPayload(false);
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "Action", "User ID/Code", "Operator Name", "Entity Type", "Entity ID", "Description"];
    const rows = filteredLogs.map((log) => {
      // Resolve operator name for CSV export
      const opId = log.userId || log.userCode;
      const user = users.find(u => u.id === opId || u.userCode === opId);
      const operatorName = user ? user.name : "System";
      
      // Resolve timestamp
      let dateString = "N/A";
      const rawDate = log.created_date || log.createdAt || log.timestamp;
      if (rawDate) {
        if (typeof rawDate === "object") {
          if (typeof rawDate.toDate === "function") {
            dateString = rawDate.toDate().toISOString();
          } else if (rawDate.seconds !== undefined) {
            dateString = new Date(rawDate.seconds * 1000).toISOString();
          } else if (rawDate._seconds !== undefined) {
            dateString = new Date(rawDate._seconds * 1000).toISOString();
          }
        } else {
          dateString = new Date(rawDate).toISOString();
        }
      }

      return [
        dateString,
        log.action || "",
        opId || "",
        operatorName,
        log.entityType || "",
        log.entityId || "",
        log.description || ""
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_logs_${companyId}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe Timestamp Formatting Helper
  const formatTimestamp = (log) => {
    if (!log) return "N/A";
    const rawDate = log.created_date || log.createdAt || log.timestamp;
    if (!rawDate) return "N/A";
    
    let dateObj = null;
    if (typeof rawDate === "object") {
      if (typeof rawDate.toDate === "function") {
        dateObj = rawDate.toDate();
      } else if (rawDate.seconds !== undefined) {
        dateObj = new Date(rawDate.seconds * 1000);
      } else if (rawDate._seconds !== undefined) {
        dateObj = new Date(rawDate._seconds * 1000);
      }
    } else {
      dateObj = new Date(rawDate);
    }
    
    if (!dateObj || isNaN(dateObj.getTime())) {
      return "N/A";
    }
    
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-foreground/90">{dateObj.toLocaleDateString()}</span>
        <span className="text-[10px] text-muted-foreground font-mono">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    );
  };

  // Human-Friendly Action Translation Engine
  const getActionLabel = (action) => {
    if (!action) return { text: "⚙️ System Process", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" };
    
    const mappings = {
      // User Actions
      USER_LOGIN: { text: "🔑 Staff Logged In", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
      USER_LOGOUT: { text: "🔒 Staff Logged Out", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
      USER_CREATE: { text: "👤 Staff Registered", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      USER_UPDATE: { text: "✏️ Staff Updated", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      USER_DELETE: { text: "🗑️ Staff Removed", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
      USER_ROLE_CHANGE: { text: "🛡️ Auth Level Shifted", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },

      // Invoice Actions
      INVOICE_CREATE: { text: "📄 Bill Generated", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      INVOICE_UPDATE: { text: "🔄 Bill Corrected", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      INVOICE_VOID: { text: "🚫 Bill Cancelled", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
      INVOICE_DELETE: { text: "❌ Bill Deleted", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
      INVOICE_REPRINT: { text: "🖨️ Bill Reprinted", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },

      // Return Actions
      RETURN_CREATE: { text: "↩️ Return Initiated", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
      RETURN_APPROVE: { text: "✅ Return Sanctioned", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      RETURN_COMPLETE: { text: "📦 Return Completed", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },

      // Inventory Actions
      INVENTORY_ADJUST: { text: "📦 Stock Adjusted", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      INVENTORY_TRANSFER: { text: "🚚 Stock Shifted", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
      INVENTORY_MARK_EXPIRY: { text: "⚠️ Expiry Flagged", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
      BATCH_CREATE: { text: "🆕 Batch Formed", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      BATCH_UPDATE: { text: "🔄 Batch Modified", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },

      // Purchase Actions
      PURCHASE_ORDER_CREATE: { text: "📥 Purchase PO Created", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      PURCHASE_ORDER_APPROVE: { text: "✅ Purchase Approved", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      PURCHASE_ORDER_CANCEL: { text: "❌ Purchase Rescinded", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
      PURCHASE_ORDER_RECEIVE: { text: "🚚 Cargo Received", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      GRN_CREATE: { text: "📄 GRN Finalized", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },

      // Vendor Actions
      VENDOR_CREATE: { text: "🏢 Vendor Onboarded", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      VENDOR_UPDATE: { text: "📝 Vendor Profile Edited", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      VENDOR_DELETE: { text: "🗑️ Vendor Discharged", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },

      // Product Actions
      PRODUCT_CREATE: { text: "🏷️ Item Onboarded", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      PRODUCT_UPDATE: { text: "🔄 Item Modified", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      PRODUCT_DELETE: { text: "🗑️ Item Expelled", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
      PRODUCT_PRICE_CHANGE: { text: "💰 Price Changed", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },

      // Customer Actions
      CUSTOMER_CREATE: { text: "🤝 Customer Registered", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      CUSTOMER_UPDATE: { text: "📝 Customer Info Updated", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      CUSTOMER_DELETE: { text: "🗑️ Customer Deactivated", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },

      // Settings Actions
      SETTINGS_UPDATE: { text: "⚙️ Settings Modified", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      BRANCH_SETTINGS_UPDATE: { text: "🏢 Branch Config Updated", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },

      // Cash Management
      SHIFT_OPEN: { text: "🔑 Shift Unlocked", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
      SHIFT_CLOSE: { text: "🔒 Shift Secured", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
      DAY_CLOSING: { text: "📊 Session Audited", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },

      // Access Control
      PERMISSION_CHANGE: { text: "🔑 Clearance Altered", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
      ACCESS_DENIED: { text: "🛑 Access Blocked", color: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 font-black animate-pulse" },

      // Onboarding
      COMPANY_ONBOARD: { text: "🏢 Company Onboarded", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-black" }
    };

    const matched = mappings[action];
    if (matched) return matched;

    // Formatting fallback replacing underscores with spaces
    const formatted = action.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return {
      text: formatted,
      color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
    };
  };

  // Color-coded Entity Type Badge Helper
  const getEntityBadge = (type) => {
    const mappings = {
      Invoice: { label: "📄 Invoice / Bill", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      Product: { label: "🏷️ Product", style: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
      Customer: { label: "🤝 Customer", style: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
      Inventory: { label: "📦 Inventory", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      Company: { label: "🏢 Company", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      User: { label: "👤 User Staff", style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
      Role: { label: "🛡️ Auth Role", style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" }
    };
    
    return mappings[type] || { label: type || "System Log", style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" };
  };

  // Truncate long Entity IDs neatly
  const formatEntityId = (id) => {
    if (!id) return "N/A";
    if (id.length > 15) {
      return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
    }
    return id;
  };

  // Resolve raw Operator ID to real staff name badge
  const renderOperator = (log) => {
    const operatorId = log.userId || log.userCode;
    if (!operatorId) return <span className="text-muted-foreground font-semibold">System Process</span>;
    
    const user = users.find(u => u.id === operatorId || u.userCode === operatorId);
    const displayName = user ? user.name : (log.userCode || operatorId);
    const code = user ? (user.userCode || "Staff") : (operatorId.length > 10 ? "External UID" : operatorId);
    
    const shortName = displayName.length > 20 ? `${displayName.substring(0, 18)}...` : displayName;
    const avatarLetter = displayName.charAt(0).toUpperCase() || "O";
    
    return (
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
          {avatarLetter}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-foreground text-xs leading-none">{shortName}</span>
          <span className="text-[9px] font-semibold text-muted-foreground leading-none mt-1 font-mono">{code}</span>
        </div>
      </div>
    );
  };

  const getOperatorDropdownName = (opId) => {
    if (!opId) return "System";
    const found = users.find(u => u.id === opId || u.userCode === opId);
    if (found) {
      return `${found.name} (${found.userCode || 'Staff'})`;
    }
    if (opId.length > 12) {
      return `Operator (${opId.substring(0, 6)}...${opId.substring(opId.length - 4)})`;
    }
    return opId;
  };

  // Generate lists for search and filters
  const uniqueUsers = Array.from(new Set(logs.map((log) => log.userCode || log.userId).filter(Boolean)));
  const uniqueActions = Array.from(new Set(logs.map((log) => log.action).filter(Boolean)));
  const uniqueModules = Array.from(new Set(logs.map((log) => log.entityType).filter(Boolean))).sort();

  // Calculate statistics from the log trail
  const accessViolations = logs.filter(l => l.action === 'ACCESS_DENIED').length;
  const activeOperatorsCount = new Set(logs.map(l => l.userId).filter(Boolean)).size;

  const renderChanges = (changes) => {
    if (!changes || typeof changes !== "object") return null;

    const formatVal = (v) => {
      if (v === null || v === undefined) return "N/A";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    };

    const keys = Object.keys(changes);
    if (keys.length === 0) {
      return (
        <p className="text-xs text-muted-foreground font-semibold py-2">
          No field modifications recorded.
        </p>
      );
    }

    return (
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {keys.map((key) => {
          const val = changes[key];

          if (val && typeof val === "object" && ("before" in val || "after" in val)) {
            return (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-secondary/50 border border-border text-xs"
              >
                <span className="font-bold text-foreground/90 capitalize">
                  {key.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] font-medium line-through">
                    {formatVal(val.before)}
                  </span>
                  <span className="text-muted-foreground font-black text-[10px]">➔</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    {formatVal(val.after)}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={key}
              className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-secondary/50 border border-border text-xs"
            >
              <span className="font-bold text-foreground/90 capitalize">
                {key.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-[11px] text-foreground bg-secondary/80 px-2 py-0.5 rounded border border-border/30">
                {formatVal(val)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              System Audit Logs
            </h1>
          </div>
          <p className="text-xs lg:text-sm text-foreground/75 mt-1.5 leading-relaxed">
            Immutable, cryptographically anchored security trail capturing point ledger overrides, cashier audits, and invoice modifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            className="border-border hover:bg-secondary/60 text-foreground font-bold text-xs gap-1.5 h-10 px-4 rounded-xl shadow-sm transition-all"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Logs
          </Button>
          <Button
            onClick={exportToCSV}
            className="bg-emerald-600 hover:bg-emerald-500 hover:opacity-95 text-white font-extrabold text-xs gap-1.5 h-10 px-4 rounded-xl shadow-md shadow-emerald-500/10 transition-all border-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV Ledger
          </Button>
        </div>
      </div>

      {/* KPI Overview Statistics Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Compliance Status */}
        <div className="relative overflow-hidden bg-card border border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Compliance Status</span>
            <div className={`p-2 rounded-xl ${accessViolations === 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 animate-pulse'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className={`text-2xl font-black tracking-tight ${accessViolations === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {accessViolations === 0 ? "Perfect Health" : "Alert Triggered"}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
              {accessViolations === 0 ? "🛡️ Real-time ledger secured" : `⚠️ ${accessViolations} unauthorized blocks logged`}
            </p>
          </div>
        </div>

        {/* Card 2: Total Events Captured */}
        <div className="relative overflow-hidden bg-card border border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Captured Logs</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-black tracking-tight text-foreground">
              {logs.length}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
              🔄 Immutable compliance records
            </p>
          </div>
        </div>

        {/* Card 3: Intrusions/Blocked Actions */}
        <div className="relative overflow-hidden bg-card border border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Access Blocks</span>
            <div className={`p-2 rounded-xl ${accessViolations > 0 ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-bounce' : 'bg-secondary text-muted-foreground border border-border'}`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className={`text-2xl font-black tracking-tight ${accessViolations > 0 ? 'text-red-500 font-bold' : 'text-foreground'}`}>
              {accessViolations}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
              {accessViolations === 0 ? "✅ Zero breaches flagged" : "🛑 Intrusions blocked & recorded"}
            </p>
          </div>
        </div>

        {/* Card 4: Active Operators */}
        <div className="relative overflow-hidden bg-card border border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Active Team</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-black tracking-tight text-foreground">
              {activeOperatorsCount}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
              👥 Authorized staff users
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search action, description, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background text-foreground border-input focus-visible:ring-primary focus-visible:border-primary text-xs font-bold h-10 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 bg-background px-3 border border-input rounded-xl transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full bg-transparent border-0 text-foreground h-10 rounded-lg text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-card text-foreground font-bold">All Operators</option>
            {uniqueUsers.map((u) => (
              <option key={u} value={u} className="bg-card text-foreground font-bold">
                {getOperatorDropdownName(u)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-background px-3 border border-input rounded-xl transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-transparent border-0 text-foreground h-10 rounded-lg text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-card text-foreground font-bold">All Actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a} className="bg-card text-foreground font-bold">
                {getActionLabel(a).text}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-background px-3 border border-input rounded-xl transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full bg-transparent border-0 text-foreground h-10 rounded-lg text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-card text-foreground font-bold">All Modules</option>
            {uniqueModules.map((m) => (
              <option key={m} value={m} className="bg-card text-foreground font-bold">
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-secondary/50 border-b border-border text-[10px] font-black uppercase text-foreground/80 tracking-wider">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6">Action</th>
                <th className="py-3.5 px-6">Operator</th>
                <th className="py-3.5 px-6">Entity Involved</th>
                <th className="py-3.5 px-6">Event Details / Description</th>
                <th className="py-3.5 px-6 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-muted-foreground font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      Auditing secure log trail...
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-muted-foreground font-semibold">
                    No matching audit records found in the ledger.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const actionDetails = getActionLabel(log.action);
                  const entityDetails = getEntityBadge(log.entityType);

                  return (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/35 transition-all">
                      <td className="py-4 px-6 font-mono text-[11px] text-foreground/80 font-semibold">
                        {formatTimestamp(log)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${actionDetails.color}`}>
                          {actionDetails.text}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {renderOperator(log)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex self-start items-center text-[9px] font-black uppercase px-2 py-0.5 rounded border ${entityDetails.style}`}>
                            {entityDetails.label}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground" title={log.entityId}>
                            ID: {formatEntityId(log.entityId)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-foreground/85 font-medium max-w-xs sm:max-w-sm md:max-w-md break-words whitespace-normal leading-relaxed">
                        {log.description}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-8 text-xs font-black text-primary hover:bg-primary/10 transition-colors"
                        >
                          Inspector <Eye className="w-3.5 h-3.5 ml-1 stroke-[3]" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] pointer-events-none" />

            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-500 animate-pulse" /> Security Event Inspector
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-secondary/80 rounded-lg active:scale-95"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-black text-muted-foreground/90 uppercase tracking-widest">Action Type</Label>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${getActionLabel(selectedLog.action).color}`}>
                    {getActionLabel(selectedLog.action).text}
                  </span>
                </div>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] font-black text-muted-foreground/90 uppercase tracking-widest">Operator Code</Label>
                <div className="mt-1">
                  {renderOperator(selectedLog)}
                </div>
              </div>
              
              <div className="space-y-0.5 col-span-2">
                <Label className="text-[10px] font-black text-muted-foreground/90 uppercase tracking-widest">Entity Details</Label>
                <div className="font-mono font-bold text-foreground bg-secondary/50 border border-border rounded-lg p-2.5 mt-1 flex justify-between items-center">
                  <span>
                    <span className={`inline-flex items-center text-[9px] font-black uppercase px-2 py-0.5 rounded border mr-2 ${getEntityBadge(selectedLog.entityType).style}`}>
                      {getEntityBadge(selectedLog.entityType).label}
                    </span>
                    ID: <span className="text-primary font-mono text-[11px]">{selectedLog.entityId || 'N/A'}</span>
                  </span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedLog.entityId || "");
                    }}
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-0 font-bold"
                    title="Copy ID"
                  >
                    📋 Copy ID
                  </button>
                </div>
              </div>
              
              <div className="space-y-0.5 col-span-2">
                <Label className="text-[10px] font-black text-muted-foreground/90 uppercase tracking-widest">Date & Time</Label>
                <div className="font-semibold text-foreground/80 mt-1 flex items-center gap-2">
                  📅 {formatTimestamp(selectedLog)}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black text-muted-foreground/90 uppercase tracking-widest">Compliance Description</Label>
              <p className="text-foreground text-xs leading-relaxed font-semibold bg-secondary/50 border border-border rounded-xl p-3 shadow-inner whitespace-normal break-words">
                {selectedLog.description}
              </p>
            </div>

            {selectedLog.changes && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground/90 uppercase tracking-widest flex items-center justify-between">
                  <span>State Changes comparative Payload</span>
                  <button
                    type="button"
                    onClick={() => setShowRawPayload(!showRawPayload)}
                    className="text-[10px] font-bold text-primary hover:underline transition-all cursor-pointer normal-case"
                  >
                    {showRawPayload ? "Show Simplified List" : "Show Technical (JSON)"}
                  </button>
                </Label>

                {showRawPayload ? (
                  <pre className="text-[10px] font-mono text-foreground bg-secondary/50 border border-border rounded-xl p-3 overflow-auto max-h-48 leading-relaxed shadow-inner">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                ) : (
                  renderChanges(selectedLog.changes)
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border">
              <Button onClick={handleCloseModal} className="gold-gradient text-black font-extrabold text-xs px-6 h-10 rounded-xl shadow-sm">
                Dismiss Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
