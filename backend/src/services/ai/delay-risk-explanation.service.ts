/**
 * Delay Risk Explanation Service
 * AI explains WHY risk exists based on real data
 */

import { Task } from '../../modules/tasks/task.model';
import { MaterialRequest } from '../../modules/materials/material.model';
import { Attendance } from '../../modules/attendance/attendance.model';
import { Project } from '../../modules/projects/project.model';
import { huggingFaceService } from './huggingface.service';
import { logger } from '../../utils/logger';

interface DelayRiskData {
  delayedTasks: number;
  attendanceTrend: string;
  pendingMaterials: number;
  avgCompletionTime: number;
}

interface DelayRiskExplanationResponse {
  riskLevel: 'Low' | 'Medium' | 'High';
  reasons: string[];
  actions: string[];
  generatedAt: string;
  dataSource: 'mongodb';
}

/**
 * Aggregate real delay risk data from MongoDB
 */
export async function aggregateDelayRiskData(projectId: string): Promise<DelayRiskData | null> {
  try {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Count delayed tasks (> 2 days overdue)
    const tasks = await Task.find({ projectId });
    const delayedTasks = tasks.filter(t => {
      if (!t.dueDate || t.status === 'completed') return false;
      return new Date(t.dueDate) < twoDaysAgo;
    }).length;

    // Calculate attendance trend (last 14 days)
    const attendanceRecords = await Attendance.find({
      projectId,
      timestamp: { $gte: fourteenDaysAgo },
      type: 'checkin',
    });

    // Group by day
    const dailyAttendance = new Map<string, Set<string>>();
    attendanceRecords.forEach(record => {
      const dateKey = record.timestamp.toISOString().split('T')[0];
      if (!dailyAttendance.has(dateKey)) {
        dailyAttendance.set(dateKey, new Set());
      }
      dailyAttendance.get(dateKey)!.add(record.userId.toString());
    });

    const dailyCounts = Array.from(dailyAttendance.values()).map(set => set.size);
    const recentCounts = dailyCounts.slice(-7); // Last 7 days
    const earlierCounts = dailyCounts.slice(0, -7); // Previous 7 days

    const recentAvg = recentCounts.length > 0
      ? recentCounts.reduce((a, b) => a + b, 0) / recentCounts.length
      : 0;
    const earlierAvg = earlierCounts.length > 0
      ? earlierCounts.reduce((a, b) => a + b, 0) / earlierCounts.length
      : 0;

    let attendanceTrend = 'Stable';
    if (recentAvg > earlierAvg * 1.1) {
      attendanceTrend = 'Improving';
    } else if (recentAvg < earlierAvg * 0.9) {
      attendanceTrend = 'Declining';
    }

    // Count pending material approvals
    const pendingMaterials = await MaterialRequest.countDocuments({
      projectId,
      status: 'pending',
    });

    // Calculate average task completion time (completed tasks only)
    const completedTasks = await Task.find({
      projectId,
      status: 'completed',
      createdAt: { $gte: fourteenDaysAgo },
    }).select('createdAt updatedAt');

    let avgCompletionTime = 0;
    if (completedTasks.length > 0) {
      const completionTimes = completedTasks
        .map(t => {
          const created = new Date(t.createdAt);
          const completed = new Date(t.updatedAt);
          return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
        })
        .filter(t => t > 0 && t < 365); // Filter outliers

      if (completionTimes.length > 0) {
        avgCompletionTime = Math.round(
          completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        );
      }
    }

    return {
      delayedTasks,
      attendanceTrend,
      pendingMaterials,
      avgCompletionTime: avgCompletionTime || 0,
    };
  } catch (error) {
    logger.error('Error aggregating delay risk data:', error);
    return null;
  }
}

/**
 * Generate AI explanation for delay risk
 */
export async function generateDelayRiskExplanation(
  projectId: string
): Promise<DelayRiskExplanationResponse | null> {
  try {
    // Aggregate real data
    const data = await aggregateDelayRiskData(projectId);

    if (!data) {
      return null;
    }

    // Determine risk level from data
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    if (data.delayedTasks > 5 || data.pendingMaterials > 10 || data.attendanceTrend === 'Declining') {
      riskLevel = 'High';
    } else if (data.delayedTasks > 0 || data.pendingMaterials > 5) {
      riskLevel = 'Medium';
    }

    // If AI service is not available, return structured explanation
    if (!huggingFaceService.isAvailable()) {
      const reasons: string[] = [];
      const actions: string[] = [];

      if (data.delayedTasks > 0) {
        reasons.push(`${data.delayedTasks} tasks are overdue by more than 2 days`);
        actions.push('Review and prioritize overdue tasks');
      }
      if (data.pendingMaterials > 0) {
        reasons.push(`${data.pendingMaterials} material requests pending approval`);
        actions.push('Expedite material approval process');
      }
      if (data.attendanceTrend === 'Declining') {
        reasons.push('Attendance trend is declining');
        actions.push('Investigate attendance issues');
      }
      if (data.avgCompletionTime > 7) {
        reasons.push(`Average task completion time is ${data.avgCompletionTime} days`);
      }

      return {
        riskLevel,
        reasons: reasons.length > 0 ? reasons : ['No significant risks detected'],
        actions: actions.length > 0 ? actions : ['Continue monitoring project progress'],
        generatedAt: new Date().toISOString(),
        dataSource: 'mongodb',
      };
    }

    // Build prompt with real data
    const prompt = `You are analyzing construction project delay risks.

Based strictly on the provided data, explain whether the project is at risk of delay.
Do not predict dates.
Do not assume causes not shown in data.

Data:
- Delayed tasks count: ${data.delayedTasks}
- Attendance trend: ${data.attendanceTrend}
- Pending material approvals: ${data.pendingMaterials}
- Avg task completion speed (days): ${data.avgCompletionTime}

Output:
- Risk level: Low / Medium / High
- Clear reasons (bullet points)
- Immediate action suggestions (max 3)

Format your response as:
RISK: [Low/Medium/High]
REASONS:
- [reason 1]
- [reason 2]
ACTIONS:
- [action 1]
- [action 2]`;

    let aiResponse: string | null = null;
    try {
      aiResponse = await huggingFaceService.generateText(prompt, 400);
    } catch (error) {
      logger.warn('AI service error, falling back to structured explanation:', error);
      // Fall through to structured explanation below
    }

    if (!aiResponse) {
      // Fallback
      const reasons: string[] = [];
      if (data.delayedTasks > 0) reasons.push(`${data.delayedTasks} delayed tasks`);
      if (data.pendingMaterials > 0) reasons.push(`${data.pendingMaterials} pending approvals`);
      
      return {
        riskLevel,
        reasons: reasons.length > 0 ? reasons : ['No significant risks'],
        actions: ['Monitor project progress'],
        generatedAt: new Date().toISOString(),
        dataSource: 'mongodb',
      };
    }

    // Parse AI response
    const riskMatch = aiResponse.match(/RISK:\s*(.+?)(?=REASONS:|$)/is);
    const reasonsMatch = aiResponse.match(/REASONS:\s*([\s\S]+?)(?=ACTIONS:|$)/is);
    const actionsMatch = aiResponse.match(/ACTIONS:\s*([\s\S]+?)$/is);

    const parsedRisk = riskMatch ? riskMatch[1].trim() : riskLevel;
    riskLevel = (parsedRisk === 'High' || parsedRisk === 'Medium' || parsedRisk === 'Low')
      ? parsedRisk as 'Low' | 'Medium' | 'High'
      : riskLevel;

    const reasons = reasonsMatch
      ? reasonsMatch[1]
          .split('\n')
          .map(r => r.replace(/^[-•]\s*/, '').trim())
          .filter(r => r.length > 0)
      : [`${data.delayedTasks} delayed tasks, ${data.pendingMaterials} pending approvals`];

    const actions = actionsMatch
      ? actionsMatch[1]
          .split('\n')
          .map(a => a.replace(/^[-•]\s*/, '').trim())
          .filter(a => a.length > 0)
          .slice(0, 3)
      : ['Review project status'];

    return {
      riskLevel,
      reasons,
      actions,
      generatedAt: new Date().toISOString(),
      dataSource: 'mongodb',
    };
  } catch (error) {
    logger.error('Error generating delay risk explanation:', error);
    return null;
  }
}

