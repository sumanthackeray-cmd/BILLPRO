import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountingService, computeTrialBalance } from '@/modules/accounting/accountingService';
import { Download, Scale, CheckCircle, XCircle } from 'lucide-react';

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function TrialBalance() {
  const [filterType, setFilterType] = useState('All');

  const { data: accounts = [] } = useQuery({ queryKey: ['chartOfAccounts'], queryFn: accountingService.getAccounts });
  const { data: entries  = [], isLoading } = useQuery({ queryKey: ['journalEntries'], queryFn: accountingService.getJournalEntries });

  const rows = useMemo(() => computeTrialBalance(accounts, entries), [accounts, entries]);

  const filtered = useMemo(() =>
    filterType === 'All' ? rows : rows.filter(r => r.type === filterType),
    [rows, filterType]);

  const grandDebit  = filtered.reduce((s, r) => s + r.totalDebit,  0);
  const grandCredit = filtered.reduce((s, r) => s + r.totalCredit, 0);
  const isBalanced  = Math.abs(grandDebit - grandCredit) < 1;

  const TYPE_COLORS = {
    Asset: 'text-blue-400', Liability: 'text-red-400',
    Equity: 'text-purple-400', Income: 'text-emerald-400', Expense: 'text-orange-400',
  };
  const TYPES = ['All', 'Asset', 'Liability', 'Equity', 'Income', 'Expense'];

  const exportCSV = () => {
    const rows2 = [['Code', 'Account', 'Type', 'Sub-Type', 'Debit', 'Credit', 'Balance']];
    filtered.forEach(r => rows2.push([r.code, r.name, r.type, r.subType, r.totalDebit, r.totalCredit, r.closingBalance]));
    const csv = rows2.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'trial_balance.csv'; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Trial Balance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Aggregated debit/credit totals for all accounts · Posted entries only</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${isBalanced ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {isBalanced ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {isBalanced ? 'Balanced ✓' : 'Out of Balance!'}
          </div>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-muted-foreground text-xs font-bold hover:bg-secondary transition-all">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${filterType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/40 border-border/40 text-muted-foreground hover:bg-secondary'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Grand Totals Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-blue-500/30 rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total Debits</p>
          <p className="text-xl font-black text-blue-400 mt-1">{fmtINR(grandDebit)}</p>
        </div>
        <div className="bg-card border border-emerald-500/30 rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total Credits</p>
          <p className="text-xl font-black text-emerald-400 mt-1">{fmtINR(grandCredit)}</p>
        </div>
        <div className={`bg-card border rounded-xl p-4 ${isBalanced ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Difference</p>
          <p className={`text-xl font-black mt-1 ${isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmtINR(Math.abs(grandDebit - grandCredit))}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Scale className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-bold text-muted-foreground">No data yet. Add journal entries to see the trial balance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {['Code', 'Account Name', 'Type', 'Debit', 'Credit', 'Balance'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.code} className={`border-b border-border/30 hover:bg-accent/20 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{r.code}</td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{r.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold ${TYPE_COLORS[r.type]}`}>{r.type}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-blue-400">{r.totalDebit > 0 ? fmtINR(r.totalDebit) : '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-emerald-400">{r.totalCredit > 0 ? fmtINR(r.totalCredit) : '—'}</td>
                    <td className={`px-4 py-2.5 font-mono font-bold ${r.closingBalance >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {fmtINR(Math.abs(r.closingBalance))} {r.closingBalance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/30">
                  <td colSpan={3} className="px-4 py-3 font-extrabold text-foreground uppercase tracking-wider text-[11px]">GRAND TOTAL</td>
                  <td className="px-4 py-3 font-mono font-extrabold text-blue-400">{fmtINR(grandDebit)}</td>
                  <td className="px-4 py-3 font-mono font-extrabold text-emerald-400">{fmtINR(grandCredit)}</td>
                  <td className={`px-4 py-3 font-mono font-extrabold ${isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isBalanced ? '✓ Balanced' : fmtINR(Math.abs(grandDebit - grandCredit))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
