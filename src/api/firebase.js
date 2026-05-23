import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase web configuration (strictly environment variables only)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCC81u4VhjmLFYdww8xmcisUQ-4swqMXsQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vogats-firebase-studio.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://vogats-firebase-studio-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vogats-firebase-studio",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vogats-firebase-studio.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "495963475897",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:495963475897:web:d10584ec636c7c7980b068"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
