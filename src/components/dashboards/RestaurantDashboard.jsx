import { useState } from "react";
import MetricCard from "@/components/dashboard/MetricCard";
import CategoryPieChart from "@/components/dashboard/widgets/CategoryPieChart";
import { useLanguage } from "@/lib/LanguageContext";
import { fmtINR } from "@/lib/gst-utils";
import { Utensils, Users, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RestaurantDashboard({ data }) {
  const { language } = useLanguage();
  
  const [tables, setTables] = useState([
    { id: 1, name: "T1", status: "Vacant" },
    { id: 2, name: "T2", status: "Occupied" },
    { id: 3, name: "T3", status: "Vacant" },
    { id: 4, name: "T4", status: "Vacant" },
    { id: 5, name: "T5", status: "Occupied" },
    { id: 6, name: "T6", status: "Vacant" },
  ]);

  const catSales = data.filteredInvoices.reduce((acc, inv) => {
    inv.items?.forEach(item => {
      const cat = item.category || "General";
      acc[cat] = (acc[cat] || 0) + (item.total || 0);
    });
    return acc;
  }, {});
  
  const pieData = Object.entries(catSales).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      {/* Table Map Widget */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-500/10 dark:to-red-500/10 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-500/25 p-2 rounded-xl text-orange-600 dark:text-orange-400">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-foreground">
                🍽️ Restaurant Table & KOT Tracker
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                Click tables to toggle Occupied/Vacant status
              </p>
            </div>
          </div>
          <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-500/30 px-3 py-1 rounded-full text-xs">
            {tables.filter(t => t.status === "Occupied").length} / {tables.length} Tables Busy
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {tables.map(table => (
            <button
              key={table.id}
              onClick={() => {
                const nextStatus = table.status === "Vacant" ? "Occupied" : "Vacant";
                setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: nextStatus } : t));
              }}
              className={cn(
                "p-3 rounded-xl border font-bold text-xs transition-all duration-200 active:scale-95 text-center flex flex-col items-center justify-center gap-1",
                table.status === "Occupied"
                  ? "bg-orange-500/10 text-orange-400 border-orange-500/40 shadow-md shadow-orange-500/5"
                  : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary/60"
              )}
            >
              <span className="font-black">{table.name}</span>
              <span className="text-[9px] uppercase tracking-wider opacity-85">
                {table.status === "Occupied" ? "BUSY" : "VACANT"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricCard label="Today's Sales" value={fmtINR(data.totalSales)} icon={Utensils} color="orange" />
        <MetricCard label="Orders (KOTs)" value={data.filteredInvoices.length} icon={BadgeCheck} color="blue" />
        <MetricCard label="Avg Ticket Size" value={fmtINR(data.totalSales / (data.filteredInvoices.length || 1))} icon={Users} color="teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryPieChart data={pieData} title="Sales by Category (Menu Mix)" />
      </div>
    </div>
  );
}
