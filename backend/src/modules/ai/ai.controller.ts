import { Request, Response, NextFunction } from 'express';
import { riskAssessmentService } from '../../services/riskAssessment.service';
import { anomalyInsightsService } from '../../services/anomalyInsights.service';
import { Project } from '../projects/project.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';

/**
 * Get AI Site Risk Assessment
 * GET /api/ai/site-risk/:siteId
 */
export const getSiteRisk = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { siteId } = req.params;

    // Verify project exists
    const project = await Project.findById(siteId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Check permissions (managers and owners only)
    if (req.user.role === 'engineer') {
      // Engineers can only see their assigned projects
      const isMember = project.members.some(
        (member: any) => member.toString() === req.user.userId
      );
      if (!isMember) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    logger.info(`Generating risk assessment for project ${siteId}`);

    // Get risk assessment
    const assessment = await riskAssessmentService.assessSiteRisk(siteId);

    const response: ApiResponse = {
      success: true,
      message: 'Site risk assessment generated successfully',
      data: assessment,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get AI Anomaly Insights
 * GET /api/ai/anomalies/:siteId
 */
export const getAnomalies = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { siteId } = req.params;

    // Verify project exists
    const project = await Project.findById(siteId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Check permissions
    if (req.user.role === 'engineer') {
      const isMember = project.members.some(
        (member: any) => member.toString() === req.user.userId
      );
      if (!isMember) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    logger.info(`Generating anomaly insights for project ${siteId}`);

    // Get anomalies with AI explanations
    const anomalies = await anomalyInsightsService.getSiteAnomalies(siteId);

    const response: ApiResponse = {
      success: true,
      message: 'Anomaly insights generated successfully',
      data: {
        anomalies,
        total: anomalies.length,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

