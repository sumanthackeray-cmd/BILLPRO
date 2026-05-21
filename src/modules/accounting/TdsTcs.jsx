import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService, fmtINR } from './accountingService';
import { Plus, Search, Edit2, Trash2, Calendar, FileText, CheckCircle2, ShieldCheck, Download, TrendingUp, TrendingDown, Minus, ShieldAlert } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const SECTIONS = [
  { code: "194C", name: "Contractors Payments (1% Indiv / 2% Co)" },
  { code: "194J", name: "Professional/Technical Fees (10% standard / 2% tech)" },
  { code: "194H", name: "Commission & Brokerage (5%)" },
  { code: "194I", name: "Rent on Land/Building (10% / 2% plant)" },
  { code: "194Q", name: "Purchase of Goods > 50 Lakhs (0.1%)" },
  { code: "206C(1H)", name: "TCS on Sales of Goods > 50 Lakhs (0.1%)" },
  { code: "206C(1G)", name: "TCS on Foreign Remittances LRS (5% / 20%)" }
];

const TYPE_CONFIG = {
  'TDS Receivable': { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  'TDS Payable':    { color: 'text-orange-500',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  'TCS Receivable': { color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  'TCS Payable':    { color: 'text-purple-500',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  badge: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
};

export default function TdsTcs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [isOpen, setIsOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('TDS Payable');
  const [section, setSection] = useState('194J');
  const [partyName, setPartyName] = useState('');
  const [partyPan, setPartyPan] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [rate, setRate] = useState('10');
  const [status, setStatus] = useState('Pending');
  const [challanRef, setChallanRef] = useState('');

  const { data: entries = [], isLoading } = useQuery({ queryKey: ['tds-tcs-entries'], queryFn: accountingService.getTdsTcsEntries });

  const createMutation = useMutation({
    mutationFn: accountingService.createTdsTcsEntry,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tds-tcs-entries'] }); toast({ title: "Record Created", description: "TDS/TCS deduction record logged." }); closeModal(); },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => accountingService.updateTdsTcsEntry(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tds-tcs-entries'] }); toast({ title: "Record Updated", description: "TDS/TCS record saved." }); closeModal(); },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: accountingService.deleteTdsTcsEntry,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tds-tcs-entries'] }); toast({ title: "Record Deleted" }); },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const openModal = (entry = null) => {
    if (entry) {
      setEditingEntry(entry); setDate(entry.date); setType(entry.type); setSection(entry.section);
      setPartyName(entry.partyName); setPartyPan(entry.partyPan); setGrossAmount(entry.grossAmount.toString());
      setRate(entry.rate.toString()); setStatus(entry.status); setChallanRef(entry.challanRef || '');
    } else {
      setEditingEntry(null); setDate(new Date().toISOString().split('T')[0]);
      setPartyName(''); setPartyPan(''); setGrossAmount(''); setRate('10'); setStatus('Pending'); setChallanRef('');
    }
    setIsOpen(true);
  };

  const closeModal = () => { setIsOpen(false); setEditingEntry(null); };

  const handleSectionChange = (secCode) => {
    setSection(secCode);
    if (secCode === '194C') setRate('2');
    else if (secCode === '194J') setRate('10');
    else if (secCode === '194H') setRate('5');
    else if (secCode === '194I') setRate('10');
    else if (secCode === '194Q' || secCode.includes('1H')) setRate('0.1');
    else if (secCode.includes('1G')) setRate('20');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!partyName || !grossAmount || !rate) {
      toast({ title: "Validation Error", description: "Mandatory fields must be populated.", variant: "destructive" });
      return;
    }
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
    if (partyPan && !panRegex.test(partyPan.toUpperCase())) {
      toast({ title: "PAN Validation Error", description: "Invalid Indian PAN format.", variant: "destructive" });
      return;
    }
    const gross = Number(grossAmount) || 0;
    const rt = Number(rate) || 0;
    const payload = { date, type, section, partyName, partyPan: partyPan.toUpperCase(), grossAmount: gross, rate: rt, deductedAmount: (gross * rt) / 100, status, challanRef };
    if (editingEntry) updateMutation.mutate({ id: editingEntry.id, data: payload });
    else createMutation.mutate(payload);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this TDS/TCS record?")) deleteMutation.mutate(id);
  };

  const summaries = useMemo(() => {
    const tdsRec = entries.filter(e => e.type === "TDS Receivable").reduce((s, e) => s + e.deductedAmount, 0);
    const tdsPay = entries.filter(e => e.type === "TDS Payable").reduce((s, e) => s + e.deductedAmount, 0);
    const tcsRec = entries.filter(e => e.type === "TCS Receivable").reduce((s, e) => s + e.deductedAmount, 0);
    const tcsPay = entries.filter(e => e.type === "TCS Payable").reduce((s, e) => s + e.deductedAmount, 0);
    return { tdsRec, tdsPay, tcsRec, tcsPay, netTds: tdsRec - tdsPay, netTcs: tcsRec - tcsPay };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchSearch = e.partyName.toLowerCase().includes(search.toLowerCase()) ||
        e.section.toLowerCase().includes(search.toLowerCase()) ||
        e.challanRef?.toLowerCase().includes(search.toLowerCase()) ||
        e.partyPan?.toLowerCase().includes(search.toLowerCase());
      const matchType = selectedType === 'All' || e.type === selectedType;
      return matchSearch && matchType;
    });
  }, [entries, search, selectedType]);

  const exportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,Date,Type,Section,Party Name,Party PAN,Gross Amount,Rate (%),Deducted Amount,Payment Status,Challan Reference\n";
    filteredEntries.forEach(e => { csv += `"${e.date}","${e.type}","${e.section}","${e.partyName}","${e.partyPan || ''}","${e.grossAmount}","${e.rate}","${e.deductedAmount}","${e.status}","${e.challanRef || ''}"\n`; });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `tds_tcs_returns_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">

      {/* ── Tax Summary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'TDS Receivable', sub: 'Tax withheld by customers', value: fmtINR(summaries.tdsRec), ...TYPE_CONFIG['TDS Receivable'] },
          { label: 'TDS Payable', sub: 'Deducted from vendor bills', value: fmtINR(summaries.tdsPay), ...TYPE_CONFIG['TDS Payable'] },
          { label: 'TCS Receivable', sub: 'Collected by wholesalers', value: fmtINR(summaries.tcsRec), ...TYPE_CONFIG['TCS Receivable'] },
          { label: 'TCS Payable', sub: 'Collected on high-value sales', value: fmtINR(summaries.tcsPay), ...TYPE_CONFIG['TCS Payable'] },
        ].map((card, i) => (
          <div key={i} className={`relative overflow-hidden bg-card border ${card.border} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow`}>
            <div className={`absolute top-0 right-0 w-20 h-20 ${card.bg} rounded-full blur-2xl -mr-6 -mt-6`} />
            <div className="relative">
              <div className={`w-9 h-9 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center mb-3`}>
                <ShieldAlert className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className={`text-xl font-black font-mono ${card.color}`}>{card.value}</p>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mt-1">{card.label}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Action Row ── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text" placeholder="Search party, section code, challan ref..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-foreground transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
            {['All', 'TDS Receivable', 'TDS Payable', 'TCS Receivable', 'TCS Payable'].map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${
                  selectedType === t ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'All' ? 'All' : t.replace(' Receivable', ' Recv').replace(' Payable', ' Pay')}
              </button>
            ))}
          </div>

          <button onClick={exportCSV} className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all" title="Download CSV">
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-[11px] font-black shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add TDS/TCS Entry
          </button>
        </div>
      </div>

      {/* ── Returns Table ── */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left min-w-[900px]">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-24">Date</th>
                  <th className="py-3 px-3 w-32">Type</th>
                  <th className="py-3 px-3 w-24">Section</th>
                  <th className="py-3 px-3">Deductee / PAN</th>
                  <th className="py-3 px-3 w-32 text-right">Gross Amount</th>
                  <th className="py-3 px-3 w-16 text-center">Rate</th>
                  <th className="py-3 px-3 w-32 text-right">Tax Withheld</th>
                  <th className="py-3 px-3 w-28 text-center">Status</th>
                  <th className="py-3 px-3 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ShieldAlert className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-muted-foreground font-medium">No TDS/TCS transactions logged yet.</p>
                        <p className="text-[11px] text-muted-foreground">Track withholdings to file quarterly Form 24Q / 26Q / 27EQ returns.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(e => {
                    const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG['TDS Payable'];
                    return (
                      <tr key={e.id} className="hover:bg-muted/15 transition-colors group">
                        <td className="py-2.5 px-3 font-semibold text-foreground">{e.date}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${cfg.badge}`}>{e.type}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-black text-amber-500 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {e.section}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground leading-tight">{e.partyName}</span>
                            <span className="text-[9px] font-mono text-muted-foreground mt-0.5">{e.partyPan || 'PAN Not Available'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground font-semibold">{fmtINR(e.grossAmount)}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-foreground">{e.rate}%</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-foreground">{fmtINR(e.deductedAmount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                            e.status === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {e.status === 'Paid' ? `✓ PAID${e.challanRef ? `: ${e.challanRef}` : ''}` : '⚠ PENDING'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(e)} className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(e.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-up">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-gradient-to-r from-rose-500/5 to-red-500/5">
              <h3 className="font-black text-sm text-foreground flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                </div>
                {editingEntry ? 'Edit TDS/TCS Deduction' : 'New TDS/TCS Deduction Log'}
              </h3>
              <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-[12px]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">Entry Date *</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                    className="w-full bg-background border border-border text-foreground rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                </div>
                <div>
                  <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">Withholding Type *</label>
                  <select value={type} onChange={e => setType(e.target.value)}
                    className="w-full bg-background border border-border text-foreground font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                    <option value="TDS Payable">TDS Payable (Vendor Exp)</option>
                    <option value="TDS Receivable">TDS Receivable (Sales Invoice)</option>
                    <option value="TCS Payable">TCS Payable (Sales Tax)</option>
                    <option value="TCS Receivable">TCS Receivable (Purchase Tax)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">IT Section *</label>
                  <select value={section} onChange={e => handleSectionChange(e.target.value)}
                    className="w-full bg-background border border-border text-foreground font-bold rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                    {SECTIONS.map(s => <option key={s.code} value={s.code}>({s.code}) {s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">Rate (%) *</label>
                  <input type="number" step="0.01" required value={rate} onChange={e => setRate(e.target.value)}
                    className="w-full bg-background border border-border text-foreground font-black rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-right font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">Party Name *</label>
                  <input type="text" required value={partyName} onChange={e => setPartyName(e.target.value)}
                    className="w-full bg-background border border-border text-foreground font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="e.g. Mahadev Traders" />
                </div>
                <div>
                  <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">Party PAN</label>
                  <input type="text" value={partyPan} onChange={e => setPartyPan(e.target.value)}
                    className="w-full bg-background border border-border text-foreground font-mono font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 uppercase"
                    placeholder="e.g. ABCDE1234F" maxLength="10" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">Gross Amount *</label>
                  <input type="number" step="0.01" required value={grossAmount} onChange={e => setGrossAmount(e.target.value)}
                    className="w-full bg-background border border-border text-foreground font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-right font-mono"
                    placeholder="₹ Gross amount" />
                </div>
                <div>
                  <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">Tax Withheld (Auto)</label>
                  <div className={`w-full rounded-xl px-3 py-2 text-right font-black font-mono border ${
                    (Number(grossAmount) * Number(rate) / 100) > 0 ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' : 'bg-muted/40 border-border text-muted-foreground'
                  }`}>
                    {fmtINR((Number(grossAmount) || 0) * (Number(rate) || 0) / 100)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/20">
                <div>
                  <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">Filing Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className="w-full bg-background border border-border text-foreground font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                    <option value="Pending">Pending Deposition</option>
                    <option value="Paid">Deposited (Challan Paid)</option>
                  </select>
                </div>
                {status === 'Paid' && (
                  <div>
                    <label className="block text-muted-foreground font-black mb-1.5 text-[10px] uppercase tracking-wider">Challan BSR / Ref</label>
                    <input type="text" value={challanRef} onChange={e => setChallanRef(e.target.value)}
                      className="w-full bg-background border border-border text-foreground font-mono font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      placeholder="e.g. BSR9021234" />
                  </div>
                )}
              </div>

              <div className="bg-rose-500/5 border border-rose-500/15 p-3 rounded-xl text-[10px] text-muted-foreground flex gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>Under Sec 206AA, if Party PAN is missing/invalid, TDS must be deducted at a higher rate (usually 20%).</span>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-xl shadow-md transition-all disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? 'Logging...' : 'Commit Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
