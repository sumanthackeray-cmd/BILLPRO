import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "@/lib/toast";
import { Tag, Sparkles, Plus, RefreshCw, Calendar, Clock, Percent, AlertCircle } from "lucide-react";

export default function PriceEngine() {
  const queryClient = useQueryClient();
  const [openOfferModal, setOpenOfferModal] = useState(false);
  const [newOffer, setNewOffer] = useState({
    offer_name: "",
    offer_type: "tpr",
    applies_to: "product",
    product_ids: "", // comma-separated strings
    discount_value: "",
    discount_pct: "",
    min_qty: 1,
    min_amount: "",
    priority: 1,
    valid_from: new Date().toISOString().split("T")[0],
    valid_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  const { data: offers = [], isLoading, refetch } = useQuery({
    queryKey: ["price_engine"],
    queryFn: () => base44.entities.PriceEngine.list()
  });

  const createOfferMutation = useMutation({
    mutationFn: async (payload) => {
      const data = {
        ...payload,
        product_ids: payload.product_ids ? payload.product_ids.split(",").map(id => id.trim()) : [],
        discount_value: Number(payload.discount_value || 0),
        discount_pct: Number(payload.discount_pct || 0),
        min_qty: Number(payload.min_qty || 1),
        min_amount: Number(payload.min_amount || 0),
        priority: Number(payload.priority || 1),
        is_active: true
      };
      return base44.entities.PriceEngine.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["price_engine"]);
      setOpenOfferModal(false);
      setNewOffer({
        offer_name: "",
        offer_type: "tpr",
        applies_to: "product",
        product_ids: "",
        discount_value: "",
        discount_pct: "",
        min_qty: 1,
        min_amount: "",
        priority: 1,
        valid_from: new Date().toISOString().split("T")[0],
        valid_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
      toast.success("New promotional rule created successfully!");
    },
    onError: (err) => {
      toast.error("Failed to create promotion rule: " + err.message);
    }
  });

  const toggleOfferMutation = useMutation({
    mutationFn: async (offer) => {
      return base44.entities.PriceEngine.update(offer.id, {
        is_active: !offer.is_active
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["price_engine"]);
      toast.success("Offer status updated successfully.");
    }
  });

  const handleOfferSubmit = (e) => {
    e.preventDefault();
    if (!newOffer.offer_name) {
      toast.error("Offer Name is required.");
      return;
    }
    createOfferMutation.mutate(newOffer);
  };

  const getOfferTypeLabel = (type) => {
    switch (type) {
      case "tpr": return "TPR (Price Reduction)";
      case "bxgy": return "Buy X Get Y Free";
      case "quantity_break": return "Quantity Break (Combo)";
      case "cart_total": return "Cart Total discount";
      case "member_price": return "Member Special Pricing";
      case "happy_hour": return "Happy Hour discount";
      default: return type.toUpperCase();
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            🏷️ Supermarket Price & Offers Engine
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Define dynamic promotional pricing, bundle deals, and cart checkout thresholds.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" className="h-11">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setOpenOfferModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 gap-2">
            <Plus className="w-5 h-5" /> Add Promo Rule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-orange-500 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/20 text-orange-600 flex items-center justify-center font-bold text-lg">🏷️</div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-black">Active Rules</p>
            <h3 className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{offers.filter(o=>o.is_active).length} Rules</h3>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/20 text-blue-600 flex items-center justify-center font-bold text-lg">⚡</div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-black">TPR Reductions</p>
            <h3 className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{offers.filter(o=>o.offer_type==='tpr').length} Active</h3>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center font-bold text-lg">🔥</div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-black">Combo/BXGY</p>
            <h3 className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{offers.filter(o=>o.offer_type==='bxgy' || o.offer_type==='quantity_break').length} Active</h3>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/20 text-purple-600 flex items-center justify-center font-bold text-lg">🛍️</div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-black">Cart Thresholds</p>
            <h3 className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{offers.filter(o=>o.offer_type==='cart_total').length} Active</h3>
          </div>
        </Card>
      </div>

      {/* Offers Rules list */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-xl font-bold">Active Store Promotions</CardTitle>
          <CardDescription>Rules apply in descending priority index during barcode scanning checkout.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">Scanning pricing table...</div>
          ) : offers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-semibold">No promotional rules configured.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/50 dark:bg-slate-900/50">
                    <TableHead className="font-bold">Promotion Name</TableHead>
                    <TableHead className="font-bold">Rule Type</TableHead>
                    <TableHead className="font-bold">Target Target</TableHead>
                    <TableHead className="font-bold text-right">Discount</TableHead>
                    <TableHead className="font-bold text-center">Priority</TableHead>
                    <TableHead className="font-bold text-center">Valid Range</TableHead>
                    <TableHead className="font-bold text-center">Status</TableHead>
                    <TableHead className="font-bold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow key={offer.id} className="hover:bg-slate-100/20 dark:hover:bg-slate-900/10">
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">{offer.offer_name}</TableCell>
                      <TableCell className="font-semibold text-xs text-blue-600 dark:text-blue-400">
                        {getOfferTypeLabel(offer.offer_type)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {offer.applies_to === "cart_total" 
                          ? `Spend >= ₹${offer.min_amount || 1000}` 
                          : (offer.product_ids && offer.product_ids.length > 0 ? offer.product_ids.join(", ") : "All products")}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {offer.discount_pct > 0 ? `${offer.discount_pct}% Off` : `₹${offer.discount_value || 0} Off`}
                      </TableCell>
                      <TableCell className="text-center font-mono">{offer.priority}</TableCell>
                      <TableCell className="text-center text-xs font-mono text-slate-500">
                        {offer.valid_from} to {offer.valid_to}
                      </TableCell>
                      <TableCell className="text-center">
                        {offer.is_active ? (
                          <Badge className="bg-emerald-500 text-white border-none font-bold">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-none font-bold">Suspended</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className={offer.is_active ? "border-red-500/20 text-red-500 hover:bg-red-50" : "border-emerald-500/20 text-emerald-600 hover:bg-emerald-50"}
                          onClick={() => toggleOfferMutation.mutate(offer)}
                        >
                          {offer.is_active ? "Suspend" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Offer Dialog Modal */}
      <Dialog open={openOfferModal} onOpenChange={setOpenOfferModal}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-card border border-border text-slate-900 dark:text-slate-100 p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              🏷️ Create Promotional Pricing Rule
            </DialogTitle>
            <DialogDescription>
              Deploy a new temporary price reduction, buy-x-get-y bundle or cart trigger discount.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOfferSubmit} className="space-y-4 pt-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Promotion Name *</Label>
              <Input
                required
                value={newOffer.offer_name}
                onChange={e => setNewOffer({ ...newOffer, offer_name: e.target.value })}
                placeholder="e.g. Wednesday Veggies Bonanza"
                className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Offer Type</Label>
                <SearchableSelect
                  value={newOffer.offer_type}
                  onValueChange={val => setNewOffer({ ...newOffer, offer_type: val })}
                  options={[
                    { label: "TPR Price Drop", value: "tpr" },
                    { label: "Buy X Get Y Free", value: "bxgy" },
                    { label: "Quantity Break", value: "quantity_break" },
                    { label: "Cart Total Discount", value: "cart_total" },
                    { label: "Loyalty Member Price", value: "member_price" },
                  ]}
                  placeholder="Select Offer Type"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Applies To</Label>
                <SearchableSelect
                  value={newOffer.applies_to}
                  onValueChange={val => setNewOffer({ ...newOffer, applies_to: val })}
                  options={[
                    { label: "Specific Product", value: "product" },
                    { label: "Category-wide", value: "category" },
                    { label: "Total Cart Value", value: "cart_total" },
                  ]}
                  placeholder="Select Target"
                />
              </div>
            </div>

            {newOffer.applies_to !== "cart_total" && (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Target Products (Barcodes or PLUs comma-separated)</Label>
                <Input
                  value={newOffer.product_ids}
                  onChange={e => setNewOffer({ ...newOffer, product_ids: e.target.value })}
                  placeholder="e.g. 8901031100224, 1002"
                  className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border font-mono"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Value Off (₹)</Label>
                <Input
                  type="number"
                  value={newOffer.discount_value}
                  onChange={e => setNewOffer({ ...newOffer, discount_value: e.target.value })}
                  placeholder="₹15"
                  className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Percent Off (%)</Label>
                <Input
                  type="number"
                  value={newOffer.discount_pct}
                  onChange={e => setNewOffer({ ...newOffer, discount_pct: e.target.value })}
                  placeholder="10%"
                  className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Min Qty Required</Label>
                <Input
                  type="number"
                  value={newOffer.min_qty}
                  onChange={e => setNewOffer({ ...newOffer, min_qty: e.target.value })}
                  placeholder="3"
                  className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border font-mono"
                />
              </div>
            </div>

            {newOffer.applies_to === "cart_total" && (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Min Cart Amount (₹)</Label>
                <Input
                  type="number"
                  value={newOffer.min_amount}
                  onChange={e => setNewOffer({ ...newOffer, min_amount: e.target.value })}
                  placeholder="1000"
                  className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border font-mono"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1 col-span-1">
                <Label className="text-xs font-bold">Priority Rank</Label>
                <Input
                  type="number"
                  value={newOffer.priority}
                  onChange={e => setNewOffer({ ...newOffer, priority: e.target.value })}
                  placeholder="10"
                  className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border font-mono"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs font-bold flex items-center gap-1"><Calendar className="w-3 h-3" /> Valid To</Label>
                <Input
                  type="date"
                  value={newOffer.valid_to}
                  onChange={e => setNewOffer({ ...newOffer, valid_to: e.target.value })}
                  className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={createOfferMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full h-10">
                {createOfferMutation.isPending ? "Saving..." : "🏷️ Deploy Promo Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
