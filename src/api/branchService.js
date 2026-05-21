/**
 * Branch Management Service
 * Handles all branch CRUD operations with per-user data isolation
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { auth } from './firebase';

let db = null;

export function initializeBranchService(firebaseDb) {
  db = firebaseDb;
}

function getUserId() {
  return auth.currentUser?.uid || null;
}

/**
 * Create a new branch (scoped to current user)
 */
export async function createBranch(branchData) {
  if (!db) throw new Error('Database not initialized');
  const uid = getUserId();
  if (!uid) throw new Error('User not authenticated');

  try {
    const branch = {
      ...branchData,
      userId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
    };
    const docRef = await addDoc(collection(db, 'branches'), branch);
    return docRef.id;
  } catch (error) {
    console.error('Error creating branch:', error);
    throw error;
  }
}

/**
 * Get branch by ID
 */
export async function getBranch(branchId) {
  if (!db) throw new Error('Database not initialized');
  try {
    const docRef = doc(db, 'branches', branchId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (error) {
    console.error('Error fetching branch:', error);
    throw error;
  }
}

/**
 * Get all active branches for the current user
 * Falls back to localStorage cache for instant load
 */
export async function getAllBranches() {
  if (!db) throw new Error('Database not initialized');
  const uid = getUserId();
  if (!uid) return [];

  const cacheKey = `branches_cache_${uid}`;

  // Serve from cache immediately
  let cached = [];
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cached = JSON.parse(raw);
  } catch {}

  try {
    const q = query(
      collection(db, 'branches'),
      where('userId', '==', uid),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    const branches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Update cache
    localStorage.setItem(cacheKey, JSON.stringify(branches));
    return branches;
  } catch (error) {
    console.error('Error fetching branches:', error);
    // Return cache as fallback
    return cached;
  }
}

/**
 * Get cached branches synchronously (for instant sidebar render)
 */
export function getCachedBranches() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(`branches_cache_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Update branch details
 */
export async function updateBranch(branchId, updates) {
  if (!db) throw new Error('Database not initialized');
  try {
    const docRef = doc(db, 'branches', branchId);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    // Bust cache
    const uid = getUserId();
    if (uid) localStorage.removeItem(`branches_cache_${uid}`);
  } catch (error) {
    console.error('Error updating branch:', error);
    throw error;
  }
}

/**
 * Deactivate a branch (soft delete)
 */
export async function deactivateBranch(branchId) {
  if (!db) throw new Error('Database not initialized');
  try {
    const docRef = doc(db, 'branches', branchId);
    await updateDoc(docRef, { isActive: false, updatedAt: serverTimestamp() });
    // Bust cache
    const uid = getUserId();
    if (uid) localStorage.removeItem(`branches_cache_${uid}`);
  } catch (error) {
    console.error('Error deactivating branch:', error);
    throw error;
  }
}

export async function getBranchSettings(branchId) {
  if (!db) throw new Error('Database not initialized');
  try {
    const docRef = doc(db, 'branches', branchId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data().settings : null;
  } catch (error) {
    console.error('Error fetching branch settings:', error);
    throw error;
  }
}

export async function updateBranchSettings(branchId, settings) {
  if (!db) throw new Error('Database not initialized');
  try {
    const docRef = doc(db, 'branches', branchId);
    await updateDoc(docRef, { settings, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error('Error updating branch settings:', error);
    throw error;
  }
}

export default {
  initializeBranchService,
  createBranch,
  getBranch,
  getAllBranches,
  getCachedBranches,
  updateBranch,
  deactivateBranch,
  getBranchSettings,
  updateBranchSettings,
};
