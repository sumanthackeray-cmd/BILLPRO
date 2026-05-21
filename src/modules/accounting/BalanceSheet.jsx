import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountingService, computeBalanceSheet, fmtINR } from './accountingService';
import { base44 } from '@/api/base44Client';
import { Scale, CheckCircle2, Download, AlertTriangle, Info, Calendar } from 'lucide-react';

export default function BalanceSheet() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({ queryKey: ['accounts'], queryFn: accountingService.getAccounts });
  const { data: journals = [], isLoading: journalsLoading } = useQuery({ queryKey: ['journal-entries'], queryFn: accountingService.getJournalEntries });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-date", 500) });
  const { data: purchases = [] } = useQuery({ queryKey: ["purchases"], queryFn: () => base44.entities.Purchase.list("-date", 300) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 300) });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: () => base44.entities.Loan.list() });

  const isLoading = accountsLoading || journalsLoading;

  const bsData = useMemo(() => {
    if (isLoading) return { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, retainedEarningsCurrent: 0, totalEquity: 0, totalLiabilitiesAndEquity: 0, isBalanced: true };
    const filteredJournals = journals.filter(j => j.date <= asOfDate);
    const filteredInvoices = invoices.filter(i => (i.date || i.created_date) <= asOfDate);
    const filteredPurchases = purchases.filter(p => (p.date || p.created_date) <= asOfDate);
    const filteredExpenses = expenses.filter(e => (e.date || e.created_date) <= asOfDate);
    return computeBalanceSheet(accounts, filteredJournals, filteredInvoices, filteredPurchases, filteredExpenses, loans);
  }, [accounts, journals, invoices, purchases, expenses, loans, asOfDate, isLoading]);

  const assetCategories = useMemo(() => {
    const cats = {};
    bsData.assets.forEach(a => {
      const k = a.category || "Other Assets";
      if (!cats[k]) cats[k] = [];
      cats[k].push(a);
    });
    return cats;
  }, [bsData.assets]);

  const liabilityCategories = useMemo(() => {
    const cats = {};
    bsData.liabilities.forEach(l => {
      const k = l.category || "Other Liabilities";
      if (!cats[k]) cats[k] = [];
      cats[k].push(l);
    });
    return cats;
  }, [bsData.liabilities]);

  const exportStatement = () => {
    let csv = `data:text/csv;charset=utf-8,Balance Sheet Statement (As of ${asOfDate})\n\n`;
    csv += "Liabilities & Equity,Amount,Assets,Amount\n";
    const leList = [{ name: "LIABILITIES", amt: "" }];
    bsData.liabilities.forEach(l => leList.push({ name: `  ${l.name}`, amt: l.credit }));
    leList.push({ name: "EQUITY", amt: "" });
    bsData.equity.forEach(e => leList.push({ name: `  ${e.name}`, amt: e.credit }));
    leList.push({ name: "  Current Retained Earnings", amt: bsData.retainedEarningsCurrent });
    leList.push({ name: "TOTAL LIABILITIES & EQUITY", amt: bsData.totalLiabilitiesAndEquity });
    const aList = [{ name: "ASSETS", amt: "" }];
    bsData.assets.forEach(a => aList.push({ name: `  ${a.name}`, amt: a.debit }));
    aList.push({ name: "TOTAL ASSETS", amt: bsData.totalAssets });
    const maxLen = Math.max(leList.length, aList.length);
    for (let i = 0; i < maxLen; i++) {
      const le = leList[i] || { name: "", amt: "" };
      const a = aList[i] || { name: "", amt: "" };
      csv += `"${le.name}","${le.amt}","${a.name}","${a.amt}"\n`;
    }
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `balance_sheet_${asOfDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Asset/Liability ratio for visual indicator
  const balanceRatio = bsData.totalLiabilitiesAndEquity > 0
    ? Math.min((bsData.totalAssets / bsData.totalLiabilitiesAndEquity) * 100, 100)
    : 0;

  return (
    <div className="space-y-4">

      {/* ── Balance Equation Verifier ── */}
      {!isLoading && (
        <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm ${
          bsData.isBalanced ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-orange-500/5 border-orange-500/20'
        }`}>
          <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -mr-20 -mt-20 ${bsData.isBalanced ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`} />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-4 items-start">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                bsData.isBalanced ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500' : 'bg-orange-500/15 border-orange-500/30 text-orange-500'
              }`}>
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h4 className={`font-black text-base ${bsData.isBalanced ? 'text-emerald-500' : 'text-orange-500'}`}>
                  {bsData.isBalanced ? '✅ Balance Sheet Equation Balanced' : '⚠️ Balance Sheet Imbalance Detected'}
                </h4>
                <p className="text-[12px] text-muted-foreground mt-1">
                  {bsData.isBalanced
                    ? `Assets (${fmtINR(bsData.totalAssets)}) = Liabilities + Equity (${fmtINR(bsData.totalLiabilitiesAndEquity)}). Accounting equation satisfied.`
                    : `Discrepancy: Assets ${fmtINR(bsData.totalAssets)} ≠ Liabilities + Equity ${fmtINR(bsData.totalLiabilitiesAndEquity)}. Difference: ${fmtINR(Math.abs(bsData.totalAssets - bsData.totalLiabilitiesAndEquity))}.`
                  }
                </p>

                {/* Balance bar */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase">Assets</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-48">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${bsData.isBalanced ? 'bg-emerald-500' : 'bg-orange-500'}`}
                      style={{ width: `${balanceRatio}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-bold uppercase">Liabilities</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] text-muted-foreground font-bold">As of:</span>
                </div>
                <input
                  type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)}
                  className="bg-background border border-border text-foreground rounded-xl px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
              <button
                onClick={exportStatement}
                className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border text-foreground font-bold hover:bg-muted/70 rounded-xl text-[11px] transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Two-Column Statement ── */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Left: Assets */}
          <div className="bg-card border border-emerald-500/20 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="px-5 py-3.5 border-b border-emerald-500/15 bg-emerald-500/5 flex justify-between items-center">
              <h3 className="font-black text-sm text-emerald-500 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <span className="text-emerald-500 font-black text-[11px]">A</span>
                </div>
                ASSETS (What We Own)
              </h3>
              <span className="font-mono font-black text-emerald-500 text-sm">{fmtINR(bsData.totalAssets)}</span>
            </div>

            <div className="p-4 space-y-3 flex-1 text-[12px]">
              {Object.keys(assetCategories).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground italic text-[11px]">No asset balances found.</div>
              ) : (
                Object.entries(assetCategories).map(([cat, items]) => (
                  <div key={cat} className="space-y-1">
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 bg-muted/30 px-2.5 py-1 rounded-lg border border-border/30">
                      {cat}
                    </div>
                    <div className="divide-y divide-border/20">
                      {items.map(a => (
                        <div key={a.code} className="flex justify-between py-1.5 px-2 hover:bg-muted/15 rounded-lg transition-colors">
                          <span className="text-foreground font-medium">{a.name}</span>
                          <span className="font-mono font-bold text-foreground">{fmtINR(a.debit)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 bg-emerald-500/8 border-t border-emerald-500/15 flex justify-between items-center">
              <span className="font-black text-[12px] text-emerald-500 uppercase tracking-wider">TOTAL ASSETS</span>
              <span className="font-mono font-black text-emerald-500 text-base">{fmtINR(bsData.totalAssets)}</span>
            </div>
          </div>

          {/* Right: Liabilities & Equity */}
          <div className="bg-card border border-orange-500/20 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="px-5 py-3.5 border-b border-orange-500/15 bg-orange-500/5 flex justify-between items-center">
              <h3 className="font-black text-sm text-orange-500 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <span className="text-orange-500 font-black text-[11px]">L+E</span>
                </div>
                LIABILITIES & EQUITY
              </h3>
              <span className="font-mono font-black text-orange-500 text-sm">{fmtINR(bsData.totalLiabilitiesAndEquity)}</span>
            </div>

            <div className="p-4 space-y-4 flex-1 text-[12px]">
              {/* Liabilities */}
              <div className="space-y-2">
                <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="flex-1 h-px bg-orange-500/20" />
                  LIABILITIES (What We Owe)
                  <div className="flex-1 h-px bg-orange-500/20" />
                </div>
                {Object.keys(liabilityCategories).length === 0 ? (
                  <div className="text-center py-3 text-muted-foreground italic text-[11px]">No liability balances.</div>
                ) : (
                  Object.entries(liabilityCategories).map(([cat, items]) => (
                    <div key={cat} className="space-y-1">
                      <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 bg-muted/30 px-2.5 py-1 rounded-lg border border-border/30">
                        {cat}
                      </div>
                      <div className="divide-y divide-border/20">
                        {items.map(l => (
                          <div key={l.code} className="flex justify-between py-1.5 px-2 hover:bg-muted/15 rounded-lg transition-colors">
                            <span className="text-foreground font-medium">{l.name}</span>
                            <span className="font-mono font-bold text-foreground">{fmtINR(l.credit)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Equity */}
              <div className="space-y-2 pt-2">
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="flex-1 h-px bg-blue-500/20" />
                  OWNERS' EQUITY / CAPITAL
                  <div className="flex-1 h-px bg-blue-500/20" />
                </div>
                <div className="divide-y divide-border/20">
                  {bsData.equity.map(e => (
                    <div key={e.code} className="flex justify-between py-1.5 px-2 hover:bg-muted/15 rounded-lg transition-colors">
                      <span className="text-foreground font-medium">{e.name}</span>
                      <span className="font-mono font-bold text-foreground">{fmtINR(e.credit)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 px-2 hover:bg-muted/15 rounded-lg transition-colors">
                    <span className="text-foreground font-medium">Retained Earnings (P&L Current Period)</span>
                    <span className={`font-mono font-bold ${bsData.retainedEarningsCurrent >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                      {fmtINR(bsData.retainedEarningsCurrent)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-orange-500/8 border-t border-orange-500/15 flex justify-between items-center">
              <span className="font-black text-[12px] text-orange-500 uppercase tracking-wider">TOTAL L + EQUITY</span>
              <span className="font-mono font-black text-orange-500 text-base">{fmtINR(bsData.totalLiabilitiesAndEquity)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
