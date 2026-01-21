import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DPR } from './dpr.model';
import { Project } from '../projects/project.model';
import { Task } from '../tasks/task.model';
import { User } from '../users/user.model';
import { generateAISummary, uploadPhotos } from './dpr.service';
import { createBulkNotifications } from '../notifications/notification.service';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';

const workStoppageSchema = z.object({
  occurred: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    },
    z.boolean()
  ),
  reason: z.enum(['MATERIAL_DELAY', 'LABOUR_SHORTAGE', 'WEATHER', 'MACHINE_BREAKDOWN', 'APPROVAL_PENDING', 'SAFETY_ISSUE']).optional(),
  durationHours: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return parseFloat(val);
      }
      return typeof val === 'number' ? val : undefined;
    },
    z.number().min(0).optional()
  ),
  remarks: z.string().optional(),
  evidencePhotos: z.array(z.string()).optional(),
}).refine((data) => {
  // If occurred is true, reason and durationHours are required
  if (data.occurred) {
    return data.reason !== undefined && data.durationHours !== undefined;
  }
  return true;
}, {
  message: 'Reason and durationHours are required when work stoppage occurred',
  path: ['reason'],
});

const createDPRSchema = z.object({
  projectId: z.string(),
  taskId: z.string(),
  notes: z.string().optional(),
  generateAISummary: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return val === undefined ? false : Boolean(val);
    },
    z.boolean().optional().default(false)
  ),
  workStoppage: workStoppageSchema.optional(),
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

    // Parse work stoppage from nested form data
    // Form data comes as: workStoppage[occurred], workStoppage[reason], etc.
    const body: any = { ...req.body };
    if (body['workStoppage[occurred]'] !== undefined) {
      body.workStoppage = {
        occurred: body['workStoppage[occurred]'] === 'true' || body['workStoppage[occurred]'] === true,
        reason: body['workStoppage[reason]'] || undefined,
        durationHours: body['workStoppage[durationHours]'] ? parseFloat(body['workStoppage[durationHours]']) : undefined,
        remarks: body['workStoppage[remarks]'] || undefined,
        evidencePhotos: [], // Will be handled separately if needed
      };
      // Remove nested keys
      delete body['workStoppage[occurred]'];
      delete body['workStoppage[reason]'];
      delete body['workStoppage[durationHours]'];
      delete body['workStoppage[remarks]'];
    }
    
    const data = createDPRSchema.parse(body);
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

    // Verify task belongs to the project
    if (task.projectId.toString() !== data.projectId) {
      throw new AppError('Task does not belong to this project', 400, 'VALIDATION_ERROR');
    }

    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    // Verify user is a member of the project (engineers must be members to create DPR)
    if (req.user.role === 'engineer') {
      const isMember = project.members.some(
        (memberId) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('You are not a member of this project', 403, 'FORBIDDEN');
      }
    }

    // Upload photos (regular DPR photos)
    let photoUrls: string[] = [];
    // Upload work stoppage evidence photos if provided
    let stoppageEvidencePhotos: string[] = [];
    
    if (files && files.length > 0) {
      // Separate regular photos from stoppage evidence photos
      // Frontend should send regular photos first, then evidence photos
      // For now, we'll upload all and let frontend specify which are evidence
      photoUrls = await uploadPhotos(files);
    }
    
    // If work stoppage evidence photos are provided separately, upload them
    // Note: Frontend should handle this by sending evidence photos in a separate field
    // For now, we'll use the workStoppage.evidencePhotos if provided (pre-uploaded URLs)
    if (data.workStoppage?.occurred && data.workStoppage.evidencePhotos) {
      stoppageEvidencePhotos = data.workStoppage.evidencePhotos;
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

    // Validate work stoppage data
    if (data.workStoppage?.occurred) {
      if (!data.workStoppage.reason || data.workStoppage.durationHours === undefined) {
        throw new AppError('Work stoppage reason and durationHours are required when stoppage occurred', 400, 'VALIDATION_ERROR');
      }
    }

    const dpr = new DPR({
      projectId: data.projectId,
      taskId: data.taskId,
      createdBy: req.user.userId,
      photos: photoUrls,
      notes: data.notes,
      aiSummary,
      workStoppage: data.workStoppage ? {
        occurred: data.workStoppage.occurred,
        reason: data.workStoppage.reason,
        durationHours: data.workStoppage.durationHours,
        remarks: data.workStoppage.remarks,
        evidencePhotos: stoppageEvidencePhotos,
      } : undefined,
      synced: true,
    });

    await dpr.save();
    await dpr.populate('projectId', 'name');
    await dpr.populate('taskId', 'title');
    await dpr.populate('createdBy', 'name phone offsiteId');

    // Add stock OUT entries if materials were used
    // Note: Currently DPR model doesn't track materials used directly
    // This can be extended when material usage tracking is added to DPR
    // For now, we check for approved material requests on the DPR date as an approximation
    try {
      const { MaterialRequest } = await import('../materials/material.model');
      const dprDate = new Date();
      dprDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(dprDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Find approved material requests on the DPR date
      const approvedMaterials = await MaterialRequest.find({
        projectId: data.projectId,
        status: 'approved',
        approvedAt: { $gte: dprDate, $lt: nextDay },
      });

      if (approvedMaterials.length > 0) {
        const { addStockOut } = await import('../stock/stock.service');
        for (const material of approvedMaterials) {
          // Create stock OUT entry for each approved material on DPR date
          // This is an approximation - ideally DPR should track actual material usage
          await addStockOut(
            data.projectId,
            material.materialId,
            material.materialName,
            material.quantity,
            material.unit,
            dpr._id,
            req.user.userId
          );
        }
      }
    } catch (stockError: any) {
      logger.warn(`Failed to add stock OUT entries for DPR: ${stockError.message}`);
      // Don't fail DPR creation if stock tracking fails
    }

    // Send notifications to owners and project managers if images were uploaded
    if (photoUrls.length > 0) {
      try {
        // Get project with populated members to access their roles
        const projectWithMembers = await Project.findById(data.projectId)
          .populate({
            path: 'members',
            select: 'role offsiteId name',
            model: 'User',
          })
          .select('members');

        if (projectWithMembers && projectWithMembers.members && projectWithMembers.members.length > 0) {
          // Get all members as User objects
          const allMembers = projectWithMembers.members as any[];
          
          // Find owners and managers by querying User model with member IDs
          const memberIds = allMembers.map((member: any) => 
            typeof member === 'object' ? member._id : member
          );

          // Query users to get their roles
          const users = await User.find({ _id: { $in: memberIds } })
            .select('_id role offsiteId name');

          // Filter for owners and managers only
          const ownersAndManagers = users.filter(
            (user: any) => user.role === 'owner' || user.role === 'manager'
          );

          // Exclude the DPR creator from notifications
          const recipients = ownersAndManagers.filter(
            (user: any) => user._id.toString() !== req.user!.userId
          );

          if (recipients.length > 0) {
            const creator = dpr.createdBy as any;
            const project = dpr.projectId as any;
            const task = dpr.taskId as any;

            // Prepare notification data with image URLs
            const notificationData = {
              type: 'dpr_submitted' as const,
              title: 'New DPR with Images Submitted',
              message: `${creator?.name || 'A site engineer'} submitted a DPR with ${photoUrls.length} image${photoUrls.length > 1 ? 's' : ''} for task "${task?.title || 'Unknown Task'}" in project "${project?.name || 'Unknown Project'}".`,
              data: {
                dprId: dpr._id.toString(),
                projectId: data.projectId,
                projectName: project?.name,
                taskId: data.taskId,
                taskTitle: task?.title,
                createdBy: req.user.userId,
                createdByName: creator?.name,
                photoCount: photoUrls.length,
                photos: photoUrls, // Include all image URLs
                notes: data.notes,
                timestamp: new Date().toISOString(),
              },
            };

            // Get user IDs for bulk notification
            const userIds = recipients.map((user: any) => user._id.toString());

            if (userIds.length > 0) {
              await createBulkNotifications({
                ...notificationData,
                userIds,
              });

              logger.info(
                `Sent DPR image notifications to ${userIds.length} owner(s)/manager(s) for project ${data.projectId}`
              );
            }
          }
        }
      } catch (notifError: any) {
        // Don't fail the DPR creation if notification fails
        logger.warn('Failed to send DPR image notifications:', notifError.message);
      }
    }

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

    // Build query based on role
    const query: any = { projectId };
    if (req.user.role === 'engineer') {
      // Engineers can only see their own DPRs
      query.createdBy = req.user.userId;
    }
    // Managers and owners can see all DPRs for the project (already verified membership above)

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

