import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, fmtDate, today } from "@/lib/gst-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";

const LOAN_TYPES = ["Business Loan", "Personal Loan", "Vehicle Loan", "Equipment Loan", "Working Capital", "MSME Loan"];

function LoanForm({ open, onOpenChange, loan, onSave }) {
  const [form, setForm] = useState({
    lender_name: loan?.lender_name || "",
    loan_type: loan?.loan_type || "Business Loan",
    principal_amount: loan?.principal_amount || "",
    interest_rate: loan?.interest_rate || "",
    tenure_months: loan?.tenure_months || 12,
    emi_amount: loan?.emi_amount || "",
    disbursement_date: loan?.disbursement_date || today(),
    next_emi_date: loan?.next_emi_date || "",
    amount_paid: loan?.amount_paid || 0,
    outstanding_balance: loan?.outstanding_balance || "",
    status: loan?.status || "Active",
    notes: loan?.notes || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calculate EMI
  const calcEMI = () => {
    const p = Number(form.principal_amount);
    const r = Number(form.interest_rate) / 12 / 100;
    const n = Number(form.tenure_months);
    if (!p || !r || !n) return;
    const emi = r === 0 ? p / n : p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    set("emi_amount", Math.round(emi));
    if (!form.outstanding_balance) set("outstanding_balance", p);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-black">{loan ? "Edit Loan" : "Add Loan"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px]">Lender Name *</Label><Input value={form.lender_name} onChange={e => set("lender_name", e.target.value)} placeholder="Bank / NBFC name" /></div>
            <div>
              <Label className="text-[11px]">Loan Type</Label>
              <SearchableSelect
                options={LOAN_TYPES}
                value={form.loan_type}
                onValueChange={v => set("loan_type", v)}
                placeholder="Loan Type"
                searchPlaceholder="Search loan type..."
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-[11px]">Principal (₹) *</Label><Input type="number" value={form.principal_amount} onChange={e => set("principal_amount", Number(e.target.value))} placeholder="500000" /></div>
            <div><Label className="text-[11px]">Interest Rate %</Label><Input type="number" value={form.interest_rate} onChange={e => set("interest_rate", Number(e.target.value))} placeholder="10.5" /></div>
            <div><Label className="text-[11px]">Tenure (Months)</Label><Input type="number" value={form.tenure_months} onChange={e => set("tenure_months", Number(e.target.value))} /></div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label className="text-[11px]">EMI Amount (₹)</Label><Input type="number" value={form.emi_amount} onChange={e => set("emi_amount", Number(e.target.value))} placeholder="Auto-calc below" /></div>
            <Button variant="outline" size="sm" onClick={calcEMI} className="text-[11px] shrink-0">Calc EMI</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px]">Disbursement Date</Label><Input type="date" value={form.disbursement_date} onChange={e => set("disbursement_date", e.target.value)} /></div>
            <div><Label className="text-[11px]">Next EMI Date</Label><Input type="date" value={form.next_emi_date} onChange={e => set("next_emi_date", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px]">Amount Paid (₹)</Label><Input type="number" value={form.amount_paid} onChange={e => set("amount_paid", Number(e.target.value))} /></div>
            <div><Label className="text-[11px]">Outstanding Balance (₹)</Label><Input type="number" value={form.outstanding_balance} onChange={e => set("outstanding_balance", Number(e.target.value))} /></div>
          </div>
          <div>
            <Label className="text-[11px]">Status</Label>
            <SearchableSelect
              options={["Active", "Closed", "Overdue"]}
              value={form.status}
              onValueChange={v => set("status", v)}
              placeholder="Status"
              searchPlaceholder="Search status..."
            />
          </div>
          <div><Label className="text-[11px]">Notes</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button onClick={() => onSave(form)} disabled={!form.lender_name || !form.principal_amount} className="gold-gradient text-black font-bold">💾 Save</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_STYLES = {
  Active: "border-blue-500/30 text-blue-400",
  Closed: "border-emerald-500/30 text-emerald-400",
  Overdue: "border-red-500/30 text-red-400",
};

export default function Loans() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: () => base44.entities.Loan.list("-created_date") });
  const create = useMutation({ mutationFn: d => base44.entities.Loan.create(d), onSuccess: () => qc.invalidateQueries(["loans"]) });
  const update = useMutation({ mutationFn: ({ id, d }) => base44.entities.Loan.update(id, d), onSuccess: () => qc.invalidateQueries(["loans"]) });
  const del = useMutation({ mutationFn: id => base44.entities.Loan.delete(id), onSuccess: () => qc.invalidateQueries(["loans"]) });

  const handleSave = (data) => {
    if (editing) update.mutate({ id: editing.id, d: data });
    else create.mutate(data);
    setShowForm(false); setEditing(null);
  };

  const activeLoans = loans.filter(l => l.status === "Active");
  const totalPrincipal = activeLoans.reduce((s, l) => s + (l.principal_amount || 0), 0);
  const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstanding_balance || l.principal_amount || 0), 0);
  const totalEMI = activeLoans.reduce((s, l) => s + (l.emi_amount || 0), 0);

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">🏦 Loan Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track business loans, EMIs and repayment schedules</p>
        </div>
        <Button className="gold-gradient text-black font-bold gap-2" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Add Loan
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Loans", value: activeLoans.length, icon: "🏦", color: "text-blue-400" },
          { label: "Total Principal", value: fmtINR(totalPrincipal), icon: "💰", color: "text-yellow-400" },
          { label: "Total Outstanding", value: fmtINR(totalOutstanding), icon: "📉", color: "text-red-400" },
          { label: "Monthly EMI Outgo", value: fmtINR(totalEMI), icon: "📅", color: "text-orange-400" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xl">{s.icon}</p>
            <p className={`text-lg font-black ${s.color} mt-1`}>{s.value}</p>
            <p className="text-[12px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Loans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {loans.length === 0 ? (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">🏦</p>
            <p className="font-semibold">No loans added yet</p>
            <p className="text-sm mt-1">Click "Add Loan" to track your business loans</p>
          </div>
        ) : (
          loans.map(loan => {
            const progress = loan.principal_amount > 0 ? ((loan.amount_paid || 0) / loan.principal_amount) * 100 : 0;
            const outstanding = loan.outstanding_balance || (loan.principal_amount - (loan.amount_paid || 0));
            return (
              <div key={loan.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[14px] text-foreground">{loan.lender_name}</p>
                    <p className="text-[11px] text-muted-foreground">{loan.loan_type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[loan.status] || "border-border text-muted-foreground"}`}>
                      {loan.status}
                    </Badge>
                    <button onClick={() => { setEditing(loan); setShowForm(true); }} className="p-1 rounded hover:bg-accent text-muted-foreground">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => del.mutate(loan.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-muted-foreground">Principal</p>
                    <p className="font-bold text-foreground">{fmtINR(loan.principal_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Outstanding</p>
                    <p className="font-bold text-red-400">{fmtINR(outstanding)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">EMI / Month</p>
                    <p className="font-bold text-yellow-400">{fmtINR(loan.emi_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rate</p>
                    <p className="font-bold text-foreground">{loan.interest_rate || 0}% p.a.</p>
                  </div>
                </div>

                {loan.principal_amount > 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Repayment Progress</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                  </div>
                )}

                {loan.next_emi_date && (
                  <p className="text-[10px] text-muted-foreground">Next EMI: {fmtDate(loan.next_emi_date)}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {showForm && <LoanForm open={showForm} onOpenChange={setShowForm} loan={editing} onSave={handleSave} />}
    </div>
  );
}