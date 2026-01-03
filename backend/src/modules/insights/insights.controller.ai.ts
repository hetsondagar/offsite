/**
 * AI-Powered Insights Endpoints
 * All use real MongoDB data only
 */

import { Request, Response, NextFunction } from 'express';
import { generateDPRSummary } from '../../services/ai/dpr-summary.service';
import { generateHealthExplanation } from '../../services/ai/health-explanation.service';
import { generateDelayRiskExplanation } from '../../services/ai/delay-risk-explanation.service';
import { generateMaterialAnomalyExplanation } from '../../services/ai/material-anomaly-explanation.service';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

/**
 * Generate AI summary for a DPR
 * GET /api/insights/ai/dpr-summary?projectId=xxx&dprId=xxx
 */
export const getDPRSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId, dprId } = req.query;

    if (!projectId || !dprId) {
      throw new AppError('projectId and dprId are required', 400, 'VALIDATION_ERROR');
    }

    const summary = await generateDPRSummary(projectId as string, dprId as string);

    if (!summary) {
      throw new AppError('DPR not found or insufficient data', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'DPR summary generated successfully',
      data: summary,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate AI explanation for site health score
 * GET /api/insights/ai/health-explanation?projectId=xxx
 */
export const getHealthExplanation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = req.query;

    if (!projectId) {
      throw new AppError('projectId is required', 400, 'VALIDATION_ERROR');
    }

    const explanation = await generateHealthExplanation(projectId as string);

    if (!explanation) {
      throw new AppError('Project not found or insufficient data', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Health explanation generated successfully',
      data: explanation,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate AI explanation for delay risk
 * GET /api/insights/ai/delay-risk-explanation?projectId=xxx
 */
export const getDelayRiskExplanation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = req.query;

    if (!projectId) {
      throw new AppError('projectId is required', 400, 'VALIDATION_ERROR');
    }

    const explanation = await generateDelayRiskExplanation(projectId as string);

    if (!explanation) {
      throw new AppError('Project not found or insufficient data', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Delay risk explanation generated successfully',
      data: explanation,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate AI explanation for material usage anomaly
 * GET /api/insights/ai/material-anomaly-explanation?projectId=xxx&materialId=xxx&currentUsage=xxx
 */
export const getMaterialAnomalyExplanation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId, materialId, currentUsage } = req.query;

    if (!projectId || !materialId || !currentUsage) {
      throw new AppError('projectId, materialId, and currentUsage are required', 400, 'VALIDATION_ERROR');
    }

    const usage = parseFloat(currentUsage as string);
    if (isNaN(usage) || usage < 0) {
      throw new AppError('currentUsage must be a positive number', 400, 'VALIDATION_ERROR');
    }

    const explanation = await generateMaterialAnomalyExplanation(
      projectId as string,
      materialId as string,
      usage
    );

    if (!explanation) {
      throw new AppError('Material not found or insufficient data', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Material anomaly explanation generated successfully',
      data: explanation,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

