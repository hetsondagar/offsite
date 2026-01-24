/**
 * Role-Based Access Control (RBAC) System
 * Defines permissions for each role in the OffSite platform
 */

export enum UserRole {
  SITE_ENGINEER = "engineer",
  PROJECT_MANAGER = "manager",
  OWNER_ADMIN = "owner",
  PURCHASE_MANAGER = "purchase_manager",
  CONTRACTOR = "contractor",
}

export type Role = UserRole.SITE_ENGINEER | UserRole.PROJECT_MANAGER | UserRole.OWNER_ADMIN | UserRole.PURCHASE_MANAGER | UserRole.CONTRACTOR;

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
    canViewPurchaseHistory: true,
    canConfirmMaterialReceived: true,
    canRequestPermit: true,
    canViewTools: true,
    canIssueTools: true,
    canReturnTools: true,
    
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
    canViewPurchaseRequests: false,
    canSendMaterials: false,
    canUploadLabourFaces: false,
    canMarkLabourAttendance: false,
    canCreateContractorInvoice: false,
    canApproveContractorInvoice: false,
    canViewContractorInvoices: false,
    canManageContractors: false,
    canViewLabourCosts: false,
    canViewPurchaseMaterialCost: false,
    canViewGSTBreakdown: false,
    canApprovePermit: false,
    canManageTools: false,
    canSubmitPettyCash: false,
    canApprovePettyCash: false,
    canViewPettyCashDashboard: false,
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
    canApproveContractorInvoice: true,
    canViewContractorInvoices: true,
    canViewPurchaseHistory: true,
    canApprovePermit: true,
    canViewTools: true,
    canIssueTools: true,
    canReturnTools: true,
    canManageTools: true,
    canSubmitPettyCash: true,
    canApprovePettyCash: false,
    
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
    canViewPurchaseRequests: false,
    canSendMaterials: false,
    canUploadLabourFaces: false,
    canMarkLabourAttendance: false,
    canCreateContractorInvoice: false,
    canManageContractors: false,
    canViewLabourCosts: false,
    canViewPurchaseMaterialCost: false,
    canViewGSTBreakdown: false,
    canViewPettyCashDashboard: false,
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
    canViewContractorInvoices: true,
    canManageContractors: true,
    canViewLabourCosts: true,
    canViewPurchaseMaterialCost: true,
    canViewGSTBreakdown: true,
    canViewPurchaseHistory: true,
    canViewTools: true,
    canManageTools: true,
    canViewPettyCashDashboard: true,
    canApprovePettyCash: true,
    
    // ❌ NOT ALLOWED
    canCreateDPR: false,
    canMarkAttendance: false,
    canRaiseMaterialRequest: false,
    canApproveMaterialRequests: false,
    canEditOnSiteData: false,
    canViewPurchaseRequests: false,
    canSendMaterials: false,
    canUploadLabourFaces: false,
    canMarkLabourAttendance: false,
    canCreateContractorInvoice: false,
    canApproveContractorInvoice: false,
    canApprovePermit: false,
    canSubmitPettyCash: false,
  },

  [UserRole.PURCHASE_MANAGER]: {
    // ✅ ALLOWED
    canViewPurchaseRequests: true,
    canSendMaterials: true,
    canViewPurchaseHistory: true,
    canViewTools: true,
    canIssueTools: true,
    canReturnTools: true,
    
    // ❌ NOT ALLOWED
    canCreateDPR: false,
    canUpdateTaskStatus: false,
    canMarkAttendance: false,
    canRaiseMaterialRequest: false,
    canViewOwnDPRs: false,
    canViewOwnAttendance: false,
    canViewOwnMaterialRequests: false,
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
    canUploadLabourFaces: false,
    canMarkLabourAttendance: false,
    canCreateContractorInvoice: false,
    canApproveContractorInvoice: false,
    canViewContractorInvoices: false,
    canManageContractors: false,
    canViewLabourCosts: false,
    canViewPurchaseMaterialCost: false,
    canViewGSTBreakdown: false,
    canApprovePermit: false,
    canManageTools: false,
    canSubmitPettyCash: false,
    canApprovePettyCash: false,
    canViewPettyCashDashboard: false,
  },

  [UserRole.CONTRACTOR]: {
    // ✅ ALLOWED
    canUploadLabourFaces: true,
    canMarkLabourAttendance: true,
    canCreateContractorInvoice: true,
    canViewTools: true,
    canIssueTools: true,
    canReturnTools: true,
    
    // ❌ NOT ALLOWED
    canCreateDPR: false,
    canUpdateTaskStatus: false,
    canMarkAttendance: false,
    canRaiseMaterialRequest: false,
    canViewOwnDPRs: false,
    canViewOwnAttendance: false,
    canViewOwnMaterialRequests: false,
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
    canViewPurchaseRequests: false,
    canSendMaterials: false,
    canViewPurchaseHistory: false,
    canApproveContractorInvoice: false,
    canViewContractorInvoices: false,
    canManageContractors: false,
    canViewLabourCosts: false,
    canViewPurchaseMaterialCost: false,
    canViewGSTBreakdown: false,
    canApprovePermit: false,
    canManageTools: false,
    canSubmitPettyCash: false,
    canApprovePettyCash: false,
    canViewPettyCashDashboard: false,
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
  return RolePermissions[role]?.[permission] ?? false;
}

/**
 * Role display names
 */
export const RoleDisplayNames = {
  [UserRole.SITE_ENGINEER]: "Site Engineer",
  [UserRole.PROJECT_MANAGER]: "Project Manager",
  [UserRole.OWNER_ADMIN]: "Owner / Admin",
  [UserRole.PURCHASE_MANAGER]: "Purchase Manager",
  [UserRole.CONTRACTOR]: "Contractor",
} as const;

/**
 * Get role display name
 */
export function getRoleDisplayName(role: Role | null): string {
  if (!role) return "Guest";
  return RoleDisplayNames[role];
}
