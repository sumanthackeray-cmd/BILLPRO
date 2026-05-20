import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, fmtDate } from "@/lib/gst-utils";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";

export default function Waybills() {
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const waybillInvoices = invoices.filter(i => i.waybill_no);

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-xl font-black">🚚 E-Waybills</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{waybillInvoices.length} waybills generated</p>
      </div>

      <div className="bg-info/10 border border-info/30 rounded-xl px-4 py-3 text-info text-[13px]">
        ℹ️ E-Waybills are auto-generated when creating invoices. Enable the waybill option in the invoice form for consignments exceeding ₹50,000.
      </div>

      <div className="space-y-3">
        {waybillInvoices.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No E-Waybills generated yet</p>
          </div>
        )}
        {waybillInvoices.map(inv => (
          <div key={inv.id} className="bg-card border border-border rounded-xl p-4 hover:border-info/20 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-info/10 text-info border-info/30 text-[11px]">🚚 {inv.waybill_no}</Badge>
                  <span className="text-muted-foreground text-[11px]">← {inv.invoice_number}</span>
                </div>
                <p className="font-semibold">{inv.customer_name}</p>
                <p className="text-[12px] text-muted-foreground">
                  📅 {fmtDate(inv.waybill_date || inv.date)}
                  {inv.transport_mode && ` · ${inv.transport_mode}`}
                  {inv.vehicle_no && ` · 🚗 ${inv.vehicle_no}`}
                </p>
              </div>
              <p className="text-lg font-black text-info font-mono">{fmtINR(inv.grand_total)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}