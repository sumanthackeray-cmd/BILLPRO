import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService, fmtINR } from './accountingService';
import { base44 } from '@/api/base44Client';
import {
  Plus, Search, Trash2, CheckCircle2, AlertTriangle,
  Calendar, FileText, Share2, Eye, Zap, BookOpen, TrendingUp, Activity
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import PermissionGuard from "@/components/PermissionGuard";

export default function JournalEntries() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([
    { accountId: '', accountName: '', debit: '', credit: '', narration: '' },
    { accountId: '', accountName: '', debit: '', credit: '', narration: '' }
  ]);

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: accountingService.getAccounts });
  const { data: entries = [], isLoading } = useQuery({ queryKey: ['journal-entries'], queryFn: accountingService.getJournalEntries });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-date", 500) });
  const { data: purchases = [] } = useQuery({ queryKey: ["purchases"], queryFn: () => base44.entities.Purchase.list("-date", 300) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 300) });

  const createMutation = useMutation({
    mutationFn: accountingService.createJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: "Journal Entry Posted", description: "Successfully committed journal entry to ledger." });
      closeModal();
    },
    onError: (err) => toast({ title: "Posting Failed", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: accountingService.deleteJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: "Journal Entry Reverted", description: "The journal entry has been deleted and ledger balances updated." });
    },
    onError: (err) => toast({ title: "Error Reverting", description: err.message, variant: "destructive" })
  });

  const openModal = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setReferenceNo(`JE-${Date.now().toString().slice(-6)}`);
    setDescription('');
    setLines([
      { accountId: '', accountName: '', debit: '', credit: '', narration: '' },
      { accountId: '', accountName: '', debit: '', credit: '', narration: '' }
    ]);
    setIsOpen(true);
  };

  const closeModal = () => setIsOpen(false);

  const addLine = () => setLines([...lines, { accountId: '', accountName: '', debit: '', credit: '', narration: '' }]);

  const removeLine = (idx) => {
    if (lines.length <= 2) {
      toast({ title: "Validation Error", description: "A journal entry must contain at least 2 ledger lines.", variant: "destructive" });
      return;
    }
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx, field, val) => {
    const newLines = [...lines];
    if (field === 'accountId') {
      const selected = accounts.find(a => a.id === val);
      newLines[idx].accountId = val;
      newLines[idx].accountName = selected ? selected.name : '';
    } else {
      newLines[idx][field] = val;
    }
    setLines(newLines);
  };

  const totalDebit = useMemo(() => lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0), [lines]);
  const isBalanced = useMemo(() => Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0, [totalDebit, totalCredit]);

  const handlePost = (e) => {
    e.preventDefault();
    if (!isBalanced) {
      toast({ title: "Mismatch Error", description: "Total debits and credits must be equal and greater than 0.", variant: "destructive" });
      return;
    }
    if (lines.some(l => !l.accountId)) {
      toast({ title: "Validation Error", description: "Please select an account ledger for all lines.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      date,
      reference_no: referenceNo,
      description,
      lines: lines.map(l => ({
        accountId: l.accountId,
        accountName: l.accountName,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        narration: l.narration || description
      }))
    });
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to void and delete this journal entry?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleView = (entry) => { setSelectedEntry(entry); setIsViewOpen(true); };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const term = search.toLowerCase();
      return (
        e.reference_no?.toLowerCase().includes(term) ||
        e.description?.toLowerCase().includes(term) ||
        e.lines?.some(l => l.accountName?.toLowerCase().includes(term))
      );
    });
  }, [entries, search]);

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Date,Reference No,Description,Account Name,Debit,Credit,Line Narration\n";
    entries.forEach(e => {
      e.lines?.forEach(l => {
        csvContent += `"${e.date}","${e.reference_no || ''}","${e.description || ''}","${l.accountName}","${l.debit || 0}","${l.credit || 0}","${l.narration || ''}"\n`;
      });
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `journal_entries_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">

      {/* ── Smart Bridge Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-indigo-500/5 border border-blue-500/20 rounded-2xl p-4 shadow-sm">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-black text-[13px] text-foreground">Double-Entry Smart Bridge Active</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ledger, Trial Balance & Financials auto-compile double-entries from{' '}
                <span className="font-black text-foreground">{invoices.length} invoices</span>,{' '}
                <span className="font-black text-foreground">{purchases.length} purchases</span>, and{' '}
                <span className="font-black text-foreground">{expenses.length} expenses</span> — even without manual journal entries.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-card hover:bg-muted/70 rounded-xl text-[11px] font-bold border border-border text-foreground transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <PermissionGuard module="accounting" action="create" fallback={null}>
              <button
                onClick={openModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-[11px] font-black shadow-md shadow-amber-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Journal
              </button>
            </PermissionGuard>
          </div>
        </div>
      </div>

      {/* ── Search Row ── */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by reference, narration, account..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 text-foreground transition-all"
          />
        </div>
        <span className="text-[11px] text-muted-foreground font-medium ml-1">
          {filteredEntries.length} of {entries.length} entries
        </span>
      </div>

      {/* ── Journal Table ── */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] text-left min-w-[650px]">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-28">Date</th>
                  <th className="py-3 px-4 w-32">Reference</th>
                  <th className="py-3 px-4">Description / Narration</th>
                  <th className="py-3 px-4 w-32 text-right">Total Debit</th>
                  <th className="py-3 px-4 w-32 text-right">Total Credit</th>
                  <th className="py-3 px-4 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-muted-foreground font-medium">No posted journal entries found.</p>
                        <p className="text-[11px] text-muted-foreground">Book your first manual double-entry!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(e => (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="py-3 px-4 font-semibold text-foreground">{e.date}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-black text-amber-500 text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {e.reference_no}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-medium truncate max-w-sm" title={e.description}>
                        {e.description || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-500">{fmtINR(e.total_debit)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-orange-500">{fmtINR(e.total_credit)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleView(e)}
                            className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors"
                            title="View Journal Lines"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <PermissionGuard module="accounting" action="delete" fallback={null}>
                            <button
                              onClick={() => handleDelete(e.id)}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                              title="Void Journal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Post Journal Modal ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-up my-8">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
              <h3 className="font-black text-sm text-foreground flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                </div>
                Post Double-Entry Journal
              </h3>
              <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all text-lg font-bold">×</button>
            </div>

            <form onSubmit={handlePost} className="p-5 space-y-4 text-[12px]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted-foreground font-bold mb-1.5 text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Date *
                  </label>
                  <input
                    type="date" required value={date} onChange={e => setDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-bold mb-1.5 text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Reference No *
                  </label>
                  <input
                    type="text" required value={referenceNo} onChange={e => setReferenceNo(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 font-mono font-bold text-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-bold mb-1.5 text-[10px] uppercase tracking-wider">Narration / Description</label>
                  <input
                    type="text" value={description} onChange={e => setDescription(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="Brief description..."
                  />
                </div>
              </div>

              {/* Ledger Lines */}
              <div className="border border-border/60 rounded-xl overflow-hidden bg-muted/10">
                <div className="flex justify-between items-center px-4 py-2.5 bg-muted/30 border-b border-border/40">
                  <span className="font-black text-[11px] text-foreground uppercase tracking-wider">Double-Entry Lines</span>
                  <button
                    type="button" onClick={addLine}
                    className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 rounded-lg font-bold text-[10px] transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add Line
                  </button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] text-muted-foreground font-black uppercase tracking-wider border-b border-border/30 bg-muted/10">
                  <div className="col-span-4">Account Ledger</div>
                  <div className="col-span-2 text-right">Debit (₹)</div>
                  <div className="col-span-2 text-right">Credit (₹)</div>
                  <div className="col-span-3">Line Narration</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="space-y-2 p-3 max-h-60 overflow-y-auto">
                  {lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <select
                          required value={line.accountId} onChange={e => handleLineChange(idx, 'accountId', e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/40 text-[11px]"
                        >
                          <option value="">-- Select Ledger --</option>
                          {accounts.map(a => (
                            <option key={a.id} value={a.id}>({a.code}) {a.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          disabled={!!line.credit}
                          value={line.debit}
                          onChange={e => handleLineChange(idx, 'debit', e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 font-mono text-right text-emerald-500 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-30 text-[11px]"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          disabled={!!line.debit}
                          value={line.credit}
                          onChange={e => handleLineChange(idx, 'credit', e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 font-mono text-right text-orange-500 font-bold focus:outline-none focus:ring-1 focus:ring-orange-500/40 disabled:opacity-30 text-[11px]"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text" placeholder="Narration (optional)"
                          value={line.narration}
                          onChange={e => handleLineChange(idx, 'narration', e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/30 text-[10px]"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button" onClick={() => removeLine(idx)}
                          className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Balance Footer */}
                <div className="flex justify-between items-center border-t border-border/40 px-4 py-2.5 bg-muted/20 text-[11px] font-bold text-foreground">
                  <span className="text-muted-foreground">Balance Verification</span>
                  <div className="flex gap-6">
                    <span className="font-mono">Debits: <span className="text-emerald-500">{fmtINR(totalDebit)}</span></span>
                    <span className="font-mono">Credits: <span className="text-orange-500">{fmtINR(totalCredit)}</span></span>
                  </div>
                </div>
              </div>

              {/* Balance Status */}
              <div className={`p-3 rounded-xl flex items-center gap-2.5 border text-[12px] font-semibold ${
                isBalanced ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-500' : 'bg-red-500/8 border-red-500/20 text-red-400'
              }`}>
                {isBalanced ? (
                  <><CheckCircle2 className="w-4 h-4 shrink-0" /><span>Double-entry balances! You can now commit and post this journal transaction.</span></>
                ) : (
                  <><AlertTriangle className="w-4 h-4 shrink-0" /><span>Mismatch: Debits ({fmtINR(totalDebit)}) ≠ Credits ({fmtINR(totalCredit)}). Difference: {fmtINR(Math.abs(totalDebit - totalCredit))}.</span></>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button" onClick={closeModal}
                  className="px-4 py-2 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced || createMutation.isPending}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-xl shadow-md transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  {createMutation.isPending ? 'Posting...' : 'Post Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {isViewOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-up">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
              <h3 className="font-black text-sm text-foreground">
                Journal Details: <span className="text-amber-500 font-mono">{selectedEntry.reference_no}</span>
              </h3>
              <button onClick={() => setIsViewOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 text-lg font-bold">×</button>
            </div>
            <div className="p-5 space-y-4 text-[12px]">
              <div className="grid grid-cols-2 gap-4 border-b border-border/30 pb-3">
                <div>
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Date Posted</span>
                  <p className="text-foreground font-black mt-1">{selectedEntry.date}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Narration</span>
                  <p className="text-foreground font-bold mt-1">{selectedEntry.description || '—'}</p>
                </div>
              </div>
              <table className="w-full text-[11px] border border-border/40 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/40 text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Account Name</th>
                    <th className="py-2.5 px-3 text-right">Debit</th>
                    <th className="py-2.5 px-3 text-right">Credit</th>
                    <th className="py-2.5 px-3">Narration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {selectedEntry.lines?.map((line, i) => (
                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                      <td className={`py-2 px-3 font-bold text-foreground ${line.credit ? 'pl-6' : ''}`}>{line.accountName}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-500 font-bold">{line.debit > 0 ? fmtINR(line.debit) : '—'}</td>
                      <td className="py-2 px-3 text-right font-mono text-orange-500 font-bold">{line.credit > 0 ? fmtINR(line.credit) : '—'}</td>
                      <td className="py-2 px-3 text-muted-foreground italic text-[10px]">{line.narration || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 border-t border-border font-black">
                    <td className="py-2.5 px-3 text-foreground">TOTAL</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-500">{fmtINR(selectedEntry.total_debit)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-orange-500">{fmtINR(selectedEntry.total_credit)}</td>
                    <td className="py-2.5 px-3"></td>
                  </tr>
                </tfoot>
              </table>
              <div className="flex justify-end border-t border-border pt-4">
                <button onClick={() => setIsViewOpen(false)} className="px-4 py-2 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-xl transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
