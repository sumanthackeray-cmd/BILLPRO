import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, fmtDate, today, GST_RATES, calcItems } from "@/lib/gst-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, ShoppingCart, X, CreditCard, ChevronRight } from "lucide-react";
import { toast } from "@/lib/toast";
import OCRUpload from "@/components/purchases/OCRUpload";
import { ProductForm } from "@/components/inventory/ProductForm";
import BarcodeGenerator from "@/components/inventory/BarcodeGenerator";
import { useLanguage } from "@/lib/LanguageContext";
import { SearchableSelect } from "@/components/ui/searchable-select";

function PurchaseForm({ open, onOpenChange, purchase, products, purchases, onSave, businessType }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    date: purchase?.date || today(),
    vendor_name: purchase?.vendor_name || "",
    vendor_gstin: purchase?.vendor_gstin || "",
    vendor_phone: purchase?.vendor_phone || "",
    vendor_invoice_no: purchase?.vendor_invoice_no || "",
    items: purchase?.items || [],
    discount: purchase?.discount || 0,
    notes: purchase?.notes || "",
    payment_status: purchase?.payment_status || "paid",
    payment_mode: purchase?.payment_mode || "cash",
    amount_paid: purchase?.amount_paid ?? 0,
    due_date: purchase?.due_date || "",
  });

  const [search, setSearch] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingCartProduct, setEditingCartProduct] = useState(null);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [focusedVendorInput, setFocusedVendorInput] = useState(false);
  const [prefilledBarcode, setPrefilledBarcode] = useState("");
  
  const queryClient = useQueryClient();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Get unique vendors list from purchase history
  const uniqueVendors = useMemo(() => {
    const list = [];
    const seen = new Set();
    purchases.forEach(p => {
      if (p.vendor_name && !seen.has(p.vendor_name.toLowerCase())) {
        seen.add(p.vendor_name.toLowerCase());
        list.push({
          name: p.vendor_name,
          gstin: p.vendor_gstin || "",
          phone: p.vendor_phone || "",
        });
      }
    });
    return list;
  }, [purchases]);

  // Suggested products previously purchased from the selected vendor
  const vendorProducts = useMemo(() => {
    if (!form.vendor_name) return [];
    const matchedPurchases = purchases.filter(
      p => p.vendor_name?.toLowerCase() === form.vendor_name.toLowerCase()
    );
    const prodIds = new Set();
    const list = [];
    matchedPurchases.forEach(p => {
      (p.items || []).forEach(it => {
        if (it.product_id && !prodIds.has(it.product_id)) {
          prodIds.add(it.product_id);
          const found = products.find(pr => pr.id === it.product_id);
          if (found) list.push(found);
        }
      });
    });
    return list.slice(0, 6);
  }, [form.vendor_name, purchases, products]);

  const handleProductSave = async (productData) => {
    try {
      if (editingCartProduct) {
        // UPDATE EXISTING PRODUCT
        await base44.entities.Product.update(editingCartProduct.id, productData);
        toast.success("Product updated successfully!");
        queryClient.invalidateQueries({ queryKey: ["products"] });
        
        // Update cart row to reflect new product details
        setForm(f => {
          const newItems = [...f.items];
          const idx = f.items.findIndex(it => it.product_id === editingCartProduct.id);
          if (idx !== -1) {
            newItems[idx] = { 
              ...newItems[idx], 
              name: productData.name, 
              hsn: productData.hsn || "", 
              unit: productData.unit || "PCS",
              rate: productData.purchase_rate || productData.rate || newItems[idx].rate,
              gst_rate: productData.gst_rate ?? newItems[idx].gst_rate
            };
          }
          return { ...f, items: newItems };
        });

        setTimeout(() => {
          setEditingCartProduct(null);
          setShowAddProduct(false);
        }, 2000);
      } else {
        // CREATE NEW PRODUCT
        const created = await base44.entities.Product.create(productData);
        toast.success("Product created & added to purchase!");
        queryClient.invalidateQueries({ queryKey: ["products"] });
        // Add product to this purchase order cart
        addProduct({ ...productData, id: created.id });
        
        // Delay closing of showAddProduct by 2 seconds!
        setTimeout(() => {
          setBarcodeProduct({ ...productData, id: created.id });
          setShowAddProduct(false);
          setPrefilledBarcode("");
        }, 2000);
      }
    } catch (e) {
      toast.error("Failed to save product: " + e.message);
    }
  };

  const handleSaveBarcode = async (barcode) => {
    if (!barcodeProduct?.id) return;
    await base44.entities.Product.update(barcodeProduct.id, { barcode });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setBarcodeProduct(null);
    toast.success("Barcode saved!");
  };

  const addProduct = (p) => {
    setForm(f => {
      const ex = f.items.find(i => i.product_id === p.id);
      if (ex) return { ...f, items: f.items.map(i => i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i) };
      return { ...f, items: [...f.items, { product_id: p.id, name: p.name, hsn: p.hsn || "", unit: p.unit || "PCS", qty: 1, rate: p.purchase_rate || p.rate || 0, gst_rate: p.gst_rate || 18 }] };
    });
    setSearch("");
  };

  const updateItem = (idx, key, val) =>
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: ["qty", "rate", "gst_rate"].includes(key) ? Number(val) : val } : it) }));
  
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  
  const totals = calcItems(form.items, form.discount);
  const grandTotal = totals.taxable + totals.cgst + totals.sgst;
  const dueAmount = Math.max(0, grandTotal - form.amount_paid);

  const handleAmountPaidChange = (val) => {
    const amt = Number(val);
    setForm(f => {
      let status = f.payment_status;
      if (amt >= grandTotal) {
        status = "paid";
      } else if (amt <= 0) {
        status = "unpaid";
      } else {
        status = "partial";
      }
      return { ...f, amount_paid: amt, payment_status: status };
    });
  };

  const handleStatusChange = (status) => {
    setForm(f => {
      let amt = f.amount_paid;
      if (status === "paid") {
        amt = grandTotal;
      } else if (status === "unpaid") {
        amt = 0;
      }
      return { ...f, payment_status: status, amount_paid: amt };
    });
  };

  // Set default paid amount if status is Paid/Unpaid and grandTotal changes
  useEffect(() => {
    if (form.payment_status === "paid") {
      set("amount_paid", grandTotal);
    } else if (form.payment_status === "unpaid") {
      set("amount_paid", 0);
    }
  }, [grandTotal, form.payment_status]);

  // Barcode / Text search trigger
  useEffect(() => {
    if (!search) return;
    // Check if search exactly matches a barcode
    const exactMatch = products.find(p => p.barcode === search);
    if (exactMatch) {
      addProduct(exactMatch);
      toast.success(`Scanned: ${exactMatch.name}`);
      setSearch("");
    }
  }, [search, products]);

  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter" && search) {
      e.preventDefault();
      // If no exact match but input is numeric (potential barcode), open add product dialog
      const looksLikeBarcode = /^\d{8,14}$/.test(search);
      if (looksLikeBarcode) {
        setPrefilledBarcode(search);
        setShowAddProduct(true);
      }
    }
  };

  const handleVendorSelect = (vendor) => {
    setForm(f => ({
      ...f,
      vendor_name: vendor.name,
      vendor_gstin: vendor.gstin,
      vendor_phone: vendor.phone,
    }));
    setFocusedVendorInput(false);
  };

  const filteredProducts = products.filter(p => 
    (p.name + (p.sku || "") + (p.barcode || "")).toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6);

  const filteredVendors = uniqueVendors.filter(v =>
    v.name.toLowerCase().includes(form.vendor_name.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full sm:w-[95vw] h-full sm:h-auto max-h-screen sm:max-h-[92vh] overflow-y-auto bg-card text-slate-900 dark:text-slate-100 pt-0 px-4 sm:px-5 pb-4 sm:pb-5 rounded-none sm:rounded-2xl border-0 sm:border border-border fixed left-0 sm:left-[50%] top-0 sm:top-[50%] translate-x-0 sm:translate-x-[-50%] translate-y-0 sm:translate-y-[-50%] [&>button.absolute]:hidden">
        <div className="sticky top-0 -mx-4 sm:-mx-5 z-30 h-[25px] flex items-center justify-between px-4 bg-slate-100 dark:bg-slate-900 border-b border-border/40 text-[9px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
          <span>🛒 {t("purchases.portal_header")}</span>
          <div className="flex items-center gap-2">
            <span className="text-primary font-black">{t("purchases.gst_compliant")}</span>
            <button 
              type="button"
              onClick={() => onOpenChange(false)} 
              className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex items-center justify-center p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
              title="Close Dialog"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <DialogHeader className="pt-4">
          <DialogTitle className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            🛒 {purchase ? t("purchases.edit_entry") : t("purchases.new_entry")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 pb-12 sm:pb-2">
          {/* OCR / Smart Import Bill */}
          <OCRUpload onExtracted={(data) => {
            setForm(f => ({
              ...f,
              vendor_name: data.vendor_name || f.vendor_name,
              vendor_gstin: data.vendor_gstin || f.vendor_gstin,
              vendor_phone: data.vendor_phone || f.vendor_phone,
              vendor_invoice_no: data.vendor_invoice_no || f.vendor_invoice_no,
              date: data.date || f.date,
              items: data.items?.length > 0 ? data.items.map(it => ({
                product_id: "", name: it.name || "", hsn: it.hsn || "",
                unit: it.unit || "PCS", qty: it.qty || 1,
                rate: it.rate || 0, gst_rate: it.gst_rate || 18,
              })) : f.items,
            }));
          }} />

          {/* Vendor Details Section */}
          <div className="bg-secondary/10 p-4 rounded-xl border border-border/30 space-y-3.5 relative">
            <p className="text-[12px] font-black text-primary flex items-center gap-1.5 uppercase">👤 {t("purchases.vendor_details")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{t("purchases.vendor_name_label")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    placeholder="Search or enter vendor..." 
                    value={form.vendor_name} 
                    onChange={e => set("vendor_name", e.target.value)} 
                    onFocus={() => setFocusedVendorInput(true)}
                    onBlur={() => setTimeout(() => setFocusedVendorInput(false), 200)}
                    className="h-10 text-slate-900 dark:text-slate-100 flex-1"
                  />
                </div>
                {focusedVendorInput && filteredVendors.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-[999] max-h-48 overflow-y-auto mt-1 p-1">
                    {filteredVendors.map((v, i) => (
                      <div 
                        key={i} 
                        onMouseDown={() => handleVendorSelect(v)}
                        className="flex justify-between px-3.5 py-2 cursor-pointer hover:bg-accent rounded-lg border-b border-border/20 last:border-0"
                      >
                        <div className="text-left">
                          <p className="text-[13px] font-black">{v.name}</p>
                          <p className="text-[10px] text-muted-foreground">{v.phone || "No phone"}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{t("purchases.vendor_phone_label")}</Label>
                <Input placeholder="Enter Phone" value={form.vendor_phone} onChange={e => set("vendor_phone", e.target.value)} className="h-10 mt-1 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{t("purchases.vendor_gstin_label")}</Label>
                <Input placeholder="27XXXXX..." value={form.vendor_gstin} onChange={e => set("vendor_gstin", e.target.value)} className="h-10 mt-1 text-slate-900 dark:text-slate-100" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{t("purchases.date_label")}</Label>
                <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="h-10 mt-1 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{t("purchases.invoice_no_label")}</Label>
                <Input placeholder="VND-0001" value={form.vendor_invoice_no} onChange={e => set("vendor_invoice_no", e.target.value)} className="h-10 mt-1 text-slate-900 dark:text-slate-100" />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-secondary/15 p-4 rounded-xl border border-border/30 space-y-3">
            <p className="text-[12px] font-black text-primary flex items-center gap-1.5 uppercase">📦 {t("purchases.items_cart")}</p>
            
            {/* Search and Quick Add */}
            <div className="flex gap-2 relative">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  className="pl-10 h-10 text-slate-900 dark:text-slate-100" 
                  placeholder={t("purchases.search_placeholder")} 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  onKeyDown={handleSearchKeyPress}
                />
                {search && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-[999] max-h-52 overflow-y-auto mt-1 p-1">
                    {filteredProducts.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => addProduct(p)} 
                        className="flex justify-between px-3.5 py-2.5 cursor-pointer hover:bg-accent rounded-lg border-b border-border/20 last:border-0"
                      >
                        <div>
                          <p className="text-[13px] font-bold">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">Barcode: {p.barcode || "N/A"}</p>
                        </div>
                        <span className="text-primary font-black text-xs self-center">₹{p.purchase_rate || p.rate || 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button 
                type="button" 
                onClick={() => {
                  setPrefilledBarcode("");
                  setShowAddProduct(true);
                }}
                className="bg-purple hover:bg-purple/90 text-white font-bold gap-1 px-4 h-10 rounded-xl active:scale-95 transition-all text-xs"
              >
                <Plus className="w-4 h-4" /> {t("purchases.quick_add_product")}
              </Button>
            </div>

            {/* Vendor Reorder Suggestions */}
            {form.vendor_name && vendorProducts.length > 0 && (
              <div className="p-2.5 bg-background/50 rounded-lg border border-purple-500/20 space-y-1.5">
                <p className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider">💡 {t("purchases.prev_purchased")}</p>
                <div className="flex gap-2 overflow-x-auto pb-1.5">
                  {vendorProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      className="px-2.5 py-1.5 bg-card hover:bg-accent border border-border/60 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all"
                    >
                      <Plus className="w-3 h-3 text-purple-400" /> {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cart Table Headers */}
            {form.items.length > 0 && (
              <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-black text-muted-foreground uppercase px-2 border-b border-border/20 pb-1.5">
                <span className="col-span-5">{t("purchases.product_details")}</span>
                <span className="col-span-2 text-center">{t("purchases.qty")}</span>
                <span className="col-span-2 text-right">{t("purchases.buy_price")}</span>
                <span className="col-span-1 text-center">{t("purchases.gst_pct")}</span>
                <span className="col-span-2 text-right">{t("purchases.total_amount")}</span>
              </div>
            )}

            {/* Cart Items List */}
            <div className="space-y-2">
              {form.items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-xs">{t("purchases.no_items")}</p>
                </div>
              )}
              {form.items.map((it, idx) => (
                <div key={idx} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 bg-card rounded-xl p-3.5 border border-border items-center">
                  <div className="col-span-5 w-full text-left">
                    <p className="text-[12px] font-black">{it.name}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">HSN: {it.hsn || "N/A"} · Unit: {it.unit}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-center gap-1 w-full">
                    <span className="text-[11px] sm:hidden text-muted-foreground">{t("purchases.qty")}:</span>
                    <Input className="w-20 sm:w-16 h-8 text-[11px] text-center" type="number" min={1} value={it.qty} onChange={e => updateItem(idx, "qty", e.target.value)} />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1 w-full">
                    <span className="text-[11px] sm:hidden text-muted-foreground">{t("purchases.buy_price")}:</span>
                    <Input className="w-24 sm:w-20 h-8 text-[11px] text-right" type="number" value={it.rate} onChange={e => updateItem(idx, "rate", e.target.value)} />
                  </div>
                  <div className="col-span-1 flex items-center justify-center gap-1 w-full">
                    <span className="text-[11px] sm:hidden text-muted-foreground">{t("purchases.gst_pct")}:</span>
                    <select 
                      className="bg-background border border-input rounded-md h-8 text-[11px] w-16" 
                      value={it.gst_rate} 
                      onChange={e => updateItem(idx, "gst_rate", e.target.value)}
                    >
                      {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 flex items-center justify-between sm:justify-end gap-1 w-full pt-1.5 sm:pt-0">
                    <button 
                      title="Edit Product Details"
                      onClick={() => {
                        const prod = products.find(p => p.id === it.product_id);
                        if (prod) {
                          setEditingCartProduct(prod);
                          setShowAddProduct(true);
                        } else {
                          toast.error("Product not found in database.");
                        }
                      }}
                      className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-95 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button 
                      title="Remove from Cart"
                      onClick={() => removeItem(idx)} 
                      className="w-7 h-7 rounded bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 active:scale-95 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-primary font-black text-[12px] w-20 text-right">{fmtINR(it.qty * it.rate * (1 + it.gst_rate / 100))}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Terms Section */}
          <div className="bg-secondary/10 p-4 rounded-xl border border-border/30 space-y-4">
            <p className="text-[12px] font-black text-primary flex items-center gap-1.5 uppercase"><CreditCard className="w-3.5 h-3.5" /> {t("purchases.payment_terms")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-sans">{t("purchases.payment_status")}</Label>
                <select 
                  className="w-full mt-1 bg-background border border-input rounded-xl h-10 text-xs px-3 text-slate-900 dark:text-slate-100"
                  value={form.payment_status}
                  onChange={e => handleStatusChange(e.target.value)}
                >
                  <option value="paid">{t("purchases.paid")}</option>
                  <option value="partial">{t("purchases.partial")}</option>
                  <option value="unpaid">{t("purchases.unpaid")}</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{t("purchases.amount_paid")}</Label>
                <Input 
                  type="number" 
                  value={form.amount_paid} 
                  onChange={e => handleAmountPaidChange(e.target.value)} 
                  className="h-10 mt-1 text-slate-900 dark:text-slate-100" 
                />
              </div>
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{t("purchases.due_amount")}</Label>
                <div className="h-10 border border-border rounded-xl mt-1 flex items-center px-3 bg-secondary/30 font-bold text-sm text-red-500 font-mono">
                  {fmtINR(dueAmount)}
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{t("purchases.payment_mode")}</Label>
                <select 
                  className="w-full mt-1 bg-background border border-input rounded-xl h-10 text-xs px-3 text-slate-900 dark:text-slate-100"
                  value={form.payment_mode}
                  onChange={e => set("payment_mode", e.target.value)}
                  disabled={form.payment_status === "unpaid"}
                >
                  <option value="cash">{t("purchases.cash")}</option>
                  <option value="upi">{t("purchases.upi")}</option>
                  <option value="bank">{t("purchases.bank")}</option>
                  <option value="credit">{t("purchases.credit")}</option>
                </select>
              </div>
            </div>

            {dueAmount > 0 && (
              <div className="p-3.5 bg-red-500/5 rounded-xl border border-red-500/20 max-w-sm animate-fade-in space-y-1">
                <Label className="text-[11px] font-bold text-red-500 dark:text-red-400">
                  {t("purchases.due_date")}
                </Label>
                <Input 
                  type="date" 
                  value={form.due_date} 
                  onChange={e => set("due_date", e.target.value)} 
                  className="h-10 mt-1 border-red-500/25 bg-background text-slate-900 dark:text-slate-100" 
                />
              </div>
            )}

            <div>
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{t("purchases.remarks")}</Label>
              <textarea 
                placeholder="Purchase details, payment logs..." 
                value={form.notes} 
                onChange={e => set("notes", e.target.value)} 
                className="w-full mt-1 bg-background border border-input rounded-xl px-3 py-2 text-xs resize-none h-14 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Grand Totals Summary Card */}
          {form.items.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center flex-wrap gap-4">
              <div className="text-left space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Invoice Totals Breakdown</p>
                <p className="text-[12px] text-slate-700 dark:text-slate-300">
                  Taxable: {fmtINR(totals.taxable)} · CGST: {fmtINR(totals.cgst)} · SGST: {fmtINR(totals.sgst)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-primary uppercase">{t("purchases.grand_total")}</p>
                <p className="text-2xl font-black text-primary font-mono">{fmtINR(grandTotal)}</p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-3 border-t border-border/40">
            <Button 
              className="gold-gradient text-black font-extrabold flex-1 h-11 text-[13px] rounded-xl active:scale-[0.98] transition-transform" 
              onClick={() => onSave({ ...form, grand_total: grandTotal, due_amount: dueAmount })} 
              disabled={!form.vendor_name || form.items.length === 0}
            >
              {t("purchases.save_order")}
            </Button>
            <Button variant="outline" className="text-slate-700 dark:text-slate-300 border-border h-11 px-8 rounded-xl" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>

        {/* Quick Add Product Modal */}
        {showAddProduct && (
          <ProductForm 
            open={showAddProduct} 
            onOpenChange={(val) => {
              setShowAddProduct(val);
              if (!val) setEditingCartProduct(null);
            }} 
            onSave={handleProductSave} 
            product={editingCartProduct || (prefilledBarcode ? { barcode: prefilledBarcode } : null)}
            businessType={businessType}
          />
        )}
        
        {/* Instant Barcode Printing Dialog */}
        {barcodeProduct && (
          <BarcodeGenerator
            open={!!barcodeProduct}
            onOpenChange={v => !v && setBarcodeProduct(null)}
            product={barcodeProduct}
            onSaveBarcode={handleSaveBarcode}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Purchases() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 200),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const uniqueCategories = useMemo(() => {
    return [...new Set(products.map(p => p.category).filter(Boolean))];
  }, [products]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const matchSearch = 
        (p.purchase_number || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.vendor_name || "").toLowerCase().includes(search.toLowerCase()) ||
        String(p.grand_total || "").includes(search);
        
      if (!matchSearch) return false;

      if (statusFilter !== "all" && p.payment_status !== statusFilter) return false;

      if (categoryFilter !== "all") {
        const purchaseItems = p.items || [];
        const hasCategory = purchaseItems.some(it => {
          const prod = products.find(pr => pr.id === it.product_id);
          return prod && prod.category === categoryFilter;
        });
        if (!hasCategory) return false;
      }

      return true;
    });
  }, [purchases, products, search, statusFilter, categoryFilter]);

  const { data: settings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const shopSettings = settings[0] || {};

  const handleSave = async (formData) => {
    try {
      let buyPriceChanged = false;
      const changedProducts = [];

      if (editing) {
        // Scan for buy price changes in existing purchase order edit
        for (const item of formData.items) {
          if (item.product_id) {
            try {
              const prod = await base44.entities.Product.get(item.product_id);
              if (prod) {
                const newBuyPrice = Number(item.rate || 0);
                const oldBuyPrice = Number(prod.purchase_rate || 0);
                if (newBuyPrice !== oldBuyPrice) {
                  buyPriceChanged = true;
                  changedProducts.push(prod.name);
                  await base44.entities.Product.update(item.product_id, {
                    purchase_rate: newBuyPrice
                  });
                }
              }
            } catch (err) {
              console.error("Failed to sync buy price for product: " + item.product_id, err);
            }
          }
        }

        await base44.entities.Purchase.update(editing.id, formData);
        if (buyPriceChanged) {
          toast.success(`${t("purchases.toast_updated")} Updated buy price for products: ${changedProducts.join(", ")}`);
        } else {
          toast.success(t("purchases.toast_updated"));
        }
      } else {
        const counter = (shopSettings.purchase_counter || 0) + 1;
        const newPurchase = await base44.entities.Purchase.create({ 
          ...formData, 
          purchase_number: `PUR-${String(counter).padStart(4, "0")}` 
        });
        
        // Sync stock quantities & buy price updates
        for (const item of formData.items) {
          if (item.product_id) {
            try {
              const prod = await base44.entities.Product.get(item.product_id);
              if (prod) {
                const currentStock = Number(prod.stock || 0);
                const qtyAdded = Number(item.qty || 0);
                const newBuyPrice = Number(item.rate || 0);
                const oldBuyPrice = Number(prod.purchase_rate || 0);

                if (newBuyPrice !== oldBuyPrice) {
                  buyPriceChanged = true;
                  changedProducts.push(prod.name);
                }

                await base44.entities.Product.update(item.product_id, {
                  stock: currentStock + qtyAdded,
                  purchase_rate: newBuyPrice, // Sync Buy Price to Inventory
                });
              }
            } catch (err) {
              console.error("Failed to sync stock for product: " + item.product_id, err);
            }
          }
        }

        if (shopSettings.id && !shopSettings.id.startsWith("seed")) {
          await base44.entities.ShopSettings.update(shopSettings.id, { purchase_counter: counter });
        }

        if (buyPriceChanged) {
          toast.success(`${t("purchases.toast_created")} Updated buy price for products: ${changedProducts.join(", ")}`);
        } else {
          toast.success(t("purchases.toast_created"));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      toast.error("Failed to save purchase: " + err.message);
    }
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">🛒 {t("purchases.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{purchases.length} {t("purchases.purchase_entries_count")}</p>
        </div>
        <Button className="gold-gradient text-black font-bold gap-2 rounded-xl h-11" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-5 h-5" /> {t("purchases.add")}
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card border border-border rounded-xl p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground animate-none" />
          <Input 
            className="pl-9 h-10 text-xs font-bold" 
            placeholder="Search PO No, Vendor, Amount..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <SearchableSelect
            className="w-40 h-10"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "paid", label: "Paid" },
              { value: "partial", label: "Partial" },
              { value: "unpaid", label: "Unpaid" }
            ]}
            value={statusFilter}
            onValueChange={setStatusFilter}
            placeholder="Status"
            searchPlaceholder="Search status..."
          />
          <SearchableSelect
            className="w-48 h-10"
            options={[
              { value: "all", label: "All Categories" },
              ...uniqueCategories.map(cat => ({ value: cat, label: cat }))
            ]}
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            placeholder="Category"
            searchPlaceholder="Search category..."
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredPurchases.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t("purchases.no_purchases")}</p>
          </div>
        )}
        {filteredPurchases.map(p => (
          <div 
            key={p.id} 
            className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all cursor-pointer"
            onClick={() => { setEditing(p); setShowForm(true); }}
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm font-mono">{p.purchase_number}</span>
                  {p.payment_status === "paid" ? (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black px-2 py-0.5 rounded-full uppercase">{t("purchases.paid")}</span>
                  ) : p.payment_status === "partial" ? (
                    <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black px-2 py-0.5 rounded-full uppercase">{t("purchases.partial")}</span>
                  ) : (
                    <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 font-black px-2 py-0.5 rounded-full uppercase">{t("purchases.unpaid")}</span>
                  )}
                </div>
                <p className="font-semibold text-[14px] mt-0.5">{p.vendor_name}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">📅 {fmtDate(p.date)} · {(p.items || []).length} {t("invoices.items")}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xl font-black text-purple font-mono">{fmtINR(p.grand_total)}</p>
                {p.due_amount > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-red-400 font-bold">{t("purchases.due_label")} {fmtINR(p.due_amount)}</p>
                    {p.due_date && (
                      <p className="text-[9px] text-amber-500 font-bold">{t("purchases.pay_by_label")} {fmtDate(p.due_date)}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <PurchaseForm 
          open={showForm} 
          onOpenChange={setShowForm} 
          purchase={editing} 
          products={products} 
          purchases={purchases}
          onSave={handleSave} 
          businessType={shopSettings.business_type || "retail"} 
        />
      )}
    </div>
  );
}