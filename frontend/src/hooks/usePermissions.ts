import { useAppSelector } from '@/store/hooks';
import { getPermissions, hasPermission, type Role } from '@/lib/permissions';

/**
 * Hook to get current user's permissions
 */
export function usePermissions() {
  const role = useAppSelector((state) => state.auth.role);
  const permissions = getPermissions(role);
  
  return {
    permissions,
    role,
    hasPermission: (permission: keyof typeof permissions) => hasPermission(role, permission),
  };
}

/**
 * Hook to check if user can perform a specific action
 */
export function useCan(permission: keyof ReturnType<typeof getPermissions>) {
  const role = useAppSelector((state) => state.auth.role);
  return hasPermission(role, permission);
}

