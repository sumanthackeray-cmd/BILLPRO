import MetricCard from "@/components/dashboard/MetricCard";
import PartyLedgerWidget from "@/components/dashboard/widgets/PartyLedgerWidget";
import { fmtINR } from "@/lib/gst-utils";
import { Wrench, Hammer, Truck } from "lucide-react";

export default function HardwareDashboard({ data }) {
  const contractors = data.customers.slice(0, 5).map(c => ({
    id: c.id,
    name: c.name,
    amount: data.invoices.filter(i => i.customer_id === c.id && i.status !== "paid").reduce((s, i) => s + (i.grand_total - (i.paid_amount || 0)), 0)
  })).filter(c => c.amount > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricCard label="Today's Sales" value={fmtINR(data.totalSales)} icon={Wrench} color="orange" />
        <MetricCard label="Pending Payments" value={fmtINR(data.outstanding)} icon={Hammer} color="red" />
        <MetricCard label="Deliveries Pending" value={0} icon={Truck} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PartyLedgerWidget title="Contractor Dues" parties={contractors} type="receivable" />
        
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-foreground">Low Stock (Raw Materials)</h3>
          </div>
          <div className="space-y-3">
            {data.lowStock.slice(0, 5).map(p => (
              <div key={p.id} className="flex justify-between items-center text-[12px] border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{p.name}</span>
                <span className="font-mono font-bold text-orange-500">{p.stock} left</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
