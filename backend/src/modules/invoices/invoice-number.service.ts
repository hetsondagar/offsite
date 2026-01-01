import { InvoiceCounter } from './invoice-counter.model';
import { logger } from '../../utils/logger';

/**
 * Generate sequential invoice numbers per financial year.
 * Format: OS/INV/2024-25/0001
 * 
 * Uses atomic increment to ensure no duplicates.
 */
export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  // Indian financial year: April (4) to March (3)
  if (month >= 4) {
    // April to December: Current year to next year
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    // January to March: Previous year to current year
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

export async function generateInvoiceNumber(): Promise<string> {
  const financialYear = getFinancialYear();

  // Atomic increment using findOneAndUpdate
  const counter = await InvoiceCounter.findOneAndUpdate(
    { financialYear },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  if (!counter) {
    throw new Error('Failed to generate invoice number');
  }

  const invoiceNumber = `OS/INV/${financialYear}/${String(counter.seq).padStart(4, '0')}`;

  logger.info(`Generated invoice number: ${invoiceNumber} for financial year ${financialYear}`);

  return invoiceNumber;
}

