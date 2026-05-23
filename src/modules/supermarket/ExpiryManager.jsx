import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, AlertTriangle, ShieldCheck, HeartHandshake, Printer, Sparkles, Check, RefreshCw } from "lucide-react";
import ResponsiveTabs from "@/components/ui/ResponsiveTabs";

export default function ExpiryManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch products
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  // Filters for expiry tracking
  const itemsWithExpiry = useMemo(() => {
    return products
      .filter(p => p.expiry_date)
      .map(p => {
        const expDate = new Date(p.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Difference in days
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = "safe"; // green
        let autoDiscount = 0;
        
        if (diffDays <= 0) {
          status = "expired"; // red
          autoDiscount = 100;
        } else if (diffDays <= 1) {
          status = "critical"; // orange (expires tomorrow)
          autoDiscount = 50; // 50% off
        } else if (diffDays <= 3) {
          status = "warning"; // yellow (1-3 days)
          autoDiscount = 30; // 30% off
        } else if (diffDays <= 7) {
          status = "attention"; // light-yellow (4-7 days)
          autoDiscount = 10;
        }

        return {
          ...p,
          daysLeft: diffDays,
          status,
          autoDiscount
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products]);

  // Mutations
  const writeOffMutation = useMutation({
    mutationFn: async (productId) => {
      // Deduct stock to 0 and remove expiry date or set is_active false
      return base44.entities.Product.update(productId, {
        stock: 0,
        is_active: false,
        notes: `Written off due to expiry on ${new Date().toLocaleDateString()}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Expired stock written off successfully.");
    },
    onError: (err) => {
      toast.error("Write off failed: " + err.message);
    }
  });

  const donateMutation = useMutation({
    mutationFn: async (product) => {
      // Log donation and remove from stock
      toast.info(`Generating NGO Donation manifest for ${product.name}...`);
      return base44.entities.Product.update(product.id, {
        stock: 0,
        notes: `Donated to Robin Hood Army NGO on ${new Date().toLocaleDateString()}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Stock donated successfully. Manifest printed.");
    }
  });

  const applyClearancePriceMutation = useMutation({
    mutationFn: async ({ product, discountPct }) => {
      const clearanceRate = Math.round(product.mrp * (1 - discountPct / 100));
      return base44.entities.Product.update(product.id, {
        rate: clearanceRate,
        notes: `Markdown clearance applied: ${discountPct}% off. Rate: ₹${clearanceRate}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Clearance markdown rate saved to product card.");
    }
  });

  // Counts
  const stats = useMemo(() => {
    const expired = itemsWithExpiry.filter(i => i.daysLeft <= 0).length;
    const critical = itemsWithExpiry.filter(i => i.daysLeft > 0 && i.daysLeft <= 3).length;
    const warning = itemsWithExpiry.filter(i => i.daysLeft > 3 && i.daysLeft <= 7).length;
    return { expired, critical, warning };
  }, [itemsWithExpiry]);

  const filteredItems = useMemo(() => {
    if (activeTab === "expired") return itemsWithExpiry.filter(i => i.daysLeft <= 0);
    if (activeTab === "critical") return itemsWithExpiry.filter(i => i.daysLeft > 0 && i.daysLeft <= 3);
    if (activeTab === "warning") return itemsWithExpiry.filter(i => i.daysLeft > 3 && i.daysLeft <= 7);
    return itemsWithExpiry;
  }, [itemsWithExpiry, activeTab]);

  const printShelfLabel = (item) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Shelf Label - ${item.name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; text-align: center; }
            .label-card { border: 3px border-style: dashed border-color: red; padding: 20px; border-radius: 10px; display: inline-block; max-width: 300px; }
            .title { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .orig { text-decoration: line-through; color: #777; font-size: 16px; }
            .new-price { font-size: 32px; font-weight: 900; color: #dc3545; margin: 10px 0; }
            .banner { background: #dc3545; color: white; font-weight: bold; padding: 5px; border-radius: 5px; font-size: 14px; text-transform: uppercase; }
            .exp { font-size: 11px; margin-top: 10px; color: #555; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label-card">
            <div class="banner">REDUCED TO CLEAR</div>
            <div class="title" style="margin-top:10px">${item.name}</div>
            <div class="orig">MRP: ₹${item.mrp}</div>
            <div class="new-price">₹${Math.round(item.mrp * (1 - item.autoDiscount / 100))}</div>
            <div class="banner" style="background:#00a651">SAVE ${item.autoDiscount}%</div>
            <div class="exp">Expires: ${item.expiry_date}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            ⏰ Expiry & FEFO Inventory Manager
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            First-Expired-First-Out tracking. Monitor batches, apply markdown clearances, and log write-offs.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="h-11">
          <RefreshCw className="w-4 h-4 animate-spin-hover" />
        </Button>
      </div>

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          onClick={() => setActiveTab("expired")}
          className={`border-l-4 border-l-red-500 cursor-pointer transition-all hover:scale-[1.01] ${activeTab === "expired" ? "ring-2 ring-red-500" : ""}`}
        >
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-red-500 uppercase tracking-widest">Expired Stock</p>
              <h2 className="text-3xl font-black font-mono mt-1 text-slate-800 dark:text-slate-100">{stats.expired} Items</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/20 text-red-500 flex items-center justify-center font-black">
              ⚠️
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setActiveTab("critical")}
          className={`border-l-4 border-l-orange-500 cursor-pointer transition-all hover:scale-[1.01] ${activeTab === "critical" ? "ring-2 ring-orange-500" : ""}`}
        >
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-orange-500 uppercase tracking-widest">Clearance (1-3 Days)</p>
              <h2 className="text-3xl font-black font-mono mt-1 text-slate-800 dark:text-slate-100">{stats.critical} Items</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center font-black">
              🔥
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setActiveTab("warning")}
          className={`border-l-4 border-l-yellow-500 cursor-pointer transition-all hover:scale-[1.01] ${activeTab === "warning" ? "ring-2 ring-yellow-500" : ""}`}
        >
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-widest">Attention (4-7 Days)</p>
              <h2 className="text-3xl font-black font-mono mt-1 text-slate-800 dark:text-slate-100">{stats.warning} Items</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-950/20 text-yellow-500 flex items-center justify-center font-black">
              👀
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.expired > 0 && (
        <Alert variant="destructive" className="bg-red-50 dark:bg-red-950/20 border-red-500/30">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Urgent Action Required</AlertTitle>
          <AlertDescription>
            You have {stats.expired} expired items sitting in your active inventory. Please write off these items immediately to prevent checkout sales.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Grid table */}
      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-border/40 pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              📋 Expiry Audit List 
              <Badge className="bg-blue-600/10 text-blue-600 hover:bg-blue-600/10 font-bold ml-2">
                {activeTab.toUpperCase()}
              </Badge>
            </CardTitle>
            <ResponsiveTabs 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              containerClassName="w-full sm:w-auto"
              tabs={[
                { id: "all", label: "All" },
                { id: "expired", label: "Expired" },
                { id: "critical", label: "1-3 Days" },
                { id: "warning", label: "4-7 Days" }
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">Scanning batches...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-semibold">No batches require attention under this filter.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/50 dark:bg-slate-900/50">
                    <TableHead className="font-bold">Product Name</TableHead>
                    <TableHead className="font-bold">Barcode / PLU</TableHead>
                    <TableHead className="font-bold">Stock Qty</TableHead>
                    <TableHead className="font-bold">Expiry Date</TableHead>
                    <TableHead className="font-bold text-center">Days Left</TableHead>
                    <TableHead className="font-bold text-center">Auto Markdown</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-100/20 dark:hover:bg-slate-900/10">
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">{item.name}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {item.barcode || "PLU: " + item.plu_code}
                      </TableCell>
                      <TableCell className="font-mono font-bold">{item.stock} {item.unit}</TableCell>
                      <TableCell className="font-mono text-slate-700 dark:text-slate-300">{item.expiry_date}</TableCell>
                      <TableCell className="text-center font-bold font-mono">
                        {item.daysLeft <= 0 ? (
                          <Badge className="bg-red-500 text-white border-none font-bold">Expired ({item.daysLeft} d)</Badge>
                        ) : item.daysLeft <= 1 ? (
                          <Badge className="bg-orange-500 text-white border-none font-bold">Tomorrow</Badge>
                        ) : item.daysLeft <= 3 ? (
                          <Badge className="bg-yellow-500 text-slate-950 border-none font-bold">{item.daysLeft} days left</Badge>
                        ) : (
                          <Badge className="bg-emerald-500 text-white border-none font-bold">{item.daysLeft} days left</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-black font-mono text-amber-600 dark:text-amber-400">
                        {item.daysLeft <= 0 ? (
                          <span className="text-red-500 font-bold">100% Writeoff</span>
                        ) : item.autoDiscount > 0 ? (
                          <span className="flex items-center justify-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" /> Save {item.autoDiscount}%
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1.5 justify-end items-center">
                          {item.daysLeft > 0 && item.autoDiscount > 0 && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold flex gap-1 h-8 px-2"
                                onClick={() => applyClearancePriceMutation.mutate({ product: item, discountPct: item.autoDiscount })}
                              >
                                Apply {item.autoDiscount}%
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => printShelfLabel(item)}
                                title="Print Shelf Label"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {item.daysLeft > 0 && item.daysLeft <= 1 && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold flex gap-1 h-8 px-2"
                              onClick={() => donateMutation.mutate(item)}
                            >
                              <HeartHandshake className="w-4 h-4" /> Donate
                            </Button>
                          )}
                          {item.daysLeft <= 0 ? (
                            <Button 
                              size="sm" 
                              className="bg-red-600 hover:bg-red-700 text-white font-bold flex gap-1 h-8 px-2"
                              onClick={() => writeOffMutation.mutate(item.id)}
                              disabled={writeOffMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" /> Write Off
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-500 hover:text-red-600 font-bold flex gap-1 h-8 px-2"
                              onClick={() => writeOffMutation.mutate(item.id)}
                              disabled={writeOffMutation.isPending}
                            >
                              Discard
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
