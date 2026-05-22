import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, fmtDate } from "@/lib/gst-utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Truck, Search, Filter } from "lucide-react";

export default function Waybills() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const waybillInvoices = useMemo(() => invoices.filter(i => i.waybill_no), [invoices]);

  const filtered = useMemo(() => {
    let list = [...waybillInvoices];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(inv =>
        inv.waybill_no?.toLowerCase().includes(q) ||
        inv.vehicle_no?.toLowerCase().includes(q) ||
        inv.place_of_supply?.toLowerCase().includes(q) ||
        inv.ship_city?.toLowerCase().includes(q) ||
        inv.bill_city?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.invoice_number?.toLowerCase().includes(q)
      );
    }

    if (statusFilter === "in_transit") {
      list = list.filter(inv => !!inv.vehicle_no);
    } else if (statusFilter === "pending") {
      list = list.filter(inv => !inv.vehicle_no);
    }

    return list;
  }, [waybillInvoices, search, statusFilter]);

  const inTransitCount = waybillInvoices.filter(i => !!i.vehicle_no).length;
  const pendingCount = waybillInvoices.filter(i => !i.vehicle_no).length;

  const STATUS_FILTERS = [
    { key: "all", label: "All Waybills", count: waybillInvoices.length },
    { key: "in_transit", label: "🚛 In Transit", count: inTransitCount },
    { key: "pending", label: "⏳ Pending Vehicle", count: pendingCount },
  ];

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">🚚 E-Waybills</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {waybillInvoices.length} waybills generated · {inTransitCount} in transit
          </p>
        </div>
        {/* Summary badges */}
        <div className="flex gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-info/10 text-info border border-info/30 text-[11px] font-bold px-3 py-1 rounded-full">
            <Truck className="w-3 h-3" /> {inTransitCount} In Transit
          </span>
          <span className="inline-flex items-center gap-1.5 bg-warning/10 text-warning border border-warning/30 text-[11px] font-bold px-3 py-1 rounded-full">
            ⏳ {pendingCount} Pending
          </span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-info/10 border border-info/30 rounded-xl px-4 py-3 text-info text-[13px]">
        ℹ️ E-Waybills are auto-generated when creating invoices. Enable the waybill option in the invoice form for consignments exceeding ₹50,000.
      </div>

      {/* Smart Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search Waybill No, Vehicle, Route, Customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter dropdown */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 min-w-[180px]">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-transparent text-xs font-bold h-10 focus:outline-none cursor-pointer text-foreground"
          >
            {STATUS_FILTERS.map(f => (
              <option key={f.key} value={f.key} className="bg-card text-foreground">
                {f.label} ({f.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
              statusFilter === f.key
                ? "bg-info/15 text-info border-info/40 shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-info/30 hover:text-info"
            }`}
          >
            {f.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black ${
              statusFilter === f.key ? "bg-info/20" : "bg-secondary"
            }`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Results count */}
      {(search || statusFilter !== "all") && (
        <p className="text-[12px] text-muted-foreground">
          Showing <span className="font-bold text-foreground">{filtered.length}</span> of {waybillInvoices.length} waybills
        </p>
      )}

      {/* Waybill Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">
              {waybillInvoices.length === 0
                ? "No E-Waybills generated yet"
                : "No waybills match your search or filter"}
            </p>
            {(search || statusFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="mt-3 text-xs text-info underline underline-offset-2 hover:text-info/80 transition"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        {filtered.map(inv => {
          const isInTransit = !!inv.vehicle_no;
          const route = [inv.bill_city, inv.ship_city, inv.place_of_supply].filter(Boolean)[0];
          return (
            <div key={inv.id} className="bg-card border border-border rounded-xl p-4 hover:border-info/30 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1.5">
                    <Badge className="bg-info/10 text-info border-info/30 text-[11px]">
                      🚚 {inv.waybill_no}
                    </Badge>
                    <span className="text-muted-foreground text-[11px] font-mono">← {inv.invoice_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isInTransit
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-warning/10 text-warning border-warning/30"
                    }`}>
                      {isInTransit ? "🟢 In Transit" : "⏳ Pending Vehicle"}
                    </span>
                  </div>
                  <p className="font-semibold text-[14px]">{inv.customer_name}</p>
                  <div className="flex flex-wrap gap-x-3 mt-1 text-[12px] text-muted-foreground">
                    <span>📅 {fmtDate(inv.waybill_date || inv.date)}</span>
                    {inv.transport_mode && <span>🚌 {inv.transport_mode}</span>}
                    {inv.vehicle_no && <span>🚗 {inv.vehicle_no}</span>}
                    {route && <span>📍 {route}</span>}
                  </div>
                </div>
                {/* Right: Amount */}
                <div className="shrink-0 text-right">
                  <p className="text-lg font-black text-info font-mono">{fmtINR(inv.grand_total)}</p>
                  {inv.transport_mode && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{inv.transport_mode}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}