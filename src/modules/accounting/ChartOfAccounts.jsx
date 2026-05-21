import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService, DEFAULT_COA } from '@/modules/accounting/accountingService';
import { Plus, Search, Edit2, Trash2, ChevronDown, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';

const TYPE_COLORS = {
  Asset:     { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    badge: 'bg-blue-500/20 text-blue-300' },
  Liability: { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     badge: 'bg-red-500/20 text-red-300' },
  Equity:    { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  badge: 'bg-purple-500/20 text-purple-300' },
  Income:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  Expense:   { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400',  badge: 'bg-orange-500/20 text-orange-300' },
};

const ACCOUNT_TYPES    = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
const SUBTYPES = {
  Asset:     ['Current Asset', 'Fixed Asset', 'Other Asset'],
  Liability: ['Current Liability', 'Long-term Liability'],
  Equity:    ['Capital', 'Reserve'],
  Income:    ['Operating Income', 'Non-Operating Income'],
  Expense:   ['Direct Expense', 'Indirect Expense', 'Tax Expense'],
};

const emptyForm = { code: '', name: '', type: 'Asset', subType: 'Current Asset', normalBalance: 'Debit', description: '' };

export default function ChartOfAccounts() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [filterType, setFilter]   = useState('All');
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [seeding, setSeeding]     = useState(false);
  const [seedDone, setSeedDone]   = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chartOfAccounts'],
    queryFn: accountingService.getAccounts,
  });

  const createMut = useMutation({
    mutationFn: accountingService.createAccount,
    onSuccess: () => { qc.invalidateQueries(['chartOfAccounts']); closeForm(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => accountingService.updateAccount(id, data),
    onSuccess: () => { qc.invalidateQueries(['chartOfAccounts']); closeForm(); },
  });
  const deleteMut = useMutation({
    mutationFn: accountingService.deleteAccount,
    onSuccess: () => qc.invalidateQueries(['chartOfAccounts']),
  });

  const filtered = useMemo(() => {
    return accounts.filter(a => {
      const matchType   = filterType === 'All' || a.type === filterType;
      const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.code?.includes(search);
      return matchType && matchSearch;
    }).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [accounts, search, filterType]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(a => {
      if (!g[a.type]) g[a.type] = [];
      g[a.type].push(a);
    });
    return g;
  }, [filtered]);

  const openCreate = () => { setForm(emptyForm); setEditItem(null); setShowForm(true); };
  const openEdit   = (acc) => { setForm({ code: acc.code, name: acc.name, type: acc.type, subType: acc.subType, normalBalance: acc.normalBalance, description: acc.description || '' }); setEditItem(acc); setShowForm(true); };
  const closeForm  = () => { setShowForm(false); setEditItem(null); setForm(emptyForm); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editItem) updateMut.mutate({ id: editItem.id, data: form });
    else createMut.mutate(form);
  };

  const handleSeedCOA = async () => {
    setSeeding(true);
    const existing = new Set(accounts.map(a => a.code));
    for (const acc of DEFAULT_COA) {
      if (!existing.has(acc.code)) {
        await accountingService.createAccount(acc);
      }
    }
    qc.invalidateQueries(['chartOfAccounts']);
    setSeeding(false);
    setSeedDone(true);
    setTimeout(() => setSeedDone(false), 3000);
  };

  const summary = useMemo(() => {
    const s = {};
    ACCOUNT_TYPES.forEach(t => { s[t] = accounts.filter(a => a.type === t).length; });
    return s;
  }, [accounts]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Chart of Accounts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{accounts.length} accounts · Double-entry bookkeeping structure</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length === 0 && (
            <button
              onClick={handleSeedCOA}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/25 transition-all"
            >
              {seeding ? '⏳ Seeding…' : seedDone ? <><CheckCircle className="w-3.5 h-3.5" /> Seeded!</> : '⚡ Auto-seed Standard COA'}
            </button>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Account
          </button>
        </div>
      </div>

      {/* Summary Badges */}
      <div className="flex flex-wrap gap-2">
        {ACCOUNT_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilter(filterType === t ? 'All' : t)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
              filterType === t ? TYPE_COLORS[t]?.badge + ' border-current' : 'bg-secondary/40 border-border/40 text-muted-foreground hover:bg-secondary'
            }`}
          >
            {t} ({summary[t] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by account name or code…"
          className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      {/* Account Groups */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-card border border-dashed border-border/60 rounded-xl p-10 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-bold text-muted-foreground">No accounts yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Click "Auto-seed Standard COA" to load 50+ Indian standard accounts</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ACCOUNT_TYPES.filter(t => grouped[t]?.length > 0).map(type => {
            const c = TYPE_COLORS[type];
            return (
              <div key={type} className={`bg-card border ${c.border} rounded-xl overflow-hidden`}>
                <div className={`px-4 py-2.5 ${c.bg} border-b ${c.border} flex items-center justify-between`}>
                  <span className={`text-xs font-extrabold uppercase tracking-wider ${c.text}`}>{type}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{grouped[type].length} accounts</span>
                </div>
                <div className="divide-y divide-border/30">
                  {grouped[type].map(acc => (
                    <div key={acc.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/20 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[11px] font-mono font-bold text-muted-foreground w-12 shrink-0">{acc.code}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{acc.name}</p>
                          <p className="text-[10px] text-muted-foreground">{acc.subType} · Normal: {acc.normalBalance}</p>
                        </div>
                        {acc.isSystem && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold shrink-0">SYS</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(acc)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!acc.isSystem && (
                          <button onClick={() => { if (confirm('Delete this account?')) deleteMut.mutate(acc.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">{editItem ? 'Edit Account' : 'New Account'}</h3>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Account Code *</label>
                  <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="e.g. 1005"
                    className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Type *</label>
                  <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, subType: SUBTYPES[e.target.value][0], normalBalance: ['Asset','Expense'].includes(e.target.value) ? 'Debit' : 'Credit' }))}
                    className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                    {ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Account Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Petty Cash"
                  className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sub-Type</label>
                  <select value={form.subType} onChange={e => setForm(f => ({ ...f, subType: e.target.value }))}
                    className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                    {(SUBTYPES[form.type] || []).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Normal Balance</label>
                  <select value={form.normalBalance} onChange={e => setForm(f => ({ ...f, normalBalance: e.target.value }))}
                    className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                    <option>Debit</option>
                    <option>Credit</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional note"
                  className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeForm} className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {createMut.isPending || updateMut.isPending ? 'Saving…' : editItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
