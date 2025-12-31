import { Request, Response, NextFunction } from 'express';
import { Project } from '../projects/project.model';
import { calculateProjectHealthScore } from '../../utils/siteHealth';
import { predictDelayRisk } from '../../utils/delayPredictor';
import { MaterialRequest } from '../materials/material.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

export const getSiteHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const projects = await Project.find({ status: 'active' });

    // Calculate overall health score
    let totalHealthScore = 0;
    const projectHealthScores = await Promise.all(
      projects.map(async (project) => {
        const score = await calculateProjectHealthScore(project._id.toString());
        totalHealthScore += score;
        return {
          projectId: project._id.toString(),
          projectName: project.name,
          healthScore: score,
        };
      })
    );

    const overallHealthScore = projects.length > 0
      ? Math.round(totalHealthScore / projects.length)
      : 0;

    const response: ApiResponse = {
      success: true,
      message: 'Site health retrieved successfully',
      data: {
        overallHealthScore,
        projectHealthScores,
        totalProjects: projects.length,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getDelayRisks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const projects = await Project.find({ status: 'active' });

    const delayRisks = await Promise.all(
      projects.map((project) =>
        predictDelayRisk(project._id.toString(), project.name)
      )
    );

    const response: ApiResponse = {
      success: true,
      message: 'Delay risks retrieved successfully',
      data: delayRisks,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getMaterialAnomalies = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const anomalies = await MaterialRequest.find({
      anomalyDetected: true,
      status: 'pending',
    })
      .populate('projectId', 'name')
      .populate('requestedBy', 'name phone')
      .sort({ createdAt: -1 })
      .select('-__v');

    const response: ApiResponse = {
      success: true,
      message: 'Material anomalies retrieved successfully',
      data: anomalies,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

