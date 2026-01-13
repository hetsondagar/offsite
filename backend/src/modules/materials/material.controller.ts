import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MaterialRequest } from './material.model';
import { MaterialCatalog } from './material-catalog.model';
import { detectMaterialAnomaly } from '../../utils/anomalyDetector';
import { calculateApprovalDelay } from '../../services/approvalDelay.service';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';
import { createNotification } from '../notifications/notification.service';
import { User } from '../users/user.model';
// Pricing lookup is applied later during invoice calculation

const rejectMaterialRequestSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
});

const createMaterialRequestSchema = z.object({
  projectId: z.string(),
  materialId: z.string(),
  materialName: z.string(),
  quantity: z.number().min(0),
  unit: z.string(),
  reason: z.string().min(1),
});

export const createMaterialRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const data = createMaterialRequestSchema.parse(req.body);

    // Detect anomaly
    const anomalyCheck = await detectMaterialAnomaly(
      data.materialId,
      data.quantity,
      data.projectId
    );

    const materialRequest = new MaterialRequest({
      ...data,
      requestedBy: req.user.userId,
      status: 'pending',
      anomalyDetected: anomalyCheck.isAnomaly,
      anomalyReason: anomalyCheck.reason,
    });

    await materialRequest.save();
    await materialRequest.populate('requestedBy', 'name phone');
    await materialRequest.populate('projectId', 'name');

    // Send notification to project managers of this project
    try {
      const { Project } = await import('../projects/project.model');
      const project = await Project.findById(data.projectId)
        .populate({
          path: 'members',
          select: 'role offsiteId name _id',
          model: 'User',
        })
        .select('members name');

      if (project && project.members && project.members.length > 0) {
        // Get all members as User objects
        const allMembers = project.members as any[];
        
        // Extract member IDs
        const memberIds = allMembers.map((member: any) => 
          typeof member === 'object' ? member._id : member
        );

        // Query users to get their roles
        const users = await User.find({ _id: { $in: memberIds } })
          .select('_id role offsiteId name');

        // Filter for managers only (not owners, only project managers)
        const managers = users.filter(
          (user: any) => user.role === 'manager'
        );

        // Send notification to each manager
        for (const manager of managers) {
          try {
            await createNotification({
              userId: manager._id.toString(),
              offsiteId: manager.offsiteId,
              type: 'material_request',
              title: 'New Material Request',
              message: `New material request for "${project.name}": ${data.materialName} (${data.quantity} ${data.unit})`,
              data: {
                projectId: data.projectId,
                projectName: project.name,
                materialRequestId: materialRequest._id.toString(),
                materialName: data.materialName,
                quantity: data.quantity,
                unit: data.unit,
              },
            });
          } catch (notifError: any) {
            logger.warn(`Failed to send notification to manager ${manager._id}:`, notifError.message);
          }
        }

        logger.info(`Sent material request notifications to ${managers.length} manager(s) for project ${data.projectId}`);
      }
    } catch (notifError: any) {
      logger.warn('Failed to send material request notifications:', notifError.message);
      // Don't fail the request if notification fails
    }

    logger.info(`Material request created: ${materialRequest._id} by ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Material request created successfully',
      data: materialRequest,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getPendingRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = { status: 'pending' };
    
    if (req.user.role === 'engineer') {
      // Engineers can only see their own requests
      query.requestedBy = req.user.userId;
    } else if (req.user.role === 'manager') {
      // Managers can see requests from projects they are members of
      const { Project } = await import('../projects/project.model');
      const userProjects = await Project.find({
        members: req.user.userId,
      }).select('_id');
      const projectIds = userProjects.map((p) => p._id);
      query.projectId = { $in: projectIds };
    }
    // Owners can see all requests (no filter)

    const [requests, total] = await Promise.all([
      MaterialRequest.find(query)
        .populate('requestedBy', 'name phone offsiteId')
        .populate('projectId', 'name location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'), // reason field is included by default
      MaterialRequest.countDocuments(query),
    ]);

    // Add approval delay information to each pending request
    const requestsWithDelay = requests.map((request: any) => {
      const requestObj = request.toObject();
      if (request.status === 'pending') {
        const delay = calculateApprovalDelay(request);
        requestObj.delayHours = delay.delayHours;
        requestObj.delayDays = delay.delayDays;
        requestObj.delaySeverity = delay.severity;
      }
      return requestObj;
    });

    const response: ApiResponse = {
      success: true,
      message: 'Pending requests retrieved successfully',
      data: {
        requests: requestsWithDelay,
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

export const approveRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const request = await MaterialRequest.findById(id);

    if (!request) {
      throw new AppError('Material request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Prevent self-approval
    if (request.requestedBy.toString() === req.user.userId) {
      throw new AppError('Cannot approve your own request', 400, 'SELF_APPROVAL_NOT_ALLOWED');
    }

    if (request.status !== 'pending') {
      throw new AppError('Request already processed', 400, 'REQUEST_ALREADY_PROCESSED');
    }

    request.status = 'approved';
    request.approvedBy = req.user.userId as any;
    request.approvedAt = new Date();

    await request.save();

    await request.populate('requestedBy', 'name phone offsiteId');
    await request.populate('approvedBy', 'name phone');
    await request.populate('projectId', 'name');

    logger.info(`Material request approved: ${id} by ${req.user.userId}`);

    // Send notification to the requester
    try {
      const requester = request.requestedBy as any;
      if (requester && requester._id) {
        await createNotification({
          userId: requester._id.toString(),
          offsiteId: requester.offsiteId,
          type: 'material_approved',
          title: 'Material Request Approved',
          message: `Your material request for ${request.materialName} (${request.quantity} ${request.unit}) has been approved.`,
          data: {
            materialRequestId: request._id.toString(),
            projectId: (request.projectId as any)?._id?.toString() || (request.projectId as any)?.toString(),
            projectName: (request.projectId as any)?.name,
          },
        });
      }
    } catch (notifError: any) {
      logger.warn('Failed to send approval notification:', notifError.message);
      // Don't fail the request if notification fails
    }

    const response: ApiResponse = {
      success: true,
      message: 'Request approved successfully',
      data: request,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const rejectRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const data = rejectMaterialRequestSchema.parse(req.body);

    const request = await MaterialRequest.findById(id);

    if (!request) {
      throw new AppError('Material request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Prevent self-rejection
    if (request.requestedBy.toString() === req.user.userId) {
      throw new AppError('Cannot reject your own request', 400, 'SELF_REJECTION_NOT_ALLOWED');
    }

    if (request.status !== 'pending') {
      throw new AppError('Request already processed', 400, 'REQUEST_ALREADY_PROCESSED');
    }

    request.status = 'rejected';
    request.rejectedBy = req.user.userId as any;
    request.rejectionReason = data.rejectionReason;
    request.rejectedAt = new Date();
    await request.save();

    await request.populate('requestedBy', 'name phone offsiteId');
    await request.populate('rejectedBy', 'name phone');
    await request.populate('projectId', 'name');

    logger.info(`Material request rejected: ${id} by ${req.user.userId}`);

    // Send notification to the requester
    try {
      const requester = request.requestedBy as any;
      if (requester && requester._id) {
        await createNotification({
          userId: requester._id.toString(),
          offsiteId: requester.offsiteId,
          type: 'material_rejected',
          title: 'Material Request Rejected',
          message: `Your material request for ${request.materialName} (${request.quantity} ${request.unit}) has been rejected. Reason: ${request.rejectionReason || 'Not specified'}`,
          data: {
            materialRequestId: request._id.toString(),
            projectId: (request.projectId as any)?._id?.toString() || (request.projectId as any)?.toString(),
            projectName: (request.projectId as any)?.name,
          },
        });
      }
    } catch (notifError: any) {
      logger.warn('Failed to send rejection notification:', notifError.message);
      // Don't fail the request if notification fails
    }

    const response: ApiResponse = {
      success: true,
      message: 'Request rejected successfully',
      data: request,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get materials catalog - Standard list of available materials
 */
export const getMaterialsCatalog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    let materials = await MaterialCatalog.find({ isActive: true })
      .sort({ name: 1 })
      .select('-__v');

    // If catalog is empty, seed with default materials
    if (materials.length === 0) {
      const defaultMaterials = [
        { name: 'Cement', unit: 'bags', defaultAnomalyThreshold: 1.3, category: 'Construction' },
        { name: 'Steel Bars', unit: 'tons', defaultAnomalyThreshold: 1.3, category: 'Construction' },
        { name: 'Bricks', unit: 'pieces', defaultAnomalyThreshold: 1.3, category: 'Construction' },
        { name: 'Sand', unit: 'cubic meters', defaultAnomalyThreshold: 1.3, category: 'Construction' },
        { name: 'Gravel', unit: 'cubic meters', defaultAnomalyThreshold: 1.3, category: 'Construction' },
        { name: 'Concrete Mix', unit: 'cubic meters', defaultAnomalyThreshold: 1.3, category: 'Construction' },
        { name: 'Steel Rods', unit: 'kg', defaultAnomalyThreshold: 1.3, category: 'Construction' },
        { name: 'Tiles', unit: 'pieces', defaultAnomalyThreshold: 1.3, category: 'Finishing' },
      ];

      await MaterialCatalog.insertMany(defaultMaterials);
      materials = await MaterialCatalog.find({ isActive: true })
        .sort({ name: 1 })
        .select('-__v');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Materials catalog retrieved successfully',
      data: materials,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

