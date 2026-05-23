import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function PeakHoursTab() {
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 500) });
  const salesInvoices = invoices.filter(i => i.type === "sale");

  const peakHoursData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i.toString().padStart(2, "0")}:00`, count: 0, revenue: 0 }));
    salesInvoices.forEach(inv => {
      const d = inv.created_date ? new Date(inv.created_date) : new Date();
      const h = d.getHours();
      hours[h].count += 1;
      hours[h].revenue += inv.grand_total || 0;
    });
    return hours.filter(h => h.count > 0 || h.revenue > 0);
  }, [salesInvoices]);

  const maxPeakCount = Math.max(...peakHoursData.map(h => h.count), 1);

  return (
    <div className="space-y-4 animate-fade-up">
      <h3 className="font-bold text-sm mb-2">⏰ Peak Shopping Hours</h3>
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        {peakHoursData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">Not enough data to analyze peak hours.</p>
        ) : (
          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={peakHoursData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(36,90%,55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(36,90%,55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, maxPeakCount + 2]} />
                <Tooltip contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" name="Transactions" stroke="hsl(36,90%,55%)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
