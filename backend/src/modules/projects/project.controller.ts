import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Project } from './project.model';
import { ProjectInvitation } from './project-invitation.model';
import { User } from '../users/user.model';
import { Task } from '../tasks/task.model';
import { DPR } from '../dpr/dpr.model';
import { MaterialRequest } from '../materials/material.model';
import { Attendance } from '../attendance/attendance.model';
import { Event } from '../events/event.model';
import { Contractor } from '../contractor/contractor.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { calculateProjectHealthScore } from '../../utils/siteHealth';
import { createNotification } from '../notifications/notification.service';
import { logger } from '../../utils/logger';

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  location: z.string().min(1).max(500),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  engineerOffsiteIds: z.array(z.string()).optional(),
  managerOffsiteIds: z.array(z.string()).optional(),
  contractorOffsiteId: z.string().min(1, 'Contractor OS ID is required'),
  purchaseManagerOffsiteId: z.string().min(1, 'Purchase Manager OS ID is required'),
  // New geo-fence structure (mandatory for new projects)
  geoFence: z.object({
    enabled: z.boolean().default(true),
    center: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
    radiusMeters: z.number().min(50).max(500).default(200),
    bufferMeters: z.number().min(0).max(100).default(20),
  }).optional(),
  // Legacy fields (for backward compatibility, will be migrated to geoFence)
  siteLatitude: z.number().min(-90).max(90).optional(),
  siteLongitude: z.number().min(-180).max(180).optional(),
  siteRadiusMeters: z.number().min(1).optional(),
}).refine((data) => {
  // Require either new geoFence OR legacy siteLatitude/siteLongitude
  const hasNewGeoFence = data.geoFence && data.geoFence.center;
  const hasLegacyGeo = data.siteLatitude && data.siteLongitude;
  return hasNewGeoFence || hasLegacyGeo;
}, {
  message: 'Geo-fence is required. Provide either geoFence.center or siteLatitude/siteLongitude',
  path: ['geoFence'],
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
    
    // Build geo-fence: prefer new structure, fallback to legacy
    let geoFence: any;
    if (data.geoFence && data.geoFence.center) {
      geoFence = {
        enabled: data.geoFence.enabled !== false,
        center: {
          latitude: data.geoFence.center.latitude,
          longitude: data.geoFence.center.longitude,
        },
        radiusMeters: data.geoFence.radiusMeters || 200,
        bufferMeters: data.geoFence.bufferMeters || 20,
      };
    } else if (data.siteLatitude && data.siteLongitude) {
      // Migrate legacy fields to new structure
      geoFence = {
        enabled: true,
        center: {
          latitude: data.siteLatitude,
          longitude: data.siteLongitude,
        },
        radiusMeters: data.siteRadiusMeters || 200,
        bufferMeters: 20,
      };
    } else {
      throw new AppError('Geo-fence is required. Please provide geoFence.center or siteLatitude/siteLongitude', 400, 'VALIDATION_ERROR');
    }
    
    // Create project: creator is owner and initial member. Only this owner sees/manages it.
    const project = new Project({
      name: data.name,
      location: data.location,
      startDate: data.startDate,
      endDate: data.endDate,
      owner: req.user.userId,
      members: [req.user.userId], // Owner is automatically a member
      status: 'active',
      progress: 0,
      healthScore: 0,
      geoFence,
      // Keep legacy fields for backward compatibility
      siteLatitude: data.siteLatitude || geoFence.center.latitude,
      siteLongitude: data.siteLongitude || geoFence.center.longitude,
      siteRadiusMeters: data.siteRadiusMeters || geoFence.radiusMeters,
    });

    await project.save();

    // Find and assign Contractor
    const contractorUser = await User.findOne({
      offsiteId: { $regex: new RegExp(`^${data.contractorOffsiteId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      role: 'contractor'
    }).select('_id offsiteId name');

    if (!contractorUser) {
      throw new AppError(`Contractor with OS ID "${data.contractorOffsiteId}" not found`, 404, 'NOT_FOUND');
    }

    // Assign contractor to project
    let contractor = await Contractor.findOne({ userId: contractorUser._id });
    if (!contractor) {
      contractor = new Contractor({
        userId: contractorUser._id,
        assignedProjects: [project._id],
        contracts: [],
      });
      await contractor.save();
    } else {
      if (!contractor.assignedProjects.includes(project._id)) {
        contractor.assignedProjects.push(project._id);
        await contractor.save();
      }
    }

    // Also add contractor to the project members list so /api/projects works for contractors
    if (!project.members.includes(contractorUser._id as any)) {
      project.members.push(contractorUser._id as any);
      await project.save();
    }
    // And ensure contractor user profile lists the project
    await User.findByIdAndUpdate(contractorUser._id, {
      $addToSet: { assignedProjects: project._id },
    });

    // Find and assign Purchase Manager
    const purchaseManagerUser = await User.findOne({
      offsiteId: { $regex: new RegExp(`^${data.purchaseManagerOffsiteId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      role: 'purchase_manager'
    }).select('_id offsiteId name');

    if (!purchaseManagerUser) {
      throw new AppError(`Purchase Manager with OS ID "${data.purchaseManagerOffsiteId}" not found`, 404, 'NOT_FOUND');
    }

    // Add purchase manager to project members
    if (!project.members.includes(purchaseManagerUser._id)) {
      project.members.push(purchaseManagerUser._id);
      await project.save();
    }

    // Send notification to Purchase Manager
    try {
      await createNotification({
        userId: purchaseManagerUser._id.toString(),
        offsiteId: purchaseManagerUser.offsiteId,
        type: 'project_update',
        title: 'Project Assignment',
        message: `You have been assigned to the project "${data.name}" as Purchase Manager.`,
        data: {
          projectId: project._id.toString(),
          projectName: data.name,
          role: 'purchase_manager',
        },
      });
    } catch (notifError: any) {
      logger.warn('Failed to send purchase manager notification:', notifError.message);
    }

    // Send notification to Contractor
    try {
      await createNotification({
        userId: contractorUser._id.toString(),
        offsiteId: contractorUser.offsiteId,
        type: 'project_update',
        title: 'Project Assignment',
        message: `You have been assigned to the project "${data.name}" as Contractor.`,
        data: {
          projectId: project._id.toString(),
          projectName: data.name,
          role: 'contractor',
        },
      });
    } catch (notifError: any) {
      logger.warn('Failed to send contractor notification:', notifError.message);
    }

    // Find users by OffSite IDs and create invitations
    const invitations: any[] = [];

    // Process engineer invitations
    if (data.engineerOffsiteIds && data.engineerOffsiteIds.length > 0) {
      // Case-insensitive search for engineers using $or with regex
      const engineerConditions = data.engineerOffsiteIds.map(id => ({
        offsiteId: { $regex: new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }));
      const engineers = await User.find({ 
        $or: engineerConditions,
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
      // Case-insensitive search for managers using $or with regex
      const managerConditions = data.managerOffsiteIds.map(id => ({
        offsiteId: { $regex: new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }));
      const managers = await User.find({ 
        $or: managerConditions,
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

    // Security: Owner sees only their projects.
    // Engineer/Manager/Purchase Manager see only projects they are members of.
    // Contractor sees projects where they are a member OR are assigned via Contractor profile.
    const userObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const query: any = {};

    if (req.user.role === 'owner') {
      query.owner = userObjectId;
    } else if (req.user.role === 'contractor') {
      // Backward compatibility: some older projects may not include contractor in members.
      const contractor = await Contractor.findOne({ userId: userObjectId }).select('assignedProjects');
      const assignedProjectIds = (contractor?.assignedProjects || []).map((id: any) => new mongoose.Types.ObjectId(id));
      query.$or = [
        { members: userObjectId },
        ...(assignedProjectIds.length ? [{ _id: { $in: assignedProjectIds } }] : []),
      ];
    } else {
      query.members = userObjectId;
    }

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('owner', 'name phone role offsiteId')
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid project ID', 400, 'INVALID_ID');
    }

    const project = await Project.findById(id)
      .populate('owner', 'name phone role offsiteId')
      .populate('members', 'name phone role offsiteId')
      .select('-__v');

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Security: Project owner can access; PM/SE only if they are members
    const userId = req.user.userId.toString();
    const projectOwnerId = (project as any).owner?._id?.toString() ?? (project as any).owner?.toString();
    const isProjectOwner = projectOwnerId === userId;
    const isMember = project.members.some(
      (member: any) => member._id?.toString() === userId || member.toString() === userId
    );

    // Contractors may be assigned via Contractor profile (older data), even if not in members
    let isAssignedContractor = false;
    if (req.user.role === 'contractor' && !isMember) {
      const contractor = await Contractor.findOne({ userId: req.user.userId }).select('assignedProjects');
      isAssignedContractor = (contractor?.assignedProjects || []).some(
        (pid: any) => pid?.toString?.() === id
      );
    }

    if (req.user.role === 'owner') {
      if (!isProjectOwner) {
        throw new AppError(
          'Access denied. You can only view your own projects.',
          403,
          'FORBIDDEN'
        );
      }
    } else if (!isMember && !isAssignedContractor) {
      throw new AppError(
        'Access denied. You must be a team member to view this project.',
        403,
        'FORBIDDEN'
      );
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

    // Fetch all related data in parallel with error handling
    const [
      tasksCount,
      recentTasks,
      dprsCount,
      recentDPRs,
      materials,
      materialsCount,
      recentMaterials,
      attendanceCount,
      recentAttendance,
      eventsCount,
      taskStats,
    ] = await Promise.allSettled([
      Task.countDocuments(taskQuery),
      // Recent tasks (last 5)
      Task.find(taskQuery)
        .populate('assignedTo', 'name phone')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('-__v')
        .lean(),
      DPR.countDocuments(dprQuery),
      // Recent DPRs (last 5)
      DPR.find(dprQuery)
        .populate('createdBy', 'name phone')
        .populate('taskId', 'title')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('-__v')
        .lean(),
      // All material requests
      MaterialRequest.find(materialQuery).select('_id status').lean(),
      MaterialRequest.countDocuments(materialQuery),
      // Recent material requests (last 5)
      MaterialRequest.find(materialQuery)
        .populate('requestedBy', 'name phone')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('-__v')
        .lean(),
      Attendance.countDocuments(attendanceQuery),
      // Recent attendance (last 10)
      Attendance.find(attendanceQuery)
        .populate('userId', 'name phone')
        .sort({ timestamp: -1 })
        .limit(10)
        .select('-__v')
        .lean(),
      Event.countDocuments(eventQuery),
      // Task statistics
      Task.aggregate([
        { $match: taskQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]).then((results) => {
      // Extract values from Promise.allSettled results
      return results.map((result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          // Return default values on error
          logger.warn('Error fetching project data:', result.reason);
          return Array.isArray(result.reason) ? [] : 0;
        }
      });
    });

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

    // Only project owner can add members (not any owner)
    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can add members to projects', 403, 'FORBIDDEN');
    }

    const { id } = req.params;
    const data = addMembersSchema.parse(req.body);

    const project = await Project.findById(id);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const projectOwnerId = (project as any).owner?.toString?.() ?? (project as any).owner;
    if (projectOwnerId !== req.user.userId) {
      throw new AppError('Only the project owner can add members to this project', 403, 'FORBIDDEN');
    }

    const invitations: any[] = [];

    // Process engineer invitations
    if (data.engineerOffsiteIds && data.engineerOffsiteIds.length > 0) {
      // Case-insensitive search for engineers using $or with regex
      const engineerConditions = data.engineerOffsiteIds.map(id => ({
        offsiteId: { $regex: new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }));
      const engineers = await User.find({ 
        $or: engineerConditions,
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
      // Case-insensitive search for managers using $or with regex
      const managerConditions = data.managerOffsiteIds.map(id => ({
        offsiteId: { $regex: new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }));
      const managers = await User.find({ 
        $or: managerConditions,
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

