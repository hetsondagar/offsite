import { Project } from '../modules/projects/project.model';
import { DPR } from '../modules/dpr/dpr.model';
import { Attendance } from '../modules/attendance/attendance.model';
import { MaterialRequest } from '../modules/materials/material.model';
import { Task } from '../modules/tasks/task.model';
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
  taskStatus: {
    pending: number;
    inProgress: number;
    completed: number;
    delayed: number; // Tasks pending for more than 3 hours
    approachingDelay: number; // Tasks pending for 2-3 hours
    total: number;
  };
  recentDPRs: Array<{
    notes: string;
    workStoppage: any;
    createdAt: Date;
    taskTitle: string;
  }>;
  pendingMaterials: Array<{
    materialName: string;
    quantity: number;
    unit: string;
    reason: string;
    requestedBy: string;
    createdAt: Date;
    daysPending: number;
  }>;
  approvedMaterials: Array<{
    materialName: string;
    quantity: number;
    unit: string;
    approvedAt?: Date;
    createdAt: Date;
    approvedBy: string;
    daysSinceApproval: number;
  }>;
  rejectedMaterialShortage: Array<{
    materialName: string;
    quantity: number;
    unit: string;
    rejectionReason: string;
    rejectedAt?: Date;
    createdAt: Date;
    rejectedBy: string;
    daysSinceRejection: number;
  }>;
  allRejectedMaterials: Array<{
    materialName: string;
    quantity: number;
    unit: string;
    rejectionReason: string;
    rejectedAt?: Date;
    createdAt: Date;
    rejectedBy: string;
    daysSinceRejection: number;
  }>;
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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. DPR Delay Analysis
    // DPRs should be submitted daily. Check if a DPR was submitted today.
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    // Get the latest DPR
    const latestDPR = await DPR.findOne({
      projectId,
    }).sort({ createdAt: -1 });

    let dprDelayDays = 0;
    let dprDelayHours = 0;
    
    if (latestDPR) {
      const latestDPRDate = new Date(latestDPR.createdAt);
      const latestDPRDay = latestDPRDate.toISOString().split('T')[0];
      const todayString = now.toISOString().split('T')[0];
      
      // If latest DPR is from today, there's no delay
      if (latestDPRDay === todayString) {
        dprDelayDays = 0;
        dprDelayHours = 0;
      } else {
        // Latest DPR is from a previous day - check if we're past the expected submission time
        // DPRs are expected to be submitted by end of day (midnight) or early next day
        // We'll consider it a delay if it's past 2 PM today and no DPR has been submitted
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const hoursIntoDay = currentHour + (currentMinutes / 60);
        
        // Calculate days since last DPR
        const daysSinceLastDPR = Math.floor((now.getTime() - latestDPRDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastDPR === 0) {
          // Same day but different date strings (timezone issue) - no delay
          dprDelayDays = 0;
          dprDelayHours = 0;
        } else if (daysSinceLastDPR === 1) {
          // Last DPR was yesterday
          // Only count as delay if it's past 2 PM today (14:00)
          if (hoursIntoDay >= 14) {
            dprDelayHours = Math.round((hoursIntoDay - 14) * 10) / 10;
            dprDelayDays = 0;
          } else {
            dprDelayDays = 0;
            dprDelayHours = 0;
          }
        } else {
          // Last DPR was 2+ days ago - definitely delayed
          // Calculate delay from expected time (2 PM the day after last DPR)
          const expectedDPRTime = new Date(latestDPRDate);
          expectedDPRTime.setDate(expectedDPRTime.getDate() + 1);
          expectedDPRTime.setHours(14, 0, 0, 0); // Expected by 2 PM the next day
          
          const hoursSinceExpected = (now.getTime() - expectedDPRTime.getTime()) / (1000 * 60 * 60);
          dprDelayHours = Math.max(0, Math.round(hoursSinceExpected * 10) / 10);
          dprDelayDays = Math.floor(dprDelayHours / 24);
        }
      }
    } else {
      // No DPRs ever - check if project started recently
      const project = await Project.findById(projectId);
      if (project && project.startDate) {
        const projectStart = new Date(project.startDate);
        const daysSinceStart = (now.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceStart > 1) {
          // Project has been active for more than a day, should have DPRs
          dprDelayDays = Math.min(7, Math.floor(daysSinceStart));
          dprDelayHours = Math.min(7 * 24, daysSinceStart * 24);
        } else {
          dprDelayDays = 0;
          dprDelayHours = 0;
        }
      } else {
        // No project start date, assume delay if no DPRs
        dprDelayDays = 1;
        dprDelayHours = 24;
      }
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
    // Check for pending requests (pending for more than 1 day)
    const pendingMaterialRequests = await MaterialRequest.find({
      projectId,
      status: 'pending',
      createdAt: { $lt: oneDayAgo }, // Pending for more than 1 day
    });

    // Check for rejected requests with "material shortage" as rejection reason
    const rejectedMaterialShortage = await MaterialRequest.find({
      projectId,
      status: 'rejected',
      rejectionReason: { $regex: /material.*shortage|shortage.*material/i }, // Case-insensitive match
      rejectedAt: { $gte: thirtyDaysAgo }, // Rejected within last 30 days
    });

    const materialShortage = pendingMaterialRequests.length > 0 || rejectedMaterialShortage.length > 0;

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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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

    // Get task status breakdown
    const tasks = await Task.find({ projectId });
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    
    // Calculate delayed tasks (pending for more than 3 hours)
    const delayedTasks = tasks.filter(t => {
      if (t.status !== 'pending') return false;
      const taskCreatedAt = new Date(t.createdAt);
      return taskCreatedAt < threeHoursAgo;
    });
    
    // Calculate tasks approaching delay (pending for 2-3 hours)
    const approachingDelayTasks = tasks.filter(t => {
      if (t.status !== 'pending') return false;
      const taskCreatedAt = new Date(t.createdAt);
      const hoursSinceCreation = (now.getTime() - taskCreatedAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceCreation >= 2 && hoursSinceCreation < 3;
    });
    
    const taskStatus = {
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      delayed: delayedTasks.length, // Tasks pending for more than 3 hours
      approachingDelay: approachingDelayTasks.length, // Tasks pending for 2-3 hours
      total: tasks.length,
    };

    // Get recent DPRs with notes and work stoppage info (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentDPRs = await DPR.find({
      projectId,
      createdAt: { $gte: sevenDaysAgo },
    })
      .populate('taskId', 'title')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('notes workStoppage createdAt taskId');

    // Get pending material requests (requested but not approved/received)
    const pendingMaterials = await MaterialRequest.find({
      projectId,
      status: 'pending',
    })
      .populate('requestedBy', 'name')
      .sort({ createdAt: -1 })
      .select('materialName quantity unit reason createdAt');

    // Get approved but not yet received materials (approved but still waiting)
    // Note: Since there's no "received" status, we consider approved materials as "waiting to be received"
    const approvedMaterials = await MaterialRequest.find({
      projectId,
      status: 'approved',
    })
      .populate('approvedBy', 'name')
      .sort({ approvedAt: -1 })
      .select('materialName quantity unit approvedAt createdAt');

    // Get ALL rejected materials (not just material shortage - show all rejections)
    const allRejectedMaterials = await MaterialRequest.find({
      projectId,
      status: 'rejected',
      rejectedAt: { $gte: thirtyDaysAgo }, // Rejected within last 30 days
    })
      .populate('rejectedBy', 'name')
      .sort({ rejectedAt: -1 })
      .select('materialName quantity unit rejectionReason rejectedAt createdAt');
    
    // Filter for material shortage specifically (for the signal)
    const rejectedMaterialShortage = allRejectedMaterials.filter(mat => {
      const reason = (mat.rejectionReason || '').toLowerCase();
      return reason.includes('material') && reason.includes('shortage') ||
             reason.includes('shortage') && reason.includes('material') ||
             reason.includes('material shortage') ||
             reason.includes('shortage of material');
    });

    return {
      stage: project.status,
      timelineStatus,
      budgetRemaining,
      taskStatus,
      recentDPRs: recentDPRs.map(dpr => {
        const taskTitle = (dpr.taskId && typeof dpr.taskId === 'object' && 'title' in dpr.taskId) 
          ? (dpr.taskId as any).title 
          : 'Task';
        return {
          notes: dpr.notes || '',
          workStoppage: dpr.workStoppage || null,
          createdAt: dpr.createdAt,
          taskTitle,
        };
      }),
      pendingMaterials: pendingMaterials.map(mat => {
        const requestedByName = (mat.requestedBy && typeof mat.requestedBy === 'object' && 'name' in mat.requestedBy) 
          ? (mat.requestedBy as any).name 
          : 'Unknown';
        return {
          materialName: mat.materialName,
          quantity: mat.quantity,
          unit: mat.unit,
          reason: mat.reason,
          requestedBy: requestedByName,
          createdAt: mat.createdAt,
          daysPending: Math.floor((now.getTime() - new Date(mat.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        };
      }),
      approvedMaterials: approvedMaterials.map(mat => {
        const approvedByName = (mat.approvedBy && typeof mat.approvedBy === 'object' && 'name' in mat.approvedBy) 
          ? (mat.approvedBy as any).name 
          : 'Unknown';
        return {
          materialName: mat.materialName,
          quantity: mat.quantity,
          unit: mat.unit,
          approvedAt: mat.approvedAt,
          createdAt: mat.createdAt,
          approvedBy: approvedByName,
          daysSinceApproval: mat.approvedAt ? Math.floor((now.getTime() - new Date(mat.approvedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        };
      }),
      rejectedMaterialShortage: rejectedMaterialShortage.map(mat => {
        const rejectedByName = (mat.rejectedBy && typeof mat.rejectedBy === 'object' && 'name' in mat.rejectedBy) 
          ? (mat.rejectedBy as any).name 
          : 'Unknown';
        return {
          materialName: mat.materialName,
          quantity: mat.quantity,
          unit: mat.unit,
          rejectionReason: mat.rejectionReason || '',
          rejectedAt: mat.rejectedAt,
          createdAt: mat.createdAt,
          rejectedBy: rejectedByName,
          daysSinceRejection: mat.rejectedAt ? Math.floor((now.getTime() - new Date(mat.rejectedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        };
      }),
      allRejectedMaterials: allRejectedMaterials.map(mat => {
        const rejectedByName = (mat.rejectedBy && typeof mat.rejectedBy === 'object' && 'name' in mat.rejectedBy) 
          ? (mat.rejectedBy as any).name 
          : 'Unknown';
        return {
          materialName: mat.materialName,
          quantity: mat.quantity,
          unit: mat.unit,
          rejectionReason: mat.rejectionReason || '',
          rejectedAt: mat.rejectedAt,
          createdAt: mat.createdAt,
          rejectedBy: rejectedByName,
          daysSinceRejection: mat.rejectedAt ? Math.floor((now.getTime() - new Date(mat.rejectedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        };
      }),
    };
  }

  /**
   * Calculate deterministic risk score (0-100)
   */
  calculateRiskScore(signals: RiskSignals, _projectContext?: ProjectContext): number {
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
    _siteId: string,
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
- CRITICAL: When assessing task status:
  * "Pending" means task is NOT STARTED yet - engineer hasn't begun work
  * "In Progress" means task is ACTIVE - engineer is currently working on it
  * "Completed" means task is FINISHED
  * High number of pending tasks indicates work not being started
  * Tasks in progress are good - shows active work happening
  * Low completion rate means tasks are taking longer or not being finished

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
- Task Status Breakdown:
  * Total Tasks: ${projectContext.taskStatus.total}
  * Not Started (Pending): ${projectContext.taskStatus.pending} - These tasks have NOT been started by engineers
  * ⚠️ DELAYED Tasks: ${projectContext.taskStatus.delayed} - Tasks pending for MORE THAN 3 HOURS (CRITICAL - should have been started)
  * ⚠️ Approaching Delay: ${projectContext.taskStatus.approachingDelay} - Tasks pending for 2-3 hours (will be delayed soon)
  * In Progress: ${projectContext.taskStatus.inProgress} - These tasks are currently being worked on (ACTIVE)
  * Completed: ${projectContext.taskStatus.completed} - These tasks are finished
  * Completion Rate: ${projectContext.taskStatus.total > 0 ? Math.round((projectContext.taskStatus.completed / projectContext.taskStatus.total) * 100) : 0}%
  
TASK STATUS INTERPRETATION:
- CRITICAL: ${projectContext.taskStatus.delayed} tasks are DELAYED (pending for more than 3 hours). These tasks should have been started but engineers have not begun work. This is a serious operational issue.
- WARNING: ${projectContext.taskStatus.approachingDelay} tasks are approaching delay (pending for 2-3 hours). These need immediate attention to prevent delays.
- If ${projectContext.taskStatus.pending} tasks are pending (not started), this indicates ${projectContext.taskStatus.pending > projectContext.taskStatus.total * 0.5 ? 'many tasks are not being started, which is a concern' : projectContext.taskStatus.pending > 0 ? 'some tasks need to be started' : 'all tasks have been started, which is good'}
- If ${projectContext.taskStatus.inProgress} tasks are in progress, this shows ${projectContext.taskStatus.inProgress > 0 ? 'active work is happening on site' : 'no tasks are currently being worked on, which may indicate idle time'}
- Completion rate of ${projectContext.taskStatus.total > 0 ? Math.round((projectContext.taskStatus.completed / projectContext.taskStatus.total) * 100) : 0}% means ${projectContext.taskStatus.completed === projectContext.taskStatus.total ? 'all tasks are completed' : projectContext.taskStatus.completed > projectContext.taskStatus.total * 0.7 ? 'most tasks are completed, good progress' : projectContext.taskStatus.completed > projectContext.taskStatus.total * 0.3 ? 'some tasks are completed, moderate progress' : 'few tasks are completed, progress is slow'}

Deterministic Risk Level: ${deterministicRiskLevel}

CRITICAL ASSESSMENT RULES FOR DPR DELAYS:
- ${signals.dprDelayHours < 2 ? `Current delay: ${signals.dprDelayHours.toFixed(1)} hours - This is ACCEPTABLE. Risk can be LOW.` : ''}
- ${signals.dprDelayHours >= 2 && signals.dprDelayHours < 24 ? `Current delay: ${signals.dprDelayHours.toFixed(1)} hours - This is MODERATE. Risk should be MEDIUM, not LOW.` : ''}
- ${signals.dprDelayDays >= 1 && signals.dprDelayDays < 2 ? `Current delay: ${signals.dprDelayDays} day (${signals.dprDelayHours.toFixed(1)} hours) - This is CONCERNING. Risk MUST be MEDIUM or HIGH, NOT LOW.` : ''}
- ${signals.dprDelayDays >= 2 ? `Current delay: ${signals.dprDelayDays} days (${signals.dprDelayHours.toFixed(1)} hours) - This is SERIOUS. Risk MUST be HIGH, NOT LOW or MEDIUM.` : ''}

FULL PROJECT CONTEXT - Everything happening on site:
- DPR Status: ${signals.dprDelayHours === 0 ? 'Up to date - DPR submitted today' : signals.dprDelayHours < 24 ? `Delayed by ${signals.dprDelayHours.toFixed(1)} hours - needs attention` : `CRITICAL: No DPR for ${signals.dprDelayDays} day(s) - immediate action required`}
- Attendance: ${signals.attendanceVariance < 20 ? 'Stable attendance patterns' : signals.attendanceVariance < 40 ? `Moderate attendance variance (${signals.attendanceVariance}%)` : `High attendance variance (${signals.attendanceVariance}%) - inconsistent workforce`}
- Material Requests: ${signals.pendingApprovals === 0 ? 'No pending approvals - materials flowing smoothly' : `${signals.pendingApprovals} material request(s) pending approval - may cause delays`}
- Material Shortage: ${signals.materialShortage ? `YES - Materials are delayed, work may be blocked. ${projectContext.rejectedMaterialShortage.length > 0 ? `PM has confirmed material shortage by rejecting ${projectContext.rejectedMaterialShortage.length} request(s) due to shortage.` : ''}` : 'NO - No material shortages detected'}
- Project Stage: ${projectContext.stage}
- Timeline: ${projectContext.timelineStatus === 'on-track' ? 'On track' : projectContext.timelineStatus === 'overdue' ? 'OVERDUE - Project behind schedule' : 'No deadline set'}
- Budget: ${projectContext.budgetRemaining}% remaining
- Task Activity: ${projectContext.taskStatus.total === 0 ? '⚠️ NO TASKS - Site is completely idle, no work assigned' : projectContext.taskStatus.inProgress > 0 ? `${projectContext.taskStatus.inProgress} active task(s) in progress - work happening` : 'NO active tasks - site may be idle'}
- Task Delays: ${projectContext.taskStatus.total === 0 ? '⚠️ CRITICAL: No tasks exist - site is idle, work needs to be assigned' : projectContext.taskStatus.delayed > 0 ? `⚠️ CRITICAL: ${projectContext.taskStatus.delayed} task(s) delayed (not started within 3 hours) - immediate action needed` : projectContext.taskStatus.approachingDelay > 0 ? `⚠️ WARNING: ${projectContext.taskStatus.approachingDelay} task(s) approaching delay (2-3 hours pending)` : 'No task delays - all tasks started promptly'}

RECENT DPR CONTEXT (Last 7 days - what engineers reported):
${projectContext.recentDPRs.length > 0 ? projectContext.recentDPRs.map((dpr, idx) => `
DPR ${idx + 1} (${new Date(dpr.createdAt).toLocaleDateString()}):
- Task: ${dpr.taskTitle}
- Notes: ${dpr.notes || 'No notes provided'}
${dpr.workStoppage?.occurred ? `- ⚠️ WORK STOPPAGE REPORTED: ${dpr.workStoppage.reason?.replace('_', ' ').toLowerCase() || 'Not specified'} for ${dpr.workStoppage.durationHours || 0} hours. Remarks: ${dpr.workStoppage.remarks || 'None'}` : ''}
`).join('\n') : '⚠️ No DPRs submitted in the last 7 days - this is a concern as DPRs should be submitted daily'}

WORK STOPPAGES SUMMARY (From recent DPRs):
${projectContext.recentDPRs.filter(dpr => dpr.workStoppage?.occurred).length > 0 ? projectContext.recentDPRs.filter(dpr => dpr.workStoppage?.occurred).map((dpr, idx) => `
⚠️ WORK STOPPAGE ${idx + 1} (${new Date(dpr.createdAt).toLocaleDateString()}):
- Task: ${dpr.taskTitle}
- Reason: ${dpr.workStoppage.reason?.replace('_', ' ').toLowerCase() || 'Not specified'}
- Duration: ${dpr.workStoppage.durationHours || 0} hours
- Remarks: ${dpr.workStoppage.remarks || 'None'}
- Impact: This work stoppage has already caused delays on site
`).join('\n') : 'No work stoppages reported in recent DPRs'}

PENDING MATERIAL REQUESTS (Requested but NOT approved/received - work may be blocked):
${projectContext.pendingMaterials.length > 0 ? projectContext.pendingMaterials.map((mat, idx) => `
Request ${idx + 1}:
- Material: ${mat.materialName} (${mat.quantity} ${mat.unit})
- Requested by: ${mat.requestedBy}
- Reason: ${mat.reason}
- Status: PENDING APPROVAL (waiting ${mat.daysPending} day(s) - material has NOT been received)
- Impact: Work may be blocked waiting for this material
`).join('\n') : 'No pending material requests - all materials flowing smoothly'}

APPROVED MATERIALS (Approved but NOT yet received - waiting for delivery):
${projectContext.approvedMaterials.length > 0 ? projectContext.approvedMaterials.filter(mat => mat.daysSinceApproval > 0).map((mat, idx) => `
Material ${idx + 1}:
- Material: ${mat.materialName} (${mat.quantity} ${mat.unit})
- Approved by: ${mat.approvedBy}
- Status: APPROVED but NOT RECEIVED (approved ${mat.daysSinceApproval} day(s) ago - material still waiting to be delivered)
- Impact: Work may be blocked - material was approved but hasn't arrived on site
`).join('\n') : 'No approved materials waiting to be received - all approved materials have been delivered'}

ALL REJECTED MATERIAL REQUESTS (Last 30 days - ALL rejections, not just material shortage):
${projectContext.allRejectedMaterials.length > 0 ? projectContext.allRejectedMaterials.map((mat, idx) => `
Rejected Material ${idx + 1}:
- Material: ${mat.materialName} (${mat.quantity} ${mat.unit})
- Rejected by: ${mat.rejectedBy}
- Rejection Reason: ${mat.rejectionReason || 'Not specified'}
- Status: REJECTED (rejected ${mat.daysSinceRejection} day(s) ago)
- Impact: ${mat.rejectionReason && (mat.rejectionReason.toLowerCase().includes('shortage') || mat.rejectionReason.toLowerCase().includes('material')) ? '⚠️ CRITICAL - Material shortage confirmed by PM. Work is blocked due to lack of materials.' : 'Material request was rejected. Check if this is blocking work.'}
`).join('\n') : 'No rejected material requests in the last 30 days'}

REJECTED MATERIALS - MATERIAL SHORTAGE SPECIFICALLY:
${projectContext.rejectedMaterialShortage.length > 0 ? projectContext.rejectedMaterialShortage.map((mat, idx) => `
Material Shortage ${idx + 1}:
- Material: ${mat.materialName} (${mat.quantity} ${mat.unit})
- Rejected by: ${mat.rejectedBy}
- Rejection Reason: ${mat.rejectionReason}
- Status: REJECTED due to MATERIAL SHORTAGE (rejected ${mat.daysSinceRejection} day(s) ago)
- Impact: ⚠️ CRITICAL - Material shortage confirmed by PM. Work is blocked due to lack of materials. This is a serious operational issue.
`).join('\n') : 'No material shortages from rejected requests (but check ALL REJECTED MATERIAL REQUESTS above for other rejections)'}

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
          // Parse text response with improved pattern matching
          const lines = aiResponse.split('\n').filter(l => l.trim());
          
          // Extract summary
          const summaryLine = lines.findIndex(l => 
            l.toLowerCase().includes('summary') || 
            l.toLowerCase().includes('overall') ||
            l.toLowerCase().includes('risk situation')
          );
          const summary = summaryLine >= 0 
            ? lines.slice(summaryLine, summaryLine + 3).join(' ').replace(/^.*summary[:\-]?\s*/i, '').trim()
            : lines.slice(0, 3).join(' ') || 
              `Site shows ${deterministicRiskLevel.toLowerCase()} risk based on provided signals.`;
          
          // Extract reasons - look for section headers and numbered/bulleted lists
          const reasons: string[] = [];
          let inReasonsSection = false;
          
          lines.forEach((line) => {
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('reason') && (lowerLine.includes(':') || lowerLine.includes('-'))) {
              inReasonsSection = true;
            }
            if (inReasonsSection && (line.match(/^[-•\d]+\.?\s+/) || line.match(/^\d+\./))) {
              const cleaned = line.replace(/^[-•\d]+\.?\s*/, '').trim();
              if (cleaned && !cleaned.toLowerCase().includes('recommend') && !cleaned.toLowerCase().includes('action')) {
                reasons.push(cleaned);
              }
            }
            // Stop at recommendations section
            if (lowerLine.includes('recommend') || lowerLine.includes('action')) {
              inReasonsSection = false;
            }
          });
          
          // If no reasons found, try alternative patterns
          if (reasons.length === 0) {
            lines.forEach(line => {
              if (line.match(/^\d+\./) && !line.toLowerCase().includes('recommend') && !line.toLowerCase().includes('action')) {
                const cleaned = line.replace(/^\d+\.\s*/, '').trim();
                if (cleaned) reasons.push(cleaned);
              }
            });
          }
          
          // Extract recommendations - look for section headers and numbered/bulleted lists
          const recommendations: string[] = [];
          let inRecommendationsSection = false;
          
          lines.forEach((line) => {
            const lowerLine = line.toLowerCase();
            if ((lowerLine.includes('recommend') || lowerLine.includes('action')) && 
                (lowerLine.includes(':') || lowerLine.includes('-'))) {
              inRecommendationsSection = true;
            }
            if (inRecommendationsSection && (line.match(/^[-•\d]+\.?\s+/) || line.match(/^\d+\./))) {
              const cleaned = line.replace(/^[-•\d]+\.?\s*/, '').trim();
              if (cleaned) {
                recommendations.push(cleaned);
              }
            }
          });
          
          // If no recommendations found in section, try finding any line with "recommend" or "action"
          if (recommendations.length === 0) {
            lines.forEach(line => {
              const lowerLine = line.toLowerCase();
              if ((lowerLine.includes('recommend') || lowerLine.includes('action')) && 
                  !lowerLine.includes('provide') && 
                  !lowerLine.includes('format')) {
                const cleaned = line.replace(/^.*(recommend|action)[:\-]?\s*/i, '').trim();
                if (cleaned && cleaned.length > 10) {
                  recommendations.push(cleaned);
                }
              }
            });
          }

          logger.debug(`Parsed AI response - Reasons: ${reasons.length}, Recommendations: ${recommendations.length}`);

          parsed = {
            riskLevel: deterministicRiskLevel,
            summary: summary.substring(0, 500), // Limit summary length
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
        logger.warn('Could not parse AI response as JSON, using fallback', parseError);
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

      // Ensure recommendations array exists and has items
      const finalRecommendations = parsed.recommendations && Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
        ? parsed.recommendations
        : [
            'Review DPR submission process',
            'Monitor attendance patterns',
            'Streamline approval workflow',
          ];

      logger.debug(`Final AI analysis - Risk Level: ${parsed.riskLevel || deterministicRiskLevel}, Recommendations: ${finalRecommendations.length}`);

      return {
        riskLevel: parsed.riskLevel || deterministicRiskLevel,
        summary: parsed.summary || `Site shows ${deterministicRiskLevel.toLowerCase()} risk based on provided signals.`,
        topReasons: parsed.topReasons && Array.isArray(parsed.topReasons) && parsed.topReasons.length > 0
          ? parsed.topReasons
          : [
              signals.dprDelayDays > 0 ? `${signals.dprDelayDays} day(s) DPR delay` : null,
              signals.attendanceVariance > 30 ? `Attendance variance ${signals.attendanceVariance.toFixed(1)}%` : null,
              signals.pendingApprovals > 0 ? `${signals.pendingApprovals} pending approvals` : null,
            ].filter(Boolean) as string[],
        recommendations: finalRecommendations,
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
    const riskScore = this.calculateRiskScore(signals, projectContext);
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

