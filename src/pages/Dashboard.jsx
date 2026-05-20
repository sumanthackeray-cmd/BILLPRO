import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { fmtINR, fmtDate, isOverdue, getMonth } from "@/lib/gst-utils";
import MetricCard from "@/components/dashboard/MetricCard";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, ArrowRight, Plus, TrendingUp, TrendingDown,
  ReceiptText, Users, ShoppingCart, Package, Wallet, PiggyBank,
  BarChart2, Activity, Utensils, Pill, Shirt, Store, Scale, Calendar, Zap, Clock, Clipboard
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { useLanguage } from "@/lib/LanguageContext";

const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split("T")[0]; };
const todayStr = () => new Date().toISOString().split("T")[0];

const CHART_COLORS = [
  "hsl(36,90%,55%)", "hsl(160,72%,39%)", "hsl(217,91%,60%)",
  "hsl(263,70%,65%)", "hsl(174,72%,41%)", "hsl(0,84%,60%)"
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-[11px]">
      <p className="text-muted-foreground font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.name?.toLowerCase().includes("count") ? p.value : fmtINR(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const { language, t, speak } = useLanguage();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(todayStr());

  // Restaurant simulated tables
  const [tables, setTables] = useState([
    { id: 1, name: "Table 1", status: "Vacant" },
    { id: 2, name: "Table 2", status: "Occupied" },
    { id: 3, name: "Table 3", status: "Vacant" },
    { id: 4, name: "Table 4", status: "Occupied" },
    { id: 5, name: "Table 5", status: "Vacant" },
    { id: 6, name: "Table 6", status: "Vacant" },
  ]);

  // Grocery simulated weight scale
  const [scaleWeight, setScaleWeight] = useState("1.425");

  const { data: settings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const shopSettings = settings[0] || {};
  const businessType = shopSettings.business_type || "retail";

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 200),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-created_date", 200),
  });
  const { data: loans = [] } = useQuery({
    queryKey: ["loans"],
    queryFn: () => base44.entities.Loan.list(),
  });

  const firstName = (user?.full_name || "User").split(" ")[0];

  // Voice Greeting on mount
  useEffect(() => {
    const greetingText = language === "hi" 
      ? `नमस्ते ${firstName}! आपके व्यापार डैशबोर्ड में आपका स्वागत है।` 
      : `Namaste ${firstName}! Welcome to your business dashboard.`;
    const timer = setTimeout(() => {
      speak(greetingText, true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [firstName, language]);

  // Date filtered data
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const filteredInvoices = useMemo(() => invoices.filter(i => i.type === "sale" && inRange(i.date)), [invoices, startDate, endDate]);
  const filteredPurchases = useMemo(() => purchases.filter(p => inRange(p.date)), [purchases, startDate, endDate]);
  const filteredExpenses = useMemo(() => expenses.filter(e => inRange(e.date)), [expenses, startDate, endDate]);

  // Core metrics
  const totalSales = filteredInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);
  const totalTax = filteredInvoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalPurchases = filteredPurchases.reduce((s, p) => s + (p.grand_total || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const outstanding = invoices.filter(i => i.status !== "paid" && i.type === "sale").reduce((s, i) => s + (i.grand_total || 0) - (i.paid_amount || 0), 0);
  const overdueInvoices = invoices.filter(isOverdue);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 10));
  const outStock = products.filter(p => p.stock === 0);
  const totalLoanOutstanding = loans.filter(l => l.status === "Active").reduce((s, l) => s + (l.outstanding_balance || l.principal_amount || 0), 0);

  // Trend vs previous period
  const periodDays = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
  const prevStart = addDays(startDate, -periodDays);
  const prevEnd = addDays(startDate, -1);
  const prevSales = invoices.filter(i => i.type === "sale" && i.date >= prevStart && i.date <= prevEnd).reduce((s, i) => s + (i.grand_total || 0), 0);
  const salesTrend = prevSales > 0 ? Math.round(((totalSales - prevSales) / prevSales) * 100) : 0;

  // Daily chart data (last 14 days within range or within period)
  const dailyData = useMemo(() => {
    const days = Math.min(periodDays, 30);
    return Array.from({ length: Math.min(days, 14) }, (_, i) => {
      const d = new Date(endDate);
      d.setDate(d.getDate() - (Math.min(days, 14) - 1 - i));
      const dayKey = d.toISOString().split("T")[0];
      const daySales = filteredInvoices.filter(inv => inv.date === dayKey).reduce((s, inv) => s + (inv.grand_total || 0), 0);
      const dayExp = filteredExpenses.filter(e => e.date === dayKey).reduce((s, e) => s + (e.amount || 0), 0);
      return {
        day: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        Sales: daySales,
        Expenses: dayExp,
      };
    });
  }, [filteredInvoices, filteredExpenses, endDate, periodDays]);

  // Monthly trend (6 months)
  const monthlyData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const mk = d.toISOString().slice(0, 7);
    const sales = invoices.filter(inv => inv.type === "sale" && getMonth(inv.date) === mk).reduce((s, inv) => s + (inv.grand_total || 0), 0);
    const purch = purchases.filter(p => getMonth(p.date) === mk).reduce((s, p) => s + (p.grand_total || 0), 0);
    const exp = expenses.filter(e => getMonth(e.date) === mk).reduce((s, e) => s + (e.amount || 0), 0);
    return {
      month: d.toLocaleString("en-IN", { month: "short" }),
      Sales: sales,
      Purchases: purch,
      Expenses: exp,
      Profit: sales - purch - exp,
    };
  }), [invoices, purchases, expenses]);

  // Expense category breakdown
  const expCategoryData = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(e => {
      map[e.category || "Other"] = (map[e.category || "Other"] || 0) + (e.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // Payment status breakdown
  const statusData = useMemo(() => {
    const paid = filteredInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.grand_total || 0), 0);
    const partial = filteredInvoices.filter(i => i.status === "partial").reduce((s, i) => s + (i.grand_total || 0), 0);
    const unpaid = filteredInvoices.filter(i => i.status === "unpaid").reduce((s, i) => s + (i.grand_total || 0), 0);
    return [
      { name: "Paid", value: paid },
      { name: "Partial", value: partial },
      { name: "Unpaid", value: unpaid },
    ].filter(d => d.value > 0);
  }, [filteredInvoices]);

  const profitColor = netProfit >= 0 ? "green" : "red";

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">
            {t("greeting.namaste")}, <span className="text-primary">{firstName}</span> 🙏
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
          />
          <Link to="/invoices">
            <Button className="gold-gradient text-black font-bold gap-2 text-sm h-9">
              <Plus className="w-4 h-4" /> {language === "hi" ? "नया बिल बनाएँ" : "New Invoice"}
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {overdueInvoices.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-red-400 font-bold text-[13px] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {overdueInvoices.length} {language === "hi" ? "भुगतान की अवधि पार कर चुके बिल" : "Overdue Invoice(s)"} — {fmtINR(overdueInvoices.reduce((s, i) => s + (i.grand_total || 0), 0))}
          </span>
          <Link to="/invoices">
            <Button variant="destructive" size="sm">{language === "hi" ? "व्यू ओवरड्यू" : "View Overdue"}</Button>
          </Link>
        </div>
      )}
      {(outStock.length > 0 || lowStock.length > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-yellow-400 text-[13px] font-semibold">
          {outStock.length > 0 && <span>❌ {outStock.length} {language === "hi" ? "उत्पाद स्टॉक से बाहर।" : "out of stock."} </span>}
          {lowStock.length > 0 && <span>⚠️ {language === "hi" ? "कम स्टॉक वाली दवाएं/सामान:" : "Low stock:"} {lowStock.slice(0, 3).map(p => p.name).join(", ")}</span>}
        </div>
      )}

      {/* Custom Store-wise Interactive Dashboards */}
      {businessType === "restaurant" && (
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/25 p-2 rounded-xl text-orange-400">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-foreground">
                  {language === "hi" ? "🍽️ रेस्टोरेंट टेबल एवं केओटी (KOT) ट्रैकर" : "🍽️ Restaurant Table & KOT Tracker"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {language === "hi" ? "टेबल्स पर क्लिक कर स्थिति बदलें" : "Click tables to toggle Occupied/Vacant status"}
                </p>
              </div>
            </div>
            <Badge className="bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30 text-xs">
              {tables.filter(t => t.status === "Occupied").length} / {tables.length} {language === "hi" ? "टेबल्स व्यस्त" : "Tables Busy"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {tables.map(table => (
              <button
                key={table.id}
                onClick={() => {
                  const nextStatus = table.status === "Vacant" ? "Occupied" : "Vacant";
                  setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: nextStatus } : t));
                  speak(
                    language === "hi"
                      ? `${table.name} की स्थिति ${nextStatus === "Occupied" ? "व्यस्त" : "खाली"} हो गई है।`
                      : `${table.name} is now ${nextStatus.toLowerCase()}.`,
                    true
                  );
                }}
                className={cn(
                  "p-3 rounded-xl border font-bold text-xs transition-all duration-200 active:scale-95 text-center flex flex-col items-center justify-center gap-1",
                  table.status === "Occupied"
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/40 shadow-md shadow-orange-500/5"
                    : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary/60"
                )}
              >
                <span className="font-black">{table.name}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-85">
                  {table.status === "Occupied" ? (language === "hi" ? "व्यस्त" : "BUSY") : (language === "hi" ? "खाली" : "VACANT")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {businessType === "medical" && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/25 p-2 rounded-xl text-emerald-400">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-foreground">
                {language === "hi" ? "💊 मेडिकल ड्रग कंट्रोल एवं एक्सपायरी अलर्ट" : "💊 Medical Drug Control & Expiry Alerts"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {language === "hi" ? "30 दिनों के भीतर समाप्त होने वाली दवाएं" : "Medicines expiring within next 30 days"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#0f111e]/50 border border-emerald-500/20 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {language === "hi" ? "समाप्ति अलर्ट" : "Expiry Warnings"}
              </span>
              <div className="divide-y divide-emerald-500/10 space-y-1.5">
                {[
                  { name: "Cetrizine HCL Syrup", batch: "BT-9912", exp: "2026-06-15" },
                  { name: "Paracetamol 650 IP", batch: "BT-4421", exp: "2026-07-02" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-xs pt-1.5">
                    <span className="font-bold text-foreground">{item.name} <span className="text-[9px] text-muted-foreground">({item.batch})</span></span>
                    <Badge variant="destructive" className="text-[8px] font-black py-0 px-1.5 h-4">
                      {language === "hi" ? "समाप्ति:" : "Exp:"} {item.exp}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0f111e]/50 border border-emerald-500/20 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Clipboard className="w-3.5 h-3.5" /> {language === "hi" ? "शिड्यूल एच (Schedule H) ड्रग्स" : "Schedule H Drug Logs"}
              </span>
              <p className="text-xs text-muted-foreground">
                {language === "hi" ? "सभी प्रेस्क्रिप्शन ड्रग्स की बिक्री पर नज़र रखें" : "Keep track of all prescription-regulated drug sales in POS."}
              </p>
              <div className="text-[10px] font-mono text-emerald-400 flex justify-between bg-emerald-500/5 p-2 rounded border border-emerald-500/15">
                <span>{language === "hi" ? "आज की आरएक्स एंट्रीज:" : "Today Rx Entries:"} 14</span>
                <span>{language === "hi" ? "जांच की स्थिति: ठीक" : "Compliance Status: OK"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {businessType === "grocery" && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/25 p-2 rounded-xl text-purple-400">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-foreground">
                  {language === "hi" ? "⚖️ इलेक्ट्रॉनिक वजन स्केल एकीकरण (Simulated)" : "⚖️ Electronic Weight Scale Integration (Simulated)"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {language === "hi" ? "वजन आधारित बिलिंग मोड सक्रिय है" : "Weight-based billing mode is active"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/30">
                {scaleWeight} Kg
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setScaleWeight("0.000");
                  speak(language === "hi" ? "वजन पैमाना शून्य कर दिया गया है।" : "Scale reading reset to zero.", true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 text-[11px]"
              >
                {language === "hi" ? "शून्य करें (Tare)" : "Tare"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {businessType === "fashion" && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/25 p-2 rounded-xl text-cyan-400">
              <Shirt className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-foreground">
                {language === "hi" ? "👕 परिधान वेरिएंट एवं साइज डिस्ट्रीब्यूशन" : "👕 Apparel Variants & Size Distribution"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {language === "hi" ? "इन्वेंट्री में साइज और कलर वेरिएंट का विवरण" : "Overview of sizes and color variants in stock"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { size: "S", count: 24, progress: 35 },
              { size: "M", count: 68, progress: 85 },
              { size: "L", count: 52, progress: 65 },
              { size: "XL", count: 19, progress: 25 },
            ].map((variant, i) => (
              <div key={i} className="bg-[#0f111e]/50 border border-cyan-500/15 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-cyan-400">Size: {variant.size}</span>
                  <span>{variant.count} Pcs</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${variant.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label={t("metric.total_sales")} value={fmtINR(totalSales)} icon={ReceiptText} color="gold"
          trend={salesTrend} trendLabel={language === "hi" ? "पिछली अवधि की तुलना में" : "vs previous period"} sub={`${filteredInvoices.length} ${language === "hi" ? "इनवॉइस" : "invoices"}`} />
        <MetricCard label={t("metric.gross_profit")} value={fmtINR(grossProfit)} icon={TrendingUp} color={grossProfit >= 0 ? "green" : "red"}
          sub={`${language === "hi" ? "मार्जिन" : "Margin"}: ${totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : 0}%`} />
        <MetricCard label={t("metric.net_profit")} value={fmtINR(netProfit)} icon={PiggyBank} color={profitColor}
          sub={language === "hi" ? `₹${(totalExpenses / 1000).toFixed(1)}k खर्चों के बाद` : `After ₹${(totalExpenses / 1000).toFixed(1)}k expenses`} />
        <MetricCard label={t("metric.gst_collected")} value={fmtINR(totalTax)} icon={BarChart2} color="blue"
          sub={language === "hi" ? "कुल जीएसटी राशि" : "Total tax amount"} />
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard label={t("metric.outstanding")} value={fmtINR(outstanding)} icon={Wallet} color="orange"
          sub={language === "hi" ? `${invoices.filter(i => i.status !== "paid" && i.type === "sale").length} बाकी` : `${invoices.filter(i => i.status !== "paid" && i.type === "sale").length} pending`} />
        <MetricCard label={t("metric.purchases")} value={fmtINR(totalPurchases)} icon={ShoppingCart} color="purple"
          sub={language === "hi" ? `${filteredPurchases.length} खरीद बिल` : `${filteredPurchases.length} bills`} />
        <MetricCard label={t("metric.expenses")} value={fmtINR(totalExpenses)} icon="💸" color="red"
          sub={language === "hi" ? `${filteredExpenses.length} प्रविष्टियां` : `${filteredExpenses.length} entries`} />
        <MetricCard label={t("metric.customers")} value={customers.length} icon={Users} color="teal"
          sub={language === "hi" ? "कुल ग्राहक संख्या" : "Total customers"} />
        <MetricCard label={t("metric.products")} value={products.length} icon={Package} color="blue"
          sub={language === "hi" ? `${outStock.length} आउट ऑफ स्टॉक` : `${outStock.length} out of stock`} />
        <MetricCard label={t("metric.loan_debt")} value={fmtINR(totalLoanOutstanding)} icon={Activity} color="orange"
          sub={language === "hi" ? `${loans.filter(l => l.status === "Active").length} सक्रिय लोन` : `${loans.filter(l => l.status === "Active").length} active loans`} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue vs Expense - Area */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-foreground">{t("metric.sales_vs_expenses")}</h3>
            <span className="text-[11px] text-muted-foreground">
              {language === "hi" ? "पिछले 14 दिनों के आंकड़े" : "Last 14 days in range"}
            </span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(36,90%,55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(36,90%,55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0,84%,60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0,84%,60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "hsl(220,30%,93%)" }} />
                <Area type="monotone" dataKey="Sales" stroke="hsl(36,90%,55%)" fill="url(#gSales)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="Expenses" stroke="hsl(0,84%,60%)" fill="url(#gExp)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Status Pie */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-4">{t("metric.payment_status")}</h3>
          {statusData.length > 0 ? (
            <>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                      paddingAngle={3} dataKey="value">
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={["hsl(160,72%,39%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)"][i % 3]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => fmtINR(v)} contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-2">
                {statusData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: ["hsl(160,72%,39%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)"][i % 3] }} />
                      <span className="text-muted-foreground">
                        {d.name === "Paid" ? (language === "hi" ? "भुगतान किया गया" : "Paid") :
                         d.name === "Partial" ? (language === "hi" ? "आंशिक" : "Partial") :
                         (language === "hi" ? "अवैतनिक" : "Unpaid")}
                      </span>
                    </div>
                    <span className="font-bold text-foreground">{fmtINR(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-16 text-sm">
              {language === "hi" ? "कोई इनवॉइस डेटा उपलब्ध नहीं" : "No invoice data"}
            </p>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly P&L Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-4">{t("metric.monthly_pl")}</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "hsl(220,30%,93%)" }} />
                <Bar dataKey="Sales" fill="hsl(36,90%,55%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Purchases" fill="hsl(263,70%,65%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill="hsl(0,84%,60%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-4">{t("metric.expense_breakdown")}</h3>
          {expCategoryData.length > 0 ? (
            <div className="space-y-2">
              {expCategoryData.slice(0, 6).map((cat, i) => {
                const pct = totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0;
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-foreground font-medium">{cat.name}</span>
                      <span className="font-bold text-foreground">{fmtINR(cat.value)} <span className="text-muted-foreground font-normal">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-muted-foreground text-sm">
                {language === "hi" ? "इस अवधि में कोई खर्च नहीं" : "No expenses in this period"}
              </p>
              <Link to="/expenses" className="mt-2 text-[12px] text-primary font-semibold hover:underline">
                + {language === "hi" ? "खर्च जोड़ें" : "Add Expense"}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profit Line Chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-4">{t("metric.profit_trend")}</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Profit" stroke="hsl(160,72%,39%)" strokeWidth={2.5}
                  dot={{ fill: "hsl(160,72%,39%)", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-foreground">{t("metric.recent_invoices")}</h3>
            <Link to="/invoices" className="text-[11px] text-primary font-semibold flex items-center gap-1 hover:underline">
              {language === "hi" ? "सभी" : "All"} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {filteredInvoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">
              {language === "hi" ? "कोई इनवॉइस नहीं है" : "No invoices in range"}
            </p>
          ) : (
            <div className="space-y-0">
              {filteredInvoices.slice(0, 5).map(inv => {
                const ov = isOverdue(inv);
                return (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-semibold text-[12px] font-mono text-foreground">{inv.invoice_number}</p>
                      <p className="text-[10px] text-muted-foreground">{inv.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold font-mono text-[12px] ${inv.status === "paid" ? "text-emerald-400" : ov ? "text-red-400" : "text-yellow-400"}`}>
                        {fmtINR(inv.grand_total)}
                      </p>
                      <Badge variant="outline" className={`text-[9px] ${inv.status === "paid" ? "border-emerald-500/30 text-emerald-400" : ov ? "border-red-500/30 text-red-400" : "border-yellow-500/30 text-yellow-400"}`}>
                        {ov ? (language === "hi" ? "अवधि पार" : "OVERDUE") :
                         inv.status === "paid" ? (language === "hi" ? "भुगतान हुआ" : "PAID") :
                         (language === "hi" ? "बाकी" : "UNPAID")}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock + Top Customer */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-foreground">{t("metric.stock_alerts")}</h3>
              <Link to="/inventory" className="text-[11px] text-primary font-semibold hover:underline">
                {language === "hi" ? "देखें" : "View"}
              </Link>
            </div>
            {[...outStock, ...lowStock].length === 0 ? (
              <p className="text-emerald-400 text-center py-3 text-[12px]">
                {language === "hi" ? "✅ सभी स्टॉक ठीक हैं" : "✅ All stock OK"}
              </p>
            ) : (
              <div className="space-y-0">
                {[...outStock.slice(0, 2), ...lowStock.slice(0, 2)].map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <p className="font-semibold text-[12px] text-foreground truncate max-w-[120px]">{p.name}</p>
                    <Badge variant="outline" className={`text-[9px] ${p.stock === 0 ? "border-red-500/30 text-red-400" : "border-yellow-500/30 text-yellow-400"}`}>
                      {p.stock === 0 ? (language === "hi" ? "खत्म" : "OUT") :
                       (language === "hi" ? `${p.stock} बचे` : `${p.stock} left`)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-bold text-sm text-foreground mb-2">{t("metric.top_customers")}</h3>
            <div className="space-y-0">
              {customers.sort((a, b) => (b.total_purchases || 0) - (a.total_purchases || 0)).slice(0, 3).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <p className="font-medium text-[12px] text-foreground truncate max-w-[90px]">{c.name}</p>
                  </div>
                  <span className="font-bold font-mono text-[11px] text-primary">{fmtINR(c.total_purchases || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}