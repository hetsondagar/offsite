import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Project } from './project.model';
import { ProjectInvitation } from './project-invitation.model';
import { User } from '../users/user.model';
import { Task } from '../tasks/task.model';
import { DPR } from '../dpr/dpr.model';
import { MaterialRequest } from '../materials/material.model';
import { Attendance } from '../attendance/attendance.model';
import { Event } from '../events/event.model';
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
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

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

    // Build query for related data based on user role
    const taskQuery: any = { projectId: id };
    const dprQuery: any = { projectId: id };
    const materialQuery: any = { projectId: id };
    const attendanceQuery: any = { projectId: id };
    const eventQuery: any = { projectId: id };

    if (req.user.role === 'engineer') {
      taskQuery.assignedTo = req.user.userId;
      dprQuery.createdBy = req.user.userId;
      materialQuery.requestedBy = req.user.userId;
      attendanceQuery.userId = req.user.userId;
    }

    // Fetch all related data in parallel
    const [
      tasks,
      tasksCount,
      recentTasks,
      dprs,
      dprsCount,
      recentDPRs,
      materials,
      materialsCount,
      recentMaterials,
      attendanceRecords,
      attendanceCount,
      recentAttendance,
      events,
      eventsCount,
      taskStats,
    ] = await Promise.all([
      // All tasks
      Task.find(taskQuery).select('_id status'),
      Task.countDocuments(taskQuery),
      // Recent tasks (last 5)
      Task.find(taskQuery)
        .populate('assignedTo', 'name phone')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('-__v'),
      // All DPRs
      DPR.find(dprQuery).select('_id'),
      DPR.countDocuments(dprQuery),
      // Recent DPRs (last 5)
      DPR.find(dprQuery)
        .populate('createdBy', 'name phone')
        .populate('taskId', 'title')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('-__v'),
      // All material requests
      MaterialRequest.find(materialQuery).select('_id status'),
      MaterialRequest.countDocuments(materialQuery),
      // Recent material requests (last 5)
      MaterialRequest.find(materialQuery)
        .populate('requestedBy', 'name phone')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('-__v'),
      // All attendance records
      Attendance.find(attendanceQuery).select('_id type'),
      Attendance.countDocuments(attendanceQuery),
      // Recent attendance (last 10)
      Attendance.find(attendanceQuery)
        .populate('userId', 'name phone')
        .sort({ timestamp: -1 })
        .limit(10)
        .select('-__v'),
      // All events
      Event.find(eventQuery).select('_id'),
      Event.countDocuments(eventQuery),
      // Task statistics
      Task.aggregate([
        { $match: taskQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    // Calculate task statistics
    const taskStatusCounts = {
      pending: 0,
      'in-progress': 0,
      completed: 0,
    };
    taskStats.forEach((stat: any) => {
      taskStatusCounts[stat._id as keyof typeof taskStatusCounts] = stat.count;
    });

    // Calculate material request statistics
    const materialStatusCounts = {
      pending: materials.filter((m: any) => m.status === 'pending').length,
      approved: materials.filter((m: any) => m.status === 'approved').length,
      rejected: materials.filter((m: any) => m.status === 'rejected').length,
    };

    // Calculate attendance statistics (check-ins today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayCheckIns = await Attendance.countDocuments({
      ...attendanceQuery,
      type: 'checkin',
      timestamp: { $gte: today, $lt: tomorrow },
    });

    const response: ApiResponse = {
      success: true,
      message: 'Project retrieved successfully',
      data: {
        project,
        statistics: {
          tasks: {
            total: tasksCount,
            byStatus: taskStatusCounts,
            recent: recentTasks,
          },
          dprs: {
            total: dprsCount,
            recent: recentDPRs,
          },
          materials: {
            total: materialsCount,
            byStatus: materialStatusCounts,
            recent: recentMaterials,
          },
          attendance: {
            total: attendanceCount,
            todayCheckIns,
            recent: recentAttendance,
          },
          events: {
            total: eventsCount,
          },
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const addMembersSchema = z.object({
  engineerOffsiteIds: z.array(z.string()).optional(),
  managerOffsiteIds: z.array(z.string()).optional(),
});

export const addProjectMembers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    // Only owners can add members
    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can add members to projects', 403, 'FORBIDDEN');
    }

    const { id } = req.params;
    const data = addMembersSchema.parse(req.body);

    const project = await Project.findById(id);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const invitations: any[] = [];

    // Process engineer invitations
    if (data.engineerOffsiteIds && data.engineerOffsiteIds.length > 0) {
      const engineers = await User.find({ 
        offsiteId: { $in: data.engineerOffsiteIds },
        role: 'engineer'
      }).select('_id offsiteId name');

      for (const engineer of engineers) {
        // Check if user is already a member
        if (project.members.includes(engineer._id as any)) {
          continue;
        }

        // Check if there's already a pending invitation
        const existingInvitation = await ProjectInvitation.findOne({
          projectId: project._id,
          userId: engineer._id,
          status: 'pending',
        });

        if (existingInvitation) {
          continue;
        }

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
            message: `You have been invited to join the project "${project.name}" as a Site Engineer.`,
            data: {
              projectId: project._id.toString(),
              projectName: project.name,
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
        // Check if user is already a member
        if (project.members.includes(manager._id as any)) {
          continue;
        }

        // Check if there's already a pending invitation
        const existingInvitation = await ProjectInvitation.findOne({
          projectId: project._id,
          userId: manager._id,
          status: 'pending',
        });

        if (existingInvitation) {
          continue;
        }

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
            message: `You have been invited to join the project "${project.name}" as a Project Manager.`,
            data: {
              projectId: project._id.toString(),
              projectName: project.name,
              invitationId: invitation._id.toString(),
              role: 'manager',
            },
          });
        } catch (notifError: any) {
          logger.warn('Failed to send invitation notification:', notifError.message);
        }
      }
    }

    logger.info(`Added ${invitations.length} invitations to project ${id}`);

    const response: ApiResponse = {
      success: true,
      message: `Invitations sent to ${invitations.length} member(s)`,
      data: {
        invitations: invitations.length,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

