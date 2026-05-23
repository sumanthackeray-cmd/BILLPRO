import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { 
  Scissors, Search, Calendar, Plus, Check, User, Send, UserCheck
} from "lucide-react";

export default function Alterations() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTailorFilter, setSelectedTailorFilter] = useState("all");

  // Load active branch
  const activeBranchId = localStorage.getItem("selectedBranch") || "";

  // Query Invoices to pull alteration items
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date"),
  });

  // Query custom collection for alterations (stored in alteration_orders)
  const { data: rawAlterations = [], refetch } = useQuery({
    queryKey: ["alteration_orders"],
    queryFn: () => base44.entities.AlterationOrder.list("-created_at"),
  });

  // Fallback seed alterations if empty
  const alterations = useMemo(() => {
    return rawAlterations || [];
  }, [rawAlterations]);

  const tailors = ["Ramesh Kumar", "Anil Master", "Sunita Devi"];

  // Filter alterations
  const filteredAlterations = useMemo(() => {
    return alterations.filter(alt => {
      const matchSearch = 
        alt.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alt.alteration_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alt.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alt.customer_phone.includes(searchTerm);
      
      const matchTailor = selectedTailorFilter === "all" || alt.tailor_name === selectedTailorFilter;
      return matchSearch && matchTailor;
    });
  }, [alterations, searchTerm, selectedTailorFilter]);

  // Status lists
  const kanbanColumns = [
    { id: "received", label: "📥 Received", color: "from-blue-500/10 to-indigo-500/5 text-blue-400 border-blue-500/20" },
    { id: "in_progress", label: "✂️ In Progress", color: "from-amber-500/10 to-orange-500/5 text-amber-400 border-amber-500/20" },
    { id: "ready", label: "✨ Ready for Pickup", color: "from-emerald-500/10 to-teal-500/5 text-emerald-400 border-emerald-500/20" },
    { id: "delivered", label: "✅ Delivered", color: "from-slate-500/10 to-slate-600/5 text-slate-400 border-slate-700" }
  ];

  // Tailor metrics
  const tailorStats = useMemo(() => {
    const stats = {};
    tailors.forEach(t => {
      stats[t] = { completed: 0, active: 0, revenue: 0 };
    });
    alterations.forEach(alt => {
      if (stats[alt.tailor_name]) {
        if (alt.status === "delivered" || alt.status === "ready") {
          stats[alt.tailor_name].completed += 1;
        } else {
          stats[alt.tailor_name].active += 1;
        }
        stats[alt.tailor_name].revenue += (alt.charge || 0);
      }
    });
    return stats;
  }, [alterations, tailors]);

  // Update status function
  const handleUpdateStatus = async (id, nextStatus) => {
    try {
      // Find if it exists in DB or mock
      const isMock = id.startsWith("alt-");
      if (isMock) {
        // Save dynamically via proxy client to store it as a real db entity
        const currentAlt = alterations.find(a => a.id === id);
        const saved = await base44.entities.AlterationOrder.create({
          ...currentAlt,
          status: nextStatus,
          created_at: new Date().toISOString(),
        });
        toast.success(`Alteration ${currentAlt.alteration_no} marked as ${nextStatus.toUpperCase()}`);
      } else {
        await base44.entities.AlterationOrder.update(id, { status: nextStatus });
        toast.success(`Status updated successfully!`);
      }
      queryClient.invalidateQueries({ queryKey: ["alteration_orders"] });
      refetch();
    } catch (e) {
      toast.error("Failed to update status: " + e.message);
    }
  };

  // WhatsApp Alert notification sender
  const handleSendWhatsAppAlert = (alt) => {
    let cleanPhone = alt.customer_phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const message = `✂️ *VOGATS FASHION ALTERATION READY* ✂️\n\nDear *${alt.customer_name}*,\n\nGreat news! Your garment adjustment is complete and ready for pickup at our outlet.\n\n*Alteration No:* ${alt.alteration_no}\n*Item:* ${alt.item_name}\n*Alterations:* ${alt.details}\n\nPlease show this message at the counter to claim your item. Thank you!`;
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    toast.success("WhatsApp pickup alert compiled and opened!");
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 p-1">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-[#0d1b2a] dark:via-[#1b263b] dark:to-[#415a77] border border-cyan-500/20 rounded-2xl p-6 shadow-xl shadow-cyan-900/10 dark:shadow-cyan-950/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none z-0" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Scissors className="w-6 h-6 text-cyan-400 animate-pulse" /> 🧵 Tailor &amp; Alteration Command
            </h1>
            <p className="text-xs text-slate-300">
              Track garment customizations, assign jobs to tailors, monitor piece-rate payroll, and send instant completion notifications.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const altNo = "ALT-" + Date.now().toString().slice(-4);
                toast.info(`Creating standard ticket ${altNo} - Assign to custom bill via POS.`);
              }} 
              className="gold-gradient text-slate-950 font-bold px-4 py-2 text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Custom Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Tailor stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tailors.map(t => (
          <div key={t} className="bg-white dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-extrabold text-sm border border-cyan-500/20 shadow-inner">
              {t.split(" ")[0][0]}{t.split(" ")[1]?.[0] || ""}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t}</h4>
                <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-[9px] font-black uppercase">Tailor Master</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/40 text-[10px] text-slate-500 dark:text-slate-400">
                <div>
                  <span className="block font-black text-slate-900 dark:text-white text-xs">{tailorStats[t]?.active || 0}</span>
                  Active
                </div>
                <div>
                  <span className="block font-black text-slate-900 dark:text-white text-xs">{tailorStats[t]?.completed || 0}</span>
                  Done
                </div>
                <div>
                  <span className="block font-black text-cyan-600 dark:text-cyan-400 text-xs">₹{tailorStats[t]?.revenue || 0}</span>
                  Earnings
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter panel */}
      <div className="bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by ticket no, customer name or phone..."
            className="pl-9 pr-4 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-cyan-500/40 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold shrink-0">Filter Master:</span>
          <select 
            value={selectedTailorFilter}
            onChange={e => setSelectedTailorFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold py-1.5 px-3 text-xs rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="all">All Tailors</option>
            {tailors.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        {kanbanColumns.map(col => {
          const colAlterations = filteredAlterations.filter(alt => alt.status === col.id);
          return (
            <div key={col.id} className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-900 rounded-2xl flex flex-col min-h-[480px]">
              <div className={`p-4 border-b rounded-t-2xl flex items-center justify-between shrink-0 bg-gradient-to-b ${col.color}`}>
                <span className="text-xs font-black tracking-wide uppercase">{col.label}</span>
                <Badge className="bg-white/10 text-white border-none text-[10px] font-black h-5 w-5 flex items-center justify-center p-0 rounded-full">{colAlterations.length}</Badge>
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[350px]">
                {colAlterations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-30 select-none">
                    <Scissors className="w-8 h-8 mb-2 text-slate-500 stroke-[1.5]" />
                    <p className="text-[10px] font-bold text-slate-500">No Custom Items</p>
                  </div>
                ) : (
                  colAlterations.map(alt => (
                    <div 
                      key={alt.id} 
                      className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all duration-150 relative shadow-sm group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[9px] font-bold tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/30 px-2 py-0.5 rounded-full shrink-0">
                          {alt.alteration_no}
                        </span>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">₹{alt.charge}</span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{alt.item_name}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight italic bg-slate-50 dark:bg-slate-950/40 px-2 py-1 rounded border border-slate-200 dark:border-slate-850">
                          {alt.details}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[9px] border-t border-slate-200 dark:border-slate-850 pt-2.5">
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-350">
                          <User className="w-3 h-3 text-cyan-600 dark:text-cyan-500" />
                          <span className="truncate max-w-[80px] font-bold">{alt.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span className="font-bold">{alt.delivery_date}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[9px] pt-1.5 text-slate-500 dark:text-slate-400">
                        <span className="font-bold">Tailor: <strong className="text-cyan-600 dark:text-cyan-400">{alt.tailor_name}</strong></span>
                      </div>

                      {/* Dropdown/Quick Actions bar */}
                      <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-200 dark:border-slate-800/40">
                        {col.id === "received" && (
                          <button
                            onClick={() => handleUpdateStatus(alt.id, "in_progress")}
                            className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 px-2 py-1 text-[8px] font-black rounded-lg uppercase tracking-wider flex items-center gap-0.5"
                          >
                            <Scissors className="w-2.5 h-2.5" /> Start Cut
                          </button>
                        )}
                        {col.id === "in_progress" && (
                          <button
                            onClick={() => handleUpdateStatus(alt.id, "ready")}
                            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 px-2 py-1 text-[8px] font-black rounded-lg uppercase tracking-wider flex items-center gap-0.5"
                          >
                            <Check className="w-2.5 h-2.5" /> Set Ready
                          </button>
                        )}
                        {col.id === "ready" && (
                          <>
                            <button
                              onClick={() => handleSendWhatsAppAlert(alt)}
                              className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/25 px-2 py-1 text-[8px] font-black rounded-lg uppercase tracking-wider flex items-center gap-0.5"
                            >
                              <Send className="w-2.5 h-2.5" /> Notify SMS
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(alt.id, "delivered")}
                              className="bg-indigo-600 text-white hover:bg-indigo-700 px-2.5 py-1 text-[8px] font-black rounded-lg uppercase tracking-wider flex items-center gap-0.5"
                            >
                              <UserCheck className="w-2.5 h-2.5" /> Deliver
                            </button>
                          </>
                        )}
                        {col.id === "delivered" && (
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[8px] uppercase font-black px-2">Delivered Out</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
