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
import { toast } from "sonner";
import { Save, Store, CreditCard, FileText, Upload, Image, Pen, Crown, Monitor, Sun, Moon, Printer, Bluetooth, Wifi, Usb, RefreshCw, Sliders, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MOCK_PRINTER_DEVICES, sendEscPosToPrinter, generateEscPosPayload } from "@/lib/escpos-utils";
import { BUSINESS_TYPES } from "@/lib/shopCategories";

export default function Settings() {
  const { user, updateAuthUser } = useAuth();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);

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
      if (latestSettings && latestSettings.length > 0) {
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
          <h1 className="text-xl font-black">⚙️ Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure your business profile</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/subscription">
            <Button variant="outline" className="gap-2 border-primary/30 text-primary">
              <Crown className="w-4 h-4" /> Upgrade Plan
            </Button>
          </Link>
          <Button className="gold-gradient text-black font-bold gap-2" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="bg-secondary mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="business" className="gap-1.5"><Store className="w-3.5 h-3.5" /> Business</TabsTrigger>
          <TabsTrigger value="bank" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Bank</TabsTrigger>
          <TabsTrigger value="invoice" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Invoice</TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5"><Image className="w-3.5 h-3.5" /> Branding</TabsTrigger>
          <TabsTrigger value="printers" className="gap-1.5"><Printer className="w-3.5 h-3.5" /> Printer Setup</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5"><Monitor className="w-3.5 h-3.5" /> Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[15px] mb-2">🏪 Business Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">Shop / Business Name *</Label><Input value={form.shop_name} onChange={e => set("shop_name", e.target.value)} placeholder="Ram General Store" /></div>
              <div>
                <Label className="text-[11px]">Business Entity Type *</Label>
                <SearchableSelect
                  options={["Sole Proprietorship", "Private Limited Company", "Public Limited Company", "Partnership", "Limited Liability Partnership (LLP)", "One Person Company (OPC)", "HUF", "Other"]}
                  value={form.business_entity_type}
                  onValueChange={v => set("business_entity_type", v)}
                  placeholder="Select Entity Type"
                  searchPlaceholder="Search entity type..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">Owner / Proprietor Name</Label><Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="Ramesh Kumar" /></div>
              <div><Label className="text-[11px]">GSTIN</Label><Input value={form.gstin} onChange={e => set("gstin", e.target.value)} placeholder="07AABCU9603R1ZP" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">PAN Number</Label><Input value={form.pan} onChange={e => set("pan", e.target.value)} placeholder="ABCDE1234F" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="9876543210" /></div>
              <div><Label className="text-[11px]">Email</Label><Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@business.com" /></div>
            </div>
            <div><Label className="text-[11px]">Address</Label><Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Shop No, Street" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label className="text-[11px]">City</Label><Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="City" /></div>
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
              <div><Label className="text-[11px]">Pincode</Label><Input value={form.pincode} onChange={e => set("pincode", e.target.value)} placeholder="110001" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/30">
              <div>
                <Label className="text-[11px] font-black text-amber-500 flex items-center gap-1">✨ Business Type / POS Layout</Label>
                <SearchableSelect
                  className="mt-1"
                  options={BUSINESS_TYPES}
                  value={form.business_type || "retail"}
                  onValueChange={v => set("business_type", v)}
                  placeholder="Select Layout"
                  searchPlaceholder="Search layout..."
                />
                {form.business_type === "other" && (
                  <Input
                    className="mt-2"
                    placeholder="Enter your business type..."
                    value={form.custom_business_type || ""}
                    onChange={e => set("custom_business_type", e.target.value)}
                  />
                )}
                <p className="text-[10px] text-muted-foreground mt-1">Sets the default industry-specific theme & fields inside your POS billing terminal.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bank">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[15px] mb-2">🏦 Bank Details (for invoices)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">Bank Name</Label><Input value={form.bank_name} onChange={e => set("bank_name", e.target.value)} placeholder="State Bank of India" /></div>
              <div><Label className="text-[11px]">Account Number</Label><Input value={form.account_no} onChange={e => set("account_no", e.target.value)} placeholder="12345678901" /></div>
              <div><Label className="text-[11px]">IFSC Code</Label><Input value={form.ifsc} onChange={e => set("ifsc", e.target.value)} placeholder="SBIN0001234" /></div>
              <div><Label className="text-[11px]">Branch</Label><Input value={form.branch} onChange={e => set("branch", e.target.value)} placeholder="Connaught Place" /></div>
            </div>
            <div><Label className="text-[11px]">UPI ID</Label><Input value={form.upi_id} onChange={e => set("upi_id", e.target.value)} placeholder="business@upi" /></div>
          </div>
        </TabsContent>

        <TabsContent value="invoice">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[15px] mb-2">📄 Invoice Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-[11px]">Invoice Number Prefix</Label><Input value={form.invoice_prefix} onChange={e => set("invoice_prefix", e.target.value)} placeholder="INV-" /></div>
            </div>
            <div><Label className="text-[11px]">Default Terms & Conditions</Label>
              <textarea
                className="w-full mt-1 bg-input border border-input rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.terms}
                onChange={e => set("terms", e.target.value)}
                placeholder="Terms text..."
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="branding">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <h3 className="font-bold text-[15px] mb-2">🎨 Branding & Logo</h3>
            <p className="text-[12px] text-muted-foreground -mt-3">Upload your shop logo and digital signature to appear on printed invoices.</p>

            {/* Logo */}
            <div className="space-y-3">
              <Label className="text-[12px] font-bold flex items-center gap-2"><Image className="w-3.5 h-3.5" /> Shop Logo</Label>
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
                    <p className="text-[13px] font-semibold">{uploadingLogo ? "Uploading..." : form.logo_url ? "Change Logo" : "Upload Logo"}</p>
                    <p className="text-[11px] text-muted-foreground">PNG, JPG up to 2MB. Recommended: 300×100px</p>
                  </div>
                </div>
              </label>
            </div>

            {/* Signature */}
            <div className="space-y-3">
              <Label className="text-[12px] font-bold flex items-center gap-2"><Pen className="w-3.5 h-3.5" /> Digital Signature</Label>
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
                    <p className="text-[13px] font-semibold">{uploadingSig ? "Uploading..." : form.signature_url ? "Change Signature" : "Upload Signature"}</p>
                    <p className="text-[11px] text-muted-foreground">PNG with transparent background recommended</p>
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
            <h3 className="font-bold text-[15px] mb-2 flex items-center gap-2"><Monitor className="w-4 h-4" /> Appearance</h3>
            <p className="text-[12px] text-muted-foreground -mt-3">Customize the look and feel of the POS terminal and dashboard.</p>
            
            <div className="space-y-3">
              <Label className="text-[12px] font-bold">Theme Preference</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 border rounded-xl gap-2 transition-all hover:bg-accent",
                    theme === "light" ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20" : "border-border text-muted-foreground"
                  )}
                >
                  <Sun className="w-6 h-6" />
                  <span className="text-xs font-bold">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 border rounded-xl gap-2 transition-all hover:bg-accent",
                    theme === "dark" ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20" : "border-border text-muted-foreground"
                  )}
                >
                  <Moon className="w-6 h-6" />
                  <span className="text-xs font-bold">Dark</span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 border rounded-xl gap-2 transition-all hover:bg-accent",
                    theme === "system" ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20" : "border-border text-muted-foreground"
                  )}
                >
                  <Monitor className="w-6 h-6" />
                  <span className="text-xs font-bold">System</span>
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
        <h3 className="font-bold text-[15px] flex items-center gap-2 text-slate-900 dark:text-slate-100"><Printer className="w-4 h-4 text-amber-500" /> Thermal Printer Integration</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">Configure thermal receipt printers for handheld POS devices and billing terminals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Interface Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Connection Interface</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "browser", label: "System Print", desc: "Default print dialog", icon: Sliders },
                { id: "bluetooth", label: "Bluetooth", desc: "Handheld & BT Printers", icon: Bluetooth },
                { id: "usb", label: "USB OTG", desc: "USB wired connections", icon: Usb },
                { id: "wifi", label: "WiFi / Network", desc: "Ethernet & IP printers", icon: Wifi }
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
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Receipt Size</Label>
            <div className="flex gap-3">
              {[
                { id: "58mm", label: "58mm (2-inch)", desc: "Handhelds & Mobile printers" },
                { id: "80mm", label: "80mm (3-inch)", desc: "Desktop counter printers" }
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
              <p className="text-[12px] font-bold text-slate-900 dark:text-slate-100">Auto Print on Checkout</p>
              <p className="text-[9px] text-muted-foreground">Fires print command instantly when checkout succeeds.</p>
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
              <h4 className="font-extrabold text-[12px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-amber-500" /> System Printer Mode</h4>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Using system dialog to print bills. We format the page layout precisely to fit <strong>{form.printer_size}</strong> paper width rolls. Works on all Android POS devices, PCs, and tablets natively.
              </p>
              <Button type="button" onClick={handleTestPrint} variant="outline" size="sm" className="w-full text-xs font-bold gap-1 mt-1">
                <Printer className="w-3.5 h-3.5" /> Trigger Test Print
              </Button>
            </div>
          )}

          {(isBluetooth || isUsb) && (
            <div className="space-y-4">
              <div className="bg-secondary/20 p-4 rounded-xl space-y-2">
                <h4 className="font-extrabold text-[12px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {isBluetooth ? <Bluetooth className="w-3.5 h-3.5 text-amber-500" /> : <Usb className="w-3.5 h-3.5 text-amber-500" />}
                  {isBluetooth ? "Bluetooth Connection" : "USB Port Connection"}
                </h4>
                
                <div className="flex items-center justify-between py-1">
                  <span className="text-[11px] text-muted-foreground">Connected Printer:</span>
                  <span className="text-[12px] font-black text-amber-600 dark:text-amber-400">{form.paired_printer_name || "None Paired"}</span>
                </div>

                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    onClick={handleStartScan}
                    disabled={scanning}
                    className="flex-1 text-xs font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 h-8"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", scanning && "animate-spin")} />
                    {scanning ? "Scanning..." : `Scan for ${isBluetooth ? "BT Printers" : "USB Devices"}`}
                  </Button>
                  
                  {form.paired_printer_name && (
                    <Button type="button" onClick={handleTestPrint} variant="outline" size="sm" className="text-xs font-bold gap-1 h-8">
                      Test
                    </Button>
                  )}
                </div>
              </div>

              {/* Scan discovery list */}
              {scanResults.length > 0 && (
                <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border">
                  <div className="bg-secondary/40 p-2.5 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                    Discovered Devices
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
                        {pairingDevice === dev.name ? "Pairing..." : form.paired_printer_name === dev.name ? "Connected" : "Connect"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isWifi && (
            <div className="bg-secondary/20 p-4 rounded-xl space-y-4">
              <h4 className="font-extrabold text-[12px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-amber-500" /> Network Printer Setup</h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px]">Printer IP Address *</Label>
                  <Input
                    value={form.printer_ip}
                    onChange={e => set("printer_ip", e.target.value)}
                    placeholder="192.168.1.100"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Port Number</Label>
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
                  <Printer className="w-3.5 h-3.5" /> Test Connection
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
          {saving ? "Saving Configuration..." : "Save Printer Settings"}
        </Button>
      </div>
    </div>
  );
}