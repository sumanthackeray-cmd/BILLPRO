import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase web configuration (supports environment variables or local fallback keys)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBfrcgkY7djfpIqewY5AdfOEn4QdcSRRHU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "billing-40da2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "billing-40da2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "billing-40da2.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "287011156122",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:287011156122:web:dfe0625d87683a78886f23",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-PNBNW6HTF1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
