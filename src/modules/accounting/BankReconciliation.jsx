import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService, fmtINR } from './accountingService';
import { CheckCircle2, FileSpreadsheet, Upload, AlertCircle, HelpCircle, Check, X, Scale, TrendingUp, BarChart2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from '@/lib/LanguageContext';

export default function BankReconciliation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [csvText, setCsvText] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);

  const { data: bankLines = [], isLoading: statementsLoading } = useQuery({ queryKey: ['bank-statements'], queryFn: accountingService.getBankStatements });
  const { data: journals = [] } = useQuery({ queryKey: ['journal-entries'], queryFn: accountingService.getJournalEntries });

  const importMutation = useMutation({
    mutationFn: accountingService.importBankStatement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      toast({ title: "Bank CSV Imported", description: "Successfully imported bank transactions." });
      setIsUploadOpen(false);
      setCsvText('');
    },
    onError: (err) => toast({ title: "Import Failed", description: err.message, variant: "destructive" })
  });

  const matchMutation = useMutation({
    mutationFn: ({ statementId, journalId }) => accountingService.matchStatementLine(statementId, journalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: "Reconciled", description: "Statement line successfully matched and reconciled." });
      setSelectedLine(null);
    }
  });

  const unmatchMutation = useMutation({
    mutationFn: (statementId) => accountingService.unmatchStatementLine(statementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: "Unreconciled", description: "Matching revoked. Ledger set back to outstanding." });
    }
  });

  const loadMockCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    setCsvText(`Date,Description,Reference,Deposit,Withdrawal\n${today},NEFT Credit: Rahul Sharma,NEFT901230,1180,0\n${today},Monthly Shop Rent,CHQ100344,0,25000\n${today},POS Card Settlement,POSSETTLE12,3200,0\n${today},Payment to Parle Agro Ltd,NEFTPARLE3,0,15000`);
  };

  const handleImport = (e) => {
    e.preventDefault();
    if (!csvText.trim()) {
      toast({ title: "Empty Text", description: "Please paste your bank transaction CSV first.", variant: "destructive" });
      return;
    }
    try {
      const rows = csvText.split('\n').filter(r => r.trim());
      if (rows.length < 2) throw new Error("CSV must contain at least headers and 1 row of data.");
      const parsedLines = [];
      const headers = rows[0].toLowerCase().split(',').map(h => h.trim());
      const dateIdx = headers.indexOf('date');
      const descIdx = headers.indexOf('description') !== -1 ? headers.indexOf('description') : headers.indexOf('particulars');
      const refIdx = headers.indexOf('reference') !== -1 ? headers.indexOf('reference') : headers.indexOf('chq/ref');
      const depIdx = headers.indexOf('deposit') !== -1 ? headers.indexOf('deposit') : headers.indexOf('credit');
      const wdrIdx = headers.indexOf('withdrawal') !== -1 ? headers.indexOf('withdrawal') : headers.indexOf('debit');
      if (dateIdx === -1 || descIdx === -1 || (depIdx === -1 && wdrIdx === -1)) {
        throw new Error("CSV Headers must include: 'Date', 'Description' and Credit/Debit columns.");
      }
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < headers.length) continue;
        const deposit = depIdx !== -1 ? (Number(cols[depIdx]) || 0) : 0;
        const withdrawal = wdrIdx !== -1 ? (Number(cols[wdrIdx]) || 0) : 0;
        parsedLines.push({ date: cols[dateIdx], description: cols[descIdx], reference: refIdx !== -1 ? cols[refIdx] : "", deposit, withdrawal, amount: deposit > 0 ? deposit : -withdrawal });
      }
      if (parsedLines.length === 0) throw new Error("Could not parse any valid transaction rows.");
      importMutation.mutate(parsedLines);
    } catch (err) {
      toast({ title: "Parsing Failed", description: err.message, variant: "destructive" });
    }
  };

  const potentialMatches = useMemo(() => {
    if (!selectedLine) return [];
    const amt = Math.abs(selectedLine.amount);
    return journals.filter(je => {
      const dateDiff = Math.abs(new Date(je.date) - new Date(selectedLine.date)) / (1000 * 60 * 60 * 24);
      const amtMatch = Math.abs(je.total_debit - amt) < 1.0;
      return amtMatch && dateDiff <= 15 && !je.reconciled;
    });
  }, [selectedLine, journals]);

  const summary = useMemo(() => {
    const reconciled = bankLines.filter(l => l.status === "reconciled");
    const unreconciled = bankLines.filter(l => l.status === "unreconciled");
    const totalReconciledAmt = reconciled.reduce((s, l) => s + l.amount, 0);
    return {
      reconciledCount: reconciled.length,
      unreconciledCount: unreconciled.length,
      totalCount: bankLines.length,
      percent: bankLines.length > 0 ? Math.round((reconciled.length / bankLines.length) * 100) : 0,
      totalReconciledAmt
    };
  }, [bankLines]);

  return (
    <div className="space-y-4">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Imported Rows', value: summary.totalCount, icon: FileSpreadsheet, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Pending Reconciliation', value: summary.unreconciledCount, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
          { label: 'Matched & Cleared', value: `${summary.reconciledCount} (${summary.percent}%)`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          {
            label: 'Upload Statement',
            isButton: true,
            icon: Upload,
          },
        ].map((card, i) => {
          if (card.isButton) {
            return (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center">
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-xl text-[11px] shadow-md shadow-amber-500/20 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Upload Bank Statement
                </button>
              </div>
            );
          }
          return (
            <div key={i} className={`bg-card border ${card.border} rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow`}>
              <div className={`w-11 h-11 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center shrink-0`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">{card.label}</p>
                <h3 className={`text-xl font-black leading-tight mt-0.5 ${card.color}`}>{card.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Reconciliation Progress Bar (when data exists) ── */}
      {summary.totalCount > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black text-foreground uppercase tracking-wider">Reconciliation Progress</span>
            <span className="text-[11px] font-black text-foreground">{summary.percent}% Complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
              style={{ width: `${summary.percent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
            <span>{summary.reconciledCount} matched</span>
            <span>{summary.unreconciledCount} pending</span>
          </div>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Bank Statement Lines */}
        <div className="bg-card border border-border rounded-2xl shadow-sm lg:col-span-8 overflow-hidden">
          <div className="bg-muted/40 px-4 py-3 border-b border-border flex justify-between items-center">
            <h3 className="font-black text-sm text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-500" />
              Bank Passbook Statement Lines
            </h3>
            <span className="text-[10px] text-muted-foreground">Select a line to find journal matches</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left min-w-[600px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-24">Date</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 w-28">Ref / Chq</th>
                  <th className="py-2.5 px-3 w-28 text-right">Withdrawal</th>
                  <th className="py-2.5 px-3 w-28 text-right">Deposit</th>
                  <th className="py-2.5 px-3 w-28 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {bankLines.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-muted-foreground font-medium">No imported bank records.</p>
                        <p className="text-[11px] text-muted-foreground">Paste your bank e-statement to reconcile!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bankLines.map(line => (
                    <tr
                      key={line.id}
                      onClick={() => line.status === "unreconciled" && setSelectedLine(line)}
                      className={`transition-colors cursor-pointer ${
                        selectedLine?.id === line.id
                          ? 'bg-amber-500/5 border-l-2 border-l-amber-500'
                          : line.status === "unreconciled" ? 'hover:bg-muted/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-foreground">{line.date}</td>
                      <td className="py-2.5 px-3 font-bold text-foreground">{line.description}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground text-[10px]">{line.reference || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-red-400 font-bold">
                        {line.withdrawal > 0 ? fmtINR(line.withdrawal) : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-500 font-bold">
                        {line.deposit > 0 ? fmtINR(line.deposit) : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {line.status === "reconciled" ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black">MATCHED</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (confirm("Revoke reconciliation match?")) unmatchMutation.mutate(line.id); }}
                              className="text-red-400 hover:text-red-600 font-black text-sm pl-1"
                              title="Unmatch"
                            >×</button>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black">PENDING</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Matching Engine */}
        <div className="lg:col-span-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
            <h4 className="font-black text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Scale className="w-3.5 h-3.5 text-amber-500" />
              </div>
              Matching Engine
            </h4>

            {selectedLine ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[11px] space-y-1.5">
                  <div className="flex justify-between font-black text-foreground">
                    <span>{selectedLine.date}</span>
                    <span className={`font-mono ${selectedLine.amount > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                      {fmtINR(Math.abs(selectedLine.amount))} {selectedLine.amount > 0 ? 'Cr' : 'Dr'}
                    </span>
                  </div>
                  <p className="text-foreground font-bold leading-tight">{selectedLine.description}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Ref: {selectedLine.reference || 'N/A'}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                    Matching Journal Vouchers ({potentialMatches.length})
                  </span>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {potentialMatches.map(je => (
                      <div key={je.id} className="p-3 bg-card border border-border hover:border-amber-500/40 rounded-xl transition-all shadow-sm">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-amber-500 font-mono">{je.reference_no}</span>
                          <span className="text-muted-foreground">{je.date}</span>
                        </div>
                        <p className="text-[11px] font-bold text-foreground leading-snug mt-0.5">{je.description}</p>
                        <div className="flex justify-between items-center mt-2 text-[10px] border-t border-border/20 pt-1.5">
                          <span className="text-muted-foreground">Total: <b className="text-foreground">{fmtINR(je.total_debit)}</b></span>
                          <button
                            onClick={() => matchMutation.mutate({ statementId: selectedLine.id, journalId: je.id })}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-black transition-all text-[10px]"
                          >
                            <Check className="w-3 h-3" /> Match & Clear
                          </button>
                        </div>
                      </div>
                    ))}
                    {potentialMatches.length === 0 && (
                      <div className="p-4 border border-dashed border-border rounded-xl text-center text-muted-foreground italic text-[11px]">
                        No matching journal vouchers found within constraints.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                <HelpCircle className="w-10 h-10 text-muted-foreground/25" />
                <div>
                  <p className="text-[12px] font-bold text-muted-foreground">Select a row to start matching</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">Click any unreconciled statement line from the passbook table</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CSV Upload Modal ── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-up">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-gradient-to-r from-amber-500/5 to-orange-500/5">
              <h3 className="font-black text-sm text-foreground flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-amber-500" />
                </div>
                Import Bank Statement CSV
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleImport} className="p-5 space-y-4 text-[12px]">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-muted-foreground font-black text-[10px] uppercase tracking-wider">Paste CSV / TSV Data *</label>
                  <button type="button" onClick={loadMockCSV} className="text-[10px] text-amber-500 hover:underline font-bold">
                    {t("accounting.load_csv_template") || "Load Format Template"}
                  </button>
                </div>
                <textarea
                  required value={csvText} onChange={e => setCsvText(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-amber-500/30 h-44 resize-none"
                  placeholder="Date,Description,Reference,Deposit,Withdrawal&#10;2026-05-20,Shop Sale Rahul,CHQ12244,1180,0"
                />
              </div>

              <div className="bg-muted/30 p-3 rounded-xl text-[10px] text-muted-foreground space-y-1.5 border border-border/40">
                <p className="font-black text-foreground text-[11px]">Required CSV Column Headers:</p>
                <p>• <code className="text-amber-500">Date</code> — Format: YYYY-MM-DD</p>
                <p>• <code className="text-amber-500">Description</code> / Particulars — Transaction label</p>
                <p>• <code className="text-amber-500">Deposit</code> / Credit and <code className="text-amber-500">Withdrawal</code> / Debit</p>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={importMutation.isPending} className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-xl shadow-md transition-all">
                  {importMutation.isPending ? 'Importing...' : 'Parse & Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
