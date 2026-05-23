import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import FeatureGate from "@/components/subscription/FeatureGate";
import { fmtINR, isOverdue, getMonth } from "@/lib/gst-utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, TrendingUp, AlertTriangle, Brain, RefreshCw,
  Users, Package, BarChart3, Target, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

const COLORS = ["hsl(36,90%,55%)", "hsl(160,72%,39%)", "hsl(217,91%,60%)", "hsl(263,70%,65%)", "hsl(0,84%,60%)"];

function fmtK(v) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}

export default function AIInsights() {
  const [loadingAI, setLoadingAI] = useState(false);
  const [insights, setInsights] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"], queryFn: () => base44.entities.Product.list(),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"], queryFn: () => base44.entities.Customer.list(),
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"], queryFn: () => base44.entities.Purchase.list("-created_date", 200),
  });

  const salesInvoices = invoices.filter(i => i.type !== "credit_note" && i.type !== "debit_note");

  // --- Monthly Sales Trend (last 6 months) ---
  const monthlySales = useMemo(() => {
    const months = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(); d.setMonth(d.getMonth() - m);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const total = salesInvoices.filter(i => getMonth(i.date) === key).reduce((s, i) => s + (i.grand_total || 0), 0);
      const purchases_total = purchases.filter(p => getMonth(p.date) === key).reduce((s, p) => s + (p.grand_total || 0), 0);
      months.push({ label, total, purchases_total, profit: total - purchases_total });
    }
    return months;
  }, [invoices, purchases]);

  // --- Category Profitability ---
  const categoryData = useMemo(() => {
    const catMap = {};
    salesInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        const cat = prod?.category || "Uncategorized";
        const revenue = (item.qty || 0) * (item.rate || 0);
        if (!catMap[cat]) catMap[cat] = { name: cat, revenue: 0, qty: 0 };
        catMap[cat].revenue += revenue;
        catMap[cat].qty += item.qty || 0;
      });
    });
    return Object.values(catMap).sort((a, b) => b.revenue - a.revenue).slice(0, 7);
  }, [invoices, products]);

  // --- Customer Segmentation ---
  const customerSegments = useMemo(() => {
    const custMap = {};
    salesInvoices.forEach(inv => {
      const id = inv.customer_id || inv.customer_name;
      if (!custMap[id]) custMap[id] = {
        name: inv.customer_name, total: 0, count: 0,
        lastDate: inv.date, phone: inv.customer_phone
      };
      custMap[id].total += inv.grand_total || 0;
      custMap[id].count += 1;
      if (inv.date > custMap[id].lastDate) custMap[id].lastDate = inv.date;
    });
    const list = Object.values(custMap);
    const avgTotal = list.reduce((s, c) => s + c.total, 0) / (list.length || 1);
    const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return list.map(c => ({
      ...c,
      segment: c.total >= avgTotal * 1.5
        ? "high_value"
        : new Date(c.lastDate) < threeMonthsAgo
          ? "churn_risk"
          : "regular",
    })).sort((a, b) => b.total - a.total);
  }, [invoices]);

  const segmentCounts = useMemo(() => ({
    high_value: customerSegments.filter(c => c.segment === "high_value").length,
    regular: customerSegments.filter(c => c.segment === "regular").length,
    churn_risk: customerSegments.filter(c => c.segment === "churn_risk").length,
  }), [customerSegments]);

  const pieData = [
    { name: "High Value", value: segmentCounts.high_value, color: COLORS[1] },
    { name: "Regular", value: segmentCounts.regular, color: COLORS[0] },
    { name: "Churn Risk", value: segmentCounts.churn_risk, color: COLORS[4] },
  ].filter(d => d.value > 0);

  // --- AI Forecast ---
  const generateForecast = async () => {
    setLoadingForecast(true);
    const monthlyStr = monthlySales.map(m => `${m.label}: ₹${m.total.toFixed(0)}`).join(", ");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a demand forecasting AI for an Indian retail/GST business. 
Monthly sales data (last 6 months): ${monthlyStr}
Total customers: ${customerSegments.length}
Top categories: ${categoryData.slice(0, 3).map(c => c.name).join(", ")}

Provide: 
1. Next 3 months sales forecast with reasoning
2. Top 3 demand forecasting insights
3. Recommended actions to boost revenue

Be specific with numbers in Indian Rupees.`,
      response_json_schema: {
        type: "object",
        properties: {
          forecast_months: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string" },
                predicted: { type: "number" },
                reasoning: { type: "string" }
              }
            }
          },
          insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["positive", "warning", "info"] },
                icon: { type: "string" },
                title: { type: "string" },
                text: { type: "string" }
              }
            }
          }
        }
      }
    });
    setForecast(res);
    setLoadingForecast(false);
  };

  // --- AI General Insights ---
  const generateInsights = async () => {
    setLoadingAI(true);
    const totalSales = salesInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);
    const overdue = invoices.filter(isOverdue);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 10));

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Business Analytics AI for Indian GST billing. Provide 6 actionable insights.
Data:
- Total Sales: ₹${totalSales.toFixed(0)} from ${salesInvoices.length} invoices
- ${overdue.length} overdue invoices worth ₹${overdue.reduce((s, i) => s + (i.grand_total || 0), 0).toFixed(0)}
- ${products.length} products, ${products.filter(p => p.stock === 0).length} out of stock, ${lowStock.length} low stock
- ${customerSegments.length} customers, ${segmentCounts.high_value} high-value, ${segmentCounts.churn_risk} churn risk
- Top category: ${categoryData[0]?.name || "N/A"} (₹${categoryData[0]?.revenue?.toFixed(0) || 0})
Be specific, actionable, with exact numbers.`,
      response_json_schema: {
        type: "object",
        properties: {
          insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                icon: { type: "string" },
                type: { type: "string", enum: ["positive", "warning", "danger", "info"] },
                title: { type: "string" },
                text: { type: "string" },
              }
            }
          }
        }
      }
    });
    setInsights(res?.insights || []);
    setLoadingAI(false);
  };

  const typeStyles = {
    positive: "bg-success/10 border-success/30 text-success",
    warning: "bg-warning/10 border-warning/30 text-warning",
    danger: "bg-destructive/10 border-destructive/30 text-destructive",
    info: "bg-purple/10 border-purple/30 text-purple",
  };

  const segmentStyles = {
    high_value: "bg-success/10 border-success/30 text-success",
    regular: "bg-primary/10 border-primary/30 text-primary",
    churn_risk: "bg-destructive/10 border-destructive/30 text-destructive",
  };
  const segmentLabels = { high_value: "High Value", regular: "Regular", churn_risk: "Churn Risk" };

  return (
    <FeatureGate feature="ai" requiredPlan="professional">
      <div className="animate-fade-up space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple" /> AI Analytics Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Predictive insights, customer segmentation & profitability analysis</p>
          </div>
        </div>

        <Tabs defaultValue="analytics">
          <TabsList className="bg-secondary/50 border border-border">
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Analytics</TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Customers</TabsTrigger>
            <TabsTrigger value="forecast" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Forecast</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5"><Brain className="w-3.5 h-3.5" /> AI Insights</TabsTrigger>
          </TabsList>

          {/* ─── ANALYTICS TAB ─── */}
          <TabsContent value="analytics" className="space-y-5 mt-4">
            {/* Sales vs Purchase vs Profit */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-bold text-[14px] mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Sales & Profit Trend (6 Months)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlySales} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="cSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(36,90%,55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(36,90%,55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160,72%,39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160,72%,39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8 }} labelStyle={{ color: "hsl(220,30%,93%)" }} />
                  <Area type="monotone" dataKey="total" name="Sales" stroke="hsl(36,90%,55%)" fill="url(#cSales)" strokeWidth={2} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="hsl(160,72%,39%)" fill="url(#cProfit)" strokeWidth={2} />
                  <Area type="monotone" dataKey="purchases_total" name="Purchases" stroke="hsl(263,70%,65%)" fill="none" strokeDasharray="4 2" strokeWidth={1.5} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Category Profitability */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-bold text-[14px] mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-info" /> Revenue by Product Category
              </h3>
              {categoryData.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-[13px]">No category data yet — add categories to your products</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8 }} />
                    <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Revenue", value: fmtINR(salesInvoices.reduce((s, i) => s + (i.grand_total || 0), 0)), color: "text-primary" },
                { label: "Total Purchases", value: fmtINR(purchases.reduce((s, p) => s + (p.grand_total || 0), 0)), color: "text-purple" },
                { label: "Overdue", value: fmtINR(invoices.filter(isOverdue).reduce((s, i) => s + (i.grand_total || 0), 0)), color: "text-destructive" },
                { label: "Avg Invoice", value: fmtINR(salesInvoices.length ? salesInvoices.reduce((s, i) => s + (i.grand_total || 0), 0) / salesInvoices.length : 0), color: "text-info" },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className={`text-xl font-black font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ─── CUSTOMERS TAB ─── */}
          <TabsContent value="customers" className="space-y-5 mt-4">
            {/* Segment Overview */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "high_value", label: "High Value", icon: "⭐", color: "text-success", bg: "bg-success/10 border-success/20" },
                { key: "regular", label: "Regular", icon: "👤", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
                { key: "churn_risk", label: "Churn Risk", icon: "⚠️", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
              ].map(s => (
                <div key={s.key} className={cn("rounded-xl p-4 text-center border", s.bg)}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className={`text-2xl font-black ${s.color}`}>{segmentCounts[s.key]}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Pie Chart + List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pieData.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-bold text-[14px] mb-3">Customer Distribution</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-bold text-[14px] mb-3">Top Customers</h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {customerSegments.slice(0, 8).map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="text-[11px] font-mono text-muted-foreground w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.count} orders</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-bold font-mono text-primary">{fmtINR(c.total)}</p>
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-bold", segmentStyles[c.segment])}>
                          {segmentLabels[c.segment]}
                        </span>
                      </div>
                    </div>
                  ))}
                  {customerSegments.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No customer data yet</p>}
                </div>
              </div>
            </div>

            {/* Churn Risk Alert */}
            {segmentCounts.churn_risk > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <p className="font-bold text-[13px] text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {segmentCounts.churn_risk} customers at Churn Risk
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  These customers haven't purchased in 3+ months. Consider sending re-engagement offers.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {customerSegments.filter(c => c.segment === "churn_risk").slice(0, 5).map((c, i) => (
                    <span key={i} className="bg-destructive/15 text-destructive text-[10px] px-2 py-0.5 rounded-full">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ─── FORECAST TAB ─── */}
          <TabsContent value="forecast" className="space-y-5 mt-4">
            <div className="bg-gradient-to-br from-info/5 to-purple/5 border border-info/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[15px] flex items-center gap-2">
                    <Target className="w-4 h-4 text-info" /> AI Demand Forecasting
                  </h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Predicts next 3 months sales based on historical trends
                  </p>
                </div>
                <Button
                  onClick={generateForecast}
                  disabled={loadingForecast}
                  className="bg-gradient-to-r from-info to-purple text-white font-bold gap-2"
                  size="sm"
                >
                  {loadingForecast ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {loadingForecast ? "Forecasting..." : forecast ? "Refresh" : "Generate Forecast"}
                </Button>
              </div>

              {/* Historical + Forecast combined chart */}
              {forecast?.forecast_months && (
                <div className="mb-5">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={[
                        ...monthlySales.map(m => ({ label: m.label, actual: m.total })),
                        ...forecast.forecast_months.map(m => ({ label: m.month, forecast: m.predicted }))
                      ]}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                      <XAxis dataKey="label" tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtK} tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => fmtINR(v)} contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(36,90%,55%)" strokeWidth={2.5} dot={{ fill: "hsl(36,90%,55%)" }} />
                      <Line type="monotone" dataKey="forecast" name="Forecast" stroke="hsl(217,91%,60%)" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: "hsl(217,91%,60%)" }} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {forecast.forecast_months.map((m, i) => (
                      <div key={i} className="bg-info/10 border border-info/20 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-muted-foreground">{m.month}</p>
                        <p className="text-lg font-black text-info font-mono">{fmtINR(m.predicted)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{m.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!forecast && !loadingForecast && (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="w-14 h-14 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold">Click "Generate Forecast" to predict future sales</p>
                  <p className="text-[12px] mt-1">AI analyzes your 6-month sales history to forecast demand</p>
                </div>
              )}

              {loadingForecast && (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 rounded-lg bg-gradient-to-r from-info/10 via-purple/10 to-info/10 bg-[length:200%_100%] animate-shimmer" />
                  ))}
                </div>
              )}

              {forecast?.insights && (
                <div className="space-y-2 border-t border-border/50 pt-4">
                  <p className="text-[12px] font-bold text-muted-foreground">AI Recommendations</p>
                  {forecast.insights.map((ins, i) => (
                    <div key={i} className={cn("flex items-start gap-3 p-3 rounded-lg border", typeStyles[ins.type] || typeStyles.info)}>
                      <span className="text-base shrink-0">{ins.icon || "💡"}</span>
                      <div>
                        <p className="font-bold text-[12px]">{ins.title}</p>
                        <p className="text-[11px] opacity-90 leading-relaxed">{ins.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── AI INSIGHTS TAB ─── */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <div className="bg-gradient-to-br from-purple/5 to-info/5 border border-purple/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple text-white rounded-lg px-3 py-1.5 text-[12px] font-extrabold">✨ AI</div>
                  <p className="font-bold text-[15px]">Business Intelligence</p>
                </div>
                <Button onClick={generateInsights} disabled={loadingAI}
                  className="bg-gradient-to-r from-purple to-info text-white font-bold gap-2" size="sm">
                  {loadingAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  {loadingAI ? "Analyzing..." : insights ? "Refresh" : "Generate"}
                </Button>
              </div>

              {!insights && !loadingAI && (
                <div className="text-center py-12 text-muted-foreground">
                  <Brain className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-[15px] font-semibold mb-2">AI Business Intelligence</p>
                  <p className="text-[12px]">Analyzes invoices, customers, inventory for actionable recommendations.</p>
                </div>
              )}
              {loadingAI && (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 rounded-lg bg-gradient-to-r from-purple/10 via-info/10 to-purple/10 bg-[length:200%_100%] animate-shimmer" />
                  ))}
                </div>
              )}
              {insights && !loadingAI && (
                <div className="space-y-3">
                  {insights.map((ins, i) => (
                    <div key={i} className={cn("flex items-start gap-3 p-3.5 rounded-lg border", typeStyles[ins.type] || typeStyles.info)}>
                      <span className="text-lg shrink-0">{ins.icon || "💡"}</span>
                      <div>
                        <p className="font-bold text-[13px] mb-0.5">{ins.title}</p>
                        <p className="text-[12px] leading-relaxed opacity-90">{ins.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGate>
  );
}