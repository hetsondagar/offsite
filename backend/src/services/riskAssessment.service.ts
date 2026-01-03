import { Project } from '../modules/projects/project.model';
import { DPR } from '../modules/dpr/dpr.model';
import { Attendance } from '../modules/attendance/attendance.model';
import { MaterialRequest } from '../modules/materials/material.model';
import { huggingFaceService } from './ai/huggingface.service';
import { logger } from '../utils/logger';

export interface RiskSignals {
  dprDelayDays: number;
  dprDelayHours: number; // Added for precise timing
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
    let dprDelayHours = 0;
    if (recentDPRs.length > 0) {
      // Check if latest DPR is delayed (should be within 24 hours)
      const latestDPR = recentDPRs[0];
      const hoursSinceLastDPR = (now.getTime() - latestDPR.createdAt.getTime()) / (1000 * 60 * 60);
      dprDelayHours = Math.round(hoursSinceLastDPR * 10) / 10; // Round to 1 decimal
      if (hoursSinceLastDPR > 24) {
        dprDelayDays = Math.floor(hoursSinceLastDPR / 24);
      }
    } else {
      // No DPRs in last 7 days - high delay
      dprDelayDays = 7;
      dprDelayHours = 7 * 24; // 168 hours
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
      dprDelayHours,
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

    // Budget remaining - calculate from project budget if available
    // For now, use a conservative estimate based on progress
    // TODO: Add budget field to Project model for accurate calculation
    const projectProgress = project.progress || 0;
    const budgetRemaining = Math.max(0, 100 - projectProgress); // Estimate based on progress

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
    // Use hours for more granular calculation
    if (signals.dprDelayHours >= 24) {
      // For delays of 1+ days, use days-based calculation
      score += Math.min(signals.dprDelayDays * 5, 30);
    } else if (signals.dprDelayHours >= 2) {
      // For delays of 2-24 hours, use hours-based calculation (scaled)
      // 2 hours = 2 points, 24 hours = 5 points
      score += Math.min(2 + (signals.dprDelayHours - 2) * (3 / 22), 5);
    }
    // Delays under 2 hours = 0 points (acceptable)

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
   * Get AI analysis using Hugging Face
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
    // Format DPR delay for AI understanding
    let dprDelayDescription = '';
    if (signals.dprDelayHours < 1) {
      dprDelayDescription = `${Math.round(signals.dprDelayHours * 60)} minutes (No delay - within acceptable range)`;
    } else if (signals.dprDelayHours < 2) {
      dprDelayDescription = `${signals.dprDelayHours.toFixed(1)} hours (Minor delay - acceptable)`;
    } else if (signals.dprDelayHours < 24) {
      dprDelayDescription = `${signals.dprDelayHours.toFixed(1)} hours (${signals.dprDelayDays} day) - Moderate delay, needs attention`;
    } else {
      dprDelayDescription = `${signals.dprDelayDays} days (${signals.dprDelayHours.toFixed(1)} hours) - Significant delay, requires immediate action`;
    }

    const prompt = `You are a construction site risk assessment AI. Analyze the provided risk signals and project context to generate a human-readable risk assessment.

IMPORTANT RULES:
- Do NOT calculate risk scores (they are already computed deterministically)
- Focus on interpreting signals and explaining business impact
- Provide actionable recommendations
- Use ONLY the data provided below
- CRITICAL: When assessing DPR delays, consider the timing:
  * Delays under 2 hours are normal and acceptable
  * Delays of 2-24 hours are moderate and need monitoring
  * Delays over 24 hours (1+ days) are concerning and indicate operational issues
  * Delays over 2 days are serious and require immediate action

Risk Signals:
- DPR Delay: ${dprDelayDescription}
  * Current delay: ${signals.dprDelayHours.toFixed(1)} hours (${signals.dprDelayDays} days)
  * Context: DPRs should be submitted daily. A delay means the daily progress report is overdue.
- Attendance Variance: ${signals.attendanceVariance}%
- Pending Approvals: ${signals.pendingApprovals}
- Material Shortage: ${signals.materialShortage ? 'Yes' : 'No'}

Project Context:
- Stage: ${projectContext.stage}
- Timeline: ${projectContext.timelineStatus}
- Budget Remaining: ${projectContext.budgetRemaining}%

Deterministic Risk Level: ${deterministicRiskLevel}

CRITICAL ASSESSMENT RULES FOR DPR DELAYS:
- ${signals.dprDelayHours < 2 ? `Current delay: ${signals.dprDelayHours.toFixed(1)} hours - This is ACCEPTABLE. Risk can be LOW.` : ''}
- ${signals.dprDelayHours >= 2 && signals.dprDelayHours < 24 ? `Current delay: ${signals.dprDelayHours.toFixed(1)} hours - This is MODERATE. Risk should be MEDIUM, not LOW.` : ''}
- ${signals.dprDelayDays >= 1 && signals.dprDelayDays < 2 ? `Current delay: ${signals.dprDelayDays} day (${signals.dprDelayHours.toFixed(1)} hours) - This is CONCERNING. Risk MUST be MEDIUM or HIGH, NOT LOW.` : ''}
- ${signals.dprDelayDays >= 2 ? `Current delay: ${signals.dprDelayDays} days (${signals.dprDelayHours.toFixed(1)} hours) - This is SERIOUS. Risk MUST be HIGH, NOT LOW or MEDIUM.` : ''}

Provide a clear analysis with:
1. Overall risk level (LOW/MEDIUM/HIGH) - CRITICAL: The risk level MUST match the delay severity:
   * ${signals.dprDelayDays >= 2 ? 'HIGH risk (delay is 2+ days - serious operational issue)' : signals.dprDelayDays >= 1 ? 'MEDIUM or HIGH risk (delay is 1+ day - concerning)' : signals.dprDelayHours >= 2 ? 'MEDIUM risk (delay is 2+ hours - needs monitoring)' : 'LOW risk (delay is under 2 hours - acceptable)'}
   * If DPR is delayed by 1+ days, the risk CANNOT be LOW. If delayed by 2+ days, risk MUST be HIGH.
2. A 2-3 sentence summary of the risk situation, emphasizing the DPR delay timing
3. Top 3 reasons for the risk level, with DPR delay as primary if it's significant
4. Top 3 actionable recommendations
5. Confidence level (0.0-1.0)

Format your response clearly with labeled sections.`;

    try {
      const aiResponse = await huggingFaceService.generateText(prompt, 500);
      
      if (!aiResponse) {
        throw new Error('AI service unavailable');
      }

      // Parse the response - Hugging Face returns plain text, so we need to extract structured data
      // Try to extract JSON if present, otherwise parse the text
      let parsed: any;
      try {
        // Try to find JSON in the response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          // Parse text response
          const lines = aiResponse.split('\n').filter(l => l.trim());
          const summary = lines.find(l => l.toLowerCase().includes('summary')) || 
                         lines.slice(0, 2).join(' ') || 
                         `Site shows ${deterministicRiskLevel.toLowerCase()} risk based on provided signals.`;
          
          const reasons: string[] = [];
          const recommendations: string[] = [];
          
          lines.forEach(line => {
            if (line.toLowerCase().includes('reason') || line.match(/^\d+\./)) {
              reasons.push(line.replace(/^\d+\.\s*/, '').trim());
            }
            if (line.toLowerCase().includes('recommend') || line.toLowerCase().includes('action')) {
              recommendations.push(line.replace(/^\d+\.\s*/, '').trim());
            }
          });

          parsed = {
            riskLevel: deterministicRiskLevel,
            summary,
            topReasons: reasons.slice(0, 3).length > 0 ? reasons.slice(0, 3) : [
              signals.dprDelayDays > 0 ? `${signals.dprDelayDays} day(s) DPR delay` : null,
              signals.attendanceVariance > 30 ? `Attendance variance ${signals.attendanceVariance.toFixed(1)}%` : null,
              signals.pendingApprovals > 0 ? `${signals.pendingApprovals} pending approvals` : null,
            ].filter(Boolean) as string[],
            recommendations: recommendations.slice(0, 3).length > 0 ? recommendations.slice(0, 3) : [
              'Review DPR submission process',
              'Monitor attendance patterns',
              'Streamline approval workflow',
            ],
            confidence: 0.75,
          };
        }
      } catch (parseError) {
        logger.warn('Could not parse AI response as JSON, using fallback');
        parsed = null;
      }

      if (!parsed) {
        // Fallback response
        return {
          riskLevel: deterministicRiskLevel,
          summary: `Site shows ${deterministicRiskLevel.toLowerCase()} risk based on DPR delays (${signals.dprDelayDays} days), attendance variance (${signals.attendanceVariance}%), and ${signals.pendingApprovals} pending approvals.`,
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

      return {
        riskLevel: parsed.riskLevel || deterministicRiskLevel,
        summary: parsed.summary || `Site shows ${deterministicRiskLevel.toLowerCase()} risk based on provided signals.`,
        topReasons: parsed.topReasons || [],
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0.7,
      };
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

