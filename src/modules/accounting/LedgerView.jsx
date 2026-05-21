import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountingService, computeLedger } from '@/modules/accounting/accountingService';
import { Download, BookOpen } from 'lucide-react';

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function LedgerView() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfYear = `${new Date().getFullYear()}-04-01`;

  const [selectedCode, setSelectedCode] = useState('');
  const [from, setFrom] = useState(firstOfYear);
  const [to, setTo]   = useState(today);

  const { data: accounts = [] } = useQuery({ queryKey: ['chartOfAccounts'], queryFn: accountingService.getAccounts });
  const { data: entries  = [], isLoading } = useQuery({ queryKey: ['journalEntries'], queryFn: accountingService.getJournalEntries });

  const filteredEntries = useMemo(() =>
    entries.filter(je => {
      const d = je.date;
      return (!from || d >= from) && (!to || d <= to);
    }), [entries, from, to]);

  const ledgerLines = useMemo(() =>
    selectedCode ? computeLedger(filteredEntries, selectedCode) : [],
    [filteredEntries, selectedCode]);

  const selectedAcc = accounts.find(a => a.code === selectedCode);
  const totalDebit  = ledgerLines.reduce((s, l) => s + l.debit,  0);
  const totalCredit = ledgerLines.reduce((s, l) => s + l.credit, 0);
  const closingBal  = ledgerLines.length > 0 ? ledgerLines[ledgerLines.length - 1].balance : 0;

  const exportCSV = () => {
    const rows = [['Date', 'Entry No', 'Description', 'Debit', 'Credit', 'Balance']];
    ledgerLines.forEach(l => rows.push([l.date, l.entryNumber, l.description, l.debit, l.credit, l.balance]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `ledger_${selectedCode}.csv`; a.click();
  };

  const sortedAccounts = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Account Ledger</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Running balance per account · Select account to view transactions</p>
        </div>
        {ledgerLines.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-muted-foreground text-xs font-bold hover:bg-secondary transition-all">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account</label>
          <select value={selectedCode} onChange={e => setSelectedCode(e.target.value)}
            className="mt-1 w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
            <option value="">— Select Account —</option>
            {sortedAccounts.map(a => <option key={a.id} value={a.code}>{a.code} — {a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="mt-1 w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="mt-1 w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
      </div>

      {/* Summary Cards */}
      {selectedAcc && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Account', value: `${selectedAcc.code} — ${selectedAcc.name}`, color: 'text-foreground' },
            { label: 'Total Debit', value: fmtINR(totalDebit), color: 'text-blue-400' },
            { label: 'Total Credit', value: fmtINR(totalCredit), color: 'text-emerald-400' },
            { label: 'Closing Balance', value: fmtINR(Math.abs(closingBal)), color: closingBal >= 0 ? 'text-yellow-400' : 'text-red-400' },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{c.label}</p>
              <p className={`text-sm font-black mt-1 truncate ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {!selectedCode ? (
          <div className="p-10 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-bold text-muted-foreground">Select an account to view its ledger</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : ledgerLines.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">No transactions for this account in the selected period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {['Date', 'Entry No', 'Description', 'Ref', 'Debit', 'Credit', 'Balance'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledgerLines.map((l, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{l.date}</td>
                    <td className="px-4 py-2.5 font-mono text-primary text-[11px]">{l.entryNumber}</td>
                    <td className="px-4 py-2.5 text-foreground max-w-[200px] truncate">{l.description}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-[11px]">{l.reference || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-blue-400">{l.debit > 0 ? fmtINR(l.debit) : '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-emerald-400">{l.credit > 0 ? fmtINR(l.credit) : '—'}</td>
                    <td className={`px-4 py-2.5 font-mono font-bold ${l.balance >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {fmtINR(Math.abs(l.balance))} {l.balance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/20">
                  <td colSpan={4} className="px-4 py-2.5 font-extrabold text-foreground text-[11px] uppercase tracking-wider">Totals</td>
                  <td className="px-4 py-2.5 font-mono font-extrabold text-blue-400">{fmtINR(totalDebit)}</td>
                  <td className="px-4 py-2.5 font-mono font-extrabold text-emerald-400">{fmtINR(totalCredit)}</td>
                  <td className={`px-4 py-2.5 font-mono font-extrabold ${closingBal >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {fmtINR(Math.abs(closingBal))} {closingBal >= 0 ? 'Dr' : 'Cr'}
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
