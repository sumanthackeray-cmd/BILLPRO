import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountingService, computeProfitLoss, fmtINR } from './accountingService';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Receipt, CreditCard, Download, Calendar, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function ProfitLoss() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({ queryKey: ['accounts'], queryFn: accountingService.getAccounts });
  const { data: journals = [], isLoading: journalsLoading } = useQuery({ queryKey: ['journal-entries'], queryFn: accountingService.getJournalEntries });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-date", 500) });
  const { data: purchases = [] } = useQuery({ queryKey: ["purchases"], queryFn: () => base44.entities.Purchase.list("-date", 300) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 300) });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: () => base44.entities.Loan.list() });

  const isLoading = accountsLoading || journalsLoading;

  const plData = useMemo(() => {
    if (isLoading) return { revenues: [], directExpenses: [], indirectExpenses: [], totalRevenue: 0, totalDirectCost: 0, grossProfit: 0, totalIndirectCost: 0, netProfit: 0 };
    let filteredJournals = journals;
    let filteredInvoices = invoices;
    let filteredPurchases = purchases;
    let filteredExpenses = expenses;
    if (startDate) {
      filteredJournals = journals.filter(j => j.date >= startDate);
      filteredInvoices = invoices.filter(i => (i.date || i.created_date) >= startDate);
      filteredPurchases = purchases.filter(p => (p.date || p.created_date) >= startDate);
      filteredExpenses = expenses.filter(e => (e.date || e.created_date) >= startDate);
    }
    if (endDate) {
      filteredJournals = journals.filter(j => j.date <= endDate);
      filteredInvoices = invoices.filter(i => (i.date || i.created_date) <= endDate);
      filteredPurchases = purchases.filter(p => (p.date || p.created_date) <= endDate);
      filteredExpenses = expenses.filter(e => (e.date || e.created_date) <= endDate);
    }
    return computeProfitLoss(accounts, filteredJournals, filteredInvoices, filteredPurchases, filteredExpenses, loans);
  }, [accounts, journals, invoices, purchases, expenses, loans, startDate, endDate, isLoading]);

  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    return months.map((m, idx) => {
      const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
      const sales = invoices.filter(i => i.type === "sale" && (i.date || i.created_date)?.startsWith(monthStr)).reduce((s, i) => s + (i.grand_total || 0), 0);
      const costs = purchases.filter(p => (p.date || p.created_date)?.startsWith(monthStr)).reduce((s, p) => s + (p.grand_total || 0), 0);
      const exps = expenses.filter(e => (e.date || e.created_date)?.startsWith(monthStr)).reduce((s, e) => s + (e.amount || 0), 0);
      return { name: m, Revenue: sales, COGS: costs, Expenses: exps, NetProfit: sales - costs - exps };
    });
  }, [invoices, purchases, expenses]);

  const exportStatement = () => {
    let csv = "data:text/csv;charset=utf-8,Profit & Loss Income Statement\n\nParticulars,Amount\n";
    csv += `Operating Revenue,${plData.totalRevenue}\n`;
    plData.revenues.forEach(r => { csv += `  ${r.name},${r.credit}\n`; });
    csv += `Cost of Goods Sold,${plData.totalDirectCost}\n`;
    plData.directExpenses.forEach(d => { csv += `  ${d.name},${d.debit}\n`; });
    csv += `GROSS PROFIT,${plData.grossProfit}\n\nIndirect Expenses,${plData.totalIndirectCost}\n`;
    plData.indirectExpenses.forEach(e => { csv += `  ${e.name},${e.debit}\n`; });
    csv += `OPERATING NET PROFIT,${plData.netProfit}\n`;
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `income_statement_pl_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const gpMargin = plData.totalRevenue > 0 ? ((plData.grossProfit / plData.totalRevenue) * 100).toFixed(1) : 0;
  const npMargin = plData.totalRevenue > 0 ? ((plData.netProfit / plData.totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4">

      {/* ── Date Filter & Export Bar ── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] text-muted-foreground font-bold">From:</span>
            <input
              type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-background border border-border text-foreground rounded-xl px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-bold">To:</span>
            <input
              type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-background border border-border text-foreground rounded-xl px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
        </div>
        <button
          onClick={exportStatement}
          className="flex items-center gap-1.5 px-3 py-2 bg-card hover:bg-muted/70 text-foreground border border-border font-bold rounded-xl text-[11px] transition-all shrink-0"
        >
          <Download className="w-3.5 h-3.5" /> Export Statement
        </button>
      </div>

      {/* ── Premium KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue / Sales", value: fmtINR(plData.totalRevenue), sub: `${invoices.length} invoices`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'from-amber-500/10' },
          { label: "Cost of Goods Sold", value: fmtINR(plData.totalDirectCost), sub: `${purchases.length} purchases`, icon: Receipt, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', glow: 'from-purple-500/10' },
          { label: "Gross Profit", value: fmtINR(plData.grossProfit), sub: `GP Margin: ${gpMargin}%`, icon: DollarSign, color: plData.grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500', bg: plData.grossProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10', border: plData.grossProfit >= 0 ? 'border-emerald-500/20' : 'border-red-500/20', glow: plData.grossProfit >= 0 ? 'from-emerald-500/10' : 'from-red-500/10' },
          { label: "Operating Net Profit", value: fmtINR(plData.netProfit), sub: `NP Margin: ${npMargin}%`, icon: BarChart2, color: plData.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500', bg: plData.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10', border: plData.netProfit >= 0 ? 'border-emerald-500/20' : 'border-red-500/20', glow: plData.netProfit >= 0 ? 'from-emerald-500/10' : 'from-red-500/10' },
        ].map((card, idx) => (
          <div key={idx} className={`relative overflow-hidden bg-card border ${card.border} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow`}>
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${card.glow} to-transparent rounded-full blur-2xl -mr-8 -mt-8`} />
            <div className="relative">
              <div className={`w-9 h-9 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center mb-3`}>
                <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
              </div>
              <p className={`text-lg font-black font-mono leading-tight ${card.color}`}>{card.value}</p>
              <p className="text-[10px] text-muted-foreground font-bold mt-1">{card.label}</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Income Statement + Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Income Statement */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm lg:col-span-7">
          <h3 className="font-black text-sm text-foreground mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 text-amber-500" />
            </div>
            Income Statement (P&L Account)
          </h3>

          <div className="space-y-4 text-[12px]">
            {/* Revenue */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-black text-foreground bg-amber-500/8 border border-amber-500/15 px-3 py-2 rounded-xl">
                <span>📈 Operating Revenue / Sales</span>
                <span className="font-mono text-amber-500">{fmtINR(plData.totalRevenue)}</span>
              </div>
              <div className="pl-4 space-y-1">
                {plData.revenues.map(r => (
                  <div key={r.code} className="flex justify-between py-1 px-2 text-[11px] text-muted-foreground hover:bg-muted/20 rounded-lg transition-colors">
                    <span>{r.name}</span>
                    <span className="font-mono font-semibold">{fmtINR(r.credit)}</span>
                  </div>
                ))}
                {plData.revenues.length === 0 && <div className="text-center py-2 text-[10px] italic text-muted-foreground">No operating revenue booked.</div>}
              </div>
            </div>

            {/* COGS */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-black text-foreground bg-purple-500/8 border border-purple-500/15 px-3 py-2 rounded-xl">
                <span>📦 Cost of Goods Sold (Direct)</span>
                <span className="font-mono text-purple-500">({fmtINR(plData.totalDirectCost)})</span>
              </div>
              <div className="pl-4 space-y-1">
                {plData.directExpenses.map(d => (
                  <div key={d.code} className="flex justify-between py-1 px-2 text-[11px] text-muted-foreground hover:bg-muted/20 rounded-lg transition-colors">
                    <span>{d.name}</span>
                    <span className="font-mono font-semibold">{fmtINR(d.debit)}</span>
                  </div>
                ))}
                {plData.directExpenses.length === 0 && <div className="text-center py-2 text-[10px] italic text-muted-foreground">No direct cost of sales booked.</div>}
              </div>
            </div>

            {/* Gross Profit */}
            <div className={`flex justify-between font-black text-[13px] px-4 py-3 rounded-xl border ${
              plData.grossProfit >= 0 ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-red-500/8 border-red-500/20'
            }`}>
              <span className="text-foreground">GROSS PROFIT / LOSS</span>
              <span className={`font-mono ${plData.grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {fmtINR(plData.grossProfit)}
              </span>
            </div>

            {/* Indirect Expenses */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-black text-foreground bg-red-500/8 border border-red-500/15 px-3 py-2 rounded-xl">
                <span>💼 Operating & Indirect Expenses</span>
                <span className="font-mono text-red-500">({fmtINR(plData.totalIndirectCost)})</span>
              </div>
              <div className="pl-4 space-y-1 max-h-40 overflow-y-auto pr-1">
                {plData.indirectExpenses.map(e => (
                  <div key={e.code} className="flex justify-between py-1 px-2 text-[11px] text-muted-foreground hover:bg-muted/20 rounded-lg transition-colors">
                    <span>{e.name}</span>
                    <span className="font-mono font-semibold">{fmtINR(e.debit)}</span>
                  </div>
                ))}
                {plData.indirectExpenses.length === 0 && <div className="text-center py-2 text-[10px] italic text-muted-foreground">No indirect business expenses booked.</div>}
              </div>
            </div>

            {/* Net Profit */}
            <div className={`flex justify-between font-black text-[14px] px-4 py-3.5 rounded-xl border-2 ${
              plData.netProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}>
              <span className="text-foreground">OPERATING NET PROFIT / LOSS</span>
              <div className="flex items-center gap-2">
                {plData.netProfit >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                <span className={`font-mono ${plData.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {fmtINR(plData.netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm lg:col-span-5 flex flex-col">
          <div className="mb-4">
            <h3 className="font-black text-sm text-foreground flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
              </div>
              Monthly Trend
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Current year revenue vs net profit</p>
          </div>

          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(43,90%,50%)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(43,90%,50%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160,72%,39%)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(160,72%,39%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontSize: 11, borderRadius: 12 }}
                  formatter={(value) => [fmtINR(value)]}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Area type="monotone" dataKey="Revenue" stroke="hsl(43,90%,50%)" strokeWidth={2} fill="url(#colorRevenue)" dot={{ r: 3, fill: 'hsl(43,90%,50%)' }} />
                <Area type="monotone" dataKey="NetProfit" stroke="hsl(160,72%,39%)" strokeWidth={2} fill="url(#colorProfit)" dot={{ r: 3, fill: 'hsl(160,72%,39%)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
