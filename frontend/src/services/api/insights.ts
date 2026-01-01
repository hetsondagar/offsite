import { apiGet } from '@/lib/api';

export interface SiteHealth {
  overallHealthScore: number;
  projectHealthScores: Array<{
    projectId: string;
    projectName: string;
    healthScore: number;
  }>;
  totalProjects: number;
}

export interface DelayRisk {
  projectId: string;
  projectName: string;
  risk: 'Low' | 'Medium' | 'High';
  probability: number;
  impact: string;
  cause: string;
}

export interface Insight {
  id: string;
  type: 'delay' | 'anomaly' | 'positive';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  project: string;
  projectId: string;
  createdAt: string;
}

export interface LabourGap {
  projectId: string;
  projectName: string;
  date: string;
  plannedLabour: number;
  actualLabour: number;
  gap: number;
  gapPercentage: number;
  severity: 'normal' | 'warning' | 'critical';
  threshold: number;
}

export interface ProjectLabourGap {
  projectId: string;
  projectName: string;
  averageGap: number;
  averageGapPercentage: number;
  daysWithGap: number;
  totalDays: number;
  recentGaps: LabourGap[];
}

export interface ApprovalDelay {
  requestId: string;
  projectId: string;
  materialName: string;
  requestedAt: string;
  delayHours: number;
  delayDays: number;
  severity: 'normal' | 'warning' | 'critical';
  status: 'pending' | 'approved' | 'rejected';
}

export interface ProjectApprovalDelays {
  projectId: string;
  totalPending: number;
  criticalDelays: number;
  warningDelays: number;
  normalDelays: number;
  averageDelayHours: number;
  delays: ApprovalDelay[];
}

export const insightsApi = {
  getSiteHealth: async () => {
    const response = await apiGet<SiteHealth>('/insights/site-health');
    return response.data;
  },

  getDelayRisks: async () => {
    const response = await apiGet<DelayRisk[]>('/insights/delay-risk');
    return response.data;
  },

  getMaterialAnomalies: async () => {
    const response = await apiGet<any[]>('/insights/material-anomalies');
    return response.data;
  },

  getLabourGap: async (projectId?: string, days?: number, threshold?: number) => {
    const params: any = {};
    if (projectId) params.projectId = projectId;
    if (days) params.days = days.toString();
    if (threshold) params.threshold = threshold.toString();
    const response = await apiGet<ProjectLabourGap | ProjectLabourGap[]>('/insights/labour-gap', params);
    return response.data;
  },

  getApprovalDelays: async (projectId?: string) => {
    const params: any = {};
    if (projectId) params.projectId = projectId;
    const response = await apiGet<ProjectApprovalDelays | ProjectApprovalDelays[]>('/insights/approval-delays', params);
    return response.data;
  },
};

