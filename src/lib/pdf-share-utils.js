import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { base44 } from "@/api/base44Client";
import { generateInvoiceHTML } from "@/components/invoices/InvoicePrintPreview";

window.html2canvas = html2canvas;

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
function generateThermalHTML(inv, shop, printerSize = "58mm") {
  const is80mm = printerSize === "80mm";
  const widthPx = is80mm ? 340 : 260;
  const dateStr = inv.date ? formatReceiptDate(inv.date) : "";
  const shopName = (!shop.shop_name || shop.shop_name === "Vogats") ? "GSTBILL PRO SHOP" : shop.shop_name;
  const shopInitials = getInitials(shopName);

  const itemsHtml = (inv.items || []).map(item => `
    <tr style="border-bottom: 1px dashed #e2e8f0;">
      <td style="padding: 4px 0; text-align: left; word-break: break-all; max-width: 120px;">${item.name}</td>
      <td style="padding: 4px 0; text-align: right; font-family: monospace;">${item.qty}</td>
      <td style="padding: 4px 0; text-align: right; font-family: monospace;">₹${parseFloat(item.rate).toFixed(2)}</td>
      <td style="padding: 4px 0; text-align: right; font-family: monospace;">₹${(item.qty * item.rate).toFixed(2)}</td>
    </tr>
  `).join("");

  const subtotal = inv.subtotal || 0;
  const taxAmount = inv.tax_amount || 0;
  const grandTotal = inv.grand_total || 0;
  const discountAmount = subtotal + taxAmount - grandTotal;

  let discountRow = "";
  if (discountAmount > 0.01) {
    discountRow = `
      <div style="display: flex; justify-content: space-between; color: #16a34a; font-weight: bold; margin-bottom: 2px;">
        <span>Discount Applied</span>
        <span>-₹${discountAmount.toFixed(2)}</span>
      </div>
    `;
  }

  const customerName = inv.customer_name || "Walk-in Customer";
  const isWalkin = customerName.toLowerCase().includes("walk-in");
  const customerDisplay = isWalkin 
    ? `Walk-in Customer <span style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #64748b; padding: 1px 3px; font-size: 7px; font-weight: bold; border-radius: 2px; text-transform: uppercase; line-height: 1;">Walk-in</span>`
    : customerName;

  let mobileRow = "";
  if (!isWalkin && inv.customer_phone) {
    mobileRow = `
      <tr>
        <td style="font-size: 9px; color: #64748b; text-align: left; padding: 2px 0;">Mobile</td>
        <td style="font-size: 10px; color: #0f172a; font-weight: bold; text-align: right; font-family: monospace; padding: 2px 0;">${inv.customer_phone}</td>
      </tr>
    `;
  }

  let logoHtml = "";
  if (shop.logo_url) {
    logoHtml = `
      <div style="margin-bottom: 6px; display: flex; justify-content: center;">
        <img src="${shop.logo_url}" alt="Logo" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0;" />
      </div>
    `;
  } else {
    logoHtml = `
      <div style="margin-bottom: 6px; display: flex; justify-content: center;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; text-transform: uppercase;">
          ${shopInitials}
        </div>
      </div>
    `;
  }

  let gstinHtml = "";
  if (shop.gstin) {
    gstinHtml = `
      <p style="font-size: 9px; color: #94a3b8; font-weight: 600; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px;">GSTIN: ${shop.gstin}</p>
    `;
  }

  let upiHtml = "";
  if (shop.upi_id) {
    const upiUri = `upi://pay?pa=${shop.upi_id}&pn=${encodeURIComponent(shopName)}&am=${grandTotal}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(upiUri)}`;
    upiHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; margin-top: 8px;">
        <span style="font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase;">Scan & Pay via UPI</span>
        <img src="${qrUrl}" alt="UPI QR" style="width: 80px; height: 80px; border: 1px solid #cbd5e1; padding: 2px; background: #fff;" />
        <span style="font-size: 7.5px; font-family: monospace; color: #475569;">${shop.upi_id}</span>
      </div>
    `;
  }

  let barcodeHtml = "";
  if (inv.invoice_number) {
    const barcodeVal = inv.invoice_number;
    const bars = Array.from({ length: 24 }, (_, i) => {
      const code = barcodeVal.charCodeAt(i % barcodeVal.length) + i;
      return code % 3 === 0 ? "3px" : code % 3 === 1 ? "1px" : "2px";
    });
    const barsHtml = bars.map(w => `<div style="background: black; width: ${w}; height: 100%;"></div>`).join("<div style='width: 1px;'></div>");
    
    barcodeHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 3px; margin-top: 10px;">
        <div style="height: 24px; width: 144px; background: white; display: flex; align-items: stretch; justify-content: center; padding: 2px; border: 1px solid #cbd5e1;">
          ${barsHtml}
        </div>
        <span style="font-size: 8px; font-family: monospace; font-weight: bold; color: #475569; letter-spacing: 2px;">${barcodeVal}</span>
      </div>
    `;
  }

  return `
    <div style="width: ${widthPx}px; background: #ffffff; padding: 12px; font-family: 'JetBrains Mono', 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.35; color: #000000; box-sizing: border-box; overflow: hidden; position: relative;">
      
      <!-- Shop Header -->
      <div style="text-align: center; padding-bottom: 8px; border-bottom: 1px dashed #cbd5e1; display: flex; flex-direction: column; align-items: center;">
        ${logoHtml}
        <h3 style="font-weight: 800; font-size: 15px; margin: 0; text-transform: uppercase; color: #000; line-height: 1.2;">${shopName}</h3>
        ${shop.address ? `<p style="font-size: 10px; color: #64748b; margin: 4px 0 0 0; line-height: 1.3; max-width: 90%; font-weight: 500;">${shop.address}</p>` : ""}
        ${shop.phone ? `<p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0; font-weight: 500;">Mob: ${shop.phone}</p>` : ""}
        ${gstinHtml}
      </div>

      <!-- Invoice Meta -->
      <div style="border-bottom: 1px dashed #cbd5e1; padding: 6px 0; margin-bottom: 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="font-size: 9px; color: #64748b; text-align: left; padding: 2px 0; width: 40%;">Invoice No.</td>
              <td style="font-size: 10px; color: #0f172a; font-weight: bold; text-align: right; font-family: monospace; padding: 2px 0;">${inv.invoice_number || ""}</td>
            </tr>
            <tr>
              <td style="font-size: 9px; color: #64748b; text-align: left; padding: 2px 0;">Date</td>
              <td style="font-size: 10px; color: #0f172a; font-weight: bold; text-align: right; padding: 2px 0;">${dateStr}</td>
            </tr>
            <tr>
              <td style="font-size: 9px; color: #64748b; text-align: left; padding: 2px 0;">Customer</td>
              <td style="font-size: 10px; color: #0f172a; font-weight: bold; text-align: right; padding: 2px 0; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">${customerDisplay}</td>
            </tr>
            ${mobileRow}
            <tr>
              <td style="font-size: 9px; color: #64748b; text-align: left; padding: 2px 0;">Payment Mode</td>
              <td style="font-size: 10px; color: #0f172a; font-weight: bold; text-align: right; text-transform: uppercase; padding: 2px 0;">${inv.payment_method || ""}</td>
            </tr>
            <tr>
              <td style="font-size: 9px; color: #64748b; text-align: left; padding: 2px 0;">Type</td>
              <td style="font-size: 10px; color: #0f172a; font-weight: bold; text-align: right; font-family: monospace; padding: 2px 0;">${inv.billing_type || "B2C"}</td>
            </tr>
          </tbody>
        </table>
        ${inv.notes ? `<div style="color: #0f172a; font-style: italic; font-size: 9.5px; font-weight: bold; margin-top: 4px; text-align: center;">${inv.notes}</div>` : ""}
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 4px; border-bottom: 1px dashed #cbd5e1;">
        <thead>
          <tr style="border-bottom: 1px dashed #cbd5e1;">
            <th style="text-align: left; font-weight: bold; padding: 4px 0; font-size: 10px;">Item</th>
            <th style="text-align: right; font-weight: bold; padding: 4px 0; font-size: 10px;">Qty</th>
            <th style="text-align: right; font-weight: bold; padding: 4px 0; font-size: 10px;">Rate</th>
            <th style="text-align: right; font-weight: bold; padding: 4px 0; font-size: 10px;">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 9.5px; border-bottom: 1px dashed #cbd5e1;">
        <div style="display: flex; justify-content: space-between; color: #4b5563; margin-bottom: 2px;">
          <span>Subtotal</span>
          <span>₹${subtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #4b5563; margin-bottom: 2px;">
          <span>SGST + CGST</span>
          <span>₹${taxAmount.toFixed(2)}</span>
        </div>
        ${discountRow}
        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 900; color: #000; border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 4px;">
          <span>GRAND TOTAL</span>
          <span>₹${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 8px;">
        <p style="font-size: 9px; color: #64748b; font-weight: bold; margin: 0 0 6px 0;">*** Thank You for Shopping! ***</p>
        ${upiHtml}
        ${barcodeHtml}
      </div>

    </div>
  `;
}

// Render thermal slip to PDF
async function renderThermalToPDFBlob(inv, shop, printerSize = "58mm") {
  const is80mm = printerSize === "80mm";
  const widthPx = is80mm ? 340 : 260;
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
  await new Promise((r) => setTimeout(r, 450));

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
async function renderInvoiceToPDFBlob(inv, shop) {
  // Check if invoice is B2C (Default is B2C if billing_type is empty)
  const isB2C = (inv.billing_type || "B2C").toUpperCase() === "B2C";
  
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

  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "0";
  tempDiv.style.width = "800px";
  tempDiv.style.background = "#fff";
  tempDiv.style.padding = "0";
  tempDiv.innerHTML = html;
  document.body.appendChild(tempDiv);

  // Wait for fonts/images to load
  await new Promise((r) => setTimeout(r, 300));

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: 800,
      windowWidth: 800,
    });

    document.body.removeChild(tempDiv);

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
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
    throw err;
  }
}

// Upload PDF to cloud and return URL (for WhatsApp sharing)
export async function generateAndUploadInvoicePDF(inv, shop) {
  const doc = await renderInvoiceToPDFBlob(inv, shop);
  const blob = doc.output("blob");
  const file = new File([blob], `${inv.invoice_number || "invoice"}.pdf`, { type: "application/pdf" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

// Instant local PDF download - no cloud upload
export async function downloadInvoicePDF(inv, shop) {
  const doc = await renderInvoiceToPDFBlob(inv, shop);
  const filename = `${inv.invoice_number || "invoice"}.pdf`;
  doc.save(filename);
  return filename;
}

// Generate PDF blob for WhatsApp Web Share API
export async function getInvoicePDFBlob(inv, shop) {
  const doc = await renderInvoiceToPDFBlob(inv, shop);
  const blob = doc.output("blob");
  return new File([blob], `${inv.invoice_number || "invoice"}.pdf`, { type: "application/pdf" });
}
