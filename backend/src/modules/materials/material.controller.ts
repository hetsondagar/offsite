import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MaterialRequest } from './material.model';
import { detectMaterialAnomaly } from '../../utils/anomalyDetector';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';

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
      query.requestedBy = req.user.userId;
    }

    const [requests, total] = await Promise.all([
      MaterialRequest.find(query)
        .populate('requestedBy', 'name phone')
        .populate('projectId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      MaterialRequest.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Pending requests retrieved successfully',
      data: {
        requests,
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

    await request.populate('requestedBy', 'name phone');
    await request.populate('approvedBy', 'name phone');
    await request.populate('projectId', 'name');

    logger.info(`Material request approved: ${id} by ${req.user.userId}`);

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
    request.rejectedAt = new Date();
    await request.save();

    await request.populate('requestedBy', 'name phone');
    await request.populate('rejectedBy', 'name phone');
    await request.populate('projectId', 'name');

    logger.info(`Material request rejected: ${id} by ${req.user.userId}`);

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

