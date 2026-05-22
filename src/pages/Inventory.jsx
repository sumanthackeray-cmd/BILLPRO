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
  CheckSquare, Square, Layers, Tag, RotateCcw, ClipboardCheck, Coins, PieChart as PieIcon,
  Activity, ArrowRight, ShieldCheck, Printer, Paperclip, MessageSquare, Check, FileText, ShoppingCart
} from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getCategoriesByShopType } from "@/lib/shopCategories";
import { subscribeToBranchInventory, updateInventory, getInventory } from "@/api/inventorySyncService";
import { ProductForm } from "@/components/inventory/ProductForm";
import BarcodeGenerator from "@/components/inventory/BarcodeGenerator";
import { useLanguage } from "@/lib/LanguageContext";
import { usePermission, useSensitiveField } from "@/hooks/usePermission";
import PermissionGuard from "@/components/PermissionGuard";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useAuth } from "@/lib/AuthContext";

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
  const canSeePurchasePrice = useSensitiveField('purchase_price');
  if (!product) return null;
  const stockStatus = product.stock <= 0 ? "out" : product.stock <= (product.min_stock || 5) ? "low" : "ok";
  const abcLabel = product.abcClass ? `Class ${product.abcClass}` : "—";
  const abcColor = product.abcClass === 'A' 
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]" 
    : product.abcClass === 'B' 
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]" 
    : "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.25)]";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[88vh] overflow-y-auto p-0 border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl">
        <DialogHeader className="p-4 pb-3 border-b border-border sticky top-0 bg-card/95 backdrop-blur-md z-10">
          <DialogTitle className="text-sm font-black flex items-center justify-between pr-6">
            <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{product.name}</span>
            <span className={cn("text-[9px] font-black px-2 py-0.5 rounded border uppercase shrink-0 tracking-wider flex items-center gap-1", abcColor)}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              SAP {abcLabel}
            </span>
          </DialogTitle>
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
              canSeePurchasePrice ? { label: t("inventory.purchase_price"), value: fmtINR(product.purchase_price || 0) } : null,
              { label: t("inventory.gst_rate"), value: `${product.gst_rate || 0}%` },
              { label: t("inventory.hsn_code"), value: product.hsn || "—" },
              { label: t("inventory.category"), value: product.category || "—" },
              { label: t("inventory.barcode"), value: product.barcode || "—" },
              { label: t("inventory.unit"), value: product.unit || "Pcs" },
              canSeePurchasePrice ? { label: t("inventory.stock_value"), value: fmtINR((product.stock || 0) * (product.purchase_price || product.rate || 0)) } : null,
            ].filter(Boolean).map(({ label, value }) => (
              <div key={label} className="bg-secondary/50 rounded-lg p-2.5">
                <p className="text-muted-foreground text-[10px] font-semibold">{label}</p>
                <p className="font-bold truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-border">
          <PermissionGuard module="inventory" action="edit" fallback={null}>
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => { onClose(); onAdjust(product); }}>
              <Layers className="w-3.5 h-3.5 mr-1" /> {t("inventory.stock_adjust")}
            </Button>
            <Button className="flex-1 h-9 text-xs gold-gradient text-black font-bold" onClick={() => { onClose(); onEdit(product); }}>
              <Edit className="w-3.5 h-3.5 mr-1" /> {t("common.edit")}
            </Button>
          </PermissionGuard>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Inventory Page ─────────────────────────────────────────────────────
export default function Inventory() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const canSeePurchasePrice = useSensitiveField('purchase_price');
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState("catalog"); // catalog | analytics | cycle-count | indents | purchase-orders
  
  // ─── Material Indents State ───
  const [showIndentForm, setShowIndentForm] = useState(false);
  const [editingIndent, setEditingIndent] = useState(null);
  const [indentForm, setIndentForm] = useState({
    date: new Date().toISOString().split("T")[0],
    notes: "",
    items: []
  });
  const [indentItemSearch, setIndentItemSearch] = useState("");
  const [selectedIndentForPrint, setSelectedIndentForPrint] = useState(null);

  // ─── Purchase Orders State ───
  const [showPOForm, setShowPOForm] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [poForm, setPoForm] = useState({
    date: new Date().toISOString().split("T")[0],
    vendor_name: "",
    vendor_gstin: "",
    vendor_phone: "",
    indent_id: "",
    indent_number: "",
    items: [],
    discount: 0,
    notes: ""
  });
  const [poItemSearch, setPoItemSearch] = useState("");
  const [selectedPOForPrint, setSelectedPOForPrint] = useState(null);

  // ─── Dynamic Procurement Queries ───
  const { data: indents = [], refetch: refetchIndents } = useQuery({
    queryKey: ["materialindents"],
    queryFn: () => base44.entities.MaterialIndent.list("-created_date"),
    enabled: !!user,
  });

  const { data: purchaseOrders = [], refetch: refetchPOs } = useQuery({
    queryKey: ["purchaseorders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date"),
    enabled: !!user,
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // all | low | out | ok
  const [abcFilter, setAbcFilter] = useState("all"); // all | A | B | C
  const [sortBy, setSortBy] = useState("name"); // name | stock | value | price | abc
  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Cycle Counting State
  const [cycleCountQuantities, setCycleCountQuantities] = useState({});
  const [cycleCountSearch, setCycleCountSearch] = useState("");
  const [postingAudit, setPostingAudit] = useState(false);

  // Multi-Outlet Branch tracking
  const [activeBranchId, setActiveBranchId] = useState(() => localStorage.getItem('selectedBranch') || '');
  const [branchInventory, setBranchInventory] = useState([]);

  useEffect(() => {
    const handleBranchChange = () => setActiveBranchId(localStorage.getItem('selectedBranch') || '');
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, []);

  useEffect(() => {
    const handleConvert = (e) => {
      const { indentId, indentNumber } = e.detail;
      base44.entities.MaterialIndent.get(indentId).then(indent => {
        if (indent) {
          setPoForm({
            date: new Date().toISOString().split("T")[0],
            vendor_name: "",
            vendor_gstin: "",
            vendor_phone: "",
            indent_id: indentId,
            indent_number: indentNumber,
            items: (indent.items || []).map(it => ({
              product_id: it.product_id,
              name: it.name,
              qty: it.qty,
              unit: it.unit || "PCS",
              rate: it.rate || 0,
              gst_rate: 18
            })),
            discount: 0,
            notes: `Auto-converted from Indent request ${indentNumber}.`
          });
          setActiveSubTab("purchase-orders");
          setShowPOForm(true);
        }
      }).catch(err => {
        toast.error("Failed to load indent details: " + err.message);
      });
    };

    window.addEventListener("openCreatePOFromIndent", handleConvert);
    return () => window.removeEventListener("openCreatePOFromIndent", handleConvert);
  }, []);

  const [sharingItem, setSharingItem] = useState(null);

  const { data: staffUsers = [] } = useQuery({
    queryKey: ["staffUsers"],
    queryFn: () => base44.entities.User.list().then(res => res.filter(u => u.is_active !== false)),
    enabled: !!user,
  });

  const handleShareToStaff = async (recipient) => {
    if (!sharingItem || !user) return;
    const { type, item } = sharingItem;
    const number = type === "indent" ? item.indent_number : item.po_number;
    
    const payload = {
      sender_id: user.id,
      sender_name: user.name || user.full_name || "Staff",
      sender_role: user.role_id || "role-cashier",
      receiver_id: recipient.id,
      receiver_name: recipient.name || recipient.full_name || "Staff",
      content: `Shared ${type === "indent" ? "Material Indent" : "Purchase Order"} request: ${number}`,
      created_date: new Date().toISOString(),
      read_by: [],
      attachment_type: type,
      attachment_id: item.id,
      attachment_number: number,
    };
    
    try {
      await base44.entities.InternalMessage.create(payload);
      toast.success(`Successfully shared ${number} with ${recipient.name || recipient.full_name}!`);
      setSharingItem(null);
    } catch (err) {
      toast.error("Failed to share attachment: " + err.message);
    }
  };

  const handlePrintIndent = (indent) => {
    const shopSettings = settings[0] || {};
    const shopName = (!shopSettings.shop_name || shopSettings.shop_name === "Vogats") ? "EASYBMT SHOP" : shopSettings.shop_name;
    const printWindow = window.open('', '_blank');
    const itemsHtml = (indent.items || []).map(item => `
      <tr>
        <td style="border: 1px solid #e2e8f0; padding: 12px; font-weight: 600; color: #1e293b;">${item.name}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #334155;">${item.qty}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #334155; text-transform: uppercase;">${item.unit || 'PCS'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${indent.indent_number}</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Outfit', sans-serif; padding: 40px; color: #1e293b; background: #ffffff; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: 800; color: #d97706; }
            .subtitle { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
            .title { font-size: 24px; font-weight: 800; text-align: right; color: #0f172a; }
            .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 30px; margin-bottom: 40px; font-size: 14px; }
            .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
            .info-title { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f1f5f9; font-weight: 800; text-align: left; padding: 12px; font-size: 11px; color: #475569; text-transform: uppercase; border: 1px solid #e2e8f0; }
            .notes { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; font-size: 13px; color: #b45309; margin-top: 30px; }
            .footer { margin-top: 60px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-weight: 600; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div>
              <div class="logo">${shopName}</div>
              <div class="subtitle">Procurement & Supply Chain Management</div>
            </div>
            <div>
              <div class="title">MATERIAL INDENT</div>
              <div class="subtitle" style="text-align: right;">Internal Stock Request</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-card">
              <div class="info-title">Request Details</div>
              <strong>Indent Number:</strong> <span style="font-family: monospace; font-size: 15px;">${indent.indent_number}</span><br>
              <strong>Date Requested:</strong> ${new Date(indent.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}<br>
              <strong>Status:</strong> <span style="text-transform: uppercase; font-weight: 800; color: ${indent.status === 'converted' ? '#10b981' : '#f59e0b'};">${indent.status || 'Pending'}</span>
            </div>
            <div class="info-card">
              <div class="info-title">Requested By</div>
              <strong>Name:</strong> ${indent.created_by_name || 'Store/Warehouse Manager'}<br>
              <strong>Entity:</strong> Multi-Tenant HQ Supply Chain<br>
              <strong>Internal Route:</strong> Warehouse → Accountant desk
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 60%;">Item Description</th>
                <th style="text-align: center; width: 20%;">Requested Qty</th>
                <th style="text-align: center; width: 20%;">Unit</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          ${indent.notes ? `
            <div class="notes">
              <div style="font-weight: 800; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Manager Dispatch Notes</div>
              ${indent.notes}
            </div>
          ` : ''}

          <div class="footer">
            This is a secure internal multi-tenant digital document generated under enterprise tenant company isolation.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintPO = (po) => {
    const shopSettings = settings[0] || {};
    const shopName = (!shopSettings.shop_name || shopSettings.shop_name === "Vogats") ? "EASYBMT SHOP" : shopSettings.shop_name;
    const printWindow = window.open('', '_blank');
    const itemsHtml = (po.items || []).map(item => `
      <tr>
        <td style="border: 1px solid #e2e8f0; padding: 12px; font-weight: 600; color: #1e293b;">${item.name}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #334155;">${item.qty}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #334155; text-transform: uppercase;">${item.unit || 'PCS'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: right; color: #334155; font-family: monospace;">${fmtINR(item.rate)}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #334155;">${item.gst_rate}%</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: right; color: #1e293b; font-weight: 700; font-family: monospace;">${fmtINR(item.qty * item.rate * (1 + item.gst_rate / 100))}</td>
      </tr>
    `).join('');

    const subTotal = (po.items || []).reduce((acc, curr) => acc + (curr.qty * curr.rate), 0);
    const totalGst = (po.items || []).reduce((acc, curr) => acc + (curr.qty * curr.rate * (curr.gst_rate / 100)), 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>${po.po_number}</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Outfit', sans-serif; padding: 40px; color: #1e293b; background: #ffffff; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: 800; color: #d97706; }
            .subtitle { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
            .title { font-size: 24px; font-weight: 800; text-align: right; color: #0f172a; }
            .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 30px; margin-bottom: 40px; font-size: 14px; }
            .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
            .info-title { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f1f5f9; font-weight: 800; padding: 12px; font-size: 11px; color: #475569; text-transform: uppercase; border: 1px solid #e2e8f0; }
            .totals-table { width: 320px; margin-left: auto; margin-right: 0; margin-bottom: 30px; }
            .totals-table td { padding: 8px 12px; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
            .notes { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 13px; color: #475569; margin-top: 30px; }
            .footer { margin-top: 60px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-weight: 600; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div>
              <div class="logo">${shopName}</div>
              <div class="subtitle">Procurement & Supply Chain Management</div>
            </div>
            <div>
              <div class="title">PURCHASE ORDER</div>
              <div class="subtitle" style="text-align: right;">Official Vendor Purchase Order</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-card">
              <div class="info-title">Vendor / Supplier details</div>
              <strong>Name:</strong> ${po.vendor_name}<br>
              <strong>GSTIN:</strong> <span style="font-family: monospace; font-weight: 700; color: #b45309;">${po.vendor_gstin || 'N/A'}</span><br>
              <strong>Phone:</strong> ${po.vendor_phone || 'N/A'}<br>
              <strong>Linked Indent:</strong> ${po.indent_number || 'None'}
            </div>
            <div class="info-card">
              <div class="info-title">Order Information</div>
              <strong>PO Number:</strong> <span style="font-family: monospace; font-size: 15px;">${po.po_number}</span><br>
              <strong>Order Date:</strong> ${new Date(po.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}<br>
              <strong>Status:</strong> <span style="text-transform: uppercase; font-weight: 800; color: ${po.status === 'purchased' ? '#10b981' : po.status === 'approved' ? '#6366f1' : '#f59e0b'};">${po.status || 'Draft'}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left; width: 40%;">Item Description</th>
                <th style="text-align: center; width: 10%;">Qty</th>
                <th style="text-align: center; width: 10%;">Unit</th>
                <th style="text-align: right; width: 15%;">Unit Rate</th>
                <th style="text-align: center; width: 10%;">GST</th>
                <th style="text-align: right; width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td>Sub Total:</td>
              <td style="text-align: right; font-family: monospace;">${fmtINR(subTotal)}</td>
            </tr>
            <tr>
              <td>Calculated GST:</td>
              <td style="text-align: right; font-family: monospace;">${fmtINR(totalGst)}</td>
            </tr>
            ${po.discount > 0 ? `
              <tr>
                <td>Discount:</td>
                <td style="text-align: right; font-family: monospace; color: #ef4444;">-${fmtINR(po.discount)}</td>
              </tr>
            ` : ''}
            <tr style="font-weight: 800; font-size: 16px; background: #f8fafc;">
              <td>Grand Total:</td>
              <td style="text-align: right; font-family: monospace; color: #0f172a;">${fmtINR(po.grand_total)}</td>
            </tr>
          </table>

          ${po.notes ? `
            <div class="notes">
              <div style="font-weight: 800; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Special Instructions & Terms</div>
              ${po.notes}
            </div>
          ` : ''}

          <div class="footer">
            This is an official commercial Purchase Order generated under corporate enterprise tenant company isolation.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCreateIndentSubmit = async (e) => {
    e.preventDefault();
    if (indentForm.items.length === 0) {
      toast.error("Please add at least one item to the indent request.");
      return;
    }

    const nextNumber = `IND-${String(indents.length + 1).padStart(4, "0")}`;
    const payload = {
      indent_number: nextNumber,
      date: indentForm.date,
      notes: indentForm.notes,
      items: indentForm.items,
      status: "pending",
      created_by: user.id,
      created_by_name: user.name || user.full_name || "Manager",
      created_date: new Date().toISOString()
    };

    try {
      await base44.entities.MaterialIndent.create(payload);
      toast.success(`Material Indent ${nextNumber} drafted successfully!`);
      setShowIndentForm(false);
      refetchIndents();
    } catch (err) {
      toast.error("Failed to create indent: " + err.message);
    }
  };

  const handleCreatePOSubmit = async (e) => {
    e.preventDefault();
    if (poForm.items.length === 0) {
      toast.error("Please add at least one item to the PO draft.");
      return;
    }
    if (!poForm.vendor_name) {
      toast.error("Vendor Name is required.");
      return;
    }

    const calculatedSubtotal = poForm.items.reduce((acc, curr) => acc + (Number(curr.qty || 0) * Number(curr.rate || 0)), 0);
    const calculatedGst = poForm.items.reduce((acc, curr) => acc + (Number(curr.qty || 0) * Number(curr.rate || 0) * (Number(curr.gst_rate || 0) / 100)), 0);
    const calculatedGrandTotal = Math.max(0, calculatedSubtotal + calculatedGst - Number(poForm.discount || 0));

    const nextNumber = `PO-${String(purchaseOrders.length + 1).padStart(4, "0")}`;
    const payload = {
      po_number: nextNumber,
      date: poForm.date,
      vendor_name: poForm.vendor_name,
      vendor_gstin: poForm.vendor_gstin,
      vendor_phone: poForm.vendor_phone,
      indent_id: poForm.indent_id || "",
      indent_number: poForm.indent_number || "",
      items: poForm.items,
      discount: Number(poForm.discount || 0),
      notes: poForm.notes,
      grand_total: calculatedGrandTotal,
      status: "pending",
      created_by: user.id,
      created_by_name: user.name || user.full_name || "Accountant",
      created_date: new Date().toISOString()
    };

    try {
      await base44.entities.PurchaseOrder.create(payload);
      // If linked to an indent, mark that indent as "converted"
      if (poForm.indent_id) {
        await base44.entities.MaterialIndent.update(poForm.indent_id, { status: "converted" });
        refetchIndents();
      }
      toast.success(`Purchase Order ${nextNumber} drafted successfully!`);
      setShowPOForm(false);
      refetchPOs();
    } catch (err) {
      toast.error("Failed to create PO: " + err.message);
    }
  };

  const handleActionPO = async (action, po) => {
    try {
      if (action === "approve") {
        await base44.entities.PurchaseOrder.update(po.id, {
          status: "approved",
          approved_by: user.id,
          approved_by_name: user.name || user.full_name || "CA"
        });
        toast.success(`Purchase Order ${po.po_number} Approved!`);
      } else if (action === "purchase") {
        const shopSettingsList = await base44.entities.ShopSettings.list();
        const shopSettings = shopSettingsList[0] || {};
        const counter = (shopSettings.purchase_counter || 0) + 1;

        const purchasePayload = {
          date: new Date().toISOString().split("T")[0],
          vendor_name: po.vendor_name || "Procurement Direct",
          vendor_gstin: po.vendor_gstin || "",
          vendor_phone: po.vendor_phone || "",
          vendor_invoice_no: `PO-EXEC-${po.po_number}`,
          items: po.items || [],
          discount: po.discount || 0,
          notes: `Converted from PO ${po.po_number}. Approved & stock updated by CA/Owner.`,
          payment_status: "paid",
          payment_mode: "cash",
          amount_paid: po.grand_total,
          due_date: "",
          grand_total: po.grand_total,
          purchase_number: `PUR-${String(counter).padStart(4, "0")}`
        };

        await base44.entities.Purchase.create(purchasePayload);

        // Update product stock quantities
        for (const item of po.items) {
          if (item.product_id) {
            try {
              const prod = await base44.entities.Product.get(item.product_id);
              if (prod) {
                const currentStock = Number(prod.stock || 0);
                const qtyAdded = Number(item.qty || 0);
                await base44.entities.Product.update(item.product_id, {
                  stock: currentStock + qtyAdded,
                  purchase_rate: Number(item.rate || 0)
                });
              }
            } catch (err) {
              console.error("Stock update error during PO purchase conversion:", err);
            }
          }
        }

        // Increment ShopSettings counter
        if (shopSettings.id && !shopSettings.id.startsWith("seed")) {
          await base44.entities.ShopSettings.update(shopSettings.id, { purchase_counter: counter });
        }

        // Complete PO status
        await base44.entities.PurchaseOrder.update(po.id, {
          status: "purchased",
          approved_by: user.id,
          approved_by_name: user.name || user.full_name || "CA"
        });

        toast.success(`Purchase Order ${po.po_number} executed successfully! Stock levels updated.`);
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
      refetchPOs();
    } catch (e) {
      toast.error("Failed to process PO action: " + e.message);
    }
  };

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

  // Dynamic SAP ABC Classification System
  const productsWithABC = useMemo(() => {
    const list = products.map(p => {
      // Stock valuation is based on purchase price (or selling rate if purchase price is missing)
      const purchasePrice = parseFloat(p.purchase_price) || parseFloat(p.rate) || 0;
      const val = (p.stock ?? 0) * purchasePrice;
      return { ...p, stockValuation: val, purchasePriceCalculated: purchasePrice };
    });

    // Sort descending by value to perform Pareto accumulation
    list.sort((a, b) => b.stockValuation - a.stockValuation);
    const totalInventoryValue = list.reduce((sum, item) => sum + item.stockValuation, 0);

    let runningSum = 0;
    return list.map(p => {
      if (totalInventoryValue === 0) {
        return { ...p, abcClass: 'C', cumulativePct: 100 };
      }
      runningSum += p.stockValuation;
      const cumulativePct = (runningSum / totalInventoryValue) * 100;
      
      let abcClass = 'C';
      if (cumulativePct <= 70) {
        abcClass = 'A';
      } else if (cumulativePct <= 90) {
        abcClass = 'B';
      }
      
      return { ...p, abcClass, cumulativePct };
    });
  }, [products]);

  const categories = useMemo(() => {
    const cats = getCategoriesByShopType(businessType);
    const productCats = [...new Set(products.map(p => p.category).filter(Boolean))];
    const merged = [...new Set([...cats, ...productCats])];
    return merged;
  }, [products, businessType]);

  const filtered = useMemo(() => {
    let list = [...productsWithABC];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
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
    if (abcFilter !== "all") {
      list = list.filter(p => p.abcClass === abcFilter);
    }
    // Sort
    list.sort((a, b) => {
      if (sortBy === "name") return a.name?.localeCompare(b.name);
      if (sortBy === "stock") return (b.stock ?? 0) - (a.stock ?? 0);
      if (sortBy === "value") return b.stockValuation - a.stockValuation;
      if (sortBy === "price") return (b.rate ?? 0) - (a.rate ?? 0);
      if (sortBy === "abc") return a.abcClass?.localeCompare(b.abcClass);
      return 0;
    });
    return list;
  }, [productsWithABC, search, selectedCategory, stockFilter, abcFilter, sortBy]);

  // Summary stats
  const stats = useMemo(() => {
    const total = productsWithABC.length;
    const outOfStock = productsWithABC.filter(p => (p.stock ?? 0) <= 0).length;
    const lowStock = productsWithABC.filter(p => { const s = p.stock ?? 0; const m = p.min_stock ?? 5; return s > 0 && s <= m; }).length;
    const totalValue = productsWithABC.reduce((sum, p) => sum + p.stockValuation, 0);
    const totalUnits = productsWithABC.reduce((sum, p) => sum + (p.stock ?? 0), 0);

    // ABC details
    const classA = productsWithABC.filter(p => p.abcClass === 'A');
    const classB = productsWithABC.filter(p => p.abcClass === 'B');
    const classC = productsWithABC.filter(p => p.abcClass === 'C');

    const aVal = classA.reduce((sum, p) => sum + p.stockValuation, 0);
    const bVal = classB.reduce((sum, p) => sum + p.stockValuation, 0);
    const cVal = classC.reduce((sum, p) => sum + p.stockValuation, 0);

    return {
      total,
      outOfStock,
      lowStock,
      totalValue,
      totalUnits,
      classA: { count: classA.length, value: aVal, pct: totalValue ? (aVal / totalValue) * 100 : 0 },
      classB: { count: classB.length, value: bVal, pct: totalValue ? (bVal / totalValue) * 100 : 0 },
      classC: { count: classC.length, value: cVal, pct: totalValue ? (cVal / totalValue) * 100 : 0 }
    };
  }, [productsWithABC]);

  // Data for Category distribution Chart
  const categoryChartData = useMemo(() => {
    const map = {};
    productsWithABC.forEach(p => {
      const cat = p.category || "Unassigned";
      map[cat] = (map[cat] || 0) + p.stockValuation;
    });
    return Object.keys(map).map(cat => ({ name: cat, value: Math.round(map[cat]) })).sort((a,b)=>b.value-a.value).slice(0, 8);
  }, [productsWithABC]);

  // Data for ABC distribution Donut Chart
  const abcChartData = [
    { name: "Class A (High Value)", value: Math.round(stats.classA.value), count: stats.classA.count, color: "#10b981" },
    { name: "Class B (Moderate)", value: Math.round(stats.classB.value), count: stats.classB.count, color: "#f59e0b" },
    { name: "Class C (Low Value)", value: Math.round(stats.classC.value), count: stats.classC.count, color: "#6366f1" }
  ];

  // Cycle Counting filtering logic
  const auditingProductsFiltered = useMemo(() => {
    let list = [...productsWithABC];
    if (cycleCountSearch.trim()) {
      const q = cycleCountSearch.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q));
    }
    return list;
  }, [productsWithABC, cycleCountSearch]);

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

  // POST RECONCILIATION AUDIT
  const handlePostAudit = async () => {
    const itemsToUpdate = [];
    Object.keys(cycleCountQuantities).forEach(id => {
      const p = productsWithABC.find(x => x.id === id);
      if (p) {
        const physical = parseFloat(cycleCountQuantities[id]);
        if (!isNaN(physical) && physical !== p.stock) {
          itemsToUpdate.push({
            id,
            name: p.name,
            systemQty: p.stock,
            physicalQty: physical,
            delta: physical - p.stock,
            rate: p.purchasePriceCalculated
          });
        }
      }
    });

    if (itemsToUpdate.length === 0) {
      toast.error("No stock variances detected. All counts match system levels.");
      return;
    }

    if (!confirm(`Are you sure you want to post adjustments for ${itemsToUpdate.length} inventory items? System stock will be reconciled immediately.`)) return;

    setPostingAudit(true);
    try {
      // 1. Post to Firebase and update local quantities
      for (const item of itemsToUpdate) {
        if (activeBranchId) {
          await updateInventory(item.id, activeBranchId, item.delta, 'cycle_counting_audit');
        }
        await base44.entities.Product.update(item.id, { stock: item.physicalQty });
      }

      // 2. Generate a Cycle Count Document
      const totalVarianceValue = itemsToUpdate.reduce((sum, item) => sum + (item.delta * item.rate), 0);
      const auditLogDoc = {
        branchId: activeBranchId || 'HQ_GLOBAL',
        createdAt: new Date().toISOString(),
        itemsAudited: itemsToUpdate,
        netVarianceValue: totalVarianceValue,
        postedBy: 'SAP Inventory Auditor'
      };
      
      await base44.entities.cyclecounts.create(auditLogDoc);

      toast.success(`Inventory Reconciled! Posted adjustments for ${itemsToUpdate.length} items. Net variance: ${fmtINR(totalVarianceValue)}`);
      setCycleCountQuantities({});
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      console.error(err);
      toast.error("Reconciliation failed: " + err.message);
    } finally {
      setPostingAudit(false);
    }
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
          {activeSubTab === "catalog" && (
            <>
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
            </>
          )}
          {activeSubTab === "cycle-count" && (
            <Button
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs"
              onClick={handlePostAudit}
              disabled={postingAudit || Object.keys(cycleCountQuantities).length === 0}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Post Audit & Reconcile
            </Button>
          )}
          {activeSubTab === "indents" && (
            <Button
              className="h-9 gold-gradient text-black font-bold gap-1.5 text-xs"
              onClick={() => {
                setEditingIndent(null);
                setIndentForm({ date: new Date().toISOString().split("T")[0], notes: "", items: [] });
                setShowIndentForm(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Create Indent
            </Button>
          )}
          {activeSubTab === "purchase-orders" && (
            <Button
              className="h-9 gold-gradient text-black font-bold gap-1.5 text-xs"
              onClick={() => {
                setEditingPO(null);
                setPoForm({
                  date: new Date().toISOString().split("T")[0],
                  vendor_name: "",
                  vendor_gstin: "",
                  vendor_phone: "",
                  indent_id: "",
                  indent_number: "",
                  items: [],
                  discount: 0,
                  notes: ""
                });
                setShowPOForm(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Draft PO
            </Button>
          )}
        </div>
      </div>

      {/* Sub Tabs Selector (SAP Control Bar) */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-secondary/30 border border-border/40 rounded-xl max-w-2xl flex-wrap">
        <button
          onClick={() => setActiveSubTab("catalog")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center justify-center gap-1.5",
            activeSubTab === "catalog" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Layers className="w-3.5 h-3.5" /> Catalog Items
        </button>
        <button
          onClick={() => setActiveSubTab("analytics")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center justify-center gap-1.5",
            activeSubTab === "analytics" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PieIcon className="w-3.5 h-3.5" /> SAP ABC & Valuation
        </button>
        <button
          onClick={() => setActiveSubTab("cycle-count")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center justify-center gap-1.5",
            activeSubTab === "cycle-count" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ClipboardCheck className="w-3.5 h-3.5" /> Cycle Counting
        </button>
        {user && user.hierarchy_level <= 6 && (
          <button
            onClick={() => setActiveSubTab("indents")}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center justify-center gap-1.5",
              activeSubTab === "indents" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="w-3.5 h-3.5" /> Material Indents
          </button>
        )}
        {user && user.hierarchy_level <= 4 && (
          <button
            onClick={() => setActiveSubTab("purchase-orders")}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center justify-center gap-1.5",
              activeSubTab === "purchase-orders" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Purchase Orders
          </button>
        )}
      </div>

      {/* RENDER VIEW ACCORDING TO ACTIVE SUBTAB */}

      {activeSubTab === "catalog" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { 
                label: t("inventory.total_products"), 
                value: stats.total, 
                icon: Package, 
                color: "text-cyan-400", 
                border: "border-cyan-500/20 hover:border-cyan-500/40",
                bg: "bg-cyan-500/5",
                action: () => { setStockFilter("all"); setAbcFilter("all"); } 
              },
              { 
                label: t("inventory.out_of_stock"), 
                value: stats.outOfStock, 
                icon: AlertTriangle, 
                color: stats.outOfStock > 0 ? "text-rose-400" : "text-muted-foreground/60", 
                border: stats.outOfStock > 0 ? "border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]" : "border-border/60",
                bg: stats.outOfStock > 0 ? "bg-rose-500/10 animate-pulse" : "bg-secondary/40",
                action: () => { setStockFilter("out"); setAbcFilter("all"); } 
              },
              { 
                label: t("inventory.low_stock"), 
                value: stats.lowStock, 
                icon: TrendingDown, 
                color: stats.lowStock > 0 ? "text-amber-400" : "text-muted-foreground/60", 
                border: stats.lowStock > 0 ? "border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]" : "border-border/60",
                bg: stats.lowStock > 0 ? "bg-amber-500/10" : "bg-secondary/40",
                action: () => { setStockFilter("low"); setAbcFilter("all"); } 
              },
              { 
                label: t("inventory.total_value"), 
                value: fmtINR(stats.totalValue), 
                icon: BarChart3, 
                color: "text-emerald-400", 
                border: "border-emerald-500/20 hover:border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.05)]",
                bg: "bg-emerald-500/5",
                action: () => { setStockFilter("all"); setAbcFilter("all"); } 
              },
            ].map((s, i) => (
              <button 
                key={i} 
                onClick={s.action} 
                className={cn(
                  "bg-card/65 backdrop-blur-sm border rounded-xl p-3.5 flex items-center gap-3 transition-all duration-300 hover:-translate-y-0.5 text-left w-full",
                  s.border
                )}
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", s.bg, s.color)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-base font-black leading-tight", s.color)}>{s.value}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5 truncate">{s.label}</p>
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
              <div className="bg-card border border-border rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fade-up">
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
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">SAP ABC Class</Label>
                  <Select value={abcFilter} onValueChange={setAbcFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      <SelectItem value="A">Class A (Top Value 70%)</SelectItem>
                      <SelectItem value="B">Class B (Medium Value 20%)</SelectItem>
                      <SelectItem value="C">Class C (Low Value 10%)</SelectItem>
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
                      <SelectItem value="abc">SAP ABC Ranking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Active filters display */}
            {(stockFilter !== "all" || selectedCategory !== "all" || abcFilter !== "all") && (
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
                {abcFilter !== "all" && (
                  <button onClick={() => setAbcFilter("all")} className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-bold">
                    Class {abcFilter} <X className="w-2.5 h-2.5" />
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
                const stockValue = product.stockValuation;
                
                // Premium ABC badge colors
                const abcBadgeColor = product.abcClass === 'A' 
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                  : product.abcClass === 'B' 
                  ? "bg-amber-950/60 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                  : "bg-purple-950/60 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]";

                // Stock status warning styling
                const isOutOfStock = (product.stock ?? 0) <= 0;
                const isLowStock = !isOutOfStock && (product.stock ?? 0) <= (product.min_stock ?? 5);
                const stockStatusStyle = isOutOfStock
                  ? "bg-red-500/10 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                  : isLowStock
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)] animate-pulse"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";

                return (
                  <div
                    key={product.id}
                    className={cn(
                      "bg-card/45 backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 group cursor-pointer relative overflow-hidden hover:-translate-y-1 hover:shadow-lg",
                      isSelected 
                        ? "border-primary ring-1 ring-primary/30 bg-primary/10 shadow-[0_0_15px_rgba(217,119,6,0.15)]" 
                        : "border-border/60 hover:border-primary/40"
                    )}
                    onClick={() => bulkMode ? toggleBulkSelect(product.id) : setDetailProduct(product)}
                  >
                    {/* SAP ABC Tag */}
                    <div className="absolute top-0 right-0 z-10">
                      <span className={cn("text-[8px] font-black tracking-widest px-2.5 py-1 rounded-bl-xl uppercase border-l border-b flex items-center gap-1", abcBadgeColor)}>
                        <span className="w-1 h-1 rounded-full bg-current" />
                        {product.abcClass}
                      </span>
                    </div>

                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3 pr-8">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {bulkMode && (
                          <div className="shrink-0">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-[13px] leading-tight truncate group-hover:text-primary transition-colors">{product.name}</p>
                          {product.category && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{product.category}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Stock count */}
                    <div className="flex items-end justify-between mb-3 bg-secondary/20 p-2.5 rounded-xl border border-border/40">
                      <div>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{t("inventory.stock")}</p>
                        <div className={cn("mt-1 px-2 py-0.5 rounded text-lg font-black flex items-baseline gap-1.5 w-fit", stockStatusStyle)}>
                          <span>{product.stock ?? 0}</span>
                          <span className="text-[10px] font-semibold opacity-85 uppercase">{product.unit || "pcs"}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Valuation</p>
                        <p className="text-xs font-black text-foreground/90 mt-1.5 font-mono">{fmtINR(stockValue)}</p>
                      </div>
                    </div>

                    {/* Price row */}
                    <div className="flex items-center justify-between text-[11px] mb-3 pb-3 border-b border-border/50">
                      <span className="text-muted-foreground">{t("pos.price")}: <span className="font-black text-foreground">{fmtINR(product.rate)}</span></span>
                      {product.gst_rate > 0 && <span className="text-muted-foreground">GST {product.gst_rate}%</span>}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                      <PermissionGuard module="inventory" action="edit" fallback={null}>
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
                      </PermissionGuard>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setBarcodeProduct(product)}
                      >
                        <ScanBarcode className="w-3 h-3" />
                      </Button>
                      <PermissionGuard module="inventory" action="delete" fallback={null}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 border-destructive/30"
                          onClick={() => handleDelete(product)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </PermissionGuard>
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
        </>
      )}

      {/* TAB 2: SAP ABC & VALUATION ANALYTICS */}
      {activeSubTab === "analytics" && (
        <div className="space-y-6 animate-fade-up">
          {/* SAP ABC KPI Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-emerald-500/20 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500"><Coins className="w-24 h-24" /></div>
              <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 uppercase font-bold text-[9px] tracking-wider">Class A (Critical Control)</Badge>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-2xl font-black">{fmtINR(stats.classA.value)}</span>
                <span className="text-xs font-bold text-emerald-500">{stats.classA.pct.toFixed(1)}% Value</span>
              </div>
              <p className="text-xs font-bold text-muted-foreground">{stats.classA.count} catalog items ranked here.</p>
              <div className="border-t border-border/40 pt-2 text-[10px] text-muted-foreground/80 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-500 shrink-0" />
                <span><b>70% Capital Lock.</b> Weekly cyclic counts recommended.</span>
              </div>
            </div>

            <div className="bg-card border border-amber-500/20 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-amber-500"><Coins className="w-24 h-24" /></div>
              <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/25 uppercase font-bold text-[9px] tracking-wider">Class B (Moderate Control)</Badge>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-2xl font-black">{fmtINR(stats.classB.value)}</span>
                <span className="text-xs font-bold text-amber-500">{stats.classB.pct.toFixed(1)}% Value</span>
              </div>
              <p className="text-xs font-bold text-muted-foreground">{stats.classB.count} catalog items ranked here.</p>
              <div className="border-t border-border/40 pt-2 text-[10px] text-muted-foreground/80 flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-500 shrink-0" />
                <span><b>20% Capital Lock.</b> Monthly counts recommended.</span>
              </div>
            </div>

            <div className="bg-card border border-indigo-500/20 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-indigo-500"><Coins className="w-24 h-24" /></div>
              <Badge className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/25 uppercase font-bold text-[9px] tracking-wider">Class C (Bulk Control)</Badge>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-2xl font-black">{fmtINR(stats.classC.value)}</span>
                <span className="text-xs font-bold text-indigo-500">{stats.classC.pct.toFixed(1)}% Value</span>
              </div>
              <p className="text-xs font-bold text-muted-foreground">{stats.classC.count} catalog items ranked here.</p>
              <div className="border-t border-border/40 pt-2 text-[10px] text-muted-foreground/80 flex items-center gap-1">
                <Activity className="w-3 h-3 text-indigo-500 shrink-0" />
                <span><b>10% Capital Lock.</b> Bulk count reorders, quarterly audits.</span>
              </div>
            </div>
          </div>

          {/* Visual Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Donut Chart: ABC Distribution */}
            <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-black flex items-center gap-1.5"><PieIcon className="w-4 h-4 text-primary" /> Valuation Share by SAP Classification</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={abcChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {abcChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, "Total Valuation"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Category Valuation */}
            <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-black flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-primary" /> Top Category Valuations (₹)</h3>
              <div className="h-64">
                {categoryChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No valuation data to plot</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ left: 10, right: 10, top: 10, bottom: 20 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} stroke="#888888" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#888888" />
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, "Capital Lock"]} />
                      <Bar dataKey="value" fill="#d97706" radius={[4, 4, 0, 0]}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#d97706" : "#f59e0b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CYCLE COUNT WORKSHEET */}
      {activeSubTab === "cycle-count" && (
        <div className="space-y-4 animate-fade-up">
          {/* Header Description */}
          <div className="p-4 bg-secondary/20 border border-border rounded-xl flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-primary" /> Cycle Counting Stock Audit
              </h3>
              <p className="text-xs text-muted-foreground">Reconcile system records with physical counts. Discrepancies and losses are calculated in real time before posting.</p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={cycleCountSearch}
              onChange={e => setCycleCountSearch(e.target.value)}
              placeholder="Filter items by name/barcode to count..."
              className="pl-9 h-8 text-xs"
            />
          </div>

          {/* Counting Worksheet Table */}
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-secondary/40 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-3">Product Description</th>
                  <th className="p-3">SAP Class</th>
                  {canSeePurchasePrice && <th className="p-3">Purchase Cost</th>}
                  <th className="p-3">System Stock</th>
                  <th className="p-3 w-[150px]">Actual Counted</th>
                  <th className="p-3">Variance Qty</th>
                  <th className="p-3">Variance Value</th>
                </tr>
              </thead>
              <tbody>
                {auditingProductsFiltered.map(p => {
                  const physical = cycleCountQuantities[p.id] !== undefined ? parseFloat(cycleCountQuantities[p.id]) : "";
                  const hasInput = cycleCountQuantities[p.id] !== undefined && cycleCountQuantities[p.id] !== "";
                  
                  const variance = hasInput ? (parseFloat(physical) || 0) - p.stock : 0;
                  const varianceVal = variance * p.purchasePriceCalculated;

                  let varianceColor = "text-muted-foreground";
                  let varianceBg = "";
                  if (hasInput && variance > 0) {
                    varianceColor = "text-blue-500 font-bold";
                    varianceBg = "bg-blue-500/5";
                  } else if (hasInput && variance < 0) {
                    varianceColor = "text-red-500 font-bold";
                    varianceBg = "bg-red-500/5";
                  } else if (hasInput && variance === 0) {
                    varianceColor = "text-green-500 font-bold";
                    varianceBg = "bg-green-500/5";
                  }

                  const abcClassColor = p.abcClass === 'A' 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]" 
                    : p.abcClass === 'B' 
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]" 
                    : "bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.2)]";

                  return (
                    <tr key={p.id} className={cn("border-b border-border/40 hover:bg-secondary/10 transition-all", varianceBg)}>
                      <td className="p-3">
                        <p className="font-semibold text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{p.barcode || "No Barcode"}</p>
                      </td>
                      <td className="p-3">
                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 w-fit", abcClassColor)}>
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {p.abcClass}
                        </span>
                      </td>
                      {canSeePurchasePrice && <td className="p-3 font-semibold">{fmtINR(p.purchasePriceCalculated)}</td>}
                      <td className="p-3 font-black text-sm">{p.stock}</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          value={physical}
                          onChange={e => setCycleCountQuantities({ ...cycleCountQuantities, [p.id]: e.target.value })}
                          placeholder={p.stock}
                          className="h-8 text-xs font-black border-primary/30 focus:border-primary w-[120px]"
                        />
                      </td>
                      <td className={cn("p-3 text-sm", varianceColor)}>
                        {hasInput ? (variance >= 0 ? `+${variance}` : variance) : "—"}
                      </td>
                      <td className={cn("p-3 text-sm", varianceColor)}>
                        {hasInput ? fmtINR(varianceVal) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MATERIAL INDENTS CONTROL CENTER */}
      {activeSubTab === "indents" && (
        <div className="space-y-4 animate-fade-up">
          <div className="p-4 bg-secondary/20 border border-border rounded-xl flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> Material Indents Workspace
              </h3>
              <p className="text-xs text-muted-foreground">Draft and review store/warehouse inventory requests. Download premium PDFs or dispatch directly via staff communication channel.</p>
            </div>
          </div>

          {/* Indents Table */}
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-secondary/40 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-3">Indent Reference</th>
                  <th className="p-3">Request Date</th>
                  <th className="p-3">Originator</th>
                  <th className="p-3">Total Items</th>
                  <th className="p-3">Current Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {indents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-muted-foreground">
                      No Material Indents registered in this tenant company. Click "Create Indent" above to start procurement.
                    </td>
                  </tr>
                ) : (
                  indents.map(indent => (
                    <tr key={indent.id} className="border-b border-border/40 hover:bg-secondary/10 transition-all cursor-pointer" onClick={() => setSelectedIndentForPrint(indent)}>
                      <td className="p-3 font-mono font-bold text-primary">{indent.indent_number}</td>
                      <td className="p-3">{new Date(indent.date).toLocaleDateString()}</td>
                      <td className="p-3 font-medium">{indent.created_by_name || "Manager"}</td>
                      <td className="p-3">{indent.items?.length || 0} Products</td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                          indent.status === "converted"
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                          {indent.status === "converted" ? "Converted to PO" : "Pending Action"}
                        </span>
                      </td>
                      <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => setSelectedIndentForPrint(indent)}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-amber-500" onClick={() => handlePrintIndent(indent)}>
                            <Printer className="w-3.5 h-3.5 mr-1" /> Print PDF
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-primary" onClick={() => setSharingItem({ type: "indent", item: indent })}>
                            <MessageSquare className="w-3.5 h-3.5 mr-1" /> Share
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PURCHASE ORDERS workspace */}
      {activeSubTab === "purchase-orders" && (
        <div className="space-y-4 animate-fade-up">
          <div className="p-4 bg-secondary/20 border border-border rounded-xl flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-purple-400" /> Purchase Orders (PO) Workspace
              </h3>
              <p className="text-xs text-muted-foreground">Draft POs, manage vendor supplier relations, and process executive authorization. Click converting to native stock purchases dynamically.</p>
            </div>
          </div>

          {/* PO Table */}
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-secondary/40 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-3">PO Reference</th>
                  <th className="p-3">Order Date</th>
                  <th className="p-3">Vendor / Supplier</th>
                  <th className="p-3">Source Indent</th>
                  <th className="p-3">Grand Total</th>
                  <th className="p-3">Authorization Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-muted-foreground">
                      No Purchase Orders drafted yet in this tenant. Click "Draft PO" above to begin.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map(po => (
                    <tr key={po.id} className="border-b border-border/40 hover:bg-secondary/10 transition-all cursor-pointer" onClick={() => setSelectedPOForPrint(po)}>
                      <td className="p-3 font-mono font-bold text-purple">{po.po_number}</td>
                      <td className="p-3">{new Date(po.date).toLocaleDateString()}</td>
                      <td className="p-3 font-semibold">{po.vendor_name}</td>
                      <td className="p-3 font-mono text-[10px]">{po.indent_number || "Manual Entry"}</td>
                      <td className="p-3 font-bold text-foreground">{fmtINR(po.grand_total)}</td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                          po.status === "purchased"
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : po.status === "approved"
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                          {po.status === "purchased" ? "Stock Commited" : po.status === "approved" ? "Approved" : "Pending Review"}
                        </span>
                      </td>
                      <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold" onClick={() => setSelectedPOForPrint(po)}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-amber-500" onClick={() => handlePrintPO(po)}>
                            <Printer className="w-3.5 h-3.5 mr-1" /> Print PDF
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-primary" onClick={() => setSharingItem({ type: "po", item: po })}>
                            <MessageSquare className="w-3.5 h-3.5 mr-1" /> Share
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── CREATIVE MODAL: DRAFT INDENT ─── */}
      {showIndentForm && (() => {
        const previouslyIndentedProductIds = new Set(indents.flatMap(ind => ind.items?.map(i => i.product_id) || []));
        const filteredProducts = products.filter(p => !indentItemSearch || p.name.toLowerCase().includes(indentItemSearch.toLowerCase()));
        
        return (
        <Dialog open onOpenChange={setShowIndentForm}>
          <DialogContent className="w-[95vw] max-w-xl h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b border-border bg-card z-10 shrink-0">
              <DialogTitle className="text-sm font-black flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Draft New Material Indent
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <form id="indent-form" onSubmit={handleCreateIndentSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold">Request Date</Label>
                    <Input type="date" value={indentForm.date} onChange={e => setIndentForm({ ...indentForm, date: e.target.value })} className="h-9" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold">Originator Profile</Label>
                    <Input value={user?.name || user?.full_name || "Manager"} className="h-9 opacity-70" disabled />
                  </div>
                </div>

                {/* Add Items Box */}
                <div className="border border-border/60 rounded-xl p-3 bg-secondary/15 space-y-3">
                  <h4 className="text-[11px] font-black text-primary uppercase">Catalog Search & Add Multiple</h4>
                  <div className="space-y-2">
                    <Input 
                      placeholder="Search catalog by name..." 
                      value={indentItemSearch} 
                      onChange={e => setIndentItemSearch(e.target.value)} 
                      className="h-9"
                    />
                    <div className="max-h-40 overflow-y-auto border border-border rounded-lg bg-card divide-y divide-border/50">
                      {filteredProducts.slice(0, 10).map(p => {
                        const exists = indentForm.items.find(x => x.product_id === p.id);
                        const isFirstTime = !previouslyIndentedProductIds.has(p.id);
                        return (
                          <div key={p.id} className={cn("flex items-center justify-between p-2 hover:bg-secondary/30", isFirstTime ? "bg-amber-500/5" : "")}>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold flex items-center gap-1.5">
                                {p.name}
                                {isFirstTime && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold tracking-wider">FIRST TIME</span>}
                              </span>
                              <span className="text-[10px] text-muted-foreground">Stock: {p.stock} {p.unit || "PCS"}</span>
                            </div>
                            <Button 
                              type="button" 
                              variant={exists ? "secondary" : "default"} 
                              size="sm" 
                              className={cn("h-7 text-xs px-3", !exists && "bg-primary text-primary-foreground")}
                              disabled={!!exists}
                              onClick={() => {
                                if (!exists) {
                                  setIndentForm({
                                    ...indentForm,
                                    items: [...indentForm.items, { product_id: p.id, name: p.name, qty: 1, unit: p.unit || "PCS" }]
                                  });
                                }
                              }}
                            >
                              {exists ? "Added" : "Add"}
                            </Button>
                          </div>
                        )
                      })}
                      {filteredProducts.length === 0 && <div className="p-3 text-xs text-center text-muted-foreground">No products found</div>}
                    </div>
                  </div>

                  {/* Selected Items */}
                  {indentForm.items.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <h5 className="text-[10px] font-bold text-muted-foreground uppercase">Selected Items ({indentForm.items.length})</h5>
                      <div className="space-y-1.5">
                        {indentForm.items.map((item, idx) => {
                          const isFirstTime = !previouslyIndentedProductIds.has(item.product_id);
                          return (
                          <div key={item.product_id} className={cn("flex items-center justify-between gap-2 p-2 bg-card border rounded-lg text-xs font-semibold", isFirstTime ? "border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]" : "border-border/80")}>
                            <span className="flex-1 truncate">{item.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Input 
                                type="number" 
                                min="1" 
                                value={item.qty} 
                                onChange={e => {
                                  const list = [...indentForm.items];
                                  list[idx].qty = Math.max(1, parseInt(e.target.value) || 1);
                                  setIndentForm({ ...indentForm, items: list });
                                }} 
                                className="w-16 h-7 text-xs font-bold text-center" 
                              />
                              <span className="text-[10px] text-muted-foreground uppercase">{item.unit}</span>
                              <button type="button" onClick={() => {
                                setIndentForm({ ...indentForm, items: indentForm.items.filter((_, i) => i !== idx) });
                              }} className="p-1 rounded hover:bg-secondary text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Procurement Dispatch Notes (Optional)</Label>
                  <textarea 
                    value={indentForm.notes} 
                    onChange={e => setIndentForm({ ...indentForm, notes: e.target.value })} 
                    placeholder="Include special logistics notes, vendor guidelines, or internal comments here..." 
                    className="w-full min-h-[80px] p-2 text-xs border border-border rounded-lg bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-border bg-card shrink-0 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowIndentForm(false)}>Cancel</Button>
              <Button form="indent-form" type="submit" className="flex-1 gold-gradient text-black font-black">Draft & Log Indent</Button>
            </div>
          </DialogContent>
        </Dialog>
        );
      })()}

      {/* ─── CREATIVE MODAL: DRAFT PO ─── */}
      {showPOForm && (
        <Dialog open onOpenChange={setShowPOForm}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 border-b border-border sticky top-0 bg-card z-10">
              <DialogTitle className="text-sm font-black flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-purple-400" /> Draft Purchase Order
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePOSubmit} className="p-4 space-y-4">
              
              {/* Pre fill selectors */}
              <div className="grid grid-cols-2 gap-2 bg-purple-500/5 border border-purple-500/10 rounded-xl p-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] font-black text-purple uppercase">Link Source Material Indent</Label>
                  <Select onValueChange={(val) => {
                    const indent = indents.find(i => i.id === val);
                    if (indent) {
                      setPoForm({
                        ...poForm,
                        indent_id: indent.id,
                        indent_number: indent.indent_number,
                        items: (indent.items || []).map(it => ({
                          product_id: it.product_id,
                          name: it.name,
                          qty: it.qty,
                          unit: it.unit || "PCS",
                          rate: 0,
                          gst_rate: 18
                        }))
                      });
                      toast.info(`Imported ${indent.items?.length || 0} products from Indent request ${indent.indent_number}!`);
                    }
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pre-fill form from a pending Indent..." /></SelectTrigger>
                    <SelectContent>
                      {indents.filter(i => i.status !== "converted").map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.indent_number} - {i.created_by_name} ({i.items?.length || 0} items)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Vendor supplier detail columns */}
              <div className="space-y-2 border border-border/60 rounded-xl p-3 bg-secondary/10">
                <h4 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Vendor / Supplier Registry</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Vendor Name</Label>
                    <Input value={poForm.vendor_name} onChange={e => setPoForm({ ...poForm, vendor_name: e.target.value })} placeholder="Vendor / Supplier name" className="h-8 text-xs" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Vendor GSTIN</Label>
                    <Input value={poForm.vendor_gstin} onChange={e => setPoForm({ ...poForm, vendor_gstin: e.target.value })} placeholder="27XXXXX..." className="h-8 text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Vendor Phone</Label>
                    <Input value={poForm.vendor_phone} onChange={e => setPoForm({ ...poForm, vendor_phone: e.target.value })} placeholder="98XXXXXXXX" className="h-8 text-xs" />
                  </div>
                </div>
              </div>

              {/* Manual search addition for new items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold">Procurement Items Table</Label>
                  <div className="w-56">
                    <Select onValueChange={(val) => {
                      const prod = products.find(p => p.id === val);
                      if (prod) {
                        const exists = poForm.items.find(x => x.product_id === prod.id);
                        if (exists) {
                          toast.warning(`${prod.name} is already in the PO.`);
                          return;
                        }
                        setPoForm({
                          ...poForm,
                          items: [...poForm.items, { product_id: prod.id, name: prod.name, qty: 1, unit: prod.unit || "PCS", rate: Number(prod.purchase_price || prod.rate || 0), gst_rate: Number(prod.gst_rate || 18) }]
                        });
                      }
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Add catalog items..." /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* PO Items Editor List */}
                <div className="overflow-x-auto rounded-xl border border-border/80 max-h-48 overflow-y-auto">
                  <table className="w-full border-collapse text-left text-xs bg-card">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-border text-[9px] font-bold text-muted-foreground uppercase">
                        <th className="p-2">Item Description</th>
                        <th className="p-2 w-16 text-center">Qty</th>
                        <th className="p-2 w-28 text-right">Cost Rate</th>
                        <th className="p-2 w-16 text-center">GST %</th>
                        <th className="p-2 w-28 text-right">Total</th>
                        <th className="p-2 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poForm.items.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-6 text-muted-foreground italic">No products added. Select above or link an Indent to import items.</td>
                        </tr>
                      ) : (
                        poForm.items.map((item, idx) => {
                          const itemTotal = Number(item.qty || 0) * Number(item.rate || 0) * (1 + Number(item.gst_rate || 0) / 100);
                          return (
                            <tr key={item.product_id} className="border-b border-border/40 hover:bg-secondary/5 font-semibold">
                              <td className="p-2 truncate max-w-[150px]">{item.name}</td>
                              <td className="p-2">
                                <Input 
                                  type="number" 
                                  min="1" 
                                  value={item.qty} 
                                  onChange={e => {
                                    const list = [...poForm.items];
                                    list[idx].qty = Math.max(1, parseInt(e.target.value) || 1);
                                    setPoForm({ ...poForm, items: list });
                                  }} 
                                  className="h-7 text-xs font-bold text-center p-1" 
                                />
                              </td>
                              <td className="p-2">
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01"
                                  value={item.rate} 
                                  onChange={e => {
                                    const list = [...poForm.items];
                                    list[idx].rate = Math.max(0, parseFloat(e.target.value) || 0);
                                    setPoForm({ ...poForm, items: list });
                                  }} 
                                  className="h-7 text-xs font-mono font-bold text-right p-1" 
                                />
                              </td>
                              <td className="p-2">
                                <select 
                                  value={item.gst_rate} 
                                  onChange={e => {
                                    const list = [...poForm.items];
                                    list[idx].gst_rate = Number(e.target.value);
                                    setPoForm({ ...poForm, items: list });
                                  }} 
                                  className="h-7 text-xs bg-card border border-border rounded w-full p-1"
                                >
                                  {[0, 5, 12, 18, 28].map(g => <option key={g} value={g}>{g}%</option>)}
                                </select>
                              </td>
                              <td className="p-2 text-right font-mono font-bold">{fmtINR(itemTotal)}</td>
                              <td className="p-2 text-center">
                                <button type="button" onClick={() => {
                                  setPoForm({ ...poForm, items: poForm.items.filter((_, i) => i !== idx) });
                                }} className="text-destructive hover:bg-secondary p-1 rounded">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Discount + Notes + Calculation row */}
              <div className="grid grid-cols-2 gap-3 items-start border-t border-border pt-3">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Discount Value (₹)</Label>
                    <Input type="number" min="0" value={poForm.discount} onChange={e => setPoForm({ ...poForm, discount: Math.max(0, parseFloat(e.target.value) || 0) })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Order Terms / Instructions</Label>
                    <textarea value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Procurement timeline guidelines..." className="w-full min-h-[56px] text-xs p-1.5 border border-border rounded-lg" />
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="bg-secondary/20 border border-border/80 rounded-xl p-3 text-xs font-semibold space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Subtotal:</span>
                    <span className="font-mono">{fmtINR(poForm.items.reduce((acc, curr) => acc + (Number(curr.qty || 0) * Number(curr.rate || 0)), 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST Taxes:</span>
                    <span className="font-mono">{fmtINR(poForm.items.reduce((acc, curr) => acc + (Number(curr.qty || 0) * Number(curr.rate || 0) * (Number(curr.gst_rate || 0) / 100)), 0))}</span>
                  </div>
                  {poForm.discount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Applied Discount:</span>
                      <span className="font-mono">-{fmtINR(poForm.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm pt-2 border-t border-border/50 text-foreground">
                    <span>Grand Total:</span>
                    <span className="font-mono text-purple">
                      {fmtINR(Math.max(0, 
                        poForm.items.reduce((acc, curr) => acc + (Number(curr.qty || 0) * Number(curr.rate || 0)), 0) +
                        poForm.items.reduce((acc, curr) => acc + (Number(curr.qty || 0) * Number(curr.rate || 0) * (Number(curr.gst_rate || 0) / 100)), 0) -
                        Number(poForm.discount || 0)
                      ))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowPOForm(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 gold-gradient text-black font-black">Draft & Log PO</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── DIALOG: STAFF SHARING SELECTION POPUP ─── */}
      {sharingItem && (
        <Dialog open onOpenChange={() => setSharingItem(null)}>
          <DialogContent className="w-[95vw] max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-black">Share with Internal Staff</DialogTitle>
              <p className="text-[10px] text-muted-foreground">Select an active staff member to share ticket: <b>{sharingItem.item?.indent_number || sharingItem.item?.po_number}</b></p>
            </DialogHeader>
            <div className="space-y-2 pt-3 max-h-64 overflow-y-auto">
              {staffUsers.length === 0 ? (
                <p className="text-center py-4 text-xs text-muted-foreground">No other active staff members found.</p>
              ) : (
                staffUsers.filter(u => u.id !== user?.id).map(u => (
                  <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border/45 hover:border-primary/20 bg-secondary/10">
                    <div>
                      <h4 className="text-xs font-black">{u.name || u.full_name}</h4>
                      <p className="text-[9px] text-muted-foreground uppercase font-semibold">{u.role_id?.replace("role-", "").replace("_", " ") || "Staff"}</p>
                    </div>
                    <Button size="sm" className="h-7 text-[10px] font-black gold-gradient text-black" onClick={() => handleShareToStaff(u)}>
                      Share Link
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── DIALOG: INDENT PRINT PREVIEW DETAILS ─── */}
      {selectedIndentForPrint && (
        <Dialog open onOpenChange={() => setSelectedIndentForPrint(null)}>
          <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-black">Material Indent Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-2 bg-secondary/35 border border-border/80 rounded-xl p-3">
                <div>
                  <p className="text-muted-foreground text-[10px]">Indent Number</p>
                  <p className="font-mono text-primary font-bold text-sm">{selectedIndentForPrint.indent_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Request Date</p>
                  <p>{new Date(selectedIndentForPrint.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Requested By</p>
                  <p>{selectedIndentForPrint.created_by_name || "Manager"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Current Status</p>
                  <p className="uppercase text-amber-500 font-bold">{selectedIndentForPrint.status || "Pending"}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-black text-muted-foreground uppercase">Requested Products</p>
                <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-border text-[9px] font-bold text-muted-foreground">
                        <th className="p-2">Item Description</th>
                        <th className="p-2 text-center">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedIndentForPrint.items || []).map(item => (
                        <tr key={item.product_id} className="border-b border-border/40">
                          <td className="p-2 font-medium">{item.name}</td>
                          <td className="p-2 text-center font-bold">{item.qty} {item.unit || "PCS"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedIndentForPrint.notes && (
                <div className="p-2.5 bg-yellow-500/5 border border-yellow-500/20 text-yellow-600 rounded-xl">
                  <p className="text-[9px] uppercase font-bold">Originator Notes</p>
                  <p className="mt-0.5 leading-relaxed font-medium">{selectedIndentForPrint.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-border">
                <Button variant="outline" className="h-9 text-xs" onClick={() => handlePrintIndent(selectedIndentForPrint)}>
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print PDF
                </Button>
                <Button variant="outline" className="h-9 text-xs" onClick={() => setSharingItem({ type: "indent", item: selectedIndentForPrint })}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> Share Chat
                </Button>
                {selectedIndentForPrint.status !== "converted" && user?.role_id === "role-accountant" ? (
                  <Button className="h-9 text-xs gold-gradient text-black font-black" onClick={() => {
                    setSelectedIndentForPrint(null);
                    const event = new CustomEvent("openCreatePOFromIndent", {
                      detail: { indentId: selectedIndentForPrint.id, indentNumber: selectedIndentForPrint.indent_number }
                    });
                    window.dispatchEvent(event);
                  }}>
                    <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Create PO
                  </Button>
                ) : (
                  <Button variant="outline" className="h-9 text-xs" disabled>
                    PO Generated
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── DIALOG: PO PRINT PREVIEW DETAILS ─── */}
      {selectedPOForPrint && (
        <Dialog open onOpenChange={() => setSelectedPOForPrint(null)}>
          <DialogContent className="w-[95vw] max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-black">Purchase Order (PO) Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-2 bg-secondary/35 border border-border/80 rounded-xl p-3">
                <div>
                  <p className="text-muted-foreground text-[10px]">PO Reference</p>
                  <p className="font-mono text-purple font-bold text-sm">{selectedPOForPrint.po_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Order Date</p>
                  <p>{new Date(selectedPOForPrint.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Vendor / Supplier</p>
                  <p className="text-foreground font-bold">{selectedPOForPrint.vendor_name}</p>
                  {selectedPOForPrint.vendor_gstin && <p className="text-[10px] text-muted-foreground font-mono">GSTIN: {selectedPOForPrint.vendor_gstin}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Calculated Grand Total</p>
                  <p className="text-purple text-base font-black font-mono">{fmtINR(selectedPOForPrint.grand_total)}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-black text-muted-foreground uppercase">Procured Products</p>
                <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-border text-[9px] font-bold text-muted-foreground uppercase">
                        <th className="p-2">Item Description</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Cost Rate</th>
                        <th className="p-2 text-center">GST</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPOForPrint.items || []).map(item => (
                        <tr key={item.product_id} className="border-b border-border/40 font-medium">
                          <td className="p-2 truncate max-w-[150px]">{item.name}</td>
                          <td className="p-2 text-center font-bold">{item.qty} {item.unit || "PCS"}</td>
                          <td className="p-2 text-right font-mono">{fmtINR(item.rate)}</td>
                          <td className="p-2 text-center">{item.gst_rate}%</td>
                          <td className="p-2 text-right font-mono font-bold">{fmtINR(item.qty * item.rate * (1 + item.gst_rate / 100))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedPOForPrint.notes && (
                <div className="p-2.5 bg-secondary/30 border border-border/60 rounded-xl">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Order Notes & Terms</p>
                  <p className="mt-0.5 leading-relaxed font-medium text-muted-foreground">{selectedPOForPrint.notes}</p>
                </div>
              )}

              {/* Senior Executive Actions Panel */}
              {selectedPOForPrint.status !== "purchased" && user?.hierarchy_level <= 3 && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Senior Executive Procurement Console
                  </h4>
                  <p className="text-[10px] text-muted-foreground">You have access to authorize and commit stock changes. Approving PO signs off order details. Executing "Purchase" commits physical catalog stocks.</p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {selectedPOForPrint.status !== "approved" && (
                      <Button size="sm" variant="outline" className="h-8 border-yellow-500/35 text-yellow-500 hover:bg-yellow-500/10 text-[10px] font-bold" onClick={() => handleActionPO("approve", selectedPOForPrint)}>
                        Approve PO Draft
                      </Button>
                    )}
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black col-span-1" onClick={() => {
                      setSelectedPOForPrint(null);
                      handleActionPO("purchase", selectedPOForPrint);
                    }}>
                      Convert to Purchase & Update Stock
                    </Button>
                  </div>
                </div>
              )}

              {/* Standard Actions */}
              <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-border">
                <Button variant="outline" className="h-9 text-xs" onClick={() => handlePrintPO(selectedPOForPrint)}>
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print PDF
                </Button>
                <Button variant="outline" className="h-9 text-xs" onClick={() => setSharingItem({ type: "po", item: selectedPOForPrint })}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> Share Chat
                </Button>
                <Button variant="outline" className="h-9 text-xs" onClick={() => setSelectedPOForPrint(null)}>
                  Close Panel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add/Edit Product Form Dialog */}
      {showForm && (
        <ProductForm
          open={showForm}
          onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}
          product={editing}
          businessType={businessType}
          onSave={handleSave}
        />
      )}

      {/* Barcode Dialog */}
      {barcodeProduct && (
        <BarcodeGenerator 
          open={!!barcodeProduct} 
          onOpenChange={(v) => { if (!v) setBarcodeProduct(null); }} 
          product={barcodeProduct} 
          onSaveBarcode={async (newBarcode) => {
            try {
              if (newBarcode && newBarcode !== barcodeProduct.barcode) {
                await updateInventory(barcodeProduct.id, { barcode: newBarcode });
                queryClient.invalidateQueries(["products"]);
                toast.success("Barcode updated successfully!");
              }
            } catch (err) {
              toast.error("Failed to update barcode: " + err.message);
            }
          }}
        />
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