import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { usePermissions } from "@/hooks/usePermissions";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: keyof ReturnType<typeof import("@/lib/permissions").getPermissions>;
  fallbackPath?: string;
}

/**
 * Route guard component that checks user permissions
 */
export function ProtectedRoute({ 
  children, 
  requiredPermission,
  fallbackPath = "/login" 
}: ProtectedRouteProps) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { hasPermission } = usePermissions();

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Redirect to home if user doesn't have permission
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

