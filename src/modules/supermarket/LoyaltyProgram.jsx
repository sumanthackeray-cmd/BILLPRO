import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus, CreditCard, Gift, Award, Smartphone, RefreshCw, Calendar } from "lucide-react";

export default function LoyaltyProgram() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [openEnrollModal, setOpenEnrollModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    email: "",
    birthday: "",
    anniversary: "",
    card_type: "silver"
  });

  // Query loyalty cards
  const { data: loyaltyCards = [], isLoading, refetch } = useQuery({
    queryKey: ["loyalty_cards"],
    queryFn: () => base44.entities.LoyaltyCard.list("-created_date")
  });

  const enrollMutation = useMutation({
    mutationFn: async (payload) => {
      const cardNumber = "SMC-" + Math.floor(1000 + Math.random() * 9000) + "-" + Math.floor(1000 + Math.random() * 9000);
      const data = {
        ...payload,
        card_number: cardNumber,
        points_balance: 100, // 100 welcome points
        points_value: 0.01, // 100 points = ₹1
        total_earned: 100,
        total_redeemed: 0,
        total_spent: 0,
        tier_since: new Date().toISOString().split("T")[0],
        is_active: true
      };
      return base44.entities.LoyaltyCard.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["loyalty_cards"]);
      setOpenEnrollModal(false);
      setNewMember({ name: "", phone: "", email: "", birthday: "", anniversary: "", card_type: "silver" });
      toast.success("New Loyalty Member Enrolled Successfully!");
    },
    onError: (err) => {
      toast.error("Failed to enroll member: " + err.message);
    }
  });

  const handleEnrollSubmit = (e) => {
    e.preventDefault();
    if (!newMember.name || !newMember.phone) {
      toast.error("Name and Phone number are required.");
      return;
    }
    enrollMutation.mutate(newMember);
  };

  const getTierColor = (tier) => {
    switch (String(tier).toLowerCase()) {
      case "platinum":
        return "bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-400";
      case "gold":
        return "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300";
      case "silver":
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200";
    }
  };

  const filteredCards = loyaltyCards.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.card_number?.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            💎 Loyalty Program Manager
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Configure member reward tiers, points balances, and customer lifecycle rewards.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => refetch()} variant="outline" className="h-11">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setOpenEnrollModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 gap-2 flex-1 sm:flex-initial">
            <UserPlus className="w-5 h-5" /> Enroll New Member
          </Button>
        </div>
      </div>

      {/* Tiers Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-slate-400 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200">Silver Member</Badge>
                <h3 className="text-2xl font-black mt-2 font-mono text-slate-800 dark:text-slate-100">1 pt / ₹10 spent</h3>
                <p className="text-xs text-muted-foreground mt-1">Default Tier | 0 to ₹10,000 annual checkout value</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100">Gold Member</Badge>
                <h3 className="text-2xl font-black mt-2 font-mono text-slate-800 dark:text-slate-100">1.5 pt / ₹10 spent</h3>
                <p className="text-xs text-muted-foreground mt-1">Tier-Up threshold: ₹10,000 – ₹50,000 spent</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-cyan-500 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 hover:bg-cyan-100">Platinum Member</Badge>
                <h3 className="text-2xl font-black mt-2 font-mono text-slate-800 dark:text-slate-100">2.0 pt / ₹10 spent</h3>
                <p className="text-xs text-muted-foreground mt-1">VIP Tier | ₹50,000+ spend threshold</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-cyan-50 dark:bg-cyan-950/20 flex items-center justify-center text-cyan-500">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main List Card */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <CardTitle className="text-xl font-bold">Registered Members</CardTitle>
              <CardDescription>Search and manage customer point ledger accounts.</CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 w-4. h-4 text-muted-foreground" />
              <Input
                placeholder="Search by card no, phone or name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-10 w-full bg-slate-100/50 dark:bg-slate-900 border-border"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">Loading member directory...</div>
          ) : filteredCards.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-semibold">No loyalty members found.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/50 dark:bg-slate-900/50">
                    <TableHead className="font-bold">Card Number</TableHead>
                    <TableHead className="font-bold">Customer Name</TableHead>
                    <TableHead className="font-bold">Phone Number</TableHead>
                    <TableHead className="font-bold">Tier Class</TableHead>
                    <TableHead className="font-bold text-right">Points Bal</TableHead>
                    <TableHead className="font-bold text-right">Value (₹)</TableHead>
                    <TableHead className="font-bold text-right">Total Spent</TableHead>
                    <TableHead className="font-bold text-center">Birthday</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.map((card) => (
                    <TableRow key={card.id} className="hover:bg-slate-100/20 dark:hover:bg-slate-900/10">
                      <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> {card.card_number}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{card.name}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 font-mono">{card.phone}</TableCell>
                      <TableCell>
                        <Badge className={getTierColor(card.card_type)}>
                          {String(card.card_type).toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black font-mono text-emerald-600 dark:text-emerald-400">{card.points_balance}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">₹{(card.points_balance * 0.1).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">₹{(card.total_spent || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {card.birthday ? (
                          <span className="flex items-center justify-center gap-1">
                            <Gift className="w-3 h-3 text-red-400" /> {card.birthday}
                          </span>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enroll Modal Dialog */}
      <Dialog open={openEnrollModal} onOpenChange={setOpenEnrollModal}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto bg-card border border-border text-slate-900 dark:text-slate-100 p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              💎 Member Enrollment Form
            </DialogTitle>
            <DialogDescription>
              Register a customer to issue a loyalty barcode and start earning points.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEnrollSubmit} className="space-y-4 pt-3">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs font-bold text-slate-700 dark:text-slate-300">Customer Full Name *</Label>
              <Input
                id="name"
                required
                value={newMember.name}
                onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">Mobile Phone Number *</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  required
                  type="tel"
                  maxLength={10}
                  value={newMember.phone}
                  onChange={e => setNewMember({ ...newMember, phone: e.target.value.replace(/\D/g, "") })}
                  placeholder="9876543210"
                  className="pl-9 h-10 bg-slate-100/50 dark:bg-slate-900 border-border text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={newMember.email}
                onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="ramesh@gmail.com"
                className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bday" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Gift className="w-3 h-3 text-red-400" /> Birthday
                </Label>
                <Input
                  id="bday"
                  type="date"
                  value={newMember.birthday}
                  onChange={e => setNewMember({ ...newMember, birthday: e.target.value })}
                  className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="anniversary" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-pink-400" /> Anniversary
                </Label>
                <Input
                  id="anniversary"
                  type="date"
                  value={newMember.anniversary}
                  onChange={e => setNewMember({ ...newMember, anniversary: e.target.value })}
                  className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-border/40">
              <Button type="submit" disabled={enrollMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full h-10">
                {enrollMutation.isPending ? "Registering..." : "💎 Complete Enrollment & Activate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
