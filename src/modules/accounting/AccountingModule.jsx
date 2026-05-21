import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { featureFlags } from "@/lib/featureFlags";
import { BookOpen, FileText, Banknote, ShieldCheck, ArrowRight } from "lucide-react";

function SectionCard({ title, description, icon: Icon, children }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-white/80 dark:bg-slate-900/80 p-5 shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-800/70 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary grid place-items-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
        </div>
      </div>
      {children && <div className="mt-4 text-sm text-slate-700 dark:text-slate-300">{children}</div>}
    </div>
  );
}

function AccountingLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-700 dark:text-slate-300">
      <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <div className="text-lg font-semibold">Loading ERP Finance...</div>
      <p className="max-w-md text-center text-sm text-slate-500 dark:text-slate-400">Preparing the accounting workspace while keeping your billing and inventory intact.</p>
    </div>
  );
}

function AccountingEmptyState() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-300/70 bg-slate-100/70 p-8 dark:border-slate-700/70 dark:bg-slate-950/50">
      <div className="rounded-full bg-primary/10 p-4 text-primary">
        <BookOpen className="w-8 h-8" />
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Finance engine ready</h2>
        <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">The ERP accounting module is set up. Start by configuring your Chart of Accounts and connecting invoices through the read-only finance bridge.</p>
      </div>
      <Link to="/erp-accounting/setup" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-slate-950 hover:bg-primary/90">
        Configure Accounting <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function AccountingErrorBoundary({ error }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 rounded-3xl border border-red-300/70 bg-red-50/70 p-8 text-center text-slate-900 dark:border-red-600/70 dark:bg-red-950/20 dark:text-slate-100">
      <ShieldCheck className="w-12 h-12 text-rose-500" />
      <h2 className="text-xl font-semibold">Unable to load ERP Finance</h2>
      <p className="max-w-lg text-sm text-slate-700 dark:text-slate-300">{error?.message || "An unexpected error occurred while loading the accounting workspace."}</p>
    </div>
  );
}

function AccountingOverview() {
  const keyMetrics = useMemo(() => [
    { label: "Chart of Accounts", value: 32, icon: FileText },
    { label: "Journal Entries", value: 0, icon: Banknote },
    { label: "Ledger Groups", value: 6, icon: BookOpen },
    { label: "GST Invoice Bridge", value: "Ready", icon: ShieldCheck },
  ], []);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-slate-950 to-slate-900 p-6 text-white shadow-xl shadow-slate-950/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-amber-300">ERP Finance</p>
            <h1 className="mt-3 text-3xl font-extrabold">Accounting Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Manage your books, GST-ledgers, and invoice bridge without touching the existing billing flows.</p>
          </div>
          <Link to="/erp-accounting/journal" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/10">Create Journal Entry <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {keyMetrics.map((item) => (
          <div key={item.label} className="rounded-3xl border border-border/70 bg-white/90 p-5 shadow-sm dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><item.icon className="w-5 h-5" /></div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{item.label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{item.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Revenue & GST Bridge"
          description="Read-only bridge from existing GST bills and invoices. No modification to current billing endpoints."
          icon={FileText}
        >
          Analyze the invoices and generate accounting entries in the future using existing sales data.
        </SectionCard>
        <SectionCard
          title="Double Entry Ready"
          description="The initial module scaffold supports debit/credit flow with future journal and ledger workflows."
          icon={Banknote}
        >
          This module will automatically post journal entries once configured, keeping existing sales untouched.
        </SectionCard>
      </div>
    </div>
  );
}

export default function AccountingModule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
      setHasData(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  if (!featureFlags.ENABLE_ACCOUNTING) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/80 bg-slate-100/70 p-8 text-center dark:border-slate-700/80 dark:bg-slate-950/40">
        <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">ERP Finance is disabled</h1>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">Enable the accounting feature flag to view the ERP finance dashboard without impacting your existing billing or inventory workflow.</p>
      </div>
    );
  }

  if (loading) return <AccountingLoading />;
  if (error) return <AccountingErrorBoundary error={error} />;
  if (!hasData) return <AccountingEmptyState />;

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <AccountingOverview />
    </div>
  );
}
