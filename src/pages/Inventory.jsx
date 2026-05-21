import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR } from "@/lib/gst-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Search, Package, Edit, Trash2, Barcode, TrendingDown, TrendingUp,
  AlertTriangle, RefreshCw, ArrowDownCircle, ArrowUpCircle, BarChart3,
  Filter, Download, Upload, ScanBarcode, Eye, X, ChevronDown, ChevronUp,
  CheckSquare, Square, Layers, Tag, RotateCcw
} from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getCategoriesByShopType } from "@/lib/shopCategories";
import { subscribeToBranchInventory, updateInventory, getInventory } from "@/api/inventorySyncService";
import { ProductForm } from "@/components/inventory/ProductForm";
import BarcodeGenerator from "@/components/inventory/BarcodeGenerator";
import { useLanguage } from "@/lib/LanguageContext";

// ─── Stock Movement Dialog ────────────────────────────────────────────────────
function StockAdjustDialog({ product, branchId, onClose, onDone }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState("in"); // in | out | adjust
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const currentStock = product?.stock ?? 0;
  const newStock = mode === "in"
    ? currentStock + (parseFloat(qty) || 0)
    : mode === "out"
    ? Math.max(0, currentStock - (parseFloat(qty) || 0))
    : parseFloat(qty) || 0;

  const handleSubmit = async () => {
    const q = parseFloat(qty);
    if (!q || q <= 0) { toast.error("Enter a valid quantity"); return; }
    if (!branchId) { toast.error("Select an active branch first"); return; }
    setSaving(true);
    try {
      let delta = 0;
      if (mode === "in") delta = q;
      else if (mode === "out") delta = -q;
      else delta = q - currentStock; // adjust to exact value
      await updateInventory(product.id, branchId, delta, reason || mode);
      // Also update global product stock
      await base44.entities.Product.update(product.id, { stock: Math.max(0, newStock) });
      toast.success(`Stock ${mode === "in" ? "added" : mode === "out" ? "deducted" : "adjusted"} successfully!`);
      onDone();
      onClose();
    } catch (err) {
      toast.error("Failed to update stock: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const MODES = [
    { id: "in", label: t("inventory.stock_in"), icon: ArrowUpCircle, color: "text-green-500", bg: "bg-green-500/10 border-green-500/30" },
    { id: "out", label: t("inventory.stock_out"), icon: ArrowDownCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/30" },
    { id: "adjust", label: t("inventory.set_exact"), icon: RotateCcw, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30" },
  ];

  const REASONS = {
    in: [t("inventory.purchase_grn"), t("inventory.customer_return"), t("inventory.transfer_in"), t("inventory.opening_stock"), t("inventory.other")],
    out: [t("inventory.sale_billing"), t("inventory.damage_wastage"), t("inventory.transfer_out"), t("inventory.expired"), t("inventory.other")],
    adjust: [t("inventory.physical_count"), t("inventory.audit_correction"), t("inventory.system_sync") || "System Sync", t("inventory.other")],
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[88vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-3 border-b border-border sticky top-0 bg-card z-10">
          <DialogTitle className="text-sm font-black flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> {t("inventory.stock_adjust")}
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">{product?.name}</p>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Current Stock */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-secondary/50 rounded-xl p-3 text-center col-span-1">
              <p className="text-[10px] text-muted-foreground font-semibold">{t("inventory.current_stock")}</p>
              <p className="text-xl font-black">{currentStock}</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 text-center col-span-1">
              <p className="text-[10px] text-muted-foreground font-semibold">{t("inventory.change")}</p>
              <p className={cn("text-xl font-black", mode === "in" ? "text-green-500" : mode === "out" ? "text-red-500" : "text-blue-500")}>
                {mode === "in" ? "+" : mode === "out" ? "-" : "→"}{qty || 0}
              </p>
            </div>
            <div className={cn("rounded-xl p-3 text-center col-span-1", newStock < (product?.min_stock || 5) ? "bg-red-500/10" : "bg-green-500/10")}>
              <p className="text-[10px] text-muted-foreground font-semibold">{t("inventory.after")}</p>
              <p className={cn("text-xl font-black", newStock < (product?.min_stock || 5) ? "text-red-500" : "text-green-500")}>{newStock}</p>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); setReason(""); }}
                  className={cn("flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all", mode === m.id ? m.bg + " " + m.color : "border-border text-muted-foreground hover:bg-secondary/50")}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-bold">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">{mode === "adjust" ? t("inventory.set_exact") : t("inventory.quantity")}</Label>
            <Input
              type="number"
              min="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder={mode === "adjust" ? "Enter exact stock count..." : "Enter quantity..."}
              className="text-lg font-bold h-11"
              autoFocus
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">{t("inventory.reason")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select reason..." /></SelectTrigger>
              <SelectContent>
                {REASONS[mode].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={onClose}>{t("common.cancel")}</Button>
          <Button className="flex-1 gold-gradient text-black font-bold" onClick={handleSubmit} disabled={saving || !qty}>
            {saving ? t("common.saving") : t("common.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product Detail View ────────────────────────────────────────────────────
function ProductDetailDialog({ product, onClose, onEdit, onAdjust }) {
  const { t } = useLanguage();
  if (!product) return null;
  const stockStatus = product.stock <= 0 ? "out" : product.stock <= (product.min_stock || 5) ? "low" : "ok";
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[88vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-3 border-b border-border sticky top-0 bg-card z-10">
          <DialogTitle className="text-sm font-black">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          {/* Stock badge */}
          <div className={cn("rounded-xl p-4 flex items-center justify-between", stockStatus === "out" ? "bg-red-500/10 border border-red-500/20" : stockStatus === "low" ? "bg-amber-500/10 border border-amber-500/20" : "bg-green-500/10 border border-green-500/20")}>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{t("inventory.current_stock")}</p>
              <p className={cn("text-3xl font-black", stockStatus === "out" ? "text-red-500" : stockStatus === "low" ? "text-amber-500" : "text-green-500")}>{product.stock ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Min: {product.min_stock || 5} units</p>
            </div>
            {stockStatus !== "ok" && <AlertTriangle className={cn("w-8 h-8", stockStatus === "out" ? "text-red-400" : "text-amber-400")} />}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            {[
              { label: t("inventory.selling_price"), value: fmtINR(product.rate) },
              { label: t("inventory.purchase_price"), value: fmtINR(product.purchase_price || 0) },
              { label: t("inventory.gst_rate"), value: `${product.gst_rate || 0}%` },
              { label: t("inventory.hsn_code"), value: product.hsn || "—" },
              { label: t("inventory.category"), value: product.category || "—" },
              { label: t("inventory.barcode"), value: product.barcode || "—" },
              { label: t("inventory.unit"), value: product.unit || "Pcs" },
              { label: t("inventory.stock_value"), value: fmtINR((product.stock || 0) * (product.rate || 0)) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-secondary/50 rounded-lg p-2.5">
                <p className="text-muted-foreground text-[10px] font-semibold">{label}</p>
                <p className="font-bold truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-border">
          <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => { onClose(); onAdjust(product); }}>
            <Layers className="w-3.5 h-3.5 mr-1" /> {t("inventory.stock_adjust")}
          </Button>
          <Button className="flex-1 h-9 text-xs gold-gradient text-black font-bold" onClick={() => { onClose(); onEdit(product); }}>
            <Edit className="w-3.5 h-3.5 mr-1" /> {t("common.edit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Inventory Page ─────────────────────────────────────────────────────
export default function Inventory() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // all | low | out | ok
  const [sortBy, setSortBy] = useState("name"); // name | stock | value | price
  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Multi-Outlet Branch tracking
  const [activeBranchId, setActiveBranchId] = useState(() => localStorage.getItem('selectedBranch') || '');
  const [branchInventory, setBranchInventory] = useState([]);

  useEffect(() => {
    const handleBranchChange = () => setActiveBranchId(localStorage.getItem('selectedBranch') || '');
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, []);

  useEffect(() => {
    let unsubscribe;
    if (activeBranchId) {
      unsubscribe = subscribeToBranchInventory(activeBranchId, setBranchInventory);
    } else {
      setBranchInventory([]);
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [activeBranchId]);

  const { data: rawProducts = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const shopSettings = settings[0] || {};
  const businessType = shopSettings.business_type || "retail";

  const products = useMemo(() => {
    if (!activeBranchId || branchInventory.length === 0) return rawProducts;
    return rawProducts.map(p => {
      const inv = branchInventory.find(i => i.productId === p.id);
      return { ...p, stock: inv ? inv.quantity : 0 };
    });
  }, [rawProducts, branchInventory, activeBranchId]);

  const categories = useMemo(() => {
    const cats = getCategoriesByShopType(businessType);
    const productCats = [...new Set(products.map(p => p.category).filter(Boolean))];
    const merged = [...new Set([...cats, ...productCats])];
    return merged;
  }, [products, businessType]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.hsn?.toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== "all") {
      list = list.filter(p => p.category === selectedCategory);
    }
    if (stockFilter !== "all") {
      list = list.filter(p => {
        const s = p.stock ?? 0;
        const min = p.min_stock ?? 5;
        if (stockFilter === "out") return s <= 0;
        if (stockFilter === "low") return s > 0 && s <= min;
        if (stockFilter === "ok") return s > min;
        return true;
      });
    }
    // Sort
    list.sort((a, b) => {
      if (sortBy === "name") return a.name?.localeCompare(b.name);
      if (sortBy === "stock") return (b.stock ?? 0) - (a.stock ?? 0);
      if (sortBy === "value") return ((b.stock ?? 0) * (b.rate ?? 0)) - ((a.stock ?? 0) * (a.rate ?? 0));
      if (sortBy === "price") return (b.rate ?? 0) - (a.rate ?? 0);
      return 0;
    });
    return list;
  }, [products, search, selectedCategory, stockFilter, sortBy]);

  // Summary stats
  const stats = useMemo(() => {
    const total = products.length;
    const outOfStock = products.filter(p => (p.stock ?? 0) <= 0).length;
    const lowStock = products.filter(p => { const s = p.stock ?? 0; const m = p.min_stock ?? 5; return s > 0 && s <= m; }).length;
    const totalValue = products.reduce((sum, p) => sum + ((p.stock ?? 0) * (p.rate ?? 0)), 0);
    const totalUnits = products.reduce((sum, p) => sum + (p.stock ?? 0), 0);
    return { total, outOfStock, lowStock, totalValue, totalUnits };
  }, [products]);

  const handleSave = async (formData) => {
    try {
      if (editing) {
        await base44.entities.Product.update(editing.id, formData);
        toast.success("Product updated!");
        if (activeBranchId) {
          try {
            const existingInv = await getInventory(editing.id, activeBranchId);
            if (existingInv) {
              const delta = (parseFloat(formData.stock) || 0) - existingInv.quantity;
              if (delta !== 0) await updateInventory(editing.id, activeBranchId, delta, 'stock_adjustment');
            } else {
              await updateInventory(editing.id, activeBranchId, parseFloat(formData.stock) || 0, 'stock_initialization');
            }
          } catch (err) { console.warn("Branch inventory sync error:", err); }
        }
      } else {
        const created = await base44.entities.Product.create(formData);
        toast.success("Product added!");
        if (activeBranchId && created?.id && formData.stock > 0) {
          try {
            await updateInventory(created.id, activeBranchId, parseFloat(formData.stock) || 0, 'initial_stock');
          } catch (err) { console.warn("Branch inventory init error:", err); }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      toast.error("Failed to save: " + err.message);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await base44.entities.Product.delete(product.id);
      toast.success("Product deleted");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${bulkSelected.length} selected products?`)) return;
    try {
      await Promise.all(bulkSelected.map(id => base44.entities.Product.delete(id)));
      toast.success(`${bulkSelected.length} products deleted`);
      setBulkSelected([]);
      setBulkMode(false);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error("Bulk delete failed: " + err.message);
    }
  };

  const toggleBulkSelect = (id) => {
    setBulkSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getStockBadge = (product) => {
    const s = product.stock ?? 0;
    const min = product.min_stock ?? 5;
    if (s <= 0) return { label: t("inventory.out_of_stock"), className: "bg-red-500/15 text-red-500 border-red-500/20" };
    if (s <= min) return { label: t("inventory.low_stock"), className: "bg-amber-500/15 text-amber-500 border-amber-500/20" };
    return { label: t("inventory.in_stock"), className: "bg-green-500/15 text-green-500 border-green-500/20" };
  };

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> {t("inventory.title")}
          </h1>
          <p className="text-[12px] text-muted-foreground">
            {activeBranchId ? t("inventory.branch_view") : t("inventory.global_catalog")} · {products.length} {t("inventory.products")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn("h-9 gap-1.5 text-xs font-bold", bulkMode && "border-primary text-primary")}
            onClick={() => { setBulkMode(!bulkMode); setBulkSelected([]); }}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {bulkMode ? t("common.cancel") : t("inventory.bulk_select")}
          </Button>
          <Button className="h-9 gold-gradient text-black font-bold gap-1.5 text-xs" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5" /> {t("inventory.add_product")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: t("inventory.total_products"), value: stats.total, icon: Package, color: "text-blue-400", action: () => setStockFilter("all") },
          { label: t("inventory.out_of_stock"), value: stats.outOfStock, icon: AlertTriangle, color: "text-red-400", action: () => setStockFilter("out") },
          { label: t("inventory.low_stock"), value: stats.lowStock, icon: TrendingDown, color: "text-amber-400", action: () => setStockFilter("low") },
          { label: t("inventory.total_value"), value: fmtINR(stats.totalValue), icon: BarChart3, color: "text-green-400", action: () => setStockFilter("all") },
        ].map((s, i) => (
          <button key={i} onClick={s.action} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 hover:border-primary/30 transition-all text-left w-full">
            <div className={cn("w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0", s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black leading-tight">{s.value}</p>
              <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, barcode, category..."
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-9 shrink-0 gap-1 text-xs", showFilters && "border-primary text-primary")}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" />
            {t("common.filter")}
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        {showFilters && (
          <div className="bg-card border border-border rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fade-up">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">{t("inventory.category")}</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("inventory.all_categories")}</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">{t("inventory.stock_status")}</Label>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("inventory.all_stock")}</SelectItem>
                  <SelectItem value="ok">{t("inventory.in_stock")}</SelectItem>
                  <SelectItem value="low">{t("inventory.low_stock")}</SelectItem>
                  <SelectItem value="out">{t("inventory.out_of_stock")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">{t("inventory.sort_by")}</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{t("inventory.sort_name") || "Name (A-Z)"}</SelectItem>
                  <SelectItem value="stock">{t("inventory.sort_stock") || "Stock (High-Low)"}</SelectItem>
                  <SelectItem value="value">{t("inventory.sort_value") || "Value (High-Low)"}</SelectItem>
                  <SelectItem value="price">{t("inventory.sort_price") || "Price (High-Low)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Active filters display */}
        {(stockFilter !== "all" || selectedCategory !== "all") && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{t("common.filter")}:</span>
            {stockFilter !== "all" && (
              <button onClick={() => setStockFilter("all")} className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-bold">
                {stockFilter === "out" ? t("inventory.out_of_stock") : stockFilter === "low" ? t("inventory.low_stock") : t("inventory.in_stock")} <X className="w-2.5 h-2.5" />
              </button>
            )}
            {selectedCategory !== "all" && (
              <button onClick={() => setSelectedCategory("all")} className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-bold">
                {selectedCategory} <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {bulkMode && bulkSelected.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center justify-between gap-3 animate-fade-up">
          <span className="text-sm font-bold text-destructive">{bulkSelected.length} {t("inventory.selected") || "selected"}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setBulkSelected([])}>{t("inventory.deselect_all") || "Deselect All"}</Button>
            <Button size="sm" className="h-8 text-xs bg-destructive text-white hover:bg-destructive/90" onClick={handleBulkDelete}>
              <Trash2 className="w-3 h-3 mr-1" /> {t("inventory.delete_selected")}
            </Button>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-44" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-bold">{t("inventory.no_products")}</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {search || selectedCategory !== "all" || stockFilter !== "all"
              ? t("inventory.adjust_filters") || "Try adjusting your filters"
              : t("inventory.add_first")}
          </p>
          {!search && selectedCategory === "all" && stockFilter === "all" && (
            <Button className="gold-gradient text-black font-bold gap-1" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> {t("inventory.add_product")}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(product => {
            const badge = getStockBadge(product);
            const isSelected = bulkSelected.includes(product.id);
            const stockValue = (product.stock ?? 0) * (product.rate ?? 0);
            return (
              <div
                key={product.id}
                className={cn(
                  "bg-card border rounded-xl p-4 transition-all duration-200 group cursor-pointer",
                  isSelected ? "border-primary ring-1 ring-primary/30 bg-primary/5" : "border-border hover:border-primary/30"
                )}
                onClick={() => bulkMode ? toggleBulkSelect(product.id) : setDetailProduct(product)}
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {bulkMode && (
                      <div className="shrink-0">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-[13px] leading-tight truncate">{product.name}</p>
                      {product.category && <p className="text-[10px] text-muted-foreground truncate">{product.category}</p>}
                    </div>
                  </div>
                  <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ml-1", badge.className)}>
                    {badge.label}
                  </span>
                </div>

                {/* Stock count */}
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold">{t("inventory.stock")}</p>
                    <p className={cn("text-2xl font-black", (product.stock ?? 0) <= 0 ? "text-red-500" : (product.stock ?? 0) <= (product.min_stock ?? 5) ? "text-amber-500" : "text-foreground")}>
                      {product.stock ?? 0}
                      <span className="text-sm font-semibold text-muted-foreground ml-1">{product.unit || "pcs"}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-semibold">{t("inventory.stock_value")}</p>
                    <p className="text-sm font-bold">{fmtINR(stockValue)}</p>
                  </div>
                </div>

                {/* Price row */}
                <div className="flex items-center justify-between text-[11px] mb-3 pb-3 border-b border-border/50">
                  <span className="text-muted-foreground">{t("pos.price")}: <span className="font-black text-foreground">{fmtINR(product.rate)}</span></span>
                  {product.gst_rate > 0 && <span className="text-muted-foreground">GST {product.gst_rate}%</span>}
                </div>

                {/* Action buttons */}
                <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-[10px] font-bold gold-gradient text-black"
                    onClick={() => setAdjustProduct(product)}
                  >
                    <Layers className="w-3 h-3 mr-1" /> {t("inventory.stock")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => { setEditing(product); setShowForm(true); }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setBarcodeProduct(product)}
                  >
                    <ScanBarcode className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => handleDelete(product)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {filtered.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-center pb-2">
          {t("inventory.showing")} {filtered.length} {t("inventory.of")} {products.length} {t("inventory.products")}
        </p>
      )}

      {/* Add/Edit Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-3 border-b border-border sticky top-0 bg-card z-10">
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              {editing ? t("inventory.edit_product") : t("inventory.add_product")}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <ProductForm
              initial={editing}
              businessType={businessType}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Dialog */}
      {barcodeProduct && (
        <Dialog open onOpenChange={() => setBarcodeProduct(null)}>
          <DialogContent className="w-[95vw] max-w-sm max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-black">{t("inventory.barcode")} — {barcodeProduct.name}</DialogTitle>
            </DialogHeader>
            <BarcodeGenerator product={barcodeProduct} />
          </DialogContent>
        </Dialog>
      )}

      {/* Stock Adjust Dialog */}
      {adjustProduct && (
        <StockAdjustDialog
          product={adjustProduct}
          branchId={activeBranchId}
          onClose={() => setAdjustProduct(null)}
          onDone={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
        />
      )}

      {/* Product Detail Dialog */}
      {detailProduct && !bulkMode && (
        <ProductDetailDialog
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onEdit={(p) => { setEditing(p); setShowForm(true); }}
          onAdjust={(p) => setAdjustProduct(p)}
        />
      )}
    </div>
  );
}