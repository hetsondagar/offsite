import { Task } from '../modules/tasks/task.model';
import { MaterialRequest } from '../modules/materials/material.model';
import { Attendance } from '../modules/attendance/attendance.model';

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
  
  // Check overdue tasks (> 2 days)
  const tasks = await Task.find({ projectId });
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'completed') return false;
    return new Date(t.dueDate) < twoDaysAgo;
  });
  
  // Check pending material approvals (> 48 hours)
  const pendingMaterials = await MaterialRequest.find({
    projectId,
    status: 'pending',
    createdAt: { $lt: fortyEightHoursAgo },
  });
  
  // Check attendance (last 7 days)
  const attendanceRecords = await Attendance.find({
    projectId,
    timestamp: { $gte: sevenDaysAgo },
    type: 'checkin',
  });
  const uniqueUsers = new Set(attendanceRecords.map(a => a.userId.toString()));
  const expectedUsers = 10; // Should come from project members
  const attendanceRate = expectedUsers > 0 ? (uniqueUsers.size / expectedUsers) * 100 : 0;
  
  // Calculate risk factors
  const hasOverdueTasks = overdueTasks.length > 0;
  const hasPendingMaterials = pendingMaterials.length > 0;
  const lowAttendance = attendanceRate < 70;
  
  // Determine risk level
  let risk: RiskLevel = 'Low';
  let probability = 20;
  let cause = 'No significant risks detected';
  
  if (hasOverdueTasks && hasPendingMaterials && lowAttendance) {
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
  } else if (hasOverdueTasks || hasPendingMaterials || lowAttendance) {
    risk = 'Medium';
    probability = 50;
    cause = hasOverdueTasks
      ? 'Tasks overdue by more than 2 days'
      : hasPendingMaterials
      ? 'Material approvals pending for more than 48 hours'
      : 'Attendance below 70%';
  }
  
  // Adjust probability based on severity
  if (hasOverdueTasks) {
    probability += Math.min(overdueTasks.length * 5, 20);
  }
  if (hasPendingMaterials) {
    probability += Math.min(pendingMaterials.length * 3, 15);
  }
  if (lowAttendance) {
    probability += Math.max(0, 70 - attendanceRate);
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

