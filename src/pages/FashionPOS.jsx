import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackButton } from "@/hooks/useBackButton";
import { base44 } from "@/api/base44Client";
import { toast } from "@/lib/toast";
import { 
  Zap, Search, ShoppingCart, User, Plus, Minus, Trash2, 
  Printer, Sparkles, Edit3, Edit,
  Shirt, Package, Check, Scan, X, FileText, RefreshCw, Clock,
  Scissors, ShoppingBag,
  ArrowLeft, Sun, Moon, History
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sliders } from "lucide-react";
import { 
  downloadInvoicePDF, 
  getInvoicePDFBlob, 
  generateThermalHTML 
} from "@/lib/pdf-share-utils";
import { 
  sendEscPosToPrinter, 
  generateEscPosPayload, 
  getOfflinePrintQueue, 
  saveOfflinePrintQueue, 
  addToOfflinePrintQueue 
} from "@/lib/escpos-utils";


// Standard Tailors
const TAILORS = ["Ramesh Kumar", "Anil Master", "Sunita Devi"];

// Standard Size Master maps
const AGE_GENDER_TABS = [
  { id: "all", label: "✨ All Catalog", desc: "All departments" },
  { id: "infant", label: "👶 Infant", desc: "0 - 2 Yrs" },
  { id: "kids_boys", label: "👦 Kids Boys", desc: "3 - 8 Yrs" },
  { id: "kids_girls", label: "👧 Kids Girls", desc: "3 - 8 Yrs" },
  { id: "teen_boys", label: "🕺 Teen Boys", desc: "9 - 16 Yrs" },
  { id: "teen_girls", label: "💃 Teen Girls", desc: "9 - 16 Yrs" },
  { id: "men", label: "👔 Men", desc: "17 - 60 Yrs" },
  { id: "women", label: "👗 Women", desc: "17 - 60 Yrs" },
  { id: "senior_men", label: "👴 Senior M", desc: "60+ Yrs" },
  { id: "senior_women", label: "👵 Senior W", desc: "60+ Yrs" }
];

export default function FashionPOS() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  
  // Dummy states for header compatibility
  const [isShiftActive, setIsShiftActive] = useState(true);
  const [canShift, setCanShift] = useState(true);
  const [currentCounter, setCurrentCounter] = useState("Register #01");
  const [billingType, setBillingType] = useState("B2C");
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [isShiftOpenDialogOpen, setIsShiftOpenDialogOpen] = useState(false);
  const [isShiftCloseDialogOpen, setIsShiftCloseDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Modals / Dropdowns toggles
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const [selectedCartIndexForAlteration, setSelectedCartIndexForAlteration] = useState(null);
  const [isStyleProfileSidebarOpen, setIsStyleProfileSidebarOpen] = useState(false);
  const [isCheckoutSuccessOpen, setIsCheckoutSuccessOpen] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  
  // Checkout & Payment states
  const [selectedCustomerId, setSelectedCustomerId] = useState("walk-in");
  const [paymentMethod, setPaymentMethod] = useState("cash"); // cash, card, upi, split
  const [splitCash, setSplitCash] = useState(0);
  const [splitCard, setSplitCard] = useState(0);
  const [splitUPI, setSplitUPI] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);
  const [latestInvoice, setLatestInvoice] = useState(null);
  
  // Standard print and share states
  const [selectedPrintSize, setSelectedPrintSize] = useState("58mm");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [printingStatus, setPrintingStatus] = useState("");
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  
  // Custom Alteration assignment form states
  const [alterationForm, setAlterationForm] = useState({
    tailorName: TAILORS[0],
    details: "Waist Taper, Hemming adjustments",
    charge: 100,
    deliveryDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0] // 2 days later
  });

  // Variant selector states
  const [chosenSize, setChosenSize] = useState("");
  const [chosenColor, setChosenColor] = useState("");
  const [chosenColorName, setChosenColorName] = useState("");

  // Customer measurements editor states
  const [isEditingMeasurements, setIsEditingMeasurements] = useState(false);
  const [measureForm, setMeasureForm] = useState({
    chest: 96, waist: 82, hip: 100, shoulder: 44, sleeve: 62, inseam: 76, neck: 39, height: 172, weight: 72,
    shirt_size: "L", trouser_size: "32", ethnic_size: "M", preferred_fit: "Regular", fit_notes: ""
  });

  // Back Button Navigation for Fashion POS Overlays
  useBackButton(() => setIsHistoryOpen(false), isHistoryOpen);
  useBackButton(() => setSelectedProductForVariant(null), selectedProductForVariant !== null);
  useBackButton(() => setSelectedCartIndexForAlteration(null), selectedCartIndexForAlteration !== null);
  useBackButton(() => setIsStyleProfileSidebarOpen(false), isStyleProfileSidebarOpen);
  useBackButton(() => setIsCheckoutSuccessOpen(false), isCheckoutSuccessOpen);

  // Quick Add Customer Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustGstin, setNewCustGstin] = useState("");

  // Quick Add Product Modals
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    name: "",
    rate: "",
    mrp: "",
    purchase_rate: "",
    stock: "",
    sizes: "S, M, L, XL",
    colors: "White, Black, Blue",
    category: "Fashion Apparel",
    sku: "",
    barcode: "",
    gst_rate: "12",
    hsn: "6203",
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Quick Add Handlers
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    try {
      const payload = {
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        gstin: newCustGstin.trim().toUpperCase(),
        created_at: new Date().toISOString(),
      };
      const newCust = await base44.entities.Customer.create(payload);
      setSelectedCustomerId(newCust.id);
      toast.success("Customer added successfully!");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsCustomerModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustGstin("");
    } catch (err) {
      toast.error("Failed to add customer: " + err.message);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!quickAddForm.name.trim() || !quickAddForm.rate) {
      toast.error("Product name and rate are required");
      return;
    }
    setIsSavingProduct(true);
    try {
      const parsedSizes = quickAddForm.sizes.split(",").map(s => s.trim()).filter(Boolean);
      const parsedColors = quickAddForm.colors.split(",").map(c => {
        const name = c.trim();
        let hex = "#ffffff";
        if (name.toLowerCase() === "black") hex = "#000000";
        if (name.toLowerCase() === "blue" || name.toLowerCase() === "navy") hex = "#1e3a8a";
        if (name.toLowerCase() === "red") hex = "#dc2626";
        if (name.toLowerCase() === "green") hex = "#16a34a";
        if (name.toLowerCase() === "yellow") hex = "#ca8a04";
        return { name, hex };
      }).filter(Boolean);

      const generatedSku = quickAddForm.sku.trim() || `${quickAddForm.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)}-${Date.now().toString().slice(-5)}`;
      const generatedBarcode = quickAddForm.barcode.trim() || String(Math.floor(10000000 + Math.random() * 89999999));

      const productPayload = {
        name: quickAddForm.name.trim(),
        sku: generatedSku,
        barcode: generatedBarcode,
        rate: parseFloat(quickAddForm.rate),
        mrp: parseFloat(quickAddForm.mrp) || parseFloat(quickAddForm.rate),
        price: parseFloat(quickAddForm.rate), // For compatibility with POS
        purchase_rate: parseFloat(quickAddForm.purchase_rate) || 0,
        stock: parseFloat(quickAddForm.stock) || 0,
        category: quickAddForm.category.trim(),
        gst_rate: parseFloat(quickAddForm.gst_rate) || 12,
        hsn: quickAddForm.hsn.trim(),
        sizes: parsedSizes,
        colors: parsedColors,
        created_at: new Date().toISOString(),
      };

      const created = await base44.entities.Product.create(productPayload);
      toast.success(`"${created.name}" added to catalog!`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsQuickAddOpen(false);
      setQuickAddForm({
        name: "",
        rate: "",
        mrp: "",
        purchase_rate: "",
        stock: "",
        sizes: "S, M, L, XL",
        colors: "White, Black, Blue",
        category: "Fashion Apparel",
        sku: "",
        barcode: "",
        gst_rate: "12",
        hsn: "6203",
      });
    } catch (err) {
      toast.error("Failed to add product: " + err.message);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Database Queries

  const { data: rawProducts = [], isLoading: isLoadingProd } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: rawProfiles = [] } = useQuery({
    queryKey: ["customer_style_profiles"],
    queryFn: () => base44.entities.CustomerStyleProfile.list(),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const shopSettings = settings[0] || {};

  useEffect(() => {
    if (shopSettings && shopSettings.printer_size) {
      setSelectedPrintSize(shopSettings.printer_size);
    }
  }, [shopSettings]);

  // Background auto-seeder to load premium catalog items on launch if catalog is empty
  // REMOVED: User requested empty dashboard and no dummy data on new company registration

  // Merge style profiles
  const profilesMap = useMemo(() => {
    const map = {};
    rawProfiles.forEach(p => {
      map[p.customer_id] = p;
    });
    return map;
  }, [rawProfiles]);

  // Selected customer details
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || { id: "walk-in", name: "Walk-in Customer", phone: "9999999999" };
  }, [customers, selectedCustomerId]);

  const activeCustomerStyleProfile = useMemo(() => {
    return profilesMap[selectedCustomerId] || null;
  }, [profilesMap, selectedCustomerId]);

  // Filtered Products
  const products = useMemo(() => {
    return rawProducts.filter(p => {
      // search match
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode?.includes(searchTerm);
      if (!matchSearch) return false;

      if (activeTab === "all") return true;
      const cat = p.category?.toLowerCase() || "";
      if (activeTab === "infant") return cat.includes("infant") || cat.includes("onesie");
      if (activeTab === "kids_boys") return cat.includes("kids") && cat.includes("boy");
      if (activeTab === "kids_girls") return cat.includes("kids") && cat.includes("girl");
      if (activeTab === "teen_boys") return cat.includes("teen") && cat.includes("boy");
      if (activeTab === "teen_girls") return cat.includes("teen") && cat.includes("girl");
      if (activeTab === "men") return cat.includes("men") && !cat.includes("kids") && !cat.includes("senior");
      if (activeTab === "women") return cat.includes("women") && !cat.includes("kids") && !cat.includes("senior");
      if (activeTab === "senior_men") return cat.includes("senior men") || cat.includes("elderly");
      if (activeTab === "senior_women") return cat.includes("senior women") || cat.includes("saree");
      
      return true;
    });
  }, [rawProducts, searchTerm, activeTab]);

  // Open variant selector dialog
  const handleProductSelect = (product) => {
    setSelectedProductForVariant(product);
    // Initialize variant options
    setChosenSize(product.sizes?.[0] || "L");
    setChosenColor(product.colors?.[0]?.hex || "#ffffff");
    setChosenColorName(product.colors?.[0]?.name || "White");
  };

  // Add selected variant to POS cart
  const handleAddVariantToCart = () => {
    if (!selectedProductForVariant) return;

    // Check if variant already in cart
    const existingIndex = cart.findIndex(item => 
      item.id === selectedProductForVariant.id && 
      item.selectedSize === chosenSize && 
      item.selectedColor === chosenColor
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].qty += 1;
      setCart(updatedCart);
      toast.success(`Increased quantity for ${selectedProductForVariant.name} (${chosenSize}/${chosenColorName})`);
    } else {
      const cartItem = {
        ...selectedProductForVariant,
        selectedSize: chosenSize,
        selectedColor: chosenColor,
        selectedColorName: chosenColorName,
        qty: 1,
        alteration: null // null or alteration structure
      };
      setCart([...cart, cartItem]);
      toast.success(`Added ${selectedProductForVariant.name} (${chosenSize}/${chosenColorName}) to cart`);
    }

    setSelectedProductForVariant(null);
  };

  // Remove/Change cart quantities
  const updateCartQty = (index, delta) => {
    const updated = [...cart];
    updated[index].qty += delta;
    if (updated[index].qty <= 0) {
      updated.splice(index, 1);
    }
    setCart(updated);
  };

  const removeCartItem = (index) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
    toast.info("Item removed from cart");
  };

  // Alteration order popup triggers
  const openAlterationModal = (index) => {
    setSelectedCartIndexForAlteration(index);
    const item = cart[index];
    setAlterationForm({
      tailorName: item.alteration?.tailor_name || TAILORS[0],
      details: item.alteration?.details || `Adjust waist, sleeves hemming for size ${item.selectedSize}`,
      charge: item.alteration?.charge || 120,
      deliveryDate: item.alteration?.delivery_date || new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]
    });
  };

  const saveAlterationToCartItem = () => {
    if (selectedCartIndexForAlteration === null) return;
    const updated = [...cart];
    updated[selectedCartIndexForAlteration].alteration = {
      tailor_name: alterationForm.tailorName,
      details: alterationForm.details,
      charge: Number(alterationForm.charge),
      delivery_date: alterationForm.deliveryDate
    };
    setCart(updated);
    setSelectedCartIndexForAlteration(null);
    toast.success("Tailor alteration task mapped to cart item!");
  };

  const removeAlterationFromCartItem = (index) => {
    const updated = [...cart];
    updated[index].alteration = null;
    setCart(updated);
    toast.info("Alteration details cleared");
  };

  // Totals calculations
  const totals = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;
    let alterationTotal = 0;

    cart.forEach(item => {
      const itemSub = item.price * item.qty;
      const altCharge = item.alteration ? item.alteration.charge : 0;
      
      subtotal += itemSub;
      alterationTotal += altCharge;

      // GST Calculation: GST rate is applied on the item subtotal
      const gstRate = item.gst_rate || 5;
      const gstVal = (itemSub * gstRate) / 100;
      taxAmount += gstVal;
    });

    const baseGrand = subtotal + taxAmount + alterationTotal;
    const discounted = Math.max(0, baseGrand - discountValue);

    return {
      subtotal,
      taxAmount,
      alterationTotal,
      grandTotal: Math.round(discounted),
      totalGst: taxAmount
    };
  }, [cart, discountValue]);

  // Open style profile measurements custom modal
  const openMeasurementsEditor = () => {
    if (activeCustomerStyleProfile) {
      setMeasureForm({
        chest: activeCustomerStyleProfile.measurements?.chest || 96,
        waist: activeCustomerStyleProfile.measurements?.waist || 82,
        hip: activeCustomerStyleProfile.measurements?.hip || 100,
        shoulder: activeCustomerStyleProfile.measurements?.shoulder || 44,
        sleeve: activeCustomerStyleProfile.measurements?.sleeve || 62,
        inseam: activeCustomerStyleProfile.measurements?.inseam || 76,
        neck: activeCustomerStyleProfile.measurements?.neck || 39,
        height: activeCustomerStyleProfile.measurements?.height || 172,
        weight: activeCustomerStyleProfile.measurements?.weight || 72,
        shirt_size: activeCustomerStyleProfile.preferred_sizes?.shirt || "L",
        trouser_size: activeCustomerStyleProfile.preferred_sizes?.trouser || "32",
        ethnic_size: activeCustomerStyleProfile.preferred_sizes?.ethnic || "M",
        preferred_fit: activeCustomerStyleProfile.preferred_fit || "Regular",
        fit_notes: activeCustomerStyleProfile.style_notes || ""
      });
    } else {
      setMeasureForm({
        chest: 96, waist: 82, hip: 100, shoulder: 44, sleeve: 62, inseam: 76, neck: 39, height: 172, weight: 72,
        shirt_size: "L", trouser_size: "32", ethnic_size: "M", preferred_fit: "Regular", fit_notes: ""
      });
    }
    setIsEditingMeasurements(true);
  };

  const handleSaveMeasurements = async () => {
    try {
      const dataPayload = {
        customer_id: selectedCustomerId,
        gender: activeCustomerStyleProfile?.gender || "male",
        measurements: {
          chest: Number(measureForm.chest),
          waist: Number(measureForm.waist),
          hip: Number(measureForm.hip),
          shoulder: Number(measureForm.shoulder),
          sleeve: Number(measureForm.sleeve),
          inseam: Number(measureForm.inseam),
          neck: Number(measureForm.neck),
          height: Number(measureForm.height),
          weight: Number(measureForm.weight),
        },
        preferred_sizes: {
          shirt: measureForm.shirt_size,
          trouser: measureForm.trouser_size,
          ethnic: measureForm.ethnic_size,
        },
        style_notes: measureForm.fit_notes,
        preferred_fit: measureForm.preferred_fit,
      };

      if (activeCustomerStyleProfile) {
        await base44.entities.CustomerStyleProfile.update(activeCustomerStyleProfile.id, dataPayload);
      } else {
        await base44.entities.CustomerStyleProfile.create(dataPayload);
      }

      toast.success("Style Profile details updated successfully!");
      setIsEditingMeasurements(false);
      queryClient.invalidateQueries({ queryKey: ["customer_style_profiles"] });
    } catch (e) {
      toast.error("Failed to update profile: " + e.message);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!latestInvoice) return;
    let cleanPhone = whatsappNumber.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }
    if (!cleanPhone) {
      toast.error("Please enter a valid phone number");
      return;
    }

    const loadingToast = toast.loading("Generating PDF bill...");
    try {
      const shopName = (!shopSettings.shop_name || shopSettings.shop_name === "Vogats") ? "EASYBMT SHOP" : shopSettings.shop_name;
      const itemsText = latestInvoice.items.map(item => `- ${item.name} (${item.qty} x ${item.rate})`).join("\n");
      const message = ` *${shopName}*\n\nDear *${latestInvoice.customer_name}*,\n\nThank you for shopping with us! Here is your invoice summary:\n\n*Invoice No:* ${latestInvoice.invoice_number}\n*Date:* ${latestInvoice.date}\n------------------------\n*Items:*\n${itemsText}\n------------------------\n*Subtotal:* ${latestInvoice.subtotal.toFixed(2)}\n*Tax (GST):* ${latestInvoice.tax_amount.toFixed(2)}\n*Total Paid:* ${latestInvoice.grand_total.toFixed(2)}\n\nHave a great day! `;

      const pdfFile = await getInvoicePDFBlob(latestInvoice, shopSettings);
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        toast.dismiss(loadingToast);
        await navigator.share({
          title: `Invoice ${latestInvoice.invoice_number}`,
          text: message,
          files: [pdfFile],
        });
        toast.success("Shared successfully!");
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfFile);
        link.download = pdfFile.name;
        link.click();
        URL.revokeObjectURL(link.href);
        
        const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message + "\n\n PDF bill downloaded  please attach manually.")}`;
        window.open(url, "_blank");
        toast.dismiss(loadingToast);
        toast.success("PDF downloaded! Attach it in WhatsApp.");
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      if (err.name !== 'AbortError') {
        toast.error("Failed to share: " + err.message);
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!latestInvoice) return;
    try {
      toast.loading("Generating PDF...", { id: "pdf-download" });
      await downloadInvoicePDF(latestInvoice, shopSettings);
      toast.success("PDF downloaded!", { id: "pdf-download" });
    } catch (err) {
      toast.error("PDF generation failed: " + err.message, { id: "pdf-download" });
    }
  };

  const triggerPrint = async (invoice, isCopy = false) => {
    if (!invoice) return;
    setIsDuplicate(isCopy);
    
    const printSize = selectedPrintSize || shopSettings.printer_size || "58mm";
    const runSettings = {
      ...shopSettings,
      printer_size: printSize
    };
    
    if (runSettings.printer_type === "browser" || !runSettings.printer_type) {
      setTimeout(() => {
        window.print();
      }, 300);
      return;
    }
    
    setPrintingStatus("Connecting...");
    try {
      const payload = generateEscPosPayload(invoice, runSettings, isCopy);
      const success = await sendEscPosToPrinter(payload, runSettings, (status) => {
        setPrintingStatus(status);
      });
      
      if (success) {
        toast.success("Receipt printed successfully!");
        setPrintingStatus("");
      } else {
        toast.error("Failed to print. Job added to offline queue.");
        addToOfflinePrintQueue(invoice, runSettings);
        setOfflineQueueCount(getOfflinePrintQueue().length);
        setPrintingStatus("");
      }
    } catch (err) {
      console.error(err);
      toast.error(`Printing error: ${err.message}. Added to offline queue.`);
      addToOfflinePrintQueue(invoice, runSettings);
      setOfflineQueueCount(getOfflinePrintQueue().length);
      setPrintingStatus("");
    }
  };

  const editInvoiceInCart = (invoice) => {
    if (!invoice) return;
    
    if (cart.length > 0 && !window.confirm("Loading this invoice into the active cart for editing will clear your current cart. Proceed?")) {
      return;
    }

    const newCart = (invoice.items || []).map(item => {
      const matchedProd = rawProducts.find(p => p.id === item.product_id);
      
      let baseName = item.name;
      let size = item.size || "";
      let color = item.color || "";
      
      const variantMatch = item.name.match(/\(([^)]+)\)/);
      if (variantMatch && !size) {
        baseName = item.name.replace(/\s*\([^)]+\)/, "");
        const details = variantMatch[1].split(",");
        details.forEach(d => {
          const parts = d.split(":");
          if (parts.length === 2) {
            const key = parts[0].trim().toLowerCase();
            const val = parts[1].trim();
            if (key === "size") size = val;
            if (key === "color") color = val;
          } else {
            size = variantMatch[1].trim();
          }
        });
      }
      
      const cartKey = `${item.product_id}-${size}-${color}`;
      
      return {
        ...matchedProd,
        id: item.product_id,
        name: baseName,
        qty: item.qty,
        price: item.rate,
        gst_rate: item.gst_rate || 12,
        hsn: item.hsn || "6203",
        selectedSize: size,
        selectedColor: color,
        selectedColorName: color,
        alteration: item.alteration || null,
        cartKey
      };
    });

    setCart(newCart);
    setEditingInvoiceId(invoice.id);

    const foundCustomer = customers.find(c => c.name === invoice.customer_name || c.phone === invoice.customer_phone);
    if (foundCustomer) {
      setSelectedCustomerId(foundCustomer.id);
    } else {
      setSelectedCustomerId("walk-in");
    }

    setBillingType(invoice.billing_type || "B2C");
    setDiscountValue(invoice.discount || 0); 
    setPaymentMethod(invoice.payment_method || "cash");
    
    toast.info(`Editing Invoice ${invoice.invoice_number}. Adjust items and checkout to save changes.`);
    setIsCheckoutSuccessOpen(false);
  };

  // Submit checkout and finalize POS transaction
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) {
      toast.error("POS Counter Error: Cart is empty");
      return;
    }
    if (!selectedCustomerId) {
      toast.error("Please select a customer.");
      return;
    }

    setIsProcessingCheckout(true);

    try {
      const invoiceNo = editingInvoiceId && latestInvoice
        ? latestInvoice.invoice_number 
        : "INV-FSH-" + Date.now().toString().slice(-6);
      
      const invoicePayload = {
        invoice_number: invoiceNo,
        customer_name: selectedCustomer.name,
        customer_phone: selectedCustomer.phone || "",
        customer_id: selectedCustomerId,
        date: editingInvoiceId && latestInvoice ? latestInvoice.date : new Date().toISOString().split("T")[0],
        type: "sale",
        status: "paid",
        payment_method: paymentMethod || "cash",
        payment_split: paymentMethod === 'split' ? { cash: splitCash || 0, card: splitCard || 0, upi: splitUPI || 0 } : null,
        billing_type: "B2C",
        items: cart.map(item => ({
          name: item.name,
          qty: item.qty,
          rate: item.price,
          total: item.price * item.qty,
          category: item.category || "Apparel",
          size: item.selectedSize || "",
          color: item.selectedColorName || "",
          gst_rate: item.gst_rate || 12,
          hsn: item.hsn || "6203",
          alteration: item.alteration ? true : false
        })),
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        alteration_total: totals.alterationTotal,
        discount: discountValue,
        grand_total: totals.grandTotal,
        paid_amount: totals.grandTotal,
        created_date: editingInvoiceId && latestInvoice ? latestInvoice.created_date : new Date().toISOString(),
        updated_date: new Date().toISOString()
      };

      // 1. Create or Update Invoice record in DB
      let savedInvoice;
      if (editingInvoiceId) {
        savedInvoice = await base44.entities.Invoice.update(editingInvoiceId, invoicePayload);
        setEditingInvoiceId(null);
      } else {
        savedInvoice = await base44.entities.Invoice.create(invoicePayload);
      }

      // 2. Loop through cart items and create Alteration Orders if mapped
      for (const item of cart) {
        if (item.alteration) {
          const altNo = "ALT-" + Date.now().toString().slice(-4) + Math.floor(Math.random() * 10);
          const alterationPayload = {
            alteration_no: altNo,
            invoice_id: savedInvoice.id,
            customer_name: selectedCustomer.name,
            customer_phone: selectedCustomer.phone || "",
            item_name: `${item.name} (${item.selectedSize}/${item.selectedColorName})`,
            details: item.alteration.details,
            charge: item.alteration.charge,
            tailor_name: item.alteration.tailor_name,
            delivery_date: item.alteration.delivery_date,
            status: "received",
            created_at: new Date().toISOString()
          };

          await base44.entities.AlterationOrder.create(alterationPayload);
        }
      }

      setLatestInvoice(savedInvoice);
      setWhatsappNumber(selectedCustomer?.phone || "");
      setCart([]);
      setDiscountValue(0);
      setIsCheckoutSuccessOpen(true);
      toast.success(`Bill generated successfully! Invoice No: ${invoiceNo}`);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["alteration_orders"] });
    } catch (e) {
      toast.error("Checkout failed: " + e.message);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070913] text-slate-900 dark:text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Dynamic cyan/indigo glow background lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* POS Top Header */}
      <header className="relative bg-white dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3 flex items-center justify-between z-10 shrink-0 h-[30px] md:h-[35px] shadow-sm">
        <div className="flex items-center gap-2 md:gap-3 h-full">
          <Link to="/">
            <Button 
              variant="ghost" 
              className="gap-1 h-5 md:h-7 px-1.5 md:px-2.5 text-[9px] md:text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              <ArrowLeft className="w-3 h-3 md:w-3.5 md:h-3.5" /> 
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>
          <div className="h-3 md:h-4 w-[1px] bg-slate-100 dark:bg-slate-800 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs md:text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent tracking-wider">EasyBMT</span>
            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[7px] md:text-[8px] font-black px-1 md:px-1.5 py-0 h-3 md:h-4 flex items-center rounded-full shrink-0">FASHION POS</Badge>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 h-full">
          {/* Shift Management Button */}
          <button
            type="button"
            disabled={!canShift}
            onClick={() => {
              if (isShiftActive) {
                setIsShiftCloseDialogOpen(true);
              } else {
                setIsShiftOpenDialogOpen(true);
              }
            }}
            className={cn(
              "flex items-center gap-1 h-5 md:h-7 px-1.5 md:px-2.5 rounded-lg border text-[8px] md:text-[9px] font-black uppercase tracking-wide shadow-sm transition-all duration-150",
              isShiftActive
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 animate-pulse"
            )}
          >
            <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
            <span>
              {isShiftActive 
                ? `${t("pos.cashier") || "Cashier"}: ${currentCounter}` 
                : t("pos.open_shift") || "Open Shift"}
            </span>
          </button>

          {/* History Button - hidden on mobile, visible on md+ */}
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="hidden md:flex items-center gap-1 h-5 md:h-7 px-1.5 md:px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-[8px] md:text-[9px] font-black uppercase tracking-wide shadow-sm"
          >
            <History className="w-2.5 h-2.5 md:w-3 md:h-3" />
            <span className="hidden sm:inline">History</span>
          </button>

          {/* Billing Type Toggle Switch */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-850 h-[18px] md:h-7 items-center scale-[0.9] md:scale-100 origin-right shrink-0">
            {["B2C", "B2B"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setBillingType(type);
                  if (type === "B2B" && selectedCustomerId === "walk-in") {
                    toast.warning("Please select a registered customer with a valid GSTIN for B2B billing");
                  } else {
                    toast.info(`Billing type changed to ${type}`);
                  }
                }}
                className={`px-1.5 md:px-2.5 py-0.5 md:py-0.5 text-[8px] md:text-[9px] font-black rounded-md uppercase transition-all duration-150 ${
                  billingType === type ? "bg-amber-400 text-slate-950 font-black shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Barcode Toggle */}
          <div className="flex items-center gap-1 md:gap-1.5 bg-slate-50 dark:bg-slate-950/80 px-1.5 md:px-2.5 py-0 h-[18px] md:h-7 rounded-lg border border-slate-200 dark:border-slate-800/80 scale-[0.8] md:scale-100 origin-right shrink-0">
            <Scan className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-slate-600 dark:text-slate-400" />
            <Label htmlFor="barcode-switch" className="text-[8px] md:text-[9px] font-black tracking-wide text-slate-600 dark:text-slate-400 hidden sm:inline uppercase">Barcode</Label>
            <Switch 
              id="barcode-switch"
              checked={barcodeMode}
              onCheckedChange={(val) => {
                setBarcodeMode(val);
                toast.info(`Barcode Mode ${val ? "ENABLED" : "DISABLED"}`);
              }}
              className="scale-[0.55] md:scale-[0.8] origin-right"
            />
          </div>

          {/* Light/Dark Mode Toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center w-[18px] h-[18px] md:w-7 md:h-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-amber-600 dark:hover:text-amber-400 transition-all shadow-sm shrink-0"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <Sun className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
        </div>
      </header>

      {/* Main Terminal Frame */}
      <main className="flex-1 flex flex-col lg:flex-row items-stretch overflow-hidden relative z-10">
        
        {/* Left Side: Product Grid, Department tabs, Search */}
        <section className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden border-r border-slate-200 dark:border-slate-900 lg:max-h-[calc(100vh-80px)]">
          {/* Top segment control / Age group taxonomy */}
          <div className="flex items-center gap-2 overflow-x-auto shrink-0 pb-1 pr-2 scrollbar-thin">
            {AGE_GENDER_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl border transition-all text-left shrink-0 min-w-[110px] ${
                    isActive 
                      ? "bg-gradient-to-tr from-cyan-500/15 to-indigo-500/10 border-cyan-500/40 text-slate-900 dark:text-white shadow-md shadow-cyan-900/10 dark:shadow-cyan-950/20"
                      : "bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-850 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm"
                  }`}
                >
                  <span className="block text-xs font-black tracking-wide leading-tight">{tab.label}</span>
                  <span className="block text-[8px] text-slate-500 font-bold tracking-wider mt-0.5 uppercase">{tab.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar & Add Product */}
          <div className="flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Scan barcode, enter SKU or search products..."
                className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 rounded-xl pl-11 pr-4 text-xs text-slate-900 dark:text-slate-200 font-bold placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none shadow-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(true)}
              className="flex items-center gap-1.5 px-4 h-11 bg-amber-500 hover:bg-amber-600 text-white dark:text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          {/* Products Grid list */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoadingProd ? (
              <div className="h-full flex items-center justify-center p-20 animate-pulse text-slate-500 font-bold text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading Vogats Fashion inventory...
              </div>
            ) : products.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 opacity-30 select-none text-center">
                <ShoppingBag className="w-12 h-12 mb-3 text-slate-500" />
                <h3 className="font-extrabold text-slate-400 text-sm">No Fashion Products</h3>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[220px]">Check settings or import fresh batches inside the Catalog management dashboard.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pb-4">
                {products.map(p => {
                  const outOfStock = p.stock === 0;
                  const lowStock = p.stock > 0 && p.stock <= 10;
                  
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProductSelect(p)}
                      disabled={outOfStock}
                      className={`group relative bg-white dark:bg-slate-950/60 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-900 hover:border-cyan-400 dark:hover:border-cyan-500/20 rounded-2xl p-3.5 text-left transition-all flex flex-col justify-between h-[145px] hover:shadow-lg hover:shadow-cyan-900/5 dark:hover:shadow-cyan-950/10 shadow-sm ${
                        outOfStock ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    >
                      <div>
                        {/* SKU Tag */}
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-mono text-[8px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded-full font-bold">
                            {p.sku}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-1.5 rounded ${
                            outOfStock ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            lowStock ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-emerald-500/10 text-emerald-400"
                          }`}>
                            {outOfStock ? "Out of Stock" : lowStock ? `${p.stock} Pcs Left` : "In Stock"}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {p.name}
                        </h4>
                      </div>

                      {/* Bottom row price */}
                      <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-900/60">
                        <div>
                          <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">Selling Rate</span>
                          <strong className="text-sm font-black text-slate-900 dark:text-white">₹{p.price}</strong>
                        </div>
                        
                        <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-900 group-hover:bg-cyan-500 group-hover:text-white dark:group-hover:text-slate-950 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Active transaction & Cart */}
        <section className={`w-full md:w-[350px] lg:w-[380px] bg-white dark:bg-slate-950/80 backdrop-blur-md border-l border-slate-200 dark:border-slate-800/80 flex flex-col overflow-hidden shrink-0 h-full lg:max-h-[calc(100vh-80px)] pb-[36px] md:pb-0 shadow-[-4px_0_20px_rgba(0,0,0,0.04)] dark:shadow-none`}>
          
          {/* Active Cart Customer Selection */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-800/80 space-y-2 bg-slate-50 dark:bg-slate-900/20 shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Customer Account
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-[10px] font-black text-amber-500 hover:text-amber-600 flex items-center gap-0.5"
                  title="Add new customer"
                >
                  <Plus className="w-3.5 h-3.5" /> ADD NEW
                </button>
                {selectedCustomerId !== "walk-in" && (
                  <button
                    type="button"
                    onClick={() => setIsStyleProfileSidebarOpen(true)}
                    className="text-[10px] font-black text-amber-500 hover:text-amber-600 flex items-center gap-0.5"
                    title="View Customer CRM Style Profile"
                  >
                    <Sliders className="w-3.5 h-3.5" /> PROFILE
                  </button>
                )}
              </div>
            </div>
            
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black px-2 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/50 shadow-sm cursor-pointer"
            >
              <option value="walk-in">Walk-in Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>👤 {c.name} ({c.phone || "No phone"})</option>
              ))}
            </select>

            {/* Active style profile alert box */}
            {selectedCustomerId !== "walk-in" && activeCustomerStyleProfile && (
              <div className="bg-amber-400/5 border border-amber-400/20 rounded p-1.5 flex justify-between items-center transition-all duration-150">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[11px] font-black text-amber-500 truncate leading-none">
                    Size: Shirt {activeCustomerStyleProfile.preferred_sizes?.shirt || "L"} · Tr {activeCustomerStyleProfile.preferred_sizes?.trouser || "32"}
                  </p>
                </div>
                <button 
                  onClick={openMeasurementsEditor}
                  className="text-slate-400 hover:text-blue-400 transition-colors flex-shrink-0"
                >
                  <User className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>

          {/* Active Cart items list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2.5 opacity-20 text-amber-500 dark:text-amber-400" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Cart is empty</p>
                <p className="text-[10px] text-slate-400 mt-1">Scan barcodes or touch products on the left catalog grid</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900/35 border border-slate-200 dark:border-slate-850 hover:border-amber-300/50 dark:hover:border-slate-800 rounded-xl sm:rounded-2xl p-1.5 sm:p-3 flex flex-col gap-2 transition-colors shadow-sm">
                  <div className="flex gap-1.5 sm:gap-3 items-center justify-between">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[10px] sm:text-xs text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                      <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                        ₹{item.price} × {item.qty} PCS
                      </p>
                      
                      <div className="flex gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[7px] sm:text-[8px] px-1 py-0 border-amber-500/30 text-amber-500 dark:text-amber-400 font-bold">
                          SIZE: {item.selectedSize}
                        </Badge>
                        <Badge variant="outline" className="text-[7px] sm:text-[8px] px-1 py-0 border-blue-500/30 text-blue-500 dark:text-blue-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.selectedColor }} />
                          {item.selectedColorName}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-0.5 sm:gap-1.5">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => updateCartQty(idx, -1)}
                          className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 shrink-0"
                        >
                          <Minus className="w-2 h-2 sm:w-3 sm:h-3" />
                        </Button>
                        <span className="text-[10px] sm:text-xs font-black w-4 sm:w-5 text-center font-mono text-slate-800 dark:text-slate-200">{item.qty}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => updateCartQty(idx, 1)}
                          className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 shrink-0"
                        >
                          <Plus className="w-2 h-2 sm:w-3 sm:h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeCartItem(idx)}
                          className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg text-slate-500 hover:text-red-400 shrink-0"
                        >
                          <Trash2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                        </Button>
                      </div>
                      <strong className="text-xs font-mono font-black text-amber-500 dark:text-amber-400 mt-1">₹{item.price * item.qty}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-1">
                    {item.alteration ? (
                      <div className="flex items-center gap-1 w-full justify-between">
                        <button 
                          onClick={() => openAlterationModal(idx)}
                          className="text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5"
                        >
                          Alt ₹{item.alteration.charge} · {item.alteration.tailor_name.split(" ")[0]}
                        </button>
                        <button 
                          onClick={() => removeAlterationFromCartItem(idx)}
                          className="text-red-500 hover:text-red-400 p-0.5 rounded"
                          title="Remove alteration"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => openAlterationModal(idx)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-500/30 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all"
                      >
                        <Scissors className="w-2 h-2" /> Add Alteration
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout & Pricing Controls */}
          <div className="p-2 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 flex flex-col gap-2 shrink-0">
            
            {/* Discounter selector */}
            <div className="bg-white dark:bg-slate-900/50 px-2 rounded-lg border border-slate-200 dark:border-slate-850/50 flex gap-2 items-center justify-between shadow-sm h-[20px] shrink-0">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">Discount Apply (₹)</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="h-5 w-[80px] rounded bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-center font-mono text-[10px] text-slate-900 dark:text-slate-100 px-1 disabled:opacity-50 disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Payment Method Option Selector */}
            <div className="flex justify-between items-stretch h-[24px] shrink-0 gap-2">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none flex items-center">Payment Method</span>
              <div className="flex flex-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-md border border-slate-200 dark:border-slate-800 h-full items-stretch">
                {["cash", "card", "upi", "split"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`flex-1 py-0 text-[11px] font-black rounded uppercase transition-all duration-150 h-full flex items-center justify-center cursor-pointer ${
                      paymentMethod === m ? "bg-amber-500 dark:bg-amber-400 text-white dark:text-slate-950 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'split' && (
              <div className="grid grid-cols-3 gap-2 pt-1 shrink-0">
                <div>
                  <label className="text-[8px] font-bold text-slate-500 uppercase">Cash</label>
                  <Input 
                    type="number" 
                    value={splitCash || ""} 
                    onChange={(e) => setSplitCash(parseFloat(e.target.value) || 0)}
                    className="h-7 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-[11px] font-mono text-center text-slate-800 dark:text-slate-200" 
                  />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-slate-500 uppercase">Card</label>
                  <Input 
                    type="number" 
                    value={splitCard || ""} 
                    onChange={(e) => setSplitCard(parseFloat(e.target.value) || 0)}
                    className="h-7 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-[11px] font-mono text-center text-slate-800 dark:text-slate-200" 
                  />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-slate-500 uppercase">UPI</label>
                  <Input 
                    type="number" 
                    value={splitUPI || ""} 
                    onChange={(e) => setSplitUPI(parseFloat(e.target.value) || 0)}
                    className="h-7 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-[11px] font-mono text-center text-slate-800 dark:text-slate-200" 
                  />
                </div>
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="flex flex-col gap-[5px] pt-1 border-t border-slate-200 dark:border-slate-800/60 font-mono text-[12px] shrink-0">
              <div className="flex justify-between text-slate-500 dark:text-slate-400 leading-none">
                <span>Subtotal</span>
                <span>{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400 leading-none">
                <span>Tax CGST + SGST</span>
                <span>{totals.taxAmount.toFixed(2)}</span>
              </div>
              {totals.alterationTotal > 0 && (
                <div className="flex justify-between text-cyan-600 dark:text-cyan-400 leading-none">
                  <span>Alterations</span>
                  <span>{totals.alterationTotal.toFixed(2)}</span>
                </div>
              )}
              {discountValue > 0 && (
                <div className="flex justify-between text-red-500 dark:text-red-400 leading-none">
                  <span>Discount</span>
                  <span>-{discountValue}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-black text-amber-500 dark:text-amber-400 pt-1 border-t border-slate-200 dark:border-slate-850 leading-none mt-1">
                <span className="text-[14px]">कुल बिल राशि</span>
                <span className="text-[14px]">{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Pay buttons */}
            <div className="mt-1 shrink-0">
              <Button
                onClick={handleCheckoutSubmit}
                disabled={isProcessingCheckout || cart.length === 0}
                className="w-full h-[36px] rounded-[8px] bg-amber-400 hover:bg-amber-500 font-black text-slate-950 text-[13px] tracking-wider flex items-center justify-center shadow-md active:scale-95 transition-all leading-none"
              >
                {isProcessingCheckout ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> ...</>
                ) : (
                  <><Zap className="w-3.5 h-3.5 text-slate-950 mr-1" /> भुगतान और प्रिंट (F4)</>
                )}
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* MODAL 1: Multi-Dimensional Variant Selector Dialog popup */}
      {selectedProductForVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-[#0b0c16] border border-cyan-500/20 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-fade-up">
            <button 
              onClick={() => setSelectedProductForVariant(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base text-white pr-6">Select Sizing &amp; Color swatches</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Product: <strong className="text-slate-350">{selectedProductForVariant.name}</strong></p>

            <div className="space-y-5 mt-5">
              {/* Sizes Selection Master matrix */}
              <div>
                <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block mb-2">Available Size Master Matrix</label>
                <div className="flex flex-wrap items-center gap-2">
                  {(selectedProductForVariant.sizes || ["S", "M", "L", "XL"]).map(sz => {
                    const isSelected = chosenSize === sz;
                    return (
                      <button
                        key={sz}
                        onClick={() => setChosenSize(sz)}
                        className={`h-9 min-w-[45px] rounded-xl border text-xs font-black transition-all flex items-center justify-center ${
                          isSelected 
                            ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow shadow-cyan-500/10"
                            : "bg-slate-900/60 border-slate-800 hover:bg-slate-850 text-slate-300"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors selection swatches */}
              <div>
                <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block mb-2">Select Fabric Color Pick</label>
                <div className="flex flex-wrap items-center gap-3">
                  {(selectedProductForVariant.colors || [
                    { name: "Default Navy", hex: "#1B2A6B" }
                  ]).map(c => {
                    const isSelected = chosenColor === c.hex;
                    return (
                      <button
                        key={c.hex}
                        onClick={() => {
                          setChosenColor(c.hex);
                          setChosenColorName(c.name);
                        }}
                        className={`flex items-center gap-2 bg-slate-900/60 border rounded-full px-3 py-1.5 transition-all text-xs font-bold ${
                          isSelected 
                            ? "border-cyan-500 text-white shadow shadow-cyan-500/10 bg-cyan-950/20"
                            : "border-slate-850 hover:bg-slate-850 text-slate-400"
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: c.hex }} />
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time stock heatmap indicator simulation */}
              <div className="bg-slate-950/60 border border-slate-900 p-3.5 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-slate-400">Variant Stock Heatmap:</span>
                <span className="font-extrabold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2.5 py-0.5 rounded-full text-[10px]">
                  42 Pcs (Green - Ready)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 border-t border-slate-900 pt-4">
              <button 
                onClick={() => setSelectedProductForVariant(null)}
                className="px-4 py-2 hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddVariantToCart}
                className="gold-gradient text-slate-950 font-black text-xs uppercase px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/5 active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" /> Add selected Variant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Tailor alterations assignment popup */}
      {selectedCartIndexForAlteration !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-[#0b0c16] border border-cyan-500/20 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-fade-up">
            <button 
              onClick={() => setSelectedCartIndexForAlteration(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base text-white pr-6 flex items-center gap-1.5">
              <Scissors className="w-5 h-5 text-cyan-400" /> Map Alteration Order details
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Item: <strong className="text-slate-350">{cart[selectedCartIndexForAlteration]?.name}</strong></p>

            <div className="space-y-4 mt-5">
              {/* Tailor select */}
              <div>
                <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block mb-1">Assign Tailor Master</label>
                <select
                  value={alterationForm.tailorName}
                  onChange={e => setAlterationForm(p => ({ ...p, tailorName: e.target.value }))}
                  className="w-full h-10 bg-slate-950 border border-slate-800 text-slate-350 text-xs font-bold py-1.5 px-3.5 rounded-xl focus:outline-none cursor-pointer"
                >
                  {TAILORS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Alteration Notes */}
              <div>
                <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block mb-1">Alteration Details</label>
                <input
                  type="text"
                  value={alterationForm.details}
                  onChange={e => setAlterationForm(p => ({ ...p, details: e.target.value }))}
                  placeholder="e.g. Sleeve cut 1.5 inches, waist line tapering S to XS"
                  className="w-full h-10 bg-slate-950 border border-slate-800 focus:border-cyan-500/40 rounded-xl px-3.5 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Alteration Charge */}
                <div>
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block mb-1">Alteration Charge (₹)</label>
                  <input
                    type="number"
                    value={alterationForm.charge}
                    onChange={e => setAlterationForm(p => ({ ...p, charge: Number(e.target.value) }))}
                    className="w-full h-10 bg-slate-950 border border-slate-800 focus:border-cyan-500/40 rounded-xl px-3.5 text-xs text-slate-200 text-center font-mono font-bold"
                  />
                </div>

                {/* Delivery Date */}
                <div>
                  <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider block mb-1">Commitment Delivery Date</label>
                  <input
                    type="date"
                    value={alterationForm.deliveryDate}
                    onChange={e => setAlterationForm(p => ({ ...p, deliveryDate: e.target.value }))}
                    className="w-full h-10 bg-slate-950 border border-slate-800 focus:border-cyan-500/40 rounded-xl px-3.5 text-xs text-slate-350 text-center font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 border-t border-slate-900 pt-4">
              <button 
                onClick={() => setSelectedCartIndexForAlteration(null)}
                className="px-4 py-2 hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={saveAlterationToCartItem}
                className="gold-gradient text-slate-950 font-black text-xs uppercase px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/5 active:scale-95"
              >
                <Check className="w-4 h-4" /> Apply Alteration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Customer Style Profile CRM sidebar panel */}
      {isStyleProfileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-[#0b0c16] border-l border-indigo-500/20 w-full max-w-md h-full shadow-2xl relative p-5 overflow-y-auto animate-fade-left flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-sm uppercase text-white">Sizing Profile CRM Center</h3>
                </div>
                <button 
                  onClick={() => { setIsStyleProfileSidebarOpen(false); setIsEditingMeasurements(false); }}
                  className="text-slate-500 hover:text-white hover:bg-slate-900 p-1.5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Customer Header info */}
              <div className="bg-slate-900/60 border border-slate-900 p-3.5 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-extrabold text-sm border border-indigo-500/20 shadow-inner">
                  {selectedCustomer.name[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white leading-tight">{selectedCustomer.name}</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{selectedCustomer.phone || "Walk-In"}</p>
                </div>
              </div>

              {isEditingMeasurements ? (
                /* Size Master input form */
                <div className="space-y-4 animate-fade-up bg-slate-900/20 border border-slate-900 rounded-2xl p-4">
                  <h4 className="text-[10px] font-black tracking-wider uppercase text-white border-b border-slate-850 pb-1 flex items-center gap-1"><Edit3 className="w-3.5 h-3.5 text-indigo-450" /> Update measurements (cm)</h4>
                  
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "chest", label: "Chest" },
                      { id: "waist", label: "Waist" },
                      { id: "hip", label: "Hip" },
                      { id: "shoulder", label: "Shoulder" },
                      { id: "sleeve", label: "Sleeve" },
                      { id: "inseam", label: "Inseam" },
                      { id: "neck", label: "Neck" },
                      { id: "height", label: "Height" },
                      { id: "weight", label: "Weight" }
                    ].map(f => (
                      <div key={f.id}>
                        <label className="text-[9px] text-slate-550 font-bold uppercase block mb-1">{f.label}</label>
                        <input
                          type="number"
                          value={measureForm[f.id]}
                          onChange={e => setMeasureForm(p => ({ ...p, [f.id]: e.target.value }))}
                          className="w-full h-8 bg-slate-950 border border-slate-800 text-center text-xs font-bold rounded focus:outline-none focus:border-indigo-500/40 text-slate-200"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                    <div>
                      <label className="text-[9px] text-slate-550 font-bold uppercase block mb-1">Shirt size</label>
                      <select 
                        value={measureForm.shirt_size} 
                        onChange={e => setMeasureForm(p => ({ ...p, shirt_size: e.target.value }))}
                        className="w-full h-8 bg-slate-950 border border-slate-800 text-slate-350 text-[10px] font-bold rounded outline-none"
                      >
                        {["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-550 font-bold uppercase block mb-1">Trouser Size</label>
                      <select 
                        value={measureForm.trouser_size} 
                        onChange={e => setMeasureForm(p => ({ ...p, trouser_size: e.target.value }))}
                        className="w-full h-8 bg-slate-950 border border-slate-800 text-slate-350 text-[10px] font-bold rounded outline-none"
                      >
                        {["28", "30", "32", "34", "36", "38", "40", "42"].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button 
                      onClick={() => setIsEditingMeasurements(false)} 
                      className="text-[10px] font-black text-slate-450 hover:text-white uppercase"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveMeasurements} 
                      className="bg-indigo-600 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-lg hover:bg-indigo-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* Profile view */
                <div className="space-y-4">
                  {activeCustomerStyleProfile ? (
                    <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4.5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black tracking-wider uppercase text-white flex items-center gap-1"><Shirt className="w-3.5 h-3.5 text-indigo-400" /> Sizing profile metrics</h4>
                        <button 
                          onClick={openMeasurementsEditor}
                          className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-2 py-0.5 border border-indigo-500/20 text-[9px] font-black uppercase tracking-wider rounded"
                        >
                          Update Profile
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Chest", val: `${activeCustomerStyleProfile.measurements?.chest || "N/A"} cm` },
                          { label: "Waist", val: `${activeCustomerStyleProfile.measurements?.waist || "N/A"} cm` },
                          { label: "Hip", val: `${activeCustomerStyleProfile.measurements?.hip || "N/A"} cm` },
                          { label: "Shoulder", val: `${activeCustomerStyleProfile.measurements?.shoulder || "N/A"} cm` },
                          { label: "Sleeve", val: `${activeCustomerStyleProfile.measurements?.sleeve || "N/A"} cm` },
                          { label: "Fit Style", val: activeCustomerStyleProfile.preferred_fit || "Regular" },
                        ].map(item => (
                          <div key={item.label} className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900 text-center">
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{item.label}</span>
                            <strong className="block text-[10px] font-extrabold text-white mt-0.5">{item.val}</strong>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-slate-900 pt-3.5 text-center">
                        <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                          <span className="text-[8px] text-slate-500 block font-bold uppercase">Shirt size</span>
                          <strong className="text-base text-indigo-400 font-black">{activeCustomerStyleProfile.preferred_sizes?.shirt || "L"}</strong>
                        </div>
                        <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                          <span className="text-[8px] text-slate-500 block font-bold uppercase">Trouser size</span>
                          <strong className="text-base text-indigo-400 font-black">{activeCustomerStyleProfile.preferred_sizes?.trouser || "32"}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 text-center space-y-3.5">
                      <Sliders className="w-8 h-8 mx-auto text-indigo-400/40" />
                      <div>
                        <h4 className="text-xs font-black text-white">No Style Profile Recorded</h4>
                        <p className="text-[10px] text-slate-550 max-w-[200px] mx-auto mt-1">Ensure correct tailoring fits by mapping measurements directly under the CRM center.</p>
                      </div>
                      <button 
                        onClick={openMeasurementsEditor}
                        className="bg-indigo-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                      >
                        Create Style Profile
                      </button>
                    </div>
                  )}

                  {/* Dynamic Style recommendation */}
                  {activeCustomerStyleProfile && (
                    <div className="bg-gradient-to-r from-indigo-950/40 to-slate-950/30 border border-indigo-900/20 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <h4 className="text-[10px] font-black tracking-wider uppercase text-white">Fit Suggestions Engine</h4>
                      </div>
                      <p className="text-[9px] text-slate-400">Autocompiling recommendation matching {selectedCustomer.name}'s size {activeCustomerStyleProfile.preferred_sizes?.shirt || "L"}:</p>
                      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-900 text-xs font-bold text-white flex items-center justify-between">
                        <span>Vogats Classic Oxford Shirts</span>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase">Suggested Match</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => { setIsStyleProfileSidebarOpen(false); setIsEditingMeasurements(false); }}
              className="w-full h-10 border border-slate-800 text-slate-400 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-900 transition-colors"
            >
              Close sidebar
            </button>
          </div>
        </div>
      )}

      {/* THERMAL RECEIPT PRINT MODAL FOR B2C */}
      <Dialog open={isCheckoutSuccessOpen} onOpenChange={setIsCheckoutSuccessOpen}>
        <DialogContent className={`bg-white text-slate-950 p-0 gap-0 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col ${selectedPrintSize === "80mm" ? "sm:max-w-[420px]" : "sm:max-w-[360px]"} max-h-[92vh]`}>
          {/*  Top controls bar  always visible  */}
          <div className="flex gap-2 px-4 pt-4 pb-3 border-b border-gray-100 print:hidden shrink-0">
            <button 
              type="button" 
              onClick={() => setSelectedPrintSize("58mm")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedPrintSize === "58mm" ? "bg-slate-900 text-white shadow" : "bg-gray-100 hover:bg-gray-200 text-gray-800"}`}
            >
              58mm Roll
            </button>
            <button 
              type="button" 
              onClick={() => setSelectedPrintSize("80mm")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedPrintSize === "80mm" ? "bg-slate-900 text-white shadow" : "bg-gray-100 hover:bg-gray-200 text-gray-800"}`}
            >
              80mm Roll
            </button>
          </div>

          {/*  Connection / Print Status Indicator  always visible  */}
          {shopSettings?.printer_type && shopSettings?.printer_type !== "browser" && (
            <div className="bg-slate-50 border border-slate-200 p-2 mx-4 rounded-xl text-[10px] text-slate-700 space-y-1 mb-0 print:hidden shrink-0">
              <div className="flex justify-between items-center">
                <span className="font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Active Printer:
                </span>
                <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded font-black text-slate-800">
                  {shopSettings.paired_printer_name || shopSettings.printer_ip || "Handheld POS"}
                </span>
              </div>
              {printingStatus && (
                <div className="text-[9px] text-amber-600 animate-pulse font-bold">
                  Status: {printingStatus}
                </div>
              )}
            </div>
          )}

          {/*  Scrollable receipt content  */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 bg-[#1a1a2e] flex justify-center">
             {latestInvoice && (
               <div dangerouslySetInnerHTML={{ __html: generateThermalHTML(latestInvoice, shopSettings, selectedPrintSize) }} />
             )}
          </div>

          {/* WhatsApp Share Panel */}
          <div className="py-2 px-4 border-t border-dashed border-gray-300 print:hidden text-left space-y-1 shrink-0">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">WhatsApp Share</label>
            <div className="flex gap-1.5">
              <Input 
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Customer Phone (10 digits)"
                className="h-8 bg-gray-50 border-gray-350 text-slate-900 placeholder-gray-405 text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
              <Button 
                onClick={handleSendWhatsApp}
                type="button" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 px-3 font-bold text-xs gap-1.5 shrink-0 flex items-center shadow-md shadow-emerald-600/10 active:scale-95"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.458L0 24zm6.292-4.148c1.681.998 3.363 1.581 5.377 1.582 5.568 0 10.099-4.537 10.1-10.111.002-2.701-1.047-5.24-2.953-7.149C16.906 2.265 14.372 1.01 11.998 1.01 6.55 1.01 2.118 5.541 2.11 11.118c-.001 2.052.547 4.054 1.587 5.792L2.686 20.39l4.582-1.202c-.919-.533-1.68-1.026-1.68-1.026-.002-.001-.002-.001 0 0z" />
                </svg>
                Send
              </Button>
            </div>
          </div>

          {/* Offline Queue Sync Manager */}
          {offlineQueueCount > 0 && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 print:hidden space-y-1.5 shrink-0">
              <div className="flex justify-between items-center font-bold">
                <span>️ {offlineQueueCount} Offline Print Jobs Queued</span>
                <button 
                  type="button"
                  onClick={async () => {
                    const queue = getOfflinePrintQueue();
                    let successCount = 0;
                    const newQueue = [];
                    for (const job of queue) {
                      try {
                        const payload = generateEscPosPayload(job.invoice, job.printerSettings, false);
                        const ok = await sendEscPosToPrinter(payload, job.printerSettings);
                        if (ok) successCount++;
                        else newQueue.push(job);
                      } catch (e) {
                        newQueue.push(job);
                      }
                    }
                    saveOfflinePrintQueue(newQueue);
                    setOfflineQueueCount(newQueue.length);
                    if (successCount > 0) {
                      toast.success(`Successfully printed ${successCount} queued receipts!`);
                    } else {
                      toast.error("Could not sync offline queue. Check connection.");
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black px-2 py-0.5 rounded text-[9px] active:scale-95 transition-all"
                >
                  Retry/Sync
                </button>
              </div>
            </div>
          )}

          {/* Print Actions Dialog Footer */}
          <div className="flex flex-wrap gap-2 p-4 pt-3 border-t border-gray-100 print:hidden shrink-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCheckoutSuccessOpen(false)}
              className="rounded-xl text-slate-700 border-gray-300 h-10 px-3 flex-1 text-xs font-bold min-w-[60px]"
            >
               Close
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                editInvoiceInCart(latestInvoice);
                setIsCheckoutSuccessOpen(false);
              }}
              className="rounded-xl border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 h-10 px-3 flex-1 text-xs font-bold gap-1 flex items-center justify-center min-w-[60px]"
            >
              <Edit className="w-3.5 h-3.5" /> Edit Invoice
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPDF}
              className="rounded-xl border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 h-10 px-3 flex-1 text-xs font-bold gap-1 flex items-center justify-center min-w-[60px]"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button
              type="button"
              onClick={() => triggerPrint(latestInvoice, false)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl h-10 px-4 flex-1 text-xs gap-1.5 flex items-center justify-center shadow-md active:scale-95 transition-all min-w-[60px]"
            >
              <Printer className="w-3.5 h-3.5" /> Re-print
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QUICK ADD CUSTOMER MODAL */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="max-w-md w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl text-slate-850 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center text-slate-900 dark:text-white">
              <User className="w-5 h-5 text-amber-500 dark:text-amber-400" /> Onboard POS Customer
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Onboard a customer immediately to POS system and assign their style profile measurements.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="custName" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Customer Full Name *</Label>
                <Input 
                  id="custName" 
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Kamlesh Kumar"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="custPhone" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">WhatsApp / Phone</Label>
                  <Input 
                    id="custPhone" 
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="9876543210"
                    className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="custGstin" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">GSTIN (Optional)</Label>
                  <Input 
                    id="custGstin" 
                    value={newCustGstin}
                    onChange={(e) => setNewCustGstin(e.target.value)}
                    placeholder="15-char code"
                    className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white font-mono uppercase mt-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-2 gap-2 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setIsCustomerModalOpen(false)} className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">Cancel</Button>
              <Button type="submit" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl">Save & Select</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK ADD PRODUCT MODAL */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="max-w-xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl text-slate-850 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center text-slate-900 dark:text-white">
              <Package className="w-5 h-5 text-amber-500 dark:text-amber-400" /> Quick Add Catalog Product
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Instantly create a new apparel/fashion product with sizes and colors and register to active catalog list.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <Label htmlFor="prodName" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Product Title / Name *</Label>
                <Input 
                  id="prodName" 
                  value={quickAddForm.name}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                  placeholder="e.g. Vogats Premium Slim Cotton Shirt"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="prodRate" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Selling Price (₹) *</Label>
                <Input 
                  id="prodRate" 
                  type="number"
                  value={quickAddForm.rate}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, rate: e.target.value })}
                  placeholder="999"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="prodMrp" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">MRP (₹)</Label>
                <Input 
                  id="prodMrp" 
                  type="number"
                  value={quickAddForm.mrp}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, mrp: e.target.value })}
                  placeholder="1299"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prodPurchase" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Purchase Cost (₹)</Label>
                <Input 
                  id="prodPurchase" 
                  type="number"
                  value={quickAddForm.purchase_rate}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, purchase_rate: e.target.value })}
                  placeholder="450"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prodStock" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Initial Stock Qty</Label>
                <Input 
                  id="prodStock" 
                  type="number"
                  value={quickAddForm.stock}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, stock: e.target.value })}
                  placeholder="50"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prodCategory" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Apparel Category</Label>
                <Input 
                  id="prodCategory" 
                  value={quickAddForm.category}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, category: e.target.value })}
                  placeholder="Men Formal, Women Ethnic"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prodGst" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">GST Rate (%)</Label>
                <select 
                  id="prodGst" 
                  value={quickAddForm.gst_rate}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, gst_rate: e.target.value })}
                  className="w-full h-[38px] bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 mt-1 text-slate-950 dark:text-white text-sm outline-none"
                >
                  <option value="0">0% Excluded</option>
                  <option value="5">5% Kids Apparel</option>
                  <option value="12">12% standard Apparel</option>
                  <option value="18">18% Accessories</option>
                  <option value="28">28% Premium</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="prodSizes" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Sizes Available (Comma-separated)</Label>
                <Input 
                  id="prodSizes" 
                  value={quickAddForm.sizes}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, sizes: e.target.value })}
                  placeholder="e.g. S, M, L, XL, 38, 40, Free Size"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="prodColors" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Colors Available (Comma-separated)</Label>
                <Input 
                  id="prodColors" 
                  value={quickAddForm.colors}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, colors: e.target.value })}
                  placeholder="e.g. White, Black, Navy Blue, Crimson Red"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prodSku" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Custom SKU (Optional)</Label>
                <Input 
                  id="prodSku" 
                  value={quickAddForm.sku}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, sku: e.target.value })}
                  placeholder="Auto-generated if blank"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white font-mono uppercase mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prodBarcode" className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Barcode / EAN (Optional)</Label>
                <Input 
                  id="prodBarcode" 
                  value={quickAddForm.barcode}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, barcode: e.target.value })}
                  placeholder="Auto-generated if blank"
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-950 dark:text-white font-mono uppercase mt-1"
                />
              </div>
            </div>
            <DialogFooter className="pt-2 gap-2 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setIsQuickAddOpen(false)} className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">Cancel</Button>
              <Button type="submit" disabled={isSavingProduct} className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl">
                {isSavingProduct ? "Adding..." : "Add to Catalog"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      </div>
  );
}
