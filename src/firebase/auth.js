import { 
  signOut, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "./config";

export const loginWithEmail = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async () => {
  localStorage.clear();
  await signOut(auth);
  window.location.href = "/login";
};

export const resetPassword = (email) => {
  return sendPasswordResetEmail(auth, email);
};

export { auth };
