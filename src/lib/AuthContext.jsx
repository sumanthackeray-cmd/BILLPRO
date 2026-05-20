import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { auth } from '@/api/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setIsLoadingPublicSettings(true);
      setIsLoadingAuth(true);
      
      const publicSettings = { id: appParams.appId || 'mock-app-id', public_settings: {} };
      setAppPublicSettings(publicSettings);
      
      if (firebaseUser) {
        const currentUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          full_name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          displayName: firebaseUser.displayName
        };
        setUser(currentUser);
        setIsAuthenticated(true);
        const token = await firebaseUser.getIdToken();
        localStorage.setItem('base44_access_token', token);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('base44_access_token');
      }
      
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });

    return () => unsubscribe();
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
