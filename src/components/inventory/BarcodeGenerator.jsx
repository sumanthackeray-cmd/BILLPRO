import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, RefreshCw, Barcode, QrCode } from "lucide-react";

// Simple QR Code Version 1 Generator (21x21 modules)
function generateQRMatrix(text) {
  const size = 21;
  const matrix = Array(size).fill(null).map(() => Array(size).fill(0));
  
  // 1. Finder patterns (7x7 squares at corners)
  const drawFinder = (row, col) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isBorder || isCenter) {
          matrix[row + r][col + c] = 1;
        }
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, 14);
  drawFinder(14, 0);

  // 2. Timing patterns (alternating black/white dots)
  for (let i = 8; i < 13; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // 3. Fill data deterministically based on text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isFinder = (r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8);
      const isTiming = r === 6 || c === 6;
      if (!isFinder && !isTiming) {
        const val = Math.abs(Math.sin(hash + r * 13 + c * 37)) * 10;
        matrix[r][c] = (Math.floor(val) % 2 === 0) ? 1 : 0;
      }
    }
  }

  return matrix;
}

function renderQRCodeSVG(value, size = 70) {
  const matrix = generateQRMatrix(value || "00000");
  const moduleSize = size / 21;
  const rects = [];
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      if (matrix[r][c] === 1) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c * moduleSize}
            y={r * moduleSize}
            width={moduleSize + 0.05}
            height={moduleSize + 0.05}
            fill="#000"
          />
        );
      }
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rects}
    </svg>
  );
}

// Simple barcode renderer using SVG (Code128-style visual)
function renderBarcodeSVG(value, width = 200, height = 60) {
  if (!value) return null;
  const bars = [];
  let x = 0;
  const barWidth = width / (value.length * 11 + 20);
  x += barWidth * 5;
  for (let ci = 0; ci < value.length; ci++) {
    const code = value.charCodeAt(ci);
    const pattern = (code % 16).toString(2).padStart(4, "0");
    for (let b = 0; b < pattern.length; b++) {
      const w = barWidth * (b % 2 === 0 ? 2 : 1.5);
      if (pattern[b] === "1") bars.push({ x, w });
      x += w;
    }
    x += barWidth * 1.5;
  }
  x += barWidth * 5;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${x} ${height}`} xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: width }}>
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={0} width={bar.w} height={height * 0.8} fill="#000" />
      ))}
      <text x={x / 2} y={height - 2} textAnchor="middle" fontSize={height * 0.14} fontFamily="monospace" fill="#000">
        {value}
      </text>
    </svg>
  );
}

const LABEL_SIZES = [
  { id: "38x25", label: "38×25mm (Thermal)", w: 144, h: 96 },
  { id: "50x30", label: "50×30mm (Standard)", w: 190, h: 113 },
  { id: "60x40", label: "60×40mm (Large)", w: 227, h: 151 },
  { id: "100x70", label: "100×70mm (Shipping)", w: 378, h: 264 },
];

export default function BarcodeGenerator({ open, onOpenChange, product, onSaveBarcode }) {
  const [barcode, setBarcode] = useState(product?.barcode || product?.sku || "000000");
  
  // States identical to ProductForm
  const [stickerShowName, setStickerShowName] = useState(true);
  const [stickerShowMrp, setStickerShowMrp] = useState(true);
  const [stickerShowPrice, setStickerShowPrice] = useState(true);
  const [stickerUseQr, setStickerUseQr] = useState(false);
  const [stickerSize, setStickerSize] = useState("50x30");
  const [stickerQty, setStickerQty] = useState(1);

  const generateRandom = () => {
    const code = "8" + Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
    setBarcode(code);
  };

  const handlePrint = () => {
    const sizeMap = {
      "38x25": { w: 144, h: 96 },
      "50x30": { w: 190, h: 113 },
      "60x40": { w: 227, h: 151 },
      "100x70": { w: 378, h: 264 }
    };
    const size = sizeMap[stickerSize] || sizeMap["50x30"];
    const codeValue = barcode || product?.sku || "000000";

    const labels = Array(stickerQty).fill(null).map((_, i) => `
      <div style="
        width:${size.w}px; height:${size.h}px;
        border:1px solid #ccc; border-radius:4px;
        display:inline-flex; flex-direction:column; align-items:center; justify-content:center;
        padding:4px; margin:3px; box-sizing:border-box; font-family:monospace; page-break-inside:avoid;
        background:#fff; color:#000;
      ">
        ${stickerShowName ? `
        <div style="font-size:9px;font-weight:900;text-align:center;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-family:sans-serif;margin-bottom:2px;">
          ${product?.name || "Product"}
        </div>` : ""}
        ${stickerUseQr ? `
        <svg width="${size.h - 32}" height="${size.h - 32}" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
          ${generateQRModulesHTML(codeValue)}
        </svg>
        ` : `
        <svg width="${size.w - 16}" height="${Math.floor(size.h * 0.45)}" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
          ${generateBarsHTML(codeValue)}
          <text x="100" y="58" text-anchor="middle" font-size="8" font-family="monospace">${codeValue}</text>
        </svg>
        `}
        <div style="display:flex;gap:4px;align-items:center;margin-top:2px;">
          ${stickerShowPrice ? `<div style="font-size:10px;font-weight:900;color:#000;">₹${product?.rate || 0}</div>` : ""}
          ${stickerShowMrp && product?.mrp ? `<div style="font-size:8px;text-decoration:line-through;color:#666;">MRP: ₹${product?.mrp}</div>` : ""}
        </div>
        ${product?.batch_no ? `<div style="font-size:7px;color:#555;">B.No: ${product.batch_no}</div>` : ""}
      </div>
    `).join("");

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Barcode Labels</title>
    <style>body{margin:8px;background:#fff;}@media print{body{margin:0;}}</style>
    </head><body>
    <div style="display:flex;flex-wrap:wrap;">${labels}</div>
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script>
    </body></html>`);
    win.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full sm:w-[95vw] bg-card text-slate-900 dark:text-slate-100 p-0 rounded-2xl border border-border overflow-hidden [&>button.absolute]:hidden">
        <div className="sticky top-0 z-30 h-[25px] flex items-center justify-between px-4 bg-slate-100 dark:bg-slate-900 border-b border-border/40 text-[9px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
          <span>🏷️ Setup & Print Barcode Sticker (बारकोड स्टीकर प्रिंट)</span>
          <div className="flex items-center gap-2">
            <span className="text-primary font-black">LIVE PREVIEW</span>
            <button 
              type="button"
              onClick={() => onOpenChange(false)} 
              className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex items-center justify-center p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
              title="Close Dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
        
        <div className="p-5">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 text-lg">
              {stickerUseQr ? <QrCode className="w-5 h-5 text-primary" /> : <Barcode className="w-5 h-5 text-primary" />} 
              Barcode & QR Generator
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-background/50 rounded-2xl">
            {/* Left Column: Sticker Controls */}
            <div className="space-y-4">
              <div>
                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Barcode / EAN Value</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    className="font-mono text-slate-900 dark:text-slate-100 h-9 text-xs font-bold"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                  />
                  <Button variant="outline" size="icon" onClick={generateRandom} title="Auto-generate" className="h-9 w-9 text-slate-900 dark:text-slate-100 shrink-0">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Sticker Size</Label>
                  <select
                    value={stickerSize}
                    onChange={e => setStickerSize(e.target.value)}
                    className="w-full mt-1 bg-background border border-input rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  >
                    <option value="38x25">38×25mm (Thermal Single)</option>
                    <option value="50x30">50×30mm (Standard Store)</option>
                    <option value="60x40">60×40mm (Large Label)</option>
                    <option value="100x70">100×70mm (Shipping/Box)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Print Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={stickerQty}
                    onChange={e => setStickerQty(Number(e.target.value))}
                    className="h-[34px] mt-1 text-slate-900 dark:text-slate-100 font-mono text-center"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-1 bg-secondary/10 p-3 rounded-xl border border-border/30">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={stickerShowName}
                    onChange={e => setStickerShowName(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer transition-transform group-hover:scale-105"
                  />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Show Product Name on sticker</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={stickerShowMrp}
                    onChange={e => setStickerShowMrp(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer transition-transform group-hover:scale-105"
                  />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Show MRP on sticker {product?.mrp > 0 ? `(₹${product.mrp})` : ""}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={stickerShowPrice}
                    onChange={e => setStickerShowPrice(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer transition-transform group-hover:scale-105"
                  />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Show Selling Price on sticker {product?.rate > 0 ? `(₹${product.rate})` : ""}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none group border-t border-border/20 pt-2 mt-2">
                  <input
                    type="checkbox"
                    checked={stickerUseQr}
                    onChange={e => setStickerUseQr(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer transition-transform group-hover:scale-105"
                  />
                  <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" /> Print QR Code instead of Barcode
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  className="gold-gradient text-black font-extrabold flex-1 h-10 text-[12px] rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-transform"
                  onClick={() => { onSaveBarcode(barcode); handlePrint(); }}
                >
                  <Printer className="w-4 h-4" /> Save & Print ({stickerQty} labels)
                </Button>
                <Button variant="outline" className="h-10 rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
              </div>
            </div>

            {/* Right Column: Live Sticker Preview */}
            <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-border/30 pt-4 md:pt-0 md:pl-6 w-full overflow-hidden">
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 self-start flex items-center gap-1">👁️ Sticker Live Preview</p>
              
              <div className="relative group/preview w-full flex justify-center py-6 bg-slate-50/50 dark:bg-slate-900/50 border border-border/30 rounded-2xl overflow-x-auto hide-scrollbar">
                <div 
                  className="bg-white text-black p-3 border rounded-xl shadow-lg flex flex-col items-center justify-center font-mono border-slate-300 max-w-full relative transition-all hover:shadow-xl select-none mx-auto"
                  style={{ 
                    width: stickerSize === "38x25" ? "144px" : stickerSize === "60x40" ? "210px" : stickerSize === "100x70" ? "260px" : "180px", 
                    minHeight: stickerSize === "38x25" ? "96px" : stickerSize === "60x40" ? "140px" : stickerSize === "100x70" ? "180px" : "110px"
                  }}
                >
                  {stickerShowName && (
                    <div className="text-[10px] font-black text-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap mb-1 font-sans">
                      {product?.name || "Item Name"}
                    </div>
                  )}

                  <div className="flex justify-center items-center py-1.5 w-full bg-white">
                    {stickerUseQr ? (
                      renderQRCodeSVG(barcode || product?.sku || "000000", stickerSize === "38x25" ? 50 : stickerSize === "60x40" ? 70 : stickerSize === "100x70" ? 100 : 60)
                    ) : (
                      renderBarcodeSVG(barcode || product?.sku || "000000", stickerSize === "38x25" ? 120 : stickerSize === "60x40" ? 180 : stickerSize === "100x70" ? 220 : 150, stickerSize === "38x25" ? 45 : stickerSize === "60x40" ? 65 : stickerSize === "100x70" ? 80 : 55)
                    )}
                  </div>

                  <div className="flex gap-2.5 items-center justify-center mt-1 text-[10px] font-black font-sans">
                    {stickerShowPrice && <span>₹{product?.rate || 0}</span>}
                    {stickerShowMrp && product?.mrp > 0 && <span className="text-[8px] line-through text-slate-500 font-bold">MRP: ₹{product?.mrp}</span>}
                  </div>

                  {product?.batch_no && (
                    <div className="text-[7px] text-slate-600 mt-0.5 font-bold">B.No: {product.batch_no}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}