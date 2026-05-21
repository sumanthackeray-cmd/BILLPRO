import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService, buildSaleJournalEntry, buildPurchaseJournalEntry, buildExpenseJournalEntry } from '@/modules/accounting/accountingService';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, CheckCircle, XCircle, AlertTriangle, Download, RefreshCw, Eye } from 'lucide-react';

const emptyLine = { accountCode: '', accountName: '', debit: '', credit: '', narration: '' };
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function JournalEntries() {
  const qc = useQueryClient();
  const [showForm, setShowForm]   = useState(false);
  const [viewEntry, setViewEntry] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    lines: [{ ...emptyLine }, { ...emptyLine }],
    status: 'Draft',
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: accountingService.getJournalEntries,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ['chartOfAccounts'],
    queryFn: accountingService.getAccounts,
  });
  // Read-only bridge to existing data
  const { data: invoices  = [] } = useQuery({ queryKey: ['invoices'],  queryFn: () => base44.entities.Invoice.list('-date', 300) });
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => base44.entities.Purchase.list('-date', 200) });
  const { data: expenses  = [] } = useQuery({ queryKey: ['expenses'],  queryFn: () => base44.entities.Expense.list('-date', 200) });

  const createMut = useMutation({
    mutationFn: accountingService.createJournalEntry,
    onSuccess: () => { qc.invalidateQueries(['journalEntries']); closeForm(); },
  });
  const deleteMut = useMutation({
    mutationFn: accountingService.deleteJournalEntry,
    onSuccess: () => qc.invalidateQueries(['journalEntries']),
  });

  const totalDebit  = form.lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const closeForm = () => {
    setShowForm(false);
    setForm({ date: new Date().toISOString().split('T')[0], description: '', reference: '', lines: [{ ...emptyLine }, { ...emptyLine }], status: 'Draft' });
  };

  const updateLine = (idx, field, value) => {
    setForm(f => {
      const lines = [...f.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      if (field === 'accountCode') {
        const acc = accounts.find(a => a.code === value);
        if (acc) lines[idx].accountName = acc.name;
      }
      return { ...f, lines };
    });
  };

  const addLine    = () => setForm(f => ({ ...f, lines: [...f.lines, { ...emptyLine }] }));
  const removeLine = (idx) => setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isBalanced) return;
    const lines = form.lines
      .filter(l => l.accountCode && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map(l => ({ ...l, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0 }));
    const entryNum = `JE-${String(entries.length + 1).padStart(4, '0')}`;
    createMut.mutate({ ...form, lines, entryNumber: entryNum, totalDebit, totalCredit });
  };

  // Auto-import journal entries from existing invoices/purchases/expenses
  const handleAutoImport = async () => {
    setImporting(true);
    const existingRefs = new Set(entries.map(e => e.referenceId).filter(Boolean));
    let count = 0;

    for (const inv of invoices.filter(i => i.type === 'sale' && !existingRefs.has(i.id))) {
      if (inv.grand_total > 0) {
        await accountingService.createJournalEntry(buildSaleJournalEntry(inv));
        count++;
      }
    }
    for (const pur of purchases.filter(p => !existingRefs.has(p.id))) {
      if (pur.grand_total > 0) {
        await accountingService.createJournalEntry(buildPurchaseJournalEntry(pur));
        count++;
      }
    }
    for (const exp of expenses.filter(ex => !existingRefs.has(ex.id))) {
      if (exp.amount > 0) {
        await accountingService.createJournalEntry(buildExpenseJournalEntry(exp));
        count++;
      }
    }

    qc.invalidateQueries(['journalEntries']);
    setImporting(false);
    setImportDone(count);
    setTimeout(() => setImportDone(false), 4000);
  };

  const exportCSV = () => {
    const rows = [['Entry No', 'Date', 'Description', 'Reference', 'Account Code', 'Account Name', 'Debit', 'Credit', 'Status']];
    entries.forEach(je => {
      (je.lines || []).forEach(l => {
        rows.push([je.entryNumber, je.date, je.description, je.reference || '', l.accountCode, l.accountName, l.debit || 0, l.credit || 0, je.status]);
      });
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'journal_entries.csv'; a.click();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Journal Entries</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{entries.length} entries · Double-entry bookkeeping (Debit = Credit)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {importDone !== false && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {importDone} entries imported</span>
          )}
          <button onClick={handleAutoImport} disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/25 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
            {importing ? 'Importing…' : 'Auto-Import from Sales/Purchases'}
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-muted-foreground text-xs font-bold hover:bg-secondary transition-all">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all">
            <Plus className="w-3.5 h-3.5" /> New Entry
          </button>
        </div>
      </div>

      {/* Entries Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-muted-foreground">No journal entries yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Click "Auto-Import" to pull entries from your existing invoices and purchases</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {['Entry No', 'Date', 'Description', 'Debit', 'Credit', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(je => (
                  <tr key={je.id} className="border-b border-border/30 hover:bg-accent/20 transition-colors group">
                    <td className="px-4 py-2.5 font-mono font-bold text-primary">{je.entryNumber}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{je.date}</td>
                    <td className="px-4 py-2.5 text-foreground max-w-[240px] truncate">{je.description}</td>
                    <td className="px-4 py-2.5 text-blue-400 font-mono font-bold">{fmtINR(je.totalDebit)}</td>
                    <td className="px-4 py-2.5 text-emerald-400 font-mono font-bold">{fmtINR(je.totalCredit)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${je.status === 'Posted' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
                        {je.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewEntry(je)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><Eye className="w-3.5 h-3.5" /></button>
                        {!je.autoGenerated && (
                          <button onClick={() => { if (confirm('Delete this entry?')) deleteMut.mutate(je.id); }} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Entry Modal */}
      {viewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-black text-foreground">{viewEntry.entryNumber}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{viewEntry.date} · {viewEntry.description}</p>
              </div>
              <button onClick={() => setViewEntry(null)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>
            <div className="p-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Code', 'Account Name', 'Debit', 'Credit'].map(h => (
                      <th key={h} className="text-left pb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(viewEntry.lines || []).map((l, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-2 font-mono text-muted-foreground">{l.accountCode}</td>
                      <td className="py-2 font-semibold text-foreground">{l.accountName}</td>
                      <td className="py-2 font-mono text-blue-400">{l.debit > 0 ? fmtINR(l.debit) : '—'}</td>
                      <td className="py-2 font-mono text-emerald-400">{l.credit > 0 ? fmtINR(l.credit) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={2} className="pt-2 font-extrabold text-foreground">TOTAL</td>
                    <td className="pt-2 font-mono font-extrabold text-blue-400">{fmtINR(viewEntry.totalDebit)}</td>
                    <td className="pt-2 font-mono font-extrabold text-emerald-400">{fmtINR(viewEntry.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
              <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg ${Math.abs((viewEntry.totalDebit || 0) - (viewEntry.totalCredit || 0)) < 0.01 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                {Math.abs((viewEntry.totalDebit || 0) - (viewEntry.totalCredit || 0)) < 0.01
                  ? <><CheckCircle className="w-4 h-4 text-emerald-400" /><span className="text-xs text-emerald-400 font-bold">Entry is balanced ✓</span></>
                  : <><AlertTriangle className="w-4 h-4 text-red-400" /><span className="text-xs text-red-400 font-bold">Entry is NOT balanced!</span></>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Entry Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border sticky top-0 bg-card flex items-center justify-between">
              <h3 className="font-bold text-foreground">New Journal Entry</h3>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date *</label>
                  <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description *</label>
                  <input required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Narration / description…"
                    className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              {/* Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Journal Lines</label>
                  <button type="button" onClick={addLine} className="text-xs text-primary font-bold hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Line</button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <select value={line.accountCode} onChange={e => updateLine(idx, 'accountCode', e.target.value)}
                        className="col-span-5 bg-secondary/40 border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                        <option value="">Select Account…</option>
                        {accounts.sort((a,b) => a.code.localeCompare(b.code)).map(a => (
                          <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                        ))}
                      </select>
                      <input value={line.debit} onChange={e => updateLine(idx, 'debit', e.target.value)}
                        placeholder="Debit" type="number" min="0" step="0.01"
                        className="col-span-3 bg-secondary/40 border border-blue-500/30 rounded-lg px-2 py-2 text-xs text-blue-300 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
                      <input value={line.credit} onChange={e => updateLine(idx, 'credit', e.target.value)}
                        placeholder="Credit" type="number" min="0" step="0.01"
                        className="col-span-3 bg-secondary/40 border border-emerald-500/30 rounded-lg px-2 py-2 text-xs text-emerald-300 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
                      <button type="button" onClick={() => removeLine(idx)} disabled={form.lines.length <= 2}
                        className="col-span-1 p-1.5 rounded text-muted-foreground hover:text-red-400 disabled:opacity-30 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Balance Check */}
                <div className={`mt-3 flex items-center justify-between p-3 rounded-lg border ${isBalanced ? 'bg-emerald-500/10 border-emerald-500/30' : totalDebit === 0 ? 'bg-secondary/30 border-border' : 'bg-red-500/10 border-red-500/30'}`}>
                  <div className="flex items-center gap-2">
                    {isBalanced
                      ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                      : totalDebit === 0
                        ? <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                        : <XCircle className="w-4 h-4 text-red-400" />
                    }
                    <span className={`text-xs font-bold ${isBalanced ? 'text-emerald-400' : totalDebit === 0 ? 'text-muted-foreground' : 'text-red-400'}`}>
                      {isBalanced ? 'Entry is balanced' : `Difference: ${fmtINR(Math.abs(totalDebit - totalCredit))}`}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs font-mono">
                    <span className="text-blue-400">Dr: {fmtINR(totalDebit)}</span>
                    <span className="text-emerald-400">Cr: {fmtINR(totalCredit)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                    <option>Draft</option>
                    <option>Posted</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reference</label>
                  <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                    placeholder="Invoice / PO number…"
                    className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeForm} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
                <button type="submit" disabled={!isBalanced || createMut.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {createMut.isPending ? 'Saving…' : `Save as ${form.status}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
