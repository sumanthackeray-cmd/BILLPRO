// @ts-nocheck
import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { auth, db } from '@/api/firebase';
import { initTokenManager } from '@/firebase/tokenManager';


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('base44_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return !!localStorage.getItem('base44_access_token');
    } catch {
      return false;
    }
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(() => {
    try {
      return !localStorage.getItem('base44_cached_user');
    } catch {
      return true;
    }
  });
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(() => {
    try {
      return !localStorage.getItem('base44_cached_user');
    } catch {
      return true;
    }
  });
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(() => {
    try {
      return !!localStorage.getItem('base44_cached_user');
    } catch {
      return false;
    }
  });
  const [appPublicSettings, setAppPublicSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('base44_cached_user');
      return cached ? { id: appParams.appId || 'mock-app-id', public_settings: {} } : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Never leave the app on a blank screen if Firebase auth is slow/unreachable
    const authBootTimeout = setTimeout(() => {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }, 10000);

    // Initialize token session management (idle timeout, concurrency monitoring)
    const cleanupTokenManager = initTokenManager();

    // Listen for Firebase Auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      const hasCachedUser = !!localStorage.getItem('base44_cached_user');
      if (!hasCachedUser) {
        setIsLoadingPublicSettings(true);
        setIsLoadingAuth(true);
      }
      setAuthError(null);
      
      const publicSettings = { id: appParams.appId || 'mock-app-id', public_settings: {} };
      setAppPublicSettings(publicSettings);
      
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('base44_access_token', token);

          // Tenant isolation: always resolve company_id for the CURRENT firebaseUser.uid.
          // Never trust previously cached localStorage.company_id (it can belong to another admin).
          const tokenResult = await firebaseUser.getIdTokenResult(true);
          const claimedCompanyId = tokenResult.claims?.company_id;
          let resolvedCompanyId = claimedCompanyId ? String(claimedCompanyId) : null;

          if (!resolvedCompanyId) {
            const { doc, getDoc, query, collection, where, getDocs } = await import("firebase/firestore");
            
            // Fallback 1: Safely validate existing cached company_id for this specific user
            const cachedCompanyId = localStorage.getItem('company_id');
            if (cachedCompanyId) {
              const userDocSnap = await getDoc(doc(db, `companies/${cachedCompanyId}/users`, firebaseUser.uid));
              if (userDocSnap.exists()) {
                resolvedCompanyId = cachedCompanyId;
              }
            }

            // Fallback 2: Check if they are the owner via owner_uid
            if (!resolvedCompanyId) {
              const q = query(collection(db, "companies"), where("owner_uid", "==", firebaseUser.uid));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                resolvedCompanyId = querySnapshot.docs[0].id;
              }
            }

            // Fallback 3: Check if they are the owner via admin_email
            if (!resolvedCompanyId && firebaseUser.email) {
              const emailQ = query(collection(db, "companies"), where("admin_email", "==", firebaseUser.email.toLowerCase()));
              const emailSnap = await getDocs(emailQ);
              if (!emailSnap.empty) {
                resolvedCompanyId = emailSnap.docs[0].id;
              }
            }
          }

          if (resolvedCompanyId) {
            localStorage.setItem('company_id', resolvedCompanyId);
          } else {
            localStorage.removeItem('company_id');
          }


          // Fetch all authentication resources in parallel (Users, Roles, Permissions, field access maps)
          let usersList = [], roles = [], permissions = [], sensitiveFieldAccess = [];
          try {
            [usersList, roles, permissions, sensitiveFieldAccess] = await Promise.all([
              base44.entities.User.list(),
              base44.entities.Role.list(),
              base44.entities.Permission.list(),
              base44.entities.SensitiveFieldAccess.list()
            ]);
          } catch (e) {
            console.error("Failed to load auth resources:", e);
            setAuthError({ type: 'load_failed', message: 'Failed to load authorization data. Please check your connection and reload.' });
            setIsLoadingPublicSettings(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            return;
          }

          let userRecord = usersList.find(u => u.id === firebaseUser.uid);
          
          if (!userRecord) {
            // First registered user is the owner, others are cashiers
            const isFirstUser = usersList.length === 0;
            const defaultRole = isFirstUser ? "role-owner" : "role-cashier";
            const defaultSalary = isFirstUser ? 150000 : 18000;
            
            userRecord = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              role_id: defaultRole,
              branch_id: null,
              is_active: true,
              assigned_by: null,
              assigned_at: new Date().toISOString(),
              salary: defaultSalary
            };
            
            try {
              await base44.entities.User.create(userRecord);
            } catch (e) {
              console.error("Error creating user record:", e);
            }
          }
          
          // Check if active status is false
          if (userRecord.is_active === false) {
            setAuthError({ type: 'user_not_registered', message: 'Your account has been deactivated by the administrator.' });
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('base44_access_token');
            localStorage.removeItem('base44_cached_user');
            localStorage.removeItem(`rbac_profile_${firebaseUser.uid}`);
            await auth.signOut();
            setIsLoadingPublicSettings(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            return;
          }

          const matchingRole = roles.find(r => r.id === userRecord.role_id) || roles.find(r => r.role_name === 'cashier') || { role_name: 'cashier', hierarchy_level: 7 };
          const matchingPermission = permissions.find(p => p.role_id === userRecord.role_id) || {
            permissions: {
              pos: { view: true, create: true, edit: false, delete: false, export: false },
              inventory: { view: false, create: false, edit: false, delete: false, export: false },
              accounting: { view: false, create: false, edit: false, delete: false, export: false },
              warehouse: { view: false, create: false, edit: false, delete: false, export: false },
              hr: { view: false, create: false, edit: false, delete: false, export: false, attendance: true, payslip: true },
              reports: { view: false, create: false, edit: false, delete: false, export: false }
            }
          };
          const matchingSensitiveFieldAccess = sensitiveFieldAccess.find(s => s.role_id === userRecord.role_id) || {
            fields: { purchase_price: false, profit_margin: false, salary: false }
          };

          const rbacProfile = {
            role_name: matchingRole.role_name,
            hierarchy_level: matchingRole.hierarchy_level,
            permissions: matchingPermission.permissions,
            sensitive_fields: matchingSensitiveFieldAccess.fields,
            is_active: userRecord.is_active
          };

          // Cache profile for base44Client
          localStorage.setItem(`rbac_profile_${firebaseUser.uid}`, JSON.stringify(rbacProfile));

          const currentUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: userRecord.name || firebaseUser.displayName,
            full_name: userRecord.name || firebaseUser.displayName || firebaseUser.email.split('@')[0],
            displayName: userRecord.name || firebaseUser.displayName,
            role: matchingRole.role_name,
            role_id: userRecord.role_id,
            hierarchy_level: matchingRole.hierarchy_level,
            permissions: matchingPermission.permissions,
            sensitive_fields: matchingSensitiveFieldAccess.fields,
            is_active: userRecord.is_active,
            branch_id: userRecord.branch_id,
            salary: userRecord.salary,
            phone: userRecord.contact_mobile || userRecord.phone || userRecord.mobile || firebaseUser.phoneNumber || "",
            contact_mobile: userRecord.contact_mobile || "",
            contact_email: userRecord.contact_email || userRecord.email || firebaseUser.email || "",
            user_code: userRecord.user_code || localStorage.getItem('user_code') || "",
          };

          localStorage.setItem('base44_cached_user', JSON.stringify(currentUser));
          setUser(currentUser);
          setIsAuthenticated(true);
        } catch (err) {
          console.error("RBAC Profile load failed:", err);
          const currentUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            full_name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            displayName: firebaseUser.displayName,
            role: 'cashier',
            hierarchy_level: 7,
            permissions: {
              pos: { view: true, create: true },
              inventory: { view: false },
              accounting: { view: false },
              warehouse: { view: false },
              hr: { view: false },
              reports: { view: false }
            },
            sensitive_fields: { purchase_price: false, profit_margin: false, salary: false },
            is_active: true
          };
          localStorage.setItem('base44_cached_user', JSON.stringify(currentUser));
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('base44_access_token');
        localStorage.removeItem('base44_cached_user');
      }
      
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      clearTimeout(authBootTimeout);
    });

    return () => {
      clearTimeout(authBootTimeout);
      cleanupTokenManager();
      unsubscribe();
    };
  }, []);

  const logout = async (shouldRedirect = true) => {
    await base44.auth.logout();
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin();
  };

  const updateAuthUser = (displayName) => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        displayName: displayName,
        full_name: displayName
      };
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      updateAuthUser,
      checkUserAuth: async () => {},
      checkAppState: async () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
