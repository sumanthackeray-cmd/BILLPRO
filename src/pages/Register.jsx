import React, { useState } from "react";
import { useTheme } from "next-themes";
import { Link, useNavigate } from "react-router-dom";
import { 
  Building2, 
  Mail, 
  Lock, 
  Loader2, 
  ArrowRight, 
  Hash,
  ShieldAlert,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Check,
  Moon,
  Sun
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { ownerLogin } from "@/modules/auth/authService";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/api/firebase";

export default function Register() {
  const navigate = useNavigate();
  const { registerNewCompany, loading, error: tenantError } = useTenant();
  
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // OTP flow states
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const { theme, setTheme } = useTheme();

  const validateGstin = (value) => {
    if (!value) return true;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(value.trim().toUpperCase());
  };

  const getPasswordStrength = (v) => {
    if (!v) return { score: 0, label: 'Enter a strong password', color: 'text-[#ADADBE]', bars: 0 };
    let sc = 0;
    if (v.length >= 8) sc++;
    if (/[A-Z]/.test(v)) sc++;
    if (/[0-9]/.test(v)) sc++;
    if (/[^A-Za-z0-9]/.test(v)) sc++;
    const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong ✓'];
    const colors = ['text-[#EF4444]', 'text-[#EF4444]', 'text-[#F59E0B]', 'text-[#F59E0B]', 'text-[#22C55E]'];
    const barColors = ['bg-[#EF4444]', 'bg-[#EF4444]', 'bg-[#F59E0B]', 'bg-[#F59E0B]', 'bg-[#22C55E]'];
    return { score: sc, label: labels[sc], color: colors[sc], barColor: barColors[sc], bars: sc };
  };

  const pwStrength = getPasswordStrength(password);

  const getFriendlyErrorMessage = (error) => {
    const msg = error?.message || String(error);
    if (msg.includes("internal")) return "An unexpected error occurred. Please try again or contact support.";
    if (msg.includes("unavailable")) return "Service is temporarily unavailable. Please try again later.";
    if (msg.includes("already-in-use")) return "This email is already registered. Please sign in.";
    if (msg.includes("network-request-failed")) return "Network error. Please check your internet connection.";
    return msg;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    localStorage.clear();

    if (!companyName.trim()) return setError("Company Name is required.");
    if (gstin && !validateGstin(gstin)) return setError("Invalid GSTIN format. Example: 27AAPCM1234F1Z5");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setIsProcessing(true);
    try {
      const sendOtpFn = httpsCallable(getFunctions(app), 'sendRegistrationOtp');
      const res = await sendOtpFn({ email: email.trim().toLowerCase() });
      setOtpSent(true);
      
      if (res.data?.developmentOtp) {
        setOtp(res.data.developmentOtp);
        toast({
          title: "Development Mode Active",
          description: "SMTP is not configured. We auto-filled the OTP for you to test registration.",
          duration: 8000,
        });
      } else {
        toast({
          title: "OTP Sent",
          description: `Please check ${email} for the verification code.`,
        });
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length !== 6) {
      return setError("Please enter a valid 6-digit OTP.");
    }

    setIsVerifyingOtp(true);
    try {
      const verifyOtpFn = httpsCallable(getFunctions(app), 'verifyRegistrationOtp');
      await verifyOtpFn({ email: email.trim().toLowerCase(), otp: otp.trim() });
      
      // If OTP verified, proceed with registration
      const response = await registerNewCompany({
        companyName: companyName.trim(),
        gstin: gstin.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        password: password
      });

      if (response && response.success) {
        toast({
          title: "Registration Successful",
          description: "Logging you in and redirecting to setup...",
        });
        await ownerLogin(email.trim().toLowerCase(), password);
        // Redirect directly to settings for setup, avoiding popup or home
        navigate("/settings?tab=company_profile", { replace: true });
      } else {
        setError("Failed to register company. Please try again.");
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err) || "Invalid or expired OTP.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="h-screen w-full flex bg-white dark:bg-[#0B0B0F] text-[#3A3A4A] dark:text-[#D1D1E0] font-sans selection:bg-[#E8721C] selection:text-white transition-colors duration-300 overflow-hidden">
      {/* LEFT PANEL - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden bg-[#F5F5F7] dark:bg-[#111118] border-r border-[#E8E8EE] dark:border-none transition-colors duration-300">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E8721C]/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none translate-x-1/2 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#E8721C]/5 rounded-full blur-[150px] mix-blend-screen pointer-events-none -translate-x-1/3 translate-y-1/3"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8721C] to-[#D4641A] flex items-center justify-center shadow-lg shadow-[#E8721C]/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-[#111118] dark:text-white tracking-tight transition-colors duration-300">EasyBMT</span>
          </div>

          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl md:text-5xl font-black text-[#111118] dark:text-white leading-[1.1] tracking-tight transition-colors duration-300">
              Create your <br/><span className="text-[#E8721C]">Workspace.</span>
            </h1>
            <p className="text-lg text-[#3A3A4A] dark:text-white/70 leading-relaxed font-medium transition-colors duration-300">
              Trusted by modern businesses for smart GST billing, inventory control, and seamless financial management.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-white/5 border border-[#E8E8EE] dark:border-white/10 p-5 rounded-2xl dark:backdrop-blur-sm hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none">
              <h3 className="text-3xl font-black text-[#111118] dark:text-white transition-colors duration-300">50K<span className="text-[#E8721C]">+</span></h3>
              <p className="text-[#7A7A8C] dark:text-white/60 text-sm font-medium mt-1 transition-colors duration-300">Registered Businesses</p>
            </div>
            <div className="bg-white dark:bg-white/5 border border-[#E8E8EE] dark:border-white/10 p-5 rounded-2xl dark:backdrop-blur-sm hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none">
              <h3 className="text-3xl font-black text-[#111118] dark:text-white transition-colors duration-300">₹1000Cr<span className="text-[#E8721C]">+</span></h3>
              <p className="text-[#7A7A8C] dark:text-white/60 text-sm font-medium mt-1 transition-colors duration-300">Billed Monthly</p>
            </div>
            <div className="bg-white dark:bg-white/5 border border-[#E8E8EE] dark:border-white/10 p-5 rounded-2xl dark:backdrop-blur-sm hover:bg-[#FAFAFA] dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none col-span-2 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-3xl font-black text-[#111118] dark:text-white transition-colors duration-300">4.9</h3>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="w-5 h-5 text-[#E8721C] fill-[#E8721C]" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-[#7A7A8C] dark:text-white/60 text-sm font-medium mt-1 transition-colors duration-300">App Rating across all platforms</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[#7A7A8C] dark:text-white/50 text-sm font-medium transition-colors duration-300">
          <p>© {new Date().getFullYear()} EasyBMT Inc.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[#111118] dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#111118] dark:hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Auth Form */}
      <div className="w-full lg:w-[55%] flex flex-col h-screen overflow-y-auto px-6 sm:px-12 md:px-24 relative bg-white dark:bg-[#14141F] transition-colors duration-300">
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 p-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#1A1A28] border border-[#E8E8EE] dark:border-[#2A2A3A] hover:bg-[#E8E8EE] dark:hover:bg-[#2A2A3A] text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors z-50 shadow-sm"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="max-w-[440px] w-full mx-auto my-auto py-12 relative flex-shrink-0">
          
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 mt-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8721C] to-[#D4641A] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-[#111118] dark:text-white tracking-tight transition-colors duration-300">EasyBMT</span>
          </div>

          <div className="mb-8 mt-6">
            <h2 className="text-3xl font-black text-[#111118] dark:text-white tracking-tight mb-2 transition-colors duration-300">Register Business</h2>
            <p className="text-[#7A7A8C] dark:text-[#8A8A9E] font-medium transition-colors duration-300">Start your 14-day free trial. No credit card required.</p>
          </div>

          {(error || tenantError) && (
            <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] dark:bg-[#3A1313] border border-[#EF4444]/20 flex gap-3 animate-in fade-in slide-in-from-top-2">
              <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0" />
              <p className="text-sm font-medium text-[#EF4444]">{error || tenantError}</p>
            </div>
          )}

          <form onSubmit={otpSent ? handleVerifyAndRegister : handleSendOtp} className="space-y-5">
            {/* Business Info */}
            <div className={`space-y-1.5 ${otpSent ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Business Name *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-[#ADADBE] dark:text-[#5A5A6E] transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                  placeholder="e.g. Acme Corporation"
                />
              </div>
            </div>

            <div className={`space-y-1.5 ${otpSent ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">GSTIN <span className="text-[#ADADBE] font-normal">(Optional)</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Hash className="h-5 w-5 text-[#ADADBE] dark:text-[#5A5A6E] transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full pl-11 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E] uppercase"
                  placeholder="27AAPCM1234F1Z5"
                />
              </div>
            </div>

            {/* Admin Info */}
            <div className={`space-y-1.5 ${otpSent ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Admin Email *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#ADADBE] dark:text-[#5A5A6E] transition-colors duration-300" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                  placeholder="admin@company.com"
                />
              </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${otpSent ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#ADADBE] dark:text-[#5A5A6E] transition-colors duration-300" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#ADADBE] hover:text-[#7A7A8C] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Confirm *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Check className="h-5 w-5 text-[#ADADBE] dark:text-[#5A5A6E] transition-colors duration-300" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-11 pr-10 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E] ${confirmPassword && password !== confirmPassword ? 'border-[#EF4444] focus:ring-[#EF4444]' : 'border-[#DDDDE8] dark:border-[#2A2A3A]'}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#ADADBE] hover:text-[#7A7A8C] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {password.length > 0 && !otpSent && (
              <div className="animate-in fade-in slide-in-from-top-1">
                <div className="flex gap-1 mb-1.5">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= pwStrength.bars ? pwStrength.barColor : 'bg-[#E8E8EE] dark:bg-[#2A2A3A]'}`}></div>
                  ))}
                </div>
                <p className={`text-xs font-bold ${pwStrength.color}`}>{pwStrength.label}</p>
              </div>
            )}

            {/* OTP Section */}
            {otpSent && (
              <div className="space-y-1.5 mt-6 p-5 bg-[#F5F5F7] dark:bg-[#1A1A28] rounded-2xl border border-[#E8E8EE] dark:border-[#2A2A3A] animate-in fade-in slide-in-from-bottom-2">
                <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] flex items-center justify-between">
                  <span>Enter OTP Verification Code</span>
                  <button 
                    type="button" 
                    onClick={() => setOtpSent(false)}
                    className="text-xs text-[#E8721C] hover:text-[#D4641A]"
                  >
                    Change Email?
                  </button>
                </label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  className="w-full px-4 py-3 text-center tracking-[1em] font-black text-2xl bg-white dark:bg-[#0B0B0F] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] outline-none transition-all text-[#111118] dark:text-white"
                  placeholder="------"
                  maxLength={6}
                />
                <p className="text-xs text-center text-[#7A7A8C] mt-2">
                  A 6-digit code has been sent to your email.
                </p>
              </div>
            )}

            {!otpSent ? (
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 px-4 bg-[#E8721C] hover:bg-[#D4641A] text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-[#E8721C]/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Continue <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isVerifyingOtp || loading}
                className="w-full py-3.5 px-4 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-[#22C55E]/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {isVerifyingOtp || loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Verify & Complete Registration <CheckCircle2 className="w-5 h-5" /></>
                )}
              </button>
            )}
          </form>

          <p className="mt-8 text-center text-[#7A7A8C] dark:text-[#8A8A9E] font-medium transition-colors duration-300">
            Already have an account?{' '}
            <Link to="/login" className="text-[#E8721C] font-bold hover:text-[#D4641A] transition-colors">
              Sign In
            </Link>
          </p>

        </div>
      </div>


    </div>
  );
}
