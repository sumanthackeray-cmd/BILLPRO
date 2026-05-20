import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR } from "@/lib/gst-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Package, Edit, Trash2, Barcode, Printer } from "lucide-react";
import { toast } from "sonner";
import BarcodeGenerator from "@/components/inventory/BarcodeGenerator";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { getCategoriesByShopType } from "@/lib/shopCategories";

import { ProductForm } from "@/components/inventory/ProductForm";

export default function Inventory() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const shopSettings = settings[0] || {};
  const businessType = shopSettings.business_type || "retail";

  const handleSave = async (formData) => {
    let createdProduct = null;
    if (editing) {
      await base44.entities.Product.update(editing.id, formData);
      toast.success("Product updated successfully!");
    } else {
      const created = await base44.entities.Product.create(formData);
      createdProduct = created;
      toast.success("Product added successfully!");
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setTimeout(() => {
      setShowForm(false);
      setEditing(null);
      if (createdProduct?.id) {
        setBarcodeProduct({ ...formData, id: createdProduct.id });
      }
    }, 2000);
  };

  const handleSaveBarcode = async (barcode) => {
    if (!barcodeProduct?.id) return;
    await base44.entities.Product.update(barcodeProduct.id, { barcode });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setBarcodeProduct(null);
    toast.success("Barcode saved!");
  };

  const toggleBulkSelect = (id) => {
    setBulkSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const printBulkBarcodes = () => {
    const selected = filtered.filter(p => bulkSelected.includes(p.id));
    if (selected.length === 0) return toast.info("Select products first");
    const labels = selected.flatMap(p =>
      Array(1).fill(`
        <div style="width:190px;height:113px;border:1px solid #ccc;border-radius:4px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;margin:3px;box-sizing:border-box;">
          <div style="font-size:9px;font-weight:900;text-align:center;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-family:sans-serif;">${p.name}</div>
          <svg width="170" height="55" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
            ${generateBarsHTML(p.barcode || p.sku || p.id.slice(-8))}
            <text x="100" y="58" text-anchor="middle" font-size="8" font-family="monospace">${p.barcode || p.sku || "——"}</text>
          </svg>
          <div style="font-size:11px;font-weight:900;">₹${p.rate || 0}</div>
        </div>
      `)
    ).join("");
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Bulk Barcodes</title><style>body{margin:8px;background:#fff;}@media print{body{margin:0;}}</style></head><body><div style="display:flex;flex-wrap:wrap;">${labels}</div><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script></body></html>`);
    win.document.close();
  };

  function generateBarsHTML(val) {
    if (!val) return "";
    let bars = []; let x = 5;
    const bw = 160 / (val.length * 9 + 10);
    for (let ci = 0; ci < val.length; ci++) {
      const c = val.charCodeAt(ci);
      const pat = (c % 16).toString(2).padStart(4, "0");
      for (let b = 0; b < pat.length; b++) {
        const w = bw * (b % 2 === 0 ? 2 : 1.5);
        if (pat[b] === "1") bars.push(`<rect x="${x}" y="0" width="${w}" height="48" fill="#000"/>`);
        x += w;
      }
      x += bw;
    }
    return bars.join("");
  }

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await base44.entities.Product.delete(id);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success("Product deleted");
  };

  const categories = useMemo(() => getCategoriesByShopType(businessType), [businessType]);

  const customCategories = useMemo(() => {
    const predefinedNames = new Set(categories.map(c => c.name.toLowerCase()));
    const productCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return productCategories.filter(cat => !predefinedNames.has(cat.toLowerCase()));
  }, [products, categories]);

  const tabs = useMemo(() => [
    { name: "all", label: "All Items", hindi: "सभी वस्तुएं" },
    ...categories.map(c => ({ name: c.name, label: c.name, hindi: c.hindi })),
    ...customCategories.map(c => ({ name: c, label: c, hindi: "" }))
  ], [categories, customCategories]);

  const filtered = useMemo(() => {
    let list = products;
    if (selectedCategory !== "all") {
      list = list.filter(p => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.name + (p.sku || "") + (p.category || "") + (p.barcode || "")).toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, selectedCategory, search]);

  const metrics = useMemo(() => {
    const list = products.filter(p => {
      if (selectedCategory === "all") return true;
      return p.category?.toLowerCase() === selectedCategory.toLowerCase();
    });
    const count = list.length;
    let totalStock = 0;
    let valuation = 0;
    list.forEach(p => {
      if (!p.infinite_stock) {
        const stockVal = Number(p.stock) || 0;
        totalStock += stockVal;
        const price = Number(p.purchase_rate) || Number(p.rate) || 0;
        valuation += price * stockVal;
      }
    });
    return { count, totalStock, valuation };
  }, [products, selectedCategory]);

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">📦 Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} products · {products.filter(p => p.stock <= p.min_stock).length} low stock</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm"
            className={bulkMode ? "border-primary text-primary" : ""}
            onClick={() => { setBulkMode(!bulkMode); setBulkSelected([]); }}>
            <Barcode className="w-3.5 h-3.5 mr-1.5" /> {bulkMode ? "Exit Bulk" : "Bulk Barcode"}
          </Button>
          {bulkMode && bulkSelected.length > 0 && (
            <Button size="sm" className="gold-gradient text-black font-bold gap-1.5" onClick={printBulkBarcodes}>
              <Printer className="w-3.5 h-3.5" /> Print ({bulkSelected.length})
            </Button>
          )}
          <Button className="gold-gradient text-black font-bold gap-2" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Horizontally Scrollable Glassmorphic Category Selector */}
      <div className="w-full overflow-x-auto no-scrollbar py-1">
        <div className="flex gap-2 min-w-max p-1.5 bg-card/45 backdrop-blur-md border border-border/40 rounded-xl shadow-lg">
          {tabs.map((tab) => {
            const isActive = selectedCategory.toLowerCase() === tab.name.toLowerCase();
            return (
              <button
                key={tab.name}
                onClick={() => setSelectedCategory(tab.name)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex flex-col items-center justify-center gap-0.5 min-h-[44px]",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                {tab.hindi && <span className="opacity-70 text-[9px] font-normal font-sans">{tab.hindi}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category-Specific Metrics Widget */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-card/30 backdrop-blur-sm border border-border/40 rounded-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-10 -top-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-black">Category Mode</span>
          <span className="text-sm font-bold text-foreground mt-1 flex items-center gap-1.5">
            {selectedCategory === "all" ? "🌐 All Items" : `📁 ${tabs.find(t => t.name.toLowerCase() === selectedCategory.toLowerCase())?.label || selectedCategory}`}
            {selectedCategory !== "all" && tabs.find(t => t.name.toLowerCase() === selectedCategory.toLowerCase())?.hindi && (
              <span className="text-xs text-muted-foreground font-normal">
                ({tabs.find(t => t.name.toLowerCase() === selectedCategory.toLowerCase())?.hindi})
              </span>
            )}
          </span>
        </div>

        <div className="flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-border/40 pt-2 sm:pt-0 sm:pl-4">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-black">Stock Valuation</span>
          <span className="text-lg font-black font-mono text-emerald-400 mt-0.5">
            {fmtINR(metrics.valuation)}
          </span>
        </div>

        <div className="flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-border/40 pt-2 sm:pt-0 sm:pl-4">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-black">Stock Stats</span>
          <span className="text-sm font-bold text-foreground mt-1">
            {metrics.count} Items · <span className="font-mono">{metrics.totalStock}</span> Units
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No products found</p>
          </div>
        )}
        {filtered.map(p => {
          const isLow = p.stock > 0 && p.stock <= (p.min_stock || 10);
          const isOut = p.stock === 0;
          const isSelected = bulkSelected.includes(p.id);
          return (
            <div key={p.id} className={`bg-card border rounded-xl p-4 hover:border-primary/20 transition-all ${isSelected ? "border-primary/50 bg-primary/5" : "border-border"}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2.5">
                  {bulkMode && (
                    <input type="checkbox" checked={isSelected} onChange={() => toggleBulkSelect(p.id)}
                      className="mt-2.5 w-4 h-4 accent-primary cursor-pointer" />
                  )}
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-border mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold text-[14px]">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.sku || "—"} · {p.category || "—"} · HSN: {p.hsn || "—"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setBarcodeProduct(p)} className="p-1.5 rounded hover:bg-primary/10 text-primary" title="Barcode">
                    <Barcode className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge variant="outline" className="text-primary border-primary/30 text-[10px] font-bold">Sell: {fmtINR(p.rate)}</Badge>
                {p.purchase_rate > 0 && (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/25 bg-emerald-500/5 text-[10px] font-bold">Buy: {fmtINR(p.purchase_rate)}</Badge>
                )}
                {p.wholesale_price > 0 && (
                  <Badge variant="outline" className="text-amber-400 border-amber-500/25 bg-amber-500/5 text-[10px] font-bold">Wholesale: {fmtINR(p.wholesale_price)}</Badge>
                )}
                {p.mrp > 0 && p.mrp !== p.rate && <span className="text-[10px] text-muted-foreground line-through">MRP {fmtINR(p.mrp)}</span>}
                <Badge variant="outline" className="text-[10px]">{p.gst_rate || 0}% GST</Badge>
                <Badge variant="outline" className="text-[10px]">{p.unit}</Badge>
                
                {/* Additional vertical-specific badges on card */}
                {p.is_weighed && (
                  <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[9px] font-black">WEIGHED</Badge>
                )}
                {p.sizes && p.sizes.length > 0 && (
                  <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[9px] font-black">
                    SIZES: {p.sizes.join(",")}
                  </Badge>
                )}
                {p.colors && (
                  <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-black">
                    COL: {p.colors}
                  </Badge>
                )}
                {p.batch_no && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black">
                    BATCH: {p.batch_no}
                  </Badge>
                )}
                {p.expiry_date && (
                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black">
                    EXP: {p.expiry_date}
                  </Badge>
                )}
                {p.supplier_name && (
                  <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-black">
                    SUPPLIER: {p.supplier_name}
                  </Badge>
                )}
                {p.rack_location && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[9px] font-black">
                    LOC: {p.rack_location}
                  </Badge>
                )}
                {p.manufacturer_name && (
                  <Badge className="bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[9px] font-black">
                    MFG: {p.manufacturer_name}
                  </Badge>
                )}
                {p.infinite_stock && (
                  <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-[9px] font-black">
                    ∞ INFINITE
                  </Badge>
                )}
                {p.loose_selling && (
                  <Badge className="bg-pink-500/20 text-pink-400 border border-pink-500/30 text-[9px] font-black">
                    LOOSE: {p.total_sellable_units || 0} {p.selling_unit || "PCS"} (₹{p.price_per_unit || 0}/{p.selling_unit || "unit"})
                  </Badge>
                )}
              </div>
              
              {p.description && (
                <p className="text-[11px] text-muted-foreground bg-secondary/20 p-2 rounded-lg mb-3 line-clamp-2">
                  {p.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground">Stock:</span>
                  <span className={`font-bold font-mono text-[14px] ${p.infinite_stock ? "text-success" : isOut ? "text-destructive" : isLow ? "text-warning" : "text-success"}`}>
                    {p.infinite_stock ? "∞" : p.stock}
                  </span>
                </div>
                {!p.infinite_stock && (isOut || isLow) && (
                  <Badge variant="outline" className={`text-[10px] ${isOut ? "border-destructive/30 text-destructive" : "border-warning/30 text-warning"}`}>
                    {isOut ? "OUT OF STOCK" : "LOW STOCK"}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <ProductForm 
          open={showForm} 
          onOpenChange={setShowForm} 
          product={editing} 
          onSave={handleSave} 
          businessType={businessType} 
        />
      )}

      {barcodeProduct && (
        <BarcodeGenerator
          open={!!barcodeProduct}
          onOpenChange={(v) => { if (!v) setBarcodeProduct(null); }}
          product={barcodeProduct}
          onSaveBarcode={handleSaveBarcode}
        />
      )}
    </div>
  );
}