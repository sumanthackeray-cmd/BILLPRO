import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firestore';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { ChevronDown, ChevronUp, Save, Building2, Copy, CheckCircle } from 'lucide-react';
import SkippableField from '../../modules/registration/SkippableField';
import { useShopSettings } from '../../hooks/useShopSettings';
import { base44 } from '../../api/base44Client';

const ExpandableSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-between items-center font-bold text-slate-800 dark:text-white"
      >
        {title}
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      {isOpen && (
        <div className="p-6 bg-white dark:bg-slate-950">
          {children}
        </div>
      )}
    </div>
  );
};

export default function CompanyProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(null);
  const [idCopied, setIdCopied] = useState(false);

  const companyId = localStorage.getItem('company_id') || user?.companyId || '';

  const copyCompanyId = () => {
    if (!companyId) return;
    navigator.clipboard.writeText(companyId).then(() => {
      setIdCopied(true);
      toast.success('Company ID copied to clipboard!');
      setTimeout(() => setIdCopied(false), 2000);
    });
  };

  useEffect(() => {
    const cid = companyId;
    if (!cid) return;
    
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, `companies/${cid}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            ...data,
            legal: data.legal || {},
            address: data.address || {},
            contact: data.contact || {},
            banking: data.banking || {},
            manufacturing: data.manufacturing || {},
            franchise: data.franchise || {},
            enterprise: data.enterprise || {},
            wholesale: data.wholesale || {}
          });
        }
      } catch (err) {
        toast.error("Failed to load company profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // Try to load from ShopSettings if local document doesn't have it
  const { shopSettings, updateSettingsOptimistically } = useShopSettings();

  const handleGroupChange = (group, field, value) => {
    setFormData(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: value
      }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cid = companyId;
    if (!cid || !formData) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, `companies/${cid}`);
      await updateDoc(docRef, formData);
      
      // Also update shopSettings to keep sidebar in sync
      if (formData.business_name && shopSettings) {
        try {
          updateSettingsOptimistically({ shop_name: formData.business_name });
          if (shopSettings.id) {
            await base44.entities.ShopSettings.update(shopSettings.id, { shop_name: formData.business_name });
          }
        } catch(e) {
          console.warn("Failed to sync shop name to shopSettings", e);
        }
      }
      
      toast.success("Company profile updated successfully!");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Profile...</div>;
  if (!formData) return <div className="p-8 text-center text-red-500">Profile data not found.</div>;

  const { account_type } = formData;

  return (
    <form onSubmit={handleSave} className="animate-fade-up">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Business Profile</h2>
          <p className="text-sm text-slate-500">Complete your business details to unlock all features</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {/* Company ID Banner - visible to all roles */}
      {companyId && (
        <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Your Company Registration ID</p>
              <p className="text-2xl font-black tracking-widest font-mono mt-0.5">{companyId}</p>
              <p className="text-xs opacity-70 mt-0.5">Share this ID with your staff so they can log into your workspace.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={copyCompanyId}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 px-4 py-2 rounded-xl text-sm font-bold transition-all flex-shrink-0"
          >
            {idCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {idCopied ? 'Copied!' : 'Copy ID'}
          </button>
        </div>
      )}

      <ExpandableSection title="🏢 Core Information" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Business Name</label>
            <input 
              value={formData.business_name || formData.name || formData.companyName || shopSettings?.shop_name || ""} 
              onChange={e => setFormData(f => ({ ...f, business_name: e.target.value, name: e.target.value, companyName: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Account Type</label>
            <input 
              value={formData.account_type?.toUpperCase() || "N/A"} 
              disabled
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-500 text-sm cursor-not-allowed"
            />
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection title="⚖️ Legal Information" defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkippableField label="GSTIN Number" field="gstin" value={formData.legal?.gstin} onChange={(f, v) => handleGroupChange('legal', f, v)} />
          <SkippableField label="PAN Number" field="pan" value={formData.legal?.pan} onChange={(f, v) => handleGroupChange('legal', f, v)} />
          <SkippableField 
            label="Entity Type" 
            field="entity_type" 
            type="select"
            value={formData.legal?.entity_type} 
            onChange={(f, v) => handleGroupChange('legal', f, v)} 
            options={[{value:'sole_prop',label:'Sole Proprietorship'},{value:'partnership',label:'Partnership'},{value:'pvt_ltd',label:'Private Limited'},{value:'llp',label:'LLP'},{value:'public_ltd',label:'Public Limited'}]}
          />
          <SkippableField label="Year Established" field="year_established" type="number" value={formData.legal?.year_established} onChange={(f, v) => handleGroupChange('legal', f, v)} />
        </div>
      </ExpandableSection>

      <ExpandableSection title="📍 Address & Contact">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkippableField label="Address Line 1" field="line1" value={formData.address?.line1} onChange={(f, v) => handleGroupChange('address', f, v)} />
          <SkippableField label="State" field="state" value={formData.address?.state} onChange={(f, v) => handleGroupChange('address', f, v)} />
          <SkippableField label="Pincode" field="pincode" value={formData.address?.pincode} onChange={(f, v) => handleGroupChange('address', f, v)} />
          <SkippableField label="Business Email" field="business_email" type="email" value={formData.contact?.business_email} onChange={(f, v) => handleGroupChange('contact', f, v)} />
          <SkippableField label="Business Phone" field="business_phone" value={formData.contact?.business_phone} onChange={(f, v) => handleGroupChange('contact', f, v)} />
          <SkippableField label="Website" field="website" value={formData.contact?.website} onChange={(f, v) => handleGroupChange('contact', f, v)} />
        </div>
      </ExpandableSection>

      <ExpandableSection title="🏦 Banking (For Invoices)">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkippableField label="Bank Name" field="bank_name" value={formData.banking?.bank_name} onChange={(f, v) => handleGroupChange('banking', f, v)} />
          <SkippableField label="Account Number" field="account_number" value={formData.banking?.account_number} onChange={(f, v) => handleGroupChange('banking', f, v)} />
          <SkippableField label="IFSC Code" field="ifsc" value={formData.banking?.ifsc} onChange={(f, v) => handleGroupChange('banking', f, v)} />
          <SkippableField label="UPI ID" field="upi_id" value={formData.banking?.upi_id} onChange={(f, v) => handleGroupChange('banking', f, v)} />
        </div>
      </ExpandableSection>

      {account_type === 'manufacturing' && (
        <ExpandableSection title="🏭 Manufacturing Details">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkippableField label="Factory Name" field="plant_name" value={formData.manufacturing?.plant_name} onChange={(f, v) => handleGroupChange('manufacturing', f, v)} />
            <SkippableField label="License No." field="manufacturing_license" value={formData.manufacturing?.manufacturing_license} onChange={(f, v) => handleGroupChange('manufacturing', f, v)} />
            <SkippableField label="Production Capacity" field="production_capacity" value={formData.manufacturing?.production_capacity} onChange={(f, v) => handleGroupChange('manufacturing', f, v)} />
            <SkippableField label="No. of Plants" field="no_of_plants" type="number" value={formData.manufacturing?.no_of_plants} onChange={(f, v) => handleGroupChange('manufacturing', f, v)} />
          </div>
        </ExpandableSection>
      )}

      {account_type === 'franchise' && (
        <ExpandableSection title="🤝 Franchise Details">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkippableField label="Parent Brand Name" field="parent_brand" value={formData.franchise?.parent_brand} onChange={(f, v) => handleGroupChange('franchise', f, v)} />
            <SkippableField label="Agreement No." field="agreement_number" value={formData.franchise?.agreement_number} onChange={(f, v) => handleGroupChange('franchise', f, v)} />
            <SkippableField label="Royalty %" field="royalty_percentage" type="number" value={formData.franchise?.royalty_percentage} onChange={(f, v) => handleGroupChange('franchise', f, v)} />
            <SkippableField label="Total Outlets" field="total_outlets" type="number" value={formData.franchise?.total_outlets} onChange={(f, v) => handleGroupChange('franchise', f, v)} />
          </div>
        </ExpandableSection>
      )}

      {account_type === 'enterprise' && (
        <ExpandableSection title="🌐 Enterprise Details">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkippableField label="CIN Number" field="cin" value={formData.enterprise?.cin} onChange={(f, v) => handleGroupChange('enterprise', f, v)} />
            <SkippableField label="Parent Company" field="parent_company" value={formData.enterprise?.parent_company} onChange={(f, v) => handleGroupChange('enterprise', f, v)} />
            <SkippableField label="Total Employees" field="total_employees_india" type="number" value={formData.enterprise?.total_employees_india} onChange={(f, v) => handleGroupChange('enterprise', f, v)} />
            <SkippableField label="Existing ERP" field="existing_erp" value={formData.enterprise?.existing_erp} onChange={(f, v) => handleGroupChange('enterprise', f, v)} />
          </div>
        </ExpandableSection>
      )}

      {account_type === 'wholesale' && (
        <ExpandableSection title="📦 Wholesale Details">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkippableField label="FSSAI / Drug License" field="fssai_license" value={formData.wholesale?.fssai_license} onChange={(f, v) => handleGroupChange('wholesale', f, v)} />
            <SkippableField label="IEC Code" field="iec_code" value={formData.wholesale?.iec_code} onChange={(f, v) => handleGroupChange('wholesale', f, v)} />
            <SkippableField label="Retailers Served" field="retailers_served_count" type="number" value={formData.wholesale?.retailers_served_count} onChange={(f, v) => handleGroupChange('wholesale', f, v)} />
            <SkippableField label="No. of Warehouses" field="no_of_warehouses" type="number" value={formData.wholesale?.no_of_warehouses} onChange={(f, v) => handleGroupChange('wholesale', f, v)} />
          </div>
        </ExpandableSection>
      )}
    </form>
  );
}
