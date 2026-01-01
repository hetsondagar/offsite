import { GstType } from '../../types';

/**
 * GST calculation utility for Indian GST compliance.
 * 
 * Rules:
 * - Same state (supplier.state === client.state) → CGST + SGST (split equally)
 * - Different states → IGST (full rate)
 */
export interface GstCalculationResult {
  gstType: GstType;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGst: number;
}

export function calculateGST(
  taxableAmount: number,
  gstRate: number,
  supplierState: string,
  clientState: string
): GstCalculationResult {
  const supplierStateNormalized = supplierState.trim().toUpperCase();
  const clientStateNormalized = clientState.trim().toUpperCase();

  if (supplierStateNormalized === clientStateNormalized) {
    // Same state: CGST + SGST (split equally)
    const totalGst = (taxableAmount * gstRate) / 100;
    const cgstAmount = totalGst / 2;
    const sgstAmount = totalGst / 2;

    return {
      gstType: 'CGST_SGST',
      cgstAmount: Math.round(cgstAmount * 100) / 100, // Round to 2 decimals
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      igstAmount: 0,
      totalGst: Math.round(totalGst * 100) / 100,
    };
  } else {
    // Different states: IGST (full rate)
    const igstAmount = (taxableAmount * gstRate) / 100;

    return {
      gstType: 'IGST',
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: Math.round(igstAmount * 100) / 100,
      totalGst: Math.round(igstAmount * 100) / 100,
    };
  }
}

