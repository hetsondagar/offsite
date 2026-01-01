import { DPR } from '../dpr/dpr.model';
import { Task } from '../tasks/task.model';
import { MaterialRequest } from '../materials/material.model';
import { logger } from '../../utils/logger';

/**
 * Calculate billable amount from verified system data.
 * 
 * This is a deterministic, repeatable calculation based on:
 * - Completed tasks (percentage-based value)
 * - Approved DPRs (summary value)
 * - Approved material usage (summary cost)
 * 
 * This avoids line-item heavy accounting while remaining explainable.
 */
export interface BillableAmountResult {
  taxableAmount: number;
  breakdown: {
    completedTasksValue: number;
    approvedDprsValue: number;
    approvedMaterialsValue: number;
    milestoneAdjustment: number;
  };
}

export async function calculateBillableAmount(
  projectId: string,
  billingPeriodFrom: Date,
  billingPeriodTo: Date
): Promise<BillableAmountResult> {
  try {
    // 1. Calculate completed tasks value
    // Simple heuristic: Each completed task = fixed value (can be enhanced with task budgets)
    const completedTasks = await Task.find({
      projectId,
      status: 'completed',
      updatedAt: {
        $gte: billingPeriodFrom,
        $lte: billingPeriodTo,
      },
    });

    // Default value per completed task (can be made configurable per project)
    const TASK_VALUE = 5000; // ₹5,000 per completed task
    const completedTasksValue = completedTasks.length * TASK_VALUE;

    // 2. Calculate approved DPRs value
    // Each approved DPR represents work done
    const approvedDprs = await DPR.find({
      projectId,
      createdAt: {
        $gte: billingPeriodFrom,
        $lte: billingPeriodTo,
      },
    });

    // Default value per DPR (can be enhanced with DPR complexity scoring)
    const DPR_VALUE = 2000; // ₹2,000 per DPR
    const approvedDprsValue = approvedDprs.length * DPR_VALUE;

    // 3. Calculate approved materials value
    // Sum of approved material requests (using estimated cost per unit)
    const approvedMaterials = await MaterialRequest.find({
      projectId,
      status: 'approved',
      approvedAt: {
        $gte: billingPeriodFrom,
        $lte: billingPeriodTo,
      },
    });

    // Estimated cost per material (can be enhanced with material catalog pricing)
    const MATERIAL_COST_PER_UNIT: Record<string, number> = {
      cement: 400, // ₹400 per bag
      steel: 60000, // ₹60,000 per ton
      sand: 800, // ₹800 per cubic meter
      brick: 8, // ₹8 per piece
    };

    let approvedMaterialsValue = 0;
    for (const material of approvedMaterials) {
      const unitCost = MATERIAL_COST_PER_UNIT[material.materialName.toLowerCase()] || 1000;
      approvedMaterialsValue += material.quantity * unitCost;
    }

    // 4. Milestone adjustment (can be enhanced with project milestones)
    const milestoneAdjustment = 0;

    const taxableAmount =
      completedTasksValue +
      approvedDprsValue +
      approvedMaterialsValue +
      milestoneAdjustment;

    logger.info(`Billable amount calculated for project ${projectId}:`, {
      completedTasksValue,
      approvedDprsValue,
      approvedMaterialsValue,
      milestoneAdjustment,
      taxableAmount,
    });

    return {
      taxableAmount: Math.round(taxableAmount * 100) / 100, // Round to 2 decimals
      breakdown: {
        completedTasksValue,
        approvedDprsValue,
        approvedMaterialsValue,
        milestoneAdjustment,
      },
    };
  } catch (error: any) {
    logger.error('Error calculating billable amount:', error);
    throw new Error(`Failed to calculate billable amount: ${error.message}`);
  }
}

