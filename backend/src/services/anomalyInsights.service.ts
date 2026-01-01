import { Attendance } from '../modules/attendance/attendance.model';
import { MaterialRequest } from '../modules/materials/material.model';
import { DPR } from '../modules/dpr/dpr.model';
import { Project } from '../modules/projects/project.model';
import { llmService } from './llm.service';
import { ragService } from './rag.service';
import { z } from 'zod';
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
    const materialMap = new Map<string, MaterialRequest[]>();
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
   * Get AI explanation for anomaly
   */
  async getAIExplanation(anomaly: Omit<Anomaly, 'explanation' | 'businessImpact' | 'recommendedAction'>): Promise<{
    explanation: string;
    businessImpact: string;
    recommendedAction: string;
  }> {
    // Get RAG context
    const ragContext = await ragService.getRAGContext(
      `${anomaly.anomalyType} ${anomaly.patternDetected}`
    );

    const systemPrompt = `You are a construction site anomaly analysis AI. Analyze detected anomalies and explain their business impact.

${ragContext}

IMPORTANT RULES:
- Do NOT detect anomalies (they are already detected)
- Focus on explaining what the pattern means
- Explain business impact in construction context
- Provide actionable recommendations based on policy documents
- Output ONLY valid JSON, no markdown formatting`;

    const userPrompt = `Analyze this anomaly:

Type: ${anomaly.anomalyType}
Pattern: ${anomaly.patternDetected}
Historical Comparison: ${anomaly.historicalComparison}
Project Stage: ${anomaly.projectStage}
Severity: ${anomaly.severity}
Confidence: ${anomaly.confidence}

Provide analysis in this EXACT JSON format:
{
  "explanation": "What this anomaly pattern indicates",
  "businessImpact": "How this affects the project (cost, timeline, quality)",
  "recommendedAction": "Specific action to take based on guidelines"
}`;

    try {
      const response = await llmService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const parsed = JSON.parse(response.content);
      
      const schema = z.object({
        explanation: z.string(),
        businessImpact: z.string(),
        recommendedAction: z.string(),
      });

      const validated = schema.parse(parsed);
      return validated;
    } catch (error: any) {
      logger.error('Error getting AI explanation:', error);
      // Fallback
      return {
        explanation: `Detected ${anomaly.anomalyType} pattern: ${anomaly.patternDetected}`,
        businessImpact: 'May impact project timeline and resource allocation',
        recommendedAction: 'Review data source and verify process compliance',
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
        const aiExplanation = await this.getAIExplanation(anomaly);
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

