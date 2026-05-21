import React from 'react';
import { Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PLANS = [
  {
    id: 'starter',
    name: 'STARTER',
    price: 'Free Forever',
    features: ['1 User', '1 Branch', '10 Bills/mo', 'Basic POS', 'GST Billing', 'Basic Reports'],
    missing: ['No Staff Mgmt', 'No RBAC'],
    buttonText: 'START FREE',
    badge: null
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '₹199/month',
    features: ['1 Users', '1 Branches', '200 Bills/mo', 'POS + Inv + Accounting', 'Advanced Reports', 'Staff Mgmt', 'Basic RBAC'],
    missing: [],
    buttonText: '14 Day Free Try',
    badge: '⭐ RECOMMENDED'
  },
  {
    id: 'business',
    name: 'BUSINESS',
    price: '₹2,999/month',
    features: ['5 Users', '2 Branches', '500 Bills/mo', 'Full ERP + HR + CRM', 'Full Suite', 'RBAC', 'Advanced Analytics'],
    missing: [],
    buttonText: '14 Day Free Try',
    badge: '🏢 SCALE'
  },
  {
    id: 'enterprise',
    name: 'ENTERPRISE',
    price: 'Custom Price',
    features: ['Unlimited Users', 'Unlimited Branches', 'Unlimited Bills', 'SAP Level ERP', 'Custom Dev', 'Full RBAC', 'Dedicated Support'],
    missing: [],
    buttonText: 'CONTACT US',
    badge: '🌐 GLOBAL'
  }
];

export default function Step4PlanSelection({ formData, updateData, onNext, onPrev }) {
  const handleSelectPlan = (planId) => {
    // In a real app, this would redirect to Stripe/Razorpay if it's a paid plan without trial
    if (planId === 'enterprise') {
      toast.success("Our sales team will contact you shortly!");
      // Proceed anyway
    } else {
      toast.success(`${planId.toUpperCase()} plan selected. 14-Day trial activated!`);
    }
    
    // Save plan (or pass it to backend API if it's a real call)
    updateData({ plan: planId });
    onNext();
  };

  return (
    <div className="animate-fade-up">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          APNA PLAN CHUNIYE
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Choose the right plan for your business needs. Upgrade anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <div key={plan.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col relative shadow-sm hover:shadow-xl transition-all duration-300">
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                {plan.badge}
              </div>
            )}
            
            <div className="text-center mb-6 pt-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">{plan.name}</h3>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{plan.price}</div>
            </div>

            <div className="flex-1 space-y-3 mb-8">
              {plan.features.map(f => (
                <div key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
              {plan.missing.map(m => (
                <div key={m} className="flex items-start gap-2 text-sm text-slate-400">
                  <span className="w-4 h-4 flex items-center justify-center font-bold text-red-400 shrink-0">×</span>
                  <span className="line-through opacity-70">{m}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSelectPlan(plan.id)}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                plan.id === 'pro' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white'
              }`}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={onPrev}
          className="text-slate-500 hover:text-slate-900 dark:hover:text-white px-6 py-2 font-bold transition-colors"
        >
          ← Back to Business Details
        </button>
      </div>
    </div>
  );
}
