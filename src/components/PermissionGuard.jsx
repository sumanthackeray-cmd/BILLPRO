import React from 'react';
import { usePermission } from '@/hooks/usePermission';

/**
 * A declarative React guard that only renders its children if the current user
 * has the required permission for the given module and action.
 */
export default function PermissionGuard({ module, action, fallback = null, children }) {
  const hasPermission = usePermission(module, action);
  
  if (!hasPermission) {
    return fallback;
  }
  
  return <>{children}</>;
}
