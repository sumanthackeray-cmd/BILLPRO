import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, INDIAN_STATES } from "@/lib/gst-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Users, Edit, Trash2, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

function CustomerForm({ open, onOpenChange, customer, onSave }) {
  const [form, setForm] = useState({
    name: customer?.name || "",
    contact_person: customer?.contact_person || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    gstin: customer?.gstin || "",
    address: customer?.address || "",
    city: customer?.city || "",
    state: customer?.state || "",
    pincode: customer?.pincode || "",
    credit_limit: customer?.credit_limit || 0,
    category: customer?.category || "Retail",
    notes: customer?.notes || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader><DialogTitle className="font-black">{customer ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-[11px]">Customer / Business Name *</Label><Input placeholder="Business name" value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label className="text-[11px]">Contact Person Name</Label><Input placeholder="Mr. Ramesh Kumar" value={form.contact_person} onChange={e => set("contact_person", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px]">Phone</Label><Input placeholder="9876543210" value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
            <div><Label className="text-[11px]">Email</Label><Input placeholder="email@example.com" value={form.email} onChange={e => set("email", e.target.value)} /></div>
          </div>
          <div><Label className="text-[11px]">GSTIN</Label><Input placeholder="15-char GSTIN" value={form.gstin} onChange={e => set("gstin", e.target.value)} /></div>
          <div><Label className="text-[11px]">Address</Label><Input placeholder="Shop No, Street" value={form.address} onChange={e => set("address", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px]">City</Label><Input placeholder="City" value={form.city} onChange={e => set("city", e.target.value)} /></div>
            <div>
              <Label className="text-[11px]">State</Label>
              <SearchableSelect
                options={INDIAN_STATES}
                value={form.state}
                onValueChange={v => set("state", v)}
                placeholder="Select State"
                searchPlaceholder="Search state..."
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-[11px]">Pincode</Label><Input placeholder="110001" value={form.pincode} onChange={e => set("pincode", e.target.value)} /></div>
            <div><Label className="text-[11px]">Credit Limit ₹</Label><Input type="number" value={form.credit_limit} onChange={e => set("credit_limit", Number(e.target.value))} /></div>
            <div>
              <Label className="text-[11px]">Category</Label>
              <SearchableSelect
                options={["Retail", "Wholesale", "Distributor", "Other"]}
                value={form.category}
                onValueChange={v => set("category", v)}
                placeholder="Category"
                searchPlaceholder="Search category..."
              />
            </div>
          </div>
          <div><Label className="text-[11px]">Notes</Label><Input placeholder="Any notes..." value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <div className="flex gap-3 pt-2">
            <Button className="gold-gradient text-black font-bold" onClick={() => onSave(form)} disabled={!form.name}>💾 Save</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date"),
  });

  const handleSave = async (formData) => {
    if (editing) {
      await base44.entities.Customer.update(editing.id, formData);
      toast.success("Customer updated!");
    } else {
      await base44.entities.Customer.create(formData);
      toast.success("Customer added!");
    }
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this customer?")) return;
    await base44.entities.Customer.delete(id);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    toast.success("Customer deleted");
  };

  const filtered = customers.filter(c =>
    (c.name + (c.phone || "") + (c.city || "") + (c.gstin || "")).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">👥 Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{customers.length} customers</p>
        </div>
        <Button className="gold-gradient text-black font-bold gap-2" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No customers found</p>
          </div>
        )}
        {filtered.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-sm font-bold text-black shrink-0">
                  {c.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-[14px]">{c.name}</p>
                  <Badge variant="outline" className="text-[10px]">{c.category || "Retail"}</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-[12px] text-muted-foreground mt-3">
              {c.contact_person && <p className="flex items-center gap-1.5 text-foreground font-semibold">👤 {c.contact_person}</p>}
              {c.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {c.phone}</p>}
              {c.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {c.email}</p>}
              {c.city && <p>📍 {c.city}{c.state ? `, ${c.state}` : ""}</p>}
              {c.gstin && <p className="font-mono text-[11px]">GSTIN: {c.gstin}</p>}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-[12px]">
              <span className="text-muted-foreground">Total Purchases</span>
              <span className="font-bold text-primary font-mono">{fmtINR(c.total_purchases || 0)}</span>
            </div>
          </div>
        ))}
      </div>

      {showForm && <CustomerForm open={showForm} onOpenChange={setShowForm} customer={editing} onSave={handleSave} />}
    </div>
  );
}