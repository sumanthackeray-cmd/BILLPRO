import { Layers, BookOpen, TrendingUp, Activity, CreditCard, DollarSign } from "lucide-react";

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-background/60 border border-border/40 rounded-xl p-3 animate-pulse">
          <div className="h-3 w-16 bg-muted rounded mb-3" />
          <div className="h-6 w-20 bg-muted rounded mb-2" />
          <div className="h-2 w-12 bg-muted/60 rounded" />
        </div>
      ))}
    </div>
  );
}

const fmtCr = (val) => {
  const abs = Math.abs(val || 0);
  const sign = val < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
};

export default function FinanceKPIs({ kpis, isLoading }) {
  if (isLoading || !kpis) return <KPISkeleton />;

  const cards = [
    { label: "Ledger Accts", value: kpis.accounts, sub: "Active COA", icon: Layers, color: "text-amber-500", glow: "bg-amber-500/10" },
    { label: "Journals", value: kpis.journals, sub: "Posted entries", icon: BookOpen, color: "text-blue-500", glow: "bg-blue-500/10" },
    { label: "This Month", value: fmtCr(kpis.monthRevenue), sub: kpis.revenueGrowth !== null
        ? `${parseFloat(kpis.revenueGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(kpis.revenueGrowth)}% vs last month`
        : "vs last month",
      icon: TrendingUp, color: "text-emerald-500", glow: "bg-emerald-500/10", mono: true,
      subColor: kpis.revenueGrowth !== null ? (parseFloat(kpis.revenueGrowth) >= 0 ? 'text-emerald-500' : 'text-red-400') : undefined },
    { label: "Net P&L (Ledger)", value: fmtCr(kpis.netPL), sub: kpis.netPL >= 0 ? '✅ Profitable' : '⚠️ Net Loss',
      icon: Activity, color: kpis.netPL >= 0 ? "text-emerald-500" : "text-red-400",
      glow: kpis.netPL >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      border: kpis.netPL >= 0 ? "border-emerald-500/30" : "border-red-500/30", mono: true },
    { label: "Equity Capital", value: fmtCr(kpis.capitalBase), sub: "Actual Ledger Base", icon: DollarSign, color: "text-purple-500", glow: "bg-purple-500/10", mono: true },
    { label: "Loan Liability", value: fmtCr(kpis.loanLiability), sub: "Active Loans", icon: CreditCard, color: "text-orange-500", glow: "bg-orange-500/10", mono: true },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className={`relative overflow-hidden bg-background/60 backdrop-blur-sm border rounded-xl p-3 ${card.border || 'border-border/60'}`}>
            <div className={`absolute top-0 right-0 w-12 h-12 ${card.glow} rounded-full blur-xl`} />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={`w-3.5 h-3.5 ${card.color} shrink-0`} />
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{card.label}</span>
              </div>
              <p className={`text-xl font-black leading-none ${card.mono ? 'font-mono' : ''} ${card.color}`}>
                {card.value}
              </p>
              <p className={`text-[9px] mt-1 ${card.subColor || 'text-muted-foreground'}`}>
                {card.sub}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
