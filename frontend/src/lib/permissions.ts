/**
 * Role-Based Access Control (RBAC) System
 * Defines permissions for each role in the OffSite platform
 */

export enum UserRole {
  SITE_ENGINEER = "engineer",
  PROJECT_MANAGER = "manager",
  OWNER_ADMIN = "owner",
}

export type Role = UserRole.SITE_ENGINEER | UserRole.PROJECT_MANAGER | UserRole.OWNER_ADMIN;

/**
 * Permission definitions for each role
 */
export const RolePermissions = {
  [UserRole.SITE_ENGINEER]: {
    // ✅ ALLOWED
    canCreateDPR: true,
    canUpdateTaskStatus: true,
    canMarkAttendance: true,
    canRaiseMaterialRequest: true,
    canViewOwnDPRs: true,
    canViewOwnAttendance: true,
    canViewOwnMaterialRequests: true,
    
    // ❌ NOT ALLOWED
    canApproveMaterialRequests: false,
    canEditApprovedDPRs: false,
    canViewInvoices: false,
    canViewAIInsights: false,
    canModifyProjects: false,
    canModifyUsers: false,
    canViewAllDPRs: false,
    canViewAttendanceSummaries: false,
    canViewGlobalDashboards: false,
    canManageInvoices: false,
    canExportReports: false,
  },
  
  [UserRole.PROJECT_MANAGER]: {
    // ✅ ALLOWED
    canViewAllDPRs: true,
    canApproveMaterialRequests: true,
    canViewAttendanceSummaries: true,
    canMonitorTaskProgress: true,
    canViewAIInsights: true,
    canAddCommentsOnDPRs: true,
    canAddCommentsOnTasks: true,
    
    // ❌ NOT ALLOWED
    canCreateDPR: false,
    canMarkAttendance: false,
    canRaiseMaterialRequest: false,
    canViewInvoices: false,
    canManageInvoices: false,
    canModifyProjects: false,
    canModifyUsers: false,
    canViewGlobalDashboards: false,
    canExportReports: false,
  },
  
  [UserRole.OWNER_ADMIN]: {
    // ✅ ALLOWED
    canViewGlobalDashboards: true,
    canViewAIInsights: true,
    canViewInvoices: true,
    canManageInvoices: true,
    canModifyProjects: true,
    canModifyUsers: true,
    canExportReports: true,
    canViewAllDPRs: true,
    canViewAttendanceSummaries: true,
    
    // ❌ NOT ALLOWED
    canCreateDPR: false,
    canMarkAttendance: false,
    canRaiseMaterialRequest: false,
    canApproveMaterialRequests: false,
    canEditOnSiteData: false,
  },
} as const;

/**
 * Get permissions for a specific role
 */
export function getPermissions(role: Role | null) {
  if (!role) {
    // Return all false for unauthenticated users
    return Object.keys(RolePermissions[UserRole.SITE_ENGINEER]).reduce((acc, key) => {
      acc[key as keyof typeof RolePermissions[typeof UserRole.SITE_ENGINEER]] = false;
      return acc;
    }, {} as typeof RolePermissions[typeof UserRole.SITE_ENGINEER]);
  }
  
  return RolePermissions[role];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role | null, permission: keyof typeof RolePermissions[typeof UserRole.SITE_ENGINEER]): boolean {
  if (!role) return false;
  return RolePermissions[role][permission] ?? false;
}

/**
 * Role display names
 */
export const RoleDisplayNames = {
  [UserRole.SITE_ENGINEER]: "Site Engineer",
  [UserRole.PROJECT_MANAGER]: "Project Manager",
  [UserRole.OWNER_ADMIN]: "Owner / Admin",
} as const;

/**
 * Get role display name
 */
export function getRoleDisplayName(role: Role | null): string {
  if (!role) return "Guest";
  return RoleDisplayNames[role];
}

