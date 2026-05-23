import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR } from "@/lib/gst-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Search, ScanBarcode, Printer, Settings2, CheckSquare, Square } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";

const LABEL_SIZES = [
  { id: "38x25", label: "38×25mm (Thermal Small)", cols: 3, w: "144px", h: "96px" },
  { id: "50x30", label: "50×30mm (Thermal Medium)", cols: 3, w: "189px", h: "113px" },
  { id: "60x40", label: "60×40mm (Thermal Large)", cols: 3, w: "227px", h: "151px" },
  { id: "100x50", label: "100×50mm (Label Printer)", cols: 2, w: "378px", h: "189px" },
  { id: "a4_3col", label: "A4 – 3 per row", cols: 3, w: "auto", h: "auto" },
];

export default function Barcode() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [labelSize, setLabelSize] = useState("38x25");
  const [showOptions, setShowOptions] = useState(false);
  const [opts, setOpts] = useState({
    showName: true,
    showPrice: true,
    showMrp: true,
    showSku: true,
    showBatch: false,
    showExpiry: false,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const filtered = products.filter(p =>
    (p.name + (p.sku || "") + (p.barcode || "")).toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const selectAll = () => setSelected(filtered.map(p => p.id));
  const clearAll = () => setSelected([]);

  const toggleOpt = (key) => setOpts(o => ({ ...o, [key]: !o[key] }));

  const printLabels = () => {
    const selectedProducts = products.filter(p => selected.includes(p.id));
    const size = LABEL_SIZES.find(s => s.id === labelSize);
    const cols = size.cols;

    const labelHtml = selectedProducts.map(p => {
      const barcodeVal = p.barcode || p.sku || p.id.slice(-8).toUpperCase();
      // Generate deterministic bar widths from barcode value
      const bars = Array.from({ length: 36 }, (_, i) => {
        const code = barcodeVal.charCodeAt(i % barcodeVal.length) + i;
        return code % 3 === 0 ? 3 : code % 3 === 1 ? 2 : 1;
      });

      return `<div class="label">
        ${opts.showName ? `<div class="pname">${p.name}</div>` : ""}
        <div class="barcode-wrap">
          ${bars.map(w => `<div class="bar" style="width:${w}px"></div>`).join("")}
        </div>
        <div class="bcode-txt">${barcodeVal}</div>
        ${opts.showPrice ? `<div class="price">₹${(p.rate || 0).toFixed(2)}</div>` : ""}
        ${opts.showMrp && p.mrp && p.mrp !== p.rate ? `<div class="mrp">MRP: ₹${(p.mrp || 0).toFixed(2)}</div>` : ""}
        ${opts.showSku && p.sku ? `<div class="sku">SKU: ${p.sku}</div>` : ""}
        ${opts.showBatch && p.batch_no ? `<div class="sku">Batch: ${p.batch_no}</div>` : ""}
        ${opts.showExpiry && p.expiry_date ? `<div class="sku">Exp: ${p.expiry_date}</div>` : ""}
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html>
    <head>
      <title>Barcode Labels - EasyBMT</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: white; }
        .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 4px; padding: 10px; }
        .label { border: 1px solid #ccc; padding: 5px; text-align: center; border-radius: 3px; page-break-inside: avoid; background: white; }
        .pname { font-size: 9px; font-weight: 900; margin-bottom: 3px; line-height: 1.2; word-break: break-word; }
        .barcode-wrap { display: flex; justify-content: center; align-items: flex-end; gap: 1px; height: 28px; margin: 3px 0; background: white; }
        .bar { background: #000; height: 26px; }
        .bcode-txt { font-family: monospace; font-size: 7px; color: #333; letter-spacing: 0.5px; margin-bottom: 3px; }
        .price { font-size: 13px; font-weight: 900; color: #000; }
        .mrp { font-size: 8px; color: #888; text-decoration: line-through; }
        .sku { font-size: 7px; color: #777; font-family: monospace; }
        @media print {
          body { margin: 0; }
          @page { margin: 5mm; }
        }
      </style>
    </head>
    <body>
      <div class="grid">${labelHtml}</div>
      <script>window.onload = () => { setTimeout(() => window.print(), 400); }</script>
    </body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(html);
    w.document.close();
  };

  const OPTION_LABELS = [
    { key: "showName", label: "Product Name" },
    { key: "showPrice", label: "Selling Price" },
    { key: "showMrp", label: "MRP" },
    { key: "showSku", label: "SKU Code" },
    { key: "showBatch", label: "Batch Number" },
    { key: "showExpiry", label: "Expiry Date" },
  ];

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">🔖 Barcode & Label Printer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate & print professional barcode labels</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowOptions(v => !v)}>
            <Settings2 className="w-4 h-4" /> Print Options
          </Button>
          {selected.length > 0 && (
            <Button className="gold-gradient text-black font-bold gap-2" onClick={printLabels}>
              <Printer className="w-4 h-4" /> Print {selected.length} Label(s)
            </Button>
          )}
        </div>
      </div>

      {/* Print options panel */}
      {showOptions && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-fade-up">
          <h3 className="font-bold text-sm">🖨️ Print Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[11px] mb-2 block">Label Size / Format</Label>
              <SearchableSelect
                options={LABEL_SIZES.map(s => ({ value: s.id, label: s.label }))}
                value={labelSize}
                onValueChange={setLabelSize}
                placeholder="Select Size"
                searchPlaceholder="Search size..."
              />
            </div>
            <div>
              <Label className="text-[11px] mb-2 block">Fields to Print</Label>
              <div className="grid grid-cols-2 gap-2">
                {OPTION_LABELS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleOpt(key)}
                    className={`flex items-center gap-2 text-[12px] p-2 rounded-lg border transition-all ${opts[key] ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border/80"}`}
                  >
                    {opts[key] ? <CheckSquare className="w-3.5 h-3.5 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + bulk select */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, SKU or barcode..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={selectAll} className="text-[12px]">Select All</Button>
        {selected.length > 0 && <Button variant="ghost" size="sm" onClick={clearAll} className="text-[12px] text-muted-foreground">Clear</Button>}
        {selected.length > 0 && <Badge variant="outline" className="border-primary/30 text-primary">{selected.length} selected</Badge>}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <ScanBarcode className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No products found</p>
          </div>
        )}
        {filtered.map(p => {
          const isSelected = selected.includes(p.id);
          const barcodeVal = p.barcode || p.sku || p.id.slice(-8).toUpperCase();
          const bars = Array.from({ length: 28 }, (_, i) => {
            const code = barcodeVal.charCodeAt(i % barcodeVal.length) + i;
            return code % 3 === 0 ? 3 : code % 3 === 1 ? 2 : 1;
          });

          return (
            <div
              key={p.id}
              onClick={() => toggleSelect(p.id)}
              className={`bg-card border rounded-xl p-4 cursor-pointer transition-all hover:border-primary/30 select-none ${isSelected ? "border-primary ring-1 ring-primary/30 bg-primary/5" : "border-border"}`}
            >
              <div className="text-center">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[12px] text-left truncate flex-1 mr-2">{p.name}</span>
                  {isSelected
                    ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    : <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                </div>

                {/* Barcode visual */}
                <div className="bg-white rounded-lg px-3 py-3 mb-2 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-px">
                    {bars.map((w, i) => (
                      <div key={i} className="bg-black" style={{ width: w, height: 28 }} />
                    ))}
                  </div>
                  <p className="text-black font-mono text-[9px] tracking-widest">{barcodeVal}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] mt-1">
                  <span className="text-muted-foreground">{p.sku || p.category || "—"}</span>
                  <span className="font-black text-primary">{fmtINR(p.rate)}</span>
                </div>
                {p.mrp > 0 && p.mrp !== p.rate && (
                  <p className="text-[10px] text-muted-foreground">MRP: {fmtINR(p.mrp)}</p>
                )}
                {p.stock <= p.min_stock && (
                  <Badge variant="outline" className={`text-[9px] mt-1.5 ${p.stock === 0 ? "border-destructive/30 text-destructive" : "border-warning/30 text-warning"}`}>
                    {p.stock === 0 ? "Out of Stock" : `Low: ${p.stock}`}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}