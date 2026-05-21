import MetricCard from "@/components/dashboard/MetricCard";
import { fmtINR } from "@/lib/gst-utils";
import { Gem, ShieldCheck, Scale } from "lucide-react";

export default function JewelleryDashboard({ data }) {
  // Simulated Vault Stock
  const totalWeight = data.products.reduce((acc, p) => acc + (p.stock || 0), 0);

  return (
    <div className="space-y-4">
      {/* Live Gold Rate Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-yellow-700 dark:text-yellow-400 font-bold text-[13px] flex items-center gap-2">
          <Gem className="w-4 h-4" />
          Live Rate (Simulated): 22K Gold — ₹6,950/gm | 24K Gold — ₹7,580/gm | Silver — ₹85/gm
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricCard label="Today's Sales" value={fmtINR(data.totalSales)} icon={Gem} color="gold" />
        <MetricCard label="Items Sold" value={data.filteredInvoices.length} icon={Scale} color="blue" />
        <MetricCard label="Hallmark Checked" value="100%" icon={ShieldCheck} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4 text-yellow-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-foreground">Vault Stock Summary</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[12px] border-b border-border/40 pb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Gold (22K)</span>
              <span className="font-mono font-bold text-yellow-600">{(totalWeight * 0.7).toFixed(1)} gm</span>
            </div>
            <div className="flex justify-between items-center text-[12px] border-b border-border/40 pb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Gold (24K)</span>
              <span className="font-mono font-bold text-yellow-600">{(totalWeight * 0.1).toFixed(1)} gm</span>
            </div>
            <div className="flex justify-between items-center text-[12px] border-b border-border/40 pb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Silver</span>
              <span className="font-mono font-bold text-slate-500">{(totalWeight * 0.2).toFixed(1)} gm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
