import React, { useState } from 'react';
import { User, Phone, Mail, Lock, Building, MapPin, Tag, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTenant } from '../../hooks/useTenant';

const BUSINESS_TYPES = [
  'Grocery/Kirana Store',
  'Electronics & Appliances',
  'Garments & Apparel',
  'Pharmacy / Medical',
  'Hardware & Paints',
  'Mall / Supermarket',
  'FMCG Distribution',
  'Manufacturing Plant',
  'Services / Agency',
  'Other'
];

export default function Step2BasicInfo({ formData, updateData, onNext, onPrev }) {
  const { registerNewCompany, loading: tenantLoading } = useTenant();
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  const handleChange = (e) => {
    updateData({ [e.target.name]: e.target.value });
  };

  const handleSendOTP = (e) => {
    e.preventDefault();
    if (!formData.admin_mobile || formData.admin_mobile.length < 10) {
      return toast.error("Enter a valid 10-digit mobile number");
    }
    // Mocking Firebase Phone Auth for UI
    setOtpSent(true);
    toast.success(`OTP sent to +91 ${formData.admin_mobile}`);
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (otp.length === 6) {
      setOtpVerified(true);
      toast.success("Mobile number verified successfully!");
    } else {
      toast.error("Invalid OTP");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.admin_name) return toast.error("Admin Name is required");
    if (!formData.admin_mobile) return toast.error("Mobile Number is required");
    if (!formData.email) return toast.error("Email is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (formData.password !== formData.confirm_password) return toast.error("Passwords do not match");
    if (!formData.business_name) return toast.error("Business Name is required");
    if (!formData.business_type) return toast.error("Business Type is required");
    if (!formData.city) return toast.error("Primary City is required");
    
    if (!otpVerified && process.env.NODE_ENV === 'production') {
       return toast.error("Please verify your mobile number first");
    }

    setLoading(true);
    try {
      // Call registerNewCompany from firebase API
      // We pass the new fields to registerNewCompany so it passes them to registerTenant
      const response = await registerNewCompany({
        companyName: formData.business_name,
        gstin: "",
        email: formData.email,
        password: formData.password,
        phone: formData.admin_mobile,
        // Extension for the new Onboarding schema
        account_type: formData.account_type,
        business_type: formData.business_type,
        admin_name: formData.admin_name,
        city: formData.city
      });

      if (response && response.success) {
        toast.success("Account created successfully!");
        // Update the form data with the generated ID if we want to use it later
        updateData({ generated_tenant_id: response.companyId });
        onNext();
      } else {
        toast.error("Failed to create account. Please try again.");
      }
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          BASIC INFORMATION
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          This is required to set up your admin dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Admin Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Admin Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                name="admin_name"
                value={formData.admin_name}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="e.g. Anand Sharma"
                required
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                  name="admin_mobile"
                  value={formData.admin_mobile}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="9876543210"
                  maxLength={10}
                  disabled={otpVerified}
                  required
                />
              </div>
              {!otpVerified && (
                <button 
                  type="button"
                  onClick={handleSendOTP}
                  className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  Get OTP
                </button>
              )}
            </div>
            
            {/* OTP Section */}
            {otpSent && !otpVerified && (
              <div className="flex gap-2 mt-2 animate-fade-up">
                <input 
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl py-2 px-4 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                />
                <button 
                  type="button"
                  onClick={handleVerifyOTP}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl font-bold transition-colors"
                >
                  Verify
                </button>
              </div>
            )}
            {otpVerified && (
              <p className="text-emerald-500 text-xs font-bold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-4 h-4" /> Number Verified
              </p>
            )}
          </div>
        </div>

        {/* Credentials */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase">Email Address (Login ID) *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="admin@company.com"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Confirm Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                name="confirm_password"
                type="password"
                value={formData.confirm_password}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="••••••••"
                required
              />
            </div>
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-800" />

        {/* Business Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Business / Shop Name *</label>
            <div className="relative">
              <Building className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="e.g. Vogats Retail"
                required
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Business Category *</label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <select 
                name="business_type"
                value={formData.business_type}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none" 
                required
              >
                <option value="">Select Category</option>
                {BUSINESS_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Primary City / Location *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="e.g. Mumbai"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onPrev}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white px-6 py-3 font-bold transition-colors"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {loading ? 'Creating Account...' : 'Verify & Continue →'}
          </button>
        </div>
      </form>
    </div>
  );
}
