import { PurchaseInvoice } from './purchase-invoice.model';
import { logger } from '../../utils/logger';

/**
 * Generate purchase invoice after GRN verification
 */
export async function generatePurchaseInvoice(
  purchaseHistory: any,
  verifiedBy: string
): Promise<void> {
  try {
    // Check if invoice already exists
    const existingInvoice = await PurchaseInvoice.findOne({
      purchaseHistoryId: purchaseHistory._id,
    });

    if (existingInvoice) {
      logger.info(`Purchase invoice already exists for history ${purchaseHistory._id}`);
      return;
    }

    // Generate invoice number
    const invoiceCount = await PurchaseInvoice.countDocuments();
    const invoiceNumber = `PI-${String(invoiceCount + 1).padStart(6, '0')}`;

    // Create purchase invoice
    const invoice = new PurchaseInvoice({
      purchaseHistoryId: purchaseHistory._id,
      projectId: purchaseHistory.projectId,
      invoiceNumber,
      materialName: purchaseHistory.materialName,
      qty: purchaseHistory.qty,
      unit: purchaseHistory.unit,
      basePrice: purchaseHistory.basePrice,
      gstRate: purchaseHistory.gstRate,
      gstAmount: purchaseHistory.gstAmount,
      totalAmount: purchaseHistory.totalCost,
      generatedAt: new Date(),
      generatedBy: verifiedBy,
    });

    await invoice.save();
    logger.info(`Purchase invoice generated: ${invoiceNumber} for history ${purchaseHistory._id}`);
  } catch (error: any) {
    logger.error(`Error generating purchase invoice: ${error.message}`);
    throw error;
  }
}
