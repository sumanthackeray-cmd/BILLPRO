import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtDate, fmtINR } from "@/lib/gst-utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Truck, Search, Filter } from "lucide-react";

export default function Waybills() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const base44Any = /** @type {any} */ (base44);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44Any.entities.Invoice.list("-created_date", 200),
  });

  const waybillInvoices = useMemo(
    () => invoices.filter(/** @param {any} inv */ (inv) => Boolean(inv?.waybill_no)),
    [invoices]
  );

  const filtered = useMemo(() => {
    let list = [...waybillInvoices];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        /** @param {any} inv */
        (inv) =>
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
      list = list.filter(/** @param {any} inv */ (inv) => Boolean(inv.vehicle_no));
    } else if (statusFilter === "pending") {
      list = list.filter(/** @param {any} inv */ (inv) => !inv.vehicle_no);
    }

    return list;
  }, [waybillInvoices, search, statusFilter]);

  const inTransitCount = waybillInvoices.filter(/** @param {any} i */ (i) => Boolean(i.vehicle_no)).length;
  const pendingCount = waybillInvoices.filter(/** @param {any} i */ (i) => !i.vehicle_no).length;

  const STATUS_FILTERS = [
    { key: "all", label: "All Waybills", count: waybillInvoices.length },
    { key: "in_transit", label: "Active / In Transit", count: inTransitCount },
    { key: "pending", label: "Pending Vehicle", count: pendingCount },
  ];

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">🚚 E-Waybills</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {waybillInvoices.length} waybills generated · {inTransitCount} in transit
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-info/10 text-info border border-info/30 text-[11px] font-bold px-3 py-1 rounded-full">
            <Truck className="w-3 h-3" /> {inTransitCount} In Transit
          </span>
          <span className="inline-flex items-center gap-1.5 bg-warning/10 text-warning border border-warning/30 text-[11px] font-bold px-3 py-1 rounded-full">
            ⏳ {pendingCount} Pending
          </span>
        </div>
      </div>

      <div className="bg-info/10 border border-info/30 rounded-xl px-4 py-3 text-info text-[13px]">
        ℹ️ E-Waybills are auto-generated when creating invoices. Enable the waybill option in the invoice form for consignments exceeding ₹50,000.
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-11 bg-background/70"
            placeholder="Search Waybill No, Vehicle No, or Route..."
            value={search}
            onChange={/** @param {any} e */ (e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 h-11 min-w-0 sm:min-w-[220px]">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <select
            value={statusFilter}
            onChange={/** @param {any} e */ (e) => setStatusFilter(e.target.value)}
            className="w-full bg-transparent text-xs font-bold h-10 focus:outline-none cursor-pointer text-foreground min-w-0"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.key} value={f.key} className="bg-card text-foreground">
                {f.label} ({f.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
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
            <span
              className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black ${
                statusFilter === f.key ? "bg-info/20" : "bg-secondary"
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {(search || statusFilter !== "all") && (
        <p className="text-[12px] text-muted-foreground">
          Showing <span className="font-bold text-foreground">{filtered.length}</span> of {waybillInvoices.length} waybills
        </p>
      )}

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
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="mt-3 text-xs text-info underline underline-offset-2 hover:text-info/80 transition"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {filtered.map((inv) => {
          const isInTransit = Boolean(inv.vehicle_no);
          const route = [inv.bill_city, inv.ship_city, inv.place_of_supply].filter(Boolean)[0];

          return (
            <div key={inv.id} className="bg-card border border-border rounded-xl p-4 hover:border-info/30 transition-all">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1.5">
                    <Badge className="bg-info/10 text-info border-info/30 text-[11px]">
                      🚚 {inv.waybill_no}
                    </Badge>
                    <span className="text-muted-foreground text-[11px] font-mono break-all">← {inv.invoice_number}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isInTransit
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-warning/10 text-warning border-warning/30"
                      }`}
                    >
                      {isInTransit ? "🟢 Active / In Transit" : "⏳ Pending Vehicle"}
                    </span>
                  </div>

                  <p className="font-semibold text-[14px] break-words">{inv.customer_name}</p>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[12px] text-muted-foreground">
                    <span>📅 {fmtDate(inv.waybill_date || inv.date)}</span>
                    {inv.transport_mode && <span>🚌 {inv.transport_mode}</span>}
                    {inv.vehicle_no && <span>🚗 {inv.vehicle_no}</span>}
                    {route && <span className="break-words">📍 {route}</span>}
                  </div>
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-lg font-black text-info font-mono">{fmtINR(inv.grand_total)}</p>
                  {inv.transport_mode && <p className="text-[10px] text-muted-foreground mt-0.5">{inv.transport_mode}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
