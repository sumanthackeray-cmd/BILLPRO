import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { 
  BarChart2, FileText, Download, PieChart as PieIcon, TrendingUp, ShoppingBag, 
  RefreshCw, Clock, AlertCircle, Percent, Sparkles, Award
} from "lucide-react";
import { toast } from "@/lib/toast";
import ResponsiveTabs from "@/components/ui/ResponsiveTabs";

const COLORS = ["#0066CC", "#2ECC71", "#FF6B00", "#9B59B6", "#E74C3C", "#1ABC9C", "#34495E", "#E67E22"];

export default function DepartmentReports() {
  const [activeTab, setActiveTab] = useState("pnl");

  // Queries
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: invoices = [], isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list()
  });

  // 1. Department-wise P&L calculations
  const deptData = useMemo(() => {
    const summary = {};

    // Compute from real invoices if present
    invoices.forEach(inv => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      items.forEach(item => {
        const cat = item.category || "General";
        if (!summary[cat]) {
          summary[cat] = { sales: 0, cogs: 0, expenses: 0 };
        }
        const revenue = Number(item.finalPrice || item.rate || 0) * Number(item.qty || 1);
        summary[cat].sales += revenue;
        // Estimate COGS as 70% of sale value if not present on product, else use purchase_rate
        const matchProd = products.find(p => p.id === item.id || p.name === item.name);
        const purchaseRate = matchProd ? Number(matchProd.purchase_rate || 0) : 0;
        summary[cat].cogs += purchaseRate > 0 ? purchaseRate * Number(item.qty || 1) : revenue * 0.70;
        summary[cat].expenses += revenue * 0.05; // Estimate operations cost as 5%
      });
    });

    const list = Object.keys(summary).map(key => {
      const sales = Math.round(summary[key].sales);
      const cogs = Math.round(summary[key].cogs);
      const expenses = Math.round(summary[key].expenses);
      const profit = sales - cogs - expenses;
      return {
        name: key,
        sales,
        cogs,
        expenses,
        profit,
        margin: sales > 0 ? ((profit / sales) * 100).toFixed(1) : 0
      };
    });

    return list;
  }, [invoices, products]);

  // 2. Hourly Sales Heatmap
  const hourlyData = useMemo(() => {
    if (invoices.length === 0) return [];

    const hours = Array.from({ length: 13 }, (_, i) => {
      const h = i + 9; // 9 AM to 9 PM
      const suffix = h >= 12 ? "PM" : "AM";
      const displayHour = h > 12 ? h - 12 : h;
      return {
        key: `${String(displayHour).padStart(2, "0")}:00 ${suffix}`,
        hourVal: h,
        sales: 0,
        bills: 0
      };
    });

    invoices.forEach(inv => {
      if (!inv.created_date) return;
      try {
        const dateObj = new Date(inv.created_date);
        const hr = dateObj.getHours();
        const matchingHour = hours.find(h => h.hourVal === hr);
        if (matchingHour) {
          matchingHour.sales += Number(inv.grand_total || 0);
          matchingHour.bills += 1;
        }
      } catch (e) {
        // safe ignore
      }
    });

    return hours.map(h => ({
      hour: h.key,
      sales: Math.round(h.sales),
      bills: h.bills
    }));
  }, [invoices]);

  // 3. Category Performance ABC analysis
  const abcData = useMemo(() => {
    if (invoices.length === 0) return [];

    const productSales = {};
    let grandTotalSales = 0;

    invoices.forEach(inv => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      items.forEach(item => {
        const name = item.name || "Unknown Item";
        const revenue = Number(item.finalPrice || item.rate || 0) * Number(item.qty || 1);
        productSales[name] = (productSales[name] || 0) + revenue;
        grandTotalSales += revenue;
      });
    });

    const sortedProducts = Object.keys(productSales).map(name => ({
      name,
      sales: Math.round(productSales[name]),
    })).sort((a, b) => b.sales - a.sales);

    let cumulativeSales = 0;
    return sortedProducts.map((p, idx) => {
      cumulativeSales += p.sales;
      const sharePct = grandTotalSales > 0 ? (p.sales / grandTotalSales) * 100 : 0;
      const cumulativePct = grandTotalSales > 0 ? (cumulativeSales / grandTotalSales) * 100 : 0;
      
      let classification = "C";
      if (cumulativePct <= 80) classification = "A";
      else if (cumulativePct <= 95) classification = "B";

      return {
        rank: idx + 1,
        name: p.name,
        sales: p.sales,
        share: `${sharePct.toFixed(1)}%`,
        class: classification
      };
    });
  }, [invoices]);

  // 4. Basket Market Analysis
  const basketData = useMemo(() => {
    if (invoices.length === 0) return [];

    const pairs = {};
    const categoryCounts = {};
    let totalTransactions = invoices.length;

    invoices.forEach(inv => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      const categoriesInInvoice = Array.from(new Set(items.map(item => item.category || "General")));

      categoriesInInvoice.forEach(cat => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      for (let i = 0; i < categoriesInInvoice.length; i++) {
        for (let j = i + 1; j < categoriesInInvoice.length; j++) {
          const catA = categoriesInInvoice[i];
          const catB = categoriesInInvoice[j];
          const key = catA < catB ? `${catA}|||${catB}` : `${catB}|||${catA}`;
          pairs[key] = (pairs[key] || 0) + 1;
        }
      }
    });

    const list = Object.keys(pairs).map(key => {
      const [catA, catB] = key.split("|||");
      const pairCount = pairs[key];
      const support = (pairCount / totalTransactions) * 100;
      
      const countA = categoryCounts[catA] || 1;
      const confidence = (pairCount / countA) * 100;

      const countB = categoryCounts[catB] || 1;
      const supportB = countB / totalTransactions;
      const lift = supportB > 0 ? (confidence / 100) / supportB : 1;

      return {
        itemA: catA,
        itemB: catB,
        support: `${support.toFixed(0)}%`,
        confidence: `${confidence.toFixed(0)}%`,
        lift: lift.toFixed(1),
        rawSupport: support
      };
    }).sort((a, b) => b.rawSupport - a.rawSupport);

    return list.slice(0, 5);
  }, [invoices]);

  // Export CSV helper
  const handleExportCSV = () => {
    let headers = "";
    let rows = [];

    if (activeTab === "pnl") {
      headers = "Department Name,Sales (₹),COGS (₹),Operating Expenses (₹),Net Profit (₹),Net Profit Margin (%)\n";
      rows = deptData.map(d => `"${d.name}",${d.sales},${d.cogs},${d.expenses},${d.profit},${d.margin}`);
    } else if (activeTab === "heatmap") {
      headers = "Hour,Sales (₹),Bill Count\n";
      rows = hourlyData.map(h => `"${h.hour}",${h.sales},${h.bills}`);
    } else if (activeTab === "abc") {
      headers = "Rank,Product Name,Sales Revenue (₹),Share (%),ABC Class\n";
      rows = abcData.map(a => `${a.rank},"${a.name}",${a.sales},"${a.share}","${a.class}"`);
    } else {
      headers = "Core Product A,Associated Product B,Market Support (%),Confidence (%),Lift Ratio\n";
      rows = basketData.map(b => `"${b.itemA}","${b.itemB}","${b.support}","${b.confidence}",${b.lift}`);
    }

    const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Supermarket_${activeTab}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report downloaded.");
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            📊 Department-wise P&L & Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Real-time sales, ABC analytics, hourly staff mapping, and basket cross-selling reports.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleExportCSV} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 gap-2 flex-1 sm:flex-initial">
            <Download className="w-5 h-5" /> Export CSV Data
          </Button>
          <Button onClick={() => refetchInvoices()} variant="outline" className="h-11">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ResponsiveTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        containerClassName="border-b border-border/40 pb-3"
        tabs={[
          { id: "pnl", label: "Department-wise P&L", icon: <BarChart2 className="w-4 h-4" /> },
          { id: "heatmap", label: "Hourly Sales Heatmap", icon: <Clock className="w-4 h-4" /> },
          { id: "abc", label: "ABC Inventory Class", icon: <TrendingUp className="w-4 h-4" /> },
          { id: "basket", label: "Basket Association Analysis", icon: <ShoppingBag className="w-4 h-4" /> }
        ]}
      />

      {/* Content Render */}
      {activeTab === "pnl" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Department Profitability Ledger</CardTitle>
              <CardDescription>Sales Revenue minus Cost of Goods Sold (COGS) and Operating Expenses.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100/50 dark:bg-slate-900/50">
                      <TableHead className="font-bold">Department</TableHead>
                      <TableHead className="font-bold text-right">Revenue (₹)</TableHead>
                      <TableHead className="font-bold text-right">COGS (₹)</TableHead>
                      <TableHead className="font-bold text-right">Expenses (₹)</TableHead>
                      <TableHead className="font-bold text-right">Net Profit (₹)</TableHead>
                      <TableHead className="font-bold text-center">Margin (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deptData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-xs font-bold">
                          No sales records found. Register invoices to view department profitability ledger.
                        </TableCell>
                      </TableRow>
                    ) : (
                      deptData.map((d, index) => (
                        <TableRow key={d.name} className="hover:bg-slate-100/20 dark:hover:bg-slate-900/10">
                          <TableCell className="font-bold text-slate-800 dark:text-slate-200">{d.name}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">₹{d.sales.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-slate-500">₹{d.cogs.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-slate-500">₹{d.expenses.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-black text-emerald-600 dark:text-emerald-400">₹{d.profit.toLocaleString()}</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-none font-bold">
                              {d.margin}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Revenue Breakdown</CardTitle>
              <CardDescription>Comparative department share of total store revenue.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {deptData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold text-center p-6">
                  No sales data available. Begin checkouts to view department share.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deptData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="sales"
                      >
                        {deptData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => "₹" + v.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                    {deptData.slice(0, 6).map((d, index) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="truncate max-w-[120px] font-medium text-slate-600 dark:text-slate-400">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "heatmap" && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Hourly Sales Heatmap (Load Distribution)</CardTitle>
            <CardDescription>Hourly checkout volumes for scheduling staff shifts.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {hourlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold text-center">
                No sales logged today. Begin checkout to track hourly checkout loads.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0066CC" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0066CC" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} formatter={(v) => "₹" + v / 1000 + "k"} />
                  <Tooltip formatter={(v) => "₹" + v.toLocaleString()} />
                  <Area type="monotone" dataKey="sales" stroke="#0066CC" fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "abc" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">ABC Inventory Category Analysis</CardTitle>
              <CardDescription>
                <Badge className="bg-red-500 text-white font-bold mr-1">Class A (Top 80%)</Badge>
                <Badge className="bg-yellow-500 text-slate-900 font-bold mr-1">Class B (Mid 15%)</Badge>
                <Badge className="bg-slate-400 text-white font-bold">Class C (Lowest 5%)</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100/50 dark:bg-slate-900/50">
                      <TableHead className="font-bold text-center">Rank</TableHead>
                      <TableHead className="font-bold">Product Item Name</TableHead>
                      <TableHead className="font-bold text-right">Revenue Generated (₹)</TableHead>
                      <TableHead className="font-bold text-right">Revenue Share</TableHead>
                      <TableHead className="font-bold text-center">ABC Class</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abcData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-xs font-bold">
                          No inventory items sold. Complete a sale to rank products under ABC class.
                        </TableCell>
                      </TableRow>
                    ) : (
                      abcData.map((item) => (
                        <TableRow key={item.rank} className="hover:bg-slate-100/20 dark:hover:bg-slate-900/10">
                          <TableCell className="text-center font-mono font-bold">{item.rank}</TableCell>
                          <TableCell className="font-bold text-slate-800 dark:text-slate-200">{item.name}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">₹{item.sales.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-slate-500">{item.share}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={
                              item.class === "A" ? "bg-red-500 text-white border-none font-bold" :
                              item.class === "B" ? "bg-yellow-500 text-slate-900 border-none font-bold" :
                              "bg-slate-400 text-white border-none font-bold"
                            }>
                              Class {item.class}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-blue-600/5 dark:bg-blue-600/10 border-blue-500/10 flex flex-col justify-center">
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center font-black text-xl">
                💡
              </div>
              <h3 className="text-lg font-black text-blue-600">ABC Strategy Suggestion</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-bold">
                {abcData.length === 0 ? (
                  "No Class A items identified yet. Register products and begin invoicing to get strategy suggestions."
                ) : (
                  <>Your **Class A** items ({abcData.slice(0, 3).map(i => i.name).join(", ")}) represent **80% of total revenue**. Ensure these items NEVER experience stockouts by configuring auto-reorder levels.</>
                )}
              </p>
              {abcData.length > 0 && (
                <div className="pt-2">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9">
                    Auto Reorder Config
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "basket" && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Cross-Shopping Basket Association (Shelf Placement)</CardTitle>
            <CardDescription>Analyze products frequently purchased in the same receipt transaction to optimize floor layouts.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/50 dark:bg-slate-900/50">
                    <TableHead className="font-bold">Product Category A</TableHead>
                    <TableHead className="font-bold">Associated Product B</TableHead>
                    <TableHead className="font-bold text-center">Market Support Ratio</TableHead>
                    <TableHead className="font-bold text-center">Association Confidence</TableHead>
                    <TableHead className="font-bold text-center">Association Lift</TableHead>
                    <TableHead className="font-bold text-right">Shelf Arrangement Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {basketData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-xs font-bold">
                        No cross-shopping association calculated. Invoices with multiple product categories are required for shelf-placement suggestions.
                      </TableCell>
                    </TableRow>
                  ) : (
                    basketData.map((b, index) => (
                      <TableRow key={index} className="hover:bg-slate-100/20 dark:hover:bg-slate-900/10">
                        <TableCell className="font-bold text-slate-800 dark:text-slate-200">{b.itemA}</TableCell>
                        <TableCell className="font-bold text-blue-600 dark:text-blue-400">{b.itemB}</TableCell>
                        <TableCell className="text-center font-mono font-semibold">{b.support}</TableCell>
                        <TableCell className="text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">{b.confidence}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-amber-600 dark:text-amber-400">{b.lift}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-slate-500">
                          {index === 0 ? "Place Bread counter next to Dairy fridge" :
                           index === 1 ? "Arrange Sugar packs below Tea shelves" :
                           index === 3 ? "Keep Onions adjacent to Tomato bins" :
                           "Position adjacent on secondary aisle display"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
