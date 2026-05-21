import MetricCard from "@/components/dashboard/MetricCard";
import PartyLedgerWidget from "@/components/dashboard/widgets/PartyLedgerWidget";
import { fmtINR } from "@/lib/gst-utils";
import { Truck, Wallet, FileText, Package } from "lucide-react";

export default function WholesalerDashboard({ data }) {
  const parties = data.customers.slice(0, 10).map(c => ({
    id: c.id,
    name: c.name,
    amount: data.invoices.filter(i => i.customer_id === c.id && i.status !== "paid").reduce((s, i) => s + (i.grand_total - (i.paid_amount || 0)), 0)
  })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <MetricCard label="B2B Sales" value={fmtINR(data.totalSales)} icon={FileText} color="blue" />
        <MetricCard label="GST Collected" value={fmtINR(data.totalTax)} icon={Wallet} color="teal" />
        <MetricCard label="Pending Payments" value={fmtINR(data.outstanding)} icon={Wallet} color="red" />
        <MetricCard label="Dispatch Pending" value={0} icon={Truck} color="orange" sub="Feature coming soon" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PartyLedgerWidget title="Top Party Dues (Receivables)" parties={parties} type="receivable" />
        
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-foreground">Bulk Inventory Alerts</h3>
          </div>
          <div className="space-y-3">
            {data.lowStock.slice(0, 5).map(p => (
              <div key={p.id} className="flex justify-between items-center text-[12px] border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{p.name}</span>
                <span className="font-mono font-bold text-orange-500">{p.stock} units left</span>
              </div>
            ))}
            {data.lowStock.length === 0 && (
              <p className="text-[11px] text-muted-foreground">All bulk stock levels are healthy.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
