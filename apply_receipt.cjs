const fs = require('fs');
const path = require('path');

const utilsPath = 'src/lib/pdf-share-utils.js';
let utilsContent = fs.readFileSync(utilsPath, 'utf8');

const generateThermalHTMLString = `export function generateThermalHTML(inv, shop, printerSize = "58mm") {
  const is80mm = printerSize === "80mm";
  const widthClass = is80mm ? "w80" : "w58";
  
  const dateStr = inv.date ? formatReceiptDate(inv.date) : "";
  const shopName = (!shop.shop_name || shop.shop_name === "Vogats") ? "EASYBMT SHOP" : shop.shop_name;
  const shopInitials = getInitials(shopName);

  const subtotal = inv.subtotal || 0;
  const taxAmount = inv.tax_amount || 0;
  const grandTotal = inv.grand_total || 0;
  const discountAmount = subtotal + taxAmount - grandTotal;
  
  const itemsHtml = (inv.items || []).map(item => \`
    <div class="item-row">
      <div class="item-grid \${is80mm ? 'wide' : 'narrow'}">
        <div>
          <div class="item-name \${is80mm ? 'wide' : ''}">\${item.name}</div>
          \${item.hsn ? \`<div class="item-hsn \${is80mm ? 'wide' : ''}">HSN: \${item.hsn} · GST: \${item.gst_rate || 18}%</div>\` : ''}
        </div>
        <span class="item-cell \${is80mm ? 'wide' : ''}">\${item.qty}</span>
        <span class="item-cell \${is80mm ? 'wide' : ''}">₹\${parseFloat(item.rate).toFixed(2)}</span>
        <span class="item-cell \${is80mm ? 'wide' : ''} amt">₹\${(item.qty * item.rate).toFixed(2)}</span>
      </div>
    </div>
  \`).join("");

  const customerName = inv.customer_name || "Walk-in Customer";
  
  let logoHtml = "";
  if (shop.logo_url) {
    logoHtml = \`
      <div class="shop-logo" style="width:52px;height:52px;margin: 0 auto 12px;background:transparent;border-radius:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        <img src="\${getCORSImageUrl(shop.logo_url)}" crossorigin="anonymous" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
    \`;
  } else {
    logoHtml = \`
      <div class="shop-logo" style="width:52px;height:52px;margin: 0 auto 12px;background:transparent;border-radius:0;display:flex;align-items:center;justify-content:center;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; font-weight: 800; font-size: 16px; display: inline-flex; align-items: center; justify-content: center; text-transform: uppercase;">
          \${shopInitials}
        </div>
      </div>
    \`;
  }

  let upiHtml = "";
  if (shop.upi_id) {
    const upiUri = \`upi://pay?pa=\${shop.upi_id}&pn=\${encodeURIComponent(shopName)}&am=\${grandTotal}&cu=INR\`;
    const qrUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=\${encodeURIComponent(upiUri)}\`;
    upiHtml = \`
      <div class="upi-label \${is80mm ? 'wide' : ''}">Scan &amp; Pay via UPI</div>
      <div class="qr-placeholder \${is80mm ? 'wide' : ''}" style="background: transparent; border: none;">
        <img src="\${getCORSImageUrl(qrUrl)}" crossorigin="anonymous" alt="UPI" style="width: 100%; height: 100%; border-radius: 4px;" />
      </div>
      <div class="upi-id \${is80mm ? 'wide' : ''}">\${shop.upi_id}</div>
    \`;
  } else {
    upiHtml = \`<div class="qr-placeholder \${is80mm ? 'wide' : ''}">▦</div>\`;
  }

  let barcodeHtml = "";
  if (inv.invoice_number) {
    const barcodeVal = inv.invoice_number;
    const svgWidth = is80mm ? 260 : 200;
    const svgHeight = is80mm ? 30 : 24;
    let rects = "";
    let currX = 2;
    for (let i = 0; i < 28; i++) {
      const code = barcodeVal.charCodeAt(i % barcodeVal.length) + i;
      const w = code % 3 === 0 ? 3.5 : code % 3 === 1 ? 1.5 : 2.5;
      rects += \`<rect x="\${currX}" y="0" width="\${w}" height="\${svgHeight}"/>\`;
      currX += w + (code % 2 === 0 ? 2 : 1.5);
      if (currX > svgWidth - 10) break;
    }
    barcodeHtml = \`
      <div class="barcode-section">
        <svg class="barcode-svg \${is80mm ? 'wide' : ''}" viewBox="0 0 \${svgWidth} \${svgHeight}" preserveAspectRatio="none">
          <rect x="0" y="0" width="\${svgWidth}" height="\${svgHeight}" fill="white"/>
          <g fill="#111">\${rects}</g>
        </svg>
        <div class="barcode-number \${is80mm ? 'wide' : ''}">\${barcodeVal}</div>
      </div>
    \`;
  }

  let discountRow = "";
  if (discountAmount > 0.01) {
    discountRow = \`
      <div class="totals-row">
        <span class="totals-key \${is80mm ? 'wide' : ''}" style="color: #16a34a;">Discount</span>
        <span class="totals-val \${is80mm ? 'wide' : ''}" style="color: #16a34a;">-₹\${discountAmount.toFixed(2)}</span>
      </div>
    \`;
  }

  const cssStyles = \`
  <style>
    .gst-modern-receipt *, .gst-modern-receipt *::before, .gst-modern-receipt *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .gst-modern-receipt {
      background: transparent;
      font-family: 'IBM Plex Sans', system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0;
      width: 100%;
    }
    .gst-modern-receipt .receipt-wrapper { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .gst-modern-receipt .receipt { background: #ffffff; position: relative; overflow: visible; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .gst-modern-receipt .receipt-inner { padding: 20px 16px 16px; display: flex; flex-direction: column; gap: 0; }
    .gst-modern-receipt .receipt-header { text-align: center; padding-bottom: 14px; border-bottom: 1.5px dashed #d0d0d0; margin-bottom: 12px; }
    .gst-modern-receipt .shop-logo { width: 52px; height: 52px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-size: 38px; }
    .gst-modern-receipt .shop-name { font-family: 'IBM Plex Mono', monospace; font-size: 14px; font-weight: 700; letter-spacing: 1.5px; color: #111; text-transform: uppercase; line-height: 1.3; margin-bottom: 5px; }
    .gst-modern-receipt .shop-name.wide { font-size: 16px; letter-spacing: 2px; }
    .gst-modern-receipt .shop-address { font-size: 9px; color: #666; line-height: 1.6; font-family: 'IBM Plex Mono', monospace; }
    .gst-modern-receipt .shop-address.wide { font-size: 10px; }
    .gst-modern-receipt .gstin-badge { display: inline-block; margin-top: 6px; font-family: 'IBM Plex Mono', monospace; font-size: 8px; font-weight: 600; letter-spacing: 1px; color: #f5a623; border: 1px solid #f5a62366; border-radius: 3px; padding: 2px 6px; }
    .gst-modern-receipt .gstin-badge.wide { font-size: 9px; }
    .gst-modern-receipt .meta-section { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1.5px dashed #d0d0d0; }
    .gst-modern-receipt .meta-row { display: flex; justify-content: space-between; align-items: baseline; padding: 2px 0; }
    .gst-modern-receipt .meta-key { font-family: 'IBM Plex Mono', monospace; font-size: 8.5px; color: #000; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap; flex-shrink: 0; padding-right: 8px; }
    .gst-modern-receipt .meta-key.wide { font-size: 9.5px; }
    .gst-modern-receipt .meta-val { font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 700; color: #000; text-align: right; }
    .gst-modern-receipt .meta-val.wide { font-size: 10px; }
    .gst-modern-receipt .meta-val.inv-num { color: #f5a623; font-size: 9.5px; }
    .gst-modern-receipt .meta-val.inv-num.wide { font-size: 11px; }
    .gst-modern-receipt .items-section { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1.5px dashed #d0d0d0; }
    .gst-modern-receipt .items-header { display: grid; padding: 4px 0 5px; border-bottom: 1px solid #ddd; margin-bottom: 6px; }
    .gst-modern-receipt .items-header.narrow { grid-template-columns: 1fr 22px 42px 38px; }
    .gst-modern-receipt .items-header.wide { grid-template-columns: 1fr 28px 50px 46px; }
    .gst-modern-receipt .col-head { font-family: 'IBM Plex Mono', monospace; font-size: 8px; font-weight: 700; letter-spacing: 1px; color: #aaa; text-transform: uppercase; }
    .gst-modern-receipt .col-head:not(:first-child) { text-align: right; }
    .gst-modern-receipt .item-row { margin-bottom: 6px; }
    .gst-modern-receipt .item-grid { display: grid; align-items: start; }
    .gst-modern-receipt .item-grid.narrow { grid-template-columns: 1fr 22px 42px 38px; }
    .gst-modern-receipt .item-grid.wide { grid-template-columns: 1fr 28px 50px 46px; }
    .gst-modern-receipt .item-name { font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600; color: #111; line-height: 1.4; }
    .gst-modern-receipt .item-name.wide { font-size: 10.5px; }
    .gst-modern-receipt .item-hsn { font-family: 'IBM Plex Mono', monospace; font-size: 7.5px; color: #aaa; margin-top: 1px; }
    .gst-modern-receipt .item-hsn.wide { font-size: 8.5px; }
    .gst-modern-receipt .item-cell { font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: #000; font-weight: 700; text-align: right; padding-top: 1px; }
    .gst-modern-receipt .item-cell.wide { font-size: 10.5px; }
    .gst-modern-receipt .item-cell.amt { font-weight: 700; color: #111; }
    .gst-modern-receipt .totals-section { margin-bottom: 12px; }
    .gst-modern-receipt .totals-row { display: flex; justify-content: space-between; padding: 2.5px 0; }
    .gst-modern-receipt .totals-key { font-family: 'IBM Plex Mono', monospace; font-size: 8.5px; font-weight: 700; color: #000; text-transform: uppercase; letter-spacing: 0.5px; }
    .gst-modern-receipt .totals-key.wide { font-size: 9.5px; }
    .gst-modern-receipt .totals-val { font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: #000; font-weight: 700; }
    .gst-modern-receipt .totals-val.wide { font-size: 10px; }
    .gst-modern-receipt .grand-total-row { display: flex; justify-content: space-between; align-items: center; background: transparent; border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; padding: 7px 0; margin-top: 6px; }
    .gst-modern-receipt .gt-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 800; color: #000; letter-spacing: 1px; text-transform: uppercase; }
    .gst-modern-receipt .gt-label.wide { font-size: 12px; }
    .gst-modern-receipt .gt-amount { font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 800; color: #000; letter-spacing: 0.5px; }
    .gst-modern-receipt .gt-amount.wide { font-size: 14px; }
    .gst-modern-receipt .payment-badge { display: flex; gap: 6px; margin-top: 8px; justify-content: flex-end; }
    .gst-modern-receipt .badge { font-family: 'IBM Plex Mono', monospace; font-size: 7.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 3px 7px; border-radius: 3px; }
    .gst-modern-receipt .badge.cash { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
    .gst-modern-receipt .badge.b2c { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
    .gst-modern-receipt .receipt-footer { text-align: center; padding-top: 12px; border-top: 1.5px dashed #d0d0d0; margin-top: 0; }
    .gst-modern-receipt .thank-you { font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600; letter-spacing: 1.5px; color: #555; text-transform: uppercase; margin-bottom: 10px; }
    .gst-modern-receipt .thank-you.wide { font-size: 10px; }
    .gst-modern-receipt .upi-label { font-family: 'IBM Plex Mono', monospace; font-size: 7.5px; letter-spacing: 2px; color: #f5a623; text-transform: uppercase; margin-bottom: 8px; }
    .gst-modern-receipt .upi-label.wide { font-size: 8.5px; }
    .gst-modern-receipt .qr-placeholder { width: 64px; height: 64px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; overflow: hidden; }
    .gst-modern-receipt .qr-placeholder.wide { width: 80px; height: 80px; font-size: 32px; }
    .gst-modern-receipt .upi-id { font-family: 'IBM Plex Mono', monospace; font-size: 8px; color: #999; }
    .gst-modern-receipt .upi-id.wide { font-size: 9px; }
    .gst-modern-receipt .barcode-section { margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; }
    .gst-modern-receipt .barcode-svg { width: 100%; height: 24px; margin-bottom: 4px; }
    .gst-modern-receipt .barcode-svg.wide { height: 30px; }
    .gst-modern-receipt .barcode-number { font-family: 'IBM Plex Mono', monospace; font-size: 7.5px; letter-spacing: 2px; color: #aaa; }
    .gst-modern-receipt .barcode-number.wide { font-size: 8.5px; letter-spacing: 3px; }
    .gst-modern-receipt .w58 { width: 218px; }
    .gst-modern-receipt .w80 { width: 302px; }
  </style>
  \`;

  return \`
    \${cssStyles}
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <div class="gst-modern-receipt">
      <div class="receipt \${widthClass}">
        <div class="receipt-inner" \${is80mm ? 'style="padding:24px 20px 18px;"' : ''}>
          
          <div class="receipt-header">
            \${logoHtml}
            <div class="shop-name \${is80mm ? 'wide' : ''}">\${shopName}</div>
            \${shop.address ? \`<div class="shop-address \${is80mm ? 'wide' : ''}">\${shop.address}</div>\` : ""}
            \${shop.phone ? \`<div class="shop-address \${is80mm ? 'wide' : ''}">Mob: \${shop.phone}</div>\` : ""}
            \${shop.gstin ? \`<div class="gstin-badge \${is80mm ? 'wide' : ''}">GSTIN: \${shop.gstin}</div>\` : ""}
          </div>

          <div class="meta-section">
            <div class="meta-row">
              <span class="meta-key \${is80mm ? 'wide' : ''}">Invoice No.</span>
              <span class="meta-val inv-num \${is80mm ? 'wide' : ''}">\${inv.invoice_number || ""}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key \${is80mm ? 'wide' : ''}">Date</span>
              <span class="meta-val \${is80mm ? 'wide' : ''}">\${dateStr}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key \${is80mm ? 'wide' : ''}">Customer</span>
              <span class="meta-val \${is80mm ? 'wide' : ''}">\${customerName}</span>
            </div>
            \${inv.customer_phone && !isWalkin ? \`
              <div class="meta-row">
                <span class="meta-key \${is80mm ? 'wide' : ''}">Mobile</span>
                <span class="meta-val \${is80mm ? 'wide' : ''}">\${inv.customer_phone}</span>
              </div>
            \` : ""}
            <div class="meta-row">
              <span class="meta-key \${is80mm ? 'wide' : ''}">Payment</span>
              <span class="meta-val \${is80mm ? 'wide' : ''}">\${inv.payment_method || "CASH"}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key \${is80mm ? 'wide' : ''}">Type</span>
              <span class="meta-val \${is80mm ? 'wide' : ''}">\${inv.billing_type || "B2C"}</span>
            </div>
          </div>

          <div class="items-section">
            <div class="items-header \${is80mm ? 'wide' : 'narrow'}">
              <span class="col-head">Item</span>
              <span class="col-head">Qty</span>
              <span class="col-head">Rate</span>
              <span class="col-head">Amt</span>
            </div>
            \${itemsHtml}
          </div>

          <div class="totals-section">
            <div class="totals-row">
              <span class="totals-key \${is80mm ? 'wide' : ''}">Subtotal</span>
              <span class="totals-val \${is80mm ? 'wide' : ''}">₹\${subtotal.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span class="totals-key \${is80mm ? 'wide' : ''}">SGST + CGST</span>
              <span class="totals-val \${is80mm ? 'wide' : ''}">₹\${taxAmount.toFixed(2)}</span>
            </div>
            \${discountRow}
            <div class="grand-total-row">
              <span class="gt-label \${is80mm ? 'wide' : ''}">Total</span>
              <span class="gt-amount \${is80mm ? 'wide' : ''}">₹\${grandTotal.toFixed(2)}</span>
            </div>
            <div class="payment-badge">
              <span class="badge cash">\${(inv.payment_method || "CASH").toUpperCase()}</span>
              <span class="badge b2c">\${(inv.billing_type || "B2C").toUpperCase()}</span>
            </div>
          </div>

          <div class="receipt-footer">
            <div class="thank-you \${is80mm ? 'wide' : ''}">✦ Thank You for Shopping! ✦</div>
            \${upiHtml}
            \${barcodeHtml}
          </div>

        </div>
      </div>
    </div>
  \`;
}`;

// 1. Update pdf-share-utils.js
const startIdx = utilsContent.indexOf('function generateThermalHTML(');
const endMarker = '// Render thermal slip to PDF';
const endIdx = utilsContent.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  utilsContent = utilsContent.substring(0, startIdx) + generateThermalHTMLString + '\n\n' + utilsContent.substring(endIdx);
  
  if (utilsContent.includes('export async function renderThermalToPDFBlob')) {
      // the export function renderThermalToPDFBlob is already there, we exported generateThermalHTML inline
  }

  fs.writeFileSync(utilsPath, utilsContent);
  console.log('Successfully updated pdf-share-utils.js');
} else {
  console.log('Failed to find bounds in pdf-share-utils.js');
}

// 2. Update POS.jsx
const posPath = 'src/pages/POS.jsx';
let posContent = fs.readFileSync(posPath, 'utf8');

if (!posContent.includes('generateThermalHTML')) {
  posContent = posContent.replace('import { renderThermalToPDFBlob } from "@/lib/pdf-share-utils";', 'import { renderThermalToPDFBlob, generateThermalHTML } from "@/lib/pdf-share-utils";');
}

const startPosIdx = posContent.indexOf('{/* ── Scrollable receipt content ── */}');
const endPosIdx = posContent.indexOf('{/* WhatsApp Share Panel */}');

if (startPosIdx !== -1 && endPosIdx !== -1) {
  const newPosPreview = `{/* ── Scrollable receipt content ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 bg-[#1a1a2e] flex justify-center">
               <div dangerouslySetInnerHTML={{ __html: generateThermalHTML(latestInvoice, shopSettings, selectedPrintSize) }} />
            </div>\n\n            `;
            
  posContent = posContent.substring(0, startPosIdx) + newPosPreview + posContent.substring(endPosIdx);
  fs.writeFileSync(posPath, posContent);
  console.log('Successfully updated POS.jsx');
} else {
  console.log('Failed to find bounds in POS.jsx');
}
