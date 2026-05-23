/**
 * Supabase Inventory Sync Service
 * Handles real-time stock updates across branches with Postgres triggers
 */

import { supabase } from '../lib/supabase';

const inventoryCache = new Map();
const realtimeSubscriptions = new Map();

/**
 * Initialize real-time subscriptions
 */
export function initializeInventorySubscriptions() {
  // Subscribe to all inventory changes
  const subscription = supabase
    .channel('public:inventory')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory' },
      (payload) => {
        // Update local cache
        const cacheKey = `${payload.new?.product_id}-${payload.new?.branch_id}`;
        if (payload.eventType === 'DELETE') {
          inventoryCache.delete(cacheKey);
        } else {
          inventoryCache.set(cacheKey, payload.new);
        }
      }
    )
    .subscribe();

  realtimeSubscriptions.set('inventory', subscription);
}

/**
 * Get inventory for a specific product in a branch
 */
export async function getInventory(productId, branchId) {
  try {
    // Check cache first
    const cacheKey = `${productId}-${branchId}`;
    if (inventoryCache.has(cacheKey)) {
      return inventoryCache.get(cacheKey);
    }

    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('branch_id', branchId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (data) {
      inventoryCache.set(cacheKey, data);
    }
    return data || null;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
}

/**
 * Get all inventory for a branch
 */
export async function getBranchInventory(branchId) {
  try {
    // Check cache first
    const cacheKey = `branch_${branchId}`;
    if (inventoryCache.has(cacheKey)) {
      return inventoryCache.get(cacheKey);
    }

    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          category,
          unit
        )
      `)
      .eq('branch_id', branchId);

    if (error) throw error;

    const inventory = data || [];
    inventoryCache.set(cacheKey, inventory);
    return inventory;
  } catch (error) {
    console.error('Error fetching branch inventory:', error);
    return [];
  }
}

/**
 * Update inventory quantity (supports +/- delta)
 */
export async function updateInventory(productId, branchId, quantityDelta, reason) {
  try {
    // Get current inventory
    let inventory = await getInventory(productId, branchId);

    if (!inventory) {
      // Initialize new inventory record
      const { data, error } = await supabase
        .from('inventory')
        .insert([{
          product_id: productId,
          branch_id: branchId,
          quantity: Math.max(0, quantityDelta),
          reorder_point: 10,
          reorder_quantity: 50,
          last_restock_date: quantityDelta > 0 ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      
      inventoryCache.set(`${productId}-${branchId}`, data);
      return data;
    }

    // Update existing inventory
    const newQuantity = Math.max(0, inventory.quantity + quantityDelta);
    const { data, error } = await supabase
      .from('inventory')
      .update({
        quantity: newQuantity,
        last_restock_date: quantityDelta > 0 ? new Date().toISOString() : inventory.last_restock_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inventory.id)
      .select()
      .single();

    if (error) throw error;

    inventoryCache.set(`${productId}-${branchId}`, data);
    return data;
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw error;
  }
}

/**
 * Subscribe to product inventory changes
 */
export function subscribeToProductInventory(productId, callback) {
  try {
    const subscription = supabase
      .channel(`product_${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `product_id=eq.${productId}`,
        },
        (payload) => {
          const inventory = payload.new;
          inventoryCache.set(`${productId}-${inventory.branch_id}`, inventory);
          callback([inventory]);
        }
      )
      .subscribe();

    realtimeSubscriptions.set(`product_${productId}`, subscription);
    return () => supabase.removeChannel(subscription);
  } catch (error) {
    console.error('Error subscribing to product inventory:', error);
    return () => {};
  }
}

/**
 * Subscribe to branch inventory changes
 */
export function subscribeToBranchInventory(branchId, callback) {
  try {
    const subscription = supabase
      .channel(`branch_${branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `branch_id=eq.${branchId}`,
        },
        (payload) => {
          const inventory = payload.new || payload.old;
          inventoryCache.set(`${inventory.product_id}-${branchId}`, inventory);
          // Fetch and return all branch inventory
          getBranchInventory(branchId).then(callback);
        }
      )
      .subscribe();

    realtimeSubscriptions.set(`branch_${branchId}`, subscription);
    return () => supabase.removeChannel(subscription);
  } catch (error) {
    console.error('Error subscribing to branch inventory:', error);
    return () => {};
  }
}

/**
 * Get low stock items for a branch
 */
export async function getLowStockItems(branchId) {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          unit
        )
      `)
      .eq('branch_id', branchId)
      .gte('reorder_point', supabase.rpc('get_quantity', { id: 'this.id' }));

    // Simplified: Get all and filter client-side for complex queries
    if (error && !error.message.includes('function')) {
      throw error;
    }

    // Fallback to fetching all and filtering
    const { data: allInventory, error: allError } = await supabase
      .from('inventory')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          unit
        )
      `)
      .eq('branch_id', branchId);

    if (allError) throw allError;

    return (allInventory || []).filter(item => item.quantity <= (item.reorder_point || 10));
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return [];
  }
}

/**
 * Get inventory for multiple products in a branch
 */
export async function getBatchInventory(productIds, branchId) {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .in('product_id', productIds)
      .eq('branch_id', branchId);

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching batch inventory:', error);
    return [];
  }
}

/**
 * Create batch inventory (for products with batch/expiry dates)
 */
export async function createBatchInventory(batchData) {
  try {
    const { data, error } = await supabase
      .from('batch_inventory')
      .insert([{
        product_id: batchData.productId,
        branch_id: batchData.branchId,
        batch_number: batchData.batchNumber,
        quantity: batchData.quantity,
        expiry_date: batchData.expiryDate,
        status: 'Active',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating batch inventory:', error);
    throw error;
  }
}

/**
 * Get batch inventory items
 */
export async function getBatchInventoryItems(branchId) {
  try {
    const { data, error } = await supabase
      .from('batch_inventory')
      .select(`
        *,
        products (
          id,
          name,
          sku
        )
      `)
      .eq('branch_id', branchId)
      .in('status', ['Active', 'Expiring']);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching batch inventory:', error);
    return [];
  }
}

/**
 * Update batch inventory status
 */
export async function updateBatchStatus(batchId, status) {
  try {
    const { data, error } = await supabase
      .from('batch_inventory')
      .update({
        status: status,
      })
      .eq('id', batchId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating batch status:', error);
    throw error;
  }
}

/**
 * Unsubscribe from real-time updates
 */
export function unsubscribeFromInventory(key) {
  if (realtimeSubscriptions.has(key)) {
    const subscription = realtimeSubscriptions.get(key);
    supabase.removeChannel(subscription);
    realtimeSubscriptions.delete(key);
  }
}

/**
 * Clear inventory cache
 */
export function clearInventoryCache() {
  inventoryCache.clear();
}

/**
 * Get inventory analytics for a branch
 */
export async function getInventoryAnalytics(branchId, daysBack = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        products (
          name,
          cost_price,
          selling_price
        )
      `)
      .eq('branch_id', branchId)
      .gte('updated_at', startDate.toISOString());

    if (error) throw error;

    return {
      totalItems: data?.length || 0,
      totalValue: (data || []).reduce((sum, item) => {
        const value = item.quantity * (item.products?.cost_price || 0);
        return sum + value;
      }, 0),
      lowStockCount: (data || []).filter(item => item.quantity <= item.reorder_point).length,
      items: data || [],
    };
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    return { totalItems: 0, totalValue: 0, lowStockCount: 0, items: [] };
  }
}
