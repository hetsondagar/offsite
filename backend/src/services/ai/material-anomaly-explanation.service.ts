/**
 * Material Anomaly Explanation Service
 * AI explains detected material usage anomalies
 */

import { MaterialRequest } from '../../modules/materials/material.model';
import { MaterialCatalog } from '../../modules/materials/material-catalog.model';
import { huggingFaceService } from './huggingface.service';
import { logger } from '../../utils/logger';

interface MaterialAnomalyData {
  materialName: string;
  avgUsage: number;
  currentUsage: number;
  deviationPercent: number;
  recentRequestsSummary: string;
}

interface MaterialAnomalyExplanationResponse {
  explanation: string;
  possibleReasons: string[];
  verificationSteps: string[];
  generatedAt: string;
  dataSource: 'mongodb';
}

/**
 * Aggregate material usage data for anomaly explanation
 */
export async function aggregateMaterialAnomalyData(
  projectId: string,
  materialId: string,
  currentUsage: number
): Promise<MaterialAnomalyData | null> {
  try {
    // Get material catalog info
    const material = await MaterialCatalog.findById(materialId);
    if (!material) {
      return null;
    }

    const materialName = material.name;

    // Calculate average usage from historical approved requests (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalRequests = await MaterialRequest.find({
      projectId,
      materialId,
      status: 'approved',
      createdAt: { $gte: thirtyDaysAgo },
    }).select('quantity unit createdAt');

    if (historicalRequests.length === 0) {
      // No historical data - use default threshold
      const defaultThreshold = material.defaultAnomalyThreshold || 1.3;
      const avgUsage = currentUsage / defaultThreshold;
      const deviationPercent = (defaultThreshold - 1) * 100;

      return {
        materialName,
        avgUsage: Math.round(avgUsage * 100) / 100,
        currentUsage,
        deviationPercent: Math.round(deviationPercent),
        recentRequestsSummary: 'No historical data available',
      };
    }

    // Calculate average daily usage
    const totalQuantity = historicalRequests.reduce((sum, r) => sum + r.quantity, 0);
    const days = Math.max(1, Math.floor((Date.now() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24)));
    const avgUsage = totalQuantity / days;

    // Calculate deviation
    const deviationPercent = avgUsage > 0
      ? ((currentUsage - avgUsage) / avgUsage) * 100
      : 0;

    // Get recent requests summary (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRequests = await MaterialRequest.find({
      projectId,
      materialId,
      createdAt: { $gte: sevenDaysAgo },
    })
      .select('quantity unit status createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentRequestsSummary = recentRequests.length > 0
      ? recentRequests.map(r => `${r.quantity} ${r.unit} (${r.status})`).join(', ')
      : 'No recent requests';

    return {
      materialName,
      avgUsage: Math.round(avgUsage * 100) / 100,
      currentUsage,
      deviationPercent: Math.round(deviationPercent),
      recentRequestsSummary,
    };
  } catch (error) {
    logger.error('Error aggregating material anomaly data:', error);
    return null;
  }
}

/**
 * Generate AI explanation for material usage anomaly
 */
export async function generateMaterialAnomalyExplanation(
  projectId: string,
  materialId: string,
  currentUsage: number
): Promise<MaterialAnomalyExplanationResponse | null> {
  try {
    // Aggregate real data
    const data = await aggregateMaterialAnomalyData(projectId, materialId, currentUsage);

    if (!data) {
      return null;
    }

    // If AI service is not available, return structured explanation
    if (!huggingFaceService.isAvailable()) {
      return {
        explanation: `Material usage for ${data.materialName} is ${Math.abs(data.deviationPercent)}% ${data.deviationPercent > 0 ? 'above' : 'below'} the average daily usage of ${data.avgUsage} units.`,
        possibleReasons: [
          'Increased project activity',
          'Seasonal variation',
          'Bulk procurement',
          'Data entry error',
        ],
        verificationSteps: [
          'Verify quantity with site engineer',
          'Check project progress status',
          'Review recent material requests',
        ],
        generatedAt: new Date().toISOString(),
        dataSource: 'mongodb',
      };
    }

    // Build prompt with real data
    const prompt = `You are explaining a potential material usage anomaly on a construction site.

Use only the data provided.
Do not accuse or speculate intent.

Data:
- Material: ${data.materialName}
- Average daily usage: ${data.avgUsage}
- Current usage: ${data.currentUsage}
- Deviation: ${data.deviationPercent}%
- Recent material requests: ${data.recentRequestsSummary}

Output:
- Clear explanation of why this is unusual
- Possible operational reasons (not blame)
- Suggested verification steps

Format your response as:
EXPLANATION: [explanation]
REASONS:
- [reason 1]
- [reason 2]
VERIFY:
- [step 1]
- [step 2]`;

    const aiResponse = await huggingFaceService.generateText(prompt, 400);

    if (!aiResponse) {
      // Fallback
      return {
        explanation: `Material usage for ${data.materialName} is ${Math.abs(data.deviationPercent)}% ${data.deviationPercent > 0 ? 'above' : 'below'} average.`,
        possibleReasons: ['Increased activity', 'Bulk procurement'],
        verificationSteps: ['Verify with site engineer'],
        generatedAt: new Date().toISOString(),
        dataSource: 'mongodb',
      };
    }

    // Parse AI response
    const explanationMatch = aiResponse.match(/EXPLANATION:\s*(.+?)(?=REASONS:|$)/is);
    const reasonsMatch = aiResponse.match(/REASONS:\s*([\s\S]+?)(?=VERIFY:|$)/is);
    const verifyMatch = aiResponse.match(/VERIFY:\s*([\s\S]+?)$/is);

    const explanation = explanationMatch
      ? explanationMatch[1].trim()
      : `Material usage for ${data.materialName} is ${Math.abs(data.deviationPercent)}% ${data.deviationPercent > 0 ? 'above' : 'below'} average.`;

    const possibleReasons = reasonsMatch
      ? reasonsMatch[1]
          .split('\n')
          .map(r => r.replace(/^[-•]\s*/, '').trim())
          .filter(r => r.length > 0)
      : ['Increased project activity', 'Bulk procurement'];

    const verificationSteps = verifyMatch
      ? verifyMatch[1]
          .split('\n')
          .map(v => v.replace(/^[-•]\s*/, '').trim())
          .filter(v => v.length > 0)
      : ['Verify quantity with site engineer'];

    return {
      explanation,
      possibleReasons,
      verificationSteps,
      generatedAt: new Date().toISOString(),
      dataSource: 'mongodb',
    };
  } catch (error) {
    logger.error('Error generating material anomaly explanation:', error);
    return null;
  }
}

