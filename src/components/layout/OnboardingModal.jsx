import { useState, useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { INDIAN_STATES } from "@/lib/gst-utils";
import { auth } from "@/api/firebase";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { Store, Landmark, FileText, Image as ImageIcon, Pen, Upload, ChevronRight, ChevronLeft } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { BUSINESS_TYPES } from "@/lib/shopCategories";
import { useShopSettings } from "@/hooks/useShopSettings";

const ENTITY_TYPES = [
  "Sole Proprietorship",
  "Private Limited Company",
  "Public Limited Company",
  "Partnership",
  "Limited Liability Partnership (LLP)",
  "One Person Company (OPC)",
  "HUF",
  "Other"
];

const STEPS = [
  { id: 1, title: "Business Profile", icon: Store, desc: "Basic details about your shop" },
  { id: 2, title: "Bank Details", icon: Landmark, desc: "For receiving payments" },
  { id: 3, title: "Invoice Setup", icon: FileText, desc: "Prefix and terms" },
  { id: 4, title: "Branding", icon: ImageIcon, desc: "Logo and signature" },
];

export default function OnboardingModal() {
  const { user, updateAuthUser } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [savedInSession, setSavedInSession] = useState(false);

  const currentUid = user?.id;
  const isOwner = user?.role === 'owner' || user?.role_id === 'role-owner';
  const hasSaved = savedInSession || 
    localStorage.getItem("onboarding_completed") === "true" ||
    (currentUid ? sessionStorage.getItem(`onboarding_completed_${currentUid}`) === "true" : false);

  const { settings, shopSettings: existing, updateSettingsOptimistically, isLoading } = useShopSettings();


  // Determine onboarding completion using DB-backed signals.
  // We MUST do this after the settings query resolves, otherwise already-registered users
  // may see onboarding again due to initial cached/empty states.
  const hasCompletedOnboarding = !isLoading && Array.isArray(settings) && settings.length > 0 && settings.some(s =>
    s &&
    s.business_entity_type &&
    String(s.business_entity_type).trim() !== "" &&
    s.shop_name &&
    String(s.shop_name).trim() !== "" &&
    s.id &&
    !String(s.id).startsWith("temp-")
  );

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
    shop_name: "", business_entity_type: "", owner_name: "", gstin: "", pan: "",
    phone: "", email: "", address: "", city: "", state: "", pincode: "",
    business_type: "retail",
    custom_business_type: "",
    bank_name: "", account_no: "", ifsc: "", branch: "", upi_id: "",
    invoice_prefix: "INV-", terms: "Goods once sold will not be returned. E.&O.E.",
    logo_url: "", signature_url: ""
  });

  useEffect(() => {
    if (isLoading) return;

    // Fast path: if onboarding was completed in this browser session, never re-open.
    // This avoids any UI flash for already-registered users (admin/staff) during login.
    if (hasSaved) {
      setOpen(false);
      return;
    }


    // Hard stop: if onboarding is already completed, never show onboarding again.
    // This prevents "already registered user" from re-opening the wizard on every login.
    if (hasCompletedOnboarding) {
      setOpen(false);
      return;
    }

    if (hasSaved || !isOwner) {
      setOpen(false);
      return;
    }

    if (!existing || !existing.shop_name || existing.shop_name === "Vogats" || !existing.business_entity_type) {
      setOpen(true);
      if (existing) {
        setForm({
          shop_name: existing.shop_name === "Vogats" ? "" : (existing.shop_name || ""),
          business_entity_type: existing.business_entity_type || "",
          owner_name: existing.owner_name || "",
          gstin: existing.gstin || "",
          pan: existing.pan || "",
          phone: existing.phone || "",
          email: existing.email || "",
          address: existing.address || "",
          city: existing.city || "",
          state: existing.state || "",
          pincode: existing.pincode || "",
          business_type: existing.business_type || "retail",
          custom_business_type: existing.custom_business_type || "",
          bank_name: existing.bank_name || "",
          account_no: existing.account_no || "",
          ifsc: existing.ifsc || "",
          branch: existing.branch || "",
          upi_id: existing.upi_id || "",
          invoice_prefix: existing.invoice_prefix || "INV-",
          terms: existing.terms || "Goods once sold will not be returned. E.&O.E.",
          logo_url: existing.logo_url || "",
          signature_url: existing.signature_url || "",
        });
      }
    } else {
      setOpen(false);
    }
  }, [existing, isLoading, hasSaved]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileUpload = async (e, field, setUploading) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set(field, file_url);
      toast.success("File uploaded!");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const required = [
      "shop_name", "business_entity_type", "business_type", "owner_name", "phone", "email", 
      "address", "city", "state", "pincode"
    ];
    const missing = required.filter(k => !form[k]);
    if (missing.length > 0) {
      toast.error("Please complete all required fields in Step 1.");
      return;
    }

    // 1. Save optimistically
    updateSettingsOptimistically(form);

    setSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: form.owner_name
        });
        updateAuthUser(form.owner_name);
      }
      
      const latestSettings = await base44.entities.ShopSettings.list();
      let savedSettings;
      if (latestSettings && latestSettings.length > 0) {
        const toUpdate = latestSettings.find(s => s.business_entity_type) || latestSettings[0];
        savedSettings = await base44.entities.ShopSettings.update(toUpdate.id, form);
      } else {
        savedSettings = await base44.entities.ShopSettings.create({ 
          ...form, 
          invoice_counter: 0, 
          purchase_counter: 0 
        });
      }
      
      if (savedSettings) {
        queryClient.setQueryData(["shopSettings"], [savedSettings]);
        localStorage.setItem("base44_shop_settings", JSON.stringify([savedSettings]));
      }
      
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      if (currentUid) {
        sessionStorage.setItem(`onboarding_completed_${currentUid}`, "true");
        localStorage.setItem("onboarding_completed", "true");
      }
      setSavedInSession(true);
      toast.success("Profile setup complete!");
      setOpen(false);
    } catch (err) {
      // Rollback
      queryClient.setQueryData(["shopSettings"], settings);
      localStorage.setItem("base44_shop_settings", JSON.stringify(settings));
      toast.error("Failed to save profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      const required = ["shop_name", "business_entity_type", "business_type", "owner_name", "phone", "email", "address", "city", "state", "pincode"];
      const missing = required.filter(k => !form[k]);
      if (missing.length > 0) {
        toast.error("Please fill in all required fields (marked with *).");
        return;
      }
    }
    // Steps 2 & 3 (Bank details and Invoice details) are now completely optional!
    setStep(s => Math.min(s + 1, STEPS.length));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="w-full h-[100dvh] max-w-none rounded-none p-0 sm:h-[85vh] sm:max-h-[800px] sm:max-w-[700px] sm:rounded-xl sm:p-6 [&>button]:hidden pointer-events-auto flex flex-col bg-background" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        
        {/* Header - Fixed */}
        <div className="h-[35px] lg:h-auto px-3 lg:p-5 border-b border-border bg-card shrink-0 flex flex-col justify-center relative">
          <DialogHeader className="text-left space-y-0 lg:space-y-1.5 flex flex-row items-center justify-between lg:block">
            <DialogTitle className="text-[11px] lg:text-2xl font-black text-primary m-0 p-0 leading-none">Setup Your Business Profile</DialogTitle>
            <DialogDescription className="text-[9px] lg:text-sm m-0 p-0 leading-none">
              Step {step} of {STEPS.length}: {STEPS[step-1].title}
            </DialogDescription>
          </DialogHeader>
          
          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 w-full bg-secondary h-[2px] lg:relative lg:h-2 lg:rounded-full lg:mt-4 overflow-hidden flex">
            {STEPS.map((s, i) => (
              <div 
                key={s.id} 
                className={`h-full transition-all duration-300 ${s.id <= step ? "bg-primary" : "bg-transparent"}`}
                style={{ width: `${100 / STEPS.length}%` }}
              />
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-2 sm:mt-4 space-y-6">
          
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">Shop / Business Name <span className="text-destructive">*</span></Label>
                  <Input value={form.shop_name} onChange={e => set("shop_name", e.target.value)} placeholder="Ram General Store" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[12px] font-bold">Business Entity Type <span className="text-destructive">*</span></Label>
                    <SearchableSelect
                      options={ENTITY_TYPES.map(v => ({ label: v, value: v }))}
                      value={form.business_entity_type}
                      onValueChange={v => set("business_entity_type", v)}
                      placeholder="Select Entity Type"
                      searchPlaceholder="Search entity type..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[12px] font-black text-amber-500 flex items-center gap-1">✨ Industry / POS Layout <span className="text-destructive">*</span></Label>
                    <SearchableSelect
                      options={BUSINESS_TYPES}
                      value={form.business_type}
                      onValueChange={v => set("business_type", v)}
                      placeholder="Search Business Type..."
                      searchPlaceholder="Search business type..."
                    />
                    {form.business_type === "other" && (
                      <Input
                        className="mt-2"
                        placeholder="Enter your business type..."
                        value={form.custom_business_type}
                        onChange={e => set("custom_business_type", e.target.value)}
                      />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">Owner / Proprietor Name <span className="text-destructive">*</span></Label>
                  <Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="Ramesh Kumar" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">GSTIN <span className="font-normal text-muted-foreground">(Optional)</span></Label>
                  <Input value={form.gstin} onChange={e => set("gstin", e.target.value)} placeholder="07AABCU9603R1ZP" className="uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">Phone <span className="text-destructive">*</span></Label>
                  <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="9876543210" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">Email <span className="text-destructive">*</span></Label>
                  <Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@business.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[12px] font-bold">Address <span className="text-destructive">*</span></Label>
                <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Shop No, Street" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">City <span className="text-destructive">*</span></Label>
                  <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="City" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">State <span className="text-destructive">*</span></Label>
                  <SearchableSelect
                    options={INDIAN_STATES}
                    value={form.state}
                    onValueChange={v => set("state", v)}
                    placeholder="Search State..."
                    searchPlaceholder="Search state..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">Pincode <span className="text-destructive">*</span></Label>
                  <Input value={form.pincode} onChange={e => set("pincode", e.target.value)} placeholder="110001" />
                </div>
              </div>


            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">Bank Name <span className="text-destructive">*</span></Label>
                  <Input value={form.bank_name} onChange={e => set("bank_name", e.target.value)} placeholder="State Bank of India" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">Account Number <span className="text-destructive">*</span></Label>
                  <Input value={form.account_no} onChange={e => set("account_no", e.target.value)} placeholder="12345678901" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">IFSC Code <span className="text-destructive">*</span></Label>
                  <Input value={form.ifsc} onChange={e => set("ifsc", e.target.value)} placeholder="SBIN0001234" className="uppercase" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold">Branch <span className="text-destructive">*</span></Label>
                  <Input value={form.branch} onChange={e => set("branch", e.target.value)} placeholder="Connaught Place" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[12px] font-bold">UPI ID <span className="text-destructive">*</span></Label>
                <Input value={form.upi_id} onChange={e => set("upi_id", e.target.value)} placeholder="business@upi" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="text-[12px] font-bold">Invoice Number Prefix <span className="text-destructive">*</span></Label>
                <Input value={form.invoice_prefix} onChange={e => set("invoice_prefix", e.target.value)} placeholder="INV-" className="uppercase" />
                <p className="text-[10px] text-muted-foreground">e.g., INV-2026-0001</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[12px] font-bold">Default Terms & Conditions <span className="text-destructive">*</span></Label>
                <textarea
                  className="w-full bg-input border border-input rounded-md px-3 py-2 text-sm resize-none h-32 focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.terms}
                  onChange={e => set("terms", e.target.value)}
                  placeholder="Terms text..."
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Logo */}
              <div className="space-y-3">
                <Label className="text-[12px] font-bold flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5" /> Shop Logo <span className="font-normal text-muted-foreground">(Optional)</span></Label>
                {form.logo_url && (
                  <div className="w-32 h-20 border border-border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img src={form.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                  </div>
                )}
                <label className="cursor-pointer block">
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "logo_url", setUploadingLogo)} />
                  <div className="flex items-center gap-3 border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/40 transition-colors bg-card">
                    <div className="p-2 bg-secondary rounded-lg"><Upload className="w-5 h-5 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{uploadingLogo ? "Uploading..." : form.logo_url ? "Change Logo" : "Upload Logo"}</p>
                      <p className="text-[11px] text-muted-foreground">PNG, JPG up to 2MB. Recommended: 300×100px</p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Signature */}
              <div className="space-y-3">
                <Label className="text-[12px] font-bold flex items-center gap-2"><Pen className="w-3.5 h-3.5" /> Digital Signature <span className="font-normal text-muted-foreground">(Optional)</span></Label>
                {form.signature_url && (
                  <div className="w-40 h-16 border border-border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img src={form.signature_url} alt="Signature" className="max-w-full max-h-full object-contain p-1" />
                  </div>
                )}
                <label className="cursor-pointer block">
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "signature_url", setUploadingSig)} />
                  <div className="flex items-center gap-3 border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/40 transition-colors bg-card">
                    <div className="p-2 bg-secondary rounded-lg"><Upload className="w-5 h-5 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{uploadingSig ? "Uploading..." : form.signature_url ? "Change Signature" : "Upload Signature"}</p>
                      <p className="text-[11px] text-muted-foreground">PNG with transparent background recommended</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="p-5 border-t border-border bg-card shrink-0 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button variant="outline" className="w-[120px]" onClick={prevStep} disabled={saving}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : (
            <div className="w-[120px]"></div>
          )}
          
          {step < STEPS.length ? (
            <Button className="w-[160px] gold-gradient text-black font-bold h-11" onClick={nextStep}>
              Save & Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="w-[160px] gold-gradient text-black font-bold h-11" onClick={handleSave} disabled={saving || uploadingLogo || uploadingSig}>
              {saving ? "Saving Profile..." : "Complete Setup"}
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
