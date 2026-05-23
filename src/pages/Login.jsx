import React, { useState } from "react";
import { useTheme } from "next-themes";
import { Link } from "react-router-dom";
import { Mail, Lock, Building2, User, Loader2, ShieldAlert, ArrowRight, Eye, EyeOff, ShieldCheck, Moon, Sun } from "lucide-react";
import { staffLogin, ownerLogin, prePopulateLoginCache } from "@/modules/auth/authService";
import { setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth } from "@/firebase/config";
import { base44 } from "@/api/base44Client";

export default function Login() {
  const [isStaff, setIsStaff] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [userCode, setUserCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    localStorage.clear();
    try {
      let resolvedIsStaff = isStaff;
      let resolvedEmail = email.trim();
      let resolvedCompanyId = companyId.trim();
      let resolvedUserCode = userCode.trim();

      // Smart detection: If they entered an email in any field, it must be an Admin login
      if (resolvedCompanyId.includes("@")) {
        resolvedEmail = resolvedCompanyId;
        resolvedIsStaff = false;
      } else if (resolvedUserCode.includes("@")) {
        resolvedEmail = resolvedUserCode;
        resolvedIsStaff = false;
      }

      if (resolvedIsStaff) {
        if (!resolvedCompanyId || !resolvedUserCode || !password) {
          throw new Error("Please enter Company ID, User Code, and Password.");
        }
        await staffLogin(resolvedCompanyId, resolvedUserCode, password);
      } else {
        if (!resolvedEmail || !password) {
          throw new Error("Please enter your registered Email and Password.");
        }
        await ownerLogin(resolvedEmail, password);
      }
      window.location.href = "/";
    } catch (err) {
      let errorMessage = err.message || "Invalid credentials. Please try again.";
      // Make Firebase errors more professional and user-friendly
      if (errorMessage.includes("auth/invalid-credential") || errorMessage.includes("auth/user-not-found") || errorMessage.includes("auth/wrong-password")) {
        errorMessage = "Incorrect User ID or Password. Please check your credentials and try again.";
      } else if (errorMessage.includes("auth/too-many-requests")) {
        errorMessage = "Too many failed login attempts. Please try again later.";
      } else if (errorMessage.includes("auth/network-request-failed")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (errorMessage.includes("auth/invalid-email")) {
        errorMessage = "The email address is badly formatted. Please enter a valid email.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    localStorage.clear();
    try {
      await setPersistence(auth, browserLocalPersistence);
      const user = await base44.auth.loginWithProvider("google", null);
      const { query, collection, where, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/firebase/config");
      let q = query(collection(db, "companies"), where("owner_uid", "==", user.uid));
      let querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        q = query(collection(db, "companies"), where("admin_email", "==", user.email.toLowerCase()));
        querySnapshot = await getDocs(q);
      }
      
      if (!querySnapshot.empty) {
        const companyDoc = querySnapshot.docs[0];
        localStorage.setItem("company_id", companyDoc.id);
        localStorage.setItem("user_code", "ADMIN-001");
        await prePopulateLoginCache(user, companyDoc.id, "ADMIN-001");
        window.location.href = "/";
      } else {
        await base44.auth.logout();
        throw new Error("No company workspace found for this Google account. Please register first.");
      }
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
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
              Enterprise Billing & <br/><span className="text-[#E8721C]">Management.</span>
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
            <h2 className="text-3xl font-black text-[#111118] dark:text-white tracking-tight mb-2 transition-colors duration-300">Welcome back</h2>
            <p className="text-[#7A7A8C] dark:text-[#8A8A9E] font-medium transition-colors duration-300">Please enter your details to sign in.</p>
          </div>

          <p className="text-center text-[15px] text-[#3A3A4A] dark:text-[#D1D1E0] font-bold mb-4 transition-colors duration-300">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#E8721C] font-bold hover:text-[#D4641A] transition-colors">
              Create workspace
            </Link>
          </p>

          {/* Role Toggle */}
          <div className="flex p-1 bg-[#F0F0F6] dark:bg-[#1A1A28] rounded-xl mb-8 border border-[#E8E8EE] dark:border-[#2A2A3A] transition-colors duration-300">
            <button
              type="button"
              onClick={() => setIsStaff(false)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${!isStaff ? 'bg-white dark:bg-[#2A2A3A] text-[#111118] dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-[#7A7A8C] dark:text-[#8A8A9E] hover:text-[#111118] dark:hover:text-white'}`}
            >
              <Building2 className="w-4 h-4" /> Administrator
            </button>
            <button
              type="button"
              onClick={() => setIsStaff(true)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${isStaff ? 'bg-white dark:bg-[#2A2A3A] text-[#111118] dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-[#7A7A8C] dark:text-[#8A8A9E] hover:text-[#111118] dark:hover:text-white'}`}
            >
              <User className="w-4 h-4" /> Staff Member
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] dark:bg-[#3A1313] border border-[#EF4444]/20 flex gap-3 animate-in fade-in slide-in-from-top-2">
              <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0" />
              <p className="text-sm font-medium text-[#EF4444]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isStaff ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Company ID</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-[#ADADBE] dark:text-[#5A5A6E] transition-colors duration-300" />
                    </div>
                    <input
                      type="text"
                      required
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                      placeholder="e.g. COMP-1234"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">User Code</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-[#ADADBE] dark:text-[#5A5A6E] transition-colors duration-300" />
                    </div>
                    <input
                      type="text"
                      required
                      value={userCode}
                      onChange={(e) => setUserCode(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                      placeholder="e.g. STAFF-001"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Email Address or Company ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-[#ADADBE] dark:text-[#5A5A6E] transition-colors duration-300" />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                    placeholder="admin@company.com or COMP-1234"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-[#3A3A4A] dark:text-[#D1D1E0] transition-colors duration-300">Password</label>
                {!isStaff && (
                  <Link to="/forgot-password" className="text-sm font-semibold text-[#E8721C] hover:text-[#D4641A] transition-colors">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#ADADBE] dark:text-[#5A5A6E] transition-colors duration-300" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-[#FAFAFA] dark:bg-[#1A1A28] border border-[#DDDDE8] dark:border-[#2A2A3A] rounded-xl focus:ring-2 focus:ring-[#E8721C] focus:border-transparent outline-none transition-all text-[#111118] dark:text-white font-medium placeholder:text-[#ADADBE] dark:placeholder:text-[#5A5A6E]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#ADADBE] hover:text-[#7A7A8C] dark:text-[#5A5A6E] dark:hover:text-[#8A8A9E] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#E8721C] hover:bg-[#D4641A] text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-[#E8721C]/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>Sign In <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
