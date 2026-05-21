import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountingService, computeTrialBalance, fmtINR } from './accountingService';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Download, Scale, AlertTriangle, Info } from 'lucide-react';

const TYPE_CONFIG = {
  Asset:     { badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', row: 'hover:bg-emerald-500/5' },
  Liability: { badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20', row: 'hover:bg-orange-500/5' },
  Equity:    { badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20', row: 'hover:bg-blue-500/5' },
  Revenue:   { badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20', row: 'hover:bg-amber-500/5' },
  Expense:   { badge: 'bg-red-500/10 text-red-500 border-red-500/20', row: 'hover:bg-red-500/5' },
};

export default function TrialBalance() {
  const [selectedType, setSelectedType] = useState('All');

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({ queryKey: ['accounts'], queryFn: accountingService.getAccounts });
  const { data: journals = [], isLoading: journalsLoading } = useQuery({ queryKey: ['journal-entries'], queryFn: accountingService.getJournalEntries });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-date", 500) });
  const { data: purchases = [] } = useQuery({ queryKey: ["purchases"], queryFn: () => base44.entities.Purchase.list("-date", 300) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 300) });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: () => base44.entities.Loan.list() });

  const trialBalance = useMemo(() => {
    if (accountsLoading || journalsLoading) return { accounts: [], totalDebits: 0, totalCredits: 0, isBalanced: true };
    return computeTrialBalance(accounts, journals, invoices, purchases, expenses, loans);
  }, [accounts, journals, invoices, purchases, expenses, loans, accountsLoading, journalsLoading]);

  const filteredAccounts = useMemo(() => {
    if (selectedType === 'All') return trialBalance.accounts;
    return trialBalance.accounts.filter(a => a.type === selectedType);
  }, [trialBalance.accounts, selectedType]);

  // Type totals
  const typeTotals = useMemo(() => {
    const result = {};
    ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].forEach(t => {
      const rows = trialBalance.accounts.filter(a => a.type === t);
      result[t] = {
        debit: rows.reduce((s, a) => s + a.debit, 0),
        credit: rows.reduce((s, a) => s + a.credit, 0),
        count: rows.length
      };
    });
    return result;
  }, [trialBalance.accounts]);

  const exportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,Account Code,Account Name,Type,Category,Debit,Credit\n";
    trialBalance.accounts.forEach(a => {
      csv += `"${a.code}","${a.name}","${a.type}","${a.category || ''}","${a.debit || 0}","${a.credit || 0}"\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `trial_balance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = accountsLoading || journalsLoading;

  return (
    <div className="space-y-4">

      {/* ── Balance Verification Card ── */}
      {!isLoading && (
        <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm ${
          trialBalance.isBalanced
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-orange-500/5 border-orange-500/20'
        }`}>
          <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -mr-20 -mt-20 ${trialBalance.isBalanced ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`} />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-4 items-start">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                trialBalance.isBalanced ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500' : 'bg-orange-500/15 border-orange-500/30 text-orange-500'
              }`}>
                {trialBalance.isBalanced ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h4 className={`font-black text-base ${trialBalance.isBalanced ? 'text-emerald-500' : 'text-orange-500'}`}>
                  {trialBalance.isBalanced ? '✅ Trial Balance Verified & Balanced' : '⚠️ Accounting Ledger Out of Balance'}
                </h4>
                <p className="text-[12px] text-muted-foreground mt-1 max-w-lg">
                  {trialBalance.isBalanced
                    ? `All general ledger account credits match debits. Double-entry validation successful.`
                    : `Warning: Total debits (${fmtINR(trialBalance.totalDebits)}) do not match total credits (${fmtINR(trialBalance.totalCredits)}). Discrepancy: ${fmtINR(Math.abs(trialBalance.totalDebits - trialBalance.totalCredits))}.`
                  }
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              {/* Grand totals */}
              <div className="flex gap-4 text-center">
                <div className="px-4 py-2 bg-background/60 border border-emerald-500/20 rounded-xl">
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Total Debits</p>
                  <p className="text-base font-black font-mono text-emerald-500 mt-0.5">{fmtINR(trialBalance.totalDebits)}</p>
                </div>
                <div className="px-4 py-2 bg-background/60 border border-orange-500/20 rounded-xl">
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Total Credits</p>
                  <p className="text-base font-black font-mono text-orange-500 mt-0.5">{fmtINR(trialBalance.totalCredits)}</p>
                </div>
              </div>

              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border text-foreground font-bold hover:bg-muted/70 rounded-xl text-[11px] transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Type Filter Tabs ── */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {['All', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(t => {
            const cfg = TYPE_CONFIG[t];
            const total = t === 'All' ? trialBalance.accounts.length : (typeTotals[t]?.count || 0);
            return (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${
                  selectedType === t
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500/50 shadow-md'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'All' ? 'All Accounts' : `${t}s`}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                  selectedType === t ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}>{total}</span>
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium">
          <Info className="w-3.5 h-3.5 text-amber-500" />
          Only lists accounts with posting activity.
        </div>
      </div>

      {/* ── Trial Balance Table ── */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] text-left min-w-[700px]">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-24">Code</th>
                  <th className="py-3 px-4">Ledger Account Name</th>
                  <th className="py-3 px-4 w-28">Type</th>
                  <th className="py-3 px-4 w-36">Category</th>
                  <th className="py-3 px-4 w-36 text-right">Debit (Dr)</th>
                  <th className="py-3 px-4 w-36 text-right">Credit (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Scale className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-muted-foreground font-medium">No posting activity found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map(act => {
                    const cfg = TYPE_CONFIG[act.type] || TYPE_CONFIG.Asset;
                    return (
                      <tr key={act.code} className={`transition-colors ${cfg.row}`}>
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-amber-500 text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {act.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">{act.name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${cfg.badge}`}>
                            {act.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-medium text-[11px]">{act.category || '—'}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-500">
                          {act.debit > 0 ? fmtINR(act.debit) : <span className="text-muted-foreground/30">—</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-orange-500">
                          {act.credit > 0 ? fmtINR(act.credit) : <span className="text-muted-foreground/30">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 border-t-2 border-border font-black">
                  <td colSpan="4" className="py-3 px-4 text-[12px] text-muted-foreground font-black text-right uppercase tracking-wider">
                    Grand Trial Balance Totals:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-500 font-black text-[13px]">
                    {fmtINR(trialBalance.totalDebits)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-orange-500 font-black text-[13px]">
                    {fmtINR(trialBalance.totalCredits)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
