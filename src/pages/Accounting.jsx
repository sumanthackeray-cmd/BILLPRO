import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, getMonth } from "@/lib/gst-utils";
import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { TrendingUp, DollarSign, BarChart2, Receipt, CreditCard } from "lucide-react";

export default function Accounting() {
  const { t } = useLanguage();
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-date", 500) });
  const { data: purchases = [] } = useQuery({ queryKey: ["purchases"], queryFn: () => base44.entities.Purchase.list("-date", 300) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 300) });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: () => base44.entities.Loan.list() });

  const yearMonths = Array.from({ length: 12 }, (_, i) => {
    const mk = `${year}-${String(i + 1).padStart(2, "0")}`;
    const label = new Date(year, i, 1).toLocaleString("en-IN", { month: "short" });
    const sales = invoices.filter(inv => inv.type === "sale" && getMonth(inv.date) === mk).reduce((s, i) => s + (i.grand_total || 0), 0);
    const tax = invoices.filter(inv => inv.type === "sale" && getMonth(inv.date) === mk).reduce((s, i) => s + (i.tax_amount || 0), 0);
    const purch = purchases.filter(p => getMonth(p.date) === mk).reduce((s, p) => s + (p.grand_total || 0), 0);
    const exp = expenses.filter(e => getMonth(e.date) === mk).reduce((s, e) => s + (e.amount || 0), 0);
    const gross = sales - purch;
    const net = gross - exp;
    return { month: label, mk, Sales: sales, Purchases: purch, Expenses: exp, "Gross Profit": gross, "Net Profit": net, Tax: tax };
  });

  const totalSales = yearMonths.reduce((s, m) => s + m.Sales, 0);
  const totalPurchases = yearMonths.reduce((s, m) => s + m.Purchases, 0);
  const totalExpenses = yearMonths.reduce((s, m) => s + m.Expenses, 0);
  const totalTax = yearMonths.reduce((s, m) => s + m.Tax, 0);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;
  const totalLoanDebt = loans.filter(l => l.status === "Active").reduce((s, l) => s + (l.outstanding_balance || l.principal_amount || 0), 0);

  const summaryCards = [
    { label: t("accounting.total_revenue"), value: fmtINR(totalSales), icon: TrendingUp, color: "text-yellow-400", border: "border-yellow-500/25", bg: "bg-yellow-500/10" },
    { label: t("accounting.total_purchases"), value: fmtINR(totalPurchases), icon: Receipt, color: "text-purple-400", border: "border-purple-500/25", bg: "bg-purple-500/10" },
    { label: t("accounting.total_expenses"), value: fmtINR(totalExpenses), icon: CreditCard, color: "text-red-400", border: "border-red-500/25", bg: "bg-red-500/10" },
    { label: t("accounting.gross_profit"), value: fmtINR(grossProfit), icon: DollarSign, color: grossProfit >= 0 ? "text-emerald-400" : "text-red-400", border: grossProfit >= 0 ? "border-emerald-500/25" : "border-red-500/25", bg: grossProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10" },
    { label: t("accounting.net_profit"), value: fmtINR(netProfit), icon: BarChart2, color: netProfit >= 0 ? "text-emerald-400" : "text-red-400", border: netProfit >= 0 ? "border-emerald-500/25" : "border-red-500/25", bg: netProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10" },
    { label: t("accounting.gst_collected"), value: fmtINR(totalTax), icon: BarChart2, color: "text-blue-400", border: "border-blue-500/25", bg: "bg-blue-500/10" },
    { label: t("accounting.profit_margin"), value: `${profitMargin}%`, icon: TrendingUp, color: Number(profitMargin) >= 0 ? "text-emerald-400" : "text-red-400", border: "border-teal-500/25", bg: "bg-teal-500/10" },
    { label: t("accounting.loan_liability"), value: fmtINR(totalLoanDebt), icon: CreditCard, color: "text-orange-400", border: "border-orange-500/25", bg: "bg-orange-500/10" },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card/95 backdrop-blur-md border border-border/80 rounded-xl px-4 py-2.5 shadow-2xl text-[11px] min-w-[140px] space-y-1.5 z-50">
        <p className="text-foreground font-extrabold border-b border-border/50 pb-1 mb-1 tracking-wider uppercase text-[9px]">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex justify-between items-center gap-4">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}:
            </span>
            <span style={{ color: p.color }} className="font-mono font-black">{fmtINR(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">📒 {t("accounting.title_page")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("accounting.subtitle_page")}</p>
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="bg-card border border-border text-foreground rounded-lg px-3 py-2 text-[13px] font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary/40 transition-all"
        >
          {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {/* (Summary cards replaced in previous step) */}

      {/* P&L Chart */}
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-foreground/95 mb-5 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          📊 {t("accounting.monthly_chart_title")} — {year}
        </h3>
        <div className="h-68">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearMonths} barSize={10} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(36,90%,55%)" stopOpacity={0.85}/>
                  <stop offset="95%" stopColor="hsl(36,90%,35%)" stopOpacity={0.25}/>
                </linearGradient>
                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(263,70%,65%)" stopOpacity={0.85}/>
                  <stop offset="95%" stopColor="hsl(263,70%,45%)" stopOpacity={0.25}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0,84%,60%)" stopOpacity={0.85}/>
                  <stop offset="95%" stopColor="hsl(0,84%,40%)" stopOpacity={0.25}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,15%)" opacity={0.5} />
              <XAxis dataKey="month" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="Sales" name={t("accounting.table_sales")} fill="url(#colorSales)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Purchases" name={t("accounting.table_cost")} fill="url(#colorPurchases)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" name={t("accounting.total_expenses")} fill="url(#colorExpenses)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-sm text-foreground/95 mb-5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            📈 {t("accounting.profit_trend")} — {year}
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearMonths} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,15%)" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Line type="monotone" dataKey="Gross Profit" name={t("accounting.gross_profit")} stroke="hsl(36,90%,55%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "hsl(222,25%,10%)" }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Net Profit" name={t("accounting.net_profit")} stroke="hsl(160,72%,39%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "hsl(222,25%,10%)" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly P&L Table */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-sm text-foreground/95 mb-5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
            📋 {t("accounting.summary_table")}
          </h3>
          <div className="overflow-x-auto -mx-1 pr-1">
            <table className="w-full text-[11px] min-w-[500px] border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-secondary/35 text-[9px] uppercase tracking-wider text-muted-foreground">
                  {[
                    t("accounting.table_month"),
                    t("accounting.table_sales"),
                    t("accounting.table_cost"),
                    t("accounting.table_gross"),
                    t("accounting.table_net")
                  ].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 font-extrabold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearMonths.map(m => (
                  <tr key={m.mk} className="border-b border-border/30 hover:bg-secondary/15 transition-colors font-semibold">
                    <td className="py-2.5 px-3 font-bold text-foreground">{m.month}</td>
                    <td className="py-2.5 px-3 text-amber-500 font-mono">{m.Sales > 0 ? `₹${(m.Sales / 1000).toFixed(1)}k` : "—"}</td>
                    <td className="py-2.5 px-3 text-purple-400 font-mono">{m.Purchases > 0 ? `₹${(m.Purchases / 1000).toFixed(1)}k` : "—"}</td>
                    <td className={`py-2.5 px-3 font-mono font-bold ${m["Gross Profit"] >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {m["Gross Profit"] !== 0 ? `₹${(m["Gross Profit"] / 1000).toFixed(1)}k` : "—"}
                    </td>
                    <td className={`py-2.5 px-3 font-mono font-bold ${m["Net Profit"] >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {m["Net Profit"] !== 0 ? `₹${(m["Net Profit"] / 1000).toFixed(1)}k` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/80 bg-secondary/20">
                  <td className="py-3 px-3 font-black text-foreground uppercase tracking-wider text-[10px]">{t("accounting.total")}</td>
                  <td className="py-3 px-3 font-black text-amber-500 font-mono text-[12px]">{fmtINR(totalSales)}</td>
                  <td className="py-3 px-3 font-black text-purple-400 font-mono text-[12px]">{fmtINR(totalPurchases)}</td>
                  <td className={`py-3 px-3 font-black font-mono text-[12px] ${grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtINR(grossProfit)}</td>
                  <td className={`py-3 px-3 font-black font-mono text-[12px] ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtINR(netProfit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}