import React, { useState } from 'react';
import SkippableField from './SkippableField';
import { toast } from 'react-hot-toast';

export default function Step3BusinessDetails({ formData, updateData, onNext, onPrev }) {
  const [loading, setLoading] = useState(false);

  const handleGroupChange = (group, field, value) => {
    updateData({
      [group]: {
        ...formData[group],
        [field]: value
      }
    });
  };

  const handleSkipAll = () => {
    // We already initialize skipped fields as `null`. Just go to next step.
    onNext();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In a real app, you would make an API call here to update the user's tenant document
      // using formData.generated_tenant_id and the updated formData structure.
      // await updateTenantDetails(formData.generated_tenant_id, formData);
      toast.success("Business details saved!");
      onNext();
    } catch (err) {
      toast.error("Failed to save details");
    } finally {
      setLoading(false);
    }
  };

  const { account_type } = formData;

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            BUSINESS DETAILS
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl">
            You can fill these out now to complete your profile, or skip and fill them later in your dashboard's Company Profile section.
          </p>
        </div>
        <button
          onClick={handleSkipAll}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2 rounded-xl font-bold transition-colors whitespace-nowrap text-sm h-fit"
        >
          Skip All & Continue ⏭️
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-10">
        
        {/* LEGAL INFORMATION */}
        <section>
          <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 pb-2 border-b border-indigo-100 dark:border-indigo-900/50">
            Legal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkippableField 
              label="GSTIN Number" 
              field="gstin" 
              value={formData.legal.gstin} 
              onChange={(f, v) => handleGroupChange('legal', f, v)} 
              placeholder="e.g. 27AAPCM1234F1Z5"
            />
            <SkippableField 
              label="PAN Number" 
              field="pan" 
              value={formData.legal.pan} 
              onChange={(f, v) => handleGroupChange('legal', f, v)} 
              placeholder="e.g. AAPCM1234F"
            />
            <SkippableField 
              label="Entity Type" 
              field="entity_type" 
              type="select"
              value={formData.legal.entity_type} 
              onChange={(f, v) => handleGroupChange('legal', f, v)} 
              options={[
                { value: 'sole_prop', label: 'Sole Proprietorship' },
                { value: 'partnership', label: 'Partnership' },
                { value: 'pvt_ltd', label: 'Private Limited' },
                { value: 'llp', label: 'LLP' },
                { value: 'public_ltd', label: 'Public Limited' }
              ]}
            />
            <SkippableField 
              label="Year Established" 
              field="year_established" 
              type="number"
              value={formData.legal.year_established} 
              onChange={(f, v) => handleGroupChange('legal', f, v)} 
              placeholder="e.g. 2018"
            />
          </div>
        </section>

        {/* CONTACT & ADDRESS */}
        <section>
          <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 pb-2 border-b border-indigo-100 dark:border-indigo-900/50">
            Address & Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkippableField 
              label="Address Line 1" 
              field="line1" 
              value={formData.address.line1} 
              onChange={(f, v) => handleGroupChange('address', f, v)} 
            />
            <SkippableField 
              label="State" 
              field="state" 
              value={formData.address.state} 
              onChange={(f, v) => handleGroupChange('address', f, v)} 
            />
            <SkippableField 
              label="Pincode" 
              field="pincode" 
              value={formData.address.pincode} 
              onChange={(f, v) => handleGroupChange('address', f, v)} 
            />
            <SkippableField 
              label="Business Email" 
              field="business_email" 
              type="email"
              value={formData.contact.business_email} 
              onChange={(f, v) => handleGroupChange('contact', f, v)} 
            />
            <SkippableField 
              label="Business Phone" 
              field="business_phone" 
              value={formData.contact.business_phone} 
              onChange={(f, v) => handleGroupChange('contact', f, v)} 
            />
            <SkippableField 
              label="Website" 
              field="website" 
              value={formData.contact.website} 
              onChange={(f, v) => handleGroupChange('contact', f, v)} 
            />
          </div>
        </section>

        {/* BANKING */}
        <section>
          <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 pb-2 border-b border-indigo-100 dark:border-indigo-900/50">
            Banking (For Invoices)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkippableField 
              label="Bank Name" 
              field="bank_name" 
              value={formData.banking.bank_name} 
              onChange={(f, v) => handleGroupChange('banking', f, v)} 
            />
            <SkippableField 
              label="Account Number" 
              field="account_number" 
              value={formData.banking.account_number} 
              onChange={(f, v) => handleGroupChange('banking', f, v)} 
            />
            <SkippableField 
              label="IFSC Code" 
              field="ifsc" 
              value={formData.banking.ifsc} 
              onChange={(f, v) => handleGroupChange('banking', f, v)} 
            />
            <SkippableField 
              label="UPI ID" 
              field="upi_id" 
              value={formData.banking.upi_id} 
              onChange={(f, v) => handleGroupChange('banking', f, v)} 
            />
          </div>
        </section>

        {/* DYNAMIC SECTIONS BASED ON ACCOUNT TYPE */}
        {account_type === 'manufacturing' && (
          <section className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-200 dark:border-orange-800/30">
            <h3 className="text-sm font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-4 pb-2 border-b border-orange-200 dark:border-orange-900/50">
              🏭 Manufacturing Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkippableField label="Factory Name" field="plant_name" value={formData.manufacturing.plant_name} onChange={(f, v) => handleGroupChange('manufacturing', f, v)} />
              <SkippableField label="License No." field="manufacturing_license" value={formData.manufacturing.manufacturing_license} onChange={(f, v) => handleGroupChange('manufacturing', f, v)} />
              <SkippableField label="Production Capacity" field="production_capacity" value={formData.manufacturing.production_capacity} onChange={(f, v) => handleGroupChange('manufacturing', f, v)} />
              <SkippableField label="No. of Plants" field="no_of_plants" type="number" value={formData.manufacturing.no_of_plants} onChange={(f, v) => handleGroupChange('manufacturing', f, v)} />
            </div>
          </section>
        )}

        {account_type === 'franchise' && (
          <section className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-2xl border border-purple-200 dark:border-purple-800/30">
            <h3 className="text-sm font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4 pb-2 border-b border-purple-200 dark:border-purple-900/50">
              🤝 Franchise Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkippableField label="Parent Brand Name" field="parent_brand" value={formData.franchise.parent_brand} onChange={(f, v) => handleGroupChange('franchise', f, v)} />
              <SkippableField label="Agreement No." field="agreement_number" value={formData.franchise.agreement_number} onChange={(f, v) => handleGroupChange('franchise', f, v)} />
              <SkippableField label="Royalty %" field="royalty_percentage" type="number" value={formData.franchise.royalty_percentage} onChange={(f, v) => handleGroupChange('franchise', f, v)} />
              <SkippableField label="Total Outlets" field="total_outlets" type="number" value={formData.franchise.total_outlets} onChange={(f, v) => handleGroupChange('franchise', f, v)} />
            </div>
          </section>
        )}

        {account_type === 'enterprise' && (
          <section className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800/30">
            <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 pb-2 border-b border-indigo-200 dark:border-indigo-900/50">
              🌐 Enterprise Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkippableField label="CIN Number" field="cin" value={formData.enterprise.cin} onChange={(f, v) => handleGroupChange('enterprise', f, v)} />
              <SkippableField label="Parent Company" field="parent_company" value={formData.enterprise.parent_company} onChange={(f, v) => handleGroupChange('enterprise', f, v)} />
              <SkippableField label="Total Employees (India)" field="total_employees_india" type="number" value={formData.enterprise.total_employees_india} onChange={(f, v) => handleGroupChange('enterprise', f, v)} />
              <SkippableField label="Existing ERP" field="existing_erp" value={formData.enterprise.existing_erp} onChange={(f, v) => handleGroupChange('enterprise', f, v)} />
            </div>
          </section>
        )}

        {account_type === 'wholesale' && (
          <section className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-2xl border border-rose-200 dark:border-rose-800/30">
            <h3 className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-4 pb-2 border-b border-rose-200 dark:border-rose-900/50">
              📦 Wholesale Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkippableField label="FSSAI / Drug License" field="fssai_license" value={formData.wholesale.fssai_license} onChange={(f, v) => handleGroupChange('wholesale', f, v)} />
              <SkippableField label="IEC Code" field="iec_code" value={formData.wholesale.iec_code} onChange={(f, v) => handleGroupChange('wholesale', f, v)} />
              <SkippableField label="Retailers Served" field="retailers_served_count" type="number" value={formData.wholesale.retailers_served_count} onChange={(f, v) => handleGroupChange('wholesale', f, v)} />
              <SkippableField label="No. of Warehouses" field="no_of_warehouses" type="number" value={formData.wholesale.no_of_warehouses} onChange={(f, v) => handleGroupChange('wholesale', f, v)} />
            </div>
          </section>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onPrev}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white px-6 py-3 font-bold transition-colors"
          >
            ← Back
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkipAll}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Skip All
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Saving...' : 'Save & Continue →'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
