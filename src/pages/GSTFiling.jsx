import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, fmtDate, getMonth } from "@/lib/gst-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">🏛️ GST Filing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Auto-generate GSTR-1 & GSTR-3B · Export for GST Portal
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <SearchableSelect
            className="w-48 text-sm"
            options={months.map(m => ({ value: m.value, label: m.label }))}
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            placeholder="Select Month"
            searchPlaceholder="Search month..."
          />
        </div>
      </div>

      {/* Deadline Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {deadlines.map((d) => {
          const isUrgent = d.daysLeft <= 5;
          const isWarning = d.daysLeft <= 15 && d.daysLeft > 5;
          const isPast = d.daysLeft < 0;
          return (
            <div
              key={d.name}
              className={`rounded-xl border p-4 flex items-start gap-3 ${isPast
                  ? "bg-red-500/10 border-red-500/30"
                  : isUrgent
                    ? "bg-red-500/8 border-red-500/25"
                    : isWarning
                      ? "bg-yellow-500/8 border-yellow-500/25"
                      : "bg-card border-border"
                }`}
            >
              <div className="mt-0.5 shrink-0">
                {isPast ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : isUrgent ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : isWarning ? (
                  <Clock className="w-5 h-5 text-yellow-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{d.name}</p>
                <p className="text-[11px] text-muted-foreground">{d.description}</p>
                <p className={`text-[12px] font-bold mt-1 ${isPast ? "text-red-400" : isUrgent ? "text-red-400" : isWarning ? "text-yellow-400" : "text-emerald-400"}`}>
                  {isPast
                    ? `Overdue by ${Math.abs(d.daysLeft)} days`
                    : `${d.daysLeft} days left`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Due: {d.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Taxable Sales", value: fmtINR(totalSubtotal), icon: <TrendingUp className="w-4 h-4" />, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Tax Collected", value: fmtINR(totalTax), icon: "🏛️", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
          { label: "Est. ITC", value: fmtINR(estimatedITC), icon: <TrendingDown className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Net Tax Payable", value: fmtINR(netTaxPayable), icon: "💳", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <div className={`text-xl ${s.color}`}>{typeof s.icon === "string" ? s.icon : s.icon}</div>
            <p className={`text-lg font-black font-mono ${s.color} mt-1`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="deadlines" className="text-[12px] data-[state=active]:bg-primary data-[state=active]:text-black">
            📅 Deadlines
          </TabsTrigger>
          <TabsTrigger value="gstr1" className="text-[12px] data-[state=active]:bg-primary data-[state=active]:text-black">
            📤 GSTR-1
          </TabsTrigger>
          <TabsTrigger value="gstr3b" className="text-[12px] data-[state=active]:bg-primary data-[state=active]:text-black">
            📋 GSTR-3B
          </TabsTrigger>
          <TabsTrigger value="hsn" className="text-[12px] data-[state=active]:bg-primary data-[state=active]:text-black">
            🔢 HSN Summary
          </TabsTrigger>
        </TabsList>

        {/* DEADLINES TAB */}
        <TabsContent value="deadlines" className="mt-4 space-y-3">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Filing Calendar</h3>
            </div>
            <div className="space-y-3">
              {[
                { name: "GSTR-1", freq: "Monthly", due: "11th of next month", who: "All registered taxpayers with turnover > ₹5Cr", status: "Monthly outward supply details" },
                { name: "GSTR-3B", freq: "Monthly", due: "20th of next month", who: "All regular taxpayers", status: "Summary return with tax payment" },
                { name: "GSTR-2A/2B", freq: "Auto", due: "Auto-populated", who: "For ITC reconciliation", status: "Auto-drafted inward supply" },
                { name: "GSTR-9", freq: "Annual", due: "31st December", who: "Taxpayers with turnover > ₹2Cr", status: "Annual consolidated return" },
                { name: "GSTR-9C", freq: "Annual", due: "31st December", who: "Taxpayers with turnover > ₹5Cr", status: "Reconciliation statement" },
              ].map((item) => (
                <div key={item.name} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-16 shrink-0">
                      <Badge className="gold-gradient text-black text-[10px] font-extrabold">{item.name}</Badge>
                    </div>
                    <div>
                      <p className="font-semibold text-[13px]">{item.status}</p>
                      <p className="text-[11px] text-muted-foreground">{item.who}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-bold text-primary">{item.due}</p>
                    <p className="text-[10px] text-muted-foreground">{item.freq}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* GSTR-1 TAB */}
        <TabsContent value="gstr1" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> GSTR-1 Summary
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Outward Supplies · {months.find((m) => m.value === selectedMonth)?.label}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={exportGSTR1CSV} className="gap-1.5 text-[12px]">
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
                <Button size="sm" className="gold-gradient text-black font-bold gap-1.5 text-[12px]" onClick={exportGSTR1}>
                  <Download className="w-3.5 h-3.5" /> Export JSON
                </Button>
              </div>
            </div>

            {salesForMonth.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No invoices for this month</p>
              </div>
            ) : (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Total Invoices", value: salesForMonth.length },
                    { label: "B2B (GSTIN)", value: b2bCount },
                    { label: "B2C (No GSTIN)", value: b2cCount },
                    { label: "Interstate", value: interstateCount },
                  ].map((s) => (
                    <div key={s.label} className="bg-secondary/40 rounded-lg p-3 text-center">
                      <p className="text-lg font-black text-primary">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Invoice Table */}
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-[11px] min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border">
                        {["Invoice No", "Date", "Customer", "GSTIN", "Taxable", "IGST", "CGST", "SGST", "Total"].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-muted-foreground font-semibold text-[10px] uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {salesForMonth.map((inv) => (
                        <tr key={inv.id} className="border-b border-border/50 hover:bg-secondary/20">
                          <td className="px-3 py-2 font-mono font-bold text-primary">{inv.invoice_number}</td>
                          <td className="px-3 py-2 text-muted-foreground">{fmtDate(inv.date)}</td>
                          <td className="px-3 py-2 font-medium max-w-[120px] truncate">{inv.customer_name}</td>
                          <td className="px-3 py-2 font-mono text-[10px]">{inv.customer_gstin || <span className="text-muted-foreground">B2C</span>}</td>
                          <td className="px-3 py-2 font-mono text-right">{fmtINR(inv.subtotal || 0)}</td>
                          <td className="px-3 py-2 font-mono text-right">{inv.is_interstate ? fmtINR(inv.tax_amount || 0) : "—"}</td>
                          <td className="px-3 py-2 font-mono text-right">{!inv.is_interstate ? fmtINR((inv.tax_amount || 0) / 2) : "—"}</td>
                          <td className="px-3 py-2 font-mono text-right">{!inv.is_interstate ? fmtINR((inv.tax_amount || 0) / 2) : "—"}</td>
                          <td className="px-3 py-2 font-mono font-bold text-right text-primary">{fmtINR(inv.grand_total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-secondary/30">
                        <td colSpan={4} className="px-3 py-2 font-bold text-[11px]">TOTAL</td>
                        <td className="px-3 py-2 font-bold font-mono text-right">{fmtINR(totalSubtotal)}</td>
                        <td className="px-3 py-2 font-bold font-mono text-right">{fmtINR(salesForMonth.filter(i => i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0), 0))}</td>
                        <td className="px-3 py-2 font-bold font-mono text-right">{fmtINR(salesForMonth.filter(i => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0))}</td>
                        <td className="px-3 py-2 font-bold font-mono text-right">{fmtINR(salesForMonth.filter(i => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0))}</td>
                        <td className="px-3 py-2 font-bold font-mono text-right text-primary">{fmtINR(totalSales)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* GSTR-3B TAB */}
        <TabsContent value="gstr3b" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> GSTR-3B Summary
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Monthly Summary Return · {months.find((m) => m.value === selectedMonth)?.label}
                </p>
              </div>
              <Button size="sm" className="gold-gradient text-black font-bold gap-1.5 text-[12px]" onClick={exportGSTR3B}>
                <Download className="w-3.5 h-3.5" /> Export JSON
              </Button>
            </div>

            <div className="space-y-4">
              {/* 3.1 Outward Supplies */}
              <div>
                <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-2">3.1 Details of Outward Supplies</p>
                <div className="bg-secondary/30 rounded-lg overflow-hidden">
                  {[
                    { label: "3.1(a) Outward taxable supplies", taxable: totalSubtotal, igst: salesForMonth.filter(i => i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0), 0), cgst: salesForMonth.filter(i => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0), sgst: salesForMonth.filter(i => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0) },
                    { label: "3.1(b) Zero-rated supplies", taxable: 0, igst: 0, cgst: 0, sgst: 0 },
                    { label: "3.1(c) Nil-rated / Exempt supplies", taxable: 0, igst: 0, cgst: 0, sgst: 0 },
                    { label: "3.1(d) Inward supplies (reverse charge)", taxable: 0, igst: 0, cgst: 0, sgst: 0 },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-2 sm:grid-cols-5 gap-0 border-b border-border/50 last:border-0">
                      <div className="sm:col-span-2 px-3 py-2.5 text-[11px] font-medium">{row.label}</div>
                      <div className="px-3 py-2.5 text-[11px] font-mono text-right">{fmtINR(row.taxable)}</div>
                      <div className="px-3 py-2.5 text-[11px] font-mono text-right">{fmtINR(row.igst)}</div>
                      <div className="px-3 py-2.5 text-[11px] font-mono text-right">{fmtINR(row.cgst + row.sgst)}</div>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 sm:grid-cols-5 border-t-2 border-border bg-secondary/50">
                    <div className="sm:col-span-2 px-3 py-2.5 text-[11px] font-bold">TOTAL</div>
                    <div className="px-3 py-2.5 text-[11px] font-bold font-mono text-right">{fmtINR(totalSubtotal)}</div>
                    <div className="px-3 py-2.5 text-[11px] font-bold font-mono text-right text-primary">{fmtINR(totalTax)}</div>
                    <div className="px-3 py-2.5 text-[11px] font-bold font-mono text-right text-primary">{fmtINR(totalTax)}</div>
                  </div>
                </div>
              </div>

              {/* ITC */}
              <div>
                <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-2">4. Eligible ITC (Input Tax Credit)</p>
                <div className="bg-secondary/30 rounded-lg overflow-hidden">
                  {[
                    { label: "4(A) ITC Available - All other ITC", igst: estimatedITC * 0.5, cgst: estimatedITC * 0.25, sgst: estimatedITC * 0.25 },
                    { label: "4(B) ITC Reversed", igst: 0, cgst: 0, sgst: 0 },
                    { label: "4(C) Net ITC Available", igst: estimatedITC * 0.5, cgst: estimatedITC * 0.25, sgst: estimatedITC * 0.25 },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-border/50 last:border-0">
                      <div className="sm:col-span-1 px-3 py-2.5 text-[11px] font-medium">{row.label}</div>
                      <div className="px-3 py-2.5 text-[11px] font-mono text-right">{fmtINR(row.igst)}</div>
                      <div className="px-3 py-2.5 text-[11px] font-mono text-right">{fmtINR(row.cgst)}</div>
                      <div className="px-3 py-2.5 text-[11px] font-mono text-right">{fmtINR(row.sgst)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Net Tax */}
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Total Tax Liability</p>
                    <p className="text-lg font-black text-red-400 font-mono">{fmtINR(totalTax)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Input Tax Credit</p>
                    <p className="text-lg font-black text-emerald-400 font-mono">{fmtINR(estimatedITC)}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border">
                    <p className="text-[11px] text-muted-foreground">Net Tax Payable (Estimated)</p>
                    <p className="text-2xl font-black text-primary font-mono">{fmtINR(netTaxPayable)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* HSN SUMMARY TAB */}
        <TabsContent value="hsn" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">🔢 HSN-wise Summary</h3>
              <Badge variant="outline" className="text-[10px]">{hsnSummary.length} HSN codes</Badge>
            </div>
            {hsnSummary.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">No data for this month</p>
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-[11px] min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["HSN/SAC", "Description", "Total Qty", "Total Value", "Tax Amount"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-semibold text-[10px] uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hsnSummary.map((row) => (
                      <tr key={row.hsn} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="px-3 py-2.5 font-mono font-bold text-primary">{row.hsn}</td>
                        <td className="px-3 py-2.5 text-muted-foreground max-w-[150px] truncate">—</td>
                        <td className="px-3 py-2.5 font-mono text-right">{row.qty.toFixed(2)}</td>
                        <td className="px-3 py-2.5 font-mono text-right">{fmtINR(row.value)}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-right text-primary">{fmtINR(row.tax)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary/30 font-bold">
                      <td colSpan={2} className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 font-mono text-right">{hsnSummary.reduce((s, r) => s + r.qty, 0).toFixed(2)}</td>
                      <td className="px-3 py-2 font-mono text-right">{fmtINR(hsnSummary.reduce((s, r) => s + r.value, 0))}</td>
                      <td className="px-3 py-2 font-mono font-bold text-right text-primary">{fmtINR(hsnSummary.reduce((s, r) => s + r.tax, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Banner */}
      <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground">
          <span className="font-bold text-foreground">Note:</span> The JSON exports are formatted for the GSTN portal's offline tool. Update your GSTIN in Settings before filing. ITC estimates are indicative — always reconcile with GSTR-2B before filing.
        </div>
      </div>
    </div>
  );
}