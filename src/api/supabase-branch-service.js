/**
 * Supabase Branch Management Service
 * Complete replacement for Firebase branch service
 * Maintains API compatibility with existing codebase
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './supabase-auth';

let cachedBranches = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get current user ID
 */
function getUserId() {
  const user = getCurrentUser();
  return user?.uid || null;
}

/**
 * Create a new branch (scoped to current user)
 */
export async function createBranch(branchData) {
  const uid = getUserId();
  if (!uid) throw new Error('User not authenticated');

  try {
    const branch = {
      ...branchData,
      user_id: uid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    };

    const { data, error } = await supabase
      .from('branches')
      .insert([branch])
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    cacheTimestamp = 0;
    
    return data.id;
  } catch (error) {
    console.error('Error creating branch:', error);
    throw error;
  }
}

/**
 * Get branch by ID
 */
export async function getBranch(branchId) {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', branchId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error fetching branch:', error);
    throw error;
  }
}

/**
 * Get all active branches for the current user
 * Uses caching for better performance
 */
export async function getAllBranches() {
  const uid = getUserId();
  if (!uid) return [];

  try {
    // Return cached data if fresh
    const now = Date.now();
    if (cachedBranches.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
      return cachedBranches;
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('user_id', uid)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Update cache
    cachedBranches = data || [];
    cacheTimestamp = now;

    return cachedBranches;
  } catch (error) {
    console.error('Error fetching branches:', error);
    return [];
  }
}

/**
 * Get cached branches (returns last cached result)
 */
export function getCachedBranches() {
  return cachedBranches;
}

/**
 * Update branch details
 */
export async function updateBranch(branchId, updates) {
  try {
    const { data, error } = await supabase
      .from('branches')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', branchId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    cacheTimestamp = 0;

    return data;
  } catch (error) {
    console.error('Error updating branch:', error);
    throw error;
  }
}

/**
 * Deactivate a branch (soft delete)
 */
export async function deactivateBranch(branchId) {
  try {
    const { data, error } = await supabase
      .from('branches')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', branchId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    cacheTimestamp = 0;

    return data;
  } catch (error) {
    console.error('Error deactivating branch:', error);
    throw error;
  }
}

/**
 * Get branch settings
 */
export async function getBranchSettings(branchId) {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select(`
        currency,
        timezone,
        language,
        bill_prefix,
        enable_offline_billing,
        enable_loyalty,
        gst_number,
        gst_registration_type
      `)
      .eq('id', branchId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    return data ? {
      currency: data.currency,
      timezone: data.timezone,
      language: data.language,
      billPrefix: data.bill_prefix,
      enableOfflineBilling: data.enable_offline_billing,
      enableLoyalty: data.enable_loyalty,
      gstNumber: data.gst_number,
      gstRegistrationType: data.gst_registration_type,
    } : null;
  } catch (error) {
    console.error('Error fetching branch settings:', error);
    throw error;
  }
}

/**
 * Update branch settings
 */
export async function updateBranchSettings(branchId, settings) {
  try {
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    // Map camelCase to snake_case
    if (settings.currency) updateData.currency = settings.currency;
    if (settings.timezone) updateData.timezone = settings.timezone;
    if (settings.language) updateData.language = settings.language;
    if (settings.billPrefix) updateData.bill_prefix = settings.billPrefix;
    if (typeof settings.enableOfflineBilling === 'boolean') {
      updateData.enable_offline_billing = settings.enableOfflineBilling;
    }
    if (typeof settings.enableLoyalty === 'boolean') {
      updateData.enable_loyalty = settings.enableLoyalty;
    }
    if (settings.gstNumber) updateData.gst_number = settings.gstNumber;
    if (settings.gstRegistrationType) {
      updateData.gst_registration_type = settings.gstRegistrationType;
    }

    const { data, error } = await supabase
      .from('branches')
      .update(updateData)
      .eq('id', branchId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    cacheTimestamp = 0;

    return data;
  } catch (error) {
    console.error('Error updating branch settings:', error);
    throw error;
  }
}

/**
 * Search branches by code or name
 */
export async function searchBranches(query) {
  const uid = getUserId();
  if (!uid) return [];

  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('user_id', uid)
      .eq('is_active', true)
      .or(`code.ilike.%${query}%,name.ilike.%${query}%`);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching branches:', error);
    return [];
  }
}

/**
 * Get branch by code
 */
export async function getBranchByCode(code) {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('code', code)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error fetching branch by code:', error);
    throw error;
  }
}

/**
 * Invalidate branch cache
 */
export function invalidateBranchCache() {
  cacheTimestamp = 0;
  cachedBranches = [];
}

/**
 * Batch update branches
 */
export async function updateBranchesStatus(branchIds, updates) {
  try {
    const { error } = await supabase
      .from('branches')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .in('id', branchIds);

    if (error) throw error;

    // Invalidate cache
    cacheTimestamp = 0;
  } catch (error) {
    console.error('Error batch updating branches:', error);
    throw error;
  }
}
