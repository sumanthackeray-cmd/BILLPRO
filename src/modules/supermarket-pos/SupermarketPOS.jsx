import React, { useState, useEffect, useRef, useMemo } from "react";
import DOMPurify from "dompurify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBackButton } from "@/hooks/useBackButton";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Scan, Search, ShoppingCart, UserPlus, CreditCard, Sparkles, AlertTriangle, 
  Printer, ArrowLeft, RotateCcw, Keyboard, Scale, Trash2, Eye, ShieldAlert,
  Plus, Minus, RefreshCw, FileText, CheckCircle2, Award, Zap, Power, ShoppingBag,
  X, Store, Package
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/lib/toast";
import { calculateCartOffers } from "@/modules/supermarket/PriceEngine";
import { runSupermarketSeeder } from "@/modules/supermarket/seeder";
import { cn } from "@/lib/utils";
import { generateThermalHTML, downloadInvoicePDF } from "@/lib/pdf-share-utils";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/api/firebase";
import Sidebar from "@/components/layout/Sidebar";

export default function SupermarketPOS() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Queries
  const { data: posSessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ["pos_sessions"],
    queryFn: () => base44.entities.PosSession.list("-opening_time")
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: activeOffers = [] } = useQuery({
    queryKey: ["price_rules"],
    queryFn: () => base44.entities.PriceEngine.list()
  });

  const { data: loyaltyCards = [] } = useQuery({
    queryKey: ["loyalty_cards"],
    queryFn: () => base44.entities.LoyaltyCard.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: companyProfile } = useQuery({
    queryKey: ["company_profile", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const snap = await getDoc(doc(db, "companies", companyId));
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!companyId
  });
  const companyName = companyProfile?.business_name || companyProfile?.name || "EasyBMT Supermarket";

  // Automatically find active open session for terminal
  useEffect(() => {
    if (posSessions.length > 0) {
      const openSession = posSessions.find(s => s.status === "open");
      if (openSession) {
        setActiveSession(openSession);
      } else {
        setActiveSession(null);
      }
    }
  }, [posSessions]);

  // Seeding check: If no products, show Seeding Gateway
  const needsSeeding = products.length === 0 && !isLoadingProducts;

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const ok = await runSupermarketSeeder();
      if (ok) {
        toast.success("Supermarket data successfully seeded!");
        queryClient.invalidateQueries(["products"]);
        queryClient.invalidateQueries(["pos_sessions"]);
        queryClient.invalidateQueries(["price_rules"]);
      } else {
        toast.error("Failed to seed supermarket data. Check company context.");
      }
    } catch (e) {
      toast.error("Seeding error: " + e.message);
    } finally {
      setSeeding(false);
    }
  };

  if (needsSeeding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-8 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-border/40 shadow-xl space-y-6">
          <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto text-blue-600">
            <Zap className="w-10 h-10 animate-bounce" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              EasyBMT Supermarket POS
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              It looks like this company has no loaded supermarket departments, loose products, or promotional pricing rules. Initialize now to run a trial session.
            </p>
          </div>
          <Button 
            onClick={handleSeedData}
            disabled={seeding}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl text-md flex items-center justify-center gap-2 shadow-lg"
          >
            {seeding ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> Seeding departments & rules...
              </>
            ) : (
              <>
                🚀 Seed Supermarket Baseline (12 Depts)
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingSessions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-bold animate-pulse">Initializing Terminal...</p>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <SessionGateway 
        employees={employees}
        posSessions={posSessions}
        onSessionOpened={(session) => {
          setActiveSession(session);
          queryClient.invalidateQueries(["pos_sessions"]);
        }}
      />
    );
  }

  return (
    <Terminal 
      activeSession={activeSession}
      products={products}
      activeOffers={activeOffers}
      loyaltyCards={loyaltyCards}
      companyName={companyName}
      onCloseShift={() => {
        setActiveSession(null);
        queryClient.invalidateQueries(["pos_sessions"]);
      }}
    />
  );
}

/**
 * Gate to open a POS shift counter before accessing the billing screen
 */
function SessionGateway({ employees, posSessions, onSessionOpened }) {
  const queryClient = useQueryClient();
  const [openingCash, setOpeningCash] = useState("");
  const [selectedCashier, setSelectedCashier] = useState("");
  const [selectedCounter, setSelectedCounter] = useState("counter-1");
  const [loading, setLoading] = useState(false);

  const counters = [
    { id: "counter-1", name: "Counter 1 - General (Express)", dept: "Express checkout (< 10 items)" },
    { id: "counter-2", name: "Counter 2 - General", dept: "Standard FMCG checkouts" },
    { id: "counter-3", name: "Counter 3 - Fresh (F&V)", dept: "Integrated weighing scale" },
    { id: "counter-4", name: "Counter 4 - Self-Service", dept: "Kiosk counter simulation" }
  ];

  const handleStartShift = async (e) => {
    e.preventDefault();
    if (!openingCash) {
      toast.error("Opening cash float is required.");
      return;
    }

    setLoading(true);
    try {
      const activeSession = posSessions.find(s => s.counter_id === selectedCounter && s.status === "open");
      if (activeSession) {
        throw new Error("This counter already has an active open session.");
      }

      const emp = employees.find(e => e.id === selectedCashier);
      const cashierName = emp ? (emp.full_name || emp.name || (emp.first_name ? emp.first_name + ' ' + (emp.last_name || '') : '') || "Default Cashier") : "Default Cashier";

      const created = await base44.entities.PosSession.create({
        counter_id: selectedCounter,
        cashier_id: selectedCashier || "default",
        cashier_name: cashierName,
        session_date: new Date().toISOString().split("T")[0],
        opening_time: new Date().toISOString(),
        opening_cash: Number(openingCash),
        status: "open",
        total_bills: 0,
        total_revenue: 0,
        cash_sales: 0,
        card_sales: 0,
        upi_sales: 0
      });

      toast.success("Counter Register Shift Opened Successfully!");
      onSessionOpened(created);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <Card className="max-w-lg w-full border-none shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="bg-slate-900 text-white p-6">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏪</span>
            <div>
              <CardTitle className="text-xl font-black">Supermarket Terminal Setup</CardTitle>
              <CardDescription className="text-slate-400">Open a cash drawer float to start cashier billing</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleStartShift} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">Select Counter Terminal</Label>
                <SearchableSelect
                  value={selectedCounter}
                  onValueChange={setSelectedCounter}
                  options={counters.map(c => ({ label: c.name, value: c.id }))}
                  placeholder="Select Counter"
                  className="h-11 bg-slate-50 dark:bg-slate-800 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">Assign Active Cashier</Label>
                <SearchableSelect
                  value={selectedCashier}
                  onValueChange={setSelectedCashier}
                  options={employees.length === 0 ? [
                    { label: "Sneha P. (Default Cashier)", value: "default" }
                  ] : employees.map(e => ({ label: e.full_name || e.name || (e.first_name ? e.first_name + ' ' + (e.last_name || '') : '') || "Unknown Staff", value: e.id }))}
                  placeholder="Choose Cashier"
                  className="h-11 bg-slate-50 dark:bg-slate-800 border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 dark:text-slate-300">Opening Cash Float Balance (₹)</Label>
              <Input
                type="number"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                placeholder="e.g., 5000"
                className="h-11 font-mono text-lg bg-slate-50 dark:bg-slate-800 border-border"
              />
              <p className="text-[10px] text-muted-foreground">This sets the float currency expected in drawer when closing the shift Z-Report.</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl text-md shadow-md"
            >
              {loading ? "Unlocking register..." : "🔓 Unlock Register & Start Shift"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const categoryIcons = {
  all: "🛍️",
  "Fruits & Vegetables": "🥬",
  "Dairy & Eggs": "🥛",
  "Meat, Fish & Poultry": "🍗",
  "Bakery & Hot Foods": "🍞",
  "Grocery & Staples": "🌾",
  "Personal Care & Hygiene": "🧴",
  "Home Care & Cleaning": "🧹",
  "Snacks & Beverages": "🥤",
  "Frozen & Refrigerated": "❄️",
  "Baby & Kids": "👶",
  "Pet Care": "🐶",
  "Organic & Health": "🌿"
};

/**
 * Main Supermarket Terminal Component
 */
function Terminal({ activeSession, products, activeOffers, loyaltyCards, onCloseShift, companyName }) {
  const { userCode, user } = useAuth();
  const queryClient = useQueryClient();
  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);
  const cartEndRef = useRef(null);
  const miniCartEndRef = useRef(null);
  const [cart, setCart] = useState([]);
  const [scanInput, setScanInput] = useState("");
  
  const [selectedPrintSize, setSelectedPrintSize] = useState("80mm");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [mobileScannerOpen, setMobileScannerOpen] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ["shop_settings"],
    queryFn: () => base44.entities.Settings.list()
  });
  const shopSettings = useMemo(() => settingsData?.[0] || {}, [settingsData]);

  useEffect(() => {
    cartEndRef.current?.scrollIntoView({ behavior: "smooth" });
    miniCartEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cart]);
  const [pluInput, setPluInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeMobileTab, setActiveMobileTab] = useState("catalog");

  // Loyalty Program States
  const [loyaltyPhone, setLoyaltyPhone] = useState("");
  const [activeMember, setActiveMember] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberTier, setNewMemberTier] = useState("silver");

  // Scale Weighing States
  const [weighingProduct, setWeighingProduct] = useState(null);
  const [scaleConnected, setScaleConnected] = useState(false);
  const [scaleWeight, setScaleWeight] = useState(1.0); // manual fallback in kg
  const [simulatedWeight, setSimulatedWeight] = useState(1.0);

  // Checkout States
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [splitPayment, setSplitPayment] = useState({ cash: "", card: "", upi: "" });
  const [manualDiscount, setManualDiscount] = useState(0);
  const [tenderedCash, setTenderedCash] = useState("");
  const [supervisorPin, setSupervisorPin] = useState("");
  const [overrideApproved, setOverrideApproved] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);

  // Receipt Modal State
  const [lastInvoice, setLastInvoice] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Back Button Navigation for Supermarket POS Overlays
  useBackButton(() => setActiveMobileTab("catalog"), activeMobileTab === "cart");
  useBackButton(() => setMobileScannerOpen(false), mobileScannerOpen);
  useBackButton(() => setShowEnrollModal(false), showEnrollModal);
  useBackButton(() => setShowCheckout(false), showCheckout);
  useBackButton(() => setWeighingProduct(null), weighingProduct !== null);
  useBackButton(() => setShowSupervisorModal(false), showSupervisorModal);
  useBackButton(() => setShowReceipt(false), showReceipt);

  const scannerRef = useRef(null);

  // Categories list
  const categories = useMemo(() => {
    const list = new Set(products.map(p => p.category));
    return ["all", ...Array.from(list)];
  }, [products]);

  // Audio scan beep effect
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

  // Re-focus scannerRef on mount & click outside
  useEffect(() => {
    if (scannerRef.current) {
      scannerRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (
        scannerRef.current &&
        document.activeElement !== scannerRef.current &&
        !e.target.closest("input, select, textarea, button, [role='button']") &&
        !showCheckout && !showEnrollModal && !weighingProduct && !showReceipt && !showSupervisorModal
      ) {
        scannerRef.current.focus();
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [showCheckout, showEnrollModal, weighingProduct, showReceipt, showSupervisorModal]);

  // Scan handler
  const handleBarcodeScan = (e) => {
    e.preventDefault();
    if (!scanInput) return;

    const matched = products.find(p => p.barcode === scanInput.trim());
    if (matched) {
      playScanBeep();
      if (matched.requires_scale || matched.is_weighed) {
        setWeighingProduct(matched);
        setScaleWeight(1.0);
        setSimulatedWeight(1.0);
      } else {
        addToCart(matched, 1);
      }
      toast.success(`Scanned: ${matched.name}`);
    } else {
      toast.error(`Unknown Barcode: "${scanInput}"`);
    }
    setScanInput("");
  };

  // PLU lookup handler
  const handlePLUEntry = (e) => {
    e.preventDefault();
    if (!pluInput) return;

    const matched = products.find(p => p.plu_code === pluInput.trim());
    if (matched) {
      playScanBeep();
      if (matched.requires_scale || matched.is_weighed) {
        setWeighingProduct(matched);
        setScaleWeight(1.0);
        setSimulatedWeight(1.0);
      } else {
        addToCart(matched, 1);
      }
      toast.success(`PLU Found: ${matched.name}`);
    } else {
      toast.error(`Invalid PLU Code: "${pluInput}"`);
    }
    setPluInput("");
  };

  // Add standard unit or weighed quantity to cart
  const addToCart = (product, quantity) => {
    setCart(prevCart => {
      const idx = prevCart.findIndex(item => item.id === product.id);
      if (idx > -1) {
        const updated = [...prevCart];
        if (product.requires_scale || product.is_weighed) {
          updated[idx].qty = Number((updated[idx].qty + quantity).toFixed(3));
        } else {
          updated[idx].qty += quantity;
        }
        return updated;
      } else {
        return [...prevCart, { ...product, qty: quantity }];
      }
    });
  };

  // Update item quantity
  const updateQty = (id, change) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          const isScale = item.requires_scale || item.is_weighed;
          const delta = isScale ? 0.1 * change : 1 * change;
          const newQty = Number((item.qty + delta).toFixed(3));
          return { ...item, qty: Math.max(0.1, newQty) };
        }
        return item;
      });
    });
  };

  // Remove from cart
  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  // Clear cart
  const resetPOS = () => {
    setCart([]);
    setActiveMember(null);
    setLoyaltyPhone("");
    setManualDiscount(0);
    setTenderedCash("");
    setSplitPayment({ cash: "", card: "", upi: "" });
  };

  // Loyalty customer lookup
  const handleLoyaltyLookup = (e) => {
    e.preventDefault();
    if (!loyaltyPhone) return;

    const matched = loyaltyCards.find(
      c => c.phone.includes(loyaltyPhone.trim()) || c.card_number.includes(loyaltyPhone.trim())
    );

    if (matched) {
      setActiveMember(matched);
      toast.success(`Loyalty customer applied: ${matched.name} (${matched.card_type.toUpperCase()})`);
    } else {
      toast.warning("Customer not enrolled. Initializing enrollment draft.");
      setNewMemberPhone(loyaltyPhone);
      setShowEnrollModal(true);
    }
  };

  // Enrollment mutation
  const enrollMemberMutation = useMutation({
    mutationFn: async (payload) => {
      const cardNum = "SMC-" + Math.floor(1000 + Math.random() * 9000) + "-" + Math.floor(1000 + Math.random() * 9000);
      return base44.entities.LoyaltyCard.create({
        ...payload,
        card_number: cardNum,
        points_balance: 100, // 100 welcome points
        points_value: 0.10, // ₹0.10 per point
        total_earned: 100,
        total_redeemed: 0,
        total_spent: 0,
        tier_since: new Date().toISOString().split("T")[0],
        is_active: true
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["loyalty_cards"]);
      setActiveMember(data);
      setShowEnrollModal(false);
      setNewMemberName("");
      setNewMemberPhone("");
      toast.success(`Member enrolled: ${data.name}! Silver card generated.`);
    },
    onError: (err) => {
      toast.error("Failed to enroll: " + err.message);
    }
  });

  const handleEnrollSubmit = (e) => {
    e.preventDefault();
    if (!newMemberName || !newMemberPhone) {
      toast.error("Name and Phone number are required.");
      return;
    }
    enrollMemberMutation.mutate({
      name: newMemberName,
      phone: newMemberPhone,
      card_type: newMemberTier
    });
  };

  // Calculate cart calculations using PriceEngine
  const cartTotals = useMemo(() => {
    return calculateCartOffers(cart, activeOffers, !!activeMember);
  }, [cart, activeOffers, activeMember]);

  // Handle weighing scale accept
  const handleScaleWeighAccept = () => {
    if (!weighingProduct) return;
    const finalWeight = scaleConnected ? simulatedWeight : scaleWeight;
    addToCart(weighingProduct, Number(finalWeight.toFixed(3)));
    toast.success(`Added ${finalWeight.toFixed(3)}kg of ${weighingProduct.name}`);
    setWeighingProduct(null);
  };

  // Simulating scale weight fluctuations if connected
  useEffect(() => {
    let interval;
    if (scaleConnected && weighingProduct) {
      interval = setInterval(() => {
        // Randomly drift slightly to look realistic
        setSimulatedWeight(prev => {
          const drift = (Math.random() - 0.5) * 0.008;
          return Math.max(0.1, Number((prev + drift).toFixed(3)));
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [scaleConnected, weighingProduct]);

  // Supervisor override code verification
  const handleSupervisorOverride = (e) => {
    e.preventDefault();
    const targetPin = shopSettings?.supervisor_pin || "8822";
    if (supervisorPin === targetPin) {
      setOverrideApproved(true);
      setShowSupervisorModal(false);
      setSupervisorPin("");
      toast.success("Supervisor override approved. discount applied.");
    } else {
      toast.error("Invalid Supervisor PIN. Access denied.");
    }
  };

  // Complete checkout & issue bill
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }

    // Split payment check
    const totalDue = cartTotals.grandTotal - (overrideApproved ? manualDiscount : 0);
    if (paymentMode === "split") {
      const cashAmt = Number(splitPayment.cash || 0);
      const cardAmt = Number(splitPayment.card || 0);
      const upiAmt = Number(splitPayment.upi || 0);
      const totalEntered = cashAmt + cardAmt + upiAmt;
      if (Math.abs(totalEntered - totalDue) > 0.05) {
        toast.error(`Split payment breakdown (₹${totalEntered}) must match bill total (₹${totalDue.toFixed(2)})`);
        return;
      }
    }

    try {
      const billNo = "SM-" + activeSession.counter_id.toUpperCase().replace("-", "") + "-" + Date.now().toString().slice(-6);

      // Create invoice
      const invoicePayload = {
        invoice_number: billNo,
        customer_name: activeMember ? activeMember.name : "Walk-in Customer",
        customer_phone: activeMember ? activeMember.phone : "",
        subtotal: cartTotals.subtotal,
        discount: cartTotals.totalSavings + (overrideApproved ? Number(manualDiscount) : 0),
        grand_total: totalDue,
        gst_amount: cartTotals.totalGst,
        items: cartTotals.items.map(item => ({
          name: item.name,
          qty: item.qty,
          rate: item.rate,
          final_price: item.finalPrice,
          mrp: item.mrp,
          hsn: item.hsn || "0000",
          gst_rate: item.gst_rate,
          total: item.finalPrice * item.qty
        })),
        payment_mode: paymentMode,
        payment_breakdown: paymentMode === "split" ? splitPayment : { [paymentMode]: totalDue },
        pos_session_id: activeSession.id,
        counterId: activeSession.counter_id,
        created_date: new Date().toISOString(),
        loyalty_card_number: activeMember ? activeMember.card_number : "",
        points_earned: Math.floor(totalDue / 100),
        cashier_code: userCode || "",
        cashier_name: user?.name || user?.user_code || "Cashier",
      };

      const createdInvoice = await base44.entities.Invoice.create(invoicePayload);

      // Update loyalty member points
      if (activeMember) {
        const pointsEarned = Math.floor(totalDue / 100);
        await base44.entities.LoyaltyCard.update(activeMember.id, {
          points_balance: activeMember.points_balance + pointsEarned,
          total_earned: activeMember.total_earned + pointsEarned,
          total_spent: activeMember.total_spent + totalDue
        });
      }

      // Update session values
      const currentBills = activeSession.total_bills || 0;
      const currentRevenue = activeSession.total_revenue || 0;
      let cashAmt = activeSession.cash_sales || 0;
      let cardAmt = activeSession.card_sales || 0;
      let upiAmt = activeSession.upi_sales || 0;

      if (paymentMode === "cash") {
        cashAmt += totalDue;
      } else if (paymentMode === "card") {
        cardAmt += totalDue;
      } else if (paymentMode === "upi") {
        upiAmt += totalDue;
      } else if (paymentMode === "split") {
        cashAmt += Number(splitPayment.cash || 0);
        cardAmt += Number(splitPayment.card || 0);
        upiAmt += Number(splitPayment.upi || 0);
      }

      await base44.entities.PosSession.update(activeSession.id, {
        total_bills: currentBills + 1,
        total_revenue: currentRevenue + totalDue,
        cash_sales: cashAmt,
        card_sales: cardAmt,
        upi_sales: upiAmt
      });

      if (isMounted.current) {
        setLastInvoice(createdInvoice);
        setShowCheckout(false);
        setShowReceipt(true);
        resetPOS();
      }
      toast.success("Transaction Checked Out Successfully!");
    } catch (e) {
      toast.error("Checkout failed: " + e.message);
    }
  };

  // Close shift handler
  const handleCloseShiftSession = async () => {
    try {
      await base44.entities.PosSession.update(activeSession.id, {
        status: "closed",
        closing_time: new Date().toISOString()
      });
      toast.success("Cashier register closed successfully.");
      onCloseShift();
    } catch (e) {
      toast.error("Failed to close session: " + e.message);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!whatsappNumber || whatsappNumber.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid WhatsApp number.");
      return;
    }
    let cleanPhone = whatsappNumber.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const message = `🧾 *Invoice from ${shopSettings?.shop_name || "EASYBMT SUPERMARKET"}*\n\nDear ${lastInvoice?.customer_name || "Customer"},\nThank you for shopping with us! Your total is ₹${lastInvoice?.grand_total}.\n\nHave a great day!`;

    try {
      toast.info("Generating PDF...");
      const fileUrl = await generateAndUploadInvoicePDF(lastInvoice, shopSettings);
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message + "\n\nInvoice PDF: " + fileUrl)}`;
      window.open(url, "_blank");
      toast.success("Opened WhatsApp with invoice!");
    } catch (e) {
      console.error(e);
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message + "\n\n(PDF failed to attach)")}`;
      window.open(url, "_blank");
      toast.success("Opened WhatsApp (Text Only)");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info("Generating PDF...");
      await downloadInvoicePDF(lastInvoice, shopSettings);
      toast.success("PDF Downloaded!");
    } catch (e) {
      toast.error("Failed to download PDF.");
    }
  };

  const handleEditInvoice = async () => {
    try {
      await base44.entities.Invoice.delete(lastInvoice.id);
      
      const newCart = lastInvoice.items.map(item => ({
        ...item,
        qty: item.qty,
        finalPrice: item.final_price || item.rate,
        cartId: Math.random().toString(36).substr(2, 9)
      }));
      setCart(newCart);
      
      const currentBills = activeSession.total_bills || 0;
      const currentRevenue = activeSession.total_revenue || 0;
      const totalDue = lastInvoice.grand_total;
      
      await base44.entities.PosSession.update(activeSession.id, {
        total_bills: Math.max(0, currentBills - 1),
        total_revenue: Math.max(0, currentRevenue - totalDue)
      });
      
      setShowReceipt(false);
      toast.success("Invoice returned to cart for editing.");
    } catch (e) {
      toast.error("Failed to edit: " + e.message);
    }
  };

  // Filtering popular/quick items
  const filteredQuickAccess = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.plu_code?.includes(searchTerm);
      return matchCat && matchSearch;
    }).slice(0, 24); // Limit to 24 items
  }, [products, activeCategory, searchTerm]);

  return (
    <>
    <div className="flex flex-row h-screen bg-slate-50 dark:bg-slate-950 select-none overflow-hidden">
      
      {/* Sidebar Injection */}
      <Sidebar mobile={false} defaultCollapsed={true} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative h-full">
      {/* Header bar */}
      <header className="flex flex-row justify-between items-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 md:px-4 h-[35px] border-b border-border shadow-sm">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-hidden">
          <span className="text-sm md:text-base">🏪</span>
          <div className="flex items-center gap-2">
            <h1 className="text-[10px] md:text-xs font-black tracking-tight flex items-center gap-1.5 truncate">
              {companyName ? companyName.toUpperCase() : "EASYBMT SUPERMARKET"}
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none font-bold text-[8px] h-3 px-1">
                ACTIVE
              </Badge>
            </h1>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 hidden sm:flex">
              T: <strong className="text-slate-700 dark:text-slate-200 ml-0.5">{activeSession.counter_id.toUpperCase()}</strong> | 
              C: <strong className="text-slate-700 dark:text-slate-200 ml-0.5">{activeSession.cashier_name}</strong>
            </p>
          </div>
        </div>

        {/* Inputs to capture automated keyboard scan codes */}
        <div className="flex items-center gap-1.5 justify-end ml-auto">
          {/* Mobile Scan Workspace Trigger */}
          <Button
            onClick={() => setMobileScannerOpen(true)}
            className="sm:hidden bg-blue-600 hover:bg-blue-700 text-white font-bold h-6 text-[10px] rounded gap-1 px-2 shrink-0"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Scan</span>
          </Button>

          <form onSubmit={handleBarcodeScan} className="relative hidden sm:block w-28 md:w-32">
            <Scan className="w-3.5 h-3.5 absolute left-2 top-1.5 md:top-2 text-slate-400" />
            <Input
              ref={scannerRef}
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              placeholder="Scan barcode"
              className="h-6 md:h-7 pl-6 pr-1 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[10px] font-mono rounded focus:ring-1 focus:ring-blue-500 w-full"
            />
          </form>

          <form onSubmit={handlePLUEntry} className="relative hidden sm:block w-20 md:w-24">
            <Keyboard className="w-3.5 h-3.5 absolute left-1.5 top-1.5 md:top-2 text-slate-400" />
            <Input
              value={pluInput}
              onChange={e => setPluInput(e.target.value)}
              placeholder="PLU"
              className="h-6 md:h-7 pl-5 pr-1 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[10px] font-mono rounded w-full"
            />
          </form>

          <Button 
            onClick={handleCloseShiftSession}
            className="bg-red-600 hover:bg-red-700 font-bold h-6 md:h-7 text-[10px] rounded gap-1 px-2 whitespace-nowrap"
          >
            <span className="hidden sm:inline">🚪 End Shift</span>
            <span className="sm:hidden">🚪</span>
          </Button>
        </div>
      </header>

      {/* Mobile Fast Scan Overlay Workspace */}
      {mobileScannerOpen && (
        <div className="sm:hidden absolute inset-0 bg-slate-50 dark:bg-slate-950 z-40 p-3 flex flex-col space-y-3 overflow-hidden pb-16">
          {/* Scanner Box */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border/40 shadow-md relative space-y-3 shrink-0">
            {/* Title & Close button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Scan className="w-4 h-4 text-blue-600 animate-pulse" />
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Fast Scan & PLU Billing</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileScannerOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input forms */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* Barcode scan input */}
              <form onSubmit={handleBarcodeScan} className="relative w-full">
                <Scan className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  placeholder="Scan product barcode..."
                  className="h-10 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono rounded-xl focus:ring-2 focus:ring-blue-500 w-full"
                  autoFocus
                />
              </form>

              {/* PLU scan/entry input */}
              <form onSubmit={handlePLUEntry} className="relative w-full">
                <Keyboard className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  value={pluInput}
                  onChange={e => setPluInput(e.target.value)}
                  placeholder="Enter PLU Code..."
                  className="h-10 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono rounded-xl focus:ring-2 focus:ring-blue-500 w-full"
                />
              </form>
            </div>
          </div>

          {/* Mini Cart Window - Displays in real-time */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-border/40 p-3 shadow-inner">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">Scanned Cart ({cart.reduce((sum, item) => sum + (item.qty || 0), 0)})</span>
              <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">Total: ₹{cartTotals.grandTotal.toFixed(2)}</span>
            </div>

            {/* Scrollable products list */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-2 pr-1 space-y-0.5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                  <ShoppingCart className="w-8 h-8 text-slate-300 mb-1" />
                  <p className="text-[10px] font-bold">No products scanned yet</p>
                  <p className="text-[9px]">Scan a barcode or enter PLU to start adding items.</p>
                </div>
              ) : (
                <>
                  {cartTotals.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800/60">
                      <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                        <p className="font-bold text-[11px] text-slate-800 dark:text-slate-150 truncate leading-none">{item.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono">MRP ₹{item.mrp || item.rate} / {item.unit || "PCS"}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, -1)}
                          className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 flex items-center justify-center text-xs text-slate-700 dark:text-slate-300"
                        >
                          -
                        </button>
                        <span className="font-mono text-[11px] font-black min-w-[24px] text-center text-slate-800 dark:text-slate-100">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, 1)}
                          className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 flex items-center justify-center text-xs text-slate-700 dark:text-slate-300"
                        >
                          +
                        </button>
                      </div>

                      <div className="w-16 text-right font-mono text-[11px] font-black text-slate-800 dark:text-slate-100 shrink-0">
                        ₹{(item.finalPrice * item.qty).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-650 pl-2 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div ref={miniCartEndRef} className="h-10" />
                </>
              )}
            </div>
            
            {/* Quick checkout inside scanning workspace */}
            {cart.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 shrink-0">
                <Button
                  onClick={() => {
                    setShowCheckout(true);
                    setMobileScannerOpen(false);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs rounded-xl shadow active:scale-95 transition-all"
                >
                  💳 Proceed to Checkout (₹{cartTotals.grandTotal.toFixed(2)})
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main viewport panels */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Panel: Quick Access & Search (65%) */}
        <section className={cn(
          "w-full md:w-[65%] flex flex-col border-r border-border/40 p-2 space-y-2 overflow-hidden",
          activeMobileTab === "catalog" ? "flex" : "hidden md:flex"
        )}>
          {/* Quick filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
            {/* Desktop Categories (Pill view) */}
            <div className="hidden md:flex gap-1.5 overflow-x-auto pb-1 max-w-[70%] scrollbar-none flex-nowrap whitespace-nowrap scroll-smooth">
              {categories.map(cat => (
                <Button
                  key={cat}
                  size="sm"
                  variant={activeCategory === cat ? "default" : "outline"}
                  onClick={() => setActiveCategory(cat)}
                  className="rounded-full text-xs font-bold capitalize whitespace-nowrap"
                >
                  {cat === "all" ? "🛍️ All items" : cat}
                </Button>
              ))}
            </div>

            {/* Mobile Categories (Flipkart style round icons) */}
            <div className="flex md:hidden gap-3.5 overflow-x-auto pb-2 pt-1 max-w-full scrollbar-none flex-nowrap whitespace-nowrap scroll-smooth px-1">
              {categories.map(cat => {
                const icon = categoryIcons[cat] || "📦";
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className="flex flex-col items-center gap-1 focus:outline-none shrink-0"
                  >
                    <div className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all shadow-sm",
                      isActive 
                        ? "bg-blue-600 text-white scale-105 ring-2 ring-blue-600 ring-offset-2" 
                        : "bg-gradient-to-tr from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800"
                    )}>
                      {icon}
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold tracking-tight text-center max-w-[52px] truncate leading-tight capitalize",
                      isActive ? "text-blue-600 dark:text-blue-400 font-extrabold" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {cat === "all" ? "All" : cat}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="relative w-full sm:w-[30%]">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search catalog..."
                className="h-7 text-xs pl-7 bg-white dark:bg-slate-900 w-full"
              />
            </div>
          </div>

        {/* Quick Access Item Grid (24 items max) */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-20 md:pb-0">
          {filteredQuickAccess.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 text-slate-300 mb-2" />
                <p className="font-semibold text-xs">No matching products in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredQuickAccess.map(p => {
                  const cartQty = cart.reduce((sum, item) => item.id === p.id ? sum + item.qty : sum, 0);
                  
                  return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (p.requires_scale || p.is_weighed) {
                        setWeighingProduct(p);
                        setScaleWeight(1.0);
                        setSimulatedWeight(1.0);
                      } else {
                        addToCart(p, 1);
                        playScanBeep();
                      }
                    }}
                    className="flex flex-col justify-between items-start text-left p-3 rounded-2xl bg-white dark:bg-slate-900 border border-border/40 hover:border-blue-500/60 shadow-sm hover:shadow-md transition-all group relative overflow-visible"
                  >
                    {/* CART BADGE */}
                    {cartQty > 0 && (
                      <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-md z-10 animate-fade-in border border-white/50 dark:border-slate-800">
                        {cartQty}
                      </div>
                    )}

                    {/* PLU Tag */}
                    {p.plu_code && (
                      <span className="absolute top-1 right-2 text-[8px] font-mono text-slate-400 group-hover:text-blue-600 font-black">
                        PLU {p.plu_code}
                      </span>
                    )}

                    <div className="space-y-1 mt-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider leading-none">
                        {p.category}
                      </p>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-blue-600 line-clamp-2 h-8">
                        {p.name}
                      </h4>
                    </div>

                    <div className="flex justify-between items-center w-full mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                      <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        ₹{p.rate || p.mrp}
                        <span className="text-[9px] text-muted-foreground font-normal">/{p.unit || "PCS"}</span>
                      </span>
                      {p.requires_scale ? (
                        <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-none px-1.5 py-0.5 text-[8px] font-bold gap-0.5">
                          <Scale className="w-2 h-2" /> Weigh
                        </Badge>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          +
                        </span>
                      )}
                    </div>
                  </button>
                )})}
              </div>
            )}
        </div>

          {/* Active promotions ticker ticker */}
          <div className="h-10 bg-blue-600/5 dark:bg-blue-600/10 rounded-2xl px-4 flex items-center justify-between text-xs border border-blue-500/10">
            <span className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4 animate-pulse" /> Active Offers:
            </span>
            <marquee className="flex-1 ml-4 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
              🛒 Spend ₹1000 and get ₹50 Flat Off! | 🥬 5% Off Fresh Tomatoes TPR! | 🥛 Buy 2 Get 1 FREE on Dairy products!
            </marquee>
          </div>
        </section>

        {/* Right Panel: Cart & CRM Checkout (35%) */}
        <section className={cn(
          "w-full md:w-[35%] flex flex-col bg-white dark:bg-slate-900 p-2 pb-20 md:pb-2 space-y-2 overflow-hidden shadow-2xl relative",
          activeMobileTab === "cart" ? "flex" : "hidden md:flex"
        )}>
          {/* CRM Loyalty lookups */}
          <form onSubmit={handleLoyaltyLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Award className="w-4.5 h-4.5 absolute left-3 top-3 text-slate-400" />
              <Input
                value={loyaltyPhone}
                onChange={e => setLoyaltyPhone(e.target.value)}
                placeholder="Member Phone / Card No."
                className="h-10 pl-9 bg-slate-50 dark:bg-slate-800 border-border"
              />
            </div>
            <Button type="submit" variant="secondary" className="h-10 font-bold text-xs gap-1">
              Apply
            </Button>
          </form>

          {/* Customer highlight card if loaded */}
          {activeMember ? (
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex justify-between items-center relative overflow-hidden">
              <div className="space-y-1">
                <p className="text-[9px] text-muted-foreground uppercase font-black">Loyalty Member</p>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{activeMember.name}</h4>
                <p className="text-[10px] text-slate-500">Phone: {activeMember.phone} | Bal: {activeMember.points_balance} pts</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={`border-none font-bold text-[9px] uppercase ${
                  activeMember.card_type === "platinum" 
                    ? "bg-slate-300 text-slate-900 border border-slate-400" 
                    : activeMember.card_type === "gold" 
                      ? "bg-amber-100 text-amber-800" 
                      : "bg-slate-100 text-slate-700"
                }`}>
                  {activeMember.card_type} card
                </Badge>
                <button 
                  onClick={() => setActiveMember(null)}
                  className="text-[10px] text-red-500 underline hover:text-red-600 font-bold"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-[10px] text-muted-foreground">
              No loyalty customer attached. Standard billing applied.
            </div>
          )}

          {/* Cart items list */}
          <div className="flex-1 min-h-0 overflow-y-auto border border-border/40 rounded-2xl">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
                <ShoppingCart className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-bold">Cart is currently empty</p>
                <p className="text-[10px]">Scan a barcode or type a PLU above to bill items.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-xs font-black">Product</TableHead>
                      <TableHead className="text-xs font-black text-center">Qty/Wt</TableHead>
                      <TableHead className="text-xs font-black text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cartTotals.items.map(item => {
                      const discount = item.discountAmount || 0;
                      return (
                        <TableRow key={item.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-800/10">
                          <TableCell className="py-1">
                            <div className="space-y-0.5">
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  MRP ₹{item.mrp || item.rate}
                                </span>
                                {discount > 0 && (
                                  <Badge className="bg-rose-500/10 text-rose-500 border-none font-bold text-[8px] px-1 h-3.5">
                                    -₹{discount.toFixed(1)} Off
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-1 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => updateQty(item.id, -1)}
                                className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 flex items-center justify-center text-xs"
                              >
                                -
                              </button>
                              <span className="font-mono text-xs font-black min-w-9">
                                {item.qty}
                              </span>
                              <button
                                onClick={() => updateQty(item.id, 1)}
                                className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 flex items-center justify-center text-xs"
                              >
                                +
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="py-1 text-right font-mono text-xs font-bold">
                            ₹{(item.finalPrice * item.qty).toFixed(2)}
                          </TableCell>
                          <TableCell className="py-1 text-center">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div ref={cartEndRef} className="h-10" />
              </>
            )}
          </div>

          {/* Pricing Ledger summary */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-border/40">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Subtotal (Normal Rates)</span>
              <span className="font-mono font-bold">₹{cartTotals.subtotal.toFixed(2)}</span>
            </div>
            {cartTotals.totalSavings > 0 && (
              <div className="flex justify-between items-center text-xs text-rose-500 font-bold">
                <span>Discount Engine Auto Savings</span>
                <span className="font-mono">-₹{cartTotals.totalSavings.toFixed(2)}</span>
              </div>
            )}
            {overrideApproved && manualDiscount > 0 && (
              <div className="flex justify-between items-center text-xs text-rose-600 font-bold">
                <span>Manual Override Discount</span>
                <span className="font-mono">-₹{Number(manualDiscount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">HSN Tax Pool (GST)</span>
              <span className="font-mono font-bold">₹{cartTotals.totalGst.toFixed(2)}</span>
            </div>
            
            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center">
              <span className="text-slate-900 dark:text-slate-50 font-black text-sm">TOTAL AMOUNT DUE</span>
              <span className="font-mono text-xl font-black text-blue-600">
                ₹{(cartTotals.grandTotal - (overrideApproved ? manualDiscount : 0)).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Split checks / checkout action */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={resetPOS}
              variant="outline"
              className="h-12 font-bold border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl"
            >
              Clear Cart
            </Button>
            <Button
              onClick={() => {
                if (cart.length === 0) {
                  toast.error("Cart is empty.");
                  return;
                }
                setShowCheckout(true);
              }}
              className="h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
            >
              💳 Pay & Print Receipt
            </Button>
          </div>
        </section>
      </main>

      {/* Persistent Mobile Bottom Navigation Bar */}
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
          onClick={() => setActiveMobileTab("catalog")}
          className={`flex flex-col items-center justify-end flex-1 gap-1 transition-all h-full ${
            activeMobileTab === "catalog" ? "text-blue-600 dark:text-blue-400 font-black" : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          }`}
        >
          <Package className={`w-4 h-4 mb-0.5 transition-transform ${activeMobileTab === "catalog" ? "scale-110" : ""}`} />
          <span className="text-[8px] font-bold uppercase tracking-wider leading-none">Catalog</span>
        </button>

        {/* Fast Scan */}
        <button
          type="button"
          onClick={() => setMobileScannerOpen(true)}
          className="flex flex-col items-center justify-end flex-1 relative transition-all h-full"
        >
          <div className="absolute bottom-[16px] w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 hover:bg-blue-700 active:scale-95 transition-all">
            <Scan className="w-4 h-4" />
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wider leading-none mt-auto text-slate-500 dark:text-slate-400">Scan</span>
        </button>

        {/* Cart */}
        <button
          type="button"
          onClick={() => setActiveMobileTab("cart")}
          className={`flex flex-col items-center justify-end flex-1 gap-1 relative transition-all h-full ${
            activeMobileTab === "cart" ? "text-blue-600 dark:text-blue-400 font-black" : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          }`}
        >
          <div className="relative mb-0.5">
            <ShoppingCart className={`w-4 h-4 transition-transform ${activeMobileTab === "cart" ? "scale-110" : ""}`} />
            {cart.reduce((sum, item) => sum + (item.qty || 0), 0) > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-slate-900 animate-pulse">
                {cart.reduce((sum, item) => sum + (item.qty || 0), 0)}
              </span>
            )}
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wider leading-none">Cart</span>
        </button>

        {/* End Shift */}
        <button
          type="button"
          onClick={handleCloseShiftSession}
          className="flex flex-col items-center justify-end flex-1 gap-1 text-rose-500 dark:text-rose-400 hover:text-rose-600 transition-all h-full"
        >
          <Power className="w-4 h-4 mb-0.5" />
          <span className="text-[8px] font-bold uppercase tracking-wider leading-none">End Shift</span>
        </button>
      </div>
      </div>

      {/* End Main Container */}
      </div>

      {/* WEIGHING SCALE MODAL DIALOG */}
      <Dialog open={!!weighingProduct} onOpenChange={() => setWeighingProduct(null)}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-3xl border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Scale className="w-6 h-6 text-blue-600" /> Web Serial Scale Integration
            </DialogTitle>
            <DialogDescription>
              Weighing scale interface for fresh / loose produce billing.
            </DialogDescription>
          </DialogHeader>

          {weighingProduct && (
            <div className="space-y-6 pt-4">
              {/* Product Info Block */}
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-50">{weighingProduct.name}</h4>
                  <p className="text-xs text-slate-500">Rate: ₹{weighingProduct.loose_rate_per_kg || weighingProduct.rate || weighingProduct.mrp}/KG</p>
                </div>
                <Badge className="bg-blue-600 hover:bg-blue-600 text-white border-none font-bold text-[9px] uppercase">
                  Loose Weight
                </Badge>
              </div>

              {/* Web Serial Status / Dial */}
              <div className="border border-border/40 rounded-2xl p-4 flex flex-col items-center space-y-4">
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <Power className={`w-3.5 h-3.5 ${scaleConnected ? "text-emerald-500" : "text-slate-400"}`} />
                    Scale Status: {scaleConnected ? "Web Serial (Streaming)" : "Simulator mode"}
                  </span>
                  <Button 
                    size="sm"
                    variant={scaleConnected ? "destructive" : "secondary"}
                    onClick={() => setScaleConnected(!scaleConnected)}
                    className="h-7 text-[10px] font-bold rounded-lg"
                  >
                    {scaleConnected ? "Disconnect" : "Connect Scale"}
                  </Button>
                </div>

                {/* Digital LCD screen display */}
                <div className="w-full bg-slate-950 rounded-2xl p-6 border-2 border-slate-800 text-center relative shadow-inner">
                  <div className="absolute top-2 left-3 text-[8px] font-mono text-emerald-500/40 uppercase">Scale LCD Weight</div>
                  <div className="text-4xl font-mono font-black text-emerald-400 tracking-widest mt-1">
                    {(scaleConnected ? simulatedWeight : scaleWeight).toFixed(3)}
                    <span className="text-lg font-sans ml-1 text-emerald-500">KG</span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-500/60 mt-1">
                    Rate: ₹{(weighingProduct.loose_rate_per_kg || weighingProduct.rate || weighingProduct.mrp)}/kg | 
                    Total: ₹{((scaleConnected ? simulatedWeight : scaleWeight) * (weighingProduct.loose_rate_per_kg || weighingProduct.rate || weighingProduct.mrp)).toFixed(2)}
                  </div>
                </div>

                {/* Simulator manual slider */}
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Manual Weight Slider (Fallback)</span>
                    <span className="font-mono">{(scaleConnected ? simulatedWeight : scaleWeight).toFixed(3)} KG</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="5.0"
                    step="0.01"
                    value={scaleConnected ? simulatedWeight : scaleWeight}
                    onChange={e => {
                      const v = Number(e.target.value);
                      if (scaleConnected) {
                        setSimulatedWeight(v);
                      } else {
                        setScaleWeight(v);
                      }
                    }}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>50g (Min)</span>
                    <span>5kg (Max)</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setWeighingProduct(null)}
                  className="flex-1 font-bold h-11"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScaleWeighAccept}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold h-11 text-white"
                >
                  Accept & Add to Cart
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QUICK ENROLL LOYALTY MEMBER DIALOG */}
      <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-3xl border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-600" /> Enroll Reliance One Loyalty
            </DialogTitle>
            <DialogDescription>
              Register customer for tier-based discounts, welcome bonuses and cashback points.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnrollSubmit} className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Customer Mobile *</Label>
              <Input
                value={newMemberPhone}
                onChange={e => setNewMemberPhone(e.target.value)}
                placeholder="Phone number"
                className="h-10 bg-slate-50 dark:bg-slate-800"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</Label>
              <Input
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="h-10 bg-slate-50 dark:bg-slate-800"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Initial Card Tier</Label>
              <SearchableSelect
                value={newMemberTier}
                onValueChange={setNewMemberTier}
                options={[
                  { label: "Silver Tier (Default)", value: "silver" },
                  { label: "Gold Tier", value: "gold" },
                  { label: "Platinum Tier", value: "platinum" }
                ]}
                placeholder="Card Tier"
                className="h-10 bg-slate-50 dark:bg-slate-800 border-border"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={enrollMemberMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
              >
                {enrollMemberMutation.isPending ? "Generating Member Profile..." : "🎉 Generate Loyalty Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CHECKOUT MODAL DIALOG */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-3xl border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-slate-50">
              <CreditCard className="w-6 h-6 text-blue-600" /> Checkout & Drawer Float
            </DialogTitle>
            <DialogDescription>
              Process checkouts, tenders, card swipe entries, or UPI quick response codes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-3">
            {/* Total summary info */}
            <div className="bg-blue-600/5 dark:bg-blue-600/10 p-4 rounded-2xl border border-blue-500/10 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-black">Net Bill Amount Due</span>
              <h3 className="text-3xl font-black font-mono text-blue-600 mt-1">
                ₹{(cartTotals.grandTotal - (overrideApproved ? manualDiscount : 0)).toFixed(2)}
              </h3>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Choose Settlement Method</Label>
              <div className="grid grid-cols-4 gap-2">
                {["cash", "card", "upi", "split"].map(mode => (
                  <Button
                    key={mode}
                    type="button"
                    variant={paymentMode === mode ? "default" : "outline"}
                    onClick={() => {
                      setPaymentMode(mode);
                      setTenderedCash("");
                    }}
                    className="h-10 text-xs font-bold capitalize rounded-xl"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            {/* Conditional Sub-views based on choice */}
            {paymentMode === "cash" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tendered Cash Float (₹)</Label>
                  <Input
                    type="number"
                    value={tenderedCash}
                    onChange={e => setTenderedCash(e.target.value)}
                    placeholder="e.g. 1000"
                    className="h-11 font-mono text-lg bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                {/* Quick cash assist chips */}
                <div className="flex gap-1.5 flex-wrap">
                  {[100, 200, 500, 1000, 2000].map(cashNote => (
                    <Button
                      key={cashNote}
                      size="sm"
                      variant="outline"
                      onClick={() => setTenderedCash(String(cashNote))}
                      className="font-mono text-xs h-7"
                    >
                      +₹{cashNote}
                    </Button>
                  ))}
                </div>

                {/* Change Due block */}
                {tenderedCash && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">Return Drawer Cash Change:</span>
                    <strong className="font-mono text-emerald-600 text-sm">
                      ₹{Math.max(0, Number(tenderedCash) - (cartTotals.grandTotal - (overrideApproved ? manualDiscount : 0))).toFixed(2)}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {paymentMode === "split" && (
              <div className="space-y-3 p-3 border border-border/40 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Cash Tendered</Label>
                    <Input
                      type="number"
                      value={splitPayment.cash}
                      onChange={e => setSplitPayment({ ...splitPayment, cash: e.target.value })}
                      placeholder="0.00"
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Card Swipe</Label>
                    <Input
                      type="number"
                      value={splitPayment.card}
                      onChange={e => setSplitPayment({ ...splitPayment, card: e.target.value })}
                      placeholder="0.00"
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">UPI QR code</Label>
                    <Input
                      type="number"
                      value={splitPayment.upi}
                      onChange={e => setSplitPayment({ ...splitPayment, upi: e.target.value })}
                      placeholder="0.00"
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Manual supervisor override discount */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Manager Security Override Discount
                </Label>
                {overrideApproved ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none font-bold text-[8px]">
                    APPROVED
                  </Badge>
                ) : (
                  <button 
                    onClick={() => setShowSupervisorModal(true)}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Enter supervisor pin
                  </button>
                )}
              </div>
              
              {overrideApproved ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={manualDiscount}
                    onChange={e => setManualDiscount(e.target.value)}
                    placeholder="Enter discount amount"
                    className="h-10 font-mono text-xs bg-slate-50 dark:bg-slate-800"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setOverrideApproved(false);
                      setManualDiscount(0);
                    }}
                    className="h-10 font-bold text-xs"
                  >
                    Revoke
                  </Button>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">Allows manual flat reductions beyond standard TPR promos.</p>
              )}
            </div>

            <DialogFooter className="pt-2 flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCheckout(false)}
                className="flex-1 font-bold h-11"
              >
                Go Back
              </Button>
              <Button
                onClick={handleCheckoutSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold h-11 text-white"
              >
                Complete Sale
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* SUPERVISOR PIN OVERRIDE MODAL */}
      <Dialog open={showSupervisorModal} onOpenChange={setShowSupervisorModal}>
        <DialogContent className="max-w-xs w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 rounded-3xl border border-border">
          <DialogHeader>
            <DialogTitle className="text-md font-black flex items-center gap-1.5 text-amber-600">
              <ShieldAlert className="w-5 h-5" /> Supervisor Authorization
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action requires supervisor verification. Please enter the supervisor PIN.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSupervisorOverride} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Manager Security PIN</Label>
              <Input
                type="password"
                value={supervisorPin}
                onChange={e => setSupervisorPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="h-10 text-center font-mono text-lg bg-slate-50 dark:bg-slate-800"
                maxLength={8}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-10"
            >
              Verify Override
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* THERMAL RECEIPT MODAL FOR SUPERMARKET B2C */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className={`bg-white text-slate-950 p-0 gap-0 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col ${selectedPrintSize === "80mm" ? "sm:max-w-[420px]" : "sm:max-w-[360px]"} max-h-[92vh]`}>
          {/*  Top controls bar  */}
          <div className="flex gap-2 px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
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

          {/*  Scrollable receipt content  */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 bg-[#1a1a2e] flex justify-center thermal-receipt-print-area">
             {lastInvoice && <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generateThermalHTML(lastInvoice, shopSettings, selectedPrintSize)) }} />}
          </div>

          {lastInvoice && (
            <>
              {/* WhatsApp Share Panel */}
              <div className="py-2 px-4 border-t border-dashed border-gray-300 text-left space-y-1 shrink-0">
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

              {/* Actions Footer */}
              <div className="flex flex-wrap gap-2 p-4 pt-3 border-t border-gray-100 shrink-0 bg-white">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReceipt(false)}
                  className="rounded-xl text-slate-700 border-gray-300 h-10 px-3 flex-1 text-xs font-bold min-w-[60px]"
                >
                   Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEditInvoice}
                  className="rounded-xl border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 h-10 px-3 flex-1 text-xs font-bold gap-1 flex items-center justify-center min-w-[60px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="rounded-xl border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100 h-10 px-3 flex-1 text-xs font-bold gap-1 flex items-center justify-center min-w-[60px]"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Receipt - ${lastInvoice.invoice_number}</title>
                        </head>
                        <body onload="window.print(); window.close();" style="margin:0; padding:10px;">
                          ${generateThermalHTML(lastInvoice, shopSettings, selectedPrintSize)}
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="rounded-xl bg-slate-900 hover:bg-black text-white h-10 px-3 flex-[2] text-xs font-bold gap-1.5 flex items-center justify-center min-w-[120px] shadow-md active:scale-95 transition-all"
                >
                  <Printer className="w-4 h-4" /> Print
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
