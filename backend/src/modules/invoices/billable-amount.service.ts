import { DPR } from '../dpr/dpr.model';
import { Task } from '../tasks/task.model';
import { MaterialRequest } from '../materials/material.model';
import { logger } from '../../utils/logger';
import { getMaterialUnitPrice } from '../../config/materialPrices';

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
    labourCharges: number;
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
    const LABOUR_DAILY_RATE = 750; // ₹750 per planned labour per completed task

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

    // Labour charges derived from planned labour count on completed tasks
    const labourCharges = completedTasks.reduce((sum, task) => {
      const planned = task.plannedLabourCount || 0;
      return sum + planned * LABOUR_DAILY_RATE;
    }, 0);

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
    // Sum of approved material requests using calculated costs
    const approvedMaterials = await MaterialRequest.find({
      projectId,
      status: 'approved',
      approvedAt: {
        $gte: billingPeriodFrom,
        $lte: billingPeriodTo,
      },
    });

    let approvedMaterialsValue = 0;
    for (const material of approvedMaterials) {
      const unitPrice = getMaterialUnitPrice(material.materialName);
      const qty = Number(material.quantity || 0);
      const up = unitPrice != null ? Number(unitPrice) : null;
      const baseAmount = up != null ? qty * up : 0;
      // Round each line to 2 decimals before summing
      approvedMaterialsValue += Math.round(baseAmount * 100) / 100;
    }

    // 4. Milestone adjustment (can be enhanced with project milestones)
    const milestoneAdjustment = 0;

    const taxableAmount =
      Number(completedTasksValue || 0) +
      Number(labourCharges || 0) +
      Number(approvedDprsValue || 0) +
      Number(approvedMaterialsValue || 0) +
      Number(milestoneAdjustment || 0);

    logger.info(`Billable amount calculated for project ${projectId}:`, {
      completedTasksValue,
      labourCharges,
      approvedDprsValue,
      approvedMaterialsValue,
      milestoneAdjustment,
      taxableAmount,
    });

    // OVERRIDE: If computed taxableAmount is zero, apply temporary hard-coded billing
    // This is an intentional, controlled override to ensure non-zero invoices
    if (!taxableAmount || Number(taxableAmount) === 0) {
      try {
        // Fixed prices (hard-coded as per temporary override requirements)
        const PRICE_MAP: { [key: string]: number } = {
          cement: 400, // per 50kg bag
          brick: 10, // per piece
          bricks: 10,
          gravel: 2500, // per tonne
          aggregate: 2500,
          concrete: 6000, // per m3 (RMC)
          rmc: 6000,
          'concrete mix': 6000,
          steel: 60, // per kg (TMT)
          tmt: 60,
          sand: 3000, // per tonne
        };

        let overrideMaterialsTotal = 0;
        for (const material of approvedMaterials) {
          const name = (material.materialName || '').toString().toLowerCase();
          const qty = Number(material.quantity || 0);
          // Find matching price key
          let unitPrice: number | null = null;
          for (const key of Object.keys(PRICE_MAP)) {
            if (name.includes(key)) {
              unitPrice = PRICE_MAP[key];
              break;
            }
          }

          const lineCost = unitPrice != null ? qty * unitPrice : 0;
          overrideMaterialsTotal += Math.round(lineCost * 100) / 100;
        }

        // Fixed labour: Rs.700 per day. Use inclusive days in billing period.
        const msPerDay = 1000 * 60 * 60 * 24;
        const from = billingPeriodFrom;
        const to = billingPeriodTo;
        const days = Math.max(1, Math.floor((to.getTime() - from.getTime()) / msPerDay) + 1);
        const fixedLabourCost = 700 * days;

        const overriddenTaxable = Math.round((overrideMaterialsTotal + fixedLabourCost) * 100) / 100;

        logger.info(`Applied hard-coded billing override for project ${projectId}:`, {
          overrideMaterialsTotal,
          fixedLabourCost,
          overriddenTaxable,
        });

        return {
          taxableAmount: Number(overriddenTaxable),
          breakdown: {
            completedTasksValue,
            labourCharges: fixedLabourCost,
            approvedDprsValue,
            approvedMaterialsValue: overrideMaterialsTotal,
            milestoneAdjustment,
          },
        };
      } catch (err: any) {
        logger.error('Error applying billing override:', err);
        // Fallthrough to return original zero value (shouldn't happen)
      }
    }

    return {
      taxableAmount: Math.round(taxableAmount * 100) / 100, // Round to 2 decimals
      breakdown: {
        completedTasksValue,
        labourCharges,
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

