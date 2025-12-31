import { MaterialRequest } from '../modules/materials/material.model';

/**
 * Detect material usage anomalies
 * Anomaly if: quantity > avgLast7Days * 1.3 (30% higher than average)
 */
export const detectMaterialAnomaly = async (
  materialId: string,
  quantity: number,
  projectId?: string
): Promise<{ isAnomaly: boolean; reason?: string; averageUsage?: number }> => {
  // Get last 7 days of material requests
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const query: any = {
    materialId,
    createdAt: { $gte: sevenDaysAgo },
    status: { $in: ['approved', 'pending'] },
  };
  
  if (projectId) {
    query.projectId = projectId;
  }
  
  const recentRequests = await MaterialRequest.find(query);
  
  if (recentRequests.length === 0) {
    // No historical data, can't detect anomaly
    return { isAnomaly: false };
  }
  
  // Calculate average usage
  const totalQuantity = recentRequests.reduce((sum, req) => sum + req.quantity, 0);
  const averageUsage = totalQuantity / recentRequests.length;
  
  // Check if current quantity exceeds threshold (30% above average)
  const threshold = averageUsage * 1.3;
  const isAnomaly = quantity > threshold;
  
  if (isAnomaly) {
    const percentageIncrease = ((quantity - averageUsage) / averageUsage) * 100;
    const reason = `${Math.round(percentageIncrease)}% higher than average usage (${Math.round(averageUsage)} ${recentRequests[0]?.unit || 'units'})`;
    return { isAnomaly: true, reason, averageUsage };
  }
  
  return { isAnomaly: false, averageUsage };
};

