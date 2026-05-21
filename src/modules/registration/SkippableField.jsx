import React from 'react';
import { ToggleRight, ToggleLeft } from 'lucide-react';

export default function SkippableField({ label, field, value, onChange, type = "text", placeholder, options }) {
  // If value is explicitly null, it means the field is skipped
  const isSkipped = value === null;

  const handleToggle = () => {
    if (isSkipped) {
      onChange(field, ""); // Un-skip and set to empty string
    } else {
      onChange(field, null); // Skip
    }
  };

  return (
    <div className="space-y-1.5 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
        <button 
          type="button" 
          onClick={handleToggle}
          className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
            isSkipped 
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' 
              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {isSkipped ? <ToggleLeft className="w-3 h-3" /> : <ToggleRight className="w-3 h-3" />}
          {isSkipped ? 'SKIPPED' : 'INCLUDED'}
        </button>
      </div>
      
      {!isSkipped && (
        <>
          {type === 'select' ? (
            <select 
              value={value || ""}
              onChange={(e) => onChange(field, e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none"
            >
              <option value="">Select option</option>
              {options?.map(opt => (
                <option key={opt.value || opt} value={opt.value || opt}>
                  {opt.label || opt}
                </option>
              ))}
            </select>
          ) : (
            <input 
              type={type}
              value={value || ""}
              onChange={(e) => onChange(field, e.target.value)}
              placeholder={placeholder}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          )}
        </>
      )}
    </div>
  );
}
