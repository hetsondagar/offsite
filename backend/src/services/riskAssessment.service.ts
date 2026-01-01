import { Project } from '../modules/projects/project.model';
import { DPR } from '../modules/dpr/dpr.model';
import { Attendance } from '../modules/attendance/attendance.model';
import { MaterialRequest } from '../modules/materials/material.model';
import { llmService } from './llm.service';
import { ragService } from './rag.service';
import { z } from 'zod';
import { logger } from '../utils/logger';

export interface RiskSignals {
  dprDelayDays: number;
  attendanceVariance: number;
  pendingApprovals: number;
  materialShortage: boolean;
}

export interface ProjectContext {
  stage: string;
  timelineStatus: string;
  budgetRemaining: number;
}

export interface RiskAssessment {
  riskScore: number; // 0-100, deterministic
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  signals: RiskSignals;
  projectContext: ProjectContext;
  aiAnalysis: {
    riskLevel: string;
    summary: string;
    topReasons: string[];
    recommendations: string[];
    confidence: number;
  };
}

/**
 * Risk Assessment Service
 * 1. Computes deterministic risk signals from MongoDB data
 * 2. Uses LLM + RAG to interpret and explain
 */
export class RiskAssessmentService {
  /**
   * Calculate deterministic risk signals from project data
   */
  async calculateRiskSignals(projectId: string): Promise<RiskSignals> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. DPR Delay Analysis
    const recentDPRs = await DPR.find({
      projectId,
      createdAt: { $gte: sevenDaysAgo },
    }).sort({ createdAt: -1 });

    let dprDelayDays = 0;
    if (recentDPRs.length > 0) {
      // Check if latest DPR is delayed (should be within 24 hours)
      const latestDPR = recentDPRs[0];
      const hoursSinceLastDPR = (now.getTime() - latestDPR.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastDPR > 24) {
        dprDelayDays = Math.floor(hoursSinceLastDPR / 24);
      }
    } else {
      // No DPRs in last 7 days - high delay
      dprDelayDays = 7;
    }

    // 2. Attendance Variance Analysis
    const attendanceRecords = await Attendance.find({
      projectId,
      timestamp: { $gte: sevenDaysAgo },
      type: 'checkin',
    });

    // Group by day
    const dailyCounts: number[] = [];
    const dayMap = new Map<string, Set<string>>();
    
    attendanceRecords.forEach(record => {
      const dateKey = record.timestamp.toISOString().split('T')[0];
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, new Set());
      }
      dayMap.get(dateKey)!.add(record.userId.toString());
    });

    dayMap.forEach((users) => {
      dailyCounts.push(users.size);
    });

    let attendanceVariance = 0;
    if (dailyCounts.length > 1) {
      const avg = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
      const variance = dailyCounts.reduce((sum, count) => {
        return sum + Math.pow(count - avg, 2);
      }, 0) / dailyCounts.length;
      const stdDev = Math.sqrt(variance);
      attendanceVariance = avg > 0 ? (stdDev / avg) * 100 : 0;
    }

    // 3. Pending Approvals Count
    const pendingApprovals = await MaterialRequest.countDocuments({
      projectId,
      status: 'pending',
    });

    // 4. Material Shortage Detection
    const pendingMaterialRequests = await MaterialRequest.find({
      projectId,
      status: 'pending',
      createdAt: { $lt: oneDayAgo }, // Pending for more than 1 day
    });

    const materialShortage = pendingMaterialRequests.length > 0;

    return {
      dprDelayDays,
      attendanceVariance: Math.round(attendanceVariance * 100) / 100,
      pendingApprovals,
      materialShortage,
    };
  }

  /**
   * Get project context for LLM
   */
  async getProjectContext(projectId: string): Promise<ProjectContext> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const now = new Date();
    const timelineStatus = project.endDate
      ? new Date(project.endDate) > now
        ? 'on-track'
        : 'overdue'
      : 'no-deadline';

    // Budget remaining (mock - would come from actual budget data)
    const budgetRemaining = 75; // Percentage

    return {
      stage: project.status,
      timelineStatus,
      budgetRemaining,
    };
  }

  /**
   * Calculate deterministic risk score (0-100)
   */
  calculateRiskScore(signals: RiskSignals): number {
    let score = 0;

    // DPR delay penalty (max 30 points)
    score += Math.min(signals.dprDelayDays * 5, 30);

    // Attendance variance penalty (max 25 points)
    if (signals.attendanceVariance > 30) {
      score += Math.min((signals.attendanceVariance - 30) * 0.5, 25);
    }

    // Pending approvals penalty (max 25 points)
    score += Math.min(signals.pendingApprovals * 5, 25);

    // Material shortage penalty (max 20 points)
    if (signals.materialShortage) {
      score += 20;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Determine risk level from score
   */
  getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score <= 40) return 'LOW';
    if (score <= 70) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Get AI analysis using LLM + RAG
   */
  async getAIAnalysis(
    siteId: string,
    signals: RiskSignals,
    projectContext: ProjectContext,
    deterministicRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  ): Promise<{
    riskLevel: string;
    summary: string;
    topReasons: string[];
    recommendations: string[];
    confidence: number;
  }> {
    // Get RAG context
    const ragContext = await ragService.getRAGContext(
      `site risk assessment DPR delays attendance variance material approvals`
    );

    // Prepare LLM input
    const llmInput = {
      siteId,
      signals: {
        dprDelayDays: signals.dprDelayDays,
        attendanceVariance: signals.attendanceVariance,
        pendingApprovals: signals.pendingApprovals,
        materialShortage: signals.materialShortage,
      },
      projectContext: {
        stage: projectContext.stage,
        timelineStatus: projectContext.timelineStatus,
        budgetRemaining: projectContext.budgetRemaining,
      },
    };

    const systemPrompt = `You are a construction site risk assessment AI. Analyze the provided risk signals and project context to generate a human-readable risk assessment.

${ragContext}

IMPORTANT RULES:
- Do NOT calculate risk scores (they are already computed deterministically)
- Focus on interpreting signals and explaining business impact
- Provide actionable recommendations based on project guidelines
- Use the retrieved policy documents to ground your recommendations
- Output ONLY valid JSON, no markdown formatting`;

    const userPrompt = `Analyze this site risk data:

Signals:
- DPR Delay: ${signals.dprDelayDays} days
- Attendance Variance: ${signals.attendanceVariance}%
- Pending Approvals: ${signals.pendingApprovals}
- Material Shortage: ${signals.materialShortage ? 'Yes' : 'No'}

Project Context:
- Stage: ${projectContext.stage}
- Timeline: ${projectContext.timelineStatus}
- Budget Remaining: ${projectContext.budgetRemaining}%

Deterministic Risk Level: ${deterministicRiskLevel}

Provide analysis in this EXACT JSON format:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "summary": "2-3 sentence summary of overall risk situation",
  "topReasons": ["reason1", "reason2", "reason3"],
  "recommendations": ["action1", "action2", "action3"],
  "confidence": 0.0-1.0
}`;

    try {
      const response = await llmService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      // Parse and validate LLM response
      const parsed = JSON.parse(response.content);
      
      // Validate with Zod
      const schema = z.object({
        riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
        summary: z.string(),
        topReasons: z.array(z.string()),
        recommendations: z.array(z.string()),
        confidence: z.number().min(0).max(1),
      });

      const validated = schema.parse(parsed);
      return validated;
    } catch (error: any) {
      logger.error('Error getting AI analysis:', error);
      // Fallback response
      return {
        riskLevel: deterministicRiskLevel,
        summary: `Site shows ${deterministicRiskLevel.toLowerCase()} risk based on DPR delays, attendance patterns, and material approvals.`,
        topReasons: [
          signals.dprDelayDays > 0 ? `${signals.dprDelayDays} day(s) DPR delay` : null,
          signals.attendanceVariance > 30 ? `Attendance variance ${signals.attendanceVariance.toFixed(1)}%` : null,
          signals.pendingApprovals > 0 ? `${signals.pendingApprovals} pending approvals` : null,
        ].filter(Boolean) as string[],
        recommendations: [
          'Review DPR submission process',
          'Monitor attendance patterns',
          'Streamline approval workflow',
        ],
        confidence: 0.7,
      };
    }
  }

  /**
   * Complete risk assessment for a site/project
   */
  async assessSiteRisk(projectId: string): Promise<RiskAssessment> {
    // 1. Compute deterministic signals
    const signals = await this.calculateRiskSignals(projectId);
    
    // 2. Get project context
    const projectContext = await this.getProjectContext(projectId);
    
    // 3. Calculate deterministic risk score
    const riskScore = this.calculateRiskScore(signals);
    const riskLevel = this.getRiskLevel(riskScore);
    
    // 4. Get AI analysis
    const aiAnalysis = await this.getAIAnalysis(
      projectId,
      signals,
      projectContext,
      riskLevel
    );

    return {
      riskScore,
      riskLevel,
      signals,
      projectContext,
      aiAnalysis,
    };
  }
}

export const riskAssessmentService = new RiskAssessmentService();

