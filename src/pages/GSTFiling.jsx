import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBackButton } from "@/hooks/useBackButton";
import { base44 } from "@/api/base44Client";
import { fmtINR, fmtDate, getMonth } from "@/lib/gst-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, AlertTriangle, CheckCircle2, Clock, FileText, TrendingUp, TrendingDown, Info } from "lucide-react";
import { toast } from "@/lib/toast";
import { SearchableSelect } from "@/components/ui/searchable-select";

// GST Filing deadlines per month
const FILING_DEADLINES = {
  "GSTR-1": { day: 11, label: "GSTR-1 (Monthly Outward Supplies)" },
  "GSTR-3B": { day: 20, label: "GSTR-3B (Monthly Summary Return)" },
  "GSTR-9": { day: null, label: "GSTR-9 (Annual Return - Dec 31)" },
};

function getDeadlines() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const results = [];

  // GSTR-1: 11th of next month for previous month
  const gstr1Due = new Date(year, month + 1, 11);
  const gstr3bDue = new Date(year, month + 1, 20);

  results.push({
    name: "GSTR-1",
    dueDate: gstr1Due,
    description: `For ${new Date(year, month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}`,
    daysLeft: Math.ceil((gstr1Due - today) / (1000 * 60 * 60 * 24)),
    type: "monthly",
  });
  results.push({
    name: "GSTR-3B",
    dueDate: gstr3bDue,
    description: `For ${new Date(year, month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}`,
    daysLeft: Math.ceil((gstr3bDue - today) / (1000 * 60 * 60 * 24)),
    type: "monthly",
  });
  results.push({
    name: "GSTR-9",
    dueDate: new Date(year, 11, 31),
    description: `Annual Return for FY ${year}-${String(year + 1).slice(-2)}`,
    daysLeft: Math.ceil((new Date(year, 11, 31) - today) / (1000 * 60 * 60 * 24)),
    type: "annual",
  });
  return results;
}

// Generate MONTHS dropdown (last 12 months)
function getLast12Months() {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    });
  }
  return months;
}

// Build GSTR-1 data from invoices
function buildGSTR1(invoices, month) {
  const salesInvoices = invoices.filter(
    (inv) => inv.type === "sale" && getMonth(inv.date) === month
  );

  const b2b = salesInvoices.filter((inv) => inv.customer_gstin);
  const b2c = salesInvoices.filter((inv) => !inv.customer_gstin);

  const b2bData = b2b.map((inv) => ({
    ctin: inv.customer_gstin,
    receiver_name: inv.customer_name,
    invoice_no: inv.invoice_number,
    invoice_date: inv.date,
    invoice_value: inv.grand_total,
    place_of_supply: inv.place_of_supply || "27-Maharashtra",
    reverse_charge: "N",
    invoice_type: "Regular",
    taxable_value: inv.subtotal || 0,
    igst: inv.is_interstate ? inv.tax_amount : 0,
    cgst: !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
    sgst: !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
    cess: 0,
  }));

  const hsnSummary = {};
  salesInvoices.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      const key = item.hsn || "0000";
      if (!hsnSummary[key]) {
        hsnSummary[key] = { hsn: key, description: item.name, uqc: item.unit || "PCS", total_qty: 0, total_value: 0, taxable_value: 0, integrated_tax: 0, central_tax: 0, state_tax: 0, cess: 0 };
      }
      const taxable = (item.qty || 0) * (item.rate || 0);
      const tax = (taxable * (item.gst_rate || 0)) / 100;
      hsnSummary[key].total_qty += item.qty || 0;
      hsnSummary[key].total_value += taxable + tax;
      hsnSummary[key].taxable_value += taxable;
      hsnSummary[key].integrated_tax += inv.is_interstate ? tax : 0;
      hsnSummary[key].central_tax += !inv.is_interstate ? tax / 2 : 0;
      hsnSummary[key].state_tax += !inv.is_interstate ? tax / 2 : 0;
    });
  });

  return {
    gstin: "YOUR_GSTIN",
    fp: month.replace("-", ""),
    version: "GST3.0.4",
    hash: "hash",
    b2b: [{ ctin: b2bData[0]?.ctin || "", inv: b2bData }],
    b2cs: b2c.map((inv) => ({
      sply_ty: inv.is_interstate ? "INTER" : "INTRA",
      pos: inv.place_of_supply || "27",
      rt: (inv.items?.[0]?.gst_rate) || 18,
      txval: inv.subtotal || 0,
      iamt: inv.is_interstate ? inv.tax_amount : 0,
      camt: !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
      samt: !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
      csamt: 0,
    })),
    hsn: { data: Object.values(hsnSummary) },
  };
}

// Build GSTR-3B from invoices + purchases
function buildGSTR3B(invoices, purchases, month) {
  const salesInvoices = invoices.filter(
    (inv) => inv.type === "sale" && getMonth(inv.date) === month
  );
  const monthPurchases = purchases.filter((p) => getMonth(p.date) === month);

  const totalTaxable = salesInvoices.reduce((s, i) => s + (i.subtotal || 0), 0);
  const totalIGST = salesInvoices.filter((i) => i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalCGST = salesInvoices.filter((i) => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0);
  const totalSGST = totalCGST;

  const inputTaxable = monthPurchases.reduce((s, p) => s + ((p.grand_total || 0) - (p.grand_total * 0.18 / 1.18)), 0);
  const inputIGST = monthPurchases.reduce((s, p) => s + (p.grand_total || 0) * 0.18 / 1.18 * 0.5, 0);
  const inputCGST = inputIGST / 2;
  const inputSGST = inputIGST / 2;

  return {
    gstin: "YOUR_GSTIN",
    ret_period: month.replace("-", ""),
    sup_details: {
      osup_det: { txval: totalTaxable, iamt: totalIGST, camt: totalCGST, samt: totalSGST, csamt: 0 },
      osup_zero: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      osup_nil_exmp: { txval: 0 },
      isup_rev: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      osup_nongst: { txval: 0 },
    },
    itc_elg: {
      itc_avl: [
        { ty: "IMPG", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "IMPS", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "ISRC", iamt: inputIGST, camt: inputCGST, samt: inputSGST, csamt: 0 },
        { ty: "ISD", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "OTH", iamt: 0, camt: 0, samt: 0, csamt: 0 },
      ],
      itc_rev: [
        { ty: "RUL_37", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "OTH", iamt: 0, camt: 0, samt: 0, csamt: 0 },
      ],
      itc_net: { iamt: inputIGST, camt: inputCGST, samt: inputSGST, csamt: 0 },
      itc_inelg: [
        { ty: "RUL_38", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "OTH", iamt: 0, camt: 0, samt: 0, csamt: 0 },
      ],
    },
    intr_ltfee: {
      intr_details: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
    },
  };
}

export default function GSTFiling() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [activeTab, setActiveTab] = useState("deadlines");
  useBackButton(() => setActiveTab("deadlines"), activeTab !== "deadlines");

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-date", 500),
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-date", 500),
  });
  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });

  const shopSettings = settings[0] || {};
  const months = getLast12Months();
  const deadlines = getDeadlines();

  const salesForMonth = useMemo(
    () => invoices.filter((i) => i.type === "sale" && getMonth(i.date) === selectedMonth),
    [invoices, selectedMonth]
  );
  const purchasesForMonth = useMemo(
    () => purchases.filter((p) => getMonth(p.date) === selectedMonth),
    [purchases, selectedMonth]
  );

  const totalSales = salesForMonth.reduce((s, i) => s + (i.grand_total || 0), 0);
  const totalTax = salesForMonth.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalSubtotal = salesForMonth.reduce((s, i) => s + (i.subtotal || 0), 0);
  const totalPurchases = purchasesForMonth.reduce((s, p) => s + (p.grand_total || 0), 0);
  const b2bCount = salesForMonth.filter((i) => i.customer_gstin).length;
  const b2cCount = salesForMonth.filter((i) => !i.customer_gstin).length;
  const interstateCount = salesForMonth.filter((i) => i.is_interstate).length;
  const estimatedITC = totalPurchases * 0.15;
  const netTaxPayable = Math.max(0, totalTax - estimatedITC);

  const exportGSTR1 = () => {
    const data = buildGSTR1(invoices, selectedMonth);
    data.gstin = shopSettings.gstin || "ENTER_YOUR_GSTIN";
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_${selectedMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GSTR-1 JSON exported for GST portal!");
  };

  const exportGSTR3B = () => {
    const data = buildGSTR3B(invoices, purchases, selectedMonth);
    data.gstin = shopSettings.gstin || "ENTER_YOUR_GSTIN";
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR3B_${selectedMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GSTR-3B JSON exported for GST portal!");
  };

  const exportGSTR1CSV = () => {
    const rows = [
      ["GSTIN of Supplier", "Trade Name", "Invoice No", "Invoice Date", "Invoice Value", "Taxable Value", "IGST", "CGST", "SGST"],
      ...salesForMonth.map((inv) => [
        shopSettings.gstin || "",
        shopSettings.shop_name === "Vogats" ? "" : (shopSettings.shop_name || ""),
        inv.invoice_number,
        fmtDate(inv.date),
        inv.grand_total,
        inv.subtotal || 0,
        inv.is_interstate ? inv.tax_amount : 0,
        !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
        !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GSTR-1 CSV exported!");
  };

  // HSN Summary
  const hsnSummary = useMemo(() => {
    const map = {};
    salesForMonth.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const key = item.hsn || "0000";
        if (!map[key]) map[key] = { hsn: key, qty: 0, value: 0, tax: 0 };
        map[key].qty += item.qty || 0;
        map[key].value += (item.qty || 0) * (item.rate || 0);
        map[key].tax += ((item.qty || 0) * (item.rate || 0) * (item.gst_rate || 0)) / 100;
      });
    });
    return Object.values(map);
  }, [salesForMonth]);

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1 bg-gradient-to-r from-card/60 to-transparent rounded-2xl border border-border/30 backdrop-blur-sm">
        <div className="px-4 py-2">
          <h1 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(245,158,11,0.2)]">
            🏛️ GST Compliance & Filing
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Auto-generate GSTR-1 & GSTR-3B returns · Export compliant schemas for GSTN Portal
          </p>
        </div>
        <div className="flex gap-3 items-center px-4">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Tax Period:</span>
          <SearchableSelect
            className="w-48 text-xs bg-secondary/50 border-amber-500/20 hover:border-amber-500/40 transition-colors"
            options={months.map(m => ({ value: m.value, label: m.label }))}
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            placeholder="Select Month"
            searchPlaceholder="Search month..."
          />
        </div>
      </div>

      {/* Deadline Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {deadlines.map((d) => {
          const isUrgent = d.daysLeft <= 5;
          const isWarning = d.daysLeft <= 15 && d.daysLeft > 5;
          const isPast = d.daysLeft < 0;
          return (
            <div
              key={d.name}
              className={`relative overflow-hidden rounded-xl border p-4 flex items-start gap-4 transition-all duration-300 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] group hover:-translate-y-0.5 ${
                isPast
                  ? "bg-red-500/5 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                  : isUrgent
                    ? "bg-red-500/5 border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.08)]"
                    : isWarning
                      ? "bg-amber-500/5 border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                      : "bg-card/40 border-border/80 hover:border-amber-500/20"
              }`}
            >
              {/* Highlight accent bar */}
              <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                isPast || isUrgent ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
              }`} />

              <div className="mt-0.5 shrink-0 relative">
                {isPast || isUrgent ? (
                  <div className="relative">
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                ) : isWarning ? (
                  <div className="relative">
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                  </div>
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-sm tracking-wide text-foreground">{d.name}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                    isPast || isUrgent ? "bg-red-500/10 text-red-400" : isWarning ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {d.type}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{d.description}</p>
                <p className={`text-[12px] font-black mt-2 flex items-center gap-1 ${
                  isPast ? "text-red-400" : isUrgent ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {isPast ? (
                    `Overdue by ${Math.abs(d.daysLeft)} days`
                  ) : (
                    <>
                      <span className="relative flex h-1.5 w-1.5 rounded-full bg-current" />
                      {d.daysLeft} days left
                    </>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1 font-mono">
                  Due: {d.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Taxable Sales",
            value: fmtINR(totalSubtotal),
            icon: <TrendingUp className="w-4 h-4" />,
            color: "text-emerald-400",
            glow: "shadow-[0_0_15px_rgba(16,185,129,0.08)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
            border: "hover:border-emerald-500/30",
            iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          },
          {
            label: "Tax Collected",
            value: fmtINR(totalTax),
            icon: <span className="text-xs font-black">GST</span>,
            color: "text-amber-400",
            glow: "shadow-[0_0_15px_rgba(245,158,11,0.08)] hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]",
            border: "hover:border-amber-500/30",
            iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-400"
          },
          {
            label: "Est. ITC",
            value: fmtINR(estimatedITC),
            icon: <TrendingDown className="w-4 h-4" />,
            color: "text-blue-400",
            glow: "shadow-[0_0_15px_rgba(59,130,246,0.08)] hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]",
            border: "hover:border-blue-500/30",
            iconBg: "bg-blue-500/10 border-blue-500/20 text-blue-400"
          },
          {
            label: "Net Tax Payable",
            value: fmtINR(netTaxPayable),
            icon: <span className="text-xs font-black">PAY</span>,
            color: "text-rose-400",
            glow: "shadow-[0_0_15px_rgba(244,63,94,0.08)] hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]",
            border: "hover:border-rose-500/30",
            iconBg: "bg-rose-500/10 border-rose-500/20 text-rose-400"
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-card/45 backdrop-blur-md border border-border/80 rounded-xl p-4 flex flex-col justify-between h-[115px] transition-all duration-300 group hover:-translate-y-0.5 ${s.glow} ${s.border}`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">{s.label}</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center border font-mono font-bold transition-all duration-300 group-hover:scale-105 ${s.iconBg}`}>
                {s.icon}
              </div>
            </div>
            <div className="mt-2">
              <p className={`text-xl font-black font-mono tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)] ${s.color}`}>
                {s.value}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                Live recalculation
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-secondary/40 border border-border/50 h-auto flex flex-wrap gap-1 p-1 rounded-xl backdrop-blur-sm">
          <TabsTrigger
            value="deadlines"
            className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:shadow-md transition-all"
          >
            📅 Compliance Calendar
          </TabsTrigger>
          <TabsTrigger
            value="gstr1"
            className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:shadow-md transition-all"
          >
            📤 GSTR-1 (Outward Supplies)
          </TabsTrigger>
          <TabsTrigger
            value="gstr3b"
            className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:shadow-md transition-all"
          >
            📋 GSTR-3B (Summary Return)
          </TabsTrigger>
          <TabsTrigger
            value="hsn"
            className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:shadow-md transition-all"
          >
            🔢 HSN Summaries
          </TabsTrigger>
        </TabsList>

        {/* DEADLINES TAB */}
        <TabsContent value="deadlines" className="mt-2 outline-none">
          <div className="bg-card/50 backdrop-blur-md border border-border/80 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Info className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-foreground">Compliance Filing Calendar</h3>
                <p className="text-[11px] text-muted-foreground">Core schedules, thresholds, and statutory schedules for GST filings</p>
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {[
                { name: "GSTR-1", freq: "Monthly", due: "11th of next month", who: "All registered taxpayers with turnover > ₹5Cr", status: "Monthly outward supply details", border: "border-l-amber-500" },
                { name: "GSTR-3B", freq: "Monthly", due: "20th of next month", who: "All regular taxpayers", status: "Summary return with tax payment", border: "border-l-blue-500" },
                { name: "GSTR-2A/2B", freq: "Auto", due: "Auto-populated", who: "For ITC reconciliation", status: "Auto-drafted inward supply", border: "border-l-emerald-500" },
                { name: "GSTR-9", freq: "Annual", due: "31st December", who: "Taxpayers with turnover > ₹2Cr", status: "Annual consolidated return", border: "border-l-purple-500" },
                { name: "GSTR-9C", freq: "Annual", due: "31st December", who: "Taxpayers with turnover > ₹5Cr", status: "Reconciliation statement", border: "border-l-rose-500" },
              ].map((item) => (
                <div
                  key={item.name}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 pl-3 border-l-4 ${item.border} hover:bg-secondary/10 transition-colors duration-150 rounded-r-lg`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-16 shrink-0 mt-0.5">
                      <Badge className="gold-gradient text-black text-[10px] font-black tracking-wider uppercase px-2 py-0.5 border-none shadow-[0_2px_8px_rgba(245,158,11,0.2)]">
                        {item.name}
                      </Badge>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm text-foreground">{item.status}</p>
                      <p className="text-[11px] text-muted-foreground">{item.who}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0 pr-2">
                    <p className="text-xs font-black text-amber-500 tracking-wide">{item.due}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">{item.freq}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* GSTR-1 TAB */}
        <TabsContent value="gstr1" className="mt-2 outline-none space-y-4">
          <div className="bg-card/50 backdrop-blur-md border border-border/80 rounded-xl p-5 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">GSTR-1 Outward Supplies Summary</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Tax period: <span className="font-semibold text-foreground">{months.find((m) => m.value === selectedMonth)?.label}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={exportGSTR1CSV} className="gap-1.5 text-xs hover:border-amber-500/30">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </Button>
                <Button size="sm" className="gold-gradient text-black font-extrabold gap-1.5 text-xs shadow-md border-none" onClick={exportGSTR1}>
                  <Download className="w-3.5 h-3.5" /> Export Compliant JSON
                </Button>
              </div>
            </div>

            {salesForMonth.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border/80 rounded-xl">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20 text-muted-foreground" />
                <p className="text-sm font-semibold text-muted-foreground">No invoices recorded in this tax period</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Select a different month or record sales under POS Billing</p>
              </div>
            ) : (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Invoices", value: salesForMonth.length, border: "hover:border-amber-500/30" },
                    { label: "B2B Supplies", value: b2bCount, border: "hover:border-blue-500/30" },
                    { label: "B2C Supplies", value: b2cCount, border: "hover:border-emerald-500/30" },
                    { label: "Interstate", value: interstateCount, border: "hover:border-purple-500/30" },
                  ].map((s) => (
                    <div key={s.label} className={`bg-secondary/20 border border-border/60 rounded-xl p-3.5 text-center transition-all duration-300 ${s.border}`}>
                      <p className="text-xl font-black text-amber-500 font-mono tracking-tight">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Invoice Table with modern styling and horizontal scrollbar */}
                <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/20 scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent">
                  <table className="w-full text-xs min-w-[850px] border-collapse">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-border/80 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                        <th className="text-left px-4 py-3">Invoice No</th>
                        <th className="text-left px-4 py-3">Date</th>
                        <th className="text-left px-4 py-3">Customer</th>
                        <th className="text-left px-4 py-3">GSTIN</th>
                        <th className="text-right px-4 py-3">Taxable Value</th>
                        <th className="text-right px-4 py-3">IGST (Intra)</th>
                        <th className="text-right px-4 py-3">CGST</th>
                        <th className="text-right px-4 py-3">SGST</th>
                        <th className="text-right px-4 py-3">Total Invoice Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {salesForMonth.map((inv) => (
                        <tr key={inv.id} className="hover:bg-secondary/25 transition-colors duration-150">
                          <td className="px-4 py-2.5 font-mono font-extrabold text-amber-500">{inv.invoice_number}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(inv.date)}</td>
                          <td className="px-4 py-2.5 font-semibold text-foreground max-w-[140px] truncate">{inv.customer_name}</td>
                          <td className="px-4 py-2.5 font-mono text-[10px] font-bold">
                            {inv.customer_gstin ? (
                              <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{inv.customer_gstin}</span>
                            ) : (
                              <span className="text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">B2C</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-medium text-right text-foreground">{fmtINR(inv.subtotal || 0)}</td>
                          <td className="px-4 py-2.5 font-mono text-right text-muted-foreground">{inv.is_interstate ? fmtINR(inv.tax_amount || 0) : "—"}</td>
                          <td className="px-4 py-2.5 font-mono text-right text-muted-foreground">{!inv.is_interstate ? fmtINR((inv.tax_amount || 0) / 2) : "—"}</td>
                          <td className="px-4 py-2.5 font-mono text-right text-muted-foreground">{!inv.is_interstate ? fmtINR((inv.tax_amount || 0) / 2) : "—"}</td>
                          <td className="px-4 py-2.5 font-mono font-black text-right text-foreground">{fmtINR(inv.grand_total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border/80 bg-secondary/50 font-bold">
                        <td colSpan={4} className="px-4 py-3 text-xs font-black uppercase tracking-wider text-foreground">CONSOLIDATED TOTAL</td>
                        <td className="px-4 py-3 font-black font-mono text-right text-foreground">{fmtINR(totalSubtotal)}</td>
                        <td className="px-4 py-3 font-bold font-mono text-right text-muted-foreground">{fmtINR(salesForMonth.filter(i => i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0), 0))}</td>
                        <td className="px-4 py-3 font-bold font-mono text-right text-muted-foreground">{fmtINR(salesForMonth.filter(i => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0))}</td>
                        <td className="px-4 py-3 font-bold font-mono text-right text-muted-foreground">{fmtINR(salesForMonth.filter(i => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0))}</td>
                        <td className="px-4 py-3 font-black font-mono text-right text-amber-500">{fmtINR(totalSales)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* GSTR-3B TAB */}
        <TabsContent value="gstr3b" className="mt-2 outline-none space-y-4">
          <div className="bg-card/50 backdrop-blur-md border border-border/80 rounded-xl p-5 shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">GSTR-3B Summary Return Worksheet</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Tax period: <span className="font-semibold text-foreground">{months.find((m) => m.value === selectedMonth)?.label}</span>
                  </p>
                </div>
              </div>
              <Button size="sm" className="gold-gradient text-black font-extrabold gap-1.5 text-xs shadow-md border-none" onClick={exportGSTR3B}>
                <Download className="w-3.5 h-3.5" /> Export Compliant JSON
              </Button>
            </div>

            <div className="space-y-6">
              {/* 3.1 Outward Supplies Table */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <p className="text-xs font-black text-foreground uppercase tracking-wide">3.1 Details of Outward Supplies & inward supplies liable to reverse charge</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/25 scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent">
                  <table className="w-full text-xs min-w-[750px] border-collapse">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-border/80 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                        <th className="text-left px-4 py-3">Nature of Supplies</th>
                        <th className="text-right px-4 py-3">Total Taxable Value (₹)</th>
                        <th className="text-right px-4 py-3">Integrated Tax (IGST) (₹)</th>
                        <th className="text-right px-4 py-3">Central Tax (CGST) (₹)</th>
                        <th className="text-right px-4 py-3">State/UT Tax (SGST) (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {[
                        {
                          label: "3.1(a) Outward taxable supplies (other than zero rated, nil rated and exempted)",
                          taxable: totalSubtotal,
                          igst: salesForMonth.filter(i => i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0), 0),
                          cgst: salesForMonth.filter(i => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0),
                          sgst: salesForMonth.filter(i => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0)
                        },
                        { label: "3.1(b) Outward taxable supplies (zero rated)", taxable: 0, igst: 0, cgst: 0, sgst: 0 },
                        { label: "3.1(c) Other outward supplies (Nil rated, exempted)", taxable: 0, igst: 0, cgst: 0, sgst: 0 },
                        { label: "3.1(d) Inward supplies liable to reverse charge", taxable: 0, igst: 0, cgst: 0, sgst: 0 },
                        { label: "3.1(e) Non-GST outward supplies", taxable: 0, igst: 0, cgst: 0, sgst: 0 }
                      ].map((row) => (
                        <tr key={row.label} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-2.5 text-foreground font-semibold text-[11px] leading-relaxed max-w-[280px]">{row.label}</td>
                          <td className="px-4 py-2.5 font-mono text-right text-foreground">{fmtINR(row.taxable)}</td>
                          <td className="px-4 py-2.5 font-mono text-right text-muted-foreground">{row.igst > 0 ? fmtINR(row.igst) : "₹0.00"}</td>
                          <td className="px-4 py-2.5 font-mono text-right text-muted-foreground">{row.cgst > 0 ? fmtINR(row.cgst) : "₹0.00"}</td>
                          <td className="px-4 py-2.5 font-mono text-right text-muted-foreground">{row.sgst > 0 ? fmtINR(row.sgst) : "₹0.00"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border/80 bg-secondary/50 font-bold">
                        <td className="px-4 py-3 text-xs font-black uppercase text-foreground">3.1 CONSOLIDATED TOTAL</td>
                        <td className="px-4 py-3 font-black font-mono text-right text-foreground">{fmtINR(totalSubtotal)}</td>
                        <td className="px-4 py-3 font-black font-mono text-right text-amber-500">{fmtINR(salesForMonth.filter(i => i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0), 0))}</td>
                        <td className="px-4 py-3 font-black font-mono text-right text-amber-500">{fmtINR(salesForMonth.filter(i => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0))}</td>
                        <td className="px-4 py-3 font-black font-mono text-right text-amber-500">{fmtINR(salesForMonth.filter(i => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 4. Eligible ITC Table */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <p className="text-xs font-black text-foreground uppercase tracking-wide">4. Details of Eligible Input Tax Credit (ITC)</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/25 scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent">
                  <table className="w-full text-xs min-w-[750px] border-collapse">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-border/80 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                        <th className="text-left px-4 py-3">ITC Segment</th>
                        <th className="text-right px-4 py-3">Integrated Tax (IGST) (₹)</th>
                        <th className="text-right px-4 py-3">Central Tax (CGST) (₹)</th>
                        <th className="text-right px-4 py-3">State/UT Tax (SGST) (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {[
                        {
                          label: "4(A) ITC Available (whether in full or part) - All other ITC (est. from purchases)",
                          igst: estimatedITC * 0.5,
                          cgst: estimatedITC * 0.25,
                          sgst: estimatedITC * 0.25
                        },
                        { label: "4(B) ITC Reversed (As per Rules 37, 39, 42 & 43)", igst: 0, cgst: 0, sgst: 0 },
                        {
                          label: "4(C) Net ITC Available (4(A) minus 4(B))",
                          igst: estimatedITC * 0.5,
                          cgst: estimatedITC * 0.25,
                          sgst: estimatedITC * 0.25
                        },
                        { label: "4(D) Other Details / Ineligible ITC (Section 17(5))", igst: 0, cgst: 0, sgst: 0 }
                      ].map((row) => {
                        const isNet = row.label.includes("Net ITC");
                        return (
                          <tr key={row.label} className={`hover:bg-secondary/20 transition-colors ${isNet ? "bg-secondary/15 font-semibold text-foreground border-t border-border" : ""}`}>
                            <td className="px-4 py-2.5 text-foreground font-semibold text-[11px] leading-relaxed max-w-[280px]">{row.label}</td>
                            <td className="px-4 py-2.5 font-mono text-right text-foreground">{row.igst > 0 ? fmtINR(row.igst) : "₹0.00"}</td>
                            <td className="px-4 py-2.5 font-mono text-right text-foreground">{row.cgst > 0 ? fmtINR(row.cgst) : "₹0.00"}</td>
                            <td className="px-4 py-2.5 font-mono text-right text-foreground">{row.sgst > 0 ? fmtINR(row.sgst) : "₹0.00"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Tax Liability Fintech Card */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-xl p-5 shadow-[0_4px_24px_rgba(245,158,11,0.06)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full filter blur-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Gross Outward Tax Liability</p>
                    <p className="text-xl font-black text-red-400 font-mono tracking-tight">{fmtINR(totalTax)}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">To be declared in Section 3.1</p>
                  </div>
                  <div className="space-y-1 sm:border-l sm:border-border/60 sm:pl-5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Eligible Input Tax Credit (ITC)</p>
                    <p className="text-xl font-black text-emerald-400 font-mono tracking-tight">{fmtINR(estimatedITC)}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Available for electronic credit ledger offset</p>
                  </div>
                  <div className="space-y-1 sm:border-l sm:border-border/60 sm:pl-5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Net Cash Tax Payable (Est.)</p>
                    <p className="text-2xl font-black text-amber-500 font-mono tracking-tight drop-shadow-[0_2px_8px_rgba(245,158,11,0.2)]">{fmtINR(netTaxPayable)}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Payable from Electronic Cash Ledger</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* HSN SUMMARY TAB */}
        <TabsContent value="hsn" className="mt-2 outline-none">
          <div className="bg-card/50 backdrop-blur-md border border-border/80 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-xs text-amber-500">
                  🔢
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">HSN-wise Summary of Outward Supplies</h3>
                  <p className="text-[11px] text-muted-foreground">Mandatory reporting for GST returns based on harmonized product codes</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] px-2.5 py-0.5 border-amber-500/20 text-amber-500 bg-amber-500/5 font-extrabold font-mono uppercase">
                {hsnSummary.length} Active HSN Codes
              </Badge>
            </div>
            {hsnSummary.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border/80 rounded-xl">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20 text-muted-foreground" />
                <p className="text-sm font-semibold text-muted-foreground">No HSN data available for this tax period</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Ensure HSN codes are set on product items in the catalog</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/20 scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent">
                <table className="w-full text-xs min-w-[650px] border-collapse">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border/80 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                      <th className="text-left px-4 py-3">HSN/SAC Code</th>
                      <th className="text-left px-4 py-3">Description</th>
                      <th className="text-right px-4 py-3">Total Quantity</th>
                      <th className="text-right px-4 py-3">Total Taxable Value</th>
                      <th className="text-right px-4 py-3">Integrated/Central/State Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {hsnSummary.map((row) => (
                      <tr key={row.hsn} className="hover:bg-secondary/25 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-extrabold text-amber-500">{row.hsn}</td>
                        <td className="px-4 py-2.5 text-muted-foreground italic font-medium">—</td>
                        <td className="px-4 py-2.5 font-mono text-right text-foreground font-semibold">{row.qty.toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-right text-foreground">{fmtINR(row.value)}</td>
                        <td className="px-4 py-2.5 font-mono font-black text-right text-foreground">{fmtINR(row.tax)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border/80 bg-secondary/50 font-bold">
                      <td colSpan={2} className="px-4 py-3 text-xs font-black uppercase text-foreground">CONSOLIDATED HSN TOTAL</td>
                      <td className="px-4 py-3 font-black font-mono text-right text-foreground">{hsnSummary.reduce((s, r) => s + r.qty, 0).toFixed(2)}</td>
                      <td className="px-4 py-3 font-black font-mono text-right text-foreground">{fmtINR(hsnSummary.reduce((s, r) => s + r.value, 0))}</td>
                      <td className="px-4 py-3 font-black font-mono text-right text-amber-500">{fmtINR(hsnSummary.reduce((s, r) => s + r.tax, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Banner */}
      <div className="bg-blue-500/5 border border-blue-500/25 rounded-xl p-4 flex gap-3 shadow-[0_4px_12px_rgba(59,130,246,0.04)]">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-extrabold text-foreground uppercase tracking-wide">Filing Notice:</span> Auto-generated returns are formatted to map perfectly to GSTR-1 and GSTR-3B offline tool JSON schema specifications for rapid single-click uploads. Input Tax Credit (ITC) estimates are auto-computed from purchase records — always reconcile against the statutory <span className="text-blue-400 font-semibold">GSTR-2B statement</span> available in your GSTN portal before submitting final returns.
        </div>
      </div>
    </div>
  );
}