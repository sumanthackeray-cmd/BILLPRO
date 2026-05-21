import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { INDIAN_STATES } from "@/lib/gst-utils";
import { auth } from "@/api/firebase";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/toast";
import { Save, Store, CreditCard, FileText, Upload, Image, Pen, Crown, Monitor, Sun, Moon, Printer, Bluetooth, Wifi, Usb, RefreshCw, Sliders, Check, Users, Plus, Trash2, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MOCK_PRINTER_DEVICES, sendEscPosToPrinter, generateEscPosPayload } from "@/lib/escpos-utils";
import { BUSINESS_TYPES } from "@/lib/shopCategories";
import { useLanguage } from "@/lib/LanguageContext";

export default function Settings() {
  const { user, updateAuthUser } = useAuth();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);

  // ── Staff / Cashier management (stored in localStorage) ──
  const [staffList, setStaffList] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gst_shop_staff_list") || "[]"); }
    catch { return []; }
  });
  const [newStaff, setNewStaff] = useState({ name: "", counter: "", shift: "Morning" });

  const saveStaffList = (list) => {
    setStaffList(list);
    localStorage.setItem("gst_shop_staff_list", JSON.stringify(list));
    toast.success("Staff list saved!");
  };

  const addStaffMember = () => {
    if (!newStaff.name.trim()) { toast.error("Please enter staff name"); return; }
    if (!newStaff.counter.trim()) { toast.error("Please enter counter number"); return; }
    const updated = [...staffList, { ...newStaff, id: Date.now().toString() }];
    saveStaffList(updated);
    setNewStaff({ name: "", counter: "", shift: "Morning" });
  };

  const removeStaffMember = (id) => {
    const updated = staffList.filter(s => s.id !== id);
    saveStaffList(updated);
  };

  const { data: settings = [], refetch, error, isError, isLoading } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
    enabled: !!user,
  });
  const existing = settings[0];

  // Clean duplicate settings documents if any
  useEffect(() => {
    if (settings && settings.length > 1) {
      const duplicates = settings.slice(1);
      duplicates.forEach(dup => {
        base44.entities.ShopSettings.delete(dup.id);
      });
    }
  }, [settings]);

  const [form, setForm] = useState({
    shop_name: "", gstin: "", phone: "", email: "", pan: "", owner_name: "",
    address: "", city: "", state: "", pincode: "",
    invoice_prefix: "INV-",
    bank_name: "", account_no: "", ifsc: "", branch: "", upi_id: "",
    terms: "Goods once sold will not be returned. E.&O.E.",
    logo_url: "", signature_url: "",
    business_type: "retail",
    business_entity_type: "",
    printer_type: "browser",
    printer_size: "58mm",
    printer_ip: "",
    printer_port: "9100",
    auto_print: false,
    paired_printer_name: "",
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (existing) {
      setForm({
        shop_name: existing.shop_name === "Vogats" ? "" : (existing.shop_name || ""),
        gstin: existing.gstin || "",
        phone: existing.phone || "",
        email: existing.email || "",
        pan: existing.pan || "",
        owner_name: existing.owner_name || "",
        address: existing.address || "",
        city: existing.city || "",
        state: existing.state || "",
        pincode: existing.pincode || "",
        invoice_prefix: existing.invoice_prefix || "INV-",
        bank_name: existing.bank_name || "",
        account_no: existing.account_no || "",
        ifsc: existing.ifsc || "",
        branch: existing.branch || "",
        upi_id: existing.upi_id || "",
        terms: existing.terms || "Goods once sold will not be returned. E.&O.E.",
        logo_url: existing.logo_url || "",
        signature_url: existing.signature_url || "",
        business_type: existing.business_type || "retail",
        business_entity_type: existing.business_entity_type || "",
        printer_type: existing.printer_type || "browser",
        printer_size: existing.printer_size || "58mm",
        printer_ip: existing.printer_ip || "",
        printer_port: existing.printer_port || "9100",
        auto_print: existing.auto_print ?? false,
        paired_printer_name: existing.paired_printer_name || "",
      });
    }
  }, [existing]);

  useEffect(() => {
    console.log("Settings component state log:", { existing, form });
  }, [existing, form]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileUpload = async (e, field, setUploading) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set(field, file_url);
    setUploading(false);
    toast.success("File uploaded!");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: form.owner_name
        });
        updateAuthUser(form.owner_name);
      }
      
      const latestSettings = await base44.entities.ShopSettings.list();
      if (latestSettings && latestSettings.length > 0 && !latestSettings[0].id.startsWith("seed")) {
        await base44.entities.ShopSettings.update(latestSettings[0].id, form);
      } else {
        await base44.entities.ShopSettings.create({ ...form, invoice_counter: 0, purchase_counter: 0 });
      }
      
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      toast.success("Settings saved!");
    } catch (err) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black">{t('settings.title') || '⚙️ Settings'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('settings.subtitle') || 'Configure your business profile'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/subscription">
            <Button variant="outline" className="gap-2 border-primary/30 text-primary">
              <Crown className="w-4 h-4" /> {t('nav.upgrade') || 'Upgrade Plan'}
            </Button>
          </Link>
          <Button className="gold-gradient text-black font-bold gap-2" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? (t('common.saving') || 'Saving...') : (t('settings.save_settings') || 'Save Settings')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="bg-secondary mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="business" className="gap-1.5"><Store className="w-3.5 h-3.5" /> {t('settings.general') || 'Business'}</TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Staff &amp; Cashiers</TabsTrigger>
          <TabsTrigger value="bank" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" /> {t('settings.bank_details') || 'Bank'}</TabsTrigger>
          <TabsTrigger value="invoice" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> {t('settings.invoice_prefix') || 'Invoice'}</TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5"><Image className="w-3.5 h-3.5" /> {t('settings.branding') || 'Branding'}</TabsTrigger>
          <TabsTrigger value="printers" className="gap-1.5"><Printer className="w-3.5 h-3.5" /> {t('settings.printer_settings') || 'Printer Setup'}</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5"><Monitor className="w-3.5 h-3.5" /> {t('settings.appearance') || 'Appearance'}</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[15px] mb-2">🏪 {t('settings.general') || 'Business Information'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">{t('settings.shop_name') || 'Shop / Business Name *'}</Label><Input value={form.shop_name} onChange={e => set("shop_name", e.target.value)} placeholder="Ram General Store" /></div>
              <div>
                <Label className="text-[11px]">{t('settings.business_entity_type') || 'Business Entity Type *'}</Label>
                <SearchableSelect
                  options={["Sole Proprietorship", "Private Limited Company", "Public Limited Company", "Partnership", "Limited Liability Partnership (LLP)", "One Person Company (OPC)", "HUF", "Other"]}
                  value={form.business_entity_type}
                  onValueChange={v => set("business_entity_type", v)}
                  placeholder={t('settings.select_entity_type') || 'Select Entity Type'}
                  searchPlaceholder={t('settings.search_entity_type') || 'Search entity type...'}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">{t('settings.owner_name') || 'Owner / Proprietor Name'}</Label><Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="Ramesh Kumar" /></div>
              <div><Label className="text-[11px]">{t('settings.gst_number') || 'GSTIN'}</Label><Input value={form.gstin} onChange={e => set("gstin", e.target.value)} placeholder="07AABCU9603R1ZP" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">{t('settings.pan_number') || 'PAN Number'}</Label><Input value={form.pan} onChange={e => set("pan", e.target.value)} placeholder="ABCDE1234F" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">{t('settings.phone') || 'Phone'}</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="9876543210" /></div>
              <div><Label className="text-[11px]">{t('settings.email') || 'Email'}</Label><Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@business.com" /></div>
            </div>
            <div><Label className="text-[11px]">{t('settings.address') || 'Address'}</Label><Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Shop No, Street" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label className="text-[11px]">{t('settings.city') || 'City'}</Label><Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="City" /></div>
              <div>
                <Label className="text-[11px]">{t('settings.state') || 'State'}</Label>
                <SearchableSelect
                  options={INDIAN_STATES}
                  value={form.state}
                  onValueChange={v => set("state", v)}
                  placeholder={t('settings.select_state') || 'Select State'}
                  searchPlaceholder={t('settings.search_state') || 'Search state...'}
                />
              </div>
              <div><Label className="text-[11px]">{t('settings.pincode') || 'Pincode'}</Label><Input value={form.pincode} onChange={e => set("pincode", e.target.value)} placeholder="110001" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/30">
              <div>
                <Label className="text-[11px] font-black text-amber-500 flex items-center gap-1">✨ {t('settings.business_type') || 'Business Type / POS Layout'}</Label>
                <SearchableSelect
                  className="mt-1"
                  options={BUSINESS_TYPES}
                  value={form.business_type || "retail"}
                  onValueChange={v => set("business_type", v)}
                  placeholder={t('settings.select_layout') || 'Select Layout'}
                  searchPlaceholder={t('settings.search_layout') || 'Search layout...'}
                />
                {form.business_type === "other" && (
                  <Input
                    className="mt-2"
                    placeholder={t('settings.enter_custom_business') || 'Enter your business type...'}
                    value={form.custom_business_type || ""}
                    onChange={e => set("custom_business_type", e.target.value)}
                  />
                )}
                <p className="text-[10px] text-muted-foreground mt-1">{t('settings.business_type_desc') || 'Sets the default industry-specific theme & fields inside your POS billing terminal.'}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── STAFF & CASHIERS TAB ── */}
        <TabsContent value="staff">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-[15px]">👤 Staff &amp; Cashier Management</h3>
                <p className="text-[11px] text-muted-foreground">Add your staff members with counter number and shift. These will appear as options when opening a cashier shift in POS.</p>
              </div>
            </div>

            {/* Add new staff form */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">➕ Add New Staff Member</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold">👤 Staff Name *</Label>
                  <Input
                    value={newStaff.name}
                    onChange={e => setNewStaff(s => ({ ...s, name: e.target.value }))}
                    placeholder="e.g. Suresh Kumar"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">🖥️ Counter / Register *</Label>
                  <Input
                    value={newStaff.counter}
                    onChange={e => setNewStaff(s => ({ ...s, counter: e.target.value }))}
                    placeholder="e.g. Counter 1"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">🕐 Shift</Label>
                  <Select value={newStaff.shift} onValueChange={v => setNewStaff(s => ({ ...s, shift: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">🌅 Morning (6am – 2pm)</SelectItem>
                      <SelectItem value="Afternoon">☀️ Afternoon (2pm – 10pm)</SelectItem>
                      <SelectItem value="Night">🌙 Night (10pm – 6am)</SelectItem>
                      <SelectItem value="Full Day">📅 Full Day</SelectItem>
                      <SelectItem value="Custom">⚙️ Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <button
                type="button"
                onClick={addStaffMember}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold transition-all"
              >
                <Plus className="w-4 h-4" /> Add Staff Member
              </button>
            </div>

            {/* Staff list */}
            {staffList.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No staff added yet.</p>
                <p className="text-[11px]">Add your cashiers above to use them in POS shift management.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{staffList.length} Staff Member{staffList.length > 1 ? 's' : ''}</p>
                {staffList.map((member, idx) => (
                  <div key={member.id || idx} className="flex items-center justify-between bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-black text-sm">
                        {member.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-[13px]">{member.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          🖥️ {member.counter} &nbsp;·&nbsp;
                          {member.shift === 'Morning' ? '🌅' : member.shift === 'Afternoon' ? '☀️' : member.shift === 'Night' ? '🌙' : '📅'} {member.shift}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStaffMember(member.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-700 dark:text-amber-400">
              <strong>💡 Tip:</strong> When your staff opens POS on their mobile or counter device, they can select their name once from the <strong>"Open Shift"</strong> button. Their counter and shift will be remembered automatically until they change it.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bank">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[15px] mb-2">🏦 {t('settings.bank_details') || 'Bank Details (for invoices)'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">{t('settings.bank_name') || 'Bank Name'}</Label><Input value={form.bank_name} onChange={e => set("bank_name", e.target.value)} placeholder="State Bank of India" /></div>
              <div><Label className="text-[11px]">{t('settings.account_number') || 'Account Number'}</Label><Input value={form.account_no} onChange={e => set("account_no", e.target.value)} placeholder="12345678901" /></div>
              <div><Label className="text-[11px]">{t('settings.ifsc_code') || 'IFSC Code'}</Label><Input value={form.ifsc} onChange={e => set("ifsc", e.target.value)} placeholder="SBIN0001234" /></div>
              <div><Label className="text-[11px]">{t('settings.branch') || 'Branch'}</Label><Input value={form.branch} onChange={e => set("branch", e.target.value)} placeholder="Connaught Place" /></div>
            </div>
            <div><Label className="text-[11px]">{t('settings.upi_id') || 'UPI ID'}</Label><Input value={form.upi_id} onChange={e => set("upi_id", e.target.value)} placeholder="business@upi" /></div>
          </div>
        </TabsContent>

        <TabsContent value="invoice">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[15px] mb-2">📄 {t('settings.invoice_title') || 'Invoice Configuration'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">{t('settings.invoice_prefix') || 'Invoice Number Prefix'}</Label><Input value={form.invoice_prefix} onChange={e => set("invoice_prefix", e.target.value)} placeholder="INV-" /></div>
            </div>
            <div><Label className="text-[11px]">{t('settings.terms_conditions') || 'Default Terms & Conditions'}</Label>
              <textarea
                className="w-full mt-1 bg-input border border-input rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.terms}
                onChange={e => set("terms", e.target.value)}
                placeholder={t('settings.terms_placeholder') || 'Terms text...'}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="branding">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <h3 className="font-bold text-[15px] mb-2">🎨 {t('settings.branding') || 'Branding & Logo'}</h3>
            <p className="text-[12px] text-muted-foreground -mt-3">{t('settings.branding_desc') || 'Upload your shop logo and digital signature to appear on printed invoices.'}</p>

            {/* Logo */}
            <div className="space-y-3">
              <Label className="text-[12px] font-bold flex items-center gap-2"><Image className="w-3.5 h-3.5" /> {t('settings.logo') || 'Shop Logo'}</Label>
              {form.logo_url && (
                <div className="w-32 h-20 border border-border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  <img src={form.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                </div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "logo_url", setUploadingLogo)} />
                <div className="flex items-center gap-2 border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-[13px] font-semibold">{uploadingLogo ? (t('common.loading') || "Uploading...") : form.logo_url ? (t('settings.change_logo') || "Change Logo") : (t('settings.upload_logo') || "Upload Logo")}</p>
                    <p className="text-[11px] text-muted-foreground">{t('settings.logo_requirements') || 'PNG, JPG up to 2MB. Recommended: 300×100px'}</p>
                  </div>
                </div>
              </label>
            </div>

            {/* Signature */}
            <div className="space-y-3">
              <Label className="text-[12px] font-bold flex items-center gap-2"><Pen className="w-3.5 h-3.5" /> {t('settings.signature') || 'Digital Signature'}</Label>
              {form.signature_url && (
                <div className="w-40 h-16 border border-border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  <img src={form.signature_url} alt="Signature" className="max-w-full max-h-full object-contain p-1" />
                </div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "signature_url", setUploadingSig)} />
                <div className="flex items-center gap-2 border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-[13px] font-semibold">{uploadingSig ? (t('common.loading') || "Uploading...") : form.signature_url ? (t('settings.change_signature') || "Change Signature") : (t('settings.upload_signature') || "Upload Signature")}</p>
                    <p className="text-[11px] text-muted-foreground">{t('settings.sig_requirements') || 'PNG with transparent background recommended'}</p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="printers">
          <PrinterSettingsTab form={form} set={set} onSave={handleSave} saving={saving} />
        </TabsContent>

        <TabsContent value="appearance">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <h3 className="font-bold text-[15px] mb-2 flex items-center gap-2"><Monitor className="w-4 h-4" /> {t('settings.appearance') || 'Appearance'}</h3>
            <p className="text-[12px] text-muted-foreground -mt-3">{t('settings.appearance_desc') || 'Customize the look and feel of the POS terminal and dashboard.'}</p>
            
            <div className="space-y-3">
              <Label className="text-[12px] font-bold">{t('settings.theme_preference') || 'Theme Preference'}</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 border rounded-xl gap-2 transition-all hover:bg-accent",
                    theme === "light" ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20" : "border-border text-muted-foreground"
                  )}
                >
                  <Sun className="w-6 h-6" />
                  <span className="text-xs font-bold">{t('settings.light') || 'Light'}</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 border rounded-xl gap-2 transition-all hover:bg-accent",
                    theme === "dark" ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20" : "border-border text-muted-foreground"
                  )}
                >
                  <Moon className="w-6 h-6" />
                  <span className="text-xs font-bold">{t('settings.dark') || 'Dark'}</span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 border rounded-xl gap-2 transition-all hover:bg-accent",
                    theme === "system" ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20" : "border-border text-muted-foreground"
                  )}
                >
                  <Monitor className="w-6 h-6" />
                  <span className="text-xs font-bold">{t('settings.system') || 'System'}</span>
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PrinterSettingsTab({ form, set, onSave, saving }) {
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const [pairingDevice, setPairingDevice] = useState(null);
  const { t } = useLanguage();

  const handleStartScan = async () => {
    setScanning(true);
    setScanResults([]);
    
    // Simulate scanner discovery delay
    await new Promise(r => setTimeout(r, 1200));
    
    const results = form.printer_type === "bluetooth" 
      ? MOCK_PRINTER_DEVICES.bluetooth 
      : MOCK_PRINTER_DEVICES.usb;
      
    setScanResults(results);
    setScanning(false);
  };

  const handlePairDevice = async (device) => {
    setPairingDevice(device.name);
    await new Promise(r => setTimeout(r, 1000)); // pairing simulation
    set("paired_printer_name", device.name);
    setPairingDevice(null);
    setScanResults([]);
    toast.success(`Connected to ${device.name} successfully!`);
    
    // Auto save immediately for seamless experience
    if (onSave) {
      setTimeout(() => {
        onSave();
      }, 100);
    }
  };

  const handleTestPrint = async () => {
    if (form.printer_type === "browser") {
      window.print();
      return;
    }
    
    const mockInvoice = {
      invoice_number: "TEST-8888",
      date: new Date().toLocaleDateString("en-IN"),
      customer_name: "Test Customer",
      billing_type: "B2C",
      payment_method: "Upi",
      subtotal: 100.00,
      tax_amount: 18.00,
      grand_total: 118.00,
      items: [
        { name: "Demo GST Item 1", qty: 1, rate: 60.00 },
        { name: "Demo GST Item 2", qty: 2, rate: 20.00 }
      ]
    };

    toast.loading("Sending test print payload...");
    try {
      const payload = generateEscPosPayload(mockInvoice, form, false);
      const success = await sendEscPosToPrinter(payload, form);
      toast.dismiss();
      if (success) {
        toast.success(`Test receipt printed successfully on ${form.paired_printer_name || form.printer_ip || "printer"}!`);
      } else {
        toast.error("Failed to connect or print to printer. Check printer power & connection.");
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error(`Test print failed: ${err.message}`);
    }
  };

  const isBluetooth = form.printer_type === "bluetooth";
  const isUsb = form.printer_type === "usb";
  const isWifi = form.printer_type === "wifi";
  const isBrowser = form.printer_type === "browser";

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-6">
      <div>
        <h3 className="font-bold text-[15px] flex items-center gap-2 text-slate-900 dark:text-slate-100"><Printer className="w-4 h-4 text-amber-500" /> {t('settings.printer_settings') || 'Thermal Printer Integration'}</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">{t('settings.printer_settings_desc') || 'Configure thermal receipt printers for handheld POS devices and billing terminals.'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Interface Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('settings.printer_type') || 'Connection Interface'}</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "browser", label: t('settings.system_print') || "System Print", desc: t('settings.system_print_desc') || "Default print dialog", icon: Sliders },
                { id: "bluetooth", label: "Bluetooth", desc: t('settings.bluetooth_desc') || "Handheld & BT Printers", icon: Bluetooth },
                { id: "usb", label: "USB OTG", desc: t('settings.usb_desc') || "USB wired connections", icon: Usb },
                { id: "wifi", label: "WiFi / Network", desc: t('settings.wifi_desc') || "Ethernet & IP printers", icon: Wifi }
              ].map(opt => {
                const Icon = opt.icon;
                const isSelected = form.printer_type === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      set("printer_type", opt.id);
                      setScanResults([]);
                    }}
                    className={cn(
                      "flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all hover:bg-secondary/50",
                      isSelected ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/20" : "border-border text-muted-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", isSelected ? "text-amber-500" : "text-muted-foreground")} />
                    <div>
                      <p className={cn("text-[12px] font-extrabold", isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300")}>{opt.label}</p>
                      <p className={cn("text-[9px] mt-0.5 leading-tight", isSelected ? "text-amber-800/80 dark:text-amber-300/80" : "text-muted-foreground")}>{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('settings.paper_size') || 'Receipt Size'}</Label>
            <div className="flex gap-3">
              {[
                { id: "58mm", label: "58mm (2-inch)", desc: t('settings.size_58mm_desc') || "Handhelds & Mobile printers" },
                { id: "80mm", label: "80mm (3-inch)", desc: t('settings.size_80mm_desc') || "Desktop counter printers" }
              ].map(size => {
                const isSelected = form.printer_size === size.id;
                return (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => set("printer_size", size.id)}
                    className={cn(
                      "flex-1 p-3 rounded-xl border text-left transition-all hover:bg-secondary/50",
                      isSelected ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/20" : "border-border"
                    )}
                  >
                    <p className={cn("text-[12px] font-extrabold", isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300")}>{size.label}</p>
                    <p className={cn("text-[9px] mt-0.5", isSelected ? "text-amber-800/80 dark:text-amber-300/80" : "text-muted-foreground")}>{size.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/20">
            <div>
              <p className="text-[12px] font-bold text-slate-900 dark:text-slate-100">{t('settings.auto_print') || 'Auto Print on Checkout'}</p>
              <p className="text-[9px] text-muted-foreground">{t('settings.auto_print_desc') || 'Fires print command instantly when checkout succeeds.'}</p>
            </div>
            <input
              type="checkbox"
              checked={form.auto_print}
              onChange={e => set("auto_print", e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Right column: Device Configuration (Contextual) */}
        <div className="space-y-4 border-t md:border-t-0 md:border-l border-border/40 pt-4 md:pt-0 md:pl-6">
          {isBrowser && (
            <div className="bg-secondary/20 p-4 rounded-xl space-y-2.5">
              <h4 className="font-extrabold text-[12px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-amber-500" /> {t('settings.system_printer_mode') || 'System Printer Mode'}</h4>
              <p className="text-[11px] text-muted-foreground leading-normal">
                {t('settings.system_printer_mode_desc') || 'Using system dialog to print bills. We format the page layout precisely to fit'} <strong>{form.printer_size}</strong> {t('settings.system_printer_mode_desc_end') || 'paper width rolls. Works on all Android POS devices, PCs, and tablets natively.'}
              </p>
              <Button type="button" onClick={handleTestPrint} variant="outline" size="sm" className="w-full text-xs font-bold gap-1 mt-1">
                <Printer className="w-3.5 h-3.5" /> {t('settings.trigger_test_print') || 'Trigger Test Print'}
              </Button>
            </div>
          )}

          {(isBluetooth || isUsb) && (
            <div className="space-y-4">
              <div className="bg-secondary/20 p-4 rounded-xl space-y-2">
                <h4 className="font-extrabold text-[12px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {isBluetooth ? <Bluetooth className="w-3.5 h-3.5 text-amber-500" /> : <Usb className="w-3.5 h-3.5 text-amber-500" />}
                  {isBluetooth ? (t('settings.bluetooth_connection') || "Bluetooth Connection") : (t('settings.usb_connection') || "USB Port Connection")}
                </h4>
                
                <div className="flex items-center justify-between py-1">
                  <span className="text-[11px] text-muted-foreground">{t('settings.connected_printer') || 'Connected Printer:'}</span>
                  <span className="text-[12px] font-black text-amber-600 dark:text-amber-400">{form.paired_printer_name || (t('settings.none_paired') || "None Paired")}</span>
                </div>

                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    onClick={handleStartScan}
                    disabled={scanning}
                    className="flex-1 text-xs font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 h-8"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", scanning && "animate-spin")} />
                    {scanning ? (t('common.loading') || "Scanning...") : `${t('settings.scan_for') || 'Scan for'} ${isBluetooth ? "BT Printers" : "USB Devices"}`}
                  </Button>
                  
                  {form.paired_printer_name && (
                    <Button type="button" onClick={handleTestPrint} variant="outline" size="sm" className="text-xs font-bold gap-1 h-8">
                      {t('settings.test') || 'Test'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Scan discovery list */}
              {scanResults.length > 0 && (
                <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border">
                  <div className="bg-secondary/40 p-2.5 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                    {t('settings.discovered_devices') || 'Discovered Devices'}
                  </div>
                  {scanResults.map((dev, i) => (
                    <div
                      key={i}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/40 transition-colors text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        {isBluetooth ? <Bluetooth className="w-3.5 h-3.5 text-amber-400" /> : <Usb className="w-3.5 h-3.5 text-amber-400" />}
                        <div>
                          <p className="text-[12px] font-bold">{dev.name}</p>
                          <p className="text-[9px] text-muted-foreground font-mono">{dev.address || `VID: ${dev.vendorId} | PID: ${dev.productId}`}</p>
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        size="sm" 
                        disabled={pairingDevice !== null}
                        onClick={() => handlePairDevice(dev)}
                        variant={form.paired_printer_name === dev.name ? "outline" : "default"}
                        className={cn("h-7 text-[10px] rounded-lg font-bold transition-all px-2.5", 
                          form.paired_printer_name === dev.name ? "border-amber-500 text-amber-500 hover:bg-amber-500/10" : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        )}
                      >
                        {pairingDevice === dev.name ? (t('settings.pairing') || "Pairing...") : form.paired_printer_name === dev.name ? (t('settings.connected') || "Connected") : (t('settings.connect') || "Connect")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isWifi && (
            <div className="bg-secondary/20 p-4 rounded-xl space-y-4">
              <h4 className="font-extrabold text-[12px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-amber-500" /> {t('settings.network_printer') || 'Network Printer Setup'}</h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px]">{t('settings.printer_ip') || 'Printer IP Address *'}</Label>
                  <Input
                    value={form.printer_ip}
                    onChange={e => set("printer_ip", e.target.value)}
                    placeholder="192.168.1.100"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">{t('settings.printer_port') || 'Port Number'}</Label>
                  <Input
                    value={form.printer_port}
                    onChange={e => set("printer_port", e.target.value)}
                    placeholder="9100"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" onClick={handleTestPrint} disabled={!form.printer_ip} className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold gap-1 h-8">
                  <Printer className="w-3.5 h-3.5" /> {t('settings.test_connection') || 'Test Connection'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-4 border-t border-border/40">
        <Button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold gap-1.5 h-9 shadow-md shadow-amber-500/10 px-4 rounded-xl"
        >
          <Save className="w-4 h-4" />
          {saving ? (t('common.saving') || "Saving Configuration...") : (t('settings.save_printer_settings') || "Save Printer Settings")}
        </Button>
      </div>
    </div>
  );
}