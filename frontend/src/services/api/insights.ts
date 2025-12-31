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
};

