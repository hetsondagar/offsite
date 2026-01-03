/**
 * Site Health Score Explanation Service
 * AI explains the calculated health score using real metrics
 */

import { calculateProjectHealthScore } from '../../utils/siteHealth';
import { Attendance } from '../../modules/attendance/attendance.model';
import { Task } from '../../modules/tasks/task.model';
import { MaterialRequest } from '../../modules/materials/material.model';
import { Project } from '../../modules/projects/project.model';
import { huggingFaceService } from './huggingface.service';
import { logger } from '../../utils/logger';

interface HealthMetrics {
  score: number;
  attendancePercent: number;
  taskCompletionPercent: number;
  pendingApprovals: number;
  materialDelays: number;
}

interface HealthExplanationResponse {
  interpretation: string;
  reasons: string[];
  focusArea: string;
  generatedAt: string;
  dataSource: 'mongodb';
}

/**
 * Aggregate real health metrics from MongoDB
 */
export async function aggregateHealthMetrics(projectId: string): Promise<HealthMetrics | null> {
  try {
    // Calculate health score (uses real DB data)
    const score = await calculateProjectHealthScore(projectId);

    // Get attendance rate for TODAY (matching dashboard calculation)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const project = await Project.findById(projectId).populate('members', 'role');
    if (!project) {
      return null;
    }

    // Count engineers only (they are the ones who mark attendance)
    const engineerMembers = project.members?.filter((member: any) => {
      const memberRole = typeof member === 'object' ? member.role : null;
      return memberRole === 'engineer';
    }) || [];
    const expectedUsers = engineerMembers.length;

    // Get today's attendance records
    const todayAttendanceRecords = await Attendance.find({
      projectId,
      timestamp: { $gte: today },
      type: 'checkin',
    });

    // Count unique users who checked in today
    const uniqueUsersToday = new Set(todayAttendanceRecords.map(a => a.userId.toString()));

    const attendancePercent = expectedUsers > 0
      ? Math.round((uniqueUsersToday.size / expectedUsers) * 100)
      : 0;

    // Get task completion rate
    const totalTasks = await Task.countDocuments({ projectId });
    const completedTasks = await Task.countDocuments({
      projectId,
      status: 'completed',
    });

    const taskCompletionPercent = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    // Get pending approvals
    const pendingApprovals = await MaterialRequest.countDocuments({
      projectId,
      status: 'pending',
    });

    // Get material delays (requests pending > 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const materialDelays = await MaterialRequest.countDocuments({
      projectId,
      status: 'pending',
      createdAt: { $lt: threeDaysAgo },
    });

    return {
      score,
      attendancePercent,
      taskCompletionPercent,
      pendingApprovals,
      materialDelays,
    };
  } catch (error) {
    logger.error('Error aggregating health metrics:', error);
    return null;
  }
}

/**
 * Generate AI explanation for health score
 */
export async function generateHealthExplanation(
  projectId: string
): Promise<HealthExplanationResponse | null> {
  try {
    // Aggregate real metrics
    const metrics = await aggregateHealthMetrics(projectId);

    if (!metrics) {
      return null;
    }

    // If AI service is not available, return structured explanation
    if (!huggingFaceService.isAvailable()) {
      const interpretation = metrics.score >= 70 ? 'Good' : metrics.score >= 50 ? 'Moderate' : 'Risky';
      const reasons: string[] = [];
      
      if (metrics.attendancePercent < 80) {
        reasons.push(`Low attendance rate: ${metrics.attendancePercent}%`);
      }
      if (metrics.taskCompletionPercent < 70) {
        reasons.push(`Task completion below target: ${metrics.taskCompletionPercent}%`);
      }
      if (metrics.pendingApprovals > 5) {
        reasons.push(`${metrics.pendingApprovals} pending material approvals`);
      }
      if (metrics.materialDelays > 0) {
        reasons.push(`${metrics.materialDelays} material requests delayed`);
      }

      return {
        interpretation,
        reasons: reasons.length > 0 ? reasons : ['All metrics within acceptable range'],
        focusArea: reasons[0] || 'Maintain current performance',
        generatedAt: new Date().toISOString(),
        dataSource: 'mongodb',
      };
    }

    // Build prompt with real data
    const attendanceStatus = metrics.attendancePercent >= 80 ? 'Excellent' : 
                             metrics.attendancePercent >= 60 ? 'Good' : 
                             metrics.attendancePercent >= 40 ? 'Moderate' : 'Low';
    
    const prompt = `You are an AI system explaining construction site health to a project owner.

Explain the site health score using the provided metrics.
Be factual, simple, and non-technical.
Do not exaggerate or predict beyond the data.
CRITICAL: Use the EXACT numbers provided. Do NOT assume or fabricate data.

Data:
- Site Health Score: ${metrics.score} / 100
- Today's Attendance rate: ${metrics.attendancePercent}% (${attendanceStatus})
- Task completion rate: ${metrics.taskCompletionPercent}%
- Pending approvals: ${metrics.pendingApprovals}
- Material delays: ${metrics.materialDelays}

IMPORTANT RULES:
- If attendance is ${metrics.attendancePercent}%, it is ${attendanceStatus.toLowerCase()}, NOT "below 70%"
- Only mention attendance as a concern if it's actually below 70%
- If attendance is 100%, say "Excellent attendance" or "All team members present"
- Use the actual numbers: ${metrics.attendancePercent}% means ${metrics.attendancePercent}%, not a different number
- Focus on metrics that are actually problematic, not ones that are good

Output:
- Overall interpretation (Good / Moderate / Risky) - based on ALL metrics
- Key reasons (bullet points) - use actual numbers from data above
- One suggested focus area (based ONLY on data)

Format your response as:
INTERPRETATION: [Good/Moderate/Risky]
REASONS:
- [reason 1 with actual numbers from data]
- [reason 2 with actual numbers from data]
FOCUS: [one focus area]`;

    const aiResponse = await huggingFaceService.generateText(prompt, 400);

    if (!aiResponse) {
      // Fallback
      const interpretation = metrics.score >= 70 ? 'Good' : metrics.score >= 50 ? 'Moderate' : 'Risky';
      return {
        interpretation,
        reasons: [`Health score: ${metrics.score}/100`],
        focusArea: 'Review project metrics',
        generatedAt: new Date().toISOString(),
        dataSource: 'mongodb',
      };
    }

    // Parse AI response
    const interpretationMatch = aiResponse.match(/INTERPRETATION:\s*(.+?)(?=REASONS:|$)/is);
    const reasonsMatch = aiResponse.match(/REASONS:\s*([\s\S]+?)(?=FOCUS:|$)/is);
    const focusMatch = aiResponse.match(/FOCUS:\s*(.+?)$/is);

    const interpretation = interpretationMatch
      ? interpretationMatch[1].trim()
      : metrics.score >= 70 ? 'Good' : metrics.score >= 50 ? 'Moderate' : 'Risky';

    const reasons = reasonsMatch
      ? reasonsMatch[1]
          .split('\n')
          .map(r => r.replace(/^[-•]\s*/, '').trim())
          .filter(r => r.length > 0)
      : [`Health score: ${metrics.score}/100`];

    const focusArea = focusMatch
      ? focusMatch[1].trim()
      : 'Review project metrics';

    return {
      interpretation,
      reasons,
      focusArea,
      generatedAt: new Date().toISOString(),
      dataSource: 'mongodb',
    };
  } catch (error) {
    logger.error('Error generating health explanation:', error);
    return null;
  }
}

