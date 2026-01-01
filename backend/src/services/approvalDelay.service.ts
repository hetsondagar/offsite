/**
 * Approval Delay Timer
 * Tracks and calculates approval delay duration for material requests.
 * All calculations are server-side and database-backed.
 */

import { MaterialRequest } from '../modules/materials/material.model';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export type DelaySeverity = 'normal' | 'warning' | 'critical';

export interface ApprovalDelay {
  requestId: string;
  projectId: string;
  materialName: string;
  requestedAt: Date;
  delayHours: number;
  delayDays: number;
  severity: DelaySeverity;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ProjectApprovalDelays {
  projectId: string;
  totalPending: number;
  criticalDelays: number;
  warningDelays: number;
  normalDelays: number;
  averageDelayHours: number;
  delays: ApprovalDelay[];
}

/**
 * Calculate approval delay for a material request
 * @param request Material request document
 * @returns ApprovalDelay object
 */
export function calculateApprovalDelay(request: any): ApprovalDelay {
  const now = new Date();
  const requestedAt = new Date(request.createdAt);
  const delayMs = now.getTime() - requestedAt.getTime();
  const delayHours = Math.floor(delayMs / (1000 * 60 * 60));
  const delayDays = Math.floor(delayHours / 24);

  let severity: DelaySeverity = 'normal';
  if (delayHours >= 24) {
    severity = 'critical';
  } else if (delayHours >= 6) {
    severity = 'warning';
  }

  return {
    requestId: request._id.toString(),
    projectId: request.projectId.toString(),
    materialName: request.materialName,
    requestedAt,
    delayHours,
    delayDays,
    severity,
    status: request.status,
  };
}

/**
 * Get approval delays for pending requests in a project
 * @param projectId Project ID
 * @returns Array of ApprovalDelay objects
 */
export async function getProjectApprovalDelays(
  projectId: string
): Promise<ProjectApprovalDelays> {
  try {
    const pendingRequests = await MaterialRequest.find({
      projectId: new mongoose.Types.ObjectId(projectId),
      status: 'pending',
    }).sort({ createdAt: -1 });

    const delays: ApprovalDelay[] = pendingRequests.map(calculateApprovalDelay);

    const criticalDelays = delays.filter(d => d.severity === 'critical').length;
    const warningDelays = delays.filter(d => d.severity === 'warning').length;
    const normalDelays = delays.filter(d => d.severity === 'normal').length;

    const totalDelayHours = delays.reduce((sum, d) => sum + d.delayHours, 0);
    const averageDelayHours = delays.length > 0 
      ? Math.round((totalDelayHours / delays.length) * 100) / 100 
      : 0;

    return {
      projectId,
      totalPending: delays.length,
      criticalDelays,
      warningDelays,
      normalDelays,
      averageDelayHours,
      delays,
    };
  } catch (error: any) {
    logger.error(`Error getting approval delays for project ${projectId}:`, error);
    return {
      projectId,
      totalPending: 0,
      criticalDelays: 0,
      warningDelays: 0,
      normalDelays: 0,
      averageDelayHours: 0,
      delays: [],
    };
  }
}

/**
 * Get approval delays for all projects (for owner/managers)
 * @param projectIds Array of project IDs
 * @returns Array of ProjectApprovalDelays objects
 */
export async function getAllProjectsApprovalDelays(
  projectIds: string[]
): Promise<ProjectApprovalDelays[]> {
  const results = await Promise.all(
    projectIds.map(id => getProjectApprovalDelays(id))
  );
  return results;
}

