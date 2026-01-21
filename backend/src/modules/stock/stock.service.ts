import { StockLedger } from './stock-ledger.model';
import { logger } from '../../utils/logger';
import mongoose from 'mongoose';

/**
 * Add stock IN entry when material is approved
 */
export async function addStockIn(
  projectId: string,
  materialId: string,
  materialName: string,
  quantity: number,
  unit: string,
  sourceId: mongoose.Types.ObjectId,
  createdBy: string
): Promise<void> {
  try {
    const stockEntry = new StockLedger({
      projectId: new mongoose.Types.ObjectId(projectId),
      materialId,
      materialName,
      type: 'IN',
      quantity,
      unit,
      source: 'purchase',
      sourceId,
      sourceRefModel: 'MaterialRequest',
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });

    await stockEntry.save();
    logger.info(`Stock IN added: ${materialName} (${quantity} ${unit}) for project ${projectId}`);
  } catch (error: any) {
    logger.error(`Failed to add stock IN: ${error.message}`);
    // Don't throw - stock tracking should not break material approval
  }
}

/**
 * Add stock OUT entry when materials are used (e.g., in DPR)
 */
export async function addStockOut(
  projectId: string,
  materialId: string,
  materialName: string,
  quantity: number,
  unit: string,
  sourceId: mongoose.Types.ObjectId,
  createdBy: string
): Promise<void> {
  try {
    const stockEntry = new StockLedger({
      projectId: new mongoose.Types.ObjectId(projectId),
      materialId,
      materialName,
      type: 'OUT',
      quantity,
      unit,
      source: 'usage',
      sourceId,
      sourceRefModel: 'DPR',
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });

    await stockEntry.save();
    logger.info(`Stock OUT added: ${materialName} (${quantity} ${unit}) for project ${projectId}`);
  } catch (error: any) {
    logger.error(`Failed to add stock OUT: ${error.message}`);
    // Don't throw - stock tracking should not break DPR creation
  }
}
