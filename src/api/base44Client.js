import { auth, db, storage, googleProvider } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const getUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be authenticated to perform this operation.");
  }
  return user.uid;
};

const getCollectionName = (entityName) => {
  const mapping = {
    Invoice: 'invoices',
    Product: 'products',
    Customer: 'customers',
    Purchase: 'purchases',
    Loan: 'loans',
    Expense: 'expenses',
    ShopSettings: 'shopSettings',
    UserSubscription: 'userSubscriptions'
  };
  return mapping[entityName] || entityName.toLowerCase();
};

const createFirebaseEntityRepository = (entityName) => {
  return {
    list: async (orderByStr, limitNum) => {
      const uid = getUserId();
      const colName = getCollectionName(entityName);
      
      const q = query(collection(db, colName), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      let items = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      
      // Client-side sorting to avoid requiring Firestore composite indexes
      if (orderByStr) {
        const isDesc = orderByStr.startsWith('-');
        const field = isDesc ? orderByStr.substring(1) : orderByStr;
        items.sort((a, b) => {
          let valA = a[field];
          let valB = b[field];
          if (valA === undefined) return 1;
          if (valB === undefined) return -1;
          
          if (valA?.toDate) valA = valA.toDate();
          if (valB?.toDate) valB = valB.toDate();
          
          if (typeof valA === 'string') {
            return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
          }
          return isDesc ? valB - valA : valA - valB;
        });
      }
      
      if (limitNum) {
        items = items.slice(0, limitNum);
      }
      return items;
    },
    create: async (data) => {
      const uid = getUserId();
      const colName = getCollectionName(entityName);
      
      const docData = {
        ...data,
        userId: uid,
        created_date: data.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, colName), docData);
      return { id: docRef.id, ...docData };
    },
    update: async (id, data) => {
      const uid = getUserId();
      const colName = getCollectionName(entityName);
      const docRef = doc(db, colName, id);
      
      const docData = {
        ...data,
        updated_date: new Date().toISOString()
      };
      
      await updateDoc(docRef, docData);
      return { id, ...docData };
    },
    delete: async (id) => {
      const uid = getUserId();
      const colName = getCollectionName(entityName);
      const docRef = doc(db, colName, id);
      
      await deleteDoc(docRef);
      return { id };
    }
  };
};

const entitiesProxy = new Proxy({}, {
  get: (target, name) => {
    if (!(name in target)) {
      target[name] = createFirebaseEntityRepository(name);
    }
    return target[name];
  }
});

const mockInvokeLLM = async ({ prompt, response_json_schema }) => {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("ocr") || lowerPrompt.includes("bill") || lowerPrompt.includes("invoice") || lowerPrompt.includes("extract")) {
    return {
      vendor_name: "Mahadev Traders",
      vendor_gstin: "27AAPCM1234F1Z5",
      vendor_phone: "9876543210",
      vendor_invoice_no: "INV-2026-089",
      date: "2026-05-20",
      items: [
        { name: "Premium Basmati Rice 10kg", hsn: "1006", unit: "BAG", qty: 5, rate: 850, gst_rate: 5 },
        { name: "Refined Sunflower Oil 1L", hsn: "1512", unit: "LTR", qty: 24, rate: 120, gst_rate: 12 },
        { name: "Tata Salt 1kg", hsn: "2501", unit: "PKT", qty: 50, rate: 22, gst_rate: 0 }
      ],
      grand_total: 8225
    };
  } else if (prompt.includes("forecast")) {
    return {
      forecast_months: [
        { month: "June 26", predicted: 120000, reasoning: "Historical trends indicate post-season sales bump and improved customer retention." },
        { month: "July 26", predicted: 145000, reasoning: "Anticipated increase in category demands based on customer onboarding." },
        { month: "August 26", predicted: 160000, reasoning: "Peak demand window and predicted resolution of low-stock items." }
      ],
      insights: [
        { type: "positive", icon: "📈", title: "Rising Demand", text: "Demand for top categories is projected to grow by 15% next month." },
        { type: "warning", icon: "⚠️", title: "Inventory Risk", text: "Some key products might run out of stock if reordered late." },
        { type: "info", icon: "💡", title: "Target Regulars", text: "Focusing marketing efforts on 'Regular' customers can boost sales by 8%." }
      ]
    };
  } else {
    return {
      insights: [
        { icon: "💰", type: "positive", title: "Strong Revenue Performance", text: "Revenue is solid. Focus on maintaining current growth." },
        { icon: "⏳", type: "warning", title: "Overdue Invoices Alert", text: "Follow up on overdue invoices to improve cash flow." },
        { icon: "📦", type: "danger", title: "Low Stock warning", text: "Several items are running low. Consider restocking soon." },
        { icon: "⭐", type: "info", title: "Customer Retention Opportunity", text: "High-value customers represent a significant portion of your business." },
        { icon: "🎯", type: "positive", title: "Top Category Focus", text: "Your leading categories continue to drive maximum profitability." },
        { icon: "📣", type: "info", title: "Re-engage Churn Risk", text: "Reach out to churn risk customers with targeted promotion emails." }
      ]
    };
  }
};

export const base44 = {
  entities: entitiesProxy,
  auth: {
    me: async () => {
      return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          if (user) {
            resolve({
              id: user.uid,
              email: user.email,
              full_name: user.displayName || user.email.split('@')[0],
              displayName: user.displayName
            });
          } else {
            const err = new Error("Unauthorized");
            err.status = 401;
            reject(err);
          }
        });
      });
    },
    loginViaEmailPassword: async (email, password) => {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      localStorage.setItem('base44_access_token', token);
      return { access_token: token };
    },
    loginWithProvider: async (provider, redirectUrl) => {
      if (provider === 'google') {
        const userCredential = await signInWithPopup(auth, googleProvider);
        const token = await userCredential.user.getIdToken();
        localStorage.setItem('base44_access_token', token);
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
        return userCredential.user;
      }
      throw new Error(`Provider ${provider} not supported`);
    },
    register: async ({ email, password }) => {
      await createUserWithEmailAndPassword(auth, email, password);
      return { success: true };
    },
    verifyOtp: async ({ email, otpCode }) => {
      // With Firebase Auth, standard registration is complete upon createUserWithEmailAndPassword.
      // Return a simulated success response to satisfy client verification expectations.
      return { access_token: "firebase-success" };
    },
    resendOtp: async (email) => {
      return { success: true };
    },
    setToken: (token) => {
      localStorage.setItem('base44_access_token', token);
    },
    resetPasswordRequest: async (email) => {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    },
    resetPassword: async ({ resetToken, newPassword }) => {
      return { success: true };
    },
    logout: async (redirectUrl) => {
      await signOut(auth);
      localStorage.removeItem('base44_access_token');
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        window.location.reload();
      }
    },
    redirectToLogin: (redirectUrl) => {
      window.location.href = '/login';
    }
  },
  integrations: {
    Core: {
      InvokeLLM: mockInvokeLLM,
      SendEmail: async (params) => {
        console.log("Mock SendEmail called with:", params);
        return { success: true };
      },
      UploadFile: async ({ file }) => {
        const uid = getUserId();
        const fileRef = ref(storage, `users/${uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        const file_url = await getDownloadURL(snapshot.ref);
        return { file_url };
      }
    }
  }
};
