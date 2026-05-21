import MetricCard from "@/components/dashboard/MetricCard";
import CategoryPieChart from "@/components/dashboard/widgets/CategoryPieChart";
import { fmtINR } from "@/lib/gst-utils";
import { Shirt, ShoppingBag, Undo2 } from "lucide-react";

export default function FashionDashboard({ data }) {
  const catSales = data.filteredInvoices.reduce((acc, inv) => {
    inv.items?.forEach(item => {
      const cat = item.category || "Apparel";
      acc[cat] = (acc[cat] || 0) + (item.total || 0);
    });
    return acc;
  }, {});
  
  const pieData = Object.entries(catSales).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricCard label="Today's Sales" value={fmtINR(data.totalSales)} icon={Shirt} color="cyan" />
        <MetricCard label="Total Invoices" value={data.filteredInvoices.length} icon={ShoppingBag} color="blue" />
        <MetricCard label="Returns (Credit Notes)" value={0} icon={Undo2} color="red" sub="Coming soon" />
      </div>

      {/* Size / Variant Dashboard */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 border border-cyan-200 dark:border-cyan-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-100 dark:bg-cyan-500/25 p-2 rounded-xl text-cyan-600 dark:text-cyan-400">
            <Shirt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-foreground">
              👕 Apparel Variants & Size Distribution
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
              Overview of sizes and variants in stock
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { size: "S", count: 24, progress: 35 },
            { size: "M", count: 68, progress: 85 },
            { size: "L", count: 52, progress: 65 },
            { size: "XL", count: 19, progress: 25 },
          ].map((variant, i) => (
            <div key={i} className="bg-white dark:bg-[#0f111e]/50 border border-cyan-200 dark:border-cyan-500/15 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-cyan-700 dark:text-cyan-400">Size: {variant.size}</span>
                <span className="text-slate-700 dark:text-foreground">{variant.count} Pcs</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${variant.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryPieChart data={pieData} title="Category Mix" />
      </div>
    </div>
  );
}
