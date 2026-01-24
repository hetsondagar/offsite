import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PettyCash, calculateDistance } from './petty-cash.model';
import { Project } from '../projects/project.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';
import { createNotification } from '../notifications/notification.service';

const MAX_DISTANCE_METERS = 200; // 200m from site

const createExpenseSchema = z.object({
  projectId: z.string(),
  amount: z.number().min(0),
  description: z.string().min(1),
  category: z.string().min(1),
  receiptPhotoUrl: z.string().optional(),
  geoLocation: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

/**
 * Submit petty cash expense (Engineer/Manager)
 */
export const submitExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'manager' && req.user.role !== 'engineer') {
      throw new AppError('Only engineers and managers can submit petty cash expenses', 403, 'FORBIDDEN');
    }

    const data = createExpenseSchema.parse(req.body);

    // Get project for geofence validation
    const project = await Project.findById(data.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    // Validate geofence if coordinates provided
    let geoFenceValid = false;
    let distanceFromSite: number | undefined;

    if (data.latitude !== undefined && data.longitude !== undefined) {
      if (project.geoFence?.enabled && project.geoFence?.center) {
        distanceFromSite = calculateDistance(
          data.latitude,
          data.longitude,
          project.geoFence.center.latitude,
          project.geoFence.center.longitude
        );
        geoFenceValid = distanceFromSite <= MAX_DISTANCE_METERS;
      }
    }

    const expense = new PettyCash({
      projectId: data.projectId,
      submittedBy: req.user.userId,
      amount: data.amount,
      description: data.description,
      category: data.category,
      receiptPhotoUrl: data.receiptPhotoUrl,
      geoLocation: data.geoLocation,
      coordinates: data.latitude !== undefined ? {
        latitude: data.latitude,
        longitude: data.longitude,
      } : undefined,
      distanceFromSite,
      geoFenceValid,
      status: 'PENDING_PM_APPROVAL',
    });

    await expense.save();

    // Notify project managers for PM approval
    const projectWithMembers = await Project.findById(data.projectId).populate(
      'members',
      'role offsiteId _id'
    );
    if (projectWithMembers) {
      const managersToNotify = (projectWithMembers.members as any[]).filter(
        m => m.role === 'manager' && m._id.toString() !== req.user!.userId
      );

      for (const manager of managersToNotify) {
        try {
          await createNotification({
            userId: manager._id.toString(),
            offsiteId: manager.offsiteId,
            type: 'general',
            title: 'Reimbursement Approval Required',
            message: `New reimbursement: ₹${data.amount} - ${data.category}`,
            data: { expenseId: expense._id.toString() },
          });
        } catch (e) {
          logger.warn('Failed to notify manager:', e);
        }
      }
    }

    logger.info(`Petty cash expense submitted: ${expense._id} by ${req.user.userId}`);

    await expense.populate('submittedBy', 'name offsiteId');
    await expense.populate('projectId', 'name location');

    const response: ApiResponse = {
      success: true,
      message: geoFenceValid 
        ? 'Expense submitted successfully' 
        : 'Expense submitted - Warning: Location is outside site boundary',
      data: expense,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending expenses for PM approval
 */
export const getPendingExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    let query: any = {};
    
    if (req.user.role === 'manager') {
      // Managers see PENDING_PM_APPROVAL for their projects
      const projects = await Project.find({ members: req.user.userId }).select('_id');
      const projectIds = projects.map(p => p._id);
      query = { 
        projectId: { $in: projectIds },
        status: 'PENDING_PM_APPROVAL',
        submittedBy: { $ne: req.user.userId }, // Don't show own submissions
      };
    } else if (req.user.role === 'owner') {
      // Owners see PENDING_OWNER_APPROVAL
      query = { status: 'PENDING_OWNER_APPROVAL' };
    } else {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const expenses = await PettyCash.find(query)
      .populate('submittedBy', 'name phone offsiteId')
      .populate('projectId', 'name location')
      .sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      message: 'Pending expenses retrieved successfully',
      data: expenses,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve expense (Manager approves to owner, Owner gives final approval)
 */
export const approveExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'manager' && req.user.role !== 'owner') {
      throw new AppError('Only managers and owners can approve expenses', 403, 'FORBIDDEN');
    }

    const { id } = req.params;

    const expense = await PettyCash.findById(id);
    if (!expense) {
      throw new AppError('Expense not found', 404, 'NOT_FOUND');
    }

    if (req.user.role === 'manager') {
      if (expense.status !== 'PENDING_PM_APPROVAL') {
        throw new AppError('Expense not pending PM approval', 400, 'INVALID_STATUS');
      }
      if (expense.submittedBy.toString() === req.user.userId) {
        throw new AppError('Cannot approve your own expense', 400, 'SELF_APPROVAL');
      }

      expense.status = 'PENDING_OWNER_APPROVAL';
      expense.pmApprovedBy = req.user.userId as any;
      expense.pmApprovedAt = new Date();

      // Notify owner
      const project = await Project.findById(expense.projectId);
      if (project?.owner) {
        try {
          await createNotification({
            userId: project.owner.toString(),
            type: 'general',
            title: 'Petty Cash Approval Required',
            message: `Expense of ₹${expense.amount} pending your approval`,
            data: { expenseId: expense._id.toString() },
          });
        } catch (e) {
          logger.warn('Failed to notify owner:', e);
        }
      }
    } else if (req.user.role === 'owner') {
      if (expense.status !== 'PENDING_OWNER_APPROVAL') {
        throw new AppError('Expense not pending owner approval', 400, 'INVALID_STATUS');
      }

      expense.status = 'APPROVED';
      expense.ownerApprovedBy = req.user.userId as any;
      expense.ownerApprovedAt = new Date();
    }

    await expense.save();

    logger.info(`Expense approved: ${id} by ${req.user.userId}`);

    await expense.populate('submittedBy', 'name offsiteId');
    await expense.populate('projectId', 'name location');

    const response: ApiResponse = {
      success: true,
      message: 'Expense approved successfully',
      data: expense,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reject expense
 */
export const rejectExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'manager' && req.user.role !== 'owner') {
      throw new AppError('Only managers and owners can reject expenses', 403, 'FORBIDDEN');
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    const expense = await PettyCash.findById(id);
    if (!expense) {
      throw new AppError('Expense not found', 404, 'NOT_FOUND');
    }

    expense.status = 'REJECTED';
    expense.rejectedBy = req.user.userId as any;
    expense.rejectedAt = new Date();
    expense.rejectionReason = rejectionReason || 'No reason provided';

    await expense.save();

    // Notify submitter
    try {
      await createNotification({
        userId: expense.submittedBy.toString(),
        type: 'general',
        title: 'Petty Cash Expense Rejected',
        message: `Your expense of ₹${expense.amount} was rejected: ${expense.rejectionReason}`,
        data: { expenseId: expense._id.toString() },
      });
    } catch (e) {
      logger.warn('Failed to notify submitter:', e);
    }

    logger.info(`Expense rejected: ${id} by ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Expense rejected',
      data: expense,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all expenses for dashboard (Owner)
 */
export const getAllExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can view all expenses', 403, 'FORBIDDEN');
    }

    const status = req.query.status as string;
    const projectId = req.query.projectId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (projectId) {
      query.projectId = projectId;
    }

    const [expenses, total] = await Promise.all([
      PettyCash.find(query)
        .populate('submittedBy', 'name phone offsiteId')
        .populate('projectId', 'name location')
        .populate('pmApprovedBy', 'name offsiteId')
        .populate('ownerApprovedBy', 'name offsiteId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PettyCash.countDocuments(query),
    ]);

    // Calculate totals
    const approvedExpenses = await PettyCash.find({ status: 'APPROVED' });
    const totalApproved = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);

    const response: ApiResponse = {
      success: true,
      message: 'Expenses retrieved successfully',
      data: {
        expenses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: {
          totalApproved,
          count: approvedExpenses.length,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get my submitted expenses
 */
export const getMyExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const expenses = await PettyCash.find({ submittedBy: req.user.userId })
      .populate('projectId', 'name location')
      .sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      message: 'My expenses retrieved successfully',
      data: expenses,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
