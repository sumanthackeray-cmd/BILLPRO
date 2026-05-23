import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { 
  Users, Search, Sparkles, Sliders, Phone, Shirt, Palette, Edit2, MessageSquare, Gift
} from "lucide-react";

export default function CustomerStyleProfiles() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  // Measurements edit state
  const [isEditing, setIsEditing] = useState(false);
  const [measureForm, setMeasureForm] = useState({
    chest: 96, waist: 82, hip: 100, shoulder: 44, sleeve: 62, inseam: 76, neck: 39, height: 172, weight: 72,
    shirt_size: "L", trouser_size: "32", ethnic_size: "M", preferred_fit: "Regular", fit_notes: "Prefers comfort elastic waist options"
  });

  // Query customers
  const { data: customers = [], isLoading: isLoadingCust } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  // Query style profiles dynamically from DB
  const { data: rawProfiles = [] } = useQuery({
    queryKey: ["customer_style_profiles"],
    queryFn: () => base44.entities.CustomerStyleProfile.list(),
  });

  // Merge style profiles or fallback to mocked database records
  const profiles = useMemo(() => {
    const map = {};
    rawProfiles.forEach(p => {
      map[p.customer_id] = p;
    });

    const fallbackProfiles = {
      "walk-in": {
        customer_id: "walk-in",
        gender: "male",
        measurements: { chest: null, waist: null, hip: null, shoulder: null, sleeve: null, inseam: null, neck: null, height: null, weight: null },
        preferred_sizes: { shirt: null, trouser: null, ethnic: null },
        preferred_colors: [],
        preferred_colors_names: [],
        style_notes: "No customer profile registered yet.",
      }
    };

    return { ...fallbackProfiles, ...map };
  }, [customers, rawProfiles]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      return (
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
      );
    });
  }, [customers, searchTerm]);

  // Selection initialization
  const selectedCustomerId = selectedProfileId || customers[0]?.id || "walk-in";
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || { id: "walk-in", name: "Walk-in Customer", phone: "9999999999" };
  }, [customers, selectedCustomerId]);

  const selectedProfile = useMemo(() => {
    return profiles[selectedCustomerId] || {
      customer_id: selectedCustomerId,
      measurements: { chest: null, waist: null, hip: null, shoulder: null, sleeve: null, inseam: null, neck: null, height: null, weight: null },
      preferred_sizes: { shirt: null, trouser: null, ethnic: null },
      preferred_colors: [],
      preferred_colors_names: [],
      style_notes: ""
    };
  }, [profiles, selectedCustomerId]);

  // Handle saving measurements
  const handleSaveMeasurements = async () => {
    try {
      const dataPayload = {
        customer_id: selectedCustomerId,
        gender: selectedProfile.gender || "male",
        measurements: {
          chest: Number(measureForm.chest),
          waist: Number(measureForm.waist),
          hip: Number(measureForm.hip),
          shoulder: Number(measureForm.shoulder),
          sleeve: Number(measureForm.sleeve),
          inseam: Number(measureForm.inseam),
          neck: Number(measureForm.neck),
          height: Number(measureForm.height),
          weight: Number(measureForm.weight),
        },
        preferred_sizes: {
          shirt: measureForm.shirt_size,
          trouser: measureForm.trouser_size,
          ethnic: measureForm.ethnic_size,
        },
        style_notes: measureForm.fit_notes,
        preferred_fit: measureForm.preferred_fit,
      };

      // Upsert to Firestore via entities proxy
      const existingDbRecord = rawProfiles.find(p => p.customer_id === selectedCustomerId);
      if (existingDbRecord) {
        await base44.entities.CustomerStyleProfile.update(existingDbRecord.id, dataPayload);
      } else {
        await base44.entities.CustomerStyleProfile.create(dataPayload);
      }

      toast.success("Customer Style Profile & Measurements saved successfully!");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["customer_style_profiles"] });
    } catch (e) {
      toast.error("Failed to save measurements: " + e.message);
    }
  };

  // Switch to editing mode & load values
  const startEditing = () => {
    setMeasureForm({
      chest: selectedProfile.measurements?.chest || 96,
      waist: selectedProfile.measurements?.waist || 82,
      hip: selectedProfile.measurements?.hip || 100,
      shoulder: selectedProfile.measurements?.shoulder || 44,
      sleeve: selectedProfile.measurements?.sleeve || 62,
      inseam: selectedProfile.measurements?.inseam || 76,
      neck: selectedProfile.measurements?.neck || 39,
      height: selectedProfile.measurements?.height || 172,
      weight: selectedProfile.measurements?.weight || 72,
      shirt_size: selectedProfile.preferred_sizes?.shirt || "L",
      trouser_size: selectedProfile.preferred_sizes?.trouser || "32",
      ethnic_size: selectedProfile.preferred_sizes?.ethnic || "M",
      preferred_fit: selectedProfile.preferred_fit || "Regular",
      fit_notes: selectedProfile.style_notes || "Prefers comfort elastic waist options"
    });
    setIsEditing(true);
  };

  // WhatsApp bulk CRM sender
  const handleSendWhatsAppPromo = (type) => {
    let cleanPhone = selectedCustomer.phone || "";
    cleanPhone = cleanPhone.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    let message = "";
    if (type === "birthday") {
      message = `🎂 *HAPPY BIRTHDAY FROM VOGATS FASHION* 🎂\n\nDear *${selectedCustomer.name}*,\n\nWe wish you a very happy and stylish birthday! To make your day special, enjoy an extra *10% OFF* on all catalog items throughout this month.\n\nVisit us and treat yourself! *Promo Code: BDAY10*`;
    } else {
      message = `✨ *NEW SEASON DESIGNS EXCLUSIVELY FOR YOU* ✨\n\nHello *${selectedCustomer.name}*,\n\nOur brand new *Summer 2026 Season Collection* has just dropped! We've pre-loaded recommendations matching your preferred color *${selectedProfile.preferred_colors_names?.[0] || 'Navy Blue'}* and size *${selectedProfile.preferred_sizes?.shirt || 'L'}*.\n\nSwing by or request a video call catalog!`;
    }

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    toast.success("CRM message generated and opened in WhatsApp!");
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 p-1">
      {/* Upper header card */}
      <div className="relative bg-gradient-to-r from-slate-100 via-indigo-50 to-slate-100 dark:from-[#12131C] dark:via-[#1a1b29] dark:to-[#25283b] border border-indigo-500/20 rounded-2xl p-6 shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none z-0" />
        <div className="relative z-10 space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> 👥 Customer Style Profile &amp; CRM Center
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-350">
            Maintain high-precision sizing charts, style preferences, and automate custom WhatsApp promotions based on fit profiles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Side: Customers list search */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 rounded-2xl p-4 flex flex-col space-y-4 max-h-[680px] overflow-hidden shadow-inner">
          <div className="relative shrink-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search customers..."
              className="pl-9 pr-4 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-indigo-500/40 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-xs font-bold"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-10 opacity-35 text-xs text-slate-500 font-bold">
                No customer results
              </div>
            ) : (
              filteredCustomers.map(c => {
                const isSelected = selectedCustomerId === c.id;
                const cProfile = profiles[c.id] || {};
                return (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedProfileId(c.id); setIsEditing(false); }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                      isSelected 
                        ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 shadow-md"
                        : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                        isSelected ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
                      }`}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">{c.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{c.phone || "Walk-In"}</p>
                      </div>
                    </div>
                    {cProfile.preferred_sizes?.shirt && (
                      <Badge className="bg-indigo-950/40 text-indigo-400 border border-indigo-850 text-[9px] font-black uppercase">
                        Size: {cProfile.preferred_sizes.shirt}
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Profile custom measurements & preferences detail view */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 space-y-5 shadow-sm min-h-[500px]">
          
          {/* Top Panel Customer Profile Information Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-850 rounded-xl p-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 text-base font-black shadow-inner">
                {selectedCustomer.name[0].toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <h2 className="text-base font-black text-slate-900 dark:text-white">{selectedCustomer.name}</h2>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                  <span className="flex items-center gap-0.5"><Phone className="w-3 h-3 text-indigo-400" /> {selectedCustomer.phone || "N/A"}</span>
                  <span>•</span>
                  <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 rounded font-black text-[9px] uppercase tracking-wider">{selectedProfile.gender || "Male"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => handleSendWhatsAppPromo("birthday")} 
                className="bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 p-2 text-xs font-black rounded-lg flex items-center gap-1.5 transition-colors"
                title="Send birthday coupon WhatsApp alert"
              >
                <Gift className="w-3.5 h-3.5" /> Bday Alert
              </button>
              <button 
                onClick={() => handleSendWhatsAppPromo("promo")} 
                className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 p-2 text-xs font-black rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Offer Alert
              </button>
            </div>
          </div>

          {isEditing ? (
            /* Editing Measurements Form Block */
            <div className="space-y-4 animate-fade-up bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900 rounded-xl p-4">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Custom Measurements (CM)</h3>
              
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {[
                  { id: "chest", label: "Chest (cm)" },
                  { id: "waist", label: "Waist (cm)" },
                  { id: "hip", label: "Hip (cm)" },
                  { id: "shoulder", label: "Shoulder" },
                  { id: "sleeve", label: "Sleeve" },
                  { id: "inseam", label: "Inseam" },
                  { id: "neck", label: "Neck" },
                  { id: "height", label: "Height (cm)" },
                  { id: "weight", label: "Weight (kg)" }
                ].map(f => (
                  <div key={f.id}>
                    <label className="text-[10px] text-slate-600 dark:text-slate-450 font-bold uppercase">{f.label}</label>
                    <Input
                      type="number"
                      value={measureForm[f.id]}
                      onChange={e => setMeasureForm(p => ({ ...p, [f.id]: e.target.value }))}
                      className="h-9 mt-1 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs font-bold text-center"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-900">
                <div>
                  <label className="text-[10px] text-slate-600 dark:text-slate-450 font-bold uppercase">Shirt Size</label>
                  <select 
                    value={measureForm.shirt_size} 
                    onChange={e => setMeasureForm(p => ({ ...p, shirt_size: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-350 text-xs font-bold py-1.5 px-3.5 rounded-lg mt-1 outline-none"
                  >
                    {["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 dark:text-slate-450 font-bold uppercase">Trouser Size</label>
                  <select 
                    value={measureForm.trouser_size} 
                    onChange={e => setMeasureForm(p => ({ ...p, trouser_size: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-350 text-xs font-bold py-1.5 px-3.5 rounded-lg mt-1 outline-none"
                  >
                    {["28", "30", "32", "34", "36", "38", "40", "42"].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 dark:text-slate-450 font-bold uppercase">Ethnic Size</label>
                  <select 
                    value={measureForm.ethnic_size} 
                    onChange={e => setMeasureForm(p => ({ ...p, ethnic_size: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-350 text-xs font-bold py-1.5 px-3.5 rounded-lg mt-1 outline-none"
                  >
                    {["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 dark:text-slate-450 font-bold uppercase">Preferred Fit</label>
                  <select 
                    value={measureForm.preferred_fit} 
                    onChange={e => setMeasureForm(p => ({ ...p, preferred_fit: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-350 text-xs font-bold py-1.5 px-3.5 rounded-lg mt-1 outline-none"
                  >
                    {["Slim Fit", "Regular", "Relaxed", "Oversized", "Custom"].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-600 dark:text-slate-450 font-bold uppercase">Tailoring / Fit Notes</label>
                <Input
                  value={measureForm.fit_notes}
                  onChange={e => setMeasureForm(p => ({ ...p, fit_notes: e.target.value }))}
                  placeholder="e.g. waist alteration elastic adjust needed, sleeves taper"
                  className="h-10 mt-1 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold h-9">Cancel</Button>
                <Button onClick={handleSaveMeasurements} className="gold-gradient text-slate-950 font-black h-9 px-5">Save Sizing Profile</Button>
              </div>
            </div>
          ) : (
            /* Sizing & Sizing Profile Metrics Displays */
            <div className="space-y-6">
              
              {/* Measurements row grid metrics */}
              <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900 rounded-xl p-4.5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Shirt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Sizing Profile Metrics
                  </h3>
                  <button 
                    onClick={startEditing} 
                    className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-indigo-500/20"
                  >
                    <Edit2 className="w-2.5 h-2.5" /> Edit measurements
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { label: "Chest", val: `${selectedProfile.measurements?.chest || "N/A"} cm` },
                    { label: "Waist", val: `${selectedProfile.measurements?.waist || "N/A"} cm` },
                    { label: "Hip", val: `${selectedProfile.measurements?.hip || "N/A"} cm` },
                    { label: "Shoulder", val: `${selectedProfile.measurements?.shoulder || "N/A"} cm` },
                    { label: "Sleeve", val: `${selectedProfile.measurements?.sleeve || "N/A"} cm` },
                    { label: "Fit Type", val: selectedProfile.preferred_fit || "Regular" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 p-2.5 rounded-lg text-center">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</span>
                      <strong className="block text-xs font-extrabold text-slate-900 dark:text-white mt-1">{stat.val}</strong>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-200 dark:border-slate-800/40 pt-4 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                    <span className="text-[9px] text-slate-500 font-black uppercase block tracking-wider">Usual Shirt Size</span>
                    <strong className="text-lg font-black text-indigo-600 dark:text-indigo-400 block mt-1">{selectedProfile.preferred_sizes?.shirt || "N/A"}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                    <span className="text-[9px] text-slate-500 font-black uppercase block tracking-wider">Trouser Size</span>
                    <strong className="text-lg font-black text-indigo-600 dark:text-indigo-400 block mt-1">{selectedProfile.preferred_sizes?.trouser || "N/A"}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                    <span className="text-[9px] text-slate-500 font-black uppercase block tracking-wider">Ethnic Size</span>
                    <strong className="text-lg font-black text-indigo-600 dark:text-indigo-400 block mt-1">{selectedProfile.preferred_sizes?.ethnic || "N/A"}</strong>
                  </div>
                </div>

                {selectedProfile.style_notes && (
                  <div className="bg-slate-50 dark:bg-slate-950/30 p-3 rounded-lg border border-slate-200 dark:border-slate-850/40 text-[10px] text-slate-600 dark:text-slate-400 flex items-start gap-1">
                    <span className="text-indigo-600 dark:text-indigo-450 font-black uppercase shrink-0">Notes:</span>
                    <span>{selectedProfile.style_notes}</span>
                  </div>
                )}
              </div>

              {/* Color Preferences Swatches */}
              <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-900 rounded-xl p-4.5 space-y-3.5 shadow-sm">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-indigo-400" /> Favorite Color Swatches
                </h3>
                
                <div className="flex flex-wrap items-center gap-3">
                  {(selectedProfile.preferred_colors || ["#1B2A6B", "#ffffff", "#00050e"]).map((hex, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 px-3 py-1.5 rounded-full shadow-inner">
                      <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-white/20 shrink-0" style={{ backgroundColor: hex }} />
                      <span className="text-[10px] text-slate-600 dark:text-slate-350 font-bold uppercase tracking-wider">{selectedProfile.preferred_colors_names?.[i] || "ColorSwatch"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Smart upsell Recommendations block */}
              <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Tailored Recommendations Engine</h4>
                    <p className="text-[9px] text-slate-400">Products currently matching {selectedCustomer.name}'s size and color profile in active inventory.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-lg p-3 flex items-center justify-between shadow-sm">
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Oxford Collar Shirts</h5>
                      <span className="text-[9px] text-slate-500 block font-bold">Category: Shirts | Size: {selectedProfile.preferred_sizes?.shirt || "L"}</span>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase">Suggested</Badge>
                  </div>

                  <div className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-lg p-3 flex items-center justify-between shadow-sm">
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Classic Navy Denim Jeans</h5>
                      <span className="text-[9px] text-slate-500 block font-bold">Category: Jeans | Size: {selectedProfile.preferred_sizes?.trouser || "32"}</span>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase">In Stock</Badge>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
