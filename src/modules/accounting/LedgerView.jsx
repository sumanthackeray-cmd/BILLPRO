import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountingService, computeLedger, fmtINR } from './accountingService';
import { base44 } from '@/api/base44Client';
import { BookOpen, Calendar, Download, Search, Tag, TrendingUp, Hash, BarChart2 } from 'lucide-react';

const SOURCE_BADGE = {
  'Journal':          'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Invoice (Bridge)': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Purchase (Bridge)':'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'Expense (Bridge)': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  'Loan (Bridge)':    'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
};

export default function LedgerView() {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccountName, setSelectedAccountName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({ queryKey: ['accounts'], queryFn: accountingService.getAccounts });
  const { data: journals = [] } = useQuery({ queryKey: ['journal-entries'], queryFn: accountingService.getJournalEntries });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-date", 500) });
  const { data: purchases = [] } = useQuery({ queryKey: ["purchases"], queryFn: () => base44.entities.Purchase.list("-date", 300) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 300) });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: () => base44.entities.Loan.list() });

  useMemo(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const defaultAcct = accounts.find(a => a.name.includes("Cash") || a.name.includes("Bank")) || accounts[0];
      setSelectedAccountId(defaultAcct.id);
      setSelectedAccountName(defaultAcct.name);
    }
  }, [accounts]);

  const handleAccountChange = (e) => {
    const actId = e.target.value;
    const act = accounts.find(a => a.id === actId);
    setSelectedAccountId(actId);
    setSelectedAccountName(act ? act.name : '');
  };

  const currentAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);

  const ledgerData = useMemo(() => {
    if (!selectedAccountId || !selectedAccountName) return { lines: [], closingBalance: 0, isDebitBalance: true };
    return computeLedger(selectedAccountId, selectedAccountName, journals, invoices, purchases, expenses, loans);
  }, [selectedAccountId, selectedAccountName, journals, invoices, purchases, expenses, loans]);

  const processedLedger = useMemo(() => {
    let filteredLines = [...ledgerData.lines];
    if (startDate) filteredLines = filteredLines.filter(l => l.date >= startDate);
    if (endDate) filteredLines = filteredLines.filter(l => l.date <= endDate);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredLines = filteredLines.filter(l =>
        l.reference?.toLowerCase().includes(term) ||
        l.narration?.toLowerCase().includes(term) ||
        l.type?.toLowerCase().includes(term)
      );
    }
    return {
      lines: filteredLines,
      totalDebits: filteredLines.reduce((s, l) => s + l.debit, 0),
      totalCredits: filteredLines.reduce((s, l) => s + l.credit, 0),
      closingBalance: ledgerData.closingBalance,
      isDebitBalance: ledgerData.isDebitBalance
    };
  }, [ledgerData, startDate, endDate, searchTerm]);

  const exportCSV = () => {
    if (!selectedAccountName) return;
    let csv = "data:text/csv;charset=utf-8,Date,Reference,Narration,Type,Debit,Credit,Running Balance\n";
    processedLedger.lines.forEach(l => {
      csv += `"${l.date}","${l.reference}","${l.narration || ''}","${l.type}","${l.debit || 0}","${l.credit || 0}","${l.runningBalance.toFixed(2)}"\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `ledger_${selectedAccountName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TYPE_COLOR = currentAccount
    ? { Asset: 'text-emerald-500', Liability: 'text-orange-500', Equity: 'text-blue-500', Revenue: 'text-amber-500', Expense: 'text-red-500' }[currentAccount.type] || 'text-foreground'
    : 'text-foreground';

  return (
    <div className="space-y-4">

      {/* ── Account Selector & Filters ── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">Select General Ledger Account *</label>
            <select
              disabled={accountsLoading}
              value={selectedAccountId}
              onChange={handleAccountChange}
              className="w-full bg-background border border-border text-foreground font-bold rounded-xl px-3 py-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              {accountsLoading ? (
                <option>Loading Accounts...</option>
              ) : (
                accounts.map(a => (
                  <option key={a.id} value={a.id}>({a.code}) {a.name} — [{a.type}]</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-background border border-border text-foreground rounded-xl pl-9 pr-3 py-2.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-background border border-border text-foreground rounded-xl pl-9 pr-3 py-2.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-border/30">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text" placeholder="Search narration, reference, type..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border text-foreground rounded-xl pl-9 pr-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
          <button
            onClick={exportCSV} disabled={processedLedger.lines.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-card hover:bg-muted/70 disabled:opacity-40 text-foreground font-bold border border-border rounded-xl text-[11px] transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export Ledger
          </button>
        </div>
      </div>

      {/* ── Account KPI Cards ── */}
      {currentAccount && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Ledger Code', value: currentAccount.code, icon: Hash, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', mono: true },
            { label: 'Account Category', value: currentAccount.category || currentAccount.type, icon: Tag, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', mono: false },
            { label: 'Normal Balance', value: ['Asset', 'Expense'].includes(currentAccount.type) ? 'Debit (Dr) Balance' : 'Credit (Cr) Balance', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', mono: false },
            { label: 'Closing Balance', value: `${fmtINR(processedLedger.closingBalance)} ${processedLedger.closingBalance !== 0 ? (processedLedger.isDebitBalance ? 'Dr' : 'Cr') : ''}`, icon: BarChart2, color: processedLedger.closingBalance >= 0 ? 'text-emerald-500' : 'text-red-400', bg: processedLedger.closingBalance >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10', border: processedLedger.closingBalance >= 0 ? 'border-emerald-500/20' : 'border-red-500/20', mono: true },
          ].map((card, i) => (
            <div key={i} className={`bg-card border ${card.border} rounded-xl p-3.5 flex gap-3 items-start hover:shadow-md transition-shadow`}>
              <div className={`w-9 h-9 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center shrink-0`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider truncate">{card.label}</p>
                <p className={`text-sm font-black leading-tight mt-1 ${card.color} ${card.mono ? 'font-mono' : ''} break-all`}>{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Ledger Table ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left min-w-[700px]">
            <thead>
              <tr className="bg-muted/60 border-b border-border text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4 w-28">Posting Date</th>
                <th className="py-3 px-4 w-28">Reference</th>
                <th className="py-3 px-4">Transaction Details</th>
                <th className="py-3 px-4 w-24">Source</th>
                <th className="py-3 px-4 w-28 text-right">Debit (Dr)</th>
                <th className="py-3 px-4 w-28 text-right">Credit (Cr)</th>
                <th className="py-3 px-4 w-32 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {processedLedger.lines.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No postings found for the selected account.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedLedger.lines.map((line, idx) => (
                  <tr key={idx} className={`hover:bg-muted/15 transition-colors ${line.debit > 0 ? 'border-l-2 border-l-emerald-500/0 hover:border-l-emerald-500/30' : 'border-l-2 border-l-transparent hover:border-l-orange-500/30'}`}>
                    <td className="py-2.5 px-4 font-medium text-foreground">{line.date}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-black text-amber-500 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {line.reference}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-bold text-foreground leading-tight">{line.narration}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${SOURCE_BADGE[line.type] || 'bg-muted text-muted-foreground border-border'}`}>
                        {line.type?.replace(' (Bridge)', '') || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-500 font-bold">
                      {line.debit > 0 ? fmtINR(line.debit) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-orange-500 font-bold">
                      {line.credit > 0 ? fmtINR(line.credit) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black">
                      <span className={line.runningBalance >= 0 ? 'text-foreground' : 'text-red-400'}>
                        {fmtINR(line.runningBalance)}
                      </span>
                      {line.runningBalance !== 0 && (
                        <span className={`ml-1 text-[9px] font-black ${processedLedger.isDebitBalance ? 'text-emerald-500' : 'text-orange-500'}`}>
                          {processedLedger.isDebitBalance ? 'Dr' : 'Cr'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 border-t-2 border-border font-black">
                <td colSpan="4" className="py-3 px-4 text-[12px] text-muted-foreground text-right">Period Summary:</td>
                <td className="py-3 px-4 text-right font-mono text-emerald-500 font-black text-[12px]">{fmtINR(processedLedger.totalDebits)}</td>
                <td className="py-3 px-4 text-right font-mono text-orange-500 font-black text-[12px]">{fmtINR(processedLedger.totalCredits)}</td>
                <td className="py-3 px-4 text-right font-mono text-foreground font-black text-[12px]">
                  {fmtINR(processedLedger.closingBalance)} {processedLedger.closingBalance !== 0 ? (processedLedger.isDebitBalance ? 'Dr' : 'Cr') : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
