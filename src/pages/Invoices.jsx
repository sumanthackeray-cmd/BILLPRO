import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, fmtDate, isOverdue } from "@/lib/gst-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import InvoicePrintPreview from "@/components/invoices/InvoicePrintPreview";
import WhatsAppPanel from "@/components/invoices/WhatsAppPanel";
import { toast } from "@/lib/toast";
import { generateAndUploadInvoicePDF } from "@/lib/pdf-share-utils";
import { FileText, Eye, MessageCircle, Check, Plus, Search } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { SearchableSelect } from "@/components/ui/searchable-select";

export default function Invoices() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formType, setFormType] = useState("sale");
  const [filter, setFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [previewInv, setPreviewInv] = useState(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const shopSettings = settings[0] || {};

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      toast.success(t("invoices.toast_saved"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(t("invoices.toast_updated"));
    },
  });

  const handleSave = async (formData) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      const counter = (shopSettings.invoice_counter || 0) + 1;
      const prefix = shopSettings.invoice_prefix || "INV-";
      const invoiceNumber = `${prefix}${String(counter).padStart(4, "0")}`;
      await base44.entities.Invoice.create({ ...formData, invoice_number: invoiceNumber });
      if (shopSettings.id && !shopSettings.id.startsWith("seed")) {
        await base44.entities.ShopSettings.update(shopSettings.id, { invoice_counter: counter });
      }
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      toast.success(t("invoices.toast_created"));
    }
    setShowForm(false);
    setEditing(null);
  };

  const markPaid = (inv) => {
    updateMutation.mutate({ id: inv.id, data: { status: "paid", paid_amount: inv.grand_total } });
  };

  const shareWhatsApp = async (inv) => {
    const loadingToast = toast.loading(t("invoices.toast_pdf_generating"));
    try {
      const pdfUrl = await generateAndUploadInvoicePDF(inv, shopSettings, true);
      const shopName = (!shopSettings.shop_name || shopSettings.shop_name === "Vogats") ? "EASYBMT SHOP" : shopSettings.shop_name;
      const msg = `🏪 *${shopName}*\n🧾 Invoice: *${inv.invoice_number}*\n\nDear *${inv.customer_name}*,\n\nThank you for shopping with us! Here is your invoice summary:\n📅 Date: ${inv.date}\n💰 Amount: *₹${(inv.grand_total || 0).toFixed(2)}*\n📊 Status: ${inv.status?.toUpperCase()}\n\n📁 *Download PDF Bill:* ${pdfUrl}\n\nThank you! 🙏`;
      const ph = (inv.customer_phone || "").replace(/\D/g, "");
      window.open(`https://wa.me/${ph ? "91" + ph : ""}?text=${encodeURIComponent(msg)}`, "_blank");
      toast.dismiss(loadingToast);
      toast.success(t("invoices.toast_whatsapp_opened"));
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(t("invoices.toast_pdf_failed") + err.message);
    }
  };

  const filtered = invoices.filter(i => {
    const matchSearch = (i.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      String(i.grand_total || "").includes(search);
    if (!matchSearch) return false;
    
    // Status filter
    if (filter === "paid" && i.status !== "paid") return false;
    if (filter === "unpaid" && i.status !== "unpaid" && i.status !== "partial") return false;
    if (filter === "overdue" && !isOverdue(i)) return false;
    if (filter === "credit" && i.type !== "credit_note") return false;
    if (filter === "debit" && i.type !== "debit_note") return false;

    // Payment Mode filter
    if (paymentFilter !== "all") {
      const pm = i.payment_mode || "Cash";
      if (pm.toLowerCase() !== paymentFilter.toLowerCase()) return false;
    }
    
    return true;
  });

  const FILTERS = [
    { key: "all", label: t("invoices.all") },
    { key: "unpaid", label: t("invoices.unpaid") },
    { key: "paid", label: t("invoices.paid") },
    { key: "overdue", label: t("invoices.overdue") },
    { key: "credit", label: t("invoices.credit_notes") },
    { key: "debit", label: t("invoices.debit_notes") },
  ];

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">📄 {t("invoices.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{invoices.length} {t("invoices.total_invoices")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button className="gold-gradient text-black font-bold gap-2" onClick={() => { setFormType("sale"); setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> {t("invoices.sale_invoice")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setFormType("credit_note"); setEditing(null); setShowForm(true); }}>
            📋 {t("invoices.credit_note")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setFormType("debit_note"); setEditing(null); setShowForm(true); }}>
            📋 {t("invoices.debit_note")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1 max-w-lg">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t("invoices.search_placeholder") + " (No, Cust, Amt)..."} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <SearchableSelect
            className="w-44 h-10"
            options={[
              { value: "all", label: "All Payment Modes" },
              { value: "Cash", label: "Cash" },
              { value: "UPI", label: "UPI" },
              { value: "Bank Transfer", label: "Bank Transfer" },
              { value: "Card", label: "Card" },
              { value: "Cheque", label: "Cheque" }
            ]}
            value={paymentFilter}
            onValueChange={setPaymentFilter}
            placeholder="Payment Mode"
            searchPlaceholder="Search payment mode..."
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}
              className={filter === f.key ? "gold-gradient text-black" : ""}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* WhatsApp Panel */}
      <WhatsAppPanel invoices={invoices} shopSettings={shopSettings} />

      {/* Invoice List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t("invoices.no_invoices")}</p>
          </div>
        )}
        {filtered.map(inv => {
          const ov = isOverdue(inv);
          const isNote = inv.type === "credit_note" || inv.type === "debit_note";
          return (
            <div key={inv.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-sm font-mono">{inv.invoice_number}</span>
                    {isNote ? (
                      <Badge variant="outline" className={inv.type === "credit_note" ? "border-success/30 text-success" : "border-warning/30 text-warning"}>
                        {inv.type === "credit_note" ? t("invoices.credit_note").toUpperCase() : t("invoices.debit_note").toUpperCase()}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={`text-[10px] ${inv.status === "paid" ? "border-success/30 text-success" : ov ? "border-destructive/30 text-destructive" : "border-warning/30 text-warning"}`}>
                        {ov ? t("invoices.overdue").toUpperCase() : t(`invoices.${inv.status}`).toUpperCase()}
                      </Badge>
                    )}
                    {inv.waybill_no && <Badge variant="outline" className="border-info/30 text-info text-[10px]">🚚 {inv.waybill_no}</Badge>}
                    {inv.is_interstate && <Badge variant="outline" className="border-purple/30 text-purple text-[10px]">{t("invoices.interstate")}</Badge>}
                  </div>
                  <p className="font-semibold text-[14px]">{inv.customer_name}</p>
                  <p className="text-[12px] text-muted-foreground">📅 {fmtDate(inv.date)} · {t("invoices.due")}: {fmtDate(inv.due_date)}</p>
                  {ov && <p className="text-[11px] text-destructive font-bold mt-1">⚠️ {Math.floor((new Date() - new Date(inv.due_date)) / 86400000)} {t("invoices.days_overdue")}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xl font-black font-mono ${inv.status === "paid" ? "text-success" : ov ? "text-destructive" : "text-primary"}`}>
                    {fmtINR(inv.grand_total)}
                  </p>
                  {inv.paid_amount > 0 && inv.status !== "paid" && (
                    <p className="text-[11px] text-muted-foreground">{t("invoices.paid")}: {fmtINR(inv.paid_amount)}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(inv); setFormType(inv.type || "sale"); setShowForm(true); }}>
                  ✏️ {t("common.edit")}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPreviewInv(inv)}>
                  <Eye className="w-3 h-3" /> {t("invoices.view")}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => shareWhatsApp(inv)}>
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </Button>
                {inv.status !== "paid" && !isNote && (
                  <Button size="sm" variant="outline" className="gap-1.5 border-success/30 text-success hover:bg-success/10" onClick={() => markPaid(inv)}>
                    <Check className="w-3 h-3" /> {t("invoices.mark_paid")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <InvoiceForm
          open={showForm}
          onOpenChange={setShowForm}
          invoice={editing}
          type={formType}
          customers={customers}
          products={products}
          onSave={handleSave}
        />
      )}

      {previewInv && (
        <InvoicePrintPreview
          open={!!previewInv}
          onOpenChange={() => setPreviewInv(null)}
          invoice={previewInv}
          shopSettings={shopSettings}
        />
      )}
    </div>
  );
}