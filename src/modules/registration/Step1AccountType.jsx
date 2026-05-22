import React from 'react';
import { Store, Building2, Factory, Network, Globe2, Package } from 'lucide-react';

const ACCOUNT_TYPES = [
  {
    id: 'small_shop',
    title: 'Small / Medium Shop',
    desc: '1–5 Staff, 1 Location',
    icon: Store,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  {
    id: 'company',
    title: 'Company / Pvt Ltd',
    desc: '5–500 Staff',
    icon: Building2,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20'
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing / Factory',
    desc: 'Production + Sales',
    icon: Factory,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20'
  },
  {
    id: 'franchise',
    title: 'Franchise / Chain',
    desc: 'Multi-Branch',
    icon: Network,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20'
  },
  {
    id: 'enterprise',
    title: 'MNC / Enterprise',
    desc: '500+ Staff',
    icon: Globe2,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20'
  },
  {
    id: 'wholesale',
    title: 'Wholesaler / Distributor',
    desc: 'B2B & Bulk',
    icon: Package,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20'
  }
];

export default function Step1AccountType({ formData, updateData, onNext }) {
  const handleSelect = (id) => {
    updateData({ account_type: id });
  };

  return (
    <div className="animate-fade-up">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">
          KAISA BUSINESS HAI AAPKA?
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Select your business type to customize your EasyBMT experience
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {ACCOUNT_TYPES.map(type => {
          const Icon = type.icon;
          const isSelected = formData.account_type === type.id;
          return (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={`text-left p-6 rounded-2xl border-2 transition-all duration-200 ${
                isSelected 
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg shadow-indigo-500/10' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${type.bg}`}>
                <Icon className={`w-6 h-6 ${type.color}`} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                {type.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {type.desc}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30"
        >
          Continue Setup →
        </button>
      </div>
    </div>
  );
}
