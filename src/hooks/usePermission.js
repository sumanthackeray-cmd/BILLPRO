import { useAuth } from '@/lib/AuthContext';

/**
 * Custom hook to check if the current logged-in user has permission for a specific module and action.
 * @param {string} module - The name of the module (e.g. 'pos', 'inventory', 'accounting', 'warehouse', 'hr', 'reports')
 * @param {string} action - The action to perform (e.g. 'view', 'create', 'edit', 'delete', 'export', or custom module action like 'discount')
 * @returns {boolean} Whether the user has permission
 */
export function usePermission(module, action) {
  const { user } = useAuth();
  
  if (!user) return false;
  
  // Owner role always has full authority over all modules and actions
  if (user.role === 'owner') return true;
  
  const modulePerms = user.permissions?.[module];
  if (!modulePerms) return false;
  
  return !!modulePerms[action];
}

/**
 * Custom hook to check if the current user has access to a sensitive data field.
 * @param {string} fieldName - The sensitive field name (e.g. 'purchase_price', 'profit_margin', 'salary')
 * @returns {boolean} Whether the user is authorized to see the field
 */
export function useSensitiveField(fieldName) {
  const { user } = useAuth();
  
  if (!user) return false;
  
  // Owner always has access to all sensitive fields
  if (user.role === 'owner') return true;
  
  return !!user.sensitive_fields?.[fieldName];
}
