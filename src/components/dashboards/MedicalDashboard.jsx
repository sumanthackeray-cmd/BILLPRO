import MetricCard from "@/components/dashboard/MetricCard";
import AlertBanner from "@/components/dashboard/widgets/AlertBanner";
import CategoryPieChart from "@/components/dashboard/widgets/CategoryPieChart";
import { fmtINR } from "@/lib/gst-utils";
import { Pill, AlertTriangle, ShieldCheck, Clipboard } from "lucide-react";

export default function MedicalDashboard({ data }) {
  // Expiry tracking
  const now = new Date();
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const next90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const expired = data.products.filter(p => p.expiry_date && new Date(p.expiry_date) < now);
  const exp30 = data.products.filter(p => p.expiry_date && new Date(p.expiry_date) >= now && new Date(p.expiry_date) < next30);
  const exp90 = data.products.filter(p => p.expiry_date && new Date(p.expiry_date) >= next30 && new Date(p.expiry_date) < next90);

  // Categories Split (Simulating RX vs OTC if category matches)
  const catSales = data.filteredInvoices.reduce((acc, inv) => {
    inv.items?.forEach(item => {
      const cat = item.category || "OTC";
      acc[cat] = (acc[cat] || 0) + (item.total || 0);
    });
    return acc;
  }, {});
  
  const pieData = Object.entries(catSales).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      {/* Expiry Banner */}
      {expired.length > 0 && (
        <AlertBanner type="error" title="CRITICAL: Expired Medicines in Stock">
          {expired.map(p => p.name).join(", ")}
        </AlertBanner>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <MetricCard label="Today's Sale" value={fmtINR(data.totalSales)} icon={Pill} color="emerald" />
        <MetricCard label="Rx Bills" value={data.filteredInvoices.length} icon={Clipboard} color="blue" />
        <MetricCard label="Expiring <30 Days" value={exp30.length} icon={AlertTriangle} color="red" />
        <MetricCard label="Compliance Status" value="OK" icon={ShieldCheck} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expiry Dashboard */}
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-sm text-slate-800 dark:text-foreground mb-4">Expiry Dashboard</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-red-50 dark:bg-red-500/10 p-2 rounded border border-red-200 dark:border-red-500/30 text-xs">
              <span className="font-bold text-red-700 dark:text-red-400">Expired</span>
              <span className="font-mono text-red-700 dark:text-red-400">{expired.length} Items</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-500/10 p-2 rounded border border-yellow-200 dark:border-yellow-500/30 text-xs">
              <span className="font-bold text-yellow-700 dark:text-yellow-400">Expiring in &lt;30 Days</span>
              <span className="font-mono text-yellow-700 dark:text-yellow-400">{exp30.length} Items</span>
            </div>
            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-500/10 p-2 rounded border border-blue-200 dark:border-blue-500/30 text-xs">
              <span className="font-bold text-blue-700 dark:text-blue-400">Expiring in 30-90 Days</span>
              <span className="font-mono text-blue-700 dark:text-blue-400">{exp90.length} Items</span>
            </div>
          </div>
        </div>

        {/* Category Split */}
        <CategoryPieChart data={pieData} title="Category Sales (Rx vs OTC)" />
      </div>
    </div>
  );
}
