import MetricCard from "@/components/dashboard/MetricCard";
import CategoryPieChart from "@/components/dashboard/widgets/CategoryPieChart";
import { fmtINR } from "@/lib/gst-utils";
import { Laptop, Smartphone, Wrench, ShieldCheck } from "lucide-react";

export default function ElectronicsDashboard({ data }) {
  const catSales = data.filteredInvoices.reduce((acc, inv) => {
    inv.items?.forEach(item => {
      const cat = item.category || "Electronics";
      acc[cat] = (acc[cat] || 0) + (item.total || 0);
    });
    return acc;
  }, {});
  
  const pieData = Object.entries(catSales).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <MetricCard label="Today's Sales" value={fmtINR(data.totalSales)} icon={Laptop} color="blue" />
        <MetricCard label="Devices Sold" value={data.filteredInvoices.length} icon={Smartphone} color="teal" />
        <MetricCard label="Repairs / Services" value={0} icon={Wrench} color="orange" sub="Feature coming soon" />
        <MetricCard label="Warranties Active" value={data.filteredInvoices.length} icon={ShieldCheck} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryPieChart data={pieData} title="Revenue Mix (Mobiles/Repairs/Accessories)" />
        
        {/* IMEI Tracker Widget placeholder */}
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-foreground">Recent IMEI Logs</h3>
          </div>
          <p className="text-xs text-muted-foreground text-center py-8">IMEI tracking is handled in POS.</p>
        </div>
      </div>
    </div>
  );
}
