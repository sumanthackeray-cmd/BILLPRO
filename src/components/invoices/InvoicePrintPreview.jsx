import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";
import { numToWords } from "@/lib/gst-utils";
import html2canvas from "html2canvas";
import { toast } from "@/lib/toast";
import { downloadInvoicePDF } from "@/lib/pdf-share-utils";

window.html2canvas = html2canvas;

// Helper to append cache-buster timestamp for CORS requests
const getCORSImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  // Use weserv.nl image proxy to bypass any CORS restrictions on external storage/Firebase buckets
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
};

export function generateInvoiceHTML(inv, shop) {
  const isInterstate = inv.is_interstate;
  const items = inv.items || [];

  const itemRows = items.map((it, i) => {
    const taxable = it.qty * it.rate;
    const taxAmt = taxable * (it.gst_rate / 100);
    return `
      <tr>
        <td style="padding:5px 6px;border:1px solid #ddd;">${i + 1}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;"><b>${it.name}</b>${it.desc ? `<br><small style="color:#666">${it.desc}</small>` : ""}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:center;">${it.hsn || "—"}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:center;">${it.qty} ${it.unit || ""}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:right;">₹${it.rate?.toFixed(2)}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:right;">₹${taxable?.toFixed(2)}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:center;">${it.gst_rate}%</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:right;">₹${taxAmt?.toFixed(2)}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:right;font-weight:700;">₹${(taxable + taxAmt)?.toFixed(2)}</td>
      </tr>`;
  }).join("");

  const subtotal = items.reduce((s, it) => s + it.qty * it.rate, 0);
  const taxTotal = isInterstate
    ? items.reduce((s, it) => s + it.qty * it.rate * it.gst_rate / 100, 0)
    : items.reduce((s, it) => s + it.qty * it.rate * it.gst_rate / 100, 0);
  const cgstTotal = isInterstate ? 0 : taxTotal / 2;
  const sgstTotal = isInterstate ? 0 : taxTotal / 2;
  const igstTotal = isInterstate ? taxTotal : 0;
  
  let discAmt = 0;
  let grand = 0;
  
  if (inv.grand_total !== undefined && inv.subtotal !== undefined) {
    grand = inv.grand_total;
    const diff = (inv.subtotal + inv.tax_amount) - inv.grand_total;
    discAmt = diff > 0.01 ? diff : 0;
  } else {
    discAmt = subtotal * ((inv.discount || 0) / 100);
    grand = subtotal - discAmt + taxTotal;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${inv.invoice_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; font-family: Arial, sans-serif; letter-spacing: normal !important; word-spacing: normal !important; font-variant-numeric: lnum tabular-nums !important; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }
    body { background:#fff; color:#111; font-size:12px; }
    .page { max-width:800px; margin:0 auto; padding:20px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:12px; border-bottom:3px solid #E8870A; }
    .logo-area { display:flex; flex-direction:column; }
    .shop-name { font-size:22px; font-weight:900; color:#E8870A; }
    .shop-info { font-size:10px; color:#555; margin-top:4px; line-height:1.6; }
    .invoice-meta { text-align:right; }
    .inv-title { font-size:18px; font-weight:900; color:#333; }
    .inv-no { font-size:16px; font-weight:800; color:#E8870A; }
    .inv-detail { font-size:11px; color:#555; margin-top:2px; }
    .party-row { display:flex; gap:12px; margin:14px 0; }
    .party-box { flex:1; background:#f9f9f9; border:1px solid #eee; border-radius:6px; padding:10px; }
    .party-label { font-size:10px; font-weight:800; color:#E8870A; text-transform:uppercase; margin-bottom:5px; }
    .party-name { font-size:14px; font-weight:800; color:#111; }
    .party-info { font-size:10px; color:#555; margin-top:2px; line-height:1.6; }
    table { width:100%; border-collapse:collapse; margin:12px 0; font-size:11px; }
    th { background:#E8870A; color:white; padding:6px; text-align:left; border:1px solid #d07000; line-height:1.2; vertical-align:middle; }
    td { line-height:1.2; vertical-align:middle; }
    tr:nth-child(even) { background:#fafafa; }
    .totals-row { display:flex; justify-content:flex-end; margin-top:8px; }
    .totals-box { width:260px; }
    .total-line { display:flex; justify-content:space-between; align-items:center; padding:3px 6px; font-size:11px; }
    .total-line.grand { font-size:14px; font-weight:900; background:#E8870A; color:white; padding:6px; border-radius:4px; margin-top:4px; align-items:center; }
    .words { font-size:10px; color:#666; font-style:italic; margin:4px 0 10px; }
    .bank-box { background:#f0f4ff; border:1px solid #d0d8f0; border-radius:6px; padding:10px; margin-top:12px; font-size:11px; }
    .bank-title { font-weight:800; color:#333; margin-bottom:4px; }
    .footer { margin-top:16px; display:flex; justify-content:space-between; align-items:flex-end; border-top:2px solid #eee; padding-top:12px; }
    .terms { font-size:10px; color:#888; max-width:55%; }
    .sign-area { text-align:center; min-width:120px; }
    .sign-img { max-height:50px; max-width:120px; width:auto; height:auto; object-fit:contain; display:block; margin:0 auto; }
    .sign-label { font-size:10px; color:#555; margin-top:4px; border-top:1px solid #ccc; padding-top:3px; }
    @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      ${shop?.logo_url ? `<img src="${getCORSImageUrl(shop.logo_url)}" crossorigin="anonymous" class="logo-img" style="max-height:48px;max-width:150px;width:auto;height:auto;object-fit:contain;margin-bottom:4px;display:block;align-self:flex-start;" />` : ""}
      <div class="shop-name">${(!shop || !shop.shop_name || shop.shop_name === "Vogats") ? "Your Business" : shop.shop_name}</div>
      <div class="shop-info">
        ${shop?.gstin ? `GSTIN: ${shop.gstin}<br>` : ""}
        ${shop?.address || ""}${shop?.city ? ", " + shop.city : ""}${shop?.state ? ", " + shop.state : ""}${shop?.pincode ? " - " + shop.pincode : ""}<br>
        ${shop?.phone ? `📞 ${shop.phone}` : ""}${shop?.email ? ` | ${shop.email}` : ""}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="inv-title">${inv.type === "credit_note" ? "CREDIT NOTE" : inv.type === "debit_note" ? "DEBIT NOTE" : "TAX INVOICE"}</div>
      <div class="inv-no">${inv.invoice_number}</div>
      <div class="inv-detail">Date: ${inv.date}</div>
      ${inv.due_date ? `<div class="inv-detail">Due: ${inv.due_date}</div>` : ""}
      ${inv.po_number ? `<div class="inv-detail">PO: ${inv.po_number}</div>` : ""}
      <div class="inv-detail" style="margin-top:4px;font-weight:700;color:${inv.status === "paid" ? "green" : inv.status === "partial" ? "orange" : "#cc0000"}">
        ${inv.status?.toUpperCase()}
      </div>
    </div>
  </div>

  <!-- Party Details -->
  <div class="party-row">
    <div class="party-box">
      <div class="party-label">Bill To</div>
      <div class="party-name">${inv.customer_name}</div>
      <div class="party-info">
        ${inv.customer_gstin ? `GSTIN: ${inv.customer_gstin}<br>` : ""}
        ${inv.bill_address || ""}${inv.bill_city ? ", " + inv.bill_city : ""}${inv.bill_pincode ? " - " + inv.bill_pincode : ""}<br>
        ${inv.customer_phone ? `📞 ${inv.customer_phone}` : ""}
      </div>
    </div>
    ${inv.ship_address && inv.ship_address !== inv.bill_address ? `
    <div class="party-box">
      <div class="party-label">Ship To</div>
      <div class="party-name">${inv.customer_name}</div>
      <div class="party-info">${inv.ship_address}${inv.ship_city ? ", " + inv.ship_city : ""}${inv.ship_pincode ? " - " + inv.ship_pincode : ""}</div>
    </div>` : ""}
    ${inv.place_of_supply ? `
    <div class="party-box" style="max-width:160px;">
      <div class="party-label">Supply Details</div>
      <div class="party-info"><b>Place:</b> ${inv.place_of_supply}<br><b>Type:</b> ${isInterstate ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"}</div>
    </div>` : ""}
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th>#</th><th>Product / Description</th><th>HSN</th><th>Qty</th>
        <th>Rate</th><th>Taxable</th><th>GST%</th><th>Tax</th><th>Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Totals -->
  <div class="totals-row">
    <div class="totals-box">
      <div class="total-line"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
      ${discAmt > 0.01 ? `<div class="total-line"><span>Discount ${inv.discount ? `(${inv.discount}%)` : ""}</span><span>−₹${discAmt.toFixed(2)}</span></div>` : ""}
      ${!isInterstate ? `
        <div class="total-line"><span>CGST</span><span>₹${cgstTotal.toFixed(2)}</span></div>
        <div class="total-line"><span>SGST</span><span>₹${sgstTotal.toFixed(2)}</span></div>
      ` : `<div class="total-line"><span>IGST</span><span>₹${igstTotal.toFixed(2)}</span></div>`}
      ${inv.paid_amount > 0 && inv.status !== "paid" ? `<div class="total-line"><span>Paid</span><span>₹${(inv.paid_amount || 0).toFixed(2)}</span></div>` : ""}
      <div class="total-line grand">
        <span>${inv.status === "partial" ? "Balance Due" : "Grand Total"}</span>
        <span>₹${inv.status === "partial" ? ((grand - (inv.paid_amount || 0)).toFixed(2)) : grand.toFixed(2)}</span>
      </div>
    </div>
  </div>
  <div class="words">${numToWords(grand)}</div>

  <!-- Bank & Transport -->
  ${(shop?.bank_name || shop?.upi_id || inv.transport_mode) ? `
  <div style="display:flex;gap:12px;margin-top:8px;">
    ${(shop?.bank_name || shop?.upi_id) ? `
    <div class="bank-box" style="flex:1;">
      <div class="bank-title">💳 Payment Details</div>
      ${shop.bank_name ? `Bank: ${shop.bank_name}` : ""}
      ${shop.account_no ? ` | A/C: ${shop.account_no}` : ""}
      ${shop.ifsc ? ` | IFSC: ${shop.ifsc}` : ""}
      ${shop.branch ? ` | Branch: ${shop.branch}` : ""}
      ${shop.upi_id ? `<br>UPI: <b>${shop.upi_id}</b>` : ""}
    </div>` : ""}
    ${inv.transport_mode ? `
    <div class="bank-box" style="flex:1;">
      <div class="bank-title">🚚 Transport</div>
      Mode: ${inv.transport_mode}
      ${inv.vehicle_no ? ` | Vehicle: ${inv.vehicle_no}` : ""}
      ${inv.transporter ? `<br>Transporter: ${inv.transporter}` : ""}
      ${inv.lr_no ? ` | LR: ${inv.lr_no}` : ""}
      ${inv.waybill_no ? `<br>E-Waybill: <b>${inv.waybill_no}</b>` : ""}
    </div>` : ""}
  </div>` : ""}

  <!-- Notes -->
  ${inv.notes ? `<div style="margin-top:8px;font-size:11px;color:#555;"><b>Notes:</b> ${inv.notes}</div>` : ""}
  ${shop?.terms ? `<div style="margin-top:4px;font-size:10px;color:#888;"><b>Terms:</b> ${shop.terms}</div>` : ""}

  <!-- Footer -->
  <div class="footer">
    <div class="terms">
      <div style="font-size:11px;color:#333;font-weight:700;">Declaration</div>
      <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
    </div>
    <div class="sign-area">
      ${shop?.signature_url ? `<img src="${getCORSImageUrl(shop.signature_url)}" crossorigin="anonymous" class="sign-img" />` : `<div style="height:50px;"></div>`}
      <div class="sign-label">For ${(!shop || !shop.shop_name || shop.shop_name === "Vogats") ? "Authorized Signatory" : shop.shop_name}</div>
    </div>
  </div>

  <div style="text-align:center;margin-top:16px;font-size:9px;color:#aaa;">
    Generated by EasyBMT — GST Compliant Tax Invoice
  </div>
</div>
</body>
</html>`;
}

export default function InvoicePrintPreview({ open, onOpenChange, invoice, shopSettings }) {
  if (!invoice) return null;

  const html = generateInvoiceHTML(invoice, shopSettings);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  const handleDownload = async () => {
    try {
      toast.loading("Generating PDF...", { id: "inv-pdf" });
      await downloadInvoicePDF(invoice, shopSettings, true);
      toast.success("PDF downloaded!", { id: "inv-pdf" });
    } catch (err) {
      toast.error("Failed to generate PDF: " + err.message, { id: "inv-pdf" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="max-w-5xl max-h-[90vh] flex flex-col bg-white p-0 gap-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
          <div>
            <p className="font-black text-[14px]">Invoice Preview</p>
            <p className="text-[11px] text-muted-foreground">{invoice.invoice_number} · {invoice.customer_name}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
            <Button size="sm" className="gold-gradient text-black font-bold gap-1.5" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Re-print
            </Button>
            <button onClick={() => onOpenChange(false)} className="p-1 text-muted-foreground hover:text-foreground ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Preview iframe */}
        <div className="flex-1 overflow-hidden">
          <iframe
            srcDoc={html}
            className="w-full h-full border-0"
            style={{ minHeight: "600px" }}
            title="Invoice Preview"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}