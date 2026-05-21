import React from 'react';
import { usePermission } from '@/hooks/usePermission';

export default function PermissionGuard({ module, action, children, fallback = null }) {
  const hasPermission = usePermission(module, action);
  
  if (!hasPermission) {
    return fallback;
  }
  
  return <>{children}</>;
}
