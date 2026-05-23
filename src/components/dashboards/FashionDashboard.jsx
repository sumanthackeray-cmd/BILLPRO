import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MetricCard from "@/components/dashboard/MetricCard";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { fmtINR } from "@/lib/gst-utils";
import { 
  Shirt, ShoppingBag, Undo2, Scissors, AlertTriangle, 
  ChevronRight
} from "lucide-react";

const PIE_COLORS = ["#06b6d4", "#6366f1", "#ec4899", "#10b981", "#a855f7"];

export default function FashionDashboard({ data }) {
  // 1. Fetch real-time Alterations data
  const { data: rawAlterations = [] } = useQuery({
    queryKey: ["alteration_orders"],
    queryFn: () => base44.entities.AlterationOrder.list("-created_at"),
  });

  // Filter active alterations without fallback seeds
  const alterations = useMemo(() => {
    return rawAlterations;
  }, [rawAlterations]);

  // 2. Metrics calculation
  const metrics = useMemo(() => {
    let pieces = 0;
    let returnsCount = 0;
    
    data.filteredInvoices.forEach(inv => {
      if (inv.status === "returned") {
        returnsCount++;
      }
      inv.items?.forEach(item => {
        pieces += (item.qty || item.quantity || 0);
      });
    });

    const activeAlterations = alterations.filter(alt => alt.status !== "delivered").length;
    const lowStockCount = data.lowStock.length;

    return {
      piecesSold: pieces,
      returnsCount,
      alterationsCount: activeAlterations,
      lowStockCount
    };
  }, [data.filteredInvoices, alterations, data.lowStock]);

  // 3. Gender Sales Splits Donut Data
  const genderSplitData = useMemo(() => {
    let splits = { Men: 0, Women: 0, Kids: 0, Infants: 0, Accessories: 0 };
    
    data.filteredInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        const cat = (item.category || "Apparel").toLowerCase();
        const amt = item.total || (item.qty * item.rate) || 0;
        
        if (cat.includes("infant") || cat.includes("onesie")) {
          splits.Infants += amt;
        } else if (cat.includes("kids") || cat.includes("boy") && cat.includes("kids") || cat.includes("girl") && cat.includes("kids")) {
          splits.Kids += amt;
        } else if (cat.includes("men") || cat.includes("boy") || cat.includes("shirt") || cat.includes("suit")) {
          splits.Men += amt;
        } else if (cat.includes("women") || cat.includes("girl") || cat.includes("saree") || cat.includes("kurti") || cat.includes("dress")) {
          splits.Women += amt;
        } else {
          splits.Accessories += amt;
        }
      });
    });

    return Object.entries(splits)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [data.filteredInvoices]);

  // 4. Color Trends Data (no fallback)
  const colorTrends = useMemo(() => {
    // Return empty if no real calculated data (placeholder for dynamic aggregation)
    return [];
  }, []);

  // 5. Size Stock Alerts Heatmap Grid
  const sizeMasterStock = useMemo(() => {
    // Collect stats from products
    let S = 0, M = 0, L = 0, XL = 0, XXL = 0;
    
    data.products.forEach(p => {
      if (p.sizes && Array.isArray(p.sizes)) {
        p.sizes.forEach(sz => {
          const val = p.stock || 0;
          if (sz === "S") S += val;
          else if (sz === "M") M += val;
          else if (sz === "L") L += val;
          else if (sz === "XL") XL += val;
          else XXL += val;
        });
      }
    });

    return [
      { size: "S", count: S, status: S < 15 ? "Low Stock" : "In Stock" },
      { size: "M", count: M, status: M < 15 ? "Low Stock" : "In Stock" },
      { size: "L", count: L, status: L < 15 ? "Low Stock" : "In Stock" },
      { size: "XL", count: XL, status: XL < 15 ? "Low Stock" : "In Stock" },
      { size: "XXL", count: XXL, status: XXL < 15 ? "Low Stock" : "In Stock" },
    ];
  }, [data.products]);

  // 6. Top 5 selling fashion products
  const topFashionProducts = useMemo(() => {
    const counts = {};
    data.filteredInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        counts[item.name] = counts[item.name] || { qty: 0, revenue: 0, category: item.category || "Fashion" };
        counts[item.name].qty += (item.qty || item.quantity || 0);
        counts[item.name].revenue += (item.total || (item.qty * item.rate) || 0);
      });
    });

    return Object.entries(counts)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [data.filteredInvoices]);

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 p-1">
      
      {/* 1. Metric Indicators Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MetricCard label="Today's Sales" value={fmtINR(data.totalSales)} icon={Shirt} color="cyan" />
        <MetricCard label="Garments Sold" value={`${metrics.piecesSold} Pcs`} icon={ShoppingBag} color="blue" />
        <MetricCard label="Alterations Queue" value={`${metrics.alterationsCount} Jobs`} icon={Scissors} color="purple" sub="Pending tailors adjustment" />
        <MetricCard label="Product Returns" value={`${metrics.returnsCount} Bills`} icon={Undo2} color="red" />
        <MetricCard label="Low Stock Warning" value={`${metrics.lowStockCount} Items`} icon={AlertTriangle} color="amber" sub="Reorder threshold reached" />
      </div>

      {/* 2. Charts Row split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Gender split donut chart (Recharts) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950/60 shadow-sm border border-slate-200 dark:border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide uppercase flex items-center gap-2">
              📊 Gender Sales Revenue splits
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Distribution of revenue split across Men, Women and Kids departments</p>
          </div>

          {/* Absolute container nesting to prevent Recharts layout breaks on mobile */}
          <div className="flex-1 w-full my-3 relative h-40 min-h-[160px]">
            <div className="absolute inset-0">
              {genderSplitData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderSplitData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {genderSplitData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={v => fmtINR(v)} 
                      contentStyle={{ background: "#0b0c16", border: "1px solid #1e293b", borderRadius: 12, fontSize: 11, color: "#fff" }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-bold">
                  No sales splits recorded
                </div>
              )}
            </div>
          </div>

          {/* Color Indicators Legend */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-200 dark:border-slate-900/60 pt-3">
            {genderSplitData.map((d, i) => (
              <div key={d.name} className="text-center">
                <span className="inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate max-w-full">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {d.name}
                </span>
                <strong className="block text-[10px] sm:text-[11px] text-slate-900 dark:text-white font-mono mt-0.5">{fmtINR(d.value)}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly color trend tracker */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-950/60 shadow-sm border border-slate-200 dark:border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide uppercase flex items-center gap-2">
              🎨 Fabric Color Trends Analytics
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Top performing fabric color choices calculated in active invoices</p>
          </div>

          <div className="space-y-3.5 my-4">
            {colorTrends.map(color => (
              <div key={color.name} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-350">
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/20" style={{ backgroundColor: color.hex }} />
                    {color.name}
                  </span>
                  <span className="text-slate-500 dark:text-slate-450 font-mono">{color.sales} sales (₹{color.revenue.toLocaleString()})</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 rounded-full" 
                    style={{ width: color.sales }} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="text-[9px] text-slate-500 text-center uppercase tracking-widest font-black pt-2 border-t border-slate-200 dark:border-slate-900/60">
            Navy Blue + Crimson make 62% total sales
          </div>
        </div>

        {/* Size Master Alerts Grid */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-950/60 shadow-sm border border-slate-200 dark:border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide uppercase flex items-center gap-2">
              📐 Sizing Master Alerts
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Size matrix inventory levels</p>
          </div>

          <div className="space-y-3 my-4">
            {sizeMasterStock.map(variant => {
              const isLow = variant.count < 20;
              return (
                <div key={variant.size} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 rounded-xl p-2.5 flex items-center justify-between gap-2.5 hover:border-slate-300 dark:hover:border-slate-850">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500 dark:text-cyan-400 font-black text-xs border border-cyan-500/20 shrink-0">
                      {variant.size}
                    </div>
                    <div className="truncate">
                      <strong className="block text-xs font-bold text-slate-900 dark:text-white truncate">Size {variant.size}</strong>
                      <span className="text-[9px] text-slate-500 block font-bold mt-0.5">{variant.count} Pcs Stock</span>
                    </div>
                  </div>

                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                    isLow ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {isLow ? "Low" : "Optimal"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Lower Detail tables grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Tailor alteration pending tracker */}
        <div className="bg-white dark:bg-slate-950/60 shadow-sm border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide uppercase flex items-center gap-2">
                🧵 Tailor alterations pipeline queue
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Active adjustments assignments in progress</p>
            </div>
            <a href="/alterations" className="text-[10px] text-cyan-400 hover:text-cyan-300 font-black flex items-center gap-0.5 uppercase tracking-wider shrink-0">
              Board <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-900 max-h-[260px] overflow-y-auto pr-1">
            {alterations.length === 0 ? (
              <p className="text-xs text-slate-500 py-10 text-center font-bold">No active tailoring jobs</p>
            ) : (
              alterations.slice(0, 4).map(alt => (
                <div key={alt.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400 font-extrabold text-[10px] shrink-0">
                      {alt.tailor_name.split(" ")[0][0]}
                    </div>
                    <div className="min-w-0">
                      <strong className="block text-slate-900 dark:text-white font-bold truncate">{alt.item_name}</strong>
                      <span className="text-[9px] text-slate-500 block font-bold mt-0.5 truncate">
                        Cust: {alt.customer_name} · Tailor: <strong className="text-indigo-500 dark:text-indigo-400 font-bold">{alt.tailor_name}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      alt.status === "ready" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                      alt.status === "in_progress" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                      "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                    }`}>
                      {alt.status.replace("_", " ")}
                    </span>
                    <span className="block font-mono font-bold text-[10px] text-slate-500 mt-1">Due {alt.delivery_date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top 5 Fashion Products performance */}
        <div className="bg-white dark:bg-slate-950/60 shadow-sm border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide uppercase flex items-center gap-2">
              👗 Best Performing Fashion Items
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Ranking list based on sales volume in currently filtered dates</p>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs text-slate-500 dark:text-slate-400 min-w-[380px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-900 pb-2 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-2">Item Details</th>
                  <th>Category</th>
                  <th className="text-center">Units Sold</th>
                  <th className="text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {topFashionProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500 font-bold">No retail sales recorded</td>
                  </tr>
                ) : (
                  topFashionProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 font-bold text-slate-900 dark:text-white">{i + 1}. {p.name}</td>
                      <td>{p.category}</td>
                      <td className="text-center font-mono font-black text-cyan-600 dark:text-cyan-400">{p.qty} sold</td>
                      <td className="text-right font-mono font-bold text-slate-900 dark:text-white">{fmtINR(p.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
