import { Task } from '../modules/tasks/task.model';
import { MaterialRequest } from '../modules/materials/material.model';
import { Attendance } from '../modules/attendance/attendance.model';
import { DPR } from '../modules/dpr/dpr.model';
import { Project } from '../modules/projects/project.model';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface DelayRisk {
  projectId: string;
  projectName: string;
  risk: RiskLevel;
  probability: number; // 0-100
  impact: string;
  cause: string;
}

/**
 * Predict delay risk for a project
 * Triggers HIGH risk if:
 * - No DPR submitted within 24 hours (DPRs must be submitted daily)
 * - Tasks overdue > 2 days
 * - Material approvals pending > 48 hours
 * - Attendance < 70%
 */
export const predictDelayRisk = async (
  projectId: string,
  projectName: string
): Promise<DelayRisk> => {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Check overdue tasks (> 2 days) - distinguish between pending and in-progress
  const tasks = await Task.find({ projectId });
  
  // Separate tasks by status
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  
  // Overdue tasks that are pending (not started) - more concerning
  const overduePendingTasks = pendingTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < twoDaysAgo;
  });
  
  // Overdue tasks that are in-progress (started but delayed) - less concerning but still risky
  const overdueInProgressTasks = inProgressTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < twoDaysAgo;
  });
  
  // Tasks approaching due date (within 2 days) that are still pending - early warning
  const approachingDuePendingTasks = pendingTasks.filter(t => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilDue > 0 && daysUntilDue <= 2;
  });
  
  const overdueTasks = [...overduePendingTasks, ...overdueInProgressTasks];
  
  // Check DPR submission delay - DPRs should be submitted daily
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  
  // Check if there's a DPR submitted today
  const todayDPR = await DPR.findOne({
    projectId,
    createdAt: { $gte: todayStart, $lt: todayEnd },
  });
  
  // Get the latest DPR
  const latestDPR = await DPR.findOne({ projectId }).sort({ createdAt: -1 });
  
  let hasDPRDelay = false;
  let dprDelayHours = 0;
  let dprDelayDays = 0;
  
  if (!todayDPR && latestDPR) {
    // No DPR today, check how long since last DPR
    const latestDPRDate = new Date(latestDPR.createdAt);
    const hoursSinceLastDPR = (now.getTime() - latestDPRDate.getTime()) / (1000 * 60 * 60);
    
    // If more than 24 hours since last DPR, it's a delay
    if (hoursSinceLastDPR >= 24) {
      hasDPRDelay = true;
      dprDelayHours = Math.round(hoursSinceLastDPR * 10) / 10;
      dprDelayDays = Math.floor(dprDelayHours / 24);
    }
  } else if (!todayDPR && !latestDPR) {
    // No DPRs ever - check if project should have DPRs
    const project = await Project.findById(projectId);
    if (project && project.startDate) {
      const projectStart = new Date(project.startDate);
      const daysSinceStart = (now.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceStart >= 1) {
        // Project has been active for at least a day, should have DPRs
        hasDPRDelay = true;
        dprDelayDays = Math.min(7, Math.floor(daysSinceStart));
        dprDelayHours = dprDelayDays * 24;
      }
    } else {
      // No project start date, but no DPRs - assume delay
      hasDPRDelay = true;
      dprDelayDays = 1;
      dprDelayHours = 24;
    }
  }
  
  // Check pending material approvals (> 48 hours)
  const pendingMaterials = await MaterialRequest.find({
    projectId,
    status: 'pending',
    createdAt: { $lt: fortyEightHoursAgo },
  });

  // Check work stoppage reasons from recent DPRs (last 7 days)
  const recentDPRs = await DPR.find({
    projectId,
    createdAt: { $gte: sevenDaysAgo },
    'workStoppage.occurred': true,
  });

  // Count stoppage reasons
  const stoppageReasons: Record<string, number> = {};
  let totalStoppageHours = 0;
  recentDPRs.forEach((dpr: any) => {
    if (dpr.workStoppage?.reason) {
      const reason = dpr.workStoppage.reason;
      stoppageReasons[reason] = (stoppageReasons[reason] || 0) + 1;
      totalStoppageHours += dpr.workStoppage.durationHours || 0;
    }
  });

  // Get top stoppage reason
  const topStoppageReason = Object.entries(stoppageReasons)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
  
  // Check attendance (last 7 days)
  const attendanceRecords = await Attendance.find({
    projectId,
    timestamp: { $gte: sevenDaysAgo },
    type: 'checkin',
  });
  const uniqueUsers = new Set(attendanceRecords.map(a => a.userId.toString()));
  
  // Get actual project members (engineers only, as they are the ones who mark attendance)
  const project = await Project.findById(projectId).populate('members', 'role');
  const engineerMembers = project?.members?.filter((member: any) => {
    const memberRole = typeof member === 'object' ? member.role : null;
    return memberRole === 'engineer';
  }) || [];
  const expectedUsers = engineerMembers.length || 1; // Default to 1 to avoid division by zero
  const attendanceRate = expectedUsers > 0 ? (uniqueUsers.size / expectedUsers) * 100 : 0;
  
  // Calculate risk factors
  const hasOverdueTasks = overdueTasks.length > 0;
  const hasOverduePendingTasks = overduePendingTasks.length > 0; // More concerning - not even started
  const hasOverdueInProgressTasks = overdueInProgressTasks.length > 0; // Less concerning - work is happening
  const hasManyPendingTasks = pendingTasks.length > inProgressTasks.length * 2; // More pending than in-progress
  const hasApproachingDuePendingTasks = approachingDuePendingTasks.length > 0;
  const hasPendingMaterials = pendingMaterials.length > 0;
  const lowAttendance = attendanceRate < 70;
  const hasWorkStoppages = recentDPRs.length > 0;
  const hasRepeatedStoppages = topStoppageReason && stoppageReasons[topStoppageReason] >= 3;
  const hasSignificantDPRDelay = hasDPRDelay && dprDelayDays >= 1; // 1+ days delay
  const hasModerateDPRDelay = hasDPRDelay && dprDelayHours >= 24 && dprDelayDays < 1; // 24+ hours but less than 1 day
  
  // Task completion rate
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
  const lowTaskCompletion = taskCompletionRate < 50 && totalTasks > 3;
  
  // Determine risk level
  let risk: RiskLevel = 'Low';
  let probability = 20;
  let cause = 'No significant risks detected';
  
  // DPR delays are critical - DPRs must be submitted daily
  if (hasSignificantDPRDelay && (hasOverduePendingTasks || hasPendingMaterials || lowAttendance)) {
    risk = 'High';
    probability = 90;
    cause = `No DPR submitted for ${dprDelayDays} day(s) (${dprDelayHours.toFixed(1)} hours)${hasOverduePendingTasks ? ', overdue tasks not started' : ''}${hasPendingMaterials ? ', pending materials' : ''}${lowAttendance ? ', low attendance' : ''}`;
  } else if (hasSignificantDPRDelay) {
    risk = 'High';
    probability = 80;
    cause = `No DPR submitted for ${dprDelayDays} day(s) (${dprDelayHours.toFixed(1)} hours) - DPRs must be submitted daily`;
  } else if (hasModerateDPRDelay && (hasOverduePendingTasks || hasPendingMaterials)) {
    risk = 'High';
    probability = 75;
    cause = `No DPR submitted in last ${dprDelayHours.toFixed(1)} hours${hasOverduePendingTasks ? ', overdue tasks not started' : ''}${hasPendingMaterials ? ', pending materials' : ''}`;
  } else if (hasModerateDPRDelay) {
    risk = 'Medium';
    probability = 60;
    cause = `No DPR submitted in last ${dprDelayHours.toFixed(1)} hours - DPRs should be submitted daily`;
  }
  
  // Work stoppages significantly increase risk
  if (hasRepeatedStoppages && risk !== 'High') {
    risk = 'High';
    probability = 80;
    cause = `Repeated work stoppages due to ${topStoppageReason?.replace('_', ' ').toLowerCase()} (${stoppageReasons[topStoppageReason]} occurrences)`;
  } else if (hasWorkStoppages && totalStoppageHours > 8 && risk !== 'High') {
    risk = 'High';
    probability = 70;
    cause = `Significant work stoppage: ${totalStoppageHours} hours lost`;
  } else if (hasOverduePendingTasks && (hasPendingMaterials || lowAttendance) && !hasDPRDelay) {
    // Overdue tasks that haven't even been started + other issues = HIGH risk
    risk = 'High';
    probability = 85;
    cause = hasOverduePendingTasks && hasPendingMaterials && lowAttendance
      ? `${overduePendingTasks.length} overdue tasks not started, pending materials, low attendance`
      : hasOverduePendingTasks && hasPendingMaterials
      ? `${overduePendingTasks.length} overdue tasks not started and pending material approvals`
      : `${overduePendingTasks.length} overdue tasks not started and low attendance`;
  } else if (hasOverduePendingTasks) {
    // Overdue tasks that haven't been started are very concerning
    risk = 'High';
    probability = 75;
    cause = `${overduePendingTasks.length} overdue task(s) not yet started`;
  } else if (hasOverdueTasks && hasPendingMaterials && lowAttendance) {
    risk = 'High';
    probability = 85;
    cause = 'Multiple critical issues: overdue tasks, pending materials, low attendance';
  } else if ((hasOverdueTasks && hasPendingMaterials) || (hasOverdueTasks && lowAttendance) || (hasPendingMaterials && lowAttendance)) {
    risk = 'High';
    probability = 75;
    cause = hasOverdueTasks && hasPendingMaterials
      ? 'Overdue tasks and pending material approvals'
      : hasOverdueTasks && lowAttendance
      ? 'Overdue tasks and low attendance'
      : 'Pending material approvals and low attendance';
  } else if (hasManyPendingTasks && hasApproachingDuePendingTasks) {
    // Many pending tasks with approaching deadlines
    risk = 'Medium';
    probability = 60;
    cause = `${pendingTasks.length} tasks pending, ${approachingDuePendingTasks.length} approaching due date`;
  } else if (hasManyPendingTasks && lowTaskCompletion) {
    // Many pending tasks and low completion rate
    risk = 'Medium';
    probability = 55;
    cause = `${pendingTasks.length} tasks not started, completion rate ${taskCompletionRate.toFixed(0)}%`;
  } else if (hasWorkStoppages) {
    risk = 'Medium';
    probability = 55;
    cause = `Work stoppages reported: ${topStoppageReason?.replace('_', ' ').toLowerCase()}`;
  } else if (hasOverdueTasks || hasPendingMaterials || lowAttendance) {
    risk = 'Medium';
    probability = 50;
    cause = hasOverdueTasks
      ? hasOverdueInProgressTasks
        ? `${overdueInProgressTasks.length} in-progress task(s) overdue`
        : 'Tasks overdue by more than 2 days'
      : hasPendingMaterials
      ? 'Material approvals pending for more than 48 hours'
      : 'Attendance below 70%';
  } else if (hasManyPendingTasks) {
    // Many pending tasks but no immediate deadlines
    risk = 'Low';
    probability = 35;
    cause = `${pendingTasks.length} tasks pending, ${inProgressTasks.length} in progress`;
  }
  
  // Adjust probability based on severity
  if (hasDPRDelay) {
    // DPR delays are critical - add significant penalty
    if (hasSignificantDPRDelay) {
      probability += Math.min(dprDelayDays * 10, 30); // Up to 30 points for DPR delays
    } else if (hasModerateDPRDelay) {
      probability += Math.min(Math.floor(dprDelayHours / 24) * 5, 15); // Up to 15 points for moderate delays
    }
  }
  if (hasOverduePendingTasks) {
    // Pending overdue tasks are more concerning - higher penalty
    probability += Math.min(overduePendingTasks.length * 7, 25);
  }
  if (hasOverdueInProgressTasks) {
    // In-progress overdue tasks are less concerning but still risky
    probability += Math.min(overdueInProgressTasks.length * 4, 15);
  }
  if (hasApproachingDuePendingTasks) {
    // Tasks approaching due date that aren't started
    probability += Math.min(approachingDuePendingTasks.length * 3, 12);
  }
  if (hasManyPendingTasks) {
    // Many tasks not started
    probability += Math.min(Math.floor((pendingTasks.length - inProgressTasks.length) / 2), 10);
  }
  if (hasPendingMaterials) {
    probability += Math.min(pendingMaterials.length * 3, 15);
  }
  if (lowAttendance) {
    probability += Math.max(0, 70 - attendanceRate);
  }
  if (lowTaskCompletion) {
    probability += Math.max(0, 50 - taskCompletionRate);
  }
  if (hasWorkStoppages) {
    // Add risk based on total stoppage hours
    probability += Math.min(Math.floor(totalStoppageHours / 2), 15);
  }
  if (hasRepeatedStoppages) {
    // Additional penalty for repeated stoppages
    probability += 10;
  }
  
  probability = Math.min(100, probability);
  
  const impact = risk === 'High' 
    ? '3-5 days delay' 
    : risk === 'Medium' 
    ? '1-3 days delay' 
    : 'Minimal impact';
  
  return {
    projectId,
    projectName,
    risk,
    probability,
    impact,
    cause,
  };
};

