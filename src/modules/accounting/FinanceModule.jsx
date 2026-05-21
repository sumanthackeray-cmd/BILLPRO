import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountingService } from './accountingService';
import { base44 } from '@/api/base44Client';
import ChartOfAccounts from './ChartOfAccounts';
import JournalEntries from './JournalEntries';
import LedgerView from './LedgerView';
import TrialBalance from './TrialBalance';
import ProfitLoss from './ProfitLoss';
import BalanceSheet from './BalanceSheet';
import BankReconciliation from './BankReconciliation';
import TdsTcs from './TdsTcs';
import {
  BookOpen, Scale, BarChart2, ShieldAlert, Landmark,
  Layers, Activity, TrendingUp, TrendingDown, ArrowUpRight,
  Zap, RefreshCw, DollarSign, Building2
} from 'lucide-react';

const TABS = [
  { id: 'coa',     name: 'Chart of Accounts',    shortName: 'COA',      icon: Layers,      component: ChartOfAccounts,   desc: 'Manage ledger account master catalog', color: 'text-amber-500' },
  { id: 'journal', name: 'Journal Entries',       shortName: 'Journal',  icon: BookOpen,    component: JournalEntries,    desc: 'Book direct double-entry transactions', color: 'text-blue-500' },
  { id: 'ledger',  name: 'General Ledger',        shortName: 'Ledger',   icon: BookOpen,    component: LedgerView,        desc: 'Per-account running balance statements', color: 'text-purple-500' },
  { id: 'trial',   name: 'Trial Balance',         shortName: 'Trial',    icon: Scale,       component: TrialBalance,      desc: 'Aggregate debit and credit auditor reports', color: 'text-indigo-500' },
  { id: 'pl',      name: 'Profit & Loss (P&L)',   shortName: 'P&L',      icon: BarChart2,   component: ProfitLoss,        desc: 'Trading profit and operating income statement', color: 'text-emerald-500' },
  { id: 'bs',      name: 'Balance Sheet',         shortName: 'B/S',      icon: Scale,       component: BalanceSheet,      desc: 'Capital assets, liability and owner equity', color: 'text-sky-500' },
  { id: 'recon',   name: 'Bank Reconciliation',   shortName: 'Recon',    icon: Landmark,    component: BankReconciliation, desc: 'Reconcile passbook transactions with ledgers', color: 'text-teal-500' },
  { id: 'tds',     name: 'TDS & TCS Returns',     shortName: 'TDS/TCS',  icon: ShieldAlert, component: TdsTcs,            desc: 'Indian Income Tax Act withholding trackers', color: 'text-rose-500' },
];

export default function FinanceModule() {
  const [activeTab, setActiveTab] = useState('coa');

  // Live data for header KPIs
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: accountingService.getAccounts });
  const { data: journals = [] } = useQuery({ queryKey: ['journal-entries'], queryFn: accountingService.getJournalEntries });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-created_date', 500) });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list('-created_date', 200) });

  const kpis = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthInvoices = invoices.filter(i => (i.date || i.created_date || '').startsWith(thisMonth));
    const monthRevenue = monthInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);
    const monthExpenses = expenses.filter(e => (e.date || e.created_date || '').startsWith(thisMonth))
      .reduce((s, e) => s + (e.amount || 0), 0);
    const netPL = monthRevenue - monthExpenses;

    // Previous month comparison
    const prevMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7);
    const prevRevenue = invoices.filter(i => (i.date || i.created_date || '').startsWith(prevMonth))
      .reduce((s, i) => s + (i.grand_total || 0), 0);
    const revenueGrowth = prevRevenue > 0 ? ((monthRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : null;

    return { accounts: accounts.length, journals: journals.length, monthRevenue, netPL, revenueGrowth };
  }, [accounts, journals, invoices, expenses]);

  const fmtCr = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toFixed(0)}`;
  };

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || ChartOfAccounts;
  const activeTabData = TABS.find(t => t.id === activeTab);

  const now = new Date();
  const syncTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-5 animate-fade-up">

      {/* ═══════════════════════ HERO HEADER ═══════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-lg">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        <div className="relative z-10 p-5 md:p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-5">
            {/* Title Block */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">
                  <Zap className="w-3 h-3" />
                  ERP Core Module
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Live Sync · {syncTime}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                <Building2 className="w-7 h-7 text-amber-500 shrink-0" />
                Finance Hub & Double-Entry Ledger
              </h1>
              <p className="text-xs text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                Regulatory-compliant books of accounts with standard double-entry validation, smart automated invoice/bill ledger bridging, bank statement reconciliation, and Indian Income Tax TDS/TCS withholding matrices.
              </p>
            </div>

            {/* Live KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
              {/* KPI 1: Ledger Accounts */}
              <div className="relative overflow-hidden bg-background/60 backdrop-blur-sm border border-border/60 rounded-xl p-3 min-w-[110px]">
                <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/10 rounded-full blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Ledger Accts</span>
                  </div>
                  <p className="text-xl font-black text-foreground leading-none">{kpis.accounts}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Active COA</p>
                </div>
              </div>

              {/* KPI 2: Journal Entries */}
              <div className="relative overflow-hidden bg-background/60 backdrop-blur-sm border border-border/60 rounded-xl p-3 min-w-[110px]">
                <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/10 rounded-full blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Journals</span>
                  </div>
                  <p className="text-xl font-black text-foreground leading-none">{kpis.journals}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Posted entries</p>
                </div>
              </div>

              {/* KPI 3: Monthly Revenue */}
              <div className="relative overflow-hidden bg-background/60 backdrop-blur-sm border border-border/60 rounded-xl p-3 min-w-[110px]">
                <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">This Month</span>
                  </div>
                  <p className="text-xl font-black text-emerald-500 leading-none font-mono">{fmtCr(kpis.monthRevenue)}</p>
                  <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
                    {kpis.revenueGrowth !== null && (
                      <span className={`font-bold ${parseFloat(kpis.revenueGrowth) >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {parseFloat(kpis.revenueGrowth) >= 0 ? '↑' : '↓'} {Math.abs(kpis.revenueGrowth)}%
                      </span>
                    )}
                    vs last month
                  </p>
                </div>
              </div>

              {/* KPI 4: Net P&L */}
              <div className={`relative overflow-hidden bg-background/60 backdrop-blur-sm border rounded-xl p-3 min-w-[110px] ${kpis.netPL >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                <div className={`absolute top-0 right-0 w-12 h-12 rounded-full blur-xl ${kpis.netPL >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`} />
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Activity className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Net P&L</span>
                  </div>
                  <p className={`text-xl font-black leading-none font-mono ${kpis.netPL >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {fmtCr(Math.abs(kpis.netPL))}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-1">
                    {kpis.netPL >= 0 ? '✅ Profitable Month' : '⚠️ Net Loss'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ PREMIUM TAB NAVIGATION ═══════════════════════ */}
      <div className="bg-card border border-border/80 rounded-2xl p-2 shadow-sm overflow-x-auto">
        <div className="flex gap-1 min-w-max md:min-w-0 md:flex-wrap">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-black transition-all duration-200 whitespace-nowrap
                  ${isActive
                    ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }
                `}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : tab.color}`} />
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════ ACTIVE TAB SUB-HEADER ═══════════════════════ */}
      {activeTabData && (
        <div className="flex items-center gap-3 px-1">
          <div className={`w-1 h-6 rounded-full bg-gradient-to-b from-amber-500 to-orange-500`} />
          <div>
            <div className="flex items-center gap-2">
              <activeTabData.icon className={`w-4 h-4 ${activeTabData.color}`} />
              <span className="text-[13px] font-black text-foreground">{activeTabData.name}</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">{activeTabData.desc}</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════ ACTIVE TAB CONTENT ═══════════════════════ */}
      <div className="bg-transparent">
        <ActiveComponent />
      </div>
    </div>
  );
}
