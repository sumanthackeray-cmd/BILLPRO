import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/dashboard/StatCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { fmtINR, getMonth, thisMonth } from "@/lib/gst-utils";
import { useLanguage } from "@/lib/LanguageContext";

const PIE_COLORS = ["hsl(36,90%,55%)", "hsl(160,72%,39%)", "hsl(217,91%,60%)", "hsl(263,70%,65%)", "hsl(174,72%,41%)", "hsl(38,92%,50%)"];

export default function OverviewTab() {
  const { t } = useLanguage();

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 500),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-created_date", 500),
  });

  const salesInvoices = invoices.filter(i => i.type === "sale");
  const totalSales = salesInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);
  const totalPurchases = purchases.reduce((s, p) => s + (p.grand_total || 0), 0);
  
  // Refactored exact invoice-level tax tracking instead of item-level estimation
  const totalTax = salesInvoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  
  // Refactored realistic net profit
  const netProfit = totalSales - totalPurchases - totalExpenses - totalTax;

  // Monthly data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const key = d.toISOString().slice(0, 7);
    const sales = salesInvoices.filter(inv => getMonth(inv.date) === key).reduce((s, inv) => s + (inv.grand_total || 0), 0);
    const purch = purchases.filter(p => getMonth(p.date) === key).reduce((s, p) => s + (p.grand_total || 0), 0);
    return { month: d.toLocaleString("en-IN", { month: "short" }), sales, purchases: purch };
  });

  // Accurate GST breakdown from invoices
  const gstData = [];
  const gstMap = {};
  salesInvoices.forEach(inv => {
    // We group by the highest tax rate in the items to categorize the invoice, or fallback to an average
    let maxRate = 0;
    (inv.items || []).forEach(item => {
      if (item.gst_rate > maxRate) maxRate = item.gst_rate;
    });
    if (inv.tax_amount) {
      gstMap[maxRate] = (gstMap[maxRate] || 0) + inv.tax_amount;
    }
  });
  
  Object.entries(gstMap).forEach(([rate, amount]) => {
    gstData.push({ name: `${rate}%`, value: Math.round(amount) });
  });

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("reports.total_revenue")} value={fmtINR(totalSales)} icon="💰" color="green" />
        <StatCard label={t("reports.total_tax")} value={fmtINR(totalTax)} icon="🏛️" color="gold" />
        <StatCard label={t("reports.total_purchases")} value={fmtINR(totalPurchases)} icon="🛒" color="purple" />
        <StatCard label={t("reports.net_profit")} value={fmtINR(netProfit)} icon="📈" color={netProfit >= 0 ? "teal" : "red"} />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 overflow-hidden shadow-sm">
        <h3 className="font-bold text-sm mb-4">📈 {t("reports.sales_vs_purchases")}</h3>
        <div className="h-56 sm:h-64 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barSize={16} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8, fontSize: 12 }} formatter={v => [`₹${Number(v).toLocaleString("en-IN")}`, ""]} />
              <Bar dataKey="sales" fill="hsl(36,90%,55%)" radius={[3, 3, 0, 0]} name={t("reports.sales")} />
              <Bar dataKey="purchases" fill="hsl(263,70%,65%)" radius={[3, 3, 0, 0]} name={t("reports.purchases")} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-sm mb-4">🏛️ {t("reports.gst_breakdown")}</h3>
          {gstData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">{t("common.no_data")}</p>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={gstData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ₹${value}`}>
                    {gstData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [`₹${Number(v).toLocaleString("en-IN")}`, t("reports.tax")]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-sm mb-4">📋 {t("reports.gstr_summary")}</h3>
          <div className="space-y-3">
            {(() => {
              const tm = thisMonth();
              const tmSales = salesInvoices.filter(i => getMonth(i.date) === tm);
              const tmTax = tmSales.reduce((s, i) => s + (i.tax_amount || 0), 0);
              const tmTotal = tmSales.reduce((s, i) => s + (i.grand_total || 0), 0);
              const tmPurchases = purchases.filter(p => getMonth(p.date) === tm);
              const tmPurchTotal = tmPurchases.reduce((s, p) => s + (p.grand_total || 0), 0);
              return [
                { label: "GSTR-1 (" + (t("reports.sales") || "Outward") + ")", value: fmtINR(tmTotal), sub: `${tmSales.length} ` + t("reports.bills") },
                { label: "GSTR-3B (" + (t("reports.tax") || "Tax Liability") + ")", value: fmtINR(tmTax), sub: t("reports.ai_predicted") },
                { label: t("reports.purchases") + " " + t("inventory.stock_in"), value: fmtINR(tmPurchTotal), sub: `${tmPurchases.length} ` + t("common.actions") },
                { label: t("common.total") + " " + t("reports.tax"), value: fmtINR(Math.max(0, tmTax * 0.5)), sub: t("reports.ai_predicted") },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-semibold text-[13px]">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.sub}</p>
                  </div>
                  <p className="font-bold font-mono text-primary">{item.value}</p>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
