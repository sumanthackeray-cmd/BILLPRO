import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, fmtDate, today } from "@/lib/gst-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useLanguage } from "@/lib/LanguageContext";

const CATEGORIES = ["Rent", "Salary", "Utilities", "Marketing", "Maintenance", "Transport", "Raw Material", "Equipment", "Loan EMI", "Miscellaneous"];
const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque", "Credit Card"];
const COLORS = ["hsl(36,90%,55%)", "hsl(160,72%,39%)", "hsl(217,91%,60%)", "hsl(263,70%,65%)", "hsl(174,72%,41%)", "hsl(0,84%,60%)", "hsl(38,92%,50%)", "hsl(199,89%,48%)", "hsl(291,64%,42%)", "hsl(130,62%,40%)"];

function ExpenseForm({ open, onOpenChange, expense, onSave }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: expense?.title || "",
    category: expense?.category || "Miscellaneous",
    amount: expense?.amount || "",
    date: expense?.date || today(),
    paid_to: expense?.paid_to || "",
    payment_mode: expense?.payment_mode || "Cash",
    reference_no: expense?.reference_no || "",
    notes: expense?.notes || "",
    gst_amount: expense?.gst_amount || 0,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader><DialogTitle className="font-black">{expense ? t("expenses.edit") : t("expenses.add")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-[11px]">{t("common.title")} *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">{t("expenses.category")}</Label>
              <SearchableSelect
                options={CATEGORIES}
                value={form.category}
                onValueChange={v => set("category", v)}
                placeholder={t("expenses.category")}
                searchPlaceholder={t("common.search")}
              />
            </div>
            <div><Label className="text-[11px]">{t("expenses.amount")} (₹) *</Label><Input type="number" min={0} value={form.amount} onChange={e => set("amount", Number(e.target.value))} placeholder="0.00" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px]">{t("common.date")} *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div>
              <Label className="text-[11px]">{t("expenses.payment_mode")}</Label>
              <SearchableSelect
                options={PAYMENT_MODES}
                value={form.payment_mode}
                onValueChange={v => set("payment_mode", v)}
                placeholder={t("expenses.payment_mode")}
                searchPlaceholder={t("common.search")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px]">{t("expenses.paid_to")}</Label><Input value={form.paid_to} onChange={e => set("paid_to", e.target.value)} placeholder="..." /></div>
            <div><Label className="text-[11px]">{t("expenses.ref_no")}</Label><Input value={form.reference_no} onChange={e => set("reference_no", e.target.value)} placeholder="..." /></div>
          </div>
          <div><Label className="text-[11px]">{t("expenses.gst_amount")} (₹)</Label><Input type="number" min={0} value={form.gst_amount} onChange={e => set("gst_amount", Number(e.target.value))} /></div>
          <div><Label className="text-[11px]">{t("customers.notes")}</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="..." /></div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button onClick={() => onSave(form)} disabled={!form.title || !form.amount || !form.date} className="gold-gradient text-black font-bold">💾 {t("common.save")}</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Expenses() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterPayMode, setFilterPayMode] = useState("all");

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date", 300),
  });

  const create = useMutation({ mutationFn: d => base44.entities.Expense.create(d), onSuccess: () => qc.invalidateQueries(["expenses"]) });
  const update = useMutation({ mutationFn: ({ id, d }) => base44.entities.Expense.update(id, d), onSuccess: () => qc.invalidateQueries(["expenses"]) });
  const del = useMutation({ mutationFn: id => base44.entities.Expense.delete(id), onSuccess: () => qc.invalidateQueries(["expenses"]) });

  const handleSave = (data) => {
    if (editing) { update.mutate({ id: editing.id, d: data }); }
    else { create.mutate(data); }
    setShowForm(false); setEditing(null);
  };

  const filtered = expenses.filter(e => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      e.title?.toLowerCase().includes(q) ||
      e.paid_to?.toLowerCase().includes(q) ||
      e.notes?.toLowerCase().includes(q) ||
      String(e.amount || "").includes(q);
    const matchesCat = filterCat === "all" || e.category === filterCat;
    const matchesPayMode = filterPayMode === "all" || e.payment_mode === filterPayMode;
    return matchesSearch && matchesCat && matchesPayMode;
  });

  const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const thisMonthTotal = expenses.filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, e) => s + (e.amount || 0), 0);

  const catPieData = CATEGORIES.map((c, i) => ({
    name: c,
    value: expenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter(d => d.value > 0);

  const CAT_COLORS = { Rent: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", Salary: "bg-blue-500/15 text-blue-400 border-blue-500/30", "Loan EMI": "bg-red-500/15 text-red-400 border-red-500/30", Utilities: "bg-teal-500/15 text-teal-400 border-teal-500/30" };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">💸 {t("expenses.title_tracker")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("expenses.subtitle_tracker")}</p>
        </div>
        <Button className="gold-gradient text-black font-bold gap-2" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> {t("expenses.add")}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t("expenses.total"), value: fmtINR(totalAmount), color: "text-red-400", icon: "💸" },
          { label: t("expenses.total_this_month"), value: fmtINR(thisMonthTotal), color: "text-yellow-400", icon: "📅" },
          { label: t("expenses.entries"), value: expenses.length, color: "text-blue-400", icon: "📋" },
          { label: t("expenses.categories"), value: catPieData.length + " " + (t("loans.active") || "active"), color: "text-emerald-400", icon: "🏷️" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xl">{s.icon}</p>
            <p className={`text-lg font-black ${s.color} mt-1`}>{s.value}</p>
            <p className="text-[12px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category Pie */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm text-foreground mb-3">{t("expenses.breakdown")}</h3>
          {catPieData.length > 0 ? (
            <>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={catPieData} cx="50%" cy="50%" outerRadius={55} dataKey="value" paddingAngle={2}>
                      {catPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmtINR(v)} contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-1">
                {catPieData.slice(0, 4).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{fmtINR(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-muted-foreground text-center py-12 text-sm">{t("common.no_data")}</p>}
        </div>

        {/* Expense List */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input className="pl-9 h-8 text-[12px]" placeholder={t("expenses.search_placeholder")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <SearchableSelect
              className="w-36 h-8 text-[12px]"
              options={[
                { value: "all", label: t("expenses.all_categories") },
                ...CATEGORIES.map(c => ({ value: c, label: c }))
              ]}
              value={filterCat}
              onValueChange={setFilterCat}
              placeholder={t("expenses.all_categories")}
              searchPlaceholder={t("common.search")}
            />
            <SearchableSelect
              className="w-36 h-8 text-[12px]"
              options={[
                { value: "all", label: "All Payment Modes" },
                ...PAYMENT_MODES.map(m => ({ value: m, label: m }))
              ]}
              value={filterPayMode}
              onValueChange={setFilterPayMode}
              placeholder="Paid By"
              searchPlaceholder="Search mode..."
            />
          </div>

          <div className="space-y-0 max-h-80 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-10 text-sm">{t("expenses.no_expenses")}</p>
            ) : (
              filtered.map(e => (
                <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[13px] text-foreground">{e.title}</p>
                      <Badge variant="outline" className={`text-[9px] ${CAT_COLORS[e.category] || "border-border text-muted-foreground"}`}>{e.category}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{fmtDate(e.date)} · {e.payment_mode} {e.paid_to ? `· ${e.paid_to}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="font-bold text-red-400 font-mono text-[13px]">{fmtINR(e.amount)}</span>
                    <button onClick={() => { setEditing(e); setShowForm(true); }} className="p-1 rounded hover:bg-accent text-muted-foreground"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => { if (confirm(t("common.delete") + "?")) del.mutate(e.id); }} className="p-1 rounded hover:bg-red-500/10 text-red-400"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showForm && <ExpenseForm open={showForm} onOpenChange={setShowForm} expense={editing} onSave={handleSave} />}
    </div>
  );
}