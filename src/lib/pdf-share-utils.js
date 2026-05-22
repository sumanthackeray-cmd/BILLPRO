import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { base44 } from "@/api/base44Client";
import { generateInvoiceHTML } from "@/components/invoices/InvoicePrintPreview";

window.html2canvas = html2canvas;

// Helper to append cache-buster timestamp for CORS requests
const getCORSImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  // Use weserv.nl image proxy to bypass any CORS restrictions on external storage/Firebase buckets
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
};

// Helper: get initials for shop avatar fallback
const getInitials = (name) => {
  if (!name || name === "Vogats") return "GS";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Helper: format receipt date to "D MMM YYYY"
const formatReceiptDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    const day = dateObj.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
};

// Generate HTML string for thermal slip PDF
export function generateThermalHTML(inv = {}, shop = {}, printerSize = "58mm") {
  if (!inv) inv = {};
  if (!shop) shop = {};
  const is80mm = printerSize === "80mm";
  const widthClass = is80mm ? "w80" : "w58";
  
  const dateStr = inv.date ? formatReceiptDate(inv.date) : "";
  const shopName = (!shop.shop_name || shop.shop_name === "Vogats") ? "EASYBMT SHOP" : shop.shop_name;
  const shopInitials = getInitials(shopName);

  const subtotal = inv.subtotal || 0;
  const taxAmount = inv.tax_amount || 0;
  const grandTotal = inv.grand_total || 0;
  const discountAmount = subtotal + taxAmount - grandTotal;
  
  const itemsHtml = (inv.items || []).map(item => `
    <div class="item-row">
      <div class="item-grid ${is80mm ? 'wide' : 'narrow'}">
        <div>
          <div class="item-name ${is80mm ? 'wide' : ''}">${item.name}${item.size ? ` (${item.size})` : ''}</div>
          ${item.hsn ? `<div class="item-hsn ${is80mm ? 'wide' : ''}">HSN: ${item.hsn} · GST: ${item.gst_rate || 18}%</div>` : ''}
        </div>
        <span class="item-cell ${is80mm ? 'wide' : ''}">${item.qty}</span>
        <span class="item-cell ${is80mm ? 'wide' : ''}">₹${parseFloat(item.rate).toFixed(2)}</span>
        <span class="item-cell ${is80mm ? 'wide' : ''} amt">₹${(item.qty * item.rate).toFixed(2)}</span>
      </div>
    </div>
  `).join("");

  const customerName = inv.customer_name || "Walk-in Customer";
  const isWalkin = customerName === "Walk-in Customer" || customerName.toLowerCase().includes("walk-in");
  
  let logoHtml = "";
  if (shop.logo_url) {
    logoHtml = `
      <div class="shop-logo" style="width:52px;height:52px;margin: 0 auto 12px;background:transparent;border-radius:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        <img src="${getCORSImageUrl(shop.logo_url)}" crossorigin="anonymous" class="receipt-logo" alt="Logo" style="max-width: 52px; max-height: 52px; width: auto; height: auto;" />
      </div>
    `;
  } else {
    logoHtml = `
      <div class="shop-logo" style="width:52px;height:52px;margin: 0 auto 12px;background:transparent;border-radius:0;display:flex;align-items:center;justify-content:center;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; font-weight: 800; font-size: 16px; display: inline-flex; align-items: center; justify-content: center; text-transform: uppercase;">
          ${shopInitials}
        </div>
      </div>
    `;
  }

  let upiHtml = "";
  if (shop.upi_id) {
    const upiUri = `upi://pay?pa=${shop.upi_id}&pn=${encodeURIComponent(shopName)}&am=${grandTotal}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(upiUri)}`;
    upiHtml = `
      <div class="upi-label ${is80mm ? 'wide' : ''}">Scan &amp; Pay via UPI</div>
      <div class="qr-placeholder ${is80mm ? 'wide' : ''}" style="background: transparent; border: none;">
        <img src="${getCORSImageUrl(qrUrl)}" crossorigin="anonymous" alt="UPI" style="width: 100%; height: 100%; border-radius: 4px;" />
      </div>
      <div class="upi-id ${is80mm ? 'wide' : ''}">${shop.upi_id}</div>
    `;
  } else {
    upiHtml = `<div class="qr-placeholder ${is80mm ? 'wide' : ''}">▦</div>`;
  }

  let barcodeHtml = "";
  if (inv.invoice_number) {
    const barcodeVal = inv.invoice_number;
    const svgWidth = is80mm ? 260 : 200;
    const svgHeight = is80mm ? 30 : 24;
    let rects = "";
    let currX = 0;
    for (let i = 0; i < 28; i++) {
      const code = barcodeVal.charCodeAt(i % barcodeVal.length) + i;
      const w = code % 3 === 0 ? 3.5 : code % 3 === 1 ? 1.5 : 2.5;
      rects += `<rect x="${currX}" y="0" width="${w}" height="${svgHeight}"/>`;
      currX += w + (code % 2 === 0 ? 2 : 1.5);
      if (currX > svgWidth - 10) break;
    }
    barcodeHtml = `
      <div class="barcode-section" style="text-align: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee; width: 100%;">
        <svg class="barcode-svg ${is80mm ? 'wide' : ''}" viewBox="0 0 ${currX} ${svgHeight}" preserveAspectRatio="none" style="display: block; margin: 0 auto 4px; width: ${is80mm ? '180px' : '140px'}; height: ${is80mm ? '30px' : '24px'}; background: white;">
          <rect x="0" y="0" width="${currX}" height="${svgHeight}" fill="white"/>
          <g fill="#111">${rects}</g>
        </svg>
        <div class="barcode-number ${is80mm ? 'wide' : ''}">${barcodeVal}</div>
      </div>
    `;
  }

  let discountRow = "";
  if (discountAmount > 0.01) {
    discountRow = `
      <div class="totals-row">
        <span class="totals-key ${is80mm ? 'wide' : ''}" style="color: #16a34a;">Discount</span>
        <span class="totals-val ${is80mm ? 'wide' : ''}" style="color: #16a34a;">-₹${discountAmount.toFixed(2)}</span>
      </div>
    `;
  }

  const cssStyles = `
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
    .gst-modern-receipt .barcode-svg { width: 140px; height: 24px; margin: 0 auto 4px; display: block; }
    .gst-modern-receipt .barcode-svg.wide { width: 180px; height: 30px; }
    .gst-modern-receipt .barcode-number { font-family: 'IBM Plex Mono', monospace; font-size: 7.5px; letter-spacing: 2px; color: #aaa; }
    .gst-modern-receipt .barcode-number.wide { font-size: 8.5px; letter-spacing: 3px; }
    .gst-modern-receipt .w58 { width: 218px; }
    .gst-modern-receipt .w80 { width: 302px; }
  </style>
  `;

  return `
    ${cssStyles}
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <div class="gst-modern-receipt">
      <div class="receipt ${widthClass}">
        <div class="receipt-inner" ${is80mm ? 'style="padding:24px 20px 18px;"' : ''}>
          
          <div class="receipt-header">
            ${logoHtml}
            <div class="shop-name ${is80mm ? 'wide' : ''}">${shopName}</div>
            ${shop.address ? `<div class="shop-address ${is80mm ? 'wide' : ''}">${shop.address}</div>` : ""}
            ${shop.phone ? `<div class="shop-address ${is80mm ? 'wide' : ''}">Mob: ${shop.phone}</div>` : ""}
            ${shop.gstin ? `<div class="gstin-badge ${is80mm ? 'wide' : ''}">GSTIN: ${shop.gstin}</div>` : ""}
          </div>

          <div class="meta-section">
            <div class="meta-row">
              <span class="meta-key ${is80mm ? 'wide' : ''}">Invoice No.</span>
              <span class="meta-val inv-num ${is80mm ? 'wide' : ''}">${inv.invoice_number || ""}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key ${is80mm ? 'wide' : ''}">Date</span>
              <span class="meta-val ${is80mm ? 'wide' : ''}">${dateStr}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key ${is80mm ? 'wide' : ''}">Customer</span>
              <span class="meta-val ${is80mm ? 'wide' : ''}">${customerName}</span>
            </div>
            ${inv.customer_phone && !isWalkin ? `
              <div class="meta-row">
                <span class="meta-key ${is80mm ? 'wide' : ''}">Mobile</span>
                <span class="meta-val ${is80mm ? 'wide' : ''}">${inv.customer_phone}</span>
              </div>
            ` : ""}
            <div class="meta-row">
              <span class="meta-key ${is80mm ? 'wide' : ''}">Payment</span>
              <span class="meta-val ${is80mm ? 'wide' : ''}">${inv.payment_method || "CASH"}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key ${is80mm ? 'wide' : ''}">Type</span>
              <span class="meta-val ${is80mm ? 'wide' : ''}">${inv.billing_type || "B2C"}</span>
            </div>
          </div>

          <div class="items-section">
            <div class="items-header ${is80mm ? 'wide' : 'narrow'}">
              <span class="col-head">Item</span>
              <span class="col-head">Qty</span>
              <span class="col-head">Rate</span>
              <span class="col-head">Amt</span>
            </div>
            ${itemsHtml}
          </div>

          <div class="totals-section">
            <div class="totals-row">
              <span class="totals-key ${is80mm ? 'wide' : ''}">Subtotal</span>
              <span class="totals-val ${is80mm ? 'wide' : ''}">₹${subtotal.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span class="totals-key ${is80mm ? 'wide' : ''}">SGST + CGST</span>
              <span class="totals-val ${is80mm ? 'wide' : ''}">₹${taxAmount.toFixed(2)}</span>
            </div>
            ${inv.alteration_total > 0 ? `
            <div class="totals-row">
              <span class="totals-key ${is80mm ? 'wide' : ''}">Alterations</span>
              <span class="totals-val ${is80mm ? 'wide' : ''}">₹${parseFloat(inv.alteration_total).toFixed(2)}</span>
            </div>
            ` : ""}
            ${discountRow}
            <div class="grand-total-row">
              <span class="gt-label ${is80mm ? 'wide' : ''}">Total</span>
              <span class="gt-amount ${is80mm ? 'wide' : ''}">₹${grandTotal.toFixed(2)}</span>
            </div>
            <div class="payment-badge">
              <span class="badge cash">${(inv.payment_method || "CASH").toUpperCase()}</span>
              <span class="badge b2c">${(inv.billing_type || "B2C").toUpperCase()}</span>
            </div>
          </div>

          <div class="receipt-footer">
            <div class="thank-you ${is80mm ? 'wide' : ''}">✦ Thank You for Shopping! ✦</div>
            ${upiHtml}
            ${barcodeHtml}
          </div>

        </div>
      </div>
    </div>
  `;
}

// Helper: Wait for all images to fully load
const waitForImages = async (container) => {
  const imgs = Array.from(container.getElementsByTagName("img"));
  const promises = imgs.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // resolve anyway on error to avoid blocking
    });
  });
  await Promise.all(promises);
};

// Helper: Lock image sizes to prevent squishing/stretching in html2canvas
const lockImageDimensions = (container) => {
  const imgs = Array.from(container.getElementsByTagName("img"));
  imgs.forEach((img) => {
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (natW && natH) {
      const win = img.ownerDocument.defaultView || window;
      let maxW = natW;
      let maxH = natH;
      
      try {
        const computedStyle = win.getComputedStyle(img);
        maxW = parseFloat(computedStyle.maxWidth) || img.offsetWidth || natW;
        maxH = parseFloat(computedStyle.maxHeight) || img.offsetHeight || natH;
      } catch (e) {
        maxW = img.offsetWidth || natW;
        maxH = img.offsetHeight || natH;
      }

      if (!maxW || maxW === 0 || isNaN(maxW)) maxW = natW;
      if (!maxH || maxH === 0 || isNaN(maxH)) maxH = natH;

      // Special overrides for A4 templates logo/signature and B2C receipt logo
      if (img.classList.contains("sign-img")) {
        maxW = 120;
        maxH = 50;
      } else if (img.classList.contains("logo-img")) {
        maxW = 150;
        maxH = 48;
      } else if (img.classList.contains("receipt-logo")) {
        maxW = 52;
        maxH = 52;
      } else if (img.style.maxHeight === "48px" || (img.src && img.src.includes("logo"))) {
        maxW = 150;
        maxH = 48;
      }

      const ratio = natW / natH;
      let newW = natW;
      let newH = natH;

      // Maintain proportional aspect ratio within constraints
      if (newW > maxW) {
        newW = maxW;
        newH = newW / ratio;
      }
      if (newH > maxH) {
        newH = maxH;
        newW = newH * ratio;
      }

      img.style.width = `${newW}px`;
      img.style.height = `${newH}px`;
      img.style.maxWidth = "none";
      img.style.maxHeight = "none";
      img.style.objectFit = "contain";
      img.style.alignSelf = "flex-start"; // Prevent Flexbox stretch
    }
  });
};

// Render thermal slip to PDF
async function renderThermalToPDFBlob(inv, shop, printerSize = "58mm") {
  const is80mm = printerSize === "80mm";
  const widthPx = is80mm ? 380 : 280;
  const widthMm = is80mm ? 80 : 58;

  const html = generateThermalHTML(inv, shop, printerSize);

  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "0";
  tempDiv.style.width = `${widthPx}px`;
  tempDiv.style.background = "#ffffff";
  tempDiv.style.padding = "0";
  tempDiv.innerHTML = html;
  document.body.appendChild(tempDiv);

  // Wait for rendering and image load (qr code, logo, etc.)
  await waitForImages(tempDiv);
  lockImageDimensions(tempDiv);

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (e) {
    console.warn("Document fonts loading promise failed", e);
  }

  // Inject standard text rendering stabilizer styles specifically for the html2canvas engine capture
  const stabilizerStyle = document.createElement("style");
  stabilizerStyle.innerHTML = `
    .gst-modern-receipt * {
      letter-spacing: normal !important;
      word-spacing: normal !important;
      font-variant-numeric: lnum tabular-nums !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
    }
    .gst-modern-receipt .item-grid {
      align-items: center !important;
    }
    .gst-modern-receipt .meta-row {
      align-items: center !important;
    }
  `;
  tempDiv.appendChild(stabilizerStyle);

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 3, // High scale for crisp text
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: widthPx,
      windowWidth: widthPx,
    });

    document.body.removeChild(tempDiv);

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const heightMm = (canvas.height / canvas.width) * widthMm;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [widthMm, heightMm]
    });

    doc.addImage(imgData, "JPEG", 0, 0, widthMm, heightMm);
    return doc;
  } catch (err) {
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
    throw err;
  }
}

// Helper: render invoice HTML to a canvas, then to PDF blob
async function renderInvoiceToPDFBlob(inv, shop, forceA4 = false) {
  // Check if invoice is B2C (Default is B2C if billing_type is empty)
  const isB2C = !forceA4 && (inv.billing_type || "B2C").toUpperCase() === "B2C";
  
  if (isB2C) {
    // Determine roll size based on active selection in DOM, or shop settings
    const activeReceipt = document.querySelector(".thermal-receipt-print-area");
    let printerSize = "58mm";
    if (activeReceipt) {
      if (activeReceipt.classList.contains("printer-80mm")) {
        printerSize = "80mm";
      }
    } else if (shop.printer_size) {
      printerSize = shop.printer_size;
    }
    
    try {
      return await renderThermalToPDFBlob(inv, shop, printerSize);
    } catch (err) {
      console.error("Failed to generate thermal PDF, falling back to A4 template", err);
    }
  }

  // Standard A4 template generation for B2B or fallback
  const html = generateInvoiceHTML(inv, shop);

  // Use a dynamic iframe to isolate rendering, completely avoiding parent stylesheet (Tailwind, reset) leakage
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "800px";
  iframe.style.height = "1130px";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const docContext = iframe.contentWindow.document;
  docContext.open();
  docContext.write(html);
  docContext.close();

  // Wait for loading inside iframe context
  await new Promise((r) => {
    iframe.onload = r;
    setTimeout(r, 600); // safety fallback
  });

  const iframeBody = iframe.contentWindow.document.body;
  await waitForImages(iframeBody);
  lockImageDimensions(iframeBody);

  try {
    if (iframe.contentWindow.document.fonts && iframe.contentWindow.document.fonts.ready) {
      await iframe.contentWindow.document.fonts.ready;
    }
  } catch (e) {
    console.warn("Iframe fonts loading promise failed", e);
  }

  try {
    const canvas = await html2canvas(iframeBody, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: 800,
      windowWidth: 800,
    });

    document.body.removeChild(iframe);

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const imgWidth = 595.28; // A4 width in points
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const doc = new jsPDF("p", "pt", "a4");
    const pageHeight = 841.89; // A4 height in points
    let heightLeft = imgHeight;
    let position = 0;

    // First page
    doc.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Additional pages if content overflows
    while (heightLeft > 0) {
      position = -(pageHeight * (Math.ceil(imgHeight / pageHeight) - Math.ceil(heightLeft / pageHeight)));
      doc.addPage();
      doc.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return doc;
  } catch (err) {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    throw err;
  }
}

// Upload PDF to cloud and return URL (for WhatsApp sharing)
export async function generateAndUploadInvoicePDF(inv, shop, forceA4 = false) {
  const doc = await renderInvoiceToPDFBlob(inv, shop, forceA4);
  const blob = doc.output("blob");
  const file = new File([blob], `${inv.invoice_number || "invoice"}.pdf`, { type: "application/pdf" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

// Instant local PDF download - no cloud upload
export async function downloadInvoicePDF(inv, shop, forceA4 = false) {
  const doc = await renderInvoiceToPDFBlob(inv, shop, forceA4);
  const filename = `${inv.invoice_number || "invoice"}.pdf`;
  doc.save(filename);
  return filename;
}

// Generate PDF blob for WhatsApp Web Share API
export async function getInvoicePDFBlob(inv, shop, forceA4 = false) {
  const doc = await renderInvoiceToPDFBlob(inv, shop, forceA4);
  const blob = doc.output("blob");
  return new File([blob], `${inv.invoice_number || "invoice"}.pdf`, { type: "application/pdf" });
}
