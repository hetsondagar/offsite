import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Project } from '../projects/project.model';
import { calculateProjectHealthScore } from '../../utils/siteHealth';
import { predictDelayRisk } from '../../utils/delayPredictor';
import { MaterialRequest } from '../materials/material.model';
import { getProjectLabourGap, getAllProjectsLabourGap } from '../../services/labourGap.service';
import { getProjectApprovalDelays, getAllProjectsApprovalDelays } from '../../services/approvalDelay.service';
export {
  getDPRSummary,
  getHealthExplanation,
  getDelayRiskExplanation,
  getMaterialAnomalyExplanation,
} from './insights.controller.ai';
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

    // Role-based project filtering
    let projects;
    if (req.user.role === 'owner') {
      // Owners can see all active projects
      projects = await Project.find({ status: 'active' });
    } else {
      // Managers and engineers can only see projects they are members of
      projects = await Project.find({
        status: 'active',
        members: new mongoose.Types.ObjectId(req.user.userId),
      });
    }

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

    // Role-based project filtering
    let projects;
    if (req.user.role === 'owner') {
      // Owners can see all active projects
      projects = await Project.find({ status: 'active' });
    } else {
      // Managers and engineers can only see projects they are members of
      projects = await Project.find({
        status: 'active',
        members: new mongoose.Types.ObjectId(req.user.userId),
      });
    }

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

    // Role-based filtering for anomalies
    const query: any = {
      anomalyDetected: true,
      status: 'pending',
    };

    if (req.user.role === 'engineer') {
      // Engineers can only see their own requests
      query.requestedBy = new mongoose.Types.ObjectId(req.user.userId);
    } else if (req.user.role === 'manager') {
      // Managers can see anomalies from projects they are members of
      const userProjects = await Project.find({
        members: new mongoose.Types.ObjectId(req.user.userId),
        status: 'active',
      }).select('_id');
      const projectIds = userProjects.map((p) => p._id);
      query.projectId = { $in: projectIds };
    }
    // Owners can see all anomalies (no filter)

    const anomalies = await MaterialRequest.find(query)
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

export const getPendingMaterialRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    // Build query based on user role
    const query: any = { status: 'pending' };
    
    if (req.user.role === 'engineer') {
      // Engineers can only see their own requests
      query.requestedBy = req.user.userId;
    } else if (req.user.role === 'manager') {
      // Managers can see requests from projects they are members of
      const userProjects = await Project.find({
        members: new mongoose.Types.ObjectId(req.user.userId),
        status: 'active',
      }).select('_id');
      const projectIds = userProjects.map((p) => p._id);
      query.projectId = { $in: projectIds };
    }
    // Owners can see all requests (no filter)

    const { calculateApprovalDelay } = await import('../../services/approvalDelay.service');
    
    const requests = await MaterialRequest.find(query)
      .populate('projectId', 'name location')
      .populate('requestedBy', 'name phone offsiteId')
      .sort({ createdAt: -1 })
      .limit(50) // Limit to most recent 50
      .select('-__v');

    // Add delay information to each request
    const requestsWithDelay = requests.map((request: any) => {
      const requestObj = request.toObject();
      const delay = calculateApprovalDelay(request);
      requestObj.delayHours = delay.delayHours;
      requestObj.delayDays = delay.delayDays;
      requestObj.delaySeverity = delay.severity;
      return requestObj;
    });

    const response: ApiResponse = {
      success: true,
      message: 'Pending material requests retrieved successfully',
      data: requestsWithDelay,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get labour gap for a project or all projects
 * Calculates planned vs actual labour from DB
 */
export const getLabourGap = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = req.query;
    const days = parseInt(req.query.days as string) || 7;
    const threshold = parseFloat(req.query.threshold as string) || 20;

    if (projectId) {
      // Get gap for specific project
      const gap = await getProjectLabourGap(projectId as string, days, threshold);
      if (!gap) {
        throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }

      const response: ApiResponse = {
        success: true,
        message: 'Labour gap retrieved successfully',
        data: gap,
      };

      res.status(200).json(response);
    } else {
      // Get gaps for all accessible projects
      let projectIds: string[] = [];

      if (req.user.role === 'owner') {
        const projects = await Project.find({ status: 'active' }).select('_id');
        projectIds = projects.map(p => p._id.toString());
      } else if (req.user.role === 'manager') {
        const projects = await Project.find({
          members: new mongoose.Types.ObjectId(req.user.userId),
          status: 'active',
        }).select('_id');
        projectIds = projects.map(p => p._id.toString());
      } else {
        // Engineers can only see their assigned projects
        const projects = await Project.find({
          members: new mongoose.Types.ObjectId(req.user.userId),
          status: 'active',
        }).select('_id');
        projectIds = projects.map(p => p._id.toString());
      }

      const gaps = await getAllProjectsLabourGap(projectIds, days, threshold);

      const response: ApiResponse = {
        success: true,
        message: 'Labour gaps retrieved successfully',
        data: gaps,
      };

      res.status(200).json(response);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get approval delays for a project or all projects
 * Calculates delay duration from DB timestamps
 */
export const getApprovalDelays = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = req.query;

    if (projectId) {
      // Verify project exists and user has access
      const project = await Project.findById(projectId);
      if (!project) {
        throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }

      // Authorization: Owners can access any project, others must be members
      if (req.user.role !== 'owner') {
        const isMember = project.members.some(
          (memberId) => memberId.toString() === req.user!.userId
        );
        if (!isMember) {
          throw new AppError('Access denied. You must be a member of this project.', 403, 'FORBIDDEN');
        }
      }

      // Get delays for specific project
      const delays = await getProjectApprovalDelays(projectId as string);

      const response: ApiResponse = {
        success: true,
        message: 'Approval delays retrieved successfully',
        data: delays,
      };

      res.status(200).json(response);
    } else {
      // Get delays for all accessible projects
      let projectIds: string[] = [];

      if (req.user.role === 'owner') {
        const projects = await Project.find({ status: 'active' }).select('_id');
        projectIds = projects.map(p => p._id.toString());
      } else if (req.user.role === 'manager') {
        const projects = await Project.find({
          members: new mongoose.Types.ObjectId(req.user.userId),
          status: 'active',
        }).select('_id');
        projectIds = projects.map(p => p._id.toString());
      } else {
        // Engineers can only see their assigned projects
        const projects = await Project.find({
          members: new mongoose.Types.ObjectId(req.user.userId),
          status: 'active',
        }).select('_id');
        projectIds = projects.map(p => p._id.toString());
      }

      const delays = await getAllProjectsApprovalDelays(projectIds);

      const response: ApiResponse = {
        success: true,
        message: 'Approval delays retrieved successfully',
        data: delays,
      };

      res.status(200).json(response);
    }
  } catch (error) {
    next(error);
  }
};

