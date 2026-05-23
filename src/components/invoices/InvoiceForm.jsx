import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import InvoicePrintPreview from "./InvoicePrintPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INDIAN_STATES, GST_RATES, calcItems, numToWords, fmtINR, today, addDays } from "@/lib/gst-utils";
import { X, Search, Eye } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";

export default function InvoiceForm({ open, onOpenChange, invoice, customers = [], products = [], onSave, type = "sale" }) {
  const [form, setForm] = useState({
    date: invoice?.date || today(),
    due_date: invoice?.due_date || addDays(today(), 15),
    customer_id: invoice?.customer_id || "",
    customer_name: invoice?.customer_name || "",
    customer_phone: invoice?.customer_phone || "",
    customer_gstin: invoice?.customer_gstin || "",
    bill_address: invoice?.bill_address || "",
    bill_city: invoice?.bill_city || "",
    bill_pincode: invoice?.bill_pincode || "",
    ship_address: invoice?.ship_address || "",
    ship_city: invoice?.ship_city || "",
    ship_pincode: invoice?.ship_pincode || "",
    place_of_supply: invoice?.place_of_supply || "",
    po_number: invoice?.po_number || "",
    status: invoice?.status || "unpaid",
    payment_mode: invoice?.payment_mode || "Cash",
    items: invoice?.items || [],
    discount: invoice?.discount || 0,
    paid_amount: invoice?.paid_amount || 0,
    notes: invoice?.notes || "",
    transport_mode: invoice?.transport_mode || "Road",
    transporter: invoice?.transporter || "",
    vehicle_no: invoice?.vehicle_no || "",
    lr_no: invoice?.lr_no || "",
    type: invoice?.type || type,
  });
  const [productSearch, setProductSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const { data: settings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const shopSettings = settings[0];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectCustomer = (cid) => {
    const c = customers.find(x => x.id === cid);
    if (!c) return;
    setForm(f => ({
      ...f, customer_id: cid, customer_name: c.name, customer_phone: c.phone || "",
      customer_gstin: c.gstin || "", bill_address: c.address || "", bill_city: c.city || "",
      bill_pincode: c.pincode || "", ship_address: c.address || "", ship_city: c.city || "",
      ship_pincode: c.pincode || "", place_of_supply: c.state || ""
    }));
  };

  const addProduct = (p) => {
    setForm(f => {
      const ex = f.items.find(i => i.product_id === p.id);
      if (ex) return { ...f, items: f.items.map(i => i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i) };
      return { ...f, items: [...f.items, { product_id: p.id, name: p.name, desc: "", hsn: p.hsn || "", unit: p.unit || "PCS", qty: 1, rate: p.rate, gst_rate: p.gst_rate || 18 }] };
    });
    setProductSearch("");
  };

  const updateItem = (idx, key, val) => {
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: ["qty", "rate", "gst_rate"].includes(key) ? Number(val) : val } : it) }));
  };
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const totals = calcItems(form.items, form.discount);
  const isInterstate = form.place_of_supply && form.place_of_supply.split("-")[0] !== "07"; // Simplified
  const grandTotal = totals.taxable + (isInterstate ? totals.igst : totals.cgst + totals.sgst);

  const filteredProducts = products
    .filter(p => (p.name + (p.sku || "") + (p.barcode || "")).toLowerCase().includes(productSearch.toLowerCase()))
    .slice(0, 6);

  const handleSave = () => {
    onSave({
      ...form,
      grand_total: grandTotal,
      subtotal: totals.subtotal,
      tax_amount: isInterstate ? totals.igst : totals.cgst + totals.sgst,
      is_interstate: isInterstate,
    });
  };

  const typeLabel = form.type === "credit_note" ? "Credit Note" : form.type === "debit_note" ? "Debit Note" : "Invoice";

  const handlePreview = () => {
    const data = {
      ...form,
      grand_total: grandTotal,
      subtotal: totals.subtotal,
      tax_amount: isInterstate ? totals.igst : totals.cgst + totals.sgst,
      is_interstate: isInterstate,
      invoice_number: invoice?.invoice_number || "PREVIEW",
    };
    setPreviewData(data);
    setShowPreview(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">
            {invoice ? `Edit ${invoice.invoice_number}` : `New ${typeLabel}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Dates & Status */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div><Label className="text-[11px]">Date</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div><Label className="text-[11px]">Due Date</Label><Input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} /></div>
            <div><Label className="text-[11px]">PO / Ref No.</Label><Input placeholder="Optional" value={form.po_number} onChange={e => set("po_number", e.target.value)} /></div>
            <div>
              <Label className="text-[11px]">Status</Label>
              <SearchableSelect
                options={[
                  { label: "Unpaid", value: "unpaid" },
                  { label: "Partial", value: "partial" },
                  { label: "Paid", value: "paid" },
                ]}
                value={form.status}
                onValueChange={v => set("status", v)}
                placeholder="Status"
                searchPlaceholder="Search status..."
              />
            </div>
            <div>
              <Label className="text-[11px]">Payment Mode</Label>
              <SearchableSelect
                options={[
                  { label: "Cash", value: "Cash" },
                  { label: "UPI", value: "UPI" },
                  { label: "Bank Transfer", value: "Bank Transfer" },
                  { label: "Card", value: "Card" },
                  { label: "Cheque", value: "Cheque" },
                ]}
                value={form.payment_mode || "Cash"}
                onValueChange={v => set("payment_mode", v)}
                placeholder="Payment Mode"
                searchPlaceholder="Search payment mode..."
              />
            </div>
          </div>

          {/* Customer */}
          <div className="bg-secondary/50 rounded-xl p-4 border border-border space-y-3">
            <p className="text-primary font-bold text-[13px]">👤 Customer Details</p>
            <SearchableSelect
              options={customers?.map(c => ({ value: c.id, label: `${c.name} · ${c.phone}` })) || []}
              value={form.customer_id}
              onValueChange={selectCustomer}
              placeholder="Select Customer"
              searchPlaceholder="Search customer..."
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">Place of Supply</Label>
                <SearchableSelect
                  options={INDIAN_STATES}
                  value={form.place_of_supply}
                  onValueChange={v => set("place_of_supply", v)}
                  placeholder="Select State"
                  searchPlaceholder="Search state..."
                />
              </div>
              <div><Label className="text-[11px]">GSTIN</Label><Input value={form.customer_gstin} onChange={e => set("customer_gstin", e.target.value)} placeholder="15-char GSTIN" /></div>
            </div>
            {form.customer_id && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-muted-foreground">📍 BILL TO</p>
                  <Input placeholder="Address" value={form.bill_address} onChange={e => set("bill_address", e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="City" value={form.bill_city} onChange={e => set("bill_city", e.target.value)} />
                    <Input placeholder="Pincode" value={form.bill_pincode} onChange={e => set("bill_pincode", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-muted-foreground">🚚 SHIP TO</p>
                  <Input placeholder="Address" value={form.ship_address} onChange={e => set("ship_address", e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="City" value={form.ship_city} onChange={e => set("ship_city", e.target.value)} />
                    <Input placeholder="Pincode" value={form.ship_pincode} onChange={e => set("ship_pincode", e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Products */}
          <div className="bg-secondary/50 rounded-xl p-4 border border-border space-y-3">
            <p className="text-primary font-bold text-[13px]">📦 Products / Services</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name, SKU or barcode..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
              {productSearch && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <div key={p.id} onClick={() => addProduct(p)} className="flex justify-between px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors border-b border-border last:border-0">
                      <span className="text-[13px]">{p.name} <span className="text-muted-foreground text-[11px]">({p.sku})</span></span>
                      <span className="text-primary font-bold text-[12px]">{fmtINR(p.rate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {form.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b-2 border-border">
                      {["Product", "HSN", "Qty", "Rate", "GST%", "Total", ""].map(h => (
                        <th key={h} className="px-2 py-2 text-left text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((it, idx) => {
                      const itemTotal = it.qty * it.rate * (1 + it.gst_rate / 100) * (1 - form.discount / 100);
                      return (
                        <tr key={idx} className="border-b border-border/30">
                          <td className="px-2 py-2">
                            <p className="font-semibold">{it.name}</p>
                            <input className="bg-transparent text-muted-foreground text-[11px] w-full outline-none" placeholder="Description" value={it.desc || ""} onChange={e => updateItem(idx, "desc", e.target.value)} />
                          </td>
                          <td className="px-2"><Input className="w-16 h-7 text-[11px]" value={it.hsn} onChange={e => updateItem(idx, "hsn", e.target.value)} /></td>
                          <td className="px-2"><Input type="number" className="w-16 h-7 text-[11px]" min={1} value={it.qty} onChange={e => updateItem(idx, "qty", e.target.value)} /></td>
                          <td className="px-2"><Input type="number" className="w-20 h-7 text-[11px]" value={it.rate} onChange={e => updateItem(idx, "rate", e.target.value)} /></td>
                          <td className="px-2">
                            <SearchableSelect
                              className="w-20 h-7 text-[11px]"
                              options={GST_RATES.map(r => ({ value: String(r), label: `${r}%` }))}
                              value={String(it.gst_rate)}
                              onValueChange={v => updateItem(idx, "gst_rate", v)}
                              placeholder="GST"
                              searchPlaceholder="Search rate..."
                            />
                          </td>
                          <td className="px-2 text-primary font-bold">{fmtINR(itemTotal)}</td>
                          <td className="px-1">
                            <button onClick={() => removeItem(idx)} className="w-6 h-6 rounded bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20">
                              <X className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {form.items.length === 0 && (
              <p className="text-center text-muted-foreground py-6 text-sm">Search & add products above 👆</p>
            )}
          </div>

          {/* Totals */}
          {form.items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div><Label className="text-[11px]">Discount %</Label><Input type="number" min={0} max={100} value={form.discount} onChange={e => set("discount", Number(e.target.value))} /></div>
                {form.status === "partial" && (
                  <div><Label className="text-[11px]">Amount Paid ₹</Label><Input type="number" value={form.paid_amount} onChange={e => set("paid_amount", Number(e.target.value))} /></div>
                )}
                <div className="bg-info/10 border border-info/30 rounded-lg px-3 py-2 text-info text-[12px]">
                  {isInterstate ? "🔵 Inter-State: IGST Applied" : "🟢 Intra-State: CGST + SGST Applied"}
                </div>
              </div>
              <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-1">
                {[
                  { label: "Subtotal", value: totals.subtotal },
                  form.discount > 0 && { label: `Discount (${form.discount}%)`, value: -totals.discAmt, isRed: true },
                  { label: "Taxable", value: totals.taxable },
                  !isInterstate && { label: "CGST", value: totals.cgst },
                  !isInterstate && { label: "SGST", value: totals.sgst },
                  isInterstate && { label: "IGST", value: totals.igst },
                ].filter(Boolean).map(({ label, value, isRed }) => (
                  <div key={label} className="flex justify-between text-[12px] py-1 border-b border-border/50">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-semibold ${isRed ? "text-destructive" : ""}`}>{isRed ? "−" : ""}{fmtINR(Math.abs(value))}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 text-primary font-black text-lg">
                  <span>Grand Total</span><span>{fmtINR(grandTotal)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground italic">{numToWords(grandTotal)}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div><Label className="text-[11px]">Notes</Label><Input placeholder="Additional notes..." value={form.notes} onChange={e => set("notes", e.target.value)} /></div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
            <Button onClick={handleSave} disabled={!form.customer_id || form.items.length === 0} className="gold-gradient text-black font-bold">
              💾 Save {typeLabel}
            </Button>
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!form.customer_id || form.items.length === 0}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Eye className="w-4 h-4" /> Preview
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>

      {showPreview && previewData && (
        <InvoicePrintPreview
          open={showPreview}
          onOpenChange={setShowPreview}
          invoice={previewData}
          shopSettings={shopSettings}
        />
      )}
    </Dialog>
  );
}