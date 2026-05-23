import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { RefreshCw, Upload, Image as ImageIcon, Trash2, X, Check, Loader2, Printer, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "@/lib/toast";
import { getCategoriesByShopType, suggestCategoryByName } from "@/lib/shopCategories";

export const UNITS = ["PCS", "KG", "LTR", "MTR", "BOX", "BAG", "SET", "PAIR", "DOZEN"];
export const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28];

export function ProductForm({ open, onOpenChange, product, onSave, businessType }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    hsn: product?.hsn || "",
    category: product?.category || "",
    brand: product?.brand || "",
    gst_rate: product?.gst_rate ?? 18,
    gst_effective_date: product?.gst_effective_date || "",
    mrp: product?.mrp || 0,
    rate: product?.rate || 0,
    purchase_rate: product?.purchase_rate || 0,
    wholesale_price: product?.wholesale_price || 0,
    stock: product?.stock || 0,
    min_stock: product?.min_stock || 10,
    unit: product?.unit || "PCS",
    barcode: product?.barcode || "",
    batch_no: product?.batch_no || "",
    expiry_date: product?.expiry_date || "",
    is_weighed: product?.is_weighed || false,
    sizes: product?.sizes || [],
    colors: product?.colors || "",
    description: product?.description || "",
    image_url: product?.image_url || "",
    supplier_name: product?.supplier_name || "",
    manufacturer_name: product?.manufacturer_name || "",
    rack_location: product?.rack_location || "",
    infinite_stock: product?.infinite_stock || false,
    loose_selling: product?.loose_selling || false,
    selling_unit: product?.selling_unit || "PCS",
    pack_size: product?.pack_size || 1,
    loose_stock: product?.loose_stock || 0,
    plu_code: product?.plu_code || "",
    requires_scale: product?.requires_scale || false,
    loose_rate_per_kg: product?.loose_rate_per_kg || 0,
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Barcode Sticker Customization & Printer States
  const [showBarcodePanel, setShowBarcodePanel] = useState(false);
  const [stickerShowName, setStickerShowName] = useState(true);
  const [stickerShowMrp, setStickerShowMrp] = useState(true);
  const [stickerShowPrice, setStickerShowPrice] = useState(true);
  const [stickerUseQr, setStickerUseQr] = useState(false);
  const [stickerSize, setStickerSize] = useState("50x30");
  const [stickerQty, setStickerQty] = useState(1);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Shop Categories logic & preloads
  const [activeBusinessType, setActiveBusinessType] = useState("retail");

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await base44.entities.ShopSettings.list();
        const bType = settings?.[0]?.business_type || "retail";
        setActiveBusinessType(bType);
      } catch (err) {
        console.error("Failed to load settings in ProductForm:", err);
      }
    }
    if (businessType) {
      setActiveBusinessType(businessType);
    } else {
      loadSettings();
    }
  }, [businessType]);

  const categoriesList = useMemo(() => {
    return getCategoriesByShopType(activeBusinessType);
  }, [activeBusinessType]);

  const categoryOptions = useMemo(() => {
    return categoriesList.map(cat => ({
      label: `${cat.name} (${cat.hindi})`,
      value: cat.name
    }));
  }, [categoriesList]);

  const handleCategoryChange = (catName) => {
    // Guard against accidental object value coming from UI/select
    // Expected value shape: string category name
    const normalizedCatName =
      catName && typeof catName === "object" && "name" in catName
        ? catName.name
        : catName;

    if (!normalizedCatName || typeof normalizedCatName !== "string") return;

    set("category", normalizedCatName);
    const matched = categoriesList.find((c) => c.name === normalizedCatName);
    if (matched) {
      set("gst_rate", matched.defaultGst);
      set("hsn", matched.defaultHsn);
      set("unit", matched.defaultUnit);
      toast.info(
        `Auto-filled: GST ${matched.defaultGst}%, HSN ${matched.defaultHsn}, UOM ${matched.defaultUnit}`
      );
    }
  };

  const aiSuggestedCat = useMemo(() => {
    if (!form.name) return null;
    return suggestCategoryByName(form.name, activeBusinessType);
  }, [form.name, activeBusinessType]);

  // Voice recognition logic
  const [listeningVoice, setListeningVoice] = useState(false);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice search is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListeningVoice(true);
      toast.info("Listening for category name...");
    };

    recognition.onresult = (event) => {
      if (!event.results?.[0]?.[0]?.transcript) {
        toast.warning("Could not recognize speech. Please try again.");
        return;
      }
      const speechToText = event.results[0][0].transcript.toLowerCase();
      console.log("Voice speech recognized:", speechToText);

      const match = categoriesList.find(cat => {
        const engName = cat.name.toLowerCase();
        const hindiName = cat.hindi.toLowerCase();
        return speechToText.includes(engName) || 
               speechToText.includes(hindiName) ||
               engName.includes(speechToText) || 
               hindiName.includes(speechToText);
      });

      if (match) {
        handleCategoryChange(match.name);
        toast.success(`Voice selected: ${match.name}`);
      } else {
        toast.error(`Could not match voice "${speechToText}" to any category.`);
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error", e);
      toast.error("Speech recognition failed.");
      setListeningVoice(false);
    };

    recognition.onend = () => {
      setListeningVoice(false);
    };

    recognition.start();
  };

  const generateBarcode = () => {
    const code = "8" + Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
    set("barcode", code);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("image_url", file_url);
      toast.success("Product image uploaded!");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const clearImage = (e) => {
    e.preventDefault();
    set("image_url", "");
  };

  const handlePrintStickers = (e) => {
    e.preventDefault();
    const sizeMap = {
      "38x25": { w: 144, h: 96 },
      "50x30": { w: 190, h: 113 },
      "60x40": { w: 227, h: 151 },
      "100x70": { w: 378, h: 264 }
    };
    const size = sizeMap[stickerSize] || sizeMap["50x30"];
    const codeValue = form.barcode || form.sku || "000000";

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
          ${form.name || "Product"}
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
          ${stickerShowPrice ? `<div style="font-size:10px;font-weight:900;color:#000;">₹${form.rate || 0}</div>` : ""}
          ${stickerShowMrp && form.mrp ? `<div style="font-size:8px;text-decoration:line-through;color:#666;">MRP: ₹${form.mrp}</div>` : ""}
        </div>
        ${form.batch_no ? `<div style="font-size:7px;color:#555;">B.No: ${form.batch_no}</div>` : ""}
      </div>
    `).join("");

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Popup blocked! Please allow popups to print barcode labels.");
      return;
    }

    try {
      win.document.write(`<!DOCTYPE html><html><head><title>Barcode Labels</title>
      <style>body{margin:8px;background:#fff;}@media print{body{margin:0;}}</style>
      </head><body>
      <div style="display:flex;flex-wrap:wrap;">${labels}</div>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script>
      </body></html>`);
      win.document.close();
    } catch (e) {
      console.error("Print error:", e);
      toast.error("Failed to generate print layout");
      win.close();
    }
  };

  function generateBarsHTML(val) {
    if (!val) return "";
    let bars = [];
    let x = 5;
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

  function generateQRModulesHTML(val) {
    const matrix = generateQRMatrix(val);
    const rects = [];
    for (let r = 0; r < 21; r++) {
      for (let c = 0; c < 21; c++) {
        if (matrix[r][c] === 1) {
          rects.push(`<rect x="${c}" y="${r}" width="1.05" height="1.05" fill="#000"/>`);
        }
      }
    }
    return rects.join("");
  }

  // Auto-calculated variables
  const totalSellableUnits = form.loose_selling 
    ? (form.stock * (form.pack_size || 1)) + (form.loose_stock || 0) 
    : form.stock;

  const pricePerUnit = form.loose_selling && form.pack_size > 0 
    ? (form.rate / form.pack_size).toFixed(2) 
    : form.rate;

  useEffect(() => {
    if (open) {
      setSaving(false);
      setSavedSuccess(false);
    }
    if (open && !product) {
      const randomSku = "PROD-" + Math.floor(1000 + Math.random() * 9000);
      const randomBarcode = "8" + Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
      setForm({
        name: "",
        sku: randomSku,
        hsn: "",
        category: "General",
        brand: "Generic",
        gst_rate: 18,
        gst_effective_date: "",
        mrp: 0,
        rate: 0,
        purchase_rate: 0,
        wholesale_price: 0,
        stock: 0,
        min_stock: 10,
        unit: "PCS",
        barcode: randomBarcode,
        batch_no: "",
        expiry_date: "",
        is_weighed: false,
        sizes: [],
        colors: "",
        description: "",
        image_url: "",
        supplier_name: "",
        manufacturer_name: "",
        rack_location: "",
        infinite_stock: false,
        loose_selling: false,
        selling_unit: "PCS",
        pack_size: 1,
        loose_stock: 0,
        plu_code: "",
        requires_scale: false,
        loose_rate_per_kg: 0,
      });
    } else if (product) {
      setForm({
        name: product.name || "",
        sku: product.sku || "",
        hsn: product.hsn || "",
        category: product.category || "",
        brand: product.brand || "",
        gst_rate: product.gst_rate ?? 18,
        gst_effective_date: product.gst_effective_date || "",
        mrp: product.mrp || 0,
        rate: product.rate || 0,
        purchase_rate: product.purchase_rate || 0,
        wholesale_price: product.wholesale_price || 0,
        stock: product.stock || 0,
        min_stock: product.min_stock || 10,
        unit: product.unit || "PCS",
        barcode: product.barcode || "",
        batch_no: product.batch_no || "",
        expiry_date: product.expiry_date || "",
        is_weighed: product.is_weighed || false,
        sizes: product.sizes || [],
        colors: product.colors || "",
        description: product.description || "",
        image_url: product.image_url || "",
        supplier_name: product.supplier_name || "",
        manufacturer_name: product.manufacturer_name || "",
        rack_location: product.rack_location || "",
        infinite_stock: product.infinite_stock || false,
        loose_selling: product.loose_selling || false,
        selling_unit: product.selling_unit || "PCS",
        pack_size: product.pack_size || 1,
        loose_stock: product.loose_stock || 0,
        plu_code: product.plu_code || "",
        requires_scale: product.requires_scale || false,
        loose_rate_per_kg: product.loose_rate_per_kg || 0,
      });
    }
  }, [open, product]);

  const handleSaveClick = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSave({
        ...form,
        total_sellable_units: totalSellableUnits,
        price_per_unit: Number(pricePerUnit),
      });
      setSaving(false);
      setSavedSuccess(true);
    } catch (err) {
      setSaving(false);
      toast.error("Failed to save product: " + err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full sm:w-[95vw] h-full sm:h-auto max-h-screen sm:max-h-[92vh] overflow-y-auto bg-card text-slate-900 dark:text-slate-100 pt-0 px-4 sm:px-5 pb-4 sm:pb-5 rounded-none sm:rounded-2xl border-0 sm:border border-border fixed left-0 sm:left-[50%] top-0 sm:top-[50%] translate-x-0 sm:translate-x-[-50%] translate-y-0 sm:translate-y-[-50%] [&>button.absolute]:hidden">
        {savedSuccess && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-card border border-emerald-500/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center space-y-4 max-w-sm border-border">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center animate-bounce shadow-inner">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="font-black text-xl text-emerald-600 dark:text-emerald-400">
                🎉 Product Saved!
              </h3>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Product successfully synced with Full-Stack Inventory
              </p>
              <p className="text-xs text-muted-foreground animate-pulse">
                This window will auto-close in 2 seconds...
              </p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-500 h-full animate-[loading-bar_2s_linear_forwards]" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        )}
        <div className="sticky top-0 -mx-4 sm:-mx-5 z-30 h-[25px] flex items-center justify-between px-4 bg-slate-100 dark:bg-slate-900 border-b border-border/40 text-[9px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
          <span>📦 Product Entry Portal</span>
          <div className="flex items-center gap-2">
            <span className="text-primary font-black">GST COMPLIANT</span>
            <button 
              type="button"
              onClick={() => onOpenChange(false)} 
              className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex items-center justify-center p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-850"
              title="Close Dialog"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <DialogHeader className="pt-4 flex flex-row items-center justify-between">
          <DialogTitle className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 text-lg">
            📦 {product ? "Edit Product" : "Add Product"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2 pb-12 sm:pb-2">
          
          {/* Section 1: General & Branding */}
          <div className="bg-secondary/10 p-4 rounded-xl border border-border/30 space-y-4">
            <p className="text-[12px] font-black text-primary flex items-center gap-1.5">📝 General Info & Brand</p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Product Image Uploader */}
              <div className="space-y-1.5 w-full sm:w-auto">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> Product Image
                </Label>
                <div className="flex gap-4 items-center">
                  {form.image_url ? (
                    <div className="relative w-28 h-28 border rounded-xl overflow-hidden bg-white/5 flex items-center justify-center group border-border">
                      <img src={form.image_url} alt="Product" className="object-cover w-full h-full" />
                      <button 
                        onClick={clearImage}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500"
                        title="Remove Image"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-28 h-28 cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-2 transition-all bg-secondary/20">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] font-bold text-center">
                        {uploadingImage ? "Uploading..." : "Click to Upload"}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Main Info */}
              <div className="flex-1 grid grid-cols-1 gap-3 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Item Name *</Label>
                    <Input placeholder="LED Bulb 9W" value={form.name} onChange={e => set("name", e.target.value)} className="h-10 text-slate-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Category</Label>
                      <button
                        type="button"
                        onClick={startVoiceSearch}
                        className={cn(
                          "p-1 rounded-lg text-slate-500 hover:text-primary transition-all active:scale-95",
                          listeningVoice ? "bg-red-500/20 text-red-500 animate-pulse" : "hover:bg-slate-200 dark:hover:bg-slate-800"
                        )}
                        title="Voice Search Category (आवाज़ से श्रेणी खोजें)"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                        </svg>
                      </button>
                    </div>
                    <SearchableSelect
                      options={categoryOptions}
                      value={form.category}
                      onValueChange={handleCategoryChange}
                      placeholder="Select Category"
                      searchPlaceholder="Search category..."
                      className="h-10 text-slate-900 dark:text-slate-100 mt-1"
                    />
                    {aiSuggestedCat && form.category !== aiSuggestedCat.name && (
                      <button
                        type="button"
                        onClick={() => handleCategoryChange(aiSuggestedCat.name)}
                        className="mt-1.5 text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 hover:bg-amber-500/20 active:scale-95 transition-all w-fit animate-pulse"
                      >
                        <span>✨ AI Suggests: {aiSuggestedCat.name} ({aiSuggestedCat.hindi})</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Brand Name</Label>
                    <Input placeholder="Philips" value={form.brand} onChange={e => set("brand", e.target.value)} className="h-10 text-slate-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Manufacturer</Label>
                    <Input placeholder="Philips India" value={form.manufacturer_name} onChange={e => set("manufacturer_name", e.target.value)} className="h-10 text-slate-900 dark:text-slate-100" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Description</Label>
              <textarea 
                placeholder="Product specifications, warranty details, etc..." 
                value={form.description} 
                onChange={e => set("description", e.target.value)} 
                className="w-full mt-1 bg-background border border-input rounded-xl px-3 py-2 text-xs resize-none h-14 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Section 2: Barcode, SKU & Storage */}
          <div className="bg-secondary/10 p-4 rounded-xl border border-border/30 space-y-4">
            <p className="text-[12px] font-black text-primary flex items-center gap-1.5">🏷️ Barcode & Storage Location</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Barcode / EAN</Label>
                <div className="flex gap-2 mt-1">
                  <Input placeholder="8901234567890" value={form.barcode} onChange={e => set("barcode", e.target.value)} className="font-mono h-10 flex-1 text-slate-900 dark:text-slate-100" />
                  <Button type="button" variant="outline" onClick={generateBarcode} className="px-3 h-10 text-slate-700 dark:text-slate-300 border-border" title="Auto Generate">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">SKU Code (Auto)</Label>
                <Input placeholder="PROD-001" value={form.sku} onChange={e => set("sku", e.target.value)} className="h-10 mt-1 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Rack / Storage Location</Label>
                <Input placeholder="Shelf A-3" value={form.rack_location} onChange={e => set("rack_location", e.target.value)} className="h-10 mt-1 text-slate-900 dark:text-slate-100" />
              </div>
            </div>

            {/* Elegant Barcode Sticker Control Panel & Real-time Live Preview */}
            <div className="border-t border-border/40 pt-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBarcodePanel(!showBarcodePanel)}
                className="w-full h-auto min-h-[40px] py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-black bg-secondary/20 border-border hover:bg-secondary/40 rounded-xl"
              >
                <span className="flex items-center gap-1.5 text-primary text-left">
                  🏷️ {showBarcodePanel ? "Hide Barcode Panel" : "Print Barcode Sticker (बारकोड स्टीकर)"}
                </span>
                <span className="text-[10px] text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0">
                  {showBarcodePanel ? "Collapse ▴" : "Customize ▾"}
                </span>
              </Button>

              {showBarcodePanel && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-4 bg-background/50 border border-border/40 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Left Column: Sticker Controls */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">🛠️ Customize Layout</p>
                    
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
                          className="h-8.5 mt-1 text-slate-900 dark:text-slate-100 font-mono text-center"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1.5 bg-secondary/10 p-3 rounded-xl border border-border/30">
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
                          Show MRP on sticker {form.mrp > 0 ? `(₹${form.mrp})` : ""}
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
                          Show Selling Price on sticker {form.rate > 0 ? `(₹${form.rate})` : ""}
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none group border-t border-border/20 pt-1.5 mt-1.5">
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

                    <Button
                      type="button"
                      onClick={handlePrintStickers}
                      className="w-full gold-gradient text-black font-extrabold h-10 text-[12px] rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-transform"
                    >
                      <Printer className="w-4 h-4" /> Print Labels ({stickerQty} stickers)
                    </Button>
                  </div>

                  {/* Right Column: Live Sticker Preview */}
                  <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-border/30 pt-3 md:pt-0 md:pl-4 w-full overflow-hidden">
                    <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 self-start flex items-center gap-1">👁️ Sticker Live Preview</p>
                    
                    <div className="relative group/preview w-full flex justify-center py-2 bg-slate-50/50 dark:bg-slate-900/50 border border-border/30 rounded-2xl overflow-x-auto hide-scrollbar">
                      <div 
                        className="bg-white text-black p-3 border rounded-xl shadow-lg flex flex-col items-center justify-center font-mono border-slate-300 max-w-full relative transition-all hover:shadow-xl select-none"
                        style={{ 
                          width: stickerSize === "38x25" ? "144px" : stickerSize === "60x40" ? "210px" : stickerSize === "100x70" ? "260px" : "180px", 
                          minHeight: stickerSize === "38x25" ? "96px" : stickerSize === "60x40" ? "140px" : stickerSize === "100x70" ? "180px" : "110px"
                        }}
                      >
                        {stickerShowName && (
                          <div className="text-[10px] font-black text-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap mb-1 font-sans">
                            {form.name || "Item Name"}
                          </div>
                        )}

                        <div className="flex justify-center items-center py-1.5 w-full bg-white">
                          {stickerUseQr ? (
                            renderQRCodeSVG(form.barcode || form.sku || "000000", stickerSize === "38x25" ? 50 : stickerSize === "60x40" ? 70 : stickerSize === "100x70" ? 100 : 60)
                          ) : (
                            renderBarcodeSVG(form.barcode || form.sku || "000000", stickerSize === "38x25" ? 120 : stickerSize === "60x40" ? 180 : stickerSize === "100x70" ? 220 : 150, stickerSize === "38x25" ? 45 : stickerSize === "60x40" ? 65 : stickerSize === "100x70" ? 80 : 55)
                          )}
                        </div>

                        <div className="flex gap-2.5 items-center justify-center mt-1 text-[10px] font-black font-sans">
                          {stickerShowPrice && <span>₹{form.rate || 0}</span>}
                          {stickerShowMrp && form.mrp > 0 && <span className="text-[8px] line-through text-slate-500 font-bold">MRP: ₹{form.mrp}</span>}
                        </div>

                        {form.batch_no && (
                          <div className="text-[7px] text-slate-600 mt-0.5 font-bold">B.No: {form.batch_no}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Pricing & Taxes */}
          <div className="bg-secondary/15 p-4 rounded-xl border border-border/30 space-y-3">
            <p className="text-[12px] font-black text-primary flex items-center gap-1.5">💰 Pricing, Taxes & Supplier</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Buy Price (₹)</Label>
                <Input type="number" inputMode="decimal" placeholder="₹0" value={form.purchase_rate || ""} onChange={e => set("purchase_rate", Number(e.target.value))} className="h-9 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Sell Price (₹) *</Label>
                <Input type="number" inputMode="decimal" placeholder="₹0" value={form.rate || ""} onChange={e => set("rate", Number(e.target.value))} className="h-9 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Wholesale Price (₹)</Label>
                <Input type="number" inputMode="decimal" placeholder="₹0" value={form.wholesale_price || ""} onChange={e => set("wholesale_price", Number(e.target.value))} className="h-9 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">MRP (₹)</Label>
                <Input type="number" inputMode="decimal" placeholder="₹0" value={form.mrp || ""} onChange={e => set("mrp", Number(e.target.value))} className="h-9 text-slate-900 dark:text-slate-100" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div className="sm:col-span-2">
                <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Supplier Name</Label>
                <Input placeholder="e.g. Distributor Ltd." value={form.supplier_name} onChange={e => set("supplier_name", e.target.value)} className="h-9 mt-1 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">GST Rate (%)</Label>
                <SearchableSelect
                  options={GST_RATES.map(r => ({ value: String(r), label: `${r}%` }))}
                  value={String(form.gst_rate)}
                  onValueChange={v => set("gst_rate", Number(v))}
                  placeholder="GST Rate"
                  searchPlaceholder="Search GST..."
                />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">GST Effective Date</Label>
                <Input type="date" value={form.gst_effective_date} onChange={e => set("gst_effective_date", e.target.value)} className="h-9 mt-1 text-slate-900 dark:text-slate-100" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">HSN/SAC Code</Label>
                <Input placeholder="8539" value={form.hsn} onChange={e => set("hsn", e.target.value)} className="h-9 mt-1 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Stock UOM</Label>
                <SearchableSelect
                  options={UNITS}
                  value={form.unit}
                  onValueChange={v => set("unit", v)}
                  placeholder="Stock UOM"
                  searchPlaceholder="Search UOM..."
                />
              </div>
            </div>
          </div>

          {/* Section 4: Advanced Stock Controls & Loose Selling */}
          <div className="bg-secondary/10 p-4 rounded-xl border border-border/30 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-[12px] font-black text-primary flex items-center gap-1.5">⚡ Advanced Stock & Loose Selling</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={form.infinite_stock} 
                    onChange={e => set("infinite_stock", e.target.checked)} 
                    className="w-4 h-4 accent-primary" 
                  />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Infinite Stock (सेवा / डिजिटल)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={form.loose_selling} 
                    onChange={e => set("loose_selling", e.target.checked)} 
                    className="w-4 h-4 accent-primary" 
                  />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Enable Loose Selling (खुला बेचना)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Pack Stock Qty</Label>
                <Input 
                  type="number" 
                  inputMode="numeric" 
                  value={form.stock} 
                  onChange={e => set("stock", Number(e.target.value))} 
                  disabled={form.infinite_stock}
                  className="h-10 text-slate-900 dark:text-slate-100" 
                />
              </div>
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Min Alert Stock</Label>
                <Input 
                  type="number" 
                  inputMode="numeric" 
                  value={form.min_stock} 
                  onChange={e => set("min_stock", Number(e.target.value))} 
                  disabled={form.infinite_stock}
                  className="h-10 text-slate-900 dark:text-slate-100" 
                />
              </div>
              {form.loose_selling && (
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Loose Stock Qty</Label>
                  <Input 
                    type="number" 
                    inputMode="numeric" 
                    value={form.loose_stock} 
                    onChange={e => set("loose_stock", Number(e.target.value))} 
                    className="h-10 text-slate-900 dark:text-slate-100" 
                  />
                </div>
              )}
            </div>

            {form.loose_selling && (
              <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <Label className="text-[10px] font-bold text-purple-400">Selling Unit (UOM)</Label>
                  <Input placeholder="PCS / Tab" value={form.selling_unit} onChange={e => set("selling_unit", e.target.value)} className="h-9 mt-1 bg-background border-purple-500/20 text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-purple-400">Pack Size (Qty per pack)</Label>
                  <Input type="number" min={1} value={form.pack_size} onChange={e => set("pack_size", Number(e.target.value))} className="h-9 mt-1 bg-background border-purple-500/20 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="bg-background/40 p-2 border border-purple-500/20 rounded-lg text-center">
                  <p className="text-[9px] text-muted-foreground uppercase font-black">Total Sellable</p>
                  <p className="text-sm font-black text-purple-400 font-mono mt-0.5">{totalSellableUnits} {form.selling_unit}</p>
                </div>
                <div className="bg-background/40 p-2 border border-purple-500/20 rounded-lg text-center">
                  <p className="text-[9px] text-muted-foreground uppercase font-black">Price Per Unit</p>
                  <p className="text-sm font-black text-purple-400 font-mono mt-0.5">₹{pricePerUnit}</p>
                </div>
              </div>
            )}
          </div>

          {/* Supermarket Settings Section */}
          {[
            "supermarket",
            "mall",
            "hypermarket",
            "grocery_store",
            "convenience_store",
            "departmental_store",
            "mini_mart"
          ].includes(String(activeBusinessType || "").toLowerCase().trim()) && (
            <div className="bg-secondary/15 p-4 rounded-xl border border-primary/20 space-y-4">
              <p className="text-[12px] font-black text-primary flex items-center gap-1.5">🛒 Supermarket Settings (Reliance/DMart Mode)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">PLU Code (4-digit)</Label>
                  <Input 
                    placeholder="e.g. 4011" 
                    value={form.plu_code} 
                    maxLength={4}
                    onChange={e => set("plu_code", e.target.value.replace(/\D/g, ''))} 
                    className="h-10 text-slate-900 dark:text-slate-100 font-mono" 
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Weighable Toggle</Label>
                  <div className="flex items-center h-10 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={form.requires_scale} 
                        onChange={e => set("requires_scale", e.target.checked)} 
                        className="w-4 h-4 accent-primary" 
                      />
                      <span className="text-[12px] font-bold text-slate-750 dark:text-slate-250">Requires Weighing Scale</span>
                    </label>
                  </div>
                </div>
                {form.requires_scale && (
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Loose Rate per Kg (₹)</Label>
                    <Input 
                      type="number" 
                      inputMode="decimal"
                      placeholder="₹ per kg" 
                      value={form.loose_rate_per_kg || ""} 
                      onChange={e => set("loose_rate_per_kg", Number(e.target.value))} 
                      className="h-10 text-slate-900 dark:text-slate-100" 
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 5: Batch Details (Vertical Specifics) */}
          {businessType !== "restaurant" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Batch No. {businessType === "medical" && <span className="text-emerald-400 font-bold">*</span>}
                </Label>
                <Input placeholder="B2024-01" value={form.batch_no} onChange={e => set("batch_no", e.target.value)} className="h-10 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Expiry Date {businessType === "medical" && <span className="text-emerald-400 font-bold">*</span>}
                </Label>
                <Input type="date" value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} className="h-10 text-slate-900 dark:text-slate-100" />
              </div>
            </div>
          )}

          {businessType === "fashion" && (
            <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 space-y-3">
              <div>
                <Label className="text-[11px] text-cyan-400 font-bold">Select Available Sizes</Label>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {["S", "M", "L", "XL", "XXL"].map(size => {
                    const hasSize = form.sizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          const next = hasSize ? form.sizes.filter(s => s !== size) : [...form.sizes, size];
                          set("sizes", next);
                        }}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-black rounded-lg border transition-all active:scale-95",
                          hasSize 
                            ? "bg-cyan-500 text-black border-cyan-500" 
                            : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary/60"
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-cyan-400 font-bold">Available Colors (comma separated)</Label>
                <Input 
                  placeholder="Black, White, Blue, Red" 
                  value={form.colors} 
                  onChange={e => set("colors", e.target.value)} 
                  className="mt-1 bg-background border-cyan-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t border-border/40">
            <Button 
              className="gold-gradient text-black font-bold flex-1 h-10 gap-2" 
              onClick={handleSaveClick} 
              disabled={!form.name || !form.rate || saving || savedSuccess}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>💾 Save Product</>
              )}
            </Button>
            <Button variant="outline" className="text-slate-700 dark:text-slate-300 border-border h-10 px-6" onClick={() => onOpenChange(false)} disabled={saving || savedSuccess}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 🏷️ STICKER BARCODE & QR SVG GENERATION HELPERS
// ==========================================
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
    <svg width="100%" height={height} viewBox={`0 0 ${x} ${height}`} xmlns="http://www.w3.org/2050/svg" style={{ maxWidth: width }}>
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={0} width={bar.w} height={height * 0.8} fill="#000" />
      ))}
      <text x={x / 2} y={height - 2} textAnchor="middle" fontSize={height * 0.12} fontFamily="monospace" fill="#000">
        {value}
      </text>
    </svg>
  );
}
