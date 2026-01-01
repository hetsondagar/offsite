/**
 * Labour Strength Gap Detector
 * Compares planned labour (from tasks) vs actual labour (from attendance)
 * All calculations are server-side and database-backed.
 */

import { Task } from '../modules/tasks/task.model';
import { Attendance } from '../modules/attendance/attendance.model';
import { Project } from '../modules/projects/project.model';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export interface LabourGap {
  projectId: string;
  projectName: string;
  date: Date;
  plannedLabour: number;
  actualLabour: number;
  gap: number;
  gapPercentage: number;
  severity: 'normal' | 'warning' | 'critical';
  threshold: number; // Configurable threshold (default: 20% gap)
}

export interface ProjectLabourGap {
  projectId: string;
  projectName: string;
  averageGap: number;
  averageGapPercentage: number;
  daysWithGap: number;
  totalDays: number;
  recentGaps: LabourGap[];
}

/**
 * Calculate labour gap for a specific date
 * @param projectId Project ID
 * @param date Date to calculate gap for
 * @param threshold Percentage threshold for warning (default: 20%)
 * @returns LabourGap object
 */
export async function calculateLabourGapForDate(
  projectId: string,
  date: Date,
  threshold: number = 20
): Promise<LabourGap | null> {
  try {
    const project = await Project.findById(projectId).select('name');
    if (!project) {
      return null;
    }

    // Get start and end of the day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Get all active tasks for the project
    const tasks = await Task.find({
      projectId: new mongoose.Types.ObjectId(projectId),
      status: { $in: ['pending', 'in-progress'] },
    });

    // Sum planned labour from all active tasks
    const plannedLabour = tasks.reduce((sum, task) => {
      return sum + (task.plannedLabourCount || 0);
    }, 0);

    // Get actual attendance for the day (unique check-ins)
    const attendanceRecords = await Attendance.find({
      projectId: new mongoose.Types.ObjectId(projectId),
      type: 'checkin',
      timestamp: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    });

    const uniqueUsers = new Set(attendanceRecords.map(a => a.userId.toString()));
    const actualLabour = uniqueUsers.size;

    // Calculate gap
    const gap = plannedLabour - actualLabour;
    const gapPercentage = plannedLabour > 0 ? (gap / plannedLabour) * 100 : 0;

    // Determine severity
    let severity: 'normal' | 'warning' | 'critical' = 'normal';
    if (gapPercentage > threshold * 1.5) {
      severity = 'critical';
    } else if (gapPercentage > threshold) {
      severity = 'warning';
    }

    return {
      projectId,
      projectName: project.name,
      date,
      plannedLabour,
      actualLabour,
      gap,
      gapPercentage: Math.round(gapPercentage * 100) / 100,
      severity,
      threshold,
    };
  } catch (error: any) {
    logger.error(`Error calculating labour gap for date ${date}:`, error);
    return null;
  }
}

/**
 * Get labour gap summary for a project (last N days)
 * @param projectId Project ID
 * @param days Number of days to analyze (default: 7)
 * @param threshold Percentage threshold for warning (default: 20%)
 * @returns ProjectLabourGap object
 */
export async function getProjectLabourGap(
  projectId: string,
  days: number = 7,
  threshold: number = 20
): Promise<ProjectLabourGap | null> {
  try {
    const project = await Project.findById(projectId).select('name');
    if (!project) {
      return null;
    }

    const gaps: LabourGap[] = [];
    const today = new Date();

    // Calculate gap for each day
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const gap = await calculateLabourGapForDate(projectId, date, threshold);
      if (gap) {
        gaps.push(gap);
      }
    }

    if (gaps.length === 0) {
      return {
        projectId,
        projectName: project.name,
        averageGap: 0,
        averageGapPercentage: 0,
        daysWithGap: 0,
        totalDays: days,
        recentGaps: [],
      };
    }

    // Calculate averages
    const totalGap = gaps.reduce((sum, g) => sum + g.gap, 0);
    const totalGapPercentage = gaps.reduce((sum, g) => sum + g.gapPercentage, 0);
    const daysWithGap = gaps.filter(g => g.gap > 0).length;

    return {
      projectId,
      projectName: project.name,
      averageGap: Math.round((totalGap / gaps.length) * 100) / 100,
      averageGapPercentage: Math.round((totalGapPercentage / gaps.length) * 100) / 100,
      daysWithGap,
      totalDays: gaps.length,
      recentGaps: gaps.slice(0, 5), // Last 5 days
    };
  } catch (error: any) {
    logger.error(`Error getting project labour gap for ${projectId}:`, error);
    return null;
  }
}

/**
 * Get labour gap for all projects (for owner/managers)
 * @param projectIds Array of project IDs
 * @param days Number of days to analyze (default: 7)
 * @param threshold Percentage threshold for warning (default: 20%)
 * @returns Array of ProjectLabourGap objects
 */
export async function getAllProjectsLabourGap(
  projectIds: string[],
  days: number = 7,
  threshold: number = 20
): Promise<ProjectLabourGap[]> {
  const results = await Promise.all(
    projectIds.map(id => getProjectLabourGap(id, days, threshold))
  );
  return results.filter((r): r is ProjectLabourGap => r !== null);
}

