import React from 'react';
import { useSensitiveField } from '@/hooks/usePermission';

export default function FieldGuard({ fieldName, children, fallback = "₹***" }) {
  const hasAccess = useSensitiveField(fieldName);
  
  if (!hasAccess) {
    return <span className="font-mono text-muted-foreground">{fallback}</span>;
  }
  
  return <>{children}</>;
}
