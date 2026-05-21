import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, getMonth, thisMonth } from "@/lib/gst-utils";
import StatCard from "@/components/dashboard/StatCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp, Users, Clock, Award, BarChart2, Zap, Target, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const PIE_COLORS = ["hsl(36,90%,55%)", "hsl(160,72%,39%)", "hsl(217,91%,60%)", "hsl(263,70%,65%)", "hsl(174,72%,41%)", "hsl(38,92%,50%)"];

const TABS = [
  { id: "overview", label: "📊 Overview", icon: BarChart2, tKey: "reports.overview", emoji: "📊" },
  { id: "shifts", label: "🕐 Shift Reports", icon: Clock, tKey: "reports.shift_reports", emoji: "🕐" },
  { id: "cashiers", label: "🏆 Cashier Board", icon: Award, tKey: "reports.cashier_board", emoji: "🏆" },
  { id: "hours", label: "⏰ Peak Hours", icon: Zap, tKey: "reports.peak_hours", emoji: "⏰" },
  { id: "forecast", label: "🤖 AI Forecast", icon: Target, tKey: "reports.ai_forecast", emoji: "🤖" },
];

export default function Reports() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 500),
  });

  const salesInvoices = invoices.filter(i => i.type === "sale");
  const totalSales = salesInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);
  const totalTax = salesInvoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalPurchases = purchases.reduce((s, p) => s + (p.grand_total || 0), 0);
  const paidCount = salesInvoices.filter(i => i.status === "paid").length;
  const unpaidCount = salesInvoices.filter(i => i.status !== "paid").length;

  // Monthly data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const key = d.toISOString().slice(0, 7);
    const sales = salesInvoices.filter(inv => getMonth(inv.date) === key).reduce((s, inv) => s + (inv.grand_total || 0), 0);
    const purch = purchases.filter(p => getMonth(p.date) === key).reduce((s, p) => s + (p.grand_total || 0), 0);
    return { month: d.toLocaleString("en-IN", { month: "short" }), sales, purchases: purch };
  });

  // GST breakdown
  const gstData = [];
  const gstMap = {};
  salesInvoices.forEach(inv => {
    (inv.items || []).forEach(item => {
      const rate = item.gst_rate || 0;
      const taxable = (item.qty || 0) * (item.rate || 0);
      const tax = (taxable * rate) / 100;
      gstMap[rate] = (gstMap[rate] || 0) + tax;
    });
  });
  Object.entries(gstMap).forEach(([rate, amount]) => {
    gstData.push({ name: `${rate}%`, value: Math.round(amount) });
  });

  // Shift history from LocalStorage
  const shiftHistory = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("gst_pos_shift_history") || "[]").reverse(); }
    catch (e) { return []; }
  }, []);

  // Cashier leaderboard from shift history
  const cashierLeaderboard = useMemo(() => {
    const map = {};
    shiftHistory.forEach(shift => {
      const name = shift.cashier || "Unknown";
      if (!map[name]) map[name] = { name, totalSales: 0, shiftCount: 0, cashSales: 0, cardSales: 0, upiSales: 0 };
      map[name].totalSales += shift.totalSales || 0;
      map[name].shiftCount += 1;
      map[name].cashSales += shift.cashSales || 0;
      map[name].cardSales += shift.cardSales || 0;
      map[name].upiSales += shift.upiSales || 0;
    });
    return Object.values(map).sort((a, b) => b.totalSales - a.totalSales);
  }, [shiftHistory]);

  // Peak hours analysis
  const peakHoursData = useMemo(() => {
    const hours = Array.from({ length: 18 }, (_, i) => ({
      hour: `${i + 6}:00`,
      count: 0,
      revenue: 0,
    }));
    salesInvoices.forEach(inv => {
      const date = new Date(inv.created_date || inv.date);
      if (!isNaN(date.getTime())) {
        const h = date.getHours();
        const idx = h - 6;
        if (idx >= 0 && idx < 18) {
          hours[idx].count += 1;
          hours[idx].revenue += inv.grand_total || 0;
        }
      }
    });
    return hours;
  }, [salesInvoices]);

  // AI Forecast — 30-day rolling average + simple forecast
  const forecastData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const daySales = salesInvoices.filter(inv => inv.date === key).reduce((s, inv) => s + (inv.grand_total || 0), 0);
      days.push({ date: key, label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), actual: daySales });
    }
    // Calculate 7-day moving average
    days.forEach((d, i) => {
      const window = days.slice(Math.max(0, i - 6), i + 1);
      d.avg = window.reduce((s, x) => s + x.actual, 0) / window.length;
    });
    // Future 7-day forecast
    const lastAvg = days[days.length - 1]?.avg || 0;
    const trend = days.length > 7 ? (days[days.length - 1].avg - days[days.length - 8].avg) / 7 : 0;
    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      forecast.push({
        label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        forecast: Math.max(0, lastAvg + trend * i),
      });
    }
    return { historical: days, forecast };
  }, [salesInvoices]);

  const maxPeakCount = Math.max(...peakHoursData.map(h => h.count), 1);

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="text-xl font-black">{t("reports.title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("reports.subtitle")}</p>
      </div>

      {/* Enterprise Sub-Tabs */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max p-1.5 bg-card/50 backdrop-blur-md border border-border/40 rounded-xl shadow">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
              )}
            >
              <span>{tab.emoji}</span> <span>{t(tab.tKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label={t("reports.total_revenue")} value={fmtINR(totalSales)} icon="💰" color="green" />
            <StatCard label={t("reports.total_tax")} value={fmtINR(totalTax)} icon="🏛️" color="gold" />
            <StatCard label={t("reports.total_purchases")} value={fmtINR(totalPurchases)} icon="🛒" color="purple" />
            <StatCard label={t("reports.net_profit")} value={fmtINR(totalSales - totalPurchases)} icon="📈" color="teal" />
          </div>

          {/* Sales vs Purchases */}
          <div className="bg-card border border-border rounded-xl p-4 overflow-hidden">
            <h3 className="font-bold text-sm mb-4">📈 {t("reports.sales_vs_purchases")}</h3>
            <div className="h-56 sm:h-64 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barSize={16} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8, fontSize: 12 }} formatter={v => [`₹${Number(v).toLocaleString("en-IN")}`, ""]} />
                  <Bar dataKey="sales" fill="hsl(36,90%,55%)" radius={[3, 3, 0, 0]} name={t("reports.sales")} />
                  <Bar dataKey="purchases" fill="hsl(263,70%,65%)" radius={[3, 3, 0, 0]} name={t("reports.purchases")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GST Breakdown */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-bold text-sm mb-4">🏛️ {t("reports.gst_breakdown")}</h3>
              {gstData.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">{t("common.no_data")}</p>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={gstData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ₹${value}`}>
                        {gstData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => [`₹${Number(v).toLocaleString("en-IN")}`, t("reports.tax")]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* GSTR Summary */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-bold text-sm mb-4">📋 {t("reports.gstr_summary")}</h3>
              <div className="space-y-3">
                {(() => {
                  const tm = thisMonth();
                  const tmSales = salesInvoices.filter(i => getMonth(i.date) === tm);
                  const tmTax = tmSales.reduce((s, i) => s + (i.tax_amount || 0), 0);
                  const tmTotal = tmSales.reduce((s, i) => s + (i.grand_total || 0), 0);
                  const tmPurchases = purchases.filter(p => getMonth(p.date) === tm);
                  const tmPurchTotal = tmPurchases.reduce((s, p) => s + (p.grand_total || 0), 0);
                  return [
                    { label: "GSTR-1 (" + (t("reports.sales") || "Outward") + ")", value: fmtINR(tmTotal), sub: `${tmSales.length} ` + t("reports.bills") },
                    { label: "GSTR-3B (" + (t("reports.tax") || "Tax Liability") + ")", value: fmtINR(tmTax), sub: t("reports.ai_predicted") },
                    { label: t("reports.purchases") + " " + t("inventory.stock_in"), value: fmtINR(tmPurchTotal), sub: `${tmPurchases.length} ` + t("common.actions") },
                    { label: t("common.total") + " " + t("reports.tax"), value: fmtINR(Math.max(0, tmTax * 0.5)), sub: t("reports.ai_predicted") },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-semibold text-[13px]">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground">{item.sub}</p>
                      </div>
                      <p className="font-bold font-mono text-primary">{item.value}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SHIFT REPORTS TAB ── */}
      {activeTab === "shifts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-base">🕐 {t("reports.shift_reports")}</h2>
              <p className="text-xs text-muted-foreground">{shiftHistory.length} {t("reports.shift_reports").toLowerCase()} {t("common.completed").toLowerCase()}</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-card border border-border rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground">{t("reports.total_shifts")}</p>
                <p className="font-black text-lg text-primary">{shiftHistory.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground">{t("reports.total_revenue")}</p>
                <p className="font-black text-lg text-emerald-500">{fmtINR(shiftHistory.reduce((s, sh) => s + (sh.totalSales || 0), 0))}</p>
              </div>
            </div>
          </div>

          {shiftHistory.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-bold text-muted-foreground">{t("reports.shift_history_empty")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("reports.shift_history_empty_sub")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shiftHistory.map((shift, idx) => {
                const discrepancy = shift.discrepancy || 0;
                return (
                  <div key={shift.id || idx} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-sm">{shift.counter || "Counter"}</span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{shift.cashier || "Cashier"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{shift.openedAt} → {shift.closedAt}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg text-primary font-mono">{fmtINR(shift.totalSales || 0)}</p>
                        <p className="text-xs text-muted-foreground">{shift.salesCount || 0} {t("reports.bills")}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-secondary/30 rounded-lg p-2">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">{t("pos.payment_cash") || "Cash"}</p>
                        <p className="text-xs font-black text-green-500 font-mono">{fmtINR(shift.cashSales || 0)}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-2">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">{t("pos.payment_card") || "Card"}</p>
                        <p className="text-xs font-black text-blue-500 font-mono">{fmtINR(shift.cardSales || 0)}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-2">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">{t("pos.payment_upi") || "UPI"}</p>
                        <p className="text-xs font-black text-purple-500 font-mono">{fmtINR(shift.upiSales || 0)}</p>
                      </div>
                      <div className={cn("rounded-lg p-2", discrepancy === 0 ? "bg-emerald-500/10" : discrepancy > 0 ? "bg-blue-500/10" : "bg-red-500/10")}>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">Diff</p>
                        <p className={cn("text-xs font-black font-mono", discrepancy === 0 ? "text-emerald-500" : discrepancy > 0 ? "text-blue-500" : "text-red-500")}>
                          {discrepancy >= 0 ? "+" : ""}{fmtINR(discrepancy)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CASHIER LEADERBOARD TAB ── */}
      {activeTab === "cashiers" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-black text-base">🏆 {t("reports.cashier_leaderboard")}</h2>
            <p className="text-xs text-muted-foreground">{t("reports.cashier_leaderboard_sub")}</p>
          </div>

          {cashierLeaderboard.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-bold text-muted-foreground">{t("reports.cashier_no_data")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("reports.cashier_no_data_sub")}</p>
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl p-4 overflow-hidden">
                <h3 className="font-bold text-sm mb-4">{t("reports.sales")} (Cashiers)</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashierLeaderboard} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                      <Tooltip contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8, fontSize: 12 }} formatter={v => [`₹${Number(v).toLocaleString("en-IN")}`, t("reports.sales")]} />
                      <Bar dataKey="totalSales" fill="hsl(36,90%,55%)" radius={[6, 6, 0, 0]} name={t("reports.sales")} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-2">
                {cashierLeaderboard.map((cashier, idx) => (
                  <div key={cashier.name} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0",
                      idx === 0 ? "bg-yellow-400/20 text-yellow-400" :
                        idx === 1 ? "bg-slate-300/20 text-slate-300" :
                          idx === 2 ? "bg-amber-700/20 text-amber-700" : "bg-secondary/50 text-muted-foreground"
                    )}>
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm">{cashier.name}</p>
                      <p className="text-xs text-muted-foreground">{cashier.shiftCount} shifts</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-base text-primary font-mono">{fmtINR(cashier.totalSales)}</p>
                      <p className="text-[10px] text-muted-foreground">Avg {fmtINR(cashier.shiftCount > 0 ? cashier.totalSales / cashier.shiftCount : 0)} / shift</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PEAK HOURS TAB ── */}
      {activeTab === "hours" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-black text-base">⏰ {t("reports.peak_business_hours")}</h2>
            <p className="text-xs text-muted-foreground">{t("reports.peak_hours_sub")}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 overflow-hidden">
            <h3 className="font-bold text-sm mb-4">{t("reports.bills_per_hour")}</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHoursData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                  <XAxis dataKey="hour" tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8, fontSize: 12 }} formatter={(v, name) => [name === "count" ? `${v} ${t("reports.bills")}` : `₹${Number(v).toLocaleString("en-IN")}`, name === "count" ? t("reports.bills") : t("reports.total_revenue")]} />
                  <Bar dataKey="count" name="count" radius={[4, 4, 0, 0]}
                    fill="hsl(36,90%,55%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-bold text-sm mb-3">{t("reports.heatmap_title")}</h3>
            <div className="grid grid-cols-9 gap-1.5">
              {peakHoursData.map((h, i) => {
                const intensity = maxPeakCount > 0 ? h.count / maxPeakCount : 0;
                const bg = intensity === 0 ? "bg-secondary/30" :
                  intensity < 0.25 ? "bg-emerald-500/20" :
                    intensity < 0.5 ? "bg-yellow-500/30" :
                      intensity < 0.75 ? "bg-orange-500/40" : "bg-red-500/50";
                return (
                  <div key={h.hour} className={cn("rounded-lg p-2 text-center transition-all hover:scale-105", bg)}>
                    <p className="text-[8px] font-bold text-muted-foreground">{h.hour}</p>
                    <p className="text-xs font-black mt-0.5">{h.count}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-secondary/30" /> {t("reports.traffic_no")}</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500/20" /> {t("reports.traffic_low")}</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-500/30" /> {t("reports.traffic_med")}</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-500/40" /> {t("reports.traffic_high")}</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500/50" /> {t("reports.traffic_peak")}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI FORECAST TAB ── */}
      {activeTab === "forecast" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-black text-base">🤖 {t("reports.ai_sales_forecast")}</h2>
            <p className="text-xs text-muted-foreground">{t("reports.ai_forecast_sub")}</p>
          </div>

          {/* Forecast cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {forecastData.forecast.slice(0, 4).map(f => (
              <div key={f.label} className="bg-card border border-border rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -translate-y-4 translate-x-4" />
                <p className="text-xs text-muted-foreground font-bold">{f.label}</p>
                <p className="font-black text-lg text-primary mt-1 font-mono">{fmtINR(f.forecast)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-bold">{t("reports.ai_predicted")}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Historical + Forecast Chart */}
          <div className="bg-card border border-border rounded-xl p-4 overflow-hidden">
            <h3 className="font-bold text-sm mb-1">{t("reports.sales_trend_forecast")}</h3>
            <p className="text-xs text-muted-foreground mb-4">{t("reports.trend_forecast_sub")}</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData.historical}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(36,90%,55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(36,90%,55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(220,15%,55%)", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8, fontSize: 12 }} formatter={v => [`₹${Number(v).toLocaleString("en-IN")}`, ""]} />
                  <Area type="monotone" dataKey="actual" stroke="hsl(36,90%,55%)" strokeWidth={2} fill="url(#salesGrad)" name={t("reports.sales")} />
                  <Line type="monotone" dataKey="avg" stroke="hsl(217,91%,60%)" strokeWidth={2} dot={false} name="7-Day Avg" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Next 7 days forecast */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-bold text-sm mb-3">📅 {t("reports.revenue_forecast_7day")}</h3>
            <div className="space-y-2">
              {forecastData.forecast.map((f, i) => {
                const maxForecast = Math.max(...forecastData.forecast.map(x => x.forecast), 1);
                const pct = (f.forecast / maxForecast) * 100;
                return (
                  <div key={f.label} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-20 shrink-0">{f.label}</span>
                    <div className="flex-1 bg-secondary/30 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-black font-mono text-primary w-20 text-right">{fmtINR(f.forecast)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}