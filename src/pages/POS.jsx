/* @ts-nocheck */
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackButton } from "@/hooks/useBackButton";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Zap, Search, ShoppingCart, User, Plus, Minus, Trash2, 
  Printer, ArrowLeft, RotateCcw, AlertTriangle, Edit,
  Utensils, Pill, Shirt, Store, Package, Check, Scan, Scale,
  History, Mic, MicOff, X, FileText, RefreshCw, Camera,
  TrendingUp, Calendar, Clock, IndianRupee, BarChart2, Power, Filter
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Link } from "react-router-dom";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { useTheme } from "next-themes";
import { downloadInvoicePDF, getInvoicePDFBlob, generateThermalHTML } from "@/lib/pdf-share-utils";
import InvoicePrintPreview from "@/components/invoices/InvoicePrintPreview";
import { 
  sendEscPosToPrinter, 
  generateEscPosPayload, 
  getOfflinePrintQueue, 
  saveOfflinePrintQueue, 
  addToOfflinePrintQueue 
} from "@/lib/escpos-utils";
import { getCategoriesByShopType } from "@/lib/shopCategories";
import { subscribeToBranchInventory, updateInventory } from "@/api/inventorySyncService";
import { accountingService, buildSaleJournalEntry, buildReturnJournalEntry } from "@/modules/accounting/accountingService";
import { INDIAN_STATES } from "@/lib/gst-utils";
import { useFashionMode } from "@/hooks/useFashionMode";
import FashionPOS from "./FashionPOS";
import { useSupermarketMode } from "@/hooks/useSupermarketMode";
import SupermarketPOS from "@/modules/supermarket-pos/SupermarketPOS";
import Sidebar from "@/components/layout/Sidebar";

// Auto-generate SKU
const generateSKU = (name = "") => {
  const prefix = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "PROD";
  return `${prefix}-${Date.now().toString().slice(-5)}`;
};

// Auto-generate barcode (EAN-8 style numeric)
const generateBarcode = () => {
  return String(Math.floor(10000000 + Math.random() * 89999999));
};

function mapShopTypeToLayout(businessType) {
  const norm = String(businessType || "").toLowerCase().trim();
  switch (norm) {
    case "grocery":
    case "bakery":
      return "grocery";
    case "medical":
      return "medical";
    case "restaurant":
      return "restaurant";
    case "fashion":
    case "footwear":
      return "fashion";
    case "electronics":
    case "hardware":
    case "mobile":
    case "cosmetic":
    case "jewellery":
    case "stationery":
    case "retail":
    case "wholesaler":
    case "supermarket":
    case "manufacturer":
    case "importer_exporter":
    default:
      return "retail";
  }
}

// Helper to get initials for shop logo avatar fallback
const getInitials = (name) => {
  if (!name || name === "Vogats") return "GS";
  const words = (name.trim() || "").split(/\s+/).filter(w => w);
  if (words.length >= 2 && words[0].length > 0 && words[1].length > 0) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (name || "").slice(0, 2).toUpperCase();
};

// Helper to format date into "D MMM YYYY" (e.g., "20 May 2026")
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

export default function POS() {
  const { isFashion } = useFashionMode();
  const { isSupermarket } = useSupermarketMode();
  if (isFashion) {
    return <FashionPOS />;
  }
  if (isSupermarket) {
    return <SupermarketPOS />;
  }
  return <POSContent />;
}

function POSContent() {
  const { user } = useAuth();
  const canDiscount = usePermission('pos', 'discount');
  const canShift = usePermission('pos', 'shift');
  const queryClient = useQueryClient();
  const { language, setLanguage, voiceEnabled, setVoiceEnabled, t, speak } = useLanguage();
  const { theme, setTheme } = useTheme();

  // Multi-Outlet Branch Tracking & Stock Sync
  const [activeBranchId, setActiveBranchId] = useState(() => localStorage.getItem('selectedBranch') || '');
  const [branchInventory, setBranchInventory] = useState([]);

  useEffect(() => {
    const handleBranchChange = () => {
      setActiveBranchId(localStorage.getItem('selectedBranch') || '');
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, []);

  useEffect(() => {
    let unsubscribe;
    if (activeBranchId) {
      unsubscribe = subscribeToBranchInventory(activeBranchId, (data) => {
        setBranchInventory(data);
      });
    } else {
      setBranchInventory([]);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeBranchId]);
  const [layout, setLayout] = useState("retail"); // retail, restaurant, medical, fashion, grocery
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [barcodeMode, setBarcodeMode] = useState(true);
  const [cart, setCart] = useState([]);
  const cartEndRef = useRef(null);
  const [mobileTab, setMobileTab] = useState("products"); // products, cart

  useEffect(() => {
    // Only scroll into view if the cart tab is active or we are on desktop
    setTimeout(() => {
      cartEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [cart, mobileTab]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("walk-in");
  const [discountType, setDiscountType] = useState("percent"); // percent, cash
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash"); // cash, card, upi, split
  const [splitCash, setSplitCash] = useState(0);
  const [splitCard, setSplitCard] = useState(0);
  const [splitUPI, setSplitUPI] = useState(0);
  
  // Hold/Park bills
  const [parkedCarts, setParkedCarts] = useState([]);
  
  // Verticals States
  const [selectedTable, setSelectedTable] = useState("T1");
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("Blue");

  // Restaurant Table carts mapping
  const [tableCarts, setTableCarts] = useState({
    T1: [], T2: [], T3: [], T4: [], T5: [], T6: [], T7: [], T8: [], T9: [], T10: []
  });

  // Grocery Weight-based states
  const [isWeightDialogOpen, setIsWeightDialogOpen] = useState(false);
  const [weighedProduct, setWeighedProduct] = useState(null);
  const [weightInput, setWeightInput] = useState(1.0);

  // Fashion variants states
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [variantProduct, setVariantProduct] = useState(null);
  const [variantSize, setVariantSize] = useState("");
  const [variantColor, setVariantColor] = useState("");

  //  SUBSYSTEM A: Multi-Counter Shift & Cash Drawer Control States 
  // Load staff list from Settings (stored in localStorage by Settings page)
  const staffList = (() => {
    try { return JSON.parse(localStorage.getItem("gst_shop_staff_list") || "[]"); }
    catch { return []; }
  })();

  // Device-persistent counter selection: which counter is THIS device?
  const [myDeviceCounter, setMyDeviceCounter] = useState(() =>
    localStorage.getItem("gst_pos_my_device_counter") || ""
  );

  const [isShiftActive, setIsShiftActive] = useState(() => {
    return localStorage.getItem("gst_pos_shift_active") === "true";
  });
  const [currentCounter, setCurrentCounter] = useState(() => {
    return localStorage.getItem("gst_pos_shift_counter") || "";
  });
  const [currentCashier, setCurrentCashier] = useState(() => {
    return localStorage.getItem("gst_pos_shift_cashier") || "";
  });
  const [startingDrawerCash, setStartingDrawerCash] = useState(() => {
    return parseFloat(localStorage.getItem("gst_pos_shift_starting_cash") || "0");
  });
  const [shiftInvoices, setShiftInvoices] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gst_pos_shift_invoices") || "[]");
    } catch (e) {
      return [];
    }
  });
  const [isShiftCloseDialogOpen, setIsShiftCloseDialogOpen] = useState(false);
  const [isShiftOpenDialogOpen, setIsShiftOpenDialogOpen] = useState(false);
  // Pre-fill from the device-persisted counter/cashier, or from first matching staff member
  const [openCashierInput, setOpenCashierInput] = useState(() => {
    const saved = localStorage.getItem("gst_pos_shift_cashier");
    if (saved) return saved;
    const staffArr = (() => { try { return JSON.parse(localStorage.getItem("gst_shop_staff_list") || "[]"); } catch { return []; } })();
    const devCounter = localStorage.getItem("gst_pos_my_device_counter") || "";
    const match = devCounter ? staffArr.find(s => s.counter === devCounter) : null;
    return match ? match.name : "";
  });
  const [openCounterInput, setOpenCounterInput] = useState(() => {
    const devCounter = localStorage.getItem("gst_pos_my_device_counter") || "";
    return devCounter || "Counter 1";
  });
  const [openStartingCashInput, setOpenStartingCashInput] = useState("1000");
  const [openShiftInput, setOpenShiftInput] = useState(() => {
    const staffArr = (() => { try { return JSON.parse(localStorage.getItem("gst_shop_staff_list") || "[]"); } catch { return []; } })();
    const devCounter = localStorage.getItem("gst_pos_my_device_counter") || "";
    const match = devCounter ? staffArr.find(s => s.counter === devCounter) : null;
    return match ? match.shift : "Morning";
  });
  const [physicalCashCounted, setPhysicalCashCounted] = useState(0);
  const [isCounterPickerOpen, setIsCounterPickerOpen] = useState(false);

  // Auto-fill cashier name from Firebase user on first load
  useEffect(() => {
    if (user?.full_name && !openCashierInput) {
      setOpenCashierInput(user.full_name);
    }
  }, [user, openCashierInput]);

  // Show counter picker on first load if no device counter is set
  useEffect(() => {
    if (!myDeviceCounter) {
      setIsCounterPickerOpen(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("gst_pos_shift_active", isShiftActive ? "true" : "false");
  }, [isShiftActive]);

  useEffect(() => {
    localStorage.setItem("gst_pos_shift_counter", currentCounter);
  }, [currentCounter]);

  useEffect(() => {
    localStorage.setItem("gst_pos_shift_cashier", currentCashier);
  }, [currentCashier]);

  useEffect(() => {
    localStorage.setItem("gst_pos_shift_starting_cash", startingDrawerCash.toString());
  }, [startingDrawerCash]);

  useEffect(() => {
    localStorage.setItem("gst_pos_shift_invoices", JSON.stringify(shiftInvoices));
  }, [shiftInvoices]);

  const handleCloseShift = (countedCash) => {
    const shiftHistory = JSON.parse(localStorage.getItem("gst_pos_shift_history") || "[]");
    const netCash = shiftInvoices.reduce((sum, inv) => {
      if (inv.payment_method === "cash") return sum + inv.grand_total;
      if (inv.payment_method === "split" && inv.payment_split?.cash) return sum + inv.payment_split.cash;
      return sum;
    }, 0);
    const expectedCash = startingDrawerCash + netCash;
    const discrepancy = countedCash - expectedCash;
    
    const shiftSummary = {
      id: Date.now(),
      counter: currentCounter,
      cashier: currentCashier,
      openedAt: new Date(shiftInvoices[0]?.date || localStorage.getItem('shiftOpenedAt') || new Date().toISOString()).toLocaleString(),
      closedAt: new Date().toLocaleString(),
      startingCash: startingDrawerCash,
      countedCash,
      expectedCash,
      discrepancy,
      totalSales: shiftInvoices.reduce((sum, inv) => sum + inv.grand_total, 0),
      salesCount: shiftInvoices.length,
      cashSales: netCash,
      cardSales: shiftInvoices.reduce((sum, inv) => {
        if (inv.payment_method === "card") return sum + inv.grand_total;
        if (inv.payment_method === "split" && inv.payment_split?.card) return sum + inv.payment_split.card;
        return sum;
      }, 0),
      upiSales: shiftInvoices.reduce((sum, inv) => {
        if (inv.payment_method === "upi") return sum + inv.grand_total;
        if (inv.payment_method === "split" && inv.payment_split?.upi) return sum + inv.payment_split.upi;
        return sum;
      }, 0),
    };
    
    shiftHistory.push(shiftSummary);
    localStorage.setItem("gst_pos_shift_history", JSON.stringify(shiftHistory));
    
    setIsShiftActive(false);
    setCurrentCounter("");
    setCurrentCashier("");
    setStartingDrawerCash(0);
    setShiftInvoices([]);
    setIsShiftCloseDialogOpen(false);
    setPhysicalCashCounted(0);
    toast.success("Shift closed and drawer locked successfully!");
  };

  const handleOpenShift = () => {
    if (!openCashierInput.trim()) {
      toast.error(language === "hi" ? "कृपया कैशियर का नाम दर्ज करें" : "Please enter cashier name");
      return;
    }
    if (!openCounterInput.trim()) {
      toast.error(language === "hi" ? "कृपया काउंटर संख्या दर्ज करें" : "Please enter counter number");
      return;
    }
    const startingCash = parseFloat(openStartingCashInput) || 0;

    //  Permanently save this device's counter (persists across sessions)
    localStorage.setItem("gst_pos_my_device_counter", openCounterInput);
    setMyDeviceCounter(openCounterInput);

    setCurrentCounter(openCounterInput);
    setCurrentCashier(openCashierInput);
    setStartingDrawerCash(startingCash);
    setShiftInvoices([]);
    setIsShiftActive(true);
    setIsShiftOpenDialogOpen(false);
    setIsCounterPickerOpen(false);
    toast.success(
      language === "hi"
        ? `कैशियर शिफ्ट शुरू हो गई है! ${startingCash.toLocaleString("en-IN")} के साथ कैश ड्रावर खुल गया है।`
        : `Shift activated! Cash drawer unlocked with ${startingCash.toLocaleString("en-IN")}`
    );
  };

  //  SUBSYSTEM B: Queue Management Ticker 
  const [timeTicker, setTimeTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTimeTicker(prev => prev + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const getMinutesElapsed = (parkedAt) => {
    if (!parkedAt) return "Just now";
    const diffMs = Date.now() - parkedAt;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins <= 0) return "Just now";
    return `${diffMins}m ago`;
  };

  //  SUBSYSTEM C: Loyalty Points Ledger States & Functions 
  const [loyaltyLedger, setLoyaltyLedger] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gst_pos_loyalty_ledger") || "{}");
    } catch (e) {
      return {};
    }
  });
  const [redeemLoyalty, setRedeemLoyalty] = useState(false);

  const getCustomerPoints = (custId) => {
    if (!custId || custId === "walk-in") return 0;
    return loyaltyLedger[custId] || 0;
  };

  const getLoyaltyTier = (points) => {
    if (points < 200) return { name: "Bronze", color: "bg-amber-900/20 text-amber-500 border-amber-500/20" };
    if (points < 500) return { name: "Silver", color: "bg-slate-300/10 text-slate-350 border-slate-350/20" };
    if (points < 1000) return { name: "Gold", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" };
    return { name: "Platinum", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
  };

  //  SUBSYSTEM E: Batch & Tier pricing Popover States 
  const [selectedDetailProduct, setSelectedDetailProduct] = useState(null);
  const [isDetailProductDialogOpen, setIsDetailProductDialogOpen] = useState(false);
  const [detailRate, setDetailRate] = useState(0);
  const [detailBatch, setDetailBatch] = useState("");
  const [detailExpiry, setDetailExpiry] = useState("");
  const [detailRack, setDetailRack] = useState("");

  useEffect(() => {
    if (selectedDetailProduct) {
      setDetailRate(selectedDetailProduct.rate);
      setDetailBatch(selectedDetailProduct.batch_no || "BAT-01");
      setDetailExpiry(selectedDetailProduct.expiry_date || "");
      setDetailRack(selectedDetailProduct.rack_location || "Aisle 4, Shelf C");
    }
  }, [selectedDetailProduct]);

  // Back Button Navigation for POS Overlays
  useBackButton(() => setMobileTab("products"), mobileTab === "cart");
  useBackButton(() => setIsWeightDialogOpen(false), isWeightDialogOpen);
  useBackButton(() => setIsVariantDialogOpen(false), isVariantDialogOpen);
  useBackButton(() => setIsDetailProductDialogOpen(false), isDetailProductDialogOpen);
  useBackButton(() => setIsShiftCloseDialogOpen(false), isShiftCloseDialogOpen);
  useBackButton(() => setIsShiftOpenDialogOpen(false), isShiftOpenDialogOpen);
  useBackButton(() => setIsCounterPickerOpen(false), isCounterPickerOpen);

  const handleApplyProductDetails = (product, selectedRate, selectedBatch, selectedExpiry) => {
    setCart(prev => {
      const cartKey = `${product.id}-${selectedDetailProduct.selected_size || ""}-${selectedDetailProduct.selected_color || ""}-${selectedRate}-${selectedBatch}`;
      const existing = prev.find(item => item.cartKey === cartKey);
      
      const newProductObj = {
        ...product,
        rate: selectedRate,
        batch_no: selectedBatch,
        expiry_date: selectedExpiry,
        qty: existing ? existing.qty + 1 : 1,
        selected_size: selectedDetailProduct.selected_size || "",
        selected_color: selectedDetailProduct.selected_color || "",
        cartKey
      };
      
      if (existing) {
        return prev.map(item => item.cartKey === cartKey ? newProductObj : item);
      }
      return [...prev, newProductObj];
    });
    setIsDetailProductDialogOpen(false);
    setSelectedDetailProduct(null);
    toast.success("Pricing and Batch options applied!");
  };

  //  SUBSYSTEM G: Offline-First Billing & Sync Queue states 
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  const syncOfflineQueue = async () => {
    try {
      const queue = JSON.parse(localStorage.getItem("gst_pos_offline_invoice_sync_queue") || "[]");
      if (!queue.length) return;

      let syncedCount = 0;
      for (const inv of queue) {
        try {
          const cleanInv = { ...inv };
          delete cleanInv.id;
          delete cleanInv.isOfflinePending;

          const sanitizedCleanInv = JSON.parse(JSON.stringify(cleanInv, (k, v) => (v === undefined ? null : v)));
          await base44.entities.Invoice.create(sanitizedCleanInv);

          try {
            const journalPayload = buildSaleJournalEntry(cleanInv);
            await accountingService.createJournalEntry(journalPayload);
          } catch (e) {
            console.error("Offline sync: failed to post sale JournalEntry (best-effort).", e);
          }

          for (const item of cleanInv.items || []) {
            const prodId = item.product_id;
            if (!prodId) continue;
            if (cleanInv.branchId) {
              try {
                await updateInventory(prodId, cleanInv.branchId, -item.qty, "pos_offline_sync");
              } catch (e) {
                console.error(`Error updating branch inventory for offline sync ${prodId}:`, e);
              }
            }
            try {
              const realProd = await base44.entities.Product.get(prodId);
              if (realProd) {
                const newStock = Math.max(0, (realProd.stock || 0) - item.qty);
                await base44.entities.Product.update(prodId, { stock: newStock });
              }
            } catch (e) {
              console.error(`Error updating global stock for offline sync ${prodId}:`, e);
            }
          }

          syncedCount++;
        } catch (err) {
          console.error("Failed to sync invoice:", err);
        }
      }

      localStorage.setItem("gst_pos_offline_invoice_sync_queue", "[]");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });

      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} offline transaction(s) to cloud database successfully!`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success(" Internet connection restored! Syncing offline database...");
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning(" Connection lost. POS running in Local Offline Mode.");
    };
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [latestInvoice, setLatestInvoice] = useState(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // New Customer Form
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustGstin, setNewCustGstin] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [newCustContactPerson, setNewCustContactPerson] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustCity, setNewCustCity] = useState("");
  const [newCustState, setNewCustState] = useState("");
  const [newCustPincode, setNewCustPincode] = useState("");
  const [newCustCreditLimit, setNewCustCreditLimit] = useState(0);
  const [newCustCategory, setNewCustCategory] = useState("Retail");
  const [newCustNotes, setNewCustNotes] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [billingType, setBillingType] = useState("B2C"); // B2C or B2B
  const [custSearchInput, setCustSearchInput] = useState("");
  const [isCustDropdownOpen, setIsCustDropdownOpen] = useState(false);

  const searchInputRef = useRef(null);

  // Printer integration states
  const [selectedPrintSize, setSelectedPrintSize] = useState("58mm");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [printingStatus, setPrintingStatus] = useState("");
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  //  NEW: Quick Add Product panel 
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    name: "", sku: "", barcode: "", purchase_rate: "", rate: "", mrp: "",
    gst_rate: "18", stock: "", unit: "PCS", category: "",
    batch_no: "", expiry_date: "", manufacturer: "", image_url: "",
    hsn: "", description: ""
  });
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef(null);

  //  NEW: Billing History panel 
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyPayFilter, setHistoryPayFilter] = useState("all");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [selectedHistoryInvoice, setSelectedHistoryInvoice] = useState(null);
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  const [historySubTab, setHistorySubTab] = useState("invoices"); // invoices, parked

  // Duplication & Edit states
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editingInvoiceOriginalItems, setEditingInvoiceOriginalItems] = useState([]);
  const [selectedParkedCart, setSelectedParkedCart] = useState(null);

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date"),
    enabled: isHistoryOpen || !!editingInvoiceId,
  });

  //  NEW: Smart Search  Voice + Suggestions 
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentlySold, setRecentlySold] = useState([]);
  const recognitionRef = useRef(null);

  // Query Data
  const { data: rawProducts = [], isLoading: isLoadingProd } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const products = useMemo(() => {
    if (!activeBranchId || branchInventory.length === 0) {
      return rawProducts;
    }
    return rawProducts.map(p => {
      const branchInv = branchInventory.find(inv => inv.productId === p.id);
      return {
        ...p,
        stock: branchInv ? branchInv.quantity : 0
      };
    });
  }, [rawProducts, branchInventory, activeBranchId]);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
    enabled: !!user,
  });

  // Clean duplicate settings documents if any, prioritizing the completed one and a real database ID
  useEffect(() => {
    if (settings && settings.length > 1) {
      const realCompleteSettings = settings.find(s => 
        s.business_entity_type && 
        s.business_entity_type.trim() !== "" && 
        s.id && 
        !s.id.startsWith("temp-")
      );
      
      const toKeep = realCompleteSettings || 
                     settings.find(s => s.id && !s.id.startsWith("temp-")) || 
                     settings[0];
      
      settings.forEach(s => {
        if (s.id !== toKeep.id && s.id && !s.id.startsWith("temp-")) {
          // Changed to dry-run warning instead of automatic destruction
          console.warn(`[Dry-Run] Detected duplicate ShopSettings. Found valid config ${toKeep.id}. Duplicate ${s.id} should be deleted manually or via Admin to prevent operational config loss.`);
        }
      });
    }
  }, [settings]);

  const shopSettings = settings[0] || {};

  useEffect(() => {
    if (shopSettings && shopSettings.printer_size) {
      setSelectedPrintSize(shopSettings.printer_size);
    }
  }, [shopSettings]);

  useEffect(() => {
    setOfflineQueueCount(getOfflinePrintQueue().length);
  }, [isPrintOpen]);

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

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const aiUpsellRecommendations = useMemo(() => {
    if (cart.length === 0) return [];
    const compMap = {
      "biscuits": ["tea", "coffee", "milk"],
      "tea": ["biscuits", "sugar", "milk"],
      "medicine": ["vitamin c", "multivitamin", "zinc"],
      "shampoo": ["conditioner", "soap", "oil"],
      "bread": ["butter", "jam", "eggs"],
      "rice": ["dal", "oil", "salt"],
      "mobile": ["case", "charger", "tempered glass"]
    };
    const cartItemNames = cart.map(item => item.name.toLowerCase());
    const recommendations = [];
    products.forEach(p => {
      const pName = p.name.toLowerCase();
      if (cart.some(item => item.id === p.id)) return;
      let isRecommended = false;
      cartItemNames.forEach(cName => {
        for (const [key, comps] of Object.entries(compMap)) {
          if (cName.includes(key) && comps.some(comp => pName.includes(comp))) {
            isRecommended = true;
          }
        }
      });
      const cartCategories = cart.map(item => item.category?.toLowerCase()).filter(Boolean);
      if (p.category && cartCategories.includes(p.category.toLowerCase()) && recommendations.length < 3) {
        isRecommended = true;
      }
      if (isRecommended && recommendations.length < 4) {
        recommendations.push(p);
      }
    });
    return recommendations;
  }, [cart, products]);

  const filteredCustomers = useMemo(() => {
    const sorted = [...customers].sort((a, b) => {
      const dateA = a.created_date || "";
      const dateB = b.created_date || "";
      return dateB.localeCompare(dateA); // Newest first
    });

    if (!custSearchInput.trim()) return sorted;

    const queryStr = custSearchInput.toLowerCase().trim();
    return sorted.filter(c => 
      (c.name || "").toLowerCase().includes(queryStr) ||
      (c.phone || "").toLowerCase().includes(queryStr) ||
      (c.gstin || "").toLowerCase().includes(queryStr)
    );
  }, [customers, custSearchInput]);

  const handleTriggerAddCustomerFromSearch = () => {
    const text = custSearchInput.trim();
    setIsCustDropdownOpen(false);

    let parsedName = "";
    let parsedPhone = "";
    let parsedGstin = "";

    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
    const isMaybeGstin = text.length >= 10 && /[0-9]/.test(text[0]) && /[a-zA-Z]/.test(text);
    const isMaybePhone = /^\+?[0-9\s\-()]{8,15}$/.test(text);

    if (gstinPattern.test(text) || (isMaybeGstin && text.length === 15)) {
      parsedGstin = text.toUpperCase();
    } else if (isMaybePhone) {
      parsedPhone = text;
    } else {
      parsedName = text;
    }

    setNewCustName(parsedName);
    setNewCustPhone(parsedPhone);
    setNewCustGstin(parsedGstin);
    setIsCustomerModalOpen(true);
  };

  // Auto-focus search input
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Set layout based on shopSettings business_type
  useEffect(() => {
    if (shopSettings.business_type) {
      setLayout(mapShopTypeToLayout(shopSettings.business_type));
    }
  }, [shopSettings.business_type]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        handleCheckout();
      } else if (e.key === "F7") {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === "F9") {
        e.preventDefault();
        setBarcodeMode(prev => !prev);
        toast.info(`Barcode Scanner ${!barcodeMode ? "ENABLED" : "DISABLED"}`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, barcodeMode, parkedCarts, selectedCustomerId, discountType, discountValue, paymentMethod, splitCash, splitCard, splitUPI]);

  // Barcode Auto-Add Scanner
  useEffect(() => {
    if (barcodeMode && searchTerm.trim().length > 3) {
      const match = products.find(p => p.barcode === searchTerm.trim() || p.id === searchTerm.trim());
      if (match) {
        handleProductClick(match);
        setSearchTerm("");
        toast.success(`Scanned and added: ${match.name}`);
      }
    }
  }, [searchTerm, barcodeMode, products]);

  const handleProductClick = (product) => {
    if (layout === "grocery" && product.is_weighed) {
      setWeighedProduct(product);
      setWeightInput(1.0);
      setIsWeightDialogOpen(true);
    } else if (layout === "fashion" && ((product.sizes && product.sizes.length > 0) || product.colors)) {
      setVariantProduct(product);
      setVariantSize(product.sizes?.[0] || "M");
      const colorsList = product.colors ? product.colors.split(",").map(c => c.trim()) : [];
      setVariantColor(colorsList[0] || "Default");
      setIsVariantDialogOpen(true);
    } else {
      addToCart(product);
    }
  };
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
      console.log("Audio blocked: ", e);
    }
  };

  const addToCart = (product, size = "", color = "", overrideQty = null) => {
    playScanBeep();
    // If medical layout, check expiry
    if (layout === "medical" && product.expiry_date) {
      const expDate = new Date(product.expiry_date);
      const today = new Date();
      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        toast.error(language === "hi" ? `️ यह दवा एक्सपायर हो चुकी है: ${product.name}` : `️ This medicine has EXPIRED: ${product.name}!`);
        speak(language === "hi" ? "यह दवा एक्सपायर हो चुकी है" : "This medicine has expired", true);
        return;
      } else if (diffDays <= 60) {
        toast.warning(language === "hi" ? `️ एक्सपायरी चेतावनी: ${product.name} ${diffDays} दिनों में एक्सपायर होने वाली है!` : `️ Expiry Warning: ${product.name} will expire in ${diffDays} days!`);
        speak(language === "hi" ? "सावधान! यह दवा जल्द ही एक्सपायर होने वाली है" : "Warning, this medicine is close to expiry", true);
      }
    }

    const addedQty = overrideQty !== null ? overrideQty : 1;

    setCart(prev => {
      const cartKey = `${product.id}-${size}-${color}`;
      const existing = prev.find(item => item.cartKey === cartKey);
      if (existing) {
        const nextQty = parseFloat((existing.qty + addedQty).toFixed(3));
        return prev.map(item => item.cartKey === cartKey ? { ...item, qty: nextQty } : item);
      }
      return [...prev, { ...product, qty: addedQty, selected_size: size, selected_color: color, cartKey }];
    });
  };

  const handleWeightSubmit = (e) => {
    if (e) e.preventDefault();
    if (!weighedProduct || weightInput <= 0) return;
    addToCart(weighedProduct, "", "", weightInput);
    setIsWeightDialogOpen(false);
    setWeighedProduct(null);
    setWeightInput(1.0);
  };

  const handleVariantSubmit = (e) => {
    if (e) e.preventDefault();
    if (!variantProduct) return;
    addToCart(variantProduct, variantSize, variantColor);
    setIsVariantDialogOpen(false);
    setVariantProduct(null);
  };

  const removeFromCart = (cartKey) => {
    setCart(prev => prev.filter(item => item.cartKey !== cartKey));
  };

  const updateQty = (cartKey, change) => {
    setCart(prev => prev.map(item => {
      if (item.cartKey === cartKey) {
        const newQty = parseFloat((item.qty + change).toFixed(3));
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const handleTableSwitch = (nextTable) => {
    // 1. Save current cart to the current table first
    setTableCarts(prev => ({ ...prev, [selectedTable]: cart }));
    // 2. Change active table
    setSelectedTable(nextTable);
    // 3. Load next table's cart
    setCart(tableCarts[nextTable] || []);
  };

  // Park Bill
  const handleHoldBill = () => {
    if (cart.length === 0) {
      toast.error("Nothing to hold");
      return;
    }
    const label = layout === "restaurant" ? `Table ${selectedTable}` : `Order #${parkedCarts.length + 1} (${customers.find(c => c.id === selectedCustomerId)?.name || "Walk-in"})`;
    const newHold = {
      id: Date.now(),
      label,
      cart,
      customerId: selectedCustomerId,
      discountType,
      discountValue,
      layout,
      parkedAt: Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setParkedCarts(prev => [newHold, ...prev]);
    setCart([]);
    toast.success(`Bill Parked on ${label}`);
  };

  const handleKotSend = () => {
    if (cart.length === 0) {
      toast.error(language === "hi" ? "कोई आइटम नहीं है" : "No items in cart");
      return;
    }
    speak("voice.kot_sent");
    toast.success(language === "hi" ? `के.ओ.टी रसोई में भेजा गया: ${selectedTable}` : `KOT sent to kitchen for ${selectedTable}`);
  };

  // Resume Parked Bill
  const handleResumeBill = (holdId) => {
    const resumed = parkedCarts.find(item => item.id === holdId);
    if (resumed) {
      setCart(resumed.cart);
      setSelectedCustomerId(resumed.customerId);
      setDiscountType(resumed.discountType);
      setDiscountValue(resumed.discountValue);
      setLayout(resumed.layout);
      setParkedCarts(prev => prev.filter(item => item.id !== holdId));
      toast.success(`Resumed: ${resumed.label}`);
    }
  };

  // Create Quick Customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName) return;
    try {
      const payload = {
        name: newCustName,
        phone: newCustPhone,
        gstin: newCustGstin,
        whatsapp_number: newCustPhone,
      };

      if (billingType === "B2B") {
        payload.contact_person = newCustContactPerson;
        payload.email = newCustEmail;
        payload.address = newCustAddress;
        payload.city = newCustCity;
        payload.state = newCustState;
        payload.pincode = newCustPincode;
        payload.credit_limit = Number(newCustCreditLimit) || 0;
        payload.category = newCustCategory;
        payload.notes = newCustNotes;
      }

      if (editingCustomerId) {
        await base44.entities.Customer.update(editingCustomerId, payload);
        toast.success("Customer updated!");
      } else {
        const newCust = await base44.entities.Customer.create(payload);
        setSelectedCustomerId(newCust.id);
        toast.success("Customer added!");
      }
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsCustomerModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustGstin("");
      setNewCustContactPerson("");
      setNewCustEmail("");
      setNewCustAddress("");
      setNewCustCity("");
      setNewCustState("");
      setNewCustPincode("");
      setNewCustCreditLimit(0);
      setNewCustCategory("Retail");
      setNewCustNotes("");
      setEditingCustomerId(null);
    } catch (e) {
      toast.error("Failed to save customer");
    }
  };

  //  SUBSYSTEM D: Automatic Combo / BOGO Engine 
  const cartOffers = useMemo(() => {
    return cart.reduce((totalDiscount, item) => {
      const bogoDiscount = Math.floor(item.qty / 2) * item.rate;
      const bulkDiscount = item.qty >= 3 ? 0.1 * item.qty * item.rate : 0;
      return totalDiscount + Math.max(bogoDiscount, bulkDiscount);
    }, 0);
  }, [cart]);

  // Pricing calculations
  const cartSubtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.qty * item.rate), 0), [cart]);
  
  const cartTax = useMemo(() => {
    return cart.reduce((acc, item) => {
      const bogoDiscount = Math.floor(item.qty / 2) * item.rate;
      const bulkDiscount = item.qty >= 3 ? 0.1 * item.qty * item.rate : 0;
      const itemDiscount = Math.max(bogoDiscount, bulkDiscount);
      const discountedItemSubtotal = Math.max(0, (item.qty * item.rate) - itemDiscount);
      return acc + (discountedItemSubtotal * (item.gst_rate || 18) / 100);
    }, 0);
  }, [cart]);

  const rawTotal = Math.max(0, (cartSubtotal - cartOffers) + cartTax);
  
  const customerPoints = useMemo(() => getCustomerPoints(selectedCustomerId), [selectedCustomerId, loyaltyLedger]);
  const loyaltyDiscount = useMemo(() => redeemLoyalty ? Math.min(customerPoints, rawTotal) : 0, [redeemLoyalty, customerPoints, rawTotal]);

  const finalTotal = useMemo(() => {
    let total = rawTotal - loyaltyDiscount;
    if (discountType === "percent") {
      total = total * (1 - discountValue / 100);
    } else {
      total = Math.max(0, total - discountValue);
    }
    return Math.max(0, total);
  }, [rawTotal, loyaltyDiscount, discountType, discountValue]);

  // Checkout Pay & Print
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!selectedCustomerId) {
      toast.error("Please select a customer.");
      return;
    }
    // Auto-activate shift silently if not active (shift is optional tracking  never block checkout)
    if (!isShiftActive) {
      const defaultCashier = currentCashier || myDeviceCounter || "Cashier";
      const defaultCounter = currentCounter || myDeviceCounter || "Counter 1";
      setCurrentCashier(defaultCashier);
      setCurrentCounter(defaultCounter);
      setIsShiftActive(true);
      localStorage.setItem("gst_pos_shift_active", "true");
      localStorage.setItem("gst_pos_shift_cashier", defaultCashier);
      localStorage.setItem("gst_pos_shift_counter", defaultCounter);
    }
    try {
      setIsCheckingOut(true);
      const customer = customers.find(c => c.id === selectedCustomerId);
      
      let createdInvoice;
      
      if (!isOnline) {
        // Simulated Offline Checkout
        const invoiceNum = `INV-POS-OFF-${Date.now().toString().slice(-6)}`;
          const offlineInvoice = {
            id: `off-${Date.now()}`,
            invoice_number: invoiceNum,
            date: new Date().toISOString().slice(0, 10),
            customer_name: customer?.name || "Walk-in Customer",
            customer_gstin: customer?.gstin || "",
            customer_phone: customer?.phone || "",
            subtotal: cartSubtotal || 0,
            tax_amount: cartTax || 0,
            grand_total: parseFloat(finalTotal.toFixed(2)) || 0,
            is_interstate: false,
            place_of_supply: "27-Maharashtra",
            items: cart.map(item => {
              let displayName = item.name || "Unknown Item";
              if (item.selected_size || item.selected_color) {
                const sizeStr = item.selected_size ? `Size: ${item.selected_size}` : "";
                const colorStr = item.selected_color ? `Color: ${item.selected_color}` : "";
                const variantDetails = [sizeStr, colorStr].filter(Boolean).join(", ");
                displayName = `${item.name || "Unknown Item"} (${variantDetails})`;
              }
              return {
                product_id: item.id || null,
                name: displayName,
                qty: item.qty || 1,
                rate: item.rate || 0,
                gst_rate: item.gst_rate || 18,
                hsn: item.hsn || "0000"
              };
            }),
            type: "sale",
            billing_type: billingType || "B2C",
            payment_method: paymentMethod || "cash",
            payment_split: paymentMethod === 'split' ? { cash: splitCash || 0, card: splitCard || 0, upi: splitUPI || 0 } : null,
            notes: layout === "restaurant" ? `Restaurant Table: ${selectedTable} (Offline)` : "Offline Generated",
            isOfflinePending: true,
            branchId: activeBranchId || null
          };

          createdInvoice = JSON.parse(JSON.stringify(offlineInvoice, (k, v) => v === undefined ? null : v));

        // Decrement stock in react-query cache locally
        const currentProducts = queryClient.getQueryData(["products"]) || [];
        const updatedProducts = currentProducts.map(p => {
          const cartItem = cart.find(item => item.id === p.id);
          if (cartItem) {
            return { ...p, stock: Math.max(0, (p.stock || 0) - cartItem.qty) };
          }
          return p;
        });
        queryClient.setQueryData(["products"], updatedProducts);

        // Save to offline queue
        const queue = JSON.parse(localStorage.getItem("gst_pos_offline_invoice_sync_queue") || "[]");
        queue.push({ ...createdInvoice, isOfflinePending: true });
        localStorage.setItem("gst_pos_offline_invoice_sync_queue", JSON.stringify(queue));

        toast.warning(" Connection offline. Invoice processed and queued for cloud sync!");
      } else {
        // Online Standard / Edit mode checkout
        if (editingInvoiceId) {
          // Edit mode: update existing invoice
          const updatedInvoice = {
            customer_name: customer?.name || "Walk-in Customer",
            customer_gstin: customer?.gstin || "",
            customer_phone: customer?.phone || "",
            subtotal: cartSubtotal || 0,
            tax_amount: cartTax || 0,
            grand_total: parseFloat(finalTotal.toFixed(2)) || 0,
            items: cart.map(item => {
              let displayName = item.name || "Unknown Item";
              if (item.selected_size || item.selected_color) {
                const sizeStr = item.selected_size ? `Size: ${item.selected_size}` : "";
                const colorStr = item.selected_color ? `Color: ${item.selected_color}` : "";
                const variantDetails = [sizeStr, colorStr].filter(Boolean).join(", ");
                displayName = `${item.name || "Unknown Item"} (${variantDetails})`;
              }
              return {
                product_id: item.id || null,
                name: displayName,
                qty: item.qty || 1,
                rate: item.rate || 0,
                gst_rate: item.gst_rate || 18,
                hsn: item.hsn || "0000"
              };
            }),
            billing_type: billingType || "B2C",
            payment_method: paymentMethod || "cash",
            payment_split: paymentMethod === 'split' ? { cash: splitCash || 0, card: splitCard || 0, upi: splitUPI || 0 } : null,
            notes: layout === "restaurant" ? `Restaurant Table: ${selectedTable} (Edited)` : "Edited Bill",
            branchId: activeBranchId || null
          };

          const sanitizedUpdatedInvoice = JSON.parse(JSON.stringify(updatedInvoice, (k, v) => v === undefined ? null : v));
          createdInvoice = await base44.entities.Invoice.update(editingInvoiceId, sanitizedUpdatedInvoice);

          // Best-effort: create/replace sale JournalEntry (double-entry) for edit checkout
          // Note: we do not attempt to find/update an existing JE here (Phase 1 minimal correctness).
          try {
            const journalPayload = buildSaleJournalEntry({
              ...sanitizedUpdatedInvoice,
              invoice_number: sanitizedUpdatedInvoice.invoice_number || (invoices.find(inv => inv.id === editingInvoiceId)?.invoice_number),
              date: sanitizedUpdatedInvoice.date || (invoices.find(inv => inv.id === editingInvoiceId)?.date),
              customer_name: sanitizedUpdatedInvoice.customer_name,
            });
            await accountingService.createJournalEntry(journalPayload);
          } catch (e) {
            console.error("Edit checkout: failed to post sale JournalEntry (best-effort).", e);
          }

          // Combined Stock Adjustment logic (branch specific and global catalog):
          const stockAdjustments = {};
          for (const item of editingInvoiceOriginalItems) {
            stockAdjustments[item.product_id] = (stockAdjustments[item.product_id] || 0) - item.qty;
          }
          for (const item of cart) {
            stockAdjustments[item.id] = (stockAdjustments[item.id] || 0) + item.qty;
          }
          for (const prodId in stockAdjustments) {
            const delta = stockAdjustments[prodId];
            if (delta !== 0) {
              const prod = products.find(p => p.id === prodId);
              if (prod) {
                // 1. Branch specific inventory update
                if (activeBranchId) {
                  try {
                    await updateInventory(prodId, activeBranchId, -delta, 'pos_edit');
                  } catch (err) {
                    console.error(`Error updating branch inventory for ${prodId} during edit:`, err);
                  }
                }
                // 2. Global product catalog stock update
                try {
                  const realProd = await base44.entities.Product.get(prodId);
                  if (realProd) {
                    const currentStock = realProd.stock || 0;
                    const newStock = Math.max(0, currentStock - delta);
                    await base44.entities.Product.update(prodId, { stock: newStock });
                  }
                } catch (err) {
                  console.error(`Error updating global stock for product ${prodId} during edit:`, err);
                }
              }
            }
          }

          setEditingInvoiceId(null);
          setEditingInvoiceOriginalItems([]);
          toast.success("Invoice updated successfully!");
        } else {
          // Standard Checkout: create new invoice
          const invoiceNum = `INV-POS-${Date.now().toString().slice(-6)}`;
          const newInvoice = {
            invoice_number: invoiceNum,
            date: new Date().toISOString().slice(0, 10),
            customer_name: customer?.name || "Walk-in Customer",
            customer_gstin: customer?.gstin || "",
            customer_phone: customer?.phone || "",
            subtotal: cartSubtotal || 0,
            tax_amount: cartTax || 0,
            grand_total: parseFloat(finalTotal.toFixed(2)) || 0,
            is_interstate: false,
            place_of_supply: "27-Maharashtra",
            items: cart.map(item => {
              let displayName = item.name || "Unknown Item";
              if (item.selected_size || item.selected_color) {
                const sizeStr = item.selected_size ? `Size: ${item.selected_size}` : "";
                const colorStr = item.selected_color ? `Color: ${item.selected_color}` : "";
                const variantDetails = [sizeStr, colorStr].filter(Boolean).join(", ");
                displayName = `${item.name || "Unknown Item"} (${variantDetails})`;
              }
              return {
                product_id: item.id || null,
                name: displayName,
                qty: item.qty || 1,
                rate: item.rate || 0,
                gst_rate: item.gst_rate || 18,
                hsn: item.hsn || "0000"
              };
            }),
            type: "sale",
            billing_type: billingType || "B2C",
            payment_method: paymentMethod || "cash",
            payment_split: paymentMethod === 'split' ? { cash: splitCash || 0, card: splitCard || 0, upi: splitUPI || 0 } : null,
            notes: layout === "restaurant" ? `Restaurant Table: ${selectedTable}` : "",
            branchId: activeBranchId || null
          };

          // Sanitize to remove any remaining undefined values that crash Firebase
          const sanitizedInvoice = JSON.parse(JSON.stringify(newInvoice, (k, v) => (v === undefined ? null : v)));
          sanitizedInvoice.cashier_code = user?.user_code || "";
          sanitizedInvoice.cashier_name = user?.name || user?.user_code || "Cashier";
          
          createdInvoice = await base44.entities.Invoice.create(sanitizedInvoice);

          // Best-effort: create sale JournalEntry (double-entry) for online new checkout
          try {
            const journalPayload = buildSaleJournalEntry({
              ...sanitizedInvoice,
              // buildSaleJournalEntry expects invoice.grand_total + tax_amount + invoice_number + date + customer_name
              grand_total: sanitizedInvoice.grand_total,
              tax_amount: sanitizedInvoice.tax_amount,
              invoice_number: sanitizedInvoice.invoice_number,
              date: sanitizedInvoice.date,
              customer_name: sanitizedInvoice.customer_name,
            });
            await accountingService.createJournalEntry(journalPayload);
          } catch (e) {
            console.error("Checkout: failed to post sale JournalEntry (best-effort).", e);
          }

          // Decrement stock in database (branch specific and global catalog)
          for (const item of cart) {
            const prod = products.find(p => p.id === item.id);
            if (prod) {
              // 1. Decrement specific branch inventory
              if (activeBranchId) {
                try {
                  await updateInventory(item.id, activeBranchId, -item.qty, 'pos_sale');
                } catch (err) {
                  console.error(`Error updating branch inventory for ${item.id}:`, err);
                }
              }
              // 2. Decrement global product catalog stock
              try {
                const realProd = await base44.entities.Product.get(item.id);
                if (realProd) {
                  const newStock = Math.max(0, (realProd.stock || 0) - item.qty);
                  await base44.entities.Product.update(item.id, { stock: newStock });
                }
              } catch (err) {
                console.error(`Error updating global catalog stock for product ${item.id}:`, err);
              }
            }
          }
          toast.success("Bill generated successfully!");
        }
      }

      //  Accrue / Deduct Loyalty Points 
      if (selectedCustomerId !== "walk-in") {
        const earned = Math.floor(finalTotal / 100);
        const currentPoints = loyaltyLedger[selectedCustomerId] || 0;
        const nextPoints = currentPoints + earned - (redeemLoyalty ? loyaltyDiscount : 0);
        const updatedLedger = { ...loyaltyLedger, [selectedCustomerId]: Math.max(0, nextPoints) };
        setLoyaltyLedger(updatedLedger);
        localStorage.setItem("gst_pos_loyalty_ledger", JSON.stringify(updatedLedger));
        toast.info(` Loyalty Account: Earned ${earned} pts! New Balance: ${Math.max(0, nextPoints)} pts.`);
      }

      //  Shift Tracking 
      if (isShiftActive) {
        setShiftInvoices(prev => {
          const next = [...prev, createdInvoice];
          localStorage.setItem("gst_pos_shift_invoices", JSON.stringify(next));
          return next;
        });
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      
      setLatestInvoice(createdInvoice);
      setWhatsappNumber(customer ? (customer.phone || "") : "");
      setRedeemLoyalty(false); // Reset points redemption toggle
      
      // Track recently sold products
      setRecentlySold(prev => {
        const newItems = cart.map(item => ({ id: item.id, name: item.name, rate: item.rate }));
        const merged = [...newItems, ...prev];
        const seen = new Set();
        return merged.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; }).slice(0, 8);
      });

      if (layout === "restaurant") {
        setTableCarts(prev => ({ ...prev, [selectedTable]: [] }));
      }
      setCart([]);
      setDiscountValue(0);
      setIsPrintOpen(true);
      speak("voice.checkout_success");

      // Auto-Print
      if (shopSettings?.auto_print) {
        setTimeout(() => {
          triggerPrint(createdInvoice, false);
        }, 500);
      }
    } catch (e) {
      console.error(e);
      toast.error("Checkout failed: " + (e.message || e));
    } finally {
      setIsCheckingOut(false);
    }
  };

  //  Quick Add Product handlers 
  const openQuickAdd = () => {
    const newBarcode = generateBarcode();
    setQuickAddForm(prev => ({
      ...prev,
      name: "", sku: "", barcode: newBarcode,
      purchase_rate: "", rate: "", mrp: "",
      gst_rate: "18", stock: "0", unit: "PCS",
      category: "", batch_no: "", expiry_date: "",
      manufacturer: "", image_url: "", hsn: "", description: ""
    }));
    setIsQuickAddOpen(true);
  };

  const handleQuickAddImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setQuickAddForm(prev => ({ ...prev, image_url: file_url }));
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error("Image upload failed: " + err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleQuickAddSave = async (andPrint = false) => {
    if (!quickAddForm.name.trim()) { toast.error("Product name is required"); return; }
    if (!quickAddForm.rate) { toast.error("Sell price is required"); return; }
    setIsSavingProduct(true);
    try {
      const sku = quickAddForm.sku || generateSKU(quickAddForm.name);
      const barcode = quickAddForm.barcode || generateBarcode();
      const productData = {
        name: quickAddForm.name.trim(),
        sku,
        barcode,
        purchase_rate: parseFloat(quickAddForm.purchase_rate) || 0,
        rate: parseFloat(quickAddForm.rate),
        mrp: parseFloat(quickAddForm.mrp) || parseFloat(quickAddForm.rate),
        gst_rate: parseFloat(quickAddForm.gst_rate) || 18,
        stock: parseFloat(quickAddForm.stock) || 0,
        unit: quickAddForm.unit || "PCS",
        category: quickAddForm.category,
        hsn: quickAddForm.hsn,
        batch_no: quickAddForm.batch_no,
        expiry_date: quickAddForm.expiry_date,
        manufacturer: quickAddForm.manufacturer,
        image_url: quickAddForm.image_url,
        description: quickAddForm.description,
      };
      const created = await base44.entities.Product.create(productData);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(` "${created.name}" added to inventory!`);
      if (andPrint) {
        setTimeout(() => window.print(), 400);
      }
      setIsQuickAddOpen(false);
    } catch (err) {
      toast.error("Failed to save product: " + err.message);
    } finally {
      setIsSavingProduct(false);
    }
  };

  //  Billing History handlers 
  const duplicateInvoiceToCart = (invoice) => {
    if (!invoice) return;
    
    // Clear current cart and load new items
    const newCart = (invoice.items || []).map(item => {
      const matchedProd = products.find(p => p.id === item.product_id);
      
      let baseName = item.name;
      let size = "";
      let color = "";
      
      const variantMatch = item.name.match(/\(([^)]+)\)/);
      if (variantMatch) {
        baseName = item.name.replace(/\s*\([^)]+\)/, "");
        const details = variantMatch[1].split(",");
        details.forEach(d => {
          const parts = d.split(":");
          if (parts.length === 2) {
            const key = parts[0].trim().toLowerCase();
            const val = parts[1].trim();
            if (key === "size") size = val;
            if (key === "color") color = val;
          }
        });
      }
      
      const cartKey = `${item.product_id}-${size}-${color}`;
      
      return {
        id: item.product_id,
        name: baseName,
        qty: item.qty,
        rate: item.rate,
        gst_rate: item.gst_rate || 18,
        hsn: item.hsn || "0000",
        selected_size: size,
        selected_color: color,
        is_weighed: matchedProd?.is_weighed || false,
        image_url: matchedProd?.image_url || "",
        cartKey
      };
    });

    setCart(newCart);
    
    // Find customer by name or phone
    const foundCustomer = customers.find(c => c.name === invoice.customer_name || c.phone === invoice.customer_phone);
    if (foundCustomer) {
      setSelectedCustomerId(foundCustomer.id);
    } else {
      setSelectedCustomerId("walk-in");
    }

    setBillingType(invoice.billing_type || "B2C");
    setDiscountValue(0); 
    setPaymentMethod(invoice.payment_method || "cash");
    
    toast.success(`Duplicated Invoice ${invoice.invoice_number} to active cart!`);
    setIsHistoryOpen(false);
    setSelectedHistoryInvoice(null);
  };

  const editInvoiceInCart = (invoice) => {
    if (!invoice) return;
    
    if (cart.length > 0 && !window.confirm("Loading this invoice into the active cart for editing will clear your current cart. Proceed?")) {
      return;
    }

    // Clear current cart and load new items
    const newCart = (invoice.items || []).map(item => {
      const matchedProd = products.find(p => p.id === item.product_id);
      
      let baseName = item.name;
      let size = "";
      let color = "";
      
      const variantMatch = item.name.match(/\(([^)]+)\)/);
      if (variantMatch) {
        baseName = item.name.replace(/\s*\([^)]+\)/, "");
        const details = variantMatch[1].split(",");
        details.forEach(d => {
          const parts = d.split(":");
          if (parts.length === 2) {
            const key = parts[0].trim().toLowerCase();
            const val = parts[1].trim();
            if (key === "size") size = val;
            if (key === "color") color = val;
          }
        });
      }
      
      const cartKey = `${item.product_id}-${size}-${color}`;
      
      return {
        id: item.product_id,
        name: baseName,
        qty: item.qty,
        rate: item.rate,
        gst_rate: item.gst_rate || 18,
        hsn: item.hsn || "0000",
        selected_size: size,
        selected_color: color,
        is_weighed: matchedProd?.is_weighed || false,
        image_url: matchedProd?.image_url || "",
        cartKey
      };
    });

    setCart(newCart);
    setEditingInvoiceId(invoice.id);
    setEditingInvoiceOriginalItems(JSON.parse(JSON.stringify(invoice.items || [])));

    const foundCustomer = customers.find(c => c.name === invoice.customer_name || c.phone === invoice.customer_phone);
    if (foundCustomer) {
      setSelectedCustomerId(foundCustomer.id);
    } else {
      setSelectedCustomerId("walk-in");
    }

    setBillingType(invoice.billing_type || "B2C");
    setDiscountValue(0); 
    setPaymentMethod(invoice.payment_method || "cash");
    
    toast.info(`️ Editing Invoice ${invoice.invoice_number}. Adjust items and checkout to save changes.`);
    setIsHistoryOpen(false);
    setSelectedHistoryInvoice(null);
  };

  const filteredInvoices = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return invoices.filter(inv => {
      // RBAC: Cashiers only see their own invoices
      if (user?.role !== "admin" && inv.cashier_code !== user?.user_code) return false;

      if (historyPayFilter !== "all" && inv.payment_method !== historyPayFilter) return false;
      if (historyDateFrom && inv.date < historyDateFrom) return false;
      if (historyDateTo && inv.date > historyDateTo) return false;
      const q = historySearchTerm.toLowerCase();
      if (q && !inv.invoice_number?.toLowerCase().includes(q) &&
          !inv.customer_name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [invoices, historySearchTerm, historyPayFilter, historyDateFrom, historyDateTo, user]);

  const filteredParkedCarts = useMemo(() => {
    return parkedCarts.filter(hold => {
      if (user?.role !== "admin" && hold.cashier_code !== user?.user_code) return false;
      const q = historySearchTerm.toLowerCase();
      if (!q) return true;
      const customer = customers.find(c => c.id === hold.customerId);
      const custName = customer?.name || "Walk-in Customer";
      return hold.label.toLowerCase().includes(q) || custName.toLowerCase().includes(q);
    });
  }, [parkedCarts, historySearchTerm, customers, user]);

  const todayInvoices = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return invoices.filter(inv => {
      if (user?.role !== "admin" && inv.cashier_code !== user?.user_code) return false;
      return inv.date === today && inv.status !== "returned";
    });
  }, [invoices, user]);

  const todayRevenue = useMemo(() => todayInvoices.reduce((s, inv) => s + (inv.grand_total || 0), 0), [todayInvoices]);

  const handleReturnInvoice = async (invoice) => {
    if (!window.confirm(`Return invoice ${invoice.invoice_number}? Stock will be restored.`)) return;
    setIsProcessingReturn(true);
    try {
      const targetBranchId =
        invoice.branchId ||
        invoice.branch_id ||
        activeBranchId ||
        null;

      // Restore stock for each item (BOTH: branch inventory + global product stock)
      for (const item of (invoice.items || [])) {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          // 1) Global catalog stock restore
          await base44.entities.Product.update(item.product_id, { stock: (prod.stock || 0) + item.qty });

          // 2) Branch inventory restore (Phase 1 requirement)
          if (targetBranchId) {
            try {
              await updateInventory(item.product_id, targetBranchId, +item.qty, 'pos_return');
            } catch (e) {
              console.error("Return: failed to restore branch inventory (best-effort).", e);
            }
          }
        }
      }

      await base44.entities.Invoice.update(invoice.id, { status: "returned" });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });

      // Best-effort: post return JournalEntry (double-entry reversal)
      try {
        const journalPayload = buildReturnJournalEntry({
          ...invoice,
          // buildReturnJournalEntry expects grand_total/tax_amount/invoice_number/date/customer_name
          grand_total: invoice.grand_total,
          tax_amount: invoice.tax_amount,
          invoice_number: invoice.invoice_number,
          date: invoice.date,
          customer_name: invoice.customer_name,
        });
        await accountingService.createJournalEntry(journalPayload);
      } catch (e) {
        console.error("Return: failed to post return JournalEntry (best-effort).", e);
      }

      setSelectedHistoryInvoice(null);
      toast.success(`Invoice ${invoice.invoice_number} returned. Stock restored.`);
    } catch (err) {
      toast.error("Return failed: " + err.message);
    } finally {
      setIsProcessingReturn(false);
    }
  };

  //  Voice Search 
  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error("Voice search not supported in this browser"); return; }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setSearchTerm(transcript);
      setShowSuggestions(true);
      toast.success(` "${transcript}"`);
    };
    recognition.onerror = (e) => { setIsListening(false); console.error("Voice recognition error:", e); toast.error(`Voice search error: ${e.error || e.message || 'unknown'}`); };
    recognition.onend = () => setIsListening(false);
    recognition.start();
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

      // Try native Web Share API with PDF file attachment
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
        // Fallback: download PDF + open WhatsApp with text
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

  // Instant PDF Download (no cloud upload)
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

  const businessType = shopSettings.business_type || "retail";
  const categories = useMemo(() => getCategoriesByShopType(businessType), [businessType]);

  const customCategories = useMemo(() => {
    const predefinedNames = new Set(categories.map(c => c.name.toLowerCase()));
    const productCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return productCategories.filter(cat => !predefinedNames.has(cat.toLowerCase()));
  }, [products, categories]);

  const posCategories = useMemo(() => [
    { name: "all", label: "All Items", hindi: "सभी वस्तुएं" },
    ...categories.map(c => ({ name: c.name, label: c.name, hindi: c.hindi })),
    ...customCategories.map(c => ({ name: c, label: c, hindi: "" }))
  ], [categories, customCategories]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category filter
      if (selectedCategory !== "all") {
        if (p.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.barcode && p.barcode.includes(searchTerm)) || 
                          (p.hsn && p.hsn.includes(searchTerm));
      return matchSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  // Verticals definitions
  const industryVerticals = [
    { id: "retail", label: "Retail", icon: Package, color: "from-blue-500/20 to-indigo-500/10 text-blue-400" },
    { id: "restaurant", label: "Restaurant", icon: Utensils, color: "from-orange-500/20 to-red-500/10 text-orange-400" },
    { id: "medical", label: "Medical", icon: Pill, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400" },
    { id: "grocery", label: "Grocery", icon: Store, color: "from-purple-500/20 to-pink-500/10 text-purple-400" },
    { id: "fashion", label: "Fashion", icon: Shirt, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400" }
  ];

  const totalCartQty = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <>
    <div className="h-screen max-h-screen bg-slate-100 dark:bg-[#070913] text-slate-900 dark:text-slate-100 flex flex-row font-sans select-none overflow-hidden">
      
      {/* Sidebar Injection */}
      <Sidebar mobile={false} defaultCollapsed={true} />

      {/* Main POS Container */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative h-full">
        {/* Dynamic Grid Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/5 dark:from-blue-900/10 via-background to-background pointer-events-none z-0" />

      {/* POS Top Header - Supermarket Style */}
      <header className="flex flex-row justify-between items-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 md:px-4 h-[35px] border-b border-border shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-1 w-full md:w-auto overflow-hidden shrink-0">
          <span className="text-sm md:text-base hidden sm:inline">🏪</span>
          <div className="flex items-center gap-1">
            <h1 className="text-[10px] md:text-xs font-black tracking-tight flex items-center gap-1.5 truncate">
              <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent tracking-wider text-[11px] md:text-sm">EasyBMT</span> 
              <span className="hidden sm:inline text-slate-800 dark:text-slate-200">POS</span>
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none font-bold text-[8px] h-3 px-1 ml-0.5">
                ACTIVE
              </Badge>
            </h1>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 hidden sm:flex ml-1">
              T: <strong className="text-slate-700 dark:text-slate-200 ml-0.5">{currentCounter?.toUpperCase() || "C-1"}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 justify-end ml-auto">
          {/* Header Barcode Scan Box */}
          <form onSubmit={(e) => {
            e.preventDefault();
            if (searchTerm.trim() && barcodeMode) {
              const matchedProduct = products.find(p => p.barcode === searchTerm || p.sku === searchTerm || p.hsn === searchTerm);
              if (matchedProduct) {
                handleProductClick(matchedProduct);
                setSearchTerm("");
              } else {
                toast.error("Product not found via Barcode scan.");
              }
            }
          }} className="relative w-20 sm:w-24 md:w-32 shrink-0">
            <Scan className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 absolute left-1.5 md:left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(e.target.value.length > 0); }}
              placeholder="Scan..."
              className="h-6 md:h-7 pl-4 sm:pl-5 md:pl-7 pr-1 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[8px] sm:text-[9px] md:text-[10px] font-mono rounded-md focus:ring-1 focus:ring-amber-500 w-full"
            />
          </form>

          {/* Billing Type Toggle Switch */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-850 h-6 md:h-7 items-center shrink-0">
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

          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="hidden md:flex bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 font-bold h-6 md:h-7 text-[10px] rounded gap-1 px-2 items-center"
          >
            <History className="w-3 h-3" />
            <span className="hidden sm:inline">History</span>
          </button>

          <Button 
            onClick={() => {
              if (isShiftActive) setIsShiftCloseDialogOpen(true);
              else setIsShiftOpenDialogOpen(true);
            }}
            className={cn("font-bold h-6 md:h-7 text-[10px] rounded gap-1 px-2 whitespace-nowrap", isShiftActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700")}
          >
            <span className="hidden sm:inline">{isShiftActive ? "🚪 End Shift" : "⏱️ Open Shift"}</span>
            <span className="sm:hidden">{isShiftActive ? "🚪" : "⏱️"}</span>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="relative flex-1 flex overflow-hidden z-10">
        
        {/* Left Side: Product catalog */}
        <div className={`flex-1 flex flex-col p-4 pb-20 md:pb-4 space-y-3 overflow-hidden ${mobileTab !== 'products' && 'hidden md:flex'}`}>
          
          {/* Default POS Layout applied from settings */}

          {/* Search bar + Filters */}
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {/* Smart Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <Input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(e.target.value.length > 0); }}
                onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={barcodeMode ? t("pos.scan_placeholder") : (language === "hi" ? "नाम, SKU या बारकोड खोजें..." : "Search by name, SKU, or barcode...")}
                className="pl-10 pr-16 h-11 rounded-2xl bg-white dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 shadow-sm focus:border-amber-500/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
              {/* Voice Search Button */}
              <button
                type="button"
                onClick={startVoiceSearch}
                title={isListening ? "Stop listening" : "Voice search"}
                className={cn(
                  "absolute right-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400"
                )}
              >
                {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              </button>
              {/* Clear Search */}
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(""); setShowSuggestions(false); searchInputRef.current?.focus(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {/* Product Auto-Suggestion Dropdown */}
              {showSuggestions && searchTerm.length > 0 && (() => {
                const suggestions = products.filter(p =>
                  p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.barcode?.includes(searchTerm) ||
                  p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.hsn?.includes(searchTerm)
                ).slice(0, 6);
                if (suggestions.length === 0) return null;
                return (
                  <div className="absolute top-12 left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {suggestions.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => { handleProductClick(p); setSearchTerm(""); setShowSuggestions(false); }}
                        className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.sku || p.barcode || p.hsn || ""}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">{p.rate}</p>
                          <p className="text-[10px] text-slate-400">Stock: {p.stock || 0}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Quick Add Product Button */}
            <button
              type="button"
              onClick={openQuickAdd}
              className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-11 px-2 sm:px-4 rounded-xl sm:rounded-2xl bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-black text-[10px] sm:text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">+</span>
            </button>

            {/* Layout Specific Context Headers */}
            {layout === "restaurant" && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-2xl shadow-sm">
                <Utensils className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t("pos.table")}</span>
                <SearchableSelect
                  className="w-24 h-8 border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs font-bold text-amber-500"
                  options={["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"]}
                  value={selectedTable}
                  onValueChange={handleTableSwitch}
                  placeholder="Select Table"
                  searchPlaceholder="Search table..."
                />
              </div>
            )}

            {layout === "fashion" && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-2xl shadow-sm">
                <Shirt className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t("pos.size")}</span>
                <SearchableSelect
                  className="w-24 h-8 border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs font-bold"
                  options={["S", "M", "L", "XL"]}
                  value={selectedSize}
                  onValueChange={setSelectedSize}
                  placeholder="Select Size"
                  searchPlaceholder="Search size..."
                />
              </div>
            )}
          </div>

          {/* Recently Sold Chips */}
          {recentlySold.length > 0 && !searchTerm && (
            <div className="flex gap-1.5 items-center overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Recent:
              </span>
              {recentlySold.slice(0, 6).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { const prod = products.find(p => p.id === item.id); if (prod) handleProductClick(prod); }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400 transition-all active:scale-95 whitespace-nowrap shadow-sm"
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}

          {/* Restaurant Table Management Bar */}
          {layout === "restaurant" && (
            <div className="flex gap-2 p-2 bg-[#0c0d19]/60 border border-orange-500/10 rounded-2xl overflow-x-auto scrollbar-none items-center shrink-0">
              <span className="text-[10px] font-black text-orange-400 uppercase pl-1.5 tracking-wider shrink-0">
                {language === "hi" ? "त्वरित टेबल प्रबंधन" : "Quick Tables"}:
              </span>
              <div className="flex gap-1.5">
                {["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"].map(table => {
                  const tableCart = tableCarts[table] || [];
                  const itemCount = tableCart.reduce((sum, item) => sum + item.qty, 0);
                  const isSelected = selectedTable === table;
                  const isOccupied = itemCount > 0;
                  return (
                    <button
                      key={table}
                      type="button"
                      onClick={() => handleTableSwitch(table)}
                      className={cn(
                        "relative px-4 py-2 text-xs font-black rounded-xl border flex flex-col items-center justify-center min-w-[55px] transition-all active:scale-95",
                        isSelected
                          ? "bg-gradient-to-r from-orange-400 to-amber-500 text-black border-transparent shadow-lg shadow-orange-500/10"
                          : isOccupied
                            ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                            : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900"
                      )}
                    >
                      <span>{table}</span>
                      {isOccupied && (
                        <span className={cn(
                          "absolute -top-1 -right-1 text-[8px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border font-mono",
                          isSelected ? "bg-black text-orange-450 border-orange-450" : "bg-red-500 text-white border-red-950"
                        )}>
                          {itemCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product grid scroll area */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoadingProd ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Loading items catalog...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-950/30 rounded-3xl border border-slate-200 dark:border-slate-800/80 border-dashed">
                <ShoppingCart className="w-12 h-12 mb-3 text-slate-400 animate-bounce" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No items match your search</p>
                <p className="text-xs text-slate-400 mt-1">Try typing a different keyword or scan a barcode</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-6">
                {filteredProducts.map((p) => {
                  const isLowStock = (p.stock || 0) <= (p.min_stock || 5);
                  const cartQty = cart.reduce((sum, item) => item.id === p.id ? sum + item.qty : sum, 0);
                  
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      className="group bg-white dark:bg-slate-900/40 hover:bg-amber-50/70 dark:hover:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 hover:border-amber-500/40 hover:shadow-md rounded-2xl p-3 flex flex-col justify-between min-h-[125px] transition-all duration-200 cursor-pointer relative shadow-sm dark:shadow-lg active:scale-95 animate-fade-in"
                    >
                      {/* CART BADGE */}
                      {cartQty > 0 && (
                        <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-md z-10 animate-fade-in border border-white/50 dark:border-slate-800">
                          {cartQty}
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-extrabold text-[13px] leading-tight text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate max-w-[85%]">
                            {p.name}
                          </span>
                          <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400">{p.rate}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">HSN: {p.hsn || "0000"} · GST: {p.gst_rate || 18}%</p>
                      </div>

                      {/* Specialized view styling */}
                      {layout === "medical" && (
                        <div className="mt-1 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded-md flex justify-between">
                          <span>Batch: {p.batch_no || "N/A"}</span>
                          <span>Exp: {p.expiry_date ? p.expiry_date.slice(5, 7) + "/" + p.expiry_date.slice(2, 4) : "N/A"}</span>
                        </div>
                      )}

                      {layout === "fashion" && (
                        <div className="mt-1 bg-cyan-500/10 text-cyan-400 text-[8px] font-bold px-2 py-0.5 rounded-md flex flex-wrap gap-1 justify-between">
                          <span>Sizes: {p.sizes?.length > 0 ? p.sizes.join(",") : "Standard"}</span>
                          {p.colors && <span className="truncate max-w-[60px]">Colors: {p.colors}</span>}
                        </div>
                      )}

                      {layout === "grocery" && p.is_weighed && (
                        <div className="mt-1 bg-purple-500/15 text-purple-400 text-[8px] font-black px-2 py-0.5 rounded-md flex gap-1 items-center justify-center">
                          <Scale className="w-2.5 h-2.5" />
                          <span>WEIGHT BASED (तौल अनुसार)</span>
                        </div>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex justify-between items-center">
                        <span className={`text-[10px] font-bold ${isLowStock ? "text-red-500 dark:text-red-400 font-extrabold" : "text-slate-500 dark:text-slate-400"}`}>
                          Stock: {p.stock || 0}
                        </span>
                        {isLowStock && (
                          <Badge variant="destructive" className="text-[8px] font-extrabold px-1.5 py-0 h-4 shrink-0 flex gap-0.5 items-center">
                            <AlertTriangle className="w-2 h-2" /> LOW
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active transaction & Cart */}
        <div className={`w-full md:w-[350px] lg:w-[380px] bg-white dark:bg-slate-950/80 backdrop-blur-md border-l border-slate-200 dark:border-slate-800/80 flex flex-col overflow-hidden shrink-0 h-full pb-[36px] md:pb-0 shadow-[-4px_0_20px_rgba(0,0,0,0.04)] dark:shadow-none ${mobileTab !== 'cart' && 'hidden md:flex'}`}>
          
          {/* Active Cart Customer Selection */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-800/80 space-y-2 bg-slate-50 dark:bg-slate-900/20 shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Customer Account
              </label>
              <button 
                onClick={() => {
                  setNewCustName("");
                  setNewCustPhone("");
                  setNewCustGstin("");
                  setNewCustContactPerson("");
                  setNewCustEmail("");
                  setNewCustAddress("");
                  setNewCustCity("");
                  setNewCustState("");
                  setNewCustPincode("");
                  setNewCustCreditLimit(0);
                  setNewCustCategory("Retail");
                  setNewCustNotes("");
                  setEditingCustomerId(null);
                  setIsCustomerModalOpen(true);
                }}
                className="text-xs font-black text-amber-500 hover:text-amber-600 flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> ADD NEW
              </button>
            </div>
            
            {/* Selected Customer View / Search Input */}
            {selectedCustomerId !== "walk-in" && selectedCustomer ? (
              <div className="bg-amber-400/5 hover:bg-amber-400/10 border border-amber-400/20 rounded flex justify-between items-center transition-all duration-150 h-[15px] px-1">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[11px] font-black text-amber-500 truncate leading-none">{selectedCustomer.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustName(selectedCustomer.name);
                      setNewCustPhone(selectedCustomer.phone || "");
                      setNewCustGstin(selectedCustomer.gstin || "");
                      setNewCustContactPerson(selectedCustomer.contact_person || "");
                      setNewCustEmail(selectedCustomer.email || "");
                      setNewCustAddress(selectedCustomer.address || "");
                      setNewCustCity(selectedCustomer.city || "");
                      setNewCustState(selectedCustomer.state || "");
                      setNewCustPincode(selectedCustomer.pincode || "");
                      setNewCustCreditLimit(selectedCustomer.credit_limit || 0);
                      setNewCustCategory(selectedCustomer.category || "Retail");
                      setNewCustNotes(selectedCustomer.notes || "");
                      setEditingCustomerId(selectedCustomer.id);
                      setIsCustomerModalOpen(true);
                    }}
                    className="text-slate-400 hover:text-blue-400 transition-colors flex-shrink-0"
                    title="Edit customer"
                  >
                    <User className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId("walk-in");
                      setCustSearchInput("");
                      setEditingCustomerId(null);
                    }}
                    className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Clear selection"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
                  <Input
                    value={custSearchInput}
                    onChange={(e) => {
                      setCustSearchInput(e.target.value);
                      setIsCustDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsCustDropdownOpen(false), 250)}
                    placeholder="Search name, WhatsApp, or GSTIN..."
                    className="pl-7 pr-2 rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 h-8 text-[11px] focus-visible:ring-1 focus-visible:ring-amber-400/50 shadow-sm"
                  />
                </div>

                {/* Instant Search Results Dropdown */}
                {isCustDropdownOpen && (
                  <div className="absolute top-11 left-0 right-0 z-50 bg-white dark:bg-[#0c0d16] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-[220px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-none">
                    {/* Walk-in Customer Option */}
                    <div
                      onClick={() => {
                        setSelectedCustomerId("walk-in");
                        setIsCustDropdownOpen(false);
                        setCustSearchInput("");
                      }}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/60 cursor-pointer flex justify-between items-center transition-colors duration-150"
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Walk-in Customer</span>
                      <span className="text-[9px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-bold uppercase">Default</span>
                    </div>

                    {/* Filtered Customer List */}
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setIsCustDropdownOpen(false);
                            setCustSearchInput("");
                          }}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/60 cursor-pointer flex flex-col gap-0.5 transition-colors duration-150"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{c.name}</span>
                            {c.phone && <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">{c.phone}</span>}
                          </div>
                          {c.gstin && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400/70 font-mono tracking-wider uppercase mt-0.5">{c.gstin}</span>
                          )}
                        </div>
                      ))
                    ) : (
                      custSearchInput.trim() !== "" && (
                        <div className="p-4 text-center space-y-2.5">
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">No customer matches "{custSearchInput}"</p>
                          <Button
                            type="button"
                            onClick={handleTriggerAddCustomerFromSearch}
                            className="w-full bg-amber-400 hover:bg-amber-505 text-slate-950 font-black text-xs py-1.5 h-9 rounded-xl flex gap-1 items-center justify-center shadow-md shadow-amber-400/5 active:scale-95 transition-all duration-100"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add "{custSearchInput}"
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}


          </div>

          {/* Parked Orders status */}
          {parkedCarts.length > 0 && (
            <div className="px-4 py-2 bg-amber-400/5 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[9px] font-black text-amber-400 uppercase shrink-0 tracking-wider">PARKED BILLS ({parkedCarts.length}):</span>
              {parkedCarts.map((item) => (
                <Badge
                  key={item.id}
                  onClick={() => handleResumeBill(item.id)}
                  className="cursor-pointer bg-slate-50 dark:bg-slate-900/80 hover:bg-amber-400/20 hover:text-amber-300 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9px] px-2 py-0.5 flex gap-1 items-center shrink-0 active:scale-95 duration-100"
                >
                  <RotateCcw className="w-2 h-2 text-amber-400" /> {item.label}
                </Badge>
              ))}
            </div>
          )}

          {/* Active Cart items list */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
            {editingInvoiceId && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex justify-between items-center gap-2 mb-2 shrink-0 animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="text-sm">️</span>
                  <div>
                    <p className="text-xs font-black text-amber-500 uppercase tracking-wide">Editing Bill</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold">
                      {invoices.find(inv => inv.id === editingInvoiceId)?.invoice_number || "INV-POS"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCart([]);
                    setEditingInvoiceId(null);
                    setEditingInvoiceOriginalItems([]);
                    setSelectedCustomerId("walk-in");
                    setDiscountValue(0);
                    toast.info("Edit mode cancelled. Cart cleared.");
                  }}
                  className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-100"
                >
                  Cancel
                </button>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2.5 opacity-20 text-amber-500 dark:text-amber-400" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Cart is empty</p>
                <p className="text-[10px] text-slate-400 mt-1">Scan barcodes or touch products on the left catalog grid</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.cartKey} className="bg-white dark:bg-slate-900/35 border border-slate-200 dark:border-slate-850 hover:border-amber-300/50 dark:hover:border-slate-800 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 flex gap-1.5 sm:gap-2 items-center justify-between transition-colors shadow-sm">
                  {/* Product Image */}
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm"
                      onError={(e) => { e.target.onerror = null; e.target.src=''; e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
                    />
                  ) : (
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-[10px] sm:text-xs text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                    <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                      {item.rate} × {item.qty} {item.is_weighed ? "KG" : "PCS"} · GST {item.gst_rate || 18}%
                    </p>
                    
                    {/* Render variant meta info */}
                    {(item.selected_size || item.selected_color) && (
                      <div className="flex gap-1 mt-0.5">
                        {item.selected_size && (
                          <Badge variant="outline" className="text-[7px] sm:text-[8px] px-1 py-0 border-cyan-500/30 text-cyan-400 font-bold">
                            SIZE: {item.selected_size}
                          </Badge>
                        )}
                        {item.selected_color && (
                          <Badge variant="outline" className="text-[7px] sm:text-[8px] px-1 py-0 border-blue-500/30 text-blue-400 font-bold">
                            COLOR: {item.selected_color}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Quantity / Weight Counter Control */}
                  {item.is_weighed ? (
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <Input
                        type="number"
                        step="0.05"
                        value={item.qty}
                        onChange={(e) => {
                          const val = parseFloat(parseFloat(e.target.value).toFixed(3)) || 0;
                          setCart(prev => prev.map(c => c.cartKey === item.cartKey ? { ...c, qty: val } : c));
                        }}
                        className="w-12 sm:w-16 h-6 sm:h-7 text-center font-mono text-[10px] sm:text-xs rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                      />
                      <span className="text-[8px] sm:text-[10px] font-bold text-purple-400 mr-0.5 sm:mr-1">KG</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeFromCart(item.cartKey)}
                        className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg text-slate-500 hover:text-red-400 shrink-0"
                      >
                        <Trash2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 sm:gap-1.5">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => updateQty(item.cartKey, -1)}
                        className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 shrink-0"
                      >
                        <Minus className="w-2 h-2 sm:w-3 sm:h-3" />
                      </Button>
                      <span className="text-[10px] sm:text-xs font-black w-4 sm:w-5 text-center font-mono text-slate-800 dark:text-slate-200">{item.qty}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => updateQty(item.cartKey, 1)}
                        className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 shrink-0"
                      >
                        <Plus className="w-2 h-2 sm:w-3 sm:h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeFromCart(item.cartKey)}
                        className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg text-slate-500 hover:text-red-400 shrink-0"
                      >
                        <Trash2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={cartEndRef} className="h-10" />
          </div>

          {/* Checkout & Pricing Controls */}
          {/* Checkout & Pricing Controls */}
          <div className="p-2 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 flex flex-col gap-2 shrink-0">
            
            {/* Discounter selector */}
            <div className="bg-white dark:bg-slate-900/50 px-2 rounded-lg border border-slate-200 dark:border-slate-850/50 flex gap-2 items-center justify-between shadow-sm h-[20px] shrink-0">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">Discount Apply</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  disabled={!canDiscount}
                  className="h-5 w-[150px] rounded bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-center font-mono text-[10px] text-slate-900 dark:text-slate-100 px-1 disabled:opacity-50 disabled:bg-slate-100"
                />
                <button
                  onClick={() => setDiscountType(prev => prev === 'percent' ? 'flat' : 'percent')}
                  disabled={!canDiscount}
                  className="bg-amber-400/10 text-amber-500 border border-amber-400/20 text-[10px] font-bold h-5 px-1.5 rounded hover:bg-amber-400/20 transition-colors leading-none disabled:opacity-50 disabled:hover:bg-amber-400/10"
                >
                  {discountType === 'percent' ? '%' : ''}
                </button>
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
                <span>{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400 leading-none">
                <span>Tax CGST + SGST</span>
                <span>{cartTax.toFixed(2)}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-red-500 dark:text-red-400 leading-none">
                  <span>Discount</span>
                  <span>-{discountType === 'percent' ? `${discountValue}%` : `${discountValue}`}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-black text-amber-500 dark:text-amber-400 pt-1 border-t border-slate-200 dark:border-slate-850 leading-none mt-1">
                <span className="text-[14px]">कुल बिल राशि</span>
                <span className="text-[14px]">{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Pay buttons */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <Button 
                variant="outline" 
                onClick={layout === "restaurant" ? handleKotSend : handleHoldBill} 
                className="h-[36px] rounded-[8px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-200 font-bold text-[13px] text-slate-700 shadow-sm leading-none"
              >
                {layout === "restaurant" ? (language === "hi" ? "के.ओ.टी भेजें" : "Send KOT") : "बिल पार्क करें"}
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={isCheckingOut || cart.length === 0}
                className="h-[36px] rounded-[8px] bg-amber-400 hover:bg-amber-500 font-black text-slate-950 text-[13px] tracking-wider flex items-center justify-center shadow-md active:scale-95 transition-all leading-none"
              >
                <Zap className="w-3.5 h-3.5 text-slate-950 mr-1" /> भुगतान और प्रिंट (F4)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Mobile Bottom Navigation Bar - Supermarket Style */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-800/50 px-2 flex justify-around items-end pb-1.5 z-30 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] h-[46px]">
        {/* Home/Dashboard */}
        <Link
          to="/"
          className="flex flex-col items-center justify-end flex-1 gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all h-full"
        >
          <Store className="w-4 h-4 mb-0.5" />
          <span className="text-[8px] font-bold uppercase tracking-wider leading-none">Home</span>
        </Link>

        {/* POS Catalog */}
        <button
          type="button"
          onClick={() => setMobileTab("products")}
          className={`flex flex-col items-center justify-end flex-1 gap-1 transition-all h-full ${
            mobileTab === "products" ? "text-blue-600 dark:text-blue-400 font-black" : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          }`}
        >
          <Package className={`w-4 h-4 mb-0.5 transition-transform ${mobileTab === "products" ? "scale-110" : ""}`} />
          <span className="text-[8px] font-bold uppercase tracking-wider leading-none">Catalog</span>
        </button>

        {/* Fast Scan */}
        <button
          type="button"
          onClick={() => {
            if (!barcodeMode) {
              setBarcodeMode(true);
              toast.info("Barcode Mode ENABLED");
            }
            setMobileTab("products");
            setTimeout(() => {
              searchInputRef.current?.focus();
            }, 50);
          }}
          className="flex flex-col items-center justify-end flex-1 relative transition-all h-full"
        >
          <div className={`absolute bottom-[16px] w-8 h-8 rounded-full ${barcodeMode ? 'bg-amber-500 shadow-amber-500/40' : 'bg-blue-600 shadow-blue-500/40'} text-white flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all`}>
            <Scan className="w-4 h-4" />
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wider leading-none mt-auto">Scan</span>
        </button>

        {/* Cart */}
        <button
          type="button"
          onClick={() => setMobileTab("cart")}
          className={`flex flex-col items-center justify-end flex-1 gap-1 relative transition-all h-full ${
            mobileTab === "cart" ? "text-blue-600 dark:text-blue-400 font-black" : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          }`}
        >
          <div className="relative mb-0.5">
            <ShoppingCart className={`w-4 h-4 transition-transform ${mobileTab === "cart" ? "scale-110" : ""}`} />
            {totalCartQty > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-slate-900 animate-pulse">
                {totalCartQty}
              </span>
            )}
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wider leading-none">Cart</span>
        </button>

        {/* History */}
        <button
          type="button"
          onClick={() => setIsHistoryOpen(true)}
          className="flex flex-col items-center justify-end flex-1 gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all h-full"
        >
          <History className="w-4 h-4 mb-0.5" />
          <span className="text-[8px] font-bold uppercase tracking-wider leading-none">History</span>
        </button>

        {/* End Shift */}
        <button
          type="button"
          onClick={() => setIsShiftCloseDialogOpen(true)}
          className="flex flex-col items-center justify-end flex-1 gap-1 text-rose-500 dark:text-rose-400 hover:text-rose-600 transition-all h-full"
        >
          <Power className="w-4 h-4 mb-0.5" />
          <span className="text-[8px] font-bold uppercase tracking-wider leading-none">End Shift</span>
        </button>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className={`${billingType === 'B2B' ? 'max-w-lg' : 'sm:max-w-[425px]'} w-full h-full sm:h-auto max-h-[90vh] min-h-0 overflow-x-hidden bg-white dark:bg-[#0f111e] border-slate-300 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200`}>
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center text-slate-900 dark:text-slate-100">
              <User className="w-5 h-5 text-amber-500 dark:text-amber-400" /> {editingCustomerId ? (billingType === 'B2B' ? "Edit B2B Customer" : "Edit Customer") : (billingType === 'B2B' ? "Register B2B Customer" : "Register Customer")}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              {editingCustomerId ? (billingType === 'B2B' ? "Update company and tax details for this B2B account." : "Update contact details for this account.") : (billingType === 'B2B' ? "Fill company name, GSTIN, and contact details to register this B2B account immediately." : "Fill name and contact details to register this account immediately.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="flex flex-col gap-4 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
              {billingType === "B2B" ? (
                <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("customers.business_name")} *</Label>
                  <Input 
                    placeholder={t("customers.business_name")} 
                    value={newCustName} 
                    onChange={e => setNewCustName(e.target.value)} 
                    className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("customers.contact_person")}</Label>
                  <Input 
                    placeholder="Mr. Ramesh Kumar" 
                    value={newCustContactPerson} 
                    onChange={e => setNewCustContactPerson(e.target.value)} 
                    className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("common.phone")}</Label>
                    <Input 
                      placeholder="9876543210" 
                      value={newCustPhone} 
                      onChange={e => setNewCustPhone(e.target.value)} 
                      className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("common.email")}</Label>
                    <Input 
                      placeholder="email@example.com" 
                      value={newCustEmail} 
                      onChange={e => setNewCustEmail(e.target.value)} 
                      className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("customers.gstin")}</Label>
                  <Input 
                    placeholder="15-char GSTIN" 
                    value={newCustGstin} 
                    onChange={e => setNewCustGstin(e.target.value)} 
                    className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("customers.address")}</Label>
                  <Input 
                    placeholder="Shop No, Street" 
                    value={newCustAddress} 
                    onChange={e => setNewCustAddress(e.target.value)} 
                    className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("customers.city")}</Label>
                    <Input 
                      placeholder="City" 
                      value={newCustCity} 
                      onChange={e => setNewCustCity(e.target.value)} 
                      className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("customers.state")}</Label>
                    <SearchableSelect
                      options={INDIAN_STATES}
                      value={newCustState}
                      onValueChange={v => setNewCustState(v)}
                      placeholder={t("customers.state")}
                      searchPlaceholder={t("common.search")}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("customers.pincode")}</Label>
                    <Input 
                      placeholder="110001" 
                      value={newCustPincode} 
                      onChange={e => setNewCustPincode(e.target.value)} 
                      className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("customers.credit_limit")} </Label>
                    <Input 
                      type="number" 
                      value={newCustCreditLimit} 
                      onChange={e => setNewCustCreditLimit(Number(e.target.value))} 
                      className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("customers.category")}</Label>
                    <SearchableSelect
                      options={["Retail", "Wholesale", "Distributor", "Other"]}
                      value={newCustCategory}
                      onValueChange={v => setNewCustCategory(v)}
                      placeholder={t("customers.category")}
                      searchPlaceholder={t("common.search")}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t("customers.notes")}</Label>
                  <Input 
                    placeholder="..." 
                    value={newCustNotes} 
                    onChange={e => setNewCustNotes(e.target.value)} 
                    className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-bold text-slate-700 dark:text-slate-300">Customer Name *</Label>
                  <Input 
                    id="name" 
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="Type customer full name"
                    className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">WhatsApp Number</Label>
                  <Input 
                    id="phone" 
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="+91 99999 99999"
                    className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gstin" className="text-xs font-bold text-slate-700 dark:text-slate-300">GSTIN (Optional)</Label>
                  <Input 
                    id="gstin" 
                    value={newCustGstin}
                    onChange={(e) => setNewCustGstin(e.target.value)}
                    placeholder="27AAAAA0000A1Z5"
                    className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                </div>
              </>
            )}
            </div>
            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCustomerModalOpen(false)} className="rounded-xl border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300">Cancel</Button>
              <Button type="submit" className="bg-amber-400 hover:bg-amber-505 text-slate-950 font-black rounded-xl">Save & Select</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* INVOICE PRINT PREVIEWS (B2B vs B2C) */}
      {latestInvoice?.billing_type === "B2B" ? (
        <InvoicePrintPreview 
          open={isPrintOpen} 
          onOpenChange={setIsPrintOpen} 
          invoice={latestInvoice} 
          shopSettings={shopSettings} 
        />
      ) : (
        /* THERMAL RECEIPT PRINT MODAL FOR B2C */
        <Dialog open={isPrintOpen} onOpenChange={setIsPrintOpen}>
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
               <div dangerouslySetInnerHTML={{ __html: generateThermalHTML(latestInvoice, shopSettings, selectedPrintSize) }} />
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
                          console.error(`Offline print sync failed for job (invoice: ${job.invoice?.invoice_number}):`, e);
                          job.lastError = e.message;
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
            {/*  Sticky footer  Close / WhatsApp / PDF / Print  */}
            <div className="flex flex-wrap gap-2 p-4 pt-3 border-t border-gray-100 print:hidden shrink-0 bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPrintOpen(false)}
                className="rounded-xl text-slate-700 border-gray-300 h-10 px-3 flex-1 text-xs font-bold min-w-[60px]"
              >
                 Close
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  editInvoiceInCart(latestInvoice);
                  setIsPrintOpen(false);
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
      )}



      {/* GROCERY WEIGHT ENTRY MODAL */}
      <Dialog open={isWeightDialogOpen} onOpenChange={setIsWeightDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-[#0c0d19] border-purple-500/20 text-slate-900 dark:text-slate-100 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center text-purple-600 dark:text-purple-400 font-extrabold text-lg">
              <Scale className="w-5 h-5 text-purple-600 dark:text-purple-400" /> {language === "hi" ? "तौल/मात्रा दर्ज करें" : "Weight / Quantity Entry"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === "hi" ? "इस मद के लिए किलोग्राम में वजन दर्ज करें" : "Enter weight in Kg for this weighed item."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWeightSubmit} className="space-y-6 pt-2">
            <div className="text-center bg-slate-50 dark:bg-[#070913] p-4 rounded-2xl border border-purple-500/10">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">{weighedProduct?.name}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold mt-1">{weighedProduct?.rate} / KG</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t("pos.weight_label")}</Label>
              <div className="flex gap-2 items-center">
                <Input 
                  id="weight"
                  type="number" 
                  step="0.001"
                  min="0.005"
                  value={weightInput}
                  onChange={(e) => setWeightInput(parseFloat(e.target.value) || 0)}
                  className="rounded-xl border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-[#070913] text-slate-900 dark:text-slate-100 text-center font-mono text-xl h-12 focus-visible:ring-1 focus-visible:ring-purple-500/50"
                  autoFocus
                  required
                />
                <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">KG</span>
              </div>
            </div>
            
            {/* Quick weights presets */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {[0.1, 0.25, 0.5, 1.0, 2.0, 5.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setWeightInput(preset)}
                  className={cn(
                    "py-1.5 text-[10px] font-black rounded-lg border transition-all active:scale-95",
                    weightInput === preset 
                      ? "bg-purple-500 text-white dark:text-black border-purple-500" 
                      : "bg-slate-50 dark:bg-[#070913] border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#070913]/85"
                  )}
                >
                  {preset >= 1 ? `${preset} kg` : `${preset * 1000}g`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setWeightInput(prev => parseFloat((prev + 0.1).toFixed(3)))}
                className="py-1.5 text-[10px] font-black rounded-lg border bg-slate-50 dark:bg-[#070913] border-slate-300 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 active:scale-95"
              >
                +100g
              </button>
              <button
                type="button"
                onClick={() => setWeightInput(prev => parseFloat((prev + 0.25).toFixed(3)))}
                className="py-1.5 text-[10px] font-black rounded-lg border bg-slate-50 dark:bg-[#070913] border-slate-300 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 active:scale-95"
              >
                +250g
              </button>
              <button
                type="button"
                onClick={() => setWeightInput(prev => parseFloat((prev + 0.5).toFixed(3)))}
                className="py-1.5 text-[10px] font-black rounded-lg border bg-slate-50 dark:bg-[#070913] border-slate-300 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 active:scale-95"
              >
                +500g
              </button>
              <button
                type="button"
                onClick={() => setWeightInput(prev => parseFloat((prev + 1.0).toFixed(3)))}
                className="py-1.5 text-[10px] font-black rounded-lg border bg-slate-50 dark:bg-[#070913] border-slate-300 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 active:scale-95"
              >
                +1kg
              </button>
            </div>

            <DialogFooter className="pt-2 gap-2 flex flex-row">
              <Button type="button" variant="outline" onClick={() => setIsWeightDialogOpen(false)} className="rounded-xl border-slate-800 text-slate-300 flex-1">Cancel</Button>
              <Button type="submit" className="bg-purple-500 hover:bg-purple-600 text-black font-black rounded-xl flex-1 shadow-md shadow-purple-500/10">Add (जोड़ें)</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* FASHION VARIANTS SELECTION MODAL */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-[#0c0d19] border-cyan-500/20 text-slate-900 dark:text-slate-100 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center text-cyan-600 dark:text-cyan-400 font-extrabold text-lg">
              <Shirt className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> {language === "hi" ? "वेरिएंट चुनें" : "Select Variants"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === "hi" ? "उत्पाद के आकार और रंग का चयन करें" : "Pick size and color variant details."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVariantSubmit} className="space-y-6 pt-2">
            <div className="text-center bg-slate-50 dark:bg-[#070913] p-4 rounded-2xl border border-cyan-500/10">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">{variantProduct?.name}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold mt-1">{variantProduct?.rate}</p>
            </div>

            {/* Size Options */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Size (साइज़)</Label>
              <div className="flex gap-2 flex-wrap">
                {(variantProduct?.sizes?.length > 0 ? variantProduct.sizes : ["S", "M", "L", "XL"]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setVariantSize(size)}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-black rounded-xl border transition-all active:scale-95",
                      variantSize === size 
                        ? "bg-cyan-500 text-white dark:text-black border-cyan-500" 
                        : "bg-slate-50 dark:bg-[#070913] border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#070913]/85"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Options */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Color (रंग)</Label>
              <div className="flex gap-2 flex-wrap">
                {(variantProduct?.colors ? variantProduct.colors.split(",").map(c => c.trim()) : ["Default", "Black", "Blue", "White"]).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setVariantColor(color)}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-black rounded-xl border transition-all active:scale-95",
                      variantColor === color 
                        ? "bg-cyan-500 text-white dark:text-black border-cyan-500" 
                        : "bg-slate-50 dark:bg-[#070913] border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#070913]/85"
                    )}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 flex flex-row">
              <Button type="button" variant="outline" onClick={() => setIsVariantDialogOpen(false)} className="rounded-xl border-slate-800 text-slate-300 flex-1">Cancel</Button>
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-black font-black rounded-xl flex-1 shadow-md shadow-cyan-500/10">Add (जोड़ें)</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    {/* End Main POS Container */}
    </div>

    {/* 
        QUICK ADD PRODUCT  Full-featured slide-over dialog
     */}
    <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
      <DialogContent className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#0d0f1e] border-slate-200 dark:border-slate-800 rounded-3xl text-slate-900 dark:text-slate-100 p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#0d0f1e] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-black text-base text-slate-900 dark:text-slate-100">Quick Add Product</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Auto-saved to Inventory  SKU & Barcode generated</p>
            </div>
          </div>
          <button onClick={() => setIsQuickAddOpen(false)} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Product Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">Product Name *</Label>
            <Input
              value={quickAddForm.name}
              onChange={e => {
                const name = e.target.value;
                setQuickAddForm(prev => ({
                  ...prev,
                  name,
                  sku: generateSKU(name)
                }));
              }}
              placeholder="e.g. Basmati Rice 5kg, Paracetamol 500mg"
              className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold"
              autoFocus
            />
          </div>

          {/* SKU + Barcode Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SKU (Auto)</Label>
              <Input
                value={quickAddForm.sku}
                onChange={e => setQuickAddForm(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="Auto-generated"
                className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Barcode (Auto)</Label>
              <div className="flex gap-1.5">
                <Input
                  value={quickAddForm.barcode}
                  onChange={e => setQuickAddForm(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Auto-generated"
                  className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setQuickAddForm(prev => ({ ...prev, barcode: generateBarcode() }))}
                  className="h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-600 transition-colors shrink-0"
                  title="Regenerate barcode"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Buy Price ()</Label>
              <Input
                type="number"
                value={quickAddForm.purchase_rate}
                onChange={e => setQuickAddForm(prev => ({ ...prev, purchase_rate: e.target.value }))}
                placeholder="0.00"
                className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Sell Price () *</Label>
              <Input
                type="number"
                value={quickAddForm.rate}
                onChange={e => setQuickAddForm(prev => ({ ...prev, rate: e.target.value, mrp: e.target.value }))}
                placeholder="0.00"
                className="h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-slate-900 dark:text-slate-100 font-mono text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">MRP ()</Label>
              <Input
                type="number"
                value={quickAddForm.mrp}
                onChange={e => setQuickAddForm(prev => ({ ...prev, mrp: e.target.value }))}
                placeholder="0.00"
                className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
              />
            </div>
          </div>

          {/* Stock + Unit + GST + HSN */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock Qty</Label>
              <Input
                type="number"
                value={quickAddForm.stock}
                onChange={e => setQuickAddForm(prev => ({ ...prev, stock: e.target.value }))}
                placeholder="0"
                className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unit</Label>
              <Select value={quickAddForm.unit} onValueChange={v => setQuickAddForm(prev => ({ ...prev, unit: v }))}>
                <SelectTrigger className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["PCS","KG","GM","LTR","ML","BOX","PKT","BAG","STRIP","TAB","BOTTLE","MTR","PAIR"].map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">GST %</Label>
              <Select value={quickAddForm.gst_rate} onValueChange={v => setQuickAddForm(prev => ({ ...prev, gst_rate: v }))}>
                <SelectTrigger className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["0","5","12","18","28"].map(r => (
                    <SelectItem key={r} value={r}>{r}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">HSN Code</Label>
              <Input
                value={quickAddForm.hsn}
                onChange={e => setQuickAddForm(prev => ({ ...prev, hsn: e.target.value }))}
                placeholder="e.g. 1006"
                className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</Label>
            <Input
              value={quickAddForm.category}
              onChange={e => setQuickAddForm(prev => ({ ...prev, category: e.target.value }))}
              placeholder="e.g. Grocery, Medicine, Electronics"
              className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              list="qa-category-list"
            />
            <datalist id="qa-category-list">
              {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Medical Fields */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Batch No</Label>
              <Input
                value={quickAddForm.batch_no}
                onChange={e => setQuickAddForm(prev => ({ ...prev, batch_no: e.target.value }))}
                placeholder="Optional"
                className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expiry Date</Label>
              <Input
                type="date"
                value={quickAddForm.expiry_date}
                onChange={e => setQuickAddForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Manufacturer</Label>
              <Input
                value={quickAddForm.manufacturer}
                onChange={e => setQuickAddForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                placeholder="Optional"
                className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</Label>
            <textarea
              value={quickAddForm.description}
              onChange={e => setQuickAddForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="Optional product notes"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product Image</Label>
            <div className="flex gap-3 items-center">
              {quickAddForm.image_url ? (
                <img src={quickAddForm.image_url} alt="Product" className="w-16 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="space-y-1">
                <button
                  type="button"
                  disabled={imageUploading}
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {imageUploading ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                  ) : (
                    <><Camera className="w-3.5 h-3.5" /> {quickAddForm.image_url ? "Change Image" : "Upload Image"}</>
                  )}
                </button>
                <p className="text-[10px] text-slate-400">JPG, PNG up to 5MB</p>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleQuickAddImageUpload} />
              </div>
            </div>
          </div>

          {/* Barcode Preview */}
          {quickAddForm.barcode && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center gap-2">
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Barcode Preview</p>
              <div className="flex flex-col items-center gap-1">
                <div className="h-10 w-44 bg-white dark:bg-white flex gap-px items-stretch p-1 justify-center border border-slate-200 rounded">
                  {Array.from({ length: 32 }, (_, i) => {
                    const code = quickAddForm.barcode.charCodeAt(i % quickAddForm.barcode.length) + i;
                    return <div key={i} className="bg-black" style={{ width: code % 3 === 0 ? "3px" : code % 3 === 1 ? "1px" : "2px" }} />;
                  })}
                </div>
                <span className="text-[11px] tracking-widest text-slate-700 dark:text-slate-300 font-mono font-bold">{quickAddForm.barcode}</span>
                {quickAddForm.name && <span className="text-[10px] text-slate-500">{quickAddForm.name}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-[#0d0f1e] border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsQuickAddOpen(false)}
            className="flex-1 rounded-xl h-11 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSavingProduct || !quickAddForm.name || !quickAddForm.rate}
            onClick={() => handleQuickAddSave(false)}
            className="flex-1 rounded-xl h-11 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-black text-xs gap-2 shadow-md disabled:opacity-50"
          >
            {isSavingProduct ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save to Inventory
          </Button>
          <Button
            type="button"
            disabled={isSavingProduct || !quickAddForm.name || !quickAddForm.rate}
            onClick={() => handleQuickAddSave(true)}
            className="flex-1 rounded-xl h-11 bg-amber-500 hover:bg-amber-600 text-white dark:text-slate-950 font-black text-xs gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Save & Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>


    {/*  OPEN CASHIER SHIFT DIALOG  */}
    <Dialog open={isShiftOpenDialogOpen} onOpenChange={setIsShiftOpenDialogOpen}>
      <DialogContent className="max-w-md bg-white dark:bg-[#0d0f1e] border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-rose-500" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
             {t("pos.open_shift") || "Open Cashier Shift"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {language === "hi"
              ? "अपना नाम चुनें और काउंटर सक्रिय करें। काउंटर इस डिवाइस पर याद रहेगा।"
              : "Select your name to activate your register. Your counter is saved on this device."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {/* Staff Quick Select - from Settings */}
          {staffList.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                 {language === "hi" ? "स्टाफ से चुनें" : "Select from Staff"}
              </p>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {staffList.map((member) => {
                  const isSelected = openCashierInput === member.name && openCounterInput === member.counter;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setOpenCashierInput(member.name);
                        setOpenCounterInput(member.counter);
                        setOpenShiftInput(member.shift);
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150",
                        isSelected
                          ? "bg-rose-50 dark:bg-rose-500/10 border-rose-400/50 dark:border-rose-500/40 shadow-md"
                          : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-rose-50/50 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                        {member.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{member.name}</p>
                        <p className="text-[10px] text-slate-500">
                          ️ {member.counter} &nbsp;·&nbsp;
                          {member.shift === "Morning" ? "" : member.shift === "Afternoon" ? "️" : member.shift === "Night" ? "" : ""} {member.shift}
                        </p>
                      </div>
                      {isSelected && <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shrink-0"><span className="text-white text-[10px] font-black"></span></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manual fallback */}
          <div className={cn("space-y-3 pt-3", staffList.length > 0 && "border-t border-slate-100 dark:border-slate-800")}>
            {staffList.length > 0 && (
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                ️ {language === "hi" ? "या मैन्युअल दर्ज करें" : "Or enter manually"}
              </p>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                 {t("pos.cashier_name") || "Cashier Name"}
              </Label>
              <Input
                value={openCashierInput}
                onChange={(e) => setOpenCashierInput(e.target.value)}
                placeholder="e.g. Suresh Kumar"
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-amber-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ️ {t("pos.counter_number") || "Counter / Register"}
              </Label>
              <Input
                value={openCounterInput}
                onChange={(e) => setOpenCounterInput(e.target.value)}
                placeholder="e.g. Counter A"
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-amber-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                 {t("pos.starting_cash") || "Starting Drawer Cash"} ()
              </Label>
              <Input
                type="number"
                value={openStartingCashInput}
                onChange={(e) => setOpenStartingCashInput(e.target.value)}
                placeholder="e.g. 1000"
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsShiftOpenDialogOpen(false)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={handleOpenShift}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl gap-2"
          >
             {t("pos.open_shift") || "Start Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>


    {/*  CLOSE CASHIER SHIFT DIALOG  */}
    <Dialog open={isShiftCloseDialogOpen} onOpenChange={setIsShiftCloseDialogOpen}>
      <DialogContent className="max-w-md bg-white dark:bg-[#0d0f1e] border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-emerald-500" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
             {t("pos.close_shift") || "Close Cashier Shift"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {language === "hi" 
              ? "शिफ्ट बंद करने के लिए कैश रजिस्टर का हिसाब करें और कुल गिने गए नकद को दर्ज करें।"
              : "Reconcile shift records. Enter the final physical counted cash in the drawer to calculate shift discrepancies."}
          </DialogDescription>
        </DialogHeader>

        {/* Shift stats breakdown */}
        <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800/80 my-4 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">{t("pos.cashier_name") || "Cashier"}:</span>
            <span className="font-bold">{currentCashier} ({currentCounter})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t("pos.starting_cash") || "Starting Cash"}:</span>
            <span className="font-bold font-mono">{startingDrawerCash.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">
              {language === "hi" ? "कुल बिल" : "Bills Logged"}:
            </span>
            <span className="font-bold">{shiftInvoices.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">
              {language === "hi" ? "अपेक्षित कैश (अनुमानित)" : "Expected Cash in Drawer"}:
            </span>
            <span className="font-black text-amber-500 font-mono">
              {(() => {
                const netCash = shiftInvoices.reduce((sum, inv) => {
                  if (inv.payment_method === "cash") return sum + inv.grand_total;
                  if (inv.payment_method === "split" && inv.payment_split?.cash) return sum + inv.payment_split.cash;
                  return sum;
                }, 0);
                return (startingDrawerCash + netCash).toLocaleString("en-IN");
              })()}
            </span>
          </div>
        </div>

        <div className="space-y-2 my-4">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
             {language === "hi" ? "गिना गया कुल कैश (नकद)" : "Actual Physical Counted Cash"} ()
          </Label>
          <Input
            type="number"
            value={physicalCashCounted}
            onChange={(e) => setPhysicalCashCounted(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-amber-500/50"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => setIsShiftCloseDialogOpen(false)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button 
            type="button" 
            onClick={() => handleCloseShift(physicalCashCounted)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
          >
             {t("pos.close_shift") || "End Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>


    {/* 
        BILLING HISTORY  Full-height slide-over panel
         */}
    <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
      <DialogContent showClose={false} className="!w-full h-[100dvh] !max-h-screen !rounded-none md:!w-[calc(100%-1.5rem)] md:h-auto md:!max-h-[95vh] md:!rounded-3xl max-w-2xl overflow-hidden flex flex-col bg-white dark:bg-[#0d0f1e] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-0 border-x-0 md:border-x">
        {/* Header */}
        <div className="bg-white dark:bg-[#0d0f1e] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <History className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-black text-base text-slate-900 dark:text-slate-100">{t("pos.billing_history")}</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{t("pos.billing_history_subtitle")}</p>
            </div>
          </div>
          <button onClick={() => { setIsHistoryOpen(false); setSelectedHistoryInvoice(null); setSelectedParkedCart(null); }} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area with Scrollable Left Panel */}
        <div className="flex-1 overflow-hidden flex">
          
          {/* Left Panel: Stats + Filters + List */}
          <div className={cn(
            "overflow-y-auto flex-col h-full bg-white dark:bg-[#0d0f1e] relative",
            selectedHistoryInvoice ? "w-2/5 hidden md:flex border-r border-slate-200 dark:border-slate-800" : "w-full flex"
          )}>
            
            {/* Sub-Tabs Selector */}
            <div className="px-6 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setHistorySubTab("invoices"); setSelectedHistoryInvoice(null); setSelectedParkedCart(null); }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  historySubTab === "invoices"
                    ? "bg-slate-900 dark:bg-slate-800 text-white shadow-sm border border-slate-700/50"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                 {t("pos.invoices_log")}
              </button>
              <button
                type="button"
                onClick={() => { setHistorySubTab("parked"); setSelectedHistoryInvoice(null); setSelectedParkedCart(null); }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
                  historySubTab === "parked"
                    ? "bg-slate-900 dark:bg-slate-800 text-white shadow-sm border border-slate-700/50"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                ️ {t("pos.parked_bills")}
                {parkedCarts.length > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {parkedCarts.length}
                  </span>
                )}
              </button>
            </div>

            {/* Today Stats Strip */}
            <div className="px-6 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-b border-amber-200/50 dark:border-amber-800/30 flex items-center gap-6 shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">{t("pos.today_bills")}</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{todayInvoices.length}</p>
                </div>
              </div>
              <div className="w-px h-8 bg-amber-200 dark:bg-amber-800/50" />
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t("pos.today_revenue")}</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{todayRevenue.toFixed(2)}</p>
                </div>
              </div>
              <div className="w-px h-8 bg-amber-200 dark:bg-amber-800/50" />
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">{t("pos.total_bills")}</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{invoices.length}</p>
                </div>
              </div>
            </div>

            {/* Smart Filters (Sticky!) */}
            <div className="sticky top-0 z-20 px-6 py-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-white/95 dark:bg-[#0d0f1e]/95 backdrop-blur-md shadow-sm shrink-0">
              <div className="flex items-center justify-between mb-0.5">
                 <span className="text-[9px] font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
                    <Filter className="w-3 h-3" /> Smart Search & Filter
                 </span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={historySearchTerm}
                    onChange={e => setHistorySearchTerm(e.target.value)}
                    placeholder={t("pos.search_invoice_placeholder")}
                    className="pl-8 h-9 rounded-xl bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-xs focus:bg-white dark:focus:bg-slate-900 transition-colors"
                  />
                </div>
                <Select value={historyPayFilter} onValueChange={setHistoryPayFilter}>
                  <SelectTrigger className="h-9 w-28 rounded-xl bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder={t("pos.payment_method") || "Payment"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all") || "All Methods"}</SelectItem>
                    <SelectItem value="cash">{t("pos.cash")}</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="split">Split</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <Input type="date" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} className="h-7 w-36 rounded-lg bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-[11px]" />
                <span className="text-[10px] text-slate-400">to</span>
                <Input type="date" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} className="h-7 w-36 rounded-lg bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-[11px]" />
                {(historyDateFrom || historyDateTo || historySearchTerm || historyPayFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => { setHistorySearchTerm(""); setHistoryPayFilter("all"); setHistoryDateFrom(""); setHistoryDateTo(""); }}
                    className="h-7 px-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-500 text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors ml-auto"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Invoice List Items */}
            <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
            {isLoadingInvoices ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                <span className="text-xs text-slate-400">{t("common.loading") || "Loading history..."}</span>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-6">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-bold text-slate-400">{t("pos.no_invoices_found")}</p>
                <p className="text-[11px] text-slate-400">{t("pos.adjust_filters")}</p>
              </div>
            ) : (
              filteredInvoices.map(inv => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => setSelectedHistoryInvoice(inv)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors",
                    selectedHistoryInvoice?.id === inv.id && "bg-amber-50 dark:bg-amber-900/10 border-l-2 border-amber-500"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">{inv.invoice_number}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{inv.customer_name === "Walk-in Customer" ? t("pos.walk_in_customer") : inv.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">{(inv.grand_total || 0).toFixed(2)}</p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <Badge className={cn(
                          "text-[8px] px-1.5 py-0 h-4 font-bold uppercase",
                          inv.status === "returned" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        )}>
                          {inv.status === "returned" ? (t("pos.return_sale") || "Returned") : (t("pos.paid") || "Paid")}
                        </Badge>
                        <span className="text-[9px] text-slate-400 capitalize">{inv.payment_method || "cash"}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />{inv.date} · {inv.items?.length || 0} {t("invoices.items") || "items"}
                  </p>
                </button>
              ))
            )}
          </div>
          </div>

          {/* Invoice Detail Panel */}
          {selectedHistoryInvoice && (
            <div className="flex-1 overflow-y-auto border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
              <div className="p-4 space-y-4">
                {/* Back on mobile */}
                <button
                  type="button"
                  onClick={() => setSelectedHistoryInvoice(null)}
                  className="md:hidden flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> {t("common.back") || "Back to list"}
                </button>

                {/* Invoice Meta */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-sm text-slate-900 dark:text-slate-100">{selectedHistoryInvoice.invoice_number}</p>
                      <p className="text-xs text-slate-500">{selectedHistoryInvoice.date}</p>
                    </div>
                    <Badge className={cn(
                      "text-[9px] px-2 py-0.5 font-bold uppercase",
                      selectedHistoryInvoice.status === "returned" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {selectedHistoryInvoice.status === "returned" ? (t("pos.return_sale") || "Returned") : (t("pos.paid") || "Paid")}
                    </Badge>
                  </div>
                  <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                    <p><span className="font-bold">{t("customers.name") || "Customer"}:</span> {selectedHistoryInvoice.customer_name === "Walk-in Customer" ? t("pos.walk_in_customer") : selectedHistoryInvoice.customer_name}</p>
                    <p><span className="font-bold">{t("common.phone") || "Phone"}:</span> {selectedHistoryInvoice.customer_phone || ""}</p>
                    <p><span className="font-bold">{t("pos.payment_method") || "Payment"}:</span> <span className="capitalize">{selectedHistoryInvoice.payment_method}</span> · {selectedHistoryInvoice.billing_type || "B2C"}</p>
                    {selectedHistoryInvoice.customer_name && selectedHistoryInvoice.customer_name !== "Walk-in Customer" && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistorySearchTerm(selectedHistoryInvoice.customer_name);
                          toast.info(`Filtered history by customer: ${selectedHistoryInvoice.customer_name}`);
                        }}
                        className="mt-1.5 text-[11px] font-black text-amber-500 hover:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <Search className="w-3 h-3" /> {t("pos.show_customer_history") || "Show customer purchase history"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left font-black px-3 py-2 text-slate-600 dark:text-slate-400">{t("invoices.items") || "Item"}</th>
                        <th className="text-right font-black px-3 py-2 text-slate-600 dark:text-slate-400">{t("pos.qty")}</th>
                        <th className="text-right font-black px-3 py-2 text-slate-600 dark:text-slate-400">{t("pos.price") || "Rate"}</th>
                        <th className="text-right font-black px-3 py-2 text-slate-600 dark:text-slate-400">{t("common.amount") || "Amt"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(selectedHistoryInvoice.items || []).map((item, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium">{item.name}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400">{item.qty}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400">{item.rate}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{(item.qty * item.rate).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>{t("pos.subtotal")}</span><span>{(selectedHistoryInvoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>{t("common.gst") || "GST"}</span><span>{(selectedHistoryInvoice.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-amber-600 dark:text-amber-400 border-t border-slate-200 dark:border-slate-700 pt-1.5">
                    <span>{t("pos.grand_total")}</span><span>{(selectedHistoryInvoice.grand_total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setLatestInvoice(selectedHistoryInvoice); triggerPrint(selectedHistoryInvoice, true); }}
                      className="h-10 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Printer className="w-3.5 h-3.5" /> {t("common.print") || "Reprint"}
                    </Button>
                    {selectedHistoryInvoice.status !== "returned" && (
                      <Button
                        type="button"
                        disabled={isProcessingReturn}
                        onClick={() => handleReturnInvoice(selectedHistoryInvoice)}
                        className="h-10 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 text-xs font-bold gap-1.5 disabled:opacity-50"
                      >
                        {isProcessingReturn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        {t("pos.return_sale") || "Return/Refund"}
                      </Button>
                    )}
                  </div>
                  
                  {selectedHistoryInvoice.status !== "returned" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={() => duplicateInvoiceToCart(selectedHistoryInvoice)}
                        className="h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold gap-1.5 transition-all active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> {t("common.duplicate") || "Duplicate"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => editInvoiceInCart(selectedHistoryInvoice)}
                        className="h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-bold gap-1.5 transition-all active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5" /> {t("common.edit") || "Edit Bill"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
