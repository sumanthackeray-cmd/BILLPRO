import React, { useMemo } from 'react';
import { PartyPopper, CheckCircle2, Circle, AlertTriangle, ArrowRight } from 'lucide-react';

export default function Step5Welcome({ formData, onFinish }) {
  
  // Calculate profile completion based on Step 3 filled fields (rudimentary logic)
  const completionPercentage = useMemo(() => {
    let score = 10; // Base score for basic info (admin, email, business name)
    if (formData.legal?.gstin) score += 10;
    if (formData.legal?.pan) score += 5;
    if (formData.legal?.entity_type) score += 5;
    
    if (formData.address?.line1) score += 10;
    
    if (formData.contact?.business_email) score += 5;
    if (formData.contact?.business_phone) score += 5;
    
    if (formData.banking?.bank_name) score += 5;
    if (formData.banking?.account_number) score += 5;
    if (formData.banking?.upi_id) score += 10;

    return Math.min(score, 100);
  }, [formData]);

  const checklist = [
    { label: 'Basic Info & Admin Account', done: true },
    { label: 'Plan Subscription', done: true },
    { label: 'Add Your First Product', done: false },
    { label: 'Set Up First Branch', done: false },
    { label: 'Add Staff Users', done: false },
    { label: 'Configure GST Settings', done: false },
    { label: 'Upload Business Logo', done: false },
    { label: 'Link Bank / UPI Details', done: !!formData.banking?.upi_id || !!formData.banking?.account_number },
  ];

  return (
    <div className="animate-fade-up max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <PartyPopper className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          🎉 WELCOME TO EASYBMT!
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-300 font-bold">
          {formData.business_name || "Your Company"}
        </p>
        <p className="text-slate-500 dark:text-slate-400 font-mono mt-1">
          Company ID: {formData.generated_tenant_id || "PENDING"}
        </p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 mb-8">
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-5 h-5" /> Account Created Successfully
          </div>
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-5 h-5" /> {formData.plan === 'starter' ? 'Free Forever Plan Active' : '14 Days PRO Trial Active'}
          </div>
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 font-bold">
            <AlertTriangle className="w-5 h-5" /> Profile {completionPercentage}% Complete
          </div>
        </div>

        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">
          SETUP CHECKLIST
        </h3>
        <div className="space-y-3">
          {checklist.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm">
              {item.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 dark:text-slate-700 shrink-0" />
              )}
              <span className={item.done ? "text-slate-700 dark:text-slate-300 line-through opacity-70" : "text-slate-700 dark:text-slate-300 font-medium"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onFinish}
          className="text-slate-500 hover:text-slate-900 dark:hover:text-white px-6 py-3 font-bold transition-colors order-2 sm:order-1"
        >
          Complete Setup Later
        </button>
        <button
          onClick={onFinish}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 order-1 sm:order-2"
        >
          GO TO DASHBOARD <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
