import { UserRole } from '../types';

export interface Permissions {
  canCreateDPR: boolean;
  canUpdateTaskStatus: boolean;
  canMarkAttendance: boolean;
  canRaiseMaterialRequests: boolean;
  canViewOwnSubmittedData: boolean;
  canApproveMaterialRequests: boolean;
  canViewAllDPRs: boolean;
  canViewAttendanceSummaries: boolean;
  canMonitorTaskProgress: boolean;
  canViewAIInsights: boolean;
  canAddComments: boolean;
  canViewGlobalDashboards: boolean;
  canViewInvoices: boolean;
  canManageInvoices: boolean;
  canManageSystemConfig: boolean;
  canCreateProjects: boolean;
  canArchiveProjects: boolean;
  canManageUsers: boolean;
  canSetApprovalRules: boolean;
  canExportReports: boolean;
  canSendNotifications: boolean;
}

const rolePermissions: Record<UserRole, Permissions> = {
  engineer: {
    canCreateDPR: true,
    canUpdateTaskStatus: true,
    canMarkAttendance: true,
    canRaiseMaterialRequests: true,
    canViewOwnSubmittedData: true,
    canApproveMaterialRequests: false,
    canViewAllDPRs: false,
    canViewAttendanceSummaries: false,
    canMonitorTaskProgress: false,
    canViewAIInsights: false,
    canAddComments: false,
    canViewGlobalDashboards: false,
    canViewInvoices: false,
    canManageInvoices: false,
    canManageSystemConfig: false,
    canCreateProjects: false,
    canArchiveProjects: false,
    canManageUsers: false,
    canSetApprovalRules: false,
    canExportReports: false,
    canSendNotifications: false,
  },
  manager: {
    canCreateDPR: false,
    canUpdateTaskStatus: false,
    canMarkAttendance: false,
    canRaiseMaterialRequests: false,
    canViewOwnSubmittedData: true,
    canApproveMaterialRequests: true,
    canViewAllDPRs: true,
    canViewAttendanceSummaries: true,
    canMonitorTaskProgress: true,
    canViewAIInsights: true,
    canAddComments: true,
    canViewGlobalDashboards: true,
    canViewInvoices: false,
    canManageInvoices: false,
    canManageSystemConfig: false,
    canCreateProjects: false,
    canArchiveProjects: false,
    canManageUsers: false,
    canSetApprovalRules: false,
    canExportReports: true,
    canSendNotifications: true,
  },
  owner: {
    canCreateDPR: false,
    canUpdateTaskStatus: false,
    canMarkAttendance: false,
    canRaiseMaterialRequests: false,
    canViewOwnSubmittedData: true,
    canApproveMaterialRequests: false,
    canViewAllDPRs: true,
    canViewAttendanceSummaries: true,
    canMonitorTaskProgress: true,
    canViewAIInsights: true,
    canAddComments: true,
    canViewGlobalDashboards: true,
    canViewInvoices: true,
    canManageInvoices: true,
    canManageSystemConfig: true,
    canCreateProjects: true,
    canArchiveProjects: true,
    canManageUsers: true,
    canSetApprovalRules: true,
    canExportReports: true,
    canSendNotifications: true,
  },
  purchase_manager: {
    canCreateDPR: false,
    canUpdateTaskStatus: false,
    canMarkAttendance: false,
    canRaiseMaterialRequests: false,
    canViewOwnSubmittedData: false,
    canApproveMaterialRequests: true,
    canViewAllDPRs: false,
    canViewAttendanceSummaries: false,
    canMonitorTaskProgress: false,
    canViewAIInsights: false,
    canAddComments: true,
    canViewGlobalDashboards: false,
    canViewInvoices: false,
    canManageInvoices: false,
    canManageSystemConfig: false,
    canCreateProjects: false,
    canArchiveProjects: false,
    canManageUsers: false,
    canSetApprovalRules: false,
    canExportReports: true,
    canSendNotifications: true,
  },
  contractor: {
    canCreateDPR: false,
    canUpdateTaskStatus: false,
    canMarkAttendance: false,
    canRaiseMaterialRequests: false,
    canViewOwnSubmittedData: true,
    canApproveMaterialRequests: false,
    canViewAllDPRs: false,
    canViewAttendanceSummaries: false,
    canMonitorTaskProgress: false,
    canViewAIInsights: false,
    canAddComments: false,
    canViewGlobalDashboards: false,
    canViewInvoices: false,
    canManageInvoices: false,
    canManageSystemConfig: false,
    canCreateProjects: false,
    canArchiveProjects: false,
    canManageUsers: false,
    canSetApprovalRules: false,
    canExportReports: false,
    canSendNotifications: false,
  },
};

export const getPermissions = (role: UserRole): Permissions => {
  return rolePermissions[role];
};

export const hasPermission = (role: UserRole, permission: keyof Permissions): boolean => {
  return rolePermissions[role][permission] ?? false;
};

