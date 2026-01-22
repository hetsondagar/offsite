import { calculateBillableAmount } from './billable-amount.service';
import { calculateGST } from './gst.util';
import { Task } from '../tasks/task.model';
import { MaterialRequest } from '../materials/material.model';
import { DPR } from '../dpr/dpr.model';
import { logger } from '../../utils/logger';

export interface InvoiceSuggestion {
  suggestedTaxableAmount: number;
  breakdown: {
    tasks: {
      count: number;
      value: number;
    };
    materials: {
      count: number;
      value: number;
    };
    dprs: {
      count: number;
      value: number;
    };
    labour: {
      value: number;
    };
  };
  gstSplit: {
    cgst: number;
    sgst: number;
    igst: number;
    gstRate: number;
    gstType: 'CGST_SGST' | 'IGST';
  };
  billingPeriod: {
    from: Date;
    to: Date;
  };
}

/**
 * Generate invoice suggestion based on completed work
 */
export async function generateInvoiceSuggestion(
  projectId: string,
  from: Date,
  to: Date,
  supplierState?: string,
  clientState?: string
): Promise<InvoiceSuggestion> {
  try {
    // Calculate billable amount using existing service
    const billableResult = await calculateBillableAmount(projectId, from, to);

    // Get detailed breakdown
    const completedTasks = await Task.find({
      projectId,
      status: 'completed',
      updatedAt: {
        $gte: from,
        $lte: to,
      },
    });

    const approvedMaterials = await MaterialRequest.find({
      projectId,
      status: 'approved',
      approvedAt: {
        $gte: from,
        $lte: to,
      },
    });

    const dprs = await DPR.find({
      projectId,
      createdAt: {
        $gte: from,
        $lte: to,
      },
    });

    // Default GST rate (can be made configurable per project)
    const gstRate = 18;

    // Determine GST type and calculate GST
    // If states are provided, use them; otherwise default to IGST
    const supplierStateValue = supplierState || '';
    const clientStateValue = clientState || '';
    
    const gstResult = calculateGST(
      billableResult.taxableAmount,
      gstRate,
      supplierStateValue,
      clientStateValue
    );

    return {
      suggestedTaxableAmount: billableResult.taxableAmount,
      breakdown: {
        tasks: {
          count: completedTasks.length,
          value: billableResult.breakdown.completedTasksValue,
        },
        materials: {
          count: approvedMaterials.length,
          value: billableResult.breakdown.approvedMaterialsValue,
        },
        dprs: {
          count: dprs.length,
          value: billableResult.breakdown.approvedDprsValue,
        },
        labour: {
          value: billableResult.breakdown.labourCharges,
        },
      },
      gstSplit: {
        cgst: gstResult.cgstAmount,
        sgst: gstResult.sgstAmount,
        igst: gstResult.igstAmount,
        gstRate,
        gstType: gstResult.gstType,
      },
      billingPeriod: {
        from,
        to,
      },
    };
  } catch (error: any) {
    logger.error('Error generating invoice suggestion:', error);
    throw new Error(`Failed to generate invoice suggestion: ${error.message}`);
  }
}
