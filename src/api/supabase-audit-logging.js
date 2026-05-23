/**
 * Supabase Audit Logging Service
 * Comprehensive audit trail for compliance and security
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './supabase-auth';

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  READ: 'READ',
  PRINT: 'PRINT',
  EXPORT: 'EXPORT',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  VOID: 'VOID',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  PAYMENT: 'PAYMENT',
  RETURN: 'RETURN',
  TRANSFER: 'TRANSFER',
  ADJUSTMENT: 'ADJUSTMENT',
};

/**
 * Log an audit action
 */
export async function logAuditAction(auditData) {
  const user = getCurrentUser();
  if (!user) return; // Silent fail for unauthenticated users

  try {
    const logEntry = {
      user_id: user.uid,
      branch_id: auditData.branchId || null,
      action: auditData.action,
      entity_type: auditData.entityType || null,
      entity_id: auditData.entityId || null,
      changes: auditData.changes || null,
      ip_address: auditData.ipAddress || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert([logEntry]);

    if (error) console.warn('Audit logging error:', error);
  } catch (error) {
    console.warn('Failed to log audit action:', error);
    // Don't throw - audit failures shouldn't break main app flow
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(entityType, entityId, limitCount = 50) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(userId, branchId = null, limitCount = 100) {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a branch
 */
export async function getBranchAuditLogs(branchId, limitCount = 500) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching branch audit logs:', error);
    return [];
  }
}

/**
 * Log invoice creation
 */
export async function logInvoiceCreated(invoiceId, branchId, userId, total) {
  await logAuditAction({
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'Invoice',
    entityId: invoiceId,
    branchId: branchId,
    changes: {
      after: { id: invoiceId, total },
    },
  });
}

/**
 * Log inventory adjustment
 */
export async function logInventoryAdjusted(productId, branchId, quantityChange, reason) {
  await logAuditAction({
    action: AUDIT_ACTIONS.ADJUSTMENT,
    entityType: 'Inventory',
    entityId: productId,
    branchId: branchId,
    changes: {
      quantityChange,
      reason,
    },
  });
}

/**
 * Log purchase order approval
 */
export async function logPurchaseOrderApproved(poId, branchId, userId, amount) {
  await logAuditAction({
    action: AUDIT_ACTIONS.APPROVE,
    entityType: 'PurchaseOrder',
    entityId: poId,
    branchId: branchId,
    changes: {
      status: 'Confirmed',
      amount,
    },
  });
}

/**
 * Log product price change
 */
export async function logProductPriceChange(productId, branchId, userId, oldPrice, newPrice) {
  await logAuditAction({
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'Product',
    entityId: productId,
    branchId: branchId,
    changes: {
      before: { sellingPrice: oldPrice },
      after: { sellingPrice: newPrice },
    },
  });
}

/**
 * Log access denied attempt
 */
export async function logAccessDenied(userId, branchId, resource, reason) {
  await logAuditAction({
    action: 'DENIED',
    entityType: 'AccessControl',
    entityId: `${userId}-${resource}`,
    branchId: branchId,
    changes: {
      resource,
      reason,
    },
  });
}

/**
 * Log payment received
 */
export async function logPaymentReceived(invoiceId, branchId, amount, method) {
  await logAuditAction({
    action: AUDIT_ACTIONS.PAYMENT,
    entityType: 'Payment',
    entityId: invoiceId,
    branchId: branchId,
    changes: {
      amount,
      method,
    },
  });
}

/**
 * Log return created
 */
export async function logReturnCreated(returnId, branchId, originalInvoiceId, amount) {
  await logAuditAction({
    action: AUDIT_ACTIONS.RETURN,
    entityType: 'Return',
    entityId: returnId,
    branchId: branchId,
    changes: {
      originalInvoiceId,
      amount,
    },
  });
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogsWithFilters(filters) {
  try {
    let query = supabase.from('audit_logs').select('*');

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.branchId) {
      query = query.eq('branch_id', filters.branchId);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(filters.limit || 100);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching filtered audit logs:', error);
    return [];
  }
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogs(branchId, startDate, endDate) {
  try {
    const logs = await getAuditLogsWithFilters({
      branchId,
      startDate,
      endDate,
      limit: 10000,
    });

    return logs;
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return [];
  }
}

/**
 * Log user login
 */
export async function logUserLogin(userId, branchId = null) {
  await logAuditAction({
    action: AUDIT_ACTIONS.LOGIN,
    entityType: 'User',
    entityId: userId,
    branchId: branchId,
    changes: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log user logout
 */
export async function logUserLogout(userId, branchId = null) {
  await logAuditAction({
    action: AUDIT_ACTIONS.LOGOUT,
    entityType: 'User',
    entityId: userId,
    branchId: branchId,
    changes: {
      timestamp: new Date().toISOString(),
    },
  });
}
