import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, Users, CircleDot, ShieldAlert, KeyRound, Printer, RefreshCw, FileText, CheckCircle2, History } from "lucide-react";

export default function CounterManagement() {
  const queryClient = useQueryClient();
  const [openSessionModal, setOpenSessionModal] = useState(false);
  const [openCloseModal, setOpenCloseModal] = useState(false);
  const [openAuditModal, setOpenAuditModal] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState(null);
  
  const [openingCash, setOpeningCash] = useState("");
  const [selectedCashier, setSelectedCashier] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  // Queries
  const { data: posSessions = [], isLoading: isLoadingSessions, refetch: refetchSessions } = useQuery({
    queryKey: ["pos_sessions"],
    queryFn: () => base44.entities.PosSession.list("-opening_time")
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list()
  });

  const counters = useMemo(() => {
    return [
      { id: "counter-1", name: "Counter 1 - General", dept: "Express / Packaged", type: "Express checkout (< 10 items)" },
      { id: "counter-2", name: "Counter 2 - General", dept: "Groceries & FMCG", type: "Bulk & standard checkout" },
      { id: "counter-3", name: "Counter 3 - Fresh & F&V", dept: "Fresh (Fruits/Veg/Meat)", type: "Weighing scale attached" },
      { id: "counter-4", name: "Counter 4 - Express", dept: "General Quick", type: "Self checkout / Express kiosk" }
    ];
  }, []);

  const openSessionMutation = useMutation({
    mutationFn: async (payload) => {
      const activeSession = posSessions.find(s => s.counter_id === payload.counter_id && s.status === "open");
      if (activeSession) {
        throw new Error("This counter already has an active open session.");
      }

      return base44.entities.PosSession.create({
        counter_id: payload.counter_id,
        cashier_id: payload.cashier_id,
        cashier_name: (() => {
          const emp = employees.find(e => e.id === payload.cashier_id);
          return emp ? (emp.full_name || emp.name || (emp.first_name ? emp.first_name + ' ' + (emp.last_name || '') : '') || "Staff") : "Staff";
        })(),
        session_date: new Date().toISOString().split("T")[0],
        opening_time: new Date().toISOString(),
        opening_cash: Number(payload.opening_cash),
        status: "open",
        total_bills: 0,
        total_revenue: 0,
        cash_sales: 0,
        card_sales: 0,
        upi_sales: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pos_sessions"]);
      setOpenSessionModal(false);
      setOpeningCash("");
      setSelectedCashier("");
      toast.success("POS session opened. Cash register activated.");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const closeSessionMutation = useMutation({
    mutationFn: async (payload) => {
      const session = posSessions.find(s => s.counter_id === payload.counter_id && s.status === "open");
      if (!session) throw new Error("No active session found for this counter.");

      // Calculate actual expected sales from invoices
      const sessionInvoices = invoices.filter(inv => inv.pos_session_id === session.id || inv.counterId === payload.counter_id);
      
      let expectedCash = session.opening_cash;
      let cashSales = 0;
      let cardSales = 0;
      let upiSales = 0;
      let totalBills = 0;
      let totalRevenue = 0;

      sessionInvoices.forEach(inv => {
        totalBills++;
        totalRevenue += Number(inv.grand_total || 0);
        if (inv.payment_mode === "cash") {
          cashSales += Number(inv.grand_total || 0);
          expectedCash += Number(inv.grand_total || 0);
        } else if (inv.payment_mode === "card") {
          cardSales += Number(inv.grand_total || 0);
        } else {
          upiSales += Number(inv.grand_total || 0);
        }
      });

      const actualCashInHand = Number(payload.closing_cash);
      const cashDifference = actualCashInHand - expectedCash;

      return base44.entities.PosSession.update(session.id, {
        closing_time: new Date().toISOString(),
        closing_cash: actualCashInHand,
        expected_cash: expectedCash,
        cash_difference: cashDifference,
        total_bills: totalBills,
        total_revenue: totalRevenue,
        cash_sales: cashSales,
        card_sales: cardSales,
        upi_sales: upiSales,
        status: "closed",
        notes: payload.notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pos_sessions"]);
      setOpenCloseModal(false);
      setClosingCash("");
      setClosingNotes("");
      toast.success("POS session closed successfully. Z-Report printed.");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const activeSessionsMap = useMemo(() => {
    const map = {};
    posSessions.forEach(s => {
      if (s.status === "open") {
        map[s.counter_id] = s;
      }
    });
    return map;
  }, [posSessions]);

  const handleOpenClick = (counter) => {
    setSelectedCounter(counter);
    setOpenSessionModal(true);
  };

  const handleCloseClick = (counter) => {
    setSelectedCounter(counter);
    setOpenCloseModal(true);
  };

  const printZReport = (session) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Z-Report - ${session.counter_id}</title>
          <style>
            body { font-family: monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 20px; line-height: 1.4; }
            .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .divider { border-bottom: 1px dashed black; margin: 10px 0; }
            .total { font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h3>VOGATS RETAIL LIMITED</h3>
            <h4>Z-REPORT (SHIFT CLOSE)</h4>
            <div>Counter ID: ${session.counter_id}</div>
            <div>Cashier: ${session.cashier_name}</div>
            <div>Shift Date: ${session.session_date}</div>
          </div>
          <div class="divider"></div>
          <div class="row"><span>Opening Float:</span><span>₹${session.opening_cash}</span></div>
          <div class="row"><span>Cash Sales:</span><span>₹${session.cash_sales || 0}</span></div>
          <div class="row"><span>Card Sales:</span><span>₹${session.card_sales || 0}</span></div>
          <div class="row"><span>UPI Sales:</span><span>₹${session.upi_sales || 0}</span></div>
          <div class="divider"></div>
          <div class="row total"><span>Total Net Sales:</span><span>₹${session.total_revenue || 0}</span></div>
          <div class="row"><span>Total Bills Checked:</span><span>${session.total_bills || 0}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Expected Cash:</span><span>₹${session.expected_cash || 0}</span></div>
          <div class="row"><span>Closing Drawer Cash:</span><span>₹${session.closing_cash || 0}</span></div>
          <div class="row total" style="color: ${session.cash_difference < 0 ? 'red' : 'green'}">
            <span>Difference:</span><span>₹${session.cash_difference || 0}</span>
          </div>
          <div class="divider"></div>
          <div style="text-align:center; font-size:10px; margin-top:20px;">
            SHIFT CLOSED ON ${new Date(session.closing_time).toLocaleString()}<br/>
            MANAGER SIGNATURE
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            🏪 Counter & POS Session Manager
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Monitor registers, verify cash drawers float balances, and audit checkout difference.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenAuditModal(true)} variant="outline" className="h-11 font-bold border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 flex gap-2">
            <ShieldAlert className="w-5 h-5" /> Supervisor Override Logs
          </Button>
          <Button onClick={() => refetchSessions()} variant="outline" className="h-11">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Interactive Layout of counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {counters.map((c) => {
          const activeSession = activeSessionsMap[c.id];
          return (
            <Card key={c.id} className="relative overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
              {activeSession ? (
                <div className="absolute top-0 right-0 w-24 h-6 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center rotate-45 translate-x-7 translate-y-2">
                  Live
                </div>
              ) : (
                <div className="absolute top-0 right-0 w-24 h-6 bg-slate-400 text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center rotate-45 translate-x-7 translate-y-2">
                  Offline
                </div>
              )}
              
              <CardHeader className="pb-3 bg-slate-100/50 dark:bg-slate-900/50 border-b border-border/20">
                <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <LayoutGrid className="w-4.5 h-4.5 text-blue-600" /> {c.name}
                </CardTitle>
                <CardDescription className="text-xs">{c.dept}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Device Mode</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{c.type}</p>
                </div>

                {activeSession ? (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Cashier:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{activeSession.cashier_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Float In:</span>
                      <span className="font-bold font-mono">₹{activeSession.opening_cash}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-emerald-500/10 pt-1.5">
                      <span className="text-emerald-600 font-bold">🟢 Open Session</span>
                      <span className="font-mono text-slate-500 text-[10px]">{new Date(activeSession.opening_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-border/40 rounded-xl flex items-center justify-center h-[76px]">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CircleDot className="w-3.5 h-3.5 text-slate-400" /> Closed / Locked
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  {activeSession ? (
                    <Button 
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-10 gap-1.5"
                      onClick={() => handleCloseClick(c)}
                    >
                      🚪 Close Counter Shift
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 gap-1.5"
                      onClick={() => handleOpenClick(c)}
                    >
                      🔑 Open Counter Shift
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Closed Sessions History list */}
      <Card className="border-none shadow-sm mt-6">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" /> Z-Report Session Archives
          </CardTitle>
          <CardDescription>Review closed shift logs, drawer float discrepancies and supervisor remarks.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingSessions ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">Fetching session archive...</div>
          ) : posSessions.filter(s => s.status === "closed").length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-semibold">No closed sessions archived yet.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/50 dark:bg-slate-900/50">
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Counter ID</TableHead>
                    <TableHead className="font-bold">Cashier</TableHead>
                    <TableHead className="font-bold text-right">Opening Float</TableHead>
                    <TableHead className="font-bold text-right">Expected Revenue</TableHead>
                    <TableHead className="font-bold text-right">Closing Cash</TableHead>
                    <TableHead className="font-bold text-right">Discrepancy</TableHead>
                    <TableHead className="font-bold text-center">Status</TableHead>
                    <TableHead className="font-bold text-right">Z-Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posSessions.filter(s => s.status === "closed").map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-100/20 dark:hover:bg-slate-900/10">
                      <TableCell className="font-mono text-xs">{s.session_date} {new Date(s.closing_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</TableCell>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">{s.counter_id.toUpperCase()}</TableCell>
                      <TableCell className="font-semibold">{s.cashier_name}</TableCell>
                      <TableCell className="text-right font-mono">₹{s.opening_cash}</TableCell>
                      <TableCell className="text-right font-mono">₹{s.expected_cash || 0}</TableCell>
                      <TableCell className="text-right font-mono font-bold">₹{s.closing_cash || 0}</TableCell>
                      <TableCell className={`text-right font-mono font-black ${s.cash_difference < 0 ? "text-red-500" : s.cash_difference > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                        {s.cash_difference > 0 ? "+" : ""}{s.cash_difference || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-none font-bold">Shift Closed</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => printZReport(s)} className="text-blue-600 hover:text-blue-700 h-8 gap-1 font-bold">
                          <Printer className="w-3.5 h-3.5" /> Print
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

      {/* Opening Session Dialog Modal */}
      <Dialog open={openSessionModal} onOpenChange={setOpenSessionModal}>
        <DialogContent className="max-w-sm w-full max-h-[90vh] overflow-y-auto bg-card border border-border text-slate-900 dark:text-slate-100 p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              🔑 Open Cashier Session
            </DialogTitle>
            <DialogDescription>
              Assign a cashier employee and log the opening drawer cash float.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Counter</Label>
              <Input value={selectedCounter?.name || ""} disabled className="bg-slate-100 dark:bg-slate-800 border-border" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Assign Active Cashier</Label>
              <SearchableSelect
                value={selectedCashier}
                onValueChange={setSelectedCashier}
                options={employees.length === 0 ? [
                  { label: "Priya K. (Default Cashier)", value: "default" }
                ] : employees.map(e => ({ label: e.full_name || e.name || (e.first_name ? e.first_name + ' ' + (e.last_name || '') : '') || "Unknown Staff", value: e.id }))}
                placeholder="Choose Cashier"
                className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Opening Cash Float (₹) *</Label>
              <Input
                type="number"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                placeholder="e.g. 5000"
                className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button 
                onClick={() => {
                  if (!openingCash) {
                    toast.error("Please enter opening cash float.");
                    return;
                  }
                  if (!selectedCashier && employees.length > 0) {
                     toast.error("Please assign a cashier.");
                     return;
                  }
                  const cashierVal = selectedCashier || "default";
                  
                  // Debug logging to help identify why it fails
                  console.log("Attempting to open shift with payload:", {
                    counter_id: selectedCounter.id,
                    cashier_id: cashierVal,
                    opening_cash: openingCash
                  });

                  openSessionMutation.mutate({
                    counter_id: selectedCounter.id,
                    cashier_id: cashierVal,
                    opening_cash: openingCash
                  });
                }}
                disabled={openSessionMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full h-10"
              >
                {openSessionMutation.isPending ? "Creating session..." : "🔓 Unlock Register & Start Shift"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Closing Session Dialog Modal */}
      <Dialog open={openCloseModal} onOpenChange={setOpenCloseModal}>
        <DialogContent className="max-w-sm w-full max-h-[90vh] overflow-y-auto bg-card border border-border text-slate-900 dark:text-slate-100 p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              🚪 Close Cashier Session & Shift
            </DialogTitle>
            <DialogDescription>
              Count cash drawer balance and review transaction audit reports.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Register Counter</Label>
              <Input value={selectedCounter?.name || ""} disabled className="bg-slate-100 dark:bg-slate-800 border-border" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Closing Cash Counted (₹) *</Label>
              <Input
                type="number"
                value={closingCash}
                onChange={e => setClosingCash(e.target.value)}
                placeholder="e.g. 18200"
                className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Notes / Remarks</Label>
              <Input
                value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)}
                placeholder="e.g. Shortage of ₹50 or perfect drawer match"
                className="h-10 bg-slate-100/50 dark:bg-slate-900 border-border text-slate-900 dark:text-slate-100"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button 
                onClick={() => {
                  closeSessionMutation.mutate({
                    counter_id: selectedCounter.id,
                    closing_cash: closingCash || 0,
                    notes: closingNotes
                  });
                }}
                disabled={closeSessionMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold w-full h-10"
              >
                {closeSessionMutation.isPending ? "Closing session..." : "🔒 Lock Register & Close Shift"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supervisor Audit Logs Modal */}
      <Dialog open={openAuditModal} onOpenChange={setOpenAuditModal}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-card border border-border text-slate-900 dark:text-slate-100 p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <ShieldAlert className="w-6 h-6" /> Supervisor Security Audit Logs
            </DialogTitle>
            <DialogDescription>
              Real-time audit log of security overrides, manual cash drawer triggers, price alterations and void tickets.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-3 overflow-auto max-h-[300px] w-full border rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Time</TableHead>
                  <TableHead className="font-bold">Action Type</TableHead>
                  <TableHead className="font-bold">Counter</TableHead>
                  <TableHead className="font-bold">Cashier</TableHead>
                  <TableHead className="font-bold">Supervisor ID</TableHead>
                  <TableHead className="font-bold">Reason / Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">10:20 AM</TableCell>
                  <TableCell className="font-bold text-red-500">VOID BILL</TableCell>
                  <TableCell className="font-mono text-xs">COUNTER 3</TableCell>
                  <TableCell>Priya K.</TableCell>
                  <TableCell className="font-semibold text-slate-800">SUP_082 (Rahul)</TableCell>
                  <TableCell className="text-xs">Customer walked away before payment</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">11:12 AM</TableCell>
                  <TableCell className="font-bold text-amber-500">PRICE OVERRIDE</TableCell>
                  <TableCell className="font-mono text-xs">COUNTER 1</TableCell>
                  <TableCell>Priya K.</TableCell>
                  <TableCell className="font-semibold text-slate-800">SUP_082 (Rahul)</TableCell>
                  <TableCell className="text-xs">Tomato rate adjusted due to shelf damage (₹40 to ₹25)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">11:15 AM</TableCell>
                  <TableCell className="font-bold text-blue-500">DRAWER OPEN</TableCell>
                  <TableCell className="font-mono text-xs">COUNTER 3</TableCell>
                  <TableCell>Sneha P.</TableCell>
                  <TableCell className="font-semibold text-slate-800">SUP_082 (Rahul)</TableCell>
                  <TableCell className="text-xs">Manual cash change required</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="pt-2">
            <Button onClick={() => setOpenAuditModal(false)} className="w-full font-bold">Close Logs</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
