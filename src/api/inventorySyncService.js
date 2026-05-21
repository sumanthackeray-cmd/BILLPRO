/**
 * Real-Time Inventory Synchronization Service
 * Handles instant stock updates across all branches
 * Uses Firestore listeners for real-time sync
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
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

let db = null;
const syncListeners = new Map();
const inventoryCache = new Map();

export function initializeInventorySyncService(firebaseDb) {
  db = firebaseDb;
}

/**
 * Get inventory for a specific product in a branch
 * @param {string} productId - Product ID
 * @param {string} branchId - Branch ID
 * @returns {Promise<Object>} Inventory data
 */
export async function getInventory(productId, branchId) {
  if (!db) throw new Error('Database not initialized');

  try {
    const q = query(
      collection(db, 'inventory'),
      where('productId', '==', productId),
      where('branchId', '==', branchId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.docs.length > 0) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
}

/**
 * Get all inventory for a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array>} Array of inventory items
 */
export async function getBranchInventory(branchId) {
  if (!db) throw new Error('Database not initialized');

  try {
    const q = query(collection(db, 'inventory'), where('branchId', '==', branchId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching branch inventory:', error);
    throw error;
  }
}

/**
 * Update inventory quantity in real-time
 * Called when items are added/removed (billing, stock transfers, purchases)
 * @param {string} productId - Product ID
 * @param {string} branchId - Branch ID
 * @param {number} quantityDelta - Change in quantity (+/-)
 * @param {string} reason - Reason for change (billing, stock_transfer, purchase, adjustment)
 * @returns {Promise<Object>} Updated inventory
 */
export async function updateInventory(productId, branchId, quantityDelta, reason) {
  if (!db) throw new Error('Database not initialized');

  try {
    const inventory = await getInventory(productId, branchId);
    if (!inventory) {
      // Auto-create/initialize the branch inventory if it doesn't exist
      const colRef = collection(db, 'inventory');
      const docData = {
        productId,
        branchId,
        quantity: Math.max(0, quantityDelta),
        reorderPoint: 10,
        reorderQuantity: 50,
        lastRestockDate: quantityDelta > 0 ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastUpdateReason: reason || 'stock_initialization',
        lastUpdateQuantity: quantityDelta,
      };
      const docRef = await addDoc(colRef, docData);
      return { id: docRef.id, ...docData };
    }

    const newQuantity = Math.max(0, inventory.quantity + quantityDelta);
    const docRef = doc(db, 'inventory', inventory.id);

    await updateDoc(docRef, {
      quantity: newQuantity,
      lastRestockDate: quantityDelta > 0 ? serverTimestamp() : inventory.lastRestockDate,
      updatedAt: serverTimestamp(),
      lastUpdateReason: reason,
      lastUpdateQuantity: quantityDelta,
    });

    return { ...inventory, quantity: newQuantity };
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time inventory changes for a product across all branches
 * @param {string} productId - Product ID
 * @param {Function} callback - Callback function when inventory changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToProductInventory(productId, callback) {
  if (!db) {
    console.error('Database not initialized');
    return () => {};
  }

  try {
    const q = query(collection(db, 'inventory'), where('productId', '==', productId));

    const unsubscribe = onSnapshot(q, snapshot => {
      const inventory = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Update cache
      inventoryCache.set(productId, inventory);

      // Call callback
      callback(inventory);
    });

    // Store unsubscribe function
    if (!syncListeners.has(productId)) {
      syncListeners.set(productId, []);
    }
    syncListeners.get(productId).push(unsubscribe);

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to product inventory:', error);
    return () => {};
  }
}

/**
 * Subscribe to real-time inventory changes for a branch
 * @param {string} branchId - Branch ID
 * @param {Function} callback - Callback function when inventory changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToBranchInventory(branchId, callback) {
  if (!db) {
    console.error('Database not initialized');
    return () => {};
  }

  try {
    const q = query(collection(db, 'inventory'), where('branchId', '==', branchId));

    const unsubscribe = onSnapshot(q, snapshot => {
      const inventory = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Update cache
      inventoryCache.set(`branch_${branchId}`, inventory);

      // Call callback
      callback(inventory);
    });

    // Store unsubscribe function
    const cacheKey = `branch_${branchId}`;
    if (!syncListeners.has(cacheKey)) {
      syncListeners.set(cacheKey, []);
    }
    syncListeners.get(cacheKey).push(unsubscribe);

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to branch inventory:', error);
    return () => {};
  }
}

/**
 * Get low stock items for a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array>} Array of low stock items
 */
export async function getLowStockItems(branchId) {
  if (!db) throw new Error('Database not initialized');

  try {
    const q = query(
      collection(db, 'inventory'),
      where('branchId', '==', branchId),
      where('quantity', '<=', 'reorderPoint') // Note: This specific query may need indexing
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return [];
  }
}

/**
 * Transfer inventory between branches
 * @param {string} productId - Product ID
 * @param {string} fromBranchId - Source branch ID
 * @param {string} toBranchId - Destination branch ID
 * @param {number} quantity - Quantity to transfer
 * @returns {Promise<Object>} Transfer result
 */
export async function transferInventory(productId, fromBranchId, toBranchId, quantity) {
  if (!db) throw new Error('Database not initialized');

  try {
    // Update source branch (reduce)
    await updateInventory(productId, fromBranchId, -quantity, 'transfer_out');

    // Update destination branch (increase)
    await updateInventory(productId, toBranchId, quantity, 'transfer_in');

    return {
      success: true,
      fromBranch: fromBranchId,
      toBranch: toBranchId,
      productId,
      quantity,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error transferring inventory:', error);
    throw error;
  }
}

/**
 * Unsubscribe from real-time updates
 * @param {string} key - Product ID or branch key
 * @returns {void}
 */
export function unsubscribeFromInventory(key) {
  if (syncListeners.has(key)) {
    const listeners = syncListeners.get(key);
    listeners.forEach(unsubscribe => unsubscribe());
    syncListeners.delete(key);
  }
}

/**
 * Unsubscribe from all real-time updates
 * @returns {void}
 */
export function unsubscribeFromAllInventory() {
  syncListeners.forEach(listeners => {
    listeners.forEach(unsubscribe => unsubscribe());
  });
  syncListeners.clear();
  inventoryCache.clear();
}

/**
 * Get inventory from cache
 * @param {string} key - Product ID or branch key
 * @returns {Array} Cached inventory data
 */
export function getInventoryFromCache(key) {
  return inventoryCache.get(key) || [];
}

export default {
  initializeInventorySyncService,
  getInventory,
  getBranchInventory,
  updateInventory,
  subscribeToProductInventory,
  subscribeToBranchInventory,
  getLowStockItems,
  transferInventory,
  unsubscribeFromInventory,
  unsubscribeFromAllInventory,
  getInventoryFromCache,
};
