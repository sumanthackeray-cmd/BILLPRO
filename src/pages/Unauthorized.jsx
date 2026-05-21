import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-red-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 text-center">
        <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 mb-6 shadow-lg shadow-red-500/5">
          <ShieldAlert className="w-12 h-12" />
        </div>
        
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">403 - Access Denied</h1>
        <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
          Your role does not have authorization to access this module. Please contact your system administrator or company owner to request the required permissions.
        </p>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl mb-6 text-left">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Workspace Details</h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">Company ID</span>
              <span className="font-semibold text-slate-300">{localStorage.getItem("company_id") || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500">User Code</span>
              <span className="font-semibold text-slate-300">{localStorage.getItem("user_code") || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Active Role</span>
              <span className="font-semibold text-red-400 uppercase">restricted</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="outline" 
            className="border-slate-800 text-slate-300 hover:bg-slate-800/50 hover:text-white rounded-xl h-11"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button 
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl h-11 border-0 shadow-lg shadow-indigo-500/10"
            asChild
          >
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
