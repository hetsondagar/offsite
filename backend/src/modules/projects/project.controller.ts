import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Project } from './project.model';
import { ApiResponse, PaginationParams } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { calculateProjectHealthScore } from '../../utils/siteHealth';

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  location: z.string().min(1).max(500),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  members: z.array(z.string()).optional(),
});

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const data = createProjectSchema.parse(req.body);
    
    const project = new Project({
      ...data,
      members: data.members || [req.user.userId],
      status: 'active',
      progress: 0,
      healthScore: 0,
    });

    await project.save();

    const response: ApiResponse = {
      success: true,
      message: 'Project created successfully',
      data: project,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (
  req: Request,
  res: Response, next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // If user is engineer, only show assigned projects
    const query: any = {};
    if (req.user.role === 'engineer') {
      query.members = req.user.userId;
    }

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('members', 'name phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Project.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Projects retrieved successfully',
      data: {
        projects,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate('members', 'name phone role')
      .select('-__v');

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Recalculate health score
    const healthScore = await calculateProjectHealthScore(id);
    if (project.healthScore !== healthScore) {
      project.healthScore = healthScore;
      await project.save();
    }

    const response: ApiResponse = {
      success: true,
      message: 'Project retrieved successfully',
      data: project,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

