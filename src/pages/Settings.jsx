import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { INDIAN_STATES } from "@/lib/gst-utils";
import { useShopSettings } from "@/hooks/useShopSettings";
import { auth } from "@/api/firebase";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/toast";
import { Save, Store, CreditCard, FileText, Upload, Image, Pen, Crown, Monitor, Sun, Moon, Printer, Bluetooth, Wifi, Usb, RefreshCw, Sliders, Check, Users, Plus, Trash2, UserCheck, Shield, Lock, User, Eye, EyeOff, Building2 } from "lucide-react";
import CompanyProfile from './settings/CompanyProfile';
import ResponsiveTabs from "@/components/ui/ResponsiveTabs";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MOCK_PRINTER_DEVICES, sendEscPosToPrinter, generateEscPosPayload } from "@/lib/escpos-utils";
import { BUSINESS_TYPES } from "@/lib/shopCategories";
import { useLanguage } from "@/lib/LanguageContext";

const CRYPTO_KEY = "EasyBMT_Secure_Crypto_Key";

const decryptPassword = (enc) => {
  if (!enc) return "";
  if (enc.startsWith("enc:xor:")) {
    try {
      const decoded = atob(enc.substring(8));
      let decrypted = "";
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
        decrypted += String.fromCharCode(charCode);
      }
      return decrypted;
    } catch (e) {
      return enc;
    }
  } else if (enc.startsWith("enc:")) {
    try {
      return atob(enc.substring(4));
    } catch (e) {
      return enc;
    }
  }
  return enc;
};

export default function Settings() {
  const { user, updateAuthUser } = useAuth();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [showProfilePassword, setShowProfilePassword] = useState(false);

  // â”€â”€ Staff / Cashier management (stored in localStorage) â”€â”€
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

  const { settings, shopSettings: existing, updateSettingsOptimistically, refetch, error, isError, isLoading } = useShopSettings();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
    enabled: !!user,
  });

  const currentEmployee = employees.find(e => e.id === user?.id);
  const userDesignation = currentEmployee?.designation || currentEmployee?.designation_id || (user?.role_id ? user.role_id.replace("role-", "").replace("_", " ") : user?.role ? user.role : "Administrator");


  // Clean duplicate settings documents if any, prioritizing the completed one and a real database ID
  useEffect(() => {
    if (settings && settings.length > 1) {
      const realCompleteSettings = settings.find(s => 
        s.business_entity_type && 
        s.business_entity_type.trim() !== "" && 
        s.id && 
        !s.id.startsWith("temp-")
      );
      
      const toKeep = realCompleteSettings || 
                     settings.find(s => s.id && !s.id.startsWith("temp-")) || 
                     settings[0];
      
      settings.forEach(s => {
        if (s.id !== toKeep.id && s.id && !s.id.startsWith("temp-")) {
          base44.entities.ShopSettings.delete(s.id);
        }
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
    supervisor_pin: "8822",
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (existing) {
      setForm({
        shop_name: existing.shop_name === "Vogats" ? "" : (existing.shop_name || ""),
        gstin: existing.gstin || "",
        phone: existing.phone || user?.contact_mobile || user?.phone || "",
        email: existing.email || user?.contact_email || user?.email || "",
        pan: existing.pan || "",
        owner_name: existing.owner_name || user?.name || user?.full_name || "",
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
        supervisor_pin: existing.supervisor_pin || "8822",
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
    // 1. Execute optimistic cache and local persistence instantly (0ms UI latency!)
    updateSettingsOptimistically(form);
    
    setSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: form.owner_name
        });
        updateAuthUser(form.owner_name);
      }
      
      // 2. Perform backend operations in background
      const latestSettings = await base44.entities.ShopSettings.list();
      let savedSettings;
      if (latestSettings && latestSettings.length > 0) {
        const targetSetting = latestSettings.find(s => s.business_entity_type && s.business_entity_type.trim() !== "") || latestSettings[0];
        savedSettings = await base44.entities.ShopSettings.update(targetSetting.id, form);
      } else {
        savedSettings = await base44.entities.ShopSettings.create({ ...form, invoice_counter: 0, purchase_counter: 0 });
      }
      
      // 3. Set server-defined structure details (e.g. ID, audit logs) without interrupting the client
      if (savedSettings) {
        queryClient.setQueryData(["shopSettings"], [savedSettings]);
        localStorage.setItem("base44_shop_settings", JSON.stringify([savedSettings]));
      }
      
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      toast.success("Settings saved!");
    } catch (err) {
      // Rollback cache if write fails completely
      queryClient.setQueryData(["shopSettings"], settings);
      localStorage.setItem("base44_shop_settings", JSON.stringify(settings));
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const [activeTab, setActiveTab] = useState("business");

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ResponsiveTabs 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          containerClassName="mb-4"
          tabs={[
            { id: "business", label: t('settings.general') || 'Business', icon: <Store className="w-3.5 h-3.5" /> },
            { id: "security", label: 'Security & Roles', icon: <Shield className="w-3.5 h-3.5" /> },
            { id: "company_profile", label: 'Company Profile', icon: <Building2 className="w-3.5 h-3.5" /> },
            { id: "profile", label: 'My Profile', icon: <User className="w-3.5 h-3.5" /> },
            { id: "staff", label: 'Staff & Cashiers', icon: <Users className="w-3.5 h-3.5" /> },
            { id: "bank", label: t('settings.bank_details') || 'Bank', icon: <CreditCard className="w-3.5 h-3.5" /> },
            { id: "invoice", label: t('settings.invoice_prefix') || 'Invoice', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: "branding", label: t('settings.branding') || 'Branding', icon: <Image className="w-3.5 h-3.5" /> },
            { id: "printers", label: t('settings.printer_settings') || 'Printer Setup', icon: <Printer className="w-3.5 h-3.5" /> },
            { id: "appearance", label: t('settings.appearance') || 'Appearance', icon: <Monitor className="w-3.5 h-3.5" /> }
          ]}
        />

        <TabsContent value="business">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[15px] mb-2">{t('settings.general') || 'Business Information'}</h3>
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
                <Label className="text-[11px] font-black text-amber-500 flex items-center gap-1">{t('settings.business_type') || 'Business Type / POS Layout'}</Label>
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

        <TabsContent value="security">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            {user && user.hierarchy_level <= 3 ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-white dark:from-indigo-950/50 dark:via-purple-950/20 dark:to-slate-900/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-6 flex flex-col gap-5 backdrop-blur-sm shadow-xl shadow-indigo-500/5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">SAP Enterprise Security Profile</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Advanced Role-Based Access Control (RBAC)</h4>
                    <p className="text-sm text-slate-600 dark:text-muted-foreground max-w-3xl">
                      Configure staff accounts, enforce hierarchical authority rules, assign dynamic capabilities, and toggle column field-level data protection. This acts as the command center for data and future access control for all users in your organization.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="bg-white/50 dark:bg-black/20 border border-indigo-200 dark:border-indigo-500/20 rounded-lg p-4">
                      <h5 className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4" /> User Management
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-muted-foreground mb-4">
                        Create staff accounts, assign them to branches, set roles based on hierarchy, and manage their active statuses.
                      </p>
                      <Link to="/settings/users">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-lg shadow-indigo-600/20">
                          <Users className="w-4 h-4" /> Manage Staff Users
                        </Button>
                      </Link>
                    </div>

                    <div className="bg-white/50 dark:bg-black/20 border border-indigo-200 dark:border-indigo-500/20 rounded-lg p-4 flex flex-col">
                      <h5 className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4" /> Data &amp; Future Access
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-muted-foreground mb-4 flex-1">
                        Control module-wise access (View, Create, Edit, Delete, Export) and mask sensitive fields (Purchase Price, Profit Margin, Salary) per role.
                      </p>
                      {user.hierarchy_level <= 2 ? (
                        <Link to="/settings/permissions">
                          <Button className="w-full !bg-purple-600 hover:!bg-purple-700 active:!bg-purple-800 !text-white font-bold gap-2 shadow-lg shadow-purple-600/20 border !border-purple-700">
                            <Sliders className="w-4 h-4" /> Open Security Matrix
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled className="w-full font-bold gap-2 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed">
                          <Lock className="w-4 h-4" /> Access Restricted (Requires Owner/CEO)
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-border/30 pb-3">
                    <Lock className="w-4 h-4 text-indigo-500" />
                    <h4 className="font-bold text-[14px]">Supervisor Authorization Settings</h4>
                  </div>
                  <div className="max-w-xs space-y-1.5">
                    <Label className="text-[11px] font-bold">Supervisor Override PIN</Label>
                    <Input 
                      type="password" 
                      value={form.supervisor_pin || ""} 
                      onChange={e => set("supervisor_pin", e.target.value.replace(/\D/g, ''))} 
                      placeholder="e.g. 8822" 
                      maxLength={8}
                      className="font-mono tracking-widest text-[13px] bg-background/50 h-10 border-border/40"
                    />
                    <p className="text-[10px] text-muted-foreground">Used for validating cart price overrides and applying supervisor manual discounts at checkout terminals.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
                <Lock className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h4 className="text-red-500 font-bold mb-1">Access Restricted</h4>
                <p className="text-xs text-red-400/80">You do not have administrative clearance to view or modify security policies.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="company_profile">
          <div className="bg-card border border-border rounded-xl p-5">
            <CompanyProfile />
          </div>
        </TabsContent>

        {/* ── PROFILE TAB ── */}
        <TabsContent value="profile">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8 text-white flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/50 backdrop-blur-sm shadow-xl">
                <User className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black">{user?.full_name || user?.name || "User Profile"}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1 opacity-90 text-sm">
                  <span className="font-mono bg-black/20 px-2 py-0.5 rounded tracking-wider">{(localStorage.getItem('user_code') || user?.user_code) === 'ADMIN-001' ? `${(localStorage.getItem('company_id') || 'COMP').split('-')[0].substring(0, 6).toUpperCase()}-ADMIN-001` : (localStorage.getItem('user_code') || user?.user_code || user?.id?.substring(0, 6) || "STF-01")}</span>
                  <span>•</span>
                  <span className="capitalize font-semibold">{userDesignation}</span>
                </div>
                {localStorage.getItem('company_id') && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-white/15 border border-white/30 px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-sm">
                    <Building2 className="w-3.5 h-3.5" />
                    Company ID: <span className="font-mono tracking-widest text-yellow-200">{localStorage.getItem('company_id')}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" /> Personal Information
                  </h4>
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase">Full Name</p>
                      <p className="font-medium text-[14px]">{user?.full_name || user?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase">Contact Email</p>
                      <p className="font-medium text-[14px]">{user?.contact_email || user?.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase">Mobile Number</p>
                      <p className="font-medium text-[14px]">{user?.phone || user?.contact_mobile || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Security & Access
                  </h4>
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase">Designation / Role</p>
                      <p className="font-medium text-[14px] capitalize text-indigo-600 dark:text-indigo-400">
                        {userDesignation}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase">Company ID</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="font-mono font-bold text-[14px] text-indigo-600 dark:text-indigo-400 tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          {localStorage.getItem('company_id') || "N/A"}
                        </p>
                        {localStorage.getItem('company_id') && (
                          <button
                            type="button"
                            title="Copy Company ID"
                            onClick={() => { navigator.clipboard.writeText(localStorage.getItem('company_id')); toast.success('Company ID copied!'); }}
                            className="p-1.5 text-slate-400 hover:text-indigo-500 rounded border bg-white dark:bg-black transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Share this ID with your staff members to let them log in.</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase">Assigned Branch / Location</p>
                      <p className="font-medium text-[14px]">{user?.branch_id === "all" ? "All Branches (HQ)" : user?.branch_id || "Headquarters"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase">Profile Password</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="relative flex-1">
                          <p className="font-mono text-[13px] bg-slate-50 dark:bg-zinc-900 px-3 py-2 rounded-lg border border-border tracking-wider pr-10 flex items-center h-10 select-all truncate">
                            {showProfilePassword ? (decryptPassword(user?.profile_password) || "••••••••") : "••••••••"}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowProfilePassword(!showProfilePassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors focus:outline-none"
                            title={showProfilePassword ? "Hide Password" : "Show Password"}
                          >
                            {showProfilePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="staff">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-[15px]">Staff &amp; Cashier Management</h3>
                <p className="text-[11px] text-muted-foreground">Add your staff members with counter number and shift. These will appear as options when opening a cashier shift in POS.</p>
              </div>
            </div>

            {/* Add new staff form */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1"><Plus className="w-3.5 h-3.5"/> Add New Staff Member</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold">Staff Name *</Label>
                  <Input
                    value={newStaff.name}
                    onChange={e => setNewStaff(s => ({ ...s, name: e.target.value }))}
                    placeholder="e.g. Suresh Kumar"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">Counter / Register *</Label>
                  <Input
                    value={newStaff.counter}
                    onChange={e => setNewStaff(s => ({ ...s, counter: e.target.value }))}
                    placeholder="e.g. Counter 1"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">Shift</Label>
                  <Select value={newStaff.shift} onValueChange={v => setNewStaff(s => ({ ...s, shift: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning (6am – 2pm)</SelectItem>
                      <SelectItem value="Afternoon">Afternoon (2pm – 10pm)</SelectItem>
                      <SelectItem value="Night">Night (10pm – 6am)</SelectItem>
                      <SelectItem value="Full Day">Full Day</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
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
                          Counter {member.counter} &nbsp;·&nbsp;
                          {member.shift}
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
              <strong>Tip:</strong> When your staff opens POS on their mobile or counter device, they can select their name once from the <strong>"Open Shift"</strong> button. Their counter and shift will be remembered automatically until they change it.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bank">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[15px] mb-2">{t('settings.bank_details') || 'Bank Details (for invoices)'}</h3>
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
            <h3 className="font-bold text-[15px] mb-2">{t('settings.invoice_title') || 'Invoice Configuration'}</h3>
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
            <h3 className="font-bold text-[15px] mb-2">{t('settings.branding') || 'Branding & Logo'}</h3>
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
    await new Promise(r => setTimeout(r, 1200));
    const results = form.printer_type === "bluetooth"
      ? MOCK_PRINTER_DEVICES.bluetooth
      : MOCK_PRINTER_DEVICES.usb;
    setScanResults(results);
    setScanning(false);
  };

  const handlePairDevice = async (device) => {
    setPairingDevice(device.name);
    await new Promise(r => setTimeout(r, 1000));
    set("paired_printer_name", device.name);
    setPairingDevice(null);
    setScanResults([]);
    toast.success(`Connected to ${device.name}!`);
    if (onSave) setTimeout(() => onSave(), 100);
  };

  const handleDisconnect = () => {
    set("paired_printer_name", "");
    toast.success("Printer disconnected.");
  };

  const handleTestPrint = async () => {
    if (form.printer_type === "browser") { window.print(); return; }
    toast.loading("Sending test print...");
    const mockInvoice = { invoice_number: "TEST-0001", date: new Date().toLocaleDateString("en-IN"), customer_name: "Test Customer", subtotal: 847, tax_amount: 152.46, grand_total: 999.46, payment_method: "UPI", items: [{ name: "Sample Product A", qty: 2, rate: 299 }] };
    try {
      const payload = generateEscPosPayload(mockInvoice, form, false);
      const success = await sendEscPosToPrinter(payload, form);
      toast.dismiss();
      if (success) toast.success("Test receipt printed!");
      else toast.error("Print failed. Check printer connection.");
    } catch (err) { toast.dismiss(); toast.error(`Error: ${err.message}`); }
  };

  const isBluetooth = form.printer_type === "bluetooth";
  const isUsb = form.printer_type === "usb";
  const isWifi = form.printer_type === "wifi";
  const isBrowser = form.printer_type === "browser";
  const isConnected = !!form.paired_printer_name;

  const PRINTER_TYPES = [
    { id: "browser", label: "System Print", desc: "Native OS print dialog", icon: Sliders },
    { id: "bluetooth", label: "Bluetooth", desc: "Wireless BT thermal printers", icon: Bluetooth },
    { id: "usb", label: "USB / OTG", desc: "Direct wired USB", icon: Usb },
    { id: "wifi", label: "WiFi / LAN", desc: "Network IP printing", icon: Wifi },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-500" /> Thermal Printer Setup
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Configure receipt printers for POS billing terminals</p>
        </div>
        <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border",
          isConnected || isBrowser || (isWifi && form.printer_ip)
            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
            : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", isConnected || isBrowser || (isWifi && form.printer_ip) ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
          {isBrowser ? "System Printer Ready" : isWifi ? (form.printer_ip ? `IP: ${form.printer_ip}` : "IP Not Set") : isConnected ? form.paired_printer_name : "No Printer Paired"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Connection Interface</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRINTER_TYPES.map(opt => {
                const Icon = opt.icon;
                const isSelected = form.printer_type === opt.id;
                return (
                  <button key={opt.id} type="button"
                    onClick={() => { set("printer_type", opt.id); setScanResults([]); }}
                    className={cn("flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all",
                      isSelected ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10 ring-2 ring-amber-500/25" : "border-border hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-500/5"
                    )}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", isSelected ? "bg-amber-500/20" : "bg-slate-100 dark:bg-muted")}>
                      <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-muted-foreground")} />
                    </div>
                    <div>
                      <p className={cn("text-[12px] font-extrabold", isSelected ? "text-amber-700 dark:text-amber-400" : "text-slate-700 dark:text-slate-300")}>{opt.label}</p>
                      <p className={cn("text-[9px] mt-0.5 leading-tight", isSelected ? "text-amber-600/80 dark:text-amber-400/70" : "text-muted-foreground")}>{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Receipt Paper Width</Label>
            <div className="flex gap-3">
              {[{ id: "58mm", label: "58mm (2-inch)", desc: "Mobile & handheld" }, { id: "80mm", label: "80mm (3-inch)", desc: "Desktop printers" }].map(size => {
                const isSelected = form.printer_size === size.id;
                return (
                  <button key={size.id} type="button" onClick={() => set("printer_size", size.id)}
                    className={cn("flex-1 p-3 rounded-xl border text-left transition-all",
                      isSelected ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10 ring-2 ring-amber-500/25" : "border-border hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-500/5"
                    )}
                  >
                    <p className={cn("text-[12px] font-extrabold", isSelected ? "text-amber-700 dark:text-amber-400" : "text-slate-700 dark:text-slate-300")}>{size.label}</p>
                    <p className={cn("text-[9px] mt-0.5", isSelected ? "text-amber-600/80 dark:text-amber-400/70" : "text-muted-foreground")}>{size.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Auto Print on Checkout</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Print receipt automatically when sale completes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={!!form.auto_print} onChange={e => set("auto_print", e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
            </label>
          </div>
        </div>

        <div className="space-y-4 border-t md:border-t-0 md:border-l border-border/40 pt-4 md:pt-0 md:pl-6">
          {isBrowser && (
            <div className="bg-slate-50 dark:bg-secondary/20 rounded-xl p-4 space-y-3 border border-border">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h4 className="font-extrabold text-[13px] text-slate-900 dark:text-slate-100">System Printer Mode</h4>
                <span className="ml-auto text-[9px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 rounded-full">READY</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-muted-foreground leading-relaxed">
                Uses OS print dialog. Formats receipt to <strong className="text-slate-900 dark:text-white">{form.printer_size}</strong> rolls. Works on Android POS, Windows and tablets.
              </p>
              <div className="space-y-1.5">
                {["Xprinter XP-58IIH · 58mm", "EPSON TM-T20III · 80mm", "Star TSP143III · 80mm"].map(p => (
                  <div key={p} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" /> {p}
                  </div>
                ))}
              </div>
              <Button type="button" onClick={handleTestPrint} variant="outline" className="w-full text-xs font-bold gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10">
                <Printer className="w-3.5 h-3.5" /> Trigger Test Print
              </Button>
            </div>
          )}

          {(isBluetooth || isUsb) && (
            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-secondary/20 rounded-xl p-4 space-y-3 border border-border">
                <div className="flex items-center gap-2">
                  {isBluetooth ? <Bluetooth className="w-4 h-4 text-amber-500" /> : <Usb className="w-4 h-4 text-amber-500" />}
                  <h4 className="font-extrabold text-[13px] text-slate-900 dark:text-slate-100">{isBluetooth ? "Bluetooth Connection" : "USB Port Connection"}</h4>
                </div>
                <div className={cn("flex items-center justify-between p-3 rounded-lg border",
                  isConnected ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/25" : "bg-white dark:bg-card border-border"
                )}>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">Connected Printer</p>
                    <p className={cn("text-[13px] font-black", isConnected ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500")}>
                      {isConnected ? form.paired_printer_name : "None Paired"}
                    </p>
                  </div>
                  {isConnected && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Button type="button" size="sm" variant="ghost" onClick={handleDisconnect} className="h-7 text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-2">Disconnect</Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={handleStartScan} disabled={scanning}
                    className="flex-1 text-xs font-bold gap-1.5 bg-amber-500 hover:bg-amber-600 text-black h-9">
                    <RefreshCw className={cn("w-3.5 h-3.5", scanning && "animate-spin")} />
                    {scanning ? "Scanning..." : `Scan for ${isBluetooth ? "BT Printers" : "USB Devices"}`}
                  </Button>
                  {isConnected && (
                    <Button type="button" onClick={handleTestPrint} variant="outline" className="h-9 px-3 border-amber-300 dark:border-amber-500/30">
                      <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </Button>
                  )}
                </div>
              </div>

              {scanResults.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-border">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-muted-foreground">{scanResults.length} Device{scanResults.length > 1 ? "s" : ""} Found</p>
                  </div>
                  <div className="divide-y divide-border">
                    {scanResults.map((dev, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            {isBluetooth ? <Bluetooth className="w-3.5 h-3.5 text-amber-500" /> : <Usb className="w-3.5 h-3.5 text-amber-500" />}
                          </div>
                          <div>
                            <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{dev.name}</p>
                            <p className="text-[9px] text-muted-foreground font-mono">{isBluetooth ? dev.address : `VID: ${dev.vendorId} | PID: ${dev.productId}`}</p>
                          </div>
                        </div>
                        <Button type="button" size="sm" disabled={pairingDevice !== null} onClick={() => handlePairDevice(dev)}
                          className={cn("h-7 text-[10px] font-bold px-3 rounded-lg",
                            form.paired_printer_name === dev.name
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25"
                              : "bg-slate-900 text-white dark:bg-amber-500 dark:text-black"
                          )}>
                          {pairingDevice === dev.name ? "Connecting..." : form.paired_printer_name === dev.name ? "Connected" : "Connect"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isWifi && (
            <div className="bg-slate-50 dark:bg-secondary/20 rounded-xl p-4 space-y-4 border border-border">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-amber-500" />
                <h4 className="font-extrabold text-[13px] text-slate-900 dark:text-slate-100">Network Printer Setup</h4>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-muted-foreground">Printer IP Address</Label>
                  <Input value={form.printer_ip} onChange={e => set("printer_ip", e.target.value)} placeholder="192.168.1.100" className="h-9 text-sm font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-600 dark:text-muted-foreground">Port Number</Label>
                  <Input value={form.printer_port} onChange={e => set("printer_port", e.target.value)} placeholder="9100" className="h-9 text-sm font-mono" />
                </div>
              </div>
              <Button type="button" onClick={handleTestPrint} disabled={!form.printer_ip}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold gap-1.5 h-9">
                <Printer className="w-3.5 h-3.5" /> Test Connection and Print
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/40">
        <Button type="button" disabled={saving} onClick={onSave}
          className="bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold gap-2 h-9 px-5 rounded-xl">
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Printer Settings"}
        </Button>
      </div>
    </div>
  );
}
