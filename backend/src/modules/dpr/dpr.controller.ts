import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DPR } from './dpr.model';
import { Project } from '../projects/project.model';
import { Task } from '../tasks/task.model';
import { generateAISummary, uploadPhotos } from './dpr.service';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

const createDPRSchema = z.object({
  projectId: z.string(),
  taskId: z.string(),
  notes: z.string().optional(),
  generateAISummary: z.boolean().optional().default(false),
});

export const createDPR = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const data = createDPRSchema.parse(req.body);
    const files = req.files as Express.Multer.File[];

    // Verify project and task exist
    const [project, task] = await Promise.all([
      Project.findById(data.projectId),
      Task.findById(data.taskId),
    ]);

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    if (!task) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    // Upload photos
    let photoUrls: string[] = [];
    if (files && files.length > 0) {
      photoUrls = await uploadPhotos(files);
    }

    // Generate AI summary if requested
    let aiSummary: string | undefined;
    if (data.generateAISummary) {
      aiSummary = await generateAISummary(
        project.name,
        task.title,
        data.notes,
        photoUrls.length
      );
    }

    const dpr = new DPR({
      projectId: data.projectId,
      taskId: data.taskId,
      createdBy: req.user.userId,
      photos: photoUrls,
      notes: data.notes,
      aiSummary,
      synced: true,
    });

    await dpr.save();
    await dpr.populate('projectId', 'name');
    await dpr.populate('taskId', 'title');
    await dpr.populate('createdBy', 'name phone');

    const response: ApiResponse = {
      success: true,
      message: 'DPR created successfully',
      data: dpr,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getDPRsByProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build query based on role
    const query: any = { projectId };
    if (req.user.role === 'engineer') {
      query.createdBy = req.user.userId;
    }

    const [dprs, total] = await Promise.all([
      DPR.find(query)
        .populate('projectId', 'name')
        .populate('taskId', 'title')
        .populate('createdBy', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      DPR.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'DPRs retrieved successfully',
      data: {
        dprs,
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

