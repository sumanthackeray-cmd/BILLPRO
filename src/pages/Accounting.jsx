import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, getMonth } from "@/lib/gst-utils";
import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Receipt, CreditCard } from "lucide-react";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(new Date().getFullYear(), i, 1);
  return { key: d.toISOString().slice(0, 7), label: d.toLocaleString("en-IN", { month: "short" }) };
});

export default function Accounting() {
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
    { label: "Total Revenue", value: fmtINR(totalSales), icon: TrendingUp, color: "text-yellow-400", border: "border-yellow-500/25", bg: "bg-yellow-500/10" },
    { label: "Total Purchases", value: fmtINR(totalPurchases), icon: Receipt, color: "text-purple-400", border: "border-purple-500/25", bg: "bg-purple-500/10" },
    { label: "Total Expenses", value: fmtINR(totalExpenses), icon: CreditCard, color: "text-red-400", border: "border-red-500/25", bg: "bg-red-500/10" },
    { label: "Gross Profit", value: fmtINR(grossProfit), icon: DollarSign, color: grossProfit >= 0 ? "text-emerald-400" : "text-red-400", border: grossProfit >= 0 ? "border-emerald-500/25" : "border-red-500/25", bg: grossProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10" },
    { label: "Net Profit", value: fmtINR(netProfit), icon: BarChart2, color: netProfit >= 0 ? "text-emerald-400" : "text-red-400", border: netProfit >= 0 ? "border-emerald-500/25" : "border-red-500/25", bg: netProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10" },
    { label: "GST Collected", value: fmtINR(totalTax), icon: BarChart2, color: "text-blue-400", border: "border-blue-500/25", bg: "bg-blue-500/10" },
    { label: "Profit Margin", value: `${profitMargin}%`, icon: TrendingUp, color: Number(profitMargin) >= 0 ? "text-emerald-400" : "text-red-400", border: "border-teal-500/25", bg: "bg-teal-500/10" },
    { label: "Loan Liability", value: fmtINR(totalLoanDebt), icon: CreditCard, color: "text-orange-400", border: "border-orange-500/25", bg: "bg-orange-500/10" },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-[11px]">
        <p className="text-muted-foreground font-semibold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {fmtINR(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">📒 Accounting & P&L</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Full financial overview & profit/loss analysis</p>
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="bg-card border border-border text-foreground rounded-lg px-3 py-2 text-[13px] font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map(card => (
          <div key={card.label} className={`bg-card border ${card.border} rounded-xl p-4`}>
            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className={`text-lg font-black ${card.color} leading-tight`}>{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* P&L Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm text-foreground mb-4">📊 Monthly Revenue & Profit — {year}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearMonths} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "hsl(220,30%,93%)" }} />
              <Bar dataKey="Sales" fill="hsl(36,90%,55%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Purchases" fill="hsl(263,70%,65%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Expenses" fill="hsl(0,84%,60%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-4">📈 Profit Trend — {year}</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearMonths}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "hsl(220,30%,93%)" }} />
                <Line type="monotone" dataKey="Gross Profit" stroke="hsl(36,90%,55%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Net Profit" stroke="hsl(160,72%,39%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly P&L Table */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-4">📋 Monthly Summary Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  {["Month", "Sales", "Cost", "Gross", "Net"].map(h => (
                    <th key={h} className="text-left py-1.5 px-1 text-muted-foreground font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearMonths.map(m => (
                  <tr key={m.mk} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                    <td className="py-1.5 px-1 font-semibold text-foreground">{m.month}</td>
                    <td className="py-1.5 px-1 text-yellow-400 font-mono">{m.Sales > 0 ? `₹${(m.Sales / 1000).toFixed(1)}k` : "—"}</td>
                    <td className="py-1.5 px-1 text-purple-400 font-mono">{m.Purchases > 0 ? `₹${(m.Purchases / 1000).toFixed(1)}k` : "—"}</td>
                    <td className={`py-1.5 px-1 font-mono font-bold ${m["Gross Profit"] >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {m["Gross Profit"] !== 0 ? `₹${(m["Gross Profit"] / 1000).toFixed(1)}k` : "—"}
                    </td>
                    <td className={`py-1.5 px-1 font-mono font-bold ${m["Net Profit"] >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {m["Net Profit"] !== 0 ? `₹${(m["Net Profit"] / 1000).toFixed(1)}k` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="py-2 px-1 font-black text-foreground">Total</td>
                  <td className="py-2 px-1 font-black text-yellow-400 font-mono">{fmtINR(totalSales)}</td>
                  <td className="py-2 px-1 font-black text-purple-400 font-mono">{fmtINR(totalPurchases)}</td>
                  <td className={`py-2 px-1 font-black font-mono ${grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtINR(grossProfit)}</td>
                  <td className={`py-2 px-1 font-black font-mono ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtINR(netProfit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}