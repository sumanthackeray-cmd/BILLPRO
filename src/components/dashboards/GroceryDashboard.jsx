import MetricCard from "@/components/dashboard/MetricCard";
import SalesBarChart from "@/components/dashboard/widgets/SalesBarChart";
import AlertBanner from "@/components/dashboard/widgets/AlertBanner";
import { useAuth } from "@/lib/AuthContext";
import { fmtINR } from "@/lib/gst-utils";
import { ShoppingCart, Package, Users, Tag } from "lucide-react";

export default function GroceryDashboard({ data }) {
  const { user } = useAuth();
  
  // Calculate fast moving items based on current date range sales
  const itemsSold = data.filteredInvoices.reduce((acc, inv) => {
    inv.items?.forEach(item => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
    });
    return acc;
  }, {});
  
  const topItems = Object.entries(itemsSold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalItemsSold = Object.values(itemsSold).reduce((a, b) => a + b, 0);

  // Perishable tracking (simulated for grocery)
  const expiringSoon = data.products.filter(p => p.expiry_date && new Date(p.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-4">
      {/* KPI Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricCard label="Today's Sales" value={fmtINR(data.totalSales)} icon={ShoppingCart} color="gold" />
        <MetricCard label="Items Sold" value={totalItemsSold} icon={Package} color="blue" />
        <MetricCard label="Customers Billed" value={data.filteredInvoices.length} icon={Users} color="teal" />
      </div>

      {/* Alerts */}
      {expiringSoon.length > 0 && (
        <AlertBanner type="warning" title="Expiry Alert (Next 7 Days)">
          {expiringSoon.map(p => `${p.name} — ${p.expiry_date}`).join(" | ")}
        </AlertBanner>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fast Moving Items */}
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-foreground">Top 5 Items (Fast-Moving)</h3>
          </div>
          <div className="space-y-3">
            {topItems.length > 0 ? topItems.map(([name, qty], i) => (
              <div key={name} className="flex justify-between items-center text-[12px] border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{i + 1}. {name}</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{qty} sold</span>
              </div>
            )) : <p className="text-[11px] text-muted-foreground">No sales data.</p>}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-foreground">Low Stock Alerts</h3>
          </div>
          <div className="space-y-3">
            {data.outStock.map(p => (
              <div key={p.id} className="flex justify-between items-center text-[12px] border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{p.name}</span>
                <span className="font-mono font-bold text-red-500">0 left ❌</span>
              </div>
            ))}
            {data.lowStock.slice(0, 5).map(p => (
              <div key={p.id} className="flex justify-between items-center text-[12px] border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{p.name}</span>
                <span className="font-mono font-bold text-orange-500">{p.stock} left ⚠️</span>
              </div>
            ))}
            {data.outStock.length === 0 && data.lowStock.length === 0 && (
              <p className="text-[11px] text-muted-foreground">All stock levels are healthy.</p>
            )}
          </div>
        </div>
      </div>

      <SalesBarChart data={data.dailyData} title="Weekly Sales (Mon-Sun)" dataKeyY1="Sales" dataKeyY2={null} />
    </div>
  );
}
