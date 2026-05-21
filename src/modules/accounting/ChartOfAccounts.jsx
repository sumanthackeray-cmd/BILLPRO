import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService, DEFAULT_COA } from './accountingService';
import { Plus, Search, Edit2, Trash2, CheckCircle2, RefreshCw, Layers, DollarSign, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const TYPE_CONFIG = {
  Asset:     { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  Liability: { color: 'text-orange-500',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  Equity:    { color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  Revenue:   { color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  Expense:   { color: 'text-red-500',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     badge: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

export default function ChartOfAccounts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [isOpen, setIsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Asset');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const { data: accounts = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountingService.getAccounts
  });

  const createMutation = useMutation({
    mutationFn: accountingService.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: "Account Created", description: "New account successfully added to COA." });
      closeModal();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => accountingService.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: "Account Updated", description: "Account details saved." });
      closeModal();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: accountingService.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: "Account Deleted", description: "Account removed from COA." });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const openModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setCode(account.code);
      setName(account.name);
      setType(account.type);
      setCategory(account.category || '');
      setDescription(account.description || '');
    } else {
      setEditingAccount(null);
      const count = accounts.filter(a => a.type === type).length;
      const prefixes = { Asset: '1', Liability: '2', Equity: '3', Revenue: '4', Expense: '5' };
      setCode(`${prefixes[type] || '9'}${String(count + 1).padStart(3, '0')}`);
      setName('');
      setCategory('');
      setDescription('');
    }
    setIsOpen(true);
  };

  const closeModal = () => { setIsOpen(false); setEditingAccount(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code || !name || !type) {
      toast({ title: "Validation Error", description: "Please fill in all mandatory fields.", variant: "destructive" });
      return;
    }
    const payload = { code, name, type, category, description };
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: payload });
    } else {
      if (accounts.some(a => a.code === code)) {
        toast({ title: "Duplicate Code", description: "An account with this ledger code already exists.", variant: "destructive" });
        return;
      }
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Delete this account? Any associated ledger entries might become unreferenced.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleTypeChangeInForm = (newType) => {
    setType(newType);
    if (!editingAccount) {
      const count = accounts.filter(a => a.type === newType).length;
      const prefixes = { Asset: '1', Liability: '2', Equity: '3', Revenue: '4', Expense: '5' };
      setCode(`${prefixes[newType] || '9'}${String(count + 1).padStart(3, '0')}`);
    }
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch = acc.name.toLowerCase().includes(search.toLowerCase()) ||
        acc.code.includes(search) ||
        (acc.category && acc.category.toLowerCase().includes(search.toLowerCase()));
      const matchType = selectedType === 'All' || acc.type === selectedType;
      return matchSearch && matchType;
    }).sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, search, selectedType]);

  // Distribution stats
  const stats = useMemo(() => {
    return {
      Asset: accounts.filter(a => a.type === 'Asset').length,
      Liability: accounts.filter(a => a.type === 'Liability').length,
      Equity: accounts.filter(a => a.type === 'Equity').length,
      Revenue: accounts.filter(a => a.type === 'Revenue').length,
      Expense: accounts.filter(a => a.type === 'Expense').length,
    };
  }, [accounts]);

  return (
    <div className="space-y-4">

      {/* ── Distribution Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(stats).map(([t, count]) => {
          const cfg = TYPE_CONFIG[t];
          return (
            <button
              key={t}
              onClick={() => setSelectedType(selectedType === t ? 'All' : t)}
              className={`
                relative overflow-hidden text-left rounded-xl p-3 border transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer
                ${selectedType === t ? `${cfg.bg} ${cfg.border} shadow-md` : 'bg-card border-border hover:border-border/60'}
              `}
            >
              <div className={`absolute top-0 right-0 w-16 h-16 ${cfg.bg} rounded-full blur-xl -mr-4 -mt-4`} />
              <div className="relative">
                <p className={`text-[10px] font-black uppercase tracking-wider ${selectedType === t ? cfg.color : 'text-muted-foreground'}`}>{t}s</p>
                <p className={`text-2xl font-black mt-1 ${selectedType === t ? cfg.color : 'text-foreground'}`}>{count}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">ledger accounts</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Search & Action Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search accounts by name, code or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 text-foreground transition-all"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
            {['All', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  selectedType === t
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'All' ? 'All' : t.slice(0, 4)}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all disabled:opacity-50"
            title="Reload"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-[11px] font-black shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>
      </div>

      {/* ── Accounts Table ── */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Loading Chart of Accounts...</p>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] text-left min-w-[700px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/70 backdrop-blur-sm border-b border-border text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-20">Code</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4 w-28">Type</th>
                  <th className="py-3 px-4 w-36">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Layers className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-muted-foreground font-medium">No matching chart of accounts found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map(acc => {
                    const cfg = TYPE_CONFIG[acc.type] || TYPE_CONFIG.Asset;
                    return (
                      <tr key={acc.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-amber-500 text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {acc.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">{acc.name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${cfg.badge}`}>
                            {acc.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-medium text-[11px]">{acc.category || '—'}</td>
                        <td className="py-3 px-4 text-[11px] text-muted-foreground truncate max-w-[220px]" title={acc.description}>
                          {acc.description || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openModal(acc)}
                              className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors"
                              title="Edit Account"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(acc.id)}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                              title="Delete Account"
                            >
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
          <div className="bg-muted/30 border-t border-border px-4 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Showing <b className="text-foreground">{filteredAccounts.length}</b> of <b className="text-foreground">{accounts.length}</b> ledger accounts</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Indian Accounting Standard Compliant
            </span>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-up">

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-gradient-to-r from-amber-500/5 to-orange-500/5">
              <h3 className="font-black text-sm text-foreground flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-amber-500" />
                </div>
                {editingAccount ? 'Edit Ledger Account' : 'Create Ledger Account'}
              </h3>
              <button
                onClick={closeModal}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-[12px]">
              {/* Account Type Selector */}
              <div>
                <label className="block text-muted-foreground font-bold mb-2 text-[10px] uppercase tracking-wider">Account Type *</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(t => {
                    const cfg = TYPE_CONFIG[t];
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => handleTypeChangeInForm(t)}
                        className={`py-2 rounded-lg text-[10px] font-black border transition-all ${
                          type === t
                            ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-muted-foreground font-bold mb-1.5 text-[10px] uppercase tracking-wider">Ledger Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 font-mono font-bold text-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50"
                    placeholder="e.g. 1010"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-muted-foreground font-bold mb-1.5 text-[10px] uppercase tracking-wider">Category / Group</label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50"
                    placeholder="e.g. Cash & Bank"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground font-bold mb-1.5 text-[10px] uppercase tracking-wider">Account Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 font-bold"
                  placeholder="e.g. ICICI Bank A/c"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-bold mb-1.5 text-[10px] uppercase tracking-wider">Description / Purpose</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 h-20 resize-none"
                  placeholder="Explain what transactions are booked under this account ledger..."
                />
              </div>

              <div className="bg-muted/30 p-3 rounded-xl text-[10px] text-muted-foreground flex gap-2 border border-border/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Creating new ledger accounts dynamically updates Ledgers, Trial Balance and Financial Reports in real-time.</span>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
