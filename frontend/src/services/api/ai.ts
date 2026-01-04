import { apiGet } from '@/lib/api';

export interface RiskSignals {
  dprDelayDays: number;
  dprDelayHours: number;
  attendanceVariance: number;
  pendingApprovals: number;
  materialShortage: boolean;
}

export interface ProjectContext {
  stage: string;
  timelineStatus: string;
  budgetRemaining: number;
  taskStatus: {
    pending: number;
    inProgress: number;
    completed: number;
    delayed: number; // Tasks pending for more than 3 hours
    approachingDelay: number; // Tasks pending for 2-3 hours
    total: number;
  };
}

export interface AIAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  topReasons: string[];
  recommendations: string[];
  confidence: number;
}

export interface SiteRiskAssessment {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  signals: RiskSignals;
  projectContext: ProjectContext;
  aiAnalysis: AIAnalysis;
}

export interface Anomaly {
  anomalyType: string;
  patternDetected: string;
  historicalComparison: string;
  projectStage: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  explanation: string;
  businessImpact: string;
  recommendedAction: string;
  metadata?: Record<string, any>;
}

export interface AnomalyInsights {
  anomalies: Anomaly[];
  total: number;
}

export const aiApi = {
  getSiteRisk: async (siteId: string): Promise<SiteRiskAssessment> => {
    const response = await apiGet<SiteRiskAssessment>(`/ai/site-risk/${siteId}`);
    if (!response.data) {
      throw new Error('No risk assessment data received from server');
    }
    return response.data;
  },

  getAnomalies: async (siteId: string): Promise<AnomalyInsights> => {
    const response = await apiGet<AnomalyInsights>(`/ai/anomalies/${siteId}`);
    if (!response.data) {
      throw new Error('No anomaly data received from server');
    }
    return response.data;
  },
};

