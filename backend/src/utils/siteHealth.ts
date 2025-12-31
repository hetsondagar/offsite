import { Project } from '../modules/projects/project.model';
import { Task } from '../modules/tasks/task.model';
import { Attendance } from '../modules/attendance/attendance.model';
import { MaterialRequest } from '../modules/materials/material.model';

export interface HealthScoreFactors {
  attendancePercentage: number;
  taskCompletionRate: number;
  pendingApprovalsCount: number;
  delayRiskScore: number;
}

/**
 * Calculate Site Health Score
 * Formula:
 * - Attendance % → 30%
 * - Task completion → 40%
 * - Pending approvals → -20% (penalty)
 * - Delay risk → -10% (penalty)
 */
export const calculateSiteHealthScore = (factors: HealthScoreFactors): number => {
  const { attendancePercentage, taskCompletionRate, pendingApprovalsCount, delayRiskScore } = factors;
  
  // Base scores (0-100)
  const attendanceScore = attendancePercentage * 0.3;
  const taskScore = taskCompletionRate * 0.4;
  
  // Penalties
  const approvalPenalty = Math.min(pendingApprovalsCount * 2, 20); // Max -20%
  const delayPenalty = Math.min(delayRiskScore * 10, 10); // Max -10%
  
  const totalScore = attendanceScore + taskScore - approvalPenalty - delayPenalty;
  
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, Math.round(totalScore)));
};

export const calculateProjectHealthScore = async (
  projectId: string
): Promise<number> => {
  // Get all tasks for project
  const tasks = await Task.find({ projectId });
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Get attendance for project (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const attendanceRecords = await Attendance.find({
    projectId,
    timestamp: { $gte: sevenDaysAgo },
    type: 'checkin',
  });
  
  // Calculate unique users who checked in
  const uniqueUsers = new Set(attendanceRecords.map(a => a.userId.toString()));
  const expectedUsers = 10; // This should come from project members
  const attendancePercentage = expectedUsers > 0 ? (uniqueUsers.size / expectedUsers) * 100 : 0;
  
  // Get pending approvals
  const pendingApprovals = await MaterialRequest.countDocuments({
    projectId,
    status: 'pending',
  });
  
  // Calculate delay risk (simplified)
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date() && t.status !== 'completed';
  });
  const delayRiskScore = totalTasks > 0 ? (overdueTasks.length / totalTasks) : 0;
  
  return calculateSiteHealthScore({
    attendancePercentage,
    taskCompletionRate,
    pendingApprovalsCount: pendingApprovals,
    delayRiskScore,
  });
};

