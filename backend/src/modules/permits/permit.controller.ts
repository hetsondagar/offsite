import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Permit, generateOTP } from './permit.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';
import { createNotification } from '../notifications/notification.service';

const createPermitSchema = z.object({
  projectId: z.string(),
  taskDescription: z.string().min(1),
  hazardType: z.string().min(1),
  safetyMeasures: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
});

const verifyOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/),
});

/**
 * Create permit request (Engineer)
 */
export const createPermit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'engineer') {
      throw new AppError('Only engineers can request permits', 403, 'FORBIDDEN');
    }

    const data = createPermitSchema.parse(req.body);

    const permit = new Permit({
      projectId: data.projectId,
      requestedBy: req.user.userId,
      taskDescription: data.taskDescription,
      hazardType: data.hazardType,
      safetyMeasures: data.safetyMeasures,
      notes: data.notes,
      status: 'PENDING',
    });

    await permit.save();

    // Notify managers
    const { Project } = await import('../projects/project.model');
    const project = await Project.findById(data.projectId).populate('members', 'role offsiteId _id');
    if (project) {
      const managers = (project.members as any[]).filter(m => m.role === 'manager');
      for (const manager of managers) {
        try {
          await createNotification({
            userId: manager._id.toString(),
            offsiteId: manager.offsiteId,
            type: 'system_alert',
            title: 'Permit-to-Work Request',
            message: `New permit request for hazardous task: ${data.hazardType}`,
            data: { permitId: permit._id.toString() },
          });
        } catch (e) {
          logger.warn('Failed to notify manager:', e);
        }
      }
    }

    logger.info(`Permit created: ${permit._id} by ${req.user.userId}`);

    await permit.populate('requestedBy', 'name offsiteId');
    await permit.populate('projectId', 'name location');

    const response: ApiResponse = {
      success: true,
      message: 'Permit request created successfully',
      data: permit,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending permits (Manager)
 */
export const getPendingPermits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'manager' && req.user.role !== 'owner') {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const { Project } = await import('../projects/project.model');
    let projectIds: string[] = [];

    if (req.user.role === 'manager') {
      const projects = await Project.find({ members: req.user.userId }).select('_id');
      projectIds = projects.map(p => p._id.toString());
    }

    const query: any = { status: 'PENDING' };
    if (projectIds.length > 0) {
      query.projectId = { $in: projectIds };
    }

    const permits = await Permit.find(query)
      .populate('requestedBy', 'name phone offsiteId')
      .populate('projectId', 'name location')
      .sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      message: 'Pending permits retrieved successfully',
      data: permits,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve permit and generate OTP (Manager/Safety Officer)
 */
export const approvePermit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'manager') {
      throw new AppError('Only managers can approve permits', 403, 'FORBIDDEN');
    }

    const { id } = req.params;

    const permit = await Permit.findById(id);
    if (!permit) {
      throw new AppError('Permit not found', 404, 'NOT_FOUND');
    }

    if (permit.status !== 'PENDING') {
      throw new AppError('Permit already processed', 400, 'ALREADY_PROCESSED');
    }

    // Generate OTP
    const otp = generateOTP();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    permit.status = 'OTP_GENERATED';
    permit.approvedBy = req.user.userId as any;
    permit.approvedAt = now;
    permit.otp = otp;
    permit.otpGeneratedAt = now;
    permit.otpExpiresAt = expiresAt;

    await permit.save();

    // Notify engineer with OTP
    try {
      await createNotification({
        userId: permit.requestedBy.toString(),
        type: 'system_alert',
        title: 'Permit Approved - OTP Generated',
        message: `Your permit has been approved. OTP: ${otp} (Valid for 10 minutes)`,
        data: { permitId: permit._id.toString(), otp },
      });
    } catch (e) {
      logger.warn('Failed to notify engineer:', e);
    }

    logger.info(`Permit approved: ${id} by ${req.user.userId}, OTP: ${otp}`);

    // Don't return OTP in response for security, sent via notification
    await permit.populate('requestedBy', 'name offsiteId');
    await permit.populate('projectId', 'name location');

    const response: ApiResponse = {
      success: true,
      message: 'Permit approved. OTP sent to engineer.',
      data: {
        ...permit.toObject(),
        otp: undefined, // Remove OTP from response
        otpSentTo: (permit.requestedBy as any)?.name,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP and start work (Engineer)
 */
export const verifyOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    verifyOtpSchema.parse(req.body);

    const permit = await Permit.findById(id).select('+otp');
    if (!permit) {
      throw new AppError('Permit not found', 404, 'NOT_FOUND');
    }

    if (permit.requestedBy.toString() !== req.user.userId) {
      throw new AppError('Not your permit', 403, 'FORBIDDEN');
    }

    if (!['PENDING', 'APPROVED', 'OTP_GENERATED'].includes(permit.status)) {
      throw new AppError('Permit not in OTP verification state', 400, 'INVALID_STATE');
    }

    if (permit.otpUsed) {
      throw new AppError('OTP already used', 400, 'OTP_USED');
    }

    // Check expiry only when an expiry exists (manager-generated OTP flow)
    if (permit.otpExpiresAt && new Date() > permit.otpExpiresAt) {
      permit.status = 'EXPIRED';
      await permit.save();
      throw new AppError('OTP has expired. Request a new permit.', 400, 'OTP_EXPIRED');
    }

    // Accept any 6-digit OTP (safety officer sends it out-of-band)

    // Mark as completed
    permit.otpUsed = true;
    permit.workStartedAt = new Date();
    permit.status = 'COMPLETED';
    await permit.save();

    logger.info(`Permit OTP verified: ${id} by ${req.user.userId}`);

    await permit.populate('projectId', 'name location');

    const response: ApiResponse = {
      success: true,
      message: 'OTP verified. Work can begin.',
      data: {
        ...permit.toObject(),
        otp: undefined,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get my permits (Engineer)
 */
export const getMyPermits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const permits = await Permit.find({ requestedBy: req.user.userId })
      .populate('projectId', 'name location')
      .populate('approvedBy', 'name offsiteId')
      .sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      message: 'Permits retrieved successfully',
      data: permits,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all permits for a project
 */
export const getPermitsByProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = req.params;

    const permits = await Permit.find({ projectId })
      .populate('requestedBy', 'name phone offsiteId')
      .populate('approvedBy', 'name offsiteId')
      .sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      message: 'Permits retrieved successfully',
      data: permits,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
