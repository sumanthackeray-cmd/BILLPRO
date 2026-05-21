import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfileCompletionBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completion, setCompletion] = useState(100);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!user?.companyId) return;

    const checkCompletion = async () => {
      try {
        const docRef = doc(db, `companies/${user.companyId}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          let score = 10; // Basic details

          if (data.legal?.gstin) score += 10;
          if (data.legal?.pan) score += 5;
          if (data.legal?.entity_type) score += 5;
          
          if (data.address?.line1) score += 10;
          
          if (data.contact?.business_email) score += 5;
          if (data.contact?.business_phone) score += 5;
          
          if (data.banking?.bank_name) score += 5;
          if (data.banking?.account_number) score += 5;
          if (data.banking?.upi_id) score += 10;

          // Cap at 100
          setCompletion(Math.min(score, 100));
        }
      } catch (err) {
        console.error("Failed to fetch completion status", err);
      }
    };

    checkCompletion();
  }, [user]);

  if (completion >= 80 || !isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 shadow-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-up text-white">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Your Profile is {completion}% Complete</h3>
          <p className="text-amber-50 text-sm">Unlock all ERP features by completing your business profile.</p>
        </div>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          onClick={() => navigate('/settings?tab=company_profile')}
          className="flex-1 sm:flex-none bg-white text-amber-600 px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
        >
          Complete Now <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
