import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountingService, computeProfitLoss } from '@/modules/accounting/accountingService';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Download } from 'lucide-react';

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtK   = (v) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`;

export default function ProfitLoss() {
  const fyStart = `${new Date().getFullYear()}-04-01`;
  const today   = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState(fyStart);
  const [to,   setTo]   = useState(today);

  const { data: entries   = [] } = useQuery({ queryKey: ['journalEntries'], queryFn: accountingService.getJournalEntries });
  const { data: invoices  = [] } = useQuery({ queryKey: ['invoices'],  queryFn: () => base44.entities.Invoice.list('-date', 500) });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => base44.entities.Purchase.list('-date', 300) });
  const { data: expenses  = [] } = useQuery({ queryKey: ['expenses'],  queryFn: () => base44.entities.Expense.list('-date', 300) });

  const pl = useMemo(() =>
    computeProfitLoss(entries, invoices, purchases, expenses, from, to),
    [entries, invoices, purchases, expenses, from, to]);

  // Monthly breakdown for chart
  const chartData = useMemo(() => {
    const months = {};
    invoices.filter(i => i.type === 'sale').forEach(i => {
      const mk = i.date?.substring(0, 7);
      if (!mk || i.date < from || i.date > to) return;
      if (!months[mk]) months[mk] = { month: mk, Revenue: 0, Expenses: 0 };
      months[mk].Revenue += (i.grand_total || 0);
    });
    expenses.forEach(e => {
      const mk = e.date?.substring(0, 7);
      if (!mk || e.date < from || e.date > to) return;
      if (!months[mk]) months[mk] = { month: mk, Revenue: 0, Expenses: 0 };
      months[mk].Expenses += (e.amount || 0);
    });
    return Object.values(months)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({ ...m, month: new Date(m.month + '-01').toLocaleString('en-IN', { month: 'short', year: '2-digit' }), 'Net Profit': m.Revenue - m.Expenses }));
  }, [invoices, expenses, from, to]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-[11px]">
        <p className="font-bold text-muted-foreground mb-1">{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {fmtINR(p.value)}</p>)}
      </div>
    );
  };

  const profitMargin = pl.totalIncome > 0 ? ((pl.netProfit / pl.totalIncome) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Profit & Loss Statement</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time P&L · Reads from journal entries + existing invoices/expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <span className="text-muted-foreground text-xs">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: fmtINR(pl.totalIncome), icon: TrendingUp, color: 'text-yellow-400', border: 'border-yellow-500/25', bg: 'bg-yellow-500/10' },
          { label: 'Cost of Goods', value: fmtINR(pl.purchaseExpense), icon: TrendingDown, color: 'text-purple-400', border: 'border-purple-500/25', bg: 'bg-purple-500/10' },
          { label: 'Gross Profit', value: fmtINR(pl.grossProfit), icon: TrendingUp, color: pl.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400', border: pl.grossProfit >= 0 ? 'border-emerald-500/25' : 'border-red-500/25', bg: 'bg-emerald-500/10' },
          { label: 'Net Profit', value: fmtINR(pl.netProfit), icon: pl.netProfit >= 0 ? TrendingUp : TrendingDown, color: pl.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400', border: pl.netProfit >= 0 ? 'border-emerald-500/25' : 'border-red-500/25', bg: pl.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
        ].map(c => (
          <div key={c.label} className={`bg-card border ${c.border} rounded-xl p-4`}>
            <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className={`text-lg font-black ${c.color} leading-tight`}>{c.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* P&L Statement */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-4">📋 P&L Statement</h3>
          <div className="space-y-1 text-[12px]">
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="font-semibold text-foreground">Sales Revenue</span>
              <span className="font-mono text-yellow-400">{fmtINR(pl.salesRevenue)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="font-semibold text-foreground pl-4">Less: Cost of Goods Sold</span>
              <span className="font-mono text-red-400">({fmtINR(pl.purchaseExpense)})</span>
            </div>
            <div className="flex justify-between py-2 border-b-2 border-border font-extrabold">
              <span className="text-foreground">Gross Profit</span>
              <span className={`font-mono ${pl.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtINR(pl.grossProfit)}</span>
            </div>
            <div className="pt-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">Operating Expenses</p>
              {Object.entries(pl.expenseAccounts).map(([code, val]) => (
                <div key={code} className="flex justify-between py-1 border-b border-border/20">
                  <span className="text-muted-foreground pl-4">{code}</span>
                  <span className="font-mono text-orange-400">({fmtINR(val)})</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="font-semibold text-foreground pl-4">Other Expenses</span>
                <span className="font-mono text-orange-400">({fmtINR(pl.otherExpenses)})</span>
              </div>
            </div>
            <div className="flex justify-between py-2 mt-2 border-t-2 border-border font-extrabold text-[14px]">
              <span className="text-foreground">Net Profit / (Loss)</span>
              <span className={`font-mono ${pl.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtINR(pl.netProfit)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-t border-border/40">
              <span className="text-muted-foreground">Profit Margin</span>
              <span className={`font-bold ${Number(profitMargin) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{profitMargin}%</span>
            </div>
          </div>
        </div>

        {/* Monthly Chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-4">📈 Monthly Trend</h3>
          {chartData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data for selected period</div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(220,15%,55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(220,15%,55%)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Revenue"  fill="hsl(36,90%,55%)"  radius={[3,3,0,0]} />
                  <Bar dataKey="Expenses" fill="hsl(0,84%,60%)"   radius={[3,3,0,0]} />
                  <Bar dataKey="Net Profit" fill="hsl(160,72%,39%)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
