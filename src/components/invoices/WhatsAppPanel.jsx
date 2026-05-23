import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Bell, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { fmtINR, fmtDate, isOverdue } from "@/lib/gst-utils";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { generateAndUploadInvoicePDF } from "@/lib/pdf-share-utils";

const getShopName = (shop) => (!shop || !shop.shop_name || shop.shop_name === "Vogats") ? "EasyBMT" : shop.shop_name;

const MSG_TEMPLATES = [
  {
    id: "invoice",
    label: "Invoice Share",
    icon: "📄",
    color: "text-info",
    build: (inv, shop) =>
      `🧾 *Invoice: ${inv.invoice_number}*\n\nDear *${inv.customer_name}*,\n\nThank you for your business! Here are your invoice details:\n\n📅 Date: ${fmtDate(inv.date)}\n💰 Amount: *${fmtINR(inv.grand_total)}*\n📊 Status: ${inv.status?.toUpperCase()}\n\n${inv.due_date ? `📆 Due Date: ${fmtDate(inv.due_date)}\n` : ""}${inv.items?.length ? `\n*Items:*\n${inv.items.slice(0, 4).map(it => `• ${it.name} × ${it.qty} — ${fmtINR(it.qty * it.rate)}`).join("\n")}\n` : ""}\nFor any queries, please contact us.\n\n🏪 *${getShopName(shop)}*${shop?.phone ? `\n📞 ${shop.phone}` : ""}\n\n_Thank you for choosing us!_ 🙏`,
  },
  {
    id: "reminder",
    label: "Payment Reminder",
    icon: "🔔",
    color: "text-warning",
    build: (inv, shop) =>
      `🔔 *Payment Reminder*\n\nDear *${inv.customer_name}*,\n\nThis is a gentle reminder that your payment is due.\n\n🧾 Invoice: *${inv.invoice_number}*\n📅 Invoice Date: ${fmtDate(inv.date)}\n📆 Due Date: *${fmtDate(inv.due_date) || "N/A"}*\n💰 Amount Due: *${fmtINR(inv.grand_total)}*${inv.paid_amount > 0 ? `\n✅ Paid: ${fmtINR(inv.paid_amount)}\n⚠️ Remaining: ${fmtINR(inv.grand_total - inv.paid_amount)}` : ""}\n\nPlease arrange payment at your earliest convenience.\n\n🏪 *${getShopName(shop)}*${shop?.phone ? `\n📞 ${shop.phone}` : ""}${shop?.upi_id ? `\n💳 UPI: ${shop.upi_id}` : ""}\n\n_We appreciate your prompt payment!_ 🙏`,
  },
  {
    id: "overdue",
    label: "Overdue Alert",
    icon: "⚠️",
    color: "text-destructive",
    build: (inv, shop) => {
      const days = Math.floor((new Date() - new Date(inv.due_date)) / 86400000);
      return `⚠️ *OVERDUE PAYMENT ALERT*\n\nDear *${inv.customer_name}*,\n\nYour payment is *${days} days overdue*. Please settle immediately to avoid any inconvenience.\n\n🧾 Invoice: *${inv.invoice_number}*\n📅 Due Date: *${fmtDate(inv.due_date)}*\n💰 Overdue Amount: *${fmtINR(inv.grand_total)}*\n\n🚨 Please make the payment immediately to maintain your credit status.\n\n🏪 *${getShopName(shop)}*${shop?.phone ? `\n📞 ${shop.phone}` : ""}${shop?.upi_id ? `\n💳 UPI: ${shop.upi_id}` : ""}\n\n_Urgent action required!_`;
    }
  },
  {
    id: "confirmation",
    label: "Order Confirmation",
    icon: "✅",
    color: "text-success",
    build: (inv, shop) =>
      `✅ *Order Confirmed!*\n\nDear *${inv.customer_name}*,\n\nYour order has been confirmed.\n\n🧾 Order ID: *${inv.invoice_number}*\n📅 Date: ${fmtDate(inv.date)}\n💰 Total: *${fmtINR(inv.grand_total)}*\n\n${inv.items?.length ? `*Items Ordered:*\n${inv.items.map(it => `• ${it.name} × ${it.qty}`).join("\n")}\n` : ""}${inv.transport_mode ? `\n🚚 Transport: ${inv.transport_mode}` : ""}${inv.vehicle_no ? ` | Vehicle: ${inv.vehicle_no}` : ""}\n\nThank you for your order! 🎉\n\n🏪 *${getShopName(shop)}*${shop?.phone ? `\n📞 ${shop.phone}` : ""}`,
  },
];

export default function WhatsAppPanel({ invoices, shopSettings }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState({});

  const overdueInvoices = invoices.filter(isOverdue);

  const sendWhatsApp = async (inv, templateId) => {
    const tpl = MSG_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;

    const loadingToast = toast.loading("Generating & uploading PDF bill...");
    try {
      const pdfUrl = await generateAndUploadInvoicePDF(inv, shopSettings, true);
      const rawMsg = tpl.build(inv, shopSettings);
      const msg = `${rawMsg}\n\n📁 *Download PDF Bill:* ${pdfUrl}`;
      const ph = (inv.customer_phone || "").replace(/\D/g, "");
      window.open(`https://wa.me/${ph ? "91" + ph : ""}?text=${encodeURIComponent(msg)}`, "_blank");
      toast.dismiss(loadingToast);
      toast.success("WhatsApp opened!");
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Failed to share PDF: " + err.message);
    }
  };

  const sendBulkOverdueAlerts = async () => {
    if (overdueInvoices.length === 0) return toast.info("No overdue invoices");
    setSending({ bulk: true });
    for (const inv of overdueInvoices) {
      if (inv.customer_phone) {
        await new Promise(r => setTimeout(r, 300));
        sendWhatsApp(inv, "overdue");
      }
    }
    setSending({});
    toast.success(`Sent alerts for ${overdueInvoices.length} overdue invoices`);
  };

  return (
    <div className="bg-gradient-to-br from-success/5 to-teal/5 border border-success/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-success/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-success/15 text-success rounded-lg p-2">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="font-bold text-[14px]">WhatsApp Business</p>
            <p className="text-[11px] text-muted-foreground">
              Send invoices, reminders & alerts · {overdueInvoices.length} overdue
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {overdueInvoices.length > 0 && (
            <span className="bg-destructive text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              {overdueInvoices.length} overdue
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50">
          {/* Bulk overdue alerts */}
          {overdueInvoices.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[13px] text-destructive flex items-center gap-1.5">
                    <Bell className="w-4 h-4" /> Automated Overdue Alerts
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Send payment reminders to all {overdueInvoices.length} overdue customers at once
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {overdueInvoices.slice(0, 4).map(inv => (
                      <span key={inv.id} className="bg-destructive/15 text-destructive text-[10px] px-2 py-0.5 rounded-full font-semibold">
                        {inv.customer_name} · {fmtINR(inv.grand_total)}
                      </span>
                    ))}
                    {overdueInvoices.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{overdueInvoices.length - 4} more</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-destructive hover:bg-destructive/90 text-white font-bold gap-1.5 shrink-0"
                  onClick={sendBulkOverdueAlerts}
                  disabled={!!sending.bulk}
                >
                  {sending.bulk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  Send All Alerts
                </Button>
              </div>
            </div>
          )}

          {/* Per-invoice quick actions */}
          <div>
            <p className="text-[12px] text-muted-foreground font-semibold mb-2">Recent Invoices — Quick Send</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {invoices.slice(0, 10).map(inv => {
                const ov = isOverdue(inv);
                return (
                  <div key={inv.id} className="flex items-center gap-3 bg-card rounded-lg p-2.5 border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold truncate">{inv.customer_name}</p>
                      <p className="text-[10px] text-muted-foreground">{inv.invoice_number} · {fmtINR(inv.grand_total)}</p>
                    </div>
                    <div className="flex gap-1">
                      {MSG_TEMPLATES.map(tpl => (
                        tpl.id === "overdue" && !ov ? null : (
                          <button
                            key={tpl.id}
                            onClick={() => sendWhatsApp(inv, tpl.id)}
                            title={tpl.label}
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-sm hover:bg-accent transition-colors",
                              tpl.id === "overdue" && ov ? "bg-destructive/10" : ""
                            )}
                          >
                            {tpl.icon}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Template Legend */}
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {MSG_TEMPLATES.map(t => (
              <span key={t.id} className="flex items-center gap-1">{t.icon} {t.label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}