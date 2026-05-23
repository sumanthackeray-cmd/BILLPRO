import { useState } from 'react';
import { usePermission } from '@/hooks/usePermission';
import Unauthorized from '@/pages/Unauthorized';
import useFinanceKPIs from './hooks/useFinanceKPIs';

// Sub-components
import FinanceHeader from './components/FinanceHeader';
import FinanceKPIs from './components/FinanceKPIs';
import FinanceTabs from './components/FinanceTabs';
import FinanceTabContent from './components/FinanceTabContent';

// Tab Contents
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
  Layers
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
  const hasAcctView = usePermission('accounting', 'view');
  const hasReportsProfit = usePermission('reports', 'profit');
  const [activeTab, setActiveTab] = useState('coa');

  // Permission Guard
  if (!hasAcctView && !hasReportsProfit) {
    return <Unauthorized requiredRole="Accounting / Finance Access" />;
  }

  // All KPI data & business logic is now in a dedicated hook
  const { kpis, isLoading, refreshAll } = useFinanceKPIs();

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || ChartOfAccounts;
  const activeTabData = TABS.find(t => t.id === activeTab);

  const now = new Date();
  const syncTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-5 animate-fade-up">
      <FinanceHeader 
        syncTime={syncTime} 
        isLoading={isLoading} 
        onRefresh={refreshAll} 
      />
      
      <FinanceKPIs 
        kpis={kpis} 
        isLoading={isLoading} 
      />

      <FinanceTabs 
        TABS={TABS} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      <FinanceTabContent 
        activeTabData={activeTabData} 
        ActiveComponent={ActiveComponent} 
      />
    </div>
  );
}
