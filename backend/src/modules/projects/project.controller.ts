import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Project } from './project.model';
import { ProjectInvitation } from './project-invitation.model';
import { User } from '../users/user.model';
import { ApiResponse, PaginationParams } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { calculateProjectHealthScore } from '../../utils/siteHealth';
import { createNotification } from '../notifications/notification.service';
import { logger } from '../../utils/logger';

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  location: z.string().min(1).max(500),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  engineerOffsiteIds: z.array(z.string()).optional(), // Array of OffSite IDs for engineers
  managerOffsiteIds: z.array(z.string()).optional(), // Array of OffSite IDs for managers
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
    
    // Create project with owner as initial member
    const project = new Project({
      name: data.name,
      location: data.location,
      startDate: data.startDate,
      endDate: data.endDate,
      members: [req.user.userId], // Owner is automatically a member
      status: 'active',
      progress: 0,
      healthScore: 0,
    });

    await project.save();

    // Find users by OffSite IDs and create invitations
    const invitations: any[] = [];
    const foundUserIds: string[] = [];

    // Process engineer invitations
    if (data.engineerOffsiteIds && data.engineerOffsiteIds.length > 0) {
      const engineers = await User.find({ 
        offsiteId: { $in: data.engineerOffsiteIds },
        role: 'engineer'
      }).select('_id offsiteId name');

      for (const engineer of engineers) {
        const invitation = new ProjectInvitation({
          projectId: project._id,
          userId: engineer._id,
          offsiteId: engineer.offsiteId,
          invitedBy: req.user.userId,
          role: 'engineer',
          status: 'pending',
        });
        await invitation.save();
        invitations.push(invitation);

        // Send notification
        try {
          await createNotification({
            userId: engineer._id.toString(),
            offsiteId: engineer.offsiteId,
            type: 'project_update',
            title: 'Project Invitation',
            message: `You have been invited to join the project "${data.name}" as a Site Engineer.`,
            data: {
              projectId: project._id.toString(),
              projectName: data.name,
              invitationId: invitation._id.toString(),
              role: 'engineer',
            },
          });
        } catch (notifError: any) {
          logger.warn('Failed to send invitation notification:', notifError.message);
        }
      }
    }

    // Process manager invitations
    if (data.managerOffsiteIds && data.managerOffsiteIds.length > 0) {
      const managers = await User.find({ 
        offsiteId: { $in: data.managerOffsiteIds },
        role: 'manager'
      }).select('_id offsiteId name');

      for (const manager of managers) {
        const invitation = new ProjectInvitation({
          projectId: project._id,
          userId: manager._id,
          offsiteId: manager.offsiteId,
          invitedBy: req.user.userId,
          role: 'manager',
          status: 'pending',
        });
        await invitation.save();
        invitations.push(invitation);

        // Send notification
        try {
          await createNotification({
            userId: manager._id.toString(),
            offsiteId: manager.offsiteId,
            type: 'project_update',
            title: 'Project Invitation',
            message: `You have been invited to join the project "${data.name}" as a Project Manager.`,
            data: {
              projectId: project._id.toString(),
              projectName: data.name,
              invitationId: invitation._id.toString(),
              role: 'manager',
            },
          });
        } catch (notifError: any) {
          logger.warn('Failed to send invitation notification:', notifError.message);
        }
      }
    }

    logger.info(`Project created: ${project._id} with ${invitations.length} invitations`);

    const response: ApiResponse = {
      success: true,
      message: 'Project created successfully',
      data: {
        project,
        invitations: invitations.length,
      },
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
        .populate('members', 'name phone role offsiteId')
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
      .populate('members', 'name phone role offsiteId')
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

