import MetricCard from "@/components/dashboard/MetricCard";
import SalesBarChart from "@/components/dashboard/widgets/SalesBarChart";
import { fmtINR } from "@/lib/gst-utils";
import { CakeSlice, Trash2, Clock } from "lucide-react";

export default function BakeryDashboard({ data }) {
  const itemsSold = data.filteredInvoices.reduce((acc, inv) => {
    inv.items?.forEach(item => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
    });
    return acc;
  }, {});
  
  const topItems = Object.entries(itemsSold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricCard label="Today's Sales" value={fmtINR(data.totalSales)} icon={CakeSlice} color="pink" />
        <MetricCard label="Orders Delivered" value={data.filteredInvoices.length} icon={Clock} color="blue" />
        <MetricCard label="Wastage (Est.)" value="0%" icon={Trash2} color="red" sub="End of day check pending" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CakeSlice className="w-4 h-4 text-pink-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-foreground">Best Sellers (Fresh Items)</h3>
          </div>
          <div className="space-y-3">
            {topItems.length > 0 ? topItems.map(([name, qty], i) => (
              <div key={name} className="flex justify-between items-center text-[12px] border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{i + 1}. {name}</span>
                <span className="font-mono font-bold text-pink-600 dark:text-pink-400">{qty} sold</span>
              </div>
            )) : <p className="text-[11px] text-muted-foreground">No sales data.</p>}
          </div>
        </div>

        <SalesBarChart data={data.dailyData} title="Sales Trend" dataKeyY1="Sales" dataKeyY2={null} />
      </div>
    </div>
  );
}
