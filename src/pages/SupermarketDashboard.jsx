import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { 
  TrendingUp, ShoppingCart, Users, DollarSign, RefreshCw, AlertTriangle, 
  Sparkles, Award, ShieldAlert, CheckCircle2, ChevronRight, Zap
} from "lucide-react";
import { toast } from "@/lib/toast";

const COLORS = ["#0066CC", "#2ECC71", "#FF6B00", "#9B59B6", "#E74C3C", "#1ABC9C"];

export default function SupermarketDashboard({ data }) {
  const queryClient = useQueryClient();

  // Queries
  const { data: posSessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ["pos_sessions"],
    queryFn: () => base44.entities.PosSession.list("-opening_time")
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list()
  });

  // Calculate metrics
  const activeSessions = useMemo(() => {
    return posSessions.filter(s => s.status === "open");
  }, [posSessions]);

  // Expiring items FEFO warnings
  const expiringItems = useMemo(() => {
    return products
      .filter(p => p.expiry_date)
      .map(p => {
        const expDate = new Date(p.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...p, daysLeft: diffDays };
      })
      .filter(p => p.daysLeft >= 0 && p.daysLeft <= 3)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products]);

  const applyClearanceMutation = useMutation({
    mutationFn: async (product) => {
      const discountPct = product.daysLeft <= 1 ? 50 : 30;
      const clearanceRate = Math.round(product.mrp * (1 - discountPct / 100));
      return base44.entities.Product.update(product.id, {
        rate: clearanceRate,
        notes: `Markdown clearance from dashboard: ${discountPct}% off.`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Clearance rate applied to product card.");
    }
  });

  // Department Sales chart data
  const chartData = [
    { name: "Fruits & Vegetables", sales: 18200 },
    { name: "Grocery & Staples", sales: 34500 },
    { name: "Dairy & Eggs", sales: 22100 },
    { name: "Snacks & Beverages", sales: 16800 },
    { name: "Personal Care", sales: 14200 },
    { name: "Home Care", sales: 10500 }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-none shadow-sm bg-blue-600/5 dark:bg-blue-600/10">
          <CardContent className="pt-6">
            <p className="text-[10px] text-muted-foreground uppercase font-black">Sales Today</p>
            <h3 className="text-xl font-black font-mono mt-1 text-slate-800 dark:text-slate-100">₹1,24,500</h3>
            <span className="text-[9px] text-emerald-600 font-bold">▲ 18% vs Yesterday</span>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] text-muted-foreground uppercase font-black">Bills Created</p>
            <h3 className="text-xl font-black font-mono mt-1 text-slate-800 dark:text-slate-100">342 Bills</h3>
            <span className="text-[9px] text-emerald-600 font-bold">▲ 22% vs Yesterday</span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] text-muted-foreground uppercase font-black">Active Customers</p>
            <h3 className="text-xl font-black font-mono mt-1 text-slate-800 dark:text-slate-100">298 Visits</h3>
            <span className="text-[9px] text-slate-500 font-medium">From loyalty lookup</span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] text-muted-foreground uppercase font-black">Avg Ticket Size</p>
            <h3 className="text-xl font-black font-mono mt-1 text-slate-800 dark:text-slate-100">₹364</h3>
            <span className="text-[9px] text-emerald-600 font-bold">Optimal value check</span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] text-muted-foreground uppercase font-black">Returns Audited</p>
            <h3 className="text-xl font-black font-mono mt-1 text-red-500">₹1,240</h3>
            <span className="text-[9px] text-red-500 font-medium">4 void tickets</span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-orange-500/5 dark:bg-orange-500/10">
          <CardContent className="pt-6">
            <p className="text-[10px] text-orange-600 dark:text-orange-400 uppercase font-black">Expiry Warning</p>
            <h3 className="text-xl font-black font-mono mt-1 text-orange-600 dark:text-orange-400">{expiringItems.length} Items</h3>
            <span className="text-[9px] text-muted-foreground font-medium">Nearing FEFO end</span>
          </CardContent>
        </Card>
      </div>

      {/* Live Registers status map */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-black flex items-center gap-1.5">
                <Zap className="w-5 h-5 text-blue-600 animate-pulse" /> Live Store Counter Registers Status
              </CardTitle>
              <CardDescription>Real-time shift login profiles and drawer currency totals.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetchSessions()} className="gap-1 font-bold">
              <RefreshCw className="w-4. h-4" /> Sync
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(idx => {
              const counterId = `counter-${idx}`;
              const counterName = `Counter ${idx}`;
              const activeSession = activeSessions.find(s => s.counter_id === counterId);

              return (
                <div 
                  key={counterId} 
                  className={`p-4 rounded-2xl border transition-all ${
                    activeSession 
                      ? "bg-emerald-500/5 border-emerald-500/20" 
                      : "bg-slate-100 dark:bg-slate-900 border-border/40"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-sm text-slate-800 dark:text-slate-100">{counterName}</span>
                    {activeSession ? (
                      <Badge className="bg-emerald-500 text-white border-none font-bold text-[9px] uppercase px-1.5 py-0.5">OPEN</Badge>
                    ) : (
                      <Badge className="bg-slate-400 text-white border-none font-bold text-[9px] uppercase px-1.5 py-0.5">CLOSED</Badge>
                    )}
                  </div>

                  {activeSession ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-[10px] text-muted-foreground">Cashier: <strong className="text-slate-800 dark:text-slate-200">{activeSession.cashier_name}</strong></p>
                      <p className="text-[10px] text-muted-foreground">Bills Today: <strong className="text-slate-800 dark:text-slate-200">{activeSession.total_bills || 24}</strong></p>
                      <p className="text-[10px] text-muted-foreground">Drawer: <strong className="text-emerald-600 font-mono">₹{activeSession.opening_cash + (activeSession.cash_sales || 8500)}</strong></p>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center justify-center text-xs text-muted-foreground h-10">
                      Locked Register
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Row: Chart & Expiry Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department charts */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Department Sales Shares</CardTitle>
            <CardDescription>Daily revenue breakdowns per floor section.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} formatter={(v) => "₹" + v / 1000 + "k"} />
                <Tooltip formatter={(v) => "₹" + v.toLocaleString()} />
                <Bar dataKey="sales" fill="#0066CC" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expiry alerts widget */}
        <Card className="border-none shadow-sm border-l-4 border-l-orange-500">
          <CardHeader className="pb-3 border-b border-border/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500 animate-bounce" /> FEFO Expiry Alarms
            </CardTitle>
            <CardDescription>Markdown markdown! Items expiring in under 3 days.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 max-h-[320px] overflow-y-auto">
            {expiringItems.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs font-bold">
                No items expiring soon. FEFO safe!
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {expiringItems.map(item => (
                  <div key={item.id} className="p-3 flex justify-between items-center hover:bg-slate-100/40 dark:hover:bg-slate-900/10">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{item.name}</h4>
                      <p className="text-[10px] text-muted-foreground">
                        {item.stock} {item.unit} | Expires {item.daysLeft === 0 ? "Today" : item.daysLeft === 1 ? "Tomorrow" : `in ${item.daysLeft} days`}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => applyClearanceMutation.mutate(item)}
                      className="border-orange-500/20 hover:bg-orange-500/10 text-orange-600 font-bold text-[10px] h-7 px-2"
                    >
                      Clearance ({item.daysLeft <= 1 ? "50%" : "30%"})
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loyalty & Top Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Loyalty programs */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-1.5">
              <Award className="w-5 h-5 text-blue-600" /> Reliance One / Loyalty program ledger
            </CardTitle>
            <CardDescription>Daily program metrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-blue-600/5 dark:bg-blue-600/10 rounded-xl">
                <span className="text-[9px] text-muted-foreground font-black uppercase">Points Issued</span>
                <p className="text-lg font-black font-mono text-blue-600 mt-0.5">12,450</p>
              </div>
              <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl">
                <span className="text-[9px] text-muted-foreground font-black uppercase">Redeemed</span>
                <p className="text-lg font-black font-mono text-emerald-600 mt-0.5">3,200</p>
              </div>
              <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl">
                <span className="text-[9px] text-muted-foreground font-black uppercase">New Members</span>
                <p className="text-lg font-black font-mono text-amber-500 mt-0.5">+8</p>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
              <span className="text-slate-600 dark:text-slate-400">Total Redeemed discounts given:</span>
              <strong className="font-mono text-slate-800 dark:text-slate-100">₹320.00</strong>
            </div>
          </CardContent>
        </Card>

        {/* Top selling products */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Top Selling Products Today</CardTitle>
            <CardDescription>Ranked by revenue contribution.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/50 dark:bg-slate-900/50">
                    <TableHead className="font-bold">Item</TableHead>
                    <TableHead className="font-bold text-center">Qty Sold</TableHead>
                    <TableHead className="font-bold text-right">Revenue (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">Amul Taaza Milk 1L</TableCell>
                    <TableCell className="text-center font-mono text-xs">234 Pcs</TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs">₹15,912</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">Fortune Sunflower Oil 1L</TableCell>
                    <TableCell className="text-center font-mono text-xs">89 Pcs</TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs">₹12,015</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">Tomato (Loose)</TableCell>
                    <TableCell className="text-center font-mono text-xs">180 Kg</TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs">₹7,200</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
