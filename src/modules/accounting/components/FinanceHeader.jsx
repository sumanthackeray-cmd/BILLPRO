import { Building2, Zap, RefreshCw } from "lucide-react";

export default function FinanceHeader({ syncTime, isLoading, onRefresh }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-lg">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

      <div className="relative z-10 p-5 md:p-6">
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">
                <Zap className="w-3 h-3" />
                ERP Core Module
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                {isLoading ? 'Syncing...' : `Live Sync · ${syncTime}`}
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

          {/* Refresh Button */}
          <div className="flex items-start shrink-0">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black border transition-all duration-200
                ${isLoading
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 cursor-wait'
                  : 'bg-card border-border hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500 text-muted-foreground'
                }
              `}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
