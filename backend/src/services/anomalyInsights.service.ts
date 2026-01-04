import { Attendance } from '../modules/attendance/attendance.model';
import { MaterialRequest, IMaterialRequest } from '../modules/materials/material.model';
import { DPR } from '../modules/dpr/dpr.model';
import { Project } from '../modules/projects/project.model';
import { huggingFaceService } from './ai/huggingface.service';
import { logger } from '../utils/logger';

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

/**
 * Anomaly Insights Service
 * 1. Detects anomalies using heuristics
 * 2. Uses LLM to explain business impact
 */
export class AnomalyInsightsService {
  /**
   * Detect attendance anomalies
   */
  async detectAttendanceAnomalies(projectId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const attendanceRecords = await Attendance.find({
      projectId,
      timestamp: { $gte: sevenDaysAgo },
      type: 'checkin',
    }).sort({ timestamp: 1 });

    if (attendanceRecords.length === 0) {
      return [];
    }

    // 1. Check for repeated identical check-in times
    const timeMap = new Map<string, number>();
    attendanceRecords.forEach(record => {
      const timeKey = record.timestamp.toISOString().split('T')[1].substring(0, 5); // HH:MM
      timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + 1);
    });

    for (const [time, count] of timeMap.entries()) {
      if (count >= 3) {
        anomalies.push({
          anomalyType: 'repeated_checkin_time',
          patternDetected: `Same check-in time (${time}) repeated ${count} times`,
          historicalComparison: 'Expected: Natural variation of ±15 minutes',
          projectStage: 'active',
          severity: 'MEDIUM',
          confidence: 0.8,
          explanation: '',
          businessImpact: '',
          recommendedAction: '',
          metadata: { time, count },
        });
      }
    }

    // 2. Check for same GPS coordinates repeatedly
    const locationMap = new Map<string, number>();
    attendanceRecords.forEach(record => {
      locationMap.set(record.location, (locationMap.get(record.location) || 0) + 1);
    });

    for (const [location, count] of locationMap.entries()) {
      if (count >= 5) {
        anomalies.push({
          anomalyType: 'repeated_location',
          patternDetected: `Same location coordinates repeated ${count} times`,
          historicalComparison: 'Expected: Minor variations due to GPS accuracy (±10 meters)',
          projectStage: 'active',
          severity: 'HIGH',
          confidence: 0.85,
          explanation: '',
          businessImpact: '',
          recommendedAction: '',
          metadata: { location, count },
        });
      }
    }

    // 3. Check attendance variance
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

    if (dailyCounts.length > 1) {
      const avg = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
      const variance = dailyCounts.reduce((sum, count) => {
        return sum + Math.pow(count - avg, 2);
      }, 0) / dailyCounts.length;
      const stdDev = Math.sqrt(variance);
      const variancePercent = avg > 0 ? (stdDev / avg) * 100 : 0;

      if (variancePercent > 30) {
        anomalies.push({
          anomalyType: 'attendance_variance',
          patternDetected: `Attendance variance ${variancePercent.toFixed(1)}% (threshold: 30%)`,
          historicalComparison: `Average: ${avg.toFixed(1)} workers/day, Std Dev: ${stdDev.toFixed(1)}`,
          projectStage: 'active',
          severity: 'MEDIUM',
          confidence: 0.75,
          explanation: '',
          businessImpact: '',
          recommendedAction: '',
          metadata: { variancePercent, avg, stdDev },
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect material usage anomalies
   */
  async detectMaterialAnomalies(projectId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get material requests
    const materialRequests = await MaterialRequest.find({
      projectId,
      createdAt: { $gte: sevenDaysAgo },
    }).sort({ createdAt: -1 });

    if (materialRequests.length === 0) {
      return [];
    }

    // Group by material ID
    const materialMap = new Map<string, IMaterialRequest[]>();
    materialRequests.forEach(req => {
      const key = req.materialId;
      if (!materialMap.has(key)) {
        materialMap.set(key, []);
      }
      materialMap.get(key)!.push(req);
    });

    // Check for usage > 25% above rolling average
    for (const [materialId, requests] of materialMap.entries()) {
      if (requests.length < 2) continue;

      const quantities = requests.map(r => r.quantity);
      const total = quantities.reduce((a, b) => a + b, 0);
      const average = total / quantities.length;
      const latest = quantities[0];

      if (latest > average * 1.25) {
        const increasePercent = ((latest - average) / average) * 100;
        anomalies.push({
          anomalyType: 'material_usage_spike',
          patternDetected: `Material usage ${increasePercent.toFixed(1)}% above 7-day average`,
          historicalComparison: `Average: ${average.toFixed(1)} ${requests[0].unit}, Latest: ${latest} ${requests[0].unit}`,
          projectStage: 'active',
          severity: 'MEDIUM',
          confidence: 0.8,
          explanation: '',
          businessImpact: '',
          recommendedAction: '',
          metadata: { materialId, materialName: requests[0].materialName, increasePercent },
        });
      }
    }

    // Check for requests without matching DPR progress
    const project = await Project.findById(projectId);
    if (project) {
      const recentDPRs = await DPR.countDocuments({
        projectId,
        createdAt: { $gte: sevenDaysAgo },
      });

      if (materialRequests.length > recentDPRs * 2) {
        anomalies.push({
          anomalyType: 'request_progress_mismatch',
          patternDetected: `${materialRequests.length} material requests vs ${recentDPRs} DPRs`,
          historicalComparison: 'Expected: Material requests align with DPR progress',
          projectStage: project.status,
          severity: 'MEDIUM',
          confidence: 0.7,
          explanation: '',
          businessImpact: '',
          recommendedAction: '',
          metadata: { requestCount: materialRequests.length, dprCount: recentDPRs },
        });
      }
    }

    return anomalies;
  }

  /**
   * Get AI explanation for anomaly using Hugging Face
   */
  async getAIExplanation(anomaly: Omit<Anomaly, 'explanation' | 'businessImpact' | 'recommendedAction'>, projectId?: string): Promise<{
    explanation: string;
    businessImpact: string;
    recommendedAction: string;
  }> {
    // Get recent DPRs with work stoppage info if projectId is provided
    let workStoppageContext = '';
    if (projectId) {
      try {
        const { DPR } = await import('../modules/dpr/dpr.model');
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentDPRs = await DPR.find({
          projectId,
          createdAt: { $gte: sevenDaysAgo },
          'workStoppage.occurred': true,
        })
          .populate('taskId', 'title')
          .sort({ createdAt: -1 })
          .limit(5)
          .select('workStoppage createdAt taskId');

        if (recentDPRs.length > 0) {
          workStoppageContext = `\n\nRECENT WORK STOPPAGES FROM DPRs (Last 7 days):
${recentDPRs.map((dpr, idx) => {
            const taskTitle = (dpr.taskId && typeof dpr.taskId === 'object' && 'title' in dpr.taskId) 
              ? (dpr.taskId as any).title 
              : 'Task';
            return `
DPR ${idx + 1} (${new Date(dpr.createdAt).toLocaleDateString()}):
- Task: ${taskTitle}
- Work Stoppage Reason: ${dpr.workStoppage?.reason?.replace('_', ' ').toLowerCase() || 'Not specified'}
- Duration: ${dpr.workStoppage?.durationHours || 0} hours
- Remarks: ${dpr.workStoppage?.remarks || 'None'}
`;
          }).join('\n')}

IMPORTANT: These work stoppages are REAL issues reported by engineers. Use this context to explain anomalies and their impact.`;
        }
      } catch (error) {
        logger.warn('Error fetching work stoppage context:', error);
      }
    }

    const prompt = `You are a construction site anomaly analysis AI. Analyze detected anomalies and explain their business impact.

CRITICAL WRITING RULES:
- Use simple, clear words. Avoid long or complex words.
- Be concise - each section should be 1-2 short sentences maximum.
- Write in plain English that anyone can understand.
- Be specific and actionable - tell exactly what to do.
- Do NOT use technical jargon or overly formal language.
- Keep Business Impact and Recommended Action under 150 words each.

IMPORTANT RULES:
- Do NOT detect anomalies (they are already detected)
- Focus on explaining what the pattern means
- Explain business impact in construction context
- Provide actionable recommendations
- Use ONLY the data provided below

Anomaly Details:
- Type: ${anomaly.anomalyType}
- Pattern Detected: ${anomaly.patternDetected}
- Historical Comparison: ${anomaly.historicalComparison}
- Project Stage: ${anomaly.projectStage}
- Severity: ${anomaly.severity}
- Confidence: ${anomaly.confidence}

Provide a clear analysis with:
1. Explanation: What this anomaly pattern indicates (1-2 short sentences, simple words)
2. Business Impact: How this affects the project - be specific about cost, timeline, or quality (1-2 short sentences, simple words)
3. Recommended Action: What to do next - be specific and actionable (1-2 short sentences, simple words)

Format your response as:
EXPLANATION: [simple explanation in plain English]
BUSINESS IMPACT: [clear impact statement in simple words]
RECOMMENDED ACTION: [specific action to take in simple words]

Example of good writing:
- BAD: "The anomaly indicates a significant deviation from expected operational parameters"
- GOOD: "This shows something unusual is happening with attendance"

- BAD: "This may potentially impact the project's temporal trajectory and resource allocation mechanisms"
- GOOD: "This could delay the project and waste money"

- BAD: "It is recommended that stakeholders undertake a comprehensive review of the data source"
- GOOD: "Check with the site engineer to verify the attendance data"${workStoppageContext}`;

    try {
      const aiResponse = await huggingFaceService.generateText(prompt, 400);
      
      if (!aiResponse) {
        throw new Error('AI service unavailable');
      }

      // Parse the response - look for labeled sections
      let explanation = '';
      let businessImpact = '';
      let recommendedAction = '';

      // Try to find labeled sections first
      const explanationMatch = aiResponse.match(/EXPLANATION:\s*(.+?)(?=BUSINESS IMPACT:|$)/is);
      const businessImpactMatch = aiResponse.match(/BUSINESS IMPACT:\s*(.+?)(?=RECOMMENDED ACTION:|$)/is);
      const recommendedActionMatch = aiResponse.match(/RECOMMENDED ACTION:\s*(.+?)$/is);

      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
      }
      if (businessImpactMatch) {
        businessImpact = businessImpactMatch[1].trim();
      }
      if (recommendedActionMatch) {
        recommendedAction = recommendedActionMatch[1].trim();
      }

      // Fallback to line-by-line parsing if labeled sections not found
      if (!explanation || !businessImpact || !recommendedAction) {
        const lines = aiResponse.split('\n').filter(l => l.trim());
        
        lines.forEach((line, index) => {
          const lowerLine = line.toLowerCase();
          if ((lowerLine.includes('explanation') || lowerLine.includes('indicates')) && !explanation) {
            explanation = line.replace(/^.*explanation[:\-]?\s*/i, '').trim() || lines[index + 1]?.trim() || '';
          }
          if ((lowerLine.includes('business impact') || lowerLine.includes('affects')) && !businessImpact) {
            businessImpact = line.replace(/^.*business impact[:\-]?\s*/i, '').trim() || lines[index + 1]?.trim() || '';
          }
          if ((lowerLine.includes('recommended action') || lowerLine.includes('action')) && !recommendedAction) {
            recommendedAction = line.replace(/^.*recommended action[:\-]?\s*/i, '').trim() || lines[index + 1]?.trim() || '';
          }
        });
      }

      // Clean up and ensure concise text (max 200 chars per field)
      const truncateText = (text: string, maxLength: number = 200) => {
        if (!text || text.length <= maxLength) return text || '';
        // Try to cut at sentence boundary
        const truncated = text.substring(0, maxLength);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastExclamation = truncated.lastIndexOf('!');
        const lastQuestion = truncated.lastIndexOf('?');
        const lastBreak = Math.max(lastPeriod, lastExclamation, lastQuestion);
        if (lastBreak > maxLength * 0.7) {
          return truncated.substring(0, lastBreak + 1);
        }
        return truncated + '...';
      };

      explanation = truncateText(explanation);
      businessImpact = truncateText(businessImpact);
      recommendedAction = truncateText(recommendedAction);

      // If parsing failed, use the full response as explanation
      if (!explanation && !businessImpact && !recommendedAction) {
        explanation = truncateText(aiResponse.substring(0, 200));
        businessImpact = 'Could delay the project or increase costs';
        recommendedAction = 'Check with site engineer to verify the data';
      }

      return {
        explanation: explanation || `Detected ${anomaly.anomalyType} pattern: ${anomaly.patternDetected}`,
        businessImpact: businessImpact || 'Could delay the project or increase costs',
        recommendedAction: recommendedAction || 'Check with site engineer to verify the data',
      };
    } catch (error: any) {
      logger.error('Error getting AI explanation:', error);
      // Fallback
      return {
        explanation: `Detected ${anomaly.anomalyType} pattern: ${anomaly.patternDetected}`,
        businessImpact: 'Could delay the project or increase costs',
        recommendedAction: 'Check with site engineer to verify the data',
      };
    }
  }

  /**
   * Get all anomalies for a site with AI explanations
   */
  async getSiteAnomalies(projectId: string): Promise<Anomaly[]> {
    // Detect anomalies
    const [attendanceAnomalies, materialAnomalies] = await Promise.all([
      this.detectAttendanceAnomalies(projectId),
      this.detectMaterialAnomalies(projectId),
    ]);

    const allAnomalies = [...attendanceAnomalies, ...materialAnomalies];

    // Get AI explanations for each
    const anomaliesWithAI = await Promise.all(
      allAnomalies.map(async (anomaly) => {
        const aiExplanation = await this.getAIExplanation(anomaly, projectId);
        return {
          ...anomaly,
          ...aiExplanation,
        };
      })
    );

    return anomaliesWithAI;
  }
}

export const anomalyInsightsService = new AnomalyInsightsService();

