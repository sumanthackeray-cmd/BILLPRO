import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';

export default function RouteGuard({ children, module, action }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();
  const hasPermission = usePermission(module, action);

  if (isLoadingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying access credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (module && action && !hasPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
