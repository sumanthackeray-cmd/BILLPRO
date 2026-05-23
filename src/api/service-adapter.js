/**
 * Service Adapter
 * Unified interface for switching between Firebase and Supabase
 * Allows gradual migration without changing component code
 */

// Import Supabase services (new implementations)
import * as supabaseBranch from './supabase-branch-service';
import * as supabasePos from './supabase-pos-service';
import * as supabaseAudit from './supabase-audit-logging';
import * as supabaseInventory from './supabase-inventory-service';
import * as supabaseAuth from './supabase-auth';

// Import Firebase services (legacy implementations)
import * as firebaseBranch from './branchService';
import * as firebasePos from './posService';
import * as firebaseAudit from './auditLogging';
import * as firebaseInventory from './inventorySyncService';

// Configuration: Set to 'supabase' or 'firebase'
const BACKEND = process.env.VITE_BACKEND || 'supabase';

console.log(`[BillPro] Using ${BACKEND.toUpperCase()} backend`);

// ============================================================================
// BRANCH SERVICE ADAPTER
// ============================================================================

export const BranchService = {
  createBranch: (data) => 
    BACKEND === 'supabase' ? supabaseBranch.createBranch(data) : firebaseBranch.createBranch(data),
  
  getBranch: (id) => 
    BACKEND === 'supabase' ? supabaseBranch.getBranch(id) : firebaseBranch.getBranch(id),
  
  getAllBranches: () => 
    BACKEND === 'supabase' ? supabaseBranch.getAllBranches() : firebaseBranch.getAllBranches(),
  
  getCachedBranches: () => 
    BACKEND === 'supabase' ? supabaseBranch.getCachedBranches() : firebaseBranch.getCachedBranches(),
  
  updateBranch: (id, updates) => 
    BACKEND === 'supabase' ? supabaseBranch.updateBranch(id, updates) : firebaseBranch.updateBranch(id, updates),
  
  deactivateBranch: (id) => 
    BACKEND === 'supabase' ? supabaseBranch.deactivateBranch(id) : firebaseBranch.deactivateBranch(id),
  
  getBranchSettings: (id) => 
    BACKEND === 'supabase' ? supabaseBranch.getBranchSettings(id) : firebaseBranch.getBranchSettings(id),
  
  updateBranchSettings: (id, settings) => 
    BACKEND === 'supabase' ? supabaseBranch.updateBranchSettings(id, settings) : firebaseBranch.updateBranchSettings(id, settings),
  
  searchBranches: (query) => 
    BACKEND === 'supabase' ? supabaseBranch.searchBranches(query) : firebaseBranch.searchBranches?.(query) || [],
  
  getBranchByCode: (code) => 
    BACKEND === 'supabase' ? supabaseBranch.getBranchByCode(code) : firebaseBranch.getBranchByCode?.(code) || null,
};

// ============================================================================
// POS SERVICE ADAPTER
// ============================================================================

export const POSService = {
  createInvoice: (data) => 
    BACKEND === 'supabase' ? supabasePos.createInvoice(data) : firebasePos.createInvoice(data),
  
  getInvoice: (id) => 
    BACKEND === 'supabase' ? supabasePos.getInvoice(id) : firebasePos.getInvoice(id),
  
  getInvoiceByNumber: (number) => 
    BACKEND === 'supabase' ? supabasePos.getInvoiceByNumber(number) : firebasePos.getInvoiceByNumber?.(number) || null,
  
  getBranchInvoices: (branchId, limit, offset) => 
    BACKEND === 'supabase' ? supabasePos.getBranchInvoices(branchId, limit, offset) : firebasePos.getBranchInvoices(branchId),
  
  addInvoiceItem: (invoiceId, item) => 
    BACKEND === 'supabase' ? supabasePos.addInvoiceItem(invoiceId, item) : firebasePos.addInvoiceItem(invoiceId, item),
  
  recordPayment: (invoiceId, payment) => 
    BACKEND === 'supabase' ? supabasePos.recordPayment(invoiceId, payment) : firebasePos.recordPayment(invoiceId, payment),
  
  updateInvoiceStatus: (invoiceId, status) => 
    BACKEND === 'supabase' ? supabasePos.updateInvoiceStatus(invoiceId, status) : firebasePos.updateInvoiceStatus(invoiceId, status),
  
  createReturn: (data) => 
    BACKEND === 'supabase' ? supabasePos.createReturn(data) : firebasePos.createReturn(data),
  
  getBranchReturns: (branchId) => 
    BACKEND === 'supabase' ? supabasePos.getBranchReturns(branchId) : firebasePos.getBranchReturns(branchId),
  
  updateReturnStatus: (returnId, status) => 
    BACKEND === 'supabase' ? supabasePos.updateReturnStatus(returnId, status) : firebasePos.updateReturnStatus(returnId, status),
  
  voidInvoice: (invoiceId) => 
    BACKEND === 'supabase' ? supabasePos.voidInvoice(invoiceId) : firebasePos.voidInvoice(invoiceId),
};

// ============================================================================
// AUDIT LOGGING SERVICE ADAPTER
// ============================================================================

export const AuditService = {
  logAuditAction: (data) => 
    BACKEND === 'supabase' ? supabaseAudit.logAuditAction(data) : firebaseAudit.logAuditAction(data),
  
  getEntityAuditLogs: (type, id, limit) => 
    BACKEND === 'supabase' ? supabaseAudit.getEntityAuditLogs(type, id, limit) : firebaseAudit.getEntityAuditLogs(type, id, limit),
  
  getUserAuditLogs: (userId, branchId, limit) => 
    BACKEND === 'supabase' ? supabaseAudit.getUserAuditLogs(userId, branchId, limit) : firebaseAudit.getUserAuditLogs(userId, branchId, limit),
  
  getBranchAuditLogs: (branchId, limit) => 
    BACKEND === 'supabase' ? supabaseAudit.getBranchAuditLogs(branchId, limit) : firebaseAudit.getBranchAuditLogs(branchId, limit),
  
  logInvoiceCreated: (invoiceId, branchId, userId, total) => 
    BACKEND === 'supabase' 
      ? supabaseAudit.logInvoiceCreated(invoiceId, branchId, userId, total) 
      : firebaseAudit.logInvoiceCreated(invoiceId, branchId, userId, total),
  
  logInventoryAdjusted: (productId, branchId, quantityChange, reason) => 
    BACKEND === 'supabase' 
      ? supabaseAudit.logInventoryAdjusted(productId, branchId, quantityChange, reason) 
      : firebaseAudit.logInventoryAdjusted(productId, branchId, quantityChange, reason),
  
  logAccessDenied: (userId, branchId, resource, reason) => 
    BACKEND === 'supabase' 
      ? supabaseAudit.logAccessDenied(userId, branchId, resource, reason) 
      : firebaseAudit.logAccessDenied(userId, branchId, resource, reason),
};

// ============================================================================
// INVENTORY SERVICE ADAPTER
// ============================================================================

export const InventoryService = {
  getInventory: (productId, branchId) => 
    BACKEND === 'supabase' ? supabaseInventory.getInventory(productId, branchId) : firebaseInventory.getInventory(productId, branchId),
  
  getBranchInventory: (branchId) => 
    BACKEND === 'supabase' ? supabaseInventory.getBranchInventory(branchId) : firebaseInventory.getBranchInventory(branchId),
  
  updateInventory: (productId, branchId, delta, reason) => 
    BACKEND === 'supabase' ? supabaseInventory.updateInventory(productId, branchId, delta, reason) : firebaseInventory.updateInventory(productId, branchId, delta, reason),
  
  subscribeToProductInventory: (productId, callback) => 
    BACKEND === 'supabase' ? supabaseInventory.subscribeToProductInventory(productId, callback) : firebaseInventory.subscribeToProductInventory(productId, callback),
  
  subscribeToBranchInventory: (branchId, callback) => 
    BACKEND === 'supabase' ? supabaseInventory.subscribeToBranchInventory(branchId, callback) : firebaseInventory.subscribeToBranchInventory(branchId, callback),
  
  getLowStockItems: (branchId) => 
    BACKEND === 'supabase' ? supabaseInventory.getLowStockItems(branchId) : firebaseInventory.getLowStockItems(branchId),
  
  getBatchInventory: (productIds, branchId) => 
    BACKEND === 'supabase' ? supabaseInventory.getBatchInventory(productIds, branchId) : firebaseInventory.getBatchInventory?.(productIds, branchId) || [],
  
  createBatchInventory: (data) => 
    BACKEND === 'supabase' ? supabaseInventory.createBatchInventory(data) : firebaseInventory.createBatchInventory?.(data) || null,
};

// ============================================================================
// AUTHENTICATION SERVICE ADAPTER
// ============================================================================

export const AuthService = {
  getCurrentUser: () => 
    BACKEND === 'supabase' ? supabaseAuth.getCurrentUser() : null,
  
  getCurrentUserAsync: () => 
    BACKEND === 'supabase' ? supabaseAuth.getCurrentUserAsync() : Promise.resolve(null),
  
  signInWithGoogle: () => 
    BACKEND === 'supabase' ? supabaseAuth.signInWithGoogle() : Promise.reject(new Error('Not implemented')),
  
  signInWithEmail: (email, password) => 
    BACKEND === 'supabase' ? supabaseAuth.signInWithEmail(email, password) : Promise.reject(new Error('Not implemented')),
  
  signUpWithEmail: (email, password, data) => 
    BACKEND === 'supabase' ? supabaseAuth.signUpWithEmail(email, password, data) : Promise.reject(new Error('Not implemented')),
  
  signOut: () => 
    BACKEND === 'supabase' ? supabaseAuth.signOut() : Promise.resolve(),
  
  resetPassword: (email) => 
    BACKEND === 'supabase' ? supabaseAuth.resetPassword(email) : Promise.reject(new Error('Not implemented')),
  
  updatePassword: (newPassword) => 
    BACKEND === 'supabase' ? supabaseAuth.updatePassword(newPassword) : Promise.reject(new Error('Not implemented')),
  
  initializeAuth: () => 
    BACKEND === 'supabase' ? supabaseAuth.initializeAuth() : Promise.resolve(),
};

// ============================================================================
// MIGRATION STATUS
// ============================================================================

export function getBackendStatus() {
  return {
    backend: BACKEND,
    isSupabase: BACKEND === 'supabase',
    isFirebase: BACKEND === 'firebase',
    timestamp: new Date().toISOString(),
  };
}

// Log backend status to console
console.log('[BillPro] Backend Status:', getBackendStatus());
